// src/ai/ai.service.ts
import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';

/**
 * Token used by your OpenAI module/provider.
 * Example provider:
 * { provide: OPENAI_CLIENT, useValue: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) }
 */
export const OPENAI_CLIENT = 'OPENAI_CLIENT';

/* =========================================================
 * 1) Types (from scratch)
 * ======================================================= */

export type CoachingGoal = 'casual' | 'serious_relationship' | 'just_chat';

export type CoachingVibe =
  | 'relax_joker'
  | 'quiet_polite'
  | 'confident_direct'
  | 'reserved_respectful';

export type FlirtLevel = 'none' | 'light' | 'classy';

export type RelationshipType =
  | 'dating'
  | 'friendship'
  | 'coworker'
  | 'ex'
  | 'stranger'
  | 'unknown';

export type ConversationStage =
  | 'first_text'
  | 'after_number'
  | 'setting_date'
  | 'post_date'
  | 'reconnect'
  | 'conflict'
  | 'unknown';

export type Channel = 'sms' | 'whatsapp' | 'instagram' | 'dating_app' | 'other';

export type DesiredLength = 'short' | 'medium' | 'long';

export type EmojiLevel = 'none' | 'some' | 'more';

export type RiskTolerance = 'safe' | 'balanced' | 'bold';

export type Language = 'en' | 'es';

export type Locale = string; // e.g. "es-MX", "en-US"

export type UserVoice = 'formal' | 'neutral' | 'casual';

export type Directness = 'soft' | 'balanced' | 'direct';

export type Humor = 'none' | 'light' | 'playful';

export type GenerateCoachingConstraints = {
  language?: Language;
  locale?: Locale;

  // delivery style
  channel?: Channel;
  length?: DesiredLength;
  emojiLevel?: EmojiLevel;

  // user "voice"
  userVoice?: UserVoice;
  directness?: Directness;
  humor?: Humor;

  // safety / boldness tuning
  riskTolerance?: RiskTolerance;

  // context tuning
  relationshipType?: RelationshipType;
  stage?: ConversationStage;

  // content constraints
  avoid?: string[]; // e.g. ["pet names", "sexual jokes", "double texting"]
  mustInclude?: string[]; // e.g. ["suggest coffee", "mention the concert"]

  // output shape tuning
  numOptions?: 1 | 3 | 5; // default 1
  includeRationale?: boolean; // default false

  // hard caps
  maxCharacters?: number; // e.g. 240
  noQuestions?: boolean; // if true, don't ask any question
  maxQuestions?: 0 | 1 | 2; // default 1
};

export type GenerateCoachingInput = {
  scenarioText: string;
  lastMessageText: string | null;
  goal: CoachingGoal;
  vibe: CoachingVibe;
  flirtLevel: FlirtLevel;
  constraints?: GenerateCoachingConstraints;
  image?: {
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
  };
};

export type CoachingOption = {
  text: string;
  label: 'safe' | 'balanced' | 'bold' | 'playful' | 'direct' | 'neutral';
};

export type CoachingSafety = {
  blocked: boolean;
  flags: string[]; // e.g. ["harassment", "coercion", "explicit"]
  note?: string; // short explanation if blocked
};

export type GenerateCoachingResult = {
  message: string; // best option
  options?: CoachingOption[]; // if numOptions > 1
  rationale?: string[]; // optional
  detected?: {
    tone: string[];
    askedQuestion: boolean;
    energy: 'low' | 'medium' | 'high';
  };
  safety: CoachingSafety;
  usage?: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  };
};

/* =========================================================
 * 2) Zod schemas (strict output validation)
 * ======================================================= */

const coachingOptionLabels = [
  'safe',
  'balanced',
  'bold',
  'playful',
  'direct',
  'neutral',
] as const;

const CoachingOptionSchema = z.object({
  text: z.string().min(1),
  label: z.enum(coachingOptionLabels),
});

const CoachingSafetySchema = z.object({
  blocked: z.boolean(),
  flags: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const energyLevels = ['low', 'medium', 'high'] as const;

const CoachingDetectedSchema = z
  .object({
    tone: z.array(z.string()).default([]),
    askedQuestion: z.boolean(),
    energy: z.enum(energyLevels),
  })
  .optional();

const CoachingOutputSchema = z.object({
  message: z.string().min(1),
  options: z.array(CoachingOptionSchema).optional(),
  rationale: z.array(z.string()).optional(),
  detected: CoachingDetectedSchema,
  safety: CoachingSafetySchema,
});

/* =========================================================
 * 3) Helper: safe JSON parsing
 * ======================================================= */

function extractJsonObject(text: string): unknown {
  // Try direct JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Ignore parse errors, try fallback strategy below
  }

  // Try to extract the first {...} block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Ignore parse errors, fallback to null below
    }
  }

  // Fallback: not parseable
  return null;
}

/* =========================================================
 * 4) Prompt building
 * ======================================================= */

