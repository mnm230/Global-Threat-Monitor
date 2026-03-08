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

const ME_BOUNDS: [[number, number], [number, number]] = [[20.0, 6.0], [70.0, 46.0]];

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

// Country-group colors for alert dots
const COUNTRY_COLORS: Record<string, string> = {
  levant:  '#3b82f6',
  lebanon: '#10b981',
  iran:    '#f97316',
  iraq:    '#eab308',
  gcc:     '#0ea5e9',
  other:   '#ef4444',
};

const REGIONS = [
  { id: 'all',     label: 'ALL',    center: [46.0, 28.0] as [number, number], zoom: 4.2 },
  { id: 'levant',  label: 'LEVANT', center: [35.8, 32.5] as [number, number], zoom: 6.5 },
  { id: 'lebanon', label: 'LBNON',  center: [35.5, 33.8] as [number, number], zoom: 8.0 },
  { id: 'gcc',     label: 'GCC',    center: [50.0, 24.5] as [number, number], zoom: 5.5 },
  { id: 'iran',    label: '🇮🇷 IRAN', center: [53.5, 32.5] as [number, number], zoom: 5.2 },
  { id: 'iraq',    label: 'IRAQ',   center: [43.5, 33.0] as [number, number], zoom: 6.0 },
] as const;

// ── Iran Nuclear / Military / Strategic Sites ────────────────────────────────
// Used to seed Iran heatmap even when no live alerts exist
const IRAN_SITES = [
  // Nuclear facilities (weight 4 — critical)
  { name: 'Natanz Enrichment', lng: 51.9072, lat: 33.7247, type: 'nuclear', weight: 4 },
  { name: 'Fordow (Underground)', lng: 50.0033, lat: 34.8851, type: 'nuclear', weight: 4 },
  { name: 'Isfahan Nuclear', lng: 51.5944, lat: 32.6539, type: 'nuclear', weight: 4 },
  { name: 'Arak Heavy Water', lng: 49.3460, lat: 34.0745, type: 'nuclear', weight: 3 },
  { name: 'Bushehr NPP', lng: 50.8388, lat: 28.9234, type: 'nuclear', weight: 3 },
  { name: 'Parchin Complex', lng: 51.7670, lat: 35.5000, type: 'military', weight: 3 },
  // IRGC / Military bases (weight 3)
  { name: 'Tehran Command', lng: 51.3890, lat: 35.6892, type: 'command', weight: 3 },
  { name: 'Dezful IRGC Base', lng: 48.3987, lat: 32.3815, type: 'military', weight: 3 },
  { name: 'Imam Ali Base', lng: 49.2700, lat: 31.0800, type: 'military', weight: 3 },
  { name: 'Bandar Abbas Naval', lng: 56.2808, lat: 27.1865, type: 'naval', weight: 3 },
  { name: 'Kharg Island Oil', lng: 50.3210, lat: 29.2439, type: 'strategic', weight: 2 },
  // Strategic cities / hubs (weight 2)
  { name: 'Tabriz NW Hub', lng: 46.2738, lat: 38.0962, type: 'city', weight: 2 },
  { name: 'Ahvaz Oil Hub', lng: 48.6706, lat: 31.3183, type: 'strategic', weight: 2 },
  { name: 'Mashhad NE Hub', lng: 59.6062, lat: 36.2971, type: 'city', weight: 2 },
  { name: 'Shiraz', lng: 52.5686, lat: 29.5918, type: 'city', weight: 2 },
  { name: 'Kermanshah', lng: 47.0650, lat: 34.3277, type: 'military', weight: 2 },
  { name: 'Qom', lng: 50.8765, lat: 34.6416, type: 'city', weight: 2 },
] as const;

// ── Iran → Levant missile trajectory arc (great-circle approx.) ──────────────
// Tehran (51.4, 35.7) → Tel Aviv (34.8, 32.1)
function buildTrajectoryArc(): [number, number][] {
  const start: [number, number] = [51.4, 35.7];
  const end: [number, number] = [34.8, 32.1];
  const pts: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t + Math.sin(Math.PI * t) * 3.5; // arc height
    pts.push([lng, lat]);
  }
  return pts;
}
const TRAJECTORY_ARC = buildTrajectoryArc();

