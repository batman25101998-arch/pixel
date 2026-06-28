CREATE TYPE "offer_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'CANCELLED', 'EXPIRED');

ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'OFFER_PURCHASE';
ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'HEX_TRADE';

CREATE TABLE "hex_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "target_hex_id" UUID NOT NULL,
  "amount_cents" BIGINT NOT NULL,
  "status" "offer_status" NOT NULL DEFAULT 'PENDING',
  "message" VARCHAR(240) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "hex_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hex_trade_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "offered_hex_ids" UUID[] NOT NULL,
  "requested_hex_ids" UUID[] NOT NULL,
  "extra_amount_cents" BIGINT NOT NULL DEFAULT 0,
  "status" "offer_status" NOT NULL DEFAULT 'PENDING',
  "message" VARCHAR(240) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "hex_trade_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hex_offers_to_user_id_status_created_at_idx" ON "hex_offers"("to_user_id", "status", "created_at" DESC);
CREATE INDEX "hex_offers_from_user_id_status_created_at_idx" ON "hex_offers"("from_user_id", "status", "created_at" DESC);
CREATE INDEX "hex_offers_target_hex_id_status_idx" ON "hex_offers"("target_hex_id", "status");
CREATE INDEX "hex_trade_offers_to_user_id_status_created_at_idx" ON "hex_trade_offers"("to_user_id", "status", "created_at" DESC);
CREATE INDEX "hex_trade_offers_from_user_id_status_created_at_idx" ON "hex_trade_offers"("from_user_id", "status", "created_at" DESC);

ALTER TABLE "hex_offers" ADD CONSTRAINT "hex_offers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hex_offers" ADD CONSTRAINT "hex_offers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hex_offers" ADD CONSTRAINT "hex_offers_target_hex_id_fkey" FOREIGN KEY ("target_hex_id") REFERENCES "hexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hex_trade_offers" ADD CONSTRAINT "hex_trade_offers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hex_trade_offers" ADD CONSTRAINT "hex_trade_offers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
