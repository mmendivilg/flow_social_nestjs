import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenUser } from '../auth/types/auth-request.types';
import { PreferencesService } from './preferences.service';
import type { PreferenceSessionStatus } from './entities/preference-session.entity';

@UseGuards(JwtGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Post('sessions')
  async createSession(
    @CurrentUser() user: AccessTokenUser,
    @Body() body: { contextText?: string | null },
  ) {
    const session = await this.preferences.createSession({
      userId: user.userId,
      contextText: body.contextText ?? null,
    });

    return session;
  }

  @Get('sessions/latest')
  async latest(
    @CurrentUser() user: AccessTokenUser,
    @Query('status') status?: PreferenceSessionStatus,
  ) {
    const session = await this.preferences.getLatestForUser(
      user.userId,
      status,
    );
    return session ?? null;
  }

  @Get('sessions/:id')
  async getById(@CurrentUser() user: AccessTokenUser, @Param('id') id: string) {
    return this.preferences.getByIdForUser(id, user.userId);
  }

  @Patch('sessions/:id/context')
  async setContextText(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') id: string,
    @Body() body: { contextText: string | null },
  ) {
    return this.preferences.setContextText({
      sessionId: id,
      userId: user.userId,
      contextText: body.contextText,
    });
  }

  @Patch('sessions/:id/answers')
  async mergeAnswers(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') id: string,
    @Body() body: { answersPatch: Record<string, unknown> },
  ) {
    return this.preferences.mergeAnswers({
      sessionId: id,
      userId: user.userId,
      answersPatch: body.answersPatch,
    });
  }

  @Post('sessions/:id/complete')
  async complete(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') id: string,
  ) {
    return this.preferences.completeSession({
      sessionId: id,
      userId: user.userId,
    });
  }
}
