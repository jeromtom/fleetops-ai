# FleetOps AI — Cloud Run container
#
# Build:  docker build -t fleetops-ai .
# Run:    docker run -p 8080:8080 -e PORT=8080 fleetops-ai
# Deploy: ./deploy.sh YOUR_GCP_PROJECT_ID   (see SETUP.md)

# ── Stage 1: install dependencies ────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: build the Next.js standalone bundle ─────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: minimal runtime ─────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Mock mode by default: the container boots and demos with zero API keys.
ENV FLEETOPS_MOCK=true
# RemediationAgent stays in dry-run unless explicitly unlocked. Never flip
# this on for the hackathon demo — judges want the human-approval gate.
ENV FLEETOPS_ALLOW_REAL_REMEDIATION=false

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run injects PORT; 8080 is its default. server.js honours both.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["node", "server.js"]
