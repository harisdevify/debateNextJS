import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString() @MinLength(1) @MaxLength(100)
  fullname!: string;
  @IsString() @MinLength(1) @MaxLength(20)
  gender!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  education!: string;
  @IsString() @MinLength(1) @MaxLength(100)
  country!: string;
}
