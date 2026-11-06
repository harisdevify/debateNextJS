import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Cookie-authenticated mutations must come from the configured frontend.
 * CORS does not prevent cross-site form requests from being sent.
 */
@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowedOrigin = this.config.getOrThrow<string>('CLIENT_URL');

    if (request.headers.origin !== allowedOrigin) {
      throw new ForbiddenException('Invalid request origin.');
    }

    // The logout endpoint has no body; all other protected mutations require JSON.
    if (
      request.path !== '/api/v1/auth/logout' &&
      !request.is('application/json')
    ) {
      throw new ForbiddenException('JSON content type required.');
    }

    return true;
  }
}
