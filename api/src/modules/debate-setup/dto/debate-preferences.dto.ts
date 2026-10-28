import { IsEnum } from 'class-validator';

import {
  DebateLanguage,
  DebateMode,
  DebateTopic,
} from '../debate-setup.constants';

export class DebatePreferencesDto {
  @IsEnum(DebateTopic, {
    message: 'Please choose a valid topic.',
  })
  topic!: DebateTopic;

  @IsEnum(DebateLanguage, {
    message: 'Please choose a supported language.',
  })
  language!: DebateLanguage;

  @IsEnum(DebateMode, {
    message: 'Please choose a valid debate mode.',
  })
  mode!: DebateMode;
}
