import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer, LineLayer } from '@deck.gl/layers';
import type { ConflictEvent, FlightData, ShipData, AdsbFlight } from '@shared/schema';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

const REGION_PRESETS: Record<string, ViewState> = {
  global: { longitude: 45, latitude: 25, zoom: 2, pitch: 0, bearing: 0 },
  mena: { longitude: 42, latitude: 28, zoom: 4, pitch: 0, bearing: 0 },
  gulf: { longitude: 52, latitude: 26, zoom: 6, pitch: 0, bearing: 0 },
  levant: { longitude: 36, latitude: 32, zoom: 6, pitch: 0, bearing: 0 },
};

const VIEW_CONFIG: Record<string, ViewState> = {
  conflict: { longitude: 47, latitude: 31, zoom: 5, pitch: 0, bearing: 0 },
  flights: { longitude: 48, latitude: 32, zoom: 5, pitch: 0, bearing: 0 },
  maritime: { longitude: 56.1, latitude: 26.2, zoom: 8, pitch: 0, bearing: 0 },
};

const EVENT_COLORS: Record<string, [number, number, number]> = {
  missile: [239, 68, 68],
  airstrike: [249, 115, 22],
  defense: [34, 211, 238],
  naval: [59, 130, 246],
  ground: [234, 179, 8],
  nuclear: [168, 85, 247],
};

const FLIGHT_COLORS: Record<string, [number, number, number]> = {
  military: [239, 68, 68],
  surveillance: [34, 211, 238],
  commercial: [34, 197, 94],
};

const SHIP_COLORS: Record<string, [number, number, number]> = {
  military: [239, 68, 68],
  tanker: [245, 158, 11],
  cargo: [59, 130, 246],
  patrol: [234, 179, 8],
};

const SEVERITY_RADIUS: Record<string, number> = {
  critical: 12,
  high: 9,
  medium: 7,
  low: 5,
};

const STRAIT_OF_HORMUZ: number[][] = [
  [56.0, 26.1],
  [56.2, 26.3],
  [56.4, 26.6],
  [56.5, 26.8],
  [56.6, 27.0],
];

const MILITARY_BASES = [
  { name: 'Al Udeid Air Base', lat: 25.117, lng: 51.315, country: 'Qatar', operator: 'US' },
  { name: 'Al Dhafra Air Base', lat: 24.248, lng: 54.547, country: 'UAE', operator: 'US' },
  { name: 'Camp Arifjan', lat: 29.085, lng: 48.088, country: 'Kuwait', operator: 'US' },
  { name: 'Incirlik Air Base', lat: 37.002, lng: 35.426, country: 'Turkey', operator: 'US' },
  { name: 'Al Tanf Garrison', lat: 33.513, lng: 38.661, country: 'Syria', operator: 'US' },
  { name: 'Ramat David AFB', lat: 32.665, lng: 35.188, country: 'Israel', operator: 'Israel' },
  { name: 'Nevatim AFB', lat: 31.208, lng: 34.962, country: 'Israel', operator: 'Israel' },
  { name: 'Palmachim AFB', lat: 31.898, lng: 34.691, country: 'Israel', operator: 'Israel' },
  { name: 'Bandar Abbas AFB', lat: 27.183, lng: 56.267, country: 'Iran', operator: 'Iran' },
  { name: 'Isfahan AFB', lat: 32.655, lng: 51.668, country: 'Iran', operator: 'Iran' },
  { name: 'Tabriz AFB', lat: 38.130, lng: 46.235, country: 'Iran', operator: 'Iran' },
  { name: 'Shiraz AFB', lat: 29.540, lng: 52.590, country: 'Iran', operator: 'Iran' },
  { name: 'Bushehr NAB', lat: 28.918, lng: 50.835, country: 'Iran', operator: 'Iran' },
  { name: 'Al Salem Air Base', lat: 29.346, lng: 47.521, country: 'Kuwait', operator: 'US' },
  { name: 'Camp Lemonnier', lat: 11.547, lng: 43.146, country: 'Djibouti', operator: 'US' },
];

