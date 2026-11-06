import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DebateHistoryController } from './debate-history.controller';
import { DebateHistoryService } from './debate-history.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DebateHistoryController],
  providers: [DebateHistoryService],
})
export class DebateHistoryModule {}
