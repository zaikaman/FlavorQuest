-- Migration: 007_create_tours
-- Description: Create tours table for admin-managed POI playlists
-- Created: 2026-03-12

CREATE TABLE public.tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_vi TEXT NOT NULL,
  name_en TEXT,
  name_ja TEXT,
  name_fr TEXT,
  name_ko TEXT,
  name_zh TEXT,
  description_vi TEXT,
  description_en TEXT,
  description_ja TEXT,
  description_fr TEXT,
  description_ko TEXT,
  description_zh TEXT,
  poi_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tours_poi_ids_not_empty CHECK (cardinality(poi_ids) > 0)
);

CREATE INDEX idx_tours_active ON public.tours(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_tours_created_at ON public.tours(created_at DESC);
CREATE INDEX idx_tours_deleted_at ON public.tours(deleted_at);

CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tours are publicly readable"
  ON public.tours
  FOR SELECT
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Authenticated users can insert tours"
  ON public.tours
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tours"
  ON public.tours
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tours"
  ON public.tours
  FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE public.tours
  ADD CONSTRAINT tours_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id);

COMMENT ON TABLE public.tours IS 'Admin-managed tour collections with ordered POI ids';
COMMENT ON COLUMN public.tours.poi_ids IS 'Ordered list of POI ids that belong to the tour';
COMMENT ON COLUMN public.tours.is_active IS 'Controls whether the tour is visible to customers';
