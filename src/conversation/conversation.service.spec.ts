import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type {
  type AnalyzeOptionsOutput,
  AiService,
  type GenerateConversationOutputResult,
} from '../ai/ai.service';
import {
  ConversationService,
  type UploadedConversationImage,
} from './conversation.service';
import type { ConversationChatEntity } from './entities/conversation-chat.entity';
import type { ConversationEntryEntity } from './entities/conversation-entry.entity';
import type { ProfilesService } from '../profiles/profiles.service';

function makeChat(overrides: Partial<ConversationChatEntity> = {}) {
  return {
    id: 'chat-1',
    userId: 'user-1',
    type: 'dating',
    title: null,
    createdAt: new Date('2026-03-23T10:00:00.000Z'),
    updatedAt: new Date('2026-03-23T10:00:00.000Z'),
    ...overrides,
  } as ConversationChatEntity;
}

function makeEntry(overrides: Partial<ConversationEntryEntity> = {}) {
  return {
    id: 'entry-1',
    chatId: 'chat-1',
    userId: 'user-1',
    role: 'user_submission',
    mode: 'suggest_reply',
    contentText: 'hello',
    sourceText: 'hello',
    ocrText: null,
    payloadJson: {},
    status: 'success',
    model: null,
    usageJson: null,
    errorMessage: null,
    createdAt: new Date('2026-03-23T10:01:00.000Z'),
    ...overrides,
  } as ConversationEntryEntity;
}

function makeAnalyzeOutput(
  overrides: Partial<AnalyzeOptionsOutput> = {},
): AnalyzeOptionsOutput {
  return {
    conversationState: {
      title: 'Push-pull dynamic with rising curiosity',
      tags: ['intrigued', 'playful'],
    },
    coreStrategy: 'Mirror energy with concise confidence and clear intent.',
    flowScore: 85,
    successProbability: 82,
    scoreBand: 'high',
    nextSteps: [
      'Wait 15-20 minutes before replying.',
      'Send one confident line with a light callback.',
    ],
    suggestedReplies: [
      {
        label: 'safe',
        text: 'Haha, bold move for a Tuesday.',
        recommended: false,
      },
      {
        label: 'balanced',
        text: 'You are full of surprises. Keep that same energy.',
        recommended: true,
      },
      {
        label: 'bold',
        text: 'Usually I charge for compliments that good. 😉',
        recommended: false,
      },
    ],
    rationale:
      'Their tone got progressively more assertive, so balanced mirroring should perform best.',
    safety: {
      blocked: false,
      flags: [],
    },
    model: 'gpt-5.2',
    usage: null,
    providerResponseId: 'resp_123',
    ...overrides,
  };
}

const asChatEntity = (value: Partial<ConversationChatEntity>) =>
  value as ConversationChatEntity;
const asEntryEntity = (value: Partial<ConversationEntryEntity>) =>
  value as ConversationEntryEntity;

