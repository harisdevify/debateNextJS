import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

interface SocketUser { id: number; fullname: string; }
interface TokenPayload { id: number; }
type DebateSocket = Socket & { data: { user?: SocketUser; peerId?: string | null } };
const MAX_CHAT_LENGTH = 1000;

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
        next();
      } catch { next(new Error('Not authenticated')); }
    });
  }

  handleConnection(client: DebateSocket) {
    client.on('find-partner', () => this.findPartner(client));
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

  private findPartner(socket: DebateSocket) {
    if (!socket.data.user) return;
    this.leaveDebate(socket);
    let partner: DebateSocket | undefined;
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.server.sockets.sockets.get(this.queue[i]) as DebateSocket | undefined;
      if (!candidate) { this.queue.splice(i--, 1); continue; }
      if (candidate.data.user?.id !== socket.data.user.id) {
        partner = candidate;
        this.queue.splice(i, 1);
        break;
      }
    }
    if (!partner) { this.queue.push(socket.id); socket.emit('waiting'); return; }
    socket.data.peerId = partner.id;
    partner.data.peerId = socket.id;
    partner.emit('matched', { initiator: true, peer: { fullname: socket.data.user.fullname } });
    socket.emit('matched', { initiator: false, peer: { fullname: partner.data.user?.fullname ?? '' } });
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
