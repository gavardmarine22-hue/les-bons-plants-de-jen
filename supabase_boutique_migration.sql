-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION BOUTIQUE — À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Catégories ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  parent_id  UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Produits ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_price DECIMAL(10,2),
  category_id   UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
  images        TEXT[] DEFAULT '{}',
  stock         INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Paniers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_carts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_carts_session    ON shop_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_shop_carts_expires_at ON shop_carts(expires_at);

-- ─── 4. Articles du panier ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_cart_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id    UUID REFERENCES shop_carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

-- ─── 5. Promotions automatiques ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_promotions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'percentage'
                   CHECK (discount_type IN ('percentage','fixed')),
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  applies_to     TEXT DEFAULT 'all'
                   CHECK (applies_to IN ('all','category','product')),
  target_id      UUID,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Codes promo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_promo_codes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'percentage'
                   CHECK (discount_type IN ('percentage','fixed')),
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_order      DECIMAL(10,2) DEFAULT 0,
  max_uses       INTEGER,
  uses_count     INTEGER DEFAULT 0,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE shop_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_carts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_cart_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_promotions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_promo_codes ENABLE ROW LEVEL SECURITY;

-- Catégories : lecture publique, écriture admin
CREATE POLICY "public_read_categories"  ON shop_categories FOR SELECT USING (true);
CREATE POLICY "auth_write_categories"   ON shop_categories FOR ALL    USING (auth.role() = 'authenticated');

-- Produits : lecture publique, écriture admin
CREATE POLICY "public_read_products"    ON shop_products   FOR SELECT USING (true);
CREATE POLICY "auth_write_products"     ON shop_products   FOR ALL    USING (auth.role() = 'authenticated');

-- Paniers : accès ouvert (session anonyme)
CREATE POLICY "open_carts"       ON shop_carts      FOR ALL USING (true);
CREATE POLICY "open_cart_items"  ON shop_cart_items FOR ALL USING (true);

-- Promotions : lecture publique, écriture admin
CREATE POLICY "public_read_promotions"  ON shop_promotions  FOR SELECT USING (true);
CREATE POLICY "auth_write_promotions"   ON shop_promotions  FOR ALL    USING (auth.role() = 'authenticated');

-- Codes promo : lecture publique, écriture admin
CREATE POLICY "public_read_promo_codes" ON shop_promo_codes FOR SELECT USING (true);
CREATE POLICY "auth_write_promo_codes"  ON shop_promo_codes FOR ALL    USING (auth.role() = 'authenticated');

-- ─── 8. Valeurs par défaut dans settings ─────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('shop_status',         'active'),
  ('shop_cart_expiry',    '30'),
  ('shop_stocking_text',  'La boutique sera bientôt disponible 🚀'),
  ('shop_stocking_date',  ''),
  ('shop_stocking_image', '')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
