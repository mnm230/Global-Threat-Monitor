import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, IconLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import type { ConflictEvent, FlightData, AdsbFlight, RedAlert, ThermalHotspot } from '@shared/schema';

// ── Map style ────────────────────────────────────────────────────────────────
const DEFAULT_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

// ── Colors ───────────────────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, [number, number, number]> = {
  missile:   [239, 68,  68],
  airstrike: [249, 115, 22],
  defense:   [34,  211, 238],
  naval:     [59,  130, 246],
  ground:    [234, 179, 8],
  nuclear:   [168, 85,  247],
};

const ADSB_COLORS: Record<string, [number, number, number]> = {
  military:     [239, 68,  68],
  surveillance: [34,  211, 238],
  government:   [251, 191, 36],
  commercial:   [148, 163, 184],
  private:      [148, 163, 184],
  cargo:        [148, 163, 184],
};

// ── Plane icon ────────────────────────────────────────────────────────────────
const ICON_SIZE = 64;
const PLANE_ATLAS = (() => {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = ICON_SIZE; c.height = ICON_SIZE;
  const ctx = c.getContext('2d')!;
  const cx = ICON_SIZE / 2, cy = ICON_SIZE / 2, s = ICON_SIZE / 64;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30 * s); ctx.lineTo(cx + 3 * s, cy - 24 * s);
  ctx.lineTo(cx + 3.5 * s, cy - 8 * s); ctx.lineTo(cx + 26 * s, cy + 4 * s);
  ctx.lineTo(cx + 26 * s, cy + 9 * s); ctx.lineTo(cx + 3.5 * s, cy + 3 * s);
  ctx.lineTo(cx + 3 * s, cy + 14 * s); ctx.lineTo(cx + 11 * s, cy + 21 * s);
  ctx.lineTo(cx + 11 * s, cy + 25 * s); ctx.lineTo(cx, cy + 21 * s);
  ctx.lineTo(cx - 11 * s, cy + 25 * s); ctx.lineTo(cx - 11 * s, cy + 21 * s);
  ctx.lineTo(cx - 3 * s, cy + 14 * s); ctx.lineTo(cx - 3.5 * s, cy + 3 * s);
  ctx.lineTo(cx - 26 * s, cy + 9 * s); ctx.lineTo(cx - 26 * s, cy + 4 * s);
  ctx.lineTo(cx - 3.5 * s, cy - 8 * s); ctx.lineTo(cx - 3 * s, cy - 24 * s);
  ctx.closePath(); ctx.fill();
  return c.toDataURL();
})();
const PLANE_MAPPING = { plane: { x: 0, y: 0, width: ICON_SIZE, height: ICON_SIZE, mask: true } } as const;

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
      { key: 'adsb',    label: 'ADS-B Flights',   color: '#22d3ee', on: true  },
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

