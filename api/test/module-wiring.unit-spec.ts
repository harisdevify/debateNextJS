import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { RateLimitModule } from '../src/common/rate-limit/rate-limit.module';
import { AccountAccessModule } from '../src/modules/access/account-access.module';
import { AccountAccessService } from '../src/modules/access/account-access.service';
import { AdminModule } from '../src/modules/admin/admin.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { HealthModule } from '../src/modules/health/health.module';
import { RealtimeModule } from '../src/modules/realtime/realtime.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Compile each feature without AppModule. Missing module imports must fail here,
// even if another root-level module could otherwise hide the dependency.
describe('explicit module dependencies', () => {
  it.each([
    AccountAccessModule,
    RateLimitModule,
    AuthModule,
    AdminModule,
    RealtimeModule,
    HealthModule,
  ])('%p compiles independently with application config', async (feature) => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: 'unit-test-only-secret-at-least-32-characters' })],
        }),
        feature,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    await module.close();
  });

  it('shares one access event bus across admin and realtime consumers', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: 'unit-test-only-secret-at-least-32-characters' })],
        }),
        AdminModule,
        RealtimeModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    try {
      const instances = module.get(AccountAccessService, { each: true });
      expect(instances).toHaveLength(1);
      expect(instances[0]).toBe(
        module.select(AccountAccessModule).get(AccountAccessService, { strict: true }),
      );
    } finally {
      await module.close();
    }
  });
});
