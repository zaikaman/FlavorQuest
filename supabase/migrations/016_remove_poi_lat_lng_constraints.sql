-- Migration: 016_remove_poi_lat_lng_constraints
-- Description: Remove hard-coded POI latitude/longitude bounds
-- Created: 2026-03-21

ALTER TABLE public.pois
DROP CONSTRAINT IF EXISTS pois_lat_check;

ALTER TABLE public.pois
DROP CONSTRAINT IF EXISTS pois_lng_check;

COMMENT ON COLUMN public.pois.lat IS 'Latitude in WGS84 format';
COMMENT ON COLUMN public.pois.lng IS 'Longitude in WGS84 format';
