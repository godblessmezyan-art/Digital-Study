import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { getAvatarRoot } from '../config/paths';

const ALLOWED_EXTENSIONS = new Map<string, string>([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Minimal disk-backed avatar store. Storage location is configurable via
 * AVATAR_ROOT so a future move to object storage only needs to swap this
 * service, not the controllers or the frontend.
 */
@Injectable()
export class AvatarStoreService {
  private root(): string {
    return getAvatarRoot();
  }

  validateFile(file: { mimetype?: string; size?: number; originalname?: string }): string {
    const extension = extname(file.originalname || '').toLowerCase();
    const expectedType = ALLOWED_EXTENSIONS.get(extension);
    if (!expectedType) {
      throw new BadRequestException('头像仅支持 jpg / jpeg / png / webp 格式');
    }
    if (file.mimetype && file.mimetype !== expectedType) {
      throw new BadRequestException('头像文件类型与扩展名不一致');
    }
    if (!file.size || file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('头像不能超过 5MB');
    }
    return extension.slice(1);
  }

  async save(ownerId: string, extension: string, buffer: Buffer): Promise<void> {
    const root = this.root();
    await mkdir(root, { recursive: true });
    await writeFile(this.filePath(ownerId, extension), buffer);
    // Remove stale copies with other extensions so only one file remains.
    for (const ext of ALLOWED_EXTENSIONS.keys()) {
      const stale = ext.slice(1);
      if (stale === extension) continue;
      await unlink(this.filePath(ownerId, stale)).catch(() => undefined);
    }
  }

  async read(ownerId: string, extension: string): Promise<Buffer | null> {
    try {
      return await readFile(this.filePath(ownerId, extension));
    } catch {
      return null;
    }
  }

  contentType(extension: string): string {
    return ALLOWED_EXTENSIONS.get(`.${extension}`) ?? 'application/octet-stream';
  }

  private filePath(ownerId: string, extension: string): string {
    const digest = createHash('sha1').update(ownerId).digest('hex').slice(0, 24);
    return resolve(join(this.root(), `${digest}.${extension}`));
  }
}
