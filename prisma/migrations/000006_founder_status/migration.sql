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

CREATE SEQUENCE "founder_number_seq" MINVALUE 1 START 1;

SELECT setval(
  'founder_number_seq',
  GREATEST(COALESCE((SELECT MAX(founder_number) FROM users), 0), 1),
  COALESCE((SELECT MAX(founder_number) FROM users), 0) > 0
);

CREATE FUNCTION next_founder_number() RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  allocated_number BIGINT;
BEGIN
  allocated_number := nextval('founder_number_seq');
  IF allocated_number <= 10000 THEN
    RETURN allocated_number::INTEGER;
  END IF;
  RETURN NULL;
END;
$$;

ALTER TABLE "users"
ALTER COLUMN "founder_number" SET DEFAULT next_founder_number();

ALTER TABLE "users"
ADD CONSTRAINT "users_founder_number_range" CHECK (
  "founder_number" IS NULL OR "founder_number" BETWEEN 1 AND 10000
);

CREATE UNIQUE INDEX "users_founder_number_key" ON "users"("founder_number");

CREATE FUNCTION prevent_founder_number_change() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.founder_number IS DISTINCT FROM OLD.founder_number THEN
    RAISE EXCEPTION 'Founder status is permanent';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_founder_number_immutable"
BEFORE UPDATE OF founder_number ON users
FOR EACH ROW EXECUTE FUNCTION prevent_founder_number_change();
