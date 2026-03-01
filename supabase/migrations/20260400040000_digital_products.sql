-- Sprint 65.1: In-App Marketplace — Digital Products
-- Trainers create and sell programs, templates, and digital content to their clients.
-- Stripe Connect handles payouts to trainers via existing integration.

-- ─── digital_products ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL
                   CHECK (type IN ('pdf_program', 'video_series', 'template_bundle', 'custom_plan')),

  -- Pricing
  price_cents    INT NOT NULL CHECK (price_cents >= 0),  -- 0 = free
  currency       TEXT NOT NULL DEFAULT 'usd',

  -- Assets
  preview_url    TEXT,                    -- public teaser (thumbnail or short clip)
  file_urls      JSONB NOT NULL DEFAULT '[]'::JSONB,  -- private download URLs array
  thumbnail_url  TEXT,

  -- Stripe
  stripe_price_id    TEXT,               -- populated after Stripe Price is created
  stripe_product_id  TEXT,              -- Stripe Product ID

  -- Lifecycle
  is_published   BOOLEAN NOT NULL DEFAULT false,
  purchase_count INT NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own products (full CRUD)
CREATE POLICY "trainer_manages_own_products"
  ON digital_products
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients (and anyone) can browse published products
CREATE POLICY "anyone_reads_published_products"
  ON digital_products
  FOR SELECT
  USING (is_published = true);

-- ─── digital_product_purchases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_product_purchases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES digital_products(id) ON DELETE RESTRICT,
  stripe_payment_intent_id TEXT,         -- null for free products
  purchased_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  download_count          INT NOT NULL DEFAULT 0,

  -- Prevent duplicate purchases
  UNIQUE (client_id, product_id)
);

ALTER TABLE digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- Clients manage their own purchase records
CREATE POLICY "client_manages_own_purchases"
  ON digital_product_purchases
  FOR ALL
  USING  (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Trainers can view purchases of their products (analytics)
CREATE POLICY "trainer_views_product_purchases"
  ON digital_product_purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM digital_products dp
      WHERE dp.id = digital_product_purchases.product_id
        AND dp.trainer_id = auth.uid()
    )
  );

-- ─── Trigger: increment purchase_count on new purchase ────────────────────────
CREATE OR REPLACE FUNCTION increment_product_purchase_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE digital_products
  SET purchase_count = purchase_count + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_purchased
  AFTER INSERT ON digital_product_purchases
  FOR EACH ROW
  EXECUTE FUNCTION increment_product_purchase_count();

-- ─── Trigger: updated_at ──────────────────────────────────────────────────────
CREATE TRIGGER touch_digital_products_updated_at
  BEFORE UPDATE ON digital_products
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── Indices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_digital_products_trainer_id
  ON digital_products (trainer_id);

CREATE INDEX IF NOT EXISTS idx_digital_products_published
  ON digital_products (is_published, type)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_digital_product_purchases_client_id
  ON digital_product_purchases (client_id);

CREATE INDEX IF NOT EXISTS idx_digital_product_purchases_product_id
  ON digital_product_purchases (product_id);

-- ─── RPC: get_client_trainer_products ─────────────────────────────────────────
-- Returns published products from all trainers who have appointments with this client.
-- This scopes the marketplace to trainer-client relationships.
CREATE OR REPLACE FUNCTION get_client_trainer_products(p_client_id UUID)
RETURNS TABLE (
  id             UUID,
  trainer_id     UUID,
  trainer_name   TEXT,
  title          TEXT,
  description    TEXT,
  type           TEXT,
  price_cents    INT,
  currency       TEXT,
  preview_url    TEXT,
  thumbnail_url  TEXT,
  purchase_count INT,
  is_purchased   BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.trainer_id,
    p.full_name AS trainer_name,
    dp.title,
    dp.description,
    dp.type,
    dp.price_cents,
    dp.currency,
    dp.preview_url,
    dp.thumbnail_url,
    dp.purchase_count,
    EXISTS (
      SELECT 1 FROM digital_product_purchases dpp
      WHERE dpp.product_id = dp.id AND dpp.client_id = p_client_id
    ) AS is_purchased
  FROM digital_products dp
  JOIN profiles p ON p.id = dp.trainer_id
  WHERE dp.is_published = true
    AND dp.trainer_id IN (
      SELECT DISTINCT a.trainer_id
      FROM appointments a
      WHERE a.client_id = p_client_id
    )
  ORDER BY dp.purchase_count DESC, dp.created_at DESC;
END;
$$;
