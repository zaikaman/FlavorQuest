-- Migration: 001_create_pois
-- Description: Create POIs (Points of Interest) table for Vĩnh Khánh food street
-- Created: 2026-01-26

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geospatial queries (optional, using lat/lng for simplicity)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- POI Table
-- ============================================
CREATE TABLE pois (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Geolocation (WGS84 format)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL DEFAULT 20,
  priority INTEGER NOT NULL DEFAULT 5,
  
  -- Multi-language name fields (required: vi, en)
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT,
  name_fr TEXT,
  name_ko TEXT,
  name_zh TEXT,
  
  -- Multi-language description fields (for TTS fallback)
  description_vi TEXT,
  description_en TEXT,
  description_ja TEXT,
  description_fr TEXT,
  description_ko TEXT,
  description_zh TEXT,
  
  -- Multi-language audio URLs (MP3, 64kbps)
  audio_url_vi TEXT,
  audio_url_en TEXT,
  audio_url_ja TEXT,
  audio_url_fr TEXT,
  audio_url_ko TEXT,
  audio_url_zh TEXT,
  
  -- Media & metadata
  image_url TEXT,
  signature_dish TEXT,
  fun_fact TEXT,
  estimated_hours TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT pois_lat_check CHECK (lat BETWEEN 10.750 AND 10.765),
  CONSTRAINT pois_lng_check CHECK (lng BETWEEN 106.690 AND 106.710),
  CONSTRAINT pois_radius_check CHECK (radius BETWEEN 1 AND 100),
  CONSTRAINT pois_priority_check CHECK (priority BETWEEN 1 AND 10)
);

-- ============================================
-- Indexes
-- ============================================

-- Index cho location queries (không bao gồm soft-deleted POIs)
CREATE INDEX idx_pois_location ON pois(lat, lng) WHERE deleted_at IS NULL;

-- Index cho priority sorting
CREATE INDEX idx_pois_priority ON pois(priority DESC) WHERE deleted_at IS NULL;

-- Index cho created_at (admin list POIs)
CREATE INDEX idx_pois_created_at ON pois(created_at DESC);

-- Index cho deleted_at (soft delete queries)
CREATE INDEX idx_pois_deleted_at ON pois(deleted_at);

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pois_updated_at
  BEFORE UPDATE ON pois
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on pois table
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active POIs (not soft-deleted)
CREATE POLICY "POIs are publicly readable"
  ON pois
  FOR SELECT
  USING (deleted_at IS NULL);

-- Policy: Only authenticated users can insert POIs
-- (Will be restricted to admins in application logic)
CREATE POLICY "Authenticated users can insert POIs"
  ON pois
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update POIs
-- (Will be restricted to admins in application logic)
CREATE POLICY "Authenticated users can update POIs"
  ON pois
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can delete POIs (soft delete)
-- (Will be restricted to admins in application logic)
CREATE POLICY "Authenticated users can delete POIs"
  ON pois
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE pois IS 'Points of Interest (POIs) for Vĩnh Khánh food street tour';
COMMENT ON COLUMN pois.lat IS 'Latitude in WGS84 format (10.750-10.765 for Vĩnh Khánh area)';
COMMENT ON COLUMN pois.lng IS 'Longitude in WGS84 format (106.690-106.710 for Vĩnh Khánh area)';
COMMENT ON COLUMN pois.radius IS 'Geofence radius in meters (1-100m, default 20m)';
COMMENT ON COLUMN pois.priority IS 'Priority ranking 1-10 (higher = more important, default 5)';
COMMENT ON COLUMN pois.deleted_at IS 'Soft delete timestamp (NULL = active, NOT NULL = deleted)';
