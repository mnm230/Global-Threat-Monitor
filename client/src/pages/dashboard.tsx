import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/theme-provider';
import { apiRequest } from '@/lib/queryClient';
import type {
  NewsItem,
  CommodityData,
  ConflictEvent,
  FlightData,
  ShipData,
  TelegramMessage,
  SirenAlert,
  RedAlert,
  AIBrief,
  AIDeduction,
  AdsbFlight,
} from '@shared/schema';
import {
  Radio,
  Ship,
  Plane,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wifi,
  Languages,
  Newspaper,
  Send,
  Crosshair,
  Anchor,
  BarChart3,
  Target,
  Activity,
  Globe,
  Siren,
  ShieldAlert,
  MapPin,
  Timer,
  AlertOctagon,
  Shield,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  PanelLeft,
  Brain,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  MessageSquare,
  Zap,
  Loader2,
  Radar,
  Plus,
  Trash2,
  Hash,
  Bell,
  BellOff,
  FileDown,
  StickyNote,
  Eye,
  Star,
  Link2,
  History,
  Save,
  Layout,
  Ruler,
  Search,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';

const ConflictMap = lazy(() => import('@/components/conflict-map'));

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map component error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-card/50 text-muted-foreground" data-testid="map-error-fallback">
          <div className="text-center p-4">
            <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs font-mono">WebGL required for 3D map</p>
            <p className="text-[11px] mt-1 text-muted-foreground/60">Map rendering unavailable in this environment</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ResizeHandle({ onResize, direction = 'col' }: { onResize: (delta: number) => void; direction?: 'col' | 'row' }) {
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onResize(direction === 'col' ? e.movementX : e.movementY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (lastTouchRef.current) {
        const delta = direction === 'col'
          ? touch.clientX - lastTouchRef.current.x
          : touch.clientY - lastTouchRef.current.y;
        onResize(delta);
      }
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const handleEnd = () => {
      setIsDragging(false);
      lastTouchRef.current = null;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    document.body.style.cursor = direction === 'col' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onResize, direction]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
  };

  return (
    <div
      className={`${direction === 'col' ? 'w-[2px] cursor-col-resize' : 'h-[2px] cursor-row-resize'} shrink-0 transition-all duration-150 relative group touch-none ${isDragging ? 'bg-primary/50' : 'bg-border/20 hover:bg-primary/20'}`}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={handleTouchStart}
      data-testid="resize-handle"
    >
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-12 -ml-[5px]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-12 -mt-[5px]'} rounded-full transition-colors ${isDragging ? 'bg-primary/30' : 'bg-transparent group-hover:bg-primary/20'}`} />
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-8' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] w-8'} rounded-full transition-colors ${isDragging ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40'}`} />
    </div>
  );
}

const audioCtxRef = { current: null as AudioContext | null };

function playAlertSound() {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

function useAlertSound(alerts: { id: string }[], enabled: boolean) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const currentIds = new Set(alerts.map(a => a.id));

    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      prevIdsRef.current = currentIds;
      return;
    }

    let hasNew = false;
    currentIds.forEach(id => {
      if (!prevIdsRef.current.has(id)) hasNew = true;
    });

    if (hasNew) playAlertSound();
    prevIdsRef.current = currentIds;
  }, [alerts, enabled]);
}

type PanelId = 'map' | 'events' | 'radar' | 'adsb' | 'alerts' | 'markets' | 'intel' | 'telegram';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  intel: { icon: Brain, label: 'AI Intel', labelAr: '\u0630\u0643\u0627\u0621' },
  map: { icon: Target, label: 'Map', labelAr: '\u062E\u0631\u064A\u0637\u0629' },
  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  radar: { icon: Plane, label: 'Radar', labelAr: '\u0631\u0627\u062F\u0627\u0631' },
  adsb: { icon: Radar, label: 'ADS-B', labelAr: '\u0645\u0631\u0627\u0642\u0628\u0629 \u062C\u0648\u064A\u0629' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: '\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  markets: { icon: BarChart3, label: 'Markets', labelAr: '\u0623\u0633\u0648\u0627\u0642' },
};

function PanelMinimizeButton({ onMinimize }: { onMinimize: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onMinimize(); }}
      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/15 active:bg-red-500/25 transition-colors"
      title="Close panel"
      data-testid="button-panel-close"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

