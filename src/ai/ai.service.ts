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
import type {
  ChatType,
  EntryMode,
  EntryRole,
  SubmitMode,
  SuggestReplyLabel,
} from '../conversation/conversation.types';

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

export type VisionImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
};

export type ConversationContextEntryInput = {
  role: EntryRole;
  mode: EntryMode | null;
  contentText: string;
  createdAt?: string;
};

export type SuggestReplyOutput = {
  mode: 'suggest_reply';
  bestOption: string;
  options: Array<{
    label: SuggestReplyLabel;
    text: string;
  }>;
  rationale?: string[];
  model?: string;
  usage?: Record<string, unknown>;
  providerResponseId?: string;
};

export type AskAdviceOutput = {
  mode: 'ask_advice';
  advice: string;
  nextSteps: string[];
  model?: string;
  usage?: Record<string, unknown>;
  providerResponseId?: string;
};

export type AnalyzeOptionsOutput = {
  conversationState: {
    title: string;
    tags: string[];
  };
  coreStrategy: string;
  flowScore: number;
  successProbability: number;
  scoreBand: 'low' | 'medium' | 'high';
  nextSteps: string[];
  suggestedReplies: Array<{
    label: SuggestReplyLabel;
    text: string;
    recommended: boolean;
  }>;
  rationale: string;
  safety: {
    blocked: boolean;
    flags: string[];
    note?: string;
  };
  model?: string;
  usage?: Record<string, unknown>;
  providerResponseId?: string;
};

export type GenerateConversationOutputResult =
  | SuggestReplyOutput
  | AskAdviceOutput;

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

const suggestReplySchema = z.object({
  bestOption: z.string().min(1),
  options: z
    .array(
      z.object({
        label: z.enum(['safe', 'balanced', 'bold'] as const),
        text: z.string().min(1),
      }),
    )
    .length(3),
  rationale: z.array(z.string().min(1)).max(5).nullable(),
});

const askAdviceSchema = z.object({
  advice: z.string().min(1),
  nextSteps: z.array(z.string().min(1)).min(2).max(3),
});

const analyzeOptionsSchema = z.object({
  conversationState: z.object({
    title: z.string().min(3),
    tags: z.array(z.string().min(1)).min(1).max(3),
  }),
  coreStrategy: z.string().min(1),
  flowScore: z.number().int().min(0).max(100),
  successProbability: z.number().int().min(0).max(100),
  scoreBand: z.enum(['low', 'medium', 'high'] as const),
  nextSteps: z.array(z.string().min(1)).min(2).max(3),
  suggestedReplies: z
    .array(
      z.object({
        label: z.enum(['safe', 'balanced', 'bold'] as const),
        text: z.string().min(1),
        recommended: z.boolean(),
      }),
    )
    .length(3),
  rationale: z.string().min(1),
  safety: z.object({
    blocked: z.boolean(),
    flags: z.array(z.string().min(1)).max(8).default([]),
    note: z.string().nullable(),
  }),
});

const ocrOutputSchema = z.object({
  text: z.string(),
});

function shouldLogConfidenceRawOutput(): boolean {
  const raw = process.env.CONFIDENCE_TEST_LOG_RAW_AI_OUTPUT;
  if (!raw) return false;
  return raw.trim().toLowerCase() === 'true';
}

function chatTypeGuidance(chatType: ChatType): string {
  switch (chatType) {
    case 'dating':
      return 'Context: Dating/romantic conversation. Use inclusive, respectful, authentic language. No manipulative tactics.';
    case 'friends':
      return 'Context: Friendly social conversation. Keep it warm, natural, and low-pressure.';
    case 'work':
      return 'Context: Professional/work conversation. Keep it clear, polite, and concise.';
    case 'general':
      return 'Context: General daily conversation. Be practical, natural, and socially aware.';
  }
}

