import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CreateDebateFeedbackDto } from './dto/create-debate-feedback.dto';
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
          startedAt: true, endedAt: true, endReason: true,
          feedbacks: { where: { raterId: userId }, select: { rating: true, comment: true }, take: 1 } },
      }),
      this.prisma.debateHistory.count({ where }),
    ]);
    return {
      items: records.map(({ startedAt, endedAt, feedbacks, ...record }) => ({
        ...record,
        myFeedback: feedbacks[0] ?? null,
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
  async submitFeedback(userId: number, debateId: string, dto: CreateDebateFeedbackDto) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(debateId)) {
      throw new BadRequestException('Invalid debate ID.');
    }
    const debate = await this.prisma.debateHistory.findUnique({
      where: { id: debateId },
      select: { firstUserId: true, secondUserId: true },
    });
    if (!debate) throw new NotFoundException('Debate not found.');
    if (debate.firstUserId !== userId && debate.secondUserId !== userId) {
      throw new ForbiddenException('You can only rate debates you participated in.');
    }
    const recipientId = debate.firstUserId === userId ? debate.secondUserId : debate.firstUserId;
    try {
      const feedback = await this.prisma.debateFeedback.create({
        data: {
          debateId,
          raterId: userId,
          recipientId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        },
        select: { rating: true, comment: true, createdAt: true },
      });
      return { rating: feedback.rating, comment: feedback.comment, createdAt: feedback.createdAt.toISOString() };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already rated this debate.');
      }
      throw error;
    }
  }

}
