import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ReportReason } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

interface SocketUser { id: number; fullname: string; }
interface TokenPayload { id: number; }
type DebateSocket = Socket & {
  data: {
    user?: SocketUser;
    peerId?: string | null;
    /** user id of the latest partner; kept after the debate ends so it can still be reported */
    lastPeerUserId?: number | null;
    /** users this user blocked or who blocked this user (loaded on find-partner) */
    blocked?: Set<number>;
  };
};
type Ack = (response: { ok: boolean; message?: string }) => void;

const MAX_CHAT_LENGTH = 1000;
const MAX_REPORT_DETAILS = 500;
const MAX_REPORTS_PER_DAY = 20;
const REPORT_REASONS: string[] = Object.values(ReportReason);

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigin = process.env.CLIENT_URL ?? 'http://localhost:3000';
      callback(null, !origin || origin === allowedOrigin);
    },
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server!: Server;
  private readonly queue: string[] = [];

  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  afterInit(server: Server) {
    server.use(async (rawSocket, next) => {
      const socket = rawSocket as DebateSocket;
      try {
        const token = readCookie(socket.handshake.headers.cookie, 'accessToken');
        if (!token) return next(new Error('Not authenticated'));
        const payload = await this.jwtService.verifyAsync<TokenPayload>(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
        if (!Number.isInteger(payload.id)) return next(new Error('Not authenticated'));
        const user = await this.prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, fullname: true } });
        if (!user) return next(new Error('Not authenticated'));
        socket.data.user = user;
        socket.data.peerId = null;
        socket.data.lastPeerUserId = null;
        next();
      } catch { next(new Error('Not authenticated')); }
    });
  }

  handleConnection(client: DebateSocket) {
    client.on('find-partner', () => void this.findPartner(client));
    client.on('report-partner', (payload: unknown, ack?: unknown) => void this.reportPartner(client, payload, ack));
    // no payload is sent here, so the ack callback is the last (and only) argument
    client.on('block-partner', (...args: unknown[]) => void this.blockPartner(client, args[args.length - 1]));
    for (const event of ['offer', 'answer', 'ice-candidate']) {
      client.on(event, (payload: unknown) => {
        const peerId = client.data.peerId;
        if (peerId) this.server.to(peerId).emit(event, payload);
      });
    }
    client.on('chatMessage', (value: unknown) => this.chat(client, value));
    client.on('leave', () => this.leaveDebate(client));
  }

  handleDisconnect(client: DebateSocket) { this.leaveDebate(client); }

  private async findPartner(socket: DebateSocket) {
    const user = socket.data.user;
    if (!user) return;
    this.leaveDebate(socket);

    try {
      // Fresh from the DB: the user may have accepted the rules a moment ago.
      const consent = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { acceptedRulesAt: true, ageConfirmedAt: true },
      });
      if (!consent?.acceptedRulesAt || !consent.ageConfirmedAt) {
        socket.emit('rules-required');
        return;
      }

      socket.data.blocked = await this.loadBlockedIds(user.id);
    } catch (error) {
      console.error('Find partner error:', error);
      socket.emit('search-error');
      return;
    }

    // Everything below is synchronous, so two users can never grab the same partner.
    if (socket.disconnected) return;
    this.leaveDebate(socket); // a second find-partner may have run while we awaited

    const mine = socket.data.blocked ?? new Set<number>();
    let partner: DebateSocket | undefined;
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.server.sockets.sockets.get(this.queue[i]) as DebateSocket | undefined;
      if (!candidate) { this.queue.splice(i--, 1); continue; }
      const candidateId = candidate.data.user?.id;
      if (candidateId === undefined || candidateId === user.id) continue; // never match yourself (two tabs)
      if (mine.has(candidateId) || candidate.data.blocked?.has(user.id)) continue; // blocked either way
      partner = candidate;
      this.queue.splice(i, 1);
      break;
    }
    if (!partner) { this.queue.push(socket.id); socket.emit('waiting'); return; }

    socket.data.peerId = partner.id;
    partner.data.peerId = socket.id;
    socket.data.lastPeerUserId = partner.data.user?.id ?? null;
    partner.data.lastPeerUserId = user.id;
    partner.emit('matched', { initiator: true, peer: { fullname: user.fullname } });
    socket.emit('matched', { initiator: false, peer: { fullname: partner.data.user?.fullname ?? '' } });
  }

  private async loadBlockedIds(userId: number): Promise<Set<number>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)));
  }

  /** Stores a report about the latest partner (the other user's id never reaches the client). */
  private async reportPartner(socket: DebateSocket, payload: unknown, ack: unknown) {
    const reply: Ack = (response) => { if (typeof ack === 'function') (ack as Ack)(response); };
    const reporterId = socket.data.user?.id;
    const reportedUserId = socket.data.lastPeerUserId;
    if (!reporterId || !reportedUserId) return reply({ ok: false, message: 'There is nobody to report.' });

    const body = (typeof payload === 'object' && payload !== null ? payload : {}) as { reason?: unknown; details?: unknown };
    if (typeof body.reason !== 'string' || !REPORT_REASONS.includes(body.reason)) {
      return reply({ ok: false, message: 'Please choose a reason.' });
    }
    const reason = body.reason as ReportReason;
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_REPORT_DETAILS) : '';

    try {
      const sinceYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sentToday = await this.prisma.report.count({ where: { reporterId, createdAt: { gte: sinceYesterday } } });
      if (sentToday >= MAX_REPORTS_PER_DAY) {
        return reply({ ok: false, message: 'Too many reports today. Please try again tomorrow.' });
      }
      await this.prisma.report.create({ data: { reporterId, reportedUserId, reason, details: details || null } });
      reply({ ok: true });
    } catch (error) {
      console.error('Report error:', error);
      reply({ ok: false, message: 'Something went wrong!' });
    }
  }

  /** Blocks the latest partner for good and ends the current debate. */
  private async blockPartner(socket: DebateSocket, ack: unknown) {
    const reply: Ack = (response) => { if (typeof ack === 'function') (ack as Ack)(response); };
    const blockerId = socket.data.user?.id;
    const blockedId = socket.data.lastPeerUserId;
    if (!blockerId || !blockedId) return reply({ ok: false, message: 'There is nobody to block.' });

    try {
      await this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      });
      (socket.data.blocked ??= new Set<number>()).add(blockedId);
      this.leaveDebate(socket); // the partner just sees a normal "partner left"
      reply({ ok: true });
    } catch (error) {
      console.error('Block error:', error);
      reply({ ok: false, message: 'Something went wrong!' });
    }
  }

  private chat(socket: DebateSocket, value: unknown) {
    const peerId = socket.data.peerId;
    if (!peerId || typeof value !== 'string') return;
    const text = value.trim().slice(0, MAX_CHAT_LENGTH);
    if (text) this.server.to(peerId).emit('chatMessage', { text });
  }

  private leaveDebate(socket: DebateSocket) {
    const queueIndex = this.queue.indexOf(socket.id);
    if (queueIndex !== -1) this.queue.splice(queueIndex, 1);
    const peerId = socket.data.peerId;
    if (!peerId) return;
    socket.data.peerId = null;
    const peer = this.server.sockets.sockets.get(peerId) as DebateSocket | undefined;
    if (peer?.data.peerId === socket.id) {
      peer.data.peerId = null;
      peer.emit('peer-left');
    }
  }
}
