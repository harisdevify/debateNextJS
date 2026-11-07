import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthOriginGuard } from '../auth/guards/auth-origin.guard';
import { CreateDebateFeedbackDto } from './dto/create-debate-feedback.dto';
import { DebateHistoryService } from './debate-history.service';

@Controller('debates')
@UseGuards(JwtAuthGuard)
export class DebateHistoryController {
  constructor(private readonly service: DebateHistoryService) {}

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser, @Query('page') page?: string) {
    return this.service.list(user.id, page);
  }
  @Post(':debateId/feedback')
  @HttpCode(201)
  @UseGuards(AuthOriginGuard)
  submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('debateId') debateId: string,
    @Body() dto: CreateDebateFeedbackDto,
  ) {
    return this.service.submitFeedback(user.id, debateId, dto);
  }
}
