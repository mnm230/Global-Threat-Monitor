import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useMemo } from 'react';
import { Map as MapLibreMap, Popup, LngLatBounds } from 'maplibre-gl';
import type { RedAlert } from '@shared/schema';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Constrain the alert map to Middle East / MENA only — no Ukraine, no Europe
const ME_BOUNDS: [[number, number], [number, number]] = [
  [24.0, 10.0],  // SW: western Egypt / Sudan
  [65.0, 42.0],  // NE: Iran / Afghanistan border
];

const MIDDLE_EAST_COUNTRIES = new Set([
  'Israel', 'Palestine', 'Gaza', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran',
  'Saudi Arabia', 'Yemen', 'Oman', 'UAE', 'Qatar', 'Bahrain', 'Kuwait',
  'Egypt', 'Libya', 'Turkey', 'Cyprus', 'Armenia', 'Azerbaijan',
]);

const THREAT_COLORS: Record<string, string> = {
  rockets: '#ef4444',
  missiles: '#f97316',
  uav_intrusion: '#22d3ee',
  hostile_aircraft_intrusion: '#a855f7',
};

export default function AlertMap({
  alerts,
  language,
}: {
  alerts: RedAlert[];
  language: 'en' | 'ar';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const markersLayerAdded = useRef(false);

  const geoJson = useMemo(() => {
    const features = alerts
      .filter(a => {
        if (!a.lat || !a.lng) return false;
        // Keep only Middle East / MENA coordinates
        if (a.lng < ME_BOUNDS[0][0] || a.lng > ME_BOUNDS[1][0]) return false;
        if (a.lat < ME_BOUNDS[0][1] || a.lat > ME_BOUNDS[1][1]) return false;
        if (a.country && !MIDDLE_EAST_COUNTRIES.has(a.country)) return false;
        return true;
      })
      .map(a => {
        const elapsed = (Date.now() - new Date(a.timestamp).getTime()) / 1000;
        const isActive = elapsed < a.countdown || a.countdown === 0;
        const color = THREAT_COLORS[a.threatType] || '#ef4444';
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
          properties: {
            id: a.id,
            city: language === 'ar' ? a.cityAr : a.city,
            cityHe: a.cityHe,
            country: a.country,
            threatType: a.threatType,
            color,
            isActive,
            countdown: a.countdown,
            timestamp: a.timestamp,
            region: a.region,
            source: a.source || 'sim',
          },
        };
      });
    return { type: 'FeatureCollection' as const, features };
  }, [alerts, language]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [35.2, 31.5],
        zoom: 7,
        maxBounds: ME_BOUNDS,
        attributionControl: { compact: true, customAttribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
      });
    } catch (err) {
      console.warn('[AlertMap] WebGL init failed:', err);
      return;
    }

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('alerts', {
        type: 'geojson',
        data: geoJson as any,
      });

      map.addLayer({
        id: 'alerts-heatmap',
        type: 'heatmap',
        source: 'alerts',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 0.8,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.6,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(239,68,68,0.2)',
            0.4, 'rgba(239,68,68,0.4)',
            0.6, 'rgba(249,115,22,0.6)',
            0.8, 'rgba(234,179,8,0.8)',
            1, 'rgba(255,255,255,0.9)',
          ],
        },
      });

      map.addLayer({
        id: 'alerts-glow',
        type: 'circle',
        source: 'alerts',
        paint: {
          'circle-radius': 18,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      });

      map.addLayer({
        id: 'alerts-points',
        type: 'circle',
        source: 'alerts',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.4,
        },
      });

      map.addLayer({
        id: 'alerts-labels',
        type: 'symbol',
        source: 'alerts',
        layout: {
          'text-field': ['get', 'city'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-font': ['Open Sans Regular'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': 0.8,
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });

      markersLayerAdded.current = true;

      map.on('click', 'alerts-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const coords = (f.geometry as any).coordinates.slice();
        const props = f.properties;

        if (popupRef.current) popupRef.current.remove();

        const elapsed = Math.floor((Date.now() - new Date(props.timestamp).getTime()) / 1000);
        const remaining = Math.max(0, props.countdown - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;

        const container = document.createElement('div');
        Object.assign(container.style, { fontFamily: 'monospace', fontSize: '12px', color: '#fff', background: '#1a1a2e', padding: '8px', borderRadius: '6px' });

        const cityEl = document.createElement('div');
        Object.assign(cityEl.style, { fontWeight: '900', fontSize: '13px', color: props.color, marginBottom: '4px' });
        cityEl.textContent = props.city;
        container.appendChild(cityEl);

        const regionEl = document.createElement('div');
        Object.assign(regionEl.style, { color: '#aaa', fontSize: '10px', marginBottom: '2px' });
        regionEl.textContent = `${props.region} · ${props.country}`;
        container.appendChild(regionEl);

        const badgeRow = document.createElement('div');
        Object.assign(badgeRow.style, { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' });
        const threatBadge = document.createElement('span');
        Object.assign(threatBadge.style, { background: `${props.color}22`, color: props.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', border: `1px solid ${props.color}44` });
        threatBadge.textContent = (props.threatType || '').replace(/_/g, ' ');
        badgeRow.appendChild(threatBadge);
        if (props.source === 'live') {
          const apiBadge = document.createElement('span');
          Object.assign(apiBadge.style, { background: '#10b98122', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', border: '1px solid #10b98144' });
          apiBadge.textContent = 'API';
          badgeRow.appendChild(apiBadge);
        }
        container.appendChild(badgeRow);

        if (remaining > 0) {
          const timerEl = document.createElement('div');
          Object.assign(timerEl.style, { marginTop: '6px', fontSize: '11px', color: '#ef4444', fontWeight: '700' });
          timerEl.textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')} remaining`;
          container.appendChild(timerEl);
        }

        const popup = new Popup({ closeButton: true, maxWidth: '220px' })
          .setLngLat(coords)
          .setDOMContent(container)
          .addTo(map);
        popupRef.current = popup;
      });

      map.on('mouseenter', 'alerts-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'alerts-points', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersLayerAdded.current) return;

    const source = map.getSource('alerts') as any;
    if (source) {
      source.setData(geoJson);
    }

    if (geoJson.features.length > 0) {
      const bounds = new LngLatBounds();
      geoJson.features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates as [number, number];
        // Only extend bounds if coordinate is within Middle East region
        if (lng >= ME_BOUNDS[0][0] && lng <= ME_BOUNDS[1][0] && lat >= ME_BOUNDS[0][1] && lat <= ME_BOUNDS[1][1]) {
          bounds.extend([lng, lat]);
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 10, minZoom: 5, duration: 1000 });
      }
    }
  }, [geoJson]);

  return (
    <div ref={containerRef} className="w-full h-full" data-testid="alert-map-container" />
  );
}
