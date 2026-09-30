import {
  Body, Controller, Get, Param, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { StudyAuthGuard } from '../auth/study-auth.guard';
import { UpdateProfileRequest } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

type UserRequest = Request & { user: { username: string } };

/** Minimal shape of a multer memory-storage file (avoids @types/multer dep). */
type UploadedAvatar = { mimetype?: string; size?: number; originalname?: string; buffer: Buffer };

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  @UseGuards(StudyAuthGuard)
  me(@Req() request: UserRequest) {
    return this.profiles.get(request.user.username);
  }

  @Put('me')
  @UseGuards(StudyAuthGuard)
  update(@Req() request: UserRequest, @Body() input: UpdateProfileRequest) {
    return this.profiles.update(request.user.username, input);
  }

  @Post('me/avatar')
  @UseGuards(StudyAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadAvatar(@Req() request: UserRequest, @UploadedFile() file?: UploadedAvatar) {
    if (!file) {
      return this.profiles.get(request.user.username);
    }
    return this.profiles.saveAvatar(request.user.username, {
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
      buffer: file.buffer,
    });
  }

  /** Public on purpose: <img> tags cannot attach Authorization headers. */
  @Get(':ownerId/avatar')
  async avatar(@Param('ownerId') ownerId: string, @Res() response: Response) {
    const avatar = await this.profiles.readAvatar(decodeURIComponent(ownerId));
    if (!avatar) return response.status(404).json({ message: '头像不存在' });
    response.setHeader('Content-Type', avatar.contentType);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    return response.send(avatar.buffer);
  }
}
