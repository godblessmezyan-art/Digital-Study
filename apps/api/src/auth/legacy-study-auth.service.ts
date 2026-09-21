import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { StudyLoginResult, StudyUser } from './auth.types';

@Injectable()
export class LegacyStudyAuthService {
  private readonly baseUrl = (
    process.env.STUDY_AUTH_BASE_URL
    || 'https://wxhappylife.top/study/api/auth'
  ).replace(/\/$/, '');

  async login(username: string, password: string): Promise<StudyLoginResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException('主站登录服务暂时不可用');
    }

    const payload = await response.json().catch(() => null) as Partial<StudyLoginResult> & { detail?: string } | null;
    if (!response.ok || !payload?.token || !payload.username) {
      if (response.status === 401) throw new UnauthorizedException('用户名或密码错误');
      throw new BadGatewayException(payload?.detail || '主站登录服务返回异常');
    }

    return {
      token: payload.token,
      username: payload.username,
      display_name: payload.display_name || payload.username,
      role: payload.role === 'admin' ? 'admin' : 'reader',
    };
  }

  async authenticate(token: string): Promise<StudyUser> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/me`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new BadGatewayException('主站登录服务暂时不可用');
    }

    const payload = await response.json().catch(() => null) as Partial<StudyUser> | null;
    if (!response.ok || !payload?.username) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    return {
      id: payload.id,
      username: payload.username,
      role: payload.role === 'admin' ? 'admin' : 'reader',
    };
  }
}
