import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useMemo } from 'react';
import { Map as MapLibreMap, Popup, LngLatBounds } from 'maplibre-gl';
import type { RedAlert } from '@shared/schema';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

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
      .filter(a => a.lat && a.lng)
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

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [35.2, 31.5],
      zoom: 7,
      attributionControl: false,
    });

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

        const popup = new Popup({ closeButton: true, maxWidth: '220px' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:monospace;font-size:12px;color:#fff;background:#1a1a2e;padding:8px;border-radius:6px;">
              <div style="font-weight:900;font-size:13px;color:${props.color};margin-bottom:4px;">${props.city}</div>
              <div style="color:#aaa;font-size:10px;margin-bottom:2px;">${props.region} · ${props.country}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
                <span style="background:${props.color}22;color:${props.color};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;border:1px solid ${props.color}44;">${props.threatType.replace(/_/g, ' ')}</span>
                ${props.source === 'live' ? '<span style="background:#10b98122;color:#10b981;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid #10b98144;">API</span>' : ''}
              </div>
              ${remaining > 0 ? `<div style="margin-top:6px;font-size:11px;color:#ef4444;font-weight:700;">⏱ ${mins}:${secs.toString().padStart(2, '0')} remaining</div>` : ''}
            </div>
          `)
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
        bounds.extend(f.geometry.coordinates as [number, number]);
      });
      map.fitBounds(bounds, { padding: 50, maxZoom: 10, duration: 1000 });
    }
  }, [geoJson]);

  return (
    <div ref={containerRef} className="w-full h-full" data-testid="alert-map-container" />
  );
}