const NUCLEAR_FACILITIES = [
  { name: 'Natanz Enrichment', lat: 33.724, lng: 51.727, country: 'Iran', type: 'Enrichment' },
  { name: 'Fordow Enrichment', lat: 34.881, lng: 51.577, country: 'Iran', type: 'Enrichment' },
  { name: 'Bushehr NPP', lat: 28.830, lng: 50.888, country: 'Iran', type: 'Power Plant' },
  { name: 'Isfahan UCF', lat: 32.654, lng: 51.668, country: 'Iran', type: 'Conversion' },
  { name: 'Arak Heavy Water', lat: 34.379, lng: 49.247, country: 'Iran', type: 'Heavy Water' },
  { name: 'Parchin Complex', lat: 35.526, lng: 51.774, country: 'Iran', type: 'Research' },
  { name: 'Dimona Reactor', lat: 31.070, lng: 35.206, country: 'Israel', type: 'Reactor' },
  { name: 'Sorek Nuclear Center', lat: 31.868, lng: 34.705, country: 'Israel', type: 'Research' },
];

const AIR_DEFENSE = [
  { name: 'Iron Dome - Tel Aviv', lat: 32.085, lng: 34.782, country: 'Israel', system: 'Iron Dome' },
  { name: 'Iron Dome - Haifa', lat: 32.794, lng: 34.990, country: 'Israel', system: 'Iron Dome' },
  { name: "David's Sling - Ramat David", lat: 32.665, lng: 35.188, country: 'Israel', system: "David's Sling" },
  { name: 'Arrow - Palmachim', lat: 31.898, lng: 34.691, country: 'Israel', system: 'Arrow' },
  { name: 'S-300 - Isfahan', lat: 32.654, lng: 51.668, country: 'Iran', system: 'S-300' },
  { name: 'S-300 - Bushehr', lat: 28.918, lng: 50.835, country: 'Iran', system: 'S-300' },
  { name: 'Bavar-373 - Tehran', lat: 35.689, lng: 51.389, country: 'Iran', system: 'Bavar-373' },
  { name: 'Pantsir - Abu Dhabi', lat: 24.453, lng: 54.377, country: 'UAE', system: 'Pantsir-S1' },
];

const UNDERSEA_CABLES = [
  {
    name: 'AAE-1',
    color: [0, 200, 200] as [number, number, number],
    path: [[32.0, 31.2], [34.0, 28.0], [38.0, 21.5], [43.0, 12.5], [50.0, 25.0], [56.0, 25.5], [65.0, 22.0], [72.0, 18.0]],
  },
  {
    name: 'FLAG Europe-Asia',
    color: [200, 100, 0] as [number, number, number],
    path: [[32.3, 31.3], [34.5, 27.5], [39.0, 20.0], [44.0, 11.5], [48.0, 24.5], [57.0, 25.0], [66.0, 21.5], [73.0, 17.0]],
  },
  {
    name: 'SEA-ME-WE-5',
    color: [100, 200, 100] as [number, number, number],
    path: [[32.5, 31.0], [35.0, 27.0], [40.0, 19.0], [45.0, 12.0], [52.0, 24.0], [58.0, 24.5], [68.0, 20.0], [75.0, 15.0]],
  },
  {
    name: 'EIG',
    color: [200, 200, 0] as [number, number, number],
    path: [[32.0, 31.5], [33.5, 28.5], [37.5, 22.0], [42.5, 13.0], [49.0, 25.5], [55.0, 26.0]],
  },
  {
    name: 'FALCON',
    color: [200, 50, 200] as [number, number, number],
    path: [[48.0, 29.5], [50.5, 26.5], [52.0, 25.0], [54.0, 25.5], [56.5, 25.8]],
  },
];

