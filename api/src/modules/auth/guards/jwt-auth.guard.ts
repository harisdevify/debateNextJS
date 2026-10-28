import { AccountAccessService } from '../../access/account-access.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface TokenPayload {
  id: number;
}
type AuthenticatedRequest = Request & { user?: { id: number } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly access: AccountAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.accessToken as string | undefined;
    if (!token) throw new UnauthorizedException('Not authenticated');
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);
      if (!Number.isInteger(payload.id))
        throw new Error('Invalid token subject');
      request.user = { id: payload.id };

    } catch {
      throw new UnauthorizedException('Not authenticated');
    }
    await this.access.requireActive(request.user!.id);
    return true;
  }
}

