import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountAccessModule } from '../access/account-access.module';
import { DebateHistoryController } from './debate-history.controller';
import { DebateHistoryService } from './debate-history.service';

@Module({
  imports: [PrismaModule, AccountAccessModule, JwtModule.register({})],
  controllers: [DebateHistoryController],
  providers: [DebateHistoryService],
})
export class DebateHistoryModule {}
