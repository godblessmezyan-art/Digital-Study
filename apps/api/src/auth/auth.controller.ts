import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
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
  constructor(private readonly auth: LegacyStudyAuthService) {}

  @Post('login')
  login(@Body() input: LoginRequest) {
    return this.auth.login(input.username.trim(), input.password);
  }

  @Get('me')
  @UseGuards(StudyAuthGuard)
  me(@Req() request: Request & { user?: unknown }) {
    return request.user;
  }
}
