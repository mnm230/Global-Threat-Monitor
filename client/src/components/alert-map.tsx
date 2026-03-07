import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useMemo, useState } from 'react';
import { Map as MapLibreMap, Popup, LngLatBounds } from 'maplibre-gl';
import type { RedAlert } from '@shared/schema';

const MAP_THEMES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const;
type MapTheme = keyof typeof MAP_THEMES;

// Expanded bounds to fully cover GCC (Oman east tip) + Iran + Lebanon
const ME_BOUNDS: [[number, number], [number, number]] = [
  [22.0, 8.0],   // SW: western Egypt / south Yemen
  [68.0, 44.0],  // NE: eastern Iran / Armenia
];

const MIDDLE_EAST_COUNTRIES = new Set([
  'Israel', 'Palestine', 'Gaza', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran',
  'Saudi Arabia', 'Yemen', 'Oman', 'UAE', 'Qatar', 'Bahrain', 'Kuwait',
  'Egypt', 'Libya', 'Turkey', 'Cyprus', 'Armenia', 'Azerbaijan',
]);

// GCC member states for region colouring
const GCC_COUNTRIES = new Set(['Saudi Arabia', 'UAE', 'Qatar', 'Bahrain', 'Kuwait', 'Oman']);

const THREAT_COLORS: Record<string, string> = {
  rockets: '#dc2626',
  missiles: '#ea580c',
  uav_intrusion: '#0891b2',
  hostile_aircraft_intrusion: '#7c3aed',
  ballistic_missile: '#f97316',
  cruise_missile: '#f59e0b',
  drone_swarm: '#06b6d4',
};

// Region quick-navigation presets
const REGIONS = [
  { id: 'all',        label: 'All',        center: [46.0, 28.0] as [number, number], zoom: 4.2 },
  { id: 'levant',     label: 'Levant',     center: [35.8, 32.5] as [number, number], zoom: 6.5 },
  { id: 'lebanon',    label: 'Lebanon',    center: [35.5, 33.8] as [number, number], zoom: 8.0 },
  { id: 'gcc',        label: 'GCC',        center: [50.0, 24.5] as [number, number], zoom: 5.5 },
  { id: 'iran',       label: 'Iran',       center: [53.5, 32.5] as [number, number], zoom: 5.0 },
  { id: 'iraq',       label: 'Iraq',       center: [43.5, 33.0] as [number, number], zoom: 6.0 },
] as const;

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

