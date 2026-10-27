import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { PrismaService } from '../prisma/prisma.service';

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
