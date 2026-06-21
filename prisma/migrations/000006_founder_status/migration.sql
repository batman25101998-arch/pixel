ALTER TABLE "users" ADD COLUMN "founder_number" INTEGER;

WITH ranked_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS founder_number
  FROM users
)
UPDATE users
SET founder_number = ranked_users.founder_number
FROM ranked_users
WHERE users.id = ranked_users.id
  AND ranked_users.founder_number <= 10000;

ALTER TABLE "users"
ADD CONSTRAINT "users_founder_number_range" CHECK (
  "founder_number" IS NULL OR "founder_number" BETWEEN 1 AND 10000
);

CREATE UNIQUE INDEX "users_founder_number_key" ON "users"("founder_number");
