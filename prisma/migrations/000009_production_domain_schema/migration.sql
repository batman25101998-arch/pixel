CREATE TYPE territory_level AS ENUM ('VILLAGE', 'CITY', 'KINGDOM', 'EMPIRE');
CREATE TYPE badge_type AS ENUM (
  'FOUNDER',
  'FIRST_HEX',
  'VILLAGE_OWNER',
  'CITY_BUILDER',
  'KINGDOM_FOUNDER',
  'COLLECTOR_100',
  'MARKETPLACE_SELLER'
);

ALTER TABLE hexes RENAME COLUMN external_link TO link;
ALTER TABLE territories RENAME COLUMN flag_image_url TO flag_url;
ALTER TABLE territories ADD COLUMN level territory_level NOT NULL DEFAULT 'VILLAGE';
UPDATE territories
SET level = CASE
  WHEN hex_count >= 5000 THEN 'EMPIRE'::territory_level
  WHEN hex_count >= 1000 THEN 'KINGDOM'::territory_level
  WHEN hex_count >= 100 THEN 'CITY'::territory_level
  ELSE 'VILLAGE'::territory_level
END;
ALTER TABLE marketplace RENAME COLUMN price_cents TO price;
ALTER TABLE marketplace ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE marketplace SET active = (status = 'ACTIVE'::marketplace_status);
ALTER TABLE marketplace
  ADD CONSTRAINT marketplace_active_status_check
  CHECK (active = (status = 'ACTIVE'::marketplace_status));
WITH ranked_active_listings AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY hex_id ORDER BY created_at DESC, id DESC) AS row_number
  FROM marketplace
  WHERE active
)
UPDATE marketplace
SET status = 'CANCELED'::marketplace_status, active = FALSE
FROM ranked_active_listings
WHERE marketplace.id = ranked_active_listings.id
  AND ranked_active_listings.row_number > 1;
ALTER TABLE transactions RENAME COLUMN amount_cents TO amount;

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type badge_type NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT badges_user_id_type_key UNIQUE (user_id, type)
);

CREATE INDEX territories_level_hex_count_idx ON territories(level, hex_count DESC);
CREATE INDEX marketplace_active_price_idx ON marketplace(active, price);
CREATE UNIQUE INDEX marketplace_one_active_listing_per_hex_idx ON marketplace(hex_id) WHERE active;
DROP INDEX IF EXISTS marketplace_status_price_cents_idx;
CREATE INDEX marketplace_status_price_idx ON marketplace(status, price);
CREATE INDEX badges_type_created_at_idx ON badges(type, created_at DESC);
CREATE INDEX badges_user_id_created_at_idx ON badges(user_id, created_at DESC);
