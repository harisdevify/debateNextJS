import {
  BadRequestException,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    console.log('REGISTER HANDLER HIT');
    const fullname = dto.fullname.trim();
    const gender = dto.gender.trim();
    const education = dto.education.trim();
    const country = dto.country.trim();

    if (!fullname || !gender || !education || !country) {
      throw new BadRequestException('All fields are required!');
    }

    const email = dto.email.trim().toLowerCase();
    const password = await bcrypt.hash(dto.password, 10);

    try {
      await this.prisma.user.create({
        data: { fullname, email, gender, education, country, password },
      });

      return { message: 'Account created successfully!' };
    } catch (error) {
      console.error('Register error:', error);

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists!');
      }

      throw new InternalServerErrorException('Something went wrong!');
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

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
    const data = {
      fullname: dto.fullname.trim(),
      gender: dto.gender.trim(),
      education: dto.education.trim(),
      country: dto.country.trim(),
    };

    if (Object.values(data).some((value) => !value)) {
      throw new BadRequestException('All fields are required!');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
        select: publicUserSelect,
      });
    } catch (error) {
      console.error('Register error:', error);

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists!');
      }

      throw new InternalServerErrorException('Something went wrong!');
    }
  }
}
