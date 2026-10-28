import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminListDto, ModerateDto } from './dto/admin.dto';
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('reports') reports(@Query() query: AdminListDto) {
    return this.admin.reports(query);
  }
  @Get('reports/:id') report(@Param('id', ParseIntPipe) id: number) {
    return this.admin.report(id);
  }
  @Post('reports/:id/action') reportAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModerateDto,
    @CurrentUser() actor: AuthenticatedUser
  ) {
    return this.admin.moderate(actor.id, body, { reportId: id });
  }
  @Get('users') users(@Query() query: AdminListDto) {
    return this.admin.users(query);
  }
  @Get('users/:id') user(@Param('id', ParseIntPipe) id: number) {
    return this.admin.user(id);
  }
  @Post('users/:id/action') userAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModerateDto,
    @CurrentUser() actor: AuthenticatedUser
  ) {
    return this.admin.moderate(actor.id, body, { targetId: id });
  }
}