const PIPELINES = [
  {
    name: 'East-West Pipeline (Saudi)',
    color: [200, 150, 50] as [number, number, number],
    path: [[49.5, 26.0], [47.0, 25.5], [44.0, 24.5], [42.0, 24.0], [39.5, 24.5], [38.0, 25.5]],
  },
  {
    name: 'IGAT Pipeline (Iran)',
    color: [100, 150, 200] as [number, number, number],
    path: [[52.0, 27.5], [51.5, 30.0], [51.0, 32.5], [50.5, 34.0], [49.5, 36.0]],
  },
  {
    name: 'Kirkuk-Ceyhan Pipeline',
    color: [150, 200, 100] as [number, number, number],
    path: [[44.4, 35.5], [43.5, 36.0], [42.5, 36.5], [41.0, 37.0], [39.0, 37.0], [36.5, 36.8], [35.9, 36.8]],
  },
  {
    name: 'Tapline',
    color: [200, 100, 150] as [number, number, number],
    path: [[50.2, 26.3], [48.0, 28.5], [46.0, 30.0], [42.0, 31.5], [38.0, 32.5], [36.0, 33.5], [35.5, 34.0]],
  },
];

const KEY_INFRASTRUCTURE = [
  { name: 'Abadan Refinery', lat: 30.339, lng: 48.293, country: 'Iran', type: 'Refinery' },
  { name: 'Ras Tanura Refinery', lat: 26.632, lng: 50.093, country: 'Saudi Arabia', type: 'Refinery' },
  { name: 'Jubail Industrial', lat: 27.011, lng: 49.659, country: 'Saudi Arabia', type: 'Refinery' },
  { name: 'Jebel Ali Port', lat: 25.007, lng: 55.071, country: 'UAE', type: 'Port' },
  { name: 'Bandar Abbas Port', lat: 27.188, lng: 56.261, country: 'Iran', type: 'Port' },
  { name: 'Haifa Port', lat: 32.819, lng: 34.988, country: 'Israel', type: 'Port' },
  { name: 'Ras Al Khair Desal', lat: 27.148, lng: 49.271, country: 'Saudi Arabia', type: 'Desalination' },
  { name: 'Sorek Desalination', lat: 31.648, lng: 34.555, country: 'Israel', type: 'Desalination' },
];

type LayerKey =
  | 'events'
  | 'flights'
  | 'ships'
  | 'missileLines'
  | 'hormuzStrait'
  | 'militaryBases'
  | 'nuclearFacilities'
  | 'airDefense'
  | 'underseaCables'
  | 'pipelines'
  | 'keyInfra';

interface LayerConfig {
  key: LayerKey;
  label: string;
  color: string;
  defaultOn: boolean;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { key: 'events', label: 'Conflict Events', color: '#ef4444', defaultOn: true },
  { key: 'flights', label: 'Flight Tracks', color: '#22d3ee', defaultOn: true },
  { key: 'ships', label: 'Ship Tracks', color: '#3b82f6', defaultOn: true },
  { key: 'missileLines', label: 'Missile Trajectories', color: '#ef4444', defaultOn: true },
  { key: 'hormuzStrait', label: 'Strait of Hormuz', color: '#f97316', defaultOn: true },
  { key: 'militaryBases', label: 'Military Bases', color: '#3b82f6', defaultOn: false },
  { key: 'nuclearFacilities', label: 'Nuclear Facilities', color: '#a855f7', defaultOn: false },
  { key: 'airDefense', label: 'Air Defense Systems', color: '#22d3ee', defaultOn: false },
  { key: 'underseaCables', label: 'Undersea Cables', color: '#06b6d4', defaultOn: false },
  { key: 'pipelines', label: 'Pipelines', color: '#ca8a04', defaultOn: false },
  { key: 'keyInfra', label: 'Key Infrastructure', color: '#f59e0b', defaultOn: false },
  { key: 'adsbFlights', label: 'ADS-B Flights', color: '#06b6d4', defaultOn: false },
];

