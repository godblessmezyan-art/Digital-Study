import { resolve } from 'node:path';

export const WORKSPACE_ROOT = resolve(__dirname, '../../../..');

export function getContentRoot(): string {
  const configured = process.env.CONTENT_ROOT ?? 'runtime-data/books';
  return resolve(WORKSPACE_ROOT, configured);
}

export function getContentTrashRoot(): string {
  const configured = process.env.CONTENT_TRASH_ROOT ?? 'runtime-data/trash/books';
  return resolve(WORKSPACE_ROOT, configured);
}

export function getGitContentRoot(): string | null {
  const configured = process.env.GIT_CONTENT_ROOT?.trim();
  return configured ? resolve(WORKSPACE_ROOT, configured) : null;
}

export function getGitRepositoryRoot(): string | null {
  const configured = process.env.GIT_REPOSITORY_ROOT?.trim();
  return configured ? resolve(WORKSPACE_ROOT, configured) : null;
}

export function getTemplatesRoot(): string {
  return resolve(WORKSPACE_ROOT, 'content/templates');
}
