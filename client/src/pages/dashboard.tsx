import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, Component, memo, type ErrorInfo, type ReactNode } from 'react';
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
}

function useSSE(): SSEData {
  const [state, setState] = useState<Omit<SSEData, 'connected'>>({
    news: [], commodities: [], events: [], flights: [], ships: [],
    sirens: [], redAlerts: [], telegramMessages: [],
    thermalHotspots: [], breakingNews: [],
    attackPrediction: null, rocketStats: null,
  });
  const [connected, setConnected] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 5;
  const pending = useRef<Partial<Omit<SSEData, 'connected'>>>({});
  const rafId = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const batch = pending.current;
      pending.current = {};
      if (Object.keys(batch).length === 0) return;
      setState(prev => ({ ...prev, ...batch }));
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
        try { pending.current.commodities = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('events', (e) => {
        try {
          const d = JSON.parse(e.data);
          pending.current.events = d.events || [];
          pending.current.flights = d.flights || [];
          pending.current.ships = d.ships || [];
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('news', (e) => {
        try { pending.current.news = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('sirens', (e) => {
        try { pending.current.sirens = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('red-alerts', (e) => {
        try {
          const raw: RedAlert[] = JSON.parse(e.data);
          const seen = new Set<string>();
          pending.current.redAlerts = raw.filter(a => seen.has(a.id) ? false : (seen.add(a.id), true));
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('telegram', (e) => {
        try { pending.current.telegramMessages = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('thermal', (e) => {
        try { pending.current.thermalHotspots = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('breaking-news', (e) => {
        try { pending.current.breakingNews = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('analytics', (e) => {
        try { queryClient.setQueryData(['/api/analytics'], (old: any) => ({ ...old, ...JSON.parse(e.data) })); } catch {}
      });
      es.addEventListener('attack-prediction', (e) => {
        try { pending.current.attackPrediction = JSON.parse(e.data); scheduleFlush(); } catch {}
      });
      es.addEventListener('rocket-stats', (e) => {
        try { pending.current.rocketStats = JSON.parse(e.data); scheduleFlush(); } catch {}
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

  return useMemo(() => ({ ...state, connected }), [state, connected]);
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

type PanelId = 'events' | 'alerts' | 'markets' | 'telegram' | 'livefeed' | 'alertmap' | 'analytics' | 'osint' | 'attackpred' | 'rocketstats' | 'aiprediction';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  aiprediction: { icon: Sparkles, label: 'AI Prediction', labelAr: 'توقعات الذكاء الاصطناعي' },

  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: '\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
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
      <div className="panel-drag-handle px-3 border-b flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing select-none h-9">
        <Activity className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/90" style={{fontFamily:'var(--font-display)'}}>OSINT TIMELINE</span>
        <div className="flex-1" />
        {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>
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
    visiblePanels: { telegram: true, events: true, alerts: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: false, attackpred: false, rocketstats: false, aiprediction: true },
    colWidths: { telegram: 16, alerts: 16, livefeed: 16, events: 22, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { telegram: false, events: false, alerts: false, markets: true, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false },
    colWidths: { telegram: 16, alerts: 26, livefeed: 20, events: 22, markets: 30, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { telegram: false, events: true, alerts: true, markets: false, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: true, rocketstats: false, aiprediction: true },
    colWidths: { telegram: 16, alerts: 50, livefeed: 20, events: 25, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28 },
    rowSplit: 55,
  },
  {
    name: 'Mobile',
    visiblePanels: { telegram: true, events: false, alerts: true, markets: false, livefeed: true, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false },
    colWidths: { telegram: 100, alerts: 100, livefeed: 100, events: 100, markets: 100, alertmap: 100, analytics: 100, osint: 100, attackpred: 100, rocketstats: 100, aiprediction: 100 },
    rowSplit: 50,
  },
];

const RGL = WidthProvider(GridLayout);

const DEFAULT_GRID_LAYOUT: GridItemLayout[] = [
  // Row 1 — Hero: Alerts | Map | Telegram
  { i: 'alerts',       x: 0,  y: 0,  w: 4,  h: 8,  minW: 3, minH: 4 },
  { i: 'alertmap',     x: 4,  y: 0,  w: 5,  h: 8,  minW: 3, minH: 4 },
  { i: 'telegram',     x: 9,  y: 0,  w: 3,  h: 8,  minW: 2, minH: 3 },
  // Row 2 — Intel strip: AI | Events | Markets | Netblack
  { i: 'aiprediction', x: 0,  y: 8,  w: 3,  h: 6,  minW: 2, minH: 2 },
  { i: 'events',       x: 3,  y: 8,  w: 3,  h: 6,  minW: 2, minH: 2 },
  { i: 'markets',      x: 6,  y: 8,  w: 3,  h: 6,  minW: 2, minH: 2 },
  // Row 3 — Wide feed
  { i: 'livefeed',     x: 0,  y: 14, w: 12, h: 4,  minW: 2, minH: 2 },
  // Row 4 — Analysis pair
  { i: 'osint',        x: 0,  y: 18, w: 6,  h: 6,  minW: 3, minH: 2 },
  { i: 'analytics',    x: 6,  y: 18, w: 6,  h: 6,  minW: 2, minH: 2 },
  // Row 5 — Data pair
  { i: 'attackpred',   x: 0,  y: 24, w: 12,  h: 5,  minW: 2, minH: 3 },
  // Row 6 — Stats
  { i: 'rocketstats',  x: 0,  y: 29, w: 12, h: 6,  minW: 2, minH: 3 },
];

const PANEL_ACCENTS: Partial<Record<PanelId, string>> = {
  alerts:       'hsl(0 65% 48%)',
  telegram:     'hsl(210 70% 52%)',
  events:       'hsl(36 65% 48%)',
  markets:      'hsl(250 50% 52%)',
  aiprediction: 'hsl(260 50% 52%)',
  analytics:    'hsl(195 55% 42%)',
  osint:        'hsl(230 50% 52%)',
  livefeed:     'hsl(215 55% 48%)',
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
        <span className="text-[10px] text-blue-400 font-mono tabular-nums">{beirutTime}</span>
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

const TickerBar = memo(function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-7 border-b border-border bg-muted/60" />;
  const items = useMemo(() => [...commodities, ...commodities, ...commodities], [commodities]);

  return (
    <div className="h-8 border-b border-border overflow-hidden relative shrink-0 bg-muted/30" data-testid="ticker-bar">
      <div className="absolute inset-y-0 left-0 w-16 z-10 flex items-center gap-1 pl-3 bg-gradient-to-r from-muted/80 to-transparent">
        <span className="text-[11px] font-semibold text-muted-foreground">MKT</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-muted/80 to-transparent" />
      <div className="absolute flex items-center h-full gap-6 animate-ticker-scroll whitespace-nowrap pl-16">
        {items.map((c, i) => (
          <span key={`${c.symbol}-${i}`} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-muted-foreground font-semibold">{c.symbol}</span>
            <span className="text-foreground tabular-nums">{formatPrice(c)}</span>
            <span className={`inline-flex items-center gap-0.5 tabular-nums font-semibold ${c.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
            </span>
            <span className="text-border mx-0.5">{'\u2502'}</span>
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
    <div className="panel-drag-handle h-[32px] px-2.5 flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing select-none">
      <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-muted-foreground/60 shrink-0">{icon}</span>
      <span className="text-[12px] font-extrabold text-foreground/80 leading-none tracking-[.08em] uppercase font-mono">{title}</span>
      {count !== undefined && (
        <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums leading-none font-mono bg-muted/40 px-1.5 py-0.5 rounded-sm">
          {count}
        </span>
      )}
      {extra}
      <div className="flex-1" />
      {live && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[10px] text-emerald-500/60 font-extrabold uppercase tracking-wider font-mono">live</span>
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
          style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', flexShrink: 0 }}
        >
          <Minimize2 style={{ width: 12, height: 12 }} />
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


const MarketTile = memo(function MarketTile({ c, language }: { c: CommodityData; language: 'en' | 'ar' }) {
  const up = c.change >= 0;
  const pctAbs = Math.abs(c.changePercent);
  const isHot = pctAbs >= 1.5;
  const borderColor = up ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)';
  const glowColor = isHot ? (up ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)') : 'transparent';

  return (
    <div
      className="relative overflow-hidden rounded-md border transition-all duration-200 hover:border-opacity-60 group"
      style={{ borderColor, background: `linear-gradient(135deg, ${glowColor}, transparent 70%)` }}
      data-testid={`commodity-${c.symbol}`}
    >
      <div className="px-2.5 py-2 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-black tracking-wide text-foreground/80 font-mono truncate">{c.symbol}</span>
          <div
            className={`flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${up ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}
          >
            <TrendingUp className={`w-2.5 h-2.5 ${up ? '' : 'rotate-180'}`} />
            <span>{up ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1">
          <span className="text-sm font-bold tabular-nums text-foreground/95 font-mono leading-none">
            {formatPrice(c)}
          </span>
          <span className="text-[8px] text-foreground/30 font-mono truncate max-w-[60px] text-right leading-tight">
            {language === 'ar' ? c.nameAr : c.name}
          </span>
        </div>
      </div>
      {isHot && (
        <div
          className="absolute top-0 right-0 w-1 h-full"
          style={{ background: up ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)' }}
        />
      )}
    </div>
  );
});

function MarketSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2 pb-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[8px] uppercase tracking-[0.25em] text-foreground/25 font-bold font-mono shrink-0">{label} ({count})</span>
      <div className="h-px flex-1 bg-border" />
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

  const gainers = commodities.filter(c => c.changePercent > 0).length;
  const losers = commodities.filter(c => c.changePercent < 0).length;
  const topMover = [...commodities].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];

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
      <div className="shrink-0 px-2.5 py-2 border-b border-border flex items-center gap-2 flex-wrap" data-testid="market-summary-bar">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-400/80 font-bold">{gainers}</span>
          <span className="text-foreground/25">{language === 'en' ? 'up' : '\u0635\u0639\u0648\u062F'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-red-400/80 font-bold">{losers}</span>
          <span className="text-foreground/25">{language === 'en' ? 'down' : '\u0647\u0628\u0648\u0637'}</span>
        </div>
        {topMover && (
          <div className="ml-auto flex items-center gap-1 text-[9px] font-mono text-foreground/35">
            <Zap className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-foreground/50 font-bold">{topMover.symbol}</span>
            <span className={topMover.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
              {topMover.change >= 0 ? '+' : ''}{topMover.changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
        <MarketSectionHeader label={language === 'en' ? 'Commodities' : '\u0627\u0644\u0633\u0644\u0639'} count={cmdty.length} />
        <div className="grid grid-cols-2 gap-1.5">
          {cmdty.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
        </div>
        <MarketSectionHeader label={language === 'en' ? 'Major FX' : '\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629'} count={fxMajor.length} />
        <div className="grid grid-cols-2 gap-1.5">
          {fxMajor.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
        </div>
        <MarketSectionHeader label={language === 'en' ? 'Regional FX' : '\u0639\u0645\u0644\u0627\u062A \u0625\u0642\u0644\u064A\u0645\u064A\u0629'} count={fxRegional.length} />
        <div className="grid grid-cols-2 gap-1.5">
          {fxRegional.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
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
  const THREAT_ACCENT: Record<string, string> = { rocket: '#ef4444', missile: '#a855f7', uav: '#f59e0b', hostile_aircraft: '#3b82f6' };
  const THREAT_ICON: Record<string, string> = { rocket: '🚀', missile: '⚡', uav: '🛸', hostile_aircraft: '✈️' };

  const regionGroups = useMemo(() => {
    const groups: Record<string, SirenAlert[]> = {};
    sorted.forEach(s => {
      const region = language === 'ar' ? (s.regionAr || s.region) : s.region;
      if (!groups[region]) groups[region] = [];
      groups[region].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [sorted, language]);

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
        <div className="px-3 py-8 text-center">
          <Shield className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgba(16,185,129,0.4)' }} />
          <p className="text-[12px] font-bold" style={{ color: 'rgba(16,185,129,0.5)' }}>ALL CLEAR</p>
          <p className="text-[10px] text-muted-foreground/30 mt-1">{language === 'en' ? 'No active siren alerts' : 'لا توجد صفارات إنذار نشطة'}</p>
        </div>
      )}

      {sirens.length > 0 && (
        <div className="shrink-0 px-3 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
          {Object.entries(
            sorted.reduce((acc, s) => { acc[s.threatType] = (acc[s.threatType] || 0) + 1; return acc; }, {} as Record<string, number>)
          ).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="text-[13px] leading-none">{THREAT_ICON[type] || '🚀'}</span>
              <span className="text-[12px] font-black ra-font-mono" style={{ color: THREAT_ACCENT[type] || '#ef4444' }}>{count}</span>
              <span className="text-[10px] font-bold uppercase ra-font-mono" style={{ color: `${THREAT_ACCENT[type] || '#ef4444'}88`, letterSpacing: '0.06em' }}>
                {(THREAT_LABELS[type] || THREAT_LABELS.rocket).en}
              </span>
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] ra-font-mono font-bold tracking-[0.15em]" style={{ color: 'rgba(239,68,68,0.3)' }}>OREF</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 p-2" style={{ scrollbarWidth: 'none' }}>
        {regionGroups.map(([region, regionSirens]) => (
          <div key={region} className="mb-2">
            <div className="flex items-center gap-2 px-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] ra-font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{region}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[10px] font-black ra-font-mono" style={{ color: 'rgba(239,68,68,0.5)' }}>{regionSirens.length}</span>
            </div>
            <div className="space-y-[3px]">
              {regionSirens.map((s) => {
                const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
                const accent = THREAT_ACCENT[s.threatType] || '#ef4444';
                const icon = THREAT_ICON[s.threatType] || '🚀';
                const elapsed = Math.floor((Date.now() - new Date(s.timestamp).getTime()) / 1000);
                const remaining = s.countdown > 0 ? Math.max(0, s.countdown - elapsed) : 0;
                const isCritical = remaining > 0 && remaining <= 30;
                return (
                  <div
                    key={s.id}
                    className="flex items-center rounded-sm overflow-hidden hover-elevate"
                    style={{
                      background: isCritical ? `${accent}0a` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isCritical ? `${accent}30` : `${accent}18`}`,
                    }}
                    data-testid={`siren-panel-${s.id}`}
                  >
                    <div className="self-stretch shrink-0" style={{ width: '3px', background: accent }} />
                    <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2">
                      <span className="text-[13px] leading-none shrink-0">{icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-extrabold truncate leading-tight" style={{ color: `${accent}dd` }}>
                          {language === 'ar' ? s.locationAr : s.location}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 truncate leading-tight mt-0.5 ra-font-mono">
                          {timeAgo(s.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold uppercase ra-font-mono px-1.5 py-0.5 rounded-sm leading-none" style={{ color: `${accent}bb`, background: `${accent}15`, border: `1px solid ${accent}25`, letterSpacing: '0.06em' }}>
                          {language === 'ar' ? threat.ar : threat.en}
                        </span>
                        {remaining > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm ra-font-mono" style={{
                            background: isCritical ? `${accent}20` : `${accent}10`,
                            border: `1px solid ${isCritical ? `${accent}40` : `${accent}20`}`,
                          }}>
                            <Timer className="w-[10px] h-[10px]" style={{ color: `${accent}99` }} />
                            <span className="text-[11px] font-black tabular-nums leading-none" style={{ color: isCritical ? accent : `${accent}cc` }}>
                              {remaining}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border">
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
      <div className="px-2 py-1.5 border-b border-border" style={{background:'hsl(var(--muted))'}}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-none" style={{background:'hsl(var(--background))', border:'1px solid hsl(var(--border))'}}>
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
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border">
        {filtered.map((e) => {
          const sev = SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.low;
          const icon = EVENT_TYPE_ICONS[e.type] || '📍';
          return (
            <div
              key={e.id}
              className="px-3 py-3 hover-elevate border-l-2"
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

function RedAlertCountdown({ alert, mobile }: { alert: RedAlert; mobile?: boolean }) {
  const remaining = useAlertRemaining(alert);
  const isImmediate = alert.countdown === 0;
  const tier = getAlertUrgencyTier(remaining, alert.countdown);

  const tierBg: Record<string, string> = {
    critical: '#dc2626',
    urgent:   '#b91c1c',
    warning:  '#991b1b',
    standard: '#3f0a0a',
    expired:  'transparent',
  };
  const tierBorder: Record<string, string> = {
    critical: 'rgba(248,113,113,0.5)',
    urgent:   'rgba(239,68,68,0.4)',
    warning:  'rgba(220,38,38,0.35)',
    standard: 'rgba(239,68,68,0.18)',
    expired:  'rgba(239,68,68,0.08)',
  };
  const tierGlow: Record<string, string> = {
    critical: '0 0 22px rgba(220,38,38,0.55), 0 2px 10px rgba(0,0,0,0.5)',
    urgent:   '0 0 12px rgba(185,28,28,0.35), 0 2px 8px rgba(0,0,0,0.4)',
    warning:  '0 1px 6px rgba(0,0,0,0.35)',
    standard: '0 1px 4px rgba(0,0,0,0.3)',
    expired:  'none',
  };
  const tierText: Record<string, string> = {
    critical: '#fff',
    urgent:   '#fecaca',
    warning:  '#fca5a5',
    standard: 'rgba(252,165,165,0.65)',
    expired:  'rgba(239,68,68,0.22)',
  };

  const isCritical = tier === 'critical';
  const pct = isImmediate ? 100 : alert.countdown > 0 ? Math.round(Math.max(0, (remaining / alert.countdown)) * 100) : 0;

  if (mobile) {
    const numSize = isCritical ? 26 : tier === 'expired' ? 17 : 22;
    return (
      <div
        className={isCritical ? 'eas-countdown-pulse' : ''}
        style={{
          minWidth: 64, height: 64, borderRadius: 3, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, padding: '6px 4px',
          background: tier === 'expired' ? 'rgba(255,255,255,0.025)' : tierBg[tier],
          color: tierText[tier],
          border: `1.5px solid ${tierBorder[tier]}`,
          boxShadow: tierGlow[tier],
        }}
        data-testid={`red-alert-countdown-${alert.id}`}
      >
        <div style={{ fontSize: numSize, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
        </div>
        <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800, opacity: isCritical ? 0.95 : 0.55 }}>
          {isImmediate ? 'IMM' : remaining > 0 ? 'SEC' : 'EXP'}
        </div>
        {!isImmediate && tier !== 'expired' && (
          <div style={{ width: '80%', height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginTop: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'rgba(255,255,255,0.7)', transition: 'width 1s linear' }} />
          </div>
        )}
      </div>
    );
  }

  const numSize = isCritical ? 24 : 21;
  return (
    <div
      className={isCritical ? 'eas-countdown-pulse' : ''}
      style={{
        minWidth: 56, borderRadius: 3, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
        background: tierBg[tier],
        color: tierText[tier],
        border: `1.5px solid ${tierBorder[tier]}`,
        boxShadow: isCritical ? '0 0 12px rgba(220,38,38,0.45)' : 'none',
      }}
      data-testid={`red-alert-countdown-${alert.id}`}
    >
      <div style={{ fontSize: numSize, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
      </div>
      <div style={{ fontSize: 9, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, opacity: 0.75 }}>
        {isImmediate ? 'IMM' : remaining > 0 ? 'SEC' : 'EXP'}
      </div>
    </div>
  );
}

const LIVE_CHANNELS = [
  { id: 'aje',     label: 'AJ ENG',   labelAr: 'الجزيرة EN', channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', videoId: 'gCNeDWCI0vo' },
  { id: 'aja',     label: 'AJ AR',    labelAr: 'الجزيرة ع',  channelId: 'UCBvxne3r4hL7GKxufPsOmRg', videoId: 'bNyUyrR0PHo' },
  { id: 'sky',     label: 'SKY AR',   labelAr: 'سكاي عربية', channelId: 'UCdsMKkuVRqTmYKvIiMbZJmA', videoId: 'U--OjmpjF5o' },
  { id: 'france',  label: 'F24 ENG',  labelAr: 'فرانس 24',   channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', videoId: '' },
  { id: 'jadeed',  label: 'AL JADEED', labelAr: 'الجديد',     channelId: 'UCBKJsRj3mSsg_eDHrsYOHMg', videoId: '' },
  { id: 'araby',   label: 'AL ARABY', labelAr: 'العربي',      channelId: 'UCbqBj1gZsJJjU2jCVasqL-g', videoId: 'e2RgSa1Wt5o' },
] as const;

const LiveFeedPanel = memo(function LiveFeedPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [activeChannel, setActiveChannel] = useState<typeof LIVE_CHANNELS[number]['id']>('aja');
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
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
              <span className="text-[9px] text-red-500 font-bold tracking-wider font-mono">LIVE</span>
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
      <div className="px-2 py-1 border-b border-border bg-muted/40 flex items-center gap-1 shrink-0 overflow-x-auto">
        {LIVE_CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => handleSelectChannel(ch.id)}
            data-testid={`button-channel-${ch.id}`}
            className={`flex-1 py-1 rounded text-[9px] font-mono font-bold transition-colors border whitespace-nowrap min-w-0 ${
              activeChannel === ch.id && !customVideoId
                ? 'bg-red-500/10 text-red-500 border-red-500/25'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted'
            }`}
          >
            {language === 'ar' ? ch.labelAr : ch.label}
          </button>
        ))}
      </div>
      {showUrlInput && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetUrl()}
            placeholder="Paste YouTube live URL..."
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:border-primary/50"
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
      <div className="flex-1 min-h-0 bg-muted/20 relative">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
            <Video className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-[11px] text-muted-foreground font-mono mb-3">{language === 'en' ? 'Stream unavailable' : '\u0627\u0644\u0628\u062B \u063A\u064A\u0631 \u0645\u062A\u0627\u062D'}</p>
            <button
              onClick={() => { setIframeError(false); handleSelectChannel(activeChannel); }}
              className="px-3 py-1 rounded text-[9px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              data-testid="button-retry-stream"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const THREAT_SHORT_CODE: Record<string, string> = {
  rockets: 'RKT', missiles: 'MSL', hostile_aircraft_intrusion: 'ACF', uav_intrusion: 'UAV',
};

const THREAT_ICONS: Record<string, string> = {
  rockets: '🚀', missiles: '⚡', hostile_aircraft_intrusion: '✈️', uav_intrusion: '🛸',
};

const RedAlertPanel = memo(function RedAlertPanel({ alerts, sirens = [], language, onClose, onMaximize, isMaximized, onShowHistory }: { alerts: RedAlert[]; sirens?: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onShowHistory?: () => void }) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [threatFilter, setThreatFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const alertScrollRef = useRef<HTMLDivElement>(null);
  const prevAlertCountRef = useRef(alerts.length);
  const [_, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current) {
      const viewport = alertScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (viewport) viewport.scrollTop = 0;
    }
    prevAlertCountRef.current = alerts.length;
  }, [alerts.length]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { const c = a.country || 'Unknown'; counts[c] = (counts[c] || 0) + 1; });
    return counts;
  }, [alerts]);

  const countryOrder = ['Israel', 'Lebanon', 'Iran', 'Syria', 'Iraq', 'Saudi Arabia', 'Yemen', 'UAE', 'Jordan', 'Kuwait', 'Bahrain', 'Qatar'];

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (threatFilter !== 'all') filtered = filtered.filter(a => a.threatType === threatFilter);
    if (countryFilter !== 'ALL') filtered = filtered.filter(a => a.country === countryFilter);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a => a.city.toLowerCase().includes(q) || a.cityHe.includes(q) || a.cityAr.includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
  }, [alerts, searchQuery, countryFilter, threatFilter]);

  const triageSorted = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const nowMs = Date.now();
      const remA = a.countdown === 0 ? -1 : Math.max(0, a.countdown - Math.floor((nowMs - new Date(a.timestamp).getTime()) / 1000));
      const remB = b.countdown === 0 ? -1 : Math.max(0, b.countdown - Math.floor((nowMs - new Date(b.timestamp).getTime()) / 1000));
      if (remA === -1 && remB !== -1) return -1;
      if (remB === -1 && remA !== -1) return 1;
      if (remA === -1 && remB === -1) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      const activeA = remA > 0 ? 1 : 0;
      const activeB = remB > 0 ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return remA - remB;
    });
  }, [filteredAlerts, _]);

  const liveCount = alerts.filter(a => a.source === 'live').length;
  const activeCount = useMemo(() => alerts.filter(a => {
    const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
    return a.countdown === 0 || elapsed < a.countdown;
  }).length, [alerts, _]);
  const hasActiveAlerts = alerts.length > 0;

  const FLAG_MAP: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Syria: '🇸🇾', Iraq: '🇮🇶', 'Saudi Arabia': '🇸🇦', Yemen: '🇾🇪', UAE: '🇦🇪', Jordan: '🇯🇴', Kuwait: '🇰🇼', Bahrain: '🇧🇭', Qatar: '🇶🇦' };
  const SHORT_NAMES: Record<string, string> = { 'Saudi Arabia': 'KSA', 'United Arab Emirates': 'UAE' };
  const ACCENT: Record<string, string> = { Israel: '#3b82f6', Lebanon: '#10b981', Iran: '#a855f7', Syria: '#eab308', Iraq: '#f97316', 'Saudi Arabia': '#22c55e', Yemen: '#f43f5e', UAE: '#0ea5e9', Jordan: '#f59e0b', Kuwait: '#14b8a6', Bahrain: '#ec4899', Qatar: '#6366f1' };

  const threatCounts = useMemo(() => {
    const c: Record<string, number> = {};
    alerts.forEach(a => { c[a.threatType] = (c[a.threatType] || 0) + 1; });
    return c;
  }, [alerts]);

  return (
    <div className="h-full flex flex-col min-h-0 ra-panel-bg" data-testid="red-alert-panel">

      {/* ── HEADER — compact mission-control bar ── */}
      <div
        className={`shrink-0 select-none ${isMobile ? 'px-4 py-2.5' : 'panel-drag-handle cursor-grab active:cursor-grabbing'}`}
        style={{
          borderBottom: `1px solid ${hasActiveAlerts ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
          background: hasActiveAlerts ? 'linear-gradient(180deg, rgba(127,29,29,0.18) 0%, transparent 100%)' : 'hsl(var(--muted))',
        }}
      >
        <div className={`flex items-center gap-2 ${isMobile ? '' : 'px-3 py-2'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative shrink-0" style={{ width: 10, height: 10 }}>
              <div className={`w-2.5 h-2.5 rounded-full ${hasActiveAlerts ? 'bg-red-500 eas-flash' : 'bg-red-900/40'}`} />
              {hasActiveAlerts && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-30" />}
            </div>
            <span className={`${isMobile ? 'text-[17px]' : 'text-[15px]'} font-black uppercase tracking-[0.15em] ra-font-mono ${hasActiveAlerts ? 'text-red-400' : 'text-red-500/25'}`}>
              {language === 'ar' ? 'الإنذارات' : 'ALERTS'}
            </span>
            {hasActiveAlerts && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black text-white ra-tabular ra-font-mono rounded-sm leading-none ${isMobile ? 'text-[18px] px-2.5 py-1' : 'text-[16px] px-2 py-0.5'}`}
                  style={{ background: '#dc2626', boxShadow: '0 0 10px rgba(220,38,38,0.4)' }}
                  data-testid="text-alert-count"
                >{activeCount}</span>
                {liveCount > 0 && (
                  <span className={`${isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1.5 py-px'} font-black ra-font-mono uppercase tracking-wider rounded-sm`} style={{ background: 'rgba(21,128,61,0.3)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', height: 18, display: 'inline-flex', alignItems: 'center' }}>LIVE</span>
                )}
              </div>
            )}
            {hasActiveAlerts && !isMobile && (
              <div className="flex items-center gap-1.5 ml-auto overflow-hidden">
                {Object.entries(threatCounts).slice(0, 4).map(([type, count]) => (
                  <span key={type} className="text-[10px] ra-font-mono font-bold text-white/25 shrink-0" style={{ height: 18, display: 'inline-flex', alignItems: 'center' }}>
                    {THREAT_ICONS[type] || '🚀'}{count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMobile && hasActiveAlerts && (
              <button onClick={() => setShowSearch(p => !p)}
                className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all active:scale-95 ${showSearch ? 'text-red-300' : 'text-white/30'}`}
                style={{ background: showSearch ? 'rgba(220,38,38,0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)' }}
                aria-label="Search"
              ><Search className="w-3.5 h-3.5" /></button>
            )}
            {onShowHistory && (
              <button onClick={onShowHistory} className={`${isMobile ? 'w-8 h-8' : 'w-6 h-6'} rounded-sm flex items-center justify-center text-foreground/30 transition-all active:scale-95`} style={{ border: '1px solid rgba(255,255,255,0.06)' }} title="Alert History" data-testid="button-alert-history">
                <History className={`${isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
              </button>
            )}
            {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
            {onClose && <PanelMinimizeButton onMinimize={onClose} />}
          </div>
        </div>
      </div>

      {/* ── FILTERS — segmented tabs ── */}
      {hasActiveAlerts && isMobile ? (
        <div className="shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
          {showSearch && (
            <div className="relative px-3 pt-2 pb-1.5">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن مدينة...' : 'Search city, region...'}
                className="ra-search-input" autoFocus data-testid="input-red-alert-search"
                style={{ fontSize: 14, padding: '8px 10px 8px 34px', borderRadius: 6 }} />
              <Search className="absolute w-3.5 h-3.5 text-red-500/30" style={{ left: 20, top: '50%', transform: 'translateY(-50%)' }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute w-5 h-5 flex items-center justify-center rounded text-white/30" style={{ top: '50%', right: 16, transform: 'translateY(-50%)' }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex overflow-x-auto px-3 py-1.5 gap-px" style={{ scrollbarWidth: 'none' }}>
            {([['all','ALL'],['rockets','RKT'],['missiles','MSL'],['uav_intrusion','UAV'],['hostile_aircraft_intrusion','ACF']] as [string,string][]).map(([key, label]) => {
              const isActive = threatFilter === key;
              return (
                <button key={key} onClick={() => setThreatFilter(key)}
                  className="shrink-0 font-bold ra-font-mono transition-all active:scale-95"
                  style={{ fontSize: 10, padding: '4px 10px', letterSpacing: '0.1em',
                    background: isActive ? 'rgba(220,38,38,0.25)' : 'transparent',
                    borderBottom: isActive ? '2px solid #ef4444' : '2px solid transparent',
                    color: isActive ? '#fca5a5' : 'rgba(255,255,255,0.25)', }}
                  data-testid={`button-threat-filter-${key}`}
                >{key !== 'all' ? (THREAT_ICONS[key] || '') + ' ' : ''}{label}</button>
              );
            })}
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-2" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setCountryFilter('ALL')}
              className="shrink-0 ra-font-mono font-bold text-[10px] px-2 py-1 rounded-sm transition-all active:scale-95"
              style={{ background: countryFilter === 'ALL' ? 'rgba(220,38,38,0.18)' : 'transparent',
                border: `1px solid ${countryFilter === 'ALL' ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.06)'}`,
                color: countryFilter === 'ALL' ? '#fca5a5' : 'rgba(255,255,255,0.25)', }}
              data-testid="button-country-filter-all"
            >ALL {alerts.length}</button>
            {countryOrder.map(c => {
              const count = countryCounts[c] || 0;
              if (!count) return null;
              const isSelected = countryFilter === c;
              const color = ACCENT[c] || '#ef4444';
              return (
                <button key={c} onClick={() => setCountryFilter(isSelected ? 'ALL' : c)}
                  className="shrink-0 font-bold text-[10px] px-2 py-1 rounded-sm transition-all active:scale-95"
                  style={{ background: isSelected ? color + '22' : 'transparent',
                    border: `1px solid ${isSelected ? color + '88' : color + '25'}`,
                    color: isSelected ? '#fff' : color + 'aa', }}
                  data-testid={`button-country-filter-${FLAG_MAP[c] || c}`}
                >{FLAG_MAP[c]} {count}</button>
              );
            })}
          </div>
        </div>
      ) : hasActiveAlerts ? (
        <div className="shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.12)' }}>
          <div className="flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {([['all','ALL'],['rockets','RKT'],['missiles','MSL'],['uav_intrusion','UAV'],['hostile_aircraft_intrusion','ACF']] as [string,string][]).map(([key, label]) => (
              <button key={key} onClick={() => setThreatFilter(key)}
                className="flex-1 ra-font-mono font-bold transition-colors"
                style={{ fontSize: 10, padding: '6px 0', letterSpacing: '0.12em',
                  borderBottom: threatFilter === key ? '2px solid #ef4444' : '2px solid transparent',
                  color: threatFilter === key ? '#fca5a5' : 'rgba(255,255,255,0.22)',
                  background: threatFilter === key ? 'rgba(220,38,38,0.08)' : 'transparent', }}
                data-testid={`button-threat-filter-${key}`}
              >{label}</button>
            ))}
            <button onClick={() => setShowSearch(p => !p)}
              className={`shrink-0 w-7 h-7 rounded-sm flex items-center justify-center transition-all ${showSearch ? 'text-red-300' : 'text-white/20'}`}
              style={{ background: showSearch ? 'rgba(220,38,38,0.12)' : 'transparent', marginRight: 4 }}
              aria-label="Search" data-testid="button-search-toggle"
            ><Search className="w-3 h-3" /></button>
          </div>
          {showSearch && (
            <div className="px-2.5 py-1.5">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
                  className="ra-search-input" data-testid="input-red-alert-search" autoFocus />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-red-500/25" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute w-4 h-4 flex items-center justify-center rounded text-white/30" style={{ top: '50%', right: 6, transform: 'translateY(-50%)' }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-0.5 overflow-x-auto px-2 py-1" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setCountryFilter('ALL')}
              className="shrink-0 ra-font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm transition-all"
              style={{ background: countryFilter === 'ALL' ? 'rgba(220,38,38,0.15)' : 'transparent',
                color: countryFilter === 'ALL' ? '#fca5a5' : 'rgba(255,255,255,0.25)',
                border: `1px solid ${countryFilter === 'ALL' ? 'rgba(239,68,68,0.3)' : 'transparent'}`, height: 18, display: 'inline-flex', alignItems: 'center' }}
              data-testid="button-country-filter-all"
            >ALL</button>
            {countryOrder.map(c => {
              const count = countryCounts[c] || 0;
              if (!count) return null;
              const isSelected = countryFilter === c;
              const color = ACCENT[c] || '#ef4444';
              return (
                <button key={c} onClick={() => setCountryFilter(isSelected ? 'ALL' : c)}
                  className="shrink-0 font-bold text-[10px] px-2 py-0.5 rounded-sm transition-all"
                  style={{ background: isSelected ? color + '18' : 'transparent',
                    color: isSelected ? '#fff' : color + '88',
                    border: `1px solid ${isSelected ? color + '55' : 'transparent'}`, height: 18, display: 'inline-flex', alignItems: 'center' }}
                  data-testid={`button-country-filter-${FLAG_MAP[c] || c}`}
                >{FLAG_MAP[c]}{count}</button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── EMPTY STATE ── */}
      {!hasActiveAlerts && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className={`${isMobile ? 'w-16 h-16 mb-4' : 'w-10 h-10 mb-2.5'} rounded-md flex items-center justify-center`} style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Shield className={`${isMobile ? 'w-7 h-7' : 'w-5 h-5'} text-green-600/60`} />
          </div>
          <p className={`${isMobile ? 'text-[20px]' : 'text-[15px]'} font-black text-green-500/70 mb-1 tracking-[0.15em] ra-font-mono uppercase`}>
            {language === 'ar' ? 'لا تنبيهات' : 'ALL CLEAR'}
          </p>
          <p className={`${isMobile ? 'text-[12px]' : 'text-[11px]'} text-white/20 tracking-wider uppercase ra-font-mono`}>
            {language === 'ar' ? 'لا تهديدات نشطة' : 'No active threats'}
          </p>
        </div>
      )}

      {/* ── TRIAGE LIST — data-strip layout ── */}
      {hasActiveAlerts && (
        <ScrollArea ref={alertScrollRef} className="flex-1 min-h-0">
          <div className={isMobile ? 'px-2 pt-1.5 pb-1 flex flex-col gap-1.5' : ''}>
            {triageSorted.map(alert => {
              const nowMs = Date.now();
              const elapsed = Math.floor((nowMs - new Date(alert.timestamp).getTime()) / 1000);
              const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
              const isImmediate = alert.countdown === 0;
              const isExpired = !isImmediate && remaining <= 0;
              const isCritical = isImmediate || (remaining > 0 && remaining <= 15);
              const isLive = alert.source === 'live';
              const ageMs = nowMs - new Date(alert.timestamp).getTime();
              const isIncoming = ageMs < 9000 && !isExpired;
              const threatIcon = THREAT_ICONS[alert.threatType] || '🚀';
              const threatCode = THREAT_SHORT_CODE[alert.threatType] || 'RKT';

              if (isMobile) {
                return (
                  <div key={alert.id} className="alert-slide-in relative rounded-md overflow-hidden"
                    style={{
                      background: isCritical && !isExpired ? 'rgba(127,29,29,0.35)' : isExpired ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                      border: isCritical && !isExpired ? '1px solid rgba(239,68,68,0.30)' : isExpired ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(255,255,255,0.05)',
                      opacity: isExpired ? 0.35 : 1,
                    }}
                    data-testid={`red-alert-${alert.id}`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
                      background: isCritical && !isExpired ? '#ef4444' : !isExpired && remaining > 0 ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.04)',
                    }} />
                    <div className="flex items-center gap-2.5 py-2.5 pr-3" style={{ paddingLeft: 12 }}>
                      <RedAlertCountdown alert={alert} mobile />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isIncoming && (
                            <span className="eas-flash shrink-0 font-black text-[8px] px-1.5 py-px rounded-sm ra-font-mono" style={{ background: '#b91c1c', color: '#fecaca', letterSpacing: '0.12em' }}>INCOMING</span>
                          )}
                          <span className={`font-extrabold truncate leading-tight ${isExpired ? 'text-white/20' : isCritical ? 'text-[15px] text-white' : 'text-[14px] text-white/85'}`}>
                            {language === 'ar' ? alert.cityAr : alert.city}
                          </span>
                          <span className="text-[12px] shrink-0 opacity-50">{FLAG_MAP[alert.country]}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] ra-font-mono font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
                            {threatIcon} {threatCode}
                          </span>
                          <span className="text-[9px] ra-font-mono truncate" style={{ color: 'rgba(255,255,255,0.15)' }}>
                            {language === 'ar' ? alert.regionAr : alert.region}
                          </span>
                          <span className="ml-auto flex items-center gap-1 shrink-0">
                            {isLive && <span className="text-[7px] font-bold px-1 py-px rounded-sm ra-font-mono" style={{ background: 'rgba(21,128,61,0.2)', color: '#4ade80' }} data-testid={`source-badge-${alert.id}`}>LIVE</span>}
                            {alert.sourceChannel && (
                              <a href={alert.sourceUrl || `https://t.me/s/${alert.sourceChannel.replace(/^@/, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-[8px] font-bold px-1 py-px rounded-sm"
                                style={{ background: '#0088cc12', color: '#29b6f6', textDecoration: 'none' }}
                                onClick={(e) => e.stopPropagation()} data-testid={`tg-source-${alert.id}`}
                              >TG</a>
                            )}
                            <span className="text-[8px] ra-font-mono text-white/15">{timeAgo(alert.timestamp)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={alert.id} className="alert-slide-in flex items-center gap-2 group"
                  style={{
                    padding: '5px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: isCritical && !isExpired ? 'rgba(127,29,29,0.15)' : 'transparent',
                    opacity: isExpired ? 0.30 : 1,
                    transition: 'background 0.15s',
                  }}
                  data-testid={`red-alert-${alert.id}`}
                >
                  <div className="shrink-0 self-stretch" style={{ width: 3, background: isCritical && !isExpired ? '#ef4444' : !isExpired && remaining > 0 ? 'rgba(249,115,22,0.4)' : 'transparent', borderRadius: '0 1px 1px 0' }} />
                  <RedAlertCountdown alert={alert} />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-px">
                        {isIncoming && <span className="eas-flash text-[9px] font-black ra-font-mono px-1.5 py-px rounded-sm shrink-0" style={{ background: '#dc2626', color: '#fecaca', letterSpacing: '0.1em' }}>IN</span>}
                        <span className={`font-bold truncate text-[14px] leading-tight ${isExpired ? 'text-white/20' : 'text-white/90'}`}>
                          {language === 'ar' ? alert.cityAr : alert.city}
                        </span>
                        <span className="text-[12px] shrink-0 opacity-35">{FLAG_MAP[alert.country]}</span>
                      </div>
                      <div className="flex items-center gap-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        <span>{language === 'ar' ? alert.regionAr : alert.region}</span>
                      </div>
                    </div>
                    <span className="text-[10px] ra-font-mono font-bold shrink-0 px-1.5 rounded-sm" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height: 18, display: 'inline-flex', alignItems: 'center' }}>
                      {threatIcon} {threatCode}
                    </span>
                    {isLive && <span className="text-[9px] font-bold px-1.5 rounded-sm ra-font-mono shrink-0" style={{ background: 'rgba(21,128,61,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)', height: 18, display: 'inline-flex', alignItems: 'center' }} data-testid={`source-badge-${alert.id}`}>LIVE</span>}
                    {alert.sourceChannel && (
                      <a href={alert.sourceUrl || `https://t.me/s/${alert.sourceChannel.replace(/^@/, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[9px] font-bold px-1.5 rounded-sm shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: '#0088cc12', color: '#29b6f6', textDecoration: 'none', border: '1px solid rgba(59,130,246,0.15)', height: 18, display: 'inline-flex' }}
                        onClick={(e) => e.stopPropagation()} data-testid={`tg-source-${alert.id}`}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.636l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.923z" /></svg>
                        TG
                      </a>
                    )}
                    <span className="text-[9px] ra-font-mono text-white/15 shrink-0 tabular-nums">{timeAgo(alert.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* ── SIRENS FOOTER ── */}
      {sirens.length > 0 && (() => {
        const THREAT_ACCENT: Record<string, string> = { rocket: '#ef4444', missile: '#a855f7', uav: '#f59e0b', hostile_aircraft: '#3b82f6' };
        const THREAT_ICON: Record<string, string> = { rocket: '🚀', missile: '⚡', uav: '🛸', hostile_aircraft: '✈️' };
        const regionMap: Record<string, number> = {};
        sirens.forEach(s => {
          const r = language === 'ar' ? (s.regionAr || s.region) : s.region;
          regionMap[r] = (regionMap[r] || 0) + 1;
        });
        const regionCount = Object.keys(regionMap).length;
        return (
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(239,68,68,0.35)', background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(0,0,0,0.4) 100%)' }}>
          <div className={`${isMobile ? 'px-4 py-2' : 'px-3 py-1.5'} flex items-center gap-2`}>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-red-500 eas-flash`} />
                <div className={`absolute inset-0 ${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-red-500 animate-ping opacity-40`} />
              </div>
              <span className={`${isMobile ? 'text-[13px]' : 'text-[12px]'} font-black uppercase tracking-[0.15em] text-red-400/80 ra-font-mono`}>
                {language === 'ar' ? 'صفارات' : 'SIRENS'}
              </span>
            </div>
            <div className={`${isMobile ? 'text-[14px] min-w-[28px]' : 'text-[13px] min-w-[24px]'} font-black text-white text-center ra-tabular ra-font-mono leading-none py-0.5 rounded-sm`} style={{ background: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.35)' }}>{sirens.length}</div>
            <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-red-400/40 ra-font-mono font-bold`}>{regionCount} {language === 'ar' ? 'مناطق' : 'regions'}</span>
            <div className="flex-1" />
            <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-red-400/30 ra-font-mono font-bold tracking-[0.2em] uppercase`}>OREF LIVE</span>
          </div>
          <div className={isMobile ? 'max-h-[130px]' : 'max-h-[115px]'} style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1.5 px-3 pb-2' : 'gap-1 px-2 pb-1.5'}`}>
            {sirens.map(s => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              const accent = THREAT_ACCENT[s.threatType] || '#ef4444';
              const icon = THREAT_ICON[s.threatType] || '🚀';
              const elapsed = Math.floor((Date.now() - new Date(s.timestamp).getTime()) / 1000);
              const remaining = s.countdown > 0 ? Math.max(0, s.countdown - elapsed) : 0;
              const isCritical = remaining > 0 && remaining <= 30;
              return (
                <div key={s.id} className="flex items-center rounded-sm overflow-hidden" data-testid={`siren-panel-${s.id}`}
                  style={{
                    background: isCritical ? `${accent}0c` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCritical ? `${accent}35` : `${accent}22`}`,
                    height: isMobile ? '32px' : '28px',
                  }}>
                  <div className="self-stretch shrink-0" style={{ width: '3px', background: accent }} />
                  <span className={`${isMobile ? 'text-[12px]' : 'text-[11px]'} leading-none shrink-0 pl-1`}>{icon}</span>
                  <span className={`${isMobile ? 'text-[13px]' : 'text-[12px]'} font-extrabold truncate leading-none px-1.5`} style={{ color: `${accent}dd`, maxWidth: isMobile ? '130px' : '120px' }}>
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} font-bold uppercase ra-font-mono shrink-0 leading-none px-1 py-px rounded-sm`} style={{ color: `${accent}99`, background: `${accent}10`, letterSpacing: '0.06em' }}>
                    {language === 'ar' ? threat.ar : threat.en}
                  </span>
                  {remaining > 0 && (
                    <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} font-black ra-font-mono tabular-nums shrink-0 leading-none px-1`} style={{ color: isCritical ? accent : `${accent}88` }}>
                      {remaining}s
                    </span>
                  )}
                  <div className="w-1" />
                </div>
              );
            })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── FOOTER ── */}
      {!isMobile && (
        <div className="shrink-0 px-3.5 py-1.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
          <span className="text-[9px] ra-font-mono tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.20)' }}>OREF HOME FRONT CMD</span>
          <span className="text-[9px] ra-font-mono tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.20)' }}>{alerts.length} TOTAL</span>
        </div>
      )}
    </div>
  );
});

const DEFAULT_CHANNELS = ['@bintjbeilnews', '@wfwitness', '@ClashReport', '@OSINTdefender', '@IntelCrab', '@GeoConfirmed', '@CIG_telegram', '@sentaborim', '@AviationIntel', '@rnintel', '@lebaborim', '@almanarnews', '@AlAhedNews', '@lebanonnews2', '@NewsInIsrael', '@alaborim', '@AbuAliEnglish', '@Yemen_Press', '@clashreport', '@inaborim', '@MEConflictNews', '@ELINTNews', '@BNONewsRoom', '@Middle_East_Spectator', '@interbellumnews', '@QudsN', '@GazaNewsPlus', '@SouthFrontEng', '@MilitaryOSINT', '@LBCINews', '@NaharnetEnglish', '@ISWResearch', '@conflictnews', '@IranIntl_En', '@warmonitor3', '@WarSpottersINT', '@AjaNews', '@thewarreporter', '@channelnabatieh'];

const TelegramPanel = memo(function TelegramPanel({
  messages,
  language,
  onClose,
  onMaximize,
  isMaximized,
  soundEnabled = false,
  silentMode = false,
  volume = 70,
}: {
  messages: TelegramMessage[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  soundEnabled?: boolean;
  silentMode?: boolean;
  volume?: number;
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
  const [telegramTab, setTelegramTab] = useState<'feed' | 'stats' | 'channels'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

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
  }, [filteredMessages, soundEnabled, silentMode, volume]);

  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const displayMessages = useMemo(() => {
    let msgs = !channelFilter ? filteredMessages : filteredMessages.filter(m => m.channel === channelFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter(m => m.text.toLowerCase().includes(q) || (m.textAr ?? '').toLowerCase().includes(q));
    }
    return msgs;
  }, [filteredMessages, channelFilter, searchQuery]);

  // ── Stats derived data ──────────────────────────────────────────────────────
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMessages.forEach(m => { counts[m.channel] = (counts[m.channel] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredMessages]);

  const hourlyActivity = useMemo(() => {
    const buckets: Record<number, number> = {};
    const now = Date.now();
    for (let h = 0; h < 12; h++) buckets[h] = 0;
    filteredMessages.forEach(m => {
      const age = (now - new Date(m.timestamp).getTime()) / 3600000;
      const bucket = Math.floor(age);
      if (bucket < 12) buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    return Array.from({ length: 12 }, (_, i) => ({ hour: i, count: buckets[i] || 0 })).reverse();
  }, [filteredMessages]);

  const topKeywords = useMemo(() => {
    const freq: Record<string, number> = {};
    const stop = new Set(['the','a','an','in','on','to','of','and','is','are','was','were','for','with','at','by','from','that','this','it','as','be','been','have','has','had','not','but','or','they','we','you','he','she','his','her','its','our','their']);
    filteredMessages.forEach(m => {
      m.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
        if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [filteredMessages]);

  const recentActivity = useMemo(() => {
    const cutoff = Date.now() - 3600000;
    return filteredMessages.filter(m => new Date(m.timestamp).getTime() > cutoff).length;
  }, [filteredMessages]);

  const breakingCount = useMemo(() => filteredMessages.filter(m => /BREAKING|URGENT|FLASH|عاجل/i.test(m.text)).length, [filteredMessages]);

  // ── Priority helper ─────────────────────────────────────────────────────────
  const getPriority = (text: string): { label: string; color: string } | null => {
    if (/BREAKING|URGENT|FLASH|عاجل/i.test(text)) return { label: 'BREAKING', color: '#ef4444' };
    if (/\bALERT\b|WARNING|ATTACK|STRIKE|MISSILE|صاروخ|هجوم/i.test(text)) return { label: 'ALERT', color: '#f97316' };
    if (/DEVELOPING|UPDATE|تطور/i.test(text)) return { label: 'UPDATE', color: '#facc15' };
    return null;
  };

  const maxHourly = Math.max(...hourlyActivity.map(h => h.count), 1);
  const maxChannel = channelCounts.length > 0 ? channelCounts[0][1] : 1;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="telegram-panel">
      <PanelHeader
        title={language === 'en' ? 'Telegram OSINT' : 'تلغرام OSINT'}
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
              <Settings className="w-3 h-3 text-sky-400/50 hover:text-sky-400/80 transition-colors" />
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-border/40 shrink-0" style={{ background: 'hsl(var(--muted))' }}>
        {(['feed', 'stats', 'channels'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTelegramTab(tab)}
            className="flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
            style={{
              color: telegramTab === tab ? 'hsl(199 89% 70%)' : 'hsl(var(--muted-foreground) / 0.55)',
              borderBottom: telegramTab === tab ? '2px solid hsl(199 89% 60%)' : '2px solid transparent',
              background: telegramTab === tab ? 'hsl(199 89% 50% / 0.07)' : 'transparent',
            }}
          >
            {tab === 'feed' && <SiTelegram className="w-2.5 h-2.5" />}
            {tab === 'stats' && <BarChart3 className="w-2.5 h-2.5" />}
            {tab === 'channels' && <Hash className="w-2.5 h-2.5" />}
            {tab === 'feed' ? t('Feed', 'مباشر') : tab === 'stats' ? t('Stats', 'إحصاء') : t('Channels', 'قنوات')}
            {tab === 'feed' && filteredMessages.length > 0 && (
              <span className="text-[7px] font-mono opacity-60">{filteredMessages.length}</span>
            )}
            {tab === 'stats' && breakingCount > 0 && (
              <span className="text-[7px] font-mono font-black text-red-400">{breakingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Channel manager */}
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
                placeholder={t('Add channel...', 'اسم القناة...')}
                className="w-full h-7 text-[11px] font-mono pl-7 pr-2 rounded-md bg-background/60 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/25 focus:outline-none focus:border-sky-500/50 transition-colors"
                data-testid="input-telegram-channel"
              />
            </div>
            <button
              onClick={addChannel}
              className="h-7 px-3 text-[10px] font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded-md border border-sky-500/25 transition-colors"
              data-testid="button-add-channel"
            >
              {t('ADD', 'إضافة')}
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

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 cursor-zoom-out"
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

      {/* ── FEED TAB ─────────────────────────────────────────────────────────── */}
      {telegramTab === 'feed' && (
        <>
          {/* Channel filter pills */}
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
            {allChannels.map(ch => {
              const count = filteredMessages.filter(m => m.channel === ch).length;
              if (count === 0) return null;
              const shortName = ch.replace('@', '').slice(0, 12);
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
                  {shortName} <span className="text-sky-400/50 ml-0.5">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="px-2 py-1.5 border-b border-border/20 shrink-0">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Search messages…', 'بحث في الرسائل…')}
                className="w-full h-6 text-[10px] font-mono pl-6 pr-6 rounded bg-background/50 border border-sky-800/25 text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-sky-500/40 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-[8px] font-mono text-sky-400/50 mt-0.5">{displayMessages.length} result{displayMessages.length !== 1 ? 's' : ''}</div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1.5">
              <div ref={topRef} />
              {displayMessages.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <SiTelegram className="w-6 h-6 text-sky-400/20 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground/60">
                    {searchQuery ? t('No messages match your search', 'لا توجد نتائج') :
                     messages.length === 0 ? t('Connecting to live feeds...', 'جاري الاتصال...') :
                     channelFilter ? t('No messages from this channel', 'لا توجد رسائل') :
                     t('No messages yet', 'لا توجد رسائل')}
                  </p>
                </div>
              )}
              {displayMessages.map((msg) => {
                const isExpanded = expandedMsgId === msg.id;
                const isLive = msg.id.startsWith('live_');
                const isNew = newMsgIds.has(msg.id);
                const text = language === 'ar' && msg.textAr ? msg.textAr : msg.text;
                const channelName = msg.channel.replace('@', '');
                const priority = getPriority(msg.text);
                const highlightText = (str: string) => {
                  if (!searchQuery.trim()) return str;
                  const idx = str.toLowerCase().indexOf(searchQuery.toLowerCase());
                  if (idx === -1) return str;
                  return str.slice(0, idx) + '【' + str.slice(idx, idx + searchQuery.length) + '】' + str.slice(idx + searchQuery.length);
                };
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                      isNew
                        ? 'bg-emerald-950/30 ring-1 ring-emerald-500/30'
                        : priority?.label === 'BREAKING'
                          ? 'bg-red-950/20 ring-1 ring-red-500/20'
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
                          {priority && (
                            <span className="text-[7px] font-mono font-black px-1 py-0.5 rounded shrink-0" style={{background: priority.color + '20', color: priority.color, border: `1px solid ${priority.color}40`}}>{priority.label}</span>
                          )}
                          {isNew && !priority && (
                            <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-1 rounded border border-emerald-500/30 shrink-0">NEW</span>
                          )}
                          {isLive && !isNew && !priority && (
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

                      <p className={`text-sm leading-[1.65] ${isExpanded ? 'text-foreground/90 whitespace-pre-wrap' : 'text-foreground/70 line-clamp-2'}`}>
                        {highlightText(text)}
                      </p>

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
                            <span>{t('Open channel', 'فتح القناة')}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {/* ── STATS TAB ────────────────────────────────────────────────────────── */}
      {telegramTab === 'stats' && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('Total Msgs', 'الرسائل'), value: filteredMessages.length, color: 'text-sky-400', accent: 'hsl(199 89% 50%)' },
                { label: t('Last Hour', 'آخر ساعة'), value: recentActivity, color: 'text-emerald-400', accent: 'hsl(160 84% 39%)' },
                { label: t('Breaking', 'عاجل'), value: breakingCount, color: breakingCount > 0 ? 'text-red-400' : 'text-foreground/30', accent: 'hsl(0 72% 51%)' },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className="rounded overflow-hidden border border-border/40" style={{borderLeft:`3px solid ${accent}`}}>
                  <div className="px-2 py-1.5 bg-muted/30">
                    <div className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none">{label}</div>
                    <div className={`text-xl font-black font-mono leading-tight tabular-nums ${color}`}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 12h Activity Timeline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-sky-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Activity (last 12h)', 'النشاط (12 ساعة)')}</span>
              </div>
              <div className="flex items-end gap-0.5 h-12 rounded bg-muted/20 border border-border/30 p-1.5">
                {hourlyActivity.map(({ hour, count }) => (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(2, (count / maxHourly) * 36)}px`,
                        background: count > maxHourly * 0.7 ? 'hsl(199 89% 55%)' : count > 0 ? 'hsl(199 89% 40%)' : 'hsl(var(--muted))',
                      }}
                    />
                    {hour % 3 === 0 && <span className="text-[6px] font-mono text-foreground/25">{hour === 0 ? 'now' : `${hour}h`}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages per channel */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SiTelegram className="w-3.5 h-3.5 text-sky-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Messages by Channel', 'رسائل حسب القناة')}</span>
              </div>
              <div className="space-y-1.5">
                {channelCounts.slice(0, 12).map(([ch, count]) => (
                  <div key={ch} className="flex items-center gap-2">
                    <span className="text-[9px] text-sky-400/70 font-mono w-[110px] truncate">{ch.replace('@', '')}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/30">
                      <div className="h-full rounded-full transition-all" style={{width:`${(count / maxChannel) * 100}%`, background:'hsl(199 89% 45%)'}} />
                    </div>
                    <span className="text-[9px] text-sky-300 font-mono font-bold w-[24px] text-right tabular-nums">{count}</span>
                  </div>
                ))}
                {filteredMessages.length === 0 && (
                  <div className="text-center py-4 text-[10px] font-mono text-foreground/30">{t('No data yet', 'لا بيانات')}</div>
                )}
              </div>
            </div>

            {/* Top Keywords */}
            {topKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-sky-400/70" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Top Keywords', 'الكلمات الأكثر تكراراً')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {topKeywords.map(([word, count]) => (
                    <button
                      key={word}
                      onClick={() => { setSearchQuery(word); setTelegramTab('feed'); }}
                      className="px-2 py-0.5 rounded text-[8px] font-mono transition-all hover:opacity-80 active:scale-95"
                      style={{
                        background: `hsl(199 89% ${Math.max(15, 30 - (topKeywords.indexOf([word, count]) * 1))}% / 0.25)`,
                        border: '1px solid hsl(199 89% 50% / 0.2)',
                        color: `hsl(199 89% ${Math.max(55, 75 - topKeywords.indexOf([word, count]))}%)`,
                        fontSize: `${Math.max(7, 9 - Math.floor(topKeywords.indexOf([word, count]) / 5))}px`,
                      }}
                    >
                      {word} <span className="opacity-50">{count}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[7px] font-mono text-foreground/25 mt-1">{t('Click a keyword to search feed', 'انقر للبحث في المحادثات')}</div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* ── CHANNELS TAB ─────────────────────────────────────────────────────── */}
      {telegramTab === 'channels' && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            {/* Add channel form always visible here */}
            <div className="rounded border border-sky-800/25 bg-sky-950/15 p-2.5 space-y-2">
              <div className="text-[9px] font-mono font-bold text-sky-400/60 uppercase tracking-wider">{t('Add Channel', 'إضافة قناة')}</div>
              <div className="flex gap-1.5">
                <div className="flex-1 relative">
                  <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40" />
                  <input
                    type="text"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                    placeholder={t('@channel or username', '@القناة')}
                    className="w-full h-7 text-[11px] font-mono pl-7 pr-2 rounded bg-background/60 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
                <button
                  onClick={addChannel}
                  className="h-7 px-3 text-[10px] font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded border border-sky-500/25 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {t('Add', 'إضافة')}
                </button>
              </div>
            </div>

            {/* Default channels */}
            <div>
              <div className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-wider mb-1.5">{t('Default Channels', 'القنوات الافتراضية')}</div>
              <div className="space-y-1">
                {DEFAULT_CHANNELS.map(ch => {
                  const count = filteredMessages.filter(m => m.channel === ch).length;
                  const lastMsg = filteredMessages.find(m => m.channel === ch);
                  return (
                    <div key={ch} className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border/30 hover:border-sky-500/20 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                        <SiTelegram className="w-3.5 h-3.5 text-sky-400/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-sky-300 font-mono truncate">{ch.replace('@', '')}</div>
                        {lastMsg && <div className="text-[8px] text-foreground/30 font-mono truncate">{lastMsg.text.slice(0, 50)}{lastMsg.text.length > 50 ? '…' : ''}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[9px] font-mono font-bold text-sky-400">{count}</span>
                        <a
                          href={`https://t.me/${ch.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-foreground/20 hover:text-sky-400/60 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom channels */}
            {customOnly.length > 0 && (
              <div>
                <div className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-wider mb-1.5">{t('Custom Channels', 'قنوات مخصصة')}</div>
                <div className="space-y-1">
                  {customOnly.map(ch => {
                    const count = filteredMessages.filter(m => m.channel === ch).length;
                    return (
                      <div key={ch} className="flex items-center gap-2 p-2 rounded bg-sky-950/20 border border-sky-800/25">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                          <SiTelegram className="w-3.5 h-3.5 text-sky-300/80" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-sky-200 font-mono truncate">{ch.replace('@', '')}</div>
                          <div className="text-[8px] text-sky-400/40 font-mono">{t('Custom', 'مخصص')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono font-bold text-sky-400">{count}</span>
                          <a
                            href={`https://t.me/${ch.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-foreground/20 hover:text-sky-400/60 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <button
                            onClick={() => removeChannel(ch)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-400/50 hover:text-red-400/80" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
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
        background: 'rgba(4,7,16,0.96)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontFamily: "var(--font-mono)",
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
      {/* Header */}
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{background:'linear-gradient(90deg,transparent 5%,rgba(99,102,241,0.5) 30%,rgba(99,102,241,0.7) 50%,rgba(99,102,241,0.5) 70%,transparent 95%)'}} />
        <div className={`w-2 h-2 rounded-full shrink-0 ${activeAlerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500/70'}`} />
        <MapPin className="w-3 h-3 text-foreground/40 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55" style={{fontFamily:'var(--font-display)'}}>
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
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>

          {hasActiveThreats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, animation: 'eas-pulse-border 1.2s ease-in-out infinite', flexShrink: 0, transform: 'translateZ(0)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 7px rgba(239,68,68,0.8)', animation: 'eas-flash 0.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
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
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,107,53,0.65)' }}>FIRMS</span>
          </div>

          {/* LIVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.65)', animation: 'eas-flash 1.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
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
  alertsByCountry?: Record<string, number>;
  alertTimeline: { time: string; count: number; regions?: Record<string, number>; types?: Record<string, number>; countries?: Record<string, number> }[];
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
  eventsByCountry?: Record<string, number>;
  telegramByCountry?: Record<string, number>;
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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'regions' | 'sources' | 'patterns' | 'epicfury'>('overview');
  const [epicFuryData, setEpicFuryData] = useState<Record<string, any> | null>(null);
  const [epicFuryLoading, setEpicFuryLoading] = useState(false);
  const [epicFuryFetchedAt, setEpicFuryFetchedAt] = useState<string | null>(null);
  const [epicFuryError, setEpicFuryError] = useState(false);
  const fetchEpicFury = useCallback(async () => {
    setEpicFuryLoading(true);
    setEpicFuryError(false);
    try {
      const res = await fetch('/api/epic-fury');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data.error) { setEpicFuryData(data); setEpicFuryFetchedAt(new Date().toLocaleTimeString()); }
      else setEpicFuryError(true);
    } catch { setEpicFuryError(true); }
    setEpicFuryLoading(false);
  }, []);

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const patterns = analytics?.patterns ?? [];
  const falseAlarms = analytics?.falseAlarms ?? [];

  const regionEntries = analytics ? Object.entries(analytics.alertsByRegion).sort((a, b) => b[1] - a[1]).slice(0, 12) : [];
  const typeEntries = analytics ? Object.entries(analytics.alertsByType).sort((a, b) => b[1] - a[1]) : [];
  const maxRegion = regionEntries.length > 0 ? Math.max(...regionEntries.map(e => e[1])) : 1;
  const maxType = typeEntries.length > 0 ? Math.max(...typeEntries.map(e => e[1])) : 1;
  const maxTimeline = analytics?.alertTimeline ? Math.max(...analytics.alertTimeline.map(t => t.count), 1) : 1;

  const trendColor = analytics?.threatTrend === 'escalating' ? 'text-red-400' : analytics?.threatTrend === 'deescalating' ? 'text-emerald-400' : 'text-yellow-400';
  const trendIcon = analytics?.threatTrend === 'escalating' ? '▲' : analytics?.threatTrend === 'deescalating' ? '▼' : '●';

  const timeline = analytics?.alertTimeline ?? [];
  const totalAlerts = timeline.reduce((s, b) => s + b.count, 0);
  const peakHour = timeline.length > 0 ? timeline.reduce((peak, b) => b.count > peak.count ? b : peak, { time: '--', count: 0 }) : { time: '--', count: 0 };
  const totalRegions = regionEntries.length;
  const totalTypes = typeEntries.length;

  const anomalyCount = analytics?.regionAnomalies?.length ?? 0;
  const computedThreatLevel: 'CRITICAL'|'HIGH'|'ELEVATED'|'MODERATE'|'LOW' = (() => {
    if (!analytics) return 'LOW';
    const active = analytics.activeAlertCount;
    const escalating = analytics.threatTrend === 'escalating';
    if (active > 10 || (escalating && anomalyCount > 3)) return 'CRITICAL';
    if (active > 5  || (escalating && anomalyCount > 1)) return 'HIGH';
    if (active > 0  || anomalyCount > 0)                 return 'ELEVATED';
    if (totalAlerts > 20)                                return 'MODERATE';
    return 'LOW';
  })();

  const threatLevelConfig = {
    CRITICAL: { gradient: 'linear-gradient(135deg,rgb(127 29 29/0.9),rgb(185 28 28/0.5))', border:'border-red-500/50', badge:'bg-red-600/80 text-red-100', glow:'shadow-[0_0_20px_rgb(239_68_68_/_0.3)]', desc:'Immediate threat. Multiple active alerts across theater.' },
    HIGH:     { gradient: 'linear-gradient(135deg,rgb(120 53 15/0.9),rgb(194 65 12/0.5))',  border:'border-orange-500/40', badge:'bg-orange-600/80 text-orange-100', glow:'', desc:'Elevated threat posture. Active incidents in theater.' },
    ELEVATED: { gradient: 'linear-gradient(135deg,rgb(113 63 18/0.85),rgb(120 72 12/0.6))', border:'border-yellow-500/35', badge:'bg-yellow-600/70 text-yellow-100', glow:'', desc:'Elevated conditions. Monitor for escalation.' },
    MODERATE: { gradient: 'linear-gradient(135deg,rgb(20 83 45/0.8),rgb(6 78 59/0.6))',    border:'border-emerald-500/30', badge:'bg-emerald-700/60 text-emerald-100', glow:'', desc:'Moderate activity. Situation being monitored.' },
    LOW:      { gradient: 'linear-gradient(135deg,rgb(15 23 42/0.95),rgb(20 30 55/0.8))',  border:'border-border', badge:'bg-slate-700/50 text-slate-300', glow:'', desc:'Routine monitoring. No significant threats detected.' },
  };

  const last6 = (analytics?.alertTimeline ?? []).slice(-6);
  const sparkMax = Math.max(...last6.map(b => b.count), 1);
  const makeSparkPath = (data: typeof last6) => {
    if (data.length < 2) return '';
    const w = 40, h = 10;
    return data.map((b, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (b.count / sparkMax) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };
  const sparkPath = makeSparkPath(last6);

  const exportPdf = useCallback(async () => {
    if (!analytics) return;
    setExportingPdf(true);
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 45, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageW, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('CONFLICT INTELLIGENCE REPORT', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text(`Generated: ${now.toUTCString()}`, pageW / 2, 25, { align: 'center' });
      doc.text('CLASSIFICATION: OSINT // UNCLASSIFIED', pageW / 2, 31, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('War Room Analytics Dashboard — Real-time Conflict Monitoring Platform', pageW / 2, 38, { align: 'center' });

      // Threat level badge top-right
      const tlColors: Record<string, [number,number,number]> = { CRITICAL:[220,38,38], HIGH:[234,88,12], ELEVATED:[202,138,4], MODERATE:[5,150,105], LOW:[71,85,105] };
      const tlColor = tlColors[computedThreatLevel] || [71,85,105];
      doc.setFillColor(tlColor[0], tlColor[1], tlColor[2]);
      doc.roundedRect(pageW - 52, 8, 42, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('THREAT LEVEL', pageW - 31, 13.5, { align: 'center' });
      doc.setFontSize(9);
      doc.text(computedThreatLevel, pageW - 31, 17.5, { align: 'center' });

      let y = 52;

      doc.setFillColor(30, 30, 50);
      doc.roundedRect(10, y, pageW - 20, 28, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('EXECUTIVE SUMMARY', 15, y + 6);
      doc.setDrawColor(220, 38, 38);
      doc.line(15, y + 8, 60, y + 8);

      const trendLabel = analytics.threatTrend === 'escalating' ? 'ESCALATING' : analytics.threatTrend === 'deescalating' ? 'DE-ESCALATING' : 'STABLE';
      const summaryStats = [
        `Active Alerts: ${analytics.activeAlertCount}`,
        `Total (24h): ${totalAlerts}`,
        `False Alarm Rate: ${(analytics.falseAlarmRate * 100).toFixed(1)}%`,
        `Avg Response: ${analytics.avgResponseTime}s`,
        `Trend: ${trendLabel}`,
        `Peak Hour: ${peakHour?.time || '--'} UTC (${peakHour?.count || 0} alerts)`,
        `Conflict Events: ${analytics.conflictEventCount ?? 0}`,
        `Thermal Hotspots: ${analytics.thermalHotspotCount ?? 0}`,
      ];
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      const col1 = summaryStats.slice(0, 4);
      const col2 = summaryStats.slice(4);
      col1.forEach((s, i) => doc.text(s, 15, y + 14 + i * 4));
      col2.forEach((s, i) => doc.text(s, pageW / 2 + 5, y + 14 + i * 4));

      y += 34;

      if (analytics.escalationForecast) {
        const fc = analytics.escalationForecast;
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ESCALATION FORECAST', 15, y + 6);
        doc.setDrawColor(251, 146, 60);
        doc.line(15, y + 8, 55, y + 8);
        doc.setFontSize(9);
        doc.setTextColor(220, 220, 220);
        const dirIcon = fc.direction === 'surging' ? '▲▲' : fc.direction === 'escalating' ? '▲' : fc.direction === 'cooling' ? '▼' : '●';
        doc.text(`${dirIcon} Direction: ${fc.direction.toUpperCase()} | Next 1h: ${fc.nextHour} alerts | Next 3h: ${fc.next3Hours} alerts | Velocity: ${fc.velocityPerHour >= 0 ? '+' : ''}${fc.velocityPerHour}/hr | Confidence: ${Math.round(fc.confidence * 100)}%`, 15, y + 14);
        y += 24;
      }

      // 24h Alert Timeline chart
      if (analytics.alertTimeline && analytics.alertTimeline.length > 0) {
        if (y > 200) { doc.addPage(); y = 15; }
        doc.setFillColor(220, 38, 38);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(20, 25, 45);
        const tlHeight = 28;
        doc.roundedRect(10, y, pageW - 20, tlHeight + 10, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('24H ALERT TIMELINE', 15, y + 6);
        doc.setDrawColor(239, 68, 68);
        doc.line(15, y + 8, 52, y + 8);
        const tl = analytics.alertTimeline;
        const tlMax = Math.max(...tl.map((b: {time:string;count:number}) => b.count), 1);
        const peakBucket = tl.reduce((pk: {time:string;count:number}, b: {time:string;count:number}) => b.count > pk.count ? b : pk, {time:'',count:0});
        const barW = (pageW - 30) / tl.length;
        const chartTop = y + 10;
        tl.forEach((b: {time:string;count:number}, i: number) => {
          const bh = Math.max(1, (b.count / tlMax) * tlHeight);
          const bx = 15 + i * barW;
          const by = chartTop + tlHeight - bh;
          const isPk = b.count === peakBucket.count && b.time === peakBucket.time;
          if (isPk) { doc.setFillColor(239, 68, 68); }
          else if (b.count > tlMax * 0.7) { doc.setFillColor(239, 68, 68); }
          else if (b.count > tlMax * 0.4) { doc.setFillColor(251, 146, 60); }
          else if (b.count > tlMax * 0.15) { doc.setFillColor(245, 158, 11); }
          else { doc.setFillColor(59, 130, 246); }
          doc.rect(bx, by, Math.max(0.5, barW - 0.5), bh, 'F');
          if (isPk && b.count > 0) {
            doc.setFontSize(6);
            doc.setTextColor(239, 68, 68);
            doc.text(`${b.count}`, bx + barW/2, by - 1, {align:'center'});
          }
        });
        // Hour axis labels
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        ['0h','6h','12h','18h','23h'].forEach((lbl, i) => {
          const positions = [0, 6, 12, 18, 23];
          const xPos = 15 + (positions[i] / 23) * (pageW - 30);
          doc.text(lbl, xPos, chartTop + tlHeight + 5);
        });
        y += tlHeight + 14;
      }

      if (regionEntries.length > 0) {
        doc.setFillColor(59, 130, 246);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + regionEntries.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY REGION', 15, y + 6);
        doc.setDrawColor(59, 130, 246);
        doc.line(15, y + 8, 50, y + 8);
        regionEntries.forEach(([region, count], i) => {
          const rowY = y + 13 + i * 5.5;
          const pct = (count / maxRegion) * 100;
          if (i % 2 === 0) { doc.setFillColor(255,255,255); doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(200, 200, 200);
          doc.text(region, 15, rowY);
          doc.setFillColor(pct > 70 ? 239 : pct > 40 ? 251 : 59, pct > 70 ? 68 : pct > 40 ? 146 : 130, pct > 70 ? 68 : pct > 40 ? 60 : 246);
          doc.roundedRect(55, rowY - 3, Math.max(2, (count / maxRegion) * 100), 3, 1, 1, 'F');
          doc.setTextColor(180, 180, 180);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + regionEntries.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (typeEntries.length > 0) {
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + typeEntries.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY TYPE', 15, y + 6);
        doc.setDrawColor(168, 85, 247);
        doc.line(15, y + 8, 48, y + 8);
        typeEntries.forEach(([type, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(200, 200, 200);
          doc.text(type.replace(/_/g, ' ').toUpperCase(), 15, rowY);
          doc.setTextColor(180, 180, 180);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + typeEntries.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (analytics.topSources.length > 0) {
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + analytics.topSources.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('SOURCE RELIABILITY', 15, y + 6);
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y + 8, 50, y + 8);
        analytics.topSources.forEach((src, i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          const rel = src.reliability;
          doc.setTextColor(rel > 0.85 ? 74 : rel > 0.7 ? 250 : 248, rel > 0.85 ? 222 : rel > 0.7 ? 204 : 113, rel > 0.85 ? 128 : rel > 0.7 ? 21 : 113);
          doc.text(`${(rel * 100).toFixed(0)}%`, 15, rowY);
          doc.setTextColor(200, 200, 200);
          doc.text(src.channel, 30, rowY);
          doc.setTextColor(140, 140, 140);
          doc.text(`${src.count} msgs`, 140, rowY);
        });
        y += 14 + analytics.topSources.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // Alerts by Country horizontal bars
      if (analytics.alertsByCountry && Object.keys(analytics.alertsByCountry).length > 0) {
        doc.setFillColor(16, 185, 129);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        const countryArr = Object.entries(analytics.alertsByCountry as Record<string,number>).sort((a,b)=>b[1]-a[1]).slice(0,8);
        const maxCt = Math.max(...countryArr.map(e=>e[1]),1);
        const totalCt = countryArr.reduce((s,e)=>s+e[1],0);
        doc.setFillColor(25, 35, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + countryArr.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY COUNTRY', 15, y + 6);
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y + 8, 52, y + 8);
        countryArr.forEach(([country, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,35,30); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          const barLen = Math.max(2, (count / maxCt) * 80);
          const pctStr = totalCt > 0 ? `${((count/totalCt)*100).toFixed(0)}%` : '0%';
          doc.setFontSize(8);
          doc.setTextColor(200, 220, 200);
          doc.text(country, 15, rowY);
          doc.setFillColor(16, 185, 129);
          doc.roundedRect(55, rowY - 3, barLen, 3, 1, 1, 'F');
          doc.setTextColor(140, 200, 160);
          doc.text(pctStr, 140, rowY);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + countryArr.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // Telegram Intel by Country
      if (analytics.telegramByCountry && Object.keys(analytics.telegramByCountry).length > 0) {
        doc.setFillColor(6, 182, 212);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        const tgArr = Object.entries(analytics.telegramByCountry as Record<string,number>).sort((a,b)=>b[1]-a[1]);
        doc.setFillColor(15, 30, 40);
        doc.roundedRect(10, y, pageW - 20, 8 + tgArr.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('TELEGRAM INTEL BY COUNTRY', 15, y + 6);
        doc.setDrawColor(6, 182, 212);
        doc.line(15, y + 8, 58, y + 8);
        tgArr.forEach(([country, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(15,35,45); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(150, 230, 240);
          doc.text(country, 15, rowY);
          doc.setTextColor(100, 200, 220);
          doc.text(`${count} mentions`, 140, rowY);
        });
        y += 14 + tgArr.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // AI Patterns
      const patternsData = analytics.patterns ?? [];
      if (patternsData.length > 0) {
        doc.setFillColor(168, 85, 247);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(20, 15, 40);
        doc.roundedRect(10, y, pageW - 20, 8 + patternsData.length * 6, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('AI DETECTED PATTERNS', 15, y + 6);
        doc.setDrawColor(168, 85, 247);
        doc.line(15, y + 8, 55, y + 8);
        patternsData.forEach((pat: {type:string;confidence:number;description:string}, i: number) => {
          const rowY = y + 13 + i * 6;
          if (i % 2 === 0) { doc.setFillColor(25,18,45); doc.rect(11, rowY - 3.5, pageW - 22, 5.5, 'F'); }
          const conf = Math.round(pat.confidence * 100);
          const confColor: [number,number,number] = conf > 70 ? [167,243,208] : conf > 40 ? [253,230,138] : [252,165,165];
          doc.setFillColor(...confColor);
          doc.roundedRect(15, rowY - 2.5, 16, 4, 1, 1, 'F');
          doc.setFontSize(7);
          doc.setTextColor(20, 20, 20);
          doc.text(`${conf}%`, 23, rowY + 0.5, {align:'center'});
          doc.setFontSize(8);
          doc.setTextColor(200, 180, 255);
          doc.text(pat.type.toUpperCase(), 34, rowY);
          doc.setTextColor(160, 150, 200);
          const desc = pat.description.length > 80 ? pat.description.slice(0, 77) + '...' : pat.description;
          doc.text(desc, 34, rowY + 3.5);
        });
        y += 14 + patternsData.length * 6;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (analytics.regionAnomalies && analytics.regionAnomalies.length > 0) {
        doc.setFillColor(30, 20, 20);
        doc.roundedRect(10, y, pageW - 20, 8 + analytics.regionAnomalies.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ANOMALY DETECTION', 15, y + 6);
        doc.setDrawColor(245, 158, 11);
        doc.line(15, y + 8, 50, y + 8);
        analytics.regionAnomalies.forEach((a, i) => {
          const rowY = y + 13 + i * 5.5;
          doc.setFontSize(8);
          doc.setTextColor(a.severity === 'critical' ? 248 : 251, a.severity === 'critical' ? 113 : 191, a.severity === 'critical' ? 113 : 36);
          doc.text(`[${a.severity.toUpperCase()}]`, 15, rowY);
          doc.setTextColor(200, 200, 200);
          doc.text(`${a.region} — +${a.pctAboveAvg}% above avg (z=${a.zScore.toFixed(1)})`, 38, rowY);
        });
        y += 14 + analytics.regionAnomalies.length * 5.5;
      }

      const pageCount = doc.internal.pages.length - 1;
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(15, 23, 42);
        doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageW, 10, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`CONFLICT INTELLIGENCE REPORT — Page ${p}/${pageCount} — ${now.toISOString().split('T')[0]}`, pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
      }

      doc.save(`conflict-intel-report-${now.toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
    }
  }, [analytics, totalAlerts, peakHour, regionEntries, maxRegion, typeEntries, computedThreatLevel]);

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-analytics">
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25" />
        <BarChart3 className="w-3.5 h-3.5 text-blue-400/55 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55 font-mono">{t('Analytics', '\u062A\u062D\u0644\u064A\u0644\u0627\u062A')}</span>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={exportPdf}
              disabled={exportingPdf || !analytics}
              className="w-6 h-6 rounded flex items-center justify-center text-foreground/30 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-30"
              data-testid="button-export-pdf"
            >
              {exportingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono">
            Export Intelligence Report (PDF)
          </TooltipContent>
        </Tooltip>
        {onMaximize && <button onClick={onMaximize} className="w-5 h-5 rounded flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-white/10 transition-colors" data-testid="button-maximize-analytics">{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}</button>}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="flex border-b border-border shrink-0" style={{ background: 'hsl(var(--muted))' }}>
        {(['overview', 'regions', 'sources', 'patterns', 'epicfury'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAnalyticsTab(tab)}
            className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors ${
              analyticsTab === tab
                ? 'text-blue-300 border-b border-blue-400'
                : 'text-muted-foreground/60 hover:text-white/60'
            }`}
            data-testid={`button-tab-${tab}`}
          >
            {tab === 'overview' ? t('Overview', '\u0646\u0638\u0631\u0629') :
             tab === 'regions' ? t('Regions', '\u0645\u0646\u0627\u0637\u0642') :
             tab === 'sources' ? t('Sources', '\u0645\u0635\u0627\u062F\u0631') :
             tab === 'epicfury' ? t('Op. Fury', '\u0634\u0627\u063a\u062a') :
             t('Patterns', '\u0623\u0646\u0645\u0627\u0637')}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!analytics ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-blue-400/40 animate-spin mx-auto" /></div>
          ) : (
            <TooltipProvider delayDuration={200}>

              {analyticsTab === 'overview' && (
                <>
                  {analytics.lastUpdated && (
                    <div className="flex items-center gap-1.5 cursor-default -mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[9px] font-mono text-foreground/30">
                        Updated {timeAgo(analytics.lastUpdated)}
                      </span>
                    </div>
                  )}

                  {analytics && (
                    <div className={`rounded border ${threatLevelConfig[computedThreatLevel].border} overflow-hidden ${threatLevelConfig[computedThreatLevel].glow}`}
                      style={{background: threatLevelConfig[computedThreatLevel].gradient}} data-testid="section-threat-level">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded self-start ${threatLevelConfig[computedThreatLevel].badge}`}>THREAT LEVEL</span>
                          <span className="text-2xl font-black font-mono tracking-widest text-white leading-none">{computedThreatLevel}</span>
                          <span className="text-[9px] font-mono text-white/50 max-w-[160px] leading-relaxed">{threatLevelConfig[computedThreatLevel].desc}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Active</span>
                          <span className="text-4xl font-black font-mono text-white/90 leading-none tabular-nums">{analytics.activeAlertCount}</span>
                          <span className={`text-[9px] font-mono font-bold ${trendColor}`}>{trendIcon} {analytics.threatTrend.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.escalationForecast && (() => {
                    const fc = analytics.escalationForecast;
                    const dirConfig = {
                      surging:    { label: 'SURGING',    color: 'text-red-400',    bg: 'bg-red-950/30 border-red-500/30',    icon: '▲▲', glow: 'shadow-[0_0_12px_rgb(239_68_68_/_0.25)]' },
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
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Escalation Forecast', '\u062A\u0648\u0642\u0639\u0627\u062A \u0627\u0644\u062A\u0635\u0639\u064A\u062F')}</span>
                          <div className="flex-1" />
                          <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded ${dirConfig.color}`} style={{background:'rgb(0 0 0 / 0.25)'}}>
                            {dirConfig.icon} {dirConfig.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 1h</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.nextHour}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 3h</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.next3Hours}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Velocity</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{velSign}{Math.round(fc.velocityPerHour)}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Peak</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.projectedPeak || '--'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-foreground/30">{t('Confidence', '\u0627\u0644\u062B\u0642\u0629')}</span>
                          <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${fc.confidence > 0.6 ? 'bg-emerald-400/70' : fc.confidence > 0.35 ? 'bg-yellow-400/70' : 'bg-red-400/50'}`} style={{ width: `${confPct}%` }} />
                          </div>
                          <span className={`text-[8px] font-black font-mono ${fc.confidence > 0.6 ? 'text-emerald-400' : fc.confidence > 0.35 ? 'text-yellow-400' : 'text-red-400/70'}`}>{confPct}%</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: t('ACTIVE','\u0646\u0634\u0637'), value: analytics.activeAlertCount, color: 'text-red-400', accent: 'hsl(0 72% 51%)', border: 'border-red-500/15', bg: 'bg-red-950/15', testid: 'text-active-alerts', tooltip: 'Oref red alerts currently within countdown window' },
                      { label: t('24H TOTAL','\u0625\u062C\u0645\u0627\u0644\u064A'), value: totalAlerts, color: 'text-orange-400', accent: 'hsl(25 95% 53%)', border: 'border-orange-500/15', bg: 'bg-orange-950/15', testid: 'text-total-24h', tooltip: 'Total alerts across all regions in the last 24 hours' },
                      { label: t('FALSE ALM','\u0643\u0627\u0630\u0628'), value: `${(analytics.falseAlarmRate * 100).toFixed(1)}%`, color: 'text-yellow-400', accent: 'hsl(48 96% 53%)', border: 'border-yellow-500/15', bg: 'bg-yellow-950/15', testid: 'text-false-alarm-rate', tooltip: 'Estimated false alarm rate based on AI scoring' },
                      { label: t('TREND','\u0627\u062A\u062C\u0627\u0647'), value: `${trendIcon}`, color: trendColor, accent: 'hsl(175 60% 40%)', border: 'border-border', bg: 'bg-muted/20', testid: 'text-trend', sub: analytics.threatTrend.slice(0,4).toUpperCase(), tooltip: `Threat trend: ${analytics.threatTrend}` },
                    ].map(stat => (
                      <Tooltip key={stat.label}>
                        <TooltipTrigger asChild>
                          <div className={`${stat.bg} border ${stat.border} rounded overflow-hidden cursor-default hover:brightness-125 transition-all`} style={{borderLeft: `3px solid ${stat.accent}`}}>
                            <div className="px-2 py-1.5 flex flex-col gap-0.5">
                              <span className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none">{stat.label}</span>
                              <span className={`text-lg font-black font-mono leading-tight tabular-nums ${stat.color}`} data-testid={stat.testid}>{stat.value}</span>
                              {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-60`}>{stat.sub}</span>}
                              {sparkPath && (
                                <svg width="40" height="10" className="mt-1 opacity-35" viewBox="0 0 40 10">
                                  <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={stat.color} />
                                </svg>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                          <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: t('CONFLICT EVT','\u0623\u062D\u062F\u0627\u062B'), value: analytics.conflictEventCount ?? 0, color: 'text-orange-400', accent: 'hsl(25 95% 53%)', border: 'border-orange-500/15', bg: 'bg-orange-950/15', tooltip: `${analytics.conflictEventCount ?? 0} mapped conflict events from GDELT, Oref, NASA FIRMS`, sub: analytics.eventsByType ? Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1])[0]?.[0]?.toUpperCase() : undefined },
                      { label: t('THERMAL SAT','\u062D\u0631\u0627\u0631\u064A'), value: analytics.thermalHotspotCount ?? 0, color: 'text-red-300', accent: 'hsl(0 72% 51%)', border: 'border-red-500/15', bg: 'bg-red-950/15', tooltip: 'NASA FIRMS VIIRS satellite thermal hotspots in theater (48h)', sub: 'NASA' },
                      { label: t('MIL FLIGHT','\u0637\u064A\u0631\u0627\u0646'), value: analytics.militaryFlightCount ?? 0, color: 'text-purple-400', accent: 'hsl(270 60% 60%)', border: 'border-purple-500/15', bg: 'bg-purple-950/15', tooltip: 'Military aircraft tracked via ADS-B in Middle East', sub: 'ADS-B' },
                    ].map(stat => (
                      <Tooltip key={stat.label}>
                        <TooltipTrigger asChild>
                          <div className={`${stat.bg} border ${stat.border} rounded overflow-hidden cursor-default hover:brightness-125 transition-all`} style={{borderLeft: `3px solid ${stat.accent}`}}>
                            <div className="px-2 py-1.5 flex flex-col gap-0.5">
                              <span className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none truncate">{stat.label}</span>
                              <span className={`text-lg font-black font-mono leading-tight tabular-nums ${stat.color}`}>{stat.value}</span>
                              {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-60 truncate max-w-full`}>{stat.sub}</span>}
                              {sparkPath && (
                                <svg width="40" height="10" className="mt-1 opacity-35" viewBox="0 0 40 10">
                                  <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={stat.color} />
                                </svg>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                          <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-border">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('24h Alert Timeline', '\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A 24 \u0633\u0627\u0639\u0629')}</span>
                      <div className="flex items-center gap-2">
                        {peakHour && peakHour.count > 0 && (
                          <span className="text-[8px] font-mono text-red-400/70 font-bold">⚡ Peak {peakHour.time}</span>
                        )}
                        <span className="text-[8px] font-mono text-foreground/25">UTC · {totalAlerts}</span>
                      </div>
                    </div>
                    <div className="rounded border border-border overflow-hidden" data-testid="chart-timeline">
                      <div className="relative flex items-end gap-[2px] bg-white/[0.015] px-1.5 pt-2" style={{height: '72px'}}>
                      {[25,50,75].map(pct => (
                        <div key={pct} className="absolute pointer-events-none" style={{bottom:`${pct}%`,left:0,right:0,borderTop:'1px dotted rgba(255,255,255,0.05)'}} />
                      ))}
                      {(analytics.alertTimeline ?? []).map((b, i) => {
                        const topRegions = Object.entries(b.regions || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const topTypes = Object.entries(b.types || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const topCountries = Object.entries(b.countries || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const isPeak = peakHour && b.time === peakHour.time && b.count === peakHour.count;
                        const barColor = isPeak ? 'rgb(239 68 68 / 0.95)' : b.count > maxTimeline * 0.7 ? 'rgb(239 68 68 / 0.75)' : b.count > maxTimeline * 0.4 ? 'rgb(251 146 60 / 0.65)' : 'rgb(59 130 246 / 0.45)';
                        return (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <div className="flex-1 flex flex-col items-center justify-end h-full group cursor-default">
                                <div className={`w-full rounded-t-sm transition-all group-hover:brightness-150 group-hover:scale-y-[1.08] min-h-[2px] origin-bottom ${isPeak ? 'ring-1 ring-red-400/60 shadow-[0_0_6px_rgb(239_68_68_/_0.4)]' : ''}`} style={{ height: `${Math.max(4, (b.count / maxTimeline) * 88)}%`, background: barColor }} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-black/95 border-white/10 p-2 min-w-[130px]">
                              <p className="text-[11px] font-black font-mono text-foreground/90 mb-1">{b.time} UTC {isPeak ? '(PEAK)' : ''}</p>
                              <p className="text-[10px] font-mono text-foreground/60 mb-1.5">{b.count} alert{b.count !== 1 ? 's' : ''}</p>
                              {topRegions.length > 0 && (
                                <div className="mb-1">
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Regions</p>
                                  {topRegions.map(([r, c]) => (<div key={r} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55">{r}</span><span className="text-[9px] font-bold font-mono text-orange-300/80">{c}</span></div>))}
                                </div>
                              )}
                              {topTypes.length > 0 && (
                                <div>
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Types</p>
                                  {topTypes.map(([tp, c]) => (<div key={tp} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55 uppercase">{tp.replace(/_/g,' ')}</span><span className="text-[9px] font-bold font-mono text-blue-300/80">{c}</span></div>))}
                                </div>
                              )}
                              {topCountries.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Countries</p>
                                  {topCountries.map(([c, ct]) => (<div key={c} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55">{c}</span><span className="text-[9px] font-bold font-mono text-emerald-300/80">{ct}</span></div>))}
                                </div>
                              )}
                              {b.count === 0 && <p className="text-[9px] font-mono text-foreground/25 italic">No alerts this hour</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      </div>
                      {/* Hour axis labels */}
                      <div className="flex items-center px-1.5 py-1 border-t border-border bg-muted/30">
                        {['0h','','','','','','6h','','','','','','12h','','','','','','18h','','','','','23h'].map((lbl, i) => (
                          <div key={i} className="flex-1 text-center">
                            {lbl && <span className="text-[7px] font-mono text-foreground/25 tabular-nums">{lbl}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {analytics.eventsByType && Object.keys(analytics.eventsByType).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Live Event Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u062D\u062F\u0627\u062B')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.eventsByType).reduce((s,v)=>s+v,0)} total</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1]).map(([type, count]) => {
                          const colors: Record<string, string> = { missile: 'bg-red-950/40 border-red-500/25 text-red-300', airstrike: 'bg-orange-950/40 border-orange-500/25 text-orange-300', defense: 'bg-cyan-950/40 border-cyan-500/25 text-cyan-300', ground: 'bg-yellow-950/40 border-yellow-500/25 text-yellow-300', naval: 'bg-blue-950/40 border-blue-500/25 text-blue-300', nuclear: 'bg-purple-950/40 border-purple-500/25 text-purple-300' };
                          return (
                            <span key={type} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors[type] || 'bg-white/[0.03] border-white/10 text-foreground/50'}`}>
                              {type.toUpperCase()} {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analytics.alertsByCountry && Object.keys(analytics.alertsByCountry).length > 0 && (
                    <div data-testid="section-country-breakdown">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Alerts by Country', '\u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062F\u0648\u0644\u0629')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.alertsByCountry).reduce((s,v)=>s+v,0)} total</span>
                      </div>
                      <div className="space-y-1.5">
                        {(() => {
                          const totalCountry = Object.values(analytics.alertsByCountry!).reduce((s,v)=>s+v,0);
                          const maxCountry = Math.max(...Object.values(analytics.alertsByCountry!));
                          const countryFlags: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Syria: '🇸🇾', Iraq: '🇮🇶', Yemen: '🇾🇪', 'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Palestine: '🇵🇸', Jordan: '🇯🇴' };
                          return Object.entries(analytics.alertsByCountry!).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([country, count]) => {
                            const barPct = (count / maxCountry) * 100;
                            const totalPct = totalCountry > 0 ? ((count / totalCountry) * 100).toFixed(0) : '0';
                            const countryColors: Record<string, string> = { Israel: 'bg-blue-500/60', Lebanon: 'bg-emerald-500/60', Iran: 'bg-purple-500/60', Syria: 'bg-yellow-500/60', Iraq: 'bg-orange-500/60', Yemen: 'bg-rose-500/60', 'Saudi Arabia': 'bg-green-500/60', UAE: 'bg-sky-500/60' };
                            const tgCount = analytics.telegramByCountry?.[country] || 0;
                            const evtCount = analytics.eventsByCountry?.[country] || 0;
                            const flag = countryFlags[country] || '';
                            return (
                              <Tooltip key={country}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-default hover:bg-white/[0.03] rounded px-1 py-0.5 transition-colors group">
                                    <span className="text-[11px] leading-none w-4 shrink-0">{flag}</span>
                                    <span className="text-[9px] font-mono text-foreground/60 w-14 truncate">{country}</span>
                                    <div className="flex-1 h-3 bg-muted/30 rounded-sm overflow-hidden relative">
                                      <div className={`h-full ${countryColors[country] || 'bg-blue-500/50'} rounded-sm transition-all`} style={{ width: `${Math.max(4, barPct)}%` }} />
                                    </div>
                                    <span className="text-[8px] font-mono text-foreground/30 w-6 text-right tabular-nums">{totalPct}%</span>
                                    <span className="text-[9px] font-bold font-mono text-foreground/55 w-5 text-right tabular-nums">{count}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                                  <p className="text-foreground/80 font-bold mb-0.5">{flag} {country}</p>
                                  <p className="text-foreground/50">{count} alerts · {totalPct}% of total</p>
                                  {tgCount > 0 && <p className="text-cyan-400/70">{tgCount} Telegram mentions</p>}
                                  {evtCount > 0 && <p className="text-orange-400/70">{evtCount} conflict events</p>}
                                </TooltipContent>
                              </Tooltip>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {analytics.telegramByCountry && Object.keys(analytics.telegramByCountry).length > 0 && (
                    <div data-testid="section-telegram-intel">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Telegram Intel by Country', '\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A \u062A\u064A\u0644\u064A\u063A\u0631\u0627\u0645')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.telegramByCountry).reduce((s,v)=>s+v,0)} mentions</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analytics.telegramByCountry).sort((a,b)=>b[1]-a[1]).map(([country, count]) => {
                          const countryChipColors: Record<string, string> = { Israel: 'bg-blue-950/40 border-blue-500/25 text-blue-300', Lebanon: 'bg-emerald-950/40 border-emerald-500/25 text-emerald-300', Yemen: 'bg-rose-950/40 border-rose-500/25 text-rose-300', Iran: 'bg-purple-950/40 border-purple-500/25 text-purple-300', Syria: 'bg-yellow-950/40 border-yellow-500/25 text-yellow-300' };
                          return (
                            <span key={country} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${countryChipColors[country] || 'bg-white/[0.03] border-white/10 text-foreground/50'}`}>
                              {country.toUpperCase()} {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analytics.regionAnomalies && analytics.regionAnomalies.length > 0 && (
                    <div data-testid="section-region-anomalies">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Anomaly Detection', '\u0631\u0635\u062F \u0627\u0644\u0634\u0630\u0648\u0630')}</span>
                        <div className="flex-1" />
                        <span className="text-[8px] font-mono text-foreground/30">{analytics.regionAnomalies.length} flagged</span>
                      </div>
                      <div className="space-y-1" data-testid="list-anomalies">
                        {analytics.regionAnomalies.map(a => {
                          const isCrit = a.severity === 'critical';
                          const barPct = Math.min(100, Math.round((a.zScore / 4) * 100));
                          return (
                            <div key={a.region} className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${isCrit ? 'bg-red-950/25 border-red-500/25 hover:border-red-500/45' : 'bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40'}`} data-testid={`anomaly-${a.region.toLowerCase().replace(/\s/g, '-')}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCrit ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                              <span className={`text-[10px] font-bold font-mono w-16 truncate ${isCrit ? 'text-red-300' : 'text-amber-300'}`}>{a.region}</span>
                              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isCrit ? 'bg-red-400/65' : 'bg-amber-400/55'}`} style={{ width: `${barPct}%` }} />
                              </div>
                              <div className="flex flex-col items-end gap-0">
                                <span className={`text-[9px] font-black font-mono ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>{a.pctAboveAvg > 0 ? '+' : ''}{a.pctAboveAvg}%</span>
                                <span className="text-[7px] font-mono text-foreground/25">z={a.zScore.toFixed(1)}</span>
                              </div>
                              <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ml-1 ${isCrit ? 'text-red-400 bg-red-950/50 border-red-500/30' : 'text-amber-400 bg-amber-950/40 border-amber-500/25'}`}>{isCrit ? 'CRIT' : 'WARN'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded border border-border bg-muted/20 p-2.5" data-testid="section-quick-stats">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-3 h-3 text-cyan-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/40 font-mono">{t('Session Intelligence Summary', '\u0645\u0644\u062E\u0635 \u0627\u0644\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        { label: t('Regions Affected', '\u0627\u0644\u0645\u0646\u0627\u0637\u0642'), value: String(totalRegions), color: 'text-blue-400' },
                        { label: t('Threat Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u0647\u062F\u064A\u062F'), value: String(totalTypes), color: 'text-purple-400' },
                        { label: t('Avg Response Time', '\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629'), value: `${analytics.avgResponseTime}s`, color: 'text-cyan-400' },
                        { label: t('Intelligence Feeds', '\u062E\u0644\u0627\u0635\u0627\u062A'), value: String(analytics.topSources.length), color: 'text-emerald-400' },
                        { label: t('AI Patterns Found', '\u0623\u0646\u0645\u0627\u0637 \u0630\u0643\u064A\u0629'), value: String(patterns.length), color: 'text-violet-400' },
                        { label: t('False Alarm Cases', '\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629'), value: String(falseAlarms.length), color: 'text-yellow-400' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-0.5">
                          <span className="text-[9px] font-mono text-foreground/35">{row.label}</span>
                          <span className={`text-[10px] font-black font-mono ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {analyticsTab === 'regions' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Alerts by Region', '\u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0645\u0646\u0637\u0642\u0629')}</span>
                      <span className="text-[8px] font-mono text-foreground/25">{regionEntries.reduce((s,[,v])=>s+v,0)} total across {regionEntries.length} regions</span>
                    </div>
                    <div className="space-y-1" data-testid="chart-by-region">
                      {regionEntries.map(([region, count], i) => {
                        const pct = (count / maxRegion) * 100;
                        const barColor = pct > 70 ? 'bg-red-500/60' : pct > 40 ? 'bg-orange-500/55' : 'bg-amber-500/45';
                        const avgPerHour = (analytics.alertTimeline ?? []).length > 0 ? (count / (analytics.alertTimeline ?? []).length).toFixed(1) : '0';
                        return (
                          <Tooltip key={region}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/20 rounded px-1 py-0.5 transition-colors">
                                <span className="text-[8px] font-mono text-foreground/25 w-3">{i+1}</span>
                                <span className="text-[9px] font-mono text-foreground/55 w-20 truncate">{region}</span>
                                <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.max(6, pct)}%` }} />
                                </div>
                                <span className="text-[9px] font-bold font-mono text-foreground/50 w-6 text-right">{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[180px]">
                              <p className="text-foreground/80 font-bold">{region}</p>
                              <p className="text-foreground/50">{count} alerts ({pct.toFixed(0)}% of max)</p>
                              <p className="text-foreground/40">~{avgPerHour} alerts/hour avg</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('By Threat Type', '\u062D\u0633\u0628 \u0646\u0648\u0639 \u0627\u0644\u062A\u0647\u062F\u064A\u062F')}</span>
                      <span className="text-[8px] font-mono text-foreground/25">{typeEntries.length} types</span>
                    </div>
                    <div className="space-y-1" data-testid="chart-by-type">
                      {typeEntries.map(([type, count]) => {
                        const pct = (count / maxType) * 100;
                        const typeColors: Record<string, string> = { missile: 'bg-red-500/60', airstrike: 'bg-orange-500/55', rocket: 'bg-amber-500/50', drone: 'bg-purple-500/55', artillery: 'bg-yellow-500/50', ground_incursion: 'bg-emerald-500/50', gps_jamming: 'bg-cyan-500/50', gps_spoofing: 'bg-cyan-400/50', power: 'bg-yellow-400/50', hospital: 'bg-rose-400/50' };
                        const pctOfTotal = totalAlerts > 0 ? ((count / totalAlerts) * 100).toFixed(1) : '0';
                        return (
                          <Tooltip key={type}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/20 rounded px-1 py-0.5 transition-colors">
                                <span className="text-[9px] font-mono text-foreground/45 w-16 truncate uppercase">{type.replace(/_/g,' ')}</span>
                                <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                                  <div className={`h-full ${typeColors[type] || 'bg-blue-500/50'} rounded-full`} style={{ width: `${Math.max(6, pct)}%` }} />
                                </div>
                                <span className="text-[8px] font-mono text-foreground/30 w-8 text-right">{pctOfTotal}%</span>
                                <span className="text-[9px] font-bold font-mono text-foreground/50 w-6 text-right">{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono">
                              <p className="text-foreground/70">{type.replace(/_/g,' ').toUpperCase()}: {count} events ({pctOfTotal}% of total)</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {analyticsTab === 'sources' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Source Reliability', '\u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631')}</span>
                      <span className="text-[9px] font-mono text-foreground/30">{analytics.topSources.length} feeds</span>
                    </div>
                    <div className="space-y-1" data-testid="table-sources">
                      {analytics.topSources.map((src) => {
                        const reliabilityPct = (src.reliability * 100).toFixed(0);
                        const reliabilityColor = src.reliability > 0.85 ? 'text-emerald-400' : src.reliability > 0.7 ? 'text-yellow-400' : 'text-red-400';
                        const reliabilityBg = src.reliability > 0.85 ? 'bg-emerald-950/30 border-emerald-500/20' : src.reliability > 0.7 ? 'bg-yellow-950/30 border-yellow-500/20' : 'bg-red-950/30 border-red-500/20';
                        const reliabilityLabel = src.reliability > 0.85 ? 'High reliability' : src.reliability > 0.7 ? 'Moderate reliability' : 'Low reliability';
                        const reliabilityBar = src.reliability * 100;
                        return (
                          <Tooltip key={src.channel}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 px-2 py-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-border cursor-default">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.reliability > 0.85 ? 'bg-emerald-400' : src.reliability > 0.7 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-mono text-foreground/65 block truncate">{src.channel}</span>
                                  <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${src.reliability > 0.85 ? 'bg-emerald-400/60' : src.reliability > 0.7 ? 'bg-yellow-400/60' : 'bg-red-400/50'}`} style={{ width: `${reliabilityBar}%` }} />
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono text-foreground/30 shrink-0">{src.count}msg</span>
                                <div className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border shrink-0 ${reliabilityBg} ${reliabilityColor}`}>{reliabilityPct}%</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                              <p className="text-foreground/80 font-bold mb-0.5">{src.channel}</p>
                              <p className={`${reliabilityColor} mb-0.5`}>{reliabilityLabel}</p>
                              <p className="text-foreground/40">{src.count} messages processed</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3 h-3 text-emerald-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/40 font-mono">{t('Source Health Overview', '\u0635\u062D\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631')}</span>
                    </div>
                    {(() => {
                      const highRel = analytics.topSources.filter(s => s.reliability > 0.85).length;
                      const medRel = analytics.topSources.filter(s => s.reliability > 0.7 && s.reliability <= 0.85).length;
                      const lowRel = analytics.topSources.filter(s => s.reliability <= 0.7).length;
                      const totalMsgs = analytics.topSources.reduce((s, src) => s + src.count, 0);
                      const avgRel = analytics.topSources.length > 0 ? (analytics.topSources.reduce((s, src) => s + src.reliability, 0) / analytics.topSources.length * 100).toFixed(1) : '0';
                      return (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">High Reliability</span><span className="text-[10px] font-black font-mono text-emerald-400">{highRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Medium Reliability</span><span className="text-[10px] font-black font-mono text-yellow-400">{medRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Low Reliability</span><span className="text-[10px] font-black font-mono text-red-400">{lowRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Avg Reliability</span><span className="text-[10px] font-black font-mono text-blue-400">{avgRel}%</span></div>
                          <div className="flex items-center justify-between col-span-2 pt-1 border-t border-border"><span className="text-[9px] font-mono text-foreground/35">Total Messages</span><span className="text-[10px] font-black font-mono text-cyan-400">{totalMsgs.toLocaleString()}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {analyticsTab === 'patterns' && (
                <>
                  {patterns.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Detected Patterns', '\u0623\u0646\u0645\u0627\u0637')}</span>
                        <span className="text-[8px] font-mono text-foreground/25 ml-auto">{patterns.length} found</span>
                      </div>
                      <div className="space-y-1.5" data-testid="list-patterns">
                        {patterns.map(p => (
                          <Tooltip key={p.id}>
                            <TooltipTrigger asChild>
                              <div className="p-2.5 rounded bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-default" data-testid={`pattern-${p.id}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                  <span className="text-[11px] font-bold text-purple-300 font-mono uppercase">{p.type.replace(/_/g, ' ')}</span>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${p.confidence > 0.7 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-400'}`}>{(p.confidence * 100).toFixed(0)}%</span>
                                  <span className="ml-auto text-[8px] font-mono text-foreground/30">{timeAgo(p.detectedAt)}</span>
                                </div>
                                <p className="text-[10px] text-foreground/50 leading-relaxed">{p.description}</p>
                                {p.affectedRegions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p.affectedRegions.map(r => (
                                      <span key={r} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-950/30 border border-purple-500/15 text-purple-300/70">{r}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                              <p className="text-foreground/50 mb-0.5">Detected at</p>
                              <p className="text-foreground/80">{new Date(p.detectedAt).toUTCString()}</p>
                              <p className="text-foreground/40 mt-0.5">{p.alertCount} alerts in pattern</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {falseAlarms.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('False Alarm Analysis', '\u062A\u062D\u0644\u064A\u0644 \u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629')}</span>
                        <span className="text-[8px] font-mono text-foreground/25 ml-auto">{falseAlarms.length} analyzed</span>
                      </div>
                      <div className="space-y-1" data-testid="list-false-alarms">
                        {falseAlarms.slice(0, 12).map(fa => (
                          <Tooltip key={fa.alertId}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20 hover:bg-muted/40 transition-colors cursor-default" data-testid={`false-alarm-${fa.alertId}`}>
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

                  {patterns.length === 0 && falseAlarms.length === 0 && (
                    <div className="py-6 text-center">
                      <Brain className="w-6 h-6 text-purple-400/30 mx-auto mb-2" />
                      <span className="text-[10px] font-mono text-foreground/30">{t('No patterns detected yet', '\u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0623\u0646\u0645\u0627\u0637')}</span>
                    </div>
                  )}
                </>
              )}

              {analyticsTab === 'epicfury' && (
                <>
                  <div className="rounded border border-red-500/30 overflow-hidden" style={{background:'linear-gradient(135deg,rgb(127 29 29/0.7),rgb(60 10 10/0.5))'}}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-black text-red-300 uppercase tracking-wider font-mono">Operation Epic Fury</span>
                        <button
                          onClick={fetchEpicFury}
                          disabled={epicFuryLoading}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          style={{background:'hsl(0 40% 25% / 0.6)', border:'1px solid hsl(0 50% 40% / 0.5)', color:'hsl(0 80% 75%)'}}
                        >
                          {epicFuryLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                          {epicFuryLoading ? 'Fetching…' : 'Refresh'}
                        </button>
                      </div>
                      {epicFuryError && <div className="text-[7px] font-mono text-red-400/70 mb-1">Failed to fetch — site may be JS-rendered. Showing last known data.</div>}
                      {epicFuryFetchedAt && !epicFuryError && <div className="text-[7px] font-mono text-emerald-400/60 mb-1">Live data fetched at {epicFuryFetchedAt}</div>}
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Start</div>
                          <div className="text-[11px] font-black font-mono text-foreground/80">28/02/2026</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Day</div>
                          <div className="text-2xl font-black font-mono text-red-400">{epicFuryData?.day ?? 13}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Updated</div>
                          <div className="text-[11px] font-black font-mono text-foreground/80">{epicFuryData?.lastUpdated ?? '13/03/2026'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="w-3.5 h-3.5 text-orange-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Cumulative Metrics</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { label: 'Ballistic Missiles', value: '~1,040', color: 'text-red-400', accent: 'hsl(0 72% 51%)', sub: 'Region-wide' },
                        { label: 'Drones / UAVs', value: '~3,000', color: 'text-yellow-400', accent: 'hsl(48 96% 53%)', sub: 'Region-wide' },
                        { label: 'Missiles to Israel', value: '~200', color: 'text-orange-400', accent: 'hsl(25 95% 53%)', sub: 'Directed' },
                        { label: 'Lebanon Rockets', value: '~25,000', color: 'text-purple-400', accent: 'hsl(270 60% 60%)', sub: 'Cumulative' },
                        { label: 'Countries Attacked', value: '12', color: 'text-blue-400', accent: 'hsl(215 90% 60%)', sub: 'States' },
                        { label: 'Launchers Destroyed', value: '300', color: 'text-emerald-400', accent: 'hsl(160 84% 39%)', sub: 'Confirmed' },
                        { label: 'Air Refueling Ops', value: '12', color: 'text-cyan-400', accent: 'hsl(195 90% 50%)', sub: 'Sorties' },
                      ] as const).map(({ label, value, color, accent, sub }) => (
                        <div key={label} className="rounded overflow-hidden border border-border/50" style={{borderLeft:`3px solid ${accent}`}}>
                          <div className="px-2 py-1.5 bg-muted/30">
                            <div className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none truncate">{label}</div>
                            <div className={`text-lg font-black font-mono leading-tight tabular-nums ${color}`}>{value}</div>
                            <div className="text-[7px] text-foreground/25 font-mono">{sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Interception Events by Country</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { country: 'UAE', value: 1797, ballistic: 229, drones: 1439 },
                        { country: 'Kuwait', value: 682, ballistic: 226, drones: 425 },
                        { country: 'Bahrain', value: 285, ballistic: 86, drones: 173 },
                        { country: 'Qatar', value: 237, ballistic: 131, drones: 63 },
                        { country: 'Saudi Arabia', value: 170, ballistic: 14, drones: 110 },
                        { country: 'Jordan', value: 90, ballistic: 30, drones: 60 },
                        { country: 'Israel', value: 650, ballistic: 400, drones: 250 },
                        { country: 'Oman', value: 15, ballistic: 0, drones: 8 },
                        { country: 'Iraq', value: 12, ballistic: 0, drones: 12 },
                        { country: 'Cyprus', value: 3, ballistic: 2, drones: 1 },
                      ].map(({ country, value, ballistic, drones }) => {
                        const pct = (value / 1797) * 100;
                        return (
                          <div key={country} className="flex items-center gap-2">
                            <span className="text-[9px] text-foreground/60 font-mono w-[90px] truncate">{country}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/30">
                              <div className="h-full rounded-full" style={{width:`${pct}%`, background:'hsl(160 84% 39%)'}} />
                            </div>
                            <span className="text-[9px] text-emerald-400 font-mono font-bold w-[32px] text-right tabular-nums">{value.toLocaleString()}</span>
                            <span className="text-[7px] text-foreground/30 font-mono w-[70px]">{ballistic > 0 ? `${ballistic}B` : ''}{ballistic > 0 && drones > 0 ? '·' : ''}{drones > 0 ? `${drones}D` : ''}</span>
                          </div>
                        );
                      })}
                      <div className="text-[7px] text-foreground/25 font-mono mt-1">B = Ballistic · D = Drones</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Casualty Figures</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { party: 'Israel', killed: epicFuryData?.israelKilled ?? 18, wounded: (epicFuryData?.israelWounded ?? 2745) as number | null, notes: '3,400 displaced · 50,719 alerts' as string | null, color: '#60a5fa' },
                        { party: 'Lebanon', killed: epicFuryData?.lebanonKilled ?? 634, wounded: 1586 as number | null, notes: '750,000 displaced' as string | null, color: '#34d399' },
                        { party: 'Iran', killed: epicFuryData?.iranKilled ?? 1348, wounded: (epicFuryData?.iranWounded ?? 6186) as number | null, notes: '~45 targeted ops (14 senior officials)' as string | null, color: '#ef4444' },
                        { party: 'Middle East (excl. Israel)', killed: 28, wounded: 478 as number | null, notes: null as string | null, color: '#f97316' },
                        { party: 'United States', killed: 7, wounded: null as number | null, notes: null as string | null, color: '#a78bfa' },
                      ].map(({ party, killed, wounded, notes, color }) => (
                        <div key={party} className="rounded p-2.5 bg-muted/20 border border-border/40">
                          <span className="text-[10px] font-bold font-mono" style={{ color }}>{party}</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            <div className="flex flex-col">
                              <span className="text-[7px] text-foreground/35 uppercase tracking-wider">Killed</span>
                              <span className="text-[13px] font-black font-mono text-red-400 tabular-nums leading-tight">{killed.toLocaleString()}</span>
                            </div>
                            {wounded != null && (
                              <div className="flex flex-col">
                                <span className="text-[7px] text-foreground/35 uppercase tracking-wider">Wounded</span>
                                <span className="text-[13px] font-black font-mono text-orange-400 tabular-nums leading-tight">{wounded.toLocaleString()}</span>
                              </div>
                            )}
                            {notes && <span className="text-[8px] font-mono text-foreground/30 self-end pb-0.5">{notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Day 13 Activity (12/03/2026)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className="rounded p-2 bg-muted/20 border border-border/40">
                        <div className="text-[7px] text-foreground/35 uppercase tracking-wider">Ballistic Missiles</div>
                        <div className="text-xl font-black font-mono text-red-400 tabular-nums">25</div>
                      </div>
                      <div className="rounded p-2 bg-muted/20 border border-border/40">
                        <div className="text-[7px] text-foreground/35 uppercase tracking-wider">Drones</div>
                        <div className="text-xl font-black font-mono text-yellow-400 tabular-nums">65</div>
                      </div>
                    </div>
                    <div className="rounded p-2 bg-muted/20 border border-border/40">
                      <div className="text-[7px] text-foreground/35 uppercase tracking-wider mb-1">Targets Hit</div>
                      <div className="text-[8px] font-mono text-foreground/60">Jerusalem · Shaybah Field · UAE Ministry of Defense</div>
                    </div>
                  </div>

                  <div className="text-[7px] text-foreground/25 text-center font-mono pt-1">
                    Source: littlemoiz.com · IDF Spokesperson · INSS · Ynet · Day 13 (13/03/2026)
                  </div>
                </>
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

function RocketStatsPanel({ language, onClose, onMaximize, isMaximized, stats }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; stats: RocketStats | null }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [activeTab, setActiveTab] = useState<'overview' | 'gcc' | 'lebanon' | 'epic' | 'live'>('overview');
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [liveFeedLoading, setLiveFeedLoading] = useState(false);
  const [liveFeedError, setLiveFeedError] = useState(false);
  const [epicData, setEpicData] = useState<Record<string, any> | null>(null);
  const [epicLoading, setEpicLoading] = useState(false);
  const [epicFetchedAt, setEpicFetchedAt] = useState<string | null>(null);
  const [epicError, setEpicError] = useState(false);
  const fetchEpic = useCallback(async () => {
    setEpicLoading(true);
    setEpicError(false);
    try {
      const res = await fetch('/api/epic-fury');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data.error) { setEpicData(data); setEpicFetchedAt(new Date().toLocaleTimeString()); }
      else setEpicError(true);
    } catch { setEpicError(true); }
    setEpicLoading(false);
  }, []);
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
      <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{ background: 'hsl(var(--muted))' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.totalLaunches / Math.max(maxLaunches, 1)) * 100)}%`, background: c.active ? barColor : barColor + '55' }} />
      </div>
      <span className="text-foreground/80 font-mono font-bold w-[36px] text-right">{c.totalLaunches.toLocaleString()}</span>
      {c.active && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: barColor }} />}
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
    { id: 'epic',     label: t('Op. Fury','شاغت') },
    { id: 'live',     label: t('Live','مباشر') },
  ] as const;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-rocketstats">
      {/* Header */}
      <div className="panel-drag-handle h-9 px-3 flex items-center gap-2 shrink-0 relative cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/25" />
        <Rocket className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[10px] font-bold tracking-wider text-foreground/90 uppercase font-mono flex-1">{t('Launch Statistics', 'إحصائيات الإطلاق')}</span>
        <span className="text-[7px] text-yellow-500/70 font-mono px-1 py-0.5 rounded" style={{background:'hsl(45 80% 30% / 0.15)', border:'1px solid hsl(45 60% 40% / 0.2)'}} data-testid="badge-estimated">{t('EST.', 'تقدير')}</span>
        {stats && <span className="text-[8px] text-primary/60 font-mono">{new Date(stats.generatedAt).toLocaleTimeString()}</span>}
        <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={() => onMaximize?.()} />
        <PanelMinimizeButton onMinimize={() => onClose?.()} />
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{background:'hsl(var(--muted))', borderColor:'hsl(var(--border))'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
            style={{ color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', borderBottom: activeTab === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent', background: activeTab === tab.id ? 'hsl(var(--primary) / 0.08)' : 'transparent' }}>
            {tab.id === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2" style={{background:'hsl(var(--background))'}}>
        {!stats && activeTab !== 'live' ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : activeTab === 'overview' ? (
          <>
            <div className="grid grid-cols-4 gap-1.5" data-testid="stats-summary">
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[15px] font-black text-primary font-mono" data-testid="text-total-launches">{stats!.totalLaunches.toLocaleString()}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Total Launches', 'إجمالي')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(120 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-emerald-400 font-mono" data-testid="text-intercepted">{stats!.totalIntercepted.toLocaleString()}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Intercepted', 'اعتراض')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(0 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-orange-400 font-mono" data-testid="text-last-24h">{stats!.last24h}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Last 24h', 'آخر 24 ساعة')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(45 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-yellow-400 font-mono" data-testid="text-active-fronts">{stats!.activeFronts}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Active Fronts', 'جبهات')}</div>
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Intercept Rate', 'نسبة الاعتراض')}</span>
                <span className="text-[11px] font-black text-emerald-400 font-mono" data-testid="text-intercept-rate">{(stats!.interceptRate * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                <div className="h-full rounded-full transition-[width] duration-700" style={{width:`${stats!.interceptRate * 100}%`, background:'linear-gradient(90deg, hsl(120 70% 35%), hsl(120 80% 45%))'}} />
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(0 30% 16% / 0.4)', border:'1px solid hsl(0 40% 30% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">{t(`→ Israel (${corridorsToIsrael.reduce((s,c)=>s+c.totalLaunches,0).toLocaleString()})`, `نحو إسرائيل`)}</span>
              </div>
              <div className="space-y-0.5" data-testid="corridors-to-israel">
                {corridorsToIsrael.slice(0, 7).map((c, i) => (
                  <CorridorRow key={i} c={c} barColor="#ef4444" maxLaunches={corridorsToIsrael[0]?.totalLaunches || 1} />
                ))}
              </div>
              <TypeBreakdown corridors={corridorsToIsrael} color="#ef4444" />
            </div>

            <div className="rounded p-2" style={{background:'hsl(210 30% 16% / 0.4)', border:'1px solid hsl(210 40% 30% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{t(`From Israel (${corridorsFromIsrael.reduce((s,c)=>s+c.totalLaunches,0).toLocaleString()})`, `من إسرائيل`)}</span>
              </div>
              <div className="space-y-0.5" data-testid="corridors-from-israel">
                {corridorsFromIsrael.slice(0, 7).map((c, i) => (
                  <CorridorRow key={i} c={c} barColor="#60a5fa" maxLaunches={corridorsFromIsrael[0]?.totalLaunches || 1} />
                ))}
              </div>
              <TypeBreakdown corridors={corridorsFromIsrael} color="#60a5fa" />
            </div>

            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Rocket className="w-3 h-3 text-primary/70" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('By Launch Origin', 'حسب مصدر الإطلاق')}</span>
              </div>
              <div className="space-y-1" data-testid="origin-chart">
                {originEntries.map(([origin, count], i) => (
                  <div key={origin} className="flex items-center gap-1.5" data-testid={`origin-bar-${i}`}>
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{origin}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                      <div className="h-full rounded-full transition-[width] duration-500" style={{width:`${(count / maxOrigin) * 100}%`, background: count === maxOrigin ? 'hsl(185 100% 42%)' : 'hsl(185 60% 35%)'}} />
                    </div>
                    <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Target className="w-3 h-3 text-red-400/70" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Top Targets', 'الأهداف الرئيسية')}</span>
              </div>
              <div className="space-y-1" data-testid="target-chart">
                {targetEntries.map(([target, count], i) => (
                  <div key={target} className="flex items-center gap-1.5" data-testid={`target-bar-${i}`}>
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{target}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                      <div className="h-full rounded-full transition-[width] duration-500" style={{width:`${(count / maxTarget) * 100}%`, background: count === maxTarget ? 'hsl(0 70% 50%)' : 'hsl(0 50% 35%)'}} />
                    </div>
                    <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded p-1.5" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Peak Hour', 'ساعة الذروة')}</div>
                <div className="text-[12px] font-bold text-primary font-mono" data-testid="text-peak-hour">{stats!.peakHour} UTC</div>
              </div>
              <div className="rounded p-1.5" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Last Hour', 'الساعة الأخيرة')}</div>
                <div className="text-[12px] font-bold font-mono" data-testid="text-last-1h">
                  <span className={stats!.last1h > 5 ? 'text-red-400' : stats!.last1h > 0 ? 'text-orange-400' : 'text-green-400'}>{stats!.last1h}</span>
                  <span className="text-[8px] text-foreground/40 ml-1">{t('launches', 'إطلاقات')}</span>
                </div>
              </div>
            </div>

            <div className="text-[7px] text-foreground/30 text-center font-mono" data-testid="text-rocket-generated-at">
              {t('Origins inferred from geography. Intercepts estimated. Sources: ACLED, UN PoE, IDF, MOFA.', 'المصادر مستنتجة. تقديرية. ACLED، فريق خبراء الأمم المتحدة.')}
            </div>
          </>
        ) : activeTab === 'gcc' ? (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('GCC Attacks Total','هجمات الخليج'), value: totalGCCHits.toLocaleString(), color: '#f97316' },
                { label: t('Intercepted','اعتراض'), value: totalGCCIntercepted.toLocaleString(), color: '#34d399' },
                { label: t('Intercept Rate','نسبة اعتراض'), value: totalGCCHits > 0 ? `${((totalGCCIntercepted/totalGCCHits)*100).toFixed(0)}%` : '—', color: '#60a5fa' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:`1px solid ${color}28`}}>
                  <div className="text-[14px] font-black font-mono" style={{ color }}>{value}</div>
                  <div className="text-[7px] text-foreground/50 uppercase tracking-wider leading-tight mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded p-2 text-[8px] font-mono text-foreground/50 leading-relaxed" style={{background:'hsl(45 30% 15% / 0.3)', border:'1px solid hsl(45 40% 25% / 0.3)'}}>
              <span className="text-yellow-400 font-bold">{t('CONTEXT','السياق')}: </span>
              {t('Houthi forces have fired 4,000+ ballistic missiles, cruise missiles, and UAVs at Saudi Arabia since 2015 (UN Panel of Experts). UAE directly attacked Jan 2022. Red Sea shipping attacks began late 2023 targeting 70+ vessels.','الحوثيون أطلقوا 4,000+ صاروخ وطائرة مسيّرة على السعودية منذ 2015. هجمات البحر الأحمر استهدفت 70+ سفينة منذ أواخر 2023.')}
            </div>

            <div className="rounded p-2" style={{background:'hsl(25 30% 15% / 0.5)', border:'1px solid hsl(25 40% 28% / 0.4)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-orange-400" />
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">{t(`Attacks on GCC States (${totalGCCHits.toLocaleString()})`,`هجمات على الخليج`)}</span>
              </div>
              <div className="space-y-0.5">
                {gccIncoming.sort((a,b) => b.totalLaunches - a.totalLaunches).map((c, i) => <CorridorRow key={i} c={c} barColor="#f97316" maxLaunches={gccIncoming[0]?.totalLaunches || 1} />)}
              </div>
              <TypeBreakdown corridors={gccIncoming} color="#f97316" />
            </div>

            {gccOutgoing.length > 0 && (
              <div className="rounded p-2" style={{background:'hsl(200 30% 14% / 0.5)', border:'1px solid hsl(200 40% 25% / 0.4)'}}>
                <div className="flex items-center gap-1 mb-1.5">
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{t('Saudi/Coalition Strikes on Yemen','ضربات التحالف على اليمن')}</span>
                </div>
                <div className="space-y-0.5">
                  {gccOutgoing.map((c, i) => <CorridorRow key={i} c={c} barColor="#22d3ee" maxLaunches={gccOutgoing[0]?.totalLaunches || 1} />)}
                </div>
              </div>
            )}

            {(() => {
              const usYemen = (stats?.corridors || []).filter(c => c.originCountry === 'United States' && c.targetCountry === 'Yemen');
              if (!usYemen.length) return null;
              return (
                <div className="rounded p-2" style={{background:'hsl(var(--muted) / 0.5)', border:'1px solid hsl(var(--border))'}}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Globe className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{t('US/Coalition → Yemen','الولايات المتحدة ← اليمن')}</span>
                  </div>
                  <div className="space-y-0.5">
                    {usYemen.map((c, i) => <CorridorRow key={i} c={c} barColor="#60a5fa" maxLaunches={usYemen[0]?.totalLaunches || 1} />)}
                  </div>
                </div>
              );
            })()}

            <div className="rounded p-2" style={{background:'hsl(var(--muted) / 0.4)', border:'1px solid hsl(var(--border))'}}>
              <div className="text-[9px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">{t('GCC Target Breakdown','توزيع الهجمات')}</div>
              {(['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman','International'] as const).map(country => {
                const total = gccIncoming.filter(c => c.targetCountry === country).reduce((s, c) => s + c.totalLaunches, 0);
                if (!total) return null;
                const allTotals = ['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman','International'].map(c2 => gccIncoming.filter(c => c.targetCountry === c2).reduce((s, c) => s + c.totalLaunches, 0));
                const maxT = Math.max(...allTotals, 1);
                return (
                  <div key={country} className="flex items-center gap-1.5 mb-0.5">
                    {getCountryIcon(country)}
                    <span className="text-[8px] text-foreground/60 font-mono w-[90px] truncate">{country}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                      <div className="h-full rounded-full" style={{width:`${(total/maxT)*100}%`, background:'#f97316'}} />
                    </div>
                    <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right">{total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[7px] text-foreground/30 text-center font-mono">{t('Sources: UN PoE on Yemen 2015–2024, ACLED, Saudi MOFA, Bellingcat, CSIS Missile Defense Project.','المصادر: فريق الخبراء الأممي، ACLED، CSIS.')}</div>
          </>
        ) : activeTab === 'lebanon' ? (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: t('Hezbollah → Israel','حزب الله ← إسرائيل'), value: totalLblFired.toLocaleString(), color: '#f97316', sub: t('Since Oct 7, 2023','منذ 7 أكتوبر 2023') },
                { label: t('Israel → Lebanon','إسرائيل ← لبنان'), value: totalLblReceived.toLocaleString(), color: '#60a5fa', sub: t('Since Oct 7, 2023','منذ 7 أكتوبر 2023') },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:`1px solid ${color}28`}}>
                  <div className="text-[16px] font-black font-mono" style={{ color }}>{value}</div>
                  <div className="text-[7px] text-foreground/60 font-bold uppercase tracking-wider">{label}</div>
                  <div className="text-[6px] text-foreground/30 font-mono mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            <div className="rounded p-2 text-[8px] font-mono text-foreground/50 leading-relaxed" style={{background:'hsl(120 20% 12% / 0.4)', border:'1px solid hsl(120 30% 20% / 0.3)'}}>
              <span className="text-green-400 font-bold">{t('CONTEXT','السياق')}: </span>
              {t('Since Oct 7 2023, Hezbollah fired ~9,500 rockets, missiles & drones at northern Israel. Israel launched 3,000+ airstrikes on Lebanon in Sep–Oct 2024. Hezbollah arsenal estimated at 150,000+ total projectiles.','منذ 7 أكتوبر 2023 أطلق حزب الله ~9,500 صاروخ وطائرة. إسرائيل نفّذت 3,000+ غارة في سبتمبر-أكتوبر 2024.')}
            </div>

            <div className="rounded p-2" style={{background:'hsl(0 25% 15% / 0.5)', border:'1px solid hsl(0 40% 28% / 0.4)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">{t(`Hezbollah → Israel (${totalLblFired.toLocaleString()})`,`حزب الله → إسرائيل`)}</span>
              </div>
              <div className="space-y-0.5">
                {lblToIsrael.sort((a,b) => b.totalLaunches - a.totalLaunches).map((c, i) => <CorridorRow key={i} c={c} barColor="#ef4444" maxLaunches={lblToIsrael[0]?.totalLaunches || 1} />)}
              </div>
              <TypeBreakdown corridors={lblToIsrael} color="#ef4444" />
            </div>

            <div className="rounded p-2" style={{background:'hsl(210 25% 14% / 0.5)', border:'1px solid hsl(210 40% 25% / 0.4)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <ArrowRight className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{t(`IDF → Lebanon (${totalLblReceived.toLocaleString()})`,`الجيش الإسرائيلي → لبنان`)}</span>
              </div>
              <div className="space-y-0.5">
                {lblFromIsrael.sort((a,b) => b.totalLaunches - a.totalLaunches).map((c, i) => <CorridorRow key={i} c={c} barColor="#60a5fa" maxLaunches={lblFromIsrael[0]?.totalLaunches || 1} />)}
              </div>
              <TypeBreakdown corridors={lblFromIsrael} color="#60a5fa" />
            </div>

            <div className="rounded p-2" style={{background:'hsl(var(--muted) / 0.4)', border:'1px solid hsl(var(--border))'}}>
              <div className="text-[9px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">{t('Hezbollah Arsenal Estimate','تقديرات ترسانة حزب الله')}</div>
              {[
                { label: t('Short-range rockets (< 40km)','قصيرة المدى'), value: '100,000+', color: '#f97316' },
                { label: t('Medium-range rockets (40–200km)','متوسطة المدى'), value: '45,000+', color: '#ef4444' },
                { label: t('Long-range / precision (> 200km)','دقيقة بعيدة المدى'), value: '5,000+', color: '#dc2626' },
                { label: t('UAVs / Drones','طائرات مسيّرة'), value: '2,000+', color: '#facc15' },
                { label: t('Anti-tank missiles (Kornet etc.)','مضادة للدروع'), value: '10,000+', color: '#a78bfa' },
                { label: t('Anti-ship missiles (Yakhont/C-802)','مضادة للسفن'), value: '~100', color: '#7c3aed' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-0.5">
                  <span className="text-[8px] text-foreground/50 font-mono flex-1 truncate pr-2">{label}</span>
                  <span className="text-[9px] font-bold font-mono" style={{ color }}>{value}</span>
                </div>
              ))}
              <div className="text-[7px] text-foreground/25 font-mono mt-1.5">{t("Source: IDF, CSIS, IISS Military Balance, Jane's Defence","المصدر: الجيش الإسرائيلي، CSIS، IISS")}</div>
            </div>

            <div className="rounded p-2" style={{background:'hsl(var(--muted) / 0.4)', border:'1px solid hsl(var(--border))'}}>
              <div className="text-[9px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">{t('Key Escalation Points','نقاط التصعيد الرئيسية')}</div>
              {[
                { date: 'Oct 8 2023', event: t('Hezbollah opens northern front in solidarity with Gaza','حزب الله يفتح الجبهة الشمالية'), color: '#ef4444' },
                { date: 'Jan 2–3 2024', event: t('IDF kills Saleh Arouri (Hamas) in Beirut strike','الجيش الإسرائيلي يقتل صالح العاروري في بيروت'), color: '#f97316' },
                { date: 'Apr 13 2024', event: t('Iran direct attack on Israel: 300+ drones/missiles','إيران تهاجم إسرائيل مباشرة بـ 300+ صاروخ'), color: '#dc2626' },
                { date: 'Jul 30 2024', event: t('IDF kills Fuad Shukr (Hezbollah cmdr) in Beirut','مقتل فؤاد شكر في بيروت'), color: '#f97316' },
                { date: 'Sep 17 2024', event: t('Pager/walkie-talkie attacks: 1,000+ Hezbollah casualties','هجمات أجهزة النداء: 1000+ إصابة'), color: '#facc15' },
                { date: 'Sep 27 2024', event: t('IDF kills Nasrallah (Hezbollah SG) in Dahieh','مقتل نصر الله في ضاحية بيروت'), color: '#dc2626' },
                { date: 'Oct 1 2024', event: t('Iran fires 181 ballistic missiles at Israel','إيران تطلق 181 صاروخاً باليستياً'), color: '#dc2626' },
                { date: 'Nov 27 2024', event: t('Lebanon–Israel ceasefire agreement','اتفاق وقف إطلاق النار لبنان-إسرائيل'), color: '#34d399' },
              ].map(({ date, event, color }) => (
                <div key={date} className="flex gap-2 mb-1 last:mb-0">
                  <span className="text-[7px] font-mono text-foreground/35 shrink-0 pt-0.5 w-[68px]">{date}</span>
                  <div className="w-px shrink-0 rounded-full self-stretch" style={{ background: color + '50' }} />
                  <span className="text-[8px] font-mono text-foreground/60 leading-tight">{event}</span>
                </div>
              ))}
            </div>
            <div className="text-[7px] text-foreground/30 text-center font-mono">{t('Sources: IDF, UNIFIL, NowLebanon, LBCI, Alma Research, CSIS.','المصادر: الجيش الإسرائيلي، يونيفيل، ناو لبنان، LBCI، Alma.')}</div>
          </>
        ) : activeTab === 'epic' ? (
          <>
            {/* Operation Header */}
            <div className="rounded p-2" style={{background:'hsl(0 30% 16% / 0.5)', border:'1px solid hsl(0 50% 30% / 0.4)'}}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider font-mono">{t('Operation Epic Fury','عملية شاغت الاري')}</span>
                <button
                  onClick={fetchEpic}
                  disabled={epicLoading}
                  className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  style={{background:'hsl(0 40% 20% / 0.7)', border:'1px solid hsl(0 50% 35% / 0.5)', color:'hsl(0 70% 70%)'}}
                >
                  {epicLoading ? <Loader2 className="w-2 h-2 animate-spin" /> : <Download className="w-2 h-2" />}
                  {epicLoading ? t('Fetching…','جلب…') : t('Refresh','تحديث')}
                </button>
              </div>
              {epicError && <div className="text-[7px] font-mono text-red-400/60 mb-1">{t('Fetch failed — site may be JS-rendered','فشل الجلب')}</div>}
              {epicFetchedAt && !epicError && <div className="text-[7px] font-mono text-emerald-400/50 mb-1">{t(`Live · fetched ${epicFetchedAt}`,`مباشر · ${epicFetchedAt}`)}</div>}
              <div className="grid grid-cols-3 gap-1 text-center mt-1.5">
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Start','البداية')}</div>
                  <div className="text-[9px] font-bold font-mono text-foreground/80">28/02/2026</div>
                </div>
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Day','اليوم')}</div>
                  <div className="text-[15px] font-black font-mono text-red-400">{epicData?.day ?? 13}</div>
                </div>
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Updated','تحديث')}</div>
                  <div className="text-[9px] font-bold font-mono text-foreground/80">13/03/2026</div>
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('Ballistic Missiles','صواريخ باليستية'), value: '~1,040', color: '#ef4444', sub: t('Region-wide','المنطقة') },
                { label: t('Drones / UAVs','طائرات مسيّرة'), value: '~3,000', color: '#facc15', sub: t('Region-wide','المنطقة') },
                { label: t('Missiles → Israel','صواريخ نحو إسرائيل'), value: '~200', color: '#f97316', sub: t('Directed','موجّهة') },
                { label: t('Lebanon Rockets','صواريخ لبنان'), value: '~25,000', color: '#a78bfa', sub: t('Cumulative','تراكمي') },
                { label: t('Countries Attacked','دول مهاجَمة'), value: '12', color: '#60a5fa', sub: t('States','دول') },
                { label: t('Launchers Destroyed','قاذفات مدمّرة'), value: '300', color: '#34d399', sub: t('Confirmed','مؤكّد') },
                { label: t('Air Refueling Ops','تزود جوي'), value: '12', color: '#22d3ee', sub: t('Sorties','طلعة') },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:`1px solid ${color}28`}}>
                  <div className="text-[13px] font-black font-mono" style={{ color }}>{value}</div>
                  <div className="text-[7px] text-foreground/60 font-bold uppercase tracking-wider leading-tight">{label}</div>
                  <div className="text-[6px] text-foreground/30 font-mono mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Interception Events by Country */}
            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Interception Events by Country','حوادث الاعتراض بالدولة')}</span>
              </div>
              {[
                { country: 'UAE', value: 1797, ballistic: 229, drones: 1439 },
                { country: 'Israel', value: 650, ballistic: 400, drones: 250 },
                { country: 'Kuwait', value: 682, ballistic: 226, drones: 425 },
                { country: 'Bahrain', value: 285, ballistic: 86, drones: 173 },
                { country: 'Qatar', value: 237, ballistic: 131, drones: 63 },
                { country: 'Saudi Arabia', value: 170, ballistic: 14, drones: 110 },
                { country: 'Jordan', value: 90, ballistic: 30, drones: 60 },
                { country: 'Oman', value: 15, ballistic: 0, drones: 8 },
                { country: 'Iraq', value: 12, ballistic: 0, drones: 12 },
                { country: 'Cyprus', value: 3, ballistic: 2, drones: 1 },
              ].map(({ country, value, ballistic, drones }, _i, arr) => {
                const max = arr[0].value;
                return (
                  <div key={country} className="flex items-center gap-1 mb-0.5">
                    {getCountryIcon(country)}
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{country}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                      <div className="h-full rounded-full" style={{width:`${(value/max)*100}%`, background:'#34d399'}} />
                    </div>
                    <span className="text-[8px] text-emerald-400 font-mono font-bold w-[30px] text-right">{value.toLocaleString()}</span>
                    <span className="text-[6px] text-foreground/25 font-mono w-[48px] text-right">{ballistic > 0 ? `${ballistic}B` : ''}{ballistic > 0 && drones > 0 ? '/' : ''}{drones > 0 ? `${drones}D` : ''}</span>
                  </div>
                );
              })}
              <div className="text-[7px] text-foreground/25 font-mono mt-1">{t('B = Ballistic · D = Drones','ب = باليستي · م = مسيّر')}</div>
            </div>

            {/* Day 13 Activity */}
            <div className="rounded p-2" style={{background:'hsl(45 30% 14% / 0.4)', border:'1px solid hsl(45 40% 25% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">{t('Day 13 Activity (12/03/2026)','نشاط اليوم 13')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(0 40% 30% / 0.3)'}}>
                  <div className="text-[15px] font-black text-red-400 font-mono">25</div>
                  <div className="text-[7px] text-foreground/40 uppercase tracking-wider">{t('Ballistic','باليستي')}</div>
                </div>
                <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(48 40% 30% / 0.3)'}}>
                  <div className="text-[15px] font-black text-yellow-400 font-mono">65</div>
                  <div className="text-[7px] text-foreground/40 uppercase tracking-wider">{t('Drones','مسيّرات')}</div>
                </div>
              </div>
              <div className="text-[7px] font-mono text-foreground/40 leading-relaxed">
                <span className="text-yellow-400/70 font-bold">{t('Targets: ','الأهداف: ')}</span>
                {t('Jerusalem · Shaybah Field · UAE Ministry of Defense','القدس · حقل الشيبة · وزارة الدفاع الإماراتية')}
              </div>
            </div>

            {/* Casualties */}
            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Casualty Figures','الخسائر البشرية')}</span>
              </div>
              {[
                { party: 'Israel', killed: epicData?.israelKilled ?? 18, wounded: (epicData?.israelWounded ?? 2745) as number | null, extra: '3,400 displaced · 50,719 alerts', color: '#60a5fa' },
                { party: 'Lebanon', killed: epicData?.lebanonKilled ?? 634, wounded: 1586 as number | null, extra: '750,000 displaced', color: '#34d399' },
                { party: 'Iran', killed: epicData?.iranKilled ?? 1348, wounded: (epicData?.iranWounded ?? 6186) as number | null, extra: '~45 targeted ops · 14 senior officials', color: '#ef4444' },
                { party: 'Middle East (excl. IL)', killed: 28, wounded: 478 as number | null, extra: null as string | null, color: '#f97316' },
                { party: 'United States', killed: 7, wounded: null as number | null, extra: null as string | null, color: '#a78bfa' },
              ].map(({ party, killed, wounded, extra, color }) => (
                <div key={party} className="mb-1.5 last:mb-0 pb-1.5 last:pb-0" style={{borderBottom:'1px solid hsl(var(--border) / 0.5)'}}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {getCountryIcon(party)}
                    <span className="text-[9px] font-bold font-mono" style={{ color }}>{party}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-4">
                    <span className="text-[8px] font-mono text-foreground/40">{t('Killed','قتلى')}: <span className="text-red-400 font-bold">{killed.toLocaleString()}</span></span>
                    {wounded != null && <span className="text-[8px] font-mono text-foreground/40">{t('Wounded','جرحى')}: <span className="text-orange-400 font-bold">{wounded.toLocaleString()}</span></span>}
                    {extra && <span className="text-[8px] font-mono text-foreground/30">{extra}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[7px] text-foreground/30 text-center font-mono">{t('Source: littlemoiz.com · IDF Spokesperson · INSS · Ynet · Day 13 (13/03/2026)','المصدر: littlemoiz.com · المتحدث الإسرائيلي · INSS · يديعوت')}</div>
          </>
        ) : (
          /* Live Feed */
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-foreground/60 uppercase tracking-wider">{t('Live Conflict Intelligence','مصدر الاستخبارات المباشر')}</span>
            </div>
            <div className="text-[7px] font-mono text-foreground/30 mb-2">{t('Filtered for GCC & Lebanon attack events · GDELT + NewsAPI + GNews','مُرشَّح · GDELT + NewsAPI + GNews')}</div>

            {liveFeedLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                <span className="text-[9px] font-mono text-foreground/40">{t('Fetching live data…','جلب البيانات…')}</span>
              </div>
            )}
            {liveFeedError && (
              <div className="rounded p-3 text-center" style={{background:'hsl(var(--destructive) / 0.08)', border:'1px solid hsl(var(--destructive) / 0.25)'}}>
                <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <div className="text-[8px] font-mono text-red-400">{t('Failed to fetch live feed. API keys may be required.','فشل في جلب البيانات. قد تحتاج مفاتيح API.')}</div>
              </div>
            )}
            {!liveFeedLoading && !liveFeedError && liveFeed.length === 0 && (
              <div className="rounded p-3 text-center" style={{background:'hsl(var(--muted) / 0.3)', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[8px] font-mono text-foreground/40">{t('No recent conflict events found. Feed refreshes every 30s.','لا أحداث حديثة. يتجدد كل 30 ثانية.')}</div>
              </div>
            )}
            {liveFeed.map((item: any) => {
              const color = attackTypeColor(item.attackType);
              const label = attackTypeLabel(item.attackType);
              const ageMin = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              const ageStr = ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`;
              const relevanceBadge = item.relevance === 'gcc' ? { text: 'GCC', color: '#f97316' }
                : item.relevance === 'lebanon' ? { text: 'LBN', color: '#34d399' }
                : item.relevance === 'both' ? { text: 'MULTI', color: '#facc15' } : null;
              return (
                <div key={item.id} className="rounded p-2" style={{background:'hsl(var(--muted) / 0.5)', border:`1px solid ${color}20`}}>
                  <div className="flex items-start gap-1.5">
                    <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                      <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded" style={{background: color + '20', color, border:`1px solid ${color}35`}}>{label}</span>
                      {relevanceBadge && <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded text-center" style={{background: relevanceBadge.color + '20', color: relevanceBadge.color, border:`1px solid ${relevanceBadge.color}35`}}>{relevanceBadge.text}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.url
                        ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-foreground/80 leading-tight hover:text-primary transition-colors line-clamp-2 block">{item.title}</a>
                        : <p className="text-[9px] font-mono text-foreground/80 leading-tight line-clamp-2">{item.title}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7px] font-mono text-foreground/35">{item.source}</span>
                        <span className="text-[7px] font-mono text-foreground/25">{ageStr}</span>
                        {item.url && <ExternalLink className="w-2.5 h-2.5 text-foreground/20" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {liveFeed.length > 0 && (
              <button className="w-full py-1.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all hover:bg-white/5"
                style={{border:'1px solid hsl(var(--border))', color:'hsl(185 60% 45%)'}}
                onClick={() => { liveFetchedRef.current = false; setLiveFeed([]); setActiveTab('overview'); setTimeout(() => setActiveTab('live'), 50); }}>
                {t('Refresh Feed','تحديث')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Prediction Panel ────────────────────────────────────────────────────────
function AIPredictionPanel({ language, onClose, onMaximize, isMaximized, prediction, alerts: liveAlerts = [], sirens: liveSirens = [], flights: liveFlights = [], telegramMessages: liveTelegram = [], events: liveEvents = [], commodities: liveCommodities = [], ships: liveShips = [], thermalHotspots: liveThermal = [] }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  prediction: AttackPrediction | null;
  alerts?: RedAlert[];
  sirens?: SirenAlert[];
  flights?: FlightData[];
  telegramMessages?: TelegramMessage[];
  events?: ConflictEvent[];
  commodities?: CommodityData[];
  ships?: ShipData[];
  thermalHotspots?: ThermalHotspot[];
}) {
  const [activeTab, setActiveTab] = useState<'forecast' | 'vectors' | 'pattern' | 'intel' | 'ask'>('forecast');

  // ── ASK AI Chat State ──
  type AIChatModel = 'claude' | 'openai' | 'grok' | 'gemini';
  interface ChatMsg { role: 'user' | 'ai'; text: string; model?: AIChatModel; ts: number; }
  const [chatModel, setChatModel] = useState<AIChatModel>('claude');
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const AI_MODELS: { id: AIChatModel; label: string; color: string; icon: string; short: string }[] = [
    { id: 'claude', label: 'Claude Opus', color: '#a78bfa', icon: '🔮', short: 'Claude' },
    { id: 'openai', label: 'GPT-4.1',    color: '#4ade80', icon: '🤖', short: 'GPT-4' },
    { id: 'grok',   label: 'Grok 3',     color: '#60a5fa', icon: '⚡', short: 'Grok'  },
    { id: 'gemini', label: 'Gemini Flash',color: '#fb923c', icon: '💎', short: 'Gemini'},
  ];

  const sendQuestion = async (q?: string) => {
    const question = (q || chatInput).trim();
    if (!question || chatLoading) return;
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', text: question, ts: Date.now() }]);
    setChatLoading(true);
    setStreamingText('');

    try {
      const resp = await fetch('/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          model: chatModel,
          clientContext: prediction ? {
            threatLevel: prediction.overallThreatLevel,
            confidence: prediction.confidence,
            nextTarget: prediction.nextLikelyTarget,
            nextAttackWindow: prediction.nextAttackWindow,
            locationProbabilities: prediction.locationProbabilities?.slice(0, 5),
            escalationVector: prediction.escalationVector,
            velocity30m: prediction.dataPoints?.velocity30m,
            velocityPerHour: prediction.dataPoints?.velocityPerHour,
            isEscalating: prediction.dataPoints?.isEscalating,
          } : undefined,
        }),
      });
      if (!resp.body) throw new Error('No response body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) { accumulated = `Error: ${parsed.error}`; break; }
            if (parsed.text) { accumulated += parsed.text; setStreamingText(accumulated); }
          } catch {}
        }
      }

      const finalText = accumulated || '(no response)';
      setChatHistory(h => [...h, { role: 'ai', text: finalText, model: chatModel, ts: Date.now() }]);
      setStreamingText('');
    } catch (err: any) {
      setChatHistory(h => [...h, { role: 'ai', text: `Error: ${err?.message || 'Failed to connect'}`, model: chatModel, ts: Date.now() }]);
      setStreamingText('');
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const threatColor = (level: string) => ({
    EXTREME: 'text-red-400', HIGH: 'text-orange-400', ELEVATED: 'text-yellow-400',
    MODERATE: 'text-blue-400', LOW: 'text-green-400',
  }[level] || 'text-orange-400');

  const threatBg = (level: string) => ({
    EXTREME: 'bg-red-500/10 border-red-500/25',
    HIGH: 'bg-orange-500/10 border-orange-500/25',
    ELEVATED: 'bg-yellow-500/10 border-yellow-500/25',
    MODERATE: 'bg-blue-500/10 border-blue-500/25',
    LOW: 'bg-green-500/10 border-green-500/25',
  }[level] || 'bg-orange-500/10 border-orange-500/25');

  const threatGlow = (level: string) => ({
    EXTREME: '0 0 20px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.1)',
    HIGH: '0 0 15px rgba(251,146,60,0.2)',
    ELEVATED: '0 0 10px rgba(250,204,21,0.15)',
    MODERATE: 'none', LOW: 'none',
  }[level] || 'none');

  const probColor = (p: number) =>
    p >= 0.7 ? 'bg-red-500' : p >= 0.4 ? 'bg-yellow-500' : 'bg-blue-500';

  const timeframeLabel = (tf: string) => ({
    imminent: language === 'ar' ? '\u0648\u0634\u064A\u0643' : 'IMMINENT',
    '1h': '1H', '3h': '3H', '6h': '6H', '12h': '12H', '24h': '24H',
  }[tf] || tf.toUpperCase());

  const threatLevel = prediction?.overallThreatLevel || 'MODERATE';
  const threatNum = ({ EXTREME: 5, HIGH: 4, ELEVATED: 3, MODERATE: 2, LOW: 1 }[threatLevel] || 2);
  const confPct = Math.round((prediction?.confidence || 0) * 100);

  const gaugeAngle = -90 + (threatNum / 5) * 180;
  const gaugeColors = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="flex flex-col h-full bg-card" data-testid="panel-aiprediction">
      <div className="panel-drag-handle h-10 px-3 flex items-center gap-2.5 shrink-0 cursor-grab active:cursor-grabbing select-none bg-card border-b border-border">
        <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="text-[12px] font-semibold text-foreground/80 leading-none">AI Prediction</span>
        {prediction?.dataPoints?.isEscalating && (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 text-red-500 rounded-full border border-red-500/25 animate-pulse">
            Escalating
          </span>
        )}
        <div className="flex-1" />
        {prediction && (
          <span className="text-[11px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/25 font-medium">
            {confPct}% conf
          </span>
        )}
        {onMaximize && <PanelMaximizeButton isMaximized={isMaximized || false} onToggle={onMaximize} />}
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="flex border-b border-border shrink-0 overflow-x-auto scrollbar-none bg-card">
        {(['forecast', 'vectors', 'pattern', 'intel', 'ask'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 flex-1 py-2 text-[12px] font-medium transition-all ${
              activeTab === tab
                ? tab === 'ask' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-500/8' : 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/8'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
            data-testid={`button-aipred-tab-${tab}`}
          >
            {tab === 'forecast' ? (language === 'ar' ? 'التوقع' : 'Forecast') :
             tab === 'vectors'  ? (language === 'ar' ? 'التهديدات' : 'Vectors') :
             tab === 'pattern'  ? (language === 'ar' ? 'النمط' : 'Pattern') :
             tab === 'intel'    ? (language === 'ar' ? 'المصادر' : 'Intel') :
             (language === 'ar' ? 'اسأل AI' : '✦ Ask AI')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {!prediction ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="relative">
              <Brain className="w-8 h-8 text-violet-400/30" />
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <span className="text-sm text-muted-foreground">{language === 'ar' ? '\u062C\u0627\u0631\u064D \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A\u2026' : 'Analyzing threat patterns...'}</span>
          </div>
        ) : (
          <>
            {activeTab === 'forecast' && (
              <div className="p-3 space-y-3">

                {/* Threat Level Summary Row */}
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${threatBg(threatLevel)}`}>
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <svg width="56" height="32" viewBox="0 0 64 36" className="overflow-visible">
                      {gaugeColors.map((color, i) => {
                        const startAngle = -90 + (i / 5) * 180;
                        const endAngle = -90 + ((i + 1) / 5) * 180;
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;
                        const r = 28;
                        return (
                          <path key={i}
                            d={`M ${32 + r * Math.cos(startRad)} ${32 + r * Math.sin(startRad)} A ${r} ${r} 0 0 1 ${32 + r * Math.cos(endRad)} ${32 + r * Math.sin(endRad)}`}
                            fill="none" stroke={color} strokeWidth={i + 1 === threatNum ? 5 : 3}
                            opacity={i + 1 === threatNum ? 1 : 0.20}
                          />
                        );
                      })}
                      <line x1="32" y1="32" x2={32 + 20 * Math.cos((gaugeAngle * Math.PI) / 180)} y2={32 + 20 * Math.sin((gaugeAngle * Math.PI) / 180)} stroke={gaugeColors[threatNum - 1]} strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="32" cy="32" r="3" fill={gaugeColors[threatNum - 1]} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xl font-bold leading-none mb-0.5 ${threatColor(threatLevel)}`}>{threatLevel}</div>
                    <div className="text-xs text-muted-foreground mb-2">Threat Level</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${confPct}%`, background: gaugeColors[threatNum-1] }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{confPct}% conf</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{prediction.dataPoints?.velocityPerHour ?? 0}</div>
                    <div className="text-xs text-muted-foreground">alerts/hr</div>
                    {prediction.dataPoints?.isEscalating && (
                      <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 justify-end mt-0.5">
                        <TrendingUp className="w-3 h-3" /> Rising
                      </span>
                    )}
                  </div>
                </div>

                {/* WHEN */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">When — Next Attack Window</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <div className="text-2xl font-bold text-foreground leading-none">
                        {prediction.nextAttackWindow?.label || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        ~{prediction.nextAttackWindow?.estimatedMinutes ?? '?'} min estimated
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="flex items-center gap-1.5 justify-end mb-1">
                        <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((prediction.nextAttackWindow?.confidence ?? 0) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round((prediction.nextAttackWindow?.confidence ?? 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  {prediction.nextAttackWindow?.basis && (
                    <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed border-t border-border pt-2">
                      {prediction.nextAttackWindow.basis}
                    </p>
                  )}
                </div>

                {/* WHERE */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                      <Target className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where — Most Likely Target</span>
                  </div>
                  <div className="text-lg font-bold text-foreground mb-3">{prediction.nextLikelyTarget}</div>
                  {prediction.locationProbabilities && prediction.locationProbabilities.length > 0 && (
                    <div className="space-y-1.5">
                      {prediction.locationProbabilities.slice(0, 5).map((lp, i) => {
                        const pct = Math.round(lp.probability * 100);
                        const barColor = pct >= 65 ? '#ef4444' : pct >= 40 ? '#f97316' : '#3b82f6';
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-base leading-none shrink-0">{lp.countryFlag}</span>
                            <span className="text-[12px] text-foreground/80 flex-1 truncate">{lp.location}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{lp.threatType}</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <span className="text-[11px] font-semibold font-mono w-8 text-right shrink-0" style={{ color: barColor }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FROM WHERE */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">From Where — Likely Origins</span>
                  </div>
                  {(() => {
                    // Aggregate origins from predictions' source field
                    const originMap: Record<string, { count: number; vectors: string[] }> = {};
                    prediction.predictions.forEach(p => {
                      const src = p.source || 'Unknown';
                      if (!originMap[src]) originMap[src] = { count: 0, vectors: [] };
                      originMap[src].count++;
                      if (!originMap[src].vectors.includes(p.threatVector)) originMap[src].vectors.push(p.threatVector);
                    });
                    const origins = Object.entries(originMap).sort((a, b) => b[1].count - a[1].count);
                    const maxCount = origins[0]?.[1].count || 1;
                    return origins.length > 0 ? (
                      <div className="space-y-2">
                        {origins.slice(0, 4).map(([origin, data]) => (
                          <div key={origin} className="flex items-center gap-2">
                            <span className="text-[12px] text-foreground/80 flex-1 truncate font-medium">{origin}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{data.vectors.join(', ')}</span>
                            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.round((data.count / maxCount) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {prediction.escalationVector && (
                    <div className="mt-2 pt-2 border-t border-border flex items-start gap-2">
                      {prediction.dataPoints?.isEscalating
                        ? <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                        : <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-500" />
                      }
                      <p className="text-xs text-muted-foreground leading-relaxed">{prediction.escalationVector}</p>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground/50 text-center">
                  Updated {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            )}

            {activeTab === 'vectors' && (
              <div className="p-3 space-y-2">
                <div className="rounded border border-border bg-muted/20 p-2.5 mb-1">
                  <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">
                    {language === 'ar' ? '\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0647\u062F\u064A\u062F\u0627\u062A' : 'THREAT VECTOR SUMMARY'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-white/50">{prediction.predictions.length} vectors tracked</span>
                      <div className="flex gap-1 mt-1">
                        {['critical','high','medium','low'].map(sev => {
                          const cnt = prediction.predictions.filter(p => p.severity === sev).length;
                          if (cnt === 0) return null;
                          const sevColors: Record<string,string> = { critical: 'bg-red-500/25 text-red-300', high: 'bg-orange-500/25 text-orange-300', medium: 'bg-yellow-500/25 text-yellow-300', low: 'bg-green-500/25 text-green-300' };
                          return <span key={sev} className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${sevColors[sev]}`}>{cnt} {sev.toUpperCase()}</span>;
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-white/25">AVG PROB</span>
                      <div className={`text-[16px] font-black font-mono ${threatColor(threatLevel)}`}>
                        {prediction.predictions.length > 0 ? Math.round(prediction.predictions.reduce((s,p)=>s+p.probability,0)/prediction.predictions.length*100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {prediction.predictions.map((p, i) => {
                  const isHot = p.probability >= 0.7;
                  const VectorIcons: Record<string, typeof Zap> = { rockets: Rocket, missiles: Target, uav: Plane, cruise_missile: Plane, ballistic: AlertTriangle, mortar: Crosshair, anti_tank: Shield, combined: ShieldAlert };
                  const VIcon = VectorIcons[p.threatVector] || AlertTriangle;
                  return (
                    <div key={i} className={`rounded border p-2.5 transition-all ${isHot ? 'border-red-500/25 bg-red-950/10' : 'border-border bg-muted/20'}`} data-testid={`aipred-vector-${i}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <VIcon className={`w-3.5 h-3.5 shrink-0 ${
                          p.severity === 'critical' ? 'text-red-400' : p.severity === 'high' ? 'text-orange-400' : p.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`} />
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                          p.severity === 'critical' ? 'bg-red-500/25 text-red-300 border border-red-500/30' :
                          p.severity === 'high' ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' :
                          p.severity === 'medium' ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' :
                          'bg-green-500/25 text-green-300 border border-green-500/30'
                        }`}>{p.threatVector.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-semibold text-white/80 flex-1 truncate">{p.region}</span>
                        <span className="text-[9px] font-mono text-white/35">{timeframeLabel(p.timeframe)}</span>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full transition-all ${probColor(p.probability)}`} style={{ width: `${Math.round(p.probability * 100)}%`, opacity: 0.8 }} />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-black font-mono text-white/70">{Math.round(p.probability * 100)}%</span>
                      </div>
                      {p.rationale && <p className="text-[9px] text-white/40 leading-relaxed italic">{p.rationale}</p>}
                      {p.source && <div className="text-[8px] font-mono text-white/20 mt-1">SRC: {p.source}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'pattern' && (
              <div className="p-3 space-y-3">
                {prediction.patternSummary && (
                  <div className="rounded-lg border border-violet-500/20 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(139,92,246,0.08)' }}>
                    <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(90deg, hsl(260 40% 20% / 0.6), hsl(260 30% 15% / 0.4))' }}>
                      <Brain className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300/70">
                        {language === 'ar' ? '\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0646\u0645\u0637' : 'AI PATTERN ANALYSIS'}
                      </span>
                    </div>
                    <div className="p-3 bg-violet-500/[0.03]">
                      <p className="text-[10px] text-white/65 leading-relaxed">{prediction.patternSummary}</p>
                    </div>
                  </div>
                )}

                {prediction.dataPoints?.topRegions && prediction.dataPoints.topRegions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-red-400/50" />
                      <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                        {language === 'ar' ? '\u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629' : 'HEAT MAP — TARGETED REGIONS'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {prediction.dataPoints.topRegions.map(({ region, count }, i) => {
                        const maxCount = prediction.dataPoints!.topRegions[0]?.count || 1;
                        const pct = Math.round((count / maxCount) * 100);
                        const heat = pct > 70 ? 'from-red-500/30 to-red-500/5' : pct > 40 ? 'from-orange-500/25 to-orange-500/5' : 'from-blue-500/20 to-blue-500/5';
                        const textColor = pct > 70 ? 'text-red-400' : pct > 40 ? 'text-orange-400' : 'text-blue-400';
                        return (
                          <div key={region} className="relative rounded border border-border overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-r ${heat}`} style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center gap-2 px-2.5 py-1.5">
                              <span className="text-[9px] font-mono text-white/25 w-3">{i + 1}</span>
                              <span className="text-[10px] text-white/60 flex-1 truncate font-medium">{region}</span>
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.07]">
                                <div className={`h-full rounded-full ${pct > 70 ? 'bg-red-400/70' : pct > 40 ? 'bg-orange-400/60' : 'bg-blue-400/50'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-[9px] font-black font-mono w-6 text-right ${textColor}`}>{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded border border-border bg-muted/20 p-2.5">
                  <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">
                    {language === 'ar' ? '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0648\u0642\u0639' : 'PREDICTION METRICS'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Vectors Tracked</span><span className="text-[10px] font-black font-mono text-violet-400">{prediction.predictions.length}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Confidence</span><span className="text-[10px] font-black font-mono text-cyan-400">{confPct}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Alert Velocity</span><span className="text-[10px] font-black font-mono text-yellow-400">{prediction.dataPoints?.velocityPerHour ?? 0}/hr</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Status</span><span className={`text-[10px] font-black font-mono ${prediction.dataPoints?.isEscalating ? 'text-red-400' : 'text-green-400'}`}>{prediction.dataPoints?.isEscalating ? 'ESCALATING' : 'STABLE'}</span></div>
                  </div>
                </div>

                <div className="pt-1 border-t border-border">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                    <span className="text-[8px] font-mono text-white/20">
                      {language === 'ar' ? 'آخر تحديث' : 'Updated'}: {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'ask' && (
              <div className="flex flex-col h-full" style={{ minHeight: 300 }}>
                {/* Model selector */}
                <div className="shrink-0 px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground">{language === 'ar' ? 'نموذج الذكاء الاصطناعي' : 'AI Model'}</div>
                    {chatHistory.length > 0 && (
                      <button
                        onClick={() => { setChatHistory([]); setStreamingText(''); }}
                        className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors px-2 py-0.5 rounded border border-border"
                      >
                        {language === 'ar' ? 'مسح' : 'Clear'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {AI_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setChatModel(m.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                        style={{
                          background: chatModel === m.id ? `${m.color}15` : 'hsl(var(--muted))',
                          border: chatModel === m.id ? `1px solid ${m.color}40` : '1px solid hsl(var(--border))',
                          color: chatModel === m.id ? m.color : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        <span style={{ fontSize: 12 }}>{m.icon}</span>
                        {m.short}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Suggested questions */}
                {chatHistory.length === 0 && !chatLoading && (
                  <div className="shrink-0 px-3 pb-2">
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">{language === 'ar' ? 'أسئلة مقترحة' : 'Suggested questions'}</div>
                    <div className="flex flex-col gap-1">
                      {(language === 'ar' ? [
                        'ما هي أحدث التهديدات الآن؟',
                        'هل الوضع يتصاعد أم مستقر؟',
                        'ما هي المنطقة الأكثر خطراً؟',
                        'متى سيكون الهجوم القادم المتوقع؟',
                        'ما احتمال توسع الصراع؟',
                      ] : [
                        'What are the most active threats right now?',
                        'When is the next attack likely and where?',
                        'Which locations have the highest strike probability?',
                        'Is the situation escalating or stable?',
                        'Analyze the current threat pattern and predict next moves.',
                        'What does the OSINT say about Iran right now?',
                      ]).map(q => (
                        <button
                          key={q}
                          onClick={() => sendQuestion(q)}
                          disabled={chatLoading}
                          className="text-left px-3 py-2 rounded-lg text-[12px] transition-all hover:bg-violet-500/10 active:scale-98 disabled:opacity-40 text-violet-400 border border-violet-500/20 bg-violet-500/5"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat history */}
                <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-0">
                  {chatHistory.map((msg, i) => {
                    const m = AI_MODELS.find(x => x.id === msg.model);
                    return (
                      <div key={i} className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'ai' && m && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span style={{ fontSize: 10 }}>{m.icon}</span>
                            <span className="text-[7px] font-mono font-bold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
                          </div>
                        )}
                        <div
                          className="max-w-[92%] px-3 py-2 rounded-xl text-[12px] leading-relaxed"
                          style={{
                            background: msg.role === 'user'
                              ? 'hsl(var(--primary))'
                              : 'hsl(var(--muted))',
                            border: msg.role === 'user'
                              ? '1px solid hsl(var(--primary))'
                              : `1px solid hsl(var(--border))`,
                            color: msg.role === 'user' ? 'white' : 'hsl(var(--foreground))',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming indicator */}
                  {chatLoading && (
                    <div className="flex flex-col items-start gap-0.5">
                      {(() => { const m = AI_MODELS.find(x => x.id === chatModel); return m ? (
                        <div className="flex items-center gap-1 mb-0.5">
                          <span style={{ fontSize: 10 }}>{m.icon}</span>
                          <span className="text-[7px] font-mono font-bold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
                        </div>
                      ) : null; })()}
                      <div
                        className="max-w-[92%] px-3 py-2 rounded-xl text-[12px] leading-relaxed"
                        style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap' }}
                      >
                        {streamingText || (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="animate-pulse">●</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 px-3 pb-3 pt-1.5 border-t border-border">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
                      placeholder={language === 'ar' ? 'اسأل المحلل الاستخباراتي...' : 'Ask the intelligence analyst...'}
                      disabled={chatLoading}
                      rows={2}
                      className="flex-1 resize-none rounded-lg px-3 py-2 text-[13px] outline-none transition-all disabled:opacity-40 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:border-violet-400"
                    />
                    <button
                      onClick={() => sendQuestion()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="shrink-0 px-4 py-2 rounded-lg font-medium text-[12px] transition-all active:scale-95 disabled:opacity-30 bg-violet-600 text-white hover:bg-violet-700"
                      style={{ minHeight: 52 }}
                    >
                      {chatLoading ? '...' : (language === 'ar' ? 'إرسال' : 'SEND')}
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground/60 mt-1 text-center">
                    {language === 'ar' ? 'Enter للإرسال · Shift+Enter لسطر جديد' : 'Enter to send · Shift+Enter for newline'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'intel' && (() => {
              // ── Compute raw signal scores from live data ──────────────────
              const now = Date.now();
              const milFlights = liveFlights.filter(f => f.type === 'military' || f.type === 'surveillance');
              const recentTg = liveTelegram.filter(m => (now - new Date(m.timestamp).getTime()) < 30 * 60 * 1000);
              const movingMarkets = liveCommodities.filter(c => Math.abs(c.changePercent) > 0.8);
              const stressedMarkets = liveCommodities.filter(c => Math.abs(c.changePercent) > 2.5);
              const activeAlerts = liveAlerts.filter(a => {
                const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
                return elapsed < a.countdown || a.countdown === 0;
              });
              const alertsByType = liveAlerts.reduce<Record<string,number>>((acc, a) => { acc[a.threatType] = (acc[a.threatType]||0)+1; return acc; }, {});
              const dominantThreat = Object.entries(alertsByType).sort((a,b)=>b[1]-a[1])[0];

              // Raw weights — scale with actual data intensity
              const wAlerts    = Math.min(liveAlerts.length * 4, 45);
              const wSirens    = Math.min(liveSirens.length * 6, 35);
              const wFlights   = Math.min(milFlights.length * 5, 30);
              const wTelegram  = Math.min(recentTg.length * 1.5, 25);
              const wMarkets   = Math.min(movingMarkets.length * 4 + stressedMarkets.length * 6, 20);
              const wThermal   = Math.min(liveThermal.length * 4, 15);
              const wShips     = Math.min(liveShips.length * 0.8, 10);
              const wEvents    = Math.min(liveEvents.length * 1.2, 12);
              const totalRaw = wAlerts + wSirens + wFlights + wTelegram + wMarkets + wThermal + wShips + wEvents || 1;

              const pct = (w: number) => Math.round((w / totalRaw) * 100);

              // Signal quality
              const quality = (raw: number, hi: number, med: number): 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE' =>
                raw === 0 ? 'NONE' : raw >= hi ? 'STRONG' : raw >= med ? 'MODERATE' : 'WEAK';

              const sources = [
                {
                  id: 'alerts',
                  icon: <AlertOctagon className="w-4 h-4" style={{ color: '#ef4444' }} />,
                  label: language === 'ar' ? 'إنذارات الأوريف' : 'OREF Red Alerts',
                  color: '#ef4444',
                  raw: wAlerts,
                  contribution: pct(wAlerts),
                  quality: quality(wAlerts, 20, 8),
                  count: liveAlerts.length,
                  countLabel: language === 'ar' ? 'إنذار' : 'alerts',
                  detail: activeAlerts.length > 0
                    ? `${activeAlerts.length} active · ${dominantThreat ? dominantThreat[0].replace(/_/g,' ') + ' dominant' : ''}`
                    : liveAlerts.length > 0 ? `${liveAlerts.length} total logged` : 'No alerts',
                  subMetrics: [
                    { label: 'Active', value: String(activeAlerts.length), color: '#ef4444' },
                    { label: '30m velocity', value: String(prediction?.dataPoints?.velocity30m ?? 0), color: '#f97316' },
                    { label: '2h velocity', value: String(prediction?.dataPoints?.velocity2h ?? 0), color: '#eab308' },
                  ],
                },
                {
                  id: 'sirens',
                  icon: <Siren className="w-4 h-4" style={{ color: '#fbbf24' }} />,
                  label: language === 'ar' ? 'صفارات الإنذار' : 'Siren Activity',
                  color: '#fbbf24',
                  raw: wSirens,
                  contribution: pct(wSirens),
                  quality: quality(wSirens, 18, 6),
                  count: liveSirens.length,
                  countLabel: language === 'ar' ? 'صفارة' : 'sirens',
                  detail: liveSirens.length > 0
                    ? `${new Set(liveSirens.map(s => s.region)).size} regions · ${liveSirens.filter(s => s.threatType === 'rocket' || s.threatType === 'rockets').length} rocket sirens`
                    : 'No siren data',
                  subMetrics: [
                    { label: 'Regions', value: String(new Set(liveSirens.map(s => s.region)).size), color: '#fbbf24' },
                    { label: 'Clustered', value: String(Object.values(liveSirens.reduce<Record<string,number>>((a,s)=>{a[s.region]=(a[s.region]||0)+1;return a;},{})).filter(c=>c>=2).length), color: '#f97316' },
                  ],
                },
                {
                  id: 'flights',
                  icon: <Plane className="w-4 h-4" style={{ color: '#60a5fa' }} />,
                  label: language === 'ar' ? 'استخبارات الطيران' : 'Flight Intelligence',
                  color: '#60a5fa',
                  raw: wFlights,
                  contribution: pct(wFlights),
                  quality: quality(wFlights, 15, 5),
                  count: milFlights.length,
                  countLabel: language === 'ar' ? 'طائرة' : 'mil/surv',
                  detail: `${milFlights.length} military/surveillance · ${liveFlights.filter(f=>f.type==='fighter').length} fighters · ${liveFlights.filter(f=>f.type==='tanker'||f.type==='refueling').length} tankers`,
                  subMetrics: [
                    { label: 'Military', value: String(liveFlights.filter(f=>f.type==='military').length), color: '#ef4444' },
                    { label: 'Surveillance', value: String(liveFlights.filter(f=>f.type==='surveillance').length), color: '#60a5fa' },
                    { label: 'Total tracked', value: String(liveFlights.length), color: '#94a3b8' },
                  ],
                },
                {
                  id: 'telegram',
                  icon: <Send className="w-4 h-4" style={{ color: '#34d399' }} />,
                  label: language === 'ar' ? 'تلغرام SIGINT' : 'Telegram SIGINT',
                  color: '#34d399',
                  raw: wTelegram,
                  contribution: pct(wTelegram),
                  quality: quality(wTelegram, 20, 6),
                  count: recentTg.length,
                  countLabel: language === 'ar' ? 'رسالة' : 'msgs/30m',
                  detail: `${recentTg.length} msgs in last 30m · ${liveTelegram.length} total monitored`,
                  subMetrics: [
                    { label: '30m surge', value: String(recentTg.length), color: '#34d399' },
                    { label: 'Total', value: String(liveTelegram.length), color: '#6ee7b7' },
                  ],
                },
                {
                  id: 'markets',
                  icon: <TrendingUp className="w-4 h-4" style={{ color: '#facc15' }} />,
                  label: language === 'ar' ? 'ضغط الأسواق' : 'Market Stress Index',
                  color: '#facc15',
                  raw: wMarkets,
                  contribution: pct(wMarkets),
                  quality: quality(wMarkets, 12, 4),
                  count: movingMarkets.length,
                  countLabel: language === 'ar' ? 'أصل متحرك' : 'moving assets',
                  detail: (() => {
                    const oil = liveCommodities.find(c => c.symbol === 'OIL' || c.symbol === 'CRUDE' || c.name?.toLowerCase().includes('oil'));
                    const gold = liveCommodities.find(c => c.symbol === 'GOLD' || c.name?.toLowerCase().includes('gold'));
                    const parts: string[] = [];
                    if (oil) parts.push(`Oil ${oil.changePercent > 0 ? '+' : ''}${oil.changePercent.toFixed(1)}%`);
                    if (gold) parts.push(`Gold ${gold.changePercent > 0 ? '+' : ''}${gold.changePercent.toFixed(1)}%`);
                    if (stressedMarkets.length > 0) parts.push(`${stressedMarkets.length} assets >2.5% move`);
                    return parts.length ? parts.join(' · ') : `${liveCommodities.length} assets monitored`;
                  })(),
                  subMetrics: [
                    { label: 'Moving', value: String(movingMarkets.length), color: '#facc15' },
                    { label: 'Stressed', value: String(stressedMarkets.length), color: '#ef4444' },
                    { label: 'Total', value: String(liveCommodities.length), color: '#94a3b8' },
                  ],
                },
                {
                  id: 'thermal',
                  icon: <Flame className="w-4 h-4" style={{ color: '#f87171' }} />,
                  label: language === 'ar' ? 'النقاط الحرارية' : 'Thermal Hotspots',
                  color: '#f87171',
                  raw: wThermal,
                  contribution: pct(wThermal),
                  quality: quality(wThermal, 6, 2),
                  count: liveThermal.length,
                  countLabel: language === 'ar' ? 'نقطة' : 'hotspots',
                  detail: liveThermal.length > 0 ? `${liveThermal.length} active thermal signatures (MODIS/VIIRS)` : 'No thermal data',
                  subMetrics: [
                    { label: 'Active', value: String(liveThermal.length), color: '#f87171' },
                  ],
                },
                {
                  id: 'maritime',
                  icon: <Ship className="w-4 h-4" style={{ color: '#38bdf8' }} />,
                  label: language === 'ar' ? 'الحركة البحرية' : 'Maritime Activity',
                  color: '#38bdf8',
                  raw: wShips,
                  contribution: pct(wShips),
                  quality: quality(wShips, 10, 3),
                  count: liveShips.length,
                  countLabel: language === 'ar' ? 'سفينة' : 'vessels',
                  detail: `${liveShips.length} vessels in monitored straits`,
                  subMetrics: [
                    { label: 'Tracked', value: String(liveShips.length), color: '#38bdf8' },
                  ],
                },
              ].filter(s => s.raw > 0 || s.count > 0);

              const qualityColor = (q: string) =>
                q === 'STRONG' ? '#22c55e' : q === 'MODERATE' ? '#eab308' : q === 'WEAK' ? '#f97316' : '#4b5563';
              const qualityBg = (q: string) =>
                q === 'STRONG' ? 'rgba(34,197,94,0.12)' : q === 'MODERATE' ? 'rgba(234,179,8,0.12)' : q === 'WEAK' ? 'rgba(249,115,22,0.12)' : 'rgba(75,85,99,0.10)';

              const totalActive = sources.filter(s => s.quality !== 'NONE').length;
              const strongCount = sources.filter(s => s.quality === 'STRONG').length;

              return (
                <div className="p-3 space-y-3">
                  {/* ── Header card ── */}
                  <div className="rounded-lg border border-violet-500/20 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(260 35% 12% / 0.8), hsl(260 25% 9% / 0.6))' }}>
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
                      <Activity className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300/70">
                        {language === 'ar' ? 'تفاصيل مصادر الاستخبارات' : 'INTEL SOURCE ATTRIBUTION'}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-white/25">{totalActive}/{sources.length} sources</span>
                        <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                          {strongCount} STRONG
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-[16px] font-black font-mono text-violet-300">{confPct}%</div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Overall Conf.</div>
                      </div>
                      <div className="text-center border-x border-border">
                        <div className="text-[16px] font-black font-mono" style={{ color: prediction?.dataPoints?.isEscalating ? '#ef4444' : '#22c55e' }}>
                          {prediction?.dataPoints?.isEscalating ? '↑' : '→'}
                        </div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                          {prediction?.dataPoints?.isEscalating ? 'Escalating' : 'Stable'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[16px] font-black font-mono text-yellow-400">{prediction?.dataPoints?.velocityPerHour ?? 0}</div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Alerts/hr</div>
                      </div>
                    </div>
                    {/* Combined source bar */}
                    <div className="px-3 pb-2.5">
                      <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-1">Signal Composition</div>
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        {sources.filter(s => s.contribution > 0).map(s => (
                          <div key={s.id} style={{ width: `${s.contribution}%`, background: s.color, opacity: s.quality === 'NONE' ? 0.15 : s.quality === 'WEAK' ? 0.4 : 0.75, transition: 'width 0.6s ease' }} title={`${s.label}: ${s.contribution}%`} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {sources.slice(0, 5).map(s => (
                          <div key={s.id} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                            <span className="text-[7px] font-mono text-white/30">{s.contribution}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Source rows ── */}
                  <div className="space-y-2">
                    {sources.map(source => (
                      <div key={source.id} className="rounded-lg border overflow-hidden" style={{ borderColor: source.color + '25', background: qualityBg(source.quality) }}>
                        {/* Main row */}
                        <div className="px-2.5 py-2 flex items-center gap-2.5">
                          <div className="shrink-0" style={{ color: source.color, opacity: source.quality === 'NONE' ? 0.25 : 1 }}>
                            {source.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold text-white/80 truncate">{source.label}</span>
                              <span className="text-[8px] font-black font-mono px-1.5 py-px rounded shrink-0" style={{ background: qualityColor(source.quality) + '22', color: qualityColor(source.quality), border: `1px solid ${qualityColor(source.quality)}44` }}>
                                {source.quality}
                              </span>
                            </div>
                            <p className="text-[8px] font-mono text-white/35 truncate">{source.detail}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[15px] font-black font-mono leading-none" style={{ color: source.color }}>{source.contribution}%</div>
                            <div className="text-[7px] font-mono text-white/25">of signal</div>
                          </div>
                        </div>
                        {/* Contribution bar */}
                        <div className="mx-2.5 mb-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${source.contribution}%`, background: `linear-gradient(90deg, ${source.color}88, ${source.color})` }} />
                        </div>
                        {/* Sub-metrics */}
                        {source.subMetrics.length > 1 && (
                          <div className="flex divide-x divide-border border-t border-border">
                            {source.subMetrics.map(m => (
                              <div key={m.label} className="flex-1 px-2 py-1 text-center">
                                <div className="text-[11px] font-black font-mono" style={{ color: m.color }}>{m.value}</div>
                                <div className="text-[7px] font-mono text-white/25 uppercase tracking-wide">{m.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── Footer timestamp ── */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                    <span className="text-[8px] font-mono text-white/20">
                      {language === 'ar' ? 'آخر تحديث' : 'Last computed'}: {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                  </div>
                </div>
              );
            })()}
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
      <div className="panel-drag-handle flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 cursor-grab active:cursor-grabbing select-none">
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
            {/* Threat Level Banner */}
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

            {/* ═══ NEXT ATTACK WINDOW ═══ */}
            {prediction.nextAttackWindow && (
              <div className={`rounded border p-2.5 ${prediction.nextAttackWindow.label === 'imminent' ? 'border-red-500/50 bg-red-500/10' : prediction.nextAttackWindow.label === '~15min' ? 'border-orange-500/40 bg-orange-500/8' : 'border-yellow-500/25 bg-yellow-500/5'}`} data-testid="next-attack-window">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-yellow-400/80" />
                  <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{language === 'ar' ? 'توقيت الهجوم القادم' : 'Next Attack Window'}</span>
                  {prediction.nextAttackWindow.label === 'imminent' && (
                    <span className="px-1 py-0.5 text-[8px] font-black text-red-400 bg-red-500/20 rounded border border-red-500/40 animate-pulse tracking-wider">⚠ IMMINENT</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[22px] font-black font-mono leading-none ${prediction.nextAttackWindow.label === 'imminent' ? 'text-red-400' : prediction.nextAttackWindow.estimatedMinutes <= 30 ? 'text-orange-400' : 'text-yellow-300'}`}>
                      {prediction.nextAttackWindow.label === 'imminent' ? '< 5 MIN' : prediction.nextAttackWindow.label === 'unknown' ? '---' : prediction.nextAttackWindow.label.toUpperCase()}
                    </div>
                    <div className="text-[8px] text-white/40 mt-0.5 leading-tight max-w-[160px]">{prediction.nextAttackWindow.basis}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] text-white/40 mb-1">Timing confidence</div>
                    <div className="flex items-center gap-1 justify-end">
                      <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ${prediction.nextAttackWindow.confidence >= 0.7 ? 'bg-orange-400' : prediction.nextAttackWindow.confidence >= 0.45 ? 'bg-yellow-400' : 'bg-white/30'}`}
                          style={{ width: `${Math.round(prediction.nextAttackWindow.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-white/50">{Math.round(prediction.nextAttackWindow.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Velocity Strip */}
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

            {/* ═══ STRIKE PROBABILITY BY LOCATION ═══ */}
            {prediction.locationProbabilities && prediction.locationProbabilities.length > 0 && (
              <div className="space-y-1.5" data-testid="location-probabilities">
                <div className="flex items-center gap-1.5 px-1">
                  <MapPin className="w-3 h-3 text-red-400/70" />
                  <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{language === 'ar' ? 'احتمالية الاستهداف بالموقع' : 'Strike Probability by Location'}</span>
                </div>
                {prediction.locationProbabilities.sort((a, b) => b.probability - a.probability).map((lp, i) => (
                  <div key={i} className="px-1" data-testid={`loc-prob-${i}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] leading-none">{lp.countryFlag}</span>
                      <span className="text-[9px] font-medium text-white/80 flex-1 truncate">{lp.location}</span>
                      <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${lp.probability >= 0.7 ? 'bg-red-500/25 text-red-300' : lp.probability >= 0.4 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/8 text-white/40'}`}>
                        {Math.round(lp.probability * 100)}%
                      </span>
                      <span className="text-[8px] text-white/25 font-mono">{lp.threatType.replace('_', ' ')}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ${lp.probability >= 0.7 ? 'bg-gradient-to-r from-red-500 to-red-400' : lp.probability >= 0.5 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : lp.probability >= 0.3 ? 'bg-gradient-to-r from-yellow-500/80 to-yellow-400/60' : 'bg-white/20'}`}
                        style={{ width: `${Math.round(lp.probability * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Threat Predictions */}
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
                      className={`h-full rounded-full transition-[width] duration-700 ${p.probability >= 0.7 ? 'bg-red-400' : p.probability >= 0.4 ? 'bg-yellow-400' : 'bg-blue-400'}`}
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

            <div className="p-2 rounded border border-border bg-muted/20">
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
  const topGroup: PanelId[] = ['alerts', 'telegram', 'livefeed', 'aiprediction'];
  const bottomGroup: PanelId[] = ['events', 'markets', 'alertmap', 'analytics', 'osint', 'attackpred', 'rocketstats'];


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
        className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg relative transition-colors
          ${active
            ? 'bg-primary/8 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        data-testid={`sidebar-panel-${id}`}
        title={active ? `Hide ${cfg.label}` : `Show ${cfg.label}`}
      >
        {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />}
        <Icon className="w-4 h-4 shrink-0 ml-0.5" />
        <span className="text-[13px] font-medium flex-1 text-left leading-none truncate">
          {language === 'en' ? cfg.label : cfg.labelAr}
        </span>
        {stat !== undefined && stat !== '' && (
          <span className={`text-[10px] tabular-nums shrink-0 px-1.5 py-0.5 rounded-md font-semibold
            ${active ? 'text-primary bg-primary/10' : 'text-muted-foreground/60 bg-muted'}`}>
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
      <div className="relative w-[92vw] max-w-[800px] h-[70vh] max-h-[600px] rounded-lg border border-cyan-500/20 bg-[#080c14] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} data-testid="popup-map-container">
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 py-2 bg-[#080c14]/95 border-b border-cyan-500/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
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
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
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
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('alerts');
  const [showMobilePanelPicker, setShowMobilePanelPicker] = useState(false);
  const swipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  const panelWrapperRef = useRef<HTMLDivElement>(null);
  const panelsScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const SWIPE_TABS: PanelId[] = ['alertmap', 'alerts', 'telegram', 'events', 'aiprediction'];

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




  const defaultVisible: Record<PanelId, boolean> = { telegram: true, events: true, alerts: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: true, attackpred: true, rocketstats: true, aiprediction: true };
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

  const sse = useSSE();
  const { news, commodities, events, flights, ships, sirens, redAlerts, telegramMessages, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected } = sse;

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
      localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(merged));
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

  const topRow: PanelId[] = ['telegram', 'alertmap', 'alerts', 'livefeed'];
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
    telegram: 16, alertmap: 36, alerts: 16, livefeed: 16,
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
      localStorage.setItem('warroom_panel_state_v2', JSON.stringify({ visiblePanels, colWidths, rowSplit }));
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
      localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(preset.gridLayout));
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
        case 'aiprediction':
          return <AIPredictionPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} alerts={redAlerts} sirens={sirens} flights={flights} telegramMessages={telegramMessages} events={events} commodities={commodities} ships={ships} thermalHotspots={thermalHotspots} />;
        case 'events':
          return <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alerts':
          return <RedAlertPanel alerts={redAlerts} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
        case 'telegram':
          return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} soundEnabled={soundEnabled} silentMode={settings.silentMode} volume={settings.volume} />;
        case 'markets':
          return <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'livefeed':
          return <LiveFeedPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alertmap':
          return <AlertMapPanel alerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'analytics':
          return <AnalyticsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
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

  return (
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

              alerts: redAlerts.length > 0 ? `${redAlerts.length} ACTIVE` : '',
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
              {(['alertmap', 'alerts', 'telegram', 'events', 'aiprediction'] as PanelId[]).map(id => (
                <div key={id} className={`absolute inset-0 flex flex-col ${mobileActivePanel === id ? 'z-10' : 'z-0 mobile-panel-hidden'}`}>
                  {renderPanel(id)}
                </div>
              ))}
              {!['alertmap', 'alerts', 'telegram', 'events', 'aiprediction'].includes(mobileActivePanel) && (
                <div className="absolute inset-0 flex flex-col z-10">
                  {renderPanel(mobileActivePanel)}
                </div>
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
                {(['alertmap', 'alerts', 'telegram', 'events', 'aiprediction'] as PanelId[]).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const isActive = mobileActivePanel === id;
                  const hasAlert = id === 'alerts' && redAlerts.length > 0;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isAI = id === 'aiprediction';
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex-1 min-w-[52px] min-h-[56px] py-2 flex flex-col items-center gap-1.5 transition-all relative ${isActive ? (isAI ? 'text-violet-400' : 'text-primary') : 'text-foreground/30 active:text-foreground/60'} ${hasAlert && !isActive ? 'text-red-400' : ''}`}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      data-testid={`mobile-tab-${id}`}
                    >
                      {isActive && <div className={`absolute top-0 left-2 right-2 h-[2px] rounded-b ${isAI ? 'bg-violet-500' : 'bg-primary'}`} />}
                      <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                      <span className={`text-[10px] font-medium transition-colors ${isActive ? (isAI ? 'text-violet-600' : 'text-primary') : 'text-muted-foreground'}`}>{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                      {hasAlert && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
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
            ) : (
              /* Floating nav — compact, integrated into alerts full-screen */
              <div
                className="shrink-0 flex items-center justify-around px-2"
                style={{
                  paddingTop: 8,
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                  background: 'hsl(220 22% 5%)',
                  borderTop: '1px solid rgba(239,68,68,0.12)',
                }}
                data-testid="mobile-tab-bar"
              >
                {(['alertmap', 'telegram', 'events', 'aiprediction'] as PanelId[]).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isAI = id === 'aiprediction';
                  const iconColor = isAI ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.28)';
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
                {allPanels.filter(id => !(['alertmap', 'alerts', 'telegram', 'events', 'aiprediction'] as PanelId[]).includes(id)).map(id => {
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
              const isWide = id === 'alertmap' || id === 'alerts';
              const mapH = isLandscape ? '440px' : '500px';
              const alertsH = isLandscape ? '340px' : '400px';
              const alertmapH = isLandscape ? '420px' : '480px';
              const defaultH = isLandscape ? '300px' : '340px';
              return (
                <div
                  key={id}
                  style={{
                    gridColumn: isWide ? `1 / -1` : undefined,
                    minHeight: id === 'alerts' ? alertsH : id === 'alertmap' ? alertmapH : defaultH,
                    background: 'hsl(220 14% 7%)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: id === 'alerts' ? '1px solid hsl(0 72% 51% / 0.35)' : '1px solid hsl(220 12% 13%)',
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
          <RGL
            layout={gridLayout.filter(item => visiblePanels[item.i as PanelId])}
            cols={12}
            rowHeight={86}
            compactType="vertical"
            onLayoutChange={handleGridLayoutChange}
            draggableHandle=".panel-drag-handle"
            draggableCancel="button,input,select,textarea,a,[data-no-drag],canvas,.maplibregl-canvas,.maplibregl-canvas-container,#deck-canvas"
            margin={[4, 4]}
            containerPadding={[4, 4]}
            resizeHandles={['se', 'e', 's']}
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
                    background: isFloating ? 'hsl(220 12% 9%)' : 'hsl(220 14% 7%)',
                    border: isFloating
                      ? '1.5px dashed hsl(220 12% 16%)'
                      : hasAlertGlow
                        ? '1px solid hsl(0 70% 50% / 0.45)'
                        : '1px solid hsl(220 12% 13%)',
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.4 }}>
                      {Icon && <Icon style={{ width: 18, height: 18 }} />}
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>{PANEL_CONFIG[id]?.label || id}</span>
                      <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : (
                    <>
                      {!isMobile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); popOutPanel(id); }}
                          data-no-drag
                          className="absolute top-[42px] right-1.5 z-[90] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-150"
                          title="Pop out as floating window"
                          style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                        >
                          <ExternalLink style={{ width: 11, height: 11 }} />
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
              onClick={() => physicsScrollRef.current.scrollTo(0)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(20,26,38,0.88)', border: '1px solid rgba(0,220,180,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(0,220,180,0.12)',
                transition: 'opacity 0.2s, transform 0.2s',
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
              onClick={() => physicsScrollRef.current.scrollBy(window.innerHeight * 0.75)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(20,26,38,0.88)', border: '1px solid rgba(0,220,180,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 14px rgba(0,220,180,0.15)',
                transition: 'opacity 0.2s, transform 0.2s',
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
  );
}
