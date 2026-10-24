import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const publicUserSelect = {
  id: true,
  fullname: true,
  email: true,
  gender: true,
  education: true,
  country: true,
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
      await this.prisma.user.create({
        data: { fullname, email, gender, education, country, password },
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

    const accessToken = await this.jwtService.signAsync({ id: user.id });

    return {
      accessToken,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        gender: user.gender,
        education: user.education,
        country: user.country,
      },
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

    return user;
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
