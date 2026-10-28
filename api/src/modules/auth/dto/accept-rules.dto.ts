import { Equals, IsBoolean } from 'class-validator';
import { RULES_MESSAGE } from './register.dto';

export class AcceptRulesDto {
  @IsBoolean({ message: RULES_MESSAGE })
  @Equals(true, { message: RULES_MESSAGE })
  acceptRules!: boolean;

  @IsBoolean({ message: RULES_MESSAGE })
  @Equals(true, { message: RULES_MESSAGE })
  confirmAge!: boolean;
}

