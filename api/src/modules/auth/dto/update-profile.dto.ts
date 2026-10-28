import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { REQUIRED_MESSAGE } from './register.dto';

export class UpdateProfileDto {
  @Trim()
  @IsString({ message: REQUIRED_MESSAGE })
  @IsNotEmpty({ message: REQUIRED_MESSAGE })
  @MaxLength(100, { message: 'Name is too long!' })
  fullname!: string;

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
}

