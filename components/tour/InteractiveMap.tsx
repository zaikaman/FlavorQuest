/**
 * Interactive Map Component
 * Bản đồ tương tác với style tùy chỉnh cho FlavorQuest
 * Based on design_template/interactive_street_map/code.html
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { POI, Coordinates } from '@/lib/types/index';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Dark map tile - CartoDB Dark Matter
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface InteractiveMapProps {
  userLocation: Coordinates | null;
  heading?: number | null;
  accuracy?: number | null;
  pois: POI[];
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI | null) => void;
  onPlayPOI: (poi: POI) => void;
  isOfflineReady?: boolean;
}

export function InteractiveMap({
  userLocation,
  heading,
  accuracy,
  pois,
  selectedPOI,
  onSelectPOI,
  onPlayPOI,
  isOfflineReady = false,
}: InteractiveMapProps) {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const poiMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Khởi tạo Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Tạo map với style tối
    const map = L.map(mapContainerRef.current, {
      center: userLocation 
        ? [userLocation.lat, userLocation.lng] 
        : [10.7610, 106.7040], // Vĩnh Khánh street - center of POIs
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Thêm dark tile layer
    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // Click vào map để deselect POI
    map.on('click', () => {
      onSelectPOI(null);
    });

    mapRef.current = map;
    setMapLoaded(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cập nhật vị trí người dùng
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !userLocation) return;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-dot-container">
          <div class="user-dot-ping"></div>
          <div class="user-dot"></div>
          <div class="user-heading-cone" style="transform: rotate(${(heading || 0) - 90}deg)"></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!userMarkerRef.current) {
      // Tạo marker mới
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(mapRef.current);

      // Accuracy circle
      if (accuracy) {
        userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(mapRef.current);
      }
    } else {
      // Cập nhật vị trí
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      userMarkerRef.current.setIcon(userIcon);

      if (userCircleRef.current && accuracy) {
        userCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userCircleRef.current.setRadius(accuracy);
      }
    }
  }, [userLocation, heading, accuracy, mapLoaded]);

  // Cập nhật POI markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Xóa markers cũ không còn trong danh sách
    poiMarkersRef.current.forEach((marker, id) => {
      if (!pois.find(p => p.id === id)) {
        marker.remove();
        poiMarkersRef.current.delete(id);
      }
    });

    // Thêm hoặc cập nhật markers
    pois.forEach((poi) => {
      const localizedPOI = getLocalizedPOI(poi, language);
      const isSelected = selectedPOI?.id === poi.id;

      const poiIcon = L.divIcon({
        className: `poi-marker ${isSelected ? 'selected' : ''}`,
        html: `
          <div class="poi-marker-container ${isSelected ? 'selected' : ''}">
            <div class="poi-marker-icon">
              <span class="material-symbols-outlined">restaurant</span>
            </div>
            <div class="poi-marker-label">${localizedPOI.name}</div>
          </div>
        `,
        iconSize: isSelected ? [100, 60] : [80, 50],
        iconAnchor: isSelected ? [50, 50] : [40, 45],
      });

      if (!poiMarkersRef.current.has(poi.id)) {
        // Tạo marker mới
        const marker = L.marker([poi.lat, poi.lng], {
          icon: poiIcon,
        }).addTo(mapRef.current!);

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectPOI(poi);
        });

        poiMarkersRef.current.set(poi.id, marker);
      } else {
        // Cập nhật marker có sẵn
        const marker = poiMarkersRef.current.get(poi.id)!;
        marker.setIcon(poiIcon);
      }
    });

    // Fit bounds to show all POIs if this is first load
    if (pois.length > 0 && poiMarkersRef.current.size === pois.length) {
      const bounds = L.latLngBounds(pois.map(p => [p.lat, p.lng]));
      // Only fit if user location is not set (first time)
      if (!userLocation) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [pois, selectedPOI, mapLoaded, language, onSelectPOI, userLocation]);

  // Center map on user
  const handleCenterOnUser = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 17, {
        duration: 1,
      });
    }
  }, [userLocation]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  // Tính khoảng cách đến POI
  const getDistanceToPOI = (poi: POI): number | null => {
    if (!userLocation) return null;
    const R = 6371e3; // meters
    const φ1 = userLocation.lat * Math.PI / 180;
    const φ2 = poi.lat * Math.PI / 180;
    const Δφ = (poi.lat - userLocation.lat) * Math.PI / 180;
    const Δλ = (poi.lng - userLocation.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full map-bg z-1"
      />

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-dark">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
            <p className="text-white">Đang tải bản đồ...</p>
          </div>
        </div>
      )}



      {/* Right Side Controls */}
      <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 pointer-events-none">
        {/* Zoom Controls */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-[#342418]/90 backdrop-blur shadow-lg pointer-events-auto border border-white/5">
          <button 
            onClick={handleZoomIn}
            className="flex h-10 w-10 items-center justify-center text-white hover:bg-white/10 rounded-t-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
          <div className="h-px w-full bg-white/10"></div>
          <button 
            onClick={handleZoomOut}
            className="flex h-10 w-10 items-center justify-center text-white hover:bg-white/10 rounded-b-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">remove</span>
          </button>
        </div>

        {/* Center on User Button */}
        <button 
          onClick={handleCenterOnUser}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
      </div>

      {/* Selected POI Card */}
      {selectedPOI && (
        <div className="absolute bottom-20 left-4 right-4 z-20 animate-slideInUp">
          <div className="relative flex items-center gap-4 rounded-xl bg-[#2a1e16]/95 backdrop-blur-xl border border-white/5 p-3 shadow-2xl ring-1 ring-black/20">
            {/* Close Button */}
            <button 
              onClick={() => onSelectPOI(null)}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#493222] text-white shadow border border-white/10 hover:bg-[#5a4030] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>

            {/* POI Image */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-700 relative shadow-inner">
              {selectedPOI.image_url ? (
                <img 
                  src={selectedPOI.image_url} 
                  alt={getLocalizedPOI(selectedPOI, language).name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#3a2d25]">
                  <span className="material-symbols-outlined text-primary text-2xl">restaurant</span>
                </div>
              )}
            </div>

            {/* POI Content */}
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white text-base font-bold leading-tight truncate">
                  {getLocalizedPOI(selectedPOI, language).name}
                </h3>
                {selectedPOI.priority && selectedPOI.priority <= 3 && (
                  <span className="flex h-5 items-center rounded bg-primary/20 px-1.5 text-[10px] font-bold text-primary uppercase">
                    No. {selectedPOI.priority}
                  </span>
                )}
              </div>
              <p className="text-[#cba990] text-xs font-normal leading-relaxed truncate mt-0.5">
                Ẩm thực • {getDistanceToPOI(selectedPOI)}m
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {selectedPOI.signature_dish && (
                  <span className="text-[10px] text-[#cba990] truncate max-w-[150px]">
                    {selectedPOI.signature_dish}
                  </span>
                )}
              </div>
            </div>

            {/* Play Button */}
            <button 
              onClick={() => onPlayPOI(selectedPOI)}
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all active:scale-95 hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[28px] ml-0.5 group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            </button>
          </div>
        </div>
      )}

      {/* CSS Styles for Map Markers */}
      <style jsx global>{`
        /* Map background fallback */
        .map-bg {
          background-color: #1a1512;
        }

        /* User Location Marker */
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }

        .user-dot-container {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-dot {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 0 3px white, 0 2px 8px rgba(0,0,0,0.3);
          z-index: 2;
          position: relative;
        }

        .user-dot-ping {
          position: absolute;
          width: 48px;
          height: 48px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          top: 0;
          left: 0;
        }

        .user-heading-cone {
          position: absolute;
          top: -10px;
          left: 50%;
          width: 40px;
          height: 30px;
          margin-left: -20px;
          background: linear-gradient(to top, rgba(59, 130, 246, 0.4), transparent);
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          transform-origin: bottom center;
          filter: blur(2px);
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        /* POI Markers */
        .poi-marker {
          background: transparent !important;
          border: none !important;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .poi-marker:hover {
          transform: scale(1.1);
        }

        .poi-marker.selected {
          z-index: 100 !important;
        }

        .poi-marker-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.2s ease;
        }

        .poi-marker-icon {
          width: 32px;
          height: 32px;
          background: rgba(242, 108, 13, 0.2);
          backdrop-filter: blur(8px);
          border: 1px solid #f26c0d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f26c0d;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .poi-marker-icon .material-symbols-outlined {
          font-size: 16px;
        }

        .poi-marker-container.selected .poi-marker-icon {
          width: 40px;
          height: 40px;
          background: #f26c0d;
          color: white;
          border: 2px solid white;
          box-shadow: 0 0 15px rgba(242, 108, 13, 0.5);
        }

        .poi-marker-container.selected .poi-marker-icon .material-symbols-outlined {
          font-size: 20px;
        }

        .poi-marker-label {
          margin-top: 4px;
          padding: 2px 8px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Hide labels for non-selected markers on mobile */
        @media (max-width: 640px) {
          .poi-marker-container:not(.selected) .poi-marker-label {
            display: none;
          }
        }

        /* Leaflet overrides */
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
