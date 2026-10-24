import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const RUN = `e2e${Date.now()}`;
const PASSWORD = 'password123';
let counter = 0;

const newUser = (name = `User ${++counter}`) => ({
  fullname: name,
  email: `${RUN}-${counter}@test.dev`,
  gender: 'male',
  education: 'BS',
  country: 'PK',
  password: PASSWORD,
});

describe('Debate API (e2e)', () => {
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
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    http = request(baseUrl);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await app.close();
  });

  /** Registers + logs in; returns the Cookie header value. */
  async function loginAs(user = newUser()) {
    await http.post('/api/v1/auth/register').send(user).expect(201);
    const res = await http
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    return { user, cookie };
  }

  /* ───────────────────────── REST ───────────────────────── */
  describe('auth', () => {
    it('GET /health', async () => {
      const res = await http.get('/api/v1/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', service: 'debate-api' });
    });

    it('register: one readable message per validation error', async () => {
      const base = newUser();
      const msg = async (body: object) =>
        (await http.post('/api/v1/auth/register').send(body).expect(400)).body.message;

      expect(await msg({})).toBe('All fields are required!');
      expect(await msg({ ...base, fullname: '   ' })).toBe('All fields are required!');
      expect(await msg({ ...base, email: 'not-an-email' })).toBe('Invalid email address!');
      expect(await msg({ ...base, password: '123' })).toBe(
        'Password must be at least 8 characters!'
      );
      expect(typeof (await msg({ ...base, role: 'admin' }))).toBe('string'); // extra field
    });

    it('register: trims, lower-cases email, rejects duplicates (any case)', async () => {
      const user = newUser('  Trim Me  ');
      await http
        .post('/api/v1/auth/register')
        .send({ ...user, email: user.email.toUpperCase() })
        .expect(201);

      const stored = await prisma.user.findUnique({ where: { email: user.email } });
      expect(stored?.fullname).toBe('Trim Me');
      expect(stored?.password).not.toBe(PASSWORD); // hashed

      const dup = await http.post('/api/v1/auth/register').send(user).expect(409);
      expect(dup.body.message).toBe('Email already exists!');
    });

    it('login: same error for wrong password and unknown email; cookie is httpOnly', async () => {
      const user = newUser();
      await http.post('/api/v1/auth/register').send(user).expect(201);

      const wrong = await http
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'wrong-password' })
        .expect(401);
      const unknown = await http
        .post('/api/v1/auth/login')
        .send({ email: `nobody-${RUN}@test.dev`, password: 'whatever1' })
        .expect(401);
      expect(wrong.body.message).toBe('Invalid email or password!');
      expect(unknown.body.message).toBe(wrong.body.message);

      const ok = await http
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      expect(ok.body).not.toHaveProperty('password');
      expect(ok.body.email).toBe(user.email);
      const cookie = (ok.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/^accessToken=/);
      expect(cookie).toMatch(/HttpOnly/i);

      const empty = await http.post('/api/v1/auth/login').expect(400);
      expect(empty.body.message).toBe('Email and password are required!');
    });

    it('me / patch me / logout', async () => {
      const { user, cookie } = await loginAs();

      await http.get('/api/v1/auth/me').expect(401);
      await http.get('/api/v1/auth/me').set('Cookie', 'accessToken=garbage').expect(401);

      const me = await http.get('/api/v1/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body).toMatchObject({ email: user.email, fullname: user.fullname });
      expect(me.body).not.toHaveProperty('password');

      const patched = await http
        .patch('/api/v1/auth/me')
        .set('Cookie', cookie)
        .send({ fullname: '  New Name ', gender: 'female', education: 'MS', country: 'UK' })
        .expect(200);
      expect(patched.body).toMatchObject({ fullname: 'New Name', gender: 'female', country: 'UK' });

      const bad = await http
        .patch('/api/v1/auth/me')
        .set('Cookie', cookie)
        .send({ fullname: '', gender: 'f', education: 'm', country: 'u' })
        .expect(400);
      expect(bad.body.message).toBe('All fields are required!');

      await http
        .patch('/api/v1/auth/me')
        .send({ fullname: 'x', gender: 'f', education: 'm', country: 'u' })
        .expect(401);

      const out = await http.post('/api/v1/auth/logout').set('Cookie', cookie).expect(200);
      expect((out.headers['set-cookie'] as unknown as string[])[0]).toMatch(/accessToken=;/);
    });
  });

  /* ──────────────────── Socket.IO: matchmaking, signaling, chat ──────────────────── */
  describe('realtime', () => {
    const connect = (cookie?: string) =>
      new Promise<Socket>((resolve, reject) => {
        const s = io(baseUrl, {
          extraHeaders: cookie ? { Cookie: cookie } : {},
          transports: ['websocket'],
          reconnection: false,
        });
        sockets.push(s);
        s.on('connect', () => resolve(s));
        s.on('connect_error', reject);
      });

    const once = <T = unknown>(s: Socket, event: string, ms = 4000) =>
      new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
        s.once(event, (data: T) => {
          clearTimeout(t);
          resolve(data);
        });
      });

    it('rejects sockets without a valid login cookie', async () => {
      await expect(connect()).rejects.toThrow('Not authenticated');
      await expect(connect('accessToken=garbage')).rejects.toThrow('Not authenticated');
    });

    it('matches two users, relays signaling + chat only to the partner', async () => {
      const [u1, u2, u3] = [await loginAs(), await loginAs(), await loginAs()];
      const a = await connect(u1.cookie);
      const b = await connect(u2.cookie);
      const c = await connect(u3.cookie);

      const waiting = once(a, 'waiting');
      a.emit('find-partner');
      await waiting;

      const matchedA = once<{ initiator: boolean; peer: { fullname: string } }>(a, 'matched');
      const matchedB = once<{ initiator: boolean; peer: { fullname: string } }>(b, 'matched');
      b.emit('find-partner');
      const [ma, mb] = await Promise.all([matchedA, matchedB]);
      expect(ma).toEqual({ initiator: true, peer: { fullname: u2.user.fullname } });
      expect(mb).toEqual({ initiator: false, peer: { fullname: u1.user.fullname } });

      // a third user must never see this traffic
      let leaked = false;
      for (const ev of ['offer', 'answer', 'ice-candidate', 'chatMessage']) {
        c.on(ev, () => (leaked = true));
      }

      const offer = once<{ sdp: string }>(b, 'offer');
      a.emit('offer', { type: 'offer', sdp: 'x' });
      expect((await offer).sdp).toBe('x');

      const answer = once<{ sdp: string }>(a, 'answer');
      b.emit('answer', { type: 'answer', sdp: 'y' });
      expect((await answer).sdp).toBe('y');

      const ice = once<{ candidate: string }>(a, 'ice-candidate');
      b.emit('ice-candidate', { candidate: 'c1' });
      expect((await ice).candidate).toBe('c1');

      const chat = once<{ text: string }>(b, 'chatMessage');
      a.emit('chatMessage', '  salam  ');
      expect((await chat).text).toBe('salam');

      a.emit('chatMessage', 123); // wrong type: ignored
      a.emit('chatMessage', '   '); // empty: ignored
      const long = once<{ text: string }>(b, 'chatMessage');
      a.emit('chatMessage', 'x'.repeat(5000));
      expect((await long).text).toHaveLength(1000);

      await new Promise((r) => setTimeout(r, 200));
      expect(leaked).toBe(false);

      // partner disconnects -> the other side is told
      const left = once(b, 'peer-left');
      a.disconnect();
      await left;

      // b looks for the next partner and meets c
      const nextB = once<{ initiator: boolean }>(b, 'matched');
      const nextC = once<{ initiator: boolean }>(c, 'matched');
      b.emit('find-partner'); // b waits…
      await once(b, 'waiting');
      c.emit('find-partner'); // …c arrives
      const [mb2, mc2] = await Promise.all([nextB, nextC]);
      expect(mb2.initiator).toBe(true);
      expect(mc2.initiator).toBe(false);

      // explicit "leave" (the Next button) also notifies the partner
      const leftC = once(c, 'peer-left');
      b.emit('leave');
      await leftC;
    });

    it('never matches a user with themselves (two tabs)', async () => {
      const { cookie } = await loginAs();
      const tab1 = await connect(cookie);
      const tab2 = await connect(cookie);

      const w1 = once(tab1, 'waiting');
      tab1.emit('find-partner');
      await w1;

      const w2 = once(tab2, 'waiting'); // still waiting, not matched with tab1
      tab2.emit('find-partner');
      await w2;
    });
  });
});
