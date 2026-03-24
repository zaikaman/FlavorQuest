-- Add 12 additional supported languages for POIs, tours, and analytics.

ALTER TABLE public.analytics_logs
  DROP CONSTRAINT IF EXISTS analytics_logs_language_check;

ALTER TABLE public.analytics_logs ADD CONSTRAINT analytics_logs_language_check CHECK (language::text = ANY (ARRAY['vi'::character varying, 'en'::character varying, 'zh'::character varying, 'es'::character varying, 'hi'::character varying, 'ar'::character varying, 'ja'::character varying, 'fr'::character varying, 'ko'::character varying, 'pt'::character varying, 'de'::character varying, 'ru'::character varying, 'id'::character varying, 'bn'::character varying, 'ur'::character varying, 'te'::character varying, 'mr'::character varying, 'tr'::character varying]::text[]));

ALTER TABLE public.pois
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS audio_url_es text,
  ADD COLUMN IF NOT EXISTS name_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS audio_url_hi text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS audio_url_ar text,
  ADD COLUMN IF NOT EXISTS name_pt text,
  ADD COLUMN IF NOT EXISTS description_pt text,
  ADD COLUMN IF NOT EXISTS audio_url_pt text,
  ADD COLUMN IF NOT EXISTS name_de text,
  ADD COLUMN IF NOT EXISTS description_de text,
  ADD COLUMN IF NOT EXISTS audio_url_de text,
  ADD COLUMN IF NOT EXISTS name_ru text,
  ADD COLUMN IF NOT EXISTS description_ru text,
  ADD COLUMN IF NOT EXISTS audio_url_ru text,
  ADD COLUMN IF NOT EXISTS name_id text,
  ADD COLUMN IF NOT EXISTS description_id text,
  ADD COLUMN IF NOT EXISTS audio_url_id text,
  ADD COLUMN IF NOT EXISTS name_bn text,
  ADD COLUMN IF NOT EXISTS description_bn text,
  ADD COLUMN IF NOT EXISTS audio_url_bn text,
  ADD COLUMN IF NOT EXISTS name_ur text,
  ADD COLUMN IF NOT EXISTS description_ur text,
  ADD COLUMN IF NOT EXISTS audio_url_ur text,
  ADD COLUMN IF NOT EXISTS name_te text,
  ADD COLUMN IF NOT EXISTS description_te text,
  ADD COLUMN IF NOT EXISTS audio_url_te text,
  ADD COLUMN IF NOT EXISTS name_mr text,
  ADD COLUMN IF NOT EXISTS description_mr text,
  ADD COLUMN IF NOT EXISTS audio_url_mr text,
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS description_tr text,
  ADD COLUMN IF NOT EXISTS audio_url_tr text;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS name_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS name_pt text,
  ADD COLUMN IF NOT EXISTS description_pt text,
  ADD COLUMN IF NOT EXISTS name_de text,
  ADD COLUMN IF NOT EXISTS description_de text,
  ADD COLUMN IF NOT EXISTS name_ru text,
  ADD COLUMN IF NOT EXISTS description_ru text,
  ADD COLUMN IF NOT EXISTS name_id text,
  ADD COLUMN IF NOT EXISTS description_id text,
  ADD COLUMN IF NOT EXISTS name_bn text,
  ADD COLUMN IF NOT EXISTS description_bn text,
  ADD COLUMN IF NOT EXISTS name_ur text,
  ADD COLUMN IF NOT EXISTS description_ur text,
  ADD COLUMN IF NOT EXISTS name_te text,
  ADD COLUMN IF NOT EXISTS description_te text,
  ADD COLUMN IF NOT EXISTS name_mr text,
  ADD COLUMN IF NOT EXISTS description_mr text,
  ADD COLUMN IF NOT EXISTS name_tr text,
  ADD COLUMN IF NOT EXISTS description_tr text;

COMMENT ON CONSTRAINT analytics_logs_language_check ON public.analytics_logs IS 'Supported customer languages for FlavorQuest analytics.';
