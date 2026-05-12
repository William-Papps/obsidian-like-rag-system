# syntax=docker/dockerfile:1

# ── Stage 1: install + compile native addons ─────────────────────────────────
FROM node:20-slim AS deps

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts=false

# ── Stage 2: build the Next.js standalone bundle ─────────────────────────────
FROM node:20-slim AS builder

WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# Copy standalone bundle + static assets
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Copy native addons that standalone tracing may miss
COPY --from=deps /build/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /build/node_modules/bindings ./node_modules/bindings
COPY --from=deps /build/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.js"]
