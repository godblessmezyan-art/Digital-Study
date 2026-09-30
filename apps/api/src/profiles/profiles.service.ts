import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvatarStoreService } from './avatar-store.service';
import type { UpdateProfileRequest } from './dto/update-profile.dto';

export interface ProfileDto {
  username: string;
  displayName: string | null;
  signature: string | null;
  avatarUrl: string | null;
  avatarVersion: number;
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatars: AvatarStoreService,
  ) {}

  async get(ownerId: string): Promise<ProfileDto> {
    const profile = await this.prisma.userProfile.findUnique({ where: { ownerId } });
    return this.present(ownerId, profile);
  }

  async summary(ownerId: string): Promise<Partial<ProfileDto>> {
    const profile = await this.prisma.userProfile.findUnique({ where: { ownerId } });
    if (!profile) return {};
    return {
      displayName: profile.displayName,
      signature: profile.signature,
      avatarUrl: profile.avatarExt ? this.avatarUrl(ownerId, profile.avatarVersion) : null,
    };
  }

  async update(ownerId: string, input: UpdateProfileRequest): Promise<ProfileDto> {
    const displayName = input.displayName !== undefined ? input.displayName.trim() || null : undefined;
    const signature = input.signature !== undefined ? input.signature.trim() || null : undefined;
    const profile = await this.prisma.userProfile.upsert({
      where: { ownerId },
      create: { ownerId, displayName: displayName ?? null, signature: signature ?? null },
      update: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(signature !== undefined ? { signature } : {}),
      },
    });
    return this.present(ownerId, profile);
  }

  async saveAvatar(ownerId: string, file: { mimetype?: string; size?: number; originalname?: string; buffer: Buffer }): Promise<ProfileDto> {
    const extension = this.avatars.validateFile(file);
    await this.avatars.save(ownerId, extension, file.buffer);
    const profile = await this.prisma.userProfile.upsert({
      where: { ownerId },
      create: { ownerId, avatarExt: extension, avatarVersion: 1 },
      update: { avatarExt: extension, avatarVersion: { increment: 1 } },
    });
    return this.present(ownerId, profile);
  }

  async readAvatar(ownerId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const profile = await this.prisma.userProfile.findUnique({ where: { ownerId }, select: { avatarExt: true } });
    if (!profile?.avatarExt) return null;
    const buffer = await this.avatars.read(ownerId, profile.avatarExt);
    if (!buffer) return null;
    return { buffer, contentType: this.avatars.contentType(profile.avatarExt) };
  }

  private present(ownerId: string, profile: UserProfile | null): ProfileDto {
    return {
      username: ownerId,
      displayName: profile?.displayName ?? null,
      signature: profile?.signature ?? null,
      avatarUrl: profile?.avatarExt ? this.avatarUrl(ownerId, profile.avatarVersion) : null,
      avatarVersion: profile?.avatarVersion ?? 0,
    };
  }

  private avatarUrl(ownerId: string, version: number): string {
    return `/api/profiles/${encodeURIComponent(ownerId)}/avatar?v=${version}`;
  }
}

export class ProfileNotFoundException extends NotFoundException {
  constructor() {
    super('档案不存在');
  }
}
