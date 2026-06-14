FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://pixel:pixel@db:5432/pixel_world?schema=public
ENV AUTH_SECRET=build-time-placeholder-secret
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
ENV STRIPE_SECRET_KEY=sk_test_build_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_build_placeholder
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_build_placeholder
ENV S3_ENDPOINT=http://minio:9000
ENV S3_REGION=us-east-1
ENV S3_BUCKET=pixel-world
ENV S3_ACCESS_KEY_ID=minioadmin
ENV S3_SECRET_ACCESS_KEY=minioadmin
ENV S3_PUBLIC_BASE_URL=http://localhost:9000/pixel-world
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
