import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PreferenceSessionEntity,
  PreferenceSessionStatus,
} from './entities/preference-session.entity';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(PreferenceSessionEntity)
    private readonly sessionsRepo: Repository<PreferenceSessionEntity>,
  ) {}

  async createSession(params: { userId: string; contextText?: string | null }) {
    const session = this.sessionsRepo.create({
      userId: params.userId,
      status: 'in_progress',
      contextText: params.contextText ?? null,
      answersJson: {},
      derivedProfileJson: null,
      startedAt: new Date(),
      completedAt: null,
    });

    return this.sessionsRepo.save(session);
  }

  async getByIdForUser(sessionId: string, userId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Preference session not found');
    if (session.userId !== userId) throw new ForbiddenException();

    return session;
  }

  async getLatestForUser(userId: string, status?: PreferenceSessionStatus) {
    return this.sessionsRepo.findOne({
      where: status ? { userId, status } : { userId },
      order: { startedAt: 'DESC' },
    });
  }

  /**
   * Merges partial answers into answers_json.
   * Example answers:
   * { intention: "serious_relationship", vibe: "relax_joker", flirt_level: "classy" }
   */
  async mergeAnswers(params: {
    sessionId: string;
    userId: string;
    answersPatch: Record<string, unknown>;
  }) {
    const session = await this.getByIdForUser(params.sessionId, params.userId);

    if (session.status === 'completed') {
      throw new ForbiddenException('Session already completed');
    }

    session.answersJson = {
      ...(session.answersJson ?? {}),
      ...params.answersPatch,
    };
    return this.sessionsRepo.save(session);
  }

  async setContextText(params: {
    sessionId: string;
    userId: string;
    contextText: string | null;
  }) {
    const session = await this.getByIdForUser(params.sessionId, params.userId);

    if (session.status === 'completed') {
      throw new ForbiddenException('Session already completed');
    }

    session.contextText = params.contextText;
    return this.sessionsRepo.save(session);
  }

  async completeSession(params: { sessionId: string; userId: string }) {
    const session = await this.getByIdForUser(params.sessionId, params.userId);

    if (session.status === 'completed') return session;

    session.status = 'completed';
    session.completedAt = new Date();

    // derivedProfileJson stays null until AI job computes it
    return this.sessionsRepo.save(session);
  }

  /**
   * Called by your AI pipeline later: store derived profile summary for this session.
   */
  async setDerivedProfileJson(params: {
    sessionId: string;
    userId: string;
    derivedProfileJson: Record<string, unknown>;
  }) {
    const session = await this.getByIdForUser(params.sessionId, params.userId);

    session.derivedProfileJson = params.derivedProfileJson;
    return this.sessionsRepo.save(session);
  }
}
