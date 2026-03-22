import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenUser } from '../auth/types/auth-request.types';
import { ConfidenceTestService } from './confidence-test.service';

@UseGuards(JwtGuard)
@Controller('confidence-test')
export class ConfidenceTestController {
  constructor(private readonly confidenceTest: ConfidenceTestService) {}

  @Get('state')
  state(@CurrentUser() user: AccessTokenUser) {
    return this.confidenceTest.getState(user.userId);
  }

  @Post('score')
  score(
    @CurrentUser() user: AccessTokenUser,
    @Body() body: { messageText: string },
  ) {
    return this.confidenceTest.score({
      userId: user.userId,
      messageText: body.messageText ?? '',
    });
  }

  @Post('skip')
  skip(@CurrentUser() user: AccessTokenUser) {
    return this.confidenceTest.skip(user.userId);
  }
}
