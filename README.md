# Own a Pixel of Earth

A production-oriented Next.js application where users purchase, customize, resell, and combine hexagonal tiles of Earth.

## Stack

- Next.js 15, React, TypeScript, TailwindCSS, shadcn-style components
- MapLibre GL and Zustand
- Auth.js credentials authentication
- Prisma, PostgreSQL, PostGIS
- Stripe Checkout and webhooks
- S3-compatible storage
- Docker and Docker Compose

## Local setup

1. Copy `.env.example` to `.env` and fill the secrets.
2. Start PostgreSQL and MinIO:

```bash
docker compose up db minio
```

3. Install dependencies and migrate:

```bash
npm install
npx prisma migrate dev
npm run dev
```

4. Forward Stripe webhooks to `/api/stripe/webhook`:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Production

Build and run all services:

```bash
docker compose up --build
```

Use a real S3-compatible bucket, managed Postgres with PostGIS, and production Stripe keys before accepting real payments.
