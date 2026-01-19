import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoachingRequestEntity } from './entities/coaching-request.entity';
import { CoachingResponseEntity } from './entities/coaching-response.entity';
import { AiService } from '../ai/ai.service';

type CreateCoachingInput = {
  userId: string;
  scenarioText: string;
  lastMessageText?: string | null;
  goal: CoachingRequestEntity['goal'];
  vibe: CoachingRequestEntity['vibe'];
  flirtLevel: CoachingRequestEntity['flirtLevel'];
  constraints?: Record<string, unknown>;
  profileVersion: number;
};

@Injectable()
export class CoachingService {
  constructor(
    @InjectRepository(CoachingRequestEntity)
    private readonly requestsRepo: Repository<CoachingRequestEntity>,
    @InjectRepository(CoachingResponseEntity)
    private readonly responsesRepo: Repository<CoachingResponseEntity>,
    private readonly ai: AiService,
  ) {}

  async createAndGenerate(input: CreateCoachingInput) {
    // 1) persist request
    const request = await this.requestsRepo.save(
      this.requestsRepo.create({
        userId: input.userId,
        scenarioText: input.scenarioText,
        lastMessageText: input.lastMessageText ?? null,
        goal: input.goal,
        vibe: input.vibe,
        flirtLevel: input.flirtLevel,
        constraintsJson: input.constraints ?? {},
        profileVersion: input.profileVersion,
      }),
    );

    // 2) call AI and persist response
    try {
      const aiResult = await this.ai.generateCoaching({
        scenarioText: input.scenarioText,
        lastMessageText: input.lastMessageText ?? null,
        goal: input.goal,
        vibe: input.vibe,
        flirtLevel: input.flirtLevel,
        constraints: input.constraints ?? {},
      });

      const response = await this.responsesRepo.save(
        this.responsesRepo.create({
          userId: input.userId,
          requestId: request.id,
          status: 'success',
          messageText: aiResult.messageText,
          candidatesJson: aiResult.candidates ?? [],
          metaJson: aiResult.meta ?? {},
          model: aiResult.model ?? null,
          usageJson: aiResult.usage ?? null,
          providerResponseId: aiResult.providerResponseId ?? null,
          errorMessage: null,
        }),
      );

      return { request, response };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown AI error';

      const response = await this.responsesRepo.save(
        this.responsesRepo.create({
          userId: input.userId,
          requestId: request.id,
          status: 'failed',
          messageText: null,
          candidatesJson: [],
          metaJson: {},
          model: null,
          usageJson: null,
          providerResponseId: null,
          errorMessage: message,
        }),
      );

      return { request, response };
    }
  }

  async listResponsesForUser(userId: string, limit = 20) {
    return this.responsesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  async getResponseByIdForUser(userId: string, responseId: string) {
    return this.responsesRepo.findOne({
      where: { id: responseId, userId },
    });
  }
}