export default function AlertMap({ alerts, language }: { alerts: RedAlert[]; language: 'en' | 'ar' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const layersAddedRef = useRef(false);
  const hasFittedRef = useRef(false);
  const popupRef = useRef<Popup | null>(null);
  const geoJsonRef = useRef<{ type: 'FeatureCollection'; features: any[] } | null>(null);

  const [theme, setTheme] = useState<MapTheme>('light');
  const [activeRegion, setActiveRegion] = useState<string>('all');

  const geoJson = useMemo(() => {
    const now = Date.now();
    const features = alerts
      .filter(a => {
        if (!a.lat || !a.lng) return false;
        if (a.lng < ME_BOUNDS[0][0] || a.lng > ME_BOUNDS[1][0]) return false;
        if (a.lat < ME_BOUNDS[0][1] || a.lat > ME_BOUNDS[1][1]) return false;
        if (a.country && !MIDDLE_EAST_COUNTRIES.has(a.country)) return false;
        return true;
      })
      .map(a => {
        const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
        const isActive = elapsed < a.countdown || a.countdown === 0;
        const color = THREAT_COLORS[a.threatType] || '#dc2626';
        // Tag each alert with its geopolitical group for UI display
        const countryGroup = GCC_COUNTRIES.has(a.country || '')
          ? 'gcc'
          : a.country === 'Lebanon' ? 'lebanon'
          : a.country === 'Iran' ? 'iran'
          : a.country === 'Iraq' ? 'iraq'
          : (a.country === 'Israel' || a.country === 'Palestine' || a.country === 'Gaza') ? 'levant'
          : 'other';
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
          properties: {
            id: a.id,
            city: language === 'ar' ? a.cityAr : a.city,
            country: a.country,
            countryGroup,
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

  // Keep ref current so style.load handler can access latest data
  useEffect(() => {
    geoJsonRef.current = geoJson;
  }, [geoJson]);

  // Separate helper — adds all sources/layers/events to a freshly styled map
  const setupLayers = (map: MapLibreMap) => {
    if (map.getSource('alerts')) return;
    map.addSource('alerts', {
      type: 'geojson',
      data: geoJsonRef.current ?? { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 38,
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'alerts',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#ef4444', 5, '#dc2626', 15, '#b91c1c'],
        'circle-radius': ['step', ['get', 'point_count'], 14, 5, 18, 15, 22],
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.7,
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'alerts',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addLayer({
      id: 'alerts-inactive',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], false]],
      paint: {
        'circle-radius': 5,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.55,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.5,
      },
    });

    map.addLayer({
      id: 'alerts-active',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      paint: {
        'circle-radius': 9,
        'circle-color': ['get', 'color'],
        'circle-opacity': 1,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
      },
    });

    map.addLayer({
      id: 'alerts-labels',
      type: 'symbol',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      layout: {
        'text-field': ['get', 'city'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#111111',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
        'text-opacity': 0.9,
      },
    });

    layersAddedRef.current = true;

    // Zoom into cluster on click
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      (map.getSource('alerts') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
      });
    });

    const pointLayers = ['alerts-active', 'alerts-inactive'];
    pointLayers.forEach(layer => {
      map.on('click', layer, (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = (f.geometry as any).coordinates.slice();
        const props = f.properties;
        popupRef.current?.remove();

        const elapsed = Math.floor((Date.now() - new Date(props.timestamp).getTime()) / 1000);
        const remaining = Math.max(0, props.countdown - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const threatLabel = (props.threatType || '').replace(/_/g, ' ').toUpperCase();
        const groupLabel: Record<string, string> = {
          gcc: '🛡 GCC', lebanon: '🇱🇧 Lebanon', iran: '🇮🇷 Iran',
          iraq: '🇮🇶 Iraq', levant: '✡ Levant', other: '🌍 Region',
        };
        const groupBadge = groupLabel[props.countryGroup] || props.country || '';

        const html = `
          <div style="font-family:monospace;font-size:12px;color:#1a1a1a;background:#ffffff;padding:10px 12px;border-radius:8px;min-width:185px;border:2px solid ${props.color};box-shadow:0 4px 20px rgba(0,0,0,0.15)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <div style="font-weight:900;font-size:14px;color:${props.color}">${props.city || '—'}</div>
              <span style="font-size:9px;font-weight:800;color:#666;background:#f3f4f6;padding:1px 5px;border-radius:3px">${groupBadge}</span>
            </div>
            <div style="color:#888;font-size:10px;margin-bottom:8px">${[props.region, props.country].filter(Boolean).join(' · ')}</div>
            <span style="background:${props.color};color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800">${threatLabel}</span>
            ${props.source === 'live' ? '<span style="margin-left:5px;background:#dcfce7;color:#16a34a;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid #bbf7d0">LIVE</span>' : ''}
            ${remaining > 0 ? `<div style="margin-top:7px;font-size:11px;color:#dc2626;font-weight:700">⏱ ${mins > 0 ? `${mins}m ` : ''}${secs}s left</div>` : ''}
          </div>`;

        popupRef.current = new Popup({ closeButton: false, maxWidth: '260px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: [...pointLayers, 'clusters'] });
      if (!hit.length) popupRef.current?.remove();
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_THEMES[theme],
        // Start wide enough to show Lebanon, GCC, and Iran simultaneously
        center: [46.0, 28.0],
        zoom: IS_MOBILE ? 3.8 : 4.2,
        maxBounds: ME_BOUNDS,
        attributionControl: false,
        antialias: false,
        fadeDuration: 0,
      });
    } catch (err) {
      console.warn('[AlertMap] WebGL init failed:', err);
      return;
    }

    mapRef.current = map;

    map.on('load', () => {
      setupLayers(map);

      const src = map.getSource('alerts') as any;
      if (src && geoJsonRef.current) src.setData(geoJsonRef.current);
    });

    // Re-add layers when style changes (e.g. dark ↔ light swap)
    map.on('style.load', () => {
      layersAddedRef.current = false;
      setupLayers(map);
      const src = map.getSource('alerts') as any;
      if (src && geoJsonRef.current) src.setData(geoJsonRef.current);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      layersAddedRef.current = false;
      hasFittedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch map style when theme changes
  useEffect(() => {
    if (mapRef.current) {
      layersAddedRef.current = false;
      mapRef.current.setStyle(MAP_THEMES[theme]);
    }
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;

    const src = map.getSource('alerts') as any;
    if (src) src.setData(geoJson);

    if (!hasFittedRef.current && geoJson.features.length > 0) {
      hasFittedRef.current = true;
      const bounds = new LngLatBounds();
      geoJson.features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates as [number, number];
        bounds.extend([lng, lat]);
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 10, minZoom: 5, duration: 600 });
      }
    }
  }, [geoJson]);

  // Computed per-region alert counts for badge display
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, levant: 0, lebanon: 0, gcc: 0, iran: 0, iraq: 0 };
    geoJson.features.forEach(f => {
      counts.all++;
      const g = f.properties.countryGroup as string;
      if (g in counts) counts[g]++;
    });
    return counts;
  }, [geoJson]);

  const flyToRegion = (r: typeof REGIONS[number]) => {
    setActiveRegion(r.id);
    mapRef.current?.flyTo({ center: r.center, zoom: r.zoom, duration: 800 });
  };

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'rgba(12,14,24,0.88)' : 'rgba(255,255,255,0.88)';
  const panelBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : '#666';
  const textBase = isDark ? 'rgba(255,255,255,0.85)' : '#111';

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" data-testid="alert-map-container" />

      {/* ── Top-left: theme toggle + region buttons ─────────── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {/* Theme toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
          {(['light', 'dark'] as MapTheme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              title={t === 'light' ? 'Light map' : 'Dark map'}
              className="flex items-center gap-1 px-2 py-1 rounded-md transition-all active:scale-95"
              style={{
                background: theme === t ? (t === 'dark' ? 'rgba(30,35,60,0.95)' : 'rgba(255,255,255,1)') : 'transparent',
                border: theme === t ? `1px solid ${t === 'dark' ? 'rgba(100,120,200,0.4)' : 'rgba(0,0,0,0.15)'}` : '1px solid transparent',
                boxShadow: theme === t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1 }}>{t === 'light' ? '☀️' : '🌙'}</span>
              <span className="text-[9px] font-mono font-bold uppercase" style={{ color: theme === t ? (t === 'dark' ? 'rgba(180,200,255,0.9)' : '#333') : textMuted }}>
                {t}
              </span>
            </button>
          ))}
        </div>

        {/* Region quick-jump */}
        <div className="flex flex-col gap-1 p-1.5 rounded-lg" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
          <div className="text-[7px] font-mono font-bold uppercase tracking-widest px-1 mb-0.5" style={{ color: textMuted }}>Jump to</div>
          {REGIONS.map(r => {
            const count = regionCounts[r.id] || 0;
            const isActive = activeRegion === r.id;
            const regionColor: Record<string, string> = {
              all: '#94a3b8', levant: '#3b82f6', lebanon: '#22c55e',
              gcc: '#f97316', iran: '#a855f7', iraq: '#f59e0b',
            };
            const color = regionColor[r.id] || '#94a3b8';
            return (
              <button
                key={r.id}
                onClick={() => flyToRegion(r)}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-md transition-all active:scale-95"
                style={{
                  background: isActive ? `${color}18` : 'transparent',
                  border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                  minWidth: 110,
                }}
              >
                <span className="text-[9px] font-mono font-bold" style={{ color: isActive ? color : textMuted }}>{r.label}</span>
                {count > 0 && (
                  <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full" style={{ background: `${color}25`, color }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom-left: threat legend ───────────────────────── */}
      <div className="absolute bottom-6 left-3 z-10 p-2 rounded-lg" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
        <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: textMuted }}>Threat Type</div>
        {[
          { label: 'Rockets',      color: '#dc2626' },
          { label: 'Missiles',     color: '#ea580c' },
          { label: 'UAV / Drone',  color: '#0891b2' },
          { label: 'Aircraft',     color: '#7c3aed' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}88` }} />
            <span className="text-[8px] font-mono" style={{ color: textBase }}>{label}</span>
          </div>
        ))}
        <div className="mt-2 pt-1.5" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}` }}>
          <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color: textMuted }}>Status</div>
          {[
            { label: 'Active alert',   size: 9, opacity: 1 },
            { label: 'Past / resolved', size: 5, opacity: 0.55 },
          ].map(({ label, size, opacity }) => (
            <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
              <div style={{ width: size, height: size, borderRadius: '50%', background: '#dc2626', opacity, flexShrink: 0 }} />
              <span className="text-[8px] font-mono" style={{ color: textBase }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zoom controls ────────────────────────────────────── */}
      <div className="absolute bottom-6 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          className="w-8 h-8 flex items-center justify-center rounded-md font-bold transition-all active:scale-95"
          style={{ background: panelBg, border: panelBorder, color: textBase, fontSize: 18, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          className="w-8 h-8 flex items-center justify-center rounded-md font-bold transition-all active:scale-95"
          style={{ background: panelBg, border: panelBorder, color: textBase, fontSize: 18, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        >−</button>
      </div>
    </div>
  );
}
