# Use Debian-based Node images because Chromium/WebGL support in the Alpine
# runner breaks MapLibre report rendering during PDF generation.
FROM node:22-bookworm-slim AS base

FROM base AS pruner

# Set working directory
WORKDIR /app

RUN corepack enable && yarn global add turbo
COPY . .
RUN turbo prune web @repo/server --docker

# --- Build Image ---
FROM base AS builder

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
FROM node:22-bookworm-slim AS runner

# Install Chromium in a glibc-based environment so headless PDF rendering can
# initialize WebGL for MapLibre maps.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Don't run production as root
RUN groupadd --system --gid 1001 nodejs \
  && useradd \
    --system \
    --uid 1001 \
    --gid nodejs \
    --create-home \
    --home-dir /home/csdr-cloud-spatial-app \
    csdr-cloud-spatial-app

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
ENV HOME="/home/csdr-cloud-spatial-app"
ENV IS_SINGLE_FILE_DOCKER="true"
ENV NODE_ENV="production"
ENV PDF_BROWSER_EXECUTABLE_PATH="/usr/bin/chromium"

CMD PORT=3000 node /app/frontend/standalone/apps/web/server.js & PORT=4000 node /app/backend/app/index.js
