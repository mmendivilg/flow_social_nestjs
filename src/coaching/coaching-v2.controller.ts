// src/coaching/coaching.controller.ts
import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  GenerateCoachingBodySchema,
  type GenerateCoachingBodyDto,
} from './dto/generate-coaching.dto';
import { AiV2Service } from 'src/ai/ai-v2.service';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('coaching-v2')
@Controller('coaching-v2')
export class CoachingV2Controller {
  constructor(private readonly ai: AiV2Service) {}

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'scenarioText',
        'lastMessageText',
        'goal',
        'vibe',
        'flirtLevel',
      ],
      properties: {
        scenarioText: {
          type: 'string',
          example: 'I met her at a coffee shop and got her number.',
        },
        lastMessageText: { type: 'string', nullable: true, example: null },
        goal: {
          type: 'string',
          enum: ['casual', 'serious_relationship', 'just_chat'],
        },
        vibe: {
          type: 'string',
          enum: [
            'relax_joker',
            'quiet_polite',
            'confident_direct',
            'reserved_respectful',
          ],
        },
        flirtLevel: { type: 'string', enum: ['none', 'light', 'classy'] },
        constraints: {
          type: 'object',
          additionalProperties: true,
          example: {
            language: 'es',
            locale: 'es-MX',
            numOptions: 3,
            emojiLevel: 'some',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: {
          type: 'string',
          example: 'Hey 🙂 ¿cómo va tu día? Me dio gusto verte el otro día.',
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              label: {
                type: 'string',
                enum: [
                  'safe',
                  'balanced',
                  'bold',
                  'playful',
                  'direct',
                  'neutral',
                ],
              },
            },
          },
          nullable: true,
        },
        rationale: { type: 'array', items: { type: 'string' }, nullable: true },
        safety: {
          type: 'object',
          properties: {
            blocked: { type: 'boolean' },
            flags: { type: 'array', items: { type: 'string' } },
            note: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(GenerateCoachingBodySchema))
  async generate(@Body() body: GenerateCoachingBodyDto) {
    // Forward validated input to AiService
    const result = await this.ai.generateCoaching({
      scenarioText: body.scenarioText,
      lastMessageText: body.lastMessageText ?? null,
      goal: body.goal,
      vibe: body.vibe,
      flirtLevel: body.flirtLevel,
      constraints: body.constraints,
    });

    // You can decide how much to expose to the frontend.
    // For v1, return message + optional options + safety.
    return {
      status: 'success',
      message: result.message,
      options: result.options ?? undefined,
      rationale: result.rationale ?? undefined,
      safety: result.safety,
      detected: result.detected ?? undefined,
    };
  }
}
