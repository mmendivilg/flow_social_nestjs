// src/coaching/coaching.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  GenerateCoachingBodySchema,
  type GenerateCoachingBodyDto,
} from './dto/generate-coaching.dto';
import { AiV2Service } from '../ai/ai-v2.service';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const DEFAULT_MAX_IMAGE_MB = 5;
const coachingV2UploadMaxImageMb = parsePositiveInt(
  process.env.COACHING_V2_MAX_IMAGE_MB,
  DEFAULT_MAX_IMAGE_MB,
);
const coachingV2UploadMaxImageBytes = coachingV2UploadMaxImageMb * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

type UploadedCoachingImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const requestSchemaFields = {
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
};

@ApiTags('coaching-v2')
@Controller('coaching-v2')
export class CoachingV2Controller {
  constructor(private readonly ai: AiV2Service) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        files: 1,
        fileSize: coachingV2UploadMaxImageBytes,
      },
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['scenarioText', 'goal', 'vibe', 'flirtLevel'],
          properties: requestSchemaFields,
        },
        {
          type: 'object',
          required: ['scenarioText', 'goal', 'vibe', 'flirtLevel'],
          properties: {
            ...requestSchemaFields,
            constraints: {
              oneOf: [
                requestSchemaFields.constraints,
                {
                  type: 'string',
                  example:
                    '{"language":"es","locale":"es-MX","numOptions":3,"emojiLevel":"some"}',
                },
              ],
            },
            image: {
              type: 'string',
              format: 'binary',
              nullable: true,
            },
          },
        },
      ],
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
  async generate(
    @Body(new ZodValidationPipe(GenerateCoachingBodySchema))
    body: GenerateCoachingBodyDto,
    @UploadedFile() image?: UploadedCoachingImage,
  ) {
    this.assertValidImage(image);

    const result = await this.ai.generateCoaching({
      scenarioText: body.scenarioText,
      lastMessageText: body.lastMessageText ?? null,
      goal: body.goal,
      vibe: body.vibe,
      flirtLevel: body.flirtLevel,
      constraints: body.constraints,
      image: image
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
            originalname: image.originalname,
          }
        : undefined,
    });

    return {
      status: 'success',
      message: result.message,
      options: result.options ?? undefined,
      rationale: result.rationale ?? undefined,
      safety: result.safety,
      detected: result.detected ?? undefined,
    };
  }

  private assertValidImage(image?: UploadedCoachingImage) {
    if (!image) {
      return;
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(image.mimetype)) {
      throw new BadRequestException(
        `Unsupported image type: ${image.mimetype}`,
      );
    }

    if (image.size > coachingV2UploadMaxImageBytes) {
      throw new BadRequestException(
        `Image exceeds ${coachingV2UploadMaxImageMb} MB limit`,
      );
    }
  }
}