function vibeGuidance(vibe: CoachingVibe): string {
  switch (vibe) {
    case 'relax_joker':
      return 'Relaxed, playful, lightly funny, not try-hard.';
    case 'quiet_polite':
      return 'Warm, polite, calm, not overly enthusiastic.';
    case 'confident_direct':
      return 'Clear, confident, straight to the point, not rude.';
    case 'reserved_respectful':
      return 'Reserved, respectful, a bit cautious, no pressure.';
  }
}

function flirtGuidance(level: FlirtLevel): string {
  switch (level) {
    case 'none':
      return 'Neutral, friendly, no flirting.';
    case 'light':
      return 'Light flirt, subtle, not cheesy.';
    case 'classy':
      return 'Flirty but classy, respectful, no explicit content.';
  }
}

function normalizeConstraints(c?: GenerateCoachingConstraints): Required<
  Omit<
    GenerateCoachingConstraints,
    'maxQuestions' | 'numOptions' | 'maxCharacters'
  >
> & {
  maxQuestions: 0 | 1 | 2;
  numOptions: 1 | 3 | 5;
  maxCharacters?: number;
} {
  return {
    language: c?.language ?? 'en',
    locale: c?.locale ?? (c?.language === 'es' ? 'es-MX' : 'en-US'),

    channel: c?.channel ?? 'sms',
    length: c?.length ?? 'short',
    emojiLevel: c?.emojiLevel ?? 'some',

    userVoice: c?.userVoice ?? 'casual',
    directness: c?.directness ?? 'balanced',
    humor: c?.humor ?? 'light',

    riskTolerance: c?.riskTolerance ?? 'balanced',

    relationshipType: c?.relationshipType ?? 'unknown',
    stage: c?.stage ?? 'unknown',

    avoid: c?.avoid ?? [],
    mustInclude: c?.mustInclude ?? [],

    numOptions: c?.numOptions ?? 1,
    includeRationale: c?.includeRationale ?? false,

    maxCharacters: c?.maxCharacters ?? undefined,
    noQuestions: c?.noQuestions ?? false,
    maxQuestions: c?.maxQuestions ?? 1,
  };
}

/* =========================================================
 * 5) The Service
 * ======================================================= */

@Injectable()
export class AiV2Service {
  constructor(@Inject(OPENAI_CLIENT) private readonly client: OpenAI) {}

  /**
   * Advanced coaching generator:
   * - Collects tuning signals (goal/vibe/flirt + constraints)
   * - Forces structured JSON output validated by Zod
   * - Includes safety flags and optional variants
   */
  async generateCoaching(
    input: GenerateCoachingInput,
  ): Promise<GenerateCoachingResult> {
    const c = normalizeConstraints(input.constraints);
    const imageDataUrl = input.image ? this.toImageDataUrl(input.image) : null;

    const system = [
      'You are a respectful dating/social-skills coach.',
      'Goal: produce high-quality, authentic, ready-to-send message suggestions.',
      '',
      'Hard rules:',
      '- Be respectful and non-creepy.',
      '- No manipulation, coercion, guilt-tripping, or deception.',
      '- No explicit sexual content. No harassment. No insults.',
      '- If the user requests something unsafe or disrespectful, set safety.blocked=true and provide a safe alternative message.',
      '',
      'Output format:',
      '- Return ONLY valid JSON matching this schema:',
      JSON.stringify(
        {
          message: 'string (best single message)',
          options: [
            {
              text: 'string',
              label: 'safe|balanced|bold|playful|direct|neutral',
            },
          ],
          rationale: ['string bullet (optional)'],
          detected: {
            tone: ['string'],
            askedQuestion: true,
            energy: 'low|medium|high',
          },
          safety: {
            blocked: false,
            flags: ['string'],
            note: 'optional short string',
          },
        },
        null,
        2,
      ),
      '',
      'Style rules:',
      '- Match the user’s vibe and intent.',
      '- Keep it natural. Avoid cheesy pickup lines.',
      '- Avoid long paragraphs unless length=long.',
      '- Prefer 1 question max unless constraints.maxQuestions allows more.',
      '- Match the other person’s energy if their last message is provided.',
    ].join('\n');

    const user = [
      `Scenario: ${input.scenarioText}`,
      input.lastMessageText
        ? `Their last message: ${input.lastMessageText}`
        : '',
      '',
      'Tuning:',
      `- Goal: ${input.goal}`,
      `- Vibe: ${input.vibe} (${vibeGuidance(input.vibe)})`,
      `- Flirt level: ${input.flirtLevel} (${flirtGuidance(input.flirtLevel)})`,
      `- Relationship type: ${c.relationshipType}`,
      `- Stage: ${c.stage}`,
      `- Channel: ${c.channel}`,
      `- Language/Locale: ${c.language} (${c.locale})`,
      `- Length: ${c.length}`,
      `- Emoji level: ${c.emojiLevel}`,
      `- Voice: ${c.userVoice}`,
      `- Directness: ${c.directness}`,
      `- Humor: ${c.humor}`,
      `- Risk tolerance: ${c.riskTolerance}`,
      '',
      'Content constraints:',
      `- Avoid: ${c.avoid.length ? c.avoid.join(', ') : '(none)'}`,
      `- Must include: ${c.mustInclude.length ? c.mustInclude.join(', ') : '(none)'}`,
      c.maxCharacters ? `- Max characters: ${c.maxCharacters}` : '',
      `- Questions: ${
        c.noQuestions
          ? 'no questions allowed'
          : `max ${c.maxQuestions} question(s)`
      }`,
      `- Number of options: ${c.numOptions}`,
      `- Include rationale: ${c.includeRationale}`,
      '',
      'Task:',
      '- Produce message(s) to send next.',
      input.image
        ? '- An image is attached. Use it as extra context if it adds signal.'
        : '- No image is attached.',
      '- Ensure the output is valid JSON only.',
    ]
      .filter(Boolean)
      .join('\n');

    // Choose a model via env so you can change without code changes
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

    // First attempt
    const first = await this.callJsonModel({
      model,
      system,
      user,
      imageDataUrl: imageDataUrl ?? undefined,
    });

    const parsed1 = this.validateCoachingOutput(first);
    if (parsed1.ok) {
      return this.finalizeResult(parsed1.data, model);
    }

    // One repair attempt (common: trailing text, invalid JSON, schema mismatch)
    const repair = await this.callJsonModel({
      model,
      system,
      user: [
        user,
        '',
        'Your previous output was invalid JSON or did not match schema.',
        'Fix it. Return ONLY valid JSON matching the schema. No extra text.',
        '',
        'Invalid output was:',
        first,
      ].join('\n'),
      imageDataUrl: imageDataUrl ?? undefined,
    });

    const parsed2 = this.validateCoachingOutput(repair);
    if (parsed2.ok) {
      return this.finalizeResult(parsed2.data, model);
    }

    // Final safe fallback (never throw raw model text to user)
    return {
      message:
        c.language === 'es'
          ? 'Hey 🙂 ¿cómo va tu día? Me dio gusto verte el otro día.'
          : 'Hey 🙂 how’s your day going? It was nice seeing you the other day.',
      safety: {
        blocked: false,
        flags: ['model_output_invalid'],
        note: 'Model output could not be validated; returned fallback.',
      },
      usage: { model },
    };
  }

