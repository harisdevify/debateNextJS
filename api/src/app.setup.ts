import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
  type ValidationError,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { LOGIN_REQUIRED_MESSAGE } from './auth/dto/login.dto';
import { REQUIRED_MESSAGE } from './auth/dto/register.dto';

// Messages that should win when several fields fail at once.
const PRIORITY_MESSAGES = [REQUIRED_MESSAGE, LOGIN_REQUIRED_MESSAGE];

/**
 * One place for everything main.ts and the e2e tests must share, so tests
 * exercise exactly the same pipes, cookies and CORS as production.
 */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CLIENT_URL') ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // The client shows `message` as a toast, so it must be ONE readable
      // string, not Nest's default array of every failed rule.
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        const message =
          PRIORITY_MESSAGES.find((m) => messages.includes(m)) ??
          messages[0] ??
          'Invalid request data!';
        return new BadRequestException(message);
      },
    })
  );
}
