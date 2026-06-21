ALTER TABLE "users" ADD COLUMN "kingdom_unlocked_at" TIMESTAMPTZ;

UPDATE users
SET kingdom_unlocked_at = now()
WHERE id IN (
  SELECT owner_id
  FROM hexes
  GROUP BY owner_id
  HAVING COUNT(*) >= 1000
);