const INDIGO = '#6366f1';
const INDIGO_DIM = 'rgba(99,102,241,0.18)';
const INDIGO_BORDER = 'rgba(99,102,241,0.35)';
const PANEL_BG = 'rgba(8,8,16,0.92)';
const PANEL_BORDER = '1px solid rgba(99,102,241,0.18)';
const TEXT_BASE = 'rgba(255,255,255,0.85)';
const TEXT_MUTED = 'rgba(255,255,255,0.40)';

const IRAN_HEAT_GJ = {
  type: 'FeatureCollection' as const,
  features: IRAN_SITES.map(s => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    properties: { name: s.name, type: s.type, weight: s.weight },
  })),
};

const TRAJECTORY_GJ = {
  type: 'FeatureCollection' as const,
  features: [{
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: TRAJECTORY_ARC },
    properties: {},
  }],
};

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
  const [showIranHeat, setShowIranHeat] = useState(true);      // Iran heat on by default
  const [showTrajectory, setShowTrajectory] = useState(false);  // Iran→Levant arc
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
        if (a.lng < 20.0 || a.lng > 70.0) return false;
        if (a.lat < 6.0  || a.lat > 46.0) return false;
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
          : a.country === 'Iran'    ? 'iran'
          : a.country === 'Iraq'    ? 'iraq'
          : (a.country === 'Israel' || a.country === 'Palestine' || a.country === 'Gaza') ? 'levant'
          : 'other';
        const dotColor = COUNTRY_COLORS[countryGroup] || meta.color;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
          properties: {
            id: a.id,
            city: language === 'ar' ? a.cityAr : a.city,
            country: a.country,
            countryGroup,
            threatType: a.threatType,
            color: dotColor,
            threatColor: meta.color,
            isActive,
            countdown: a.countdown,
            timestamp: a.timestamp,
            region: a.region,
            source: a.source || 'sim',
            elapsed,
            weight: isActive ? 2.5 : 1,
          },
        };
      });
    return { type: 'FeatureCollection' as const, features };
  }, [alerts, language, filterType]);

  useEffect(() => { geoJsonRef.current = geoJson; }, [geoJson]);

  const setupLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource('alerts')) return;

    // ── Main alert source (clustered) ──
    map.addSource('alerts', {
      type: 'geojson',
      data: geoJsonRef.current ?? { type: 'FeatureCollection', features: [] },
      cluster: true, clusterMaxZoom: 9, clusterRadius: 42,
    });

    // ── Alert density heatmap source ──
    map.addSource('alerts-heat', {
      type: 'geojson',
      data: geoJsonRef.current ?? { type: 'FeatureCollection', features: [] },
    });

    // ── Iran nuclear/military sites heatmap source ──
    map.addSource('iran-sites', { type: 'geojson', data: IRAN_HEAT_GJ });

    // ── Iran → Levant trajectory arc ──
    map.addSource('trajectory', { type: 'geojson', data: TRAJECTORY_GJ });

    // ─── Layer: Alert density heatmap ───────────────────────────
    map.addLayer({
      id: 'alert-heatmap',
      type: 'heatmap',
      source: 'alerts-heat',
      maxzoom: 11,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 3, 1.5],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 1, 9, 2.5],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,   'rgba(99,102,241,0)',
          0.2, 'rgba(99,102,241,0.3)',
          0.4, 'rgba(139,92,246,0.5)',
          0.6, 'rgba(220,38,38,0.6)',
          0.8, 'rgba(239,68,68,0.8)',
          1.0, 'rgba(254,202,202,0.95)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 28, 9, 50],
        'heatmap-opacity': showHeatmap ? 0.75 : 0,
      },
    });

    // ─── Layer: Iran persistent heat (amber/orange) ──────────────
    map.addLayer({
      id: 'iran-heat',
      type: 'heatmap',
      source: 'iran-sites',
      maxzoom: 12,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 4, 1.5],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.9, 9, 3.0],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,   'rgba(0,0,0,0)',
          0.15, 'rgba(234,179,8,0.12)',
          0.30, 'rgba(249,115,22,0.30)',
          0.50, 'rgba(234,88,12,0.50)',
          0.70, 'rgba(220,38,38,0.65)',
          0.85, 'rgba(239,68,68,0.80)',
          1.0,  'rgba(254,166,100,0.92)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 32, 7, 58, 10, 80],
        'heatmap-opacity': showIranHeat ? 0.72 : 0,
      },
    });

    // ─── Layer: Iran site dots (nuclear triangles) ───────────────
    map.addLayer({
      id: 'iran-sites-dots',
      type: 'circle',
      source: 'iran-sites',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 1, 3, 4, 6],
        'circle-color': [
          'match', ['get', 'type'],
          'nuclear', '#fb923c',
          'military', '#f97316',
          'naval',    '#38bdf8',
          'strategic','#fbbf24',
          '#f97316',
        ],
        'circle-opacity': showIranHeat ? 0.85 : 0,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.5)',
        'circle-stroke-opacity': showIranHeat ? 0.6 : 0,
      },
    });

    // ─── Layer: Iran trajectory arc ──────────────────────────────
    map.addLayer({
      id: 'trajectory-glow',
      type: 'line',
      source: 'trajectory',
      paint: {
        'line-color': '#f97316',
        'line-width': 4,
        'line-opacity': showTrajectory ? 0.15 : 0,
        'line-blur': 6,
      },
    });
    map.addLayer({
      id: 'trajectory-line',
      type: 'line',
      source: 'trajectory',
      paint: {
        'line-color': '#fb923c',
        'line-width': 1.5,
        'line-opacity': showTrajectory ? 0.75 : 0,
        'line-dasharray': [4, 3],
      },
    });

    // ─── Layer: Clusters ─────────────────────────────────────────
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'alerts',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#ef4444', 5, '#dc2626', 15, '#b91c1c'],
        'circle-radius': ['step', ['get', 'point_count'], 16, 5, 22, 15, 28],
        'circle-opacity': 0.92,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255,255,255,0.55)',
        'circle-stroke-opacity': 0.85,
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

    // ─── Layer: Pulse glow ring for active alerts ─────────────────
    map.addLayer({
      id: 'alerts-pulse',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      paint: {
        'circle-radius': 20,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.12,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.4,
      },
    });

    // ─── Layer: Inactive alert dots ───────────────────────────────
    map.addLayer({
      id: 'alerts-inactive',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], false]],
      paint: {
        'circle-radius': 5,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.4,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.25,
      },
    });

    // ─── Layer: Active alert dots ─────────────────────────────────
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
        'circle-stroke-opacity': 0.92,
      },
    });

    // ─── Layer: LIVE indicator ring ───────────────────────────────
    map.addLayer({
      id: 'alerts-live-ring',
      type: 'circle',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'source'], 'live']],
      paint: {
        'circle-radius': 14,
        'circle-color': 'transparent',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#22c55e',
        'circle-stroke-opacity': 0.7,
      },
    });

    // ─── Layer: City labels ───────────────────────────────────────
    map.addLayer({
      id: 'alerts-labels',
      type: 'symbol',
      source: 'alerts',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isActive'], true]],
      layout: {
        'text-field': ['get', 'city'],
        'text-size': 10,
        'text-offset': [0, 1.6],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.8)',
        'text-halo-width': 1.8,
        'text-opacity': 0.95,
      },
    });

    layersAddedRef.current = true;

    // ── Cluster click: zoom in ──
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      (map.getSource('alerts') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
      });
    });

    // ── Alert click: rich popup ──
    (['alerts-active', 'alerts-inactive'] as const).forEach(layer => {
      map.on('click', layer, (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = (f.geometry as any).coordinates.slice();
        const p = f.properties;
        popupRef.current?.remove();

        const elapsed = Math.floor((Date.now() - new Date(p.timestamp).getTime()) / 1000);
        const remaining = Math.max(0, p.countdown - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const meta = THREAT_META[p.threatType] || { label: p.threatType, icon: '⚠', color: '#ef4444' };
        const pct = p.countdown > 0 ? Math.round((remaining / p.countdown) * 100) : 0;
        const isLive = p.source === 'live';
        const countryFlagMap: Record<string, string> = { levant: '🇮🇱', lebanon: '🇱🇧', iran: '🇮🇷', iraq: '🇮🇶', gcc: '🏜️', other: '📍' };

        const html = `
          <div style="font-family:'SF Mono',monospace;font-size:11px;background:rgba(6,6,14,0.98);padding:11px 13px;border-radius:12px;min-width:200px;max-width:260px;border:1px solid ${p.color}55;box-shadow:0 6px 28px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.04),0 0 18px ${p.color}15">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
              <div style="font-size:18px;line-height:1">${meta.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:14px;color:#fff;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.city || '—'}</div>
                <div style="color:rgba(255,255,255,0.35);font-size:9px;margin-top:2px;letter-spacing:0.08em">${countryFlagMap[p.countryGroup] || ''} ${[p.region, p.country].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:8px">
              <span style="background:${meta.color}20;color:${meta.color};padding:2px 8px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid ${meta.color}44;letter-spacing:0.12em">${meta.label.toUpperCase()}</span>
              ${isLive ? '<span style="background:rgba(34,197,94,0.12);color:#4ade80;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:900;border:1px solid rgba(34,197,94,0.3)">◉ LIVE</span>' : ''}
              ${p.isActive ? `<span style="background:rgba(239,68,68,0.12);color:#f87171;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;border:1px solid rgba(239,68,68,0.25)">ACTIVE</span>` : '<span style="color:rgba(255,255,255,0.2);font-size:9px">EXPIRED</span>'}
            </div>
            ${remaining > 0 ? `
              <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <span style="font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:0.1em">COUNTDOWN</span>
                  <span style="font-size:11px;color:#f87171;font-weight:900">${mins > 0 ? `${mins}m ` : ''}${secs}s</span>
                </div>
                <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${p.color},#ef4444);border-radius:2px;transition:width 1s linear"></div>
                </div>
              </div>` : ''}
            <div style="font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.08em;margin-top:4px">${new Date(p.timestamp).toLocaleTimeString()}</div>
          </div>`;

        popupRef.current = new Popup({ closeButton: false, maxWidth: '280px', className: 'am-popup' })
          .setLngLat(coords).setHTML(html).addTo(map);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Iran site click popup ──
    map.on('click', 'iran-sites-dots', (e) => {
      if (!e.features?.length) return;
      const f = e.features[0];
      const coords = (f.geometry as any).coordinates.slice();
      const p = f.properties;
      popupRef.current?.remove();
      const typeIcons: Record<string, string> = { nuclear: '☢️', military: '🎖️', naval: '⚓', strategic: '⚡', command: '🛡️', city: '🏙️' };
      const html = `
        <div style="font-family:'SF Mono',monospace;background:rgba(6,6,14,0.98);padding:9px 12px;border-radius:10px;min-width:170px;border:1px solid rgba(249,115,22,0.4);box-shadow:0 4px 20px rgba(0,0,0,0.6),0 0 12px rgba(249,115,22,0.15)">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:14px">${typeIcons[p.type] || '📍'}</span>
            <span style="font-weight:900;font-size:11px;color:#fff">${p.name}</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="background:rgba(249,115,22,0.15);color:#fb923c;padding:1px 6px;border-radius:3px;font-size:8px;font-weight:800;border:1px solid rgba(249,115,22,0.3);letter-spacing:0.1em">${p.type.toUpperCase()}</span>
            <span style="color:rgba(255,255,255,0.2);font-size:8px">🇮🇷 IRAN</span>
          </div>
        </div>`;
      popupRef.current = new Popup({ closeButton: false, maxWidth: '240px', className: 'am-popup' })
        .setLngLat(coords).setHTML(html).addTo(map);
    });
    map.on('mouseenter', 'iran-sites-dots', () => { map.getCanvas().style.cursor = 'crosshair'; });
    map.on('mouseleave', 'iran-sites-dots', () => { map.getCanvas().style.cursor = ''; });

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['alerts-active', 'alerts-inactive', 'clusters', 'iran-sites-dots'] });
      if (!hit.length) popupRef.current?.remove();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init map ──
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
      const heatSrc = map.getSource('alerts-heat') as any;
      if (heatSrc && geoJsonRef.current) heatSrc.setData(geoJsonRef.current);
    });
    map.on('style.load', () => {
      layersAddedRef.current = false;
      setupLayers(map);
      const src = map.getSource('alerts') as any;
      if (src && geoJsonRef.current) src.setData(geoJsonRef.current);
      const heatSrc = map.getSource('alerts-heat') as any;
      if (heatSrc && geoJsonRef.current) heatSrc.setData(geoJsonRef.current);
    });
    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      layersAddedRef.current = false;
      hasFittedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Style switch ──
  useEffect(() => {
    if (mapRef.current) {
      layersAddedRef.current = false;
      mapRef.current.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle]);

  // ── Update alert data ──
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
        map.fitBounds(bounds, { padding: 60, maxZoom: 10, minZoom: 4.5, duration: 700 });
      }
    }
  }, [geoJson]);

  // ── Heatmap opacity toggle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    try { map.setPaintProperty('alert-heatmap', 'heatmap-opacity', showHeatmap ? 0.75 : 0); } catch {}
  }, [showHeatmap]);

  // ── Iran heat toggle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    try {
      map.setPaintProperty('iran-heat', 'heatmap-opacity', showIranHeat ? 0.72 : 0);
      map.setPaintProperty('iran-sites-dots', 'circle-opacity', showIranHeat ? 0.85 : 0);
      map.setPaintProperty('iran-sites-dots', 'circle-stroke-opacity', showIranHeat ? 0.6 : 0);
    } catch {}
  }, [showIranHeat]);

  // ── Trajectory toggle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    try {
      map.setPaintProperty('trajectory-line', 'line-opacity', showTrajectory ? 0.75 : 0);
      map.setPaintProperty('trajectory-glow', 'line-opacity', showTrajectory ? 0.15 : 0);
    } catch {}
  }, [showTrajectory]);

  // ── Region counts ──
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: geoJson.features.length, levant: 0, lebanon: 0, gcc: 0, iran: 0, iraq: 0 };
    geoJson.features.forEach(f => {
      const g = f.properties.countryGroup as string;
      if (g in counts) counts[g]++;
    });
    return counts;
  }, [geoJson]);

  // ── Stats ──
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
    const topType    = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const topCountry = Object.entries(byCountry).sort((a, b) => b[1] - a[1])[0];
    const hotCity    = Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0];
    const recentAlerts = [...alerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
    return { total, active, live, byType, byCountry, topType, topCountry, hotCity, recentAlerts };
  }, [alerts]);

  const flyTo = (r: typeof REGIONS[number]) => {
    setActiveRegion(r.id);
    mapRef.current?.flyTo({ center: r.center, zoom: r.zoom, duration: 900 });
    // Auto-activate Iran heat when flying to Iran
    if (r.id === 'iran' && !showIranHeat) setShowIranHeat(true);
  };

  const threatTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  const topMeta = stats.topType ? THREAT_META[stats.topType[0]] : null;
  const iranAlertCount = regionCounts.iran || 0;

  return (
    <div className="relative w-full h-full bg-[#060610]">
      <style>{`
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        .maplibregl-popup-tip { display: none !important; }
        .am-popup .maplibregl-popup-content { border-radius: 12px; }
        @keyframes am-pulse { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.9;transform:scale(1.08)} }
        @keyframes am-ring  { 0%{opacity:.7;transform:scale(1)} 100%{opacity:0;transform:scale(2.2)} }
      `}</style>
      <div ref={containerRef} className="w-full h-full" data-testid="alert-map-container" />

      {/* ── TOP-LEFT: Region nav + style ──────────────────────── */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
        {/* Region pills */}
        <div className="flex flex-wrap gap-1 p-1.5 rounded-xl" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
          {REGIONS.map(r => {
            const count = regionCounts[r.id] || 0;
            const isActive = activeRegion === r.id;
            const isIran = r.id === 'iran';
            return (
              <button
                key={r.id}
                onClick={() => flyTo(r)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-95"
                style={{
                  background: isActive ? (isIran ? 'rgba(249,115,22,0.2)' : INDIGO_DIM) : 'transparent',
                  border: isActive ? `1px solid ${isIran ? 'rgba(249,115,22,0.5)' : INDIGO_BORDER}` : '1px solid transparent',
                  color: isActive ? (isIran ? '#fb923c' : INDIGO) : TEXT_MUTED,
                }}
              >
                <span className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} font-mono font-black tracking-wider`}>{r.label}</span>
                {count > 0 && (
                  <span className="text-[8px] font-mono font-black px-1 py-px rounded-full"
                    style={{ background: isActive ? (isIran ? 'rgba(249,115,22,0.25)' : 'rgba(99,102,241,0.25)') : 'rgba(255,255,255,0.07)',
                             color: isActive ? (isIran ? '#fb923c' : INDIGO) : TEXT_MUTED }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Map style */}
        {!isMobile && (
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(12px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {(Object.keys(MAP_STYLES) as MapStyle[]).map(s => (
              <button key={s} onClick={() => setMapStyle(s)}
                className="px-2 py-0.5 rounded-md transition-all text-[8px] font-mono font-bold uppercase tracking-wider active:scale-95"
                style={{
                  background: mapStyle === s ? INDIGO_DIM : 'transparent',
                  border: mapStyle === s ? `1px solid ${INDIGO_BORDER}` : '1px solid transparent',
                  color: mapStyle === s ? INDIGO : TEXT_MUTED,
                }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TOP-RIGHT: Controls ──────────────────────────────── */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 items-end">
        {/* Active alert badge */}
        {stats.active > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.4)', backdropFilter: 'blur(10px)', boxShadow: '0 0 16px rgba(220,38,38,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'am-pulse 1.2s ease-in-out infinite' }} />
            <span className="text-[10px] font-mono font-black text-red-400 tracking-wider">{stats.active} ACTIVE</span>
          </div>
        )}

        {/* INTEL */}
        <button onClick={() => setShowStats(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{ background: showStats ? INDIGO_DIM : PANEL_BG, border: showStats ? `1px solid ${INDIGO_BORDER}` : PANEL_BORDER,
                   color: showStats ? INDIGO : TEXT_MUTED, backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 11 }}>📊</span>
          {!isMobile && 'INTEL'}
        </button>

        {/* HEAT (alert density) */}
        <button onClick={() => setShowHeatmap(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{ background: showHeatmap ? 'rgba(139,92,246,0.18)' : PANEL_BG, border: showHeatmap ? '1px solid rgba(139,92,246,0.35)' : PANEL_BORDER,
                   color: showHeatmap ? '#a78bfa' : TEXT_MUTED, backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 11 }}>🌡</span>
          {!isMobile && 'HEAT'}
        </button>

        {/* 🇮🇷 IRAN HEAT — dedicated toggle */}
        <button onClick={() => setShowIranHeat(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{ background: showIranHeat ? 'rgba(249,115,22,0.18)' : PANEL_BG, border: showIranHeat ? '1px solid rgba(249,115,22,0.45)' : PANEL_BORDER,
                   color: showIranHeat ? '#fb923c' : TEXT_MUTED, backdropFilter: 'blur(10px)',
                   boxShadow: showIranHeat ? '0 0 12px rgba(249,115,22,0.2)' : '0 2px 8px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 11 }}>🇮🇷</span>
          {!isMobile && (iranAlertCount > 0 ? `IRAN ${iranAlertCount}` : 'IRAN')}
        </button>

        {/* TRAJ (trajectory arc) */}
        <button onClick={() => setShowTrajectory(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono font-bold text-[9px] transition-all active:scale-95 uppercase tracking-wider"
          style={{ background: showTrajectory ? 'rgba(249,115,22,0.15)' : PANEL_BG, border: showTrajectory ? '1px solid rgba(249,115,22,0.35)' : PANEL_BORDER,
                   color: showTrajectory ? '#fb923c' : TEXT_MUTED, backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 11 }}>↗</span>
          {!isMobile && 'TRAJ'}
        </button>
      </div>

      {/* ── INTEL side panel ────────────────────────────────────── */}
      {showStats && (
        <div className="absolute z-20 rounded-xl overflow-hidden flex flex-col"
          style={{
            width: isMobile ? 'calc(100% - 16px)' : 248,
            maxHeight: 'calc(100% - 24px)',
            top: isMobile ? 8 : 130,
            right: isMobile ? 8 : 8,
            background: PANEL_BG,
            border: PANEL_BORDER,
            backdropFilter: 'blur(18px)',
            boxShadow: `0 8px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), 0 0 28px rgba(99,102,241,0.08)`,
          }}>
          <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: INDIGO, boxShadow: `0 0 6px ${INDIGO}` }} />
              <span className="text-[9px] font-mono font-black uppercase tracking-widest" style={{ color: INDIGO }}>INTEL OVERLAY</span>
            </div>
            <button onClick={() => setShowStats(false)} className="w-5 h-5 flex items-center justify-center rounded-md text-sm" style={{ color: TEXT_MUTED, background: 'rgba(255,255,255,0.05)' }}>×</button>
          </div>

          <div className="overflow-y-auto p-3 flex flex-col gap-3">
            {/* KPI grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Total',  value: stats.total,  color: TEXT_BASE },
                { label: 'Active', value: stats.active, color: '#f87171' },
                { label: 'Live',   value: stats.live,   color: '#4ade80' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-mono font-black text-[15px]" style={{ color, lineHeight: 1 }}>{value}</span>
                  <span className="font-mono text-[7px] uppercase tracking-wider mt-1" style={{ color: TEXT_MUTED }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Iran KPI */}
            {iranAlertCount > 0 && (
              <div className="rounded-lg px-2.5 py-2 flex items-center justify-between"
                style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px]">🇮🇷</span>
                  <span className="font-mono text-[9px] font-bold" style={{ color: '#fb923c' }}>IRAN ALERTS</span>
                </div>
                <span className="font-mono font-black text-[15px]" style={{ color: '#fb923c' }}>{iranAlertCount}</span>
              </div>
            )}

            {/* Threat type filter buttons */}
            {threatTypes.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Threat Filter</div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setFilterType(null)}
                    className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold transition-all"
                    style={{ background: !filterType ? INDIGO_DIM : 'rgba(255,255,255,0.04)', border: !filterType ? `1px solid ${INDIGO_BORDER}` : '1px solid rgba(255,255,255,0.06)', color: !filterType ? INDIGO : TEXT_MUTED }}>
                    ALL
                  </button>
                  {threatTypes.slice(0, 5).map(([type, count]) => {
                    const meta = THREAT_META[type];
                    if (!meta) return null;
                    const isActive = filterType === type;
                    return (
                      <button key={type} onClick={() => setFilterType(isActive ? null : type)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold transition-all"
                        style={{ background: isActive ? `${meta.color}22` : 'rgba(255,255,255,0.04)', border: isActive ? `1px solid ${meta.color}44` : '1px solid rgba(255,255,255,0.06)', color: isActive ? meta.color : TEXT_MUTED }}>
                        {meta.icon} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Threat distribution bars */}
            {threatTypes.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Distribution</div>
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

            {/* Country breakdown */}
            {Object.keys(stats.byCountry).length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>By Country</div>
                {Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, count]) => {
                  const flags: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Iraq: '🇮🇶', Syria: '🇸🇾', Yemen: '🇾🇪', 'Saudi Arabia': '🇸🇦' };
                  const colMap: Record<string, string> = { Israel: '#3b82f6', Lebanon: '#10b981', Iran: '#f97316', Iraq: '#eab308', Syria: '#a855f7', Yemen: '#f43f5e', 'Saudi Arabia': '#22c55e' };
                  const col = colMap[country] || '#94a3b8';
                  return (
                    <div key={country} className="flex items-center gap-1.5 py-0.5">
                      <span className="text-[11px]">{flags[country] || '📍'}</span>
                      <span className="font-mono text-[9px] flex-1" style={{ color: col }}>{country}</span>
                      <span className="font-mono text-[9px] font-black" style={{ color: col }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Iran nuclear sites legend */}
            {showIranHeat && (
              <div className="rounded-lg p-2.5" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(251,146,60,0.7)' }}>🇮🇷 Iran Threat Zones</div>
                <div className="flex flex-col gap-1">
                  {[
                    { type: 'nuclear', icon: '☢️', label: 'Nuclear Facilities', color: '#fb923c' },
                    { type: 'military', icon: '🎖️', label: 'IRGC / Military', color: '#f97316' },
                    { type: 'naval', icon: '⚓', label: 'Naval / Strait', color: '#38bdf8' },
                    { type: 'strategic', icon: '⚡', label: 'Oil / Strategic', color: '#fbbf24' },
                  ].map(({ icon, label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span style={{ fontSize: 10 }}>{icon}</span>
                      <span className="font-mono text-[8px]" style={{ color }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid rgba(249,115,22,0.15)' }}>
                  <div className="text-[7px] font-mono" style={{ color: TEXT_MUTED }}>{IRAN_SITES.length} tracked sites · Click dot for details</div>
                </div>
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

            {/* Recent alerts */}
            {stats.recentAlerts.length > 0 && (
              <div>
                <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_MUTED }}>Recent</div>
                {stats.recentAlerts.map(a => {
                  const meta = THREAT_META[a.threatType] || { icon: '⚠', color: '#ef4444' };
                  const now2 = Date.now();
                  const elapsed = Math.floor((now2 - new Date(a.timestamp).getTime()) / 1000);
                  const isActive = elapsed < a.countdown || a.countdown === 0;
                  const timeStr = elapsed < 60 ? `${elapsed}s` : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m` : `${Math.floor(elapsed / 3600)}h`;
                  return (
                    <div key={a.id} className="flex items-center gap-1.5 py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color, boxShadow: isActive ? `0 0 5px ${meta.color}` : undefined }} />
                      <span className="font-mono text-[9px] flex-1 truncate" style={{ color: TEXT_BASE }}>{language === 'ar' ? a.cityAr : a.city}</span>
                      <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom-left: legend ──────────────────────────────── */}
      {!isMobile && (
        <div className="absolute bottom-10 left-2 z-10" style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col gap-0.5 p-2.5 rounded-xl" style={{ background: PANEL_BG, border: PANEL_BORDER, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_MUTED }}>Country</div>
            {Object.entries(COUNTRY_COLORS).filter(([g]) => regionCounts[g] > 0 || g === 'iran').map(([group, color]) => {
              const label: Record<string, string> = { levant: '🇮🇱 Levant', lebanon: '🇱🇧 Lebanon', iran: '🇮🇷 Iran', iraq: '🇮🇶 Iraq', gcc: '🏜️ GCC', other: '📍 Other' };
              return (
                <div key={group} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}77` }} />
                  <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>{label[group]}</span>
                </div>
              );
            })}
            <div className="mt-1.5 pt-1.5 flex flex-col gap-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444' }} />
                <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'transparent', border: '1.5px solid #22c55e' }} />
                <span className="text-[8px] font-mono" style={{ color: TEXT_BASE }}>Live</span>
              </div>
              {showTrajectory && (
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 14, height: 2, background: '#fb923c', borderRadius: 1 }} />
                  <span className="text-[8px] font-mono" style={{ color: '#fb923c' }}>Iran → IL Arc</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom stats strip ───────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-3 py-1.5"
        style={{ background: 'rgba(6,6,14,0.92)', borderTop: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(14px)' }}>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: INDIGO }} />
          <span className="text-[8px] font-mono font-black uppercase tracking-widest" style={{ color: INDIGO }}>ALERT MAP</span>
        </div>
        <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-3 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: TEXT_BASE }}>{stats.total} total</span>
          {stats.active > 0 && <span className="font-mono text-[9px] font-bold text-red-400 shrink-0">● {stats.active} active</span>}
          {stats.live > 0 && <span className="font-mono text-[9px] font-bold text-emerald-400 shrink-0">◉ {stats.live} live</span>}
          {iranAlertCount > 0 && <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: '#fb923c' }}>🇮🇷 {iranAlertCount}</span>}
          {topMeta && stats.topType && <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>{topMeta.icon} {topMeta.label} ({stats.topType[1]})</span>}
          {stats.topCountry && <span className="font-mono text-[8px] shrink-0" style={{ color: TEXT_MUTED }}>📍 {stats.topCountry[0]}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => mapRef.current?.zoomIn()} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: TEXT_BASE }}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()} className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: TEXT_BASE }}>−</button>
        </div>
      </div>
    </div>
  );
}
