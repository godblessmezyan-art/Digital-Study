FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY database database
COPY content/templates content/templates
ENV DATABASE_URL=mysql://build:build@localhost:3306/build
RUN pnpm prisma:generate && pnpm build:shared && pnpm build:api

FROM node:22-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
RUN apk add --no-cache git openssh-client && corepack enable
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml ./
COPY --from=build /workspace/apps/api/package.json apps/api/package.json
COPY --from=build /workspace/apps/api/node_modules apps/api/node_modules
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/src apps/api/src
COPY --from=build /workspace/packages/shared/package.json packages/shared/package.json
COPY --from=build /workspace/packages/shared/dist packages/shared/dist
COPY --from=build /workspace/database database
COPY --from=build /workspace/content/templates content/templates
COPY scripts scripts
CMD ["node", "apps/api/dist/main.js"]
