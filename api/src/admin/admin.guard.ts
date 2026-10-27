import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AccountAccessService } from '../access/account-access.service';
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly access: AccountAccessService,
    private readonly config: ConfigService
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: { id: number } }>();
    const user = await this.access.requireActive(req.user.id);
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Administrator access required.');
    // CORS alone is not CSRF protection for cookie-authenticated mutations.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (
        req.headers.origin !== this.config.getOrThrow<string>('CLIENT_URL') ||
        !req.is('application/json')
      ) {
        throw new ForbiddenException('Invalid request origin or content type.');
      }
    }
    return true;
  }
}
