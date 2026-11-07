/**
 * Deployment gate. Reads injected process environment; never loads a local
 * .env automatically and never prints secret values.
 *
 * Run from api/: npm run preflight:prod
 */
export function assessProductionEnvironment(env) {
  const errors = [];
  const warnings = [];
  if (env.NODE_ENV !== 'production') errors.push('NODE_ENV must be production');
  const clientUrl = env.CLIENT_URL || '';
  try {
    const url = new URL(clientUrl);
    if (url.protocol !== 'https:' || url.origin !== clientUrl) {
      errors.push('CLIENT_URL must be the exact HTTPS frontend origin');
    }
  } catch {
    errors.push('CLIENT_URL must be a valid HTTPS frontend origin');
  }
  if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL || '')) {
    errors.push('DATABASE_URL must be a PostgreSQL connection string');
  }
  const secret = env.JWT_SECRET || '';
  if (secret.length < 32 || /(replace|example|change-me|local|test-only|ci-only)/i.test(secret)) {
    errors.push('JWT_SECRET must be unique, strong and free of placeholder text');
  }
  const urls = (env.TURN_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!urls.length || !env.TURN_SECRET) {
    errors.push('TURN_URLS and TURN_SECRET are required for a reliable video launch');
  } else {
    if (urls.some(url => !/^turns?:[^\s]+$/.test(url))) {
      errors.push('TURN_URLS must use turn: or turns: URIs');
    }
    if (env.TURN_SECRET.length < 24) warnings.push('Use a long, randomly generated TURN_SECRET');
    if (!urls.some(url => url.startsWith('turns:'))) {
      warnings.push('No turns: TLS relay URI configured; confirm UDP/TCP reachability on restrictive networks');
    }
  }
  if (env.API_PROXY_TARGET) {
    try {
      const target = new URL(env.API_PROXY_TARGET);
      if (target.protocol !== 'https:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
        warnings.push('API_PROXY_TARGET is plain HTTP; verify the upstream is restricted to a trusted private network');
      }
    } catch { errors.push('API_PROXY_TARGET is not a valid URL'); }
  }
  if (env.NEXT_PUBLIC_SOCKET_URL) {
    try {
      const socket = new URL(env.NEXT_PUBLIC_SOCKET_URL);
      if (!['https:', 'wss:'].includes(socket.protocol)) {
        errors.push('NEXT_PUBLIC_SOCKET_URL must use HTTPS/WSS in production');
      }
    } catch { errors.push('NEXT_PUBLIC_SOCKET_URL is not a valid URL'); }
  }
  warnings.push('Manually verify HTTPS certificates, TURN relay candidates, reverse proxy trust, backup restore, and real audio/video across networks');
  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const { errors, warnings } = assessProductionEnvironment(process.env);
  for (const warning of warnings) process.stdout.write('NOTE: ' + warning + '\n');
  if (errors.length) {
    for (const error of errors) process.stderr.write('FAIL: ' + error + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('Production environment preflight passed. Manual operational checks remain required.\n');
  }
}
