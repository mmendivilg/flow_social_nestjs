import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenUser } from '../auth/types/auth-request.types';
import { ProfilesService } from './profiles.service';

@UseGuards(JwtGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  async me(@CurrentUser() user: AccessTokenUser) {
    const profile = await this.profiles.ensureForUser({
      userId: user.userId,
      locale: 'en',
      timezone: 'America/Mexico_City',
    });

    return {
      userId: profile.userId,
      displayName: profile.displayName,
      locale: profile.locale,
      timezone: profile.timezone,
      profileJson: profile.profileJson,
      version: profile.version,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AccessTokenUser,
    @Body()
    body: {
      displayName?: string | null;
      locale?: string;
      timezone?: string;
    },
  ) {
    const profile = await this.profiles.updateBasics(user.userId, body);

    return {
      userId: profile.userId,
      displayName: profile.displayName,
      locale: profile.locale,
      timezone: profile.timezone,
      version: profile.version,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Replace the entire profileJson (and bump version).
   * Use this when your AI recompute produces a complete profile object.
   */
  @Put('me/profile-json')
  async replaceProfileJson(
    @CurrentUser() user: AccessTokenUser,
    @Body() body: { profileJson: Record<string, unknown> },
  ) {
    const profile = await this.profiles.setProfileJson(
      user.userId,
      body.profileJson,
    );

    return {
      userId: profile.userId,
      profileJson: profile.profileJson,
      version: profile.version,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Merge a partial patch into profileJson (and bump version).
   * Use this for incremental learning / feedback updates.
   */
  @Patch('me/profile-json')
  async mergeProfileJson(
    @CurrentUser() user: AccessTokenUser,
    @Body() body: { patch: Record<string, unknown> },
  ) {
    const profile = await this.profiles.mergeProfileJson(
      user.userId,
      body.patch,
    );

    return {
      userId: profile.userId,
      profileJson: profile.profileJson,
      version: profile.version,
      updatedAt: profile.updatedAt,
    };
  }
}
