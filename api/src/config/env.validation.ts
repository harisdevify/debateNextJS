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

  if (config.PORT !== undefined && Number.isNaN(Number(config.PORT))) {
    errors.push('PORT must be a number');
  }

  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`
    );
  }

  return config;
}
