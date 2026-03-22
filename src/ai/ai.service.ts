import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import type {
  CoachingGoal,
  CoachingVibe,
  FlirtLevel,
} from '../coaching/entities/coaching-request.entity';
import { OPENAI_CLIENT } from './ai.constants';

type GenerateCoachingInput = {
  scenarioText: string;
  lastMessageText: string | null;
  goal: CoachingGoal;
  vibe: CoachingVibe;
  flirtLevel: FlirtLevel;
  constraints: Record<string, unknown>;
};

type GenerateCoachingResult = {
  messageText: string;
  candidates?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  model?: string;
  usage?: Record<string, unknown>;
  providerResponseId?: string;
};

type EvaluateConfidenceInput = {
  messageText: string;
  instagramHandle: string;
};

type EvaluateConfidenceResult = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model?: string;
  usage?: Record<string, unknown>;
  providerResponseId?: string;
};

const confidenceEvaluationSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(3).default([]),
  improvements: z.array(z.string().min(1)).max(3).default([]),
});

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Ignore parse errors and attempt extraction below.
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Ignore parse errors and fallback to null.
    }
  }

  return null;
}

@Injectable()
export class AiService {
  constructor(@Inject(OPENAI_CLIENT) private readonly client: OpenAI) {}

  async generateCoaching(
    input: GenerateCoachingInput,
  ): Promise<GenerateCoachingResult> {
    // Pick a default model. You can change this later via env.
    const model = process.env.OPENAI_MODEL ?? 'gpt-5.2';

    const system = [
      'You are a dating/social-skills coach.',
      'Your job: produce ONE ready-to-send message that matches the user goal, vibe, and flirt level.',
      'Be respectful, non-creepy, non-explicit. No manipulation. No insults.',
      'Return plain text only.',
    ].join('\n');

    const user = [
      `Scenario: ${input.scenarioText}`,
      input.lastMessageText
        ? `Their last message: ${input.lastMessageText}`
        : '',
      `Goal: ${input.goal}`,
      `Vibe: ${input.vibe}`,
      `Flirt level: ${input.flirtLevel}`,
      `Constraints (json): ${JSON.stringify(input.constraints ?? {})}`,
      '',
      'Write the best next message to send.',
    ]
      .filter(Boolean)
      .join('\n');

    // Responses API: simplest usage is model + input, then read output_text. :contentReference[oaicite:3]{index=3}
    const resp = await this.client.responses.create({
      model,
      instructions: system,
      input: user,
    });

    const messageText = resp.output_text ?? '';

    return {
      messageText,
      model: resp.model ?? model,
      usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
      providerResponseId: resp.id,
      meta: {
        goal: input.goal,
        vibe: input.vibe,
        flirtLevel: input.flirtLevel,
      },
    };
  }

  async evaluateConfidenceMessage(
    input: EvaluateConfidenceInput,
  ): Promise<EvaluateConfidenceResult> {
    const model =
      process.env.OPENAI_CONFIDENCE_MODEL ??
      process.env.OPENAI_MODEL ??
      'gpt-5.2';

    const instructions = [
      'You are an evaluator for a social confidence training app.',
      'Rate only the confidence and social quality of the message on a 1-10 scale.',
      'Focus on clarity, confidence, warmth, and respect.',
      'Penalize rude, manipulative, needy, or creepy tone.',
      'Output strict JSON only with keys: score, feedback, strengths, improvements.',
      'Keep feedback practical and short.',
    ].join('\n');

    const prompt = [
      `Instagram handle: ${input.instagramHandle}`,
      `Message to evaluate: ${input.messageText}`,
      '',
      'Return JSON only.',
    ].join('\n');

    const resp = await this.client.responses.create({
      model,
      instructions,
      input: prompt,
    });

    const parsed = confidenceEvaluationSchema.safeParse(
      extractJsonObject(resp.output_text ?? ''),
    );

    if (!parsed.success) {
      throw new Error('Could not parse confidence score from AI response');
    }

    return {
      ...parsed.data,
      model: resp.model ?? model,
      usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
      providerResponseId: resp.id,
    };
  }
}
