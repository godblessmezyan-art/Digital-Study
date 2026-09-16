import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AiTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.AI_WORKSHOP_TOKEN;
    if (!expected) return true;
    const supplied = context.switchToHttp().getRequest<Request>().header('x-ai-workshop-token') ?? '';
    const left = Buffer.from(expected);
    const right = Buffer.from(supplied);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid AI workshop token');
    }
    return true;
  }
}
