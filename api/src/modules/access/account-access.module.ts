import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountAccessService } from './account-access.service';

@Module({
  imports: [PrismaModule],
  providers: [AccountAccessService],
  exports: [AccountAccessService],
})
export class AccountAccessModule {}
