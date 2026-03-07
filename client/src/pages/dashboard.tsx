import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, Component, memo, type ErrorInfo, type ReactNode } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { LayoutItem as GridItemLayout, Layout as GridLayout2 } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useLanguage } from '@/components/theme-provider';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  EWEvent,
  InfraEvent,
  ThermalHotspot,
  BreakingNewsItem,
  Sitrep,
  SitrepWindow,
  RocketStats,
  RocketCorridor,
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
  Users,
  Rocket,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';

const ConflictMap = lazy(() => import('@/components/conflict-map'));

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

interface AttackPrediction {
  predictions: Array<{
    region: string;
    threatVector: string;
    probability: number;
    timeframe: string;
    source: string;
    rationale: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
  overallThreatLevel: string;
  escalationVector: string;
  nextLikelyTarget: string;
  confidence: number;
  patternSummary: string;
  generatedAt: string;
  dataPoints: {
    totalAlerts: number;
    velocity30m: number;
    velocity2h: number;
    velocityPerHour: number;
    isEscalating: boolean;
    topRegions: Array<{ region: string; count: number }>;
  };
}

interface SSEData {
  news: NewsItem[];
  commodities: CommodityData[];
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  sirens: SirenAlert[];
  redAlerts: RedAlert[];
  aiBrief: AIBrief | null;
  telegramMessages: TelegramMessage[];
  ewEvents: EWEvent[];
  infraEvents: InfraEvent[];
  thermalHotspots: ThermalHotspot[];
  breakingNews: BreakingNewsItem[];
  attackPrediction: AttackPrediction | null;
  rocketStats: RocketStats | null;
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
  const [aiBrief, setAiBrief] = useState<AIBrief | null>(null);
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [ewEvents, setEwEvents] = useState<EWEvent[]>([]);
  const [infraEvents, setInfraEvents] = useState<InfraEvent[]>([]);
  const [thermalHotspots, setThermalHotspots] = useState<ThermalHotspot[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
  const [attackPrediction, setAttackPrediction] = useState<AttackPrediction | null>(null);
  const [rocketStats, setRocketStats] = useState<RocketStats | null>(null);
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
      es.addEventListener('ai-brief', (e) => {
        try { setAiBrief(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('telegram', (e) => {
        try { setTelegramMessages(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('ew', (e) => {
        try { setEwEvents(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('infra', (e) => {
        try { setInfraEvents(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('thermal', (e) => {
        try { setThermalHotspots(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('breaking-news', (e) => {
        try { setBreakingNews(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('analytics', (e) => {
        try { queryClient.setQueryData(['/api/analytics'], (old: any) => ({ ...old, ...JSON.parse(e.data) })); } catch {}
      });
      es.addEventListener('attack-prediction', (e) => {
        try { setAttackPrediction(JSON.parse(e.data)); } catch {}
      });
      es.addEventListener('rocket-stats', (e) => {
        try { setRocketStats(JSON.parse(e.data)); } catch {}
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

  return { news, commodities, events, flights, ships, sirens, redAlerts, aiBrief, telegramMessages, ewEvents, infraEvents, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected };
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
      style={{ background: isDragging ? undefined : 'linear-gradient(to ' + (direction === 'col' ? 'right' : 'bottom') + ', transparent, hsl(185 60% 8%), transparent)' }}
    >
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-20 -ml-[9px]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-20 -mt-[9px]'} rounded transition-colors ${isDragging ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/5'}`} />
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-10' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-10'} rounded-full transition-all duration-200 ${isDragging ? 'bg-primary shadow-[0_0_8px_hsl(185_100%_42%/0.5)]' : 'bg-transparent group-hover:bg-primary/50'}`} />
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

type PanelId = 'map' | 'events' | 'radar' | 'alerts' | 'markets' | 'intel' | 'telegram' | 'ew' | 'infra' | 'livefeed' | 'alertmap' | 'analytics' | 'osint' | 'sitrep' | 'attackpred' | 'rocketstats';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  intel: { icon: Brain, label: 'AI Intel', labelAr: '\u0630\u0643\u0627\u0621' },
  map: { icon: Target, label: 'Map', labelAr: '\u062E\u0631\u064A\u0637\u0629' },
  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  radar: { icon: Plane, label: 'Radar', labelAr: '\u0631\u0627\u062F\u0627\u0631' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: '\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  markets: { icon: BarChart3, label: 'Markets', labelAr: '\u0623\u0633\u0648\u0627\u0642' },
  ew: { icon: Radio, label: 'Elec. Warfare', labelAr: 'الحرب الإلكترونية' },
  infra: { icon: Zap, label: 'Infrastructure', labelAr: 'البنية التحتية' },
  livefeed: { icon: Video, label: 'Live Feed', labelAr: '\u0628\u062B \u0645\u0628\u0627\u0634\u0631' },
  alertmap: { icon: MapPin, label: 'Alert Map', labelAr: '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  analytics: { icon: BarChart3, label: 'Analytics', labelAr: '\u062A\u062D\u0644\u064A\u0644\u0627\u062A' },
  osint: { icon: Activity, label: 'OSINT Feed', labelAr: 'تغذية OSINT' },
  sitrep: { icon: FileDown, label: 'SITREP', labelAr: 'تقرير الوضع' },
  attackpred: { icon: Crosshair, label: 'Attack Predictor', labelAr: 'توقع الهجوم' },
  rocketstats: { icon: Rocket, label: 'Rocket Stats', labelAr: 'إحصائيات الصواريخ' },
};

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const touchBtnClass = isTouchDevice ? 'w-9 h-9' : 'w-6 h-6';
const touchIconClass = isTouchDevice ? 'w-4 h-4' : 'w-3.5 h-3.5';

function PanelMinimizeButton({ onMinimize }: { onMinimize: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onMinimize(); }}
      className={`${touchBtnClass} rounded flex items-center justify-center text-foreground/40 hover:text-red-400 hover:bg-red-500/15 active:bg-red-500/25 active:scale-95 transition-all duration-100 warroom-panel-close`}
      style={{ border: '1px solid transparent' }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid hsl(0 80% 55% / 0.35)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
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
      className={`${touchBtnClass} rounded flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/15 active:bg-primary/25 active:scale-95 transition-all duration-100 warroom-panel-maximize`}
      style={{ border: '1px solid transparent' }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid hsl(185 100% 42% / 0.35)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
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

// ─── OSINT Timeline ──────────────────────────────────────────────
interface OsintEntry {
  id: string;
  source: 'alert' | 'telegram' | 'event';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  timestamp: string;
  icon: string;
  borderColor: string;
}

const OSINT_SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

function buildOsintEntries(
  alerts: RedAlert[],
  messages: TelegramMessage[],
  events: ConflictEvent[],
  lang: 'en' | 'ar',
): OsintEntry[] {
  const entries: OsintEntry[] = [];
  const THREAT_SEV: Record<string, OsintEntry['severity']> = {
    missiles: 'critical', hostile_aircraft_intrusion: 'critical',
    rockets: 'high', uav_intrusion: 'medium',
  };
  alerts.forEach(a => entries.push({
    id: `alert-${a.id}`,
    source: 'alert',
    severity: THREAT_SEV[a.threatType] || 'high',
    title: `${a.threatType.replace(/_/g, ' ').toUpperCase()} · ${lang === 'ar' ? a.cityAr : a.city}`,
    body: `${a.region} · ${a.country}`,
    timestamp: a.timestamp,
    icon: a.threatType === 'missiles' ? '🎯' : a.threatType === 'uav_intrusion' ? '🛸' : '🚨',
    borderColor: '#ef4444',
  }));
  messages.forEach(m => entries.push({
    id: `tg-${m.id}`,
    source: 'telegram',
    severity: 'medium',
    title: m.channel,
    body: lang === 'ar' && m.textAr ? m.textAr : m.text,
    timestamp: m.timestamp,
    icon: '📡',
    borderColor: '#38bdf8',
  }));
  events.forEach(e => entries.push({
    id: `evt-${e.id}`,
    source: 'event',
    severity: e.severity,
    title: lang === 'ar' && e.titleAr ? e.titleAr : e.title,
    body: lang === 'ar' && e.descriptionAr ? e.descriptionAr : e.description,
    timestamp: e.timestamp,
    icon: e.type === 'missile' ? '🎯' : e.type === 'airstrike' ? '✈️' : e.type === 'nuclear' ? '☢️' : '⚡',
    borderColor: '#f97316',
  }));
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function OsintTimelinePanel({ alerts, messages, events, language, onClose, onMaximize, isMaximized }: {
  alerts: RedAlert[];
  messages: TelegramMessage[];
  events: ConflictEvent[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  type FilterKey = 'all' | 'alert' | 'telegram' | 'event';
  const [filter, setFilter] = useState<FilterKey>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const allEntries = useMemo(
    () => buildOsintEntries(alerts, messages, events, language),
    [alerts, messages, events, language],
  );
  const filtered = useMemo(
    () => filter === 'all' ? allEntries : allEntries.filter(e => e.source === filter),
    [allEntries, filter],
  );

  useEffect(() => {
    if (filtered.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevCountRef.current = filtered.length;
  }, [filtered.length]);

  const relTime = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };

  const filterBtns: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: `ALL (${allEntries.length})` },
    { key: 'alert',    label: `ALERTS (${allEntries.filter(e => e.source === 'alert').length})` },
    { key: 'telegram', label: `SIGINT (${allEntries.filter(e => e.source === 'telegram').length})` },
    { key: 'event',    label: `EVENTS (${allEntries.filter(e => e.source === 'event').length})` },
  ];

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="osint-timeline-panel">
      <div className="px-3 py-2 border-b border-white/[0.05] flex items-center gap-2 shrink-0" style={{background:'hsl(220 28% 13% / 0.92)'}}>
        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/90">OSINT TIMELINE</span>
        <div className="flex-1" />
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <div className="px-2 py-1 border-b border-white/[0.03] flex gap-1 shrink-0 flex-wrap" style={{background:'hsl(220 28% 11% / 0.6)'}}>
        {filterBtns.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wider transition-colors border ${
              filter === key
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'text-muted-foreground/40 hover:text-muted-foreground/70 border-transparent'
            }`}
          >{label}</button>
        ))}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground/25 font-mono">NO ENTRIES</div>
        ) : filtered.map(entry => (
          <div
            key={entry.id}
            className="px-3 py-1.5 border-l-2 hover:bg-white/[0.02] transition-colors"
            style={{ borderLeftColor: entry.borderColor, borderBottom: '1px solid hsl(225 20% 100% / 0.025)' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-[11px] shrink-0 leading-5">{entry.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[8px] px-1 py-px rounded border font-black uppercase shrink-0 ${OSINT_SEVERITY_STYLE[entry.severity]}`}>{entry.severity}</span>
                  <span className="text-[10px] font-bold text-foreground/85 truncate">{entry.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/50 leading-tight line-clamp-2">{entry.body}</p>
              </div>
              <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0 tabular-nums pl-1">{relTime(entry.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Escalation ────────────────────────────────────────────
interface EscalationState {
  level: 'WATCH' | 'WARNING' | 'CRITICAL' | null;
  count: number;
  rate: number;
}

function useEscalation(
  alerts: RedAlert[],
  soundEnabled: boolean,
  notificationsEnabled: boolean,
): EscalationState {
  const WINDOW_MS = 60_000;
  const tsLog = useRef<number[]>([]);
  const prevLevel = useRef<EscalationState['level']>(null);
  const initialized = useRef(false);
  const [state, setState] = useState<EscalationState>({ level: null, count: 0, rate: 0 });

  useEffect(() => {
    const now = Date.now();
    const currentIds = new Set(alerts.map(a => a.id));

    if (!initialized.current) {
      initialized.current = true;
      // Seed log from current alerts timestamps
      alerts.forEach(a => {
        const t = new Date(a.timestamp).getTime();
        if (t > now - WINDOW_MS) tsLog.current.push(t);
      });
    } else {
      // Only add timestamps for genuinely new alerts
      alerts.forEach(a => {
        const t = new Date(a.timestamp).getTime();
        if (t > now - WINDOW_MS) tsLog.current.push(t);
      });
    }

    // Prune outside window
    tsLog.current = tsLog.current.filter(t => t > now - WINDOW_MS);
    const count = tsLog.current.length;
    const rate = Math.round(count); // alerts in last 60s ≈ per-minute rate

    let level: EscalationState['level'] = null;
    if (count >= 15)     level = 'CRITICAL';
    else if (count >= 8) level = 'WARNING';
    else if (count >= 3) level = 'WATCH';

    const LEVELS = [null, 'WATCH', 'WARNING', 'CRITICAL'] as const;
    const prevL = prevLevel.current;
    const isEscalating = LEVELS.indexOf(level) > LEVELS.indexOf(prevL);

    if (isEscalating && level) {
      if (soundEnabled) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          const t = ctx.currentTime;
          const beeps = level === 'CRITICAL' ? 5 : level === 'WARNING' ? 3 : 2;
          const freq = level === 'CRITICAL' ? 1100 : level === 'WARNING' ? 880 : 660;
          for (let i = 0; i < beeps; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.06, t + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.14);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.15);
          }
        } catch {}
      }
      if (notificationsEnabled) {
        const emoji = level === 'CRITICAL' ? '🔴' : level === 'WARNING' ? '🟠' : '🟡';
        sendNotification(
          `${emoji} ESCALATION — ${level}`,
          `${count} alerts in the last 60 seconds`,
          `escalation-${level}`,
          level === 'CRITICAL',
        );
      }
    }

    prevLevel.current = level;
    setState({ level, count, rate });
  }, [alerts, soundEnabled, notificationsEnabled]);

  return state;
}

function EscalationBanner({ state, onDismiss }: { state: EscalationState; onDismiss: () => void }) {
  if (!state.level) return null;
  const cfg = {
    CRITICAL: {
      shimmerFrom: 'rgba(200,20,20,0.0)',
      shimmerMid: 'rgba(220,30,30,0.15)',
      bg: 'hsl(0 85% 10% / 0.97)',
      border: 'hsl(0 85% 50% / 0.7)',
      topBorder: 'hsl(0 85% 55% / 0.9)',
      dot: 'bg-red-400',
      text: 'text-red-200',
      sub: 'text-red-400/70',
      label: '⚠ CRITICAL ESCALATION',
      badge: 'bg-red-500/20 border-red-500/40 text-red-300',
    },
    WARNING: {
      shimmerFrom: 'rgba(180,80,0,0.0)',
      shimmerMid: 'rgba(200,90,0,0.12)',
      bg: 'hsl(28 85% 9% / 0.97)',
      border: 'hsl(28 85% 48% / 0.55)',
      topBorder: 'hsl(28 85% 52% / 0.8)',
      dot: 'bg-orange-400',
      text: 'text-orange-200',
      sub: 'text-orange-400/70',
      label: '▲ WARNING — HIGH ALERT RATE',
      badge: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
    },
    WATCH: {
      shimmerFrom: 'rgba(150,120,0,0.0)',
      shimmerMid: 'rgba(160,130,0,0.10)',
      bg: 'hsl(48 65% 8% / 0.97)',
      border: 'hsl(48 85% 48% / 0.4)',
      topBorder: 'hsl(48 85% 52% / 0.65)',
      dot: 'bg-yellow-400',
      text: 'text-yellow-200',
      sub: 'text-yellow-400/70',
      label: '● WATCH — ACTIVITY SURGE',
      badge: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    },
  }[state.level];
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 shrink-0 z-40 relative overflow-hidden"
      style={{
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
        borderTop: `2px solid ${cfg.topBorder}`,
      }}
      role="alert"
      data-testid="escalation-banner"
    >
      {/* shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none escalation-shimmer"
        style={{ background: `linear-gradient(90deg, ${cfg.shimmerFrom} 0%, ${cfg.shimmerMid} 50%, ${cfg.shimmerFrom} 100%)` }}
      />
      <div className="relative flex items-center gap-3 w-full">
        <div className="relative shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} style={{ boxShadow: `0 0 8px currentColor` }} />
          <div className={`absolute inset-0 rounded-full ${cfg.dot} alert-dot-ping`} />
        </div>
        <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${cfg.badge}`}>
          {state.count}/min
        </span>
        <div className="flex-1" />
        <button
          onClick={onDismiss}
          className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border transition-all ${cfg.badge} hover:opacity-80`}
          data-testid="button-dismiss-escalation"
        >✕ DISMISS</button>
      </div>
    </div>
  );
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
    visiblePanels: { intel: true, map: true, telegram: true, events: true, radar: true, alerts: true, markets: true, ew: false, infra: false, livefeed: true, alertmap: true, analytics: true, osint: false, sitrep: false },
    colWidths: { telegram: 16, intel: 16, map: 36, alerts: 16, livefeed: 16, events: 22, radar: 22, markets: 28, ew: 22, infra: 22, alertmap: 28, analytics: 28, osint: 28, sitrep: 28 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { intel: false, map: true, telegram: false, events: false, radar: true, alerts: false, markets: true, ew: false, infra: false, livefeed: false, alertmap: false, analytics: false, osint: false, sitrep: false },
    colWidths: { telegram: 16, intel: 16, map: 60, alerts: 26, livefeed: 20, events: 22, radar: 30, markets: 30, ew: 22, infra: 22, alertmap: 28, analytics: 28, osint: 28, sitrep: 28 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { intel: false, map: true, telegram: false, events: true, radar: true, alerts: true, markets: false, ew: false, infra: false, livefeed: false, alertmap: true, analytics: false, osint: false, sitrep: false },
    colWidths: { telegram: 16, intel: 16, map: 50, alerts: 50, livefeed: 20, events: 25, radar: 25, markets: 28, ew: 22, infra: 22, alertmap: 28, analytics: 28, osint: 28, sitrep: 28 },
    rowSplit: 55,
  },
  {
    name: 'Mobile',
    visiblePanels: { intel: false, map: true, telegram: true, events: false, radar: false, alerts: true, markets: false, ew: false, infra: false, livefeed: true, alertmap: false, analytics: false, osint: false, sitrep: false },
    colWidths: { telegram: 100, intel: 100, map: 100, alerts: 100, livefeed: 100, events: 100, radar: 100, markets: 100, ew: 100, infra: 100, alertmap: 100, analytics: 100, osint: 100, sitrep: 100 },
    rowSplit: 50,
  },
];

const RGL = WidthProvider(GridLayout);

const DEFAULT_GRID_LAYOUT: GridItemLayout[] = [
  // Row 1 — PRIORITY: Red Alerts + Telegram + Map  (y=0, h=9 = 720px)
  { i: 'alerts',    x: 0, y: 0,  w: 4, h: 9, minW: 2, minH: 4 },
  { i: 'telegram',  x: 4, y: 0,  w: 4, h: 9, minW: 2, minH: 3 },
  { i: 'map',       x: 8, y: 0,  w: 4, h: 9, minW: 3, minH: 3 },
  // Row 2 — Intel + LiveFeed + Events + Radar  (y=9, h=5)
  { i: 'intel',     x: 0, y: 9,  w: 3, h: 5, minW: 2, minH: 2 },
  { i: 'livefeed',  x: 3, y: 9,  w: 3, h: 5, minW: 2, minH: 2 },
  { i: 'events',    x: 6, y: 9,  w: 3, h: 5, minW: 2, minH: 2 },
  { i: 'radar',     x: 9, y: 9,  w: 3, h: 5, minW: 2, minH: 2 },
  // Row 3 — AlertMap & Markets  (y=14, h=4)
  { i: 'alertmap',  x: 0, y: 14, w: 6, h: 4, minW: 2, minH: 2 },
  { i: 'markets',   x: 6, y: 14, w: 6, h: 4, minW: 2, minH: 2 },
  // Row 4 — Analysis  (y=18, h=4)
  { i: 'ew',        x: 0, y: 18, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'infra',     x: 4, y: 18, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'analytics', x: 4, y: 18, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'osint',     x: 8, y: 18, w: 4, h: 4, minW: 3, minH: 2 },
  { i: 'attackpred', x: 0, y: 22, w: 4, h: 6, minW: 2, minH: 3 },
  { i: 'rocketstats', x: 4, y: 22, w: 4, h: 6, minW: 2, minH: 3 },
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
    return history.filter(a => (a.city || '').toLowerCase().includes(q) || (a.country || '').toLowerCase().includes(q) || (a.threatType || '').toLowerCase().includes(q));
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
                  <span className="text-xs text-muted-foreground/60 font-mono uppercase">{(a.threatType || 'unknown').replace(/_/g, ' ')}</span>
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
    <div className="h-6 border-t border-white/[0.03] relative flex items-center px-4 shrink-0" data-testid="event-timeline" style={{background:'hsl(220 28% 13% / 0.83)'}}>
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

const LiveClock = memo(function LiveClock() {
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
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm" style={{background:'hsl(220 28% 13% / 0.8)', border:'1px solid hsl(185 80% 50% / 0.1)', boxShadow:'0 0 8px hsl(185 100% 42% / 0.04)'}}>
        <span className="text-[11px] text-primary/80 font-mono font-bold tabular-nums tracking-[0.1em]">{formatted}</span>
        <span className="text-[7px] text-primary/30 font-mono font-bold tracking-[0.2em]">UTC</span>
      </div>
    </div>
  );
});

function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

const TickerBar = memo(function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-7 border-b border-white/[0.04]" style={{background:'hsl(220 28% 13% / 0.75)'}} />;
  const items = useMemo(() => [...commodities, ...commodities, ...commodities], [commodities]);

  return (
    <div className="h-8 border-b border-white/[0.04] overflow-hidden relative shrink-0" data-testid="ticker-bar" style={{background:'hsl(220 28% 13% / 0.88)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'}}>
      <div className="absolute inset-y-0 left-0 w-16 z-10 flex items-center gap-1 pl-3" style={{background:'linear-gradient(90deg, hsl(220 28% 13% / 0.95) 60%, transparent)'}}>
        <span className="text-[8px] font-black tracking-[0.3em] text-primary/40 font-mono">MKT</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-12 z-10" style={{background:'linear-gradient(270deg, hsl(220 28% 13% / 0.95) 30%, transparent)'}} />
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
});

const THREAT_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  rocket: { en: 'ROCKET FIRE', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E', icon: '\u{1F680}' },
  missile: { en: 'MISSILE LAUNCH', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E', icon: '\u{1F4A5}' },
  uav: { en: 'HOSTILE UAV', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0633\u064A\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u2708\uFE0F' },
  hostile_aircraft: { en: 'HOSTILE AIRCRAFT', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u26A0\uFE0F' },
};

function SirenBanner({ sirens, breakingNews = [], language, hidden }: { sirens: SirenAlert[]; breakingNews?: BreakingNewsItem[]; language: 'en' | 'ar'; hidden?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const activeSirens = sirens.filter(s => {
    const ts = new Date(s.timestamp).getTime();
    if (isNaN(ts)) return false;
    const age = Date.now() - ts;
    return s.active || age < 120_000;
  });

  const hasContent = activeSirens.length > 0 || breakingNews.length > 0;
  if (!hasContent || hidden) return null;

  const hasSirens = activeSirens.length > 0;
  const hasCritical = breakingNews.some(b => b.severity === 'critical');

  const sortedSirens = [...activeSirens].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const sortedBreaking = [...breakingNews].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const bgStyle = hasSirens
    ? {background:'linear-gradient(90deg, hsl(0 40% 8% / 0.6), hsl(0 30% 5% / 0.3), hsl(0 40% 8% / 0.6))'}
    : hasCritical
      ? {background:'linear-gradient(90deg, hsl(30 60% 8% / 0.6), hsl(30 40% 5% / 0.3), hsl(30 60% 8% / 0.6))'}
      : {background:'linear-gradient(90deg, hsl(200 40% 8% / 0.5), hsl(200 30% 5% / 0.2), hsl(200 40% 8% / 0.5))'};

  return (
    <div className="border-b border-red-900/20 shrink-0" data-testid="siren-banner" style={bgStyle}>
      <div
        className={`${hasSirens ? 'animate-siren-bg' : ''} flex items-center gap-2 px-4 cursor-pointer select-none`}
        onClick={() => setExpanded(!expanded)}
        data-testid="button-siren-toggle"
      >
        <div className="flex items-center gap-2 py-1 shrink-0">
          {hasSirens ? (
            <>
              <div className="w-4 h-4 rounded-sm flex items-center justify-center animate-siren-flash" style={{background:'hsl(0 80% 50% / 0.15)', border:'1px solid hsl(0 80% 50% / 0.4)'}}>
                <Siren className="w-2.5 h-2.5 text-red-400/90" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400/60 font-mono whitespace-nowrap">
                {language === 'en' ? 'ACTIVE SIRENS' : '\u0635\u0641\u0627\u0631\u0627\u062A \u0646\u0634\u0637\u0629'}
              </span>
              <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-[14px] font-mono font-bold animate-pulse-dot">
                {activeSirens.length}
              </Badge>
            </>
          ) : (
            <>
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${hasCritical ? 'animate-siren-flash' : ''}`} style={{background: hasCritical ? 'hsl(30 80% 50% / 0.15)' : 'hsl(200 60% 50% / 0.1)', border: hasCritical ? '1px solid hsl(30 80% 50% / 0.4)' : '1px solid hsl(200 60% 50% / 0.3)'}}>
                <Zap className={`w-2.5 h-2.5 ${hasCritical ? 'text-amber-400/90' : 'text-cyan-400/80'}`} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-[0.25em] font-mono whitespace-nowrap ${hasCritical ? 'text-amber-400/70' : 'text-cyan-400/50'}`}>
                {language === 'en' ? 'BREAKING' : '\u0639\u0627\u062C\u0644'}
              </span>
              <Badge variant={hasCritical ? 'destructive' : 'secondary'} className="text-[8px] px-1.5 py-0 h-[14px] font-mono font-bold">
                {breakingNews.length}
              </Badge>
            </>
          )}
        </div>

        <div className="flex-1 overflow-hidden min-w-0">
          <div className="flex items-center gap-4 animate-siren-scroll whitespace-nowrap">
            {hasSirens && [...sortedSirens, ...sortedSirens].map((s, i) => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <span key={`siren-${s.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                  <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-red-300 font-bold">
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className="text-red-500/70">{'\u2022'}</span>
                  <span className="text-red-400/80 text-[10px]">
                    {language === 'ar' ? threat.ar : threat.en}
                  </span>
                  <span className="text-red-900/60 mx-1">{'\u2502'}</span>
                </span>
              );
            })}
            {[...sortedBreaking, ...sortedBreaking].map((item, i) => (
              <span key={`brk-${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                {item.severity === 'critical' ? (
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                )}
                <span className={`font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {(item.headline || '').length > 100 ? (item.headline || '').slice(0, 100) + '...' : (item.headline || '')}
                </span>
                <span className="text-foreground/20 text-[9px]">
                  {item.source === 'telegram' ? `TG/${item.channel?.replace('@', '')}` : item.source === 'x' ? `X/${item.channel}` : 'ALERT'}
                </span>
                <span className="text-foreground/10 mx-1">{'\u2502'}</span>
              </span>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className={`text-[10px] px-2 h-6 font-mono shrink-0 ${hasSirens ? 'text-red-400 hover:bg-red-900/30' : hasCritical ? 'text-amber-400 hover:bg-amber-900/20' : 'text-cyan-400 hover:bg-cyan-900/20'}`}
          data-testid="button-siren-expand"
        >
          {expanded ? '\u25B2' : '\u25BC'} {language === 'en' ? 'Details' : '\u062A\u0641\u0627\u0635\u064A\u0644'}
        </Button>
      </div>

      {expanded && (
        <div className={`border-t ${hasSirens ? 'border-red-900/30 bg-red-950/20' : 'border-white/[0.06] bg-card/40'} max-h-[180px] overflow-auto`}>
          {sortedSirens.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-red-900/20">
              {sortedSirens.map((s) => {
                const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
                return (
                  <div key={s.id} className="px-3 py-2 bg-background/80 animate-fade-in" data-testid={`siren-alert-${s.id}`}>
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
          )}
          {sortedBreaking.length > 0 && (
            <div className={`${sortedSirens.length > 0 ? 'border-t border-white/[0.06]' : ''}`}>
              {sortedBreaking.map((item) => (
                <div key={item.id} className="px-4 py-2 border-b border-white/[0.04] animate-fade-in" data-testid={`breaking-${item.id}`}>
                  <div className="flex items-center gap-2">
                    {item.severity === 'critical' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span className={`text-[11px] font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-cyan-300'}`}>
                      {item.headline}
                    </span>
                    <span className="text-[9px] text-foreground/30 font-mono ml-auto shrink-0 tabular-nums">
                      {timeAgo(item.timestamp)} {'\u2022'} {item.source === 'telegram' ? `TG` : item.source === 'x' ? 'X' : 'SYS'}/{item.channel?.replace('@', '') || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PanelHeader = memo(function PanelHeader({
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
    <div className="panel-drag-handle h-10 px-3 flex items-center gap-2.5 shrink-0 relative cursor-grab active:cursor-grabbing select-none" style={{background:'hsl(220 26% 16% / 0.9)', borderBottom:'1px solid hsl(185 40% 36% / 0.12)'}}>
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{background:'linear-gradient(90deg, transparent, hsl(185 100% 42% / 0.18) 20%, hsl(185 100% 42% / 0.28) 50%, hsl(185 100% 42% / 0.18) 80%, transparent)'}} />
      <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-primary/55 shrink-0" style={{filter:'drop-shadow(0 0 4px hsl(185 100% 42% / 0.22))'}}>{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60 font-mono leading-none">{title}</span>
      {count !== undefined && (
        <span className="text-[9px] font-mono text-foreground/30 tabular-nums leading-none bg-white/[0.05] px-1.5 py-0.5 rounded-full border border-white/[0.07]">
          {count}
        </span>
      )}
      {extra}
      <div className="flex-1" />
      {live && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" style={{boxShadow:'0 0 5px hsl(152 80% 45% / 0.55)'}} />
          <span className="text-[8px] uppercase tracking-widest text-emerald-400/65 font-mono font-bold">LIVE</span>
        </div>
      )}
      {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
      {onClose && <PanelMinimizeButton onMinimize={onClose} />}
    </div>
  );
});

// ── Floating Window ──────────────────────────────────────────────────────────
interface FloatState { x: number; y: number; w: number; h: number; z: number }

const FloatingWindow = memo(function FloatingWindow({
  id, title, icon, children, state, onDock, onClose, onFocus,
}: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
  state: FloatState; onDock: () => void; onClose: () => void; onFocus: () => void;
}) {
  const [pos, setPos] = useState({ x: state.x, y: state.y });
  const [size, setSize] = useState({ w: state.w, h: state.h });
  const drag = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,[data-no-drag]')) return;
    drag.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    onFocus(); e.preventDefault();
  };
  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPos({
      x: Math.max(0, drag.current.ox + e.clientX - drag.current.mx),
      y: Math.max(0, drag.current.oy + e.clientY - drag.current.my),
    });
  };
  const onTitleUp = () => { drag.current = null; };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resize.current = { mx: e.clientX, my: e.clientY, ow: size.w, oh: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation(); e.preventDefault();
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resize.current) return;
    setSize({
      w: Math.max(300, resize.current.ow + e.clientX - resize.current.mx),
      h: Math.max(220, resize.current.oh + e.clientY - resize.current.my),
    });
  };
  const onResizeUp = () => { resize.current = null; };

  return (
    <div
      onPointerDown={onFocus}
      data-testid={`float-window-${id}`}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: size.w, height: size.h, zIndex: state.z,
        display: 'flex', flexDirection: 'column',
        borderRadius: 10, overflow: 'hidden',
        background: 'hsl(220 35% 12% / 0.92)',
        backdropFilter: 'blur(28px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
        border: '1px solid rgba(255,255,255,0.11)',
        boxShadow: '0 28px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
        pointerEvents: 'auto',
      }}
    >
      {/* Title bar — drag handle */}
      <div
        onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={onTitleUp}
        style={{
          height: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
          background: 'hsl(220 35% 15% / 0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          cursor: 'grab', flexShrink: 0, userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', color: 'hsl(185 100% 42% / 0.65)' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', flex: 1 }}>{title}</span>
        <button
          onClick={onDock} data-no-drag title="Dock back to grid"
          style={{ width: 24, height: 24, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(100,180,255,0.08)', border: '1px solid rgba(100,180,255,0.15)', color: 'rgba(100,180,255,0.5)', cursor: 'pointer', flexShrink: 0 }}
        >
          <Minimize2 style={{ width: 11, height: 11 }} />
        </button>
        <button
          onClick={onClose} data-no-drag title="Close"
          style={{ width: 24, height: 24, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(220,50,50,0.09)', border: '1px solid rgba(220,50,50,0.2)', color: 'rgba(230,100,100,0.6)', cursor: 'pointer', flexShrink: 0 }}
        >
          <X style={{ width: 11, height: 11 }} />
        </button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
      {/* Resize handle */}
      <div
        onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 18, height: 18,
          cursor: 'nwse-resize', zIndex: 2,
          background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
          borderRadius: '0 0 10px 0',
        }}
      />
    </div>
  );
});

const CATEGORY_STYLES: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; color: string }> = {
  breaking: { variant: 'destructive', color: 'text-red-400' },
  military: { variant: 'default', color: 'text-orange-400' },
  diplomatic: { variant: 'secondary', color: 'text-blue-400' },
  economic: { variant: 'outline', color: 'text-emerald-400' },
};


const CommodityRow = memo(function CommodityRow({ c, language }: { c: CommodityData; language: 'en' | 'ar' }) {
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
});

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3.5 py-1.5 bg-card/40 border-y border-border/20 flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-primary/35 shrink-0" />
      <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/30 font-bold font-mono">{label}</span>
    </div>
  );
}

const CommoditiesPanel = memo(function CommoditiesPanel({
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
});

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

const FlightRadarPanel = memo(function FlightRadarPanel({ flights, language, onClose, onMaximize, isMaximized, onLocateFlight }: { flights: FlightData[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onLocateFlight?: (lat: number, lng: number, callsign: string, heading: number, altitude: number, speed: number, type: string) => void }) {
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
        <div className="px-3 py-2 border-b border-primary/20 animate-fade-in bg-[transparent] text-[#e9e7e2]" style={{background:'linear-gradient(135deg, hsl(185 100% 42% / 0.06), hsl(220 28% 13% / 0.8))'}} data-testid="flight-detail-card">
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
});


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

const ConflictEventsPanel = memo(function ConflictEventsPanel({ events, language, onClose, onMaximize, isMaximized }: { events: ConflictEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
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
      <div className="px-2 py-1.5 border-b border-white/[0.04]" style={{background:'hsl(220 28% 13% / 0.85)'}}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-none" style={{background:'hsl(220 28% 13% / 0.8)', border:'1px solid hsl(185 80% 50% / 0.1)'}}>
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
});

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
        <div className="px-3 py-2 border-b border-blue-500/20 animate-fade-in" style={{background:'linear-gradient(135deg, hsl(217 91% 60% / 0.06), hsl(220 28% 13% / 0.8))'}} data-testid="ship-detail-card">
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


const CYBER_TYPE_LABELS: Record<string, string> = { ddos: 'DDoS', intrusion: 'INTRU', malware: 'MALWR', phishing: 'PHISH', defacement: 'DEFAC', data_exfil: 'EXFIL', scada: 'SCADA' };
const CYBER_TYPE_COLORS: Record<string, string> = { ddos: 'text-orange-400 bg-orange-950/40 border-orange-500/30', intrusion: 'text-red-400 bg-red-950/40 border-red-500/30', malware: 'text-purple-400 bg-purple-950/40 border-purple-500/30', phishing: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30', defacement: 'text-blue-400 bg-blue-950/40 border-blue-500/30', data_exfil: 'text-red-400 bg-red-950/40 border-red-500/30', scada: 'text-red-400 bg-red-950/40 border-red-500/30' };

// ── Electronic Warfare Panel ──────────────────────────────────────────────────
const EW_TYPE_LABELS: Record<string, string> = {
  gps_jamming:   'GPS JAM',
  gps_spoofing:  'GPS SPOOF',
  comms_jamming: 'COMMS JAM',
  radar_spoofing:'RADAR SPOOF',
  drone_ew:      'DRONE EW',
};
const EW_TYPE_COLORS: Record<string, string> = {
  gps_jamming:   'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  gps_spoofing:  'text-orange-300 bg-orange-500/10 border-orange-500/30',
  comms_jamming: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  radar_spoofing:'text-purple-300 bg-purple-500/10 border-purple-500/30',
  drone_ew:      'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
};

const EWPanel = memo(function EWPanel({ ewEvents, language, onClose, onMaximize, isMaximized }: { ewEvents: EWEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const sevBorder = (s: string) => s === 'critical' ? 'rgb(239 68 68 / 0.55)' : s === 'high' ? 'rgb(249 115 22 / 0.45)' : s === 'medium' ? 'rgb(234 179 8 / 0.35)' : 'transparent';
  const sevText   = (s: string) => s === 'critical' ? 'text-red-400' : s === 'high' ? 'text-orange-400' : s === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
  const active   = ewEvents.filter(e => e.active);
  const inactive = ewEvents.filter(e => !e.active);
  const sorted   = [...active, ...inactive];

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={t('Elec. Warfare', 'الحرب الإلكترونية')}
        icon={<Radio className="w-3.5 h-3.5" />}
        live count={active.length}
        onClose={onClose} onMaximize={onMaximize} isMaximized={isMaximized}
      />

      {/* Summary strip */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.04] flex items-center gap-3" style={{ background: 'hsl(220 30% 16% / 0.6)' }}>
        {[
          { label: t('GPS JAM', 'تشويش GPS'), count: ewEvents.filter(e => e.type === 'gps_jamming').length, color: 'text-yellow-400' },
          { label: t('GPS SPOOF', 'انتحال GPS'), count: ewEvents.filter(e => e.type === 'gps_spoofing').length, color: 'text-orange-400' },
          { label: t('COMMS', 'اتصالات'), count: ewEvents.filter(e => e.type === 'comms_jamming').length, color: 'text-cyan-400' },
          { label: t('ACTIVE', 'نشط'), count: active.length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center">
            <span className={`text-[11px] font-black font-mono ${s.color}`}>{s.count}</span>
            <span className="text-[8px] font-mono text-foreground/30 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {ewEvents.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Radio className="w-5 h-5 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">{t('No EW events detected', 'لا توجد أحداث حرب إلكترونية')}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((ev) => (
          <div key={ev.id} className="px-3 py-2.5 hover-elevate border-l-2 relative" style={{ borderLeftColor: sevBorder(ev.severity), opacity: ev.active ? 1 : 0.55 }}>
            {ev.active && (
              <div className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 6px rgb(239 68 68 / 0.7)' }} />
            )}
            <div className="flex items-center gap-1.5 mb-1 pr-4">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-black font-mono shrink-0 ${EW_TYPE_COLORS[ev.type] || 'text-foreground/50 bg-muted border-border'}`}>
                {EW_TYPE_LABELS[ev.type] || ev.type.toUpperCase()}
              </span>
              <span className="text-[11px] font-bold font-mono text-foreground/80 truncate flex-1">{ev.country}</span>
              <span className={`text-[9px] font-mono font-bold shrink-0 ${sevText(ev.severity)}`}>{ev.severity.toUpperCase()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2 mb-1.5">{ev.description}</p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/30">
              <span>{ev.radiusKm} km radius</span>
              <span>·</span>
              <span>{ev.affectedSystems.join(' / ')}</span>
              <span className="ml-auto">{timeAgo(ev.timestamp)}</span>
            </div>
            <div className="text-[9px] font-mono text-foreground/20 mt-0.5">{t('SRC', 'مصدر')}: {ev.source}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Infrastructure Attacks Panel ──────────────────────────────────────────────
const INFRA_TYPE_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  power:    { en: 'POWER',    ar: 'طاقة',    icon: '⚡' },
  water:    { en: 'WATER',    ar: 'مياه',    icon: '💧' },
  hospital: { en: 'HOSPITAL', ar: 'مستشفى',  icon: '🏥' },
  bridge:   { en: 'BRIDGE',   ar: 'جسر',     icon: '🌉' },
  port:     { en: 'PORT',     ar: 'ميناء',   icon: '⚓' },
  fuel:     { en: 'FUEL',     ar: 'وقود',    icon: '🛢' },
  telecom:  { en: 'TELECOM',  ar: 'اتصالات', icon: '📡' },
  airport:  { en: 'AIRPORT',  ar: 'مطار',    icon: '✈' },
};
const INFRA_TYPE_COLORS: Record<string, string> = {
  power:    'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  water:    'text-blue-300   bg-blue-500/10   border-blue-500/30',
  hospital: 'text-red-300    bg-red-500/10    border-red-500/30',
  bridge:   'text-slate-300  bg-slate-500/10  border-slate-500/30',
  port:     'text-cyan-300   bg-cyan-500/10   border-cyan-500/30',
  fuel:     'text-orange-300 bg-orange-500/10 border-orange-500/30',
  telecom:  'text-purple-300 bg-purple-500/10 border-purple-500/30',
  airport:  'text-sky-300    bg-sky-500/10    border-sky-500/30',
};

const InfraPanel = memo(function InfraPanel({ infraEvents, language, onClose, onMaximize, isMaximized }: { infraEvents: InfraEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const sevBorder = (s: string) => s === 'critical' ? 'rgb(239 68 68 / 0.55)' : s === 'high' ? 'rgb(249 115 22 / 0.45)' : 'transparent';
  const sevText   = (s: string) => s === 'critical' ? 'text-red-400' : s === 'high' ? 'text-orange-400' : s === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
  const sorted    = [...infraEvents].sort((a, b) => {
    const o: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (o[a.severity] ?? 4) - (o[b.severity] ?? 4);
  });

  const totalCasualties = infraEvents.reduce((s, e) => s + (e.casualties ?? 0), 0);

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={t('Infrastructure', 'البنية التحتية')}
        icon={<Zap className="w-3.5 h-3.5" />}
        live count={infraEvents.length}
        onClose={onClose} onMaximize={onMaximize} isMaximized={isMaximized}
      />

      {/* Summary strip */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.04] flex items-center gap-3 flex-wrap" style={{ background: 'hsl(220 30% 16% / 0.6)' }}>
        {(['power','water','hospital','telecom'] as const).map(type => {
          const count = infraEvents.filter(e => e.type === type).length;
          const cfg = INFRA_TYPE_LABELS[type];
          return (
            <div key={type} className="flex flex-col items-center">
              <span className="text-[11px] font-black font-mono text-foreground/80">{cfg.icon} {count}</span>
              <span className="text-[8px] font-mono text-foreground/30 uppercase tracking-wider">{t(cfg.en, cfg.ar)}</span>
            </div>
          );
        })}
        {totalCasualties > 0 && (
          <div className="flex flex-col items-center ml-auto">
            <span className="text-[11px] font-black font-mono text-red-400">{totalCasualties}</span>
            <span className="text-[8px] font-mono text-foreground/30 uppercase tracking-wider">{t('CAS', 'ضحايا')}</span>
          </div>
        )}
      </div>

      {infraEvents.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Zap className="w-5 h-5 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">{t('No infrastructure events', 'لا توجد أحداث بنية تحتية')}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03]">
        {sorted.map((ev) => (
          <div key={ev.id} className="px-3 py-2.5 hover-elevate border-l-2" style={{ borderLeftColor: sevBorder(ev.severity) }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-black font-mono shrink-0 ${INFRA_TYPE_COLORS[ev.type] || 'text-foreground/50 bg-muted border-border'}`}>
                {INFRA_TYPE_LABELS[ev.type]?.icon} {t(INFRA_TYPE_LABELS[ev.type]?.en || ev.type, INFRA_TYPE_LABELS[ev.type]?.ar || ev.type)}
              </span>
              <span className="text-[11px] font-bold font-mono text-foreground/80 truncate flex-1">{ev.region}, {ev.country}</span>
              <span className={`text-[9px] font-mono font-bold shrink-0 ${sevText(ev.severity)}`}>{ev.severity.toUpperCase()}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2 mb-1.5">{ev.description}</p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/30">
              {ev.casualties !== undefined && ev.casualties > 0 && (
                <span className="text-red-400/70">{ev.casualties} {t('cas.', 'ضحايا')}</span>
              )}
              <span className="text-foreground/20">{ev.source}</span>
              <span className="ml-auto">{timeAgo(ev.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const RED_ALERT_THREAT_LABELS: Record<string, { en: string; ar: string; he: string }> = {
  rockets: { en: 'Rocket Fire', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E', he: '\u05D9\u05E8\u05D9 \u05E8\u05E7\u05D8\u05D5\u05EA' },
  missiles: { en: 'Missile Launch', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E', he: '\u05D8\u05D9\u05DC \u05D1\u05DC\u05D9\u05E1\u05D8\u05D9' },
  hostile_aircraft_intrusion: { en: 'Hostile Aircraft', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', he: '\u05D7\u05D3\u05D9\u05E8\u05EA \u05DB\u05DC\u05D9 \u05D8\u05D9\u05E1' },
  uav_intrusion: { en: 'UAV Intrusion', ar: '\u0627\u062E\u062A\u0631\u0627\u0642 \u0637\u0627\u0626\u0631\u0629 \u0645\u0633\u064A\u0631\u0629', he: '\u05D7\u05D3\u05D9\u05E8\u05EA \u05DB\u05D8\u05DE"\u05D1' },
};

const RED_ALERT_THREAT_COLORS: Record<string, string> = {
  rockets: 'bg-red-600 border-red-500/50',
  missiles: 'bg-orange-600 border-orange-500/50',
  hostile_aircraft_intrusion: 'bg-purple-600 border-purple-500/50',
  uav_intrusion: 'bg-yellow-600 border-yellow-500/50',
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

  const tierStyles: Record<string, React.CSSProperties> = {
    critical: {
      background: 'linear-gradient(135deg, rgba(220,20,20,0.45) 0%, rgba(180,10,10,0.35) 100%)',
      border: '1.5px solid rgba(239,68,68,0.85)',
      color: '#fff',
      boxShadow: '0 0 18px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,120,120,0.15)',
    },
    urgent: {
      background: 'linear-gradient(135deg, rgba(200,40,20,0.32) 0%, rgba(160,20,10,0.24) 100%)',
      border: '1.5px solid rgba(239,68,68,0.55)',
      color: '#fca5a5',
      boxShadow: '0 0 10px rgba(239,68,68,0.25)',
    },
    warning: {
      background: 'linear-gradient(135deg, rgba(140,70,0,0.28) 0%, rgba(100,50,0,0.20) 100%)',
      border: '1.5px solid rgba(245,158,11,0.45)',
      color: '#fcd34d',
      boxShadow: '0 0 8px rgba(245,158,11,0.2)',
    },
    standard: {
      background: 'rgba(100,10,10,0.18)',
      border: '1px solid rgba(239,68,68,0.22)',
      color: 'rgba(255,255,255,0.75)',
    },
    expired: {
      background: 'transparent',
      border: '1px solid rgba(239,68,68,0.08)',
      color: 'rgba(239,68,68,0.22)',
    },
  };

  const isCritical = tier === 'critical';
  const isUrgent = tier === 'urgent';
  const numSize = isCritical ? 24 : isUrgent ? 21 : 19;

  return (
    <div
      className={isCritical ? 'alert-critical-glow alert-countdown-flash' : ''}
      style={{ ...tierStyles[tier], minWidth: 56, borderRadius: 9, padding: '7px 10px', textAlign: 'center', flexShrink: 0, transition: 'all 0.3s ease' }}
      data-testid={`red-alert-countdown-${alert.id}`}
    >
      <div style={{ fontSize: numSize, fontWeight: 900, lineHeight: 1, fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif", letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
        {isImmediate ? '⚡' : remaining > 0 ? `${remaining}` : '—'}
      </div>
      <div style={{ fontSize: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 800, opacity: isCritical ? 0.85 : 0.5 }}>
        {isImmediate ? 'NOW' : remaining > 0 ? 'SEC' : 'EXP'}
      </div>
    </div>
  );
}

const LIVE_CHANNELS = [
  { id: 'aje',     label: 'AJ ENG',   labelAr: 'الجزيرة EN', channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', videoId: 'gCNeDWCI0vo' },
  { id: 'aja',     label: 'AJ AR',    labelAr: 'الجزيرة ع',  channelId: 'UCBvxne3r4hL7GKxufPsOmRg', videoId: 'bNyUyrR0PHo' },
  { id: 'sky',     label: 'SKY AR',   labelAr: 'سكاي عربية', channelId: 'UCdsMKkuVRqTmYKvIiMbZJmA', videoId: 'U--OjmpjF5o' },
  { id: 'france',  label: 'F24 ENG',  labelAr: 'فرانس 24',   channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', videoId: 'NiRIbKwAejk' },
  { id: 'trt',     label: 'TRT',      labelAr: 'تي آر تي',   channelId: 'UC7fWeaHhqgM4Ry-RMpM2YYw', videoId: '' },
] as const;

const LiveFeedPanel = memo(function LiveFeedPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
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
});

const RedAlertPanel = memo(function RedAlertPanel({ alerts, sirens = [], language, onClose, onMaximize, isMaximized, onShowHistory }: { alerts: RedAlert[]; sirens?: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onShowHistory?: () => void }) {
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

  const FLAG_MAP: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Syria: '🇸🇾', Iraq: '🇮🇶', 'Saudi Arabia': '🇸🇦', Yemen: '🇾🇪', UAE: '🇦🇪', Jordan: '🇯🇴', Kuwait: '🇰🇼', Bahrain: '🇧🇭', Qatar: '🇶🇦' };
  const SHORT_NAMES: Record<string, string> = { 'Saudi Arabia': 'KSA', 'United Arab Emirates': 'UAE' };

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="red-alert-panel" style={{ fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" }}>

      {/* ── HEADER ── */}
      <div
        className={hasActiveAlerts ? 'alert-critical-glow' : ''}
        style={{
          padding: '10px 14px 10px 12px',
          borderBottom: `1px solid ${hasActiveAlerts ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.12)'}`,
          background: hasActiveAlerts
            ? 'linear-gradient(90deg, rgba(140,0,0,0.6) 0%, rgba(60,0,0,0.45) 60%, rgba(10,0,0,0.35) 100%)'
            : 'rgba(20,5,5,0.5)',
          borderLeft: hasActiveAlerts ? '4px solid #ef4444' : '4px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          transition: 'background 0.4s ease, border-color 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon
              className={hasActiveAlerts ? 'animate-pulse' : ''}
              style={{ width: 17, height: 17, color: hasActiveAlerts ? '#f87171' : 'rgba(239,68,68,0.3)', flexShrink: 0, filter: hasActiveAlerts ? 'drop-shadow(0 0 5px rgba(239,68,68,0.6))' : 'none' }}
            />
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.18em', color: hasActiveAlerts ? '#fecaca' : 'rgba(239,68,68,0.4)', textTransform: 'uppercase' }}>
              {language === 'ar' ? 'الإنذار الأحمر' : 'RED ALERT'}
            </span>
            {hasActiveAlerts && (
              <span style={{
                fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                padding: '1px 8px', borderRadius: 6,
                background: 'rgba(239,68,68,0.35)',
                border: '1.5px solid rgba(239,68,68,0.7)',
                boxShadow: '0 0 10px rgba(239,68,68,0.4)',
              }}>{alerts.length}</span>
            )}
            {liveCount > 0 && (
              <span style={{ fontSize: 9, padding: '2px 7px', fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', borderRadius: 4, border: '1px solid rgba(16,185,129,0.35)', letterSpacing: '0.12em' }}>● LIVE</span>
            )}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Oref · Home Front Command</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onShowHistory && (
            <button onClick={onShowHistory} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer' }} title="Alert History" data-testid="button-alert-history">
              <History style={{ width: 13, height: 13 }} />
            </button>
          )}
          {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
          {onClose && <PanelMinimizeButton onMinimize={onClose} />}
        </div>
      </div>

      {/* ── FILTERS (only when alerts exist) ── */}
      {hasActiveAlerts && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(239,68,68,0.12)', background: 'rgba(30,5,5,0.5)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن مدينة...' : 'Search city, region…'}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 10px 6px 32px',
                fontSize: 12, fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.18)',
                borderRadius: 6, color: '#fca5a5', outline: 'none',
              }}
              data-testid="input-red-alert-search"
            />
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </div>
          {/* Threat type pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([['all','ALL'],['rockets','ROCKETS'],['missiles','MISSILES'],['uav_intrusion','UAV'],['hostile_aircraft_intrusion','AIRCRAFT']] as [string,string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setThreatFilter(key)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, letterSpacing: '0.08em',
                  cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                  background: threatFilter === key ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.06)',
                  borderColor: threatFilter === key ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.12)',
                  color: threatFilter === key ? '#fecaca' : 'rgba(239,68,68,0.45)',
                }}
                data-testid={`button-threat-filter-${key}`}
              >{label}</button>
            ))}
          </div>
          {/* Country pills (only when multiple countries) */}
          {activeCountries.length > 1 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCountryFilter('ALL')}
                style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid', background: countryFilter === 'ALL' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.04)', borderColor: countryFilter === 'ALL' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.08)', color: countryFilter === 'ALL' ? '#fecaca' : 'rgba(255,255,255,0.3)' }}
                data-testid="button-country-filter-all"
              >ALL ({alerts.length})</button>
              {activeCountries.map(c => (
                <button key={c} onClick={() => setCountryFilter(c)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid', background: countryFilter === c ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.03)', borderColor: countryFilter === c ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)', color: countryFilter === c ? '#fecaca' : 'rgba(255,255,255,0.35)' }}
                  data-testid={`button-country-filter-${FLAG_MAP[c] || c}`}
                >{FLAG_MAP[c] || ''} {SHORT_NAMES[c] || c} ({countryCounts[c]})</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!hasActiveAlerts && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Shield style={{ width: 40, height: 40, color: 'rgba(16,185,129,0.45)', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'rgba(52,211,153,0.8)', marginBottom: 5, letterSpacing: '0.05em' }}>
            {language === 'ar' ? 'لا تنبيهات نشطة' : 'No Active Alerts'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>All monitored areas clear</p>
          <div style={{ marginTop: 16, padding: '4px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 10, color: 'rgba(52,211,153,0.5)', letterSpacing: '0.1em' }}>
            ● MONITORING
          </div>
        </div>
      )}

      {/* ── ALERT LIST ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div>
          {sortedRegions.map(([compositeKey, { country, alerts: regionAlerts }], idx) => {
            const regionName = compositeKey.split('::')[1];
            const prevCountry = idx > 0 ? sortedRegions[idx - 1][1].country : null;
            const showCountryHeader = country !== prevCountry;
            const countryAlertCount = sortedRegions.filter(([, g]) => g.country === country).reduce((sum, [, g]) => sum + g.alerts.length, 0);

            const COUNTRY_BG: Record<string, string> = { Israel: 'rgba(59,130,246,0.15)', Lebanon: 'rgba(16,185,129,0.12)', Iran: 'rgba(168,85,247,0.13)', Syria: 'rgba(234,179,8,0.12)', Iraq: 'rgba(249,115,22,0.12)', 'Saudi Arabia': 'rgba(34,197,94,0.12)', Yemen: 'rgba(244,63,94,0.12)', UAE: 'rgba(14,165,233,0.12)', Jordan: 'rgba(245,158,11,0.12)', Kuwait: 'rgba(20,184,166,0.12)', Bahrain: 'rgba(236,72,153,0.12)', Qatar: 'rgba(99,102,241,0.12)' };
            const COUNTRY_BORDER: Record<string, string> = { Israel: 'rgba(59,130,246,0.35)', Lebanon: 'rgba(16,185,129,0.3)', Iran: 'rgba(168,85,247,0.3)', Syria: 'rgba(234,179,8,0.3)', Iraq: 'rgba(249,115,22,0.3)', 'Saudi Arabia': 'rgba(34,197,94,0.3)', Yemen: 'rgba(244,63,94,0.3)', UAE: 'rgba(14,165,233,0.3)', Jordan: 'rgba(245,158,11,0.3)', Kuwait: 'rgba(20,184,166,0.3)', Bahrain: 'rgba(236,72,153,0.3)', Qatar: 'rgba(99,102,241,0.3)' };
            const COUNTRY_TEXT: Record<string, string> = { Israel: '#93c5fd', Lebanon: '#6ee7b7', Iran: '#d8b4fe', Syria: '#fde68a', Iraq: '#fdba74', 'Saudi Arabia': '#86efac', Yemen: '#fda4af', UAE: '#7dd3fc', Jordan: '#fcd34d', Kuwait: '#5eead4', Bahrain: '#f9a8d4', Qatar: '#a5b4fc' };

            return (
              <div key={compositeKey}>
                {/* Country header */}
                {showCountryHeader && (
                  <div style={{
                    padding: '8px 14px', position: 'sticky', top: 0, zIndex: 110,
                    background: COUNTRY_BG[country] || 'rgba(239,68,68,0.1)',
                    borderBottom: `1px solid ${COUNTRY_BORDER[country] || 'rgba(239,68,68,0.2)'}`,
                    borderTop: idx > 0 ? `1px solid ${COUNTRY_BORDER[country] || 'rgba(239,68,68,0.15)'}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>{FLAG_MAP[country] || '🌍'}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: COUNTRY_TEXT[country] || '#fca5a5' }}>{country}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.55, color: COUNTRY_TEXT[country] || '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>({countryAlertCount})</span>
                  </div>
                )}
                {/* Region sub-header */}
                <div style={{ padding: '5px 14px', background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)', position: 'sticky', top: showCountryHeader ? 37 : 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(252,165,165,0.7)' }}>{regionName}</span>
                  <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.35)', fontVariantNumeric: 'tabular-nums' }}>{regionAlerts.length}</span>
                </div>
                {/* Alert items */}
                {regionAlerts.map((alert) => {
                  const threat = RED_ALERT_THREAT_LABELS[alert.threatType] || RED_ALERT_THREAT_LABELS.rockets;
                  const threatColor = RED_ALERT_THREAT_COLORS[alert.threatType] || RED_ALERT_THREAT_COLORS.rockets;
                  const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
                  const remaining = Math.max(0, alert.countdown - elapsed);
                  const isActive = elapsed < alert.countdown || alert.countdown === 0;
                  const tier = getAlertUrgencyTier(remaining, alert.countdown);
                  const isLive = alert.source === 'live';

                  const cardBg: Record<string, string> = {
                    critical: 'rgba(120,0,0,0.35)',
                    urgent:   'rgba(80,0,0,0.25)',
                    warning:  'rgba(60,20,0,0.2)',
                    standard: 'rgba(40,0,0,0.15)',
                    expired:  'transparent',
                  };
                  const accentBorder: Record<string, string> = {
                    critical: '#f87171',
                    urgent:   '#fb923c',
                    warning:  '#fbbf24',
                    standard: 'rgba(239,68,68,0.4)',
                    expired:  'rgba(239,68,68,0.1)',
                  };

                  return (
                    <div
                      key={alert.id}
                      data-testid={`red-alert-${alert.id}`}
                      className={`alert-slide-in${tier === 'critical' ? ' alert-critical-glow' : ''}`}
                      style={{
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        borderBottom: '1px solid rgba(239,68,68,0.08)',
                        borderLeft: `3px solid ${accentBorder[tier]}`,
                        background: cardBg[tier],
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* Status dot with ripple */}
                      <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', position: 'absolute', top: 1, left: 1,
                          background: isActive ? (tier === 'critical' ? '#f87171' : '#ef4444') : 'rgba(239,68,68,0.2)',
                          boxShadow: isActive ? `0 0 ${tier === 'critical' ? 12 : 7}px rgba(239,68,68,${tier === 'critical' ? 0.9 : 0.6})` : 'none',
                        }} />
                        {isActive && (
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%', position: 'absolute', top: 0, left: 0,
                            background: '#ef4444',
                          }} className="alert-dot-ping" />
                        )}
                      </div>

                      {/* Main content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* City name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? '#fff' : 'rgba(252,165,165,0.4)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {language === 'ar' ? alert.cityAr : alert.city}
                          </span>
                          {isLive ? (
                            <span style={{ fontSize: 9, padding: '2px 6px', fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '0.1em', flexShrink: 0, textTransform: 'uppercase' }} data-testid={`source-badge-${alert.id}`}>LIVE</span>
                          ) : (
                            <span style={{ fontSize: 9, padding: '2px 6px', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.1em', flexShrink: 0, textTransform: 'uppercase' }} data-testid={`source-badge-${alert.id}`}>SIM</span>
                          )}
                        </div>
                        {/* Threat + time row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={isActive ? threatColor : ''} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: '1px solid', letterSpacing: '0.06em', textTransform: 'uppercase', ...(isActive ? { boxShadow: '0 0 6px rgba(239,68,68,0.2)' } : { color: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.1)', background: 'transparent' }) }}>
                            {language === 'ar' ? threat.ar : threat.en}
                          </span>
                          <span style={{ fontSize: 11, color: isActive ? 'rgba(252,165,165,0.5)' : 'rgba(239,68,68,0.2)', fontVariantNumeric: 'tabular-nums' }}>
                            {timeAgo(alert.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Countdown */}
                      <RedAlertCountdown alert={alert} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* ── SIRENS ── */}
      {sirens.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(245,158,11,0.2)', background: 'rgba(40,20,0,0.4)' }}>
          <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Siren style={{ width: 14, height: 14, color: 'rgba(245,158,11,0.7)' }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(253,211,77,0.8)' }}>
              {language === 'ar' ? 'صفارات' : 'SIRENS'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '1px 7px', fontVariantNumeric: 'tabular-nums' }}>{sirens.length}</span>
            <div style={{ flex: 1 }} />
            <div className="animate-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }} />
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {sirens.map(s => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <div key={s.id} style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(245,158,11,0.08)' }} data-testid={`siren-panel-${s.id}`}>
                  <div className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(253,211,77,0.8)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(245,158,11,0.4)', letterSpacing: '0.05em' }}>{language === 'ar' ? threat.ar : threat.en}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ flexShrink: 0, padding: '6px 14px', borderTop: '1px solid rgba(239,68,68,0.12)', background: 'rgba(10,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.3)', letterSpacing: '0.05em' }}>tzevaadom.co.il · Oref</span>
        <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.3)', fontVariantNumeric: 'tabular-nums' }}>
          {hasActiveAlerts ? (filteredAlerts.length !== alerts.length ? `${filteredAlerts.length} / ${alerts.length}` : `${alerts.length} alerts`) : 'monitoring'} · 3s
        </span>
      </div>
    </div>
  );
});

const DEFAULT_CHANNELS = ['@bintjbeilnews', '@wfwitness', '@OSINTdefender', '@IntelCrab', '@GeoConfirmed', '@CIG_telegram', '@sentaborim', '@AviationIntel', '@rnintel', '@lebaborim', '@almanarnews', '@AlAhedNews', '@lebanonnews2', '@NewsInIsrael', '@alaborim', '@AbuAliEnglish', '@Yemen_Press', '@clashreport', '@inaborim', '@MEConflictNews'];

const TelegramPanel = memo(function TelegramPanel({
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());
  const prevMsgIdsRef = useRef<Set<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);

  const allChannels = useMemo(() => [...DEFAULT_CHANNELS, ...customChannels], [customChannels]);

  const customOnly = useMemo(() => customChannels.filter(c => !DEFAULT_CHANNELS.includes(c)), [customChannels]);
  const customQueryParam = useMemo(() => customOnly.map(c => c.replace('@', '')).join(','), [customOnly]);

  const { data: customMessages = [] } = useQuery<TelegramMessage[]>({
    queryKey: ['/api/telegram/live', customQueryParam],
    queryFn: async () => {
      const resp = await fetch(`/api/telegram/live?channels=${encodeURIComponent(customQueryParam)}`);
      if (!resp.ok) return [];
      return await resp.json();
    },
    refetchInterval: 30000,
    staleTime: 25000,
    enabled: customOnly.length > 0,
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

  const stableOrderRef = useRef<string[]>([]);
  const filteredMessages = useMemo(() => {
    const merged = customOnly.length > 0 ? [...messages, ...customMessages] : [...messages];
    const seen = new Set<string>();
    const deduped = merged.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const msgMap = new Map(deduped.map(m => [m.id, m]));
    // Keep existing order stable, prepend new ids at top
    const newIds = deduped.filter(m => !stableOrderRef.current.includes(m.id)).map(m => m.id);
    newIds.sort((a, b) => new Date(msgMap.get(b)!.timestamp).getTime() - new Date(msgMap.get(a)!.timestamp).getTime());
    const kept = stableOrderRef.current.filter(id => msgMap.has(id));
    stableOrderRef.current = [...newIds, ...kept];
    return stableOrderRef.current.map(id => msgMap.get(id)!);
  }, [messages, customMessages, customOnly]);

  const clearNewMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const currentIds = new Set(filteredMessages.map(m => m.id));
    if (prevMsgIdsRef.current.size > 0) {
      const freshIds: string[] = [];
      currentIds.forEach(id => {
        if (!prevMsgIdsRef.current.has(id)) freshIds.push(id);
      });
      if (freshIds.length > 0) {
        if (clearNewMsgTimerRef.current) clearTimeout(clearNewMsgTimerRef.current);
        setNewMsgIds(prev => new Set([...Array.from(prev), ...freshIds]));
        clearNewMsgTimerRef.current = setTimeout(() => setNewMsgIds(new Set()), 6000);
      }
    }
    prevMsgIdsRef.current = currentIds;
  }, [filteredMessages]);

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
            {newMsgIds.size > 0 && (
              <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-1.5 rounded" data-testid="text-new-count">
                +{newMsgIds.size} NEW
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
        {allChannels.slice(0, 10).map(ch => {
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

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          <div ref={topRef} />
          {displayMessages.length === 0 && (
            <div className="px-3 py-8 text-center">
              <SiTelegram className="w-6 h-6 text-sky-400/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground/60">
                {messages.length === 0
                  ? (language === 'ar' ? '\u062C\u0627\u0631\u064A \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A...' : 'Connecting to live feeds...')
                  : channelFilter
                    ? (language === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644' : 'No messages from this channel')
                    : (language === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644' : 'No messages yet')}
              </p>
            </div>
          )}
          {displayMessages.map((msg) => {
            const isExpanded = expandedMsgId === msg.id;
            const isLive = msg.id.startsWith('live_');
            const isNew = newMsgIds.has(msg.id);
            const text = language === 'ar' && msg.textAr ? msg.textAr : msg.text;
            const channelName = msg.channel.replace('@', '');
            return (
              <div
                key={msg.id}
                className={`rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                  isNew
                    ? 'bg-emerald-950/30 ring-1 ring-emerald-500/30'
                    : isExpanded
                      ? 'bg-sky-950/30 ring-1 ring-sky-500/15'
                      : 'bg-muted/20 hover:bg-sky-950/15'
                }`}
                onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                data-testid={`telegram-msg-${msg.id}`}
              >
                {msg.image && !isExpanded && (
                  <div
                    className="relative w-full h-56 overflow-hidden cursor-zoom-in"
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
                      {isNew && <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/40 px-1 rounded shrink-0">NEW</span>}
                      {isLive && !isNew && <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/30 px-1 rounded shrink-0">LIVE</span>}
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
                      {isNew && (
                        <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-1 rounded border border-emerald-500/30 shrink-0">NEW</span>
                      )}
                      {isLive && !isNew && (
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
                        className="w-full max-h-96 object-cover bg-black/20 cursor-zoom-in hover:opacity-90 transition-opacity"
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
});

function MapLegend({ activeView, language }: { activeView: string; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const conflictItems = [
    { color: '#ef4444', label: t('Missile/Strike', 'صاروخ/ضربة') },
    { color: '#f97316', label: t('Airstrike', 'غارة جوية') },
    { color: '#3b82f6', label: t('Naval Ops', 'عمليات بحرية') },
    { color: '#eab308', label: t('Ground', 'بري') },
    { color: '#22c55e', label: t('Air Defense', 'دفاع جوي') },
    { color: '#a855f7', label: t('Nuclear Site', 'موقع نووي') },
  ];
  const flightItems = [
    { color: '#ef4444', label: t('Military', 'عسكري') },
    { color: '#22d3ee', label: t('Surveillance', 'استطلاع') },
    { color: '#f9c31f', label: t('Commercial', 'تجاري') },
  ];
  const items = activeView === 'conflict' ? conflictItems : flightItems;
  return (
    <div
      dir="ltr"
      style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 1000,
        background: 'rgba(4,7,16,0.88)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 7 }}>
        {activeView === 'conflict' ? 'EVENT TYPES' : 'AIRCRAFT'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
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
      <div className="w-[95vw] max-w-[520px] max-h-[90dvh] bg-background/95 backdrop-blur-xl border border-primary/30 rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 25px 50px rgb(0 0 0 / 0.6), 0 0 20px hsl(32 95% 50% / 0.1)'}}>
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

const AIIntelPanel = memo(function AIIntelPanel({ language, onClose, onMaximize, isMaximized, brief, briefLoading, anomalies = [] }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; brief?: AIBrief | null; briefLoading?: boolean; anomalies?: Anomaly[] }) {
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
      <div className="panel-drag-handle h-9 px-3 border-b border-white/[0.04] flex items-center gap-2 bg-gradient-to-r from-purple-500/[0.04] to-transparent shrink-0 relative overflow-hidden cursor-grab active:cursor-grabbing" style={{background:'hsl(220 30% 17% / 0.88)', borderBottom:'1px solid hsl(185 40% 40% / 0.1)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-purple-400/20" />
        <div className="absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b from-purple-400/50 via-purple-400/20 to-transparent" />
        <Brain className="w-3.5 h-3.5 text-purple-400/60 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55 font-mono">
          {language === 'en' ? 'AI Intel' : '\u0630\u0643\u0627\u0621'}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 font-mono text-foreground/30 bg-white/[0.03] rounded border border-white/[0.06] tabular-nums leading-none">
          {brief?.model || '...'}
        </span>
        {anomalies.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 font-mono font-bold text-amber-300/80 bg-amber-950/30 rounded border border-amber-500/20 animate-pulse" data-testid="anomaly-badge">
            {anomalies.length} ANOM
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-widest text-emerald-400/60 font-mono font-bold">LIVE</span>
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <ScrollArea className="flex-1 min-h-0">
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

            {brief.tacticalSituation && (
              <div className="px-3 py-3 border-t border-white/[0.03]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Crosshair className="w-3 h-3 text-red-400/70" />
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                    {language === 'en' ? 'Tactical Situation' : '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062A\u0643\u062A\u064A\u0643\u064A'}
                  </span>
                  <span className="ml-auto text-[9px] font-mono text-red-400/50 bg-red-950/20 border border-red-500/20 px-1.5 py-0.5 rounded">24H</span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed border-l-2 border-red-500/30 pl-2.5">{brief.tacticalSituation}</p>
              </div>
            )}

            {brief.escalationIndicators && brief.escalationIndicators.length > 0 && (
              <div className="px-3 py-3 border-t border-white/[0.03]">
                <div className="flex items-center gap-1.5 mb-2">
                  <TriangleAlert className="w-3 h-3 text-amber-400/70" />
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                    {language === 'en' ? 'Escalation Indicators' : '\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u062A\u0635\u0639\u064A\u062F'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {brief.escalationIndicators.map((ind, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400/60 font-mono text-[10px] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-xs text-foreground/65 leading-relaxed">{ind}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief.actorAnalysis && (
              <div className="px-3 py-3 border-t border-white/[0.03]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3 h-3 text-blue-400/70" />
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
                    {language === 'en' ? 'Actor Analysis' : '\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0623\u0637\u0631\u0627\u0641'}
                  </span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed border-l-2 border-blue-500/30 pl-2.5">{brief.actorAnalysis}</p>
              </div>
            )}

            <div className="px-3 py-3 border-t border-white/[0.03]">
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
});

const AlertMapComponent = lazy(() => import('@/components/alert-map'));

const ALERT_THREAT_META: Record<string, { label: string; icon: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  rockets:                    { label: 'Rockets',  icon: '🚀', dotColor: '#ef4444', textColor: 'text-red-300',    bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
  missiles:                   { label: 'Missiles', icon: '🎯', dotColor: '#f97316', textColor: 'text-orange-300', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  hostile_aircraft_intrusion: { label: 'Aircraft', icon: '✈',  dotColor: '#a855f7', textColor: 'text-purple-300', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30' },
  uav_intrusion:              { label: 'UAV',      icon: '🔺', dotColor: '#22d3ee', textColor: 'text-cyan-300',   bgColor: 'bg-cyan-500/15',   borderColor: 'border-cyan-500/30' },
};

const SIG_STYLES: Record<string, { badge: string; bar: string; dot: string }> = {
  critical: { badge: 'text-red-300 border-red-500/50 bg-red-950/50', bar: 'border-l-red-500/70 bg-red-950/20', dot: 'bg-red-400' },
  high:     { badge: 'text-orange-300 border-orange-500/50 bg-orange-950/50', bar: 'border-l-orange-500/70 bg-orange-950/20', dot: 'bg-orange-400' },
  medium:   { badge: 'text-yellow-300 border-yellow-500/50 bg-yellow-950/40', bar: 'border-l-yellow-500/60 bg-yellow-950/10', dot: 'bg-yellow-400' },
};

const RISK_BG: Record<string, string> = {
  EXTREME:  'from-red-950/40 to-red-950/10 border-red-500/30',
  HIGH:     'from-orange-950/40 to-orange-950/10 border-orange-500/30',
  ELEVATED: 'from-yellow-950/40 to-yellow-950/10 border-yellow-500/30',
  MODERATE: 'from-emerald-950/30 to-emerald-950/5 border-emerald-500/20',
};

const RISK_PULSE: Record<string, string> = {
  EXTREME: 'bg-red-400',
  HIGH: 'bg-orange-400',
  ELEVATED: 'bg-yellow-400',
  MODERATE: 'bg-emerald-400',
};

function SitrepPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [activeWindow, setActiveWindow] = useState<SitrepWindow>('1h');
  const [sitreps, setSitreps] = useState<Partial<Record<SitrepWindow, Sitrep>>>({});
  const [loading, setLoading] = useState<Partial<Record<SitrepWindow, boolean>>>({});
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': true, '4': true, '5': false, '6': false, '7': false, '8': true, '9': true });

  const fetchSitrep = async (window: SitrepWindow) => {
    setLoading(p => ({ ...p, [window]: true }));
    try {
      const res = await fetch(`/api/sitrep?window=${window}`);
      if (res.ok) {
        const data: Sitrep = await res.json();
        setSitreps(p => ({ ...p, [window]: data }));
      }
    } catch {}
    setLoading(p => ({ ...p, [window]: false }));
  };

  useEffect(() => {
    if (!sitreps[activeWindow] && !loading[activeWindow]) {
      fetchSitrep(activeWindow);
    }
  }, [activeWindow]);

  const sitrep = sitreps[activeWindow];
  const isLoading = loading[activeWindow];
  const toggleSection = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const handleCopy = () => {
    if (!sitrep) return;
    const lines = [
      `CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL USE ONLY`,
      `DTG: ${sitrep.dtg}`,
      `PERIOD: ${activeWindow.toUpperCase()} SITREP`,
      `RISK LEVEL: ${sitrep.riskLevel}`,
      ``,
      `1. SITUATION`, sitrep.situation, ``,
      `2. ENEMY FORCES (OPFOR)`, sitrep.opfor, ``,
      `3. FRIENDLY FORCES (BLUFOR)`, sitrep.blufor, ``,
      `4. KEY EVENTS`,
      ...sitrep.keyEvents.map(e => `  ${e.dtg} | ${e.location} | [${e.significance.toUpperCase()}] ${e.event}`), ``,
      `5. INTELLIGENCE`, sitrep.intelligence, ``,
      `6. INFRASTRUCTURE`, sitrep.infrastructure, ``,
      `7. EW / CYBER`, sitrep.ewCyber, ``,
      `8. COMMANDER'S ASSESSMENT`, sitrep.commandersAssessment, ``,
      `9. OUTLOOK`, sitrep.outlook, ``,
      `Generated: ${new Date(sitrep.generatedAt).toUTCString()} | Model: ${sitrep.model}`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-[hsl(220_25%_10%)]">
      {/* Header */}
      <div className="panel-drag-handle relative px-3 h-9 flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden" style={{ background: 'hsl(220 30% 14% / 0.95)', borderBottom: '1px solid hsl(40 60% 40% / 0.12)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(90deg, hsl(40 80% 30% / 0.3), transparent 60%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(40 80% 50% / 0.4) 40%, hsl(40 80% 50% / 0.4) 60%, transparent)' }} />
        <FileDown className="w-3.5 h-3.5 text-amber-400/70 shrink-0 relative z-10" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70 font-mono relative z-10">
          {language === 'en' ? 'SITREP' : 'تقرير الوضع'}
        </span>
        {sitrep && (
          <div className="flex items-center gap-1.5 relative z-10">
            <span className="text-foreground/20 text-[9px]">—</span>
            <span className="text-[9px] font-mono text-foreground/35">{sitrep.dtg}</span>
          </div>
        )}
        <div className="flex-1" />
        {sitrep && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-black font-mono relative z-10 ${RISK_COLORS[sitrep.riskLevel] || ''}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${RISK_PULSE[sitrep.riskLevel] || 'bg-gray-400'}`} />
            {sitrep.riskLevel}
          </div>
        )}
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0" style={{ background: 'hsl(220 25% 12% / 0.8)', borderBottom: '1px solid hsl(185 30% 30% / 0.08)' }}>
        {/* Time window pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ background: 'hsl(220 25% 8% / 0.6)', border: '1px solid hsl(185 30% 30% / 0.1)' }}>
          {(['1h', '6h', '24h'] as SitrepWindow[]).map(w => (
            <button
              key={w}
              onClick={() => setActiveWindow(w)}
              className={`relative text-[9px] font-bold font-mono px-2.5 py-0.5 rounded transition-all duration-150 ${activeWindow === w
                ? 'text-amber-200 bg-amber-900/50 shadow-sm'
                : 'text-foreground/25 hover:text-foreground/50'
              }`}
            >
              {w.toUpperCase()}
              {sitreps[w] && w !== activeWindow && (
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400/50" />
              )}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {sitrep && (
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded transition-all ${copied ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30' : 'text-foreground/35 hover:text-foreground/60 border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]'}`}
          >
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        )}
        <button
          onClick={() => fetchSitrep(activeWindow)}
          disabled={!!isLoading}
          className="flex items-center gap-1.5 text-[9px] font-black font-mono px-2.5 py-1 rounded border transition-all disabled:opacity-40 text-amber-200 border-amber-500/30 bg-amber-950/30 hover:bg-amber-950/50 hover:border-amber-500/50"
        >
          {isLoading ? (
            <><Loader2 className="w-2.5 h-2.5 animate-spin" /> GENERATING</>
          ) : sitrep ? (
            <><Activity className="w-2.5 h-2.5" /> REFRESH</>
          ) : (
            <><FileDown className="w-2.5 h-2.5" /> GENERATE</>
          )}
        </button>
      </div>

      {/* Stats strip — shown when data available */}
      {sitrep && !isLoading && (
        <div className={`flex items-center gap-0 shrink-0 bg-gradient-to-r ${RISK_BG[sitrep.riskLevel] || ''} border-b`} style={{ borderBottomColor: 'hsl(185 30% 30% / 0.08)' }}>
          {[
            { icon: AlertOctagon, label: 'ALERTS', value: sitrep.alertCount, color: sitrep.alertCount > 0 ? 'text-red-400' : 'text-foreground/30' },
            { icon: Target, label: 'EVENTS', value: sitrep.eventCount, color: sitrep.eventCount > 0 ? 'text-orange-400' : 'text-foreground/30' },
            { icon: Clock, label: 'PERIOD', value: activeWindow.toUpperCase(), color: 'text-amber-400/70' },
            { icon: Brain, label: 'SRC', value: sitrep.model === 'claude-sonnet-4-6' ? 'AI' : sitrep.model === 'data-driven' ? 'DATA' : 'FALLBACK', color: sitrep.model === 'claude-sonnet-4-6' ? 'text-cyan-400' : 'text-foreground/40' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-1.5 border-r border-white/[0.04] last:border-r-0">
              <Icon className={`w-2.5 h-2.5 mb-0.5 ${color}`} />
              <span className={`text-[10px] font-black font-mono ${color}`}>{value}</span>
              <span className="text-[8px] font-mono text-foreground/20 uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-amber-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-amber-400/50 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border border-amber-400/10 animate-ping" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold font-mono text-amber-300/50 tracking-widest uppercase">Synthesizing…</p>
              <p className="text-[10px] font-mono text-foreground/20">Aggregating intelligence feeds</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!sitrep && !isLoading && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-12 h-12 rounded-xl border border-amber-500/10 bg-amber-950/10 flex items-center justify-center">
              <FileDown className="w-5 h-5 text-amber-400/25" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold font-mono text-foreground/25 uppercase tracking-widest">Awaiting Generation</p>
              <p className="text-[10px] font-mono text-foreground/15">Select time window · Click Generate</p>
            </div>
          </div>
        )}

        {/* SITREP content */}
        {sitrep && !isLoading && (
          <div className="pb-2">
            {/* Classification banner */}
            <div className="mx-2.5 mt-2.5 mb-2 px-3 py-1.5 rounded border border-amber-500/15 bg-amber-950/15 flex items-center justify-between">
              <span className="text-[8px] font-black font-mono text-amber-300/40 tracking-[0.2em]">UNCLASSIFIED // FOUO</span>
              <span className="text-[8px] font-mono text-foreground/20">{sitrep.dtg}</span>
            </div>

            {/* Sections */}
            <SitrepAccordion number="1" title="SITUATION" icon={Globe} expanded={!!expanded['1']} onToggle={() => toggleSection('1')}>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.situation}</p>
            </SitrepAccordion>

            <SitrepAccordion number="2" title="ENEMY FORCES (OPFOR)" icon={AlertTriangle} expanded={!!expanded['2']} onToggle={() => toggleSection('2')} accent="red">
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.opfor}</p>
            </SitrepAccordion>

            <SitrepAccordion number="3" title="FRIENDLY FORCES (BLUFOR)" icon={Shield} expanded={!!expanded['3']} onToggle={() => toggleSection('3')} accent="blue">
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.blufor}</p>
            </SitrepAccordion>

            {/* Key Events — special layout */}
            <div className="mx-2.5 mb-1.5 rounded-lg overflow-hidden border border-white/[0.04]" style={{ background: 'hsl(220 25% 11% / 0.6)' }}>
              <button
                onClick={() => toggleSection('4')}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[8px] font-black font-mono text-amber-400/40 w-4">4.</span>
                <Target className="w-3 h-3 text-amber-400/50 shrink-0" />
                <span className="text-[9px] font-black font-mono text-foreground/45 uppercase tracking-wider flex-1 text-left">Key Events</span>
                {sitrep.keyEvents.length > 0 && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/20 text-amber-300/50">{sitrep.keyEvents.length}</span>
                )}
                {expanded['4'] ? <ChevronDown className="w-3 h-3 text-foreground/25" /> : <ChevronRight className="w-3 h-3 text-foreground/25" />}
              </button>
              {expanded['4'] && (
                <div className="px-3 pb-2.5">
                  {sitrep.keyEvents.length === 0 ? (
                    <p className="text-[10px] text-foreground/25 font-mono py-1">— No significant events recorded —</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sitrep.keyEvents.map((ev, i) => {
                        const s = SIG_STYLES[ev.significance] || SIG_STYLES.medium;
                        return (
                          <div key={i} className={`flex gap-2.5 items-start pl-2.5 py-1.5 rounded-r border-l-2 ${s.bar}`}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ${s.badge}`}>
                                  {ev.significance.toUpperCase()}
                                </span>
                                <span className="text-[8px] font-mono text-foreground/30">{ev.location}</span>
                              </div>
                              <p className="text-[10px] text-foreground/75 leading-snug">{ev.event}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <SitrepAccordion number="5" title="INTELLIGENCE" icon={Brain} expanded={!!expanded['5']} onToggle={() => toggleSection('5')}>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.intelligence}</p>
            </SitrepAccordion>

            <SitrepAccordion number="6" title="INFRASTRUCTURE" icon={Zap} expanded={!!expanded['6']} onToggle={() => toggleSection('6')}>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.infrastructure}</p>
            </SitrepAccordion>

            <SitrepAccordion number="7" title="EW / CYBER" icon={Cpu} expanded={!!expanded['7']} onToggle={() => toggleSection('7')}>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.ewCyber}</p>
            </SitrepAccordion>

            {/* Commander's Assessment — highlighted */}
            <div className="mx-2.5 mb-1.5 rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(40 60% 50% / 0.2)', background: 'linear-gradient(135deg, hsl(40 30% 10% / 0.8), hsl(220 25% 10% / 0.5))' }}>
              <button
                onClick={() => toggleSection('8')}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[8px] font-black font-mono text-amber-400/50 w-4">8.</span>
                <Star className="w-3 h-3 text-amber-400/60 shrink-0" />
                <span className="text-[9px] font-black font-mono text-amber-300/60 uppercase tracking-wider flex-1 text-left">Commander's Assessment</span>
                {expanded['8'] ? <ChevronDown className="w-3 h-3 text-amber-400/30" /> : <ChevronRight className="w-3 h-3 text-amber-400/30" />}
              </button>
              {expanded['8'] && (
                <div className="px-3 pb-3">
                  <div className="h-px mb-2" style={{ background: 'linear-gradient(90deg, hsl(40 60% 50% / 0.2), transparent)' }} />
                  <p className="text-[11px] text-amber-100/75 leading-relaxed">{sitrep.commandersAssessment}</p>
                </div>
              )}
            </div>

            <SitrepAccordion number="9" title="OUTLOOK / NEXT PERIOD" icon={Clock} expanded={!!expanded['9']} onToggle={() => toggleSection('9')}>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{sitrep.outlook}</p>
            </SitrepAccordion>

            {/* Footer */}
            <div className="mx-2.5 mt-1 mb-0.5 px-3 py-1.5 rounded border border-white/[0.03] flex items-center justify-between">
              <span className="text-[8px] font-mono text-foreground/15">
                {new Date(sitrep.generatedAt).toUTCString()}
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${sitrep.model === 'claude-sonnet-4-6' ? 'text-cyan-400/50 bg-cyan-950/20' : 'text-foreground/20 bg-white/[0.02]'}`}>
                {sitrep.model}
              </span>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SitrepAccordion({
  number, title, icon: Icon, expanded, onToggle, accent, children,
}: {
  number: string; title: string; icon: typeof FileDown; expanded: boolean;
  onToggle: () => void; accent?: 'red' | 'blue'; children: React.ReactNode;
}) {
  const titleColor = accent === 'red' ? 'text-red-400/50' : accent === 'blue' ? 'text-sky-400/50' : 'text-foreground/45';
  const iconColor = accent === 'red' ? 'text-red-400/40' : accent === 'blue' ? 'text-sky-400/40' : 'text-amber-400/40';
  return (
    <div className="mx-2.5 mb-1.5 rounded-lg overflow-hidden border border-white/[0.04]" style={{ background: 'hsl(220 25% 11% / 0.6)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[8px] font-black font-mono text-amber-400/30 w-4">{number}.</span>
        <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
        <span className={`text-[9px] font-black font-mono uppercase tracking-wider flex-1 text-left ${titleColor}`}>{title}</span>
        {expanded ? <ChevronDown className="w-3 h-3 text-foreground/20" /> : <ChevronRight className="w-3 h-3 text-foreground/20" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 pt-0.5">
          <div className="h-px mb-2 opacity-30" style={{ background: 'linear-gradient(90deg, hsl(185 40% 40% / 0.3), transparent)' }} />
          {children}
        </div>
      )}
    </div>
  );
}

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
  const ME_COUNTRIES = new Set([
    'Israel', 'Palestine', 'Gaza', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran',
    'Saudi Arabia', 'Yemen', 'Oman', 'UAE', 'Qatar', 'Bahrain', 'Kuwait',
    'Egypt', 'Libya', 'Turkey', 'Cyprus',
  ]);

  const meAlerts = alerts.filter(a => !a.country || ME_COUNTRIES.has(a.country));

  const now = Date.now();
  const activeAlerts = meAlerts.filter(a => {
    const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
    return elapsed < a.countdown || a.countdown === 0;
  });

  const recentAlerts = [...meAlerts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const byThreat = meAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.threatType] = (acc[a.threatType] || 0) + 1;
    return acc;
  }, {});

  const countriesAffected = new Set(meAlerts.map(a => a.country)).size;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="alertmap-panel">
      {/* Header */}
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(220 30% 17% / 0.88)', borderBottom:'1px solid hsl(185 40% 40% / 0.1)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-red-500/40" />
        <div className={`w-2 h-2 rounded-full shrink-0 ${activeAlerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500/70'}`} />
        <MapPin className="w-3 h-3 text-foreground/40 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/55 font-mono">
          {language === 'en' ? 'Alert Map' : '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}
        </span>
        {activeAlerts.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 font-mono font-black bg-red-500/20 text-red-300 rounded border border-red-500/30 animate-pulse">
            {activeAlerts.length} ACTIVE
          </span>
        )}
        <div className="flex-1" />
        {/* Compact threat pills */}
        <div className="flex items-center gap-1">
          {Object.entries(ALERT_THREAT_META).map(([key, meta]) => {
            const count = byThreat[key] || 0;
            if (count === 0) return null;
            return (
              <span key={key} className={`text-[9px] font-black px-1 py-0.5 rounded ${meta.bgColor} ${meta.textColor} border ${meta.borderColor} font-mono`}>
                {meta.icon}{count}
              </span>
            );
          })}
        </div>
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      {/* Map area — takes all remaining space */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-card/20">
                  <MapPin className="w-6 h-6 text-red-400 animate-pulse" />
                </div>
              }
            >
              <AlertMapComponent alerts={meAlerts} language={language} />
            </Suspense>
          </MapErrorBoundary>
        </div>

        {/* Compact legend — bottom-left */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <div className="flex flex-col gap-0.5 p-1.5 rounded" style={{background:'rgba(255,255,255,0.88)', border:'1px solid rgba(0,0,0,0.1)', boxShadow:'0 1px 6px rgba(0,0,0,0.12)'}}>
            {Object.entries(ALERT_THREAT_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: meta.dotColor}} />
                <span className="text-[8px] font-mono uppercase tracking-wide" style={{color:'#444'}}>{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats overlay — top-right */}
        {meAlerts.length > 0 && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <div className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(255,255,255,0.88)', border:'1px solid rgba(0,0,0,0.1)', boxShadow:'0 1px 6px rgba(0,0,0,0.12)', color:'#444'}}>
              {meAlerts.length} alerts · {countriesAffected} {countriesAffected === 1 ? 'country' : 'countries'}
            </div>
          </div>
        )}
      </div>

      {/* Recent alerts strip — compact */}
      {recentAlerts.length > 0 && (
        <div className="shrink-0 divide-y divide-white/[0.04]" style={{background:'hsl(220 28% 10%)', borderTop:'1px solid hsl(185 28% 20% / 0.35)'}}>
          {recentAlerts.map(alert => {
            const meta = ALERT_THREAT_META[alert.threatType] || ALERT_THREAT_META.rockets;
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = Math.max(0, alert.countdown - elapsed);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const isActive = elapsed < alert.countdown || alert.countdown === 0;
            const city = language === 'ar' ? alert.cityAr : alert.city;
            return (
              <div key={alert.id} className="px-2 py-1 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: meta.dotColor, boxShadow: isActive ? `0 0 5px ${meta.dotColor}` : undefined}} />
                <span className="text-[11px] font-bold text-foreground/85 font-mono truncate flex-1 min-w-0">{city}</span>
                <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${meta.bgColor} ${meta.textColor} border ${meta.borderColor} shrink-0`}>{meta.label}</span>
                <span className="text-[9px] font-mono shrink-0 w-14 text-right">
                  {isActive && remaining > 0
                    ? <span className="text-red-400 font-bold">{mins > 0 ? `${mins}m${secs}s` : `${secs}s`}</span>
                    : <span className="text-foreground/35">{timeAgo(alert.timestamp)}</span>
                  }
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MAP_STYLE_OPTIONS = [
  { id: 'dark',    label: 'Dark',    provider: 'CARTO', dot: '#1e293b', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'light',   label: 'Light',   provider: 'CARTO', dot: '#e2e8f0', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'voyager', label: 'Voyager', provider: 'CARTO', dot: '#78350f', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'ofm',     label: 'Liberty', provider: 'OFM',   dot: '#1d4ed8', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'bright',  label: 'Bright',  provider: 'OFM',   dot: '#065f46', url: 'https://tiles.openfreemap.org/styles/bright' },
] as const;

const MapSection = memo(function MapSection({
  events,
  flights,
  redAlerts,
  thermalHotspots,
  ewEvents = [],
  language,
  onClose,
  onMaximize,
  isMaximized,
  focusLocation,
  isVisible,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  redAlerts: RedAlert[];
  thermalHotspots: ThermalHotspot[];
  ewEvents?: EWEvent[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
  isVisible?: boolean;
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');
  const [mapStyleId, setMapStyleId] = useState<typeof MAP_STYLE_OPTIONS[number]['id']>('dark');
  const mapStyleUrl = MAP_STYLE_OPTIONS.find(s => s.id === mapStyleId)!.url;
  const hasActiveThreats = redAlerts.length > 0;

  const MODES = [
    { key: 'conflict' as const, icon: AlertTriangle, label: 'CONFLICT', color: '#ef4444' },
    { key: 'flights'  as const, icon: Plane,         label: 'AIR',      color: '#22d3ee' },
    { key: 'maritime' as const, icon: Anchor,        label: 'MARITIME', color: '#3b82f6' },
  ];
  const activeMode = MODES.find(m => m.key === activeView)!;

  const statRow = [
    { label: 'EVT',  value: events.length,                        color: '#f97316',                              pulse: false },
    { label: 'ALR',  value: redAlerts.length,                     color: hasActiveThreats ? '#ef4444' : '#3a4555', pulse: hasActiveThreats },
    { label: 'AIR',  value: flights.length,                       color: '#22d3ee',                              pulse: false },
    { label: 'FIRE', value: thermalHotspots.length,               color: '#ff6b35',                              pulse: false },
  ];

  return (
    <div className="h-full flex flex-col min-h-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>

      {/* ── THEATRE OF OPERATIONS header ── */}
      <div
        className="panel-drag-handle shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ background: 'rgba(2,5,12,0.98)', borderBottom: '1px solid rgba(34,211,238,0.12)', position: 'relative' }}
      >
        {/* top dynamic accent stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${activeMode.color}55 20%, ${activeMode.color}99 50%, ${activeMode.color}55 80%, transparent)`,
          transition: 'background 0.35s',
        }} />

        {/* main row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 42 }}>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 2, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color, boxShadow: `0 0 8px ${activeMode.color}bb`, transition: 'all 0.3s' }} />
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color + '44', transition: 'all 0.3s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,211,238,0.82)', lineHeight: 1.25 }}>THEATRE OF OPERATIONS</span>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.26em', color: 'rgba(255,255,255,0.16)', lineHeight: 1 }}>MIDDLE EAST · MENA · GULF</span>
            </div>
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 2, flexShrink: 0 }} data-no-drag>
            {MODES.map(m => {
              const active = activeView === m.key;
              return (
                <button key={m.key} onClick={() => setActiveView(m.key)} data-testid={`button-map-${m.key}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: active ? `${m.color}1e` : 'transparent',
                    color: active ? m.color : 'rgba(255,255,255,0.22)',
                    boxShadow: active ? `0 0 0 1px ${m.color}44, inset 0 0 10px ${m.color}0d` : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  <m.icon style={{ width: 9, height: 9 }} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
            {statRow.map(({ label, value, color, pulse }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: `${color}0e`, border: `1px solid ${color}22`, borderRadius: 4 }}>
                {pulse && <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'pulse 1.1s ease-in-out infinite', flexShrink: 0 }} />}
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>

          {hasActiveThreats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, animation: 'alert-critical-glow 1.1s ease-in-out infinite', flexShrink: 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 7px rgba(239,68,68,0.8)', animation: 'pulse 0.8s ease-in-out infinite' }} />
              <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.18em', color: '#ef4444' }}>ACTIVE THREAT</span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Map provider picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: 2, flexShrink: 0 }} data-no-drag>
            {(['CARTO', 'OFM'] as const).map(provider => {
              const providerStyles = MAP_STYLE_OPTIONS.filter(s => s.provider === provider);
              const isProviderActive = providerStyles.some(s => s.id === mapStyleId);
              return (
                <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {provider !== 'CARTO' && <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.06)', margin: '0 1px' }} />}
                  <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', color: isProviderActive ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.15)', padding: '0 3px', fontFamily: 'monospace' }}>
                    {provider}
                  </span>
                  {providerStyles.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setMapStyleId(s.id)}
                      data-testid={`button-map-style-${s.id}`}
                      title={`${s.provider} ${s.label}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', fontSize: 8, fontWeight: 700,
                        letterSpacing: '0.06em', borderRadius: 3, border: 'none',
                        cursor: 'pointer',
                        background: mapStyleId === s.id ? 'rgba(34,211,238,0.12)' : 'transparent',
                        color: mapStyleId === s.id ? '#22d3ee' : 'rgba(255,255,255,0.22)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: 2, flexShrink: 0,
                        background: s.dot,
                        border: mapStyleId === s.id ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.15)',
                      }} />
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* NASA FIRMS badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff6b35', boxShadow: '0 0 5px rgba(255,107,53,0.65)' }} />
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,107,53,0.65)' }}>FIRMS</span>
          </div>

          {/* LIVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.65)', animation: 'pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,197,94,0.65)' }}>LIVE</span>
          </div>

          {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
          {onClose && <PanelMinimizeButton onMinimize={onClose} />}
        </div>
      </div>

      {/* ── Map canvas ── */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense fallback={
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,5,12,0.96)', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.14)', borderTop: '2px solid rgba(34,211,238,0.85)', animation: 'spin 0.9s linear infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(34,211,238,0.45)', letterSpacing: '0.22em', fontFamily: 'monospace' }}>INITIALISING MAP</span>
                  <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.2em', fontFamily: 'monospace' }}>THEATRE OF OPERATIONS</span>
                </div>
              </div>
            }>
              <ConflictMap
                events={events}
                flights={flights}
                redAlerts={redAlerts}
                thermalHotspots={thermalHotspots}
                ewEvents={ewEvents}
                activeView={activeView}
                language={language}
                mapStyle={mapStyleUrl}
                focusLocation={focusLocation}
                isVisible={isVisible}
              />
            </Suspense>
          </MapErrorBoundary>
        </div>
        <MapLegend activeView={activeView} language={language} />
      </div>
    </div>
  );
});

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
    <div className="h-6 border-t border-white/[0.03] overflow-hidden relative shrink-0" data-testid="news-ticker" style={{background:'hsl(220 28% 13% / 0.83)'}}>
      <div className="absolute inset-y-0 left-0 w-14 z-10 flex items-center pl-3" style={{background:'linear-gradient(90deg, hsl(220 28% 13% / 0.95) 50%, transparent)'}}>
        <span className="text-[7px] font-black tracking-[0.35em] text-primary/30 font-mono">NEWS</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-10 z-10" style={{background:'linear-gradient(270deg, hsl(220 28% 13% / 0.95) 30%, transparent)'}} />
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


interface EscalationForecastData {
  nextHour: number;
  next3Hours: number;
  velocityPerHour: number;
  confidence: number;
  direction: 'surging' | 'escalating' | 'stable' | 'cooling';
  basisHours: number;
  projectedPeak: string;
}

interface RegionAnomalyData {
  region: string;
  currentCount: number;
  rollingAvg: number;
  zScore: number;
  pctAboveAvg: number;
  severity: 'critical' | 'warning';
}

interface AnalyticsData {
  alertsByRegion: Record<string, number>;
  alertsByType: Record<string, number>;
  alertTimeline: { time: string; count: number; regions?: Record<string, number>; types?: Record<string, number> }[];
  topSources: { channel: string; count: number; reliability: number }[];
  activeAlertCount: number;
  falseAlarmRate: number;
  avgResponseTime: number;
  threatTrend: 'escalating' | 'stable' | 'deescalating';
  patterns: PatternData[];
  falseAlarms: FalseAlarmData[];
  escalationForecast?: EscalationForecastData;
  regionAnomalies?: RegionAnomalyData[];
  conflictEventCount?: number;
  thermalHotspotCount?: number;
  militaryFlightCount?: number;
  eventsByType?: Record<string, number>;
  lastUpdated?: string;
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
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(220 30% 17% / 0.88)', borderBottom:'1px solid hsl(185 40% 40% / 0.1)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25" />
        <BarChart3 className="w-3.5 h-3.5 text-blue-400/55 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55 font-mono">{t('Analytics', '\u062A\u062D\u0644\u064A\u0644\u0627\u062A')}</span>
        <div className="flex-1" />
        {onMaximize && <button onClick={onMaximize} className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-white/10 transition-colors" data-testid="button-maximize-analytics">{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}</button>}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!analytics ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-blue-400/40 animate-spin mx-auto" /></div>
          ) : (
            <TooltipProvider delayDuration={200}>
              {/* ── Last updated timestamp ── */}
              {analytics.lastUpdated && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-default mb-1 -mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-[9px] font-mono text-foreground/30 hover:text-foreground/50 transition-colors">
                        Updated {timeAgo(analytics.lastUpdated)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono">
                    <p className="text-foreground/80">Last data refresh</p>
                    <p className="text-emerald-400">{new Date(analytics.lastUpdated).toUTCString()}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* ── Primary stat row ── */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: t('ACTIVE','نشط'), value: analytics.activeAlertCount, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-950/10', testid: 'text-active-alerts', tooltip: 'Oref red alerts currently within countdown window' },
                  { label: t('FALSE ALM','كاذب'), value: `${(analytics.falseAlarmRate * 100).toFixed(1)}%`, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-950/10', testid: 'text-false-alarm-rate', tooltip: 'Estimated false alarm rate based on AI scoring of alert patterns' },
                  { label: t('AVG RSP','متوسط'), value: `${analytics.avgResponseTime}s`, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-950/10', testid: 'text-avg-response', tooltip: 'Average shelter countdown time across active alerts' },
                  { label: t('TREND','اتجاه'), value: `${trendIcon}`, color: trendColor, border: 'border-white/[0.06]', bg: 'bg-white/[0.02]', testid: 'text-trend', sub: analytics.threatTrend.slice(0,4).toUpperCase(), tooltip: `Threat trend: ${analytics.threatTrend} (comparing last 30min vs prior 30min alert rate)` },
                ].map(stat => (
                  <Tooltip key={stat.label}>
                    <TooltipTrigger asChild>
                      <div className={`${stat.bg} border ${stat.border} rounded p-2 flex flex-col items-center gap-0.5 cursor-default hover:brightness-125 transition-all`}>
                        <span className="text-[8px] text-foreground/35 font-mono tracking-wider">{stat.label}</span>
                        <span className={`text-base font-black font-mono leading-none ${stat.color}`} data-testid={stat.testid}>{stat.value}</span>
                        {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-70`}>{stat.sub}</span>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                      <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* ── Live intel counters row ── */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    label: t('CONFLICT EVT','أحداث'), value: analytics.conflictEventCount ?? 0,
                    color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-950/10',
                    tooltip: `${analytics.conflictEventCount ?? 0} mapped conflict events from GDELT, Oref alerts, and NASA FIRMS thermal data`,
                    sub: analytics.eventsByType ? Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1])[0]?.[0]?.toUpperCase() : undefined,
                  },
                  {
                    label: t('THERMAL SAT','حراري'), value: analytics.thermalHotspotCount ?? 0,
                    color: 'text-red-300', border: 'border-red-500/20', bg: 'bg-red-950/10',
                    tooltip: 'NASA FIRMS VIIRS satellite thermal hotspots (high/nominal confidence) detected in theater in last 48h',
                    sub: 'NASA',
                  },
                  {
                    label: t('MIL FLIGHT','طيران'), value: analytics.militaryFlightCount ?? 0,
                    color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-950/10',
                    tooltip: 'Military aircraft currently tracked via ADS-B in Middle East theater',
                    sub: 'ADS-B',
                  },
                ].map(stat => (
                  <Tooltip key={stat.label}>
                    <TooltipTrigger asChild>
                      <div className={`${stat.bg} border ${stat.border} rounded p-2 flex flex-col items-center gap-0.5 cursor-default hover:brightness-125 transition-all`}>
                        <span className="text-[8px] text-foreground/35 font-mono tracking-wider truncate w-full text-center">{stat.label}</span>
                        <span className={`text-base font-black font-mono leading-none ${stat.color}`}>{stat.value}</span>
                        {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-60 truncate max-w-full`}>{stat.sub}</span>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                      <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* ── Event type breakdown ── */}
              {analytics.eventsByType && Object.keys(analytics.eventsByType).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 font-mono">{t('Live Event Types', 'أنواع الأحداث')}</span>
                    <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.eventsByType).reduce((s,v)=>s+v,0)} total</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1]).map(([type, count]) => {
                      const colors: Record<string, string> = {
                        missile: 'bg-red-950/40 border-red-500/25 text-red-300',
                        airstrike: 'bg-orange-950/40 border-orange-500/25 text-orange-300',
                        defense: 'bg-cyan-950/40 border-cyan-500/25 text-cyan-300',
                        ground: 'bg-yellow-950/40 border-yellow-500/25 text-yellow-300',
                        naval: 'bg-blue-950/40 border-blue-500/25 text-blue-300',
                        nuclear: 'bg-purple-950/40 border-purple-500/25 text-purple-300',
                      };
                      return (
                        <span key={type} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors[type] || 'bg-white/[0.03] border-white/10 text-foreground/50'}`}>
                          {type.toUpperCase()} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* ── Escalation Forecast ── */}
              {analytics.escalationForecast && (() => {
                const fc = analytics.escalationForecast;
                const dirConfig = {
                  surging:    { label: 'SURGING',    color: 'text-red-400',    bg: 'bg-red-950/30 border-red-500/30',    icon: '⚡', glow: 'shadow-[0_0_12px_rgb(239_68_68_/_0.25)]' },
                  escalating: { label: 'ESCALATING', color: 'text-orange-400', bg: 'bg-orange-950/25 border-orange-500/25', icon: '▲', glow: '' },
                  stable:     { label: 'STABLE',     color: 'text-yellow-400', bg: 'bg-yellow-950/20 border-yellow-500/20', icon: '●', glow: '' },
                  cooling:    { label: 'COOLING',    color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-500/20', icon: '▼', glow: '' },
                }[fc.direction];
                const confPct = Math.round(fc.confidence * 100);
                const velSign = fc.velocityPerHour >= 0 ? '+' : '';
                return (
                  <div className={`rounded border p-2.5 ${dirConfig.bg} ${dirConfig.glow}`} data-testid="section-escalation-forecast">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${dirConfig.color}`} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Escalation Forecast', 'توقعات التصعيد')}</span>
                      <div className="flex-1" />
                      <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded ${dirConfig.color}`} style={{background:'rgb(0 0 0 / 0.25)'}}>
                        {dirConfig.icon} {dirConfig.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 1h</span>
                        <span className={`text-xl font-black font-mono leading-none ${dirConfig.color}`}>{fc.nextHour}</span>
                        <span className="text-[7px] font-mono text-foreground/30">alerts</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 3h</span>
                        <span className={`text-xl font-black font-mono leading-none ${dirConfig.color}`}>{fc.next3Hours}</span>
                        <span className="text-[7px] font-mono text-foreground/30">alerts</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Velocity</span>
                        <span className={`text-xl font-black font-mono leading-none ${dirConfig.color}`}>{velSign}{fc.velocityPerHour}</span>
                        <span className="text-[7px] font-mono text-foreground/30">/hr</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono text-foreground/30">{t('Confidence', 'الثقة')}</span>
                      <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fc.confidence > 0.6 ? 'bg-emerald-400/70' : fc.confidence > 0.35 ? 'bg-yellow-400/70' : 'bg-red-400/50'}`}
                          style={{ width: `${confPct}%` }}
                        />
                      </div>
                      <span className={`text-[8px] font-black font-mono ${fc.confidence > 0.6 ? 'text-emerald-400' : fc.confidence > 0.35 ? 'text-yellow-400' : 'text-red-400/70'}`}>{confPct}%</span>
                      {fc.projectedPeak && (
                        <span className="text-[8px] font-mono text-foreground/25 ml-1">peak {fc.projectedPeak}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── Region Anomalies ── */}
              {analytics.regionAnomalies && analytics.regionAnomalies.length > 0 && (
                <div data-testid="section-region-anomalies">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Anomaly Detection', 'رصد الشذوذ')}</span>
                    <div className="flex-1" />
                    <span className="text-[8px] font-mono text-foreground/30">{analytics.regionAnomalies.length} flagged</span>
                  </div>
                  <div className="space-y-1" data-testid="list-anomalies">
                    {analytics.regionAnomalies.map(a => {
                      const isCrit = a.severity === 'critical';
                      const barPct = Math.min(100, Math.round((a.zScore / 4) * 100));
                      return (
                        <div
                          key={a.region}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
                            isCrit
                              ? 'bg-red-950/25 border-red-500/25 hover:border-red-500/45'
                              : 'bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40'
                          }`}
                          data-testid={`anomaly-${a.region.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCrit ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span className={`text-[10px] font-bold font-mono w-16 truncate ${isCrit ? 'text-red-300' : 'text-amber-300'}`}>{a.region}</span>
                          <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isCrit ? 'bg-red-400/65' : 'bg-amber-400/55'}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <div className="flex flex-col items-end gap-0">
                            <span className={`text-[9px] font-black font-mono ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>
                              {a.pctAboveAvg > 0 ? '+' : ''}{a.pctAboveAvg}%
                            </span>
                            <span className="text-[7px] font-mono text-foreground/25">z={a.zScore.toFixed(1)}</span>
                          </div>
                          <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ml-1 ${
                            isCrit ? 'text-red-400 bg-red-950/50 border-red-500/30' : 'text-amber-400 bg-amber-950/40 border-amber-500/25'
                          }`}>{isCrit ? 'CRIT' : 'WARN'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('24h Alert Timeline', 'الجدول الزمني 24 ساعة')}</span>
                  <span className="text-[9px] font-mono text-foreground/30">UTC · {analytics.alertTimeline.reduce((s, b) => s + b.count, 0)} alerts</span>
                </div>
                <div className="flex items-end gap-[2px] h-16 bg-white/[0.02] rounded border border-white/[0.04] px-1.5 pt-1.5 pb-0" data-testid="chart-timeline">
                  {analytics.alertTimeline.map((b, i) => {
                    const topRegions = Object.entries(b.regions || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                    const topTypes = Object.entries(b.types || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                    const barColor = b.count > maxTimeline * 0.7 ? 'rgb(239 68 68 / 0.75)' :
                      b.count > maxTimeline * 0.4 ? 'rgb(251 146 60 / 0.65)' : 'rgb(59 130 246 / 0.55)';
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="flex-1 flex flex-col items-center justify-end h-full group cursor-default">
                            <div
                              className="w-full rounded-t-[2px] transition-all group-hover:brightness-150 group-hover:scale-y-105 min-h-[2px] origin-bottom"
                              style={{ height: `${Math.max(3, (b.count / maxTimeline) * 80)}%`, background: barColor }}
                            />
                            {i % 6 === 0 && (
                              <span className="text-[7px] font-mono text-foreground/25 mt-0.5 leading-none">{b.time}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-black/95 border-white/10 p-2 min-w-[130px]">
                          <p className="text-[11px] font-black font-mono text-foreground/90 mb-1">{b.time} UTC</p>
                          <p className="text-[10px] font-mono text-foreground/60 mb-1.5">{b.count} alert{b.count !== 1 ? 's' : ''}</p>
                          {topRegions.length > 0 && (
                            <div className="mb-1">
                              <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Regions</p>
                              {topRegions.map(([r, c]) => (
                                <div key={r} className="flex justify-between gap-3">
                                  <span className="text-[9px] font-mono text-foreground/55">{r}</span>
                                  <span className="text-[9px] font-bold font-mono text-orange-300/80">{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {topTypes.length > 0 && (
                            <div>
                              <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Types</p>
                              {topTypes.map(([t, c]) => (
                                <div key={t} className="flex justify-between gap-3">
                                  <span className="text-[9px] font-mono text-foreground/55 uppercase">{t.replace(/_/g,' ')}</span>
                                  <span className="text-[9px] font-bold font-mono text-blue-300/80">{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {b.count === 0 && <p className="text-[9px] font-mono text-foreground/25 italic">No alerts this hour</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 font-mono">{t('By Region', 'المنطقة')}</span>
                    <span className="text-[8px] font-mono text-foreground/25">{regionEntries.reduce((s,[,v])=>s+v,0)}</span>
                  </div>
                  <div className="space-y-1" data-testid="chart-by-region">
                    {regionEntries.slice(0, 7).map(([region, count]) => {
                      const pct = (count / maxRegion) * 100;
                      const barColor = pct > 70 ? 'bg-red-500/60' : pct > 40 ? 'bg-orange-500/55' : 'bg-amber-500/45';
                      return (
                        <div key={region} className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono text-foreground/45 w-14 truncate">{region}</span>
                          <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.max(6, pct)}%` }} />
                          </div>
                          <span className="text-[8px] font-bold font-mono text-foreground/45 w-4 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/40 font-mono">{t('By Type', 'النوع')}</span>
                    <span className="text-[8px] font-mono text-foreground/25">{typeEntries.length}</span>
                  </div>
                  <div className="space-y-1" data-testid="chart-by-type">
                    {typeEntries.slice(0, 7).map(([type, count]) => {
                      const pct = (count / maxType) * 100;
                      const typeColors: Record<string, string> = {
                        missile: 'bg-red-500/60', airstrike: 'bg-orange-500/55',
                        rocket: 'bg-amber-500/50', drone: 'bg-purple-500/55',
                        artillery: 'bg-yellow-500/50', ground_incursion: 'bg-emerald-500/50',
                        gps_jamming: 'bg-cyan-500/50', gps_spoofing: 'bg-cyan-400/50',
                        power: 'bg-yellow-400/50', hospital: 'bg-rose-400/50',
                      };
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono text-foreground/45 w-14 truncate uppercase">{type.replace(/_/g,' ')}</span>
                          <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                            <div className={`h-full ${typeColors[type] || 'bg-blue-500/50'} rounded-full`} style={{ width: `${Math.max(6, pct)}%` }} />
                          </div>
                          <span className="text-[8px] font-bold font-mono text-foreground/45 w-4 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Source Reliability', 'موثوقية المصادر')}</span>
                  <span className="text-[9px] font-mono text-foreground/30">{analytics.topSources.length} feeds</span>
                </div>
                <div className="space-y-1" data-testid="table-sources">
                  {analytics.topSources.map((src) => {
                    const reliabilityPct = (src.reliability * 100).toFixed(0);
                    const reliabilityColor = src.reliability > 0.85 ? 'text-emerald-400' : src.reliability > 0.7 ? 'text-yellow-400' : 'text-red-400';
                    const reliabilityBg = src.reliability > 0.85 ? 'bg-emerald-950/30 border-emerald-500/20' : src.reliability > 0.7 ? 'bg-yellow-950/30 border-yellow-500/20' : 'bg-red-950/30 border-red-500/20';
                    const reliabilityLabel = src.reliability > 0.85 ? 'High reliability — primary source' : src.reliability > 0.7 ? 'Moderate reliability — verify with second source' : 'Low reliability — use with caution';
                    return (
                      <Tooltip key={src.channel}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.04] cursor-default">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.reliability > 0.85 ? 'bg-emerald-400' : src.reliability > 0.7 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                            <span className="text-[10px] font-mono text-foreground/65 flex-1 truncate">{src.channel}</span>
                            <span className="text-[9px] font-mono text-foreground/30 mr-1">{src.count}msg</span>
                            <div className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border ${reliabilityBg} ${reliabilityColor}`}>
                              {reliabilityPct}%
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                          <p className="text-foreground/80 font-bold mb-0.5">{src.channel}</p>
                          <p className={`${reliabilityColor} mb-0.5`}>{reliabilityLabel}</p>
                          <p className="text-foreground/40">{src.count} messages processed this session</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {patterns.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('Detected Patterns', '\u0623\u0646\u0645\u0627\u0637')}</span>
                  <div className="space-y-1.5" data-testid="list-patterns">
                    {patterns.map(p => (
                      <Tooltip key={p.id}>
                        <TooltipTrigger asChild>
                          <div className="p-2 rounded bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-default" data-testid={`pattern-${p.id}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span className="text-[11px] font-bold text-purple-300 font-mono uppercase">{p.type.replace(/_/g, ' ')}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${p.confidence > 0.7 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-400'}`}>{(p.confidence * 100).toFixed(0)}%</span>
                              <span className="ml-auto text-[8px] font-mono text-foreground/30">{timeAgo(p.detectedAt)}</span>
                            </div>
                            <p className="text-[10px] text-foreground/50">{p.description}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                          <p className="text-foreground/50 mb-0.5">Detected at</p>
                          <p className="text-foreground/80">{new Date(p.detectedAt).toUTCString()}</p>
                          {p.affectedRegions.length > 0 && <p className="text-foreground/40 mt-1">Regions: {p.affectedRegions.join(', ')}</p>}
                          <p className="text-foreground/40 mt-0.5">{p.alertCount} alerts in pattern</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {falseAlarms.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono mb-2 block">{t('False Alarm Analysis', '\u062A\u062D\u0644\u064A\u0644 \u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629')}</span>
                  <div className="space-y-1" data-testid="list-false-alarms">
                    {falseAlarms.slice(0, 10).map(fa => (
                      <Tooltip key={fa.alertId}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-default" data-testid={`false-alarm-${fa.alertId}`}>
                            <div className={`w-2 h-2 rounded-full ${fa.score > 0.7 ? 'bg-red-500' : fa.score > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                            <span className="text-[10px] font-mono text-foreground/60 flex-1 truncate">{fa.recommendation.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] font-mono text-foreground/40 truncate max-w-[120px]">{fa.reasons[0] || ''}</span>
                            <span className="text-[10px] font-bold font-mono text-foreground/50">{(fa.score * 100).toFixed(0)}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                          <p className={`font-bold mb-1 ${fa.score > 0.7 ? 'text-red-400' : fa.score > 0.4 ? 'text-yellow-400' : 'text-emerald-400'}`}>{fa.recommendation.replace(/_/g,' ').toUpperCase()}</p>
                          <p className="text-foreground/50 mb-0.5">Alert ID: {fa.alertId}</p>
                          {fa.reasons.map((r, i) => <p key={i} className="text-foreground/60">• {r}</p>)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </TooltipProvider>
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

function RocketStatsPanel({ language, onClose, onMaximize, isMaximized, stats }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; stats: RocketStats | null }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [activeTab, setActiveTab] = useState<'overview' | 'gcc' | 'lebanon' | 'live'>('overview');
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [liveFeedLoading, setLiveFeedLoading] = useState(false);
  const [liveFeedError, setLiveFeedError] = useState(false);
  const liveFetchedRef = useRef(false);

  const originEntries = stats ? Object.entries(stats.totalByOrigin).sort(([, a], [, b]) => b - a) : [];
  const targetEntries = stats ? Object.entries(stats.totalByTarget).sort(([, a], [, b]) => b - a).slice(0, 8) : [];
  const maxOrigin = originEntries.length > 0 ? Math.max(...originEntries.map(e => e[1])) : 1;
  const maxTarget = targetEntries.length > 0 ? Math.max(...targetEntries.map(e => e[1])) : 1;

  const corridorsToIsrael = stats?.corridors.filter(c => c.targetCountry === 'Israel') || [];
  const corridorsFromIsrael = stats?.corridors.filter(c => c.originCountry === 'Israel') || [];
  const totalToIsrael = corridorsToIsrael.reduce((s, c) => s + c.totalLaunches, 0);
  const totalFromIsrael = corridorsFromIsrael.reduce((s, c) => s + c.totalLaunches, 0);

  const gccCorridors = stats?.gccCorridors || [];
  const gccIncoming = gccCorridors.filter(c => ['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman','International'].includes(c.targetCountry));
  const gccOutgoing = gccCorridors.filter(c => ['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman'].includes(c.originCountry));
  const totalGCCHits = gccIncoming.reduce((s, c) => s + c.totalLaunches, 0);
  const totalGCCIntercepted = gccIncoming.reduce((s, c) => s + c.intercepted, 0);
  const lblCorridors = stats?.lebanonCorridors || [];
  const lblToIsrael = lblCorridors.filter(c => c.originCountry === 'Lebanon');
  const lblFromIsrael = lblCorridors.filter(c => c.originCountry === 'Israel' && c.targetCountry === 'Lebanon');
  const totalLblFired = lblToIsrael.reduce((s, c) => s + c.totalLaunches, 0);
  const totalLblReceived = lblFromIsrael.reduce((s, c) => s + c.totalLaunches, 0);

  useEffect(() => {
    if (activeTab !== 'live' || liveFetchedRef.current) return;
    liveFetchedRef.current = true;
    setLiveFeedLoading(true);
    setLiveFeedError(false);
    fetch('/api/live-conflict-feed')
      .then(r => r.json())
      .then(data => { setLiveFeed(Array.isArray(data) ? data : []); setLiveFeedLoading(false); })
      .catch(() => { setLiveFeedError(true); setLiveFeedLoading(false); });
  }, [activeTab]);

  const getCountryIcon = (country: string) => {
    if (country === 'Israel') return <Shield className="w-3 h-3 text-blue-400" />;
    if (country === 'Lebanon') return <Target className="w-3 h-3 text-green-400" />;
    if (country === 'Palestine') return <Flame className="w-3 h-3 text-orange-400" />;
    if (country === 'Iran') return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (country === 'Yemen') return <Crosshair className="w-3 h-3 text-yellow-400" />;
    if (country === 'Syria') return <Radio className="w-3 h-3 text-purple-400" />;
    if (country === 'Iraq') return <Zap className="w-3 h-3 text-amber-400" />;
    if (country === 'United States') return <Globe className="w-3 h-3 text-cyan-400" />;
    if (['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman'].includes(country)) return <Shield className="w-3 h-3 text-emerald-400" />;
    return <Globe className="w-3 h-3 text-gray-400" />;
  };

  const attackTypeColor = (at: string) => {
    if (at === 'rocket') return '#f97316';
    if (at === 'missile') return '#ef4444';
    if (at === 'drone') return '#facc15';
    if (at === 'airstrike') return '#60a5fa';
    if (at === 'naval') return '#34d399';
    return '#94a3b8';
  };
  const attackTypeLabel = (at: string) => ({'rocket':'ROCKET','missile':'MISSILE','drone':'DRONE','airstrike':'AIRSTRIKE','naval':'NAVAL'}[at] || 'EVENT');

  const CorridorRow = ({ c, barColor, maxLaunches }: { c: RocketCorridor; barColor: string; maxLaunches: number }) => (
    <div className="flex items-center gap-1.5 text-[9px] py-0.5">
      {getCountryIcon(c.originCountry)}
      <span className="text-foreground/70 font-mono w-[60px] truncate">{c.origin}</span>
      <ArrowRight className="w-2.5 h-2.5 shrink-0" style={{ color: barColor + '80' }} />
      {getCountryIcon(c.targetCountry)}
      <span className="text-foreground/50 font-mono w-[60px] truncate">{c.target}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{ background: 'hsl(220 25% 12%)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.totalLaunches / Math.max(maxLaunches, 1)) * 100)}%`, background: c.active ? barColor : barColor + '55' }} />
      </div>
      <span className="text-foreground/80 font-mono font-bold w-[36px] text-right">{c.totalLaunches.toLocaleString()}</span>
      {c.active && <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: barColor }} />}
    </div>
  );

  const TypeBreakdown = ({ corridors, color }: { corridors: RocketCorridor[]; color: string }) => {
    const rockets = corridors.reduce((s, c) => s + c.rockets, 0);
    const missiles = corridors.reduce((s, c) => s + c.missiles, 0);
    const drones = corridors.reduce((s, c) => s + c.drones, 0);
    const intercepted = corridors.reduce((s, c) => s + c.intercepted, 0);
    const total = corridors.reduce((s, c) => s + c.totalLaunches, 0);
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${color}18` }}>
        {rockets > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Rockets','صواريخ')}: <span className="text-orange-400 font-bold">{rockets.toLocaleString()}</span></span>}
        {missiles > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Missiles','قذائف')}: <span className="text-red-400 font-bold">{missiles.toLocaleString()}</span></span>}
        {drones > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Drones','مسيّرات')}: <span className="text-yellow-400 font-bold">{drones.toLocaleString()}</span></span>}
        {total > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Intercept','اعتراض')}: <span className="text-emerald-400 font-bold">{intercepted.toLocaleString()} ({total > 0 ? ((intercepted/total)*100).toFixed(0) : 0}%)</span></span>}
      </div>
    );
  };

  const TABS = [
    { id: 'overview', label: t('Overview','نظرة') },
    { id: 'gcc',      label: t('GCC','الخليج') },
    { id: 'lebanon',  label: t('Lebanon','لبنان') },
    { id: 'live',     label: t('Live','مباشر') },
  ] as const;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-rocketstats">
      {/* Header */}
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing" style={{background:'hsl(220 30% 17% / 0.88)', borderBottom:'1px solid hsl(185 40% 40% / 0.1)'}}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25" />
        <Rocket className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[10px] font-bold tracking-wider text-foreground/90 uppercase font-mono flex-1">{t('Launch Statistics', 'إحصائيات الإطلاق')}</span>
        <span className="text-[7px] text-yellow-500/70 font-mono px-1 py-0.5 rounded" style={{background:'hsl(45 80% 30% / 0.15)', border:'1px solid hsl(45 60% 40% / 0.2)'}} data-testid="badge-estimated">{t('EST.', 'تقدير')}</span>
        {stats && <span className="text-[8px] text-primary/60 font-mono">{new Date(stats.generatedAt).toLocaleTimeString()}</span>}
        <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={() => onMaximize?.()} />
        <PanelMinimizeButton onMinimize={() => onClose?.()} />
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{background:'hsl(220 28% 15%)', borderColor:'hsl(185 20% 20% / 0.3)'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
            style={{ color: activeTab === tab.id ? 'hsl(185 100% 55%)' : 'hsl(220 10% 45%)', borderBottom: activeTab === tab.id ? '2px solid hsl(185 100% 42%)' : '2px solid transparent', background: activeTab === tab.id ? 'hsl(185 40% 18% / 0.25)' : 'transparent' }}>
            {tab.id === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2" style={{background:'hsl(220 28% 14% / 0.97)'}}>
        {!stats && activeTab !== 'live' ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5" data-testid="stats-summary">
              <div className="rounded p-1.5 text-center" style={{background:'hsl(220 30% 18% / 0.7)', border:'1px solid hsl(185 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-primary font-mono" data-testid="text-total-launches">{stats.totalLaunches.toLocaleString()}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Total Launches', 'إجمالي')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(220 30% 18% / 0.7)', border:'1px solid hsl(120 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-emerald-400 font-mono" data-testid="text-intercepted">{stats.totalIntercepted.toLocaleString()}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Intercepted', 'اعتراض')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(220 30% 18% / 0.7)', border:'1px solid hsl(0 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-orange-400 font-mono" data-testid="text-last-24h">{stats.last24h}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Last 24h', 'آخر 24 ساعة')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(220 30% 18% / 0.7)', border:'1px solid hsl(45 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-yellow-400 font-mono" data-testid="text-active-fronts">{stats.activeFronts}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Active Fronts', 'جبهات')}</div>
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(220 30% 18% / 0.5)', border:'1px solid hsl(185 25% 22% / 0.3)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Intercept Rate', 'نسبة الاعتراض')}</span>
                </div>
                <span className="text-[11px] font-black text-emerald-400 font-mono" data-testid="text-intercept-rate">{(stats.interceptRate * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{background:'hsl(220 25% 12%)'}}>
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${stats.interceptRate * 100}%`, background:'linear-gradient(90deg, hsl(120 70% 35%), hsl(120 80% 45%))'}} />
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(0 30% 16% / 0.4)', border:'1px solid hsl(0 40% 30% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">{t(`Launched Towards Israel (${totalToIsrael})`, `أُطلقت نحو إسرائيل (${totalToIsrael})`)}</span>
              </div>
              <div className="space-y-1" data-testid="corridors-to-israel">
                {corridorsToIsrael.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]" data-testid={`corridor-to-${i}`}>
                    {getCountryIcon(c.originCountry)}
                    <span className="text-foreground/70 font-mono w-[70px] truncate">{c.origin}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-red-400/50 shrink-0" />
                    <span className="text-foreground/50 font-mono w-[60px] truncate">{c.target}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{background:'hsl(220 25% 12%)'}}>
                      <div className="h-full rounded-full" style={{width:`${Math.max(5, (c.totalLaunches / Math.max(corridorsToIsrael[0]?.totalLaunches || 1, 1)) * 100)}%`, background: c.active ? 'hsl(0 70% 50%)' : 'hsl(0 40% 35%)'}} />
                    </div>
                    <span className="text-foreground/80 font-mono font-bold w-[30px] text-right">{c.totalLaunches}</span>
                    {c.active && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1.5 pt-1 border-t border-red-500/10">
                <span className="text-[8px] text-foreground/40 font-mono">
                  {t('Rockets', 'صواريخ')}: <span className="text-orange-400">{corridorsToIsrael.reduce((s, c) => s + c.rockets, 0)}</span>
                </span>
                <span className="text-[8px] text-foreground/40 font-mono">
                  {t('Missiles', 'قذائف')}: <span className="text-red-400">{corridorsToIsrael.reduce((s, c) => s + c.missiles, 0)}</span>
                </span>
                <span className="text-[8px] text-foreground/40 font-mono">
                  {t('Drones', 'طائرات مسيّرة')}: <span className="text-yellow-400">{corridorsToIsrael.reduce((s, c) => s + c.drones, 0)}</span>
                </span>
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(210 30% 16% / 0.4)', border:'1px solid hsl(210 40% 30% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{t(`Launched From Israel (${totalFromIsrael})`, `أُطلقت من إسرائيل (${totalFromIsrael})`)}</span>
              </div>
              <div className="space-y-1" data-testid="corridors-from-israel">
                {corridorsFromIsrael.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]" data-testid={`corridor-from-${i}`}>
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-foreground/70 font-mono w-[70px] truncate">{c.origin}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-blue-400/50 shrink-0" />
                    {getCountryIcon(c.targetCountry === 'Palestine' ? 'Palestine' : c.targetCountry)}
                    <span className="text-foreground/50 font-mono w-[60px] truncate">{c.target}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{background:'hsl(220 25% 12%)'}}>
                      <div className="h-full rounded-full" style={{width:`${Math.max(5, (c.totalLaunches / Math.max(corridorsFromIsrael[0]?.totalLaunches || 1, 1)) * 100)}%`, background: c.active ? 'hsl(210 70% 50%)' : 'hsl(210 40% 35%)'}} />
                    </div>
                    <span className="text-foreground/80 font-mono font-bold w-[30px] text-right">{c.totalLaunches}</span>
                    {c.active && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1.5 pt-1 border-t border-blue-500/10">
                <span className="text-[8px] text-foreground/40 font-mono">
                  {t('Missiles', 'قذائف')}: <span className="text-blue-400">{corridorsFromIsrael.reduce((s, c) => s + c.missiles, 0)}</span>
                </span>
                <span className="text-[8px] text-foreground/40 font-mono">
                  {t('Drones', 'طائرات مسيّرة')}: <span className="text-cyan-400">{corridorsFromIsrael.reduce((s, c) => s + c.drones, 0)}</span>
                </span>
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(220 30% 18% / 0.5)', border:'1px solid hsl(185 25% 22% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Rocket className="w-3 h-3 text-primary/70" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('By Launch Origin', 'حسب مصدر الإطلاق')}</span>
              </div>
              <div className="space-y-1" data-testid="origin-chart">
                {originEntries.map(([origin, count], i) => (
                  <div key={origin} className="flex items-center gap-1.5" data-testid={`origin-bar-${i}`}>
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{origin}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(220 25% 12%)'}}>
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${(count / maxOrigin) * 100}%`, background: count === maxOrigin ? 'hsl(185 100% 42%)' : 'hsl(185 60% 35%)'}} />
                    </div>
                    <span className="text-[8px] text-foreground/70 font-mono w-[28px] text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(220 30% 18% / 0.5)', border:'1px solid hsl(185 25% 22% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Target className="w-3 h-3 text-red-400/70" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Top Targets', 'الأهداف الرئيسية')}</span>
              </div>
              <div className="space-y-1" data-testid="target-chart">
                {targetEntries.map(([target, count], i) => (
                  <div key={target} className="flex items-center gap-1.5" data-testid={`target-bar-${i}`}>
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{target}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(220 25% 12%)'}}>
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${(count / maxTarget) * 100}%`, background: count === maxTarget ? 'hsl(0 70% 50%)' : 'hsl(0 50% 35%)'}} />
                    </div>
                    <span className="text-[8px] text-foreground/70 font-mono w-[28px] text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded p-1.5" style={{background:'hsl(220 30% 18% / 0.5)', border:'1px solid hsl(185 25% 22% / 0.3)'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Peak Hour', 'ساعة الذروة')}</div>
                <div className="text-[12px] font-bold text-primary font-mono" data-testid="text-peak-hour">{stats.peakHour} UTC</div>
              </div>
              <div className="rounded p-1.5" style={{background:'hsl(220 30% 18% / 0.5)', border:'1px solid hsl(185 25% 22% / 0.3)'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Last Hour', 'الساعة الأخيرة')}</div>
                <div className="text-[12px] font-bold font-mono" data-testid="text-last-1h">
                  <span className={stats.last1h > 5 ? 'text-red-400' : stats.last1h > 0 ? 'text-orange-400' : 'text-green-400'}>{stats.last1h}</span>
                  <span className="text-[8px] text-foreground/40 ml-1">{t('launches', 'إطلاقات')}</span>
                </div>
              </div>
            </div>

            <div className="text-[7px] text-foreground/30 text-center font-mono space-y-0.5" data-testid="text-rocket-generated-at">
              <div>{t('Origins inferred from target geography. Intercepts estimated.', 'المصادر مستنتجة من الجغرافيا. الاعتراضات تقديرية.')}</div>
              <div>{t('Generated', 'تم الإنشاء')}: {new Date(stats.generatedAt).toLocaleTimeString()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AttackPredictorPanel({ language, onClose, onMaximize, isMaximized, prediction }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; prediction: AttackPrediction | null }) {
  const threatColors: Record<string, string> = {
    EXTREME: 'text-red-400',
    HIGH: 'text-orange-400',
    ELEVATED: 'text-yellow-400',
    MODERATE: 'text-blue-400',
    LOW: 'text-green-400',
  };
  const threatBgs: Record<string, string> = {
    EXTREME: 'bg-red-500/15 border-red-500/30',
    HIGH: 'bg-orange-500/15 border-orange-500/30',
    ELEVATED: 'bg-yellow-500/15 border-yellow-500/30',
    MODERATE: 'bg-blue-500/15 border-blue-500/30',
    LOW: 'bg-green-500/15 border-green-500/30',
  };
  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border-green-500/30',
  };
  const VectorIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'rockets': return <Zap className="w-3 h-3 text-red-400" />;
      case 'missiles': return <Target className="w-3 h-3 text-orange-400" />;
      case 'uav': return <Plane className="w-3 h-3 text-yellow-400" />;
      case 'cruise_missile': return <Plane className="w-3 h-3 text-red-300" />;
      case 'ballistic': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'mortar': return <Crosshair className="w-3 h-3 text-orange-300" />;
      case 'anti_tank': return <Shield className="w-3 h-3 text-blue-400" />;
      case 'combined': return <ShieldAlert className="w-3 h-3 text-yellow-300" />;
      default: return <AlertTriangle className="w-3 h-3 text-white/50" />;
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="panel-attackpred">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-semibold tracking-wide uppercase text-white/90">{language === 'ar' ? 'توقع الهجوم بالذكاء الاصطناعي' : 'AI Attack Predictor'}</span>
          {prediction?.dataPoints?.isEscalating && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/25 text-red-300 rounded border border-red-500/30 animate-pulse" data-testid="badge-escalating">ESCALATING</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onMaximize && <PanelMaximizeButton isMaximized={isMaximized || false} onToggle={onMaximize} />}
          {onClose && <PanelMinimizeButton onMinimize={onClose} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {!prediction ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-[10px] text-white/40">Generating AI predictions...</span>
            </div>
          </div>
        ) : (
          <>
            <div className={`flex items-center justify-between p-2 rounded border ${threatBgs[prediction.overallThreatLevel] || threatBgs.HIGH}`} data-testid="threat-level-banner">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${threatColors[prediction.overallThreatLevel] || 'text-orange-400'}`} />
                <div>
                  <div className={`text-[11px] font-bold ${threatColors[prediction.overallThreatLevel] || 'text-orange-400'}`}>
                    {prediction.overallThreatLevel} THREAT
                  </div>
                  <div className="text-[9px] text-white/50">
                    AI Confidence: {Math.round(prediction.confidence * 100)}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-white/40">Next target</div>
                <div className="text-[10px] font-medium text-white/80" data-testid="text-next-target">{prediction.nextLikelyTarget}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 flex-1">
                <Activity className="w-3 h-3 text-cyan-400/70" />
                <span className="text-[9px] text-white/50">{prediction.dataPoints.totalAlerts} alerts</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <Zap className="w-3 h-3 text-yellow-400/70" />
                <span className="text-[9px] text-white/50">{prediction.dataPoints.velocityPerHour}/hr</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                {prediction.dataPoints.isEscalating ? <TrendingUp className="w-3 h-3 text-red-400/70" /> : <TrendingDown className="w-3 h-3 text-green-400/70" />}
                <span className="text-[9px] text-white/50">{prediction.dataPoints.velocity30m} / 30m</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider px-1">{language === 'ar' ? 'توقعات التهديد' : 'Threat Predictions'}</div>
              {prediction.predictions.map((p, i) => (
                <div key={i} className={`p-2 rounded border ${severityColors[p.severity]} bg-opacity-50`} data-testid={`prediction-card-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <VectorIcon type={p.threatVector} />
                      <span className="text-[10px] font-semibold text-white/90">{p.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${p.probability >= 0.7 ? 'bg-red-500/25 text-red-300' : p.probability >= 0.4 ? 'bg-yellow-500/25 text-yellow-300' : 'bg-blue-500/25 text-blue-300'}`} data-testid={`text-probability-${i}`}>
                        {Math.round(p.probability * 100)}%
                      </span>
                      <span className="text-[9px] text-white/40 font-mono" data-testid={`text-timeframe-${i}`}>{p.timeframe}</span>
                    </div>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/10 mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${p.probability >= 0.7 ? 'bg-red-400' : p.probability >= 0.4 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.round(p.probability * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[9px] text-white/50 leading-relaxed flex-1">{p.rationale}</div>
                    <div className="text-[8px] text-white/30 shrink-0">
                      {p.threatVector.replace('_', ' ')} | {p.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 rounded border border-cyan-500/15 bg-cyan-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3 h-3 text-cyan-400/70" />
                <span className="text-[9px] font-semibold text-cyan-300/80 uppercase tracking-wider">{language === 'ar' ? 'تحليل الأنماط' : 'Pattern Analysis'}</span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed" data-testid="text-pattern-summary">{prediction.patternSummary}</p>
            </div>

            <div className="p-2 rounded border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="w-3 h-3 text-orange-400/70" />
                <span className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">{language === 'ar' ? 'اتجاه التصعيد' : 'Escalation Vector'}</span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed" data-testid="text-escalation-vector">{prediction.escalationVector}</p>
            </div>

            {prediction.dataPoints.topRegions.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] font-semibold text-white/40 uppercase tracking-wider px-1">{language === 'ar' ? 'مناطق مستهدفة' : 'Targeted Regions'}</div>
                {prediction.dataPoints.topRegions.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-1" data-testid={`region-bar-${i}`}>
                    <span className="text-[9px] text-white/60 w-20 truncate">{r.region}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/40 transition-all duration-500"
                        style={{ width: `${Math.min(100, (r.count / Math.max(...prediction.dataPoints.topRegions.map(x => x.count), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/40 font-mono w-8 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[8px] text-white/20 text-center pt-1" data-testid="text-generated-at">
              Updated: {new Date(prediction.generatedAt).toLocaleTimeString()}
            </div>
          </>
        )}
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
}: {
  visiblePanels: Record<PanelId, boolean>;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  language: 'en' | 'ar';
  panelStats: Partial<Record<PanelId, string | number>>;
}) {
  const topGroup: PanelId[] = ['map', 'alerts', 'intel', 'telegram', 'livefeed'];
  const bottomGroup: PanelId[] = ['events', 'radar', 'markets', 'ew', 'infra', 'alertmap', 'analytics', 'osint', 'sitrep'];


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
        className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-md relative group
          ${active
            ? 'bg-primary/[0.1] text-foreground/90'
            : 'text-foreground/45 hover:text-foreground/70 hover:bg-white/[0.03] active:bg-white/[0.05]'
          }`}
        style={{ transition: 'all 0.14s cubic-bezier(0.4,0,0.2,1)' }}
        data-testid={`sidebar-panel-${id}`}
        title={active ? `Hide ${cfg.label}` : `Show ${cfg.label}`}
      >
        {active && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary/70" style={{boxShadow:'0 0 6px hsl(185 100% 42% / 0.4)'}} />}
        <Icon className={`w-3.5 h-3.5 shrink-0 ml-1 ${active ? 'text-primary/75' : 'text-foreground/35 group-hover:text-foreground/55'}`} style={{ transition: 'color 0.14s ease' }} />
        <span className={`text-[11px] font-mono font-semibold uppercase tracking-wide flex-1 text-left leading-none truncate ${active ? 'text-foreground/85' : 'text-foreground/45 group-hover:text-foreground/65'}`} style={{ transition: 'color 0.14s ease' }}>
          {language === 'en' ? cfg.label : cfg.labelAr}
        </span>
        {stat !== undefined && stat !== '' && (
          <span className={`text-[9px] font-mono tabular-nums shrink-0 px-1.5 py-0.5 rounded-full ${active ? 'text-primary/65 bg-primary/[0.12]' : 'text-foreground/25 bg-white/[0.03]'}`} style={{ transition: 'all 0.14s ease' }}>
            {stat}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-y-auto overflow-x-hidden"
      style={{ width: 220, background: 'hsl(220 28% 12% / 0.94)', borderRight: '1px solid hsl(185 40% 22% / 0.18)' }}
    >
      {/* PRIMARY section */}
      <div className="px-3 pt-3.5 pb-1 flex items-center gap-1.5">
        <div className="w-1.5 h-px bg-primary/25" />
        <span className="text-[8px] font-mono font-black text-foreground/20 tracking-[0.28em] uppercase">Primary</span>
      </div>
      <div className="flex flex-col gap-px px-1.5 pb-1">
        {topGroup.map(id => renderBtn(id))}
      </div>
      <div className="mx-3 my-2 h-px" style={{background:'linear-gradient(90deg, transparent, hsl(185 40% 30% / 0.15), transparent)'}} />
      {/* INTELLIGENCE section */}
      <div className="px-3 pb-1 flex items-center gap-1.5">
        <div className="w-1.5 h-px bg-cyan-500/20" />
        <span className="text-[8px] font-mono font-black text-foreground/20 tracking-[0.28em] uppercase">Intelligence</span>
      </div>
      <div className="flex flex-col gap-px px-1.5 pb-2">
        {bottomGroup.map(id => renderBtn(id))}
      </div>
    </div>
  );
}

declare const L: any;

function LiveFlightTracker({ flight, allFlights, language, onClose }: {
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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return w >= 768 && (isTouch ? w < 1400 : w < 1200);
  });
  const [isLandscape, setIsLandscape] = useState(() => typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('map');
  const [showMobilePanelPicker, setShowMobilePanelPicker] = useState(false);
  const swipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  const panelWrapperRef = useRef<HTMLDivElement>(null);
  const panelsScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const SWIPE_TABS: PanelId[] = ['map', 'alerts', 'telegram', 'events', 'intel', 'markets'];

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        setIsMobile(w < 768);
        // Tablet: touch devices up to 1400px (catches iPad Pro 12.9" landscape), or non-touch small screens up to 1200px
        setIsTablet(w >= 768 && (isTouch ? w < 1400 : w < 1200));
        setIsLandscape(w > h);
      });
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 100));
    return () => {
      window.removeEventListener('resize', check);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Track scroll position on panels container to show/hide scroll buttons
  useEffect(() => {
    const el = panelsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 40;
      setShowScrollDown(!atBottom && scrollHeight > clientHeight + 40);
      setShowScrollTop(scrollTop > 80);
    };
    onScroll(); // run once on mount
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  


  const defaultVisible = { intel: true, map: true, telegram: true, events: true, radar: true, alerts: true, markets: true, ew: true, infra: true, livefeed: true, alertmap: false, analytics: false, osint: true, sitrep: false, attackpred: true, rocketstats: true };
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
      const saved = JSON.parse(localStorage.getItem('warroom_grid_layout_v6') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        const defaults = new Map(DEFAULT_GRID_LAYOUT.map(d => [d.i, d]));
        const merged = saved.map((item: GridItemLayout) => {
          const def = defaults.get(item.i);
          if (def) return { ...item, minW: def.minW, minH: def.minH };
          return item;
        });
        // Add any new panels from DEFAULT_GRID_LAYOUT not present in saved layout
        const savedIds = new Set(saved.map((item: GridItemLayout) => item.i));
        for (const def of DEFAULT_GRID_LAYOUT) {
          if (!savedIds.has(def.i)) merged.push(def);
        }
        return merged;
      }
    } catch {}
    return DEFAULT_GRID_LAYOUT;
  });

  const sse = useSSE();
  const { news, commodities, events, flights, ships, sirens, redAlerts, aiBrief, telegramMessages, ewEvents, infraEvents, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected } = sse;

  const [mapFocusLocation, setMapFocusLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [popupTrackFlight, setPopupTrackFlight] = useState<{ callsign: string; lat: number; lng: number; heading: number; altitude: number; speed: number; type: string; source: 'radar' } | null>(null);

  const anomalies = useAnomalyDetection(redAlerts, sirens, flights, commodities, telegramMessages);
  const [escalationDismissed, setEscalationDismissed] = useState(false);
  const escalation = useEscalation(redAlerts, soundEnabled, notificationsEnabled);
  // Auto-reset dismissed state when escalation level rises
  useEffect(() => { setEscalationDismissed(false); }, [escalation.level]);

  const panelPersistTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleGridLayoutChange = useCallback((newLayout: GridLayout2) => {
    setGridLayout(prev => {
      const updated = new Map(prev.map(item => [item.i, item]));
      for (const item of newLayout) {
        updated.set(item.i, item as GridItemLayout);
      }
      const merged = Array.from(updated.values());
      localStorage.setItem('warroom_grid_layout_v6', JSON.stringify(merged));
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

  // ── Floating panel system ──────────────────────────────────────────────────
  const [floatingPanels, setFloatingPanels] = useState<Partial<Record<PanelId, FloatState>>>({});
  const floatTopZ = useRef(600);

  const popOutPanel = useCallback((id: PanelId) => {
    floatTopZ.current += 1;
    setFloatingPanels(prev => {
      if (prev[id]) {
        // already floating — just focus
        return { ...prev, [id]: { ...prev[id]!, z: floatTopZ.current } };
      }
      const count = Object.keys(prev).length;
      const w = Math.min(window.innerWidth * 0.38, 540);
      const h = Math.min(window.innerHeight * 0.58, 560);
      return {
        ...prev,
        [id]: {
          x: Math.max(40, (window.innerWidth - w) / 2 + count * 28),
          y: Math.max(60, (window.innerHeight - h) / 2 + count * 28),
          w, h, z: floatTopZ.current,
        },
      };
    });
  }, []);

  const dockPanel = useCallback((id: PanelId) => {
    setFloatingPanels(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const closeFloatPanel = useCallback((id: PanelId) => {
    setFloatingPanels(prev => { const n = { ...prev }; delete n[id]; return n; });
    closePanel(id);
  }, [closePanel]);

  const focusFloatPanel = useCallback((id: PanelId) => {
    floatTopZ.current += 1;
    setFloatingPanels(prev =>
      prev[id] ? { ...prev, [id]: { ...prev[id]!, z: floatTopZ.current } } : prev
    );
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, locked: false };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    swipeRef.current = null;
    const threshold = Math.min(60, window.innerWidth * 0.15);
    if (Math.abs(dx) < threshold) return;
    const idx = SWIPE_TABS.indexOf(mobileActivePanel);
    const base = idx === -1 ? 0 : idx;
    if (dx < 0) {
      setMobileActivePanel(SWIPE_TABS[(base + 1) % SWIPE_TABS.length]);
    } else {
      setMobileActivePanel(SWIPE_TABS[(base - 1 + SWIPE_TABS.length) % SWIPE_TABS.length]);
    }
    setShowMobilePanelPicker(false);
  }, [mobileActivePanel]);

  useEffect(() => {
    const el = panelWrapperRef.current;
    if (!el || !isMobile) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!swipeRef.current || swipeRef.current.locked) return;
      const dx = Math.abs(e.touches[0].clientX - swipeRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - swipeRef.current.y);
      if (dx > dy && dx > 8) {
        swipeRef.current.locked = true;
        e.preventDefault();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [isMobile]);

  const alertSoundData = useMemo(() => redAlerts.map(a => ({ id: a.id, threatType: a.threatType })), [redAlerts]);
  const sirenSoundData = useMemo(() => sirens.map(s => ({ id: s.id, threatType: s.threatType })), [sirens]);
  useAlertSound(alertSoundData, soundEnabled, settings.silentMode, settings.volume);
  useAlertSound(sirenSoundData, soundEnabled, settings.silentMode, settings.volume);
  useDesktopNotifications(redAlerts, sirens, news, notificationsEnabled, settings.notificationLevel);

  const threatLevel = useMemo(() => getThreatLevel(redAlerts.length, sirens.length, settings, redAlerts), [redAlerts, sirens.length, settings]);
  const correlations = useCorrelations(events, redAlerts, sirens, flights);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });

  const topRow: PanelId[] = ['telegram', 'intel', 'map', 'alerts', 'livefeed'];
  const bottomRow: PanelId[] = ['events', 'radar', 'markets', 'ew', 'infra', 'alertmap', 'analytics', 'osint', 'sitrep', 'attackpred', 'rocketstats'];
  const allPanels: PanelId[] = [...topRow, ...bottomRow];
  const activeTop = topRow.filter(id => visiblePanels[id]);
  const activeBottom = bottomRow.filter(id => visiblePanels[id]);
  const panelCount = activeTop.length + activeBottom.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = {
    telegram: 16, intel: 16, map: 36, alerts: 16, livefeed: 16,
    events: 22, radar: 22, markets: 28,
    ew: 22, infra: 22, alertmap: 28, analytics: 28, osint: 28, sitrep: 28, attackpred: 22, rocketstats: 22,
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
      localStorage.setItem('warroom_grid_layout_v6', JSON.stringify(preset.gridLayout));
    }
    setMaximizedPanel(null);
  }, []);

  const deletePreset = useCallback((name: string) => {
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    localStorage.setItem('warroom_layouts', JSON.stringify(customPresets));
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [savedPresets]);

  const handleExport = useCallback(() => {
    const html = generateExportReport(events, flights, ships, redAlerts, sirens, commodities, threatLevel, language);
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
    const close = isMobile ? undefined : () => closePanel(id);
    const maximize = isMobile ? undefined : () => toggleMaximize(id);
    const isMax = isMobile ? false : maximizedPanel === id;
    const panel = (() => {
      switch (id) {
        case 'intel':
          return <AIIntelPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} brief={aiBrief} briefLoading={!connected && !aiBrief} anomalies={anomalies} />;
        case 'map':
          return <MapSection events={events} flights={flights} redAlerts={redAlerts} thermalHotspots={thermalHotspots} ewEvents={ewEvents} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} focusLocation={mapFocusLocation} />;
        case 'events':
          return <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'radar':
          return <FlightRadarPanel flights={flights} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onLocateFlight={(lat, lng, callsign, heading, altitude, speed, type) => { setMapFocusLocation({ lat, lng, zoom: 9 }); setPopupTrackFlight({ callsign, lat, lng, heading, altitude, speed, type, source: 'radar' }); }} />;
        case 'alerts':
          return <RedAlertPanel alerts={redAlerts} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
        case 'telegram':
          return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'markets':
          return <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'ew':
          return <EWPanel ewEvents={ewEvents} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'infra':
          return <InfraPanel infraEvents={infraEvents} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'livefeed':
          return <LiveFeedPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alertmap':
          return <AlertMapPanel alerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'analytics':
          return <AnalyticsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'osint':
          return <OsintTimelinePanel alerts={redAlerts} messages={telegramMessages} events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'sitrep':
          return <SitrepPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'attackpred':
          return <AttackPredictorPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} />;
        case 'rocketstats':
          return <RocketStatsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} stats={rocketStats} />;
      }
    })();
    return panel ?? null;
  };

  return (
    <div className={`flex flex-col bg-background text-foreground overflow-hidden ${isMobile ? 'h-[100dvh]' : 'h-screen'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: isMobile && isLandscape ? 'env(safe-area-inset-left, 0px)' : undefined, paddingRight: isMobile && isLandscape ? 'env(safe-area-inset-right, 0px)' : undefined }} data-testid="dashboard">
      <header className={`${isMobile ? (isLandscape ? 'h-10' : 'h-12') : isTouchDevice ? 'min-h-[48px]' : 'h-11'} border-b border-white/[0.04] flex items-center justify-between px-2 md:px-4 shrink-0 relative z-50 warroom-header`} style={{background:'hsl(220 20% 17% / 0.97)', borderBottom:'1px solid hsl(185 30% 30% / 0.22)'}}>
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{background:'linear-gradient(90deg, transparent, hsl(185 100% 42% / 0.12) 30%, hsl(185 100% 42% / 0.22) 50%, hsl(185 100% 42% / 0.12) 70%, transparent)'}} />
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <span className={`${isMobile ? 'text-[13px]' : 'text-[15px]'} font-black tracking-[0.22em] text-primary font-mono select-none whitespace-nowrap`} style={{filter:'drop-shadow(0 0 6px hsl(185 100% 42% / 0.35))'}}>◈ WARROOM</span>
          <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm hidden sm:flex" style={{background:'linear-gradient(135deg, hsl(0 80% 50% / 0.08), hsl(0 80% 50% / 0.03))', border:'1px solid hsl(0 80% 50% / 0.18)'}}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" style={{boxShadow:'0 0 8px rgb(239 68 68 / 0.7)'}} />
            <span className="text-[8px] text-red-400/90 font-black tracking-[0.2em] uppercase font-mono">LIVE</span>
          </div>
          {isMobile && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm" style={{background:'linear-gradient(135deg, hsl(0 80% 50% / 0.08), transparent)', border:'1px solid hsl(0 80% 50% / 0.18)'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" style={{boxShadow:'0 0 5px rgb(239 68 68 / 0.6)'}} />
              <span className="text-[8px] text-red-400/80 font-black tracking-wider uppercase font-mono">LIVE</span>
            </div>
          )}
          <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge" style={{boxShadow: threatLevel.level === 'CRITICAL' ? '0 0 20px rgb(239 68 68 / 0.2), inset 0 0 20px rgb(239 68 68 / 0.05)' : threatLevel.level === 'HIGH' ? '0 0 15px rgb(249 115 22 / 0.12)' : 'none'}}>
            <ShieldAlert className={`${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${threatLevel.color}`} />
            <span className={`text-[8px] font-black tracking-[0.15em] uppercase font-mono ${threatLevel.color}`}>{threatLevel.level}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center"><LiveClock /></div>
          <div className="w-px h-5 bg-border/30 hidden md:block" />
          {isMobile || isTablet ? (
            <div className="warroom-mobile-menu-anchor">
              <button
                onClick={() => setShowMobileMenu(p => !p)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground active:bg-white/[0.06] transition-colors"
                aria-label="Open menu"
                data-testid="button-mobile-menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
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
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-cyan-400 hover:bg-cyan-500/[0.08] active:bg-cyan-500/15 transition-all duration-150" onClick={() => setShowNotes(true)} data-testid="button-notes" aria-label="Analyst Notes" title="Analyst Notes">
                <StickyNote className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-cyan-400 hover:bg-cyan-500/[0.08] active:bg-cyan-500/15 transition-all duration-150" onClick={() => setShowWatchlist(true)} data-testid="button-watchlist" aria-label="Watchlist" title="Watchlist">
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
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-all ${connected ? 'bg-emerald-500/[0.05]' : 'bg-red-500/[0.06]'}`} role="status" aria-label={connected ? 'Connected to server' : 'Disconnected'} title={connected ? 'Stream connected' : 'Stream disconnected'} style={{border: connected ? '1px solid hsl(152 72% 38% / 0.18)' : '1px solid hsl(0 80% 55% / 0.2)'}}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-400'}`} style={{boxShadow: connected ? '0 0 6px rgb(34 197 94 / 0.5)' : '0 0 6px rgb(239 68 68 / 0.5)'}} />
            <span className={`text-[8px] font-bold tracking-[0.2em] font-mono hidden sm:inline uppercase ${connected ? 'text-emerald-400/75' : 'text-red-400/75'}`}>
              {connected ? (language === 'en' ? 'ONLINE' : '\u0645\u062A\u0635\u0644') : (language === 'en' ? 'OFFLINE' : '\u0645\u0646\u0642\u0637\u0639')}
            </span>
          </div>
        </div>
      </header>
      {!escalationDismissed && <EscalationBanner state={escalation} onDismiss={() => setEscalationDismissed(true)} />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isMobile && !isTablet && (
          <PanelSidebar
            visiblePanels={visiblePanels}
            openPanel={openPanel}
            closePanel={closePanel}
            language={language}
            panelStats={{
              map: 'LIVE',
              alerts: redAlerts.length > 0 ? `${redAlerts.length} ACTIVE` : '',
              intel: aiBrief ? aiBrief.riskLevel : 'STANDBY',
              telegram: telegramMessages.length > 0 ? `${telegramMessages.length}` : '',
              livefeed: '',
              events: events.length > 0 ? `${events.length}` : '',
              radar: flights.length > 0 ? `${flights.length}` : '',
              markets: commodities.length > 0 ? `${commodities.length}` : '',
              ew: ewEvents.filter(e => e.active).length > 0 ? `${ewEvents.filter(e => e.active).length} ACTIVE` : '',
              infra: infraEvents.length > 0 ? `${infraEvents.length}` : '',
              alertmap: redAlerts.length > 0 ? `${redAlerts.length}` : '',
              analytics: '',
              sitrep: '',
            }}
          />
        )}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">

      {showMobileMenu && (isMobile || isTablet) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-2 top-full z-50 mt-1 rounded-xl border border-[hsl(185_60%_30%/0.15)] bg-[hsl(220_35%_9%)] shadow-2xl min-w-[180px]" data-testid="mobile-menu">
            <div className="p-1.5 flex flex-col gap-0.5">
              {[
                { id: 'notif', icon: Bell, label: notificationsEnabled ? 'Notif ON' : 'Notif OFF', action: () => { toggleNotifications(); setShowMobileMenu(false); }, active: notificationsEnabled },
                { id: 'sound', icon: soundEnabled ? Volume2 : VolumeX, label: soundEnabled ? 'Sound ON' : 'Sound OFF', action: () => { setSoundEnabled((p: boolean) => !p); setShowMobileMenu(false); }, active: soundEnabled },
                { id: 'notes', icon: StickyNote, label: language === 'ar' ? 'ملاحظات' : 'Notes', action: () => { setShowNotes(true); setShowMobileMenu(false); } },
                { id: 'watchlist', icon: Eye, label: language === 'ar' ? 'مراقبة' : 'Watchlist', action: () => { setShowWatchlist(true); setShowMobileMenu(false); } },
                { id: 'export', icon: FileDown, label: language === 'ar' ? 'تصدير' : 'Export', action: () => { handleExport(); setShowMobileMenu(false); } },
                { id: 'settings', icon: Settings, label: language === 'ar' ? 'إعدادات' : 'Settings', action: () => { setShowSettings(true); setShowMobileMenu(false); } },
                { id: 'language', icon: Languages, label: language === 'en' ? 'عربي' : 'English', action: () => { setLanguage(language === 'en' ? 'ar' : 'en'); setShowMobileMenu(false); } },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    data-testid={`mobile-menu-${item.id}`}
                    className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-lg text-[11px] font-medium transition-colors active:bg-white/[0.08] min-h-[48px] ${item.active ? 'text-primary' : 'text-foreground/60 hover:text-foreground/80'}`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-white/[0.05] px-3 py-2">
              <div className="flex items-center gap-2 text-[8px] font-mono text-foreground/20">
                <span>SRC {[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, ewEvents.filter(e => e.active).length > 0, redAlerts.length > 0 || sirens.length > 0].filter(Boolean).length}</span>
                <span>·</span>
                <span>EVT {events.length}</span>
                <span className="ml-auto"><LiveClock /></span>
              </div>
            </div>
          </div>
        </>
      )}

      {!isMobile && <TickerBar commodities={commodities} />}

      {isMobile && commodities.length > 0 && (
        <div className="warroom-mobile-mini-ticker shrink-0" data-testid="mobile-mini-ticker">
          {commodities.filter(c => c.category === 'commodity').slice(0, 5).map(c => (
            <div key={c.symbol} className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[8px] font-mono font-bold text-foreground/30">{c.symbol}</span>
              <span className="text-[8px] font-mono text-foreground/50">${c.price.toFixed(c.price > 100 ? 0 : 2)}</span>
              <span className={`text-[7px] font-mono font-bold ${c.changePercent >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                {c.changePercent >= 0 ? '+' : ''}{c.changePercent.toFixed(1)}%
              </span>
            </div>
          ))}
          {redAlerts.length > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-mono font-bold text-red-400/70">{redAlerts.length} ALERTS</span>
            </div>
          )}
        </div>
      )}

      <SirenBanner sirens={sirens} breakingNews={breakingNews} language={language} hidden={!!maximizedPanel} />

      <div
        ref={panelsScrollRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
        data-testid="resizable-panels"
      >
        {isMobile ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Outer touch container — stable ref for swipe detection */}
            <div
              ref={panelWrapperRef}
              className="relative flex-1 min-h-0 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* All SWIPE_TABS panels always mounted — prevents unmount/remount flicker on tab switch */}
              <div className={`absolute inset-0 flex flex-col ${mobileActivePanel === 'map' ? 'z-10' : 'z-0 mobile-panel-hidden'}`}>
                <MapSection
                  events={events}
                  flights={flights}
                  redAlerts={redAlerts}
                  thermalHotspots={thermalHotspots}
                  ewEvents={ewEvents}
                  language={language}
                  focusLocation={mapFocusLocation}
                  isVisible={mobileActivePanel === 'map'}
                />
              </div>
              {(['alerts', 'telegram', 'events', 'intel', 'markets'] as PanelId[]).map(id => (
                <div key={id} className={`absolute inset-0 flex flex-col ${mobileActivePanel === id ? 'z-10' : 'z-0 mobile-panel-hidden'}`}>
                  {renderPanel(id)}
                </div>
              ))}
            </div>
            <div className="warroom-mobile-swipe-dots shrink-0" data-testid="mobile-swipe-dots">
              {SWIPE_TABS.map(id => (
                <button
                  key={id}
                  className="flex items-center justify-center p-2"
                  style={{ touchAction: 'manipulation', minWidth: 32, minHeight: 32 }}
                  onClick={() => setMobileActivePanel(id)}
                  aria-label={`Switch to ${PANEL_CONFIG[id]?.label || id}`}
                  data-testid={`swipe-dot-${id}`}
                >
                  <span className={`dot ${mobileActivePanel === id ? 'active' : ''}`} style={{ pointerEvents: 'none' }} />
                </button>
              ))}
            </div>
            <div className="shrink-0 border-t border-white/[0.05] flex items-center warroom-mobile-tabs" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }} data-testid="mobile-tab-bar">
              {(['map', 'alerts', 'telegram', 'events', 'intel', 'markets'] as PanelId[]).map(id => {
                const cfg = PANEL_CONFIG[id];
                const Icon = cfg.icon;
                const isActive = mobileActivePanel === id;
                const hasAlert = id === 'alerts' && redAlerts.length > 0;
                const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                return (
                  <button
                    key={id}
                    onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                    className={`flex-1 min-w-[52px] min-h-[56px] py-2 flex flex-col items-center gap-1.5 transition-all relative ${isActive ? 'text-primary' : 'text-foreground/30 active:text-foreground/60'} ${hasAlert && !isActive ? 'text-red-400' : ''}`}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    data-testid={`mobile-tab-${id}`}
                  >
                    {isActive && <div className="absolute top-0 left-2 right-2 h-[2px] bg-primary rounded-b" style={{ boxShadow: '0 2px 8px hsl(185 100% 42% / 0.3)' }} />}
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wide transition-colors ${isActive ? 'text-primary/90' : 'text-foreground/30'}`}>{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                    {hasAlert && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgb(239 68 68 / 0.6)' }} />}
                    {hasTelegram && !isActive && <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                  </button>
                );
              })}
              <button
                onClick={() => setShowMobilePanelPicker(p => !p)}
                className={`min-w-[52px] min-h-[56px] py-2 flex flex-col items-center gap-1.5 transition-colors ${showMobilePanelPicker ? 'text-primary' : 'text-foreground/30 active:text-foreground/60'}`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                data-testid="mobile-tab-more"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wide">{language === 'ar' ? 'المزيد' : 'More'}</span>
              </button>
            </div>
            {/* Bottom Sheet Backdrop */}
            {showMobilePanelPicker && (
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMobilePanelPicker(false)}
              />
            )}
            <div
              className={`fixed left-0 right-0 bottom-0 z-50 warroom-bottom-sheet ${showMobilePanelPicker ? 'warroom-bottom-sheet--open' : ''}`}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
              data-testid="mobile-panel-picker"
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/[0.12]" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-foreground/40">
                  {language === 'ar' ? 'لوحات إضافية' : 'More Panels'}
                </span>
                <button onClick={() => setShowMobilePanelPicker(false)} className="w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-foreground/60 rounded-lg active:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5 p-3">
                {allPanels.filter(id => !(['map', 'alerts', 'telegram', 'events', 'intel', 'markets'] as PanelId[]).includes(id)).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const count = id === 'ew' ? ewEvents.filter(e => e.active).length : id === 'infra' ? infraEvents.length : id === 'radar' ? flights.length : 0;
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-h-[64px] ${mobileActivePanel === id ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'text-foreground/40 bg-white/[0.03] active:bg-white/[0.08]'}`}
                      data-testid={`mobile-picker-${id}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[8px] font-mono font-bold leading-tight text-center">{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                      {count > 0 && <span className="text-[7px] font-mono text-foreground/25">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isTablet ? (
          <div
            className={`grid gap-1 p-1`}
            style={{
              gridTemplateColumns: isLandscape ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gridAutoRows: `minmax(${isLandscape ? '280px' : '320px'}, auto)`,
              background: 'hsl(185 80% 42% / 0.04)',
              paddingLeft: 'max(4px, env(safe-area-inset-left))',
              paddingRight: 'max(4px, env(safe-area-inset-right))',
            }}
          >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const isWide = id === 'map' || id === 'alertmap' || id === 'alerts';
              const mapH = isLandscape ? '420px' : '480px';
              const alertsH = isLandscape ? '320px' : '380px';
              const alertmapH = isLandscape ? '300px' : '360px';
              const defaultH = isLandscape ? '280px' : '320px';
              return (
                <div
                  key={id}
                  style={{
                    gridColumn: isWide ? `1 / -1` : undefined,
                    minHeight: id === 'map' ? mapH : id === 'alerts' ? alertsH : id === 'alertmap' ? alertmapH : defaultH,
                    background: 'hsl(220 28% 13% / 0.97)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: id === 'alerts' ? '1px solid hsl(0 80% 55% / 0.38)' : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: id === 'alerts' ? '0 0 32px rgb(239 68 68 / 0.15), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.35)' : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  {renderPanel(id)}
                </div>
              );
            })}
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
            rowHeight={110}
            compactType="vertical"
            onLayoutChange={handleGridLayoutChange}
            draggableCancel="button,input,select,textarea,a,[data-no-drag],canvas,.maplibregl-canvas,.maplibregl-canvas-container,#deck-canvas"
            margin={[4, 4]}
            containerPadding={[4, 4]}
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's']}
            style={{ paddingBottom: 80 }}
          >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const hasAlertGlow = id === 'alerts' && redAlerts.length > 0;
              const isFloating = !!floatingPanels[id];
              const Icon = PANEL_CONFIG[id]?.icon;
              return (
                <div
                  key={id}
                  className="group flex flex-col overflow-hidden"
                  style={{
                    borderRadius: 10,
                    background: isFloating
                      ? 'rgba(8,12,22,0.35)'
                      : hasAlertGlow
                        ? 'hsl(0 25% 11% / 0.97)'
                        : 'hsl(220 28% 14% / 0.97)',
                    border: isFloating
                      ? '1px dashed rgba(255,255,255,0.06)'
                      : hasAlertGlow
                        ? '1px solid hsl(0 80% 55% / 0.5)'
                        : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isFloating
                      ? 'none'
                      : hasAlertGlow
                        ? '0 0 40px rgb(239 68 68 / 0.20), 0 0 80px rgb(239 68 68 / 0.07), inset 0 0 24px rgb(239 68 68 / 0.05), inset 0 1px 0 rgba(255,255,255,0.07)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.35)',
                    transition: 'border-color 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s cubic-bezier(0.4,0,0.2,1), background 0.22s cubic-bezier(0.4,0,0.2,1)',
                    position: 'relative',
                    zIndex: hasAlertGlow ? 2 : undefined,
                  }}
                  data-testid={hasAlertGlow && !isFloating ? 'alert-panel-glow' : undefined}
                >
                  {isFloating ? (
                    /* placeholder while panel is floating */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'default' }}>
                      {Icon && <Icon style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.1)' }} />}
                      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>{PANEL_CONFIG[id]?.label || id}</span>
                      <button
                        onClick={() => dockPanel(id)} data-no-drag
                        style={{ fontSize: 9, padding: '3px 10px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'monospace' }}
                      >⊞ DOCK</button>
                    </div>
                  ) : (
                    <>
                      {/* Pop-out button — appears on hover */}
                      {!isMobile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); popOutPanel(id); }}
                          data-no-drag
                          className="absolute top-1 right-1 z-[90] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          title="Pop out as floating window"
                          style={{ width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}
                        >
                          <ExternalLink style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                      <PanelErrorBoundary panelName={PANEL_CONFIG[id]?.label || id}>
                        {renderPanel(id)}
                      </PanelErrorBoundary>
                    </>
                  )}
                </div>
              );
            })}
          </RGL>
        )}
      </div>

      {/* ── Floating Windows ── */}
      {Object.entries(floatingPanels).map(([id, state]) => {
        const panelId = id as PanelId;
        const cfg = PANEL_CONFIG[panelId];
        const Icon = cfg?.icon;
        return (
          <FloatingWindow
            key={id} id={id}
            title={cfg?.label || id}
            icon={Icon ? <Icon style={{ width: 14, height: 14 }} /> : null}
            state={state!}
            onDock={() => dockPanel(panelId)}
            onClose={() => closeFloatPanel(panelId)}
            onFocus={() => focusFloatPanel(panelId)}
          >
            {renderPanel(panelId)}
          </FloatingWindow>
        );
      })}

      {/* ── Floating scroll buttons (desktop only) ── */}
      {!isMobile && !maximizedPanel && (
        <div style={{ position: 'fixed', right: 18, bottom: 90, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
          {showScrollTop && (
            <button
              onClick={() => panelsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(20,26,38,0.88)', border: '1px solid rgba(0,220,180,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(0,220,180,0.12)',
                backdropFilter: 'blur(8px)', transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Scroll to top"
              aria-label="Scroll to top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,220,180,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
          )}
          {showScrollDown && (
            <button
              onClick={() => panelsScrollRef.current?.scrollBy({ top: 400, behavior: 'smooth' })}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(20,26,38,0.88)', border: '1px solid rgba(0,220,180,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 14px rgba(0,220,180,0.15)',
                backdropFilter: 'blur(8px)', transition: 'opacity 0.2s, transform 0.2s',
                animation: 'pulse 2s ease-in-out infinite',
              }}
              title="Scroll down"
              aria-label="Scroll down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,220,180,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {!isMobile && <EventTimeline events={events} language={language} />}

      {!isMobile && <NewsTicker news={news} language={language} />}

      {!isMobile && (
        <div className="h-8 border-t border-white/[0.05] flex items-center px-3 shrink-0 gap-2 overflow-hidden" data-testid="status-bar" style={{background:'hsl(220 28% 13% / 0.92)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'}}>
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{background:'linear-gradient(90deg, transparent, hsl(185 60% 50% / 0.05) 30%, hsl(185 80% 50% / 0.1) 50%, hsl(185 60% 50% / 0.05) 70%, transparent)'}} />
          <div className="flex items-center gap-1 px-1.5 py-px rounded-sm" style={{background:'hsl(152 72% 38% / 0.04)', border:'1px solid hsl(152 72% 38% / 0.1)'}}>
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse-dot" style={{boxShadow:'0 0 4px rgb(52 211 153 / 0.5)'}} />
            <span className="text-[8px] text-emerald-400/50 font-mono font-bold tracking-[0.15em]">ONLINE</span>
          </div>
          <div className="w-px h-3 bg-white/[0.04]" />
          <div className="flex items-center gap-2.5 text-[8px] font-mono tabular-nums">
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">SRC</span>{[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, ewEvents.filter(e => e.active).length > 0, redAlerts.length > 0 || sirens.length > 0, flights.length > 0].filter(Boolean).length}</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">EVT</span>{events.length}</span>
            <span className="text-foreground/15"><span className="text-foreground/25 mr-0.5 font-semibold">FLT</span>{flights.length}</span>

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
          allFlights={flights}
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
