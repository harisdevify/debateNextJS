import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Process liveness: never make container restarts depend on DB connectivity. */
  @Get()
  check() {
    return { status: 'ok', service: 'debate-api' };
  }

  /** Use for load balancer readiness; never return DB URLs or internal errors. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'debate-api' };
    } catch {
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
  }
}
