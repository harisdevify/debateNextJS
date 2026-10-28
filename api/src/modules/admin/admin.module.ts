import { PrismaModule } from '../../prisma/prisma.module';
import { AccountAccessModule } from '../access/account-access.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
@Module({
  imports: [PrismaModule, AccountAccessModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}

