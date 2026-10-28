import { PrismaModule } from '../../prisma/prisma.module';
import { AccountAccessModule } from '../access/account-access.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AccountAccessModule,
    RateLimitModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuthRateLimitGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}

