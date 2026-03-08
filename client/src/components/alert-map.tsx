import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Map as MapLibreMap, Popup, LngLatBounds } from 'maplibre-gl';
import type { RedAlert } from '@shared/schema';

const MAP_STYLES = {
  dark:    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
} as const;
type MapStyle = keyof typeof MAP_STYLES;

const ME_BOUNDS: [[number, number], [number, number]] = [
  [22.0, 8.0],
  [68.0, 44.0],
];

const MIDDLE_EAST_COUNTRIES = new Set([
  'Israel', 'Palestine', 'Gaza', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran',
  'Saudi Arabia', 'Yemen', 'Oman', 'UAE', 'Qatar', 'Bahrain', 'Kuwait',
  'Egypt', 'Libya', 'Turkey', 'Cyprus', 'Armenia', 'Azerbaijan',
]);
const GCC_COUNTRIES = new Set(['Saudi Arabia', 'UAE', 'Qatar', 'Bahrain', 'Kuwait', 'Oman']);

const THREAT_META: Record<string, { label: string; icon: string; color: string }> = {
  rockets:                    { label: 'Rockets',   icon: '🚀', color: '#ef4444' },
  missiles:                   { label: 'Missiles',  icon: '🎯', color: '#f97316' },
  uav_intrusion:              { label: 'UAV',       icon: '🔺', color: '#06b6d4' },
  hostile_aircraft_intrusion: { label: 'Aircraft',  icon: '✈',  color: '#a855f7' },
  ballistic_missile:          { label: 'Ballistic', icon: '💥', color: '#f97316' },
  cruise_missile:             { label: 'Cruise',    icon: '🛸', color: '#f59e0b' },
  drone_swarm:                { label: 'Swarm',     icon: '🔴', color: '#06b6d4' },
};

const REGIONS = [
  { id: 'all',     label: 'ALL',     center: [46.0, 28.0] as [number, number], zoom: 4.2 },
  { id: 'levant',  label: 'LEVANT',  center: [35.8, 32.5] as [number, number], zoom: 6.5 },
  { id: 'lebanon', label: 'LBNON',   center: [35.5, 33.8] as [number, number], zoom: 8.0 },
  { id: 'gcc',     label: 'GCC',     center: [50.0, 24.5] as [number, number], zoom: 5.5 },
  { id: 'iran',    label: 'IRAN',    center: [53.5, 32.5] as [number, number], zoom: 5.0 },
  { id: 'iraq',    label: 'IRAQ',    center: [43.5, 33.0] as [number, number], zoom: 6.0 },
] as const;

const INDIGO = '#6366f1';
const INDIGO_DIM = 'rgba(99,102,241,0.18)';
const INDIGO_BORDER = 'rgba(99,102,241,0.35)';
const PANEL_BG = 'rgba(10,10,18,0.90)';
const PANEL_BORDER = '1px solid rgba(99,102,241,0.18)';
const TEXT_BASE = 'rgba(255,255,255,0.85)';
const TEXT_MUTED = 'rgba(255,255,255,0.40)';

