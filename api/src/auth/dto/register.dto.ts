import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(100)
  fullname!: string;
  @IsEmail() @MaxLength(150)
  email!: string;
  @IsString() @MinLength(1) @MaxLength(20)
  gender!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  education!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  country!: string;
  @IsString() @MinLength(8) @MaxLength(128)
  password!: string;
}
