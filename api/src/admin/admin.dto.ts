import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Trim } from '../common/trim.decorator';
export class AdminListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @IsOptional() @IsIn(['OPEN', 'REVIEWED']) status?: 'OPEN' | 'REVIEWED';
  @IsOptional() @Trim() @IsString() @Length(0, 150) search?: string;
}
export class ModerateDto {
  @IsIn(['DISMISS', 'WARN', 'SUSPEND', 'BAN', 'RESTORE']) action!:
    'DISMISS' | 'WARN' | 'SUSPEND' | 'BAN' | 'RESTORE';
  @Trim() @IsString() @Length(5, 1000) reason!: string;
  @IsOptional() @IsInt() @Min(1) @Max(720) durationHours?: number;
}
