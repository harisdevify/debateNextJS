import { AccountAccessService } from '../access/account-access.service';
import { randomUUID } from "node:crypto";
import { RateLimitService } from "../common/rate-limit.service";
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
import { ReportReason } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";

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
    matchId?: string;
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
  onModuleDestroy() { this.access.events.off('moderated', this.onModerated); }
  afterInit(server: Server) {
    this.access.events.on('moderated', this.onModerated);
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
        const user = await this.prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true, fullname: true },
        });
        if (!user) return next(new Error("Not authenticated"));
        await this.access.requireActive(user.id);
        socket.data.user = user;
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
      void this.access.requireActive(client.data.user!.id).then(() => next()).catch(() => {
        client.emit('account-restricted', { message: 'Your account cannot participate right now.' });
        client.disconnect(true);
      });
    });
    client.on("find-partner", () => void this.findPartner(client));
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
    for (const event of ["offer", "answer", "ice-candidate"]) {
      client.on(event, (payload: unknown) => {
        const peerId = client.data.peerId;
        if (
          peerId &&
          typeof payload === "object" &&
          payload !== null &&
          "matchId" in payload &&
          payload.matchId === client.data.matchId
        ) {
          this.server.to(peerId).emit(event, payload);
        }
      });
    }
    client.on(
      "chatMessage",
      (value: unknown, ack?: unknown) => void this.chat(client, value, ack),
    );
    client.on("leave", () => this.leaveDebate(client));
  }

  handleDisconnect(client: DebateSocket) {
    this.leaveDebate(client);
  }

  private async findPartner(socket: DebateSocket) {
    const user = socket.data.user;
    if (!user) return;
    this.leaveDebate(socket);
    const version = socket.data.searchVersion;

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

    const mine = socket.data.blocked ?? new Set<number>();
    let partner: DebateSocket | undefined;
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.server.sockets.sockets.get(this.queue[i]) as
        DebateSocket | undefined;
      if (!candidate) {
        this.queue.splice(i--, 1);
        continue;
      }
      const candidateId = candidate.data.user?.id;
      if (candidateId === undefined || candidateId === user.id) continue; // never match yourself (two tabs)
      if (mine.has(candidateId) || candidate.data.blocked?.has(user.id))
        continue; // blocked either way
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
      initiator: true,
      peer: { fullname: user.fullname },
    });
    socket.emit("matched", {
      matchId,
      initiator: false,
      peer: { fullname: partner.data.user?.fullname ?? "" },
    });
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
