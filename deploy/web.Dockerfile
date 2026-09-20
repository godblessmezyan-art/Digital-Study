FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY content content
COPY scripts scripts
RUN pnpm build:web

FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
