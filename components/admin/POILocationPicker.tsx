'use client';

import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_CENTER: Coordinates = { lat: 10.759, lng: 106.705 };
const DEFAULT_ZOOM = 17;

interface POILocationPickerProps {
  value: Coordinates;
  radius?: number | null;
  onChange: (coords: Coordinates) => void;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function createMarkerIcon() {
  return L.divIcon({
    className: 'poi-picker-marker',
    html: `
      <div class="poi-picker-marker-container">
        <div class="poi-picker-marker-icon">
          <span class="material-symbols-outlined">place</span>
        </div>
        <div class="poi-picker-marker-label">Vị trí POI</div>
      </div>
    `,
    iconSize: [92, 68],
    iconAnchor: [46, 60],
  });
}

export function POILocationPicker({ value, radius, onChange }: POILocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCenterRef = useRef<[number, number]>([
    Number.isFinite(value.lat) ? value.lat : DEFAULT_CENTER.lat,
    Number.isFinite(value.lng) ? value.lng : DEFAULT_CENTER.lng,
  ]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCenterRef.current,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const commitLocation = (lat: number, lng: number) => {
      onChangeRef.current({
        lat: roundCoordinate(lat),
        lng: roundCoordinate(lng),
      });
    };

    map.on('click', (event) => {
      commitLocation(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    map.whenReady(() => {
      setMapLoaded(true);
    });

    return () => {
      markerRef.current = null;
      radiusCircleRef.current = null;
      setMapLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;

    const nextLatLng: L.LatLngExpression = [value.lat, value.lng];

    if (!markerRef.current) {
      const marker = L.marker(nextLatLng, {
        draggable: true,
        icon: createMarkerIcon(),
      }).addTo(mapRef.current);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChangeRef.current({
          lat: roundCoordinate(position.lat),
          lng: roundCoordinate(position.lng),
        });
      });

      markerRef.current = marker;
      mapRef.current.setView(nextLatLng, Math.max(mapRef.current.getZoom(), DEFAULT_ZOOM), {
        animate: false,
      });
      return;
    }

    markerRef.current.setLatLng(nextLatLng);
  }, [mapLoaded, value.lat, value.lng]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;

    const nextLatLng: L.LatLngExpression = [value.lat, value.lng];
    const circleRadius = typeof radius === 'number' && radius > 0 ? radius : 20;

    if (!radiusCircleRef.current) {
      radiusCircleRef.current = L.circle(nextLatLng, {
        radius: circleRadius,
        color: '#f26c0d',
        fillColor: '#f26c0d',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(mapRef.current);
      return;
    }

    radiusCircleRef.current.setLatLng(nextLatLng);
    radiusCircleRef.current.setRadius(circleRadius);
  }, [mapLoaded, radius, value.lat, value.lng]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleCenterOnPin = () => {
    if (!mapRef.current || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;

    mapRef.current.flyTo([value.lat, value.lng], Math.max(mapRef.current.getZoom(), DEFAULT_ZOOM), {
      duration: 0.8,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">Chọn nhanh trên bản đồ</h4>
          <p className="max-w-xl text-sm text-gray-400">
            Chạm vào bản đồ hoặc kéo ghim đến đúng vị trí, rồi tinh chỉnh lại bằng tọa độ nếu cần.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCenterOnPin}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-[18px]">my_location</span>
          Căn giữa ghim
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1512]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3">
          <div>
            <p className="text-primary/80 text-xs tracking-[0.22em] uppercase">Map Preview</p>
            <p className="text-sm text-gray-300">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleZoomIn}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#342418]/90 text-white transition-colors hover:bg-[#453126]"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#342418]/90 text-white transition-colors hover:bg-[#453126]"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
        </div>

        <div className="relative h-[320px] w-full">
          <div ref={mapContainerRef} className="map-bg h-full w-full" />

          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1512]">
              <div className="flex flex-col items-center gap-3 text-white">
                <span className="material-symbols-outlined text-primary animate-spin text-4xl">
                  sync
                </span>
                <p className="text-sm text-gray-300">Đang tải bản đồ…</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .map-bg {
          background-color: #1a1512;
        }

        .poi-picker-marker {
          background: transparent !important;
          border: none !important;
          cursor: grab;
        }

        .poi-picker-marker:active {
          cursor: grabbing;
        }

        .poi-picker-marker-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .poi-picker-marker-icon {
          display: flex;
          height: 42px;
          width: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          background: #f26c0d;
          color: white;
          box-shadow: 0 0 20px rgba(242, 108, 13, 0.35);
        }

        .poi-picker-marker-icon .material-symbols-outlined {
          font-size: 22px;
        }

        .poi-picker-marker-label {
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.8);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          white-space: nowrap;
        }

        .leaflet-container {
          background: #1a1512;
          font-family: inherit;
        }

        .leaflet-control-attribution {
          display: none !important;
        }

        .leaflet-tile-pane {
          filter: sepia(10%) saturate(90%);
        }
      `}</style>
    </div>
  );
}
