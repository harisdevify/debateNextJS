import { AccountAccessModule } from './access/account-access.module';
import { AdminModule } from './admin/admin.module';
import { RateLimitModule } from './common/rate-limit.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RateLimitModule,
    AccountAccessModule,
    AdminModule,
    AuthModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
