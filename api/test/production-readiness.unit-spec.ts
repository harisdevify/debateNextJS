import { ServiceUnavailableException } from '@nestjs/common';
import { validateEnv } from '../src/config/env.validation';
import { HealthController } from '../src/modules/health/health.controller';
import type { PrismaService } from '../src/prisma/prisma.service';

const valid = {
  DATABASE_URL: 'postgresql://localhost:5432/debate',
  JWT_SECRET: 'production-secret-with-at-least-thirty-two-characters',
  CLIENT_URL: 'https://debate.example.com',
  NODE_ENV: 'production',
  PORT: 8800,
};

describe('production environment hardening', () => {
  it('accepts a valid HTTPS frontend origin and strongly configured JWT', () => {
    expect(() => validateEnv(valid)).not.toThrow();
  });

  it.each([
    [{ ...valid, CLIENT_URL: 'http://debate.example.com' }, 'HTTPS'],
    [{ ...valid, CLIENT_URL: 'https://debate.example.com/path' }, 'single HTTP(S) origin'],
    [{ ...valid, CLIENT_URL: 'https://user:pass@debate.example.com' }, 'single HTTP(S) origin'],
    [{ ...valid, CLIENT_URL: '' }, 'required'],
    [{ ...valid, JWT_SECRET: 'replace-with-a-long-random-secret-at-least-32-characters' }, 'placeholder'],
    [{ ...valid, PORT: '8800.5' }, 'integer'],
    [{ ...valid, PORT: '65536' }, 'integer'],
    [{ ...valid, TURN_URLS: 'turn:relay.example.com:3478' }, 'together'],
  ])('rejects unsafe production configuration', (config, phrase) => {
    expect(() => validateEnv(config)).toThrow(phrase);
  });

  it('allows local HTTP development without requiring TURN', () => {
    expect(() => validateEnv({
      ...valid, NODE_ENV: 'development', CLIENT_URL: 'http://localhost:3000',
    })).not.toThrow();
  });
});

describe('health readiness', () => {
  it('reports liveness independently from database readiness', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const health = new HealthController({ $queryRaw: query } as unknown as PrismaService);
    expect(health.check()).toEqual({ status: 'ok', service: 'debate-api' });
    await expect(health.ready()).resolves.toEqual({ status: 'ready', service: 'debate-api' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns a generic 503 without leaking database connection details', async () => {
    const health = new HealthController({
      $queryRaw: jest.fn().mockRejectedValue(new Error('postgresql://admin:password@private-host')),
    } as unknown as PrismaService);
    await expect(health.ready()).rejects.toThrow(ServiceUnavailableException);
    try {
      await health.ready();
    } catch (error) {
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
        message: 'Service temporarily unavailable',
      });
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain('password');
    }
  });
});
