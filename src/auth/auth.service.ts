import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async signTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
        '15m') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
        '30d') as JwtSignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  private async hashToken(token: string) {
    return bcrypt.hash(token, 10);
  }

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.create({ email, passwordHash });

    const tokens = await this.signTokens(user.id, user.email);
    const refreshTokenHash = await this.hashToken(tokens.refreshToken);
    await this.users.updateRefreshTokenHash(user.id, refreshTokenHash);

    return tokens;
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(user.id, user.email);
    const refreshTokenHash = await this.hashToken(tokens.refreshToken);
    await this.users.updateRefreshTokenHash(user.id, refreshTokenHash);

    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.users.findById(userId);
    if (!user?.refreshTokenHash)
      throw new UnauthorizedException('Refresh not allowed');

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.signTokens(user.id, user.email);
    const refreshTokenHash = await this.hashToken(tokens.refreshToken);
    await this.users.updateRefreshTokenHash(user.id, refreshTokenHash);

    return tokens;
  }

  async logout(userId: string) {
    await this.users.updateRefreshTokenHash(userId, null);
    return { ok: true };
  }
}
