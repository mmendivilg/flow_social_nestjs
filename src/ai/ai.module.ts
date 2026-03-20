import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiService } from './ai.service';
import { OPENAI_CLIENT } from './ai.constants';
import { AiV2Service } from './ai-v2.service';

@Module({
  providers: [
    {
      provide: OPENAI_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('OPENAI_API_KEY');
        return new OpenAI({ apiKey });
      },
    },
    AiService,
    AiV2Service,
  ],
  exports: [AiService, AiV2Service],
})
export class AiModule {}
