import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { RealtimeGateway } from "../src/realtime/realtime.gateway";
import { PrismaService } from "../src/prisma/prisma.service";

const RUN = `e2e${Date.now()}`;
const PASSWORD = "password123";
let counter = 0;

const newUser = (name = `User ${++counter}`) => ({
  fullname: name,
  email: `${RUN}-${counter}@test.dev`,
  gender: "male",
  education: "BS",
  country: "PK",
  password: PASSWORD,
  acceptRules: true,
  confirmAge: true,
});

describe("Debate API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0, "127.0.0.1");
    prisma = app.get(PrismaService);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    http = request(baseUrl);
  });

  beforeEach(async () => {
    await prisma.rateLimit.deleteMany();
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await app.close();
  });

  /** Registers + logs in; returns the Cookie header value. */
  async function loginAs(user = newUser()) {
    await http.post("/api/v1/auth/register").send(user).expect(201);
    const res = await http
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: user.password })
      .expect(200);
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0].split(
      ";",
    )[0];
    return { user, cookie };
  }

  /* ───────────────────────── REST ───────────────────────── */
  describe("auth", () => {
    it("limits concurrent login attempts for one account", async () => {
      const user = newUser();
      await http.post("/api/v1/auth/register").send(user).expect(201);
      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          http
            .post("/api/v1/auth/login")
            .send({ email: user.email, password: user.password }),
        ),
      );
      expect(responses.filter((r) => r.status === 200)).toHaveLength(10);
      expect(responses.filter((r) => r.status === 429)).toHaveLength(2);
      expect(
        responses.find((r) => r.status === 429)?.headers["retry-after"],
      ).toBe("900");
    });

    it("serves short-lived TURN credentials only after authentication", async () => {
      await http.get("/api/v1/auth/ice-servers").expect(401);
      const { cookie } = await loginAs();
      const oldUrls = process.env.TURN_URLS;
      const oldSecret = process.env.TURN_SECRET;
      process.env.TURN_URLS = "turn:relay.example.com:3478";
      process.env.TURN_SECRET = "test-only-shared-secret";
      try {
        const res = await http
          .get("/api/v1/auth/ice-servers")
          .set("Cookie", cookie)
          .expect(200);
        expect(res.body.iceServers[1]).toMatchObject({
          urls: ["turn:relay.example.com:3478"],
          credential: expect.any(String),
        });
        expect(res.body.iceServers[1].username).toMatch(/^\d+:\d+$/);
        expect(JSON.stringify(res.body)).not.toContain(process.env.TURN_SECRET);
        expect(res.headers["cache-control"]).toBe("no-store");
      } finally {
        if (oldUrls === undefined) delete process.env.TURN_URLS;
        else process.env.TURN_URLS = oldUrls;
        if (oldSecret === undefined) delete process.env.TURN_SECRET;
        else process.env.TURN_SECRET = oldSecret;
      }
    });

    it("GET /health", async () => {
      const res = await http.get("/api/v1/health").expect(200);
      expect(res.body).toEqual({ status: "ok", service: "debate-api" });
    });

    it("register: one readable message per validation error", async () => {
      const base = newUser();
      const msg = async (body: object) =>
        (await http.post("/api/v1/auth/register").send(body).expect(400)).body
          .message;

      expect(await msg({})).toBe("All fields are required!");
      expect(await msg({ ...base, fullname: "   " })).toBe(
        "All fields are required!",
      );
      expect(await msg({ ...base, email: "not-an-email" })).toBe(
        "Invalid email address!",
      );
      expect(await msg({ ...base, password: "123" })).toBe(
        "Password must be at least 8 characters!",
      );
      expect(typeof (await msg({ ...base, role: "admin" }))).toBe("string"); // extra field
    });

    it("register: trims, lower-cases email, rejects duplicates (any case)", async () => {
      const user = newUser("  Trim Me  ");
      await http
        .post("/api/v1/auth/register")
        .send({ ...user, email: user.email.toUpperCase() })
        .expect(201);

      const stored = await prisma.user.findUnique({
        where: { email: user.email },
      });
      expect(stored?.fullname).toBe("Trim Me");
      expect(stored?.password).not.toBe(PASSWORD); // hashed

      const dup = await http
        .post("/api/v1/auth/register")
        .send(user)
        .expect(409);
      expect(dup.body.message).toBe("Email already exists!");
    });

    it("login: same error for wrong password and unknown email; cookie is httpOnly", async () => {
      const user = newUser();
      await http.post("/api/v1/auth/register").send(user).expect(201);

      const wrong = await http
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "wrong-password" })
        .expect(401);
      const unknown = await http
        .post("/api/v1/auth/login")
        .send({ email: `nobody-${RUN}@test.dev`, password: "whatever1" })
        .expect(401);
      expect(wrong.body.message).toBe("Invalid email or password!");
      expect(unknown.body.message).toBe(wrong.body.message);

      const ok = await http
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: user.password })
        .expect(200);
      expect(ok.body).not.toHaveProperty("password");
      expect(ok.body.email).toBe(user.email);
      const cookie = (ok.headers["set-cookie"] as unknown as string[])[0];
      expect(cookie).toMatch(/^accessToken=/);
      expect(cookie).toMatch(/HttpOnly/i);

      const empty = await http.post("/api/v1/auth/login").expect(400);
      expect(empty.body.message).toBe("Email and password are required!");
    });

    it("me / patch me / logout", async () => {
      const { user, cookie } = await loginAs();

      await http.get("/api/v1/auth/me").expect(401);
      await http
        .get("/api/v1/auth/me")
        .set("Cookie", "accessToken=garbage")
        .expect(401);

      const me = await http
        .get("/api/v1/auth/me")
        .set("Cookie", cookie)
        .expect(200);
      expect(me.body).toMatchObject({
        email: user.email,
        fullname: user.fullname,
      });
      expect(me.body).not.toHaveProperty("password");

      const patched = await http
        .patch("/api/v1/auth/me")
        .set("Cookie", cookie)
        .send({
          fullname: "  New Name ",
          gender: "female",
          education: "MS",
          country: "UK",
        })
        .expect(200);
      expect(patched.body).toMatchObject({
        fullname: "New Name",
        gender: "female",
        country: "UK",
      });

      const bad = await http
        .patch("/api/v1/auth/me")
        .set("Cookie", cookie)
        .send({ fullname: "", gender: "f", education: "m", country: "u" })
        .expect(400);
      expect(bad.body.message).toBe("All fields are required!");

      await http
        .patch("/api/v1/auth/me")
        .send({ fullname: "x", gender: "f", education: "m", country: "u" })
        .expect(401);

      const out = await http
        .post("/api/v1/auth/logout")
        .set("Cookie", cookie)
        .expect(200);
      expect((out.headers["set-cookie"] as unknown as string[])[0]).toMatch(
        /accessToken=;/,
      );
    });
    it("register: rules and 18+ confirmation are required and stored", async () => {
      const RULES =
        "You must accept the rules and confirm you are 18 or older!";
      const base = newUser();
      const { acceptRules: _a, confirmAge: _c, ...withoutFlags } = base;

      const missing = await http
        .post("/api/v1/auth/register")
        .send(withoutFlags)
        .expect(400);
      expect(missing.body.message).toBe(RULES);
      const noRules = await http
        .post("/api/v1/auth/register")
        .send({ ...base, acceptRules: false })
        .expect(400);
      expect(noRules.body.message).toBe(RULES);
      const noAge = await http
        .post("/api/v1/auth/register")
        .send({ ...base, confirmAge: false })
        .expect(400);
      expect(noAge.body.message).toBe(RULES);

      await http.post("/api/v1/auth/register").send(base).expect(201);
      const stored = await prisma.user.findUnique({
        where: { email: base.email },
      });
      expect(stored?.acceptedRulesAt).toBeInstanceOf(Date);
      expect(stored?.ageConfirmedAt).toBeInstanceOf(Date);
    });

    it("accept-rules: older accounts can accept; needs login and both boxes ticked", async () => {
      const { user, cookie } = await loginAs();
      await prisma.user.update({
        where: { email: user.email },
        data: { acceptedRulesAt: null, ageConfirmedAt: null },
      });

      const before = await http
        .get("/api/v1/auth/me")
        .set("Cookie", cookie)
        .expect(200);
      expect(before.body.acceptedRulesAt).toBeNull();

      await http
        .post("/api/v1/auth/accept-rules")
        .send({ acceptRules: true, confirmAge: true })
        .expect(401);
      const bad = await http
        .post("/api/v1/auth/accept-rules")
        .set("Cookie", cookie)
        .send({ acceptRules: true, confirmAge: false })
        .expect(400);
      expect(bad.body.message).toMatch(/18 or older/);

      const ok = await http
        .post("/api/v1/auth/accept-rules")
        .set("Cookie", cookie)
        .send({ acceptRules: true, confirmAge: true })
        .expect(200);
      expect(ok.body.acceptedRulesAt).toEqual(expect.any(String));
      expect(ok.body.ageConfirmedAt).toEqual(expect.any(String));
      expect(ok.body).not.toHaveProperty("password");
    });
  });

  /* ──────────────────── Socket.IO: matchmaking, signaling, chat ──────────────────── */
  describe("realtime", () => {
    const connect = (cookie?: string) =>
      new Promise<Socket>((resolve, reject) => {
        const s = io(baseUrl, {
          extraHeaders: cookie ? { Cookie: cookie } : {},
          transports: ["websocket"],
          reconnection: false,
        });
        sockets.push(s);
        s.on("connect", () => resolve(s));
        s.on("connect_error", reject);
      });

    const once = <T = unknown>(s: Socket, event: string, ms = 4000) =>
      new Promise<T>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error(`timeout waiting for "${event}"`)),
          ms,
        );
        s.once(event, (data: T) => {
          clearTimeout(t);
          resolve(data);
        });
      });

    // Sockets left waiting by an earlier test would be matched with the next
    // test's users, so every test starts with a clean matchmaking queue.
    beforeEach(async () => {
      sockets.splice(0).forEach((s) => s.disconnect());
      await new Promise((r) => setTimeout(r, 150));
    });

    it("rejects sockets without a valid login cookie", async () => {
      await expect(connect()).rejects.toThrow("Not authenticated");
      await expect(connect("accessToken=garbage")).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("matches two users, relays signaling + chat only to the partner", async () => {
      const [u1, u2, u3] = [await loginAs(), await loginAs(), await loginAs()];
      const a = await connect(u1.cookie);
      const b = await connect(u2.cookie);
      const c = await connect(u3.cookie);

      const waiting = once(a, "waiting");
      a.emit("find-partner");
      await waiting;

      const matchedA = once<{
        matchId: string;
        initiator: boolean;
        peer: { fullname: string };
      }>(a, "matched");
      const matchedB = once<{
        matchId: string;
        initiator: boolean;
        peer: { fullname: string };
      }>(b, "matched");
      b.emit("find-partner");
      const [ma, mb] = await Promise.all([matchedA, matchedB]);
      expect(ma).toMatchObject({
        initiator: true,
        peer: { fullname: u2.user.fullname },
      });
      expect(mb).toMatchObject({
        initiator: false,
        peer: { fullname: u1.user.fullname },
      });

      // a third user must never see this traffic
      let leaked = false;
      for (const ev of ["offer", "answer", "ice-candidate", "chatMessage"]) {
        c.on(ev, () => (leaked = true));
      }

      const offer = once<{ data: { sdp: string } }>(b, "offer");
      a.emit("offer", {
        matchId: ma.matchId,
        data: { type: "offer", sdp: "x" },
      });
      expect((await offer).data.sdp).toBe("x");

      const answer = once<{ data: { sdp: string } }>(a, "answer");
      b.emit("answer", {
        matchId: mb.matchId,
        data: { type: "answer", sdp: "y" },
      });
      expect((await answer).data.sdp).toBe("y");

      const ice = once<{ data: { candidate: string } }>(a, "ice-candidate");
      b.emit("ice-candidate", {
        matchId: mb.matchId,
        data: { candidate: "c1" },
      });
      expect((await ice).data.candidate).toBe("c1");

      const chat = once<{ text: string }>(b, "chatMessage");
      a.emit("chatMessage", { matchId: ma.matchId, text: "  salam  " });
      expect((await chat).text).toBe("salam");

      expect((await a.emitWithAck("chatMessage", 123)).ok).toBe(false);
      expect(
        (
          await a.emitWithAck("chatMessage", {
            matchId: ma.matchId,
            text: "   ",
          })
        ).ok,
      ).toBe(false);
      expect(
        (
          await a.emitWithAck("chatMessage", {
            matchId: ma.matchId,
            text: "x".repeat(1001),
          })
        ).ok,
      ).toBe(false);
      const long = once<{ text: string }>(b, "chatMessage");
      expect(
        (
          await a.emitWithAck("chatMessage", {
            matchId: ma.matchId,
            text: "x".repeat(1000),
          })
        ).ok,
      ).toBe(true);
      expect((await long).text).toHaveLength(1000);

      await new Promise((r) => setTimeout(r, 200));
      expect(leaked).toBe(false);

      // partner disconnects -> the other side is told
      const left = once(b, "peer-left");
      a.disconnect();
      await left;

      // b looks for the next partner and meets c
      const nextB = once<{ initiator: boolean }>(b, "matched");
      const nextC = once<{ initiator: boolean }>(c, "matched");
      b.emit("find-partner"); // b waits…
      await once(b, "waiting");
      c.emit("find-partner"); // …c arrives
      const [mb2, mc2] = await Promise.all([nextB, nextC]);
      expect(mb2.initiator).toBe(true);
      expect(mc2.initiator).toBe(false);

      // explicit "leave" (the Next button) also notifies the partner
      const leftC = once(c, "peer-left");
      b.emit("leave");
      await leftC;
    });

    it("never matches a user with themselves (two tabs)", async () => {
      const { cookie } = await loginAs();
      const tab1 = await connect(cookie);
      const tab2 = await connect(cookie);

      const w1 = once(tab1, "waiting");
      tab1.emit("find-partner");
      await w1;

      const w2 = once(tab2, "waiting"); // still waiting, not matched with tab1
      tab2.emit("find-partner");
      await w2;
    });

    it("find-partner is refused until the rules are accepted", async () => {
      const { user, cookie } = await loginAs();
      await prisma.user.update({
        where: { email: user.email },
        data: { acceptedRulesAt: null, ageConfirmedAt: null },
      });
      const socket = await connect(cookie);

      const refused = once(socket, "rules-required");
      socket.emit("find-partner");
      await refused;

      await http
        .post("/api/v1/auth/accept-rules")
        .set("Cookie", cookie)
        .send({ acceptRules: true, confirmAge: true })
        .expect(200);

      const waiting = once(socket, "waiting");
      socket.emit("find-partner");
      await waiting;
    });

    /** Matches two fresh users and returns both sockets. */
    async function matchedPair() {
      const [u1, u2] = [await loginAs(), await loginAs()];
      const a = await connect(u1.cookie);
      const b = await connect(u2.cookie);
      const waiting = once(a, "waiting");
      a.emit("find-partner");
      await waiting;
      const matchedA = once<{ matchId: string }>(a, "matched");
      const matchedB = once(b, "matched");
      b.emit("find-partner");
      const [match] = await Promise.all([matchedA, matchedB]);
      return { u1, u2, a, b, matchId: match.matchId };
    }

    it("report-partner stores a report (also after the partner left)", async () => {
      const { u1, u2, a, b } = await matchedPair();
      const idOf = async (email: string) =>
        (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
      const [aId, bId] = [await idOf(u1.user.email), await idOf(u2.user.email)];

      const bad = await a.emitWithAck("report-partner", {
        reason: "NOT_A_REASON",
      });
      expect(bad).toEqual({ ok: false, message: "Please choose a reason." });

      const ok = await a.emitWithAck("report-partner", {
        reason: "HARASSMENT",
        details: "  was rude  ",
      });
      expect(ok).toEqual({ ok: true });
      const stored = await prisma.report.findFirstOrThrow({
        where: { reporterId: aId, reportedUserId: bId },
      });
      expect(stored).toMatchObject({
        reason: "HARASSMENT",
        details: "was rude",
        status: "OPEN",
      });

      // partner leaves: the report button still works for the debate that just ended
      const left = once(a, "peer-left");
      b.disconnect();
      await left;
      expect(await a.emitWithAck("report-partner", { reason: "SPAM" })).toEqual(
        { ok: true },
      );
      expect(
        await prisma.report.count({
          where: { reporterId: aId, reportedUserId: bId },
        }),
      ).toBe(2);

      // nobody to report for a user who never had a partner
      const lonely = await connect((await loginAs()).cookie);
      expect(
        await lonely.emitWithAck("report-partner", { reason: "SPAM" }),
      ).toEqual({
        ok: false,
        message: "There is nobody to report.",
      });
    });

    it("does not revive a stale search after a newer search matched", async () => {
      const { cookie } = await loginAs();
      const a = await connect(cookie);
      const b = await connect((await loginAs()).cookie);
      // Pause only the first DB-backed block lookup, then let the newer request win.
      const gateway = app.get(RealtimeGateway) as unknown as {
        loadBlockedIds(id: number): Promise<Set<number>>;
      };
      let release!: (value: Set<number>) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const pending = new Promise<Set<number>>((resolve) => {
        release = resolve;
      });
      const spy = jest
        .spyOn(gateway, "loadBlockedIds")
        .mockImplementationOnce(async () => {
          entered();
          return pending;
        });
      try {
        a.emit("find-partner");
        await started;
        const waiting = once(a, "waiting");
        a.emit("find-partner");
        await waiting;
        const matchedA = once(a, "matched");
        const matchedB = once(b, "matched");
        b.emit("find-partner");
        await Promise.all([matchedA, matchedB]);
        const left = jest.fn();
        b.on("peer-left", left);
        release(new Set());
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(left).not.toHaveBeenCalled();
      } finally {
        release(new Set());
        spy.mockRestore();
      }
    });

    it("enforces chat quotas and rejects stale match traffic", async () => {
      const { a, b, matchId } = await matchedPair();
      const received = jest.fn();
      b.on("chatMessage", received);
      const responses = await Promise.all(
        Array.from({ length: 25 }, () =>
          a.emitWithAck("chatMessage", { matchId, text: "hello" }),
        ),
      );
      expect(responses.filter((r) => r.ok)).toHaveLength(20);
      expect(responses.filter((r) => !r.ok)).toHaveLength(5);
      expect(
        (await a.emitWithAck("chatMessage", { matchId: "old", text: "stale" }))
          .ok,
      ).toBe(false);
      const signal = jest.fn();
      b.on("offer", signal);
      a.emit("offer", {
        matchId: "old",
        data: { type: "offer", sdp: "stale" },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(signal).not.toHaveBeenCalled();
      expect(received).toHaveBeenCalledTimes(20);
    });

    it("caps concurrent reports at twenty per rolling day", async () => {
      const { a, u1 } = await matchedPair();
      const responses = await Promise.all(
        Array.from({ length: 25 }, () =>
          a.emitWithAck("report-partner", { reason: "SPAM" }),
        ),
      );
      expect(responses.filter((r) => r.ok)).toHaveLength(20);
      expect(responses.filter((r) => !r.ok)).toHaveLength(5);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: u1.user.email },
      });
      expect(
        await prisma.report.count({ where: { reporterId: user.id } }),
      ).toBe(20);
    });

    it("block-partner ends the debate and the two are never matched again", async () => {
      const { u1, u2, a, b } = await matchedPair();

      const left = once(b, "peer-left");
      expect(await a.emitWithAck("block-partner")).toEqual({ ok: true });
      await left; // the blocked user sees an ordinary "partner left"

      const [aUser, bUser] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email: u1.user.email } }),
        prisma.user.findUniqueOrThrow({ where: { email: u2.user.email } }),
      ]);
      expect(
        await prisma.block.count({
          where: { blockerId: aUser.id, blockedId: bUser.id },
        }),
      ).toBe(1);

      // both search again: they must NOT be matched with each other
      const waitingA = once(a, "waiting");
      a.emit("find-partner");
      await waitingA;
      const waitingB = once(b, "waiting");
      b.emit("find-partner");
      await waitingB;

      // a third user is matched with the longest-waiting one (a), and b keeps waiting
      const c = await connect((await loginAs()).cookie);
      const matchedA = once<{ initiator: boolean }>(a, "matched");
      const matchedC = once(c, "matched");
      c.emit("find-partner");
      expect((await matchedA).initiator).toBe(true);
      await matchedC;

      // blocking a user that was never a partner is refused
      const stranger = await connect((await loginAs()).cookie);
      expect(await stranger.emitWithAck("block-partner")).toEqual({
        ok: false,
        message: "There is nobody to block.",
      });
    });
  });
});