  /* =========================================================
   * 6) Internal: OpenAI call that expects JSON back
   * ======================================================= */

  private async callJsonModel(args: {
    model: string;
    system: string;
    user: string;
    imageDataUrl?: string;
  }): Promise<string> {
    const content: Array<
      | { type: 'input_text'; text: string }
      | { type: 'input_image'; image_url: string; detail: 'auto' }
    > = [{ type: 'input_text', text: args.user }];

    if (args.imageDataUrl) {
      content.push({
        type: 'input_image',
        image_url: args.imageDataUrl,
        detail: 'auto',
      });
    }

    const resp = await this.client.responses.create({
      model: args.model,
      instructions: args.system,
      input: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const text = resp.output_text ?? '';
    return text.trim();
  }

  private toImageDataUrl(image: {
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
  }): string {
    if (!image.buffer || image.buffer.length === 0) {
      throw new Error('Uploaded image is empty');
    }

    return `data:${image.mimetype};base64,${image.buffer.toString('base64')}`;
  }

  /* =========================================================
   * 7) Internal: validation + finalization
   * ======================================================= */

  private validateCoachingOutput(
    raw: string,
  ):
    | { ok: true; data: z.infer<typeof CoachingOutputSchema> }
    | { ok: false; error: string } {
    const obj = extractJsonObject(raw);
    if (!obj) return { ok: false, error: 'Could not parse JSON.' };

    const result = CoachingOutputSchema.safeParse(obj);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }

    // Enforce options count alignment if present
    if (result.data.options && result.data.options.length === 0) {
      return { ok: false, error: 'options was present but empty.' };
    }

    return { ok: true, data: result.data };
  }

  private finalizeResult(
    data: z.infer<typeof CoachingOutputSchema>,
    model: string,
  ): GenerateCoachingResult {
    // If blocked, still provide "message" as a safe alternative (as instructed)
    const res: GenerateCoachingResult = {
      message: data.message.trim(),
      options: data.options?.map((o) => ({
        text: o.text.trim(),
        label: o.label,
      })),
      rationale: data.rationale,
      detected: data.detected,
      safety: data.safety,
      usage: { model },
    };

    // Extra safety: never return empty message
    if (!res.message) {
      res.message = 'Hey — hope your day’s going well.';
      res.safety.flags = Array.from(
        new Set([...(res.safety.flags || []), 'empty_message']),
      );
    }

    return res;
  }
}
