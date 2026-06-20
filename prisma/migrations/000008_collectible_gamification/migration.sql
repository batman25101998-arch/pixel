ALTER TABLE hexes
  ADD COLUMN title VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN external_link TEXT;

ALTER TABLE territories
  ADD COLUMN banner_image_url TEXT,
  ADD COLUMN flag_image_url TEXT;
