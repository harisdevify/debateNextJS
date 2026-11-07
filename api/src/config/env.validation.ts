// Fails fast at startup with a clear message instead of crashing later
// (for example the first time someone logs in).
const MIN_SECRET_LENGTH = 32;

export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];

  const databaseUrl = String(config.DATABASE_URL ?? '');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL must be a postgresql:// connection string');
  }

  const jwtSecret = String(config.JWT_SECRET ?? '');
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  if (config.PORT !== undefined &&
    (!Number.isSafeInteger(Number(config.PORT)) || Number(config.PORT) < 1 || Number(config.PORT) > 65535)) {
    errors.push('PORT must be an integer from 1 to 65535');
  }

  const production = config.NODE_ENV === 'production';
  const clientUrl = String(config.CLIENT_URL ?? '').trim();
  if (clientUrl) {
    try {
      const parsed = new URL(clientUrl);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username ||
          parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' ||
          parsed.origin !== clientUrl) {
        errors.push('CLIENT_URL must be a single HTTP(S) origin without a path or credentials');
      }
      if (production && parsed.protocol !== 'https:') {
        errors.push('CLIENT_URL must use HTTPS in production');
      }
    } catch {
      errors.push('CLIENT_URL must be a valid HTTP(S) origin');
    }
  } else if (production) {
    errors.push('CLIENT_URL is required in production');
  }
  if (production && /(replace|example|change-me|local|test-only|ci-only)/i.test(jwtSecret)) {
    errors.push('JWT_SECRET must be a unique production secret, not a placeholder');
  }

  const turnUrls = String(config.TURN_URLS ?? '').trim();
  const turnSecret = String(config.TURN_SECRET ?? '').trim();
  if (!!turnUrls !== !!turnSecret)
    errors.push('TURN_URLS and TURN_SECRET must be configured together');
  if (
    turnUrls &&
    turnUrls.split(',').some((url) => !/^turns?:[^\s]+$/.test(url.trim()))
  ) {
    errors.push('TURN_URLS must contain comma-separated turn: or turns: URLs');
  }

  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`
    );
  }

  return config;
}
