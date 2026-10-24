import 'dotenv/config';

// E2E tests talk to a real PostgreSQL database (migrations must be applied).
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required for e2e tests (see api/.env.example). ' +
      'Start the database first, e.g. `docker compose up -d`.'
  );
}

process.env.JWT_SECRET ||= 'e2e-test-secret-that-is-at-least-32-characters';
process.env.CLIENT_URL ||= 'http://localhost:3000';
process.env.NODE_ENV = 'test';
