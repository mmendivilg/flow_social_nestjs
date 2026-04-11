import { z } from 'zod';
// NOTE: Keep enums in one place (ai.service) to avoid drift.
// This DTO uses Zod for runtime validation + strong typing.

const NullableNonEmptyStringSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().min(1).nullable());

export const GenerateCoachingConstraintsSchema = z
  .object({
    language: z.enum(['en', 'es'] as const).optional(),
    locale: z.string().min(2).optional(),

    channel: z
      .enum(['sms', 'whatsapp', 'instagram', 'dating_app', 'other'] as const)
      .optional(),
    length: z.enum(['short', 'medium', 'long'] as const).optional(),
    emojiLevel: z.enum(['none', 'some', 'more'] as const).optional(),

    userVoice: z.enum(['formal', 'neutral', 'casual'] as const).optional(),
    directness: z.enum(['soft', 'balanced', 'direct'] as const).optional(),
    humor: z.enum(['none', 'light', 'playful'] as const).optional(),

    riskTolerance: z.enum(['safe', 'balanced', 'bold'] as const).optional(),

    relationshipType: z
      .enum([
        'dating',
        'friendship',
        'coworker',
        'ex',
        'stranger',
        'unknown',
      ] as const)
      .optional(),
    stage: z
      .enum([
        'first_text',
        'after_number',
        'setting_date',
        'post_date',
        'reconnect',
        'conflict',
        'unknown',
      ] as const)
      .optional(),

    avoid: z.array(z.string().min(1)).optional(),
    mustInclude: z.array(z.string().min(1)).optional(),

    numOptions: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional(),
    includeRationale: z.boolean().optional(),

    maxCharacters: z.number().int().positive().optional(),
    noQuestions: z.boolean().optional(),
    maxQuestions: z
      .union([z.literal(0), z.literal(1), z.literal(2)])
      .optional(),
  })
  .strict();

const ConstraintsInputSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, GenerateCoachingConstraintsSchema.optional());

export const GenerateCoachingBodySchema = z
  .object({
    scenarioText: z.string().trim().min(5),
    lastMessageText: NullableNonEmptyStringSchema,
    goal: z.enum(['casual', 'serious_relationship', 'just_chat'] as const),
    vibe: z.enum([
      'relax_joker',
      'quiet_polite',
      'confident_direct',
      'reserved_respectful',
    ] as const),
    flirtLevel: z.enum(['none', 'light', 'classy'] as const),
    constraints: ConstraintsInputSchema,
  })
  .strict();

export type GenerateCoachingBodyDto = z.infer<
  typeof GenerateCoachingBodySchema
>;
