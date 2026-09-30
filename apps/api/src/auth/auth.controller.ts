import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyStudyAuthService } from './legacy-study-auth.service';
import { StudyAuthGuard } from './study-auth.guard';

class LoginRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: LegacyStudyAuthService, private readonly prisma: PrismaService) {}

  @Post('login')
  login(@Body() input: LoginRequest) {
    return this.auth.login(input.username.trim(), input.password);
  }

  @Get('me')
  @UseGuards(StudyAuthGuard)
  async me(@Req() request: Request & { user?: { username?: string } }) {
    const user = request.user as Record<string, unknown>;
    const username = typeof user?.username === 'string' ? user.username : '';
    if (!username) return user;
    const profile = await this.prisma.userProfile.findUnique({ where: { ownerId: username } });
    if (!profile) return user;
    return {
      ...user,
      displayName: profile.displayName,
      signature: profile.signature,
      avatarUrl: profile.avatarExt
        ? `/api/profiles/${encodeURIComponent(username)}/avatar?v=${profile.avatarVersion}`
        : null,
    };
  }
}
