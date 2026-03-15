import { useState, useMemo, memo, useEffect } from 'react';
import {
  Plane, Navigation, AlertTriangle, ChevronDown, ChevronRight, Globe, MapPin, Radar, Eye, Target, Info, Clock, ExternalLink, X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import type { FlightData } from '@shared/schema';
import { ScrollShadow } from '@/components/shared/scroll-shadow';
import { headingToCompass } from '@/lib/dashboard-utils';

const FLIGHT_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  military:    { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    label: 'MIL' },
  surveillance:{ color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', label: 'ISR' },
  commercial:  { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  label: 'CIV' },
};

export const FlightRadarPanel = memo(function FlightRadarPanel({ flights, language, onClose, onMaximize, isMaximized, onLocateFlight }: { flights: FlightData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onLocateFlight?: (lat: number, lng: number, callsign: string, heading: number, altitude: number, speed: number, type: string) => void }) {
  const [selectedFlight, setSelectedFlight] = useState<FlightData | null>(null);
  const [flightRoute, setFlightRoute] = useState<{ origin: { name: string; iata: string; icao: string; country: string } | null; destination: { name: string; iata: string; icao: string; country: string } | null; airline: string | null } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!selectedFlight) { setFlightRoute(null); return; }
    const cs = selectedFlight.callsign?.trim();
    if (!cs || selectedFlight.type === 'military') {
      setFlightRoute({ origin: null, destination: null, airline: null });
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    setFlightRoute({ origin: null, destination: null, airline: null });
    setRouteLoading(false);
    return () => { cancelled = true; };
  }, [selectedFlight?.callsign]);
  const sorted = [...flights].sort((a, b) => {
    const order: Record<string, number> = { military: 0, fighter: 0, surveillance: 1, commercial: 2, tanker: 3, refueling: 3 };
    return (order[a.type] ?? 4) - (order[b.type] ?? 4);
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Flight Radar' : 'رادار الطيران'}
        icon={<Plane className="w-3.5 h-3.5" />}
        live
        count={flights.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="livefeed"
      />
      {flights.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Plane className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">Scanning airspace...</p>
        </div>
      )}
      {selectedFlight && (
        <div className="px-3 py-2 border-b border-primary/20 bg-[transparent] text-[#e9e7e2]" style={{background:'hsl(var(--muted))'}} data-testid="flight-detail-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold font-mono text-primary/90" data-testid="text-flight-callsign">{selectedFlight.callsign}</span>
            <button onClick={() => setSelectedFlight(null)} className="text-foreground/25 hover:text-foreground/50 transition-colors" data-testid="flight-close-detail">
              <X className="w-3 h-3" />
            </button>
          </div>
          {flightRoute && (flightRoute.origin || flightRoute.destination || flightRoute.airline) && (
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono" data-testid="flight-radar-route">
              {flightRoute.airline && <span className="text-primary/60 font-bold">{flightRoute.airline}</span>}
              {flightRoute.airline && (flightRoute.origin || flightRoute.destination) && <span className="text-foreground/20">·</span>}
              {flightRoute.origin && <span className="text-foreground/80">{flightRoute.origin.iata || flightRoute.origin.icao}{flightRoute.origin.name ? ` ${flightRoute.origin.name}` : ''}</span>}
              {flightRoute.origin && flightRoute.destination && <span className="text-primary/50 font-bold">→</span>}
              {flightRoute.destination && <span className="text-foreground/80">{flightRoute.destination.iata || flightRoute.destination.icao}{flightRoute.destination.name ? ` ${flightRoute.destination.name}` : ''}</span>}
            </div>
          )}
          {routeLoading && <div className="text-[9px] font-mono text-foreground/25 mb-1">Loading route...</div>}
          {flightRoute && !flightRoute.origin && !flightRoute.destination && !routeLoading && selectedFlight.type !== 'military' && (
            <div className="text-[9px] font-mono text-foreground/20 mb-1">Route unknown</div>
          )}
          {selectedFlight.type === 'military' && !routeLoading && (
            <div className="text-[9px] font-mono text-red-400/40 mb-1">Military — route classified</div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
            <div data-testid="text-flight-type"><span className="text-foreground/30">TYPE</span> <span className="text-foreground/70">{selectedFlight.type.toUpperCase()}</span></div>
            <div data-testid="text-flight-altitude"><span className="text-foreground/30">ALT</span> <span className="text-foreground/70">{selectedFlight.altitude.toLocaleString()}ft</span></div>
            <div data-testid="text-flight-speed"><span className="text-foreground/30">SPD</span> <span className="text-foreground/70">{selectedFlight.speed}kts</span></div>
            <div data-testid="text-flight-heading"><span className="text-foreground/30">HDG</span> <span className="text-foreground/70">{Math.round(selectedFlight.heading)}° {headingToCompass(selectedFlight.heading)}</span></div>
            {selectedFlight.aircraft && <div data-testid="text-flight-aircraft"><span className="text-foreground/30">ACFT</span> <span className="text-foreground/70">{selectedFlight.aircraft}</span></div>}
            <div className="col-span-2" data-testid="text-flight-position"><span className="text-foreground/30">POS</span> <span className="text-foreground/70">{selectedFlight.lat.toFixed(4)}, {selectedFlight.lng.toFixed(4)}</span></div>
          </div>
          <div className="flex gap-2 mt-2 pt-1.5 border-t border-primary/15">
            <button
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] font-mono font-bold text-primary/80 transition-colors"
              data-testid={`flight-locate-${selectedFlight.id}`}
              onClick={(e) => { e.stopPropagation(); onLocateFlight?.(selectedFlight.lat, selectedFlight.lng, selectedFlight.callsign, selectedFlight.heading, selectedFlight.altitude, selectedFlight.speed, selectedFlight.type); }}
            >
              <Target className="w-3 h-3" />
              Locate on Map
            </button>
            <a
              href={`https://www.flightradar24.com/${selectedFlight.callsign}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted hover:bg-muted/80 border border-border text-[10px] font-mono font-bold text-foreground/50 transition-colors"
              data-testid={`flight-fr24-${selectedFlight.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              FR24
            </a>
          </div>
        </div>
      )}
      <ScrollShadow className="flex-1 min-h-0">
        <div className="divide-y divide-border">
        {sorted.map((f) => {
          const style = FLIGHT_TYPE_STYLES[f.type] || FLIGHT_TYPE_STYLES.commercial;
          const isSelected = selectedFlight?.id === f.id;
          return (
            <div
              key={f.id}
              className={`px-4 py-3.5 hover-elevate cursor-pointer transition-colors ${isSelected ? 'bg-primary/[0.06]' : ''}`}
              data-testid={`flight-${f.id}`}
              onClick={() => setSelectedFlight(isSelected ? null : f)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-foreground/25 shrink-0 inline-block"
                  style={{ transform: `rotate(${f.heading}deg)`, fontSize: '11px', lineHeight: 1 }}
                >▲</span>
                <span className="text-xs font-bold font-mono text-foreground/90 truncate flex-1">{f.callsign}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/80">
                <span><span className="text-foreground/50">ALT</span> {(f.altitude / 1000).toFixed(0)}k</span>
                <span><span className="text-foreground/50">SPD</span> {f.speed}</span>
                <span><span className="text-foreground/50">HDG</span> {headingToCompass(f.heading)}</span>
                <button
                  className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-primary/15 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onLocateFlight?.(f.lat, f.lng, f.callsign, f.heading, f.altitude, f.speed, f.type); }}
                  title="Locate on map"
                  data-testid={`flight-locate-row-${f.id}`}
                >
                  <Target className="w-3 h-3 text-primary/40 hover:text-primary/80" />
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </ScrollShadow>
    </div>
  );
});



