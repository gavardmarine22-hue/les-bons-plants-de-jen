-- Ajout de la colonne stripe_payment_intent_id sur la table reservations
-- Exécuter dans Supabase → SQL Editor

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
