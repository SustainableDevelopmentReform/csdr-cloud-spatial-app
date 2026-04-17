# Use the official Node.js 22 image
FROM node:22-alpine AS base

FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app

RUN yarn global add turbo
COPY . .
RUN turbo prune web @repo/server --docker

# --- Build Image ---
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app
COPY --from=pruner /app/out/json/ .
ENV NODE_OPTIONS="--max_old_space_size=4096"

# First install the dependencies (as they change less often)
RUN corepack enable
RUN pnpm i --frozen-lockfile

# Build the project
COPY --from=pruner /app/out/full/ .
RUN pnpm run build

# --- Final Image ---
FROM alpine:latest AS runner

# Install Node.js runtime
RUN apk add --no-cache nodejs chromium nss freetype harfbuzz ca-certificates ttf-freefont

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 csdr-cloud-spatial-app

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/web/.next/standalone ./frontend/standalone
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/web/.next/static ./frontend/standalone/apps/web/.next/static
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/web/public ./frontend/standalone/apps/web/public
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/server/dist ./backend
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/server/drizzle ./backend/migrate/drizzle
COPY --from=builder --chown=csdr-cloud-spatial-app:nodejs /app/apps/server/drizzle ./backend/seed/drizzle

USER csdr-cloud-spatial-app

# Expose necessary ports
EXPOSE 3000
EXPOSE 4000

ENV HOSTNAME="0.0.0.0"
ENV IS_SINGLE_FILE_DOCKER="true"
ENV NODE_ENV="production"
ENV PDF_BROWSER_EXECUTABLE_PATH="/usr/bin/chromium-browser"

CMD PORT=3000 node /app/frontend/standalone/apps/web/server.js & PORT=4000 node /app/backend/app/index.js
