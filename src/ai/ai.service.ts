import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
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

type ConfidenceEvaluationErrorDetails = {
  reason: 'invalid_ai_output';
  providerResponseId: string | null;
  model: string;
  outputTextLength: number;
  outputPreview?: string;
};

export class ConfidenceEvaluationError extends Error {
  constructor(readonly details: ConfidenceEvaluationErrorDetails) {
    super('Could not parse confidence score from AI response');
    this.name = 'ConfidenceEvaluationError';
  }
}

const confidenceEvaluationSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(3).default([]),
  improvements: z.array(z.string().min(1)).max(3).default([]),
});

function shouldLogConfidenceRawOutput(): boolean {
  const raw = process.env.CONFIDENCE_TEST_LOG_RAW_AI_OUTPUT;
  if (!raw) return false;
  return raw.trim().toLowerCase() === 'true';
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

    try {
      const resp = await this.client.responses.parse({
        model,
        instructions,
        input: prompt,
        text: {
          format: zodTextFormat(
            confidenceEvaluationSchema,
            'confidence_evaluation',
          ),
        },
      });

      const parsed = resp.output_parsed;
      if (!parsed) {
        const rawOutput = resp.output_text ?? '';
        const details: ConfidenceEvaluationErrorDetails = {
          reason: 'invalid_ai_output',
          providerResponseId: resp.id ?? null,
          model: resp.model ?? model,
          outputTextLength: rawOutput.length,
        };

        if (shouldLogConfidenceRawOutput()) {
          details.outputPreview = rawOutput.slice(0, 500);
        }

        throw new ConfidenceEvaluationError(details);
      }

      return {
        ...parsed,
        model: resp.model ?? model,
        usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
        providerResponseId: resp.id,
      };
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        throw new ConfidenceEvaluationError({
          reason: 'invalid_ai_output',
          providerResponseId: null,
          model,
          outputTextLength: 0,
          outputPreview: shouldLogConfidenceRawOutput()
            ? String(error.message ?? '').slice(0, 500)
            : undefined,
        });
      }

      throw error;
    }
  }
}
