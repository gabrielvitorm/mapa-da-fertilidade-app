# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate

FROM base AS runner
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# src/ e seeds/ não são usados pelo server Next.js (já compilado em
# .next/standalone), mas o script de seed (prisma/seed.ts, rodado
# manualmente via tsx em produção) importa @/lib/* e lê seeds/*.json —
# precisam do TypeScript bruto + tsconfig.json pra resolução de paths.
COPY --from=builder /app/src ./src
COPY --from=builder /app/seeds ./seeds
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
