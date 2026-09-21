import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { LegacyStudyAuthService } from './legacy-study-auth.service';

type AuthenticatedRequest = Request & { user?: unknown };

function bearerToken(request: Request): string {
  const header = request.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new UnauthorizedException('请先使用 wxhappylife.top 账号登录');
  return match[1];
}

@Injectable()
export class StudyAuthGuard implements CanActivate {
  constructor(protected readonly auth: LegacyStudyAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.auth.authenticate(bearerToken(request));
    return true;
  }
}

@Injectable()
export class StudyAdminGuard extends StudyAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as { role?: string };
    if (user.role !== 'admin') throw new ForbiddenException('需要 wxhappylife.top 管理员账号');
    return true;
  }
}
