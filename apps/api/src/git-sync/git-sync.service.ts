import { BadRequestException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { GitSyncOperation, GitSyncStatus } from '@prisma/client';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import { getGitContentRoot, getGitRepositoryRoot } from '../config/paths';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';

const exec = promisify(execFile);

@Injectable()
export class GitSyncService implements OnApplicationBootstrap {
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly content: ContentService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.prisma.gitSyncJob.updateMany({
      where: { status: GitSyncStatus.SYNCING },
      data: { status: GitSyncStatus.PENDING, error: '服务重启，任务已重新排队' },
    });
    this.kick();
  }

  async enqueue(slug: string, operation: GitSyncOperation = GitSyncOperation.UPSERT) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new BadRequestException(`Book not found: ${slug}`);
    if (operation === GitSyncOperation.UPSERT && book.deletedAt) throw new BadRequestException('已删除的服务器书籍不能同步到 Git');
    this.requireConfiguration();
    await this.prisma.bookGitSync.upsert({
      where: { bookId: book.id },
      create: { bookId: book.id, status: GitSyncStatus.PENDING },
      update: { status: GitSyncStatus.PENDING, lastError: null },
    });
    const job = await this.prisma.gitSyncJob.create({ data: { bookId: book.id, operation } });
    this.kick();
    return { jobId: job.id, status: 'pending' };
  }

  private kick(): void {
    queueMicrotask(() => void this.drain());
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        const job = await this.prisma.gitSyncJob.findFirst({
          where: { status: GitSyncStatus.PENDING },
          include: { book: true },
          orderBy: { createdAt: 'asc' },
        });
        if (!job) break;
        await this.process(job.id, job.book.slug, job.book.contentHash, job.operation);
      }
    } finally {
      this.running = false;
    }
  }

  private async process(jobId: string, slug: string, contentHash: string | null, operation: GitSyncOperation): Promise<void> {
    const job = await this.prisma.gitSyncJob.update({
      where: { id: jobId },
      data: { status: GitSyncStatus.SYNCING, startedAt: new Date(), attempts: { increment: 1 }, error: null },
    });
    await this.prisma.bookGitSync.update({ where: { bookId: job.bookId }, data: { status: GitSyncStatus.SYNCING } });
    try {
      const { contentRoot, repositoryRoot, relativeContentRoot } = this.requireConfiguration();
      const branch = process.env.GIT_CONTENT_BRANCH ?? 'content';
      const { stdout: currentBranch } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repositoryRoot });
      if (currentBranch.trim() !== branch) throw new Error(`Git 镜像必须检出 ${branch} 分支，当前为 ${currentBranch.trim()}`);
      if (operation === GitSyncOperation.UPSERT) await this.content.copyBookTo(slug, contentRoot);
      else await rm(join(contentRoot, slug), { recursive: true, force: true });
      await this.rebuildIndex(contentRoot);
      const paths = [`${relativeContentRoot}/${slug}`.replaceAll(sep, '/'), `${relativeContentRoot}/index.json`.replaceAll(sep, '/')];
      await exec('git', ['add', '--', ...paths], { cwd: repositoryRoot });
      const { stdout: changes } = await exec('git', ['status', '--porcelain', '--', ...paths], { cwd: repositoryRoot });
      if (changes.trim()) {
        const verb = operation === GitSyncOperation.DELETE ? 'Delete' : 'Sync';
        await exec('git', [
          '-c', `user.name=${process.env.GIT_AUTHOR_NAME ?? 'Digital Study'}`,
          '-c', `user.email=${process.env.GIT_AUTHOR_EMAIL ?? 'digital-study@localhost'}`,
          'commit', '-m', `${verb} book: ${slug}`, '--', ...paths,
        ], { cwd: repositoryRoot });
        if (process.env.GIT_PUSH_ENABLED !== 'false') {
          await exec('git', ['push', 'origin', `HEAD:${branch}`], { cwd: repositoryRoot });
        }
      }
      const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot });
      const commitSha = stdout.trim();
      await this.prisma.$transaction([
        this.prisma.gitSyncJob.update({ where: { id: jobId }, data: { status: GitSyncStatus.SYNCED, commitSha, completedAt: new Date() } }),
        this.prisma.bookGitSync.update({
          where: { bookId: job.bookId },
          data: {
            status: GitSyncStatus.SYNCED,
            syncedContentHash: operation === GitSyncOperation.UPSERT ? contentHash : null,
            gitBranch: process.env.GIT_CONTENT_BRANCH ?? 'content',
            gitPath: `${relativeContentRoot}/${slug}`.replaceAll(sep, '/'),
            gitCommitSha: commitSha,
            lastSyncedAt: new Date(),
            lastError: null,
          },
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 4000) : 'Git sync failed';
      await this.prisma.$transaction([
        this.prisma.gitSyncJob.update({ where: { id: jobId }, data: { status: GitSyncStatus.ERROR, error: message, completedAt: new Date() } }),
        this.prisma.bookGitSync.update({ where: { bookId: job.bookId }, data: { status: GitSyncStatus.ERROR, lastError: message } }),
      ]);
    }
  }

  private requireConfiguration() {
    const contentRoot = getGitContentRoot();
    const repositoryRoot = getGitRepositoryRoot();
    if (!contentRoot || !repositoryRoot) throw new BadRequestException('Git 同步尚未配置：需要 GIT_REPOSITORY_ROOT 和 GIT_CONTENT_ROOT');
    const relativeContentRoot = relative(repositoryRoot, contentRoot);
    if (!relativeContentRoot || relativeContentRoot.startsWith('..') || relativeContentRoot.includes(`..${sep}`)) {
      throw new BadRequestException('GIT_CONTENT_ROOT 必须位于 GIT_REPOSITORY_ROOT 内');
    }
    return { contentRoot, repositoryRoot, relativeContentRoot };
  }

  private async rebuildIndex(contentRoot: string): Promise<void> {
    await mkdir(contentRoot, { recursive: true });
    const entries = await readdir(contentRoot, { withFileTypes: true });
    const books = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      try {
        const metadata = JSON.parse(await readFile(join(contentRoot, entry.name, 'book.json'), 'utf8'));
        books.push({ ...metadata, coverUrl: `/content/books/${metadata.slug}/${metadata.cover}`, contentUrl: `/content/books/${metadata.slug}/content.html` });
      } catch { /* 跳过不完整目录 */ }
    }
    books.sort((a, b) => String(b.publishedAt ?? '').localeCompare(String(a.publishedAt ?? '')) || a.title.localeCompare(b.title, 'zh-CN'));
    await writeFile(join(contentRoot, 'index.json'), `${JSON.stringify({ schemaVersion: 1, books }, null, 2)}\n`, 'utf8');
  }
}
