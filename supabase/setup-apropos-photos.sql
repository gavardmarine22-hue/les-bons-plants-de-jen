-- Table pour les photos multiples de la section À Propos
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS apropos_photos (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url   TEXT    NOT NULL DEFAULT '',
  offset_x    FLOAT   DEFAULT 0,
  offset_y    FLOAT   DEFAULT 0,
  rotation    FLOAT   DEFAULT 0,
  size        INTEGER DEFAULT 200,
  show_cadre  BOOLEAN DEFAULT true,
  cadre_color TEXT    DEFAULT '#1A1040',
  cadre_width INTEGER DEFAULT 4,
  show_contour  BOOLEAN DEFAULT false,
  contour_color TEXT  DEFAULT '#ffffff',
  show_fond   BOOLEAN DEFAULT false,
  fond_color  TEXT    DEFAULT '#ffffff',
  shape       TEXT    DEFAULT 'rounded-2xl',
  is_visible  BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  caption     TEXT    DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE apropos_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select apropos_photos"    ON apropos_photos;
DROP POLICY IF EXISTS "Authenticated write apropos_photos" ON apropos_photos;

CREATE POLICY "Public select apropos_photos"
  ON apropos_photos FOR SELECT USING (true);

CREATE POLICY "Authenticated write apropos_photos"
  ON apropos_photos FOR ALL USING (auth.role() = 'authenticated');

-- Migration optionnelle : si une photo existe déjà dans settings,
-- l'importer comme première entrée de la nouvelle table.
-- À décommenter si vous souhaitez récupérer l'ancienne photo :
--
-- INSERT INTO apropos_photos (image_url, size, rotation, is_visible, sort_order)
-- SELECT
--   s_url.value,
--   COALESCE(s_size.value::integer, 288),
--   COALESCE(s_rot.value::float,    0),
--   (COALESCE(s_vis.value, 'true') <> 'false'),
--   0
-- FROM settings s_url
-- LEFT JOIN settings s_size ON s_size.key = 'apropos_photo_size'
-- LEFT JOIN settings s_rot  ON s_rot.key  = 'apropos_photo_rotation'
-- LEFT JOIN settings s_vis  ON s_vis.key  = 'apropos_photo_visible'
-- WHERE s_url.key = 'apropos_photo_url' AND s_url.value <> ''
-- ON CONFLICT DO NOTHING;
