ALTER TABLE "users"
ADD COLUMN "banned_at" TIMESTAMPTZ,
ADD COLUMN "ban_reason" VARCHAR(240);

ALTER TABLE "payments"
ADD COLUMN "provider_refund_id" TEXT,
ADD COLUMN "refunded_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX "payments_provider_refund_id_key" ON "payments"("provider_refund_id");

CREATE TABLE "admin_audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" VARCHAR(64) NOT NULL,
  "target_type" VARCHAR(32) NOT NULL,
  "target_id" VARCHAR(191) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "admin_audit_logs_admin_id_created_at_idx"
ON "admin_audit_logs"("admin_id", "created_at" DESC);

CREATE INDEX "admin_audit_logs_target_type_target_id_created_at_idx"
ON "admin_audit_logs"("target_type", "target_id", "created_at" DESC);

CREATE INDEX "admin_audit_logs_action_created_at_idx"
ON "admin_audit_logs"("action", "created_at" DESC);
