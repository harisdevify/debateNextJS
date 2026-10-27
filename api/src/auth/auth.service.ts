import { assertActive } from '../access/account-access.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptRulesDto } from './dto/accept-rules.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const publicUserSelect = {
  role: true,
  id: true,
  fullname: true,
  email: true,
  gender: true,
  education: true,
  country: true,
  acceptedRulesAt: true,
  ageConfirmedAt: true,
} as const;

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // dto is already trimmed, lower-cased (email) and validated
    const { fullname, email, gender, education, country } = dto;
    const password = await bcrypt.hash(dto.password, 10);

    try {
      // the DTO guarantees acceptRules and confirmAge are true
      const now = new Date();
      await this.prisma.user.create({
        data: {
          fullname,
          email,
          gender,
          education,
          country,
          password,
          acceptedRulesAt: now,
          ageConfirmedAt: now,
        },
      });

      return { message: 'Account created successfully!' };
    } catch (error) {
      // unique constraint on email: an expected outcome, not a server error
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Email already exists!');
      }

      console.error('Register error:', error);
      throw new InternalServerErrorException('Something went wrong!');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const valid = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    assertActive(user);
    const accessToken = await this.jwtService.signAsync({ id: user.id });

    return {
      accessToken,
      user: await this.me(user.id),
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    const warning = await this.prisma.moderationAction.findFirst({
      where: { targetId: userId, kind: 'WARN' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { createdAt: true },
    });
    return { ...user, lastWarningAt: warning?.createdAt ?? null };
  }

  /** For accounts created before the rules existed (or any future rules update). */
  async acceptRules(userId: number, _dto: AcceptRulesDto) {
    const now = new Date();
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { acceptedRulesAt: now, ageConfirmedAt: now },
        select: publicUserSelect,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new UnauthorizedException('User not found!');
      }

      console.error('Accept rules error:', error);
      throw new InternalServerErrorException('Something went wrong!');
    }
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          fullname: dto.fullname,
          gender: dto.gender,
          education: dto.education,
          country: dto.country,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      // record not found: the account was deleted while the token was valid
      if (isPrismaError(error, 'P2025')) {
        throw new UnauthorizedException('User not found!');
      }

      console.error('Update profile error:', error);
      throw new InternalServerErrorException('Something went wrong!');
    }
  }
}
