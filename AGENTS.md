# Repository working agreement

## Source-of-truth boundaries

- `content/books/{slug}` is the source of truth for a book's metadata, HTML body, and cover.
- MySQL stores searchable metadata and runtime state. Never make the database the only copy of book content.
- Do not add automatic Git commit or push behavior. Publishing content changes local files only.
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
