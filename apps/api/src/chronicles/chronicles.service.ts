import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ChronicleEntry, ChronicleDiscovery, Prisma } from '@prisma/client';
import type { ChronicleArchiveDto, ChronicleEntryDto, ChronicleType } from '@digital-study/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface TriggerContext {
  page?: string;
  weather?: string;
  period?: string;
  date?: string;
  scene?: string;
}

type EntryWithDiscovery = ChronicleEntry & { discoveries: ChronicleDiscovery[] };

@Injectable()
export class ChroniclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string): Promise<ChronicleArchiveDto> {
    const entries = await this.prisma.chronicleEntry.findMany({
      where: { isHidden: false },
      include: { discoveries: { where: { ownerId }, take: 1 } },
      orderBy: [{ seasonId: 'asc' }, { chapterId: 'asc' }, { recordNumber: 'asc' }],
    });
    const mapped = entries.map((entry) => this.toDto(entry));
    return {
      entries: mapped,
      total: mapped.length,
      discovered: mapped.filter((entry) => entry.status !== 'locked').length,
      read: mapped.filter((entry) => entry.status === 'read').length,
    };
  }

  async discovered(ownerId: string) {
    const archive = await this.list(ownerId);
    return { ...archive, entries: archive.entries.filter((entry) => entry.status !== 'locked') };
  }

  async findOne(ownerId: string, id: string): Promise<ChronicleEntryDto> {
    const entry = await this.prisma.chronicleEntry.findFirst({
      where: { id, isHidden: false },
      include: { discoveries: { where: { ownerId }, take: 1 } },
    });
    if (!entry || !entry.discoveries.length) throw new NotFoundException('这条记录尚未被发现');
    return this.toDto(entry);
  }

  async checkTriggers(ownerId: string, rawContext: TriggerContext) {
    const context = this.cleanContext(rawContext);
    const discovered = await this.prisma.chronicleDiscovery.findMany({
      where: { ownerId },
      select: { chronicleId: true, chronicle: { select: { recordNumber: true } } },
    });
    const ids = new Set(discovered.map((item) => item.chronicleId));
    const numbers = new Set(discovered.map((item) => item.chronicle.recordNumber));
    const candidates = await this.prisma.chronicleEntry.findMany({
      where: { isHidden: false, id: { notIn: [...ids] } },
      orderBy: [{ seasonId: 'asc' }, { recordNumber: 'asc' }],
    });
    const match = candidates.find((entry) => this.matches(entry, context, numbers));
    if (!match) return { discovered: false, entry: null };
    try {
      const discovery = await this.prisma.chronicleDiscovery.create({
        data: { ownerId, chronicleId: match.id, discoveryContext: context as Prisma.InputJsonValue },
      });
      return { discovered: true, entry: this.toDto({ ...match, discoveries: [discovery] }) };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return { discovered: false, entry: null };
      throw error;
    }
  }

  async markRead(ownerId: string, id: string): Promise<ChronicleEntryDto> {
    const result = await this.prisma.chronicleDiscovery.updateMany({
      where: { ownerId, chronicleId: id },
      data: { isRead: true, readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('这条记录尚未被发现');
    return this.findOne(ownerId, id);
  }

  async discoverManual(ownerId: string, id: string, rawContext: TriggerContext) {
    const entry = await this.prisma.chronicleEntry.findUnique({ where: { id } });
    if (!entry || entry.isHidden) throw new NotFoundException('纪事记录不存在');
    if (entry.triggerType !== 'manual') throw new BadRequestException('只有手动触发记录可由管理员直接解锁');
    const discovery = await this.prisma.chronicleDiscovery.upsert({
      where: { ownerId_chronicleId: { ownerId, chronicleId: id } },
      update: {},
      create: { ownerId, chronicleId: id, discoveryContext: this.cleanContext(rawContext) as Prisma.InputJsonValue },
    });
    return this.toDto({ ...entry, discoveries: [discovery] });
  }

  private matches(entry: ChronicleEntry, context: Required<Pick<TriggerContext, 'date'>> & TriggerContext, discoveredNumbers: Set<number>) {
    const config = this.object(entry.triggerConfig);
    const required = Number(config.requiresRecordNumber || 0);
    if (required && !discoveredNumbers.has(required)) return false;
    const type = String(config.type || entry.triggerType);
    if (type === 'first_visit' || type === 'page_visit') return context.page === String(config.page || '');
    if (type === 'time_period') return context.period === String(config.period || '');
    if (type === 'weather') return context.weather === String(config.weather || '');
    if (type === 'world_state') {
      return (!config.page || context.page === config.page)
        && (!config.weather || context.weather === config.weather)
        && (!config.period || context.period === config.period);
    }
    if (type === 'date') return context.date === config.date || context.date.slice(5) === config.date;
    return false;
  }

  private cleanContext(context: TriggerContext) {
    return {
      page: String(context.page || '').slice(0, 80),
      weather: String(context.weather || '').slice(0, 40),
      period: String(context.period || '').slice(0, 40),
      date: String(context.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      scene: String(context.scene || '').slice(0, 80),
    };
  }

  private object(value: Prisma.JsonValue): Record<string, string | number | boolean> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, string | number | boolean>
      : {};
  }

  private toDto(entry: EntryWithDiscovery): ChronicleEntryDto {
    const discovery = entry.discoveries[0];
    const status = !discovery ? 'locked' : discovery.isRead ? 'read' : 'discovered';
    const common = {
      id: entry.id,
      seasonId: entry.seasonId,
      seasonTitle: entry.seasonTitle,
      chapterId: entry.chapterId,
      chapterTitle: entry.chapterTitle,
      recordNumber: entry.recordNumber,
      status,
    } as const;
    if (!discovery) return common;
    return {
      ...common,
      type: entry.type as ChronicleType,
      title: entry.title,
      subtitle: entry.subtitle,
      content: entry.content,
      excerpt: entry.excerpt,
      author: entry.author,
      recordDate: entry.recordDate,
      discoverLocation: entry.discoverLocation,
      coordinates: entry.coordinates,
      regionId: entry.regionId,
      discoveredAt: discovery.discoveredAt.toISOString(),
      readAt: discovery.readAt?.toISOString() || null,
    };
  }
}
