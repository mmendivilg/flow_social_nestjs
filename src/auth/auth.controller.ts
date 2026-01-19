import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RefreshGuard } from '../common/guards/refresh.guard';
import { JwtGuard } from '../common/guards/jwt.guard';
import type {
  AccessTokenUser,
  RefreshTokenUser,
} from './types/auth-request.types';

type RequestWithUser<TUser> = Request & { user: TUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string }) {
    return this.auth.register(body.email, body.password);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(RefreshGuard)
  @Post('refresh')
  refresh(@Req() req: RequestWithUser<RefreshTokenUser>) {
    return this.auth.refresh(req.user.userId, req.user.refreshToken);
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  logout(@Req() req: RequestWithUser<AccessTokenUser>) {
    return this.auth.logout(req.user.userId);
  }
}
