-- ══════════════════════════════════════════════════════
-- Table FACTURES — Les plants de Jenni
-- Exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════

-- Table principale
CREATE TABLE IF NOT EXISTS factures (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  numero           TEXT         UNIQUE NOT NULL,
  type             TEXT         NOT NULL CHECK (type IN ('facture', 'avoir')),
  reference_facture TEXT,        -- pour un avoir : numéro de la facture originale
  reservation_id   UUID,         -- référence souple (pas de FK pour tolérer les suppressions)
  atelier_titre    TEXT,
  atelier_date     TEXT,
  client_nom       TEXT         NOT NULL,
  client_prenom    TEXT         NOT NULL,
  client_email     TEXT,
  client_telephone TEXT,
  description      TEXT         NOT NULL,
  quantite         INTEGER      DEFAULT 1 NOT NULL,
  prix_unitaire    DECIMAL(10,2) NOT NULL,
  montant_total    DECIMAL(10,2) NOT NULL,
  mode_paiement    TEXT,
  stripe_payment_id TEXT,
  created_at       TIMESTAMPTZ  DEFAULT now() NOT NULL
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_factures_type       ON factures(type);
CREATE INDEX IF NOT EXISTS idx_factures_created_at ON factures(created_at);
CREATE INDEX IF NOT EXISTS idx_factures_reservation ON factures(reservation_id);

-- Fonction de numérotation séquentielle par année
-- FAC-2026-001, FAC-2026-002 … / AV-2026-001, AV-2026-002 …
CREATE OR REPLACE FUNCTION next_document_numero(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year   TEXT    := to_char(now(), 'YYYY');
  v_prefix TEXT    := CASE p_type WHEN 'avoir' THEN 'AV' ELSE 'FAC' END;
  v_count  INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(numero, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO v_count
  FROM factures
  WHERE type = p_type
    AND to_char(created_at, 'YYYY') = v_year;

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

-- Accès en lecture pour les anon (lecture publique désactivée)
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

-- Seule la service_role (Edge Functions) peut lire/écrire
CREATE POLICY "service_role_only" ON factures
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
