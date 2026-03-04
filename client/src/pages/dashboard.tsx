import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { LayoutItem as GridItemLayout, Layout as GridLayout2 } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
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
  EarthquakeEvent,
  CyberEvent,
  ThermalHotspot,
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
  Settings,
  TriangleAlert,
  Menu,
  Cpu,
  Video,
  MoreHorizontal,
} from 'lucide-react';
import { SiTelegram, SiX } from 'react-icons/si';

const ConflictMap = lazy(() => import('@/components/conflict-map'));
const GodEyeMap = lazy(() => import('@/components/godseye-map'));

interface WARROOMSettings {
  criticalThreshold: number;
  highThreshold: number;
  elevatedThreshold: number;
  notifyRockets: boolean;
  notifyMissiles: boolean;
  notifyUav: boolean;
  notifyAircraft: boolean;
  soundEnabled: boolean;
  volume: number;
  silentMode: boolean;
  notificationLevel: 'all' | 'critical' | 'none';
  defaultLanguage: 'en' | 'ar';
}

const DEFAULT_SETTINGS: WARROOMSettings = {
  criticalThreshold: 15,
  highThreshold: 8,
  elevatedThreshold: 3,
  notifyRockets: true,
  notifyMissiles: true,
  notifyUav: true,
  notifyAircraft: true,
  soundEnabled: true,
  volume: 70,
  silentMode: false,
  notificationLevel: 'all',
  defaultLanguage: 'en',
};

function loadSettings(): WARROOMSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('warroom_settings') || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}

interface Anomaly {
  id: string;
  type: 'alert_spike' | 'siren_cluster' | 'flight_convergence' | 'price_spike' | 'telegram_surge';
  severity: 'high' | 'medium';
  description: string;
  timestamp: string;
}

function useAnomalyDetection(
  alerts: RedAlert[],
  sirens: SirenAlert[],
  flights: FlightData[],
  commodities: CommodityData[],
  telegramMessages: TelegramMessage[]
): Anomaly[] {
  const prevAlertCount = useRef(0);
  const prevCommodityPrices = useRef<Record<string, number>>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    const now = new Date().toISOString();
    const newAnomalies: Anomaly[] = [];

    if (prevAlertCount.current > 0 && alerts.length - prevAlertCount.current >= 5) {
      newAnomalies.push({
        id: `anom-alert-${Date.now()}`,
        type: 'alert_spike',
        severity: 'high',
        description: `Alert spike detected: ${alerts.length - prevAlertCount.current} new alerts in rapid succession`,
        timestamp: now,
      });
    }
    prevAlertCount.current = alerts.length;

    const regionSirens: Record<string, number> = {};
    sirens.forEach(s => {
      regionSirens[s.region] = (regionSirens[s.region] || 0) + 1;
    });
    Object.entries(regionSirens).forEach(([region, count]) => {
      if (count >= 3) {
        newAnomalies.push({
          id: `anom-siren-${region}-${Date.now()}`,
          type: 'siren_cluster',
          severity: 'high',
          description: `Siren cluster: ${count} active sirens in ${region}`,
          timestamp: now,
        });
      }
    });

    const milFlights = flights.filter(f => f.type === 'military' || f.type === 'surveillance');
    for (let i = 0; i < milFlights.length; i++) {
      let nearby = 0;
      for (let j = i + 1; j < milFlights.length; j++) {
        const dist = Math.sqrt(Math.pow(milFlights[i].lat - milFlights[j].lat, 2) + Math.pow(milFlights[i].lng - milFlights[j].lng, 2));
        if (dist < 1) nearby++;
      }
      if (nearby >= 3) {
        newAnomalies.push({
          id: `anom-flight-${milFlights[i].callsign}-${Date.now()}`,
          type: 'flight_convergence',
          severity: 'medium',
          description: `Military flight convergence: ${nearby + 1} aircraft within 1 degree near ${milFlights[i].callsign}`,
          timestamp: now,
        });
        break;
      }
    }

    commodities.forEach((c, i) => {
      if (Math.abs(c.changePercent) > 2) {
        newAnomalies.push({
          id: `anom-price-${c.symbol}-${Date.now()}-${i}`,
          type: 'price_spike',
          severity: 'medium',
          description: `${c.symbol} price spike: ${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(2)}%`,
          timestamp: now,
        });
      }
    });
    const newPrices: Record<string, number> = {};
    commodities.forEach(c => { newPrices[c.symbol] = c.price; });
    prevCommodityPrices.current = newPrices;

    if (newAnomalies.length > 0) {
      setAnomalies(prev => {
        const tenMinAgo = Date.now() - 600000;
        const filtered = prev.filter(a => new Date(a.timestamp).getTime() > tenMinAgo);
        return [...newAnomalies, ...filtered].slice(0, 20);
      });
    } else {
      setAnomalies(prev => {
        const tenMinAgo = Date.now() - 600000;
        const filtered = prev.filter(a => new Date(a.timestamp).getTime() > tenMinAgo);
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }
  }, [alerts, sirens, flights, commodities, telegramMessages]);

  return anomalies;
}

interface SSEData {
  news: NewsItem[];
  commodities: CommodityData[];
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  sirens: SirenAlert[];
  redAlerts: RedAlert[];
  adsbFlights: AdsbFlight[];
  aiBrief: AIBrief | null;
  telegramMessages: TelegramMessage[];
  earthquakes: EarthquakeEvent[];
  cyberEvents: CyberEvent[];
  thermalHotspots: ThermalHotspot[];
  xPosts: NewsItem[];
  connected: boolean;
}

