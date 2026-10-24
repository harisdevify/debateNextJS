import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export const LOGIN_REQUIRED_MESSAGE = 'Email and password are required!';

export class LoginDto {
  @Trim()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value
  )
  @IsNotEmpty({ message: LOGIN_REQUIRED_MESSAGE })
  // same wording as a wrong password, so the form format leaks nothing
  @IsEmail({}, { message: 'Invalid email or password!' })
  @MaxLength(150, { message: 'Invalid email or password!' })
  email!: string;

  @IsString({ message: LOGIN_REQUIRED_MESSAGE })
  @IsNotEmpty({ message: LOGIN_REQUIRED_MESSAGE })
  @MaxLength(128, { message: 'Invalid email or password!' })
  password!: string;
}