describe('ConversationService', () => {
  let service: ConversationService;
  let chatsRepo: jest.Mocked<Repository<ConversationChatEntity>>;
  let entriesRepo: jest.Mocked<Repository<ConversationEntryEntity>>;
  let ai: jest.Mocked<AiService>;
  let config: jest.Mocked<ConfigService>;
  let profiles: jest.Mocked<ProfilesService>;

  beforeEach(() => {
    chatsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(asChatEntity),
    } as unknown as jest.Mocked<Repository<ConversationChatEntity>>;

    entriesRepo = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(asEntryEntity),
    } as unknown as jest.Mocked<Repository<ConversationEntryEntity>>;

    ai = {
      extractTextFromImages: jest.fn(),
      generateConversationOutput: jest.fn(),
      generateAnalyzeOptionsOutput: jest.fn(),
    } as unknown as jest.Mocked<AiService>;

    config = {
      get: jest.fn((key: string) => {
        const map: Record<string, number> = {
          'conversation.contextLimit': 5,
          'conversation.maxImages': 3,
          'conversation.maxImageMb': 5,
          'conversation.maxTextChars': 100,
        };
        return map[key] as never;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    profiles = {
      getByUserId: jest.fn(),
    } as unknown as jest.Mocked<ProfilesService>;

    service = new ConversationService(
      chatsRepo,
      entriesRepo,
      ai,
      config,
      profiles,
    );
  });

  it('rejects submit when no text and no image are provided', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    await expect(
      service.submitToChat({
        userId: 'user-1',
        chatId: 'chat-1',
        mode: 'suggest_reply',
        text: '   ',
        images: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submit when text exceeds configured max length', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    config.get.mockImplementation((key: string) => {
      if (key === 'conversation.maxTextChars') return 10 as never;
      if (key === 'conversation.contextLimit') return 5 as never;
      if (key === 'conversation.maxImages') return 3 as never;
      if (key === 'conversation.maxImageMb') return 5 as never;
      return undefined as never;
    });

    await expect(
      service.submitToChat({
        userId: 'user-1',
        chatId: 'chat-1',
        mode: 'suggest_reply',
        text: 'this message is definitely too long',
        images: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submit when image count exceeds configured max', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    const images = new Array(4).fill(null).map((_, idx) => ({
      originalname: `file-${idx}.png`,
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('x'),
    })) as UploadedConversationImage[];

    await expect(
      service.submitToChat({
        userId: 'user-1',
        chatId: 'chat-1',
        mode: 'suggest_reply',
        text: null,
        images,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 422 when OCR fails and does not create DB entries', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    ai.extractTextFromImages.mockRejectedValue(new Error('OCR failed'));

    const images = [
      {
        originalname: 'chat.png',
        mimetype: 'image/png',
        size: 150,
        buffer: Buffer.from('abc'),
      },
    ] as UploadedConversationImage[];

    await expect(
      service.submitToChat({
        userId: 'user-1',
        chatId: 'chat-1',
        mode: 'suggest_reply',
        text: null,
        images,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(entriesRepo.save).not.toHaveBeenCalled();
  });

  it('uses configured context limit when loading AI context', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    ai.generateConversationOutput.mockResolvedValue({
      mode: 'suggest_reply',
      bestOption: 'Hey, how was your day?',
      options: [
        { label: 'safe', text: 'Hey, how was your day?' },
        { label: 'balanced', text: 'Hey, hope your day is going great.' },
        { label: 'bold', text: 'Hey, want to grab coffee this week?' },
      ],
    } as GenerateConversationOutputResult);

    entriesRepo.find.mockResolvedValue(
      new Array(8).fill(null).map((_, idx) =>
        makeEntry({
          id: `ctx-${idx}`,
          createdAt: new Date(`2026-03-23T10:0${idx}:00.000Z`),
        }),
      ),
    );

    entriesRepo.save
      .mockResolvedValueOnce(makeEntry({ id: 'user-entry' }))
      .mockResolvedValueOnce(
        makeEntry({
          id: 'assistant-entry',
          role: 'assistant_output',
          sourceText: null,
          ocrText: null,
          contentText: 'Hey, how was your day?',
        }),
      );

    chatsRepo.save.mockResolvedValue(makeChat());

    await service.submitToChat({
      userId: 'user-1',
      chatId: 'chat-1',
      mode: 'suggest_reply',
      text: 'Need help replying',
      images: [],
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(entriesRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it('stores failed assistant entry when AI returns invalid mode output', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());

    ai.generateConversationOutput.mockResolvedValue({
      mode: 'ask_advice',
      advice: 'Take it slow and be clear.',
      nextSteps: ['Be direct', 'Stay respectful'],
    } as GenerateConversationOutputResult);

    entriesRepo.find.mockResolvedValue([makeEntry({ id: 'ctx-1' })]);

    entriesRepo.save
      .mockResolvedValueOnce(makeEntry({ id: 'user-entry' }))
      .mockResolvedValueOnce(
        makeEntry({
          id: 'assistant-failed',
          role: 'assistant_output',
          sourceText: null,
          ocrText: null,
          contentText: '',
          status: 'failed',
          errorMessage: 'AI output mode does not match requested mode',
        }),
      );

    chatsRepo.save.mockResolvedValue(makeChat());

    const result = await service.submitToChat({
      userId: 'user-1',
      chatId: 'chat-1',
      mode: 'suggest_reply',
      text: 'Need a reply option',
      images: [],
    });

    expect(result.output).toBeNull();
    expect(result.assistantEntry.status).toBe('failed');
    expect(result.errorMessage).toContain('mode');
  });

  it('creates and persists analysis entry with semantic payload', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());
    profiles.getByUserId.mockResolvedValue({
      userId: 'user-1',
      locale: 'en-US',
      timezone: 'America/Mazatlan',
    } as never);

    entriesRepo.find.mockResolvedValue([
      makeEntry({
        id: 'ctx-1',
        role: 'user_submission',
        contentText: 'She replied with playful energy.',
      }),
    ]);

    ai.generateAnalyzeOptionsOutput.mockResolvedValue(makeAnalyzeOutput());

    entriesRepo.save.mockResolvedValue(
      makeEntry({
        id: 'analysis-entry-1',
        role: 'assistant_output',
        mode: 'analyze_options',
        contentText: 'Push-pull dynamic with rising curiosity',
      }),
    );
    chatsRepo.save.mockResolvedValue(makeChat());

    const result = await service.analyzeOptionsForChat({
      userId: 'user-1',
      chatId: 'chat-1',
    });

    expect(result.analysisEntry.mode).toBe('analyze_options');
    expect(result.analysis.flowScore).toBeGreaterThanOrEqual(0);
    expect(result.analysis.flowScore).toBeLessThanOrEqual(100);
    expect(result.analysis.suggestedReplies).toHaveLength(3);
  });

  it('rejects analysis when user submission context is missing', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());
    profiles.getByUserId.mockResolvedValue({
      userId: 'user-1',
      locale: 'en-US',
      timezone: 'America/Mazatlan',
    } as never);

    entriesRepo.find.mockResolvedValue([
      makeEntry({
        role: 'assistant_output',
        mode: 'suggest_reply',
        contentText: 'AI prior output only',
      }),
    ]);

    await expect(
      service.analyzeOptionsForChat({
        userId: 'user-1',
        chatId: 'chat-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores failed analysis entry when output labels are invalid', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());
    profiles.getByUserId.mockResolvedValue({
      userId: 'user-1',
      locale: 'en-US',
      timezone: 'America/Mazatlan',
    } as never);

    entriesRepo.find.mockResolvedValue([
      makeEntry({
        role: 'user_submission',
        contentText: 'Need analysis',
      }),
    ]);

    ai.generateAnalyzeOptionsOutput.mockResolvedValue(
      makeAnalyzeOutput({
        suggestedReplies: [
          { label: 'safe', text: 'A', recommended: true },
          { label: 'safe', text: 'B', recommended: false },
          { label: 'bold', text: 'C', recommended: false },
        ],
      }),
    );

    entriesRepo.save.mockResolvedValue(
      makeEntry({
        id: 'analysis-failed',
        role: 'assistant_output',
        mode: 'analyze_options',
        status: 'failed',
        contentText: '',
      }),
    );
    chatsRepo.save.mockResolvedValue(makeChat());

    await expect(
      service.analyzeOptionsForChat({
        userId: 'user-1',
        chatId: 'chat-1',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('falls back to default locale/timezone when profile is missing', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());
    profiles.getByUserId.mockResolvedValue(null);

    entriesRepo.find.mockResolvedValue([
      makeEntry({
        role: 'user_submission',
        contentText: 'Need analysis',
      }),
    ]);

    ai.generateAnalyzeOptionsOutput.mockResolvedValue(makeAnalyzeOutput());
    entriesRepo.save.mockResolvedValue(
      makeEntry({
        id: 'analysis-entry-fallback',
        role: 'assistant_output',
        mode: 'analyze_options',
      }),
    );
    chatsRepo.save.mockResolvedValue(makeChat());

    await service.analyzeOptionsForChat({
      userId: 'user-1',
      chatId: 'chat-1',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(ai.generateAnalyzeOptionsOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
        timezone: 'UTC',
      }),
    );
  });

  it('creates a new analysis entry on each analyze call', async () => {
    chatsRepo.findOne.mockResolvedValue(makeChat());
    profiles.getByUserId.mockResolvedValue({
      userId: 'user-1',
      locale: 'en-US',
      timezone: 'America/Mazatlan',
    } as never);

    entriesRepo.find.mockResolvedValue([
      makeEntry({
        role: 'user_submission',
        contentText: 'Need analysis',
      }),
    ]);

    ai.generateAnalyzeOptionsOutput.mockResolvedValue(makeAnalyzeOutput());

    entriesRepo.save
      .mockResolvedValueOnce(
        makeEntry({
          id: 'analysis-entry-1',
          role: 'assistant_output',
          mode: 'analyze_options',
        }),
      )
      .mockResolvedValueOnce(
        makeEntry({
          id: 'analysis-entry-2',
          role: 'assistant_output',
          mode: 'analyze_options',
        }),
      );

    chatsRepo.save.mockResolvedValue(makeChat());

    await service.analyzeOptionsForChat({
      userId: 'user-1',
      chatId: 'chat-1',
    });
    await service.analyzeOptionsForChat({
      userId: 'user-1',
      chatId: 'chat-1',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(entriesRepo.save).toHaveBeenCalledTimes(2);
  });

  it('rejects analysis when chat does not belong to user', async () => {
    chatsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.analyzeOptionsForChat({
        userId: 'user-1',
        chatId: 'chat-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
