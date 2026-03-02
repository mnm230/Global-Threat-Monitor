import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import type { ConflictEvent, FlightData, ShipData } from '@shared/schema';

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const VIEW_CONFIG = {
  conflict: { center: [31, 47] as [number, number], zoom: 5 },
  flights: { center: [32, 48] as [number, number], zoom: 5 },
  maritime: { center: [26.2, 56.1] as [number, number], zoom: 8 },
};

const EVENT_COLORS: Record<string, string> = {
  missile: '#ef4444',
  airstrike: '#f97316',
  naval: '#3b82f6',
  ground: '#eab308',
  defense: '#22c55e',
  nuclear: '#a855f7',
};

const SEVERITY_RADIUS: Record<string, number> = {
  critical: 12,
  high: 9,
  medium: 7,
  low: 5,
};

const FLIGHT_COLORS: Record<string, string> = {
  military: '#ef4444',
  commercial: '#60a5fa',
  surveillance: '#fbbf24',
};

const SHIP_COLORS: Record<string, string> = {
  military: '#ef4444',
  tanker: '#f97316',
  cargo: '#60a5fa',
  patrol: '#a78bfa',
};

const STRAIT_OF_HORMUZ: [number, number][] = [
  [26.1, 56.0],
  [26.3, 56.2],
  [26.6, 56.4],
  [26.8, 56.5],
  [27.0, 56.6],
];

interface MapViewUpdaterProps {
  center: [number, number];
  zoom: number;
}

function MapViewUpdater({ center, zoom }: MapViewUpdaterProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

interface ConflictMapProps {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  activeView: 'conflict' | 'flights' | 'maritime';
  language?: 'en' | 'ar';
}

const FLIGHT_TYPE_AR: Record<string, string> = {
  military: '\u0639\u0633\u0643\u0631\u064A',
  commercial: '\u062A\u062C\u0627\u0631\u064A',
  surveillance: '\u0627\u0633\u062A\u0637\u0644\u0627\u0639',
};

const SHIP_TYPE_AR: Record<string, string> = {
  military: '\u0639\u0633\u0643\u0631\u064A',
  tanker: '\u0646\u0627\u0642\u0644\u0629',
  cargo: '\u0634\u062D\u0646',
  patrol: '\u062F\u0648\u0631\u064A\u0629',
};

export default function ConflictMap({ events, flights, ships, activeView, language = 'en' }: ConflictMapProps) {
  const viewConfig = VIEW_CONFIG[activeView];

  return (
    <MapContainer
      center={viewConfig.center}
      zoom={viewConfig.zoom}
      style={{ height: '100%', width: '100%', background: 'hsl(224, 28%, 4%)' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={DARK_TILES} attribution={ATTRIBUTION} />
      <MapViewUpdater center={viewConfig.center} zoom={viewConfig.zoom} />

      {activeView === 'conflict' && (
        <>
          {events.map((event) => (
            <CircleMarker
              key={event.id}
              center={[event.lat, event.lng]}
              radius={SEVERITY_RADIUS[event.severity] || 7}
              pathOptions={{
                color: EVENT_COLORS[event.type] || '#ef4444',
                fillColor: EVENT_COLORS[event.type] || '#ef4444',
                fillOpacity: 0.35,
                weight: 2,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-xs p-1 min-w-[140px]">
                  <div className="font-bold text-foreground mb-1">{language === 'ar' && event.titleAr ? event.titleAr : event.title}</div>
                  <div className="text-muted-foreground">{language === 'ar' && event.descriptionAr ? event.descriptionAr : event.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase">{event.type} - {event.severity}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {events.filter(e => e.type === 'missile').length >= 2 && (
            <Polyline
              positions={events.filter(e => e.type === 'missile').map(e => [e.lat, e.lng] as [number, number])}
              pathOptions={{ color: '#ef4444', weight: 1, opacity: 0.3, dashArray: '8 4' }}
            />
          )}
        </>
      )}

      {activeView === 'flights' && flights.map((flight) => (
        <CircleMarker
          key={flight.id}
          center={[flight.lat, flight.lng]}
          radius={5}
          pathOptions={{
            color: FLIGHT_COLORS[flight.type] || '#60a5fa',
            fillColor: FLIGHT_COLORS[flight.type] || '#60a5fa',
            fillOpacity: 0.6,
            weight: 2,
            opacity: 0.9,
          }}
        >
          <Popup>
            <div className="text-xs p-1 min-w-[120px]">
              <div className="font-bold">{flight.callsign}</div>
              <div className="text-muted-foreground">
                Alt: {flight.altitude.toLocaleString()}ft
              </div>
              <div className="text-muted-foreground">
                Speed: {flight.speed}kts | HDG: {flight.heading}
              </div>
              <div className="text-[10px] uppercase mt-1">{language === 'ar' ? FLIGHT_TYPE_AR[flight.type] || flight.type : flight.type}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {activeView === 'maritime' && (
        <>
          <Polyline
            positions={STRAIT_OF_HORMUZ}
            pathOptions={{ color: '#f97316', weight: 2, opacity: 0.4, dashArray: '12 6' }}
          />
          {ships.map((ship) => (
            <CircleMarker
              key={ship.id}
              center={[ship.lat, ship.lng]}
              radius={6}
              pathOptions={{
                color: SHIP_COLORS[ship.type] || '#60a5fa',
                fillColor: SHIP_COLORS[ship.type] || '#60a5fa',
                fillOpacity: 0.5,
                weight: 2,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-xs p-1 min-w-[120px]">
                  <div className="font-bold">{ship.name}</div>
                  <div className="text-muted-foreground capitalize">{language === 'ar' ? SHIP_TYPE_AR[ship.type] || ship.type : ship.type} | {ship.flag}</div>
                  <div className="text-muted-foreground">
                    Speed: {ship.speed}kts | HDG: {ship.heading}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
