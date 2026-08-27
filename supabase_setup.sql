-- =============================================
-- SCRIPT DE CONFIGURATION SUPABASE
-- L'Atelier Créatif
-- Coller dans : Supabase > SQL Editor > New query
-- =============================================

-- 1. Table des ateliers
CREATE TABLE IF NOT EXISTS ateliers (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titre            text NOT NULL,
  description      text NOT NULL,
  date             date NOT NULL,
  heure            text NOT NULL,
  duree            text NOT NULL,
  lieu             text NOT NULL,
  prix             numeric(10,2) NOT NULL DEFAULT 0,
  places_max       integer NOT NULL DEFAULT 10,
  places_restantes integer NOT NULL DEFAULT 10,
  image_url        text,
  created_at       timestamptz DEFAULT now()
);

-- 2. Table des réservations
CREATE TABLE IF NOT EXISTS reservations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  atelier_id  uuid REFERENCES ateliers(id) ON DELETE CASCADE NOT NULL,
  nom         text NOT NULL,
  prenom      text NOT NULL,
  email       text NOT NULL,
  telephone   text,
  created_at  timestamptz DEFAULT now()
);

-- 3. Table du contenu des pages (textes éditables par l'admin)
CREATE TABLE IF NOT EXISTS page_content (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page       text NOT NULL,
  section    text NOT NULL,
  contenu    text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section)
);

-- =============================================
-- POLITIQUES DE SÉCURITÉ (RLS)
-- =============================================

-- Activer RLS sur chaque table
ALTER TABLE ateliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content  ENABLE ROW LEVEL SECURITY;

-- Ateliers : lecture publique, écriture admin uniquement
CREATE POLICY "Lecture publique des ateliers"
  ON ateliers FOR SELECT USING (true);

CREATE POLICY "Admin peut créer un atelier"
  ON ateliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin peut modifier un atelier"
  ON ateliers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admin peut supprimer un atelier"
  ON ateliers FOR DELETE
  TO authenticated
  USING (true);

-- Réservations : insertion publique, lecture admin uniquement
CREATE POLICY "Tout le monde peut réserver"
  ON reservations FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin peut lire les réservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour des places lors d'une réservation (public)
CREATE POLICY "Mise à jour des places publique"
  ON ateliers FOR UPDATE USING (true);

-- Page content : lecture publique, écriture admin
CREATE POLICY "Lecture publique du contenu"
  ON page_content FOR SELECT USING (true);

CREATE POLICY "Admin peut modifier le contenu"
  ON page_content FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- STORAGE : bucket pour les images
-- =============================================
-- Aller dans Supabase > Storage > New bucket
-- Nom : images
-- Public : OUI
-- Ou exécuter :
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Images publiques lisibles"
  ON storage.objects FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Admin peut uploader des images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Admin peut supprimer des images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
