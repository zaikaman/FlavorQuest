-- Migration: 017_drop_poi_priority
-- Description: Remove manual POI priority to keep POI ordering neutral and objective
-- Created: 2026-03-24

DROP INDEX IF EXISTS public.idx_pois_priority;

ALTER TABLE public.pois
  DROP CONSTRAINT IF EXISTS pois_priority_check;

ALTER TABLE public.pois
  DROP COLUMN IF EXISTS priority;
