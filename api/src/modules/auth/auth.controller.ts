import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createHmac } from 'node:crypto';
import { AuthService } from './auth.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from './decorators/current-user.decorator';
import { AcceptRulesDto } from './dto/accept-rules.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthOriginGuard } from './guards/auth-origin.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  private cookieOptions() {
    const production = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: production,
      // HTTP auth is proxied through the frontend origin; cross-site cookies
      // increase CSRF exposure without improving the supported deployment.
      sameSite: 'lax' as const,
    };
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.login(dto);
    response.cookie('accessToken', result.accessToken, {
      ...this.cookieOptions(),
      maxAge: 24 * 60 * 60 * 1000,
    });
    return result.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthOriginGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.authService.logout(request.cookies?.accessToken as string | undefined);
    response.clearCookie('accessToken', this.cookieOptions());
    return { message: 'Logged out successfully!' };
  }

  @Get('ice-servers')
  @UseGuards(JwtAuthGuard)
  iceServers(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store');
    const urls = this.config
      .get<string>('TURN_URLS')
      ?.split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    const secret = this.config.get<string>('TURN_SECRET');
    const iceServers: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }> = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (urls?.length && secret) {
      const username = `${Math.floor(Date.now() / 1000) + 3600}:${user.id}`;
      iceServers.push({
        urls,
        username,
        credential: createHmac('sha1', secret)
          .update(username)
          .digest('base64'),
      });
    }
    return { iceServers };
  }

  @Get('socket-ticket')
  @UseGuards(JwtAuthGuard)
  async socketTicket(
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store');
    const token = request.cookies?.accessToken as string;
    return {
      ticket: await this.authService.issueSocketTicket(user.id, token),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Post('accept-rules')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthOriginGuard)
  acceptRules(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptRulesDto
  ) {
    return this.authService.acceptRules(user.id, dto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, AuthOriginGuard)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto
  ) {
    return this.authService.updateMe(user.id, dto);
  }
}
