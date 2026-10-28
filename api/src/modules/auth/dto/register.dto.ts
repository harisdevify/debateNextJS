import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

export const REQUIRED_MESSAGE = 'All fields are required!';
export const RULES_MESSAGE =
  'You must accept the rules and confirm you are 18 or older!';

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

  @IsBoolean({ message: RULES_MESSAGE })
  @Equals(true, { message: RULES_MESSAGE })
  acceptRules!: boolean;

  @IsBoolean({ message: RULES_MESSAGE })
  @Equals(true, { message: RULES_MESSAGE })
  confirmAge!: boolean;
}

