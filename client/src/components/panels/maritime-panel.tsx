import { useState, useMemo } from 'react';
import {
  Ship, Anchor, AlertTriangle, Globe, MapPin, Clock, ChevronDown, ChevronRight, Navigation, Eye, X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { timeAgo, headingToCompass } from '@/lib/dashboard-utils';
import type { ShipData } from '@shared/schema';

const SHIP_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  military: { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    label: 'NAV' },
  tanker:   { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30', label: 'TKR' },
  cargo:    { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  label: 'CGO' },
  patrol:   { color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', label: 'PTL' },
};

export function MaritimePanel({ ships, language, onClose, onMaximize, isMaximized }: { ships: ShipData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [selectedShip, setSelectedShip] = useState<ShipData | null>(null);
  const sorted = [...ships].sort((a, b) => {
    const order = { military: 0, patrol: 1, tanker: 2, cargo: 3 };
    return (order[a.type] ?? 4) - (order[b.type] ?? 4);
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Maritime' : 'بحري'}
        icon={<Ship className="w-3.5 h-3.5" />}
        live
        count={ships.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="ships"
      />
      {ships.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Anchor className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">Scanning waters...</p>
        </div>
      )}

      {selectedShip && (
        <div className="px-3 py-2 border-b border-blue-500/20" style={{background:'hsl(var(--muted))'}} data-testid="ship-detail-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold font-mono text-blue-300" data-testid="text-ship-name">{selectedShip.name}</span>
            <button onClick={() => setSelectedShip(null)} className="text-foreground/25 hover:text-foreground/50 transition-colors" data-testid="ship-close-detail">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
            <div data-testid="text-ship-type"><span className="text-foreground/30">TYPE</span> <span className="text-foreground/70">{selectedShip.type.toUpperCase()}</span></div>
            <div data-testid="text-ship-flag"><span className="text-foreground/30">FLAG</span> <span className="text-foreground/70">{selectedShip.flag}</span></div>
            <div data-testid="text-ship-speed"><span className="text-foreground/30">SPD</span> <span className="text-foreground/70">{selectedShip.speed}kts</span></div>
            <div data-testid="text-ship-heading"><span className="text-foreground/30">HDG</span> <span className="text-foreground/70">{Math.round(selectedShip.heading)}° {headingToCompass(selectedShip.heading)}</span></div>
            <div className="col-span-2" data-testid="text-ship-position"><span className="text-foreground/30">POS</span> <span className="text-foreground/70">{selectedShip.lat.toFixed(4)}, {selectedShip.lng.toFixed(4)}</span></div>
          </div>
          <div className="flex gap-2 mt-2 pt-1.5 border-t border-blue-500/15">
            <a
              href={`https://www.google.com/maps?q=${selectedShip.lat},${selectedShip.lng}&z=10&t=k`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[10px] font-mono font-bold text-blue-300 transition-colors"
              data-testid={`ship-gmap-${selectedShip.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="w-3 h-3" />
              Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border">
        {sorted.map((s) => {
          const style = SHIP_TYPE_STYLES[s.type] || SHIP_TYPE_STYLES.cargo;
          const isSelected = selectedShip?.id === s.id;
          return (
            <div
              key={s.id}
              className={`px-3 py-3 hover-elevate cursor-pointer transition-colors ${isSelected ? 'bg-blue-950/30' : ''}`}
              data-testid={`ship-${s.id}`}
              onClick={() => setSelectedShip(isSelected ? null : s)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-foreground/30 shrink-0 inline-block"
                  style={{ transform: `rotate(${s.heading}deg)`, fontSize: '11px', lineHeight: 1 }}
                >▲</span>
                <span className="text-xs font-bold font-mono text-foreground truncate flex-1">{s.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span><span className="text-foreground/40">SPD</span> {s.speed}kn</span>
                <span><span className="text-foreground/40">HDG</span> {headingToCompass(s.heading)}</span>
                <span className="truncate"><span className="text-foreground/30">FLG</span> {s.flag}</span>
                <a
                  href={`https://www.google.com/maps?q=${s.lat},${s.lng}&z=10&t=k`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-blue-500/15 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in Google Maps"
                  data-testid={`ship-gmap-row-${s.id}`}
                >
                  <MapPin className="w-3 h-3 text-blue-400/40 hover:text-blue-400/80" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}








