import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  AiService,
  type AnalyzeOptionsOutput,
  type GenerateConversationOutputResult,
} from '../ai/ai.service';
import {
  CHAT_TYPES,
  type ChatType,
  SUGGEST_REPLY_LABELS,
  type SubmitMode,
} from './conversation.types';
import { ConversationChatEntity } from './entities/conversation-chat.entity';
import { ConversationEntryEntity } from './entities/conversation-entry.entity';
import { ProfilesService } from '../profiles/profiles.service';

type CursorToken = {
  at: string;
  id: string;
};

export type UploadedConversationImage = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type ListInput = {
  limit?: string;
  cursor?: string;
};

type SubmitToConversationInput = {
  userId: string;
  chatId: string;
  mode: SubmitMode;
  text?: string | null;
  images?: UploadedConversationImage[];
};

type AnalyzeOptionsForChatInput = {
  userId: string;
  chatId: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationChatEntity)
    private readonly chatsRepo: Repository<ConversationChatEntity>,
    @InjectRepository(ConversationEntryEntity)
    private readonly entriesRepo: Repository<ConversationEntryEntity>,
    private readonly ai: AiService,
    private readonly config: ConfigService,
    private readonly profiles: ProfilesService,
  ) {}

  async createChat(params: {
    userId: string;
    type: ChatType;
    title?: string | null;
  }) {
    if (!CHAT_TYPES.includes(params.type)) {
      throw new BadRequestException('Invalid chat type');
    }

    const chat = await this.chatsRepo.save(
      this.chatsRepo.create({
        userId: params.userId,
        type: params.type,
        title: this.normalizeTitle(params.title),
      }),
    );

    return chat;
  }

  async listChatsForUser(userId: string, query: ListInput) {
    const limit = this.parseLimit(query.limit);
    const cursor = this.parseCursor(query.cursor);

    const qb = this.chatsRepo
      .createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
      .orderBy('chat.updatedAt', 'DESC')
      .addOrderBy('chat.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('chat.updatedAt < :cursorAt', { cursorAt: cursor.at })
            .orWhere('chat.updatedAt = :cursorAt AND chat.id < :cursorId', {
              cursorAt: cursor.at,
              cursorId: cursor.id,
            });
        }),
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor:
        hasMore && items.length > 0
          ? this.encodeCursor(
              items[items.length - 1].updatedAt,
              items[items.length - 1].id,
            )
          : null,
    };
  }

  async updateChatForUser(params: {
    userId: string;
    chatId: string;
    type?: ChatType;
    title?: string | null;
  }) {
    if (params.type && !CHAT_TYPES.includes(params.type)) {
      throw new BadRequestException('Invalid chat type');
    }

    if (params.type === undefined && params.title === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const chat = await this.getChatForUser(params.chatId, params.userId);

    if (params.type !== undefined) {
      chat.type = params.type;
    }

    if (params.title !== undefined) {
      chat.title = this.normalizeTitle(params.title);
    }

    return this.chatsRepo.save(chat);
  }

  async listEntriesForUserChat(params: {
    userId: string;
    chatId: string;
    limit?: string;
    cursor?: string;
  }) {
    await this.getChatForUser(params.chatId, params.userId);

    const limit = this.parseLimit(params.limit);
    const cursor = this.parseCursor(params.cursor);

    const qb = this.entriesRepo
      .createQueryBuilder('entry')
      .where('entry.userId = :userId', { userId: params.userId })
      .andWhere('entry.chatId = :chatId', { chatId: params.chatId })
      .orderBy('entry.createdAt', 'DESC')
      .addOrderBy('entry.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      qb.andWhere(
        new Brackets((whereQb) => {
          whereQb
            .where('entry.createdAt < :cursorAt', { cursorAt: cursor.at })
            .orWhere('entry.createdAt = :cursorAt AND entry.id < :cursorId', {
              cursorAt: cursor.at,
              cursorId: cursor.id,
            });
        }),
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor:
        hasMore && items.length > 0
          ? this.encodeCursor(
              items[items.length - 1].createdAt,
              items[items.length - 1].id,
            )
          : null,
    };
  }

  async submitToChat(input: SubmitToConversationInput) {
    const chat = await this.getChatForUser(input.chatId, input.userId);

    const limits = this.getConversationLimits();
    const sourceText = this.normalizeSourceText(
      input.text,
      limits.maxTextChars,
    );
    const images = input.images ?? [];

    if (!sourceText && images.length === 0) {
      throw new BadRequestException('Provide text or at least one image');
    }

    this.validateImages(images, limits.maxImages, limits.maxImageBytes);

    let ocrSegments: string[] = [];

    if (images.length > 0) {
      try {
        ocrSegments = await this.ai.extractTextFromImages(images);
      } catch {
        throw new UnprocessableEntityException(
          'Could not extract text from one or more images',
        );
      }
    }

    const ocrText = this.joinOcrSegments(ocrSegments);
    const contentText = this.buildCanonicalContent(sourceText, ocrText);

    if (!contentText) {
      throw new UnprocessableEntityException(
        'Could not extract readable text from submitted input',
      );
    }

    const userEntry = await this.entriesRepo.save(
      this.entriesRepo.create({
        chatId: chat.id,
        userId: input.userId,
        role: 'user_submission',
        mode: input.mode,
        contentText,
        sourceText,
        ocrText,
        payloadJson: {
          imageCount: images.length,
          mode: input.mode,
        },
        status: 'success',
        model: null,
        usageJson: null,
        errorMessage: null,
      }),
    );

    const contextEntries = await this.entriesRepo.find({
      where: {
        userId: input.userId,
        chatId: chat.id,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      take: limits.contextLimit,
    });

    const contextForAi = [...contextEntries].reverse().map((entry) => ({
      role: entry.role,
      mode: entry.mode,
      contentText: entry.contentText,
      createdAt: entry.createdAt.toISOString(),
    }));

    let aiOutput: GenerateConversationOutputResult;

    try {
      const generated = await this.ai.generateConversationOutput({
        mode: input.mode,
        chatType: chat.type,
        contextEntries: contextForAi,
        userInput: {
          contentText,
          sourceText,
          ocrText,
        },
      });
      this.assertModeOutput(input.mode, generated);
      aiOutput = generated;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown AI generation error';

      const assistantEntry = await this.entriesRepo.save(
        this.entriesRepo.create({
          chatId: chat.id,
          userId: input.userId,
          role: 'assistant_output',
          mode: input.mode,
          contentText: '',
          sourceText: null,
          ocrText: null,
          payloadJson: {},
          status: 'failed',
          model: null,
          usageJson: null,
          errorMessage,
        }),
      );

      chat.updatedAt = new Date();
      await this.chatsRepo.save(chat);

      return {
        chat,
        userEntry,
        assistantEntry,
        output: null,
        errorMessage,
      };
    }

    const assistantPayload =
      aiOutput.mode === 'suggest_reply'
        ? {
            mode: aiOutput.mode,
            bestOption: aiOutput.bestOption,
            options: aiOutput.options,
            rationale: aiOutput.rationale ?? [],
          }
        : {
            mode: aiOutput.mode,
            advice: aiOutput.advice,
            nextSteps: aiOutput.nextSteps,
          };

    const assistantEntry = await this.entriesRepo.save(
      this.entriesRepo.create({
        chatId: chat.id,
        userId: input.userId,
        role: 'assistant_output',
        mode: input.mode,
        contentText:
          aiOutput.mode === 'suggest_reply'
            ? aiOutput.bestOption
            : aiOutput.advice,
        sourceText: null,
        ocrText: null,
        payloadJson: assistantPayload,
        status: 'success',
        model: aiOutput.model ?? null,
        usageJson: aiOutput.usage ?? null,
        errorMessage: null,
      }),
    );

    chat.updatedAt = new Date();
    await this.chatsRepo.save(chat);

    return {
      chat,
      userEntry,
      assistantEntry,
      output: aiOutput,
      errorMessage: null,
    };
  }

  async analyzeOptionsForChat(input: AnalyzeOptionsForChatInput) {
    const chat = await this.getChatForUser(input.chatId, input.userId);
    const limits = this.getConversationLimits();

    const profile = await this.profiles.getByUserId(input.userId);
    const locale = this.normalizeProfileField(profile?.locale, 'en');
    const timezone = this.normalizeProfileField(profile?.timezone, 'UTC');

    const contextEntries = await this.entriesRepo.find({
      where: {
        userId: input.userId,
        chatId: chat.id,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      take: limits.contextLimit,
    });

    const hasUserContext = contextEntries.some(
      (entry) =>
        entry.role === 'user_submission' && entry.contentText.trim().length > 0,
    );

    if (!hasUserContext) {
      throw new BadRequestException(
        'No user submission context available for analysis',
      );
    }

    const contextForAi = [...contextEntries].reverse().map((entry) => ({
      role: entry.role,
      mode: entry.mode,
      contentText: entry.contentText,
      createdAt: entry.createdAt.toISOString(),
    }));

    let analysis: AnalyzeOptionsOutput;

    try {
      const generated = await this.ai.generateAnalyzeOptionsOutput({
        chatType: chat.type,
        contextEntries: contextForAi,
        locale,
        timezone,
      });

      this.assertAnalyzeOptionsOutput(generated);
      analysis = generated;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown analysis generation error';

      await this.entriesRepo.save(
        this.entriesRepo.create({
          chatId: chat.id,
          userId: input.userId,
          role: 'assistant_output',
          mode: 'analyze_options',
          contentText: '',
          sourceText: null,
          ocrText: null,
          payloadJson: {},
          status: 'failed',
          model: null,
          usageJson: null,
          errorMessage,
        }),
      );

      chat.updatedAt = new Date();
      await this.chatsRepo.save(chat);

      throw new UnprocessableEntityException(
        'Could not generate analysis options',
      );
    }

    const analysisEntry = await this.entriesRepo.save(
      this.entriesRepo.create({
        chatId: chat.id,
        userId: input.userId,
        role: 'assistant_output',
        mode: 'analyze_options',
        contentText: this.buildAnalysisSummaryText(analysis),
        sourceText: null,
        ocrText: null,
        payloadJson: {
          mode: 'analyze_options',
          analysis,
        },
        status: 'success',
        model: analysis.model ?? null,
        usageJson: analysis.usage ?? null,
        errorMessage: null,
      }),
    );

    chat.updatedAt = new Date();
    await this.chatsRepo.save(chat);

    return {
      chat,
      analysisEntry,
      analysis,
    };
  }

  private parseLimit(rawLimit?: string): number {
    if (!rawLimit) return DEFAULT_LIMIT;

    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid limit value');
    }

    return Math.min(parsed, MAX_LIMIT);
  }

  private parseCursor(rawCursor?: string): CursorToken | null {
    if (!rawCursor) return null;

    try {
      const decoded = Buffer.from(rawCursor, 'base64url').toString('utf8');
      const token = JSON.parse(decoded) as CursorToken;

      if (
        !token ||
        typeof token !== 'object' ||
        typeof token.at !== 'string' ||
        typeof token.id !== 'string'
      ) {
        throw new Error('Malformed cursor token');
      }

      const parsedDate = new Date(token.at);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Invalid cursor timestamp');
      }

      return token;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private encodeCursor(at: Date, id: string): string {
    const payload: CursorToken = {
      at: at.toISOString(),
      id,
    };

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private async getChatForUser(chatId: string, userId: string) {
    const chat = await this.chatsRepo.findOne({
      where: {
        id: chatId,
        userId,
      },
    });

    if (!chat) {
      throw new NotFoundException('Conversation chat not found');
    }

    return chat;
  }

  private normalizeTitle(title?: string | null): string | null {
    if (title === undefined || title === null) return null;

    const trimmed = title.trim();
    if (!trimmed) return null;

    return trimmed.slice(0, 120);
  }

  private normalizeSourceText(
    text: string | null | undefined,
    maxTextChars: number,
  ): string | null {
    if (text === null || text === undefined) return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    if (trimmed.length > maxTextChars) {
      throw new BadRequestException(
        `Text exceeds maximum length of ${maxTextChars} characters`,
      );
    }

    return trimmed;
  }

  private validateImages(
    images: UploadedConversationImage[],
    maxImages: number,
    maxImageBytes: number,
  ) {
    if (images.length > maxImages) {
      throw new BadRequestException(`You can upload up to ${maxImages} images`);
    }

    for (const image of images) {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(image.mimetype)) {
        throw new BadRequestException(
          `Unsupported image type: ${image.mimetype}`,
        );
      }

      if (image.size > maxImageBytes) {
        const maxMb = Math.floor(maxImageBytes / (1024 * 1024));
        throw new BadRequestException(
          `Image ${image.originalname} exceeds ${maxMb} MB limit`,
        );
      }
    }
  }

  private joinOcrSegments(segments: string[]): string | null {
    const normalized = segments
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (normalized.length === 0) return null;

    return normalized
      .map((segment, idx) => `Screenshot ${idx + 1}:\n${segment}`)
      .join('\n\n');
  }

  private buildCanonicalContent(
    sourceText: string | null,
    ocrText: string | null,
  ): string | null {
    if (!sourceText && !ocrText) return null;

    if (sourceText && ocrText) {
      return ['Pasted text:', sourceText, '', 'Screenshot OCR:', ocrText].join(
        '\n',
      );
    }

    return sourceText ?? ocrText;
  }

  private assertModeOutput(
    mode: SubmitMode,
    output: GenerateConversationOutputResult,
  ) {
    if (mode !== output.mode) {
      throw new Error('AI output mode does not match requested mode');
    }

    if (output.mode === 'suggest_reply') {
      const labels = output.options.map((option) => option.label);
      const expected = [...SUGGEST_REPLY_LABELS].sort();
      const received = [...labels].sort();

      if (
        output.options.length !== 3 ||
        JSON.stringify(expected) !== JSON.stringify(received)
      ) {
        throw new Error(
          'AI output does not include expected suggest_reply labels',
        );
      }

      if (!output.bestOption.trim()) {
        throw new Error('AI output missing best option');
      }
    }

    if (output.mode === 'ask_advice') {
      if (!output.advice.trim()) {
        throw new Error('AI output missing advice text');
      }

      if (output.nextSteps.length < 2 || output.nextSteps.length > 3) {
        throw new Error('AI output nextSteps must contain 2 to 3 items');
      }
    }
  }

  private assertAnalyzeOptionsOutput(output: AnalyzeOptionsOutput) {
    if (output.flowScore < 0 || output.flowScore > 100) {
      throw new Error('flowScore must be between 0 and 100');
    }

    if (output.successProbability < 0 || output.successProbability > 100) {
      throw new Error('successProbability must be between 0 and 100');
    }

    const scoreDelta = Math.abs(output.flowScore - output.successProbability);
    if (scoreDelta > 15) {
      throw new Error('flowScore and successProbability are not aligned');
    }

    const expectedBand = this.scoreBandFromScore(output.flowScore);
    if (output.scoreBand !== expectedBand) {
      throw new Error('scoreBand does not match score thresholds');
    }

    if (
      output.conversationState.tags.length < 1 ||
      output.conversationState.tags.length > 3
    ) {
      throw new Error('conversationState.tags must contain 1 to 3 tags');
    }

    if (output.nextSteps.length < 2 || output.nextSteps.length > 3) {
      throw new Error('nextSteps must contain 2 to 3 items');
    }

    if (output.suggestedReplies.length !== 3) {
      throw new Error('suggestedReplies must contain exactly 3 options');
    }

    const labels = output.suggestedReplies.map((reply) => reply.label);
    const expectedLabels = [...SUGGEST_REPLY_LABELS].sort();
    const receivedLabels = [...labels].sort();

    if (JSON.stringify(expectedLabels) !== JSON.stringify(receivedLabels)) {
      throw new Error('suggestedReplies must include safe, balanced, and bold');
    }

    const recommendedCount = output.suggestedReplies.filter(
      (reply) => reply.recommended,
    ).length;
    if (recommendedCount !== 1) {
      throw new Error('Exactly one suggested reply must be recommended');
    }
  }

  private scoreBandFromScore(score: number): 'low' | 'medium' | 'high' {
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  private buildAnalysisSummaryText(output: AnalyzeOptionsOutput): string {
    return [
      output.conversationState.title.trim(),
      output.coreStrategy.trim(),
      `Flow score: ${output.flowScore}/100`,
    ].join('\n');
  }

  private normalizeProfileField(
    value: string | undefined,
    fallback: string,
  ): string {
    if (!value) return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  private getConversationLimits() {
    const contextLimit = this.getPositiveConfigValue(
      'conversation.contextLimit',
      20,
    );
    const maxImages = this.getPositiveConfigValue('conversation.maxImages', 3);
    const maxImageMb = this.getPositiveConfigValue(
      'conversation.maxImageMb',
      5,
    );
    const maxTextChars = this.getPositiveConfigValue(
      'conversation.maxTextChars',
      5000,
    );

    return {
      contextLimit,
      maxImages,
      maxImageBytes: maxImageMb * 1024 * 1024,
      maxTextChars,
    };
  }

  private getPositiveConfigValue(path: string, fallback: number): number {
    const value = this.config.get<number>(path);
    if (typeof value !== 'number') return fallback;
    if (!Number.isFinite(value) || value <= 0) return fallback;

    return value;
  }
}
