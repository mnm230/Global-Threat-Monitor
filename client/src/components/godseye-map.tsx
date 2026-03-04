import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { ConflictEvent, RedAlert } from '@shared/schema';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const EVENT_COLORS: Record<string, [number, number, number]> = {
  missile: [239, 68, 68],
  airstrike: [249, 115, 22],
  defense: [34, 211, 238],
  naval: [59, 130, 246],
  ground: [234, 179, 8],
  nuclear: [168, 85, 247],
};

const THIRTY_MINUTES = 30 * 60 * 1000;

interface GodEyeMapProps {
  events: ConflictEvent[];
  alerts: RedAlert[];
  replayTime: number;
  playing: boolean;
}

export default function GodEyeMap({ events, alerts, replayTime, playing }: GodEyeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const rafRef = useRef<number | null>(null);
  const bearingRef = useRef(0);
  const playingRef = useRef(playing);
  const propsRef = useRef({ events, alerts, replayTime });

  // Keep propsRef current
  propsRef.current = { events, alerts, replayTime };
  playingRef.current = playing;

  function buildLayers(evts: ConflictEvent[], alts: RedAlert[], time: number) {
    const now = Date.now();
    const visibleEvents = evts.filter(e => new Date(e.timestamp).getTime() <= time);
    const visibleAlerts = alts.filter(a => new Date(a.timestamp).getTime() <= time);

    return [
      // Event glow
      new ScatterplotLayer({
        id: 'godseye-events-glow',
        data: visibleEvents,
        getPosition: (d: ConflictEvent) => [d.lng, d.lat],
        getRadius: 8000,
        getFillColor: (d: ConflictEvent) => {
          const age = now - new Date(d.timestamp).getTime();
          const opacity = age > THIRTY_MINUTES ? 40 : 30;
          const c = EVENT_COLORS[d.type] || [239, 68, 68];
          return [...c, opacity] as [number, number, number, number];
        },
        stroked: false,
        radiusMinPixels: 10,
        updateTriggers: { getFillColor: time },
      }),
      // Event core
      new ScatterplotLayer({
        id: 'godseye-events-core',
        data: visibleEvents,
        getPosition: (d: ConflictEvent) => [d.lng, d.lat],
        getRadius: 4000,
        getFillColor: (d: ConflictEvent) => {
          const age = now - new Date(d.timestamp).getTime();
          const opacity = age > THIRTY_MINUTES ? 100 : 200;
          const c = EVENT_COLORS[d.type] || [239, 68, 68];
          return [...c, opacity] as [number, number, number, number];
        },
        stroked: false,
        radiusMinPixels: 4,
        updateTriggers: { getFillColor: time },
      }),
      // Alert layer
      new ScatterplotLayer({
        id: 'godseye-alerts',
        data: visibleAlerts,
        getPosition: (d: RedAlert) => [d.lng, d.lat],
        getRadius: 3000,
        getFillColor: (d: RedAlert) => {
          const age = now - new Date(d.timestamp).getTime();
          const opacity = age > THIRTY_MINUTES ? 80 : 180;
          return [251, 191, 36, opacity] as [number, number, number, number];
        },
        stroked: true,
        getLineColor: [251, 191, 36, 120] as [number, number, number, number],
        lineWidthMinPixels: 1,
        radiusMinPixels: 3,
        updateTriggers: { getFillColor: time },
      }),
    ];
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const initialViewState = {
      longitude: 47,
      latitude: 31,
      zoom: 5,
      pitch: 40,
      bearing: 0,
    };

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      pitch: initialViewState.pitch,
      bearing: initialViewState.bearing,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;

    map.on('load', () => {
      const deck = new Deck({
        canvas: (() => {
          const c = document.createElement('canvas');
          c.style.position = 'absolute';
          c.style.top = '0';
          c.style.left = '0';
          c.style.width = '100%';
          c.style.height = '100%';
          c.style.pointerEvents = 'none';
          containerRef.current?.appendChild(c);
          return c;
        })(),
        width: '100%',
        height: '100%',
        initialViewState,
        controller: false,
        layers: buildLayers(propsRef.current.events, propsRef.current.alerts, propsRef.current.replayTime),
        getTooltip: () => null,
      });

      deckRef.current = deck;

      // Sync deck view with map camera
      function syncDeckView() {
        if (!mapRef.current || !deckRef.current) return;
        const m = mapRef.current;
        const center = m.getCenter();
        deckRef.current.setProps({
          viewState: {
            longitude: center.lng,
            latitude: center.lat,
            zoom: m.getZoom(),
            pitch: m.getPitch(),
            bearing: m.getBearing(),
          },
        });
      }

      map.on('move', syncDeckView);
      map.on('zoom', syncDeckView);
      map.on('pitch', syncDeckView);
      map.on('rotate', syncDeckView);

      // Orbital rotation animation
      function animate() {
        rafRef.current = requestAnimationFrame(animate);
        if (playingRef.current && mapRef.current) {
          bearingRef.current = (bearingRef.current + 0.02) % 360;
          mapRef.current.setBearing(bearingRef.current);
        }
        if (deckRef.current) {
          deckRef.current.setProps({
            layers: buildLayers(propsRef.current.events, propsRef.current.alerts, propsRef.current.replayTime),
          });
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      deckRef.current?.finalize();
      mapRef.current?.remove();
      deckRef.current = null;
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    />
  );
}
