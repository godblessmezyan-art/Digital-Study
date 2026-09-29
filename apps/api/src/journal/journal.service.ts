import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JournalEntry, Prisma } from '@prisma/client';
import type { JournalEntryDto } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveJournalEntryRequest } from './dto/save-journal-entry.dto';

export interface JournalQuery {
  year?: string;
  month?: string;
  tag?: string;
  search?: string;
  mood?: string;
}

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, query: JournalQuery): Promise<JournalEntryDto[]> {
    const where: Prisma.JournalEntryWhereInput = { ownerId };
    const dateRange = this.dateRange(query.year, query.month);
    if (dateRange) where.entryDate = dateRange;
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    if (query.mood?.trim()) where.mood = query.mood.trim();
    const entries = await this.prisma.journalEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { updatedAt: 'desc' }],
    });
    const tag = query.tag?.trim().toLocaleLowerCase();
    return entries
      .filter((entry) => !tag || this.jsonStrings(entry.tags).some((item) => item.toLocaleLowerCase() === tag))
      .map((entry) => this.toDto(entry));
  }

  async findOne(ownerId: string, id: string): Promise<JournalEntryDto> {
    return this.toDto(await this.requireOwned(id, ownerId));
  }

  async create(ownerId: string, input: SaveJournalEntryRequest): Promise<JournalEntryDto> {
    const data = this.data(input);
    return this.toDto(await this.prisma.journalEntry.create({ data: { ownerId, ...data } }));
  }

  async update(ownerId: string, id: string, input: SaveJournalEntryRequest): Promise<JournalEntryDto> {
    await this.requireOwned(id, ownerId);
    return this.toDto(await this.prisma.journalEntry.update({ where: { id }, data: this.data(input) }));
  }

  async remove(ownerId: string, id: string) {
    await this.requireOwned(id, ownerId);
    await this.prisma.journalEntry.delete({ where: { id } });
    return { id, deleted: true };
  }

  private data(input: SaveJournalEntryRequest) {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title || !content) throw new BadRequestException('标题和正文不能为空');
    const entryDate = new Date(`${input.entryDate.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(entryDate.getTime())) throw new BadRequestException('日记日期无效');
    return {
      title,
      content,
      entryDate,
      tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))],
      mood: this.clean(input.mood),
      weather: this.clean(input.weather),
      worldPeriod: this.clean(input.worldPeriod),
      location: this.clean(input.location),
      coverImage: this.clean(input.coverImage),
      relatedBooks: input.relatedBooks ?? [],
      relatedNotes: input.relatedNotes ?? [],
      isPrivate: input.isPrivate ?? true,
    };
  }

  private dateRange(yearValue?: string, monthValue?: string): Prisma.DateTimeFilter | undefined {
    if (!yearValue && !monthValue) return undefined;
    const year = Number(yearValue);
    const month = monthValue ? Number(monthValue) : 1;
    if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new BadRequestException('年份筛选无效');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestException('月份筛选无效');
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = monthValue ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
    return { gte: start, lt: end };
  }

  private clean(value?: string) {
    return value?.trim() || null;
  }

  private jsonStrings(value: Prisma.JsonValue | null): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private async requireOwned(id: string, ownerId: string) {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id, ownerId } });
    if (!entry) throw new NotFoundException('日记不存在或已被删除');
    return entry;
  }

  private toDto(entry: JournalEntry): JournalEntryDto {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      entryDate: entry.entryDate.toISOString().slice(0, 10),
      tags: this.jsonStrings(entry.tags),
      mood: entry.mood,
      weather: entry.weather,
      worldPeriod: entry.worldPeriod,
      location: entry.location,
      coverImage: entry.coverImage,
      relatedBooks: this.jsonStrings(entry.relatedBooks),
      relatedNotes: this.jsonStrings(entry.relatedNotes),
      isPrivate: entry.isPrivate,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
