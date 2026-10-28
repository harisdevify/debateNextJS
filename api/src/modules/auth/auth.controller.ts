import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from './decorators/current-user.decorator';
import { AcceptRulesDto } from './dto/accept-rules.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly config: ConfigService) {}

  private cookieOptions() {
    const production = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: production,
      sameSite: production ? ('none' as const) : ('lax' as const),
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
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('accessToken', this.cookieOptions());
    return { message: 'Logged out successfully!' };
  }

  @Get('ice-servers')
  @UseGuards(JwtAuthGuard)
  iceServers(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const urls = this.config.get<string>('TURN_URLS')?.split(',').map((url) => url.trim()).filter(Boolean);
    const secret = this.config.get<string>('TURN_SECRET');
    const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
    if (urls?.length && secret) {
      const username = `${Math.floor(Date.now() / 1000) + 3600}:${user.id}`;
      iceServers.push({ urls, username, credential: createHmac('sha1', secret).update(username).digest('base64') });
    }
    return { iceServers };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Post('accept-rules')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  acceptRules(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptRulesDto
  ) {
    return this.authService.acceptRules(user.id, dto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto
  ) {
    return this.authService.updateMe(user.id, dto);
  }
}