export default function AlertMap({ alerts, language }: { alerts: RedAlert[]; language: 'en' | 'ar' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const layersAddedRef = useRef(false);
  const hasFittedRef = useRef(false);
  const popupRef = useRef<Popup | null>(null);
  const geoJsonRef = useRef<{ type: 'FeatureCollection'; features: any[] } | null>(null);

  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [screenWidth, setScreenWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = screenWidth < 768;

  const geoJson = useMemo(() => {
    const now = Date.now();
    const features = alerts
      .filter(a => {
        if (!a.lat || !a.lng) return false;
        if (a.lng < ME_BOUNDS[0][0] || a.lng > ME_BOUNDS[1][0]) return false;
        if (a.lat < ME_BOUNDS[0][1] || a.lat > ME_BOUNDS[1][1]) return false;
        if (a.country && !MIDDLE_EAST_COUNTRIES.has(a.country)) return false;
        if (filterType && a.threatType !== filterType) return false;
        return true;
      })
      .map(a => {
        const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
        const isActive = elapsed < a.countdown || a.countdown === 0;
        const meta = THREAT_META[a.threatType] || { color: '#ef4444' };
        const countryGroup = GCC_COUNTRIES.has(a.country || '') ? 'gcc'
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
            color: meta.color,
            isActive,
            countdown: a.countdown,
            timestamp: a.timestamp,
            region: a.region,
            source: a.source || 'sim',
            elapsed,
          },
        };
      });
    return { type: 'FeatureCollection' as const, features };
  }, [alerts, language, filterType]);

  useEffect(() => { geoJsonRef.current = geoJson; }, [geoJson]);

  const setupLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource('alerts')) return;

    // Main alert source with clustering
    map.addSource('alerts', {
      type: 'geojson',
      data: geoJsonRef.current ?? { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 42,
    });

    // Heatmap layer (density visualization)
    map.addSource('alerts-heat', {
      type: 'geojson',
      data: geoJsonRef.current ?? { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: 'alert-heatmap',
      type: 'heatmap',
      source: 'alerts-heat',
      maxzoom: 11,
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 9, 2],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,   'rgba(99,102,241,0)',
          0.2, 'rgba(99,102,241,0.25)',
          0.4, 'rgba(139,92,246,0.45)',
          0.6, 'rgba(220,38,38,0.55)',
          0.8, 'rgba(239,68,68,0.75)',
          1.0, 'rgba(254,202,202,0.90)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 25, 9, 45],
        'heatmap-opacity': showHeatmap ? 0.75 : 0,
      },
    });

    // Cluster circles
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'alerts',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#ef4444', 5, '#dc2626', 15, '#b91c1c'],
        'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 25],
        'circle-opacity': 0.95,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
        'circle-stroke-opacity': 0.9,
      },
    });
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'alerts',
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Open Sans Bold'], 'text-size': 12 },
      paint: { 'text-color': '#ffffff' },
    });

    // Pulse glow ring for active alerts
    map.addLayer({
      id: 'alerts-pulse',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      paint: {
        'circle-radius': 16,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.15,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.5,
      },
    });

    // Inactive dots
    map.addLayer({
      id: 'alerts-inactive',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], false]],
      paint: {
        'circle-radius': 5,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.45,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.3,
      },
    });

    // Active dots (on top)
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
        'circle-stroke-opacity': 0.95,
        'circle-stroke-width-transition': { duration: 300 },
      },
    });

    // City labels for active alerts
    map.addLayer({
      id: 'alerts-labels',
      type: 'symbol',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      layout: {
        'text-field': ['get', 'city'],
        'text-size': 10,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.75)',
        'text-halo-width': 1.5,
        'text-opacity': 0.9,
      },
    });

    layersAddedRef.current = true;

    // Cluster click — zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      (map.getSource('alerts') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
      });
    });

    // Point click — dark popup
    (['alerts-active', 'alerts-inactive'] as const).forEach(layer => {
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
        const meta = THREAT_META[props.threatType] || { label: props.threatType, icon: '⚠', color: '#ef4444' };
        const regionLabels: Record<string, string> = { gcc: 'GCC', levant: 'Levant', lebanon: 'Lebanon', iran: 'Iran', iraq: 'Iraq', other: 'Region' };

        const html = `
          <div style="font-family:'SF Mono',monospace;font-size:11px;background:rgba(8,8,16,0.97);padding:10px 12px;border-radius:10px;min-width:190px;border:1px solid ${props.color}55;box-shadow:0 4px 24px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05)">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="font-size:15px">${meta.icon}</span>
              <div>
                <div style="font-weight:900;font-size:13px;color:#fff;letter-spacing:0.04em">${props.city || '—'}</div>
                <div style="color:rgba(255,255,255,0.4);font-size:9px;margin-top:1px">${[props.region, props.country].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <span style="background:${props.color}22;color:${props.color};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid ${props.color}44;letter-spacing:0.1em">${meta.label.toUpperCase()}</span>
              ${props.source === 'live' ? '<span style="background:rgba(34,197,94,0.15);color:#22c55e;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid rgba(34,197,94,0.3)">● LIVE</span>' : ''}
              <span style="background:rgba(99,102,241,0.12);color:rgba(160,163,255,0.8);padding:2px 5px;border-radius:4px;font-size:8px;font-weight:700;border:1px solid rgba(99,102,241,0.2)">${regionLabels[props.countryGroup] || props.country || ''}</span>
            </div>
            ${remaining > 0 ? `<div style="margin-top:7px;display:flex;align-items:center;gap:4px;font-size:10px;color:#f87171;font-weight:800"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;animation:none;margin-right:2px"></span>⏱ ${mins > 0 ? `${mins}m ` : ''}${secs}s remaining</div>` : ''}
          </div>`;

        popupRef.current = new Popup({ closeButton: false, maxWidth: '280px', className: 'am-popup' })
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
      const hit = map.queryRenderedFeatures(e.point, { layers: ['alerts-active', 'alerts-inactive', 'clusters'] });
      if (!hit.length) popupRef.current?.remove();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLES[mapStyle],
        center: [46.0, 28.0],
        zoom: isMobile ? 3.8 : 4.2,
        maxBounds: ME_BOUNDS,
        attributionControl: false,
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

  // Style switch
  useEffect(() => {
    if (mapRef.current) {
      layersAddedRef.current = false;
      mapRef.current.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle]);

  // Update data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    const src = map.getSource('alerts') as any;
    if (src) src.setData(geoJson);
    const heatSrc = map.getSource('alerts-heat') as any;
    if (heatSrc) heatSrc.setData(geoJson);

    if (!hasFittedRef.current && geoJson.features.length > 0) {
      hasFittedRef.current = true;
      const bounds = new LngLatBounds();
      geoJson.features.forEach(f => bounds.extend((f.geometry as any).coordinates));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 55, maxZoom: 10, minZoom: 4.5, duration: 700 });
      }
    }
  }, [geoJson]);

  // Heatmap opacity toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    try {
      map.setPaintProperty('alert-heatmap', 'heatmap-opacity', showHeatmap ? 0.75 : 0);
    } catch {}
  }, [showHeatmap]);

  // Region counts
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: geoJson.features.length, levant: 0, lebanon: 0, gcc: 0, iran: 0, iraq: 0 };
    geoJson.features.forEach(f => {
      const g = f.properties.countryGroup as string;
      if (g in counts) counts[g]++;
    });
    return counts;
  }, [geoJson]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const total = alerts.length;
    const active = alerts.filter(a => {
      const el = (now - new Date(a.timestamp).getTime()) / 1000;
      return a.countdown === 0 || el < a.countdown;
    }).length;
    const live = alerts.filter(a => a.source === 'live').length;
    const byType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const cityCount: Record<string, number> = {};
    alerts.forEach(a => {
      byType[a.threatType] = (byType[a.threatType] || 0) + 1;
      if (a.country) byCountry[a.country] = (byCountry[a.country] || 0) + 1;
      if (a.city) cityCount[a.city] = (cityCount[a.city] || 0) + 1;
    });
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const topCountry = Object.entries(byCountry).sort((a, b) => b[1] - a[1])[0];
    const hotCity = Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0];
    const recentAlerts = [...alerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    return { total, active, live, byType, byCountry, topType, topCountry, hotCity, recentAlerts };
  }, [alerts]);

  const flyTo = (r: typeof REGIONS[number]) => {
    setActiveRegion(r.id);
    mapRef.current?.flyTo({ center: r.center, zoom: r.zoom, duration: 900 });
  };

  const threatTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  const topMeta = stats.topType ? THREAT_META[stats.topType[0]] : null;

  return (
    <div className="relative w-full h-full bg-[#0a0a10]">
      <style>{`
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        .maplibregl-popup-tip { display: none !important; }
        .am-popup .maplibregl-popup-content { border-radius: 10px; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" data-testid="alert-map-container" />

      {/* ── Top-left controls ─────────────────────────────── */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
        {/* Region nav pills */}
        <div className="flex flex-wrap gap-1 p-1.5 rounded-lg" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(10px)', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
          {REGIONS.map(r => {
            const count = regionCounts[r.id] || 0;
            const isActive = activeRegion === r.id;
            return (
              <button
                key={r.id}
                onClick={() => flyTo(r)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md transition-all active:scale-95"
                style={{
                  background: isActive ? INDIGO_DIM : 'transparent',
                  border: isActive ? `1px solid ${INDIGO_BORDER}` : '1px solid transparent',
                  color: isActive ? INDIGO : TEXT_MUTED,
                }}
              >
                <span className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-mono font-black tracking-wider`}>{r.label}</span>
                {count > 0 && (
                  <span className="text-[8px] font-mono font-black px-1 py-0.5 rounded-full" style={{ background: isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)', color: isActive ? INDIGO : TEXT_MUTED }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Map style selector */}
        {!isMobile && (
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {(Object.keys(MAP_STYLES) as MapStyle[]).map(s => (
              <button
                key={s}
                onClick={() => setMapStyle(s)}
                className="px-2 py-0.5 rounded-md transition-all text-[8px] font-mono font-bold uppercase tracking-wider active:scale-95"
                style={{
                  background: mapStyle === s ? INDIGO_DIM : 'transparent',
                  border: mapStyle === s ? `1px solid ${INDIGO_BORDER}` : '1px solid transparent',
                  color: mapStyle === s ? INDIGO : TEXT_MUTED,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Top-right: action buttons ──────────────────────── */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
        {/* Active alert badge */}
        {stats.active > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.4)', backdropFilter: 'blur(10px)', boxShadow: '0 0 16px rgba(220,38,38,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse 1s infinite' }} />
            <span className="text-[10px] font-mono font-black text-red-400 tracking-wider">{stats.active} ACTIVE</span>
          </div>
        )}

        {/* Stats toggle */}
        <button
          onClick={() => setShowStats(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{
            background: showStats ? INDIGO_DIM : PANEL_BG,
            border: showStats ? `1px solid ${INDIGO_BORDER}` : PANEL_BORDER,
            color: showStats ? INDIGO : TEXT_MUTED,
            backdropFilter: 'blur(10px)',
            boxShadow: showStats ? `0 0 12px rgba(99,102,241,0.25)` : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: 11 }}>📊</span>
          {!isMobile && 'INTEL'}
        </button>

        {/* Heatmap toggle */}
        <button
          onClick={() => setShowHeatmap(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{
            background: showHeatmap ? 'rgba(139,92,246,0.18)' : PANEL_BG,
            border: showHeatmap ? '1px solid rgba(139,92,246,0.35)' : PANEL_BORDER,
            color: showHeatmap ? '#a78bfa' : TEXT_MUTED,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: 11 }}>🌡</span>
          {!isMobile && 'HEAT'}
        </button>
      </div>

      {/* ── Intel side panel ─────────────────────────────── */}
      {showStats && (
        <div
          className="absolute top-2 right-2 z-20 rounded-xl overflow-hidden flex flex-col"
          style={{
            width: isMobile ? 'calc(100% - 16px)' : 240,
            maxHeight: 'calc(100% - 16px)',
            top: isMobile ? 8 : 110,
            right: isMobile ? 8 : 8,
            background: PANEL_BG,
            border: PANEL_BORDER,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 24px rgba(99,102,241,0.08)`,
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.05)' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: INDIGO, boxShadow: `0 0 6px ${INDIGO}` }} />
              <span className="text-[9px] font-mono font-black uppercase tracking-widest" style={{ color: INDIGO }}>INTEL OVERLAY</span>
            </div>
            <button onClick={() => setShowStats(false)} className="text-[14px] leading-none" style={{ color: TEXT_MUTED }}>×</button>
          </div>

          <div className="overflow-y-auto p-3 flex flex-col gap-3">
            {/* KPI grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Total', value: stats.total, color: TEXT_BASE },
                { label: 'Active', value: stats.active, color: '#f87171' },
                { label: 'Live', value: stats.live, color: '#4ade80' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-mono font-black text-sm" style={{ color }}>{value}</span>
                  <span className="font-mono text-[7px] uppercase tracking-wider mt-0.5" style={{ color: TEXT_MUTED }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Threat filter buttons */}
            {threatTypes.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Filter by Threat Type</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterType(null)}
                    className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold transition-all"
                    style={{
                      background: !filterType ? INDIGO_DIM : 'rgba(255,255,255,0.04)',
                      border: !filterType ? `1px solid ${INDIGO_BORDER}` : '1px solid rgba(255,255,255,0.06)',
                      color: !filterType ? INDIGO : TEXT_MUTED,
                    }}
                  >ALL</button>
                  {threatTypes.slice(0, 5).map(([type, count]) => {
                    const meta = THREAT_META[type];
                    if (!meta) return null;
                    const isActive = filterType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterType(isActive ? null : type)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold transition-all"
                        style={{
                          background: isActive ? `${meta.color}22` : 'rgba(255,255,255,0.04)',
                          border: isActive ? `1px solid ${meta.color}44` : '1px solid rgba(255,255,255,0.06)',
                          color: isActive ? meta.color : TEXT_MUTED,
                        }}
                      >
                        {meta.icon} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By threat type bars */}
            {threatTypes.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Threat Distribution</div>
                {threatTypes.slice(0, 6).map(([type, count]) => {
                  const meta = THREAT_META[type] || { label: type, icon: '⚠', color: '#94a3b8' };
                  const pct = Math.round((count / Math.max(stats.total, 1)) * 100);
                  return (
                    <div key={type} className="mb-1.5 last:mb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-[9px] font-bold flex items-center gap-1" style={{ color: TEXT_BASE }}>{meta.icon} {meta.label}</span>
                        <span className="font-mono text-[8px]" style={{ color: TEXT_MUTED }}>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color, opacity: 0.85, boxShadow: `0 0 4px ${meta.color}66` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hotspot */}
            {stats.hotCity && (
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(248,113,113,0.6)' }}>Hotspot City</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black text-red-400">● {stats.hotCity[0]}</span>
                  <span className="font-mono text-[9px]" style={{ color: TEXT_MUTED }}>{stats.hotCity[1]} alerts</span>
                </div>
              </div>
            )}

            {/* Top country */}
            {stats.topCountry && (
              <div className="rounded-lg px-2.5 py-2" style={{ background: INDIGO_DIM, border: PANEL_BORDER }}>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(160,163,255,0.6)' }}>Top Country</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-black" style={{ color: INDIGO }}>{stats.topCountry[0]}</span>
                  <span className="font-mono text-[9px]" style={{ color: TEXT_MUTED }}>{stats.topCountry[1]} alerts</span>
                </div>
              </div>
            )}

            {/* Recent alerts */}
            {stats.recentAlerts.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Recent Alerts</div>
                {stats.recentAlerts.map(a => {
                  const meta = THREAT_META[a.threatType] || { label: a.threatType, icon: '⚠', color: '#ef4444' };
                  const now2 = Date.now();
                  const elapsed = Math.floor((now2 - new Date(a.timestamp).getTime()) / 1000);
                  const isActive = elapsed < a.countdown || a.countdown === 0;
                  const timeStr = elapsed < 60 ? `${elapsed}s` : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m` : `${Math.floor(elapsed / 3600)}h`;
                  return (
                    <div key={a.id} className="flex items-center gap-1.5 py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color, boxShadow: isActive ? `0 0 4px ${meta.color}` : undefined }} />
                      <span className="font-mono text-[9px] flex-1 truncate" style={{ color: TEXT_BASE }}>{language === 'ar' ? a.cityAr : a.city}</span>
                      <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>{timeStr} ago</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom-left: threat legend ─────────────────────── */}
      {!isMobile && (
        <div className="absolute bottom-10 left-2 z-10" style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col gap-0.5 p-2 rounded-lg" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(10px)', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_MUTED }}>Threat Key</div>
            {Object.entries(THREAT_META).filter(([type]) => (stats.byType[type] || 0) > 0).map(([, meta]) => (
              <div key={meta.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}77` }} />
                <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>{meta.icon} {meta.label}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 flex flex-col gap-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }} />
                <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', opacity: 0.45 }} />
                <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>Past</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom stats strip ────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-3 py-1.5" style={{ background: 'rgba(10,10,18,0.88)', borderTop: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: INDIGO }} />
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest" style={{ color: INDIGO }}>ALERT MAP</span>
        </div>
        <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-3 flex-1 overflow-x-auto scrollbar-none">
          <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: TEXT_BASE }}>{stats.total} total</span>
          {stats.active > 0 && <span className="font-mono text-[9px] font-bold text-red-400 shrink-0">● {stats.active} active</span>}
          {stats.live > 0 && <span className="font-mono text-[9px] font-bold text-emerald-400 shrink-0">◉ {stats.live} live</span>}
          {topMeta && stats.topType && <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>{topMeta.icon} top: {topMeta.label} ({stats.topType[1]})</span>}
          {stats.topCountry && <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>📍 {stats.topCountry[0]}</span>}
        </div>
        {/* Zoom controls inline */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => mapRef.current?.zoomIn()} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: TEXT_BASE }}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: TEXT_BASE }}>−</button>
        </div>
      </div>
    </div>
  );
}
