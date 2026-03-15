import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, Component, memo, createContext, useContext, type ErrorInfo, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Search,
  Settings,
  TriangleAlert,
  Menu,
  Video,
  MoreHorizontal,
  Rocket,
  ArrowRight,
  Flame,
  Download,
  GripVertical,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { ScrollShadow } from '@/components/shared/scroll-shadow';
import { headingToCompass } from '@/lib/dashboard-utils';
import { AnimatedPanel } from '@/components/shared/animated-panel';
import { FeedFreshnessContext, PanelHeader, PanelMinimizeButton, PanelMaximizeButton, FreshnessBadge } from '@/components/panels/panel-chrome';
const AnalyticsPanel = lazy(() => import('@/components/panels/analytics-panel').then(m => ({ default: m.AnalyticsPanel })));
import { TelegramPanel } from '@/components/panels/telegram-panel';
const AIPredictionPanel = lazy(() => import('@/components/panels/ai-prediction-panel').then(m => ({ default: m.AIPredictionPanel })));
import { RocketStatsPanel } from '@/components/panels/rocket-stats-panel';
import { RedAlertPanel } from '@/components/panels/red-alert-panel';
import { AttackPredictorPanel } from '@/components/panels/attack-predictor-panel';
import { RegionalAttacksPanel } from '@/components/panels/regional-attacks-panel';
import { LiveFeedPanel } from '@/components/panels/live-feed-panel';
import { CommoditiesPanel } from '@/components/panels/commodities-panel';
import { SirensPanel } from '@/components/panels/sirens-panel';
import { FlightRadarPanel } from '@/components/panels/flight-radar-panel';
import { ConflictEventsPanel } from '@/components/panels/conflict-events-panel';
import { MaritimePanel } from '@/components/panels/maritime-panel';

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
          description: `Military flight convergence: ${nearby + 1} aircraft within 1° of ${milFlights[i].callsign}`,
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
  nextLikelyTarget: string | null;
  confidence: number;
  patternSummary: string;
  insufficientData?: boolean;
  generatedAt: string;
  dataPoints: {
    totalAlerts: number;
    velocity30m: number;
    velocity2h: number;
    velocityPerHour: number;
    isEscalating: boolean;
    topRegions: Array<{ region: string; count: number }>;
  };
  nextAttackWindow?: {
    estimatedMinutes: number;
    confidence: number;
    basis: string;
    label: string;
  };
  locationProbabilities?: Array<{
    location: string;
    country: string;
    probability: number;
    threatType: string;
    countryFlag: string;
  }>;
}

type FeedFreshness = Record<string, number>;

interface SSEData {
  news: NewsItem[];
  commodities: CommodityData[];
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  sirens: SirenAlert[];
  redAlerts: RedAlert[];
  telegramMessages: TelegramMessage[];
  thermalHotspots: ThermalHotspot[];
  breakingNews: BreakingNewsItem[];
  attackPrediction: AttackPrediction | null;
  rocketStats: RocketStats | null;
  connected: boolean;
  feedFreshness: FeedFreshness;
}

function useSSE(): SSEData {
  const [news, setNews] = useState<SSEData['news']>([]);
  const [commodities, setCommodities] = useState<SSEData['commodities']>([]);
  const [events, setEvents] = useState<SSEData['events']>([]);
  const [flights, setFlights] = useState<SSEData['flights']>([]);
  const [ships, setShips] = useState<SSEData['ships']>([]);
  const [sirens, setSirens] = useState<SSEData['sirens']>([]);
  const [redAlerts, setRedAlerts] = useState<SSEData['redAlerts']>([]);
  const [telegramMessages, setTelegramMessages] = useState<SSEData['telegramMessages']>([]);
  const [thermalHotspots, setThermalHotspots] = useState<SSEData['thermalHotspots']>([]);
  const [breakingNews, setBreakingNews] = useState<SSEData['breakingNews']>([]);
  const [attackPrediction, setAttackPrediction] = useState<SSEData['attackPrediction']>(null);
  const [rocketStats, setRocketStats] = useState<SSEData['rocketStats']>(null);
  const [connected, setConnected] = useState(false);
  const feedFreshnessRef = useRef<FeedFreshness>({});
  const [feedFreshness, setFeedFreshness] = useState<FeedFreshness>({});
  const retryCount = useRef(0);
  const maxRetries = 5;
  const pending = useRef<Partial<Omit<SSEData, 'connected' | 'feedFreshness'>>>({});
  const rafId = useRef<number | null>(null);

  const markFresh = useCallback((feed: string) => {
    feedFreshnessRef.current[feed] = Date.now();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = feedFreshnessRef.current;
      setFeedFreshness(prev => {
        const keys = Object.keys(next);
        if (keys.length !== Object.keys(prev).length) return { ...next };
        for (const k of keys) { if (prev[k] !== next[k]) return { ...next }; }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const batch = pending.current;
      pending.current = {};
      if (Object.keys(batch).length === 0) return;
      if ('news' in batch) setNews(batch.news!);
      if ('commodities' in batch) setCommodities(batch.commodities!);
      if ('events' in batch) setEvents(batch.events!);
      if ('flights' in batch) setFlights(batch.flights!);
      if ('ships' in batch) setShips(batch.ships!);
      if ('sirens' in batch) setSirens(batch.sirens!);
      if ('redAlerts' in batch) setRedAlerts(batch.redAlerts!);
      if ('telegramMessages' in batch) setTelegramMessages(batch.telegramMessages!);
      if ('thermalHotspots' in batch) setThermalHotspots(batch.thermalHotspots!);
      if ('breakingNews' in batch) setBreakingNews(batch.breakingNews!);
      if ('attackPrediction' in batch) setAttackPrediction(batch.attackPrediction!);
      if ('rocketStats' in batch) setRocketStats(batch.rocketStats!);
    });
  }, []);

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
        try { pending.current.commodities = JSON.parse(e.data); markFresh('markets'); scheduleFlush(); } catch {}
      });
      es.addEventListener('events', (e) => {
        try {
          const d = JSON.parse(e.data);
          pending.current.events = d.events || [];
          pending.current.flights = d.flights || [];
          pending.current.ships = d.ships || [];
          markFresh('events'); markFresh('livefeed'); markFresh('ships');
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('news', (e) => {
        try { pending.current.news = JSON.parse(e.data); markFresh('osint'); scheduleFlush(); } catch {}
      });
      es.addEventListener('sirens', (e) => {
        try { pending.current.sirens = JSON.parse(e.data); markFresh('sirens'); scheduleFlush(); } catch {}
      });
      es.addEventListener('red-alerts', (e) => {
        try {
          const raw: RedAlert[] = JSON.parse(e.data);
          const seen = new Set<string>();
          pending.current.redAlerts = raw.filter(a => seen.has(a.id) ? false : (seen.add(a.id), true));
          markFresh('alerts'); markFresh('alertmap');
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('telegram', (e) => {
        try { pending.current.telegramMessages = JSON.parse(e.data); markFresh('telegram'); scheduleFlush(); } catch {}
      });
      es.addEventListener('thermal', (e) => {
        try { pending.current.thermalHotspots = JSON.parse(e.data); markFresh('thermal'); scheduleFlush(); } catch {}
      });
      es.addEventListener('breaking-news', (e) => {
        try { pending.current.breakingNews = JSON.parse(e.data); markFresh('breaking'); scheduleFlush(); } catch {}
      });
      es.addEventListener('analytics', (e) => {
        try { queryClient.setQueryData(['/api/analytics'], (old: any) => ({ ...old, ...JSON.parse(e.data) })); markFresh('analytics'); } catch {}
      });
      es.addEventListener('attack-prediction', (e) => {
        try { pending.current.attackPrediction = JSON.parse(e.data); markFresh('attackpred'); markFresh('aiprediction'); scheduleFlush(); } catch {}
      });
      es.addEventListener('rocket-stats', (e) => {
        try { pending.current.rocketStats = JSON.parse(e.data); markFresh('rocketstats'); scheduleFlush(); } catch {}
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
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [scheduleFlush]);

  return useMemo(() => ({
    news, commodities, events, flights, ships,
    sirens, redAlerts, telegramMessages,
    thermalHotspots, breakingNews,
    attackPrediction, rocketStats,
    connected, feedFreshness,
  }), [news, commodities, events, flights, ships, sirens, redAlerts, telegramMessages, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected, feedFreshness]);
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
            <p className="text-xs font-mono mt-2">{this.props.panelName || 'Panel'} Error</p>
            <p className="text-[11px] mt-1 text-muted-foreground/60">Failed to render component</p>
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
      style={{ background: isDragging ? undefined : 'linear-gradient(to ' + (direction === 'col' ? 'right' : 'bottom') + ', transparent, hsl(32 40% 10%), transparent)' }}
    >
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-20 -ml-[9px]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-20 -mt-[9px]'} rounded transition-colors ${isDragging ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/5'}`} />
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-10' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-10'} rounded-full transition-all duration-200 ${isDragging ? 'bg-primary shadow-[0_0_8px_hsl(32_92%_50%/0.5)]' : 'bg-transparent group-hover:bg-primary/50'}`} />
      {isDragging && <div className="resize-ghost" />}
    </div>
  );
}

const audioCtxRef = { current: null as AudioContext | null };
const masterCompRef = { current: null as DynamicsCompressorNode | null };

function getAudio(): { ctx: AudioContext; out: AudioNode } | null {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      const comp = audioCtxRef.current.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 6;
      comp.ratio.value = 5;
      comp.attack.value = 0.002;
      comp.release.value = 0.15;
      comp.connect(audioCtxRef.current.destination);
      masterCompRef.current = comp;
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return { ctx: audioCtxRef.current, out: masterCompRef.current! };
  } catch { return null; }
}

// Single tone with full ADSR envelope + optional frequency glide
function tone(
  ctx: AudioContext, out: AudioNode,
  type: OscillatorType, freqStart: number, freqEnd: number | null,
  start: number, dur: number, peak: number,
  attack = 0.007, release = 0.055,
) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(out);
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, Math.max(start + attack, start + dur - release));
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.01);
}

