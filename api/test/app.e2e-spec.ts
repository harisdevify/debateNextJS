import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { RealtimeGateway } from "../src/modules/realtime/realtime.gateway";
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
    // Explicitly leave any lingering sessions before removing their participants.
    const gateway = app.get(RealtimeGateway);
    const connected = sockets.filter((socket) => socket.connected);
    connected.forEach((socket) => socket.emit('leave'));
    // Socket events are delivered asynchronously; allow the event loop to
    // process leave notifications, then await any resulting history writes.
    await new Promise((resolve) => setTimeout(resolve, 50));
    sockets.forEach((socket) => socket.disconnect());
    await gateway.drainHistoryWrites();
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

    it("issues a short-lived socket ticket bound to the logged-in session", async () => {
      await http.get("/api/v1/auth/socket-ticket").expect(401);
      const { cookie } = await loginAs();
      const issued = await http.get("/api/v1/auth/socket-ticket")
        .set("Cookie", cookie)
        .expect(200);
      expect(issued.headers["cache-control"]).toBe("no-store");
      expect(typeof issued.body.ticket).toBe("string");
      expect(issued.body.ticket.split(".")).toHaveLength(3);

      const ticketSocket = io(baseUrl, {
        transports: ["websocket"],
        reconnection: false,
        auth: { ticket: issued.body.ticket },
      });
      sockets.push(ticketSocket);
      await new Promise<void>((resolve, reject) => {
        ticketSocket.once("connect", () => resolve());
        ticketSocket.once("connect_error", reject);
      });

      await http.post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie)
        .expect(200);
      await http.get("/api/v1/auth/socket-ticket")
        .set("Cookie", cookie).expect(401);
      const rejected = io(baseUrl, {
        transports: ["websocket"],
        reconnection: false,
        auth: { ticket: issued.body.ticket },
      });
      sockets.push(rejected);
      const error = await new Promise<Error>((resolve) => {
        rejected.once("connect_error", resolve);
      });
      expect(error.message).toBe("Not authenticated");
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
      expect(res.headers['x-powered-by']).toBeUndefined();
      const ready = await http.get("/api/v1/health/ready").expect(200);
      expect(ready.body).toEqual({ status: "ready", service: "debate-api" });
      expect(ready.headers['x-powered-by']).toBeUndefined();
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
      expect(cookie).toMatch(/SameSite=Lax/i);

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
        .set("Origin", "http://localhost:3000")
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
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie)
        .send({ fullname: "", gender: "f", education: "m", country: "u" })
        .expect(400);
      expect(bad.body.message).toBe("All fields are required!");

      await http
        .patch("/api/v1/auth/me")
        .set("Origin", "http://localhost:3000")
        .send({ fullname: "x", gender: "f", education: "m", country: "u" })
        .expect(401);

      const out = await http
        .post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:3000")
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

    it("rejects cross-site and missing-origin cookie-authenticated writes", async () => {
      const { cookie } = await loginAs();
      const body = {
        fullname: "Blocked Update",
        gender: "female",
        education: "MS",
        country: "PK",
      };
      await http.patch("/api/v1/auth/me")
        .set("Cookie", cookie)
        .send(body)
        .expect(403);
      await http.patch("/api/v1/auth/me")
        .set("Cookie", cookie)
        .set("Origin", "https://malicious.example")
        .send(body)
        .expect(403);
      await http.post("/api/v1/auth/accept-rules")
        .set("Cookie", cookie)
        .set("Origin", "https://malicious.example")
        .send({ acceptRules: true, confirmAge: true })
        .expect(403);
      await http.post("/api/v1/auth/logout")
        .set("Cookie", cookie)
        .set("Origin", "https://malicious.example")
        .expect(403);
      await http.patch("/api/v1/auth/me")
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:3000")
        .send(body)
        .expect(200);
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
        .set("Origin", "http://localhost:3000")
        .send({ acceptRules: true, confirmAge: true })
        .expect(401);
      const bad = await http
        .post("/api/v1/auth/accept-rules")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie)
        .send({ acceptRules: true, confirmAge: false })
        .expect(400);
      expect(bad.body.message).toMatch(/18 or older/);

      const ok = await http
        .post("/api/v1/auth/accept-rules")
        .set("Origin", "http://localhost:3000")
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

    it("resumes the same formal session and authoritative clock after a short disconnect", async () => {
      const firstUser = await loginAs();
      const secondUser = await loginAs();
      const first = await connect(firstUser.cookie);
      const second = await connect(secondUser.cookie);
      const formal = { topic: "science", language: "en", mode: "formal" };
      const waiting = once(first, "waiting");
      first.emit("find-partner", formal);
      await waiting;
      const matchedFirst = once<{ matchId: string }>(first, "matched");
      const matchedSecond = once(second, "matched");
      const clockFirst = once<{ startedAt: number; endsAt: number; isSpeaker: boolean; turnNumber: number }>(first, "formal-state");
      const clockSecond = once<{ isSpeaker: boolean }>(second, "formal-state");
      second.emit("find-partner", formal);
      const [match, , before, other] = await Promise.all([matchedFirst, matchedSecond, clockFirst, clockSecond]);
      expect(before.isSpeaker).toBe(true);
      expect(other.isSpeaker).toBe(false);
      expect(before.endsAt - before.startedAt).toBe(600_000);
      const reconnecting = once(first, "peer-reconnecting");
      second.disconnect();
      await reconnecting;
      const resumed = await connect(secondUser.cookie);
      const rematched = once<{ matchId: string }>(resumed, "matched");
      const firstRematched = once(first, "matched");
      const clock = once<{ startedAt: number; endsAt: number; turnNumber: number; isSpeaker: boolean }>(resumed, "formal-state");
      resumed.emit("find-partner", formal);
      const [matchAgain, , after] = await Promise.all([rematched, firstRematched, clock]);
      expect(matchAgain.matchId).toBe(match.matchId);
      expect(after.startedAt).toBe(before.startedAt);
      expect(after.endsAt).toBe(before.endsAt);
      expect(after.turnNumber).toBe(1);
      expect(after.isSpeaker).toBe(false);
      const left = once(first, "peer-left");
      resumed.emit("leave");
      await left;
    });

    it("matches only identical topic, language and mode without skipping compatible FIFO entries", async () => {
      const a = await connect((await loginAs()).cookie);
      const b = await connect((await loginAs()).cookie);
      const c = await connect((await loginAs()).cookie);
      const d = await connect((await loginAs()).cookie);
      const technology = { topic: "technology", language: "ur", mode: "formal" };
      const science = { topic: "science", language: "ur", mode: "formal" };
      const wrongLanguage = { topic: "technology", language: "en", mode: "formal" };
      const wrongMode = { topic: "technology", language: "ur", mode: "friendly" };
      const wa = once(a, "waiting");
      a.emit("find-partner", technology);
      await wa;
      const wb = once(b, "waiting");
      b.emit("find-partner", science);
      await wb;
      const wc = once(c, "waiting");
      c.emit("find-partner", wrongLanguage);
      await wc;
      const invalid = once<{ message: string }>(d, "search-error");
      d.emit("find-partner", { topic: "technology", language: "invalid", mode: "formal" });
      expect((await invalid).message).toMatch(/valid topic/);
      const waitingD = once(d, "waiting");
      d.emit("find-partner", wrongMode);
      await waitingD;
      const e = await connect((await loginAs()).cookie);
      const matchedA = once<{ matchId: string; preferences: typeof technology }>(a, "matched");
      const matchedE = once<{ matchId: string; preferences: typeof technology }>(e, "matched");
      e.emit("find-partner", technology);
      const [first, second] = await Promise.all([matchedA, matchedE]);
      expect(first.matchId).toBe(second.matchId);
      expect(first.preferences).toEqual(technology);
      expect(second.preferences).toEqual(technology);
      // b/c/d remain in the queue and can each meet their compatible partner.
      const f = await connect((await loginAs()).cookie);
      const matchedB = once(b, "matched");
      const matchedF = once(f, "matched");
      f.emit("find-partner", science);
      await Promise.all([matchedB, matchedF]);
      const g = await connect((await loginAs()).cookie);
      const matchedC = once(c, "matched");
      const matchedG = once(g, "matched");
      g.emit("find-partner", wrongLanguage);
      await Promise.all([matchedC, matchedG]);
      const h = await connect((await loginAs()).cookie);
      const matchedD = once(d, "matched");
      const matchedH = once(h, "matched");
      h.emit("find-partner", wrongMode);
      await Promise.all([matchedD, matchedH]);
    });

    it("keeps the selected preferences across Next and still enforces one active tab", async () => {
      const { cookie } = await loginAs();
      const a = await connect(cookie);
      const secondTab = await connect(cookie);
      const partner = await connect((await loginAs()).cookie);
      const preferences = { topic: "science", language: "en", mode: "friendly" };
      const waiting = once(a, "waiting");
      a.emit("find-partner", preferences);
      await waiting;
      const busy = once(secondTab, "debate-already-active");
      secondTab.emit("find-partner", preferences);
      await busy;
      const matchedA = once(a, "matched");
      const matchedPartner = once(partner, "matched");
      partner.emit("find-partner", preferences);
      await Promise.all([matchedA, matchedPartner]);
      const peerLeft = once(partner, "peer-left");
      a.emit("leave");
      await peerLeft;
      const nextWaiting = once(a, "waiting");
      a.emit("find-partner", preferences);
      await nextWaiting;
      const blockedSecond = once(secondTab, "debate-already-active");
      secondTab.emit("find-partner", preferences);
      await blockedSecond;
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
        data: { type: "offer", sdp: "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" },
      });
      expect((await offer).data.sdp).toContain("m=audio");

      const answer = once<{ data: { sdp: string } }>(a, "answer");
      b.emit("answer", {
        matchId: mb.matchId,
        data: { type: "answer", sdp: "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" },
      });
      expect((await answer).data.sdp).toContain("m=audio");

      const ice = once<{ data: { candidate: string } }>(a, "ice-candidate");
      b.emit("ice-candidate", {
        matchId: mb.matchId,
        data: { candidate: "candidate:1 1 UDP 2122260223 192.0.2.1 5000 typ host" },
      });
      expect((await ice).data.candidate).toContain("candidate:1");

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

    it("rejects malformed and oversized signaling without leaking to a matched peer", async () => {
      const a = await connect((await loginAs()).cookie);
      const b = await connect((await loginAs()).cookie);
      const waiting = once(a, "waiting");
      a.emit("find-partner");
      await waiting;
      const matchedA = once<{ matchId: string }>(a, "matched");
      const matchedB = once(b, "matched");
      b.emit("find-partner");
      const [match] = await Promise.all([matchedA, matchedB]);
      const leaked = jest.fn();
      b.on("offer", leaked);
      b.on("ice-candidate", leaked);
      a.emit("offer", { matchId: match.matchId, data: { type: "offer", sdp: "bad" } });
      a.emit("offer", { matchId: match.matchId, data: { type: "offer", sdp: "v=0".repeat(70_000) } });
      a.emit("ice-candidate", { matchId: match.matchId, data: { candidate: "invalid" } });
      a.emit("ice-candidate", { matchId: "expired", data: { candidate: "candidate:1 1 UDP 2 192.0.2.1 55 typ host" } });
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(leaked).not.toHaveBeenCalled();
      const restart = once<{ matchId: string }>(b, "ice-restart-request");
      a.emit("ice-restart-request", { matchId: match.matchId });
      expect((await restart).matchId).toBe(match.matchId);
      a.emit("ice-restart-request", { matchId: match.matchId }); // throttled
    });

    it("never matches a user with themselves (two tabs)", async () => {
      const { cookie } = await loginAs();
      const tab1 = await connect(cookie);
      const tab2 = await connect(cookie);

      const w1 = once(tab1, "waiting");
      tab1.emit("find-partner");
      await w1;

      const busy = once(tab2, "debate-already-active");
      tab2.emit("find-partner");
      await busy;
      // After the original tab leaves, the other tab is allowed to search.
      tab1.emit("leave");
      const w2 = once(tab2, "waiting");
      tab2.emit("find-partner");
      await w2;
    });

    it("logout revokes only its JWT and disconnects matching sockets across tabs", async () => {
      const { user, cookie } = await loginAs();
      // A second login must have a distinct token and remain usable.
      const secondLogin = await http.post("/api/v1/auth/login")
        .send({ email: user.email, password: PASSWORD }).expect(200);
      const secondCookie = (secondLogin.headers["set-cookie"] as unknown as string[])[0].split(";")[0];
      expect(secondCookie).not.toBe(cookie);
      const first = await connect(cookie);
      const otherTab = await connect(cookie);
      const separateSession = await connect(secondCookie);
      const disconnectedFirst = once(first, "session-revoked");
      const disconnectedOther = once(otherTab, "session-revoked");
      await http.post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", cookie).expect(200);
      await Promise.all([disconnectedFirst, disconnectedOther]);
      await http.get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
      await http.get("/api/v1/auth/me").set("Cookie", secondCookie).expect(200);
      expect(separateSession.connected).toBe(true);
      await expect(connect(cookie)).rejects.toThrow("Not authenticated");
    });

    it("refuses a third-party match while the same account is already matched", async () => {
      const { cookie } = await loginAs();
      const first = await connect(cookie);
      const secondTab = await connect(cookie);
      const partner = await connect((await loginAs()).cookie);
      const waiting = once(first, "waiting");
      first.emit("find-partner");
      await waiting;
      const matched = once(first, "matched");
      const matchedPartner = once(partner, "matched");
      partner.emit("find-partner");
      await Promise.all([matched, matchedPartner]);
      const busy = once(secondTab, "debate-already-active");
      secondTab.emit("find-partner");
      await busy;
      const partnerLeft = once(partner, "peer-left");
      first.emit("leave");
      await partnerLeft;
      const secondWaiting = once(secondTab, "waiting");
      secondTab.emit("find-partner");
      await secondWaiting;
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
        .set("Origin", "http://localhost:3000")
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


    it("records a session only when it ends and exposes history solely to participants", async () => {
      const { u1, u2, a, b, matchId } = await matchedPair();
      const outsider = await loginAs();
      await http.get('/api/v1/debates/history').expect(401);
      const initial = await http.get('/api/v1/debates/history')
        .set('Cookie', u1.cookie).expect(200);
      expect(initial.body.items.find((item: { id: string }) => item.id === matchId)).toBeUndefined();

      const notified = once(b, 'peer-left');
      a.emit('leave');
      await notified;

      let participantHistory: Array<{ id: string; endReason: string; durationSeconds: number }> = [];
      for (let attempt = 0; attempt < 30; attempt++) {
        const response = await http.get('/api/v1/debates/history')
          .set('Cookie', u1.cookie).expect(200);
        participantHistory = response.body.items;
        if (participantHistory.some((item) => item.id === matchId)) break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const saved = participantHistory.find((item) => item.id === matchId);
      expect(saved).toMatchObject({ endReason: 'ENDED', topic: 'religion', language: 'en', mode: 'friendly' });
      expect(saved!.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(Object.keys(saved!)).toEqual(expect.arrayContaining(['startedAt', 'endedAt']));
      expect(saved).not.toHaveProperty('firstUserId');
      expect(saved).not.toHaveProperty('secondUserId');
      expect(saved).not.toHaveProperty('partner');

      const otherParticipant = await http.get('/api/v1/debates/history')
        .set('Cookie', u2.cookie).expect(200);
      expect(otherParticipant.body.items.some((item: { id: string }) => item.id === matchId)).toBe(true);
      const unrelated = await http.get('/api/v1/debates/history')
        .set('Cookie', outsider.cookie).expect(200);
      expect(unrelated.body.items).toHaveLength(0);

      a.emit('leave'); // repeated leave must not record another row
      expect(await prisma.debateHistory.count({ where: { id: matchId } })).toBe(1);
      await http.get('/api/v1/debates/history?page=0').set('Cookie', u1.cookie).expect(400);
      await http.get('/api/v1/debates/history?page=2.5').set('Cookie', u1.cookie).expect(400);
      await http.get('/api/v1/debates/history?page=10001').set('Cookie', u1.cookie).expect(400);
    });

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

