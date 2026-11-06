import { parseSignal } from './webrtc-signal.validation';
import { formalClock, FORMAL_RECONNECT_GRACE_MS, type FormalClock } from './formal-debate-clock';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DebatePreferencesDto } from '../debate-setup/dto/debate-preferences.dto';
import { DebateTopic, DebateLanguage, DebateMode } from '../debate-setup/debate-setup.constants';
import { AccountAccessService } from '../access/account-access.service';
import { randomUUID } from "node:crypto";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { ReportReason } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";

interface SocketUser {
  id: number;
  fullname: string;
}
interface TokenPayload {
  id: number;
}
type DebateSocket = Socket & {
  data: {
    user?: SocketUser;
    searchVersion?: number;
    lastIceRestartRequestAt?: number;
    preferences?: DebatePreferencesDto;
    tokenHash?: string;
    matchId?: string;
    peerId?: string | null;
    /** user id of the latest partner; kept after the debate ends so it can still be reported */
    lastPeerUserId?: number | null;
    /** users this user blocked or who blocked this user (loaded on find-partner) */
    blocked?: Set<number>;
  };
};
type Ack = (response: { ok: boolean; message?: string }) => void;

interface FormalParticipant {
  userId: number;
  fullname: string;
  socketId: string | null;
}
interface FormalSession {
  matchId: string;
  startedAt: number;
  preferences: DebatePreferencesDto;
  participants: [FormalParticipant, FormalParticipant];
  timer?: ReturnType<typeof setTimeout>;
  reconnectTimers: Map<number, ReturnType<typeof setTimeout>>;
}


const MAX_CHAT_LENGTH = 1000;
const MAX_REPORT_DETAILS = 500;
const MAX_REPORTS_PER_DAY = 20;
const REPORT_REASONS: string[] = Object.values(ReportReason);

// Legacy clients that emit find-partner without a payload continue working.
const DEFAULT_PREFERENCES: DebatePreferencesDto = {
  topic: DebateTopic.RELIGION,
  language: DebateLanguage.ENGLISH,
  mode: DebateMode.FRIENDLY,
};

function parsePreferences(value: unknown): DebatePreferencesDto | null {
  if (value === undefined) return { ...DEFAULT_PREFERENCES };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const dto = plainToInstance(DebatePreferencesDto, value);
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.length === 0 ? dto : null;
}

function compatible(a: DebatePreferencesDto, b: DebatePreferencesDto): boolean {
  return a.topic === b.topic && a.language === b.language && a.mode === b.mode;
}

