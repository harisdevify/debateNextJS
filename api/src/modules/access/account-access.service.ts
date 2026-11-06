import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export type AccountState = { status: string; suspendedUntil: Date | null };
export function effectiveStatus(user: AccountState, now = Date.now()) {
  if (
    user.status === 'SUSPENDED' &&
    user.suspendedUntil &&
    user.suspendedUntil.getTime() <= now
  )
    return 'ACTIVE';
  return user.status;
}
export function assertActive(user: AccountState) {
  const status = effectiveStatus(user);
  if (status === 'BANNED')
    throw new ForbiddenException('This account is banned.');
  if (status === 'SUSPENDED')
    throw new ForbiddenException(
      `This account is suspended${user.suspendedUntil ? ` until ${user.suspendedUntil.toISOString()}` : ''}.`
    );
}
@Injectable()
export class AccountAccessService {
  readonly events = new EventEmitter();
  constructor(private readonly prisma: PrismaService) {}
  tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async requireValidToken(token: string): Promise<void> {
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { tokenHash: this.tokenHash(token) },
      select: { tokenHash: true },
    });
    if (revoked) throw new UnauthorizedException('Session has ended.');
  }

  async revokeToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.tokenHash(token);
    await this.prisma.revokedToken.upsert({
      where: { tokenHash },
      create: { tokenHash, userId, expiresAt },
      update: {},
    });
    // Local sockets are disconnected immediately; other instances reject
    // the token on their next packet or handshake.
    this.events.emit('session-revoked', { tokenHash });
  }

  async requireActive(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, suspendedUntil: true },
    });
    if (!user) throw new UnauthorizedException('Account not found.');
    assertActive(user);
    return user;
  }
}
