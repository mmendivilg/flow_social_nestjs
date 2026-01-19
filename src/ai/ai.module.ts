import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiService } from './ai.service';
import { OPENAI_CLIENT } from './ai.constants';

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
  ],
  exports: [AiService],
})
export class AiModule {}