// ── ROCKETS — soft 3-note sine chime ×2 (C5 E5 G5) ─────────────────────────
function playRocketAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [523, 659, 784].forEach((freq, i) => {
    const s = t + i * 0.18;
    tone(ctx, out, 'sine',     freq,     null, s,        0.24, vol * 0.55, 0.012, 0.12);
    tone(ctx, out, 'triangle', freq * 2, null, s,        0.20, vol * 0.10, 0.012, 0.12);
    tone(ctx, out, 'sine',     freq,     null, s + 0.68, 0.22, vol * 0.45, 0.012, 0.12);
  });
}

// ── MISSILES — soft ding-dong descending pair ×3 ─────────────────────────────
function playMissileKlaxon(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [[659, 494], [587, 440], [659, 494]].forEach(([hi, lo], i) => {
    const s = t + i * 0.46;
    tone(ctx, out, 'sine', hi, null, s,        0.28, vol * 0.48, 0.015, 0.20);
    tone(ctx, out, 'sine', lo, null, s + 0.15, 0.26, vol * 0.38, 0.015, 0.20);
  });
}

// ── UAV / DRONE — light pulsing sine beeps ────────────────────────────────────
function playDroneBuzz(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [0, 0.18, 0.36, 0.58, 0.76].forEach((off, i) =>
    tone(ctx, out, 'sine', i % 2 === 0 ? 880 : 660, null, t + off, 0.13, vol * 0.42, 0.010, 0.08)
  );
}

// ── AIRCRAFT — gentle 4-note ascending sine chime ────────────────────────────
function playAircraftAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const s = t + i * 0.20;
    tone(ctx, out, 'sine',     freq, null, s, 0.28, vol * 0.46, 0.015, 0.18);
    tone(ctx, out, 'triangle', freq, null, s, 0.24, vol * 0.10, 0.015, 0.18);
  });
}

// ── BALLISTIC — low soft tone + gentle ascending sweep + 3 light beeps ───────
function playBallisticAlert(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  tone(ctx, out, 'sine', 220, 260, t,        0.50, vol * 0.40, 0.035, 0.30);
  tone(ctx, out, 'sine', 330, 740, t + 0.45, 0.75, vol * 0.38, 0.060, 0.15);
  [1.30, 1.50, 1.70].forEach((off, i) =>
    tone(ctx, out, 'sine', 880 + i * 110, null, t + off, 0.14, vol * 0.36, 0.010, 0.09)
  );
}

// ── CRUISE MISSILE — soft descending sine glide + two light pulses ───────────
function playCruiseMissile(ctx: AudioContext, out: AudioNode, t: number, vol: number) {
  tone(ctx, out, 'sine', 880, 330, t, 0.65, vol * 0.40, 0.025, 0.20);
  [0.75, 0.98].forEach(off =>
    tone(ctx, out, 'sine', 660, null, t + off, 0.18, vol * 0.36, 0.012, 0.10)
  );
}

// ── SIREN — single soft sine sweep up then down ───────────────────────────────
function playSirenWail(ctx: AudioContext, out: AudioNode, t: number, vol: number, cycles = 1) {
  for (let c = 0; c < cycles; c++) {
    const s = t + c * 1.8;
    tone(ctx, out, 'sine', 330, 880, s,        0.88, vol * 0.45, 0.12, 0.14);
    tone(ctx, out, 'sine', 880, 330, s + 0.88, 0.85, vol * 0.45, 0.06, 0.14);
  }
}

function playAlertSound(threatType?: string, volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const vol = Math.max(0, Math.min(1, volume / 100)) * 0.10;
    const t = ctx.currentTime;
    if      (threatType === 'ballistic_missile')          playBallisticAlert(ctx, out, t, vol);
    else if (threatType === 'cruise_missile')             playCruiseMissile(ctx, out, t, vol);
    else if (threatType === 'missiles')                   playMissileKlaxon(ctx, out, t, vol);
    else if (threatType === 'uav_intrusion' ||
             threatType === 'drone_swarm')                playDroneBuzz(ctx, out, t, vol);
    else if (threatType === 'hostile_aircraft_intrusion') playAircraftAlert(ctx, out, t, vol);
    else                                                  playRocketAlert(ctx, out, t, vol);
  } catch (_) {}
}

// Siren: two-cycle civil-defense wail
function playSirenAlert(volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    playSirenWail(audio.ctx, audio.out, audio.ctx.currentTime, Math.max(0, Math.min(1, volume / 100)) * 0.09, 1);
  } catch (_) {}
}

