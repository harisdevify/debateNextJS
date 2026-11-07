import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessProductionEnvironment } from './production-preflight.mjs';

const valid = {
  NODE_ENV: 'production',
  CLIENT_URL: 'https://debate.example.com',
  JWT_SECRET: 'a-unique-secret-at-least-thirty-two-characters',
  DATABASE_URL: 'postgresql://user@private-db:5432/debate',
  TURN_URLS: 'turn:relay.example.com:3478,turns:relay.example.com:5349',
  TURN_SECRET: 'turn-secret-at-least-twenty-four-characters',
  NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
};

test('ready production config passes without revealing secrets', () => {
  const assessment = assessProductionEnvironment(valid);
  assert.deepEqual(assessment.errors, []);
  assert.ok(assessment.warnings.some(w => w.includes('Manually verify')));
  assert.equal(JSON.stringify(assessment).includes(valid.JWT_SECRET), false);
});

test('fails closed for missing TURN and insecure origins', () => {
  const result = assessProductionEnvironment({
    ...valid,
    CLIENT_URL: 'http://debate.example.com',
    JWT_SECRET: 'replace-with-a-long-random-secret',
    TURN_URLS: '',
    NEXT_PUBLIC_SOCKET_URL: 'ws://socket.example.com',
  });
  assert.ok(result.errors.some(x => x.includes('HTTPS')));
  assert.ok(result.errors.some(x => x.includes('JWT_SECRET')));
  assert.ok(result.errors.some(x => x.includes('TURN_URLS')));
  assert.ok(result.errors.some(x => x.includes('HTTPS/WSS')));
});

test('warns when TLS TURN relay is unavailable but does not fabricate a connection test', () => {
  const result = assessProductionEnvironment({ ...valid, TURN_URLS: 'turn:relay.example.com:3478' });
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some(w => w.includes('TLS relay')));
});
