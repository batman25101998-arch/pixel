CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'MODERATOR');
CREATE TYPE hex_status AS ENUM ('AVAILABLE', 'OWNED', 'FOR_SALE', 'LOCKED', 'BANNED');
CREATE TYPE territory_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DISBANDED');
CREATE TYPE marketplace_status AS ENUM ('ACTIVE', 'SOLD', 'CANCELED', 'EXPIRED');
CREATE TYPE transaction_type AS ENUM ('PRIMARY_PURCHASE', 'RESALE_PURCHASE', 'TERRITORY_TRANSFER', 'ADMIN_ADJUSTMENT');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE payment_status AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  username CITEXT NOT NULL UNIQUE,
  display_name VARCHAR(48) NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  bio VARCHAR(180),
  role user_role NOT NULL DEFAULT 'USER',
  email_verified TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(96) NOT NULL UNIQUE,
  description VARCHAR(240) NOT NULL DEFAULT '',
  color VARCHAR(16) NOT NULL DEFAULT '#22c55e',
  status territory_status NOT NULL DEFAULT 'ACTIVE',
  hex_count INTEGER NOT NULL DEFAULT 0,
  bounds geometry(Polygon,4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_index VARCHAR(32) NOT NULL UNIQUE,
  resolution SMALLINT NOT NULL DEFAULT 5,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_cents BIGINT NOT NULL DEFAULT 100 CHECK (price_cents >= 100),
  message VARCHAR(240) NOT NULL DEFAULT '',
  avatar_url TEXT,
  image_url TEXT,
  status hex_status NOT NULL DEFAULT 'OWNED',
  geom geometry(Polygon,4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hex_id UUID NOT NULL REFERENCES hexes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status marketplace_status NOT NULL DEFAULT 'ACTIVE',
  price_cents BIGINT NOT NULL CHECK (price_cents >= 100),
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
  provider_checkout_id TEXT UNIQUE,
  provider_payment_intent TEXT UNIQUE,
  status payment_status NOT NULL DEFAULT 'REQUIRES_PAYMENT',
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  metadata JSONB NOT NULL DEFAULT '{}',
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hex_id UUID NOT NULL REFERENCES hexes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  marketplace_id UUID REFERENCES marketplace(id) ON DELETE SET NULL ON UPDATE CASCADE,
  payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'PENDING',
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  platform_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_role_created_at_idx ON users(role, created_at);
CREATE INDEX users_display_name_idx ON users(display_name);

CREATE INDEX territories_owner_id_status_idx ON territories(owner_id, status);
CREATE INDEX territories_status_hex_count_idx ON territories(status, hex_count DESC);
CREATE INDEX territories_bounds_gix ON territories USING GIST(bounds);

CREATE INDEX hexes_owner_id_purchase_date_idx ON hexes(owner_id, purchase_date DESC);
CREATE INDEX hexes_territory_id_idx ON hexes(territory_id);
CREATE INDEX hexes_resolution_q_r_idx ON hexes(resolution, q, r);
CREATE INDEX hexes_latitude_longitude_idx ON hexes(latitude, longitude);
CREATE INDEX hexes_status_updated_at_idx ON hexes(status, updated_at);
CREATE INDEX hexes_geom_gix ON hexes USING GIST(geom);

CREATE UNIQUE INDEX marketplace_one_active_listing_per_hex
  ON marketplace(hex_id)
  WHERE status = 'ACTIVE';
CREATE INDEX marketplace_status_price_cents_idx ON marketplace(status, price_cents);
CREATE INDEX marketplace_seller_id_status_created_at_idx ON marketplace(seller_id, status, created_at DESC);
CREATE INDEX marketplace_created_at_idx ON marketplace(created_at DESC);

CREATE INDEX payments_user_id_status_created_at_idx ON payments(user_id, status, created_at DESC);
CREATE INDEX payments_provider_status_created_at_idx ON payments(provider, status, created_at);

CREATE INDEX transactions_hex_id_created_at_idx ON transactions(hex_id, created_at DESC);
CREATE INDEX transactions_buyer_id_created_at_idx ON transactions(buyer_id, created_at DESC);
CREATE INDEX transactions_seller_id_created_at_idx ON transactions(seller_id, created_at DESC);
CREATE INDEX transactions_status_created_at_idx ON transactions(status, created_at);
CREATE INDEX transactions_type_created_at_idx ON transactions(type, created_at DESC);

CREATE INDEX sessions_user_id_expires_at_idx ON sessions(user_id, expires_at);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