function parseObject(obj: Record<string, unknown>): Omit<TooltipState, 'x' | 'y'> | null {
  if (!obj) return null;
  // ConflictEvent
  if ('severity' in obj && 'type' in obj && 'title' in obj) {
    const e = obj as unknown as ConflictEvent;
    const color = EVENT_COLORS[e.type];
    return {
      title: e.title,
      sub: e.description,
      badge: `${e.type.toUpperCase()} · ${e.severity.toUpperCase()}`,
      color: color ? `rgb(${color.join(',')})` : '#ef4444',
    };
  }
  // AdsbFlight
  if ('callsign' in obj && 'aircraft' in obj) {
    const f = obj as unknown as AdsbFlight;
    const color = ADSB_COLORS[f.type];
    return {
      title: f.callsign || 'Unknown',
      sub: `${f.aircraft || '?'} · Alt ${f.altitude?.toLocaleString() || '?'} ft · ${Math.round(f.groundSpeed || 0)} kt`,
      badge: f.type?.toUpperCase(),
      color: color ? `rgb(${color.join(',')})` : '#22d3ee',
    };
  }
  // RedAlert
  if ('city' in obj && 'threatType' in obj) {
    const a = obj as unknown as RedAlert;
    return {
      title: `🚨 ${a.city}`,
      sub: `${a.threatType} · ${a.region} · ${a.country}`,
      badge: `${a.countdown}s`,
      color: '#ef4444',
    };
  }
  // ThermalHotspot
  if ('brightness' in obj && 'frp' in obj) {
    const h = obj as unknown as ThermalHotspot;
    return {
      title: 'NASA FIRMS Thermal',
      sub: `Brightness ${Math.round(h.brightness)}K · FRP ${h.frp.toFixed(1)} MW`,
      badge: h.confidence.toUpperCase(),
      color: '#f97316',
    };
  }
  // Military base
  if ('operator' in obj && 'country' in obj && 'name' in obj) {
    return {
      title: obj.name as string,
      sub: `${obj.country} · ${obj.operator}`,
      badge: 'MIL BASE',
      color: '#3b82f6',
    };
  }
  // Nuclear
  if ('type' in obj && 'country' in obj && 'name' in obj) {
    return {
      title: obj.name as string,
      sub: `${obj.country} · ${obj.type}`,
      badge: '☢ NUCLEAR',
      color: '#a855f7',
    };
  }
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ConflictMapProps {
  events: ConflictEvent[];
  flights: FlightData[];
  adsbFlights?: AdsbFlight[];
  redAlerts?: RedAlert[];
  thermalHotspots?: ThermalHotspot[];
  activeView: 'conflict' | 'flights' | 'maritime';
  language?: 'en' | 'ar';
  mapStyle?: string;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConflictMap({
  events, adsbFlights = [], redAlerts = [], thermalHotspots = [],
  activeView, mapStyle = DEFAULT_STYLE, focusLocation,
}: ConflictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MapLibreMap | null>(null);
  const overlayRef   = useRef<MapboxOverlay | null>(null);
  const pulseRef     = useRef(0);

  const [vis, setVis] = useState<Record<LayerKey, boolean>>(
    () => Object.fromEntries(ALL_LAYERS.map(l => [l.key, l.on])) as Record<LayerKey, boolean>
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(LAYER_GROUPS.map(g => [g.id, true]))
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [pulse, setPulse] = useState(0);

  // Pulse animation (for alert rings)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      pulseRef.current = Date.now();
      setPulse(pulseRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fly to focused location
  useEffect(() => {
    if (focusLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [focusLocation.lng, focusLocation.lat],
        zoom: focusLocation.zoom ?? 8,
        duration: 1000,
      });
    }
  }, [focusLocation]);

  // Swap map style
  useEffect(() => {
    if (mapRef.current) mapRef.current.setStyle(mapStyle);
  }, [mapStyle]);

  // Hover handler
  const onHover = useCallback(({ object, x, y }: { object: unknown; x: number; y: number }) => {
    if (!object) { setTooltip(null); return; }
    const parsed = parseObject(object as Record<string, unknown>);
    if (parsed) setTooltip({ x, y, ...parsed });
    else setTooltip(null);
  }, []);

  // Init MapLibre + deck.gl overlay
  useEffect(() => {
    if (!containerRef.current) return;
    const init = VIEW_INIT[activeView] || VIEW_INIT.conflict;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle,
      center: [init.lng, init.lat],
      zoom: init.zoom,
      attributionControl: false,
      antialias: true,
      fadeDuration: 0,
    });
    mapRef.current = map;

    const overlay = new MapboxOverlay({ interleaved: false, layers: [], onHover } as Parameters<typeof MapboxOverlay>[0]);
    overlayRef.current = overlay;
    map.addControl(overlay as Parameters<typeof map.addControl>[0]);

    // Attribution
    map.addControl(
      new (class { onAdd() { const d = document.createElement('div'); d.style.cssText = 'font-size:9px;color:rgba(255,255,255,0.2);padding:2px 6px;pointer-events:none;font-family:monospace'; d.textContent = '© Stadia Maps · © OpenStreetMap'; return d; } onRemove() {} })(),
      'bottom-right'
    );

    return () => {
      overlay.finalize();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build deck.gl layers
  const deckLayers = useMemo(() => {
    const t = pulse / 1000;
    const pulseAlpha = Math.round(30 + 28 * Math.sin(t * 2.5));
    const layers = [];

    // ── Red alerts (pulsing rings + core) ──
    const activeAlerts = redAlerts.filter(a => a.lat && a.lng);
    if (vis.alerts && activeAlerts.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'alerts-ring',
        data: activeAlerts,
        getPosition: (d: RedAlert) => [d.lng!, d.lat!],
        getRadius: 14000,
        getFillColor: [239, 68, 68, pulseAlpha] as [number, number, number, number],
        stroked: false,
        radiusMinPixels: 10, radiusMaxPixels: 36,
        pickable: false,
        updateTriggers: { getFillColor: pulseAlpha },
      }));
      layers.push(new ScatterplotLayer({
        id: 'alerts-core',
        data: activeAlerts,
        getPosition: (d: RedAlert) => [d.lng!, d.lat!],
        getRadius: 4000,
        getFillColor: [239, 68, 68, 230] as [number, number, number, number],
        getLineColor: [255, 200, 200, 200] as [number, number, number, number],
        stroked: true, lineWidthMinPixels: 1.5,
        radiusMinPixels: 5, radiusMaxPixels: 11,
        pickable: true,
      }));
    }

    // ── Conflict events ──
    if (vis.events && events.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'events',
        data: events,
        getPosition: (d: ConflictEvent) => [d.lng, d.lat],
        getRadius: (d: ConflictEvent) =>
          ({ critical: 7000, high: 5500, medium: 4000, low: 2800 }[d.severity] ?? 4000),
        getFillColor: (d: ConflictEvent) =>
          [...(EVENT_COLORS[d.type] ?? [239, 68, 68]), d.severity === 'critical' ? 220 : 170] as [number, number, number, number],
        getLineColor: (d: ConflictEvent) =>
          [...(EVENT_COLORS[d.type] ?? [239, 68, 68]), 255] as [number, number, number, number],
        stroked: true, lineWidthMinPixels: 1,
        radiusMinPixels: 4, radiusMaxPixels: 13,
        pickable: true,
      }));

      const critical = events.filter(e => e.severity === 'critical');
      if (critical.length > 0) {
        layers.push(new TextLayer({
          id: 'events-labels',
          data: critical,
          getPosition: (d: ConflictEvent) => [d.lng, d.lat],
          getText: (d: ConflictEvent) => d.type.toUpperCase(),
          getSize: 10,
          getColor: (d: ConflictEvent) =>
            [...(EVENT_COLORS[d.type] ?? [239, 68, 68]), 200] as [number, number, number, number],
          getPixelOffset: [0, -16] as [number, number],
          fontFamily: 'monospace', fontWeight: 'bold',
          outlineWidth: 3, outlineColor: [0, 0, 0, 200] as [number, number, number, number],
          fontSettings: { sdf: true },
          getTextAnchor: 'middle' as const,
          getAlignmentBaseline: 'bottom' as const,
          pickable: false,
        }));
      }
    }

    // ── NASA FIRMS thermal hotspots ──
    if (vis.thermal && thermalHotspots.length > 0) {
      const conf = thermalHotspots.filter(h => h.confidence !== 'low');
      layers.push(new ScatterplotLayer({
        id: 'thermal',
        data: conf,
        getPosition: (d: ThermalHotspot) => [d.lng, d.lat],
        getRadius: (d: ThermalHotspot) => Math.max(1500, Math.min(d.frp * 70, 7000)),
        getFillColor: (d: ThermalHotspot) =>
          d.confidence === 'high'
            ? [255, 80, 0, 150] as [number, number, number, number]
            : [255, 140, 20, 95] as [number, number, number, number],
        getLineColor: [255, 80, 0, 160] as [number, number, number, number],
        stroked: true, lineWidthMinPixels: 1,
        radiusMinPixels: 2, radiusMaxPixels: 9,
        pickable: true,
      }));
    }

    // ── ADS-B live flights ──
    if (vis.adsb && adsbFlights.length > 0) {
      const moving = adsbFlights.filter(f => f.groundSpeed > 20 && f.heading != null);
      if (moving.length > 0) {
        layers.push(new LineLayer({
          id: 'adsb-vectors',
          data: moving,
          getSourcePosition: (d: AdsbFlight) => [d.lng, d.lat],
          getTargetPosition: (d: AdsbFlight) => {
            const rad = (d.heading! * Math.PI) / 180;
            const dist = 18000;
            return [
              d.lng + (dist * Math.sin(rad)) / (111320 * Math.cos((d.lat * Math.PI) / 180)),
              d.lat + (dist * Math.cos(rad)) / 111320,
            ];
          },
          getColor: (d: AdsbFlight) =>
            [...(ADSB_COLORS[d.type] ?? ADSB_COLORS.commercial), d.flagged ? 130 : 45] as [number, number, number, number],
          getWidth: 1, widthMinPixels: 1,
          pickable: false,
        }));
      }

      layers.push(new IconLayer({
        id: 'adsb',
        data: adsbFlights,
        getPosition: (d: AdsbFlight) => [d.lng, d.lat],
        getIcon: () => 'plane',
        iconAtlas: PLANE_ATLAS,
        iconMapping: PLANE_MAPPING,
        getSize: (d: AdsbFlight) => d.flagged ? 22 : 15,
        getAngle: (d: AdsbFlight) => 360 - (d.heading ?? 0),
        getColor: (d: AdsbFlight) =>
          [...(ADSB_COLORS[d.type] ?? ADSB_COLORS.commercial), d.flagged ? 255 : 185] as [number, number, number, number],
        sizeMinPixels: 9, sizeMaxPixels: 26,
        billboard: false, pickable: true,
      }));
    }

    // ── Military bases ──
    if (vis.bases) {
      layers.push(new ScatterplotLayer({
        id: 'bases',
        data: MILITARY_BASES,
        getPosition: (d: typeof MILITARY_BASES[0]) => [d.lng, d.lat],
        getRadius: 5000,
        getFillColor: [59, 130, 246, 160] as [number, number, number, number],
        getLineColor: [59, 130, 246, 220] as [number, number, number, number],
        stroked: true, lineWidthMinPixels: 1.5,
        radiusMinPixels: 3, radiusMaxPixels: 9,
        pickable: true,
      }));
    }

    // ── Nuclear sites ──
    if (vis.nuclear) {
      layers.push(new ScatterplotLayer({
        id: 'nuclear',
        data: NUCLEAR_SITES,
        getPosition: (d: typeof NUCLEAR_SITES[0]) => [d.lng, d.lat],
        getRadius: 5000,
        getFillColor: [168, 85, 247, 160] as [number, number, number, number],
        getLineColor: [168, 85, 247, 230] as [number, number, number, number],
        stroked: true, lineWidthMinPixels: 1.5,
        radiusMinPixels: 3, radiusMaxPixels: 9,
        pickable: true,
      }));
    }

    return layers;
  }, [vis, events, adsbFlights, redAlerts, thermalHotspots, pulse]);

  // Push layers to overlay
  useEffect(() => {
    overlayRef.current?.setProps({ layers: deckLayers });
  }, [deckLayers]);

  const flyTo = (region: { lng: number; lat: number; zoom: number }) => {
    mapRef.current?.flyTo({ center: [region.lng, region.lat], zoom: region.zoom, duration: 900 });
  };

  const toggleLayer = (key: string) =>
    setVis(prev => ({ ...prev, [key]: !prev[key] }));

  // Tooltip position clamping
  const tipLeft = tooltip ? Math.min(tooltip.x + 14, window.innerWidth - 240) : 0;
  const tipTop  = tooltip ? Math.max(tooltip.y - 10, 10) : 0;

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
          <div className="bg-black/92 border border-white/10 rounded-md px-3 py-2 shadow-xl backdrop-blur-sm max-w-[230px]">
            {tooltip.badge && (
              <span
                className="inline-block text-[9px] font-black font-mono tracking-widest px-1.5 py-0.5 rounded mb-1.5"
                style={{
                  color: tooltip.color ?? '#22d3ee',
                  background: `${tooltip.color ?? '#22d3ee'}18`,
                  border: `1px solid ${tooltip.color ?? '#22d3ee'}35`,
                }}
              >
                {tooltip.badge}
              </span>
            )}
            <p className="text-[11px] font-bold text-white/90 leading-snug">{tooltip.title}</p>
            <p className="text-[10px] text-white/45 font-mono leading-relaxed mt-0.5">{tooltip.sub}</p>
          </div>
        </div>
      )}

      {/* ── Region presets ─────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {Object.entries(REGIONS).map(([label, vs]) => (
          <button
            key={label}
            onClick={() => flyTo(vs)}
            className="text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-black/70 border border-white/[0.08] text-white/35 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-black/80 transition-all"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Layer toggles ──────────────────────────────────────── */}
      <div className="absolute bottom-6 left-3 z-10">
        <div className="bg-black/80 border border-white/[0.07] rounded-lg p-2.5 flex flex-col gap-2 backdrop-blur-sm">
          <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-white/20 mb-0.5">Layers</p>
          {ALL_LAYERS.map(cfg => (
            <button
              key={cfg.key}
              onClick={() => toggleLayer(cfg.key)}
              className="flex items-center gap-2.5 text-[9px] font-mono uppercase tracking-wider transition-opacity"
              style={{ opacity: vis[cfg.key] ? 1 : 0.3 }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0 transition-all"
                style={{ background: vis[cfg.key] ? cfg.color : 'rgba(255,255,255,0.15)' }}
              />
              <span style={{ color: vis[cfg.key] ? cfg.color : 'rgba(255,255,255,0.25)' }}>
                {cfg.label}
              </span>
              <span className="ml-auto text-white/15 font-mono">
                {cfg.key === 'events'  ? events.length :
                 cfg.key === 'alerts'  ? redAlerts.filter(a => a.lat && a.lng).length :
                 cfg.key === 'adsb'    ? adsbFlights.length :
                 cfg.key === 'thermal' ? thermalHotspots.filter(h => h.confidence !== 'low').length :
                 cfg.key === 'bases'   ? MILITARY_BASES.length :
                 cfg.key === 'nuclear' ? NUCLEAR_SITES.length : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live counts badge ──────────────────────────────────── */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {redAlerts.filter(a => a.lat && a.lng).length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/25 rounded px-2 py-1 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] font-black font-mono text-red-300">
              {redAlerts.filter(a => a.lat && a.lng).length} ALERT{redAlerts.filter(a => a.lat && a.lng).length !== 1 ? 'S' : ''}
            </span>
          </div>
        )}
        {adsbFlights.filter(f => f.type === 'military').length > 0 && (
          <div className="flex items-center gap-1.5 bg-black/70 border border-white/[0.07] rounded px-2 py-1 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[9px] font-mono text-cyan-300/70">
              {adsbFlights.filter(f => f.type === 'military').length} MIL
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