function PanelMaximizeButton({ isMaximized, onToggle }: { isMaximized: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/15 active:bg-primary/25 transition-colors"
      title={isMaximized ? "Restore panel" : "Maximize panel"}
      data-testid="button-panel-maximize"
    >
      {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
    </button>
  );
}

function getThreatLevel(alertCount: number, sirenCount: number): { level: string; color: string; bg: string } {
  const total = alertCount + sirenCount;
  if (total > 15) return { level: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-950/50 border-red-500/40' };
  if (total > 8) return { level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-500/40' };
  if (total > 3) return { level: 'ELEVATED', color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-500/40' };
  return { level: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-500/40' };
}

function useDesktopNotifications(alerts: RedAlert[], sirens: SirenAlert[], enabled: boolean) {
  const prevAlertIds = useRef<Set<string>>(new Set());
  const prevSirenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    if (!initialized.current) {
      initialized.current = true;
      prevAlertIds.current = new Set(alerts.map(a => a.id));
      prevSirenIds.current = new Set(sirens.map(s => s.id));
      return;
    }

    const currentAlertIds = new Set(alerts.map(a => a.id));
    const currentSirenIds = new Set(sirens.map(s => s.id));

    alerts.forEach(a => {
      if (!prevAlertIds.current.has(a.id)) {
        new Notification('RED ALERT - ' + a.city, {
          body: `${a.threatType.replace(/_/g, ' ').toUpperCase()} - ${a.region}, ${a.country}`,
          icon: '/favicon.ico',
          tag: a.id,
        });
      }
    });

    sirens.forEach(s => {
      if (!prevSirenIds.current.has(s.id)) {
        new Notification('SIREN - ' + s.location, {
          body: `${s.threatType.toUpperCase()} - ${s.region}`,
          icon: '/favicon.ico',
          tag: s.id,
        });
      }
    });

    prevAlertIds.current = currentAlertIds;
    prevSirenIds.current = currentSirenIds;
  }, [alerts, sirens, enabled]);
}

interface AnalystNote {
  id: string;
  text: string;
  timestamp: string;
  category: string;
}

interface LayoutPreset {
  name: string;
  visiblePanels: Record<PanelId, boolean>;
  colWidths: Record<PanelId, number>;
  rowSplit: number;
}

const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    name: 'Default',
    visiblePanels: { intel: true, map: true, telegram: true, events: true, radar: true, adsb: true, alerts: true, markets: true },
    colWidths: { telegram: 16, intel: 16, map: 42, alerts: 26, events: 22, radar: 22, adsb: 28, markets: 28 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { intel: false, map: true, telegram: false, events: false, radar: true, adsb: true, alerts: false, markets: true },
    colWidths: { telegram: 16, intel: 16, map: 60, alerts: 26, events: 22, radar: 30, adsb: 40, markets: 30 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { intel: false, map: true, telegram: false, events: true, radar: true, adsb: true, alerts: true, markets: false },
    colWidths: { telegram: 16, intel: 16, map: 50, alerts: 50, events: 25, radar: 25, adsb: 50, markets: 28 },
    rowSplit: 55,
  },
];

interface Correlation {
  id: string;
  items: { type: 'event' | 'alert' | 'siren' | 'flight'; id: string; label: string }[];
  reason: string;
}

function useCorrelations(events: ConflictEvent[], alerts: RedAlert[], sirens: SirenAlert[], flights: FlightData[]): Correlation[] {
  return useMemo(() => {
    const correlations: Correlation[] = [];
    let cId = 0;

    events.forEach(evt => {
      if (evt.type === 'missile' || evt.type === 'airstrike') {
        const relatedAlerts = alerts.filter(a => {
          const dist = Math.sqrt(Math.pow(a.lat - evt.lat, 2) + Math.pow(a.lng - evt.lng, 2));
          return dist < 2;
        });
        const relatedSirens = sirens.filter(s => {
          const timeDiff = Math.abs(new Date(s.timestamp).getTime() - new Date(evt.timestamp).getTime());
          return timeDiff < 300000;
        });
        if (relatedAlerts.length > 0 || relatedSirens.length > 0) {
          const items: Correlation['items'] = [{ type: 'event', id: evt.id, label: evt.title }];
          relatedAlerts.forEach(a => items.push({ type: 'alert', id: a.id, label: a.city }));
          relatedSirens.forEach(s => items.push({ type: 'siren', id: s.id, label: s.location }));
          correlations.push({ id: `corr-${cId++}`, items, reason: 'Spatial/temporal proximity' });
        }
      }

      if (evt.type === 'defense') {
        const nearbyFlights = flights.filter(f => {
          if (f.type !== 'military') return false;
          const dist = Math.sqrt(Math.pow(f.lat - evt.lat, 2) + Math.pow(f.lng - evt.lng, 2));
          return dist < 3;
        });
        if (nearbyFlights.length > 0) {
          const items: Correlation['items'] = [{ type: 'event', id: evt.id, label: evt.title }];
          nearbyFlights.forEach(f => items.push({ type: 'flight', id: f.id, label: f.callsign }));
          correlations.push({ id: `corr-${cId++}`, items, reason: 'Military response pattern' });
        }
      }
    });

    return correlations;
  }, [events, alerts, sirens, flights]);
}

function NotesOverlay({ language, onClose }: { language: 'en' | 'ar'; onClose: () => void }) {
  const [notes, setNotes] = useState<AnalystNote[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_notes') || '[]'); } catch { return []; }
  });
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState('general');

  const saveNotes = useCallback((updated: AnalystNote[]) => {
    setNotes(updated);
    localStorage.setItem('warroom_notes', JSON.stringify(updated));
  }, []);

  const addNote = useCallback(() => {
    if (!newNote.trim()) return;
    const note: AnalystNote = { id: `n-${Date.now()}`, text: newNote.trim(), timestamp: new Date().toISOString(), category };
    saveNotes([note, ...notes]);
    setNewNote('');
  }, [newNote, category, notes, saveNotes]);

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  }, [notes, saveNotes]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="notes-overlay">
      <div className="w-[500px] max-h-[70vh] bg-background border border-border/50 rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Analyst Notes' : '\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u0644'}</span>
          <span className="text-xs text-muted-foreground/50 font-mono">{notes.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-notes"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border/30 space-y-2">
          <div className="flex gap-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder={language === 'en' ? 'Add intelligence note...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629...'}
              className="flex-1 bg-card/50 border border-border/50 rounded px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 font-mono"
              data-testid="input-note"
            />
            <button onClick={addNote} className="px-3 py-1.5 rounded bg-primary/20 border border-primary/30 text-primary text-[11px] font-mono font-bold hover:bg-primary/30 transition-colors" data-testid="button-add-note">
              {language === 'en' ? 'Add' : '\u0625\u0636\u0627\u0641\u0629'}
            </button>
          </div>
          <div className="flex gap-1">
            {['general', 'threat', 'intel', 'maritime'].map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`text-xs px-2 py-0.5 rounded font-mono font-bold border transition-colors ${category === c ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-card/30 border-border/30 text-muted-foreground/60'}`}>{c.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-border/20">
            {notes.length === 0 && (
              <div className="px-4 py-8 text-center">
                <StickyNote className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground/50">{language === 'en' ? 'No notes yet' : '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0644\u0627\u062D\u0638\u0627\u062A'}</p>
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} className="px-4 py-2.5 hover:bg-card/30 transition-colors" data-testid={`note-${n.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/70 font-mono font-bold uppercase">{n.category}</span>
                  <span className="text-[11px] text-muted-foreground/50 font-mono ml-auto">{timeAgo(n.timestamp)}</span>
                  <button onClick={() => deleteNote(n.id)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20" data-testid={`button-delete-note-${n.id}`}><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function WatchlistOverlay({ language, onClose }: { language: 'en' | 'ar'; onClose: () => void }) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');

  const save = useCallback((updated: string[]) => {
    setItems(updated);
    localStorage.setItem('warroom_watchlist', JSON.stringify(updated));
  }, []);

  const add = useCallback(() => {
    if (!newItem.trim() || items.includes(newItem.trim())) return;
    save([...items, newItem.trim()]);
    setNewItem('');
  }, [newItem, items, save]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="watchlist-overlay">
      <div className="w-[400px] max-h-[60vh] bg-background border border-border/50 rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Watchlist' : '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629'}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-watchlist"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={language === 'en' ? 'Callsign, ship name, city...' : '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0626\u0631\u0629 \u0623\u0648 \u0627\u0644\u0633\u0641\u064A\u0646\u0629...'}
              className="flex-1 bg-card/50 border border-border/50 rounded px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/50 font-mono"
              data-testid="input-watchlist"
            />
            <button onClick={add} className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold hover:bg-amber-500/30 transition-colors" data-testid="button-add-watchlist">+</button>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {items.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 text-center py-4">{language === 'en' ? 'Add items to track across all panels' : '\u0623\u0636\u0641 \u0639\u0646\u0627\u0635\u0631 \u0644\u0644\u062A\u062A\u0628\u0639'}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <div key={item} className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] font-mono" data-testid={`watchlist-item-${item}`}>
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>{item}</span>
                  <button onClick={() => save(items.filter(i => i !== item))} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-500/30"><X className="w-3 h-3 text-red-400/70" /></button>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function AlertHistoryOverlay({ language, onClose }: { language: 'en' | 'ar'; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: history = [], isLoading } = useQuery<Array<RedAlert & { resolved: boolean; resolvedAt?: string }>>({
    queryKey: ['/api/alert-history'],
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(a => a.city.toLowerCase().includes(q) || a.country.toLowerCase().includes(q) || a.threatType.toLowerCase().includes(q));
  }, [history, searchQuery]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="alert-history-overlay">
      <div className="w-[600px] max-h-[75vh] bg-background border border-red-500/30 rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-red-900/40 bg-red-950/20 flex items-center gap-2 rounded-t-lg">
          <History className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold font-mono text-red-300">{language === 'en' ? 'Alert History' : '\u0633\u062C\u0644 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}</span>
          <span className="text-xs text-red-400/50 font-mono">{filtered.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20" data-testid="button-close-history"><X className="w-4 h-4 text-red-300" /></button>
        </div>
        <div className="px-4 py-2 border-b border-red-900/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-red-400/40" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search alerts...' : '\u0628\u062D\u062B...'}
              className="w-full bg-red-950/30 border border-red-800/30 rounded pl-8 pr-3 py-1.5 text-[11px] text-red-100 placeholder:text-red-400/30 focus:outline-none focus:border-red-500/50 font-mono"
              data-testid="input-history-search"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          {isLoading && <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-red-400/40 animate-spin mx-auto" /></div>}
          <div className="divide-y divide-red-900/15">
            {filtered.map(a => (
              <div key={a.id} className="px-4 py-2 hover:bg-red-950/10 transition-colors" data-testid={`history-alert-${a.id}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${a.resolved ? 'bg-emerald-500/50' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-[11px] font-bold text-foreground/90">{a.city}</span>
                  <span className="text-xs text-muted-foreground/50 font-mono">{a.country}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono uppercase ${a.resolved ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border border-red-500/30 text-red-400'}`}>
                    {a.resolved ? 'RESOLVED' : 'ACTIVE'}
                  </span>
                  <span className="text-xs text-muted-foreground/40 font-mono ml-auto">{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/60 font-mono uppercase">{a.threatType.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground/40">{a.region}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function LayoutPresetsDropdown({ language, presets, onLoad, onSave, onDelete, onClose }: {
  language: 'en' | 'ar';
  presets: LayoutPreset[];
  onLoad: (preset: LayoutPreset) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  return (
    <div className="absolute top-10 right-0 z-[150] w-64 bg-background border border-border/50 rounded-lg shadow-2xl" data-testid="layout-presets-dropdown">
      <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
        <Layout className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-xs font-bold font-mono text-foreground/80 uppercase tracking-wider">{language === 'en' ? 'Layout Presets' : '\u0642\u0648\u0627\u0644\u0628'}</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"><X className="w-3 h-3" /></button>
      </div>
      <div className="p-2 space-y-1">
        {presets.map(p => (
          <div key={p.name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-card/50 transition-colors group" data-testid={`preset-${p.name}`}>
            <button onClick={() => { onLoad(p); onClose(); }} className="flex-1 text-left text-[11px] font-mono text-foreground/80 hover:text-foreground">{p.name}</button>
            {!BUILT_IN_PRESETS.find(b => b.name === p.name) && (
              <button onClick={() => onDelete(p.name)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 active:bg-red-500/30 opacity-60 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-400/60" /></button>
            )}
          </div>
        ))}
      </div>
      <div className="px-2 pb-2 border-t border-border/30 pt-2">
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            placeholder={language === 'en' ? 'Save current...' : '\u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u064A...'}
            className="flex-1 bg-card/50 border border-border/50 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-mono"
            data-testid="input-preset-name"
          />
          <button
            onClick={() => { if (newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-bold hover:bg-primary/30"
            data-testid="button-save-preset"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EventTimeline({ events, language }: { events: ConflictEvent[]; language: 'en' | 'ar' }) {
  const [hoveredEvent, setHoveredEvent] = useState<ConflictEvent | null>(null);

  const now = Date.now();
  const oneHourAgo = now - 3600000;

  const timelineEvents = useMemo(() => {
    return events.filter(e => new Date(e.timestamp).getTime() > oneHourAgo).map(e => ({
      ...e,
      position: ((new Date(e.timestamp).getTime() - oneHourAgo) / 3600000) * 100,
    }));
  }, [events, oneHourAgo]);

  const sevColor: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="h-10 border-t border-border/30 bg-card/20 relative flex items-center px-4 shrink-0" data-testid="event-timeline">
      <span className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-wider mr-3 shrink-0">
        {language === 'en' ? 'TIMELINE' : '\u062C\u062F\u0648\u0644 \u0632\u0645\u0646\u064A'}
      </span>
      <div className="flex-1 relative h-4 bg-card/30 rounded border border-border/20">
        <div className="absolute right-0 top-0 bottom-0 w-px bg-primary/40" />
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-primary/40 font-mono">NOW</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground/30 font-mono">-1h</span>
        {timelineEvents.map(e => (
          <div
            key={e.id}
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-125 active:scale-110 flex items-center justify-center ${hoveredEvent?.id === e.id ? 'scale-125' : ''}`}
            style={{ left: `${Math.max(2, Math.min(95, e.position))}%` }}
            onMouseEnter={() => setHoveredEvent(e)}
            onMouseLeave={() => setHoveredEvent(null)}
            onClick={() => setHoveredEvent(hoveredEvent?.id === e.id ? null : e)}
            data-testid={`timeline-event-${e.id}`}
          >
            <div className={`w-2 h-2 rounded-full ${sevColor[e.severity] || 'bg-blue-500'}`} />
          </div>
        ))}
        {hoveredEvent && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border/60 rounded px-2 py-1 text-[11px] font-mono whitespace-nowrap z-10 shadow-lg">
            <span className="text-foreground/90 font-bold">{hoveredEvent.title}</span>
            <span className="text-muted-foreground/50 ml-2">{timeAgo(hoveredEvent.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function generateExportReport(
  events: ConflictEvent[],
  flights: FlightData[],
  ships: ShipData[],
  alerts: RedAlert[],
  sirens: SirenAlert[],
  commodities: CommodityData[],
  threatLevel: { level: string },
  language: 'en' | 'ar'
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push('=' .repeat(60));
  lines.push('WARROOM INTELLIGENCE REPORT');
  lines.push('=' .repeat(60));
  lines.push(`Generated: ${now}`);
  lines.push(`Threat Level: ${threatLevel.level}`);
  lines.push('');
  lines.push('--- ALERT SUMMARY ---');
  lines.push(`Active Red Alerts: ${alerts.length}`);
  lines.push(`Active Sirens: ${sirens.length}`);
  if (alerts.length > 0) {
    lines.push('');
    const byCountry: Record<string, number> = {};
    alerts.forEach(a => { byCountry[a.country] = (byCountry[a.country] || 0) + 1; });
    Object.entries(byCountry).forEach(([c, n]) => lines.push(`  ${c}: ${n} alerts`));
  }
  lines.push('');
  lines.push('--- TOP EVENTS ---');
  const topEvents = [...events].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  }).slice(0, 8);
  topEvents.forEach(e => {
    lines.push(`[${e.severity.toUpperCase()}] ${e.title} - ${e.description}`);
  });
  lines.push('');
  lines.push('--- MILITARY FLIGHTS ---');
  const milFlights = flights.filter(f => f.type === 'military' || f.type === 'surveillance');
  milFlights.forEach(f => {
    lines.push(`${f.callsign} | ${f.type.toUpperCase()} | ALT ${f.altitude}ft | HDG ${Math.round(f.heading)}`);
  });
  lines.push('');
  lines.push('--- MARITIME ---');
  ships.forEach(s => {
    lines.push(`${s.name} | ${s.type.toUpperCase()} | ${s.flag} | ${s.speed}kn`);
  });
  lines.push('');
  lines.push('--- COMMODITY MOVERS ---');
  const movers = [...commodities].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);
  movers.forEach(c => {
    lines.push(`${c.symbol}: ${c.price} (${c.changePercent >= 0 ? '+' : ''}${c.changePercent.toFixed(2)}%)`);
  });
  lines.push('');
  lines.push('=' .repeat(60));
  lines.push('END OF REPORT');
  return lines.join('\n');
}

function isWatchlisted(text: string, watchlist: string[]): boolean {
  if (watchlist.length === 0) return false;
  const lower = text.toLowerCase();
  return watchlist.some(w => lower.includes(w.toLowerCase()));
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="flex items-center gap-2" data-testid="text-clock">
      <span className="text-xs text-muted-foreground font-mono hidden md:inline">{dateStr}</span>
      <span className="text-xs text-foreground font-mono font-semibold tabular-nums tracking-tight">{formatted}</span>
      <span className="text-[11px] text-muted-foreground/60">UTC</span>
    </div>
  );
}

function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-8 border-b border-border/20 bg-card/10" />;
  const items = [...commodities, ...commodities, ...commodities];

  return (
    <div className="h-8 border-b border-primary/10 bg-primary/3 overflow-hidden relative" data-testid="ticker-bar">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 flex items-center pl-2">
        <span className="text-[9px] font-bold tracking-[0.25em] text-primary/60 font-mono">MKT</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="absolute flex items-center h-full gap-5 animate-ticker-scroll whitespace-nowrap pl-12">
        {items.map((c, i) => (
          <span key={`${c.symbol}-${i}`} className="inline-flex items-center gap-1 font-mono text-[11px]">
            <span className="text-primary/80 font-bold">{c.symbol}</span>
            <span className="text-foreground/60">{formatPrice(c)}</span>
            <span className={`inline-flex items-center gap-0.5 ${c.change >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
              {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
            </span>
            <span className="text-border/30 mx-0.5">\u00B7</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const THREAT_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  rocket: { en: 'ROCKET FIRE', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E', icon: '\u{1F680}' },
  missile: { en: 'MISSILE LAUNCH', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E', icon: '\u{1F4A5}' },
  uav: { en: 'HOSTILE UAV', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0633\u064A\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u2708\uFE0F' },
  hostile_aircraft: { en: 'HOSTILE AIRCRAFT', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u26A0\uFE0F' },
};

function SirenBanner({ sirens, language }: { sirens: SirenAlert[]; language: 'en' | 'ar' }) {
  const [expanded, setExpanded] = useState(false);

  if (sirens.length === 0) return null;

  const sorted = [...sirens].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="border-b border-red-900/30 shrink-0" data-testid="siren-banner">
      <div
        className="animate-siren-bg flex items-center gap-2 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-siren-toggle"
      >
        <div className="flex items-center gap-2 py-1.5 shrink-0">
          <div className="w-4 h-4 rounded bg-red-600/25 flex items-center justify-center animate-siren-flash border border-red-500/60">
            <Siren className="w-3 h-3 text-red-400/90" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-400/80 font-mono whitespace-nowrap">
            {language === 'en' ? 'ACTIVE SIRENS' : '\u0635\u0641\u0627\u0631\u0627\u062A \u0646\u0634\u0637\u0629'}
          </span>
          <Badge variant="destructive" className="text-[11px] px-1 py-0 h-[16px] font-mono font-bold animate-pulse-dot">
            {sirens.length}
          </Badge>
        </div>

        <div className="flex-1 overflow-hidden min-w-0">
          <div className="flex items-center gap-4 animate-siren-scroll whitespace-nowrap">
            {[...sorted, ...sorted].map((s, i) => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <span key={`${s.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                  <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-red-300 font-bold">
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className="text-red-500/70">\u2022</span>
                  <span className="text-red-400/80 text-[10px]">
                    {language === 'ar' ? threat.ar : threat.en}
                  </span>
                  <span className="text-red-900/60 mx-1">\u2502</span>
                </span>
              );
            })}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="text-[10px] text-red-400 px-2 h-6 font-mono shrink-0 hover:bg-red-900/30"
          data-testid="button-siren-expand"
        >
          {expanded ? '\u25B2' : '\u25BC'} {language === 'en' ? 'Details' : '\u062A\u0641\u0627\u0635\u064A\u0644'}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-red-900/30 bg-red-950/20 max-h-[180px] overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-red-900/20">
            {sorted.map((s) => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <div
                  key={s.id}
                  className="px-3 py-2 bg-background/80 animate-fade-in"
                  data-testid={`siren-alert-${s.id}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-red-300 font-bold truncate">
                      {language === 'ar' ? s.locationAr : s.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-bold tracking-wider rounded-sm">
                      {language === 'ar' ? threat.ar : threat.en}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto tabular-nums">
                      {timeAgo(s.timestamp)}
                    </span>
                  </div>
                  <span className="text-[10px] text-red-400/60 mt-0.5 block">
                    {language === 'ar' ? s.regionAr : s.region}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelHeader({
  title,
  icon,
  live,
  count,
  onClose,
  extra,
  onMaximize,
  isMaximized,
}: {
  title: string;
  icon: React.ReactNode;
  live?: boolean;
  count?: number;
  onClose?: () => void;
  extra?: React.ReactNode;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  return (
    <div className="px-4 py-3 border-b border-border/40 border-l-2 border-l-primary/60 flex items-center gap-2 bg-card/60 shrink-0">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary/90 font-mono">{title}</span>
      {count !== undefined && (
        <span className="text-xs px-1.5 py-0 font-mono text-primary/50 bg-primary/5 rounded border border-primary/15">
          {count}
        </span>
      )}
      {extra}
      <div className="flex-1" />
      {live && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-400/70 font-bold font-mono">LIVE</span>
        </div>
      )}
      {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
      {onClose && <PanelMinimizeButton onMinimize={onClose} />}
    </div>
  );
}

const CATEGORY_STYLES: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; color: string }> = {
  breaking: { variant: 'destructive', color: 'text-red-400' },
  military: { variant: 'default', color: 'text-orange-400' },
  diplomatic: { variant: 'secondary', color: 'text-blue-400' },
  economic: { variant: 'outline', color: 'text-emerald-400' },
};


function CommodityRow({ c, language }: { c: CommodityData; language: 'en' | 'ar' }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-2.5 font-mono text-xs items-center hover-elevate transition-colors"
      data-testid={`commodity-${c.symbol}`}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-foreground/90 font-bold text-xs truncate">{c.symbol}</span>
        <span className="text-[11px] text-muted-foreground/70 leading-tight truncate">{language === 'ar' ? c.nameAr : c.name}</span>
      </div>
      <span className="text-foreground/80 tabular-nums text-right font-semibold whitespace-nowrap text-xs">
        {formatPrice(c)}
      </span>
      <div className={`flex items-center gap-0.5 justify-end tabular-nums font-semibold whitespace-nowrap min-w-[52px] text-xs ${c.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        <div className={`w-0.5 h-2.5 rounded-full ${c.change >= 0 ? 'bg-emerald-500/40' : 'bg-red-500/40'}`} />
        <span>{c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 bg-primary/5 border-y border-primary/10">
      <span className="text-xs uppercase tracking-[0.15em] text-primary/50 font-bold font-mono">{label}</span>
    </div>
  );
}

function CommoditiesPanel({
  commodities,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  commodities: CommodityData[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const cmdty = commodities.filter(c => c.category === 'commodity');
  const fxMajor = commodities.filter(c => c.category === 'fx-major');
  const fxRegional = commodities.filter(c => c.category === 'fx');

  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Markets' : '\u0627\u0644\u0623\u0633\u0648\u0627\u0642'}
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground/60 font-bold border-b border-border/20">
        <span>{language === 'en' ? 'Symbol' : '\u0627\u0644\u0631\u0645\u0632'}</span>
        <span className="text-right">{language === 'en' ? 'Price' : '\u0627\u0644\u0633\u0639\u0631'}</span>
        <span className="text-right">{language === 'en' ? 'Chg%' : '\u0627\u0644\u062A\u063A\u064A\u064A\u0631%'}</span>
      </div>
      <SectionLabel label={language === 'en' ? '\u25B8 Commodities' : '\u25B8 \u0627\u0644\u0633\u0644\u0639'} />
      <div className="divide-y divide-border/10">
        {cmdty.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
      </div>
      <SectionLabel label={language === 'en' ? '\u25B8 Major FX' : '\u25B8 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629'} />
      <div className="divide-y divide-border/10">
        {fxMajor.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
      </div>
      <SectionLabel label={language === 'en' ? '\u25B8 Regional FX' : '\u25B8 \u0639\u0645\u0644\u0627\u062A \u0625\u0642\u0644\u064A\u0645\u064A\u0629'} />
      <div className="divide-y divide-border/10">
        {fxRegional.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
      </div>
    </div>
  );
}

const THREAT_COLORS: Record<string, string> = {
  rocket: 'text-red-400 border-red-500/40 bg-red-950/30',
  missile: 'text-orange-400 border-orange-500/40 bg-orange-950/30',
  uav: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30',
  hostile_aircraft: 'text-purple-400 border-purple-500/40 bg-purple-950/30',
};

function SirensPanel({ sirens, language, onClose }: { sirens: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void }) {
  const sorted = [...sirens].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Siren Alerts' : 'صفارات الإنذار'}
        icon={<Siren className="w-3.5 h-3.5" />}
        live
        count={sirens.length}
        onClose={onClose}
      />
      {sirens.length === 0 && (
        <div className="px-3 py-6 text-center">
          <ShieldAlert className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No active alerts</p>
        </div>
      )}
      <div className="divide-y divide-border/15">
        {sorted.map((s) => {
          const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
          const colors = THREAT_COLORS[s.threatType] || THREAT_COLORS.rocket;
          return (
            <div
              key={s.id}
              className="px-4 py-3 animate-fade-in hover-elevate border-l-2 border-l-red-500/40"
              data-testid={`siren-panel-${s.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot shrink-0" />
                <span className="text-xs text-red-300/90 font-bold truncate flex-1">
                  {language === 'ar' ? s.locationAr : s.location}
                </span>
                <span className="text-xs text-muted-foreground/60 font-mono tabular-nums shrink-0">
                  {timeAgo(s.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-bold tracking-wider uppercase font-mono ${colors}`}>
                  {language === 'ar' ? threat.ar : threat.en}
                </span>
                <span className="text-xs text-muted-foreground/50 truncate">
                  {language === 'ar' ? s.regionAr : s.region}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FLIGHT_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  military:    { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    label: 'MIL' },
  surveillance:{ color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', label: 'ISR' },
  commercial:  { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  label: 'CIV' },
};

function headingToCompass(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function FlightRadarPanel({ flights, language, onClose, onMaximize, isMaximized }: { flights: FlightData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const sorted = [...flights].sort((a, b) => {
    const order = { military: 0, surveillance: 1, commercial: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  });

  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Flight Radar' : 'رادار الطيران'}
        icon={<Plane className="w-3.5 h-3.5" />}
        live
        count={flights.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      {flights.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Plane className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">Scanning airspace...</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((f) => {
          const style = FLIGHT_TYPE_STYLES[f.type] || FLIGHT_TYPE_STYLES.commercial;
          return (
            <div
              key={f.id}
              className="px-4 py-3.5 hover-elevate animate-fade-in"
              data-testid={`flight-${f.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-foreground/25 shrink-0 inline-block"
                  style={{ transform: `rotate(${f.heading}deg)`, fontSize: '9px', lineHeight: 1 }}
                >▲</span>
                <span className="text-xs font-bold font-mono text-foreground/90 truncate flex-1">{f.callsign}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-2 text-xs font-mono text-muted-foreground/70">
                <span><span className="text-foreground/30">ALT</span> {(f.altitude / 1000).toFixed(0)}k</span>
                <span><span className="text-foreground/30">SPD</span> {f.speed}</span>
                <span><span className="text-foreground/30">HDG</span> {headingToCompass(f.heading)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ADSB_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  military:     { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    label: 'MIL' },
  surveillance: { color: 'text-cyan-400',   bg: 'bg-cyan-950/40 border-cyan-500/30',  label: 'ISR' },
  commercial:   { color: 'text-green-400',  bg: 'bg-green-950/40 border-green-500/30', label: 'CIV' },
  cargo:        { color: 'text-amber-400',  bg: 'bg-amber-950/40 border-amber-500/30', label: 'CGO' },
  private:      { color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/30', label: 'PVT' },
  government:   { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  label: 'GOV' },
};

function AdsbPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [filter, setFilter] = useState<string>('all');
  const [selectedFlight, setSelectedFlight] = useState<AdsbFlight | null>(null);

  const { data: adsbFlights = [], isLoading } = useQuery<AdsbFlight[]>({
    queryKey: ['/api/adsb'],
    refetchInterval: 6000,
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return adsbFlights;
    if (filter === 'flagged') return adsbFlights.filter(f => f.flagged);
    return adsbFlights.filter(f => f.type === filter);
  }, [adsbFlights, filter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      const order: Record<string, number> = { military: 0, surveillance: 1, government: 2, cargo: 3, commercial: 4, private: 5 };
      return (order[a.type] ?? 6) - (order[b.type] ?? 6);
    }),
  [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: adsbFlights.length, flagged: 0 };
    for (const f of adsbFlights) {
      c[f.type] = (c[f.type] || 0) + 1;
      if (f.flagged) c.flagged++;
    }
    return c;
  }, [adsbFlights]);

  return (
    <div className="h-full flex flex-col" data-testid="adsb-panel">
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Radar className="w-3.5 h-3.5 text-cyan-400/70" />
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
          ADS-B
        </span>
        <span className="text-xs px-1.5 py-0 font-mono text-cyan-400/60 bg-cyan-950/30 rounded border border-cyan-500/20">
          {adsbFlights.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="px-2 py-2 border-b border-border/30 flex gap-1 flex-wrap shrink-0">
        {[
          { key: 'all', label: 'All' },
          { key: 'flagged', label: 'Flagged' },
          { key: 'military', label: 'MIL' },
          { key: 'surveillance', label: 'ISR' },
          { key: 'commercial', label: 'CIV' },
          { key: 'cargo', label: 'CGO' },
          { key: 'government', label: 'GOV' },
          { key: 'private', label: 'PVT' },
        ].map(({ key, label }) => (
          <button
            key={key}
            data-testid={`adsb-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`text-xs px-2 py-1 rounded font-bold font-mono border transition-colors ${
              filter === key
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                : 'bg-card/30 border-border/30 text-muted-foreground/60'
            }`}
          >
            {label} {counts[key] ? `(${counts[key]})` : ''}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="px-3 py-8 text-center">
            <Radar className="w-6 h-6 text-cyan-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-[12px] text-muted-foreground">Scanning ADS-B feeds...</p>
          </div>
        )}

        {selectedFlight && (
          <div className="px-3 py-2 bg-cyan-950/20 border-b border-cyan-500/20 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold font-mono text-cyan-300">{selectedFlight.callsign}</span>
              <button
                onClick={() => setSelectedFlight(null)}
                className="text-muted-foreground/40 text-[12px]"
                data-testid="adsb-close-detail"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
              <div><span className="text-foreground/30">HEX</span> <span className="text-foreground/70">{selectedFlight.hex}</span></div>
              <div><span className="text-foreground/30">REG</span> <span className="text-foreground/70">{selectedFlight.registration}</span></div>
              <div><span className="text-foreground/30">ACFT</span> <span className="text-foreground/70">{selectedFlight.aircraft}</span></div>
              <div><span className="text-foreground/30">CTRY</span> <span className="text-foreground/70">{selectedFlight.country}</span></div>
              <div><span className="text-foreground/30">ORIG</span> <span className="text-foreground/70">{selectedFlight.origin}</span></div>
              <div><span className="text-foreground/30">DEST</span> <span className="text-foreground/70">{selectedFlight.destination}</span></div>
              <div><span className="text-foreground/30">ALT</span> <span className="text-foreground/70">{selectedFlight.altitude.toLocaleString()}ft</span></div>
              <div><span className="text-foreground/30">GS</span> <span className="text-foreground/70">{selectedFlight.groundSpeed}kts</span></div>
              <div><span className="text-foreground/30">VR</span> <span className={selectedFlight.verticalRate > 0 ? 'text-green-400' : selectedFlight.verticalRate < 0 ? 'text-red-400' : 'text-foreground/70'}>{selectedFlight.verticalRate > 0 ? '+' : ''}{selectedFlight.verticalRate}fpm</span></div>
              <div><span className="text-foreground/30">HDG</span> <span className="text-foreground/70">{Math.round(selectedFlight.heading)}{'\u00B0'} {headingToCompass(selectedFlight.heading)}</span></div>
              <div><span className="text-foreground/30">SQK</span> <span className={selectedFlight.squawk === '7700' || selectedFlight.squawk === '7600' || selectedFlight.squawk === '7500' ? 'text-red-400 font-bold' : 'text-foreground/70'}>{selectedFlight.squawk}</span></div>
              <div><span className="text-foreground/30">RSSI</span> <span className="text-foreground/70">{selectedFlight.rssi}dBm</span></div>
              <div><span className="text-foreground/30">POS</span> <span className="text-foreground/70">{selectedFlight.lat.toFixed(3)}, {selectedFlight.lng.toFixed(3)}</span></div>
              <div><span className="text-foreground/30">SEEN</span> <span className="text-foreground/70">{selectedFlight.seen}s ago</span></div>
            </div>
          </div>
        )}

        <div className="divide-y divide-border/20">
          {sorted.map((f) => {
            const style = ADSB_TYPE_STYLES[f.type] || ADSB_TYPE_STYLES.commercial;
            return (
              <div
                key={f.id}
                className={`px-3 py-2.5 cursor-pointer transition-colors ${
                  selectedFlight?.id === f.id ? 'bg-cyan-950/30' : ''
                } ${f.flagged ? 'border-l-2 border-l-amber-500/60' : ''}`}
                onClick={() => setSelectedFlight(f)}
                data-testid={`adsb-flight-${f.id}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-foreground/25 shrink-0 inline-block"
                    style={{ transform: `rotate(${f.heading}deg)`, fontSize: '9px', lineHeight: 1 }}
                  >
                    {'\u25B2'}
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground/90 truncate">{f.callsign}</span>
                  <span className="text-[11px] text-muted-foreground/40 font-mono">{f.hex}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold font-mono ml-auto ${style.color} ${style.bg}`}>
                    {style.label}
                  </span>
                  {f.flagged && <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 font-bold font-mono">!</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/50">
                  <span>{f.aircraft}</span>
                  <span>{f.origin} {'\u2192'} {f.destination}</span>
                  <span className="ml-auto">{(f.altitude / 1000).toFixed(0)}k/{f.groundSpeed}kts</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

const SEVERITY_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    dot: 'bg-red-500' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  dot: 'bg-blue-500' },
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  missile:   '🚀',
  airstrike: '💥',
  naval:     '⚓',
  ground:    '🪖',
  defense:   '🛡️',
  nuclear:   '☢️',
};

function ConflictEventsPanel({ events, language, onClose, onMaximize, isMaximized }: { events: ConflictEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const sorted = [...events].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Conflict Events' : 'أحداث النزاع'}
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        live
        count={events.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      {events.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">No active events</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((e) => {
          const sev = SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.low;
          const icon = EVENT_TYPE_ICONS[e.type] || '📍';
          return (
            <div
              key={e.id}
              className="px-3 py-3 hover-elevate animate-fade-in border-l-2"
              style={{ borderLeftColor: e.severity === 'critical' ? 'rgb(239 68 68 / 0.6)' : e.severity === 'high' ? 'rgb(249 115 22 / 0.6)' : 'transparent' }}
              data-testid={`conflict-event-${e.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs shrink-0">{icon}</span>
                <span className="text-xs font-bold font-mono text-foreground truncate flex-1">
                  {language === 'ar' && e.titleAr ? e.titleAr : e.title}
                </span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold font-mono shrink-0 ${sev.color} ${sev.bg}`}>
                  {e.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2 mb-1.5">
                {language === 'ar' && e.descriptionAr ? e.descriptionAr : e.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <span className="uppercase tracking-wider text-foreground/40">{e.type}</span>
                <span className="text-foreground/20">·</span>
                <span>{timeAgo(e.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SHIP_TYPE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  military: { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    label: 'NAV' },
  tanker:   { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30', label: 'TKR' },
  cargo:    { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  label: 'CGO' },
  patrol:   { color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', label: 'PTL' },
};

function MaritimePanel({ ships, language, onClose, onMaximize, isMaximized }: { ships: ShipData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const sorted = [...ships].sort((a, b) => {
    const order = { military: 0, patrol: 1, tanker: 2, cargo: 3 };
    return (order[a.type] ?? 4) - (order[b.type] ?? 4);
  });

  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Maritime' : 'بحري'}
        icon={<Ship className="w-3.5 h-3.5" />}
        live
        count={ships.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      {ships.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Anchor className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">Scanning waters...</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((s) => {
          const style = SHIP_TYPE_STYLES[s.type] || SHIP_TYPE_STYLES.cargo;
          return (
            <div
              key={s.id}
              className="px-3 py-3 hover-elevate animate-fade-in"
              data-testid={`ship-${s.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-foreground/30 shrink-0 inline-block"
                  style={{ transform: `rotate(${s.heading}deg)`, fontSize: '10px', lineHeight: 1 }}
                >▲</span>
                <span className="text-xs font-bold font-mono text-foreground truncate flex-1">{s.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-2 text-xs font-mono text-muted-foreground">
                <span><span className="text-foreground/40">SPD</span> {s.speed}kn</span>
                <span><span className="text-foreground/40">HDG</span> {headingToCompass(s.heading)}</span>
                <span className="truncate"><span className="text-foreground/30">FLG</span> {s.flag}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RED_ALERT_THREAT_LABELS: Record<string, { en: string; ar: string; he: string }> = {
  rockets: { en: 'Rocket Fire', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E', he: '\u05D9\u05E8\u05D9 \u05E8\u05E7\u05D8\u05D5\u05EA' },
  missiles: { en: 'Missile Launch', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E', he: '\u05D8\u05D9\u05DC \u05D1\u05DC\u05D9\u05E1\u05D8\u05D9' },
  hostile_aircraft_intrusion: { en: 'Hostile Aircraft', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', he: '\u05D7\u05D3\u05D9\u05E8\u05EA \u05DB\u05DC\u05D9 \u05D8\u05D9\u05E1' },
  uav_intrusion: { en: 'UAV Intrusion', ar: '\u0627\u062E\u062A\u0631\u0627\u0642 \u0637\u0627\u0626\u0631\u0629 \u0645\u0633\u064A\u0631\u0629', he: '\u05D7\u05D3\u05D9\u05E8\u05EA \u05DB\u05D8\u05DE"\u05D1' },
};

const RED_ALERT_THREAT_COLORS: Record<string, string> = {
  rockets: 'bg-red-600',
  missiles: 'bg-orange-600',
  hostile_aircraft_intrusion: 'bg-purple-600',
  uav_intrusion: 'bg-yellow-600',
};

function RedAlertCountdown({ alert }: { alert: RedAlert }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calcRemaining = () => {
      const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
      return Math.max(0, alert.countdown - elapsed);
    };
    setRemaining(calcRemaining());
    const interval = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(interval);
  }, [alert.timestamp, alert.countdown]);

  const isUrgent = remaining <= 15 && remaining > 0;
  const isImmediate = alert.countdown === 0;

  return (
    <div className={`font-mono text-center shrink-0 min-w-[40px] ${isImmediate || isUrgent ? 'animate-pulse' : ''}`}>
      <div
        className={`text-base font-black tabular-nums leading-none ${
          isImmediate ? 'text-white' : isUrgent ? 'text-red-300' : remaining === 0 ? 'text-red-900/40' : 'text-white/90'
        }`}
        data-testid={`red-alert-countdown-${alert.id}`}
      >
        {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
      </div>
      <div className="text-[8px] text-red-300/40 mt-0.5 uppercase tracking-wider">
        {isImmediate ? '\u05DE\u05D9\u05D9\u05D3\u05D9' : remaining > 0 ? 'sec' : ''}
      </div>
    </div>
  );
}

function RedAlertPanel({ alerts, sirens = [], language, onClose, onMaximize, isMaximized, onShowHistory }: { alerts: RedAlert[]; sirens?: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onShowHistory?: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [threatFilter, setThreatFilter] = useState<string>('all');

  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => {
      const c = a.country || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [alerts]);

  const countryOrder = ['Israel', 'Lebanon', 'Iran', 'Syria', 'Iraq', 'Saudi Arabia', 'Yemen', 'UAE', 'Jordan', 'Kuwait', 'Bahrain', 'Qatar'];

  const activeCountries = useMemo(() => {
    return countryOrder.filter(c => countryCounts[c]);
  }, [countryCounts]);

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (threatFilter !== 'all') {
      filtered = filtered.filter(a => a.threatType === threatFilter);
    }
    if (countryFilter !== 'ALL') {
      filtered = filtered.filter(a => a.country === countryFilter);
    }
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a =>
      a.city.toLowerCase().includes(q) ||
      a.cityHe.includes(q) ||
      a.cityAr.includes(q) ||
      a.region.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  }, [alerts, searchQuery, countryFilter, threatFilter]);

  const grouped = filteredAlerts.reduce<Record<string, { country: string; alerts: RedAlert[] }>>((acc, alert) => {
    const regionKey = language === 'ar' ? alert.regionAr : alert.region;
    const country = alert.country || 'Unknown';
    const key = `${country}::${regionKey}`;
    if (!acc[key]) acc[key] = { country, alerts: [] };
    acc[key].alerts.push(alert);
    return acc;
  }, {});

  const sortedRegions = Object.entries(grouped).sort((a, b) => {
    const countryIdxA = countryOrder.indexOf(a[1].country);
    const countryIdxB = countryOrder.indexOf(b[1].country);
    if (countryIdxA !== countryIdxB) return countryIdxA - countryIdxB;
    const minA = Math.min(...a[1].alerts.map(a => a.countdown));
    const minB = Math.min(...b[1].alerts.map(b => b.countdown));
    return minA - minB;
  });

  const hasActiveAlerts = alerts.length > 0;

  return (
    <div className="flex flex-col h-full" data-testid="red-alert-panel">
      <div className={`px-3 py-2.5 border-b border-red-800/50 flex items-center gap-2 shrink-0 ${hasActiveAlerts ? 'bg-red-700' : 'bg-card/60'}`}>
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${hasActiveAlerts ? 'bg-white/20' : 'bg-red-950/30'}`}>
          <AlertOctagon className={`w-4 h-4 ${hasActiveAlerts ? 'text-white' : 'text-red-400/60'}`} />
        </div>
        <div className="flex flex-col leading-none">
          <span className={`text-xs font-bold uppercase tracking-[0.15em] ${hasActiveAlerts ? 'text-white' : 'text-foreground/80'}`}>
            {language === 'ar' ? '\u0627\u0644\u0625\u0646\u0630\u0627\u0631 \u0627\u0644\u0623\u062D\u0645\u0631' : 'RED ALERT'}
          </span>
          <span className={`text-[10px] font-mono ${hasActiveAlerts ? 'text-white/50' : 'text-red-400/40'}`} dir="rtl">\u05E6\u05D1\u05E2 \u05D0\u05D3\u05D5\u05DD | tzevaadom.co.il</span>
        </div>
        {hasActiveAlerts && (
          <span className="text-[12px] px-2 py-0.5 font-mono text-white font-black bg-white/20 rounded-full border border-white/25 animate-pulse">
            {alerts.length}
          </span>
        )}
        <div className="flex-1" />
        {hasActiveAlerts && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse-dot" />
            <span className="text-[12px] uppercase tracking-[0.2em] text-white/70 font-bold">LIVE</span>
          </div>
        )}
        {onShowHistory && (
          <button onClick={onShowHistory} className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors" title="Alert History" data-testid="button-alert-history">
            <History className="w-3 h-3" />
          </button>
        )}
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      {hasActiveAlerts && (
        <div className="border-b border-red-900/30 bg-red-950/20 shrink-0">
          <div className="px-2 py-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? '\u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u062F\u064A\u0646\u0629...' : 'Search city / country...'}
              className="w-full h-6 text-[11px] font-mono px-2.5 rounded bg-red-950/40 border border-red-800/30 text-red-100/90 placeholder:text-red-400/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
              data-testid="input-red-alert-search"
            />
          </div>
          <div className="px-1.5 pb-1.5 flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'ALL' },
              { key: 'rockets', label: 'ROCKETS' },
              { key: 'missiles', label: 'MISSILES' },
              { key: 'uav_intrusion', label: 'UAV' },
              { key: 'hostile_aircraft_intrusion', label: 'AIRCRAFT' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setThreatFilter(key)}
                className={`text-[11px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
                  threatFilter === key ? 'bg-red-600/50 text-red-100 border border-red-500/40' : 'bg-red-950/40 text-red-400/50 border border-red-900/20 hover:bg-red-900/30'
                }`}
                data-testid={`button-threat-filter-${key}`}
              >{label}</button>
            ))}
          </div>
          {activeCountries.length > 1 && (
            <div className="px-1.5 pb-2 flex flex-wrap gap-1">
              <button
                onClick={() => setCountryFilter('ALL')}
                className={`text-[11px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
                  countryFilter === 'ALL' ? 'bg-red-600/50 text-red-100 border border-red-500/40' : 'bg-red-950/40 text-red-400/50 border border-red-900/20 hover:bg-red-900/30'
                }`}
                data-testid="button-country-filter-all"
              >ALL ({alerts.length})</button>
              {activeCountries.map(c => {
                const FLAG_MAP: Record<string, string> = { Israel: 'IL', Lebanon: 'LB', Iran: 'IR', Syria: 'SY', Iraq: 'IQ', 'Saudi Arabia': 'SA', Yemen: 'YE', UAE: 'AE', Jordan: 'JO', Kuwait: 'KW', Bahrain: 'BH', Qatar: 'QA' };
                const SHORT_NAMES: Record<string, string> = { 'Saudi Arabia': 'KSA', 'United Arab Emirates': 'UAE' };
                const label = SHORT_NAMES[c] || c;
                return (
                  <button
                    key={c}
                    onClick={() => setCountryFilter(c)}
                    className={`text-[11px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
                      countryFilter === c ? 'bg-red-600/50 text-red-100 border border-red-500/40' : 'bg-red-950/40 text-red-400/50 border border-red-900/20 hover:bg-red-900/30'
                    }`}
                    data-testid={`button-country-filter-${FLAG_MAP[c] || c}`}
                  >{label} ({countryCounts[c]})</button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!hasActiveAlerts && (
        <div className="px-3 py-8 text-center flex-1 flex flex-col items-center justify-center">
          <Shield className="w-8 h-8 text-emerald-500/40 mb-3" />
          <p className="text-xs text-emerald-400/80 font-bold font-mono">{language === 'ar' ? '\u0644\u0627 \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0646\u0634\u0637\u0629' : 'No Active Alerts'}</p>
          <p className="text-[12px] text-muted-foreground/40 mt-1 font-mono" dir="rtl">\u05D0\u05D9\u05DF \u05D4\u05EA\u05E8\u05E2\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA</p>
          <p className="text-[12px] text-muted-foreground/30 mt-2">All areas safe</p>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div>
          {sortedRegions.map(([compositeKey, { country, alerts: regionAlerts }], idx) => {
            const regionName = compositeKey.split('::')[1];
            const prevCountry = idx > 0 ? sortedRegions[idx - 1][1].country : null;
            const showCountryHeader = country !== prevCountry;
            const COUNTRY_COLORS: Record<string, string> = { Israel: 'bg-blue-900/30 text-blue-300/90 border-blue-800/30', Lebanon: 'bg-emerald-900/30 text-emerald-300/90 border-emerald-800/30', Iran: 'bg-purple-900/30 text-purple-300/90 border-purple-800/30', Syria: 'bg-yellow-900/30 text-yellow-300/90 border-yellow-800/30', Iraq: 'bg-orange-900/30 text-orange-300/90 border-orange-800/30', 'Saudi Arabia': 'bg-green-900/30 text-green-300/90 border-green-800/30', Yemen: 'bg-rose-900/30 text-rose-300/90 border-rose-800/30', UAE: 'bg-sky-900/30 text-sky-300/90 border-sky-800/30', Jordan: 'bg-amber-900/30 text-amber-300/90 border-amber-800/30', Kuwait: 'bg-teal-900/30 text-teal-300/90 border-teal-800/30', Bahrain: 'bg-pink-900/30 text-pink-300/90 border-pink-800/30', Qatar: 'bg-indigo-900/30 text-indigo-300/90 border-indigo-800/30' };
            const countryColor = COUNTRY_COLORS[country] || 'bg-red-900/30 text-red-300/90 border-red-800/30';
            const countryAlertCount = sortedRegions.filter(([_, g]) => g.country === country).reduce((sum, [_, g]) => sum + g.alerts.length, 0);
            return (
            <div key={compositeKey}>
              {showCountryHeader && (
                <div className={`px-3 py-2 ${countryColor} border-b border-t sticky top-0 z-[110] flex items-center gap-2`}>
                  <span className="text-xs font-black uppercase tracking-[0.15em] font-mono">{country}</span>
                  <span className="text-xs opacity-50 font-mono">({countryAlertCount})</span>
                </div>
              )}
              <div className="px-3 py-1.5 bg-red-950/40 border-b border-red-900/25 border-t border-t-red-900/15 sticky top-[33px] z-[100]">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-red-400/90 font-bold font-mono">{regionName}</span>
                  <span className="text-[11px] text-red-400/40 font-mono">{regionAlerts.length}</span>
                </div>
              </div>
              {regionAlerts.sort((a, b) => a.countdown - b.countdown).map((alert) => {
                const threat = RED_ALERT_THREAT_LABELS[alert.threatType] || RED_ALERT_THREAT_LABELS.rockets;
                const threatColor = RED_ALERT_THREAT_COLORS[alert.threatType] || RED_ALERT_THREAT_COLORS.rockets;
                const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
                const isActive = elapsed < alert.countdown;
                return (
                  <div
                    key={alert.id}
                    className={`px-3 py-2.5 flex items-center gap-3 border-b border-red-900/15 transition-colors ${
                      isActive ? 'bg-red-950/30 border-l-[3px] border-l-red-500' : 'bg-transparent border-l-[3px] border-l-red-900/20'
                    }`}
                    data-testid={`red-alert-${alert.id}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-red-500 animate-pulse-dot' : 'bg-red-900/30'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-bold truncate ${isActive ? 'text-red-200' : 'text-red-300/50'}`}>
                          {language === 'ar' ? alert.cityAr : alert.city}
                        </span>
                        <span className="text-[10px] text-red-400/30 font-mono shrink-0" dir="rtl">{alert.cityHe}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase font-mono ${
                          isActive ? `text-white/90 ${threatColor}` : 'text-red-400/30 bg-red-950/30'
                        }`}>
                          {language === 'ar' ? threat.ar : threat.en}
                        </span>
                        <span className="text-[11px] text-red-400/30 font-mono tabular-nums">
                          {timeAgo(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                    <RedAlertCountdown alert={alert} />
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      </ScrollArea>

      {sirens.length > 0 && (
        <div className="border-t border-amber-900/30 shrink-0">
          <div className="px-3 py-1.5 bg-amber-950/20 flex items-center gap-2">
            <Siren className="w-3 h-3 text-amber-400/60" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-amber-400/70 font-bold font-mono">
              {language === 'ar' ? '\u0635\u0641\u0627\u0631\u0627\u062A' : 'Sirens'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 font-mono text-amber-400/50 bg-amber-950/30 rounded border border-amber-500/15">
              {sirens.length}
            </span>
            <div className="flex-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot" />
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {sirens.map(s => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <div key={s.id} className="px-3 py-1.5 flex items-center gap-2 border-t border-amber-900/10" data-testid={`siren-panel-${s.id}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-dot shrink-0" />
                  <span className="text-xs text-amber-300/80 font-bold truncate flex-1">
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className="text-[10px] text-amber-400/40 font-mono">{language === 'ar' ? threat.ar : threat.en}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-red-900/30 bg-red-950/15 shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-red-400/40 font-mono">tzevaadom.co.il</span>
        <span className="text-[10px] text-red-400/40 font-mono tabular-nums">
          {hasActiveAlerts ? (filteredAlerts.length !== alerts.length ? `${filteredAlerts.length}/${alerts.length}` : `${alerts.length} alerts`) : 'monitoring'}
        </span>
      </div>
    </div>
  );
}

const DEFAULT_CHANNELS = ['@OSINTdefender', '@IntelCrab', '@GeoConfirmed', '@CIG_telegram', '@sentaborim', '@AviationIntel', '@ShipTracker', '@OilMarkets'];

function TelegramPanel({
  messages,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  messages: TelegramMessage[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const [customChannels, setCustomChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('warroom_tg_channels');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newChannel, setNewChannel] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const allChannels = useMemo(() => [...DEFAULT_CHANNELS, ...customChannels], [customChannels]);

  const channelsQueryParam = useMemo(() => allChannels.map(c => c.replace('@', '')).join(','), [allChannels]);

  const { data: liveMessages = [], isLoading: liveLoading } = useQuery<TelegramMessage[]>({
    queryKey: ['/api/telegram/live', channelsQueryParam],
    queryFn: async () => {
      try {
        setLiveError(null);
        const resp = await fetch(`/api/telegram/live?channels=${encodeURIComponent(channelsQueryParam)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (err: any) {
        setLiveError(err.message || 'Failed to fetch live feeds');
        return [];
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: allChannels.length > 0,
  });

  const addChannel = useCallback(() => {
    const ch = newChannel.trim();
    if (!ch) return;
    const formatted = ch.startsWith('@') ? ch : `@${ch}`;
    if (allChannels.includes(formatted)) return;
    const updated = [...customChannels, formatted];
    setCustomChannels(updated);
    localStorage.setItem('warroom_tg_channels', JSON.stringify(updated));
    setNewChannel('');
  }, [newChannel, customChannels, allChannels]);

  const removeChannel = useCallback((ch: string) => {
    const updated = customChannels.filter(c => c !== ch);
    setCustomChannels(updated);
    localStorage.setItem('warroom_tg_channels', JSON.stringify(updated));
  }, [customChannels]);

  const filteredMessages = useMemo(() => {
    if (liveMessages.length > 0) {
      const liveChannelSet = new Set(liveMessages.map(m => m.channel));
      const fallbackForMissingChannels = messages.filter(
        m => allChannels.includes(m.channel) && !liveChannelSet.has(m.channel)
      );
      const merged = [...liveMessages, ...fallbackForMissingChannels];
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return merged;
    }
    return messages.filter(m => allChannels.includes(m.channel));
  }, [messages, liveMessages, allChannels]);

  return (
    <div className="flex flex-col h-full" data-testid="telegram-panel">
      <PanelHeader
        title={language === 'en' ? 'Telegram OSINT' : '\u062A\u0644\u063A\u0631\u0627\u0645 OSINT'}
        icon={<SiTelegram className="w-3.5 h-3.5" />}
        live
        count={filteredMessages.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        extra={
          <div className="flex items-center gap-1">
            {liveMessages.length > 0 && (
              <span className="text-[9px] font-mono text-emerald-400/80 px-1 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20" data-testid="text-live-feed-count">
                {liveMessages.length} LIVE
              </span>
            )}
            {liveLoading && (
              <span className="text-[9px] font-mono text-sky-400/60 animate-pulse" data-testid="text-live-loading">
                FETCHING...
              </span>
            )}
            {liveError && (
              <span className="text-[9px] font-mono text-red-400/70 px-1" data-testid="text-live-error" title={liveError}>
                ERR
              </span>
            )}
            <button
              onClick={() => setShowManager(!showManager)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
              data-testid="button-toggle-channel-manager"
            >
              <Plus className={`w-3.5 h-3.5 text-sky-400/70 transition-transform ${showManager ? 'rotate-45' : ''}`} />
            </button>
          </div>
        }
      />

      {showManager && (
        <div className="border-b border-sky-900/30 bg-sky-950/15 px-2 py-2 shrink-0">
          <div className="flex gap-1 mb-2">
            <div className="flex-1 relative">
              <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40" />
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                placeholder={language === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0642\u0646\u0627\u0629...' : 'Channel name...'}
                className="w-full h-6 text-[11px] font-mono pl-7 pr-2 rounded bg-sky-950/40 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/30 focus:outline-none focus:border-sky-500/50"
                data-testid="input-telegram-channel"
              />
            </div>
            <button
              onClick={addChannel}
              className="h-6 px-2 text-[10px] font-mono font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 rounded border border-sky-500/30 transition-colors"
              data-testid="button-add-channel"
            >
              {language === 'ar' ? '\u0625\u0636\u0627\u0641\u0629' : 'Add'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {allChannels.map(ch => {
              const isCustom = customChannels.includes(ch);
              return (
                <div
                  key={ch}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isCustom
                      ? 'bg-sky-600/20 text-sky-300/90 border border-sky-500/25'
                      : 'bg-sky-950/30 text-sky-400/60 border border-sky-900/20'
                  }`}
                  data-testid={`channel-tag-${ch.replace('@', '')}`}
                >
                  <SiTelegram className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{ch}</span>
                  {isCustom && (
                    <button
                      onClick={() => removeChannel(ch)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-500/30 transition-colors"
                      data-testid={`button-remove-channel-${ch.replace('@', '')}`}
                    >
                      <X className="w-2.5 h-2.5 text-red-400/70" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
          {filteredMessages.length === 0 && (
            <div className="px-3 py-6 text-center">
              <SiTelegram className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {liveLoading
                  ? (language === 'ar' ? 'جاري جلب البيانات الحية...' : 'Fetching live feeds...')
                  : liveError
                    ? (language === 'ar' ? 'خطأ في الاتصال بالقنوات' : 'Error connecting to channels')
                    : (language === 'ar' ? 'لا توجد رسائل حتى الآن' : 'No messages yet - add public channels')}
              </p>
            </div>
          )}
          {filteredMessages.map((msg) => {
            const isExpanded = expandedMsgId === msg.id;
            const isLive = msg.id.startsWith('live_');
            const text = language === 'ar' && msg.textAr ? msg.textAr : msg.text;
            return (
              <div
                key={msg.id}
                className={`px-3 py-3 animate-fade-in cursor-pointer transition-colors ${
                  isLive ? 'border-l-2 border-l-emerald-500/30 ' : ''
                }${isExpanded ? 'bg-sky-950/30' : 'hover:bg-sky-950/15'}`}
                onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                data-testid={`telegram-msg-${msg.id}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <SiTelegram className="w-3 h-3 text-sky-400/80 shrink-0" />
                  <span className="text-xs text-sky-400/90 font-bold truncate">{msg.channel}</span>
                  {isLive && (
                    <span className="text-[8px] font-mono font-bold text-emerald-400/90 bg-emerald-500/15 px-1 rounded border border-emerald-500/20 shrink-0">LIVE</span>
                  )}
                  <span className="text-xs text-muted-foreground/60 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
                  {isExpanded
                    ? <ChevronDown className="w-3 h-3 text-sky-400/50 shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-sky-400/30 shrink-0" />
                  }
                </div>
                {isExpanded ? (
                  <div className="mt-1.5 space-y-2">
                    <p className="text-xs text-foreground/85 leading-[1.7] whitespace-pre-wrap">{text}</p>
                    <div className="flex items-center gap-3 pt-1 border-t border-sky-800/20">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span className="font-mono">{text.length} {language === 'ar' ? 'حرف' : 'chars'}</span>
                      </div>
                      <a
                        href={`https://t.me/${msg.channel.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-sky-400/60 hover:text-sky-400/90 transition-colors ml-auto"
                        data-testid={`link-telegram-channel-${msg.id}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{language === 'ar' ? 'فتح القناة' : 'Open channel'}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{text}</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function MapLegend({ activeView, language }: { activeView: string; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-md border border-primary/15 rounded-md p-2 text-[12px] space-y-1" dir="ltr">
      {activeView === 'conflict' && (
        <>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-foreground/70">{t('Missile/Strike', '\u0635\u0627\u0631\u0648\u062E/\u0636\u0631\u0628\u0629')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /><span className="text-foreground/70">{t('Airstrike', '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /><span className="text-foreground/70">{t('Naval Ops', '\u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u0631\u064A\u0629')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" /><span className="text-foreground/70">{t('Ground', '\u0628\u0631\u064A')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 shrink-0" /><span className="text-foreground/70">{t('Air Defense', '\u062F\u0641\u0627\u0639 \u062C\u0648\u064A')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /><span className="text-foreground/70">{t('Nuclear Site', '\u0645\u0648\u0642\u0639 \u0646\u0648\u0648\u064A')}</span></div>
        </>
      )}
      {activeView === 'flights' && (
        <>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-foreground/70">{t('Military', '\u0639\u0633\u0643\u0631\u064A')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /><span className="text-foreground/70">{t('Commercial', '\u062A\u062C\u0627\u0631\u064A')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" /><span className="text-foreground/70">{t('Surveillance', '\u0627\u0633\u062A\u0637\u0644\u0627\u0639')}</span></div>
        </>
      )}
      {activeView === 'maritime' && (
        <>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-foreground/70">{t('Military', '\u0639\u0633\u0643\u0631\u064A')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /><span className="text-foreground/70">{t('Tanker', '\u0646\u0627\u0642\u0644\u0629')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /><span className="text-foreground/70">{t('Cargo', '\u0634\u062D\u0646')}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" /><span className="text-foreground/70">{t('Patrol', '\u062F\u0648\u0631\u064A\u0629')}</span></div>
        </>
      )}
    </div>
  );
}

const RISK_COLORS: Record<string, string> = {
  EXTREME: 'text-red-400 bg-red-950/50 border-red-500/50',
  HIGH: 'text-orange-400 bg-orange-950/50 border-orange-500/50',
  ELEVATED: 'text-yellow-400 bg-yellow-950/50 border-yellow-500/50',
  MODERATE: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/50',
};

const DEV_SEVERITY_STYLES: Record<string, string> = {
  critical: 'text-red-400 border-red-500/40 bg-red-950/30',
  high: 'text-orange-400 border-orange-500/40 bg-orange-950/30',
  medium: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30',
};

function AIIntelPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [deductQuery, setDeductQuery] = useState('');
  const [deductResult, setDeductResult] = useState<AIDeduction | null>(null);

  const { data: brief, isLoading: briefLoading } = useQuery<AIBrief>({
    queryKey: ['/api/ai-brief'],
    refetchInterval: 60000,
  });

  const deductMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', '/api/ai-deduct', { query });
      return res.json() as Promise<AIDeduction>;
    },
    onSuccess: (data) => setDeductResult(data),
  });

  const handleDeduct = () => {
    if (deductQuery.trim()) {
      deductMutation.mutate(deductQuery.trim());
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="ai-intel-panel">
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Brain className="w-3.5 h-3.5 text-purple-400/70" />
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
          {language === 'en' ? 'AI Intel' : '\u0630\u0643\u0627\u0621'}
        </span>
        <span className="text-xs px-1.5 py-0 font-mono text-purple-400/50 bg-purple-950/30 rounded border border-purple-500/20">
          {brief?.model || '...'}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-purple-400/40" />
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <ScrollArea className="flex-1">
        {briefLoading && (
          <div className="px-3 py-8 text-center">
            <Brain className="w-6 h-6 text-purple-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-[12px] text-muted-foreground">Synthesizing intelligence brief...</p>
          </div>
        )}

        {brief && (
          <div className="divide-y divide-border/30">
            <div className="px-3 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                  {language === 'en' ? 'World Brief' : '\u0645\u0648\u062C\u0632 \u0639\u0627\u0644\u0645\u064A'}
                </span>
                {brief.riskLevel && (
                  <Badge className={`text-xs px-1.5 py-0.5 font-bold border ${RISK_COLORS[brief.riskLevel] || ''}`}>
                    {brief.riskLevel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {language === 'ar' ? brief.summaryAr : brief.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {brief.focalPoints.map((fp, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-purple-950/30 border border-purple-500/20 text-purple-300/70 font-mono">
                    {fp}
                  </span>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground/40 font-mono mt-2">
                {new Date(brief.generatedAt).toLocaleTimeString()} UTC
              </div>
            </div>

            <div className="px-3 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70 mb-2 block">
                {language === 'en' ? 'Key Developments' : '\u062A\u0637\u0648\u0631\u0627\u062A \u0631\u0626\u064A\u0633\u064A\u0629'}
              </span>
              <div className="space-y-2.5">
                {brief.keyDevelopments.map((dev, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="mt-0.5 shrink-0">
                      <Badge className={`text-[11px] px-1.5 py-0.5 font-bold border ${DEV_SEVERITY_STYLES[dev.severity] || ''}`}>
                        {dev.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground/50 font-bold uppercase tracking-wider">{dev.category}</span>
                      <p className="text-xs text-foreground/75 leading-relaxed">
                        {language === 'ar' ? dev.textAr : dev.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-3 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 text-amber-400/70" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                  {language === 'en' ? 'AI Deduction' : '\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0630\u0643\u064A'}
                </span>
              </div>
              <div className="flex gap-1.5 mb-2.5">
                <input
                  type="text"
                  value={deductQuery}
                  onChange={(e) => setDeductQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDeduct()}
                  placeholder={language === 'en' ? 'What will happen in the next 24h?' : '\u0645\u0627\u0630\u0627 \u0633\u064A\u062D\u062F\u062B \u0641\u064A \u0627\u0644\u0640 24 \u0633\u0627\u0639\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629\u061F'}
                  className="flex-1 bg-card/50 border border-border/50 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-purple-500/50 font-mono"
                  data-testid="input-ai-deduction"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[12px] px-2 h-6 text-purple-400"
                  onClick={handleDeduct}
                  disabled={deductMutation.isPending || !deductQuery.trim()}
                  data-testid="button-ai-deduct"
                >
                  {deductMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
              </div>

              {deductResult && (
                <div className="bg-card/30 border border-border/30 rounded p-3 animate-fade-in">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className="text-xs px-1.5 py-0.5 font-mono bg-purple-950/40 border-purple-500/30 text-purple-300">
                      {Math.round(deductResult.confidence * 100)}% confidence
                    </Badge>
                    <span className="text-xs text-muted-foreground/40 font-mono">{deductResult.timeframe}</span>
                  </div>
                  <p className="text-xs text-foreground/75 leading-relaxed whitespace-pre-line">
                    {language === 'ar' ? deductResult.responseAr : deductResult.response}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MapSection({
  events,
  flights,
  ships,
  adsbFlights,
  redAlerts,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  adsbFlights: AdsbFlight[];
  redAlerts: RedAlert[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');

  const views = [
    { key: 'conflict' as const, icon: AlertTriangle, label: language === 'en' ? 'Conflict' : '\u0646\u0632\u0627\u0639', labelEn: 'Conflict' },
    { key: 'flights' as const, icon: Plane, label: language === 'en' ? 'Flights' : '\u0631\u062D\u0644\u0627\u062A', labelEn: 'Flights' },
    { key: 'maritime' as const, icon: Anchor, label: language === 'en' ? 'Hormuz' : '\u0647\u0631\u0645\u0632', labelEn: 'Hormuz' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Target className="w-3.5 h-3.5 text-primary/70 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
          {language === 'en' ? 'Map' : '\u062E\u0631\u064A\u0637\u0629'}
        </span>
        <div className="flex items-center gap-0.5 bg-card/50 rounded border border-border/30 p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                activeView === v.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground/50 hover:text-foreground/70 border border-transparent'
              }`}
              onClick={() => setActiveView(v.key)}
              data-testid={`button-map-${v.key}`}
            >
              {v.labelEn}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-card/20">
                  <div className="text-center">
                    <Globe className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                    <p className="text-[11px] text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              }
            >
              <ConflictMap
                events={events}
                flights={flights}
                ships={ships}
                adsbFlights={adsbFlights}
                redAlerts={redAlerts}
                activeView={activeView}
                language={language}
              />
            </Suspense>
          </MapErrorBoundary>
        </div>
        <MapLegend activeView={activeView} language={language} />
        <div className="absolute top-3 right-3 z-[1000] bg-background/95 backdrop-blur-md border border-primary/20 rounded-md px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-foreground/70 font-mono">
              {activeView === 'conflict' && `${events.length} events`}
              {activeView === 'flights' && `${flights.length} aircraft`}
              {activeView === 'maritime' && `${ships.length} vessels`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsTicker({ news, language }: { news: NewsItem[]; language: 'en' | 'ar' }) {
  if (!news.length) return null;
  const CATEGORY_COLORS: Record<string, string> = {
    breaking: 'text-red-400',
    military: 'text-amber-400',
    diplomatic: 'text-blue-400',
    economic: 'text-emerald-400',
  };
  const items = [...news, ...news, ...news];
  return (
    <div className="h-8 border-t border-primary/10 bg-primary/3 overflow-hidden relative shrink-0" data-testid="news-ticker">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 flex items-center pl-2">
        <span className="text-[9px] font-bold tracking-[0.25em] text-primary/60 font-mono">INTEL</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="absolute flex items-center h-full gap-8 animate-ticker-scroll whitespace-nowrap pl-14">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-[12px] font-mono">
            <span className={`font-bold uppercase tracking-wider text-[12px] ${CATEGORY_COLORS[item.category] || 'text-primary'}`}>
              {item.category}
            </span>
            <span className="text-foreground/75">{language === 'ar' && item.titleAr ? item.titleAr : item.title}</span>
            <span className="text-muted-foreground/30 text-[10px]">·</span>
            <span className="text-muted-foreground/50 text-[10px]">{item.source}</span>
            <span className="text-border/30 mx-2">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { language, setLanguage } = useLanguage();
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>({
    intel: true, map: true, telegram: true, events: true, radar: true, adsb: true, alerts: true, markets: true,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showLayoutPresets, setShowLayoutPresets] = useState(false);
  const [savedPresets, setSavedPresets] = useState<LayoutPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_layouts') || '[]');
      return [...BUILT_IN_PRESETS, ...saved];
    } catch { return [...BUILT_IN_PRESETS]; }
  });

  const closePanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: false }));
    if (maximizedPanel === id) setMaximizedPanel(null);
  }, [maximizedPanel]);

  const openPanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: true }));
  }, []);

  const toggleMaximize = useCallback((id: PanelId) => {
    setMaximizedPanel(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedPanel) setMaximizedPanel(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [maximizedPanel]);

  const toggleNotifications = useCallback(() => {
    if (!notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') setNotificationsEnabled(true);
      });
    } else {
      setNotificationsEnabled(prev => !prev);
    }
  }, [notificationsEnabled]);

  const closedPanels = useMemo(() =>
    (Object.keys(visiblePanels) as PanelId[]).filter(k => !visiblePanels[k]),
    [visiblePanels]
  );

  const { data: news = [] } = useQuery<NewsItem[]>({
    queryKey: ['/api/news'],
    refetchInterval: 20000,
  });

  const { data: commodities = [] } = useQuery<CommodityData[]>({
    queryKey: ['/api/commodities'],
    refetchInterval: 5000,
  });

  const { data: intelData } = useQuery<{
    events: ConflictEvent[];
    flights: FlightData[];
    ships: ShipData[];
  }>({
    queryKey: ['/api/events'],
    refetchInterval: 15000,
  });

  const { data: telegramMessages = [] } = useQuery<TelegramMessage[]>({
    queryKey: ['/api/telegram'],
    refetchInterval: 25000,
  });

  const { data: sirens = [] } = useQuery<SirenAlert[]>({
    queryKey: ['/api/sirens'],
    refetchInterval: 10000,
  });

  const { data: redAlerts = [] } = useQuery<RedAlert[]>({
    queryKey: ['/api/red-alerts'],
    refetchInterval: 8000,
  });

  const { data: adsbFlights = [] } = useQuery<AdsbFlight[]>({
    queryKey: ['/api/adsb'],
    refetchInterval: 6000,
  });

  const events = intelData?.events || [];
  const flights = intelData?.flights || [];
  const ships = intelData?.ships || [];

  useAlertSound(redAlerts.map(a => ({ id: a.id })), soundEnabled);
  useAlertSound(sirens.map(s => ({ id: s.id })), soundEnabled);
  useDesktopNotifications(redAlerts, sirens, notificationsEnabled);

  const threatLevel = useMemo(() => getThreatLevel(redAlerts.length, sirens.length), [redAlerts.length, sirens.length]);
  const correlations = useCorrelations(events, redAlerts, sirens, flights);

  const watchlist = useMemo<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  }, [showWatchlist]);

  const topRow: PanelId[] = ['telegram', 'intel', 'map', 'alerts'];
  const bottomRow: PanelId[] = ['events', 'radar', 'adsb', 'markets'];
  const allPanels: PanelId[] = [...topRow, ...bottomRow];
  const activeTop = topRow.filter(id => visiblePanels[id]);
  const activeBottom = bottomRow.filter(id => visiblePanels[id]);
  const panelCount = activeTop.length + activeBottom.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = {
    telegram: 16, intel: 16, map: 42, alerts: 26,
    events: 22, radar: 22, adsb: 28, markets: 28,
  };
  const [colWidths, setColWidths] = useState(defaultWidths);
  const [rowSplit, setRowSplit] = useState(58);

  const savePreset = useCallback((name: string) => {
    const preset: LayoutPreset = { name, visiblePanels: { ...visiblePanels }, colWidths: { ...colWidths }, rowSplit };
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    customPresets.push(preset);
    localStorage.setItem('warroom_layouts', JSON.stringify(customPresets));
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [visiblePanels, colWidths, rowSplit, savedPresets]);

  const loadPreset = useCallback((preset: LayoutPreset) => {
    setVisiblePanels(preset.visiblePanels);
    setColWidths(preset.colWidths);
    setRowSplit(preset.rowSplit);
    setMaximizedPanel(null);
  }, []);

  const deletePreset = useCallback((name: string) => {
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    localStorage.setItem('warroom_layouts', JSON.stringify(customPresets));
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [savedPresets]);

  const handleExport = useCallback(() => {
    const report = generateExportReport(events, flights, ships, redAlerts, sirens, commodities, threatLevel, language);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warroom-report-${new Date().toISOString().slice(0, 16).replace(':', '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events, flights, ships, redAlerts, sirens, commodities, threatLevel, language]);

  const computeWidths = useCallback((panels: PanelId[]) => {
    const raw = panels.map(id => colWidths[id]);
    const total = raw.reduce((s, w) => s + w, 0);
    return raw.map(w => (w / total) * 100);
  }, [colWidths]);

  const activeTopWidths = useMemo(() => computeWidths(activeTop), [activeTop, computeWidths]);
  const activeBottomWidths = useMemo(() => computeWidths(activeBottom), [activeBottom, computeWidths]);

  const makeRowResizer = useCallback((row: PanelId[], leftIdx: number) => (delta: number) => {
    if (!containerRef.current || leftIdx >= row.length - 1) return;
    const totalWidth = containerRef.current.offsetWidth;
    const pctDelta = (delta / totalWidth) * 100;
    const leftId = row[leftIdx];
    const rightId = row[leftIdx + 1];
    setColWidths(prev => {
      const totalActive = row.reduce((s, id) => s + prev[id], 0);
      const leftPct = (prev[leftId] / totalActive) * 100;
      const rightPct = (prev[rightId] / totalActive) * 100;
      const newLeft = leftPct + pctDelta;
      const newRight = rightPct - pctDelta;
      if (newLeft < 8 || newRight < 8) return prev;
      return { ...prev, [leftId]: (newLeft / 100) * totalActive, [rightId]: (newRight / 100) * totalActive };
    });
  }, []);

  const makeVerticalResizer = useCallback(() => (delta: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.offsetHeight;
    const pctDelta = (delta / totalHeight) * 100;
    setRowSplit(prev => {
      const next = prev + pctDelta;
      if (next < 30 || next > 80) return prev;
      return next;
    });
  }, []);

  const renderPanel = (id: PanelId) => {
    const close = () => closePanel(id);
    const maximize = () => toggleMaximize(id);
    const isMax = maximizedPanel === id;
    switch (id) {
      case 'intel':
        return <AIIntelPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
      case 'map':
        return <MapSection events={events} flights={flights} ships={ships} adsbFlights={adsbFlights} redAlerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
      case 'events':
        return (
          <ScrollArea className="h-full">
            <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />
          </ScrollArea>
        );
      case 'radar':
        return (
          <>
            <div className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
              <ScrollArea className="h-full">
                <FlightRadarPanel flights={flights} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />
              </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <MaritimePanel ships={ships} language={language} onMaximize={maximize} isMaximized={isMax} />
              </ScrollArea>
            </div>
          </>
        );
      case 'adsb':
        return <AdsbPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
      case 'alerts':
        return <RedAlertPanel alerts={redAlerts} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
      case 'telegram':
        return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
      case 'markets':
        return (
          <ScrollArea className="h-full">
            <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />
          </ScrollArea>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="dashboard">
      <header className="h-14 border-b-2 border-primary/15 flex items-center justify-between px-4 bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <Crosshair className="w-3 h-3 text-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[13px] tracking-[0.05em] text-primary font-mono" style={{textShadow:'0 0 20px hsl(32 95% 50% / 0.6)'}}>WARROOM</span>
              <span className="text-[10px] text-muted-foreground/40 tracking-[0.1em] font-mono hidden sm:block">
                {language === 'en' ? 'ME INTEL TERMINAL' : '\u0645\u062D\u0637\u0629 \u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A'}
              </span>
            </div>
          </div>
          <div className="w-px h-5 bg-border/30 hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/30 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-xs text-red-400/90 font-bold tracking-[0.15em] uppercase font-mono">LIVE</span>
          </div>
          <div className="w-px h-5 bg-border/30 hidden sm:block" />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${threatLevel.bg}`} data-testid="threat-level-badge">
            <ShieldAlert className={`w-3.5 h-3.5 ${threatLevel.color}`} />
            <span className={`text-xs font-black tracking-[0.15em] uppercase font-mono ${threatLevel.color}`}>{threatLevel.level}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LiveClock />
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-0.5">
            <Button size="sm" variant="ghost" className={`text-[12px] px-2 h-8 font-mono rounded ${notificationsEnabled ? 'text-primary' : 'text-muted-foreground/50'} hover:text-foreground active:bg-primary/20`} onClick={toggleNotifications} data-testid="button-notifications-toggle" title="Desktop Notifications">
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" className={`text-[12px] px-2 h-8 font-mono rounded ${soundEnabled ? 'text-primary' : 'text-muted-foreground/50'} hover:text-foreground active:bg-primary/20`} onClick={() => setSoundEnabled(p => !p)} data-testid="button-sound-toggle">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="text-[12px] px-2 h-8 font-mono text-muted-foreground/50 hover:text-amber-400 active:bg-amber-500/20 rounded" onClick={() => setShowNotes(true)} data-testid="button-notes" title="Analyst Notes">
              <StickyNote className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-[12px] px-2 h-8 font-mono text-muted-foreground/50 hover:text-amber-400 active:bg-amber-500/20 rounded" onClick={() => setShowWatchlist(true)} data-testid="button-watchlist" title="Watchlist">
              <Eye className="w-4 h-4" />
            </Button>
            <div className="relative">
              <Button size="sm" variant="ghost" className="text-[12px] px-2 h-8 font-mono text-muted-foreground/50 hover:text-primary active:bg-primary/20 rounded" onClick={() => setShowLayoutPresets(p => !p)} data-testid="button-layouts" title="Layout Presets">
                <Layout className="w-4 h-4" />
              </Button>
              {showLayoutPresets && (
                <LayoutPresetsDropdown language={language} presets={savedPresets} onLoad={loadPreset} onSave={savePreset} onDelete={deletePreset} onClose={() => setShowLayoutPresets(false)} />
              )}
            </div>
            <Button size="sm" variant="ghost" className="text-[12px] px-2 h-8 font-mono text-muted-foreground/50 hover:text-emerald-400 active:bg-emerald-500/20 rounded" onClick={handleExport} data-testid="button-export" title="Export Report">
              <FileDown className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-[12px] px-2 h-8 font-mono text-muted-foreground/60 hover:text-foreground active:bg-primary/20 rounded" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} data-testid="button-language-toggle">
              <Languages className="w-4 h-4 mr-1" />
              {language === 'en' ? '\u0639\u0631\u0628\u064A' : 'EN'}
            </Button>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/30 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-xs text-emerald-400/80 font-bold tracking-wider font-mono hidden sm:inline uppercase">
              {language === 'en' ? 'CONNECTED' : '\u0645\u062A\u0635\u0644'}
            </span>
          </div>
        </div>
      </header>

      <TickerBar commodities={commodities} />

      <SirenBanner sirens={sirens} language={language} />

      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden border-t border-border/20" data-testid="resizable-panels">
        {maximizedPanel && visiblePanels[maximizedPanel] ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {renderPanel(maximizedPanel)}
          </div>
        ) : panelCount === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <PanelLeft className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground/50 font-medium">{language === 'en' ? 'All panels minimized' : '\u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0635\u063A\u0631\u0629'}</p>
              <p className="text-[11px] text-muted-foreground/30 mt-1">{language === 'en' ? 'Restore panels from the bar below' : '\u0627\u0633\u062A\u0639\u062F \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u0634\u0631\u064A\u0637 \u0623\u062F\u0646\u0627\u0647'}</p>
            </div>
          </div>
        ) : (
          <>
            {activeTop.length > 0 && (
              <div className="flex min-h-0 overflow-hidden" style={{ height: activeBottom.length > 0 ? `${rowSplit}%` : '100%' }}>
                {activeTop.map((id, idx) => (
                  <div key={id} className="contents">
                    {idx > 0 && <ResizeHandle onResize={makeRowResizer(activeTop, idx - 1)} />}
                    <div
                      className={`overflow-hidden flex flex-col min-h-0 ${idx < activeTop.length - 1 ? 'border-r border-border/30' : ''}`}
                      style={{ width: `${activeTopWidths[idx]}%`, background: 'hsl(var(--background))' }}
                    >
                      {renderPanel(id)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTop.length > 0 && activeBottom.length > 0 && (
              <ResizeHandle onResize={makeVerticalResizer()} direction="row" />
            )}
            {activeBottom.length > 0 && (
              <div className="flex min-h-0 overflow-hidden border-t border-border/20" style={{ height: activeTop.length > 0 ? `${100 - rowSplit}%` : '100%' }}>
                {activeBottom.map((id, idx) => (
                  <div key={id} className="contents">
                    {idx > 0 && <ResizeHandle onResize={makeRowResizer(activeBottom, idx - 1)} />}
                    <div
                      className={`overflow-hidden flex flex-col min-h-0 ${idx < activeBottom.length - 1 ? 'border-r border-border/30' : ''}`}
                      style={{ width: `${activeBottomWidths[idx]}%`, background: 'hsl(var(--background))' }}
                    >
                      {renderPanel(id)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <EventTimeline events={events} language={language} />

      <NewsTicker news={news} language={language} />

      <div className="h-10 border-t border-border/40 flex items-center px-3 bg-card/20 shrink-0 gap-2 overflow-hidden" data-testid="status-bar">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/15">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs text-emerald-400/70 font-mono font-bold">ONLINE</span>
        </div>
        <div className="w-px h-4 bg-border/30" />
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <span className="text-xs text-muted-foreground/50"><span className="text-foreground/35">SRC</span> 12</span>
          <span className="text-xs text-muted-foreground/50"><span className="text-foreground/35">EVT</span> {events.length}</span>
          <span className="text-xs text-muted-foreground/50"><span className="text-foreground/35">FLT</span> {flights.length}</span>
          <span className="text-xs text-muted-foreground/50"><span className="text-cyan-400/35">ADS</span> {adsbFlights.length}</span>
          <span className="text-xs text-muted-foreground/50"><span className="text-foreground/35">VES</span> {ships.length}</span>
          <span className="text-xs text-muted-foreground/50"><span className="text-foreground/35">MKT</span> {commodities.length}</span>
        </div>
        {(redAlerts.length > 0 || sirens.length > 0) && (
          <>
            <div className="w-px h-4 bg-border/30" />
            <div className="flex items-center gap-2 text-[10px] font-mono">
              {redAlerts.length > 0 && (
                <span className="text-xs text-red-400/90 font-bold animate-pulse px-2 py-0.5 rounded bg-red-950/30 border border-red-500/20">
                  RED {redAlerts.length}
                </span>
              )}
              {sirens.length > 0 && (
                <span className="text-xs text-red-400/70 font-bold px-2 py-0.5 rounded bg-red-950/20 border border-red-500/15">
                  SRN {sirens.length}
                </span>
              )}
            </div>
          </>
        )}
        {closedPanels.length > 0 && (
          <>
            <div className="w-px h-4 bg-border/30" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground/40 font-mono uppercase tracking-wider hidden sm:inline">Restore:</span>
              {closedPanels.map(id => {
                const cfg = PANEL_CONFIG[id];
                const Icon = cfg.icon;
                return (
                  <button
                    key={id}
                    onClick={() => openPanel(id)}
                    className="group flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold text-primary/80 bg-primary/10 hover:bg-primary/25 hover:text-primary transition-all border border-primary/25 hover:border-primary/40"
                    title={`Restore ${cfg.label} panel`}
                    data-testid={`button-open-panel-${id}`}
                  >
                    <Maximize2 className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <Icon className="w-3 h-3" />
                    {language === 'en' ? cfg.label : cfg.labelAr}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {correlations.length > 0 && (
          <>
            <div className="w-px h-4 bg-border/30" />
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/20 border border-purple-500/15">
              <Link2 className="w-3 h-3 text-purple-400/60" />
              <span className="text-xs text-purple-400/70 font-mono font-bold">{correlations.length} CORR</span>
            </div>
          </>
        )}
        <span className="text-xs text-muted-foreground/35 font-mono ml-auto hidden sm:inline tracking-wider">
          WARROOM v1.0
        </span>
      </div>

      {showNotes && <NotesOverlay language={language} onClose={() => setShowNotes(false)} />}
      {showWatchlist && <WatchlistOverlay language={language} onClose={() => setShowWatchlist(false)} />}
      {showAlertHistory && <AlertHistoryOverlay language={language} onClose={() => setShowAlertHistory(false)} />}
    </div>
  );
}
