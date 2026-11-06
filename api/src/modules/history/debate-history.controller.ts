import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebateHistoryService } from './debate-history.service';

@Controller('debates')
@UseGuards(JwtAuthGuard)
export class DebateHistoryController {
  constructor(private readonly service: DebateHistoryService) {}

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser, @Query('page') page?: string) {
    return this.service.list(user.id, page);
  }
}
