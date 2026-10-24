import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export const REQUIRED_MESSAGE = 'All fields are required!';

export class RegisterDto {
  @Trim()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(100, { message: 'Name is too long!' })
  fullname!: string;

  @Trim()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value
  )
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @IsEmail({}, { message: 'Invalid email address!' })
  @MaxLength(150, { message: 'Email is too long!' })
  email!: string;

  @Trim()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(20, { message: 'Gender is too long!' })
  gender!: string;

  @Trim()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(100, { message: 'Education is too long!' })
  education!: string;

  @Trim()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(100, { message: 'Country is too long!' })
  country!: string;

  // Not trimmed on purpose: spaces are valid password characters.
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MinLength(8, { message: 'Password must be at least 8 characters!' })
  @MaxLength(128, { message: 'Password is too long!' })
  password!: string;
}
