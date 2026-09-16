import { spawnSync } from 'node:child_process';

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(
  pnpmCommand,
  ['--filter', '@digital-study/api', 'sync-content'],
  { cwd: new URL('..', import.meta.url), stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
