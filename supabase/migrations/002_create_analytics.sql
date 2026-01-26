-- Migration: 002_create_analytics
-- Description: Create analytics_logs table for tracking user events
-- Created: 2026-01-26

-- ============================================
-- Analytics Logs Table
-- ============================================
CREATE TABLE analytics_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key to POI (nullable for non-POI events)
  poi_id UUID REFERENCES pois(id) ON DELETE SET NULL,
  
  -- Session tracking (client-generated UUID)
  session_id UUID NOT NULL,
  
  -- Privacy-protected location (rounded to 3 decimal places ≈ 111m accuracy)
  rounded_lat DOUBLE PRECISION,
  rounded_lng DOUBLE PRECISION,
  
  -- User language
  language VARCHAR(5) CHECK (language IN ('vi', 'en', 'ja', 'fr', 'ko', 'zh')),
  
  -- Event type
  event_type VARCHAR(20) NOT NULL CHECK (
    event_type IN ('tour_start', 'tour_end', 'auto_play', 'manual_play', 'skip', 'settings_change')
  ),
  
  -- Audio metrics (nullable for non-audio events)
  listen_duration INTEGER CHECK (listen_duration >= 0),
  completed BOOLEAN,
  
  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User agent for analytics
  user_agent TEXT
);

-- ============================================
-- Indexes
-- ============================================

-- Index cho POI analytics queries
CREATE INDEX idx_analytics_poi_id ON analytics_logs(poi_id) WHERE poi_id IS NOT NULL;

-- Index cho timestamp range queries
CREATE INDEX idx_analytics_timestamp ON analytics_logs(timestamp DESC);

-- Index cho session tracking
CREATE INDEX idx_analytics_session ON analytics_logs(session_id);

-- Index cho event type filtering
CREATE INDEX idx_analytics_event_type ON analytics_logs(event_type);

-- Composite index cho POI + timestamp queries (admin analytics)
CREATE INDEX idx_analytics_poi_timestamp ON analytics_logs(poi_id, timestamp DESC) WHERE poi_id IS NOT NULL;

-- Index cho language analytics
CREATE INDEX idx_analytics_language ON analytics_logs(language) WHERE language IS NOT NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on analytics_logs table
ALTER TABLE analytics_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert analytics logs (privacy-first, no auth required)
-- This allows anonymous tour users to log events
CREATE POLICY "Anyone can insert analytics logs"
  ON analytics_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only authenticated users can read analytics logs
-- (Will be restricted to admins in application logic)
CREATE POLICY "Authenticated users can read analytics logs"
  ON analytics_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: No updates or deletes allowed (append-only table for data integrity)
-- Analytics logs should never be modified or deleted

-- ============================================
-- Functions for Analytics Queries
-- ============================================

-- Function: Get POI analytics summary
CREATE OR REPLACE FUNCTION get_poi_analytics(poi_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_plays BIGINT,
  unique_sessions BIGINT,
  avg_listen_duration NUMERIC,
  completion_rate NUMERIC,
  language_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type IN ('auto_play', 'manual_play')) AS total_plays,
    COUNT(DISTINCT session_id) AS unique_sessions,
    ROUND(AVG(listen_duration) FILTER (WHERE listen_duration IS NOT NULL), 2) AS avg_listen_duration,
    ROUND(
      COUNT(*) FILTER (WHERE completed = true)::NUMERIC / 
      NULLIF(COUNT(*) FILTER (WHERE completed IS NOT NULL), 0) * 100,
      2
    ) AS completion_rate,
    (
      SELECT jsonb_object_agg(language, count)
      FROM (
        SELECT language, COUNT(*) as count
        FROM analytics_logs
        WHERE poi_id = poi_uuid
          AND language IS NOT NULL
          AND timestamp >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY language
      ) lang_stats
    ) AS language_breakdown
  FROM analytics_logs
  WHERE poi_id = poi_uuid
    AND timestamp >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get overall tour analytics
CREATE OR REPLACE FUNCTION get_tour_analytics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_sessions BIGINT,
  total_plays BIGINT,
  avg_session_duration NUMERIC,
  popular_pois JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT session_id) AS total_sessions,
    COUNT(*) FILTER (WHERE event_type IN ('auto_play', 'manual_play')) AS total_plays,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (
          MAX(timestamp) FILTER (WHERE event_type = 'tour_end') - 
          MIN(timestamp) FILTER (WHERE event_type = 'tour_start')
        ))
      ) / 60,
      2
    ) AS avg_session_duration,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'poi_id', poi_id,
          'play_count', play_count
        ) ORDER BY play_count DESC
      )
      FROM (
        SELECT poi_id, COUNT(*) as play_count
        FROM analytics_logs
        WHERE poi_id IS NOT NULL
          AND event_type IN ('auto_play', 'manual_play')
          AND timestamp >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY poi_id
        ORDER BY play_count DESC
        LIMIT 10
      ) top_pois
    ) AS popular_pois
  FROM analytics_logs
  WHERE timestamp >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE analytics_logs IS 'Privacy-first analytics logs for tour usage tracking';
COMMENT ON COLUMN analytics_logs.rounded_lat IS 'Latitude rounded to 3 decimals (~111m accuracy) for privacy';
COMMENT ON COLUMN analytics_logs.rounded_lng IS 'Longitude rounded to 3 decimals for privacy';
COMMENT ON COLUMN analytics_logs.session_id IS 'Client-generated session UUID (persisted in sessionStorage)';
COMMENT ON COLUMN analytics_logs.listen_duration IS 'Audio listen duration in seconds (NULL for non-audio events)';
COMMENT ON COLUMN analytics_logs.completed IS 'Did user listen to completion? (NULL for non-audio events)';
