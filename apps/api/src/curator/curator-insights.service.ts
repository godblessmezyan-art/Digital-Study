import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CuratorDiscovery = {
  id: string;
  icon: string;
  text: string;
  href: string | null;
};

export type CuratorInsights = {
  collections: { books: number; notes: number; excerpts: number; journals: number; plans: number };
  recent: Array<{ type: string; title: string; time: string; href: string }>;
  discoveries: CuratorDiscovery[];
};

export type CuratorIndexStatus = {
  total: number;
  byType: Record<string, number>;
  lastIndexedAt: string | null;
};

const DAY = 86400000;

/**
 * Rule-based insights over real user data. No AI calls: everything here is
 * derived from plain database aggregates so the section never shows fake
 * content and stays cheap to load.
 */
@Injectable()
export class CuratorInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async insights(ownerId: string): Promise<CuratorInsights> {
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const [books, notes, excerpts, journals, plans] = await Promise.all([
      this.prisma.book.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.readingEntry.count({ where: { ownerId, type: 'NOTE' } }),
      this.prisma.readingEntry.count({ where: { ownerId, type: 'QUOTE' } }),
      this.prisma.journalEntry.count({ where: { ownerId } }),
      this.prisma.plan.count({ where: { ownerId, status: { in: ['DRAFT', 'ACTIVE'] } } }),
    ]);

    const [recentJournals, recentEntries, recentPlans] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: { ownerId, updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, updatedAt: true },
      }),
      this.prisma.readingEntry.findMany({
        where: { ownerId, updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, type: true, title: true, content: true, updatedAt: true },
      }),
      this.prisma.plan.findMany({
        where: { ownerId, updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'desc' },
        take: 2,
        select: { id: true, title: true, updatedAt: true },
      }),
    ]);
    const recent = [
      ...recentJournals.map((item) => ({ type: 'journal', title: item.title, time: item.updatedAt.toISOString(), href: `journal/${encodeURIComponent(item.id)}` })),
      ...recentEntries.map((item) => ({
        type: item.type === 'NOTE' ? 'note' : 'excerpt',
        title: item.title || item.content.replace(/\s+/g, ' ').trim().slice(0, 40) || (item.type === 'NOTE' ? '阅读笔记' : '书摘'),
        time: item.updatedAt.toISOString(),
        href: `index.html#reading?tab=${item.type === 'NOTE' ? 'notes' : 'quotes'}&entry=${encodeURIComponent(item.id)}`,
      })),
      ...recentPlans.map((item) => ({ type: 'plan', title: item.title, time: item.updatedAt.toISOString(), href: `plans/${encodeURIComponent(item.id)}` })),
    ].sort((left, right) => right.time.localeCompare(left.time)).slice(0, 6);

    const discoveries = await this.discoveries(ownerId, weekAgo);
    return {
      collections: { books, notes, excerpts, journals, plans },
      recent,
      discoveries,
    };
  }

  async indexStatus(): Promise<CuratorIndexStatus> {
    const grouped = await this.prisma.aiVectorEntry.groupBy({ by: ['type'], _count: { _all: true } });
    const last = await this.prisma.aiVectorEntry.aggregate({ _max: { indexedAt: true } });
    const byType: Record<string, number> = {};
    let total = 0;
    for (const row of grouped) {
      byType[row.type] = row._count._all;
      total += row._count._all;
    }
    return { total, byType, lastIndexedAt: last._max.indexedAt?.toISOString() ?? null };
  }

  private async discoveries(ownerId: string, weekAgo: Date): Promise<CuratorDiscovery[]> {
    const found: CuratorDiscovery[] = [];

    // Rule 1: the book you are reading already has notes/excerpts waiting to be revisited.
    const reading = await this.prisma.userShelfBook.findFirst({
      where: { ownerId, status: 'READING', book: { status: 'PUBLISHED', deletedAt: null } },
      orderBy: { lastReadAt: 'desc' },
      include: { book: { select: { slug: true, title: true, id: true } } },
    });
    if (reading) {
      const entryCount = await this.prisma.readingEntry.count({ where: { ownerId, bookId: reading.bookId } });
      if (entryCount > 0) {
        found.push({
          id: 'reading-entries',
          icon: '✦',
          text: `你正在读《${reading.book.title}》，已经留下 ${entryCount} 条笔记或书摘，值得回看。`,
          href: `index.html#shelf?book=${encodeURIComponent(reading.book.slug)}`,
        });
      }
    }

    // Rule 2: tasks due today across active plans.
    const todayEnd = new Date(); todayEnd.setUTCHours(0, 0, 0, 0);
    const dueTasks = await this.prisma.planTask.findMany({
      where: { plan: { ownerId, status: { in: ['ACTIVE', 'DRAFT'] } }, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lte: todayEnd } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: { title: true, planId: true },
    });
    if (dueTasks.length) {
      found.push({
        id: 'due-today',
        icon: '◷',
        text: dueTasks.length === 1
          ? `今天有 1 个任务到期：「${dueTasks[0].title}」。`
          : `今天有 ${dueTasks.length} 个任务到期，最近的是「${dueTasks[0].title}」。`,
        href: `plans/${encodeURIComponent(dueTasks[0].planId)}`,
      });
    }

    // Rule 3: the most recently touched active plan and its progress.
    const activePlan = await this.prisma.plan.findFirst({
      where: { ownerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, progress: true },
    });
    if (activePlan) {
      const total = await this.prisma.planTask.count({ where: { planId: activePlan.id, status: { not: 'CANCELLED' } } });
      found.push({
        id: 'active-plan',
        icon: '❖',
        text: `计划「${activePlan.title}」已推进 ${activePlan.progress}%（${total} 个任务）。`,
        href: `plans/${encodeURIComponent(activePlan.id)}`,
      });
    }

    // Rule 4: journal streak gap — only when the user actually writes journals.
    const lastJournal = await this.prisma.journalEntry.findFirst({
      where: { ownerId },
      orderBy: { entryDate: 'desc' },
      select: { entryDate: true },
    });
    if (lastJournal) {
      const days = Math.floor((Date.now() - lastJournal.entryDate.getTime()) / DAY);
      if (days >= 3) {
        found.push({
          id: 'journal-gap',
          icon: '✎',
          text: `距离上一篇旅者手记已经过去 ${days} 天，要不要写下今天？`,
          href: 'journal/new',
        });
      }
    }

    // Rule 5: recent recording activity summary.
    const [weekJournals, weekEntries] = await Promise.all([
      this.prisma.journalEntry.count({ where: { ownerId, createdAt: { gte: weekAgo } } }),
      this.prisma.readingEntry.count({ where: { ownerId, createdAt: { gte: weekAgo } } }),
    ]);
    if (weekJournals + weekEntries > 0) {
      found.push({
        id: 'week-activity',
        icon: '☙',
        text: `最近 7 天你写下了 ${weekJournals} 篇手记、${weekEntries} 条阅读记录。`,
        href: 'journal',
      });
    }

    return found.slice(0, 4);
  }
}
