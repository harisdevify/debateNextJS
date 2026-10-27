import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
const prefix = `moderation-${Date.now()}`;
const origin = 'http://localhost:3000';
const password = 'password123';
describe('admin moderation (real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let url: string;
  let admin: { id: number; cookie: string };
  let member: { id: number; cookie: string; email: string };
  let reportId: number;
  const sockets: Socket[] = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    http = request(url);
  });
  let counter = 0;
  const account = async (role = 'USER') => {
    const email = `${prefix}-${++counter}@test.dev`;
    await http
      .post('/api/v1/auth/register')
      .send({
        fullname: 'Test user',
        email,
        password,
        gender: 'male',
        country: 'PK',
        education: 'BS',
        acceptRules: true,
        confirmAge: true,
      })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    if (role === 'ADMIN')
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    const res = await http
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return {
      id: user.id,
      email,
      cookie: (res.headers['set-cookie'] as unknown as string[])[0].split(
        ';'
      )[0],
    };
  };
  beforeEach(async () => {
    sockets.splice(0).forEach((s) => s.disconnect());
    await prisma.rateLimit.deleteMany();
    admin = await account('ADMIN');
    member = await account();
    const reporter = await account();
    reportId = (
      await prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedUserId: member.id,
          reason: 'HARASSMENT',
          details: 'Test report',
        },
      })
    ).id;
  });
  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    const ids = (
      await prisma.user.findMany({
        where: { email: { startsWith: prefix } },
        select: { id: true },
      })
    ).map((u) => u.id);
    await prisma.moderationAction.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { targetId: { in: ids } }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });
  const action = (kind: string, extra = {}) =>
    http
      .post(`/api/v1/admin/reports/${reportId}/action`)
      .set('Cookie', admin.cookie)
      .set('Origin', origin)
      .send({ action: kind, reason: 'Reviewed test evidence', ...extra });
  it('protects admin APIs, validates origin, hides sensitive fields and rejects role injection', async () => {
    await http.get('/api/v1/admin/reports').expect(401);
    await http
      .get('/api/v1/admin/reports')
      .set('Cookie', member.cookie)
      .expect(403);
    const reports = await http
      .get('/api/v1/admin/reports')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(JSON.stringify(reports.body)).not.toContain('password');
    await http
      .post(`/api/v1/admin/reports/${reportId}/action`)
      .set('Cookie', admin.cookie)
      .set('Origin', 'https://evil.example')
      .send({ action: 'BAN', reason: 'Test reason' })
      .expect(403);
    await http
      .patch('/api/v1/auth/me')
      .set('Cookie', member.cookie)
      .send({ role: 'ADMIN' })
      .expect(400);
  });
  it('atomically reviews once when two actions race', async () => {
    const results = await Promise.all([action('WARN'), action('DISMISS')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.moderationAction.count({ where: { reportId } })).toBe(
      1
    );
    expect(
      (await prisma.report.findUniqueOrThrow({ where: { id: reportId } }))
        .status
    ).toBe('REVIEWED');
  });
  it('bans old JWTs and active sockets; restore preserves the audit history', async () => {
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Cookie: member.cookie },
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    const disconnected = new Promise<void>((resolve) =>
      socket.once('disconnect', () => resolve())
    );
    await action('BAN').expect(201);
    await disconnected;
    await http.get('/api/v1/auth/me').set('Cookie', member.cookie).expect(403);
    await http
      .post('/api/v1/auth/login')
      .send({ email: member.email, password })
      .expect(403);
    await http
      .post(`/api/v1/admin/users/${member.id}/action`)
      .set('Cookie', admin.cookie)
      .set('Origin', origin)
      .send({ action: 'RESTORE', reason: 'Appeal accepted' })
      .expect(201);
    await http.get('/api/v1/auth/me').set('Cookie', member.cookie).expect(200);
    expect(
      await prisma.moderationAction.count({ where: { targetId: member.id } })
    ).toBe(2);
  });
  it('expires a suspension and exposes a warning without internal notes', async () => {
    await action('SUSPEND', { durationHours: 1 }).expect(201);
    await http.get('/api/v1/auth/me').set('Cookie', member.cookie).expect(403);
    await prisma.user.update({
      where: { id: member.id },
      data: { suspendedUntil: new Date(Date.now() - 1000) },
    });
    await http.get('/api/v1/auth/me').set('Cookie', member.cookie).expect(200);
    await http
      .post(`/api/v1/admin/users/${member.id}/action`)
      .set('Cookie', admin.cookie)
      .set('Origin', origin)
      .send({ action: 'WARN', reason: 'Private admin reasoning' })
      .expect(201);
    const me = await http
      .get('/api/v1/auth/me')
      .set('Cookie', member.cookie)
      .expect(200);
    expect(me.body.lastWarningAt).toEqual(expect.any(String));
    expect(JSON.stringify(me.body)).not.toContain('Private admin');
  });
});
