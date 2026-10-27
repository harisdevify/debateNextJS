import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { RateLimitService } from "../../common/rate-limit.service";

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly limits: RateLimitService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const action = context.getHandler().name;
    // Never trust client-supplied X-Forwarded-For without a configured trusted proxy.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const ipAllowed = await this.limits.allow(
      `auth:${action}:ip`,
      ip,
      action === "login" ? 100 : 50,
      900_000,
    );
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase().slice(0, 150)
        : "";
    const accountAllowed =
      !email ||
      (await this.limits.allow(`auth:${action}:account`, email, 10, 900_000));
    if (!ipAllowed || !accountAllowed) {
      res.setHeader("Retry-After", "900");
      throw new HttpException(
        "Too many attempts. Please try again in 15 minutes.",
        429,
      );
    }
    return true;
  }
}
