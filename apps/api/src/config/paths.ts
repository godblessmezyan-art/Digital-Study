import { resolve } from 'node:path';

export const WORKSPACE_ROOT = resolve(__dirname, '../../../..');

export function getContentRoot(): string {
  const configured = process.env.CONTENT_ROOT ?? 'content/books';
  return resolve(WORKSPACE_ROOT, configured);
}

export function getTemplatesRoot(): string {
  return resolve(WORKSPACE_ROOT, 'content/templates');
}
