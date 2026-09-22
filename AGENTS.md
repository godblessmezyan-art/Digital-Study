# Repository working agreement

## Source-of-truth boundaries

- The server runtime book directory (`CONTENT_ROOT`, normally `runtime-data/books`) is the source of truth for website content. `content/books` is an optional Git export/import mirror.
- MySQL stores searchable metadata and runtime state. Never make the database the only copy of book content.
- Publishing updates the server library first. Git commit/push is allowed only when the user explicitly checks Git sync or triggers a manual sync.
- Preserve the existing framework-free frontend in `apps/web` unless a task explicitly requests a rewrite.

## Repository map

- `apps/web`: current static frontend, wrapped by Vite for development and builds.
- `apps/api`: NestJS API and content synchronization service.
- `packages/shared`: transport types shared by frontend and backend.
- `content/books`: durable, version-controlled book content.
- `database`: Prisma schema, migrations, and seed.
- `scripts`: repository-level operational entry points.
- `deploy`: Docker and Nginx foundations.
- `docs`: architecture and development documentation.

## Required checks

After relevant changes, run `pnpm build`. For schema/content work also run Prisma generation, migrations against a disposable database, and `pnpm sync-content`. Do not commit `.env`, generated build output, or database volumes.
