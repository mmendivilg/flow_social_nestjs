import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
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
}
