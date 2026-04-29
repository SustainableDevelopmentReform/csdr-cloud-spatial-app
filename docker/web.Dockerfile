# Use the official Node.js 22 image
FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN turbo prune web --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN corepack enable
RUN pnpm i --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm run build --filter=web...

FROM base AS runner
ARG APP_VERSION="0.0.0-dev"
ARG APP_COMMIT=""
ARG APP_BUILD_TIME=""
ARG APP_IMAGE=""

LABEL org.opencontainers.image.title="csdr-cloud-spatial-app-web"
LABEL org.opencontainers.image.description="Spatial Data Framework web console"
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.revision="${APP_COMMIT}"
LABEL org.opencontainers.image.created="${APP_BUILD_TIME}"
LABEL org.opencontainers.image.source="https://github.com/SustainableDevelopmentReform/csdr-cloud-spatial-app"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./next/standalone
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./next/standalone/apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./next/standalone/apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV IS_DOCKER_COMPOSE="true"
ENV APP_VERSION="${APP_VERSION}"
ENV APP_COMMIT="${APP_COMMIT}"
ENV APP_BUILD_TIME="${APP_BUILD_TIME}"
ENV APP_IMAGE="${APP_IMAGE}"

CMD node next/standalone/apps/web/server.js
