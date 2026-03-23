import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AiService, ConfidenceEvaluationError } from '../ai/ai.service';
import {
  ConfidenceTestEntity,
  ConfidenceTestStatus,
} from './entities/confidence-test.entity';
import {
  CONFIDENCE_TEST_PROFILES,
  ConfidenceTestProfile,
} from './confidence-test.profiles';

type ConfidenceStateResponse = {
  testId: string;
  status: ConfidenceTestStatus;
  shouldShowOnLogin: boolean;
  profile: ConfidenceTestProfile;
  attemptCount: number;
  latestScore: number | null;
  latestFeedback: string | null;
  strengths: string[];
  improvements: string[];
  completedAt: Date | null;
  skippedAt: Date | null;
  updatedAt: Date;
};

type ScoreConfidenceResponse = ConfidenceStateResponse & {
  score: number;
  feedback: string;
};

@Injectable()
export class ConfidenceTestService {
  private readonly logger = new Logger(ConfidenceTestService.name);

  constructor(
    @InjectRepository(ConfidenceTestEntity)
    private readonly testsRepo: Repository<ConfidenceTestEntity>,
    private readonly ai: AiService,
  ) {}

  async getState(userId: string): Promise<ConfidenceStateResponse> {
    if (this.isDevRandomizeOnStateEnabled()) {
      return this.recreateStateWithRandomProfile(userId);
    }

    const test = await this.getOrCreateTest(userId);
    return this.toStateResponse(test);
  }