interface TooltipInfo {
  x: number;
  y: number;
  text: string;
  detail?: string;
}

interface ConflictMapProps {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  adsbFlights?: AdsbFlight[];
  activeView: 'conflict' | 'flights' | 'maritime';
  language?: 'en' | 'ar';
}

export default function ConflictMap({ events, flights, ships, adsbFlights = [], activeView, language = 'en' }: ConflictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<Deck | null>(null);

  const [viewState, setViewState] = useState<ViewState>(VIEW_CONFIG[activeView]);
  const [isGlobe, setIsGlobe] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const cfg of LAYER_CONFIGS) {
      state[cfg.key] = cfg.defaultOn;
    }
    return state as Record<LayerKey, boolean>;
  });
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    const vs = VIEW_CONFIG[activeView];
    setViewState(vs);
  }, [activeView]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
    });
  }, [viewState]);

  const handleHover = useCallback((info: { x: number; y: number; object?: Record<string, unknown>; layer?: { id: string } }) => {
    if (info.object && info.layer) {
      const obj = info.object as Record<string, unknown>;
      let text = '';
      let detail = '';
      const layerId = info.layer.id;

      if (layerId === 'events-layer') {
        const e = obj as unknown as ConflictEvent;
        text = language === 'ar' && e.titleAr ? e.titleAr : e.title;
        detail = `${e.type} | ${e.severity}`;
      } else if (layerId === 'flights-layer') {
        const f = obj as unknown as FlightData;
        text = f.callsign;
        detail = `${f.type} | Alt: ${f.altitude}ft | ${f.speed}kts`;
      } else if (layerId === 'ships-layer') {
        const s = obj as unknown as ShipData;
        text = s.name;
        detail = `${s.type} | ${s.flag} | ${s.speed}kts`;
      } else if (layerId === 'military-bases-layer') {
        text = obj.name as string;
        detail = `${obj.operator} | ${obj.country}`;
      } else if (layerId === 'nuclear-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'air-defense-layer') {
        text = obj.name as string;
        detail = `${obj.system} | ${obj.country}`;
      } else if (layerId === 'infra-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'adsb-layer') {
        text = `${obj.callsign} (${obj.hex})`;
        detail = `${obj.aircraft} | ${obj.country} | ${obj.altitude}ft`;
      }

      if (text) {
        setTooltip({ x: info.x, y: info.y, text, detail });
      } else {
        setTooltip(null);
      }
    } else {
      setTooltip(null);
    }
  }, [language]);

  const onViewStateChange = useCallback(({ viewState: vs }: { viewState: ViewState }) => {
    setViewState(vs);
  }, []);

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayerVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setRegion = useCallback((region: keyof typeof REGION_PRESETS) => {
    const preset = REGION_PRESETS[region];
    if (preset) setViewState(preset);
  }, []);

  const toggleGlobe = useCallback(() => {
    setIsGlobe(prev => {
      const next = !prev;
      setViewState(vs => ({
        ...vs,
        pitch: next ? 45 : 0,
        bearing: next ? -15 : 0,
      }));
      return next;
    });
  }, []);

  const layers = useMemo(() => {
    const result: (ScatterplotLayer | PathLayer | LineLayer)[] = [];

    if (layerVisibility.events) {
      result.push(
        new ScatterplotLayer({
          id: 'events-layer',
          data: events,
          getPosition: (d: ConflictEvent) => [d.lng, d.lat],
          getRadius: (d: ConflictEvent) => (SEVERITY_RADIUS[d.severity] || 7) * 800,
          getFillColor: (d: ConflictEvent) => [...(EVENT_COLORS[d.type] || [239, 68, 68]), 120] as [number, number, number, number],
          getLineColor: (d: ConflictEvent) => [...(EVENT_COLORS[d.type] || [239, 68, 68]), 200] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          pickable: true,
        })
      );
    }

    if (layerVisibility.missileLines) {
      const missiles = events.filter(e => e.type === 'missile');
      if (missiles.length >= 2) {
        const lineData = [];
        for (let i = 0; i < missiles.length - 1; i++) {
          lineData.push({
            source: [missiles[i].lng, missiles[i].lat],
            target: [missiles[i + 1].lng, missiles[i + 1].lat],
          });
        }
        result.push(
          new LineLayer({
            id: 'missile-lines-layer',
            data: lineData,
            getSourcePosition: (d: { source: number[]; target: number[] }) => d.source as [number, number],
            getTargetPosition: (d: { source: number[]; target: number[] }) => d.target as [number, number],
            getColor: [239, 68, 68, 80],
            getWidth: 2,
            widthMinPixels: 1,
          })
        );
      }
    }

    if (layerVisibility.flights) {
      result.push(
        new ScatterplotLayer({
          id: 'flights-layer',
          data: flights,
          getPosition: (d: FlightData) => [d.lng, d.lat],
          getRadius: 4000,
          getFillColor: (d: FlightData) => [...(FLIGHT_COLORS[d.type] || [34, 197, 94]), 180] as [number, number, number, number],
          getLineColor: (d: FlightData) => [...(FLIGHT_COLORS[d.type] || [34, 197, 94]), 230] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 3,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.ships) {
      result.push(
        new ScatterplotLayer({
          id: 'ships-layer',
          data: ships,
          getPosition: (d: ShipData) => [d.lng, d.lat],
          getRadius: 5000,
          getFillColor: (d: ShipData) => [...(SHIP_COLORS[d.type] || [59, 130, 246]), 150] as [number, number, number, number],
          getLineColor: (d: ShipData) => [...(SHIP_COLORS[d.type] || [59, 130, 246]), 220] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.hormuzStrait) {
      result.push(
        new PathLayer({
          id: 'hormuz-layer',
          data: [{ path: STRAIT_OF_HORMUZ }],
          getPath: (d: { path: number[][] }) => d.path as [number, number][],
          getColor: [249, 115, 22, 120],
          getWidth: 3,
          widthMinPixels: 2,
          getDashArray: [12, 6],
          dashJustified: true,
          extensions: [],
        })
      );
    }

    if (layerVisibility.militaryBases) {
      result.push(
        new ScatterplotLayer({
          id: 'military-bases-layer',
          data: MILITARY_BASES,
          getPosition: (d: (typeof MILITARY_BASES)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [59, 130, 246, 140],
          getLineColor: [59, 130, 246, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.nuclearFacilities) {
      result.push(
        new ScatterplotLayer({
          id: 'nuclear-layer',
          data: NUCLEAR_FACILITIES,
          getPosition: (d: (typeof NUCLEAR_FACILITIES)[0]) => [d.lng, d.lat],
          getRadius: 10000,
          getFillColor: [168, 85, 247, 160],
          getLineColor: [168, 85, 247, 240],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          pickable: true,
        })
      );
    }

    if (layerVisibility.airDefense) {
      result.push(
        new ScatterplotLayer({
          id: 'air-defense-layer',
          data: AIR_DEFENSE,
          getPosition: (d: (typeof AIR_DEFENSE)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [34, 211, 238, 140],
          getLineColor: [34, 211, 238, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.underseaCables) {
      for (const cable of UNDERSEA_CABLES) {
        result.push(
          new PathLayer({
            id: `cable-${cable.name}`,
            data: [{ path: cable.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...cable.color, 120] as [number, number, number, number],
            getWidth: 2,
            widthMinPixels: 1,
          })
        );
      }
    }

    if (layerVisibility.pipelines) {
      for (const pipe of PIPELINES) {
        result.push(
          new PathLayer({
            id: `pipeline-${pipe.name}`,
            data: [{ path: pipe.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...pipe.color, 150] as [number, number, number, number],
            getWidth: 3,
            widthMinPixels: 2,
          })
        );
      }
    }

    if (layerVisibility.keyInfra) {
      result.push(
        new ScatterplotLayer({
          id: 'infra-layer',
          data: KEY_INFRASTRUCTURE,
          getPosition: (d: (typeof KEY_INFRASTRUCTURE)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [245, 158, 11, 140],
          getLineColor: [245, 158, 11, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    const ADSB_COLORS: Record<string, [number, number, number]> = {
      military: [239, 68, 68],
      surveillance: [34, 211, 238],
      commercial: [34, 197, 94],
      cargo: [245, 158, 11],
      private: [168, 85, 247],
      government: [59, 130, 246],
    };

    if (layerVisibility.adsbFlights && adsbFlights.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'adsb-layer',
          data: adsbFlights,
          getPosition: (d: AdsbFlight) => [d.lng, d.lat],
          getRadius: 5000,
          getFillColor: (d: AdsbFlight) => [...(ADSB_COLORS[d.type] || [34, 197, 94]), d.flagged ? 200 : 120] as [number, number, number, number],
          getLineColor: (d: AdsbFlight) => [...(ADSB_COLORS[d.type] || [34, 197, 94]), 255] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 1,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          pickable: true,
        })
      );
    }

    return result;
  }, [events, flights, ships, adsbFlights, layerVisibility]);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'deck-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '1';
    containerRef.current.appendChild(canvas);

    const deck = new Deck({
      canvas,
      initialViewState: viewState,
      controller: true,
      layers: [],
      onHover: handleHover as any,
      onViewStateChange: onViewStateChange as any,
      getTooltip: () => null,
    });

    deckRef.current = deck;

    return () => {
      deck.finalize();
      deckRef.current = null;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deckRef.current) {
      deckRef.current.setProps({
        layers,
        viewState,
      });
    }
  }, [layers, viewState]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          data-testid="button-toggle-globe"
          onClick={toggleGlobe}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: isGlobe ? 'rgba(59,130,246,0.8)' : 'rgba(0,0,0,0.7)',
            color: '#fff',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isGlobe ? 'Globe' : 'Flat'}
        </button>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['global', 'mena', 'gulf', 'levant'] as const).map(region => (
            <button
              key={region}
              data-testid={`button-region-${region}`}
              onClick={() => setRegion(region)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.6)',
                color: '#ccc',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backdropFilter: 'blur(8px)',
              }}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          maxHeight: 'calc(100% - 24px)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            background: 'rgba(10, 10, 20, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: panelOpen ? '8px 10px' : '4px 8px',
            minWidth: panelOpen ? 180 : 'auto',
          }}
        >
          <button
            data-testid="button-toggle-layers-panel"
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              background: 'none',
              border: 'none',
              color: '#ddd',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: '2px 0',
            }}
          >
            <span>Layers</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{panelOpen ? '[-]' : '[+]'}</span>
          </button>
          {panelOpen && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {LAYER_CONFIGS.map(cfg => (
                <label
                  key={cfg.key}
                  data-testid={`toggle-layer-${cfg.key}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '2px 0',
                    fontSize: 11,
                    color: layerVisibility[cfg.key] ? '#ddd' : '#666',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={layerVisibility[cfg.key]}
                    onChange={() => toggleLayer(cfg.key)}
                    style={{ display: 'none' }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: layerVisibility[cfg.key] ? cfg.color : 'rgba(255,255,255,0.1)',
                      border: `1.5px solid ${cfg.color}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{cfg.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 12,
            zIndex: 20,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '6px 10px',
            pointerEvents: 'none',
            maxWidth: 240,
          }}
        >
          <div style={{ color: '#eee', fontSize: 12, fontWeight: 600 }}>{tooltip.text}</div>
          {tooltip.detail && (
            <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>{tooltip.detail}</div>
          )}
        </div>
      )}
    </div>
  );
}