function summarizeContext(entries: ConversationContextEntryInput[]): string {
  if (entries.length === 0) {
    return '(No prior context in this chat yet)';
  }

  return entries
    .map((entry, idx) => {
      const role = entry.role === 'assistant_output' ? 'assistant' : 'user';
      const mode = entry.mode ? ` mode=${entry.mode}` : '';
      const stamp = entry.createdAt ? ` at=${entry.createdAt}` : '';
      return `#${idx + 1} [${role}${mode}${stamp}]\n${entry.contentText}`;
    })
    .join('\n\n');
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

  async extractTextFromImages(files: VisionImageFile[]): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }

    const model =
      process.env.OPENAI_OCR_MODEL?.trim() ||
      process.env.OPENAI_CONVERSATION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-4.1-mini';

    const extractedTexts: string[] = [];

    for (const file of files) {
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('Uploaded image is empty');
      }

      const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const resp = await this.client.responses.parse({
        model,
        instructions: [
          'You are an OCR extraction tool.',
          'Extract all visible text exactly as readable from the provided chat screenshot.',
          'Preserve line breaks where possible.',
          'Do not add commentary. If no text is visible, return an empty string.',
          'Return structured output only.',
        ].join('\n'),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Extract the readable text from this screenshot.',
              },
              {
                type: 'input_image',
                image_url: dataUrl,
                detail: 'auto',
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(ocrOutputSchema, 'ocr_output'),
        },
      });

      const parsed = resp.output_parsed;
      if (!parsed) {
        throw new Error('Could not parse OCR output from model response');
      }

      extractedTexts.push(parsed.text.trim());
    }

    return extractedTexts;
  }

  async generateConversationOutput(input: {
    mode: SubmitMode;
    chatType: ChatType;
    contextEntries: ConversationContextEntryInput[];
    userInput: {
      contentText: string;
      sourceText: string | null;
      ocrText: string | null;
    };
  }): Promise<GenerateConversationOutputResult> {
    const model =
      process.env.OPENAI_CONVERSATION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-5.2';

    const system = [
      'You are a conversation assistant that helps users communicate respectfully and effectively.',
      chatTypeGuidance(input.chatType),
      '',
      'Safety rules:',
      '- Be respectful and honest.',
      '- Never suggest manipulation, coercion, harassment, insults, or explicit sexual content.',
      '- If the user asks for something unsafe, redirect to a safe alternative.',
    ].join('\n');

    const contextText = summarizeContext(input.contextEntries);

    const userPrompt = [
      `Mode: ${input.mode}`,
      `Chat type: ${input.chatType}`,
      '',
      'Recent chat context (oldest to newest):',
      contextText,
      '',
      'Latest user submission (canonical):',
      input.userInput.contentText,
      '',
      `Source pasted text: ${input.userInput.sourceText ?? '(none)'}`,
      `OCR text: ${input.userInput.ocrText ?? '(none)'}`,
    ].join('\n');

    if (input.mode === 'suggest_reply') {
      const resp = await this.client.responses.parse({
        model,
        instructions: [
          system,
          '',
          'Task: suggest the best next message to send.',
          'Return exactly 3 options with labels: safe, balanced, bold.',
          'Keep each option concise and send-ready.',
          'Choose bestOption from one of the options exactly.',
        ].join('\n'),
        input: userPrompt,
        text: {
          format: zodTextFormat(suggestReplySchema, 'suggest_reply_output'),
        },
      });

      const parsed = resp.output_parsed;
      if (!parsed) {
        throw new Error('Could not parse suggest_reply output');
      }

      return {
        mode: 'suggest_reply',
        bestOption: parsed.bestOption.trim(),
        options: parsed.options.map((item) => ({
          label: item.label,
          text: item.text.trim(),
        })),
        rationale: parsed.rationale ?? undefined,
        model: resp.model ?? model,
        usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
        providerResponseId: resp.id,
      };
    }

    const resp = await this.client.responses.parse({
      model,
      instructions: [
        system,
        '',
        'Task: provide concise, practical advice about this conversation context.',
        'Return a brief interpretation and 2-3 practical next steps.',
      ].join('\n'),
      input: userPrompt,
      text: {
        format: zodTextFormat(askAdviceSchema, 'ask_advice_output'),
      },
    });

    const parsed = resp.output_parsed;
    if (!parsed) {
      throw new Error('Could not parse ask_advice output');
    }

    return {
      mode: 'ask_advice',
      advice: parsed.advice.trim(),
      nextSteps: parsed.nextSteps.map((step) => step.trim()),
      model: resp.model ?? model,
      usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
      providerResponseId: resp.id,
    };
  }

  async generateAnalyzeOptionsOutput(input: {
    chatType: ChatType;
    contextEntries: ConversationContextEntryInput[];
    locale: string;
    timezone: string;
  }): Promise<AnalyzeOptionsOutput> {
    const model =
      process.env.OPENAI_CONVERSATION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-5.2';

    const system = [
      'You are a conversation analysis assistant.',
      chatTypeGuidance(input.chatType),
      '',
      'Safety rules:',
      '- Be respectful and non-manipulative.',
      '- Do not suggest harassment, coercion, or explicit sexual content.',
      '- If context indicates risk, include safety flags and safer alternatives.',
      '',
      'Output rules:',
      '- Return semantic content only. No UI colors, icons, design tokens, or layout instructions.',
      '- Return strict JSON matching the required schema only.',
    ].join('\n');

    const contextText = summarizeContext(input.contextEntries);

    const userPrompt = [
      `Chat type: ${input.chatType}`,
      `Locale: ${input.locale}`,
      `Timezone: ${input.timezone}`,
      '',
      'Recent chat context (oldest to newest):',
      contextText,
      '',
      'Create an analysis card with:',
      '- conversationState title and 1-3 tags',
      '- coreStrategy',
      '- flowScore and successProbability (0-100, aligned)',
      '- scoreBand (low/medium/high)',
      '- nextSteps (2-3)',
      '- suggestedReplies: exactly 3 options labeled safe, balanced, bold; exactly one recommended=true',
      '- rationale',
      '- safety (blocked, flags, optional note)',
    ].join('\n');

    const resp = await this.client.responses.parse({
      model,
      instructions: system,
      input: userPrompt,
      text: {
        format: zodTextFormat(analyzeOptionsSchema, 'analyze_options_output'),
      },
    });

    const parsed = resp.output_parsed;
    if (!parsed) {
      throw new Error('Could not parse analyze_options output');
    }

    return {
      conversationState: {
        title: parsed.conversationState.title.trim(),
        tags: parsed.conversationState.tags.map((tag) => tag.trim()),
      },
      coreStrategy: parsed.coreStrategy.trim(),
      flowScore: parsed.flowScore,
      successProbability: parsed.successProbability,
      scoreBand: parsed.scoreBand,
      nextSteps: parsed.nextSteps.map((step) => step.trim()),
      suggestedReplies: parsed.suggestedReplies.map((reply) => ({
        label: reply.label,
        text: reply.text.trim(),
        recommended: reply.recommended,
      })),
      rationale: parsed.rationale.trim(),
      safety: {
        blocked: parsed.safety.blocked,
        flags: parsed.safety.flags,
        note: parsed.safety.note?.trim() ?? undefined,
      },
      model: resp.model ?? model,
      usage: (resp as unknown as { usage?: Record<string, unknown> }).usage,
      providerResponseId: resp.id,
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