  async score(params: {
    userId: string;
    messageText: string;
  }): Promise<ScoreConfidenceResponse> {
    const messageText = params.messageText.trim();
    if (messageText.length < 4) {
      throw new BadRequestException(
        'Please write a longer message before scoring',
      );
    }
    if (messageText.length > 1000) {
      throw new BadRequestException(
        'Message is too long (max 1000 characters)',
      );
    }

    const test = await this.getOrCreateTest(params.userId);
    const profile = this.getProfileById(test.assignedProfileId);

    let evaluation: Awaited<ReturnType<AiService['evaluateConfidenceMessage']>>;
    try {
      evaluation = await this.ai.evaluateConfidenceMessage({
        messageText,
        instagramHandle: profile.instagramHandle,
      });
    } catch (error) {
      const errorId = randomUUID();
      const metadata = this.buildScoringErrorMetadata({
        errorId,
        error,
        userId: params.userId,
        profileId: profile.id,
        messageLength: messageText.length,
      });

      this.logger.error(
        `Confidence scoring failed ${JSON.stringify(metadata)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'Confidence scoring is temporarily unavailable',
      );
    }

    test.status = 'completed';
    test.attemptCount = test.attemptCount + 1;
    test.latestScore = evaluation.score;
    test.latestFeedback = evaluation.feedback;
    test.latestResultJson = {
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      model: evaluation.model ?? null,
      usage: evaluation.usage ?? null,
      providerResponseId: evaluation.providerResponseId ?? null,
    };
    test.completedAt = new Date();
    test.skippedAt = null;

    const saved = await this.testsRepo.save(test);
    const state = this.toStateResponse(saved);

    return {
      ...state,
      score: evaluation.score,
      feedback: evaluation.feedback,
    };
  }

  async skip(userId: string): Promise<ConfidenceStateResponse> {
    const test = await this.getOrCreateTest(userId);

    if (test.status !== 'completed') {
      test.status = 'skipped';
      test.skippedAt = new Date();
      const saved = await this.testsRepo.save(test);
      return this.toStateResponse(saved);
    }

    return this.toStateResponse(test);
  }

  private async getOrCreateTest(userId: string): Promise<ConfidenceTestEntity> {
    const existing = await this.testsRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const profileId = this.pickProfileIdForUser(userId);
    const created = this.testsRepo.create({
      userId,
      status: 'pending',
      assignedProfileId: profileId,
      attemptCount: 0,
      latestScore: null,
      latestFeedback: null,
      latestResultJson: null,
      completedAt: null,
      skippedAt: null,
    });

    try {
      return await this.testsRepo.save(created);
    } catch {
      const retry = await this.testsRepo.findOne({ where: { userId } });
      if (retry) return retry;
      throw new ServiceUnavailableException(
        'Could not initialize confidence test',
      );
    }
  }

  private async recreateStateWithRandomProfile(
    userId: string,
  ): Promise<ConfidenceStateResponse> {
    await this.testsRepo.delete({ userId });

    const created = this.testsRepo.create({
      userId,
      status: 'pending',
      assignedProfileId: this.pickRandomProfileId(),
      attemptCount: 0,
      latestScore: null,
      latestFeedback: null,
      latestResultJson: null,
      completedAt: null,
      skippedAt: null,
    });

    const saved = await this.testsRepo.save(created);
    return this.toStateResponse(saved);
  }

  private isDevRandomizeOnStateEnabled(): boolean {
    const raw =
      process.env.CONFIDENCE_TEST_DEV_RANDOMIZE_ON_STATE ??
      process.env.EXPO_PUBLIC_DEV_RANDOMIZE_CONFIDENCE_TEST;

    if (!raw) return false;
    return raw.trim().toLowerCase() === 'true';
  }

  private pickRandomProfileId(): string {
    if (CONFIDENCE_TEST_PROFILES.length === 0) {
      throw new ServiceUnavailableException(
        'No confidence-test profiles configured',
      );
    }

    const index = Math.floor(Math.random() * CONFIDENCE_TEST_PROFILES.length);
    return CONFIDENCE_TEST_PROFILES[index].id;
  }

  private pickProfileIdForUser(userId: string): string {
    if (CONFIDENCE_TEST_PROFILES.length === 0) {
      throw new ServiceUnavailableException(
        'No confidence-test profiles configured',
      );
    }

    const normalized = userId.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }

    const index = hash % CONFIDENCE_TEST_PROFILES.length;
    return CONFIDENCE_TEST_PROFILES[index].id;
  }

  private getProfileById(profileId: string): ConfidenceTestProfile {
    if (CONFIDENCE_TEST_PROFILES.length === 0) {
      throw new ServiceUnavailableException(
        'No confidence-test profiles configured',
      );
    }

    const profile = CONFIDENCE_TEST_PROFILES.find(
      (item) => item.id === profileId,
    );
    return profile ?? CONFIDENCE_TEST_PROFILES[0];
  }

  private toStateResponse(test: ConfidenceTestEntity): ConfidenceStateResponse {
    const latestResult: Record<string, unknown> =
      test.latestResultJson && typeof test.latestResultJson === 'object'
        ? test.latestResultJson
        : {};

    const strengths = this.getStringArray(latestResult['strengths']);
    const improvements = this.getStringArray(latestResult['improvements']);

    return {
      testId: test.id,
      status: test.status,
      shouldShowOnLogin: test.status === 'pending',
      profile: this.getProfileById(test.assignedProfileId),
      attemptCount: test.attemptCount,
      latestScore: test.latestScore,
      latestFeedback: test.latestFeedback,
      strengths,
      improvements,
      completedAt: test.completedAt,
      skippedAt: test.skippedAt,
      updatedAt: test.updatedAt,
    };
  }

  private getStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private buildScoringErrorMetadata(params: {
    errorId: string;
    error: unknown;
    userId: string;
    profileId: string;
    messageLength: number;
  }): Record<string, unknown> {
    const { error, errorId, userId, profileId, messageLength } = params;
    const errorRecord = this.asRecord(error);
    const providerError = this.asRecord(errorRecord?.['error']);

    const details =
      error instanceof ConfidenceEvaluationError
        ? error.details
        : this.asRecord(errorRecord?.['details']);

    return {
      errorId,
      userId,
      profileId,
      messageLength,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      openaiStatus: this.toNumber(errorRecord?.['status']),
      openaiCode:
        this.toString(errorRecord?.['code']) ??
        this.toString(providerError?.['code']),
      openaiType:
        this.toString(errorRecord?.['type']) ??
        this.toString(providerError?.['type']),
      openaiRequestId: this.toString(errorRecord?.['requestID']),
      openaiParam:
        this.toString(errorRecord?.['param']) ??
        this.toString(providerError?.['param']),
      details,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
  }

  private toString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private toNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }
}
