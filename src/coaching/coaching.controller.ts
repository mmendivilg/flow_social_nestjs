import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenUser } from '../auth/types/auth-request.types';
import { CoachingService } from './coaching.service';
import type {
  CoachingGoal,
  CoachingVibe,
  FlirtLevel,
} from './entities/coaching-request.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { CoachingFeedbackService } from './coaching-feedback.service';
import type { FeedbackRating } from './entities/feedback.entity';

@UseGuards(JwtGuard)
@Controller('coaching')
export class CoachingController {
  constructor(
    private readonly coaching: CoachingService,
    private readonly profiles: ProfilesService,
    private readonly feedback: CoachingFeedbackService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AccessTokenUser,
    @Body()
    body: {
      scenarioText: string;
      lastMessageText?: string | null;
      goal: CoachingGoal;
      vibe: CoachingVibe;
      flirtLevel: FlirtLevel;
      constraints?: Record<string, unknown>;
    },
  ) {
    // Pull latest profile version for traceability
    const profile = await this.profiles.ensureForUser({
      userId: user.userId,
      timezone: 'America/Mexico_City',
    });

    const { request, response } = await this.coaching.createAndGenerate({
      userId: user.userId,
      scenarioText: body.scenarioText,
      lastMessageText: body.lastMessageText ?? null,
      goal: body.goal,
      vibe: body.vibe,
      flirtLevel: body.flirtLevel,
      constraints: body.constraints ?? {},
      profileVersion: profile.version,
    });

    return {
      requestId: request.id,
      responseId: response.id,
      status: response.status,
      messageText: response.messageText,
      candidates: response.candidatesJson,
      meta: response.metaJson,
      errorMessage: response.errorMessage,
      createdAt: response.createdAt,
    };
  }

  @Get('responses')
  async list(
    @CurrentUser() user: AccessTokenUser,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : 20;
    const responses = await this.coaching.listResponsesForUser(
      user.userId,
      Number.isFinite(parsed) ? parsed : 20,
    );

    return responses.map((r) => ({
      id: r.id,
      requestId: r.requestId,
      status: r.status,
      messageText: r.messageText,
      createdAt: r.createdAt,
    }));
  }

  @Get('responses/:id')
  async getOne(@CurrentUser() user: AccessTokenUser, @Param('id') id: string) {
    const response = await this.coaching.getResponseByIdForUser(
      user.userId,
      id,
    );
    return response ?? null;
  }

  @Post('responses/:id/feedback')
  async leaveFeedback(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') responseId: string,
    @Body()
    body: {
      rating: FeedbackRating;
      commentText?: string | null;
      signals?: Record<string, unknown>;
      userRewriteText?: string | null;
    },
  ) {
    const fb = await this.feedback.createForResponse({
      userId: user.userId,
      responseId,
      rating: body.rating,
      commentText: body.commentText ?? null,
      signals: body.signals ?? {},
      userRewriteText: body.userRewriteText ?? null,
    });

    return {
      id: fb.id,
      responseId: fb.responseId,
      rating: fb.rating,
      createdAt: fb.createdAt,
    };
  }

  @Get('feedback')
  async listFeedback(
    @CurrentUser() user: AccessTokenUser,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : 20;
    const rows = await this.feedback.listForUser(
      user.userId,
      Number.isFinite(parsed) ? parsed : 20,
    );

    return rows.map((f) => ({
      id: f.id,
      requestId: f.requestId,
      responseId: f.responseId,
      rating: f.rating,
      createdAt: f.createdAt,
    }));
  }
}