function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigin = process.env.CLIENT_URL ?? "http://localhost:3000";
      callback(null, !origin || origin === allowedOrigin);
    },
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() private server!: Server;
  private readonly queue: string[] = [];
  private readonly formalSessions = new Map<string, FormalSession>();
  private readonly formalByUser = new Map<number, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly limits: RateLimitService,
    private readonly access: AccountAccessService,
  ) {}

  private readonly onModerated = ({ userId, kind }: { userId: number; kind: string }) => {
    for (const raw of this.server.sockets.sockets.values()) {
      const socket = raw as DebateSocket;
      if (socket.data.user?.id !== userId) continue;
      if (kind === 'WARN') socket.emit('moderation-warning', { message: 'You received a conduct warning. Please review the debate rules.' });
      if (kind === 'BAN' || kind === 'SUSPEND') {
        socket.emit('account-restricted', { message: 'Your account access has been restricted.' });
        socket.disconnect(true);
      }
    }
  };
  private readonly onSessionRevoked = ({ tokenHash }: { tokenHash: string }) => {
    for (const raw of this.server.sockets.sockets.values()) {
      const socket = raw as DebateSocket;
      if (socket.data.tokenHash !== tokenHash) continue;
      socket.emit('session-revoked');
      socket.disconnect(true);
    }
  };
  onModuleDestroy() {
    for (const session of this.formalSessions.values()) {
      if (session.timer) clearTimeout(session.timer);
      for (const timer of session.reconnectTimers.values()) clearTimeout(timer);
    }
    this.formalSessions.clear();
    this.formalByUser.clear();
    this.access.events.off('moderated', this.onModerated);
    this.access.events.off('session-revoked', this.onSessionRevoked);
  }
  afterInit(server: Server) {
    this.access.events.on('moderated', this.onModerated);
    this.access.events.on('session-revoked', this.onSessionRevoked);
    server.use(async (rawSocket, next) => {
      const socket = rawSocket as DebateSocket;
      try {
        const token = readCookie(
          socket.handshake.headers.cookie,
          "accessToken",
        );
        if (!token) return next(new Error("Not authenticated"));
        const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
          secret: this.config.getOrThrow<string>("JWT_SECRET"),
        });
        if (!Number.isInteger(payload.id))
          return next(new Error("Not authenticated"));
        await this.access.requireValidToken(token);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true, fullname: true },
        });
        if (!user) return next(new Error("Not authenticated"));
        await this.access.requireActive(user.id);
        socket.data.user = user;
        socket.data.tokenHash = this.access.tokenHash(token);
        socket.data.peerId = null;
        socket.data.lastPeerUserId = null;
        next();
      } catch {
        next(new Error("Not authenticated"));
      }
    });
  }

  handleConnection(client: DebateSocket) {
    // Old JWTs and reconnects cannot bypass account restrictions.
    client.use((_packet, next) => {
      void Promise.all([
        this.access.requireActive(client.data.user!.id),
        this.prisma.revokedToken.findUnique({
          where: { tokenHash: client.data.tokenHash! },
          select: { tokenHash: true },
        }).then((revoked) => {
          if (revoked) throw new Error('Session revoked');
        }),
      ]).then(() => next()).catch(() => {
        client.emit('account-restricted', { message: 'Your account cannot participate right now.' });
        client.disconnect(true);
      });
    });
    client.on("find-partner", (preferences?: unknown) => void this.findPartner(client, preferences));
    client.on(
      "report-partner",
      (payload: unknown, ack?: unknown) =>
        void this.reportPartner(client, payload, ack),
    );
    // no payload is sent here, so the ack callback is the last (and only) argument
    client.on(
      "block-partner",
      (...args: unknown[]) =>
        void this.blockPartner(client, args[args.length - 1]),
    );
    for (const event of ['offer', 'answer', 'ice-candidate'] as const) {
      client.on(event, (payload: unknown) => {
        const peerId = client.data.peerId;
        const peer = peerId ? this.server.sockets.sockets.get(peerId) as DebateSocket | undefined : undefined;
        if (!peer || peer.data.peerId !== client.id || peer.data.matchId !== client.data.matchId)
          return;
        const signal = parseSignal(event, payload, client.data.matchId);
        if (signal) peer.emit(event, signal);
      });
    }
    // Only the current peer can request a limited ICE restart from the offerer.
    client.on('ice-restart-request', (payload: unknown) => {
      const matchId = client.data.matchId;
      const peerId = client.data.peerId;
      const peer = peerId ? this.server.sockets.sockets.get(peerId) as DebateSocket | undefined : undefined;
      if (!matchId || !peer || peer.data.peerId !== client.id || peer.data.matchId !== matchId)
        return;
      if (typeof payload !== 'object' || payload === null ||
          (payload as { matchId?: unknown }).matchId !== matchId) return;
      const now = Date.now();
      if (now - (client.data.lastIceRestartRequestAt ?? 0) < 10_000) return;
      client.data.lastIceRestartRequestAt = now;
      peer.emit('ice-restart-request', { matchId });
    });
    client.on(
      "chatMessage",
      (value: unknown, ack?: unknown) => void this.chat(client, value, ack),
    );
    client.on("leave", () => this.leaveDebate(client));
  }

  handleDisconnect(client: DebateSocket) {
    const matchId = client.data.matchId;
    const session = matchId ? this.formalSessions.get(matchId) : undefined;
    const userId = client.data.user?.id;
    if (session && userId) {
      const participant = session.participants.find((p) => p.userId === userId);
      if (participant?.socketId === client.id) {
        participant.socketId = null;
        const other = session.participants.find((p) => p.userId !== userId);
        if (other?.socketId) this.server.to(other.socketId).emit('peer-reconnecting', { matchId });
        const prior = session.reconnectTimers.get(userId);
        if (prior) clearTimeout(prior);
        session.reconnectTimers.set(userId, setTimeout(() => {
          if (this.formalSessions.has(matchId) && !participant.socketId)
            this.endFormalSession(session, 'left');
        }, FORMAL_RECONNECT_GRACE_MS));
        return;
      }
    }
    this.leaveDebate(client);
  }

  private async findPartner(socket: DebateSocket, input: unknown) {
    const user = socket.data.user;
    if (!user) return;
    const preferences = parsePreferences(input);
    // A disconnected formal participant may resume the same timed session.
    if (preferences && this.resumeFormalSession(socket, preferences)) return;
    this.leaveDebate(socket);
    const version = socket.data.searchVersion;
    if (!preferences) {
      socket.emit('search-error', { message: 'Select a valid topic, language and mode.' });
      return;
    }
    socket.data.preferences = preferences;

    try {
      if (
        !(await this.limits.allow("matchmaking", String(user.id), 10, 10_000))
      ) {
        if (version === socket.data.searchVersion) socket.emit("search-error");
        return;
      }
      // Fresh from the DB: the user may have accepted the rules a moment ago.
      const consent = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { acceptedRulesAt: true, ageConfirmedAt: true },
      });
      if (!consent?.acceptedRulesAt || !consent.ageConfirmedAt) {
        socket.emit("rules-required");
        return;
      }

      const blocked = await this.loadBlockedIds(user.id);
      if (socket.disconnected || version !== socket.data.searchVersion) return;
      socket.data.blocked = blocked;
    } catch (error) {
      console.error("Find partner error:", error);
      if (version === socket.data.searchVersion) socket.emit("search-error");
      return;
    }

    // Everything below is synchronous, so two users can never grab the same partner.
    if (socket.disconnected || version !== socket.data.searchVersion) return;

    // Another tab of the same account must not already be waiting or matched.
    const alreadyActive = Array.from(this.server.sockets.sockets.values()).some((raw) => {
      const other = raw as DebateSocket;
      return other.id !== socket.id &&
        other.data.user?.id === user.id &&
        (this.queue.includes(other.id) || !!other.data.peerId);
    });
    if (alreadyActive) {
      socket.emit('debate-already-active');
      return;
    }

    const mine = socket.data.blocked ?? new Set<number>();
    let partner: DebateSocket | undefined;
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.server.sockets.sockets.get(this.queue[i]) as
        DebateSocket | undefined;
      if (!candidate || candidate.disconnected || candidate.data.peerId) {
        this.queue.splice(i--, 1);
        continue;
      }
      const candidateId = candidate.data.user?.id;
      if (candidateId === undefined || candidateId === user.id) continue; // never match yourself (two tabs)
      if (mine.has(candidateId) || candidate.data.blocked?.has(user.id))
        continue; // blocked either way
      if (!candidate.data.preferences || !compatible(preferences, candidate.data.preferences))
        continue; // keep incompatible users waiting in FIFO order
      partner = candidate;
      this.queue.splice(i, 1);
      break;
    }
    if (!partner) {
      this.queue.push(socket.id);
      socket.emit("waiting");
      return;
    }

    const matchId = randomUUID();
    socket.data.matchId = partner.data.matchId = matchId;
    socket.data.peerId = partner.id;
    partner.data.peerId = socket.id;
    socket.data.lastPeerUserId = partner.data.user?.id ?? null;
    partner.data.lastPeerUserId = user.id;
    partner.emit("matched", {
      matchId,
      preferences,
      initiator: true,
      peer: { fullname: user.fullname },
    });
    socket.emit("matched", {
      matchId,
      preferences,
      initiator: false,
      peer: { fullname: partner.data.user?.fullname ?? "" },
    });
    if (preferences.mode === DebateMode.FORMAL) {
      const session: FormalSession = {
        matchId,
        startedAt: Date.now(),
        preferences,
        participants: [
          { userId: partner.data.user!.id, fullname: partner.data.user!.fullname, socketId: partner.id },
          { userId: user.id, fullname: user.fullname, socketId: socket.id },
        ],
        reconnectTimers: new Map(),
      };
      this.formalSessions.set(matchId, session);
      this.formalByUser.set(user.id, matchId);
      this.formalByUser.set(partner.data.user!.id, matchId);
      this.broadcastFormalState(session);
    }
  }

  /** Rebinds a disconnected participant without resetting the formal clock. */
  private resumeFormalSession(socket: DebateSocket, preferences: DebatePreferencesDto): boolean {
    const userId = socket.data.user?.id;
    if (!userId) return false;
    const matchId = this.formalByUser.get(userId);
    const session = matchId ? this.formalSessions.get(matchId) : undefined;
    if (!session) return false;
    const participant = session.participants.find((p) => p.userId === userId)!;
    if (participant.socketId && participant.socketId !== socket.id &&
      this.server.sockets.sockets.get(participant.socketId)?.connected) {
      socket.emit('debate-already-active');
      return true;
    }
    if (!compatible(preferences, session.preferences)) {
      socket.emit('search-error', { message: 'Resume your existing formal debate before changing preferences.' });
      return true;
    }
    if (formalClock(session.startedAt).completed) {
      this.endFormalSession(session, 'completed');
      socket.emit('formal-completed', { matchId: session.matchId });
      return true;
    }
    participant.socketId = socket.id;
    socket.data.preferences = session.preferences;
    socket.data.matchId = session.matchId;
    socket.data.lastPeerUserId = session.participants.find((p) => p.userId !== userId)?.userId;
    const timer = session.reconnectTimers.get(userId);
    if (timer) clearTimeout(timer);
    session.reconnectTimers.delete(userId);
    const [first, second] = session.participants;
    if (first.socketId && second.socketId) {
      const firstSocket = this.server.sockets.sockets.get(first.socketId) as DebateSocket | undefined;
      const secondSocket = this.server.sockets.sockets.get(second.socketId) as DebateSocket | undefined;
      if (firstSocket && secondSocket) {
        firstSocket.data.peerId = secondSocket.id;
        secondSocket.data.peerId = firstSocket.id;
        firstSocket.emit('matched', {
          matchId: session.matchId, preferences: session.preferences,
          initiator: true, peer: { fullname: second.fullname },
        });
        secondSocket.emit('matched', {
          matchId: session.matchId, preferences: session.preferences,
          initiator: false, peer: { fullname: first.fullname },
        });
        this.broadcastFormalState(session);
      }
    } else {
      socket.emit('peer-reconnecting', { matchId: session.matchId });
      this.broadcastFormalState(session);
    }
    return true;
  }

  private broadcastFormalState(session: FormalSession): void {
    if (!this.formalSessions.has(session.matchId)) return;
    if (session.timer) clearTimeout(session.timer);
    const state: FormalClock = formalClock(session.startedAt);
    if (state.completed) {
      this.endFormalSession(session, 'completed');
      return;
    }
    session.participants.forEach((participant, index) => {
      if (!participant.socketId) return;
      const socket = this.server.sockets.sockets.get(participant.socketId);
      socket?.emit('formal-state', {
        matchId: session.matchId,
        ...state,
        isSpeaker: state.speakerIndex === index,
      });
    });
    session.timer = setTimeout(() => this.broadcastFormalState(session),
      Math.max(1, state.turnEndsAt - Date.now()));
  }

  private endFormalSession(session: FormalSession, reason: 'completed' | 'left'): void {
    if (!this.formalSessions.delete(session.matchId)) return;
    if (session.timer) clearTimeout(session.timer);
    for (const timer of session.reconnectTimers.values()) clearTimeout(timer);
    for (const participant of session.participants) {
      this.formalByUser.delete(participant.userId);
      if (!participant.socketId) continue;
      const socket = this.server.sockets.sockets.get(participant.socketId) as DebateSocket | undefined;
      if (!socket) continue;
      socket.data.peerId = null;
      socket.data.matchId = undefined;
      socket.data.searchVersion = (socket.data.searchVersion ?? 0) + 1;
      socket.emit(reason === 'completed' ? 'formal-completed' : 'peer-left',
        { matchId: session.matchId, endedAt: session.startedAt + 600_000 });
    }
  }

  private async loadBlockedIds(userId: number): Promise<Set<number>> {
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return new Set(
      rows.map((row) =>
        row.blockerId === userId ? row.blockedId : row.blockerId,
      ),
    );
  }

  /** Stores a report about the latest partner (the other user's id never reaches the client). */
  private async reportPartner(
    socket: DebateSocket,
    payload: unknown,
    ack: unknown,
  ) {
    const reply: Ack = (response) => {
      if (typeof ack === "function") (ack as Ack)(response);
    };
    const reporterId = socket.data.user?.id;
    const reportedUserId = socket.data.lastPeerUserId;
    if (!reporterId || !reportedUserId)
      return reply({ ok: false, message: "There is nobody to report." });

    const body = (
      typeof payload === "object" && payload !== null ? payload : {}
    ) as { reason?: unknown; details?: unknown };
    if (
      typeof body.reason !== "string" ||
      !REPORT_REASONS.includes(body.reason)
    ) {
      return reply({ ok: false, message: "Please choose a reason." });
    }
    const reason = body.reason as ReportReason;
    const details =
      typeof body.details === "string"
        ? body.details.trim().slice(0, MAX_REPORT_DETAILS)
        : "";

    try {
      const sinceYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const saved = await this.prisma.$transaction(async (tx) => {
        // Lock the reporter row: all concurrent report requests for this account
        // serialize, including requests handled by other API processes.
        await tx.$queryRaw`SELECT "id" FROM "debate_users" WHERE "id" = ${reporterId} FOR UPDATE`;
        const sentToday = await tx.report.count({
          where: { reporterId, createdAt: { gte: sinceYesterday } },
        });
        if (sentToday >= MAX_REPORTS_PER_DAY) return false;
        await tx.report.create({
          data: {
            reporterId,
            reportedUserId,
            reason,
            details: details || null,
          },
        });
        return true;
      });
      reply(
        saved
          ? { ok: true }
          : {
              ok: false,
              message: "Too many reports today. Please try again tomorrow.",
            },
      );
    } catch (error) {
      console.error("Report error:", error);
      reply({ ok: false, message: "Something went wrong!" });
    }
  }

  /** Blocks the latest partner for good and ends the current debate. */
  private async blockPartner(socket: DebateSocket, ack: unknown) {
    const reply: Ack = (response) => {
      if (typeof ack === "function") (ack as Ack)(response);
    };
    const blockerId = socket.data.user?.id;
    const blockedId = socket.data.lastPeerUserId;
    if (!blockerId || !blockedId)
      return reply({ ok: false, message: "There is nobody to block." });

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
      console.error("Block error:", error);
      reply({ ok: false, message: "Something went wrong!" });
    }
  }

  private async chat(socket: DebateSocket, value: unknown, ack: unknown) {
    const reply: Ack = (response) => {
      if (typeof ack === "function") (ack as Ack)(response);
    };
    const body = value as { text?: unknown; matchId?: unknown } | null;
    const peerId = socket.data.peerId;
    const matchId = socket.data.matchId;
    if (!peerId || !body || body.matchId !== matchId)
      return reply({
        ok: false,
        message: "Your partner is no longer connected.",
      });
    if (
      typeof body.text !== "string" ||
      !body.text.trim() ||
      body.text.trim().length > MAX_CHAT_LENGTH
    ) {
      return reply({
        ok: false,
        message: "Messages must contain 1–1000 characters.",
      });
    }
    const text = body.text.trim();
    try {
      if (
        !(await this.limits.allow(
          "chat",
          String(socket.data.user!.id),
          20,
          10_000,
        ))
      ) {
        return reply({
          ok: false,
          message: "Too many messages. Wait a few seconds.",
        });
      }
      if (socket.data.peerId !== peerId || socket.data.matchId !== matchId) {
        return reply({
          ok: false,
          message: "Your partner is no longer connected.",
        });
      }
      this.server.to(peerId).emit("chatMessage", { text, matchId });
      reply({ ok: true });
    } catch {
      reply({
        ok: false,
        message: "Could not send your message. Please try again.",
      });
    }
  }

  private leaveDebate(socket: DebateSocket) {
    const formal = socket.data.matchId ? this.formalSessions.get(socket.data.matchId) : undefined;
    if (formal) {
      this.endFormalSession(formal, 'left');
      return;
    }
    socket.data.searchVersion = (socket.data.searchVersion ?? 0) + 1;
    socket.data.matchId = undefined;
    const queueIndex = this.queue.indexOf(socket.id);
    if (queueIndex !== -1) this.queue.splice(queueIndex, 1);
    const peerId = socket.data.peerId;
    if (!peerId) return;
    socket.data.peerId = null;
    const peer = this.server.sockets.sockets.get(peerId) as
      DebateSocket | undefined;
    if (peer?.data.peerId === socket.id) {
      peer.data.peerId = null;
      peer.data.matchId = undefined;
      peer.emit("peer-left");
    }
  }
}