function useSSE(): SSEData {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [ships, setShips] = useState<ShipData[]>([]);
  const [sirens, setSirens] = useState<SirenAlert[]>([]);
  const [redAlerts, setRedAlerts] = useState<RedAlert[]>([]);
  const [adsbFlights, setAdsbFlights] = useState<AdsbFlight[]>([]);
  const [aiBrief, setAiBrief] = useState<AIBrief | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [cyberEvents, setCyberEvents] = useState<CyberEvent[]>([]);
  const [thermalHotspots, setThermalHotspots] = useState<ThermalHotspot[]>([]);
  const [xPosts, setXPosts] = useState<NewsItem[]>([]);
  const [connected, setConnected] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      es = new EventSource('/api/stream');

      es.onopen = () => {
        setConnected(true);
        retryCount.current = 0;
      };

      es.addEventListener('commodities', (e) => {
        try { setCommodities(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('events', (e) => {
        try {
          const d = JSON.parse(e.data);
          setEvents(d.events || []);
          setFlights(d.flights || []);
          setShips(d.ships || []);
        } catch {}
      });
      es.addEventListener('news', (e) => {
        try { setNews(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('sirens', (e) => {
        try { setSirens(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('red-alerts', (e) => {
        try { setRedAlerts(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('adsb', (e) => {
        try { setAdsbFlights(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('ai-brief', (e) => {
        try { setAiBrief(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('telegram', (e) => {
        try { setTelegramMessages(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('earthquakes', (e) => {
        try { setEarthquakes(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('cyber', (e) => {
        try { setCyberEvents(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('thermal', (e) => {
        try { setThermalHotspots(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('x-feed', (e) => {
        try { setXPosts(JSON.parse(e.data)); } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (retryCount.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current++;
          retryTimeout = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return { news, commodities, events, flights, ships, sirens, redAlerts, adsbFlights, aiBrief, telegramMessages, earthquakes, cyberEvents, thermalHotspots, xPosts, connected };
}

class PanelErrorBoundary extends Component<{ children: ReactNode; panelName?: string; icon?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; panelName?: string; icon?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Panel error (${this.props.panelName || 'unknown'}):`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-card/50 text-muted-foreground" data-testid={`panel-error-${this.props.panelName || 'unknown'}`}>
          <div className="text-center p-4">
            {this.props.icon || <TriangleAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />}
            <p className="text-xs font-mono mt-2">{this.props.panelName || 'Panel'} error</p>
            <p className="text-[11px] mt-1 text-muted-foreground/60">Component failed to render</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 px-3 py-1 text-[11px] font-mono bg-primary/10 border border-primary/30 rounded hover:bg-primary/20 text-primary transition-colors"
              data-testid={`button-retry-${this.props.panelName || 'unknown'}`}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MapErrorBoundary = PanelErrorBoundary;

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
      className={`${direction === 'col' ? 'w-[3px] cursor-col-resize' : 'h-[3px] cursor-row-resize'} shrink-0 transition-all duration-200 relative group touch-none ${isDragging ? 'bg-primary/60' : 'bg-transparent hover:bg-primary/20'}`}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={handleTouchStart}
      data-testid="resize-handle"
      style={{ background: isDragging ? undefined : 'linear-gradient(to ' + (direction === 'col' ? 'right' : 'bottom') + ', transparent, hsl(220 30% 10%), transparent)' }}
    >
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-20 -ml-[9px]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-20 -mt-[9px]'} rounded transition-colors ${isDragging ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/5'}`} />
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-10' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-10'} rounded-full transition-all duration-200 ${isDragging ? 'bg-primary shadow-[0_0_8px_hsl(38_95%_54%/0.4)]' : 'bg-transparent group-hover:bg-primary/50'}`} />
    </div>
  );
}

const audioCtxRef = { current: null as AudioContext | null };

function playAlertSound(threatType?: string, volume: number = 70) {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const vol = Math.max(0, Math.min(1, volume / 100)) * 0.3;
    const t = ctx.currentTime;

    if (threatType === 'missiles') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(330, t + 0.4);
      osc.frequency.setValueAtTime(440, t + 0.5);
      osc.frequency.linearRampToValueAtTime(330, t + 0.9);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.setValueAtTime(vol * 0.8, t + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      osc.start(t);
      osc.stop(t + 1.0);
    } else if (threatType === 'uav_intrusion') {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, t + i * 0.15);
        gain.gain.setValueAtTime(0, t + i * 0.15);
        gain.gain.linearRampToValueAtTime(vol, t + i * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.1);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.12);
      }
    } else if (threatType === 'hostile_aircraft_intrusion') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.6);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.start(t);
      osc.stop(t + 0.7);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(660, t + 0.08);
      osc.frequency.setValueAtTime(880, t + 0.16);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch (_) {}
}

function useAlertSound(alerts: { id: string; threatType?: string }[], enabled: boolean, silentMode: boolean, volume: number) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    if (!enabled || silentMode) return;

    const currentIds = new Set(alerts.map(a => a.id));

    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      prevIdsRef.current = currentIds;
      return;
    }

    const newAlerts = alerts.filter(a => !prevIdsRef.current.has(a.id));
    if (newAlerts.length > 0) {
      playAlertSound(newAlerts[0].threatType, volume);
    }
    prevIdsRef.current = currentIds;
  }, [alerts, enabled, silentMode, volume]);
}

type PanelId = 'map' | 'events' | 'radar' | 'adsb' | 'alerts' | 'markets' | 'intel' | 'telegram' | 'seismic' | 'cyber' | 'livefeed' | 'alertmap' | 'analytics' | 'xfeed' | 'godseye';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  intel: { icon: Brain, label: 'AI Intel', labelAr: '\u0630\u0643\u0627\u0621' },
  map: { icon: Target, label: 'Map', labelAr: '\u062E\u0631\u064A\u0637\u0629' },
  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  radar: { icon: Plane, label: 'Radar', labelAr: '\u0631\u0627\u062F\u0627\u0631' },
  adsb: { icon: Radar, label: 'ADS-B', labelAr: '\u0645\u0631\u0627\u0642\u0628\u0629 \u062C\u0648\u064A\u0629' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: '\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  markets: { icon: BarChart3, label: 'Markets', labelAr: '\u0623\u0633\u0648\u0627\u0642' },
  seismic: { icon: Activity, label: 'Seismic', labelAr: '\u0632\u0644\u0627\u0632\u0644' },
  cyber: { icon: Cpu, label: 'Cyber', labelAr: '\u0633\u064A\u0628\u0631\u0627\u0646\u064A' },
  livefeed: { icon: Video, label: 'Live Feed', labelAr: '\u0628\u062B \u0645\u0628\u0627\u0634\u0631' },
  alertmap: { icon: MapPin, label: 'Alert Map', labelAr: '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  analytics: { icon: BarChart3, label: 'Analytics', labelAr: '\u062A\u062D\u0644\u064A\u0644\u0627\u062A' },
  xfeed: { icon: MessageSquare, label: 'X / Twitter', labelAr: '\u0625\u0643\u0633 / \u062A\u0648\u064A\u062A\u0631' },
  godseye: { icon: Eye, label: "God's Eye", labelAr: '\u0639\u064A\u0646 \u0627\u0644\u0644\u0647' },
};

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const touchBtnClass = isTouchDevice ? 'w-9 h-9' : 'w-5 h-5';
const touchIconClass = isTouchDevice ? 'w-4 h-4' : 'w-3 h-3';

function PanelMinimizeButton({ onMinimize }: { onMinimize: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onMinimize(); }}
      className={`${touchBtnClass} rounded flex items-center justify-center text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-all duration-150 warroom-panel-close`}
      title="Close panel"
      aria-label="Close panel"
      data-testid="button-panel-close"
    >
      <X className={touchIconClass} />
    </button>
  );
}

function PanelMaximizeButton({ isMaximized, onToggle }: { isMaximized: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`${touchBtnClass} rounded flex items-center justify-center text-muted-foreground/30 hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-all duration-150 warroom-panel-maximize`}
      title={isMaximized ? "Restore panel" : "Maximize panel"}
      aria-label={isMaximized ? "Restore panel" : "Maximize panel"}
      data-testid="button-panel-maximize"
    >
      {isMaximized ? <Minimize2 className={touchIconClass} /> : <Maximize2 className={touchIconClass} />}
    </button>
  );
}

function getThreatLevel(alertCount: number, sirenCount: number, settings?: WARROOMSettings, alerts?: RedAlert[]): { level: string; color: string; bg: string } {
  const liveWeight = alerts ? alerts.filter(a => a.source === 'live').length * 2 : 0;
  const total = alertCount + sirenCount + liveWeight;
  const s = settings || DEFAULT_SETTINGS;
  if (total > s.criticalThreshold) return { level: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-950/50 border-red-500/40' };
  if (total > s.highThreshold) return { level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-500/40' };
  if (total > s.elevatedThreshold) return { level: 'ELEVATED', color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-500/40' };
  return { level: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-500/40' };
}

function sendNotification(title: string, body: string, tag: string, critical: boolean = false) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag,
        requireInteraction: critical,
        data: { url: '/' },
      });
    }).catch(() => {
      new Notification(title, { body, icon: '/favicon.png', tag });
    });
  } else {
    new Notification(title, { body, icon: '/favicon.png', tag });
  }
}

function useDesktopNotifications(
  alerts: RedAlert[],
  sirens: SirenAlert[],
  news: NewsItem[],
  enabled: boolean,
  level: 'all' | 'critical' | 'none',
) {
  const prevAlertIds = useRef<Set<string>>(new Set());
  const prevSirenIds = useRef<Set<string>>(new Set());
  const prevNewsIds  = useRef<Set<string>>(new Set());
  const initialized  = useRef(false);

  useEffect(() => {
    if (!enabled || level === 'none') return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    if (!initialized.current) {
      initialized.current = true;
      prevAlertIds.current = new Set(alerts.map(a => a.id));
      prevSirenIds.current = new Set(sirens.map(s => s.id));
      prevNewsIds.current  = new Set(news.map(n => n.id));
      return;
    }

    const currentAlertIds = new Set(alerts.map(a => a.id));
    const currentSirenIds = new Set(sirens.map(s => s.id));
    const currentNewsIds  = new Set(news.map(n => n.id));

    const isCriticalType = (t: string) => t === 'missiles' || t === 'hostile_aircraft_intrusion';

    alerts.forEach(a => {
      if (!prevAlertIds.current.has(a.id)) {
        if (level === 'all' || isCriticalType(a.threatType)) {
          sendNotification(
            `🚨 RED ALERT — ${a.city}`,
            `${a.threatType.replace(/_/g, ' ').toUpperCase()} · ${a.region}, ${a.country}`,
            a.id,
            isCriticalType(a.threatType),
          );
        }
      }
    });

    sirens.forEach(s => {
      if (!prevSirenIds.current.has(s.id)) {
        if (level === 'all' || isCriticalType(s.threatType)) {
          sendNotification(
            `🔊 SIREN — ${s.location}`,
            `${s.threatType.toUpperCase()} · ${s.region}`,
            s.id,
            isCriticalType(s.threatType),
          );
        }
      }
    });

    if (level === 'all') {
      news.forEach(n => {
        if (!prevNewsIds.current.has(n.id) && (n.category === 'breaking' || n.category === 'military')) {
          sendNotification(
            `📰 ${n.category === 'breaking' ? 'BREAKING' : 'MILITARY'} — ${n.source}`,
            n.title,
            `news-${n.id}`,
            n.category === 'breaking',
          );
        }
      });
    }

    prevAlertIds.current = currentAlertIds;
    prevSirenIds.current = currentSirenIds;
    prevNewsIds.current  = currentNewsIds;
  }, [alerts, sirens, news, enabled, level]);
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
  gridLayout?: GridItemLayout[];
}

const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    name: 'Default',
    visiblePanels: { intel: true, map: true, telegram: true, events: true, radar: true, adsb: true, alerts: true, markets: true, seismic: false, cyber: false, livefeed: true, alertmap: true, analytics: false, xfeed: true, godseye: false },
    colWidths: { telegram: 16, intel: 16, map: 36, alerts: 16, livefeed: 16, events: 22, radar: 22, adsb: 28, markets: 28, seismic: 22, cyber: 22, alertmap: 28, analytics: 28, xfeed: 16, godseye: 36 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { intel: false, map: true, telegram: false, events: false, radar: true, adsb: true, alerts: false, markets: true, seismic: false, cyber: false, livefeed: false, alertmap: false, analytics: false, xfeed: false, godseye: false },
    colWidths: { telegram: 16, intel: 16, map: 60, alerts: 26, livefeed: 20, events: 22, radar: 30, adsb: 40, markets: 30, seismic: 22, cyber: 22, alertmap: 28, analytics: 28, xfeed: 22, godseye: 36 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { intel: false, map: true, telegram: false, events: true, radar: true, adsb: true, alerts: true, markets: false, seismic: false, cyber: false, livefeed: false, alertmap: true, analytics: false, xfeed: false, godseye: false },
    colWidths: { telegram: 16, intel: 16, map: 50, alerts: 50, livefeed: 20, events: 25, radar: 25, adsb: 50, markets: 28, seismic: 22, cyber: 22, alertmap: 28, analytics: 28, xfeed: 22, godseye: 36 },
    rowSplit: 55,
  },
  {
    name: 'Mobile',
    visiblePanels: { intel: false, map: true, telegram: true, events: false, radar: false, adsb: false, alerts: true, markets: false, seismic: false, cyber: false, livefeed: true, alertmap: false, analytics: false, xfeed: false, godseye: false },
    colWidths: { telegram: 100, intel: 100, map: 100, alerts: 100, livefeed: 100, events: 100, radar: 100, adsb: 100, markets: 100, seismic: 100, cyber: 100, alertmap: 100, analytics: 100, xfeed: 100, godseye: 100 },
    rowSplit: 50,
  },
];

const RGL = WidthProvider(GridLayout);

const DEFAULT_GRID_LAYOUT: GridItemLayout[] = [
  { i: 'map',       x: 0,  y: 0,  w: 6, h: 5, minW: 3, minH: 3 },
  { i: 'alerts',    x: 6,  y: 0,  w: 3, h: 5, minW: 2, minH: 2 },
  { i: 'intel',     x: 9,  y: 0,  w: 3, h: 5, minW: 2, minH: 2 },
  { i: 'telegram',  x: 0,  y: 5,  w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'livefeed',  x: 3,  y: 5,  w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'events',    x: 6,  y: 5,  w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'radar',     x: 9,  y: 5,  w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'adsb',      x: 0,  y: 9,  w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'markets',   x: 3,  y: 9,  w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'seismic',   x: 6,  y: 9,  w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'cyber',     x: 9,  y: 9,  w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'alertmap',  x: 0,  y: 12, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'analytics', x: 4,  y: 12, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'xfeed',     x: 8,  y: 12, w: 2, h: 4, minW: 1, minH: 2 },
  { i: 'godseye',   x: 10, y: 12, w: 2, h: 4, minW: 2, minH: 2 },
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
      <div className="w-[500px] max-h-[70vh] bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 25px 50px rgb(0 0 0 / 0.6)'}}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Analyst Notes' : '\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u0644'}</span>
          <span className="text-xs text-muted-foreground/50 font-mono">{notes.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-notes"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-white/[0.05] space-y-2">
          <div className="flex gap-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder={language === 'en' ? 'Add intelligence note...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629...'}
              className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 font-mono"
              data-testid="input-note"
            />
            <button onClick={addNote} className="px-3 py-1.5 rounded bg-primary/20 border border-primary/30 text-primary text-[11px] font-mono font-bold hover:bg-primary/30 transition-colors" data-testid="button-add-note">
              {language === 'en' ? 'Add' : '\u0625\u0636\u0627\u0641\u0629'}
            </button>
          </div>
          <div className="flex gap-1">
            {['general', 'threat', 'intel', 'maritime'].map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border transition-colors ${category === c ? 'bg-primary/15 border-primary/25 text-primary/90' : 'bg-white/[0.02] border-white/[0.05] text-foreground/30'}`}>{c.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-white/[0.03]">
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

function WatchlistOverlay({ language, onClose, onUpdate }: { language: 'en' | 'ar'; onClose: () => void; onUpdate: (items: string[]) => void }) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');

  const save = useCallback((updated: string[]) => {
    setItems(updated);
    localStorage.setItem('warroom_watchlist', JSON.stringify(updated));
    onUpdate(updated);
  }, [onUpdate]);

  const add = useCallback(() => {
    if (!newItem.trim() || items.includes(newItem.trim())) return;
    save([...items, newItem.trim()]);
    setNewItem('');
  }, [newItem, items, save]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="watchlist-overlay">
      <div className="w-[400px] max-h-[60vh] bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 25px 50px rgb(0 0 0 / 0.6)'}}>
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Watchlist' : '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629'}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-watchlist"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={language === 'en' ? 'Callsign, ship name, city...' : '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0626\u0631\u0629 \u0623\u0648 \u0627\u0644\u0633\u0641\u064A\u0646\u0629...'}
              className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-amber-500/40 font-mono"
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
      <div className="w-[700px] max-h-[80vh] bg-background/95 backdrop-blur-xl border border-red-500/30 rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 25px 50px rgb(0 0 0 / 0.6), 0 0 20px rgb(239 68 68 / 0.1)'}}>
        <div className="px-4 py-3 border-b border-red-900/40 bg-red-950/20 flex items-center gap-2 rounded-t-lg">
          <History className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold font-mono text-red-300">{language === 'en' ? 'Alert History' : '\u0633\u062C\u0644 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}</span>
          <span className="text-xs text-red-400/50 font-mono">{filtered.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20" data-testid="button-close-history"><X className="w-4 h-4 text-red-300" /></button>
        </div>
        <div className="px-4 py-3 border-b border-red-900/20">
          <AlertHistoryTimeline language={language} />
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
    <div className="absolute top-10 right-0 z-[150] w-64 bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl" data-testid="layout-presets-dropdown" style={{boxShadow:'0 20px 40px rgb(0 0 0 / 0.5)'}}>
      <div className="px-3 py-2 border-b border-white/[0.05] flex items-center gap-2">
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
      <div className="px-2 pb-2 border-t border-white/[0.05] pt-2">
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            placeholder={language === 'en' ? 'Save current...' : '\u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u064A...'}
            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded px-2 py-1 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none font-mono"
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
    <div className="h-5 border-t border-white/[0.03] relative flex items-center px-4 shrink-0" data-testid="event-timeline" style={{background:'hsl(225 30% 3%)'}}>
      <span className="text-[7px] text-foreground/15 font-mono uppercase tracking-[0.25em] mr-3 shrink-0 font-bold">
        {language === 'en' ? 'TIMELINE' : '\u062C\u062F\u0648\u0644 \u0632\u0645\u0646\u064A'}
      </span>
      <div className="flex-1 relative h-2.5 bg-white/[0.015] rounded-sm border border-white/[0.03]">
        <div className="absolute right-0 top-0 bottom-0 w-px bg-primary/30" />
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-primary/30 font-mono font-bold">NOW</span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-muted-foreground/20 font-mono">-1h</span>
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/95 border border-white/[0.08] rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap z-10 shadow-lg">
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
  adsbFlights: AdsbFlight[],
  threatLevel: { level: string; color: string },
  language: 'en' | 'ar'
): string {
  const now = new Date().toISOString();
  const threatColors: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', ELEVATED: '#eab308', LOW: '#22c55e' };
  const tc = threatColors[threatLevel.level] || '#22c55e';

  const topEvents = [...events].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  }).slice(0, 5);

  const byCountry: Record<string, number> = {};
  alerts.forEach(a => { byCountry[a.country] = (byCountry[a.country] || 0) + 1; });

  const milFlights = flights.filter(f => f.type === 'military' || f.type === 'surveillance');
  const flaggedAdsb = adsbFlights.filter(f => f.flagged);

  const movers = [...commodities].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 6);

  const sevColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WARROOM Intel Report - ${now}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0c10;color:#e0e0e0;font-family:'Courier New',monospace;padding:40px;max-width:900px;margin:0 auto}
h1{color:#f59e0b;font-size:22px;letter-spacing:4px;border-bottom:2px solid #f59e0b33;padding-bottom:12px;margin-bottom:8px}
h2{color:#f59e0b99;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:28px 0 12px;padding:8px 0;border-bottom:1px solid #ffffff15}
.meta{font-size:11px;color:#888;margin-bottom:24px}
.threat{display:inline-block;padding:4px 16px;border-radius:4px;font-weight:bold;font-size:13px;letter-spacing:2px;border:1px solid}
table{width:100%;border-collapse:collapse;margin:8px 0}
th{text-align:left;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid #ffffff20}
td{padding:6px 8px;font-size:12px;border-bottom:1px solid #ffffff08}
tr:hover{background:#ffffff05}
.sev{font-size:10px;font-weight:bold;padding:2px 8px;border-radius:3px;letter-spacing:1px}
.pos{color:#22c55e}.neg{color:#ef4444}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ffffff15;font-size:10px;color:#666;text-align:center}
.country-row{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0}
.country-badge{background:#1a1a2e;border:1px solid #ffffff15;padding:6px 14px;border-radius:4px;font-size:12px}
.country-badge span{color:#ef4444;font-weight:bold}
.print-btn{position:fixed;top:16px;right:16px;background:#f59e0b;color:#0a0c10;border:none;padding:8px 20px;cursor:pointer;font-family:inherit;font-weight:bold;font-size:12px;letter-spacing:2px;border-radius:4px}
.print-btn:hover{background:#d97706}
@media print{.print-btn{display:none}body{background:#fff;color:#222}h1{color:#b45309}h2{color:#92400e}table,th,td{border-color:#ddd}.country-badge{background:#f5f5f5;border-color:#ddd}}
</style></head><body>
<button class="print-btn" onclick="window.print()">PRINT / PDF</button>
<h1>WARROOM INTELLIGENCE REPORT</h1>
<div class="meta">Generated: ${new Date(now).toLocaleString()} UTC | Classification: OPEN SOURCE</div>
<div style="margin-bottom:24px"><span class="threat" style="color:${tc};border-color:${tc}44;background:${tc}15">THREAT LEVEL: ${threatLevel.level}</span></div>

<h2>Executive Summary</h2>
<p style="font-size:12px;line-height:1.8;color:#ccc;margin:8px 0">${alerts.length} active red alerts across ${Object.keys(byCountry).length} countries. ${sirens.length} sirens active. ${events.length} conflict events tracked. ${milFlights.length} military/surveillance flights airborne. ${ships.length} vessels monitored in strait.</p>

<h2>Red Alert Status (${alerts.length} Active)</h2>
${alerts.length > 0 ? `<div class="country-row">${Object.entries(byCountry).map(([c, n]) => `<div class="country-badge">${c}: <span>${n}</span></div>`).join('')}</div>` : '<p style="font-size:12px;color:#22c55e">No active alerts</p>'}

<h2>Top Events</h2>
<table><thead><tr><th>Severity</th><th>Event</th><th>Description</th><th>Type</th></tr></thead><tbody>
${topEvents.map(e => `<tr><td><span class="sev" style="color:${sevColors[e.severity] || '#6b7280'}">${e.severity.toUpperCase()}</span></td><td style="color:#fff">${e.title}</td><td style="color:#aaa">${e.description.slice(0, 120)}</td><td style="color:#888">${e.type}</td></tr>`).join('')}
</tbody></table>

<h2>Military Activity (${milFlights.length} Flights)</h2>
<table><thead><tr><th>Callsign</th><th>Type</th><th>Altitude</th><th>Heading</th></tr></thead><tbody>
${milFlights.map(f => `<tr><td style="color:#fff">${f.callsign}</td><td>${f.type.toUpperCase()}</td><td>${f.altitude.toLocaleString()} ft</td><td>${Math.round(f.heading)}</td></tr>`).join('')}
</tbody></table>

${flaggedAdsb.length > 0 ? `<h2>Flagged ADS-B Tracks (${flaggedAdsb.length})</h2>
<table><thead><tr><th>Callsign</th><th>Type</th><th>Altitude</th><th>Squawk</th><th>Note</th></tr></thead><tbody>
${flaggedAdsb.map(f => `<tr><td style="color:#ef4444;font-weight:bold">${f.callsign}</td><td>${f.type}</td><td>${f.altitude.toLocaleString()} ft</td><td>${f.squawk}</td><td style="color:#aaa">${f.flagReason || ''}</td></tr>`).join('')}
</tbody></table>` : ''}

<h2>Maritime Situation (${ships.length} Vessels)</h2>
<table><thead><tr><th>Vessel</th><th>Type</th><th>Flag</th><th>Speed</th><th>Heading</th></tr></thead><tbody>
${ships.map(s => `<tr><td style="color:#fff">${s.name}</td><td>${s.type.toUpperCase()}</td><td>${s.flag}</td><td>${s.speed} kn</td><td>${headingToCompass(s.heading)}</td></tr>`).join('')}
</tbody></table>

<h2>Market Impact</h2>
<table><thead><tr><th>Symbol</th><th>Price</th><th>Change</th></tr></thead><tbody>
${movers.map(c => `<tr><td style="color:#fff">${c.symbol}</td><td>${c.currency === 'USD' ? '$' : ''}${c.price.toFixed(c.price < 10 ? 4 : 2)}</td><td class="${c.changePercent >= 0 ? 'pos' : 'neg'}">${c.changePercent >= 0 ? '+' : ''}${c.changePercent.toFixed(2)}%</td></tr>`).join('')}
</tbody></table>

<div class="footer">Made by M.M — WARROOM v2.0 | Open Source Intelligence Terminal | ${now}</div>
</body></html>`;
  return html;
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
      <span className="text-[8px] text-foreground/20 font-mono hidden md:inline tracking-wider font-medium">{dateStr}</span>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm" style={{background:'hsl(225 28% 6%)', border:'1px solid hsl(225 18% 10%)'}}>
        <span className="text-[11px] text-primary/80 font-mono font-bold tabular-nums tracking-[0.1em]">{formatted}</span>
        <span className="text-[7px] text-primary/30 font-mono font-bold tracking-[0.2em]">UTC</span>
      </div>
    </div>
  );
}

function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-6 border-b border-white/[0.03]" style={{background:'hsl(225 30% 3.5%)'}} />;
  const items = [...commodities, ...commodities, ...commodities];

  return (
    <div className="h-6 border-b border-white/[0.03] overflow-hidden relative shrink-0" data-testid="ticker-bar" style={{background:'linear-gradient(90deg, hsl(225 28% 4%) 0%, hsl(225 30% 3.5%) 50%, hsl(225 28% 4%) 100%)'}}>
      <div className="absolute inset-y-0 left-0 w-16 z-10 flex items-center gap-1 pl-3" style={{background:'linear-gradient(90deg, hsl(225 28% 4%) 70%, transparent)'}}>
        <span className="text-[7px] font-black tracking-[0.35em] text-primary/35 font-mono">MKT</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-12 z-10" style={{background:'linear-gradient(270deg, hsl(225 28% 4%) 30%, transparent)'}} />
      <div className="absolute flex items-center h-full gap-6 animate-ticker-scroll whitespace-nowrap pl-16">
        {items.map((c, i) => (
          <span key={`${c.symbol}-${i}`} className="inline-flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-foreground/40 font-semibold">{c.symbol}</span>
            <span className="text-foreground/65 tabular-nums font-medium">{formatPrice(c)}</span>
            <span className={`inline-flex items-center gap-0.5 tabular-nums font-bold ${c.change >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
              {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
            </span>
            <span className="text-white/[0.06] mx-0.5">{'\u2502'}</span>
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
    <div className="border-b border-red-900/20 shrink-0" data-testid="siren-banner" style={{background:'linear-gradient(90deg, hsl(0 40% 8% / 0.6), hsl(0 30% 5% / 0.3), hsl(0 40% 8% / 0.6))'}}>
      <div
        className="animate-siren-bg flex items-center gap-2 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-siren-toggle"
      >
        <div className="flex items-center gap-2 py-1 shrink-0">
          <div className="w-4 h-4 rounded-sm flex items-center justify-center animate-siren-flash" style={{background:'hsl(0 80% 50% / 0.15)', border:'1px solid hsl(0 80% 50% / 0.4)'}}>
            <Siren className="w-2.5 h-2.5 text-red-400/90" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400/60 font-mono whitespace-nowrap">
            {language === 'en' ? 'ACTIVE SIRENS' : '\u0635\u0641\u0627\u0631\u0627\u062A \u0646\u0634\u0637\u0629'}
          </span>
          <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-[14px] font-mono font-bold animate-pulse-dot">
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
    <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
      <span className="[&>svg]:w-3 [&>svg]:h-3 text-primary/50 shrink-0">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 font-mono">{title}</span>
      {count !== undefined && (
        <span className="text-[8px] font-mono text-foreground/25 tabular-nums leading-none">
          [{count}]
        </span>
      )}
      {extra}
      <div className="flex-1" />
      {live && (
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[7px] uppercase tracking-widest text-emerald-400/50 font-mono">LIVE</span>
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
      className={`grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2.5 font-mono text-xs items-center hover:bg-white/[0.02] transition-colors duration-150 border-l-2 border-l-transparent ${c.change >= 0 ? 'border-l-emerald-500/20' : 'border-l-red-500/20'}`}
      data-testid={`commodity-${c.symbol}`}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-foreground/90 font-bold text-xs truncate">{c.symbol}</span>
        <span className="text-[9px] text-foreground/40 leading-tight truncate">{language === 'ar' ? c.nameAr : c.name}</span>
      </div>
      <span className="text-foreground/80 tabular-nums text-right font-bold whitespace-nowrap text-xs">
        {formatPrice(c)}
      </span>
      <div className={`flex items-center gap-0.5 justify-end tabular-nums font-bold whitespace-nowrap min-w-[48px] text-xs ${c.change >= 0 ? 'text-emerald-400/90' : 'text-red-400/90'}`}>
        <span>{c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3.5 py-1.5 bg-card/60 border-y border-border/30 flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
      <span className="text-[9px] uppercase tracking-[0.25em] text-primary/50 font-black font-mono">{label}</span>
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
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Markets' : '\u0627\u0644\u0623\u0633\u0648\u0627\u0642'}
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-foreground/20 font-bold border-b border-white/[0.03] shrink-0">
        <span>{language === 'en' ? 'Symbol' : '\u0627\u0644\u0631\u0645\u0632'}</span>
        <span className="text-right">{language === 'en' ? 'Price' : '\u0627\u0644\u0633\u0639\u0631'}</span>
        <span className="text-right">{language === 'en' ? 'Chg%' : '\u0627\u0644\u062A\u063A\u064A\u064A\u0631%'}</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <SectionLabel label={language === 'en' ? '\u25B8 Commodities' : '\u25B8 \u0627\u0644\u0633\u0644\u0639'} />
        <div className="divide-y divide-white/[0.02]">
          {cmdty.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
        </div>
        <SectionLabel label={language === 'en' ? '\u25B8 Major FX' : '\u25B8 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629'} />
        <div className="divide-y divide-white/[0.02]">
          {fxMajor.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
        </div>
        <SectionLabel label={language === 'en' ? '\u25B8 Regional FX' : '\u25B8 \u0639\u0645\u0644\u0627\u062A \u0625\u0642\u0644\u064A\u0645\u064A\u0629'} />
        <div className="divide-y divide-white/[0.02]">
          {fxRegional.map(c => <CommodityRow key={c.symbol} c={c} language={language} />)}
        </div>
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
    <div className="h-full flex flex-col min-h-0">
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
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.02]">
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

function FlightRadarPanel({ flights, language, onClose, onMaximize, isMaximized, onLocateFlight }: { flights: FlightData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onLocateFlight?: (lat: number, lng: number, callsign: string, heading: number, altitude: number, speed: number, type: string) => void }) {
  const [selectedFlight, setSelectedFlight] = useState<FlightData | null>(null);
  const sorted = [...flights].sort((a, b) => {
    const order = { military: 0, surveillance: 1, commercial: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
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
      />
      {flights.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Plane className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">Scanning airspace...</p>
        </div>
      )}
      {selectedFlight && (
        <div className="px-3 py-2 border-b border-primary/20 animate-fade-in bg-[transparent] text-[#e9e7e2]" style={{background:'linear-gradient(135deg, hsl(36 100% 50% / 0.06), hsl(225 28% 6%))'}} data-testid="flight-detail-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold font-mono text-primary/90" data-testid="text-flight-callsign">{selectedFlight.callsign}</span>
            <button onClick={() => setSelectedFlight(null)} className="text-foreground/25 hover:text-foreground/50 transition-colors" data-testid="flight-close-detail">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
            <div data-testid="text-flight-type"><span className="text-foreground/30">TYPE</span> <span className="text-foreground/70">{selectedFlight.type.toUpperCase()}</span></div>
            <div data-testid="text-flight-altitude"><span className="text-foreground/30">ALT</span> <span className="text-foreground/70">{selectedFlight.altitude.toLocaleString()}ft</span></div>
            <div data-testid="text-flight-speed"><span className="text-foreground/30">SPD</span> <span className="text-foreground/70">{selectedFlight.speed}kts</span></div>
            <div data-testid="text-flight-heading"><span className="text-foreground/30">HDG</span> <span className="text-foreground/70">{Math.round(selectedFlight.heading)}° {headingToCompass(selectedFlight.heading)}</span></div>
            {selectedFlight.aircraft && <div data-testid="text-flight-aircraft"><span className="text-foreground/30">ACFT</span> <span className="text-foreground/70">{selectedFlight.aircraft}</span></div>}
            {selectedFlight.origin && <div data-testid="text-flight-origin"><span className="text-foreground/30">ORIG</span> <span className="text-foreground/70">{selectedFlight.origin}</span></div>}
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
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono font-bold text-foreground/50 transition-colors"
              data-testid={`flight-fr24-${selectedFlight.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              FR24
            </a>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((f) => {
          const style = FLIGHT_TYPE_STYLES[f.type] || FLIGHT_TYPE_STYLES.commercial;
          const isSelected = selectedFlight?.id === f.id;
          return (
            <div
              key={f.id}
              className={`px-4 py-3.5 hover-elevate animate-fade-in cursor-pointer transition-colors ${isSelected ? 'bg-primary/[0.06]' : ''}`}
              data-testid={`flight-${f.id}`}
              onClick={() => setSelectedFlight(isSelected ? null : f)}
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
    </div>
  );
}

const ADSB_TYPE_STYLES: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  military:     { color: 'text-red-300',     bg: 'bg-red-950/60 border-red-400/50',       dot: 'bg-red-400',     label: 'MIL' },
  surveillance: { color: 'text-cyan-300',    bg: 'bg-cyan-950/60 border-cyan-400/50',     dot: 'bg-cyan-400',    label: 'ISR' },
  commercial:   { color: 'text-emerald-300', bg: 'bg-emerald-950/50 border-emerald-500/35', dot: 'bg-emerald-400', label: 'CIV' },
  cargo:        { color: 'text-amber-300',   bg: 'bg-amber-950/50 border-amber-400/40',   dot: 'bg-amber-400',   label: 'CGO' },
  private:      { color: 'text-violet-300',  bg: 'bg-violet-950/50 border-violet-400/40', dot: 'bg-violet-400',  label: 'PVT' },
  government:   { color: 'text-sky-300',     bg: 'bg-sky-950/50 border-sky-400/40',       dot: 'bg-sky-400',     label: 'GOV' },
};

function AdsbPanel({ language, onClose, onMaximize, isMaximized, adsbFlights = [], onLocateFlight }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; adsbFlights?: AdsbFlight[]; onLocateFlight?: (lat: number, lng: number, callsign: string, heading: number, altitude: number, speed: number, type: string) => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [selectedFlight, setSelectedFlight] = useState<AdsbFlight | null>(null);
  const isLoading = adsbFlights.length === 0;

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
    <div className="h-full flex flex-col min-h-0" data-testid="adsb-panel">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-2 bg-gradient-to-r from-cyan-500/[0.04] to-transparent shrink-0 relative overflow-hidden">
        <div className="absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b from-cyan-400/60 via-cyan-400/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
        <div className="w-4 h-4 rounded bg-cyan-500/[0.08] border border-cyan-500/10 flex items-center justify-center shrink-0">
          <Radar className="w-2.5 h-2.5 text-cyan-400/70" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 font-mono">ADS-B</span>
        <span className="text-[10px] px-1.5 py-0.5 font-mono text-foreground/35 bg-white/[0.04] rounded border border-white/[0.07] tabular-nums leading-none">
          {adsbFlights.length}
        </span>
        <div className="flex-1" />
        {(() => {
          const isLive = adsbFlights.length > 0 && adsbFlights[0]?.id?.startsWith('live-');
          return (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLive ? 'bg-emerald-500/[0.08] border border-emerald-500/[0.15]' : 'bg-amber-500/[0.08] border border-amber-500/[0.15]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse-dot`} style={{boxShadow: isLive ? '0 0 4px rgb(34 197 94 / 0.6)' : '0 0 4px rgb(245 158 11 / 0.6)'}} />
              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold font-mono ${isLive ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>{isLive ? 'LIVE' : 'SIM'}</span>
            </div>
          );
        })()}
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="px-2 py-1.5 border-b border-white/[0.04] flex gap-1 flex-wrap shrink-0 bg-black/10">
        {[
          { key: 'all',        label: 'All',     activeClass: 'bg-white/[0.08] border-white/20 text-white/80' },
          { key: 'flagged',    label: '⚑ Alert', activeClass: 'bg-amber-950/60 border-amber-400/40 text-amber-300' },
          { key: 'military',   label: 'MIL',     activeClass: 'bg-red-950/60 border-red-400/50 text-red-300' },
          { key: 'surveillance',label: 'ISR',    activeClass: 'bg-cyan-950/60 border-cyan-400/50 text-cyan-300' },
          { key: 'commercial', label: 'CIV',     activeClass: 'bg-emerald-950/50 border-emerald-500/35 text-emerald-300' },
          { key: 'cargo',      label: 'CGO',     activeClass: 'bg-amber-950/50 border-amber-400/35 text-amber-300' },
          { key: 'government', label: 'GOV',     activeClass: 'bg-sky-950/50 border-sky-400/35 text-sky-300' },
          { key: 'private',    label: 'PVT',     activeClass: 'bg-violet-950/50 border-violet-400/35 text-violet-300' },
        ].map(({ key, label, activeClass }) => (
          <button
            key={key}
            data-testid={`adsb-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono border transition-all ${
              filter === key
                ? activeClass
                : 'bg-white/[0.02] border-white/[0.06] text-foreground/35 hover:text-foreground/55 hover:bg-white/[0.04]'
            }`}
          >
            {label}{counts[key] ? ` ${counts[key]}` : ''}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="px-3 py-8 text-center">
            <Radar className="w-6 h-6 text-cyan-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-[10px] text-foreground/25">Scanning ADS-B feeds...</p>
          </div>
        )}

        {selectedFlight && (
          <div className="px-3 py-2 bg-cyan-950/20 border-b border-cyan-500/20 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold font-mono text-cyan-300">{selectedFlight.callsign}</span>
              <button
                onClick={() => setSelectedFlight(null)}
                className="text-foreground/25 text-[10px]"
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
            <div className="flex gap-2 mt-2 pt-1.5 border-t border-cyan-500/15">
              <button
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-[10px] font-mono font-bold text-cyan-300 transition-colors"
                data-testid={`adsb-locate-${selectedFlight.id}`}
                onClick={(e) => { e.stopPropagation(); onLocateFlight?.(selectedFlight.lat, selectedFlight.lng, selectedFlight.callsign, selectedFlight.heading, selectedFlight.altitude, selectedFlight.groundSpeed, selectedFlight.type); }}
              >
                <Target className="w-3 h-3" />
                Locate on Map
              </button>
              <a
                href={`https://globe.adsbexchange.com/?icao=${selectedFlight.hex.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono font-bold text-foreground/50 transition-colors"
                data-testid={`adsb-adsbx-${selectedFlight.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                ADSBx
              </a>
            </div>
          </div>
        )}

        <div className="divide-y divide-white/[0.03]">
          {sorted.map((f) => {
            const style = ADSB_TYPE_STYLES[f.type] || ADSB_TYPE_STYLES.commercial;
            const isMil = f.type === 'military' || f.type === 'surveillance';
            return (
              <div
                key={f.id}
                className={`px-3 py-2 cursor-pointer transition-all duration-150 hover:bg-white/[0.025] ${
                  selectedFlight?.id === f.id
                    ? 'bg-white/[0.04]'
                    : ''
                } ${isMil
                    ? 'border-l-2 border-l-red-500/70'
                    : f.flagged
                    ? 'border-l-2 border-l-amber-400/60'
                    : 'border-l-2 border-l-transparent'
                }`}
                onClick={() => setSelectedFlight(f)}
                data-testid={`adsb-flight-${f.id}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {/* heading arrow */}
                  <span
                    className={`shrink-0 inline-block ${style.color}`}
                    style={{ transform: `rotate(${f.heading}deg)`, fontSize: '10px', lineHeight: 1 }}
                  >▲</span>
                  <span className="text-[12px] font-bold font-mono text-foreground/90 truncate flex-1">{f.callsign}</span>
                  {/* type badge */}
                  <span className={`text-[9px] px-1.5 py-[2px] rounded border font-bold font-mono tracking-wider ${style.color} ${style.bg}`}>
                    {style.label}
                  </span>
                  {/* emergency / flag indicator */}
                  {f.flagged && (f.squawk === '7700' || f.squawk === '7600' || f.squawk === '7500') && (
                    <span className="text-[9px] px-1 py-[2px] rounded bg-red-900/60 border border-red-400/50 text-red-300 font-bold font-mono animate-pulse">{f.squawk}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-foreground/45 truncate max-w-[80px]">{f.aircraft || '—'}</span>
                  <span className="text-foreground/30">{f.country}</span>
                  <span className="ml-auto flex items-center gap-2 text-foreground/45">
                    <span className="tabular-nums">{f.altitude > 0 ? `${Math.round(f.altitude / 100) * 100}ft` : 'GND'}</span>
                    <span className="tabular-nums">{f.groundSpeed > 0 ? `${f.groundSpeed}kt` : '—'}</span>
                    <button
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-cyan-500/20 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onLocateFlight?.(f.lat, f.lng, f.callsign, f.heading, f.altitude, f.groundSpeed, f.type); }}
                      title="Locate on map"
                      data-testid={`adsb-locate-row-${f.id}`}
                    >
                      <Target className="w-2.5 h-2.5 text-cyan-400/50 hover:text-cyan-400" />
                    </button>
                  </span>
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

const AI_EVENT_ASSESSMENTS: Record<string, string> = {
  missile: 'Ballistic trajectory detected — high-confidence threat vector',
  airstrike: 'Fixed-wing or rotary engagement — confirm air defense posture',
  defense: 'Intercept system activation — assess effectiveness window',
  naval: 'Maritime posture shift — monitor Strait of Hormuz corridor',
  ground: 'Frontline contact reported — satellite imagery recommended',
  nuclear: 'Strategic asset activity — immediate escalation risk',
};

function ConflictEventsPanel({ events, language, onClose, onMaximize, isMaximized }: { events: ConflictEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    // Smart NL filter: match type, severity, country, title
    return sorted.filter(e => {
      if (q.includes('missile') && e.type !== 'missile') return q.includes(e.type);
      const matchType = e.type.includes(q);
      const matchSev = e.severity.includes(q);
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchCountry = (e as any).country?.toLowerCase().includes(q) ?? false;
      const matchDesc = e.description?.toLowerCase().includes(q) ?? false;
      // semantic shortcuts
      if (q === 'critical' || q === 'high' || q === 'medium' || q === 'low') return matchSev;
      return matchType || matchSev || matchTitle || matchCountry || matchDesc;
    });
  }, [events, query]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Conflict Events' : 'أحداث النزاع'}
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        live
        count={events.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
      />
      {/* AI Natural Language Filter */}
      <div className="px-2 py-1.5 border-b border-white/[0.04]" style={{background:'hsl(225 28% 3.5%)'}}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-none" style={{background:'hsl(225 25% 5%)', border:'1px solid hsl(225 18% 9%)'}}>
          <span className="text-[7px] font-mono text-primary/40 font-bold shrink-0">AI▸</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="filter: 'missiles', 'iran', 'critical'..."
            className="flex-1 bg-transparent text-[9px] font-mono text-foreground/70 placeholder:text-foreground/20 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-foreground/30 hover:text-foreground/60 text-[8px] font-mono">✕</button>
          )}
        </div>
      </div>
      {filtered.length === 0 && query && (
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] text-foreground/25 font-mono">NO MATCH — try 'missile', 'high', country name</p>
        </div>
      )}
      {events.length === 0 && !query && (
        <div className="px-3 py-6 text-center">
          <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">No active events</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {filtered.map((e) => {
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
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">
                {language === 'ar' && e.descriptionAr ? e.descriptionAr : e.description}
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/70 mb-1">
                <span className="uppercase tracking-wider text-foreground/50">{e.type}</span>
                <span className="text-foreground/30">·</span>
                <span>{timeAgo(e.timestamp)}</span>
              </div>
              {AI_EVENT_ASSESSMENTS[e.type] && (
                <div className="flex items-start gap-1 mt-0.5">
                  <span className="text-[7px] font-mono font-bold text-primary/40 shrink-0 mt-0.5">AI▸</span>
                  <span className="text-[8px] font-mono text-foreground/30 leading-snug italic">{AI_EVENT_ASSESSMENTS[e.type]}</span>
                </div>
              )}
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
      />
      {ships.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Anchor className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">Scanning waters...</p>
        </div>
      )}

      {selectedShip && (
        <div className="px-3 py-2 border-b border-blue-500/20 animate-fade-in" style={{background:'linear-gradient(135deg, hsl(217 91% 60% / 0.06), hsl(225 28% 6%))'}} data-testid="ship-detail-card">
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
            <a
              href={`https://www.marinetraffic.com/en/ais/home/centerx:${selectedShip.lng}/centery:${selectedShip.lat}/zoom:10`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono font-bold text-foreground/50 transition-colors"
              data-testid={`ship-mt-${selectedShip.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              MarineTraffic
            </a>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((s) => {
          const style = SHIP_TYPE_STYLES[s.type] || SHIP_TYPE_STYLES.cargo;
          const isSelected = selectedShip?.id === s.id;
          return (
            <div
              key={s.id}
              className={`px-3 py-3 hover-elevate animate-fade-in cursor-pointer transition-colors ${isSelected ? 'bg-blue-950/30' : ''}`}
              data-testid={`ship-${s.id}`}
              onClick={() => setSelectedShip(isSelected ? null : s)}
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

function SeismicPanel({ earthquakes, language, onClose, onMaximize, isMaximized }: { earthquakes: EarthquakeEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const sorted = [...earthquakes].sort((a, b) => b.magnitude - a.magnitude);
  const magColor = (m: number) => m >= 6 ? 'text-red-400 bg-red-950/40 border-red-500/30' : m >= 5 ? 'text-orange-400 bg-orange-950/40 border-orange-500/30' : m >= 4 ? 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30' : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
  const magBorderColor = (m: number) => m >= 6 ? 'rgb(239 68 68 / 0.6)' : m >= 5 ? 'rgb(249 115 22 / 0.5)' : m >= 4 ? 'rgb(234 179 8 / 0.4)' : 'transparent';
  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader title={language === 'en' ? 'Seismic Activity' : 'النشاط الزلزالي'} icon={<Activity className="w-3.5 h-3.5" />} live count={earthquakes.length} onClose={onClose} onMaximize={onMaximize} isMaximized={isMaximized} />
      {earthquakes.length === 0 && <div className="px-3 py-6 text-center"><Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" /><p className="text-[10px] text-foreground/25">Loading seismic data...</p></div>}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((eq) => (
          <div key={eq.id} className="px-3 py-3 hover-elevate animate-fade-in border-l-2" style={{ borderLeftColor: magBorderColor(eq.magnitude) }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold font-mono shrink-0 tabular-nums ${magColor(eq.magnitude)}`}>M{eq.magnitude.toFixed(1)}</span>
              <span className="text-xs font-bold font-mono text-foreground truncate flex-1">{eq.place}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span><span className="text-foreground/40">DEP</span> {eq.depth.toFixed(0)}km</span>
              {eq.felt && <span><span className="text-foreground/40">FELT</span> {eq.felt}</span>}
              {eq.tsunami === 1 && <span className="text-cyan-400 font-bold">TSUNAMI</span>}
              <span className="ml-auto">{timeAgo(eq.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-white/[0.03] shrink-0"><span className="text-[9px] text-foreground/15 font-mono">Source: USGS · M2.5+ Middle East</span></div>
    </div>
  );
}

const CYBER_TYPE_LABELS: Record<string, string> = { ddos: 'DDoS', intrusion: 'INTRU', malware: 'MALWR', phishing: 'PHISH', defacement: 'DEFAC', data_exfil: 'EXFIL', scada: 'SCADA' };
const CYBER_TYPE_COLORS: Record<string, string> = { ddos: 'text-orange-400 bg-orange-950/40 border-orange-500/30', intrusion: 'text-red-400 bg-red-950/40 border-red-500/30', malware: 'text-purple-400 bg-purple-950/40 border-purple-500/30', phishing: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30', defacement: 'text-blue-400 bg-blue-950/40 border-blue-500/30', data_exfil: 'text-red-400 bg-red-950/40 border-red-500/30', scada: 'text-red-400 bg-red-950/40 border-red-500/30' };

function CyberPanel({ cyberEvents, language, onClose, onMaximize, isMaximized }: { cyberEvents: CyberEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const sorted = [...cyberEvents].sort((a, b) => { const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return (o[a.severity] ?? 4) - (o[b.severity] ?? 4); });
  const sevBorder = (s: string) => s === 'critical' ? 'rgb(239 68 68 / 0.6)' : s === 'high' ? 'rgb(249 115 22 / 0.5)' : 'transparent';
  const sevText = (s: string) => s === 'critical' ? 'text-red-400' : s === 'high' ? 'text-orange-400' : s === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader title={language === 'en' ? 'Cyber Threats' : 'التهديدات السيبرانية'} icon={<Cpu className="w-3.5 h-3.5" />} live count={cyberEvents.length} onClose={onClose} onMaximize={onMaximize} isMaximized={isMaximized} />
      {cyberEvents.length === 0 && <div className="px-3 py-6 text-center"><Cpu className="w-5 h-5 text-muted-foreground mx-auto mb-2" /><p className="text-[10px] text-foreground/25">No active threats</p></div>}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((ev) => (
          <div key={ev.id} className="px-3 py-3 hover-elevate animate-fade-in border-l-2" style={{ borderLeftColor: sevBorder(ev.severity) }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold font-mono shrink-0 ${CYBER_TYPE_COLORS[ev.type] || 'text-foreground/60 bg-muted border-border'}`}>{CYBER_TYPE_LABELS[ev.type] || ev.type.toUpperCase()}</span>
              <span className="text-xs font-bold font-mono text-foreground truncate flex-1">{ev.target}</span>
              <span className={`text-[10px] font-mono font-bold shrink-0 ${sevText(ev.severity)}`}>{ev.severity.toUpperCase()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2 mb-1.5">{ev.description}</p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="uppercase tracking-wider text-foreground/40">{ev.sector}</span>
              <span className="text-foreground/20">·</span>
              <span className="text-foreground/40">{ev.country}</span>
              <span className="ml-auto">{timeAgo(ev.timestamp)}</span>
            </div>
          </div>
        ))}
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

const THREAT_SEVERITY_ORDER: Record<string, number> = {
  missiles: 0,
  rockets: 1,
  uav_intrusion: 2,
  hostile_aircraft_intrusion: 3,
};

function getAlertUrgencyTier(remaining: number, countdown: number): 'critical' | 'urgent' | 'warning' | 'standard' | 'expired' {
  if (countdown === 0) return 'critical';
  if (remaining <= 0) return 'expired';
  if (remaining <= 15) return 'critical';
  if (remaining <= 45) return 'urgent';
  if (remaining <= 90) return 'warning';
  return 'standard';
}

function useAlertRemaining(alert: RedAlert) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
      return Math.max(0, alert.countdown - elapsed);
    };
    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [alert.timestamp, alert.countdown]);
  return remaining;
}

function RedAlertCountdown({ alert }: { alert: RedAlert }) {
  const remaining = useAlertRemaining(alert);
  const isImmediate = alert.countdown === 0;
  const tier = getAlertUrgencyTier(remaining, alert.countdown);

  const tierStyles = {
    critical: 'text-white',
    urgent: 'text-red-300',
    warning: 'text-amber-300',
    standard: 'text-white/90',
    expired: 'text-red-900/40',
  };

  return (
    <div className={`font-mono text-center shrink-0 min-w-[44px] ${tier === 'critical' || tier === 'urgent' ? 'animate-pulse' : ''}`}>
      <div
        className={`text-lg font-black tabular-nums leading-none ${tierStyles[tier]}`}
        data-testid={`red-alert-countdown-${alert.id}`}
      >
        {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
      </div>
      <div className={`text-[8px] mt-0.5 uppercase tracking-wider ${tier === 'critical' ? 'text-red-300/60' : 'text-red-300/40'}`}>
        {isImmediate ? '\u05DE\u05D9\u05D9\u05D3\u05D9' : remaining > 0 ? 'sec' : ''}
      </div>
    </div>
  );
}

const LIVE_CHANNELS = [
  { id: 'aje',     label: 'AJ ENG',   labelAr: 'الجزيرة EN', channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', videoId: 'bNyUyrR0PHo' },
  { id: 'aja',     label: 'AJ AR',    labelAr: 'الجزيرة ع',  channelId: 'UCBvxne3r4hL7GKxufPsOmRg', videoId: 'f-GBjGE6Mlw' },
  { id: 'sky',     label: 'SKY AR',   labelAr: 'سكاي عربية', channelId: 'UCdsMKkuVRqTmYKvIiMbZJmA', videoId: '' },
  { id: 'france',  label: 'F24 ENG',  labelAr: 'فرانس 24',   channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', videoId: 'NiRIbKwAejk' },
  { id: 'trt',     label: 'TRT',      labelAr: 'تي آر تي',   channelId: 'UC7fWeaHhqgM4Ry-RMpM2YYw', videoId: '' },
] as const;

function LiveFeedPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [activeChannel, setActiveChannel] = useState<typeof LIVE_CHANNELS[number]['id']>('aje');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customVideoId, setCustomVideoId] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  const currentChannel = LIVE_CHANNELS.find(c => c.id === activeChannel)!;
  const embedSrc = customVideoId
    ? `https://www.youtube-nocookie.com/embed/${customVideoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
    : currentChannel.videoId
      ? `https://www.youtube-nocookie.com/embed/${currentChannel.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
      : `https://www.youtube-nocookie.com/embed/live_stream?channel=${currentChannel.channelId}&autoplay=1&mute=1&rel=0&modestbranding=1`;

  const handleSetUrl = useCallback(() => {
    const match = customUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/);
    if (match) {
      setCustomVideoId(match[1]);
      setShowUrlInput(false);
      setCustomUrl('');
      setIframeError(false);
    }
  }, [customUrl]);

  const handleSelectChannel = (id: typeof LIVE_CHANNELS[number]['id']) => {
    setActiveChannel(id);
    setCustomVideoId(null);
    setIframeError(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="livefeed-panel">
      <PanelHeader
        icon={<Video className="w-3.5 h-3.5 text-red-400" />}
        title={language === 'en' ? 'LIVE FEED' : '\u0628\u062B \u0645\u0628\u0627\u0634\u0631'}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        extra={
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
              <span className="text-[9px] text-red-400/80 font-bold tracking-wider font-mono">LIVE</span>
            </div>
            <button
              onClick={() => setShowUrlInput(p => !p)}
              className="w-6 h-6 rounded flex items-center justify-center text-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Change stream URL"
              data-testid="button-change-stream"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        }
      />
      <div className="px-2 py-1.5 border-b border-white/[0.04] bg-card/30 flex items-center gap-1 shrink-0 overflow-x-auto">
        {LIVE_CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => handleSelectChannel(ch.id)}
            data-testid={`button-channel-${ch.id}`}
            className={`flex-1 py-1 rounded text-[9px] font-mono font-bold transition-colors border whitespace-nowrap min-w-0 ${
              activeChannel === ch.id && !customVideoId
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : 'text-foreground/35 hover:text-foreground/70 border-transparent hover:border-white/[0.08]'
            }`}
          >
            {language === 'ar' ? ch.labelAr : ch.label}
          </button>
        ))}
      </div>
      {showUrlInput && (
        <div className="px-3 py-2 border-b border-white/[0.04] bg-card/40 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetUrl()}
            placeholder="Paste YouTube live URL..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-[10px] text-foreground/70 placeholder:text-foreground/20 font-mono focus:outline-none focus:border-primary/40"
            data-testid="input-stream-url"
          />
          <button
            onClick={handleSetUrl}
            className="px-2 py-1 rounded text-[9px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            data-testid="button-set-stream"
          >
            SET
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 bg-black relative">
        <iframe
          key={customVideoId || currentChannel.videoId || currentChannel.channelId}
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms"
          title="Live Feed"
          data-testid="livefeed-iframe"
          onError={() => setIframeError(true)}
        />
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <Video className="w-8 h-8 text-foreground/20 mb-2" />
            <p className="text-[11px] text-foreground/40 font-mono mb-2">{language === 'en' ? 'Stream unavailable' : '\u0627\u0644\u0628\u062B \u063A\u064A\u0631 \u0645\u062A\u0627\u062D'}</p>
            <button
              onClick={() => { setIframeError(false); handleSelectChannel(activeChannel); }}
              className="px-3 py-1 rounded text-[9px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              data-testid="button-retry-stream"
            >
              RETRY
            </button>
          </div>
        )}
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

  const sortedAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const nowMs = Date.now();
      const remA = Math.max(0, a.countdown - Math.floor((nowMs - new Date(a.timestamp).getTime()) / 1000));
      const remB = Math.max(0, b.countdown - Math.floor((nowMs - new Date(b.timestamp).getTime()) / 1000));
      const activeA = remA > 0 || a.countdown === 0 ? 1 : 0;
      const activeB = remB > 0 || b.countdown === 0 ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      if (a.source !== b.source) return a.source === 'live' ? -1 : 1;
      if (remA !== remB) return remA - remB;
      const sevA = THREAT_SEVERITY_ORDER[a.threatType] ?? 9;
      const sevB = THREAT_SEVERITY_ORDER[b.threatType] ?? 9;
      if (sevA !== sevB) return sevA - sevB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [filteredAlerts]);

  const grouped = sortedAlerts.reduce<Record<string, { country: string; alerts: RedAlert[] }>>((acc, alert) => {
    const regionKey = language === 'ar' ? alert.regionAr : alert.region;
    const country = alert.country || 'Unknown';
    const key = `${country}::${regionKey}`;
    if (!acc[key]) acc[key] = { country, alerts: [] };
    acc[key].alerts.push(alert);
    return acc;
  }, {});

  const sortedRegions = Object.entries(grouped).sort((a, b) => {
    const hasLiveA = a[1].alerts.some(al => al.source === 'live') ? 0 : 1;
    const hasLiveB = b[1].alerts.some(al => al.source === 'live') ? 0 : 1;
    if (hasLiveA !== hasLiveB) return hasLiveA - hasLiveB;
    const countryIdxA = countryOrder.indexOf(a[1].country);
    const countryIdxB = countryOrder.indexOf(b[1].country);
    if (countryIdxA !== countryIdxB) return countryIdxA - countryIdxB;
    const minA = Math.min(...a[1].alerts.map(a => a.countdown));
    const minB = Math.min(...b[1].alerts.map(b => b.countdown));
    return minA - minB;
  });

  const liveCount = alerts.filter(a => a.source === 'live').length;
  const simCount = alerts.filter(a => a.source === 'sim').length;

  const hasActiveAlerts = alerts.length > 0;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="red-alert-panel">
      <div className={`${hasActiveAlerts ? 'px-4 py-3' : 'px-3 py-2'} border-b flex items-center gap-2 shrink-0 relative overflow-hidden ${hasActiveAlerts ? 'border-red-700/60 bg-gradient-to-r from-red-700 to-red-800/70' : 'border-white/[0.04] bg-gradient-to-r from-red-500/[0.04] to-transparent'}`} style={hasActiveAlerts ? {boxShadow:'0 2px 16px rgb(239 68 68 / 0.35)'} : undefined}>
        {hasActiveAlerts && <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />}
        {!hasActiveAlerts && <div className="absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b from-red-500/60 via-red-500/30 to-transparent" />}
        {!hasActiveAlerts && <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />}
        <div className={`flex items-center justify-center shrink-0 ${hasActiveAlerts ? 'w-6 h-6 rounded bg-white/20' : 'w-4 h-4 rounded bg-red-500/[0.08] border border-red-500/10'}`}>
          <AlertOctagon className={`${hasActiveAlerts ? 'w-4 h-4 text-white' : 'w-2.5 h-2.5 text-red-400/60'}`} />
        </div>
        <div className="flex flex-col leading-none">
          <span className={`text-xs font-bold uppercase tracking-[0.15em] ${hasActiveAlerts ? 'text-white' : 'text-foreground/80'}`}>
            {language === 'ar' ? '\u0627\u0644\u0625\u0646\u0630\u0627\u0631 \u0627\u0644\u0623\u062D\u0645\u0631' : 'RED ALERT'}
          </span>
          <span className={`text-[10px] font-mono ${hasActiveAlerts ? 'text-white/50' : 'text-red-400/40'}`}>Home Front Command | Oref</span>
        </div>
        {hasActiveAlerts && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 font-mono text-white font-black bg-white/20 rounded-full border border-white/25 animate-pulse">
              {alerts.length}
            </span>
            {liveCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 font-mono font-black bg-emerald-500/30 text-emerald-200 rounded border border-emerald-400/40">
                {liveCount} API
              </span>
            )}
            {simCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 font-mono font-bold bg-white/10 text-white/50 rounded border border-white/15">
                {simCount} SIM
              </span>
            )}
          </div>
        )}
        <div className="flex-1" />
        {hasActiveAlerts && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse-dot" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">{liveCount > 0 ? 'LIVE API' : 'LIVE'}</span>
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
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-none" style={{background:'hsl(225 25% 5%)', border:'1px solid hsl(225 18% 9%)'}}>
              <span className="text-[7px] font-mono text-primary/40 font-bold shrink-0">AI▸</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن مدينة...' : "AI▸ filter: 'rockets near Tel Aviv', 'critical'..."}
                className="flex-1 bg-transparent text-[10px] font-mono text-red-100/90 placeholder:text-red-400/30 focus:outline-none h-5"
                data-testid="input-red-alert-search"
              />
            </div>
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
                className={`text-[10px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
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
                className={`text-[10px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
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
                    className={`text-[10px] px-2 py-1 rounded font-mono font-bold tracking-wider transition-colors ${
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
          <p className="text-[10px] text-foreground/20 mt-1 font-mono">All areas safe</p>
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
                {regionAlerts.map((alert) => {
                  const threat = RED_ALERT_THREAT_LABELS[alert.threatType] || RED_ALERT_THREAT_LABELS.rockets;
                  const threatColor = RED_ALERT_THREAT_COLORS[alert.threatType] || RED_ALERT_THREAT_COLORS.rockets;
                  const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
                  const remaining = Math.max(0, alert.countdown - elapsed);
                  const isActive = elapsed < alert.countdown || alert.countdown === 0;
                  const tier = getAlertUrgencyTier(remaining, alert.countdown);
                  const isLive = alert.source === 'live';

                  const tierBg = {
                    critical: 'bg-red-900/50 border-l-red-400',
                    urgent: 'bg-red-950/40 border-l-amber-500',
                    warning: 'bg-red-950/30 border-l-red-500',
                    standard: 'bg-red-950/20 border-l-red-600/60',
                    expired: 'bg-transparent border-l-red-900/20',
                  };

                  return (
                    <div
                      key={alert.id}
                      className={`px-3 py-3.5 flex items-center gap-3 border-b border-red-900/15 transition-all cursor-pointer border-l-[3px] hover:bg-red-950/50 ${tierBg[tier]} ${tier === 'critical' ? 'animate-pulse' : ''}`}
                      data-testid={`red-alert-${alert.id}`}
                      style={tier === 'critical' ? {boxShadow:'inset 0 0 20px rgb(239 68 68 / 0.15)'} : undefined}
                    >
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isActive ? 'bg-red-500 animate-pulse-dot' : 'bg-red-900/30'}`} style={isActive ? {boxShadow:'0 0 8px rgb(239 68 68 / 0.6)'} : undefined} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`text-xs font-black truncate ${isActive ? 'text-red-100' : 'text-red-300/50'}`}>
                            {language === 'ar' ? alert.cityAr : alert.city}
                          </span>
                          {isLive ? (
                            <span className="text-[8px] px-1 py-px font-mono font-black bg-emerald-500/25 text-emerald-300 rounded border border-emerald-400/30 shrink-0" data-testid={`source-badge-${alert.id}`}>API</span>
                          ) : (
                            <span className="text-[8px] px-1 py-px font-mono font-bold bg-white/[0.06] text-white/30 rounded border border-white/[0.08] shrink-0" data-testid={`source-badge-${alert.id}`}>SIM</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase font-mono border ${
                            isActive ? `text-white ${threatColor}` : 'text-red-400/30 bg-red-950/30 border-red-900/20'
                          }`} style={isActive ? {boxShadow:'0 0 10px rgb(239 68 68 / 0.25)'} : undefined}>
                            {language === 'ar' ? threat.ar : threat.en}
                          </span>
                          <span className={`text-[9px] font-mono tabular-nums ${isActive ? 'text-red-400/60' : 'text-red-400/25'}`}>
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

const DEFAULT_CHANNELS = ['@OSINTdefender', '@IntelCrab', '@GeoConfirmed', '@CIG_telegram', '@sentaborim', '@AviationIntel', '@ShipTracker', '@OilMarkets', '@wfwitness', '@rnintel', '@lebanonnews2'];

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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
    refetchInterval: 10000,
    staleTime: 0,
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

  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const displayMessages = useMemo(() => {
    if (!channelFilter) return filteredMessages;
    return filteredMessages.filter(m => m.channel === channelFilter);
  }, [filteredMessages, channelFilter]);

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="telegram-panel">
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
            {liveLoading && (
              <span className="text-[9px] font-mono text-sky-400/60 animate-pulse" data-testid="text-live-loading">
                SYNC
              </span>
            )}
            {liveError && (
              <span className="text-[9px] font-mono text-red-400/70 px-1" data-testid="text-live-error" title={liveError}>
                ERR
              </span>
            )}
            <button
              onClick={() => setShowManager(!showManager)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-sky-500/10 transition-colors"
              data-testid="button-toggle-channel-manager"
            >
              <Settings className={`w-3 h-3 text-sky-400/50 hover:text-sky-400/80 transition-colors`} />
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 bg-card/40 shrink-0 overflow-x-auto" data-testid="telegram-channel-filters">
        <button
          onClick={() => setChannelFilter(null)}
          className={`px-2 py-1 rounded text-[9px] font-mono font-bold whitespace-nowrap transition-all ${
            !channelFilter
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-muted-foreground/50 hover:text-sky-400/70 hover:bg-sky-500/5 border border-transparent'
          }`}
          data-testid="button-filter-all"
        >
          ALL ({filteredMessages.length})
        </button>
        {allChannels.slice(0, 6).map(ch => {
          const count = filteredMessages.filter(m => m.channel === ch).length;
          if (count === 0) return null;
          const shortName = ch.replace('@', '').slice(0, 10);
          return (
            <button
              key={ch}
              onClick={() => setChannelFilter(channelFilter === ch ? null : ch)}
              className={`px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap transition-all ${
                channelFilter === ch
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-muted-foreground/40 hover:text-sky-400/60 hover:bg-sky-500/5 border border-transparent'
              }`}
              data-testid={`button-filter-${ch.replace('@', '')}`}
            >
              {shortName} {count > 0 && <span className="text-sky-400/50 ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {showManager && (
        <div className="border-b border-sky-800/20 bg-sky-950/20 px-3 py-2.5 shrink-0 space-y-2">
          <div className="flex gap-1.5">
            <div className="flex-1 relative">
              <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40" />
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                placeholder={language === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0642\u0646\u0627\u0629...' : 'Add channel...'}
                className="w-full h-7 text-[11px] font-mono pl-7 pr-2 rounded-md bg-background/60 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/25 focus:outline-none focus:border-sky-500/50 transition-colors"
                data-testid="input-telegram-channel"
              />
            </div>
            <button
              onClick={addChannel}
              className="h-7 px-3 text-[10px] font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded-md border border-sky-500/25 transition-colors"
              data-testid="button-add-channel"
            >
              {language === 'ar' ? '\u0625\u0636\u0627\u0641\u0629' : 'ADD'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {allChannels.map(ch => {
              const isCustom = customChannels.includes(ch);
              return (
                <div
                  key={ch}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    isCustom
                      ? 'bg-sky-500/15 text-sky-300/90 border border-sky-500/20'
                      : 'bg-muted/30 text-muted-foreground/50 border border-border/30'
                  }`}
                  data-testid={`channel-tag-${ch.replace('@', '')}`}
                >
                  <SiTelegram className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{ch.replace('@', '')}</span>
                  {isCustom && (
                    <button
                      onClick={() => removeChannel(ch)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-500/20 transition-colors"
                      data-testid={`button-remove-channel-${ch.replace('@', '')}`}
                    >
                      <X className="w-2.5 h-2.5 text-red-400/60" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxImage(null); }}
          tabIndex={0}
          role="dialog"
          data-testid="telegram-lightbox"
        >
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
            onError={() => setLightboxImage(null)}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 border border-white/25 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            data-testid="button-close-lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {displayMessages.length === 0 && (
            <div className="px-3 py-8 text-center">
              <SiTelegram className="w-6 h-6 text-sky-400/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground/60">
                {liveLoading
                  ? (language === 'ar' ? '\u062C\u0627\u0631\u064A \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...' : 'Fetching live feeds...')
                  : liveError
                    ? (language === 'ar' ? '\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644' : 'Connection error')
                    : channelFilter
                      ? (language === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644' : 'No messages from this channel')
                      : (language === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644' : 'No messages yet')}
              </p>
            </div>
          )}
          {displayMessages.map((msg) => {
            const isExpanded = expandedMsgId === msg.id;
            const isLive = msg.id.startsWith('live_');
            const text = language === 'ar' && msg.textAr ? msg.textAr : msg.text;
            const channelName = msg.channel.replace('@', '');
            return (
              <div
                key={msg.id}
                className={`rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                  isExpanded
                    ? 'bg-sky-950/30 ring-1 ring-sky-500/15'
                    : 'bg-muted/20 hover:bg-sky-950/15'
                }`}
                onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                data-testid={`telegram-msg-${msg.id}`}
              >
                {msg.image && !isExpanded && (
                  <div
                    className="relative w-full h-36 overflow-hidden cursor-zoom-in"
                    onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.image!); }}
                    data-testid={`img-thumbnail-${msg.id}`}
                  >
                    <img
                      src={msg.image}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).closest('[data-testid]')!.parentElement!.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
                      <SiTelegram className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="text-[10px] text-white font-bold truncate">{channelName}</span>
                      {isLive && <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/30 px-1 rounded shrink-0">LIVE</span>}
                      <span className="text-[9px] text-white/60 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
                    </div>
                  </div>
                )}

                <div className="px-2.5 py-2">
                  {(!msg.image || isExpanded) && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                        <SiTelegram className="w-3 h-3 text-sky-400/90" />
                      </div>
                      <span className="text-xs text-sky-400 font-bold truncate">{channelName}</span>
                      {isLive && (
                        <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1 rounded border border-emerald-500/20 shrink-0">LIVE</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
                    </div>
                  )}

                  {isExpanded && msg.image && (
                    <div className="rounded-md overflow-hidden mb-2 border border-sky-800/20">
                      <img
                        src={msg.image}
                        alt=""
                        className="w-full max-h-72 object-cover bg-black/20 cursor-zoom-in hover:opacity-90 transition-opacity"
                        loading="lazy"
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.image!); }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        data-testid={`img-telegram-${msg.id}`}
                      />
                    </div>
                  )}

                  <p className={`text-sm leading-[1.65] ${isExpanded ? 'text-foreground/90 whitespace-pre-wrap' : 'text-foreground/70 line-clamp-2'}`}>{text}</p>

                  {isExpanded && (
                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-sky-800/15">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <a
                        href={`https://t.me/${channelName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-sky-400/50 hover:text-sky-400/90 transition-colors ml-auto"
                        data-testid={`link-telegram-channel-${msg.id}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{language === 'ar' ? '\u0641\u062A\u062D' : 'Open'}</span>
                      </a>
                    </div>
                  )}
                </div>
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
    <div className="absolute bottom-3 left-3 z-[1000] bg-card/90 backdrop-blur-md border border-white/[0.06] rounded p-2 text-[9px] space-y-0.5" dir="ltr">
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

function SettingsOverlay({ settings, onSave, onClose, language }: { settings: WARROOMSettings; onSave: (s: WARROOMSettings) => void; onClose: () => void; language: 'en' | 'ar' }) {
  const [local, setLocal] = useState({ ...settings });
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const handleSave = () => {
    localStorage.setItem('warroom_settings', JSON.stringify(local));
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="settings-overlay">
      <div className="w-[90vw] max-w-[480px] max-h-[85vh] bg-background/95 backdrop-blur-xl border border-primary/30 rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 25px 50px rgb(0 0 0 / 0.6), 0 0 20px hsl(32 95% 50% / 0.1)'}}>
        <div className={`px-4 ${isTouchDevice ? 'py-4' : 'py-3'} border-b border-primary/20 bg-primary/5 flex items-center gap-2 rounded-t-xl`}>
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold font-mono text-primary tracking-wider">{t('SETTINGS', '\u0625\u0639\u062F\u0627\u062F\u0627\u062A')}</span>
          <div className="flex-1" />
          <button onClick={onClose} className={`${isTouchDevice ? 'w-10 h-10' : 'w-6 h-6'} flex items-center justify-center rounded hover:bg-primary/20 active:bg-primary/30`} aria-label="Close settings" data-testid="button-close-settings"><X className={`${isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'} text-primary/60`} /></button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Threat Thresholds', '\u0639\u062A\u0628\u0627\u062A \u0627\u0644\u062A\u0647\u062F\u064A\u062F')}</span>
              {([
                { key: 'criticalThreshold' as const, label: 'CRITICAL', color: 'text-red-400' },
                { key: 'highThreshold' as const, label: 'HIGH', color: 'text-orange-400' },
                { key: 'elevatedThreshold' as const, label: 'ELEVATED', color: 'text-yellow-400' },
              ] as const).map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3 mb-2">
                  <span className={`text-[11px] font-mono font-bold w-20 ${color}`}>{label}</span>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={local[key]}
                    onChange={e => setLocal(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                    className="flex-1 accent-primary h-1"
                    data-testid={`slider-${key}`}
                  />
                  <span className="text-xs font-mono text-foreground/60 w-8 text-right">{local[key]}</span>
                </div>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Notification Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A')}</span>
              {([
                { key: 'notifyRockets' as const, label: 'Rockets' },
                { key: 'notifyMissiles' as const, label: 'Missiles' },
                { key: 'notifyUav' as const, label: 'UAV Intrusion' },
                { key: 'notifyAircraft' as const, label: 'Hostile Aircraft' },
              ] as const).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-3 ${isTouchDevice ? 'mb-3 py-1' : 'mb-2'} cursor-pointer group`} data-testid={`toggle-${key}`}>
                  <div
                    className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local[key] ? 'bg-primary' : 'bg-border/50'}`}
                    onClick={() => setLocal(p => ({ ...p, [key]: !p[key] }))}
                  >
                    <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local[key] ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90 transition-colors">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Sound', '\u0635\u0648\u062A')}</span>
              <label className={`flex items-center gap-3 cursor-pointer group mb-3 ${isTouchDevice ? 'py-1' : ''}`} data-testid="toggle-sound">
                <div
                  className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local.soundEnabled ? 'bg-primary' : 'bg-border/50'}`}
                  onClick={() => setLocal(p => ({ ...p, soundEnabled: !p.soundEnabled }))}
                >
                  <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local.soundEnabled ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90">{t('Alert sounds', '\u0623\u0635\u0648\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631')}</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer group mb-3 ${isTouchDevice ? 'py-1' : ''}`} data-testid="toggle-silent-mode">
                <div
                  className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local.silentMode ? 'bg-red-500' : 'bg-border/50'}`}
                  onClick={() => setLocal(p => ({ ...p, silentMode: !p.silentMode }))}
                >
                  <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local.silentMode ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90">{t('Silent mode (mute all)', '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0635\u0627\u0645\u062A')}</span>
              </label>
              <div className="flex items-center gap-3 mb-2">
                <VolumeX className="w-3 h-3 text-foreground/40" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={local.volume}
                  onChange={e => setLocal(p => ({ ...p, volume: parseInt(e.target.value) }))}
                  className="flex-1 accent-primary h-1"
                  data-testid="slider-volume"
                />
                <Volume2 className="w-3 h-3 text-foreground/40" />
                <span className="text-xs font-mono text-foreground/60 w-8 text-right">{local.volume}%</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Push Notifications', '\u0625\u0634\u0639\u0627\u0631\u0627\u062A')}</span>
              <div className="flex gap-2">
                {(['all', 'critical', 'none'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLocal(p => ({ ...p, notificationLevel: l }))}
                    className={`text-xs px-3 py-1.5 rounded font-mono font-bold border transition-colors ${
                      local.notificationLevel === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/[0.02] border-white/[0.05] text-foreground/30 hover:bg-white/[0.04]'
                    }`}
                    data-testid={`button-notify-${l}`}
                  >{l === 'all' ? t('All Alerts', '\u0627\u0644\u0643\u0644') : l === 'critical' ? t('Critical Only', '\u062D\u0631\u062C\u0629 \u0641\u0642\u0637') : t('None', '\u0644\u0627 \u0634\u064A\u0621')}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Default Language', '\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629')}</span>
              <div className="flex gap-2">
                {(['en', 'ar'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLocal(p => ({ ...p, defaultLanguage: l }))}
                    className={`text-xs px-4 py-1.5 rounded font-mono font-bold border transition-colors ${
                      local.defaultLanguage === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/[0.02] border-white/[0.05] text-foreground/30 hover:bg-white/[0.04]'
                    }`}
                    data-testid={`button-lang-${l}`}
                  >{l === 'en' ? 'English' : '\u0639\u0631\u0628\u064A'}</button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-primary/20 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[10px] px-4 py-1.5 rounded font-mono text-foreground/40 hover:text-foreground border border-white/[0.06] hover:bg-white/[0.04] transition-colors" data-testid="button-cancel-settings">{t('Cancel', '\u0625\u0644\u063A\u0627\u0621')}</button>
          <button onClick={handleSave} className={`text-xs ${isTouchDevice ? 'px-6 py-3' : 'px-4 py-1.5'} rounded font-mono font-bold text-background bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors`} data-testid="button-save-settings">{t('Save', '\u062D\u0641\u0638')}</button>
        </div>
      </div>
    </div>
  );
}

function AIIntelPanel({ language, onClose, onMaximize, isMaximized, brief, briefLoading, anomalies = [] }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; brief?: AIBrief | null; briefLoading?: boolean; anomalies?: Anomaly[] }) {
  const [deductQuery, setDeductQuery] = useState('');
  const [deductResult, setDeductResult] = useState<AIDeduction | null>(null);

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
    <div className="h-full flex flex-col min-h-0" data-testid="ai-intel-panel">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-2 bg-gradient-to-r from-purple-500/[0.04] to-transparent shrink-0 relative overflow-hidden">
        <div className="absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b from-purple-400/60 via-purple-400/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
        <div className="w-4 h-4 rounded bg-purple-500/[0.08] border border-purple-500/10 flex items-center justify-center shrink-0">
          <Brain className="w-2.5 h-2.5 text-purple-400/70" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 font-mono">
          {language === 'en' ? 'AI Intel' : '\u0630\u0643\u0627\u0621'}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 font-mono text-foreground/25 bg-white/[0.03] rounded border border-white/[0.05] tabular-nums leading-none">
          {brief?.model || '...'}
        </span>
        {anomalies.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 font-mono font-bold text-amber-300/80 bg-amber-950/30 rounded border border-amber-500/20 animate-pulse" data-testid="anomaly-badge">
            {anomalies.length} ANOMALY
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
          <Sparkles className="w-2.5 h-2.5 text-purple-400/40" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold font-mono">LIVE</span>
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <ScrollArea className="flex-1">
        {anomalies.length > 0 && (
          <div className="border-b border-amber-500/20 bg-amber-950/10">
            <div className="px-3 py-2 flex items-center gap-1.5">
              <TriangleAlert className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">{language === 'en' ? 'Anomalies Detected' : '\u0634\u0630\u0648\u0630 \u0645\u0643\u062A\u0634\u0641\u0629'}</span>
            </div>
            <div className="divide-y divide-amber-900/20">
              {anomalies.map(a => (
                <div key={a.id} className="px-3 py-2" data-testid={`anomaly-${a.id}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${a.severity === 'high' ? 'text-red-400 bg-red-950/30 border-red-500/30' : 'text-amber-400 bg-amber-950/30 border-amber-500/30'}`}>
                      {a.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{a.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/30 ml-auto">{timeAgo(a.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-foreground/70 leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {briefLoading && (
          <div className="px-3 py-8 text-center">
            <Brain className="w-6 h-6 text-purple-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-[10px] text-foreground/25">Synthesizing intelligence brief...</p>
          </div>
        )}

        {brief && (
          <div className="divide-y divide-white/[0.03]">
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
                  className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded px-2.5 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-purple-500/40 font-mono"
                  data-testid="input-ai-deduction"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] px-1.5 h-5 text-purple-400/80"
                  onClick={handleDeduct}
                  disabled={deductMutation.isPending || !deductQuery.trim()}
                  data-testid="button-ai-deduct"
                >
                  {deductMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
              </div>

              {deductResult && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded p-3 animate-fade-in">
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

const AlertMapComponent = lazy(() => import('@/components/alert-map'));

function AlertMapPanel({
  alerts,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  alerts: RedAlert[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const activeAlerts = alerts.filter(a => {
    const elapsed = (Date.now() - new Date(a.timestamp).getTime()) / 1000;
    return elapsed < a.countdown || a.countdown === 0;
  });

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="alertmap-panel">
      <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
        <MapPin className="w-3 h-3 text-red-400/50 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 font-mono">
          {language === 'en' ? 'Alert Map' : '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}
        </span>
        {activeAlerts.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 font-mono font-black bg-red-500/20 text-red-300 rounded-full border border-red-500/30 animate-pulse">
            {activeAlerts.length}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${activeAlerts.length > 0 ? 'bg-red-500 animate-pulse-dot' : 'bg-emerald-500'}`} />
          <span className={`text-xs uppercase tracking-[0.15em] font-bold ${activeAlerts.length > 0 ? 'text-red-500/60' : 'text-emerald-500/60'}`}>
            {activeAlerts.length > 0 ? 'ACTIVE' : 'CLEAR'}
          </span>
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
                    <MapPin className="w-8 h-8 text-red-400 mx-auto mb-2 animate-pulse" />
                    <p className="text-[11px] text-muted-foreground">Loading alert map...</p>
                  </div>
                </div>
              }
            >
              <AlertMapComponent alerts={alerts} language={language} />
            </Suspense>
          </MapErrorBoundary>
        </div>
      </div>
    </div>
  );
}

const MAP_STYLE_OPTIONS = [
  { id: 'dark', label: 'Dark', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'light', label: 'Light', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'street', label: 'Street', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
] as const;

function MapSection({
  events,
  flights,
  ships,
  adsbFlights,
  redAlerts,
  thermalHotspots,
  language,
  onClose,
  onMaximize,
  isMaximized,
  focusLocation,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  adsbFlights: AdsbFlight[];
  redAlerts: RedAlert[];
  thermalHotspots: ThermalHotspot[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');
  const [mapStyleId, setMapStyleId] = useState<'dark' | 'light' | 'street'>('dark');
  const mapStyleUrl = MAP_STYLE_OPTIONS.find(s => s.id === mapStyleId)!.url;

  const views = [
    { key: 'conflict' as const, icon: AlertTriangle, label: language === 'en' ? 'Conflict' : '\u0646\u0632\u0627\u0639', labelEn: 'Conflict' },
    { key: 'flights' as const, icon: Plane, label: language === 'en' ? 'Flights' : '\u0631\u062D\u0644\u0627\u062A', labelEn: 'Flights' },
    { key: 'maritime' as const, icon: Anchor, label: language === 'en' ? 'Hormuz' : '\u0647\u0631\u0645\u0632', labelEn: 'Hormuz' },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
        <Target className="w-3 h-3 text-primary/50 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 font-mono">
          {language === 'en' ? 'Map' : '\u062E\u0631\u064A\u0637\u0629'}
        </span>
        <div className="flex items-center gap-px bg-white/[0.02] rounded border border-white/[0.05] p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                activeView === v.key
                  ? 'bg-primary/15 text-primary/90 border border-primary/20'
                  : 'text-foreground/30 hover:text-foreground/60 border border-transparent'
              }`}
              onClick={() => setActiveView(v.key)}
              data-testid={`button-map-${v.key}`}
            >
              {v.labelEn}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-px bg-white/[0.02] rounded border border-white/[0.05] p-0.5" data-no-drag>
          {MAP_STYLE_OPTIONS.map(s => (
            <button
              key={s.id}
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                mapStyleId === s.id
                  ? 'bg-primary/15 text-primary/90 border border-primary/20'
                  : 'text-foreground/30 hover:text-foreground/60 border border-transparent'
              }`}
              onClick={() => setMapStyleId(s.id)}
              data-testid={`button-map-style-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>
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
                thermalHotspots={thermalHotspots}
                activeView={activeView}
                language={language}
                mapStyle={mapStyleUrl}
                focusLocation={focusLocation}
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
    breaking: 'text-red-400/80',
    military: 'text-amber-400/70',
    diplomatic: 'text-sky-400/70',
    economic: 'text-emerald-400/70',
  };
  const items = [...news, ...news, ...news];
  return (
    <div className="h-5 border-t border-white/[0.03] overflow-hidden relative shrink-0" data-testid="news-ticker" style={{background:'hsl(225 30% 3%)'}}>
      <div className="absolute inset-y-0 left-0 w-14 z-10 flex items-center pl-3" style={{background:'linear-gradient(90deg, hsl(225 30% 3%) 60%, transparent)'}}>
        <span className="text-[7px] font-black tracking-[0.35em] text-primary/30 font-mono">NEWS</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-10 z-10" style={{background:'linear-gradient(270deg, hsl(225 30% 3%) 30%, transparent)'}} />
      <div className="absolute flex items-center h-full gap-8 animate-ticker-scroll whitespace-nowrap pl-14">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-[10px] font-mono">
            <span className={`font-bold uppercase tracking-wider text-[8px] ${CATEGORY_COLORS[item.category] || 'text-primary/60'}`}>
              {item.category}
            </span>
            <span className="text-foreground/60">{language === 'ar' && item.titleAr ? item.titleAr : item.title}</span>
            <span className="text-muted-foreground/25 text-[9px]">{item.source}</span>
            <span className="text-white/[0.05] mx-1">{'\u2502'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface LLMAssessmentData {
  engine: string;
  model: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  summary: string;
  keyInsights: string[];
  confidence: number;
  generatedAt: string;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

interface AnalyticsData {
  alertsByRegion: Record<string, number>;
  alertsByType: Record<string, number>;
  alertTimeline: { time: string; count: number }[];
  topSources: { channel: string; count: number; reliability: number }[];
  activeAlertCount: number;
  falseAlarmRate: number;
  avgResponseTime: number;
  threatTrend: 'escalating' | 'stable' | 'deescalating';
  patterns: PatternData[];
  falseAlarms: FalseAlarmData[];
  llmAssessments?: LLMAssessmentData[];
  consensusRisk?: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  modelAgreement?: number;
}

interface PatternData {
  id: string;
  type: string;
  confidence: number;
  description: string;
  detectedAt: string;
  affectedRegions: string[];
  alertCount: number;
}

interface FalseAlarmData {
  alertId: string;
  score: number;
  reasons: string[];
  recommendation: 'likely_real' | 'uncertain' | 'likely_false';
}

function XFeedPanel({ posts, language, onClose, onMaximize, isMaximized }: {
  posts: NewsItem[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const accounts = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach(p => {
      map.set(p.source, (map.get(p.source) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filtered = activeAccount ? posts.filter(p => p.source === activeAccount) : posts;

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const categoryColors: Record<string, string> = {
    breaking: 'bg-red-500/20 text-red-400 border-red-500/30',
    military: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    diplomatic: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    humanitarian: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    economic: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    nuclear: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-xfeed">
      <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
        <SiX className="w-3 h-3 text-primary/50 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 font-mono">{t('X / Twitter', '\u0625\u0643\u0633 / \u062A\u0648\u064A\u062A\u0631')}</span>
        <span className="text-[8px] font-mono text-foreground/25 tabular-nums leading-none">[{filtered.length}]</span>
        {posts.length > 0 && <span className="text-[7px] uppercase tracking-widest text-emerald-400/50 font-mono ml-0.5">LIVE</span>}
        <div className="flex-1" />
        {onMaximize && <button onClick={onMaximize} className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-white/10" data-testid="button-maximize-xfeed">{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}</button>}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <div className="px-2 py-1.5 border-b border-white/[0.04] overflow-x-auto flex items-center gap-1 shrink-0">
        <button
          onClick={() => setActiveAccount(null)}
          className={`text-[9px] font-mono px-2 py-1 rounded whitespace-nowrap transition-colors ${!activeAccount ? 'bg-white/10 text-foreground/80 font-bold' : 'text-foreground/40 hover:bg-white/5'}`}
          data-testid="button-xfeed-all"
        >
          {t('ALL', '\u0627\u0644\u0643\u0644')} ({posts.length})
        </button>
        {accounts.map(([name, count]) => (
          <button
            key={name}
            onClick={() => setActiveAccount(activeAccount === name ? null : name)}
            className={`text-[9px] font-mono px-2 py-1 rounded whitespace-nowrap transition-colors ${activeAccount === name ? 'bg-white/10 text-foreground/80 font-bold' : 'text-foreground/40 hover:bg-white/5'}`}
            data-testid={`button-xfeed-account-${name.replace(/\s+/g, '-')}`}
          >
            {name} ({count})
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="divide-y divide-white/[0.03]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 className="w-5 h-5 text-foreground/20 animate-spin mx-auto mb-2" />
              <p className="text-[10px] text-foreground/30 font-mono">{t('Loading X feeds...', '\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A...')}</p>
            </div>
          ) : (
            filtered.map(post => (
              <div key={post.id} className="px-3 py-2.5 hover:bg-white/[0.02] transition-colors group" data-testid={`xfeed-post-${post.id}`}>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <SiX className="w-3 h-3 text-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-bold text-foreground/80 truncate">{post.source}</span>
                      <svg className="w-3 h-3 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.27 4.8-5.23 1.47 1.36-6.2 6.76z"/></svg>
                      <span className="text-[9px] text-foreground/30 font-mono tabular-nums ml-auto shrink-0">{timeAgo(post.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-foreground/70 leading-relaxed mb-1.5">{language === 'ar' && (post as { titleAr?: string }).titleAr ? (post as { titleAr?: string }).titleAr : post.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.category && (
                        <span className={`text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${categoryColors[post.category] || 'bg-white/5 text-foreground/40 border-white/10'}`}>
                          {post.category}
                        </span>
                      )}
                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-blue-400/60 hover:text-blue-400 font-mono flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`link-xfeed-${post.id}`}
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          x.com
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function LLMDivergenceAlert({ assessments, language }: { assessments: LLMAssessmentData[]; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const successful = assessments.filter(a => a.status === 'success');
  if (successful.length < 2) return null;
  const risks = successful.map(a => a.riskLevel);
  const allSame = risks.every(r => r === risks[0]);
  if (!allSame) {
    return (
      <div className="mt-2 p-2 rounded bg-yellow-950/20 border border-yellow-500/20" data-testid="divergence-alert">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-bold font-mono text-yellow-400 uppercase">{t('Model Divergence Detected', 'تم رصد اختلاف بين النماذج')}</span>
        </div>
        <p className="text-[9px] text-foreground/50">
          {successful.map(a => `${a.engine}: ${a.riskLevel}`).join(' · ')}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-2 p-2 rounded bg-emerald-950/20 border border-emerald-500/20" data-testid="agreement-alert">
      <div className="flex items-center gap-1.5">
        <Shield className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase">{t('All Models Agree', 'جميع النماذج متفقة')}: {risks[0]}</span>
      </div>
    </div>
  );
}

function AnalyticsPanel({ language, onClose, onMaximize, isMaximized }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
    refetchInterval: 10000,
    staleTime: 0,
  });

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const patterns = analytics?.patterns ?? [];
  const falseAlarms = analytics?.falseAlarms ?? [];

  const regionEntries = analytics ? Object.entries(analytics.alertsByRegion).sort((a, b) => b[1] - a[1]).slice(0, 8) : [];
  const typeEntries = analytics ? Object.entries(analytics.alertsByType).sort((a, b) => b[1] - a[1]) : [];
  const maxRegion = regionEntries.length > 0 ? Math.max(...regionEntries.map(e => e[1])) : 1;
  const maxType = typeEntries.length > 0 ? Math.max(...typeEntries.map(e => e[1])) : 1;
  const maxTimeline = analytics?.alertTimeline ? Math.max(...analytics.alertTimeline.map(t => t.count), 1) : 1;

  const trendColor = analytics?.threatTrend === 'escalating' ? 'text-red-400' : analytics?.threatTrend === 'deescalating' ? 'text-emerald-400' : 'text-yellow-400';
  const trendIcon = analytics?.threatTrend === 'escalating' ? '▲' : analytics?.threatTrend === 'deescalating' ? '▼' : '●';

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-analytics">
      <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
        <BarChart3 className="w-3 h-3 text-blue-400/50 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/45 font-mono">{t('Analytics', '\u062A\u062D\u0644\u064A\u0644\u0627\u062A')}</span>
        <div className="flex-1" />
        {onMaximize && <button onClick={onMaximize} className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-white/10" data-testid="button-maximize-analytics">{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}</button>}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!analytics ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-blue-400/40 animate-spin mx-auto" /></div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-1.5 flex flex-col items-center">
                  <span className="text-[10px] text-foreground/40 font-mono">{t('Active', '\u0646\u0634\u0637')}</span>
                  <span className="text-lg font-bold font-mono text-red-400" data-testid="text-active-alerts">{analytics.activeAlertCount}</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-1.5 flex flex-col items-center">
                  <span className="text-[10px] text-foreground/40 font-mono">{t('False Alarm %', '\u0625\u0646\u0630\u0627\u0631 \u0643\u0627\u0630\u0628')}</span>
                  <span className="text-lg font-bold font-mono text-yellow-400" data-testid="text-false-alarm-rate">{(analytics.falseAlarmRate * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-1.5 flex flex-col items-center">
                  <span className="text-[10px] text-foreground/40 font-mono">{t('Avg Response', '\u0645\u062A\u0648\u0633\u0637')}</span>
                  <span className="text-lg font-bold font-mono text-blue-400" data-testid="text-avg-response">{analytics.avgResponseTime}s</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded px-2.5 py-1.5 flex flex-col items-center">
                  <span className="text-[10px] text-foreground/40 font-mono">{t('Trend', '\u0627\u062A\u062C\u0627\u0647')}</span>
                  <span className={`text-sm font-bold font-mono ${trendColor}`} data-testid="text-trend">{trendIcon} {analytics.threatTrend.toUpperCase()}</span>
                </div>
              </div>

              {analytics.llmAssessments && analytics.llmAssessments.length > 0 && (
                <div data-testid="section-multi-llm">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3 h-3 text-purple-400/60" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 font-mono">{t('Multi-LLM Intelligence Engine', 'محرك الذكاء متعدد النماذج')}</span>
                  </div>

                  {analytics.consensusRisk && (
                    <div className={`mb-3 p-2 rounded border ${
                      analytics.consensusRisk === 'EXTREME' ? 'bg-red-950/30 border-red-500/30' :
                      analytics.consensusRisk === 'HIGH' ? 'bg-orange-950/30 border-orange-500/30' :
                      analytics.consensusRisk === 'ELEVATED' ? 'bg-yellow-950/30 border-yellow-500/30' :
                      'bg-emerald-950/30 border-emerald-500/30'
                    }`} data-testid="consensus-box">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-foreground/50 uppercase">{t('Consensus Risk', 'مستوى المخاطر التوافقي')}</span>
                        <span className={`text-xs font-black font-mono tracking-wider ${
                          analytics.consensusRisk === 'EXTREME' ? 'text-red-400' :
                          analytics.consensusRisk === 'HIGH' ? 'text-orange-400' :
                          analytics.consensusRisk === 'ELEVATED' ? 'text-yellow-400' :
                          'text-emerald-400'
                        }`} data-testid="text-consensus-risk">{analytics.consensusRisk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-foreground/40">{t('Model Agreement', 'توافق النماذج')}</span>
                        <div className="flex-1 h-1.5 bg-white/[0.05] rounded overflow-hidden">
                          <div className={`h-full rounded transition-all ${
                            (analytics.modelAgreement ?? 0) > 0.8 ? 'bg-emerald-500' :
                            (analytics.modelAgreement ?? 0) > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} style={{ width: `${(analytics.modelAgreement ?? 0) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold font-mono text-foreground/60" data-testid="text-model-agreement">{((analytics.modelAgreement ?? 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {analytics.llmAssessments.map((assessment) => {
                      const engineColors: Record<string, string> = {
                        'OpenAI': 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
                        'Anthropic': 'from-orange-500/10 border-orange-500/20 text-orange-400',
                        'Google': 'from-blue-500/10 border-blue-500/20 text-blue-400',
                        'xAI': 'from-rose-500/10 border-rose-500/20 text-rose-400',
                      };
                      const colors = engineColors[assessment.engine] || 'from-gray-500/10 border-gray-500/20 text-gray-400';
                      const borderColor = colors.split(' ')[1];
                      const textColor = colors.split(' ')[2];

                      const riskColor = assessment.riskLevel === 'EXTREME' ? 'bg-red-500/80 text-white' :
                        assessment.riskLevel === 'HIGH' ? 'bg-orange-500/80 text-white' :
                        assessment.riskLevel === 'ELEVATED' ? 'bg-yellow-500/80 text-black' :
                        assessment.riskLevel === 'MODERATE' ? 'bg-blue-500/80 text-white' :
                        'bg-emerald-500/80 text-white';

                      return (
                        <div key={assessment.engine} className={`p-2.5 rounded border bg-gradient-to-r to-transparent ${borderColor} ${colors.split(' ')[0]}`} data-testid={`llm-card-${assessment.engine.toLowerCase()}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${assessment.status === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            <span className={`text-[11px] font-bold font-mono ${textColor}`}>{assessment.engine}</span>
                            <span className="text-[9px] font-mono text-foreground/30">{assessment.model}</span>
                            <div className="flex-1" />
                            {assessment.status === 'success' && (
                              <span className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded ${riskColor}`}>{assessment.riskLevel}</span>
                            )}
                            <span className="text-[9px] font-mono text-foreground/25">{assessment.latencyMs}ms</span>
                          </div>

                          {assessment.status === 'success' ? (
                            <>
                              <p className="text-[10px] text-foreground/60 leading-relaxed mb-1.5" data-testid={`text-summary-${assessment.engine.toLowerCase()}`}>{assessment.summary}</p>
                              {assessment.keyInsights.length > 0 && (
                                <div className="space-y-0.5">
                                  {assessment.keyInsights.map((insight, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5">
                                      <span className={`text-[8px] mt-0.5 ${textColor}`}>▸</span>
                                      <span className="text-[9px] text-foreground/50 leading-tight">{insight}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/[0.04]">
                                <span className="text-[9px] font-mono text-foreground/30">{t('Confidence', 'الثقة')}: {(assessment.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 py-1">
                              <AlertTriangle className="w-3 h-3 text-red-400/60" />
                              <span className="text-[10px] text-red-400/60 font-mono">{assessment.error || 'Engine unavailable'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <LLMDivergenceAlert assessments={analytics.llmAssessments} language={language} />
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('24h Timeline', '\u062C\u062F\u0648\u0644 24 \u0633\u0627\u0639\u0629')}</span>
                <div className="flex items-end gap-px h-12 bg-white/[0.02] rounded border border-white/[0.04] p-1" data-testid="chart-timeline">
                  {analytics.alertTimeline.map((b, i) => (
                    <div key={i} className="flex-1 flex items-end justify-center" title={`${b.time}: ${b.count}`}>
                      <div
                        className="w-full rounded-sm bg-blue-500/60 hover:bg-blue-400/80 transition-colors min-h-[1px]"
                        style={{ height: `${Math.max(4, (b.count / maxTimeline) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('Alerts by Region', '\u062D\u0633\u0628 \u0627\u0644\u0645\u0646\u0637\u0642\u0629')}</span>
                <div className="space-y-1" data-testid="chart-by-region">
                  {regionEntries.map(([region, count]) => (
                    <div key={region} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-foreground/60 w-24 truncate">{region}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded overflow-hidden">
                        <div className="h-full bg-red-500/50 rounded" style={{ width: `${(count / maxRegion) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-foreground/40 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('Alerts by Type', '\u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639')}</span>
                <div className="space-y-1" data-testid="chart-by-type">
                  {typeEntries.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-foreground/60 w-24 truncate uppercase">{type.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded overflow-hidden">
                        <div className="h-full bg-orange-500/50 rounded" style={{ width: `${(count / maxType) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-foreground/40 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('Source Reliability', '\u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631')}</span>
                <div className="space-y-1" data-testid="table-sources">
                  {analytics.topSources.map((src) => (
                    <div key={src.channel} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <span className="text-[10px] font-mono text-foreground/70 flex-1 truncate">{src.channel}</span>
                      <span className="text-[10px] font-mono text-foreground/40">{src.count}</span>
                      <div className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${src.reliability > 0.8 ? 'bg-emerald-950/40 text-emerald-400' : src.reliability > 0.5 ? 'bg-yellow-950/40 text-yellow-400' : 'bg-red-950/40 text-red-400'}`}>
                        {(src.reliability * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {patterns.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('Detected Patterns', '\u0623\u0646\u0645\u0627\u0637')}</span>
                  <div className="space-y-1.5" data-testid="list-patterns">
                    {patterns.map(p => (
                      <div key={p.id} className="p-2 rounded bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-colors" data-testid={`pattern-${p.id}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="text-[11px] font-bold text-purple-300 font-mono uppercase">{p.type.replace(/_/g, ' ')}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${p.confidence > 0.7 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-400'}`}>{(p.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[10px] text-foreground/50">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {falseAlarms.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('False Alarm Analysis', '\u062A\u062D\u0644\u064A\u0644 \u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629')}</span>
                  <div className="space-y-1" data-testid="list-false-alarms">
                    {falseAlarms.slice(0, 10).map(fa => (
                      <div key={fa.alertId} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors" data-testid={`false-alarm-${fa.alertId}`}>
                        <div className={`w-2 h-2 rounded-full ${fa.score > 0.7 ? 'bg-red-500' : fa.score > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-mono text-foreground/60 flex-1 truncate">{fa.recommendation.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono text-foreground/40 truncate max-w-[120px]">{fa.reasons[0] || ''}</span>
                        <span className="text-[10px] font-bold font-mono text-foreground/50">{(fa.score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AlertHistoryTimeline({ language }: { language: 'en' | 'ar' }) {
  const { data: history = [], isLoading } = useQuery<Array<RedAlert & { resolved: boolean; resolvedAt?: string }>>({
    queryKey: ['/api/alert-history'],
    refetchInterval: 10000,
    staleTime: 0,
  });
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  const now = Date.now();
  const bucketSize = 15 * 60 * 1000;
  const bucketCount = 96;

  const buckets = useMemo(() => {
    const b: Array<{ start: number; end: number; alerts: Array<RedAlert & { resolved: boolean }>; byType: Record<string, number> }> = [];
    for (let i = 0; i < bucketCount; i++) {
      const end = now - i * bucketSize;
      const start = end - bucketSize;
      const alerts = history.filter(a => {
        const ts = new Date(a.timestamp).getTime();
        return ts >= start && ts < end;
      });
      const byType: Record<string, number> = {};
      alerts.forEach(a => { byType[a.threatType] = (byType[a.threatType] || 0) + 1; });
      b.unshift({ start, end, alerts, byType });
    }
    return b;
  }, [history, now]);

  const maxCount = Math.max(...buckets.map(b => b.alerts.length), 1);

  const escalating = useMemo(() => {
    const recent = buckets.slice(-12);
    let increasing = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].alerts.length > recent[i - 1].alerts.length) increasing++;
    }
    return increasing >= 3;
  }, [buckets]);

  const selectedAlerts = selectedBucket !== null ? buckets[selectedBucket]?.alerts || [] : [];
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const THREAT_COLORS: Record<string, string> = {
    rockets: 'bg-red-500',
    missiles: 'bg-orange-500',
    uav_intrusion: 'bg-yellow-500',
    hostile_aircraft_intrusion: 'bg-purple-500',
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 text-red-400/40 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-2" data-testid="alert-history-timeline">
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-red-400/60" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('24h Timeline', '\u062C\u062F\u0648\u0644 24 \u0633\u0627\u0639\u0629')}</span>
        {escalating && (
          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-400 animate-pulse" data-testid="badge-escalating">
            {t('ESCALATING', '\u062A\u0635\u0627\u0639\u062F')}
          </span>
        )}
      </div>
      <div className="flex items-end gap-px h-14 bg-white/[0.02] rounded border border-white/[0.04] p-1 overflow-x-auto" data-testid="timeline-bars">
        {buckets.map((b, i) => {
          const isCluster = b.alerts.length >= 5;
          const isSelected = selectedBucket === i;
          return (
            <button
              key={i}
              className={`flex-shrink-0 w-1.5 flex flex-col items-stretch justify-end rounded-sm transition-all cursor-pointer hover:opacity-100 ${isSelected ? 'ring-1 ring-primary' : ''} ${isCluster ? 'ring-1 ring-red-500/50' : ''}`}
              style={{ height: '100%', opacity: b.alerts.length > 0 ? 1 : 0.3 }}
              onClick={() => setSelectedBucket(isSelected ? null : i)}
              title={`${new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${b.alerts.length} alerts`}
              data-testid={`timeline-bucket-${i}`}
            >
              {Object.entries(b.byType).map(([type, count]) => (
                <div
                  key={type}
                  className={`w-full rounded-sm ${THREAT_COLORS[type] || 'bg-red-500'} opacity-70`}
                  style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
                />
              ))}
              {b.alerts.length === 0 && <div className="w-full h-[2px] bg-white/10 rounded-sm" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[9px] font-mono text-foreground/30">
        <span>{t('24h ago', '\u0642\u0628\u0644 24 \u0633\u0627\u0639\u0629')}</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span>{t('Now', '\u0627\u0644\u0622\u0646')}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(THREAT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${color}`} />
            <span className="text-[9px] font-mono text-foreground/40 uppercase">{type.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
      {selectedBucket !== null && selectedAlerts.length > 0 && (
        <div className="border border-white/[0.06] rounded bg-white/[0.02] p-2 space-y-1 max-h-32 overflow-y-auto" data-testid="timeline-detail">
          <span className="text-[9px] font-mono text-foreground/40">{new Date(buckets[selectedBucket].start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {selectedAlerts.length} {t('alerts', '\u0625\u0646\u0630\u0627\u0631\u0627\u062A')}</span>
          {selectedAlerts.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${a.resolved ? 'bg-emerald-500/50' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[10px] font-mono text-foreground/70">{a.city}</span>
              <span className="text-[9px] font-mono text-foreground/30 uppercase">{a.threatType.replace(/_/g, ' ')}</span>
              <span className="text-[9px] font-mono text-foreground/20 ml-auto">{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GodEyeReplayPanel({ language, onClose, onMaximize, isMaximized }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const SEVEN_DAYS_AGO = Date.now() - 7 * 24 * 3600 * 1000;
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [replayData, setReplayData] = useState<{ events: ConflictEvent[]; alerts: RedAlert[] } | null>(null);
  const [replayTime, setReplayTime] = useState(SEVEN_DAYS_AGO);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(300);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/replay-data')
      .then(r => r.json())
      .then(data => {
        setReplayData(data);
        if (data.events.length > 0) {
          setReplayTime(new Date(data.events[0].timestamp).getTime());
        }
      })
      .catch(() => setReplayData({ events: [], alerts: [] }));
  }, []);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setReplayTime(prev => {
        const next = prev + speed * 1000;
        if (next >= Date.now()) { setPlaying(false); return Date.now(); }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  const eventCountAtTime = replayData
    ? replayData.events.filter(e => new Date(e.timestamp).getTime() <= replayTime).length
    : 0;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-godseye">
      <div className="panel-drag-handle h-6 px-2.5 flex items-center gap-1.5 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(225 28% 3.5%)', borderBottom:'1px solid hsl(225 18% 9%)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/30" />
        <Eye className="w-3 h-3 text-primary/50 shrink-0" />
        <span className="text-[9px] font-mono font-bold text-foreground/45 tracking-[0.18em] uppercase">{t("God's Eye", 'عين الله')}</span>
        <span className="text-[8px] text-primary/40 font-mono">REPLAY</span>
        <div className="flex-1" />
        <span className="text-[9px] font-mono text-foreground/40">{eventCountAtTime} {t('events', 'أحداث')}</span>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="flex-1 relative min-h-0">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-foreground/30 text-[10px] font-mono">LOADING MAP...</div>}>
          <GodEyeMap
            events={replayData?.events ?? []}
            alerts={replayData?.alerts ?? []}
            replayTime={replayTime}
            playing={playing}
          />
        </Suspense>
        <div className="absolute top-2 left-2 z-[1000] bg-black/80 rounded px-2 py-1 pointer-events-none">
          <span className="text-[10px] font-mono text-primary">{new Date(replayTime).toUTCString()}</span>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2 border-t border-white/[0.04] space-y-1.5" style={{background:'hsl(225 30% 3%)'}}>
        <input
          type="range"
          min={SEVEN_DAYS_AGO}
          max={Date.now()}
          value={replayTime}
          onChange={e => { setPlaying(false); setReplayTime(Number(e.target.value)); }}
          className="w-full h-1 accent-primary"
          style={{cursor:'pointer'}}
        />
        <div className="flex justify-between text-[8px] text-foreground/25 font-mono">
          <span>7D AGO</span>
          <span>NOW</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPlaying(false); setReplayTime(SEVEN_DAYS_AGO); }}
            className="text-[10px] text-foreground/40 hover:text-foreground/70 px-1"
            title="Rewind"
          >⏮</button>
          <button
            onClick={() => setPlaying(p => !p)}
            className="px-3 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold transition-colors"
          >
            {playing ? '⏸ PAUSE' : '▶ PLAY'}
          </button>
          <div className="flex gap-0.5 ml-auto">
            {([60, 300, 900, 3600] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[8px] px-1.5 py-0.5 rounded font-mono transition-colors ${speed === s ? 'bg-primary/20 text-primary' : 'text-foreground/30 hover:text-foreground/60'}`}
              >
                {s === 60 ? '1×' : s === 300 ? '5×' : s === 900 ? '15×' : '60×'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelSidebar({
  visiblePanels,
  openPanel,
  closePanel,
  language,
  panelStats,
  connected,
  aiBrief,
}: {
  visiblePanels: Record<PanelId, boolean>;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  language: 'en' | 'ar';
  panelStats: Partial<Record<PanelId, string | number>>;
  connected: boolean;
  aiBrief: import('@shared/schema').AIBrief | null;
}) {
  const topGroup: PanelId[] = ['map', 'alerts', 'intel', 'telegram', 'livefeed'];
  const bottomGroup: PanelId[] = ['events', 'radar', 'adsb', 'markets', 'seismic', 'cyber', 'alertmap', 'analytics', 'xfeed', 'godseye'];

  const AI_MODELS = [
    { key: 'gpt-4.1',  label: 'GPT-4.1',  color: 'bg-emerald-400' },
    { key: 'claude',   label: 'CLAUDE',    color: 'bg-sky-400' },
    { key: 'gemini',   label: 'GEMINI',    color: 'bg-violet-400' },
    { key: 'grok',     label: 'GROK',      color: 'bg-amber-400' },
  ];

  const renderBtn = (id: PanelId) => {
    const cfg = PANEL_CONFIG[id];
    if (!cfg) return null;
    const Icon = cfg.icon;
    const active = visiblePanels[id];
    const stat = panelStats[id];
    return (
      <button
        key={id}
        onClick={() => active ? closePanel(id) : openPanel(id)}
        className={`w-full h-8 flex items-center gap-2.5 px-3 relative transition-colors duration-100 border-r-2 group
          ${active
            ? 'text-primary border-primary'
            : 'text-foreground/25 hover:text-foreground/60 border-transparent hover:bg-white/[0.02]'
          }`}
        style={active ? {background:'hsl(36 100% 50% / 0.05)'} : undefined}
        data-testid={`sidebar-panel-${id}`}
        title={active ? `Hide ${cfg.label}` : `Show ${cfg.label}`}
      >
        <Icon className="w-3 h-3 shrink-0" />
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider flex-1 text-left leading-none truncate">
          {language === 'en' ? cfg.label : cfg.labelAr}
        </span>
        {stat !== undefined && stat !== '' && (
          <span className={`text-[7px] font-mono tabular-nums shrink-0 ${active ? 'text-primary/50' : 'text-foreground/20'}`}>
            {stat}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col shrink-0 border-r border-white/[0.06] overflow-y-auto overflow-x-hidden"
      style={{ width: 220, background: 'hsl(225 30% 2.5%)' }}
    >
      {/* PANELS section */}
      <div className="px-3 pt-3 pb-1.5">
        <span className="text-[7px] font-mono font-bold text-foreground/20 tracking-[0.25em] uppercase">◈ PANELS</span>
      </div>
      <div className="flex flex-col">
        {topGroup.map(renderBtn)}
      </div>
      <div className="mx-3 my-1.5 h-px bg-white/[0.04]" />
      <div className="flex flex-col">
        {bottomGroup.map(renderBtn)}
      </div>

      {/* AI MODELS section */}
      <div className="mt-auto">
        <div className="mx-3 my-1.5 h-px bg-white/[0.04]" />
        <div className="px-3 pt-1 pb-1.5">
          <span className="text-[7px] font-mono font-bold text-foreground/20 tracking-[0.25em] uppercase">◈ AI MODELS</span>
        </div>
        <div className="flex flex-col pb-2">
          {AI_MODELS.map(m => {
            const isReady = connected;
            return (
              <div key={m.key} className="flex items-center gap-2.5 px-3 h-7">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isReady ? m.color : 'bg-foreground/10'}`}
                  style={isReady ? {boxShadow:`0 0 4px currentColor`} : undefined} />
                <span className="text-[8px] font-mono text-foreground/35 flex-1 uppercase tracking-wider">{m.label}</span>
                <span className={`text-[7px] font-mono font-bold ${isReady ? 'text-emerald-400/50' : 'text-foreground/15'}`}>
                  {isReady ? 'READY' : 'OFF'}
                </span>
              </div>
            );
          })}
          {aiBrief && (
            <div className="mx-3 mt-1 px-2 py-1 rounded-none" style={{background:'hsl(36 100% 50% / 0.05)', border:'1px solid hsl(36 100% 50% / 0.12)'}}>
              <div className="text-[7px] font-mono text-foreground/30 uppercase tracking-widest mb-0.5">Risk Level</div>
              <div className={`text-[9px] font-mono font-bold ${
                aiBrief.riskLevel === 'EXTREME' ? 'text-red-400' :
                aiBrief.riskLevel === 'HIGH' ? 'text-orange-400' :
                aiBrief.riskLevel === 'ELEVATED' ? 'text-yellow-400' : 'text-emerald-400'
              }`}>{aiBrief.riskLevel}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

declare const L: any;

function LiveFlightTracker({ flight, allFlights, language, onClose }: {
  flight: { callsign: string; lat: number; lng: number; heading: number; altitude: number; speed: number; type: string; source: 'radar' | 'adsb' };
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
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const planeIcon = L.divIcon({
        className: 'live-plane-icon',
        html: `<div style="transform:rotate(${flight.heading}deg);font-size:24px;filter:drop-shadow(0 0 6px rgba(0,200,255,0.7));color:#00d4ff;line-height:1;">✈</div>`,
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
      html: `<div style="transform:rotate(${liveData.heading}deg);font-size:24px;filter:drop-shadow(0 0 6px rgba(0,200,255,0.7));color:#00d4ff;line-height:1;transition:transform 0.5s ease;">✈</div>`,
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose} data-testid="popup-map-overlay">
      <div className="relative w-[92vw] max-w-[800px] h-[70vh] max-h-[600px] rounded-lg border border-cyan-500/20 bg-[#080c14] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} data-testid="popup-map-container">
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 py-2 bg-[#080c14]/95 border-b border-cyan-500/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-cyan-300">{language === 'en' ? 'LIVE TRACKING' : 'تتبع مباشر'}</span>
            </div>
            <span className={`text-sm font-mono font-bold ${typeColor}`}>{liveData.callsign}</span>
            <span className="text-[10px] font-mono text-foreground/30 uppercase">{liveData.type}</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-white/[0.08] transition-colors" data-testid="button-close-popup-map">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center gap-4 px-3 py-2 bg-[#080c14]/95 border-t border-cyan-500/15">
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
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{Math.round(liveData.heading)}° {compass}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">POS</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{liveData.lat.toFixed(4)}, {liveData.lng.toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400/70">{language === 'en' ? 'LIVE' : 'مباشر'}</span>
          </div>
        </div>
        <div ref={mapRef} className="absolute inset-0 w-full h-full" data-testid="popup-map-leaflet" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<WARROOMSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('map');
  const [showMobilePanelPicker, setShowMobilePanelPicker] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1200);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const defaultVisible = { intel: true, map: true, telegram: true, events: true, radar: true, adsb: true, alerts: true, markets: true, seismic: false, cyber: false, livefeed: true, alertmap: true, analytics: false, xfeed: true, godseye: false };
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state') || '{}');
      if (saved.visiblePanels) return { ...defaultVisible, ...saved.visiblePanels };
    } catch {}
    return defaultVisible;
  });
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return localStorage.getItem('warroom_notif_enabled') !== 'false';
    }
    return false;
  });
  const [showNotes, setShowNotes] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showLayoutPresets, setShowLayoutPresets] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<PanelId>('map');
  const [savedPresets, setSavedPresets] = useState<LayoutPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_layouts') || '[]');
      return [...BUILT_IN_PRESETS, ...saved];
    } catch { return [...BUILT_IN_PRESETS]; }
  });
  const [gridLayout, setGridLayout] = useState<GridItemLayout[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_grid_layout_v2') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        const defaults = new Map(DEFAULT_GRID_LAYOUT.map(d => [d.i, d]));
        return saved.map((item: GridItemLayout) => {
          const def = defaults.get(item.i);
          if (def) return { ...item, minW: def.minW, minH: def.minH };
          return item;
        });
      }
    } catch {}
    return DEFAULT_GRID_LAYOUT;
  });

  const sse = useSSE();
  const { news, commodities, events, flights, ships, sirens, redAlerts, adsbFlights, aiBrief, telegramMessages, earthquakes, cyberEvents, thermalHotspots, xPosts, connected } = sse;

  const [mapFocusLocation, setMapFocusLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [popupTrackFlight, setPopupTrackFlight] = useState<{ callsign: string; lat: number; lng: number; heading: number; altitude: number; speed: number; type: string; source: 'radar' | 'adsb' } | null>(null);

  const anomalies = useAnomalyDetection(redAlerts, sirens, flights, commodities, telegramMessages);

  const panelPersistTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleGridLayoutChange = useCallback((newLayout: GridLayout2) => {
    setGridLayout(prev => {
      const updated = new Map(prev.map(item => [item.i, item]));
      for (const item of newLayout) {
        updated.set(item.i, item as GridItemLayout);
      }
      const merged = Array.from(updated.values());
      localStorage.setItem('warroom_grid_layout_v2', JSON.stringify(merged));
      return merged;
    });
  }, []);

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
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked by your browser.\nTo enable: click the lock icon in the address bar → Notifications → Allow.');
      return;
    }
    if (!notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('warroom_notif_enabled', 'true');
          sendNotification('🔔 WARROOM Notifications Active', 'You will receive alerts for red alerts, sirens, and breaking news.', 'warroom-init');
        }
      });
    } else {
      setNotificationsEnabled(prev => {
        localStorage.setItem('warroom_notif_enabled', String(!prev));
        return !prev;
      });
    }
  }, [notificationsEnabled]);

  const closedPanels = useMemo(() =>
    (Object.keys(visiblePanels) as PanelId[]).filter(k => !visiblePanels[k]),
    [visiblePanels]
  );

  useAlertSound(redAlerts.map(a => ({ id: a.id, threatType: a.threatType })), soundEnabled, settings.silentMode, settings.volume);
  useAlertSound(sirens.map(s => ({ id: s.id, threatType: s.threatType })), soundEnabled, settings.silentMode, settings.volume);
  useDesktopNotifications(redAlerts, sirens, news, notificationsEnabled, settings.notificationLevel);

  const threatLevel = useMemo(() => getThreatLevel(redAlerts.length, sirens.length, settings, redAlerts), [redAlerts, sirens.length, settings]);
  const correlations = useCorrelations(events, redAlerts, sirens, flights);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });

  const topRow: PanelId[] = ['telegram', 'intel', 'map', 'alerts', 'livefeed'];
  const bottomRow: PanelId[] = ['events', 'radar', 'adsb', 'markets', 'seismic', 'cyber', 'alertmap', 'analytics', 'xfeed', 'godseye'];
  const allPanels: PanelId[] = [...topRow, ...bottomRow];
  const activeTop = topRow.filter(id => visiblePanels[id]);
  const activeBottom = bottomRow.filter(id => visiblePanels[id]);
  const panelCount = activeTop.length + activeBottom.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = {
    telegram: 16, intel: 16, map: 36, alerts: 16, livefeed: 16,
    events: 22, radar: 22, adsb: 28, markets: 28,
    seismic: 22, cyber: 22, alertmap: 28, analytics: 28, xfeed: 16, godseye: 36,
  };
  const [colWidths, setColWidths] = useState<Record<PanelId, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state') || '{}');
      if (saved.colWidths) return { ...defaultWidths, ...saved.colWidths };
    } catch {}
    return defaultWidths;
  });
  const [rowSplit, setRowSplit] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state') || '{}');
      if (saved.rowSplit) return saved.rowSplit;
    } catch {}
    return 58;
  });

  useEffect(() => {
    if (panelPersistTimeout.current) clearTimeout(panelPersistTimeout.current);
    panelPersistTimeout.current = setTimeout(() => {
      localStorage.setItem('warroom_panel_state', JSON.stringify({ visiblePanels, colWidths, rowSplit }));
    }, 500);
  }, [visiblePanels, colWidths, rowSplit]);

  const savePreset = useCallback((name: string) => {
    const preset: LayoutPreset = { name, visiblePanels: { ...visiblePanels }, colWidths: { ...colWidths }, rowSplit, gridLayout: [...gridLayout] };
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    customPresets.push(preset);
    localStorage.setItem('warroom_layouts', JSON.stringify(customPresets));
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [visiblePanels, colWidths, rowSplit, gridLayout, savedPresets]);

  const loadPreset = useCallback((preset: LayoutPreset) => {
    setVisiblePanels(preset.visiblePanels);
    setColWidths(preset.colWidths);
    setRowSplit(preset.rowSplit);
    if (preset.gridLayout && preset.gridLayout.length > 0) {
      setGridLayout(preset.gridLayout);
      localStorage.setItem('warroom_grid_layout_v2', JSON.stringify(preset.gridLayout));
    }
    setMaximizedPanel(null);
  }, []);

  const deletePreset = useCallback((name: string) => {
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    localStorage.setItem('warroom_layouts', JSON.stringify(customPresets));
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [savedPresets]);

  const handleExport = useCallback(() => {
    const html = generateExportReport(events, flights, ships, redAlerts, sirens, commodities, adsbFlights, threatLevel, language);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warroom-report-${new Date().toISOString().slice(0, 16).replace(':', '')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [events, flights, ships, redAlerts, sirens, commodities, adsbFlights, threatLevel, language]);

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
    const panel = (() => {
      switch (id) {
        case 'intel':
          return <AIIntelPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} brief={aiBrief} briefLoading={!connected && !aiBrief} anomalies={anomalies} />;
        case 'map':
          return <MapSection events={events} flights={flights} ships={ships} adsbFlights={adsbFlights} redAlerts={redAlerts} thermalHotspots={thermalHotspots} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} focusLocation={mapFocusLocation} />;
        case 'events':
          return <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'radar':
          return (
            <>
              <div className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
                <FlightRadarPanel flights={flights} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onLocateFlight={(lat, lng, callsign, heading, altitude, speed, type) => { setMapFocusLocation({ lat, lng, zoom: 9 }); setPopupTrackFlight({ callsign, lat, lng, heading, altitude, speed, type, source: 'radar' }); }} />
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <MaritimePanel ships={ships} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />
              </div>
            </>
          );
        case 'adsb':
          return <AdsbPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} adsbFlights={adsbFlights} onLocateFlight={(lat, lng, callsign, heading, altitude, speed, type) => { setMapFocusLocation({ lat, lng, zoom: 9 }); setPopupTrackFlight({ callsign, lat, lng, heading, altitude, speed, type, source: 'adsb' }); }} />;
        case 'alerts':
          return <RedAlertPanel alerts={redAlerts} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
        case 'telegram':
          return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'markets':
          return <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'seismic':
          return <SeismicPanel earthquakes={earthquakes} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'cyber':
          return <CyberPanel cyberEvents={cyberEvents} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'livefeed':
          return <LiveFeedPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alertmap':
          return <AlertMapPanel alerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'analytics':
          return <AnalyticsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'xfeed':
          return <XFeedPanel posts={xPosts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'godseye':
          return <GodEyeReplayPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
      }
    })();
    return panel ?? null;
  };

  return (
    <div className="flex flex-col bg-background text-foreground h-screen overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} data-testid="dashboard">
      <header className={`${isMobile ? 'h-10' : isTouchDevice ? 'min-h-[44px]' : 'h-7'} border-b border-white/[0.07] flex items-center justify-between px-2 md:px-4 shrink-0 relative z-50 warroom-header`} style={{background:'hsl(225 30% 2.5%)'}}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <span className={`${isMobile ? 'text-[10px]' : 'text-[11px]'} font-black tracking-[0.3em] text-primary font-mono select-none whitespace-nowrap`}>◈ WARROOM</span>
          <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm hidden sm:flex" style={{background:'linear-gradient(135deg, hsl(0 80% 50% / 0.08), hsl(0 80% 50% / 0.03))', border:'1px solid hsl(0 80% 50% / 0.18)'}}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" style={{boxShadow:'0 0 8px rgb(239 68 68 / 0.7)'}} />
            <span className="text-[7px] text-red-400/90 font-black tracking-[0.25em] uppercase font-mono">LIVE</span>
          </div>
          {isMobile && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm" style={{background:'linear-gradient(135deg, hsl(0 80% 50% / 0.06), transparent)', border:'1px solid hsl(0 80% 50% / 0.12)'}}>
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse-dot" />
              <span className="text-[6px] text-red-400/70 font-black tracking-wider uppercase font-mono">LIVE</span>
            </div>
          )}
          <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge" style={{boxShadow: threatLevel.level === 'CRITICAL' ? '0 0 20px rgb(239 68 68 / 0.2), inset 0 0 20px rgb(239 68 68 / 0.05)' : threatLevel.level === 'HIGH' ? '0 0 15px rgb(249 115 22 / 0.12)' : 'none'}}>
            <ShieldAlert className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${threatLevel.color}`} />
            <span className={`${isMobile ? 'text-[6px]' : 'text-[7px]'} font-black tracking-[0.15em] uppercase font-mono ${threatLevel.color}`}>{threatLevel.level}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center"><LiveClock /></div>
          <div className="w-px h-5 bg-border/30 hidden md:block" />
          {isMobile || isTablet ? (
            <button
              onClick={() => setShowMobileMenu(p => !p)}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
              aria-label="Open menu"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <div className="flex items-center gap-0.5">
              <Button
                size="sm" variant="ghost"
                className={`px-2 h-7 rounded text-[11px] transition-all duration-150
                  ${typeof Notification !== 'undefined' && Notification.permission === 'denied'
                    ? 'text-red-500/70 hover:text-red-400'
                    : notificationsEnabled
                      ? 'text-primary hover:text-primary/80'
                      : 'text-foreground/30 hover:text-foreground/80'}
                  hover:bg-muted/40 active:bg-muted/60`}
                onClick={toggleNotifications}
                data-testid="button-notifications-toggle"
                title={
                  typeof Notification !== 'undefined' && Notification.permission === 'denied'
                    ? 'Notifications blocked — click for instructions'
                    : notificationsEnabled ? 'Notifications ON — click to disable' : 'Enable desktop notifications'
                }
              >
                {typeof Notification !== 'undefined' && Notification.permission === 'denied'
                  ? <BellOff className="w-3.5 h-3.5" />
                  : notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </Button>
              {notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                <Button
                  size="sm" variant="ghost"
                  className="px-1.5 h-7 rounded text-[9px] font-mono font-bold text-foreground/25 hover:text-primary hover:bg-primary/10 transition-all duration-150 tracking-widest"
                  title="Fire a test notification for each type"
                  data-testid="button-test-notification"
                  onClick={() => {
                    sendNotification('🚨 RED ALERT — Tel Aviv', 'MISSILE LAUNCH · Dan Region, Israel', 'test-alert', true);
                    setTimeout(() => sendNotification('🔊 SIREN — Haifa', 'ROCKET FIRE · Northern District', 'test-siren', false), 1500);
                    setTimeout(() => sendNotification('📰 BREAKING — Reuters', 'Test: live news notifications are working', 'test-news', false), 3000);
                  }}
                >
                  TEST
                </Button>
              )}
              <Button size="sm" variant="ghost" className={`px-2 h-7 rounded text-[11px] ${soundEnabled ? 'text-primary' : 'text-foreground/30'} hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150`} onClick={() => setSoundEnabled(p => !p)} data-testid="button-sound-toggle" aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] active:bg-amber-500/15 transition-all duration-150" onClick={() => setShowNotes(true)} data-testid="button-notes" aria-label="Analyst Notes" title="Analyst Notes">
                <StickyNote className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] active:bg-amber-500/15 transition-all duration-150" onClick={() => setShowWatchlist(true)} data-testid="button-watchlist" aria-label="Watchlist" title="Watchlist">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <div className="relative">
                <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-primary hover:bg-primary/[0.08] active:bg-primary/15 transition-all duration-150" onClick={() => setShowLayoutPresets(p => !p)} data-testid="button-layouts" aria-label="Layout Presets" title="Layout Presets">
                  <Layout className="w-3.5 h-3.5" />
                </Button>
                {showLayoutPresets && (
                  <LayoutPresetsDropdown language={language} presets={savedPresets} onLoad={loadPreset} onSave={savePreset} onDelete={deletePreset} onClose={() => setShowLayoutPresets(false)} />
                )}
              </div>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/[0.08] active:bg-emerald-500/15 transition-all duration-150" onClick={handleExport} data-testid="button-export" aria-label="Export Report" title="Export Report">
                <FileDown className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150" onClick={() => setShowSettings(true)} data-testid="button-settings" aria-label="Settings" title="Settings">
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/35 hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150 font-mono text-[10px]" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} data-testid="button-language-toggle" aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
                <Languages className="w-3.5 h-3.5 mr-0.5" />
                {language === 'en' ? '\u0639\u0631\u0628\u064A' : 'EN'}
              </Button>
            </div>
          )}
          <div className="w-px h-4 bg-white/[0.05]" />
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm ${connected ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'}`} role="status" aria-label={connected ? 'Connected to server' : 'Disconnected'} style={{border: connected ? '1px solid hsl(152 72% 38% / 0.15)' : '1px solid hsl(0 80% 55% / 0.15)'}}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-400'}`} style={{boxShadow: connected ? '0 0 6px rgb(34 197 94 / 0.5)' : '0 0 6px rgb(239 68 68 / 0.5)'}} />
            <span className={`text-[8px] font-bold tracking-[0.2em] font-mono hidden sm:inline uppercase ${connected ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {connected ? (language === 'en' ? 'SSE' : '\u0645\u062A\u0635\u0644') : (language === 'en' ? 'OFF' : '\u0645\u0646\u0642\u0637\u0639')}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isMobile && !isTablet && (
          <PanelSidebar
            visiblePanels={visiblePanels}
            openPanel={openPanel}
            closePanel={closePanel}
            language={language}
            connected={connected}
            aiBrief={aiBrief}
            panelStats={{
              map: 'LIVE',
              alerts: redAlerts.length > 0 ? `${redAlerts.length} ACTIVE` : '',
              intel: aiBrief ? aiBrief.riskLevel : 'STANDBY',
              telegram: telegramMessages.length > 0 ? `${telegramMessages.length}` : '',
              livefeed: '',
              events: events.length > 0 ? `${events.length}` : '',
              radar: flights.length > 0 ? `${flights.length}` : '',
              adsb: adsbFlights.length > 0 ? `${adsbFlights.length}` : '',
              markets: commodities.length > 0 ? `${commodities.length}` : '',
              seismic: earthquakes.length > 0 ? `${earthquakes.length}` : '',
              cyber: cyberEvents.length > 0 ? `${cyberEvents.length}` : '',
              alertmap: redAlerts.length > 0 ? `${redAlerts.length}` : '',
              analytics: '',
              xfeed: xPosts.length > 0 ? `${xPosts.length}` : '',
              godseye: '',
            }}
          />
        )}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">

      {showMobileMenu && (isMobile || isTablet) && (
        <div className="border-b border-border/40 bg-card/95 backdrop-blur-md px-3 py-2 flex flex-wrap gap-1.5 shrink-0 z-50" data-testid="mobile-menu">
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { toggleNotifications(); setShowMobileMenu(false); }} aria-label="Notifications"><Bell className="w-4 h-4 mr-1" />Notif</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { setSoundEnabled(p => !p); setShowMobileMenu(false); }} aria-label="Sound"><Volume2 className="w-4 h-4 mr-1" />Sound</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { setShowNotes(true); setShowMobileMenu(false); }} aria-label="Notes"><StickyNote className="w-4 h-4 mr-1" />Notes</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { setShowWatchlist(true); setShowMobileMenu(false); }} aria-label="Watchlist"><Eye className="w-4 h-4 mr-1" />Watch</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { handleExport(); setShowMobileMenu(false); }} aria-label="Export"><FileDown className="w-4 h-4 mr-1" />Export</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { setShowSettings(true); setShowMobileMenu(false); }} aria-label="Settings"><Settings className="w-4 h-4 mr-1" />Settings</Button>
          <Button size="sm" variant="ghost" className="h-10 px-3 text-xs" onClick={() => { setLanguage(language === 'en' ? 'ar' : 'en'); setShowMobileMenu(false); }} aria-label="Language"><Languages className="w-4 h-4 mr-1" />{language === 'en' ? 'AR' : 'EN'}</Button>
        </div>
      )}

      {!isMobile && <TickerBar commodities={commodities} />}

      <SirenBanner sirens={sirens} language={language} />

      <div className="flex-1 min-h-0 overflow-auto" data-testid="resizable-panels">
        {isMobile ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderPanel(mobileActivePanel)}
            </div>
            <div className="shrink-0 border-t border-white/[0.06] flex items-center overflow-x-auto warroom-mobile-tabs" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} data-testid="mobile-tab-bar">
              {(['map', 'alerts', 'telegram', 'events', 'intel', 'markets'] as PanelId[]).map(id => {
                const cfg = PANEL_CONFIG[id];
                const Icon = cfg.icon;
                const isActive = mobileActivePanel === id;
                const hasAlert = id === 'alerts' && redAlerts.length > 0;
                return (
                  <button
                    key={id}
                    onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                    className={`flex-1 min-w-[52px] py-1.5 flex flex-col items-center gap-0.5 transition-colors relative ${isActive ? 'text-primary' : 'text-foreground/30'} ${hasAlert ? 'text-red-400' : ''}`}
                    data-testid={`mobile-tab-${id}`}
                  >
                    {isActive && <div className="absolute top-0 left-2 right-2 h-[2px] bg-primary rounded-b" />}
                    <Icon className="w-4 h-4" />
                    <span className="text-[8px] font-mono font-bold uppercase tracking-wider">{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                    {hasAlert && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                  </button>
                );
              })}
              <button
                onClick={() => setShowMobilePanelPicker(p => !p)}
                className={`min-w-[52px] py-1.5 flex flex-col items-center gap-0.5 transition-colors ${showMobilePanelPicker ? 'text-primary' : 'text-foreground/30'}`}
                data-testid="mobile-tab-more"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-[8px] font-mono font-bold uppercase tracking-wider">{language === 'ar' ? 'المزيد' : 'More'}</span>
              </button>
            </div>
            {showMobilePanelPicker && (
              <div className="absolute bottom-16 left-0 right-0 z-50 bg-background/98 backdrop-blur-xl border-t border-white/[0.08] p-3 grid grid-cols-4 gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }} data-testid="mobile-panel-picker">
                {allPanels.filter(id => !['map', 'alerts', 'telegram', 'events', 'intel', 'markets'].includes(id)).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${mobileActivePanel === id ? 'bg-primary/15 text-primary' : 'text-foreground/40 hover:bg-white/[0.04]'}`}
                      data-testid={`mobile-picker-${id}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] font-mono font-bold">{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : isTablet ? (
          <div className="grid grid-cols-2 gap-0.5 p-0.5 h-full auto-rows-fr" style={{ gridAutoRows: 'minmax(200px, 1fr)' }}>
            {allPanels.filter(id => visiblePanels[id]).map(id => (
              <div
                key={id}
                className={`border border-white/[0.04] bg-background overflow-hidden ${id === 'map' || id === 'alertmap' || id === 'godseye' ? 'col-span-2' : ''}`}
                style={{ minHeight: id === 'map' ? '280px' : '180px' }}
              >
                {renderPanel(id)}
              </div>
            ))}
          </div>
        ) : maximizedPanel && visiblePanels[maximizedPanel] ? (
          <div style={{ height: 'calc(100vh - 120px)' }} className="flex flex-col overflow-hidden">
            {renderPanel(maximizedPanel)}
          </div>
        ) : panelCount === 0 ? (
          <div className="flex items-center justify-center bg-background" style={{ minHeight: 400 }}>
            <div className="text-center">
              <PanelLeft className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground/50 font-medium">{language === 'en' ? 'All panels minimized' : '\u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0635\u063A\u0631\u0629'}</p>
              <p className="text-[10px] text-muted-foreground/30 mt-1">{language === 'en' ? 'Restore panels from the bar below' : '\u0627\u0633\u062A\u0639\u062F \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u0634\u0631\u064A\u0637 \u0623\u062F\u0646\u0627\u0647'}</p>
            </div>
          </div>
        ) : (
          <RGL
            layout={gridLayout.filter(item => visiblePanels[item.i as PanelId])}
            cols={12}
            rowHeight={120}
            onLayoutChange={handleGridLayoutChange}
            draggableCancel="button,input,select,textarea,a,[data-no-drag],canvas,.maplibregl-canvas,.maplibregl-canvas-container,#deck-canvas"
            margin={[2, 2]}
            containerPadding={[2, 2]}
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's']}
            style={{ minHeight: 400 }}
          >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const hasAlertGlow = id === 'alerts' && redAlerts.length > 0;
              return (
                <div
                  key={id}
                  className={`flex flex-col overflow-hidden border border-white/[0.08] cursor-grab active:cursor-grabbing ${hasAlertGlow ? 'ring-1 ring-red-500/40' : ''}`}
                  style={{
                    background: 'hsl(225 27% 4%)',
                    boxShadow: hasAlertGlow
                      ? '0 0 20px rgb(239 68 68 / 0.12), 0 0 0 1px hsl(225 18% 9%)'
                      : '0 0 0 1px hsl(225 18% 9% / 0.5)',
                  }}
                  data-testid={hasAlertGlow ? 'alert-panel-glow' : undefined}
                >
                  <PanelErrorBoundary panelName={PANEL_CONFIG[id]?.label || id}>
                    {renderPanel(id)}
                  </PanelErrorBoundary>
                </div>
              );
            })}
          </RGL>
        )}
      </div>

      {!isMobile && <EventTimeline events={events} language={language} />}

      {!isMobile && <NewsTicker news={news} language={language} />}

      {!isMobile && (
        <div className="h-7 border-t border-white/[0.04] flex items-center px-3 shrink-0 gap-2 overflow-hidden" data-testid="status-bar" style={{background:'linear-gradient(180deg, hsl(225 28% 4%) 0%, hsl(225 30% 3%) 100%)'}}>
          <div className="flex items-center gap-1 px-1.5 py-px rounded-sm" style={{background:'hsl(152 72% 38% / 0.04)', border:'1px solid hsl(152 72% 38% / 0.1)'}}>
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse-dot" style={{boxShadow:'0 0 4px rgb(52 211 153 / 0.5)'}} />
            <span className="text-[8px] text-emerald-400/50 font-mono font-bold tracking-[0.15em]">ONLINE</span>
          </div>
          <div className="w-px h-3 bg-white/[0.04]" />
          <div className="flex items-center gap-2.5 text-[8px] font-mono tabular-nums">
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">SRC</span>12</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">EVT</span>{events.length}</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">FLT</span>{flights.length}</span>
            <span className="text-foreground/15"><span className="text-cyan-400/25 mr-0.5 font-semibold">ADS</span>{adsbFlights.length}</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">VES</span>{ships.length}</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">MKT</span>{commodities.length}</span>
          </div>
          {(redAlerts.length > 0 || sirens.length > 0) && (
            <>
              <div className="w-px h-3 bg-white/[0.05]" />
              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                {redAlerts.length > 0 && (
                  <span className="text-red-400/80 font-bold animate-pulse px-1.5 py-px rounded-sm bg-red-500/[0.08] border border-red-500/15">
                    RED {redAlerts.length}
                  </span>
                )}
                {sirens.length > 0 && (
                  <span className="text-red-400/60 font-bold px-1.5 py-px rounded-sm bg-red-500/[0.05] border border-red-500/10">
                    SRN {sirens.length}
                  </span>
                )}
              </div>
            </>
          )}
          {correlations.length > 0 && (
            <>
              <div className="w-px h-3 bg-white/[0.05]" />
              <div className="flex items-center gap-1 px-1.5 py-px rounded-sm bg-purple-500/[0.05] border border-purple-500/10">
                <Link2 className="w-2.5 h-2.5 text-purple-400/50" />
                <span className="text-[9px] text-purple-400/60 font-mono font-semibold">{correlations.length} CORR</span>
              </div>
            </>
          )}
          <span className="text-[7px] text-foreground/12 font-mono ml-auto hidden sm:inline tracking-[0.15em] font-medium">
            M.M &mdash; WARROOM v2.1
          </span>
        </div>
      )}

      {popupTrackFlight && (
        <LiveFlightTracker
          flight={popupTrackFlight}
          allFlights={popupTrackFlight.source === 'adsb' ? adsbFlights : flights}
          language={language}
          onClose={() => setPopupTrackFlight(null)}
        />
      )}
      {showNotes && <NotesOverlay language={language} onClose={() => setShowNotes(false)} />}
      {showWatchlist && <WatchlistOverlay language={language} onClose={() => setShowWatchlist(false)} onUpdate={setWatchlist} />}
      {showAlertHistory && <AlertHistoryOverlay language={language} onClose={() => setShowAlertHistory(false)} />}
      {showSettings && <SettingsOverlay settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} language={language} />}
        </div>
      </div>
    </div>
  );
}
