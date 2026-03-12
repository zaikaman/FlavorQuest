-- Migration: 008_add_tour_media_and_analytics_metadata
-- Description: Add cover image and duration to tours, plus analytics metadata for per-tour reporting
-- Created: 2026-03-12

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration_min INTEGER;

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_estimated_duration_min_check;

ALTER TABLE public.tours
  ADD CONSTRAINT tours_estimated_duration_min_check
  CHECK (
    estimated_duration_min IS NULL
    OR (estimated_duration_min >= 1 AND estimated_duration_min <= 1440)
  );

ALTER TABLE public.analytics_logs
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_tours_duration ON public.tours(estimated_duration_min) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_metadata_tour_id ON public.analytics_logs ((metadata->>'tour_id')) WHERE metadata ? 'tour_id';

COMMENT ON COLUMN public.tours.cover_image_url IS 'Cover image URL displayed in customer tour selector';
COMMENT ON COLUMN public.tours.estimated_duration_min IS 'Estimated duration of the tour in minutes';
COMMENT ON COLUMN public.analytics_logs.metadata IS 'Flexible JSON metadata for analytics dimensions such as selected tour';
