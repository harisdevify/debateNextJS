import { EventEmitter } from 'node:events';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  AccountAccessService,
  assertActive,
  effectiveStatus,
} from '../src/access/account-access.service';
import { AdminGuard } from '../src/admin/admin.guard';
import { AdminService } from '../src/admin/admin.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('moderation rules', () => {
  it('allows expired suspensions without requiring a background task', () => {
    const user = { status: 'SUSPENDED', suspendedUntil: new Date(1000) };
    expect(effectiveStatus(user, 2000)).toBe('ACTIVE');
    expect(() => assertActive(user)).not.toThrow();
  });
  it('denies banned and currently suspended accounts', () => {
    expect(() =>
      assertActive({ status: 'BANNED', suspendedUntil: null })
    ).toThrow('banned');
    expect(() =>
      assertActive({
        status: 'SUSPENDED',
        suspendedUntil: new Date(Date.now() + 60000),
      })
    ).toThrow('suspended');
  });
  const context = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;
  const config = {
    getOrThrow: () => 'http://localhost:3000',
  } as unknown as ConfigService;
  it('rejects ordinary users even when the frontend is bypassed', async () => {
    const access = {
      requireActive: jest.fn().mockResolvedValue({ role: 'USER' }),
    } as unknown as AccountAccessService;
    await expect(
      new AdminGuard(access, config).canActivate(
        context({ user: { id: 1 }, method: 'GET' })
      )
    ).rejects.toThrow('Administrator');
  });
  it('requires exact origin and JSON for admin writes', async () => {
    const access = {
      requireActive: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
    } as unknown as AccountAccessService;
    const guard = new AdminGuard(access, config);
    const req = {
      user: { id: 1 },
      method: 'POST',
      headers: { origin: 'https://untrusted.example' },
      is: () => true,
    };
    await expect(guard.canActivate(context(req))).rejects.toThrow('origin');
    req.headers.origin = 'http://localhost:3000';
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    req.is = () => false;
    await expect(guard.canActivate(context(req))).rejects.toThrow(
      'content type'
    );
  });
  it('rechecks current account status even for a valid old JWT', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ id: 42 }),
    } as unknown as JwtService;
    const access = {
      requireActive: jest.fn().mockRejectedValue(new Error('banned')),
    } as unknown as AccountAccessService;
    await expect(
      new JwtAuthGuard(jwt, access).canActivate(
        context({ cookies: { accessToken: 'old-token' } })
      )
    ).rejects.toThrow('banned');
    expect(access.requireActive).toHaveBeenCalledWith(42);
  });
  function service(reportStatus = 'OPEN', targetRole = 'USER') {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      report: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            status: reportStatus,
            reportedUserId: 2,
          }),
        update: jest.fn(),
      },
      user: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve({
              id: where.id,
              role: where.id === 1 ? 'ADMIN' : targetRole,
              status: 'ACTIVE',
              suspendedUntil: null,
            })
          ),
        update: jest.fn(),
      },
      moderationAction: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...data, id: 9 })
          ),
      },
    };
    const prisma = {
      $transaction: jest.fn((fn) => fn(tx)),
    } as unknown as PrismaService;
    const access = { events: new EventEmitter() } as AccountAccessService;
    const listener = jest.fn();
    access.events.on('moderated', listener);
    return { admin: new AdminService(prisma, access), tx, listener };
  }
  it('cannot review a report twice and does not emit a failed action', async () => {
    const { admin, tx, listener } = service('REVIEWED');
    await expect(
      admin.moderate(
        1,
        { action: 'BAN', reason: 'Test reason' },
        { reportId: 7 }
      )
    ).rejects.toThrow('already reviewed');
    expect(tx.moderationAction.create).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
  it('saves action history, closes a report and emits only after the transaction', async () => {
    const { admin, tx, listener } = service();
    await admin.moderate(
      1,
      { action: 'SUSPEND', durationHours: 24, reason: 'Repeated harassment' },
      { reportId: 7 }
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUSPENDED',
          suspendedUntil: expect.any(Date),
        }),
      })
    );
    expect(tx.report.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'REVIEWED' },
    });
    expect(tx.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 1,
          targetId: 2,
          previousStatus: 'ACTIVE',
        }),
      })
    );
    expect(listener).toHaveBeenCalledWith({ userId: 2, kind: 'SUSPEND' });
  });
  it('protects admin accounts and requires a duration for suspension', async () => {
    const { admin } = service('OPEN', 'ADMIN');
    await expect(
      admin.moderate(
        1,
        { action: 'BAN', reason: 'Test reason' },
        { targetId: 2 }
      )
    ).rejects.toThrow('Admin accounts');
    await expect(
      admin.moderate(
        1,
        { action: 'SUSPEND', reason: 'Test reason' },
        { targetId: 3 }
      )
    ).rejects.toThrow('duration');
  });
});
