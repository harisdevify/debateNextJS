import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PAGE_SIZE = 12;
const MAX_PAGE = 10000;

@Injectable()
export class DebateHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, pageInput?: string) {
    const page = pageInput === undefined ? 1 : Number(pageInput);
    if (!Number.isSafeInteger(page) || page < 1 || page > MAX_PAGE) {
      throw new BadRequestException('Choose a valid history page.');
    }
    const where = { OR: [{ firstUserId: userId }, { secondUserId: userId }] };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.debateHistory.findMany({
        where,
        orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        // Intentionally exclude all partner account IDs and private data.
        select: { id: true, topic: true, language: true, mode: true,
          startedAt: true, endedAt: true, endReason: true },
      }),
      this.prisma.debateHistory.count({ where }),
    ]);
    return {
      items: records.map(({ startedAt, endedAt, ...record }) => ({
        ...record,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)),
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}
