import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from './entities/user-profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profilesRepo: Repository<UserProfileEntity>,
  ) {}

  async getByUserId(userId: string) {
    return this.profilesRepo.findOne({ where: { userId } });
  }

  /**
   * Creates the profile if it doesn't exist yet (useful on register).
   */
  async ensureForUser(params: {
    userId: string;
    displayName?: string | null;
    locale?: string;
    timezone?: string;
  }) {
    const existing = await this.getByUserId(params.userId);
    if (existing) return existing;

    const profile = this.profilesRepo.create({
      userId: params.userId,
      displayName: params.displayName ?? null,
      locale: params.locale ?? 'en',
      timezone: params.timezone ?? 'UTC',
      profileJson: {},
      version: 1,
    });

    return this.profilesRepo.save(profile);
  }

  async updateBasics(
    userId: string,
    patch: { displayName?: string | null; locale?: string; timezone?: string },
  ) {
    const existing = await this.ensureForUser({ userId });

    if (patch.displayName !== undefined)
      existing.displayName = patch.displayName;
    if (patch.locale !== undefined) existing.locale = patch.locale;
    if (patch.timezone !== undefined) existing.timezone = patch.timezone;

    return this.profilesRepo.save(existing);
  }

  /**
   * Replace profileJson and bump version (used after AI recompute).
   */
  async setProfileJson(userId: string, profileJson: Record<string, unknown>) {
    const existing = await this.ensureForUser({ userId });
    existing.profileJson = profileJson;
    existing.version = existing.version + 1;
    return this.profilesRepo.save(existing);
  }

  /**
   * Merge into existing profileJson (useful for incremental improvements).
   */
  async mergeProfileJson(userId: string, patch: Record<string, unknown>) {
    const existing = await this.ensureForUser({ userId });
    existing.profileJson = { ...(existing.profileJson ?? {}), ...patch };
    existing.version = existing.version + 1;
    return this.profilesRepo.save(existing);
  }
}
