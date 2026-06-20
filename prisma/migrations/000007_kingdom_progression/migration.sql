ALTER TABLE "users" ADD COLUMN "kingdom_unlocked_at" TIMESTAMPTZ;

UPDATE users
SET kingdom_unlocked_at = now()
WHERE id IN (
  SELECT owner_id
  FROM hexes
  GROUP BY owner_id
  HAVING COUNT(*) >= 1000
);

CREATE FUNCTION prevent_kingdom_badge_removal() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.kingdom_unlocked_at IS NOT NULL
    AND NEW.kingdom_unlocked_at IS DISTINCT FROM OLD.kingdom_unlocked_at THEN
    RAISE EXCEPTION 'Kingdom badge is permanent';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_kingdom_badge_immutable"
BEFORE UPDATE OF kingdom_unlocked_at ON users
FOR EACH ROW EXECUTE FUNCTION prevent_kingdom_badge_removal();
