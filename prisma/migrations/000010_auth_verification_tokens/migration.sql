CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX "verification_tokens_token_key"
  ON "verification_tokens"("token");

CREATE UNIQUE INDEX "verification_tokens_identifier_token_key"
  ON "verification_tokens"("identifier", "token");

CREATE INDEX "verification_tokens_expires_idx"
  ON "verification_tokens"("expires");
