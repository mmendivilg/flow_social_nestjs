import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CoachingFeedbackEntity,
  FeedbackRating,
} from './entities/feedback.entity';
import { CoachingResponseEntity } from './entities/coaching-response.entity';

@Injectable()
export class CoachingFeedbackService {
  constructor(
    @InjectRepository(CoachingFeedbackEntity)
    private readonly feedbackRepo: Repository<CoachingFeedbackEntity>,
    @InjectRepository(CoachingResponseEntity)
    private readonly responsesRepo: Repository<CoachingResponseEntity>,
  ) {}

  async createForResponse(params: {
    userId: string;
    responseId: string;
    rating: FeedbackRating;
    commentText?: string | null;
    signals?: Record<string, unknown>;
    userRewriteText?: string | null;
  }) {
    const response = await this.responsesRepo.findOne({
      where: { id: params.responseId },
    });

    if (!response) throw new NotFoundException('Response not found');
    if (response.userId !== params.userId) throw new ForbiddenException();

    const feedback = this.feedbackRepo.create({
      userId: params.userId,
      requestId: response.requestId,
      responseId: response.id,
      rating: params.rating,
      commentText: params.commentText ?? null,
      signalsJson: params.signals ?? {},
      userRewriteText: params.userRewriteText ?? null,
    });

    return this.feedbackRepo.save(feedback);
  }

  async listForUser(userId: string, limit = 20) {
    return this.feedbackRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }
}
