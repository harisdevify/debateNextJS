import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountAccessModule } from '../access/account-access.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    PrismaModule,
    AccountAccessModule,
    RateLimitModule,
    JwtModule.register({}),
  ],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
