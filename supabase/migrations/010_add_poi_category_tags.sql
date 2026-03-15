-- Migration: 010_add_poi_category_tags
-- Description: Add normalized category tags for customer tour filtering
-- Created: 2026-03-15

ALTER TABLE public.pois
ADD COLUMN IF NOT EXISTS category_tags text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.pois
DROP CONSTRAINT IF EXISTS pois_category_tags_check;

ALTER TABLE public.pois
ADD CONSTRAINT pois_category_tags_check
CHECK (
  category_tags <@ ARRAY['snails', 'seafood', 'grill']::text[]
);

CREATE INDEX IF NOT EXISTS idx_pois_category_tags
ON public.pois
USING gin (category_tags);

UPDATE public.pois
SET category_tags = ARRAY(
  SELECT DISTINCT tag
  FROM unnest(
    ARRAY[
      CASE
        WHEN concat_ws(' ', coalesce(name_vi, ''), coalesce(description_vi, ''), coalesce(signature_dish, ''), coalesce(name_en, ''), coalesce(description_en, '')) ~* '(ốc|snail|escargot|shellfish)'
          THEN 'snails'
        ELSE NULL
      END,
      CASE
        WHEN concat_ws(' ', coalesce(name_vi, ''), coalesce(description_vi, ''), coalesce(signature_dish, ''), coalesce(name_en, ''), coalesce(description_en, '')) ~* '(hải sản|seafood|fish|shrimp|prawn|crab|squid|octopus|clam|oyster|mussel)'
          THEN 'seafood'
        ELSE NULL
      END,
      CASE
        WHEN concat_ws(' ', coalesce(name_vi, ''), coalesce(description_vi, ''), coalesce(signature_dish, ''), coalesce(name_en, ''), coalesce(description_en, '')) ~* '(nướng|grill|grilled|bbq|barbecue|barbeque|roasted)'
          THEN 'grill'
        ELSE NULL
      END
    ]::text[]
  ) AS tag
  WHERE tag IS NOT NULL
)
WHERE category_tags = ARRAY[]::text[];
