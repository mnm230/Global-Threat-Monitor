import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

declare const L: any;

export function LiveFlightTracker({ flight, allFlights, language, onClose }: {
  flight: { callsign: string; lat: number; lng: number; heading: number; altitude: number; speed: number; type: string; source: 'radar' };
  allFlights: any[];
  language: 'en' | 'ar';
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trailRef = useRef<any>(null);
  const trailPoints = useRef<[number, number][]>([[flight.lat, flight.lng]]);
  const [liveData, setLiveData] = useState(flight);

  useEffect(() => {
    const match = allFlights.find((f: any) => f.callsign === flight.callsign);
    if (match) {
      const newData = {
        ...flight,
        lat: match.lat,
        lng: match.lng,
        heading: match.heading,
        altitude: match.altitude || match.alt || flight.altitude,
        speed: match.speed || match.groundSpeed || flight.speed,
      };
      setLiveData(newData);
      const last = trailPoints.current[trailPoints.current.length - 1];
      if (!last || Math.abs(last[0] - newData.lat) > 0.0001 || Math.abs(last[1] - newData.lng) > 0.0001) {
        trailPoints.current.push([newData.lat, newData.lng]);
        if (trailPoints.current.length > 200) trailPoints.current.shift();
      }
    }
  }, [allFlights, flight.callsign]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    try {
      const map = L.map(mapRef.current, {
        center: [flight.lat, flight.lng],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const planeIcon = L.divIcon({
        className: 'live-plane-icon',
        html: `<div style="transform:rotate(${flight.heading}deg);font-size:24px;filter:drop-shadow(0 0 6px rgba(0,200,255,0.7));color:#00d4ff;line-height:1;">\u2708</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      markerRef.current = L.marker([flight.lat, flight.lng], { icon: planeIcon }).addTo(map);

      trailRef.current = L.polyline([[flight.lat, flight.lng]], {
        color: '#00d4ff',
        weight: 2,
        opacity: 0.5,
        dashArray: '4 6',
      }).addTo(map);

      leafletMap.current = map;
    } catch (e) {
      console.error('LiveFlightTracker map init failed:', e);
    }
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !markerRef.current) return;
    const pos: [number, number] = [liveData.lat, liveData.lng];
    markerRef.current.setLatLng(pos);
    const planeIcon = L.divIcon({
      className: 'live-plane-icon',
      html: `<div style="transform:rotate(${liveData.heading}deg);font-size:24px;filter:drop-shadow(0 0 6px rgba(0,200,255,0.7));color:#00d4ff;line-height:1;transition:transform 0.5s ease;">\u2708</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    markerRef.current.setIcon(planeIcon);
    if (trailRef.current) {
      trailRef.current.setLatLngs(trailPoints.current);
    }
    leafletMap.current.panTo(pos, { animate: true, duration: 1 });
  }, [liveData.lat, liveData.lng, liveData.heading]);

  const typeColor = liveData.type === 'military' ? 'text-red-400' : liveData.type === 'surveillance' ? 'text-amber-400' : 'text-cyan-400';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  const compass = dirs[Math.round(liveData.heading / 45) % 8];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={onClose} data-testid="popup-map-overlay">
      <div className="relative w-[92vw] max-w-[800px] h-[70vh] max-h-[600px] rounded-lg border border-primary/20 bg-background shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} data-testid="popup-map-container">
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 py-2 bg-background/95 border-b border-primary/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[11px] font-mono font-bold text-primary">{language === 'en' ? 'LIVE TRACKING' : '\u062A\u062A\u0628\u0639 \u0645\u0628\u0627\u0634\u0631'}</span>
            </div>
            <span className={`text-sm font-mono font-bold ${typeColor}`}>{liveData.callsign}</span>
            <span className="text-[10px] font-mono text-foreground/30 uppercase">{liveData.type}</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-white/[0.08] transition-colors" data-testid="button-close-popup-map">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center gap-4 px-3 py-2 bg-background/95 border-t border-primary/15">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">ALT</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{liveData.altitude.toLocaleString()}ft</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">SPD</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{liveData.speed}kts</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">HDG</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{Math.round(liveData.heading)}\u00B0 {compass}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">POS</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{liveData.lat.toFixed(4)}, {liveData.lng.toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[9px] font-mono text-green-400/70">{language === 'en' ? 'LIVE' : '\u0645\u0628\u0627\u0634\u0631'}</span>
          </div>
        </div>
        <div ref={mapRef} className="absolute inset-0 w-full h-full" data-testid="popup-map-leaflet" />
      </div>
    </div>
  );
}
