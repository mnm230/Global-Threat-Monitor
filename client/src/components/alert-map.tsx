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

export default function AlertMap({ alerts, language }: { alerts: RedAlert[]; language: 'en' | 'ar' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const layersAddedRef = useRef(false);
  const hasFittedRef = useRef(false);
  const popupRef = useRef<Popup | null>(null);
  const geoJsonRef = useRef<{ type: 'FeatureCollection'; features: any[] } | null>(null);

  const [theme, setTheme] = useState<MapTheme>('light');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<'stats' | 'prediction'>('stats');
  const [screenWidth, setScreenWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobileView = screenWidth < 768;
  const isTabletView = screenWidth >= 768 && screenWidth < 1200;

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
        zoom: isMobileView ? 3.8 : isTabletView ? 4.0 : 4.2,
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

  // Stats derived from alerts prop
  const statsData = useMemo(() => {
    const now = Date.now();
    const total = alerts.length;
    const active = alerts.filter(a => {
      const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
      return a.countdown === 0 || elapsed < a.countdown;
    }).length;
    const past = total - active;

    const byGroup: Record<string, number> = { gcc: 0, levant: 0, lebanon: 0, iran: 0, iraq: 0, other: 0 };
    const byType: Record<string, number> = {};
    const cityCount: Record<string, number> = {};

    alerts.forEach(a => {
      const group = GCC_COUNTRIES.has(a.country || '') ? 'gcc'
        : a.country === 'Lebanon' ? 'lebanon'
        : a.country === 'Iran' ? 'iran'
        : a.country === 'Iraq' ? 'iraq'
        : (a.country === 'Israel' || a.country === 'Palestine' || a.country === 'Gaza') ? 'levant'
        : 'other';
      byGroup[group] = (byGroup[group] || 0) + 1;
      const t = a.threatType || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
      if (a.city) cityCount[a.city] = (cityCount[a.city] || 0) + 1;
    });

    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const topGroup = Object.entries(byGroup).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
    const hotCity = Object.entries(cityCount).sort((a, b) => b[1] - a[1])[0];
    const liveCount = alerts.filter(a => a.source === 'live').length;

    return { total, active, past, byGroup, byType, topType, topGroup, hotCity, liveCount };
  }, [alerts]);

  // Fun prediction engine
  const prediction = useMemo(() => {
    const { total, active, byGroup, byType } = statsData;

    const tension = Math.min(100, Math.round(
      (active / Math.max(total, 1)) * 80 + (total > 50 ? 20 : total > 20 ? 10 : 0)
    ));

    const tensionData =
      tension >= 80 ? { label: 'ABSOLUTE CHAOS', emoji: '🔥', color: '#dc2626' }
      : tension >= 60 ? { label: 'VERY HOT', emoji: '⚡', color: '#ea580c' }
      : tension >= 40 ? { label: 'HEATING UP', emoji: '😬', color: '#f59e0b' }
      : tension >= 20 ? { label: 'TENSE', emoji: '😐', color: '#3b82f6' }
      : { label: 'SUSPICIOUSLY QUIET', emoji: '😴', color: '#22c55e' };

    const allQuotes = [
      { min: 80,  text: "At this rate, the map needs a fire extinguisher." },
      { min: 80,  text: "Intel suggests someone skipped diplomacy 101." },
      { min: 60,  text: "Things are spicier than a Yemeni hot sauce." },
      { min: 60,  text: "The region is having a very energetic Tuesday." },
      { min: 40,  text: "Threat level: your average Monday morning commute." },
      { min: 40,  text: "Analysts recommend bringing an umbrella. And a helmet." },
      { min: 20,  text: "Relatively calm. Suspicious, but calm." },
      { min: 20,  text: "Either everyone's napping or plotting something." },
      { min: 0,   text: "Perfect weather for not being in a conflict zone." },
      { min: 0,   text: "Quiet enough to hear diplomats pretending to talk." },
    ];
    const eligibleQuotes = allQuotes.filter(q => tension >= q.min);
    const quoteIdx = (total * 7 + active * 3) % eligibleQuotes.length;
    const quote = eligibleQuotes[quoteIdx]?.text ?? "The situation defies description.";

    const topGroupLabel: Record<string, string> = {
      gcc: 'GCC', levant: 'Levant', lebanon: 'Lebanon', iran: 'Iran', iraq: 'Iraq',
    };
    const topRegionEntry = Object.entries(byGroup).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
    const topRegionName = topRegionEntry ? (topGroupLabel[topRegionEntry[0]] || topRegionEntry[0]) : 'Unknown';

    const topTypeEntry = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const topTypeLabel = topTypeEntry ? topTypeEntry[0].replace(/_/g, ' ') : 'unknown';

    // Probability bars (pattern-derived, not random)
    const escProb = Math.min(93, 15 + active * 6 + (total > 60 ? 20 : total > 30 ? 10 : 0));
    const deescProb = Math.max(5, 85 - escProb);
    const interceptProb = Math.min(90, 30 + (byType['rockets'] || 0) * 2);

    // Dramatic city prediction
    const cityPicks = ['Jizan', 'Tel Aviv', 'Beirut', 'Sana\'a', 'Riyadh', 'Haifa', 'Gaza City', 'Baghdad'];
    const predCity = cityPicks[(total + active * 2) % cityPicks.length];

    // Fun risk badges
    const riskBadge =
      tension >= 75 ? { text: 'SEND HELP', bg: '#dc2626', fg: '#fff' }
      : tension >= 50 ? { text: 'EYES ON', bg: '#ea580c', fg: '#fff' }
      : tension >= 25 ? { text: 'WATCHFUL', bg: '#f59e0b', fg: '#000' }
      : { text: 'NAP TIME', bg: '#22c55e', fg: '#000' };

    return { tension, tensionData, quote, escProb, deescProb, interceptProb, predCity, topRegionName, topTypeLabel, riskBadge };
  }, [statsData]);

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
      <div className={`absolute top-2 left-2 z-10 flex ${isMobileView ? 'flex-row gap-1.5' : 'flex-col gap-2'}`} style={isMobileView ? { left: 6, top: 6 } : undefined}>
        {/* Theme toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
          {(['light', 'dark'] as MapTheme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              title={t === 'light' ? 'Light map' : 'Dark map'}
              className={`flex items-center gap-1 ${isMobileView ? 'px-1.5 py-1' : 'px-2 py-1'} rounded-md transition-all active:scale-95`}
              style={{
                background: theme === t ? (t === 'dark' ? 'rgba(30,35,60,0.95)' : 'rgba(255,255,255,1)') : 'transparent',
                border: theme === t ? `1px solid ${t === 'dark' ? 'rgba(100,120,200,0.4)' : 'rgba(0,0,0,0.15)'}` : '1px solid transparent',
                boxShadow: theme === t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <span style={{ fontSize: isMobileView ? 10 : 12, lineHeight: 1 }}>{t === 'light' ? '☀️' : '🌙'}</span>
              {!isMobileView && (
                <span className="text-[9px] font-mono font-bold uppercase" style={{ color: theme === t ? (t === 'dark' ? 'rgba(180,200,255,0.9)' : '#333') : textMuted }}>
                  {t}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Region quick-jump — horizontal on mobile, vertical on tablet/desktop */}
        {isMobileView ? (
          <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', maxWidth: 'calc(100vw - 80px)' }}>
            {REGIONS.map(r => {
              const count = regionCounts[r.id] || 0;
              const isActive = activeRegion === r.id;
              const regionColor: Record<string, string> = { all: '#94a3b8', levant: '#3b82f6', lebanon: '#22c55e', gcc: '#f97316', iran: '#a855f7', iraq: '#f59e0b' };
              const color = regionColor[r.id] || '#94a3b8';
              return (
                <button key={r.id} onClick={() => flyToRegion(r)} className="px-1.5 py-0.5 rounded transition-all active:scale-95"
                  style={{ background: isActive ? `${color}22` : 'transparent', border: isActive ? `1px solid ${color}40` : '1px solid transparent' }}>
                  <span className="text-[8px] font-mono font-bold" style={{ color: isActive ? color : textMuted }}>{r.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-1.5 rounded-lg" style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
            <div className="text-[7px] font-mono font-bold uppercase tracking-widest px-1 mb-0.5" style={{ color: textMuted }}>Jump to</div>
            {REGIONS.map(r => {
              const count = regionCounts[r.id] || 0;
              const isActive = activeRegion === r.id;
              const regionColor: Record<string, string> = { all: '#94a3b8', levant: '#3b82f6', lebanon: '#22c55e', gcc: '#f97316', iran: '#a855f7', iraq: '#f59e0b' };
              const color = regionColor[r.id] || '#94a3b8';
              return (
                <button key={r.id} onClick={() => flyToRegion(r)} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md transition-all active:scale-95"
                  style={{ background: isActive ? `${color}18` : 'transparent', border: isActive ? `1px solid ${color}40` : '1px solid transparent', minWidth: isTabletView ? 100 : 110 }}>
                  <span className={`${isTabletView ? 'text-[8px]' : 'text-[9px]'} font-mono font-bold`} style={{ color: isActive ? color : textMuted }}>{r.label}</span>
                  {count > 0 && (
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full" style={{ background: `${color}25`, color }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom-left: threat legend (hidden on mobile to save space) ── */}
      {!isMobileView && (
        <div className={`absolute ${isTabletView ? 'bottom-4 left-2' : 'bottom-6 left-3'} z-10 p-2 rounded-lg`} style={{ background: panelBg, border: panelBorder, backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>
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
          {!isTabletView && (
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
          )}
        </div>
      )}

      {/* ── Stats/Prediction toggle button ───────────────────── */}
      <button
        onClick={() => setShowPanel(p => !p)}
        title="Stats & Prediction"
        className={`absolute top-2 right-2 z-10 flex items-center gap-1.5 ${isMobileView ? 'px-2 py-1' : 'px-2.5 py-1.5'} rounded-lg font-mono font-bold text-[10px] transition-all active:scale-95`}
        style={{
          background: showPanel ? '#3b82f6' : panelBg,
          border: showPanel ? '1px solid #2563eb' : panelBorder,
          color: showPanel ? '#fff' : textBase,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
        }}
      >
        <span style={{ fontSize: isMobileView ? 11 : 13 }}>📊</span>
        {!isMobileView && 'STATS'}
      </button>

      {/* ── Stats & Prediction panel ──────────────────────────── */}
      {showPanel && (
        <div
          className={`absolute ${isMobileView ? 'top-10 right-2 left-2' : 'top-14 right-3'} z-10 rounded-xl overflow-hidden flex flex-col`}
          style={{
            width: isMobileView ? 'auto' : isTabletView ? 220 : 240,
            maxHeight: isMobileView ? 'calc(100% - 3.5rem)' : 'calc(100% - 7rem)',
            background: panelBg,
            border: panelBorder,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: panelBorder }}>
            {(['stats', 'prediction'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className="flex-1 py-2 text-[9px] font-mono font-black uppercase tracking-wider transition-all"
                style={{
                  background: panelTab === tab ? (isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)') : 'transparent',
                  color: panelTab === tab ? '#3b82f6' : textMuted,
                  borderBottom: panelTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {tab === 'stats' ? '📈 Stats' : '🔮 Predict'}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto" style={{ flex: 1 }}>
            {panelTab === 'stats' ? (
              <div className="p-3 flex flex-col gap-3">
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Total', value: statsData.total, color: '#94a3b8' },
                    { label: 'Active', value: statsData.active, color: '#dc2626' },
                    { label: 'Past', value: statsData.past, color: '#64748b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center rounded-lg py-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      <span className="font-mono font-black text-base" style={{ color }}>{value}</span>
                      <span className="font-mono text-[7px] uppercase tracking-wider mt-0.5" style={{ color: textMuted }}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Live badge */}
                {statsData.liveCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-[8px] font-bold text-green-500">{statsData.liveCount} LIVE alerts</span>
                  </div>
                )}

                {/* By region */}
                <div>
                  <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: textMuted }}>By Region</div>
                  {Object.entries(statsData.byGroup)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([group, count]) => {
                      const regionMeta: Record<string, { label: string; color: string; flag: string }> = {
                        gcc:     { label: 'GCC',     color: '#f97316', flag: '🛡' },
                        levant:  { label: 'Levant',  color: '#3b82f6', flag: '🗺' },
                        lebanon: { label: 'Lebanon', color: '#22c55e', flag: '🇱🇧' },
                        iran:    { label: 'Iran',    color: '#a855f7', flag: '🇮🇷' },
                        iraq:    { label: 'Iraq',    color: '#f59e0b', flag: '🇮🇶' },
                        other:   { label: 'Other',   color: '#64748b', flag: '🌍' },
                      };
                      const meta = regionMeta[group] || { label: group, color: '#94a3b8', flag: '📍' };
                      const pct = Math.round((count / Math.max(statsData.total, 1)) * 100);
                      return (
                        <div key={group} className="mb-1.5 last:mb-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-mono text-[9px] font-bold" style={{ color: textBase }}>{meta.flag} {meta.label}</span>
                            <span className="font-mono text-[8px]" style={{ color: textMuted }}>{count} ({pct}%)</span>
                          </div>
                          <div className="w-full rounded-full h-1" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                            <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color, opacity: 0.8 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* By threat type */}
                <div>
                  <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: textMuted }}>By Threat Type</div>
                  {Object.entries(statsData.byType)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([type, count]) => {
                      const color = THREAT_COLORS[type] || '#94a3b8';
                      const pct = Math.round((count / Math.max(statsData.total, 1)) * 100);
                      return (
                        <div key={type} className="flex items-center gap-2 mb-1 last:mb-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="font-mono text-[8px] flex-1 truncate" style={{ color: textBase }}>{type.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[8px] font-bold" style={{ color }}>{count}</span>
                        </div>
                      );
                    })}
                </div>

                {/* Hot city */}
                {statsData.hotCity && (
                  <div className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color: textMuted }}>Hottest City</div>
                    <span className="font-mono text-[10px] font-black" style={{ color: '#dc2626' }}>🔴 {statsData.hotCity[0]}</span>
                    <span className="font-mono text-[8px] ml-1.5" style={{ color: textMuted }}>{statsData.hotCity[1]} alerts</span>
                  </div>
                )}
              </div>
            ) : (
              /* ── Prediction tab ── */
              <div className="p-3 flex flex-col gap-3">
                {/* Risk badge */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[7px] uppercase tracking-widest" style={{ color: textMuted }}>Analyst Risk Rating</span>
                  <span className="font-mono text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: prediction.riskBadge.bg, color: prediction.riskBadge.fg }}>
                    {prediction.riskBadge.text}
                  </span>
                </div>

                {/* Tension-O-Meter */}
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: panelBorder }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>TENSION-O-METER</span>
                    <span className="font-mono text-[8px] font-black" style={{ color: prediction.tensionData.color }}>{prediction.tension}%</span>
                  </div>
                  <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${prediction.tension}%`,
                        background: `linear-gradient(to right, #22c55e, #f59e0b, #dc2626)`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <span style={{ fontSize: 14 }}>{prediction.tensionData.emoji}</span>
                    <span className="font-mono text-[9px] font-black" style={{ color: prediction.tensionData.color }}>{prediction.tensionData.label}</span>
                  </div>
                </div>

                {/* Analyst quote */}
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <div className="font-mono text-[7px] font-bold uppercase tracking-widest mb-1.5 text-blue-400">🧠 Senior Analyst Says</div>
                  <div className="font-mono text-[9px] italic leading-relaxed" style={{ color: textBase }}>"{prediction.quote}"</div>
                </div>

                {/* Probability bars */}
                <div>
                  <div className="text-[7px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: textMuted }}>Next-Hour Forecast</div>
                  {[
                    { label: '📈 Escalation', prob: prediction.escProb, color: '#dc2626' },
                    { label: '📉 De-escalation', prob: prediction.deescProb, color: '#22c55e' },
                    { label: '🛡 Intercept rate', prob: prediction.interceptProb, color: '#3b82f6' },
                  ].map(({ label, prob, color }) => (
                    <div key={label} className="mb-2 last:mb-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-mono text-[8px]" style={{ color: textBase }}>{label}</span>
                        <span className="font-mono text-[8px] font-black" style={{ color }}>{prob}%</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${prob}%`, background: color, opacity: 0.85 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Predicted next target */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <div className="font-mono text-[7px] font-bold uppercase tracking-widest mb-1" style={{ color: '#dc2626' }}>🎯 Next Predicted Hotspot</div>
                  <div className="font-mono text-[11px] font-black" style={{ color: textBase }}>{prediction.predCity}</div>
                  <div className="font-mono text-[8px] mt-0.5" style={{ color: textMuted }}>
                    Region: {prediction.topRegionName} · Primary threat: {prediction.topTypeLabel}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="font-mono text-[7px] text-center" style={{ color: textMuted, opacity: 0.6 }}>
                  * Predictions are pattern-derived estimates.<br/>Not a substitute for actual intelligence.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Zoom controls ────────────────────────────────────── */}
      <div className={`absolute ${isMobileView ? 'bottom-3 right-2' : 'bottom-6 right-3'} z-10 flex flex-col gap-1`}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          className={`${isMobileView ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center rounded-md font-bold transition-all active:scale-95`}
          style={{ background: panelBg, border: panelBorder, color: textBase, fontSize: isMobileView ? 16 : 18, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          className={`${isMobileView ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center rounded-md font-bold transition-all active:scale-95`}
          style={{ background: panelBg, border: panelBorder, color: textBase, fontSize: isMobileView ? 16 : 18, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        >−</button>
      </div>
    </div>
  );
}