function playTelegramSound(volume: number = 70) {
  try {
    const audio = getAudio();
    if (!audio) return;
    const { ctx, out } = audio;
    const vol = Math.max(0, Math.min(1, volume / 100)) * 0.12;
    const t = ctx.currentTime;
    [1200, 1560, 1800].forEach((freq, i) =>
      tone(ctx, out, 'sine', freq, null, t + i * 0.09, 0.11, vol * (1 - i * 0.18), 0.007, 0.05)
    );
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

type PanelId = 'events' | 'alerts' | 'regional' | 'markets' | 'telegram' | 'livefeed' | 'alertmap' | 'analytics' | 'osint' | 'attackpred' | 'rocketstats' | 'aiprediction';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  aiprediction: { icon: Sparkles, label: 'AI Prediction', labelAr: 'توقعات الذكاء الاصطناعي' },
  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: 'تحذيرات إسرائيل' },
  regional: { icon: Globe, label: 'Regional Attacks', labelAr: 'هجمات إقليمية' },
  markets: { icon: BarChart3, label: 'Markets', labelAr: '\u0623\u0633\u0648\u0627\u0642' },
  livefeed: { icon: Video, label: 'Live Feed', labelAr: '\u0628\u062B \u0645\u0628\u0627\u0634\u0631' },
  alertmap: { icon: MapPin, label: 'Alert Map', labelAr: '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  analytics: { icon: BarChart3, label: 'Analytics', labelAr: '\u062A\u062D\u0644\u064A\u0644\u0627\u062A' },
  osint: { icon: Activity, label: 'OSINT Feed', labelAr: 'تغذية OSINT' },
  attackpred: { icon: Crosshair, label: 'Attack Predictor', labelAr: 'توقع الهجوم' },
  rocketstats: { icon: Rocket, label: 'Rocket Stats', labelAr: 'إحصائيات الصواريخ' },
};

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const touchBtnClass = isTouchDevice ? 'w-9 h-9' : 'w-6 h-6';
const touchIconClass = isTouchDevice ? 'w-4 h-4' : 'w-3.5 h-3.5';


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

// Channels that feed the OSINT panel with elevated priority
const OSINT_PRIORITY_CHANNELS = new Set([
  '@wfwitness', '@ClashReport', '@clashreport', '@AjaNews', '@thewarreporter', '@channelnabatieh',
  '@GeoConfirmed', '@ELINTNews', '@OSINTdefender', '@IntelCrab', '@CIG_telegram',
  '@bintjbeilnews', '@almanarnews', '@AlAhedNews', '@BNONewsRoom', '@Middle_East_Spectator',
]);
// Arabic-language channels (messages come in Arabic, textAr = native)
const ARABIC_CHANNELS = new Set([
  '@AjaNews', '@channelnabatieh', '@almanarnews', '@AlAhedNews', '@QudsN',
  '@bintjbeilnews', '@lebaborim', '@HezbollahWO', '@ResistanceLB', '@southlebanon',
  '@nabatiehnews', '@mtaborim', '@alaborim', '@inaborim', '@Yemen_Press', '@AlMasiraaTV',
]);

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
  messages.forEach(m => {
    const isPriority = OSINT_PRIORITY_CHANNELS.has(m.channel);
    const isArabicCh = ARABIC_CHANNELS.has(m.channel);
    const arRatio = m.text ? (m.text.match(/[\u0600-\u06FF]/g) || []).length / Math.max(m.text.length, 1) : 0;
    const hasArabicText = isArabicCh || arRatio > 0.25;
    // Critical Arabic urgency signals: عاجل / إنذار / إخلاء
    const scan = m.text + (m.textAr || '');
    const hasEajil = scan.includes('\u0639\u0627\u062c\u0644');   // عاجل
    const hasInzar = scan.includes('\u0625\u0646\u0630\u0627\u0631'); // إنذار
    const hasIkhla = scan.includes('\u0625\u062e\u0644\u0627\u0621'); // إخلاء
    const isArabicUrgent = hasEajil || hasInzar || hasIkhla;
    const isEnUrgent = /\bBREAKING\b|\bURGENT\b|\bEVACUATION\b/i.test(scan);
    const bodyText = lang === 'ar'
      ? (m.textAr || m.text)
      : hasArabicText
        ? (m.textAr ? `[AR] ${m.textAr}` : `[AR] ${m.text}`)
        : m.text;
    const severity: OsintEntry['severity'] =
      isArabicUrgent || isEnUrgent ? 'critical' :
      isPriority ? 'high' : 'medium';
    const urgencyTag = hasEajil ? '⚡عاجل ' : hasInzar ? '🔔إنذار ' : hasIkhla ? '🚨إخلاء ' : '';
    const icon = isArabicUrgent || isEnUrgent ? '🚨' : isPriority ? '🔴' : hasArabicText ? '📻' : '📡';
    const borderColor = isArabicUrgent || isEnUrgent ? '#ef4444' : isPriority ? '#f97316' : hasArabicText ? '#a78bfa' : '#38bdf8';
    entries.push({
      id: `tg-${m.id}`,
      source: 'telegram',
      severity,
      title: urgencyTag ? `${urgencyTag}${m.channel}` : hasArabicText ? `${m.channel} 🌍` : m.channel,
      body: bodyText,
      timestamp: m.timestamp,
      icon,
      borderColor,
    });
  });
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
  const freshness = useContext(FeedFreshnessContext);
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
      <PanelHeader
        title={language === 'en' ? 'OSINT Timeline' : 'جدول OSINT'}
        icon={<Activity className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="osint"
      />
      <div className="px-2 py-1 border-b border-border flex gap-1 shrink-0 flex-wrap" style={{background:'hsl(var(--muted))'}}>
        {filterBtns.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wider transition-colors border ${
              filter === key
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'text-muted-foreground/60 hover:text-muted-foreground/85 border-transparent'
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
            className="px-3 py-1.5 border-l-2 hover:bg-muted/50 transition-colors"
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
      bg: 'hsl(0 72% 51% / 0.08)',
      border: 'hsl(0 72% 51% / 0.30)',
      dot: 'bg-red-500',
      text: 'text-red-500',
      label: 'Critical Escalation',
      badge: 'bg-red-500/15 border-red-500/35 text-red-500',
    },
    WARNING: {
      bg: 'hsl(38 92% 50% / 0.08)',
      border: 'hsl(38 92% 50% / 0.30)',
      dot: 'bg-orange-500',
      text: 'text-orange-500',
      label: 'Warning — High Alert Rate',
      badge: 'bg-orange-500/15 border-orange-500/35 text-orange-500',
    },
    WATCH: {
      bg: 'hsl(48 92% 50% / 0.08)',
      border: 'hsl(48 92% 50% / 0.30)',
      dot: 'bg-yellow-500',
      text: 'text-yellow-500',
      label: 'Watch — Activity Surge',
      badge: 'bg-yellow-500/15 border-yellow-500/35 text-yellow-500',
    },
  }[state.level];
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 shrink-0 z-40 relative border-b"
      style={{ background: cfg.bg, borderBottomColor: cfg.border }}
      role="alert"
      data-testid="escalation-banner"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="relative shrink-0">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <div className={`absolute inset-0 rounded-full ${cfg.dot} alert-dot-ping`} />
        </div>
        <span className={`text-[12px] font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${cfg.badge}`}>
          {state.count}/min
        </span>
        <div className="flex-1" />
        <button
          onClick={onDismiss}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all hover:opacity-80 ${cfg.badge}`}
          data-testid="button-dismiss-escalation"
        >Dismiss</button>
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
    visiblePanels: { telegram: true, events: true, alerts: true, regional: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: false, attackpred: false, rocketstats: false, aiprediction: true },
    colWidths: { telegram: 16, alerts: 16, regional: 16, livefeed: 16, events: 22, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { telegram: false, events: false, alerts: false, regional: false, markets: true, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false },
    colWidths: { telegram: 16, alerts: 26, regional: 26, livefeed: 20, events: 22, markets: 30, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { telegram: false, events: true, alerts: true, regional: true, markets: false, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: true, rocketstats: false, aiprediction: true },
    colWidths: { telegram: 16, alerts: 50, regional: 50, livefeed: 20, events: 25, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 55,
  },
  {
    name: 'Mobile',
    visiblePanels: { telegram: true, events: false, alerts: true, regional: true, markets: false, livefeed: true, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false },
    colWidths: { telegram: 100, alerts: 100, regional: 100, livefeed: 100, events: 100, markets: 100, alertmap: 100, analytics: 100, osint: 100, attackpred: 100, rocketstats: 100, aiprediction: 100 },
    rowSplit: 50,
  },
];

const RGL = WidthProvider(GridLayout);

const DEFAULT_GRID_LAYOUT: GridItemLayout[] = [
  // Row 1 — Hero: IL Alerts | Regional Attacks | Map | Telegram
  { i: 'alerts',       x: 0,  y: 0,  w: 3,  h: 7,  minW: 2, minH: 4 },
  { i: 'regional',     x: 3,  y: 0,  w: 3,  h: 7,  minW: 2, minH: 4 },
  { i: 'alertmap',     x: 6,  y: 0,  w: 5,  h: 7,  minW: 3, minH: 4 },
  { i: 'telegram',     x: 11, y: 0,  w: 1,  h: 7,  minW: 1, minH: 3 },
  // Row 2 — Intel strip: AI | Events | Markets
  { i: 'aiprediction', x: 0,  y: 7,  w: 3,  h: 5,  minW: 2, minH: 3 },
  { i: 'events',       x: 3,  y: 7,  w: 4,  h: 5,  minW: 2, minH: 3 },
  { i: 'markets',      x: 7,  y: 7,  w: 5,  h: 5,  minW: 2, minH: 3 },
  // Row 3 — Wide feed
  { i: 'livefeed',     x: 0,  y: 12, w: 12, h: 4,  minW: 3, minH: 2 },
  // Row 4 — Analysis pair
  { i: 'osint',        x: 0,  y: 16, w: 6,  h: 6,  minW: 3, minH: 3 },
  { i: 'analytics',    x: 6,  y: 16, w: 6,  h: 6,  minW: 2, minH: 3 },
  // Row 5 — Attack prediction
  { i: 'attackpred',   x: 0,  y: 22, w: 12, h: 5,  minW: 3, minH: 3 },
  // Row 6 — Stats
  { i: 'rocketstats',  x: 0,  y: 27, w: 12, h: 6,  minW: 3, minH: 3 },
];

const PANEL_ACCENTS: Partial<Record<PanelId, string>> = {
  alerts:       'hsl(0 65% 48%)',
  regional:     'hsl(142 55% 38%)',
  telegram:     'hsl(32 80% 48%)',
  events:       'hsl(36 65% 48%)',
  markets:      'hsl(250 50% 52%)',
  aiprediction: 'hsl(260 50% 52%)',
  analytics:    'hsl(24 70% 45%)',
  osint:        'hsl(40 70% 48%)',
  livefeed:     'hsl(28 65% 46%)',
  alertmap:     'hsl(12 60% 46%)',
  attackpred:   'hsl(24 60% 46%)',
  rocketstats:  'hsl(175 50% 40%)',
};

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
          correlations.push({ id: `corr-${cId++}`, items, reason: 'Spatial and temporal proximity' });
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
      <div className="w-[500px] max-h-[70vh] bg-card border border-border rounded-lg flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Analyst Notes' : '\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u0644'}</span>
          <span className="text-xs text-muted-foreground/50 font-mono">{notes.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-notes"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex gap-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder={language === 'en' ? 'Add intelligence note...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629...'}
              className="flex-1 bg-muted/50 border border-border rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 font-mono"
              data-testid="input-note"
            />
            <button onClick={addNote} className="px-3 py-1.5 rounded bg-primary/20 border border-primary/30 text-primary text-[11px] font-mono font-bold hover:bg-primary/30 transition-colors" data-testid="button-add-note">
              {language === 'en' ? 'Add' : '\u0625\u0636\u0627\u0641\u0629'}
            </button>
          </div>
          <div className="flex gap-1">
            {['general', 'threat', 'intel', 'maritime'].map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border transition-colors ${category === c ? 'bg-primary/15 border-primary/25 text-primary/90' : 'bg-muted/30 border-border text-foreground/30'}`}>{c.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-border">
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
      <div className="w-[400px] max-h-[60vh] bg-card border border-border rounded-lg flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Watchlist' : '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629'}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-watchlist"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={language === 'en' ? 'Callsign, ship name, city...' : '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0626\u0631\u0629 \u0623\u0648 \u0627\u0644\u0633\u0641\u064A\u0646\u0629...'}
              className="flex-1 bg-muted/50 border border-border rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-amber-500/40 font-mono"
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
      <div className="w-[700px] max-h-[80vh] bg-background border border-red-500/30 rounded-xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
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
    <div className="absolute top-10 right-0 z-[150] w-64 bg-card border border-border rounded-lg" data-testid="layout-presets-dropdown" style={{boxShadow:'0 8px 20px rgb(0 0 0 / 0.35)'}}>
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Layout className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-xs font-bold font-mono text-foreground/80 uppercase tracking-wider">{language === 'en' ? 'Layout Presets' : '\u0642\u0648\u0627\u0644\u0628'}</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"><X className="w-3 h-3" /></button>
      </div>
      <div className="p-2 space-y-1">
        {presets.map(p => (
          <div key={p.name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors group" data-testid={`preset-${p.name}`}>
            <button onClick={() => { onLoad(p); onClose(); }} className="flex-1 text-left text-[11px] font-mono text-foreground/80 hover:text-foreground">{p.name}</button>
            {!BUILT_IN_PRESETS.find(b => b.name === p.name) && (
              <button onClick={() => onDelete(p.name)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 active:bg-red-500/30 opacity-60 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-400/60" /></button>
            )}
          </div>
        ))}
      </div>
      <div className="px-2 pb-2 border-t border-border pt-2">
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            placeholder={language === 'en' ? 'Save current...' : '\u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u064A...'}
            className="flex-1 bg-muted/50 border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none font-mono"
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

  const timelineEvents = useMemo(() => {
    const oneHourAgo = Date.now() - 3600000;
    return events.filter(e => new Date(e.timestamp).getTime() > oneHourAgo).map(e => ({
      ...e,
      position: ((new Date(e.timestamp).getTime() - oneHourAgo) / 3600000) * 100,
    }));
  }, [events]);

  const sevColor: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="h-6 border-t border-border relative flex items-center px-4 shrink-0" data-testid="event-timeline" style={{background:'hsl(var(--muted))'}}>
      <span className="text-[7px] text-foreground/15 font-mono uppercase tracking-[0.25em] mr-3 shrink-0 font-bold">
        {language === 'en' ? 'TIMELINE' : '\u062C\u062F\u0648\u0644 \u0632\u0645\u0646\u064A'}
      </span>
      <div className="flex-1 relative h-2.5 bg-muted/30 rounded-sm border border-border">
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap z-10 shadow-lg">
            <span className="text-foreground/90 font-bold">{hoveredEvent.title}</span>
            <span className="text-muted-foreground/50 ml-2">{timeAgo(hoveredEvent.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
<div style="margin-bottom:24px"><span class="threat" style="color:${tc};border-color:${tc}44;background:${tc}15">THREAT LEVEL: ${escHtml(threatLevel.level)}</span></div>

<h2>Executive Summary</h2>
<p style="font-size:12px;line-height:1.8;color:#ccc;margin:8px 0">${alerts.length} active red alerts across ${Object.keys(byCountry).length} countries. ${sirens.length} sirens active. ${events.length} conflict events tracked. ${milFlights.length} military/surveillance flights airborne. ${ships.length} vessels monitored in strait.</p>

<h2>Red Alert Status (${alerts.length} Active)</h2>
${alerts.length > 0 ? `<div class="country-row">${Object.entries(byCountry).map(([c, n]) => `<div class="country-badge">${escHtml(c)}: <span>${n}</span></div>`).join('')}</div>` : '<p style="font-size:12px;color:#22c55e">No active alerts</p>'}

<h2>Top Events</h2>
<table><thead><tr><th>Severity</th><th>Event</th><th>Description</th><th>Type</th></tr></thead><tbody>
${topEvents.map(e => `<tr><td><span class="sev" style="color:${sevColors[e.severity] || '#6b7280'}">${escHtml(e.severity.toUpperCase())}</span></td><td style="color:#fff">${escHtml(e.title)}</td><td style="color:#aaa">${escHtml(e.description.slice(0, 120))}</td><td style="color:#888">${escHtml(e.type)}</td></tr>`).join('')}
</tbody></table>

<h2>Military Activity (${milFlights.length} Flights)</h2>
<table><thead><tr><th>Callsign</th><th>Type</th><th>Altitude</th><th>Heading</th></tr></thead><tbody>
${milFlights.map(f => `<tr><td style="color:#fff">${escHtml(f.callsign)}</td><td>${escHtml(f.type.toUpperCase())}</td><td>${f.altitude.toLocaleString()} ft</td><td>${Math.round(f.heading)}</td></tr>`).join('')}
</tbody></table>


<h2>Maritime Situation (${ships.length} Vessels)</h2>
<table><thead><tr><th>Vessel</th><th>Type</th><th>Flag</th><th>Speed</th><th>Heading</th></tr></thead><tbody>
${ships.map(s => `<tr><td style="color:#fff">${escHtml(s.name)}</td><td>${escHtml(s.type.toUpperCase())}</td><td>${escHtml(s.flag)}</td><td>${s.speed} kn</td><td>${headingToCompass(s.heading)}</td></tr>`).join('')}
</tbody></table>

<h2>Market Impact</h2>
<table><thead><tr><th>Symbol</th><th>Price</th><th>Change</th></tr></thead><tbody>
${movers.map(c => `<tr><td style="color:#fff">${escHtml(c.symbol)}</td><td>${c.currency === 'USD' ? '$' : ''}${c.price.toFixed(c.price < 10 ? 4 : 2)}</td><td class="${c.changePercent >= 0 ? 'pos' : 'neg'}">${c.changePercent >= 0 ? '+' : ''}${c.changePercent.toFixed(2)}%</td></tr>`).join('')}
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

  const fmtOpts = { hour12: false, hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const };
  const utcTime = time.toLocaleTimeString('en-US', { ...fmtOpts, timeZone: 'UTC' });
  const beirutTime = time.toLocaleTimeString('en-US', { ...fmtOpts, timeZone: 'Asia/Beirut' });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="flex items-center gap-1.5" data-testid="text-clock">
      <span className="text-[10px] text-muted-foreground/60 hidden md:inline font-mono">{dateStr}</span>
      <div className="flex items-center gap-1 bg-muted/60 border border-border rounded px-1.5 py-0.5">
        <span className="text-[10px] text-foreground/80 font-mono tabular-nums">{utcTime}</span>
        <span className="text-[8px] text-muted-foreground/50 font-mono">UTC</span>
        <div className="w-px h-2.5 bg-border mx-0.5" />
        <span className="text-[10px] text-primary font-mono tabular-nums">{beirutTime}</span>
        <span className="text-[8px] text-muted-foreground/50 font-mono">BEY</span>
      </div>
    </div>
  );
});

function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}


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
    ? {background:'hsl(0 72% 51% / 0.06)', borderColor:'hsl(0 72% 51% / 0.25)'}
    : hasCritical
      ? {background:'hsl(38 92% 50% / 0.06)', borderColor:'hsl(38 92% 50% / 0.25)'}
      : {background:'hsl(221 83% 53% / 0.04)', borderColor:'hsl(221 83% 53% / 0.20)'};

  return (
    <div className="border-b shrink-0" data-testid="siren-banner" style={bgStyle}>
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
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${hasCritical ? 'animate-siren-flash' : ''}`} style={{background: hasCritical ? 'hsl(30 80% 50% / 0.15)' : 'hsl(32 80% 50% / 0.1)', border: hasCritical ? '1px solid hsl(30 80% 50% / 0.4)' : '1px solid hsl(32 80% 50% / 0.25)'}}>
                <Zap className={`w-2.5 h-2.5 ${hasCritical ? 'text-amber-400/90' : 'text-amber-500/70'}`} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-[0.25em] font-mono whitespace-nowrap ${hasCritical ? 'text-amber-400/70' : 'text-amber-500/50'}`}>
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
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                )}
                <span className={`font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-amber-400/80'}`}>
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
          className={`text-[10px] px-2 h-6 font-mono shrink-0 ${hasSirens ? 'text-red-400 hover:bg-red-900/30' : hasCritical ? 'text-amber-400 hover:bg-amber-900/20' : 'text-amber-500 hover:bg-amber-900/20'}`}
          data-testid="button-siren-expand"
        >
          {expanded ? '\u25B2' : '\u25BC'} {language === 'en' ? 'Details' : '\u062A\u0641\u0627\u0635\u064A\u0644'}
        </Button>
      </div>

      {expanded && (
        <div className={`border-t ${hasSirens ? 'border-red-900/30 bg-red-950/20' : 'border-border bg-card/40'} max-h-[180px] overflow-auto`}>
          {sortedSirens.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-red-900/20">
              {sortedSirens.map((s) => {
                const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
                return (
                  <div key={s.id} className="px-3 py-2 bg-background/80" data-testid={`siren-alert-${s.id}`}>
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
            <div className={`${sortedSirens.length > 0 ? 'border-t border-border' : ''}`}>
              {sortedBreaking.map((item) => (
                <div key={item.id} className="px-4 py-2 border-b border-border" data-testid={`breaking-${item.id}`}>
                  <div className="flex items-center gap-2">
                    {item.severity === 'critical' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={`text-[11px] font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-amber-400/80'}`}>
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


// ── Floating Window ──────────────────────────────────────────────────────────
interface FloatState { x: number; y: number; w: number; h: number; z: number }

const FloatingWindow = memo(function FloatingWindow({
  id, title, icon, children, state, onDock, onClose, onFocus, onDragStart, onDragEnd,
}: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
  state: FloatState; onDock: () => void; onClose: () => void; onFocus: () => void;
  onDragStart?: () => void; onDragEnd?: (x: number, y: number) => void;
}) {
  const [pos, setPos] = useState({ x: state.x, y: state.y });
  const [size, setSize] = useState({ w: state.w, h: state.h });
  const drag = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,[data-no-drag]')) return;
    drag.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    onFocus(); onDragStart?.(); e.preventDefault();
  };
  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPos({
      x: Math.max(0, drag.current.ox + e.clientX - drag.current.mx),
      y: Math.max(0, drag.current.oy + e.clientY - drag.current.my),
    });
  };
  const onTitleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    onDragEnd?.(e.clientX, e.clientY);
  };

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
        borderRadius: 14, overflow: 'hidden',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        pointerEvents: 'auto',
      }}
    >
      {/* Title bar — drag handle */}
      <div
        onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={onTitleUp}
        style={{
          height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
          background: 'hsl(var(--card))',
          borderBottom: '1px solid hsl(var(--border))',
          cursor: 'grab', flexShrink: 0, userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', color: 'hsl(var(--primary))' }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', flex: 1 }}>{title}</span>
        <button
          onClick={onDock} data-no-drag title="Dock back to grid"
          style={{ height: 26, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', flexShrink: 0, fontSize: 11, fontWeight: 600 }}
        >
          <PanelLeft style={{ width: 11, height: 11 }} />
          <span>Dock</span>
        </button>
        <button
          onClick={onClose} data-no-drag title="Close"
          style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.20)', color: 'hsl(0 72% 51%)', cursor: 'pointer', flexShrink: 0 }}
        >
          <X style={{ width: 12, height: 12 }} />
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
        background: 'rgba(4,7,16,0.96)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontFamily: "var(--font-mono)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 7 }}>
        {activeView === 'conflict' ? 'EVENT TYPES' : 'AIRCRAFT'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
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
      <div className="w-[95vw] max-w-[520px] max-h-[90dvh] bg-background border border-primary/30 rounded-xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
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
                      local.notificationLevel === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted/20 border-border text-foreground/30 hover:bg-muted/40'
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
                      local.defaultLanguage === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted/20 border-border text-foreground/30 hover:bg-muted/40'
                    }`}
                    data-testid={`button-lang-${l}`}
                  >{l === 'en' ? 'English' : '\u0639\u0631\u0628\u064A'}</button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-primary/20 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[10px] px-4 py-1.5 rounded font-mono text-foreground/40 hover:text-foreground border border-border hover:bg-muted/40 transition-colors" data-testid="button-cancel-settings">{t('Cancel', '\u0625\u0644\u063A\u0627\u0621')}</button>
          <button onClick={handleSave} className={`text-xs ${isTouchDevice ? 'px-6 py-3' : 'px-4 py-1.5'} rounded font-mono font-bold text-background bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors`} data-testid="button-save-settings">{t('Save', '\u062D\u0641\u0638')}</button>
        </div>
      </div>
    </div>
  );
}


const AlertMapComponent = lazy(() => import('@/components/alert-map'));

const ALERT_THREAT_META: Record<string, { label: string; icon: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  rockets:                    { label: 'Rockets',  icon: '🚀', dotColor: '#ef4444', textColor: 'text-red-300',    bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
  missiles:                   { label: 'Missiles', icon: '🎯', dotColor: '#f97316', textColor: 'text-orange-300', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  hostile_aircraft_intrusion: { label: 'Aircraft', icon: '✈',  dotColor: '#a855f7', textColor: 'text-purple-300', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30' },
  uav_intrusion:              { label: 'UAV',      icon: '🔺', dotColor: '#22d3ee', textColor: 'text-cyan-300',   bgColor: 'bg-cyan-500/15',   borderColor: 'border-cyan-500/30' },
};

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
      <PanelHeader
        title={language === 'en' ? 'Alert Map' : '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}
        icon={<MapPin className="w-3.5 h-3.5" />}
        live
        count={activeAlerts.length > 0 ? activeAlerts.length : undefined}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="alertmap"
        extra={
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
        }
      />

      {/* Map area — takes all remaining space */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center" style={{background:'hsl(240 15% 5%)'}}>
                  <MapPin className="w-6 h-6 animate-pulse" style={{color:'rgba(99,102,241,0.7)'}} />
                </div>
              }
            >
              <AlertMapComponent alerts={meAlerts} language={language} />
            </Suspense>
          </MapErrorBoundary>
        </div>
      </div>

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
    <div className="h-full flex flex-col min-h-0" style={{ fontFamily: "var(--font-mono)" }}>

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
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color, boxShadow: `0 0 8px ${activeMode.color}bb`, transition: 'background-color 0.2s ease' }} />
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color + '44', transition: 'background-color 0.2s ease' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,211,238,0.82)', lineHeight: 1.25 }}>THEATRE OF OPERATIONS</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', color: 'rgba(255,255,255,0.16)', lineHeight: 1 }}>MIDDLE EAST · MENA · GULF</span>
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
                    padding: '3px 9px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: active ? `${m.color}1e` : 'transparent',
                    color: active ? m.color : 'rgba(255,255,255,0.22)',
                    boxShadow: active ? `0 0 0 1px ${m.color}44, inset 0 0 10px ${m.color}0d` : 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
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
                {pulse && <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'eas-flash 1.1s ease-in-out infinite', flexShrink: 0, transform: 'translateZ(0)' }} />}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>

          {hasActiveThreats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, animation: 'eas-pulse-border 1.2s ease-in-out infinite', flexShrink: 0, transform: 'translateZ(0)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 7px rgba(239,68,68,0.8)', animation: 'eas-flash 0.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', color: '#ef4444' }}>ACTIVE THREAT</span>
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
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: isProviderActive ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.15)', padding: '0 3px', fontFamily: 'monospace' }}>
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
                        padding: '2px 6px', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.06em', borderRadius: 3, border: 'none',
                        cursor: 'pointer',
                        background: mapStyleId === s.id ? 'rgba(34,211,238,0.12)' : 'transparent',
                        color: mapStyleId === s.id ? '#22d3ee' : 'rgba(255,255,255,0.22)',
                        transition: 'background-color 0.12s ease, color 0.12s ease',
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
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,107,53,0.65)' }}>FIRMS</span>
          </div>

          {/* LIVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.65)', animation: 'eas-flash 1.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,197,94,0.65)' }}>LIVE</span>
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
                  <span style={{ fontSize: 11, color: 'rgba(34,211,238,0.45)', letterSpacing: '0.22em', fontFamily: 'monospace' }}>INITIALISING MAP</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.2em', fontFamily: 'monospace' }}>THEATRE OF OPERATIONS</span>
                </div>
              </div>
            }>
              <ConflictMap
                events={events}
                flights={flights}
                redAlerts={redAlerts}
                thermalHotspots={thermalHotspots}
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
    <div className="h-6 border-t border-border overflow-hidden relative shrink-0 bg-muted/40" data-testid="news-ticker">
      <div className="absolute inset-y-0 left-0 w-14 z-10 flex items-center pl-3 bg-gradient-to-r from-muted/80 to-transparent">
        <span className="text-[10px] font-semibold text-muted-foreground">News</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-muted/80 to-transparent" />
      <div className="absolute flex items-center h-full gap-8 animate-ticker-scroll whitespace-nowrap pl-14">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className={`font-semibold text-[10px] ${CATEGORY_COLORS[item.category] || 'text-primary'}`}>
              {item.category}
            </span>
            <span className="text-foreground/70">{language === 'ar' && item.titleAr ? item.titleAr : item.title}</span>
            <span className="text-muted-foreground text-[10px]">{item.source}</span>
            <span className="text-border mx-1">{'\u2502'}</span>
          </span>
        ))}
      </div>
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
      <div className="flex items-end gap-px h-14 bg-muted/20 rounded border border-border p-1 overflow-x-auto" data-testid="timeline-bars">
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
        <div className="border border-border rounded bg-muted/20 p-2 space-y-1 max-h-32 overflow-y-auto" data-testid="timeline-detail">
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

// ── AI Prediction Panel ────────────────────────────────────────────────────────
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
  const topGroup: PanelId[] = ['alerts', 'regional', 'telegram', 'livefeed', 'aiprediction'];
  const bottomGroup: PanelId[] = ['events', 'markets', 'alertmap', 'analytics', 'osint', 'attackpred', 'rocketstats'];


  const renderBtn = (id: PanelId) => {
    const cfg = PANEL_CONFIG[id];
    if (!cfg) return null;
    const Icon = cfg.icon;
    const active = visiblePanels[id];
    const stat = panelStats[id];
    const accent = PANEL_ACCENTS[id] || 'hsl(var(--primary))';
    return (
      <button
        key={id}
        onClick={() => active ? closePanel(id) : openPanel(id)}
        className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg relative transition-colors
          ${active
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        style={active ? { background: `color-mix(in srgb, ${accent} 10%, transparent)` } : undefined}
        data-testid={`sidebar-panel-${id}`}
        title={active ? `Hide ${cfg.label}` : `Show ${cfg.label}`}
      >
        {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ background: accent }} />}
        <Icon className="w-4 h-4 shrink-0 ml-0.5" style={active ? { color: accent } : undefined} />
        <span className="text-[13px] font-medium flex-1 text-left leading-none truncate">
          {language === 'en' ? cfg.label : cfg.labelAr}
        </span>
        {stat !== undefined && stat !== '' && (
          <span className="text-[10px] tabular-nums shrink-0 px-1.5 py-0.5 rounded-md font-semibold text-muted-foreground/60 bg-muted">
            {stat}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar"
      style={{ width: 208 }}
    >
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Panels</span>
      </div>
      <div className="flex flex-col gap-px px-1.5 pb-1">
        {topGroup.map(id => renderBtn(id))}
      </div>
      <div className="mx-3 my-2 border-t border-border/60" />
      <div className="flex flex-col gap-px px-1.5 pb-3">
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={onClose} data-testid="popup-map-overlay">
      <div className="relative w-[92vw] max-w-[800px] h-[70vh] max-h-[600px] rounded-lg border border-primary/20 bg-background shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} data-testid="popup-map-container">
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 py-2 bg-background/95 border-b border-primary/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[11px] font-mono font-bold text-primary">{language === 'en' ? 'LIVE TRACKING' : 'تتبع مباشر'}</span>
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
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{Math.round(liveData.heading)}° {compass}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/30">POS</span>
            <span className="text-[11px] font-mono text-foreground/70 tabular-nums">{liveData.lat.toFixed(4)}, {liveData.lng.toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[9px] font-mono text-green-400/70">{language === 'en' ? 'LIVE' : 'مباشر'}</span>
          </div>
        </div>
        <div ref={mapRef} className="absolute inset-0 w-full h-full" data-testid="popup-map-leaflet" />
      </div>
    </div>
  );
}

// ── Regional Attacks Panel — Lebanon, GCC, Yemen, Syria, Iraq, Egypt, Jordan, Iran ──
const REGION_META: Record<string, { label: string; labelAr: string; flag: string; color: string }> = {
  all:     { label: 'All',     labelAr: 'الكل',       flag: '🌍', color: '#94a3b8' },
  lebanon: { label: 'Lebanon', labelAr: 'لبنان',      flag: '🇱🇧', color: '#10b981' },
  yemen:   { label: 'Yemen',   labelAr: 'اليمن',      flag: '🇾🇪', color: '#f43f5e' },
  iran:    { label: 'Iran',    labelAr: 'إيران',      flag: '🇮🇷', color: '#a855f7' },
  iraq:    { label: 'Iraq',    labelAr: 'العراق',     flag: '🇮🇶', color: '#f97316' },
  syria:   { label: 'Syria',   labelAr: 'سوريا',      flag: '🇸🇾', color: '#eab308' },
  gcc:     { label: 'GCC',     labelAr: 'الخليج',     flag: '🛢️', color: '#f59e0b' },
  egypt:   { label: 'Egypt',   labelAr: 'مصر',        flag: '🇪🇬', color: '#22d3ee' },
  jordan:  { label: 'Jordan',  labelAr: 'الأردن',     flag: '🇯🇴', color: '#06b6d4' },
};

const THREAT_LEVEL_META: Record<string, { dot: string; label: string }> = {
  high:   { dot: '#ef4444', label: 'HIGH' },
  medium: { dot: '#f59e0b', label: 'MED'  },
  low:    { dot: '#6b7280', label: 'LOW'  },
};

const ATTACK_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  drone:     { icon: '🛸', label: 'Drone/UAV',  color: '#a855f7' },
  missile:   { icon: '🚀', label: 'Missile',    color: '#ef4444' },
  rocket:    { icon: '💥', label: 'Rocket',     color: '#f97316' },
  airstrike: { icon: '✈️', label: 'Airstrike',  color: '#3b82f6' },
  naval:     { icon: '⚓', label: 'Naval',      color: '#0ea5e9' },
  artillery: { icon: '💣', label: 'Artillery',  color: '#d97706' },
  other:     { icon: '⚠️', label: 'Attack',     color: '#94a3b8' },
};

interface RegionalFeedItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  timestamp: string;
  attackType: string;
  relevance: string;
  threatLevel?: 'high' | 'medium' | 'low';
  isSiren?: boolean;
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
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('alerts');
  const [showMobilePanelPicker, setShowMobilePanelPicker] = useState(false);
  const swipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  const panelWrapperRef = useRef<HTMLDivElement>(null);
  const panelsScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const SWIPE_TABS: PanelId[] = ['alertmap', 'alerts', 'regional', 'telegram', 'events'];

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

  const scrollStateRef = useRef({ showDown: false, showTop: false });
  // Shared physics scroll controller — buttons and wheel use the same engine
  const physicsScrollRef = useRef<{ scrollBy: (delta: number) => void; scrollTo: (y: number) => void }>({
    scrollBy: () => {}, scrollTo: () => {},
  });
  useEffect(() => {
    const el = panelsScrollRef.current;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 40;
        const shouldShowDown = !atBottom && scrollHeight > clientHeight + 40;
        const shouldShowTop = scrollTop > 80;
        if (shouldShowDown !== scrollStateRef.current.showDown) {
          scrollStateRef.current.showDown = shouldShowDown;
          setShowScrollDown(shouldShowDown);
        }
        if (shouldShowTop !== scrollStateRef.current.showTop) {
          scrollStateRef.current.showTop = shouldShowTop;
          setShowScrollTop(shouldShowTop);
        }
      });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) return;
    const container = panelsScrollRef.current;
    if (!container) return;

    let targetY = container.scrollTop;
    let velocity = 0;
    let lastTime = 0;
    let raf: number | null = null;

    const SPRING = 0.14;    // how fast it catches up (higher = snappier)
    const DAMPING = 0.80;   // momentum decay per frame (higher = more glide)
    const MIN_DELTA = 0.4;  // stop threshold in pixels

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      const gap = targetY - container.scrollTop;
      velocity = velocity * Math.pow(DAMPING, dt) + gap * SPRING * dt;
      const next = container.scrollTop + velocity;
      const max = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.max(0, Math.min(max, next));
      if (Math.abs(gap) < MIN_DELTA && Math.abs(velocity) < MIN_DELTA) {
        container.scrollTop = Math.max(0, Math.min(max, targetY));
        velocity = 0;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    // Expose to scroll buttons via ref (native wheel scroll is used; physics only for button clicks)
    physicsScrollRef.current = {
      scrollBy: (delta: number) => {
        if (!raf) { targetY = container.scrollTop; velocity = 0; }
        const max = container.scrollHeight - container.clientHeight;
        targetY = Math.max(0, Math.min(max, targetY + delta));
        startAnimation();
      },
      scrollTo: (y: number) => {
        if (!raf) { targetY = container.scrollTop; velocity = 0; }
        const max = container.scrollHeight - container.clientHeight;
        targetY = Math.max(0, Math.min(max, y));
        velocity = (targetY - container.scrollTop) * 0.08;
        startAnimation();
      },
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      physicsScrollRef.current = { scrollBy: () => {}, scrollTo: () => {} };
    };
  }, [isMobile, isTablet]);




  const defaultVisible: Record<PanelId, boolean> = { telegram: true, events: true, alerts: true, regional: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: true, attackpred: true, rocketstats: true, aiprediction: true };
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
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
  const [mobileActiveTab, setMobileActiveTab] = useState<PanelId>('alerts');
  const [savedPresets, setSavedPresets] = useState<LayoutPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_layouts') || '[]');
      return [...BUILT_IN_PRESETS, ...saved];
    } catch { return [...BUILT_IN_PRESETS]; }
  });
  const [gridLayout, setGridLayout] = useState<GridItemLayout[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_grid_layout_v9') || '[]');
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

  const compactedVisibleLayout = useMemo(() => {
    const filtered = gridLayout.filter(item => visiblePanels[item.i as PanelId]);
    const sorted = [...filtered].sort((a, b) => a.y - b.y || a.x - b.x);
    const cols = 12;
    const colHeights = new Array(cols).fill(0);
    return sorted.map(item => {
      let minY = 0;
      for (let c = item.x; c < Math.min(item.x + item.w, cols); c++) {
        minY = Math.max(minY, colHeights[c]);
      }
      const compacted = { ...item, y: minY };
      for (let c = compacted.x; c < Math.min(compacted.x + compacted.w, cols); c++) {
        colHeights[c] = compacted.y + compacted.h;
      }
      return compacted;
    });
  }, [gridLayout, visiblePanels]);

  const sse = useSSE();
  const { news, commodities, events, flights, ships, sirens, redAlerts, telegramMessages, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected, feedFreshness } = sse;

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
      try { localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(merged)); } catch {}
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
  const [draggingFloatId, setDraggingFloatId] = useState<PanelId | null>(null);
  const dockZoneRef = useRef<HTMLDivElement | null>(null);

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

  const topRow: PanelId[] = ['telegram', 'alertmap', 'alerts', 'regional', 'livefeed'];
  const bottomRow: PanelId[] = ['events', 'markets', 'analytics', 'osint', 'attackpred', 'rocketstats', 'aiprediction'];
  const allPanels: PanelId[] = [...topRow, ...bottomRow];
  const activeTop = topRow.filter(id => visiblePanels[id]);
  const activeBottom = bottomRow.filter(id => visiblePanels[id]);
  const panelCount = activeTop.length + activeBottom.length;

  const [readyPanels, setReadyPanels] = useState<Set<PanelId>>(() => new Set(topRow));
  useEffect(() => {
    if (isMobile || isTablet) {
      setReadyPanels(new Set(allPanels));
      return;
    }
    setReadyPanels(new Set(topRow));
    const batches: PanelId[][] = [
      ['events', 'markets', 'aiprediction'],
      ['analytics', 'osint'],
      ['attackpred', 'rocketstats', 'livefeed'],
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    batches.forEach((batch, i) => {
      timers.push(setTimeout(() => {
        setReadyPanels(prev => {
          const next = new Set(prev);
          batch.forEach(id => next.add(id));
          return next;
        });
      }, (i + 1) * 400));
    });
    return () => timers.forEach(clearTimeout);
  }, [isMobile, isTablet]);

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = {
    telegram: 16, alertmap: 36, alerts: 16, regional: 16, livefeed: 16,
    events: 22, markets: 28,
    analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28,
  };
  const [colWidths, setColWidths] = useState<Record<PanelId, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
      if (saved.colWidths) return { ...defaultWidths, ...saved.colWidths };
    } catch {}
    return defaultWidths;
  });
  const [rowSplit, setRowSplit] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
      if (saved.rowSplit) return saved.rowSplit;
    } catch {}
    return 58;
  });

  useEffect(() => {
    if (panelPersistTimeout.current) clearTimeout(panelPersistTimeout.current);
    panelPersistTimeout.current = setTimeout(() => {
      try { localStorage.setItem('warroom_panel_state_v2', JSON.stringify({ visiblePanels, colWidths, rowSplit })); } catch {}
    }, 500);
  }, [visiblePanels, colWidths, rowSplit]);

  const savePreset = useCallback((name: string) => {
    const preset: LayoutPreset = { name, visiblePanels: { ...visiblePanels }, colWidths: { ...colWidths }, rowSplit, gridLayout: [...gridLayout] };
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    customPresets.push(preset);
    try { localStorage.setItem('warroom_layouts', JSON.stringify(customPresets)); } catch {}
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [visiblePanels, colWidths, rowSplit, gridLayout, savedPresets]);

  const loadPreset = useCallback((preset: LayoutPreset) => {
    setVisiblePanels(preset.visiblePanels);
    setColWidths(preset.colWidths);
    setRowSplit(preset.rowSplit);
    if (preset.gridLayout && preset.gridLayout.length > 0) {
      setGridLayout(preset.gridLayout);
      try { localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(preset.gridLayout)); } catch {}
    }
    setMaximizedPanel(null);
  }, []);

  const deletePreset = useCallback((name: string) => {
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    try { localStorage.setItem('warroom_layouts', JSON.stringify(customPresets)); } catch {}
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
        case 'aiprediction':
          return <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}><AIPredictionPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} alerts={redAlerts} sirens={sirens} flights={flights} telegramMessages={telegramMessages} events={events} commodities={commodities} ships={ships} thermalHotspots={thermalHotspots} /></Suspense>;
        case 'events':
          return <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alerts':
          return <RedAlertPanel alerts={redAlerts.filter(a => !a.country || a.country === 'Israel')} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
        case 'regional':
          return <RegionalAttacksPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;

        case 'telegram':
          return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} soundEnabled={soundEnabled} silentMode={settings.silentMode} volume={settings.volume} />;
        case 'markets':
          return <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'livefeed':
          return <LiveFeedPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alertmap':
          return <AlertMapPanel alerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'analytics':
          return <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}><AnalyticsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} /></Suspense>;
        case 'osint':
          return <OsintTimelinePanel alerts={redAlerts} messages={telegramMessages} events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'attackpred':
          return <AttackPredictorPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} />;
        case 'rocketstats':
          return <RocketStatsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} stats={rocketStats} />;
      }
    })();
    return panel ?? null;
  };

  return (<FeedFreshnessContext.Provider value={feedFreshness}>
    <div className={`flex flex-col bg-background text-foreground h-screen ${isMobile || isTablet ? '!h-[100dvh]' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: (isMobile || isTablet) && isLandscape ? 'env(safe-area-inset-left, 0px)' : undefined, paddingRight: (isMobile || isTablet) && isLandscape ? 'env(safe-area-inset-right, 0px)' : undefined }} data-testid="dashboard">
      <header className={`${isMobile ? (isLandscape ? 'h-8' : 'h-9') : isTouchDevice ? 'min-h-[40px]' : 'h-9'} border-b flex items-center justify-between px-2 md:px-3 shrink-0 relative z-50 warroom-header bg-card`}>
        {/* Left — Branding */}
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 hidden sm:flex bg-primary/10 border border-primary/20">
              <span className="text-primary text-[10px]">&#x25C8;</span>
            </div>
            <span className={`${isMobile ? 'text-[12px]' : 'text-[13px]'} font-bold tracking-[.08em] uppercase text-foreground select-none whitespace-nowrap font-mono`}>
              Warroom
            </span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-px rounded bg-red-500/8 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-[9px] text-red-500 font-bold font-mono uppercase tracking-wider">Live</span>
          </div>
          {(isMobile || isTablet) && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge">
              <ShieldAlert className={`w-3 h-3 ${threatLevel.color}`} />
              <span className={`text-[11px] font-semibold ${threatLevel.color}`}>{threatLevel.level}</span>
            </div>
          )}
        </div>
        {/* Center — Key status (desktop only) */}
        {!isMobile && !isTablet && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge">
              <ShieldAlert className={`w-3 h-3 ${threatLevel.color}`} />
              <span className={`text-[10px] font-bold font-mono ${threatLevel.color}`}>{threatLevel.level}</span>
            </div>
            {redAlerts.length > 0 && (
              <>
                <div className="w-px h-3.5 bg-border" />
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/8 border border-red-500/20">
                  <span className="text-[10px] font-bold text-red-500 font-mono">{redAlerts.length}</span>
                  <span className="text-[9px] text-red-400 font-mono">ALR</span>
                </div>
              </>
            )}
            <div className="w-px h-3.5 bg-border" />
            <LiveClock />
          </div>
        )}
        <div className="flex items-center gap-2">
          {(isMobile || isTablet) && <div className="flex items-center"><LiveClock /></div>}
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
              <a
                href="/ember"
                className="px-2 h-7 rounded text-[11px] font-mono font-bold text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] transition-all duration-150 inline-flex items-center gap-1"
                title="Compact Ember View"
              >
                EMBER
              </a>
              <div className="w-px h-3.5 bg-border mx-0.5" />
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
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${connected ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-red-500/10 border-red-500/25'}`} role="status" aria-label={connected ? 'Connected to server' : 'Disconnected'} title={connected ? 'Stream connected' : 'Stream disconnected'}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-500'}`} />
            <span className={`text-[11px] font-medium hidden sm:inline ${connected ? 'text-emerald-500' : 'text-red-500'}`}>
              {connected ? (language === 'en' ? 'Online' : '\u0645\u062A\u0635\u0644') : (language === 'en' ? 'Offline' : '\u0645\u0646\u0642\u0637\u0639')}
            </span>
          </div>
        </div>
      </header>
      {!escalationDismissed && <EscalationBanner state={escalation} onDismiss={() => setEscalationDismissed(true)} />}

      <div className="flex flex-1 min-h-0">
        {!isMobile && !isTablet && (
          <PanelSidebar
            visiblePanels={visiblePanels}
            openPanel={openPanel}
            closePanel={closePanel}
            language={language}
            panelStats={{
              alerts: redAlerts.filter(a => !a.country || a.country === 'Israel').length > 0 ? `${redAlerts.filter(a => !a.country || a.country === 'Israel').length} IL` : '',
              regional: 'LIVE',
              telegram: telegramMessages.length > 0 ? `${telegramMessages.length}` : '',
              livefeed: '',
              events: events.length > 0 ? `${events.length}` : '',
              markets: commodities.length > 0 ? `${commodities.length}` : '',
              alertmap: redAlerts.length > 0 ? `${redAlerts.length}` : '',
              analytics: '',
            }}
          />
        )}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">

      {showMobileMenu && (isMobile || isTablet) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-2 top-full z-50 mt-1 rounded-xl border border-border bg-card shadow-lg min-w-[180px]" data-testid="mobile-menu">
            <div className="p-1.5 flex flex-col gap-0.5">
              {[
                { id: 'notif', icon: Bell, label: notificationsEnabled ? 'Notif ON' : 'Notif OFF', action: () => { toggleNotifications(); setShowMobileMenu(false); }, active: notificationsEnabled },
                { id: 'sound', icon: soundEnabled ? Volume2 : VolumeX, label: soundEnabled ? 'Sound ON' : 'Sound OFF', action: () => { setSoundEnabled((p: boolean) => !p); setShowMobileMenu(false); }, active: soundEnabled },
                { id: 'notes', icon: StickyNote, label: language === 'ar' ? 'ملاحظات' : 'Notes', action: () => { setShowNotes(true); setShowMobileMenu(false); } },
                { id: 'watchlist', icon: Eye, label: language === 'ar' ? 'مراقبة' : 'Watchlist', action: () => { setShowWatchlist(true); setShowMobileMenu(false); } },
                { id: 'export', icon: FileDown, label: language === 'ar' ? 'تصدير' : 'Export', action: () => { handleExport(); setShowMobileMenu(false); } },
                { id: 'settings', icon: Settings, label: language === 'ar' ? 'إعدادات' : 'Settings', action: () => { setShowSettings(true); setShowMobileMenu(false); } },
                { id: 'ember', icon: Globe, label: 'Ember View', action: () => { window.location.href = '/ember'; } },
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
            <div className="border-t border-border px-3 py-2">
              <div className="flex items-center gap-2 text-[8px] font-mono text-foreground/20">
                <span>SRC {[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, redAlerts.length > 0 || sirens.length > 0].filter(Boolean).length}</span>
                <span>·</span>
                <span>EVT {events.length}</span>
                <span className="ml-auto"><LiveClock /></span>
              </div>
            </div>
          </div>
        </>
      )}

      {isMobile && redAlerts.length > 0 && (
        <div className="warroom-mobile-mini-ticker shrink-0" data-testid="mobile-mini-ticker">
          {redAlerts.length > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-red-400/70">{redAlerts.length} ALERTS</span>
            </div>
          )}
        </div>
      )}

      <SirenBanner sirens={sirens} breakingNews={breakingNews} language={language} hidden={!!maximizedPanel} />

      <div
        ref={panelsScrollRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0, overscrollBehavior: 'contain' }}
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
              {(SWIPE_TABS).map(id => (
                <div key={id} className={`absolute inset-0 flex flex-col ${mobileActivePanel === id ? 'z-10' : 'z-0 mobile-panel-hidden'}`}>
                  {renderPanel(id)}
                </div>
              ))}
              {!(['alertmap', 'alerts', 'regional', 'telegram', 'events'] as PanelId[]).includes(mobileActivePanel) && (
                <AnimatedPanel animKey={mobileActivePanel} className="absolute inset-0 flex flex-col z-10">
                  {renderPanel(mobileActivePanel)}
                </AnimatedPanel>
              )}
            </div>
            {/* Swipe dots — hidden when alerts panel is full-screen */}
            {mobileActivePanel !== 'alerts' && (
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
            )}

            {/* Tab bar — hidden when alerts panel is full-screen; replaced by floating nav */}
            {mobileActivePanel !== 'alerts' ? (
              <div className="shrink-0 border-t border-border flex items-center warroom-mobile-tabs" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }} data-testid="mobile-tab-bar">
                {(SWIPE_TABS).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const isActive = mobileActivePanel === id;
                  const hasAlert = id === 'alerts' && redAlerts.length > 0;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isRegional = id === 'regional';
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex-1 min-w-[44px] min-h-[56px] py-1.5 flex flex-col items-center gap-1 transition-all relative ${isActive ? (isRegional ? 'text-emerald-400' : 'text-primary') : 'text-foreground/30 active:text-foreground/60'} ${hasAlert && !isActive ? 'text-red-400' : ''}`}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      data-testid={`mobile-tab-${id}`}
                    >
                      {isActive && <div className={`absolute top-0 left-1 right-1 h-[2px] rounded-b ${isRegional ? 'bg-emerald-500' : 'bg-primary'}`} />}
                      <Icon className={`w-[18px] h-[18px] transition-transform ${isActive ? 'scale-105' : ''}`} />
                      <span className={`text-[8px] font-medium transition-colors leading-tight text-center ${isActive ? (isRegional ? 'text-emerald-400' : 'text-primary') : 'text-muted-foreground'}`}>{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                      {hasAlert && <div className="absolute top-1.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                      {hasTelegram && !isActive && <div className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
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
            ) : (
              /* Floating nav — compact, integrated into alerts full-screen */
              <div
                className="shrink-0 flex items-center justify-around px-2"
                style={{
                  paddingTop: 8,
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                  background: 'hsl(20 10% 5%)',
                  borderTop: '1px solid rgba(239,68,68,0.12)',
                }}
                data-testid="mobile-tab-bar"
              >
                {(['alertmap', 'regional', 'telegram', 'events'] as PanelId[]).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isRegional = id === 'regional';
                  const iconColor = isRegional ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.28)';
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className="flex flex-col items-center gap-1 rounded-lg transition-all active:scale-90 active:bg-white/5 relative"
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        minWidth: 56, minHeight: 42, padding: '6px 8px',
                        color: iconColor,
                      }}
                      data-testid={`mobile-tab-${id}`}
                      aria-label={cfg.label}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="text-[9px] font-mono font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.20)' }}>
                        {language === 'ar' ? cfg.labelAr : cfg.label}
                      </span>
                      {hasTelegram && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowMobilePanelPicker(p => !p)}
                  className="flex flex-col items-center gap-1 rounded-lg transition-all active:scale-90 active:bg-white/5"
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    minWidth: 44, minHeight: 42, padding: '6px 8px',
                    color: 'rgba(255,255,255,0.22)',
                  }}
                  data-testid="mobile-tab-more"
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" />
                  <span className="text-[9px] font-mono font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.18)' }}>MORE</span>
                </button>
              </div>
            )}
            {/* Bottom Sheet Backdrop */}
            {showMobilePanelPicker && (
              <div
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => setShowMobilePanelPicker(false)}
              />
            )}
            <div
              className={`fixed left-0 right-0 bottom-0 z-50 warroom-bottom-sheet ${showMobilePanelPicker ? 'warroom-bottom-sheet--open' : ''}`}
              style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileActivePanel === 'alerts' ? '60px' : '64px'})`, paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
              data-testid="mobile-panel-picker"
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/[0.12]" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-foreground/40">
                  {language === 'ar' ? 'لوحات إضافية' : 'More Panels'}
                </span>
                <button onClick={() => setShowMobilePanelPicker(false)} className="w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-foreground/60 rounded-lg active:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5 p-3">
                {allPanels.filter(id => !(SWIPE_TABS as PanelId[]).includes(id)).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const count = 0;
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
            className="grid gap-2 p-2 overflow-y-auto"
            style={{
              gridTemplateColumns: isLandscape ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gridAutoRows: `minmax(${isLandscape ? '300px' : '340px'}, auto)`,
              background: 'hsl(var(--background))',
              paddingLeft: 'max(8px, env(safe-area-inset-left))',
              paddingRight: 'max(8px, env(safe-area-inset-right))',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            }}
          >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const isWide = id === 'alertmap';
              const mapH = isLandscape ? '440px' : '500px';
              const alertsH = isLandscape ? '340px' : '400px';
              const alertmapH = isLandscape ? '420px' : '480px';
              const defaultH = isLandscape ? '300px' : '340px';
              return (
                <div
                  key={id}
                  className="panel-enter"
                  style={{
                    gridColumn: isWide ? `1 / -1` : undefined,
                    minHeight: id === 'alerts' ? alertsH : id === 'alertmap' ? alertmapH : defaultH,
                    background: 'hsl(20 10% 7%)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: id === 'alerts' ? '1px solid hsl(0 72% 51% / 0.35)' : '1px solid hsl(20 8% 13%)',
                    boxShadow: '0 2px 14px rgba(0,0,0,.60)',
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
          <>
            {/* Dock drop zone — visible only while dragging a floating window */}
            <div
              ref={dockZoneRef}
              style={{
                display: draggingFloatId ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                margin: '0 4px 4px',
                height: 44,
                borderRadius: 10,
                border: '2px dashed hsl(32 92% 50% / 0.7)',
                background: 'hsl(32 92% 50% / 0.07)',
                color: 'hsl(32 92% 55%)',
                fontSize: 12, fontWeight: 600,
                pointerEvents: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              <PanelLeft style={{ width: 14, height: 14 }} />
              Drop here to dock
            </div>
            {/* CSS for always-visible resize handles */}
            <style>{`.react-resizable-handle{opacity:1!important;background-color:rgba(255,255,255,0.12)!important;border-radius:3px;width:14px!important;height:14px!important}.react-resizable-handle::after{border-color:rgba(255,255,255,0.35)!important;border-width:0 2px 2px 0!important;width:6px!important;height:6px!important}.react-resizable-handle:hover{background-color:hsl(32 92% 50% / 0.55)!important}`}</style>
            <RGL
              layout={compactedVisibleLayout}
              cols={12}
              rowHeight={82}
              compactType="vertical"
              onLayoutChange={handleGridLayoutChange}
              draggableHandle=".panel-drag-handle"
              draggableCancel="button,input,select,textarea,a,[data-no-drag],canvas,.maplibregl-canvas,.maplibregl-canvas-container,#deck-canvas"
              margin={[8, 8]}
              containerPadding={[6, 6]}
              resizeHandles={['se', 'e', 's', 'sw', 'w', 'n', 'ne', 'nw']}
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
                    '--panel-accent': PANEL_ACCENTS[id] || 'hsl(var(--primary))',
                    borderRadius: 12,
                    background: isFloating ? 'hsl(20 8% 9%)' : 'hsl(20 10% 7%)',
                    border: isFloating
                      ? '1.5px dashed hsl(20 8% 16%)'
                      : hasAlertGlow
                        ? '1px solid hsl(0 70% 50% / 0.45)'
                        : '1px solid hsl(20 8% 13%)',
                    boxShadow: hasAlertGlow && !isFloating
                      ? '0 0 0 3px hsl(0 70% 50% / 0.08), 0 4px 20px rgba(0,0,0,.60)'
                      : '0 2px 12px rgba(0,0,0,.55)',
                    position: 'relative',
                    zIndex: hasAlertGlow ? 2 : undefined,
                  } as React.CSSProperties}
                  data-testid={hasAlertGlow && !isFloating ? 'alert-panel-glow' : undefined}
                >
                  {isFloating ? (
                    /* placeholder while panel is floating */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'default' }}>
                      {Icon && <Icon style={{ width: 18, height: 18, color: 'hsl(var(--muted-foreground) / 0.3)' }} />}
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{PANEL_CONFIG[id]?.label || id}</span>
                      <button
                        onClick={() => dockPanel(id)} data-no-drag
                        style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontWeight: 500 }}
                      >Dock</button>
                    </div>
                  ) : !readyPanels.has(id) ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid hsl(20 8% 12%)' }}>
                        {Icon && <Icon style={{ width: 14, height: 14, color: 'hsl(var(--muted-foreground) / 0.25)' }} />}
                        <div style={{ height: 8, width: 80, borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.08)' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                        <div className="skeleton-line" style={{ height: 10, width: '90%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.06)' }} />
                        <div className="skeleton-line" style={{ height: 10, width: '70%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.05)' }} />
                        <div className="skeleton-line" style={{ height: 10, width: '55%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.04)' }} />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: 'hsl(var(--muted-foreground) / 0.2)' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isMobile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); popOutPanel(id); }}
                          data-no-drag
                          className="absolute top-[42px] right-1.5 z-[90] opacity-40 hover:opacity-100 transition-opacity duration-150"
                          aria-label="Pop out panel"
                          title="Pop out as floating window"
                          style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                        >
                          <ExternalLink style={{ width: 11, height: 11 }} />
                        </button>
                      )}
                      <PanelErrorBoundary panelName={PANEL_CONFIG[id]?.label || id}>
                        <div className="panel-enter flex flex-col flex-1 min-h-0">
                          {renderPanel(id)}
                        </div>
                      </PanelErrorBoundary>
                    </>
                  )}
                </div>
              );
            })}
          </RGL>
          </>
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
            onDragStart={() => setDraggingFloatId(panelId)}
            onDragEnd={(x, y) => {
              setDraggingFloatId(null);
              const zone = dockZoneRef.current;
              if (zone) {
                const r = zone.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                  dockPanel(panelId);
                }
              }
            }}
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
              onClick={() => physicsScrollRef.current.scrollTo(0)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'hsl(20 10% 8% / 0.88)', border: '1px solid hsl(32 92% 50% / 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 12px hsl(32 92% 50% / 0.12)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Scroll to top"
              aria-label="Scroll to top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(32 92% 50% / 0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
          )}
          {showScrollDown && (
            <button
              onClick={() => physicsScrollRef.current.scrollBy(window.innerHeight * 0.75)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'hsl(20 10% 8% / 0.88)', border: '1px solid hsl(32 92% 50% / 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 14px hsl(32 92% 50% / 0.15)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Scroll down"
              aria-label="Scroll down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(32 92% 50% / 0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {!isMobile && <EventTimeline events={events} language={language} />}

      {!isMobile && <NewsTicker news={news} language={language} />}

      {!isMobile && (
        <div className="h-8 border-t border-border flex items-center px-3 shrink-0 gap-2 overflow-hidden bg-muted/50" data-testid="status-bar">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-400'}`} />
            <span className={`text-[11px] font-medium ${connected ? 'text-muted-foreground' : 'text-red-500'}`}>{connected ? 'Online' : 'Offline'}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><span className="font-medium text-foreground/60">Src</span> {[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, redAlerts.length > 0 || sirens.length > 0, flights.length > 0].filter(Boolean).length}</span>
            <span><span className="font-medium text-foreground/60">Events</span> {events.length}</span>
            <span><span className="font-medium text-foreground/60">Flights</span> {flights.length}</span>
            <span><span className="font-medium text-foreground/60">Markets</span> {commodities.length}</span>
          </div>
          {(redAlerts.length > 0 || sirens.length > 0) && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                {redAlerts.length > 0 && (
                  <span className="text-[11px] text-red-500 font-semibold animate-pulse px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25">
                    {redAlerts.length} Alerts
                  </span>
                )}
                {sirens.length > 0 && (
                  <span className="text-[11px] text-red-500 font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25">
                    {sirens.length} Sirens
                  </span>
                )}
              </div>
            </>
          )}
          {correlations.length > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{correlations.length} correlations</span>
              </div>
            </>
          )}
          <span className="text-[11px] text-muted-foreground/50 ml-auto hidden sm:inline">
            Warroom v2.1
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
    </FeedFreshnessContext.Provider>
  );
}
