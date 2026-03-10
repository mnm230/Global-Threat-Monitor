import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { MapPin } from 'lucide-react';
import type { ConflictEvent, FlightData, RedAlert, ThermalHotspot } from '@shared/schema';

// ── Map styles ────────────────────────────────────────────────────────────────
const MAP_THEMES = {
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;
type MapTheme = keyof typeof MAP_THEMES;

const DEFAULT_STYLE = MAP_THEMES.dark;

// ── Static intel data ─────────────────────────────────────────────────────────
const MILITARY_BASES = [
  { name: 'Al Udeid AB', lat: 25.117, lng: 51.315, country: 'Qatar',        operator: 'US CENTCOM' },
  { name: 'Al Dhafra AB', lat: 24.248, lng: 54.547, country: 'UAE',         operator: 'US Air Force' },
  { name: 'Incirlik AB',  lat: 37.002, lng: 35.426, country: 'Turkey',       operator: 'USAF / NATO' },
  { name: 'Ramat David',  lat: 32.665, lng: 35.188, country: 'Israel',       operator: 'IAF' },
  { name: 'Nevatim AFB',  lat: 31.208, lng: 34.962, country: 'Israel',       operator: 'IAF' },
  { name: 'Palmachim',    lat: 31.898, lng: 34.691, country: 'Israel',       operator: 'IAF / Mossad' },
  { name: 'Bandar Abbas', lat: 27.183, lng: 56.267, country: 'Iran',         operator: 'IRIAF' },
  { name: 'Isfahan AFB',  lat: 32.655, lng: 51.668, country: 'Iran',         operator: 'IRIAF' },
  { name: 'Camp Lemonnier', lat: 11.547, lng: 43.146, country: 'Djibouti',  operator: 'US CJTF-HOA' },
  { name: 'Prince Sultan AB', lat: 24.062, lng: 47.580, country: 'Saudi Arabia', operator: 'USAF' },
  { name: 'Isa AB',       lat: 25.918, lng: 50.591, country: 'Bahrain',      operator: 'US 5th Fleet' },
  { name: 'Al Tanf',      lat: 33.513, lng: 38.661, country: 'Syria',        operator: 'US SOF' },
  { name: 'Tartus NB',    lat: 34.890, lng: 35.870, country: 'Syria',        operator: 'Russian Navy' },
  { name: 'Hatzerim AFB', lat: 31.233, lng: 34.662, country: 'Israel',       operator: 'IAF' },
];

const NUCLEAR_SITES = [
  { name: 'Natanz Enrichment', lat: 33.724, lng: 51.727, country: 'Iran',   type: 'Enrichment Facility' },
  { name: 'Fordow Enrichment', lat: 34.881, lng: 51.577, country: 'Iran',   type: 'Underground Enrichment' },
  { name: 'Bushehr NPP',       lat: 28.830, lng: 50.888, country: 'Iran',   type: 'Power Plant' },
  { name: 'Isfahan UCF',       lat: 32.654, lng: 51.668, country: 'Iran',   type: 'Conversion Facility' },
  { name: 'Arak Heavy Water',  lat: 34.379, lng: 49.247, country: 'Iran',   type: 'Heavy Water Reactor' },
  { name: 'Parchin Complex',   lat: 35.526, lng: 51.774, country: 'Iran',   type: 'Research / Explosives' },
  { name: 'Dimona Reactor',    lat: 31.070, lng: 35.206, country: 'Israel', type: 'Undeclared Reactor' },
  { name: 'Sorek Research',    lat: 31.868, lng: 34.705, country: 'Israel', type: 'Research Reactor' },
];

// ── Layer config (grouped) ────────────────────────────────────────────────────
const LAYER_GROUPS = [
  {
    id: 'live', label: 'LIVE FEEDS', color: '#ef4444',
    layers: [
      { key: 'events',  label: 'Conflict Events', color: '#ef4444', on: true  },
      { key: 'alerts',  label: 'Red Alerts',      color: '#f43f5e', on: true  },
      { key: 'thermal', label: 'NASA FIRMS Thermal', color: '#f97316', on: true },
    ],
  },
  {
    id: 'military', label: 'MILITARY', color: '#3b82f6',
    layers: [
      { key: 'bases',   label: 'Military Bases',  color: '#3b82f6', on: false },
      { key: 'nuclear', label: 'Nuclear Sites',   color: '#a855f7', on: false },
    ],
  },
] as const;

type LayerKey = typeof LAYER_GROUPS[number]['layers'][number]['key'];
const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

// ── Region presets ────────────────────────────────────────────────────────────
const REGIONS: Record<string, { lng: number; lat: number; zoom: number }> = {
  MENA:   { lng: 42,   lat: 28,  zoom: 4   },
  LEVANT: { lng: 36,   lat: 32,  zoom: 6   },
  GULF:   { lng: 52,   lat: 26,  zoom: 6   },
  GLOBAL: { lng: 42,   lat: 26,  zoom: 3.5 },
};

const VIEW_INIT: Record<string, { lng: number; lat: number; zoom: number }> = {
  conflict: { lng: 47, lat: 31, zoom: 5 },
  flights:  { lng: 48, lat: 32, zoom: 5 },
  maritime: { lng: 56, lat: 26, zoom: 7 },
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipState {
  x: number; y: number;
  title: string; sub: string; badge?: string; color?: string;
}

// ── Event colors (maplibre match expressions) ────────────────────────────────
const EVENT_COLOR_EXPR = [
  'match', ['get', 'type'],
  'missile', '#ef4444', 'airstrike', '#f97316', 'defense', '#22d3ee',
  'naval', '#3b82f6', 'ground', '#eab308', 'nuclear', '#a855f7',
  '#ef4444',
] as unknown as maplibregl.Expression;

const EVENT_HEX: Record<string, string> = {
  missile: '#ef4444', airstrike: '#f97316', defense: '#22d3ee',
  naval: '#3b82f6', ground: '#eab308', nuclear: '#a855f7',
};

// ── GeoJSON helpers ───────────────────────────────────────────────────────────
function toGFC<T extends { lat: number; lng: number }>(data: T[]) {
  return {
    type: 'FeatureCollection' as const,
    features: data.map(d => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
      properties: d as unknown as Record<string, unknown>,
    })),
  };
}

