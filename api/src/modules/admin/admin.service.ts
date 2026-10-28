import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountAccessService,
  assertActive,
  effectiveStatus,
} from '../access/account-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListDto, ModerateDto } from './dto/admin.dto';
const userSelect = {
  id: true,
  fullname: true,
  email: true,
  role: true,
  status: true,
  suspendedUntil: true,
} as const;
const actorSelect = { id: true, fullname: true } as const;
const PAGE_SIZE = 20;
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountAccessService
  ) {}
  async reports(query: AdminListDto) {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        take: PAGE_SIZE,
        skip: (query.page - 1) * PAGE_SIZE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          reporter: { select: actorSelect },
          reportedUser: { select: userSelect },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return {
      items: items.map((report) => ({
        ...report,
        reportedUser: {
          ...report.reportedUser,
          effectiveStatus: effectiveStatus(report.reportedUser),
        },
      })),
      total,
      page: query.page,
      pageSize: PAGE_SIZE,
    };
  }
  async report(id: number) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: actorSelect },
        reportedUser: { select: userSelect },
        moderationActions: {
          include: { actor: { select: actorSelect } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found.');
    return {
      ...report,
      reportedUser: {
        ...report.reportedUser,
        effectiveStatus: effectiveStatus(report.reportedUser),
      },
    };
  }
  async users(query: AdminListDto) {
    const term = query.search || '';
    const where = term
      ? {
          OR: [
            { fullname: { contains: term, mode: 'insensitive' as const } },
            { email: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        take: PAGE_SIZE,
        skip: (query.page - 1) * PAGE_SIZE,
        orderBy: { id: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({ ...u, effectiveStatus: effectiveStatus(u) })),
      total,
      page: query.page,
      pageSize: PAGE_SIZE,
    };
  }
  async user(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        moderationReceived: {
          take: 50,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { actor: { select: actorSelect } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return { ...user, effectiveStatus: effectiveStatus(user) };
  }
  async moderate(
    actorId: number,
    body: ModerateDto,
    ids: { reportId?: number; targetId?: number }
  ) {
    if (body.action === 'SUSPEND' && !body.durationHours)
      throw new BadRequestException('Choose a suspension duration.');
    if (body.action !== 'SUSPEND' && body.durationHours !== undefined)
      throw new BadRequestException('Duration is only valid for suspension.');
    if (!ids.reportId && body.action === 'DISMISS')
      throw new BadRequestException('Dismiss requires a report.');
    if (ids.reportId && body.action === 'RESTORE')
      throw new BadRequestException('Restore access from the user page.');
    const result = await this.prisma.$transaction(async (tx) => {
      let targetId = ids.targetId;
      if (ids.reportId) {
        await tx.$queryRaw`SELECT "id" FROM "reports" WHERE "id" = ${ids.reportId} FOR UPDATE`;
        const report = await tx.report.findUnique({
          where: { id: ids.reportId },
        });
        if (!report) throw new NotFoundException('Report not found.');
        if (report.status !== 'OPEN')
          throw new ConflictException(
            'This report was already reviewed. Refresh to see the result.'
          );
        targetId = report.reportedUserId;
      }
      if (!targetId) throw new BadRequestException('User is required.');
      // Consistent lock order; re-check the actor inside the same transaction.
      await tx.$queryRaw`SELECT "id" FROM "debate_users" WHERE "id" IN (${actorId}, ${targetId}) ORDER BY "id" FOR UPDATE`;
      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: userSelect,
      });
      if (!actor || actor.role !== 'ADMIN')
        throw new ForbiddenException('Administrator access required.');
      assertActive(actor);
      const target = await tx.user.findUnique({
        where: { id: targetId },
        select: userSelect,
      });
      if (!target) throw new NotFoundException('User not found.');
      if (targetId === actorId)
        throw new ForbiddenException(
          'You cannot moderate your own account or its reports.'
        );
      if (body.action !== 'DISMISS' && target.role === 'ADMIN')
        throw new ForbiddenException(
          'Admin accounts cannot be moderated from this panel.'
        );
      const previousStatus = effectiveStatus(target) as typeof target.status;
      if (body.action === 'RESTORE' && previousStatus === 'ACTIVE')
        throw new ConflictException('This account already has access.');
      if (
        ['SUSPEND', 'BAN'].includes(body.action) &&
        previousStatus === 'BANNED'
      )
        throw new ConflictException(
          'This account is already banned. Restore access first.'
        );
      const suspendedUntil =
        body.action === 'SUSPEND'
          ? new Date(Date.now() + body.durationHours! * 3600000)
          : null;
      if (
        body.action === 'SUSPEND' ||
        body.action === 'BAN' ||
        body.action === 'RESTORE'
      ) {
        await tx.user.update({
          where: { id: targetId },
          data: {
            status:
              body.action === 'BAN'
                ? 'BANNED'
                : body.action === 'SUSPEND'
                  ? 'SUSPENDED'
                  : 'ACTIVE',
            suspendedUntil,
          },
        });
      }
      const action = await tx.moderationAction.create({
        data: {
          actorId,
          targetId,
          reportId: ids.reportId,
          kind: body.action,
          reason: body.reason,
          previousStatus,
          suspendedUntil,
        },
      });
      if (ids.reportId)
        await tx.report.update({
          where: { id: ids.reportId },
          data: { status: 'REVIEWED' },
        });
      return action;
    });
    // Notify only after commit. Existing sessions are disconnected for restrictions.
    this.access.events.emit('moderated', {
      userId: result.targetId,
      kind: result.kind,
    });
    return { ok: true, actionId: result.id };
  }
}