const EMPTY_GFC = { type: 'FeatureCollection' as const, features: [] };

// ── Source / layer IDs ────────────────────────────────────────────────────────
const SOURCE_IDS = ['alerts', 'events', 'thermal', 'bases', 'nuclear'] as const;
const MAP_LAYER_IDS = [
  'alerts-ring', 'alerts-core',
  'events-dots', 'events-labels',
  'thermal-dots', 'bases-dots', 'nuclear-dots',
] as const;

// ── Add all native layers to map ──────────────────────────────────────────────
function addAllLayers(map: MapLibreMap, isMobile: boolean) {
  // Remove any existing layers/sources first (style change re-init)
  for (const id of MAP_LAYER_IDS) { try { if (map.getLayer(id)) map.removeLayer(id); } catch {} }
  for (const id of SOURCE_IDS)    { try { if (map.getSource(id)) map.removeSource(id); } catch {} }

  for (const id of SOURCE_IDS) {
    map.addSource(id, { type: 'geojson', data: EMPTY_GFC });
  }

  // Alerts — pulsing ring (opacity animated via rAF)
  map.addLayer({ id: 'alerts-ring', type: 'circle', source: 'alerts', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 14, 8, 32] as unknown as maplibregl.Expression,
    'circle-color': '#ef4444',
    'circle-opacity': 0.12,
    'circle-stroke-width': 0,
  }});

  // Alerts — core dot
  map.addLayer({ id: 'alerts-core', type: 'circle', source: 'alerts', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 8, 11] as unknown as maplibregl.Expression,
    'circle-color': '#ef4444',
    'circle-opacity': 0.9,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffc8c8',
    'circle-stroke-opacity': 0.8,
  }});

  // Events dots
  map.addLayer({ id: 'events-dots', type: 'circle', source: 'events', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'],
      3, ['match', ['get', 'severity'], 'critical', 7, 'high', 5.5, 'medium', 4, 2.8],
      8, ['match', ['get', 'severity'], 'critical', 13, 'high', 11, 'medium', 8, 5.6],
    ] as unknown as maplibregl.Expression,
    'circle-color': EVENT_COLOR_EXPR,
    'circle-opacity': ['match', ['get', 'severity'], 'critical', 0.86, 0.67] as unknown as maplibregl.Expression,
    'circle-stroke-width': 1,
    'circle-stroke-color': EVENT_COLOR_EXPR,
    'circle-stroke-opacity': 1,
  }});

  // Events labels (skip on mobile — expensive)
  if (!isMobile) {
    map.addLayer({ id: 'events-labels', type: 'symbol', source: 'events',
      filter: ['==', ['get', 'severity'], 'critical'],
      layout: {
        'text-field': ['upcase', ['get', 'type']],
        'text-font': ['Noto Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, -1.6],
        'text-anchor': 'bottom',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': EVENT_COLOR_EXPR,
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
        'text-opacity': 0.8,
      },
    });
  }

  // Thermal hotspots
  map.addLayer({ id: 'thermal-dots', type: 'circle', source: 'thermal', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2, 8, 9] as unknown as maplibregl.Expression,
    'circle-color': ['match', ['get', 'confidence'], 'high', '#ff5000', '#ff8c14'] as unknown as maplibregl.Expression,
    'circle-opacity': ['match', ['get', 'confidence'], 'high', 0.59, 0.37] as unknown as maplibregl.Expression,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#ff5000',
    'circle-stroke-opacity': 0.63,
  }});

  // Military bases
  map.addLayer({ id: 'bases-dots', type: 'circle', source: 'bases', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 9] as unknown as maplibregl.Expression,
    'circle-color': '#3b82f6',
    'circle-opacity': 0.63,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#3b82f6',
    'circle-stroke-opacity': 0.86,
  }});

  // Nuclear sites
  map.addLayer({ id: 'nuclear-dots', type: 'circle', source: 'nuclear', paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 9] as unknown as maplibregl.Expression,
    'circle-color': '#a855f7',
    'circle-opacity': 0.63,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#a855f7',
    'circle-stroke-opacity': 0.9,
  }});
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ConflictMapProps {
  events: ConflictEvent[];
  flights?: FlightData[];
  redAlerts?: RedAlert[];
  thermalHotspots?: ThermalHotspot[];
  activeView: 'conflict' | 'flights' | 'maritime';
  language?: 'en' | 'ar';
  mapStyle?: string;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
  isVisible?: boolean;
}

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConflictMap({
  events, flights = [], redAlerts = [], thermalHotspots = [],
  activeView, mapStyle = DEFAULT_STYLE, focusLocation, isVisible = true,
}: ConflictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MapLibreMap | null>(null);
  const isVisibleRef = useRef(isVisible);

  const [vis, setVis] = useState<Record<LayerKey, boolean>>(
    () => Object.fromEntries(ALL_LAYERS.map(l => [l.key, l.on])) as Record<LayerKey, boolean>
  );
  const [sidebarOpen, setSidebarOpen] = useState(!IS_MOBILE);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LAYER_GROUPS.map(g => [g.id, true]))
  );
  const [theme, setTheme] = useState<MapTheme>('dark');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mapInitError, setMapInitError] = useState(false);
  const [mapRetryCount, setMapRetryCount] = useState(0);

  const activeStyleUrl = MAP_THEMES[theme];

  // ── Fly to focused location ──────────────────────────────────────────────
  useEffect(() => {
    if (focusLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [focusLocation.lng, focusLocation.lat],
        zoom: focusLocation.zoom ?? 8,
        duration: 1000,
      });
    }
  }, [focusLocation]);

  // ── Switch theme ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) mapRef.current.setStyle(activeStyleUrl);
  }, [activeStyleUrl]);

  // ── Visibility ref ───────────────────────────────────────────────────────
  useEffect(() => {
    isVisibleRef.current = isVisible;
    if (isVisible && mapRef.current) {
      requestAnimationFrame(() => mapRef.current?.resize());
    }
  }, [isVisible]);

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapInitError) return;
    try {
      const init = VIEW_INIT[activeView] || VIEW_INIT.conflict;
      const map = new MapLibreMap({
        container: containerRef.current,
        style: activeStyleUrl,
        center: [init.lng, init.lat],
        zoom: init.zoom,
        attributionControl: false,
        antialias: !IS_MOBILE,
        fadeDuration: 0,
      });
      mapRef.current = map;

      // Attribution
      map.addControl(
        new (class {
          onAdd() {
            const d = document.createElement('div');
            d.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.2);padding:2px 6px;pointer-events:none;font-family:monospace';
            d.textContent = '© CARTO · © OpenStreetMap';
            return d;
          }
          onRemove() {}
        })(),
        'bottom-right'
      );

      const setupLayers = () => {
        if (!map.isStyleLoaded()) return;
        addAllLayers(map, IS_MOBILE);

        // Tooltip via mousemove on each interactive layer
        const interactiveLayers: Array<[string, (p: Record<string, string>) => Omit<TooltipState, 'x' | 'y'> | null]> = [
          ['alerts-core', p => ({
            title: `🚨 ${p.city || 'Alert'}`,
            sub: `${p.threatType || ''} · ${p.region || ''} · ${p.country || ''}`,
            badge: p.countdown ? `${p.countdown}s` : undefined,
            color: '#ef4444',
          })],
          ['events-dots', p => ({
            title: p.title || p.type || 'Event',
            sub: p.description || '',
            badge: p.type && p.severity ? `${p.type.toUpperCase()} · ${p.severity.toUpperCase()}` : undefined,
            color: EVENT_HEX[p.type] || '#ef4444',
          })],
          ['thermal-dots', p => ({
            title: 'NASA FIRMS Thermal',
            sub: `Brightness ${Math.round(Number(p.brightness) || 0)}K · FRP ${Number(p.frp || 0).toFixed(1)} MW`,
            badge: (p.confidence || '').toUpperCase() || undefined,
            color: '#f97316',
          })],
          ['bases-dots', p => ({
            title: p.name || 'Base',
            sub: `${p.country || ''} · ${p.operator || ''}`,
            badge: 'MIL BASE',
            color: '#3b82f6',
          })],
          ['nuclear-dots', p => ({
            title: p.name || 'Site',
            sub: `${p.country || ''} · ${p.type || ''}`,
            badge: '☢ NUCLEAR',
            color: '#a855f7',
          })],
        ];

        for (const [layerId, parser] of interactiveLayers) {
          map.on('mousemove', layerId, (e) => {
            if (!e.features?.[0]) return;
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties as Record<string, string>;
            const parsed = parser(props);
            if (parsed) setTooltip({ x: e.point.x, y: e.point.y, ...parsed });
          });
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
            setTooltip(null);
          });
        }
      };

      map.on('load', setupLayers);
      // Re-add layers after style change (setStyle wipes custom layers)
      map.on('styledata', () => { if (map.isStyleLoaded()) setupLayers(); });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('[ConflictMap] Failed to initialize:', err);
      mapRef.current = null;
      setMapInitError(true);
    }
  }, [mapRetryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update source data when props change ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const activeAlerts = redAlerts.filter(a => a.lat && a.lng);
    (map.getSource('alerts') as GeoJSONSource | undefined)?.setData(toGFC(activeAlerts));
    (map.getSource('events') as GeoJSONSource | undefined)?.setData(toGFC(events));
    (map.getSource('thermal') as GeoJSONSource | undefined)?.setData(
      toGFC(thermalHotspots.filter(h => h.confidence !== 'low'))
    );
  }, [redAlerts, events, thermalHotspots]);

  // ── Update static sources (bases/nuclear) once ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource('bases') as GeoJSONSource | undefined)?.setData(toGFC(MILITARY_BASES));
    (map.getSource('nuclear') as GeoJSONSource | undefined)?.setData(toGFC(NUCLEAR_SITES));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer visibility ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const show = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    show('alerts-ring', vis.alerts);
    show('alerts-core', vis.alerts);
    show('events-dots', vis.events);
    if (!IS_MOBILE) show('events-labels', vis.events);
    show('thermal-dots', vis.thermal);
    show('bases-dots', vis.bases);
    show('nuclear-dots', vis.nuclear);
  }, [vis]);

  // ── Pulsing ring animation ────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    const MOBILE_SKIP = 3;
    let frame = 0;
    const tick = () => {
      frame++;
      if (isVisibleRef.current) {
        if (!IS_MOBILE || frame % MOBILE_SKIP === 0) {
          const map = mapRef.current;
          if (map && map.isStyleLoaded() && map.getLayer('alerts-ring')) {
            const alpha = 0.1 + 0.09 * Math.sin(Date.now() / 1000 * 2.4);
            map.setPaintProperty('alerts-ring', 'circle-opacity', alpha);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const flyTo = (region: { lng: number; lat: number; zoom: number }) => {
    mapRef.current?.flyTo({ center: [region.lng, region.lat], zoom: region.zoom, duration: 900 });
  };

  const toggleLayer = useCallback((key: string) =>
    setVis(prev => ({ ...prev, [key]: !prev[key] })), []);

  const tipLeft = tooltip ? Math.min(tooltip.x + 14, window.innerWidth - 240) : 0;
  const tipTop  = tooltip ? Math.max(tooltip.y - 10, 10) : 0;

  if (mapInitError) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#0a0c10] flex items-center justify-center">
        <div className="text-center p-6">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-primary/30" />
          <p className="text-xs font-mono text-foreground/40">Map unavailable</p>
          <p className="text-[10px] font-mono text-foreground/20 mt-1">WebGL initialization failed</p>
          <button
            onClick={() => { setMapInitError(false); setMapRetryCount(c => c + 1); }}
            className="mt-3 px-3 py-1.5 text-[10px] font-mono bg-primary/10 border border-primary/30 rounded hover:bg-primary/20 text-primary transition-colors"
            data-testid="button-retry-map"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0c10]">
      {/* MapLibre container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── Hover tooltip ──────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none select-none"
          style={{ left: tipLeft, top: tipTop }}
        >
          <div className="rounded-lg px-3 py-2.5 shadow-2xl backdrop-blur-md max-w-[240px]"
            style={{
              background: 'rgba(5,7,14,0.92)',
              border: `1px solid ${tooltip.color ?? '#22d3ee'}28`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 2px 16px ${tooltip.color ?? '#22d3ee'}12`,
            }}
          >
            {tooltip.badge && (
              <span
                className="inline-block text-[9px] font-black font-mono tracking-widest px-2 py-0.5 rounded-full mb-1.5"
                style={{
                  color: tooltip.color ?? '#22d3ee',
                  background: `${tooltip.color ?? '#22d3ee'}15`,
                  border: `1px solid ${tooltip.color ?? '#22d3ee'}30`,
                }}
              >
                {tooltip.badge}
              </span>
            )}
            <p className="text-[11px] font-bold text-white/88 leading-snug">{tooltip.title}</p>
            <p className="text-[10px] text-white/42 font-mono leading-relaxed mt-1">{tooltip.sub}</p>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-1/2 -translate-y-1/2 left-0 z-20 flex flex-col items-center justify-center gap-1.5 hover:bg-black/85 active:scale-95"
          style={{
            background: 'rgba(6,8,14,0.82)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            padding: '10px 6px',
            transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <span className="text-white/35 text-[12px] leading-none">›</span>
          <span className="font-mono font-bold uppercase text-white/20" style={{ fontSize: 7, letterSpacing: '0.2em', writingMode: 'vertical-rl' }}>Layers</span>
        </button>
      )}

      <div
        className="absolute top-0 left-0 h-full z-20 flex flex-col transition-transform duration-300"
        style={{
          width: IS_MOBILE ? 190 : 210,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          background: IS_MOBILE ? 'rgba(6,8,14,0.97)' : 'rgba(6,8,14,0.88)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: IS_MOBILE ? undefined : 'blur(8px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{boxShadow:'0 0 5px rgba(34,211,238,0.6)'}} />
            <span className="text-[10px] font-black font-mono uppercase tracking-[0.18em] text-white/55">Map Layers</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white/65 hover:bg-white/[0.06] transition-all text-[16px] leading-none"
          >
            ‹
          </button>
        </div>

        {/* Region presets */}
        <div className="px-3 py-3 border-b border-white/[0.05] shrink-0">
          <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-white/18 mb-2">Zoom to Region</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(REGIONS).map(([label, vs]) => (
              <button
                key={label}
                onClick={() => flyTo(vs)}
                className="text-[9px] font-mono font-bold uppercase px-2 py-2 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/35 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-950/25 transition-all text-center"
                style={{ transition: 'all 0.14s cubic-bezier(0.4,0,0.2,1)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme toggle */}
        <div className="px-3 py-2.5 border-b border-white/[0.05] shrink-0">
          <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-white/18 mb-2">Map Style</p>
          <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['dark', 'light'] as MapTheme[]).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md"
                style={{
                  background: theme === t ? (t === 'dark' ? 'rgba(30,35,55,0.9)' : 'rgba(240,244,255,0.15)') : 'transparent',
                  border: theme === t ? `1px solid ${t === 'dark' ? 'rgba(100,120,180,0.35)' : 'rgba(200,210,255,0.3)'}` : '1px solid transparent',
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <span style={{ fontSize: 12, lineHeight: 1 }}>{t === 'dark' ? '🌙' : '☀️'}</span>
                <span
                  className="text-[9px] font-mono font-bold uppercase"
                  style={{
                    color: theme === t ? (t === 'dark' ? 'rgba(180,200,255,0.85)' : 'rgba(60,80,140,1)') : 'rgba(255,255,255,0.25)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {t === 'dark' ? 'Dark' : 'Light'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Layer groups */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          {LAYER_GROUPS.map(group => (
            <div key={group.id}>
              <button
                className="w-full flex items-center justify-between py-1.5 mb-0.5 rounded-md px-1 hover:bg-white/[0.03] transition-all"
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                style={{ transition: 'all 0.14s ease' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: group.color, boxShadow: `0 0 4px ${group.color}88` }} />
                  <span className="text-[9px] font-mono font-black uppercase tracking-[0.16em]" style={{ color: group.color + '99' }}>
                    {group.label}
                  </span>
                </div>
                <span className="text-white/18 text-[10px]" style={{ transition: 'transform 0.15s ease', transform: expandedGroups[group.id] ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>▾</span>
              </button>

              {expandedGroups[group.id] && (
                <div className="flex flex-col gap-0.5 pl-2.5">
                  {group.layers.map(cfg => {
                    const count =
                      cfg.key === 'events'  ? events.length :
                      cfg.key === 'alerts'  ? redAlerts.filter(a => a.lat && a.lng).length :
                      cfg.key === 'thermal' ? thermalHotspots.filter(h => h.confidence !== 'low').length :
                      cfg.key === 'bases'   ? MILITARY_BASES.length :
                      cfg.key === 'nuclear' ? NUCLEAR_SITES.length : 0;
                    const on = vis[cfg.key];
                    return (
                      <button
                        key={cfg.key}
                        onClick={() => toggleLayer(cfg.key)}
                        className="flex items-center gap-2 py-1.5 px-1.5 rounded-md hover:bg-white/[0.04] group"
                        style={{ transition: 'all 0.14s cubic-bezier(0.4,0,0.2,1)' }}
                      >
                        <div
                          className="relative w-7 h-3.5 rounded-full shrink-0"
                          style={{ background: on ? cfg.color + '50' : 'rgba(255,255,255,0.07)', transition: 'background 0.18s ease' }}
                        >
                          <div
                            className="absolute top-0.5 bottom-0.5 aspect-square rounded-full shadow-sm"
                            style={{
                              background: on ? cfg.color : 'rgba(255,255,255,0.28)',
                              left: on ? 'calc(100% - 11px)' : '2px',
                              transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1), background 0.18s ease',
                            }}
                          />
                        </div>
                        <span
                          className="text-[9px] font-mono flex-1 text-left"
                          style={{ color: on ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)', transition: 'color 0.14s ease' }}
                        >
                          {cfg.label}
                        </span>
                        <span
                          className="text-[8px] font-mono tabular-nums min-w-[20px] text-right"
                          style={{ color: on && count > 0 ? cfg.color + 'bb' : 'rgba(255,255,255,0.1)', transition: 'color 0.14s ease' }}
                        >
                          {count > 0 ? count : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
          <div className="flex gap-0 divide-x divide-white/[0.06]">
            {[
              { label: 'Alerts', value: redAlerts.filter(a => a.lat && a.lng).length, color: '#f87171' },
              { label: 'Events', value: events.length, color: '#fb923c' },
              { label: 'Thermal', value: thermalHotspots.filter(h => h.confidence !== 'low').length, color: '#f97316' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center flex-1 px-2">
                <span className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</span>
                <span className="text-[13px] font-black font-mono tabular-nums" style={{ color: value > 0 ? color : 'rgba(255,255,255,0.15)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live counts badge ──────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {redAlerts.filter(a => a.lat && a.lng).length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-sm" style={{background:'rgba(127,17,17,0.75)', border:'1px solid rgba(239,68,68,0.3)', boxShadow:'0 2px 12px rgba(239,68,68,0.18)'}}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{boxShadow:'0 0 5px rgba(239,68,68,0.7)'}} />
            <span className="text-[9px] font-black font-mono text-red-300 tracking-wide">
              {redAlerts.filter(a => a.lat && a.lng).length} ALERT{redAlerts.filter(a => a.lat && a.lng).length !== 1 ? 'S' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Zoom controls ──────────────────────────────────────── */}
      <div className="absolute bottom-6 right-3 z-10 flex flex-col gap-1" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 flex items-center justify-center rounded-md font-bold text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          style={{ background: 'rgba(6,8,14,0.82)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 18, lineHeight: 1 }}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 flex items-center justify-center rounded-md font-bold text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          style={{ background: 'rgba(6,8,14,0.82)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 18, lineHeight: 1 }}
          title="Zoom out"
        >−</button>
      </div>
    </div>
  );
}
