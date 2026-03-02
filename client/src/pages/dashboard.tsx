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
  Volume2,
  VolumeX,
  PanelLeft,
  Brain,
  Sparkles,
  ChevronRight,
  Zap,
  Loader2,
  Radar,
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
            <p className="text-[11px] font-mono">WebGL required for 3D map</p>
            <p className="text-[9px] mt-1 text-muted-foreground/60">Map rendering unavailable in this environment</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ResizeHandle({ onResize, direction = 'col' }: { onResize: (delta: number) => void; direction?: 'col' | 'row' }) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onResize(direction === 'col' ? e.movementX : e.movementY);
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'col' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onResize, direction]);

  return (
    <div
      className={`${direction === 'col' ? 'w-[2px] cursor-col-resize' : 'h-[2px] cursor-row-resize'} shrink-0 transition-all duration-150 relative group ${isDragging ? 'bg-primary/50' : 'bg-border/20 hover:bg-primary/20'}`}
      onMouseDown={() => setIsDragging(true)}
      data-testid="resize-handle"
    >
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

type PanelId = 'news' | 'map' | 'events' | 'radar' | 'adsb' | 'alerts' | 'markets' | 'intel';

const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  news: { icon: Newspaper, label: 'News', labelAr: '\u0623\u062E\u0628\u0627\u0631' },
  intel: { icon: Brain, label: 'AI Intel', labelAr: '\u0630\u0643\u0627\u0621' },
  map: { icon: Target, label: 'Map', labelAr: '\u062E\u0631\u064A\u0637\u0629' },
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
      className="ml-auto w-5 h-4 rounded flex items-center justify-center text-muted-foreground/40 hover:text-amber-400/80 hover:bg-amber-400/10 transition-colors"
      title="Minimize panel"
      data-testid="button-panel-minimize"
    >
      <Minus className="w-3 h-3" />
    </button>
  );
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
      <span className="text-sm text-foreground font-mono font-semibold tabular-nums tracking-tight">{formatted}</span>
      <span className="text-[11px] text-muted-foreground">UTC</span>
    </div>
  );
}

function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-7 border-b border-border/20 bg-card/10" />;
  const items = [...commodities, ...commodities, ...commodities];

  return (
    <div className="h-6 border-b border-primary/10 bg-primary/3 overflow-hidden relative" data-testid="ticker-bar">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 flex items-center pl-2">
        <span className="text-[7px] font-bold tracking-[0.25em] text-primary/60 font-mono">MKT</span>
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
        <div className="flex items-center gap-2 py-1 shrink-0">
          <div className="w-4 h-4 rounded bg-red-600/25 flex items-center justify-center animate-siren-flash border border-red-500/60">
            <Siren className="w-3 h-3 text-red-400/90" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/80 font-mono whitespace-nowrap">
            {language === 'en' ? 'ACTIVE SIRENS' : '\u0635\u0641\u0627\u0631\u0627\u062A \u0646\u0634\u0637\u0629'}
          </span>
          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-[16px] font-mono font-bold animate-pulse-dot">
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
                  <span className="text-red-400/80 text-[11px]">
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
          className="text-[11px] text-red-400 px-2 h-6 font-mono shrink-0 hover:bg-red-900/30"
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
                    <span className="text-[13px] text-red-300 font-bold truncate">
                      {language === 'ar' ? s.locationAr : s.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 font-bold tracking-wider rounded-sm">
                      {language === 'ar' ? threat.ar : threat.en}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono ml-auto tabular-nums">
                      {timeAgo(s.timestamp)}
                    </span>
                  </div>
                  <span className="text-[11px] text-red-400/60 mt-0.5 block">
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
}: {
  title: string;
  icon: React.ReactNode;
  live?: boolean;
  count?: number;
  onClose?: () => void;
}) {
  return (
    <div className="px-3 py-1.5 border-b border-border/40 border-l-2 border-l-primary/60 flex items-center gap-2 bg-card/60 shrink-0">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90 font-mono">{title}</span>
      {count !== undefined && (
        <span className="text-[9px] px-1.5 py-0 font-mono text-primary/50 bg-primary/5 rounded border border-primary/15">
          {count}
        </span>
      )}
      <div className="flex-1" />
      {live && (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-400/70 font-bold font-mono">LIVE</span>
        </div>
      )}
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

function NewsPanel({ news, language, onClose }: { news: NewsItem[]; language: 'en' | 'ar'; onClose?: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Breaking News' : '\u0623\u062E\u0628\u0627\u0631 \u0639\u0627\u062C\u0644\u0629'}
        icon={<Newspaper className="w-3.5 h-3.5" />}
        live
        count={news.length}
        onClose={onClose}
      />
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/30">
          {news.length === 0 && (
            <div className="px-3 py-8 text-center">
              <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-muted-foreground">Loading intelligence feeds...</p>
            </div>
          )}
          {news.map((item, index) => {
            const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.breaking;
            const isBreaking = item.category === 'breaking';
            return (
              <div
                key={item.id}
                className={`px-3 py-2 hover-elevate cursor-pointer animate-fade-in ${isBreaking ? 'border-l-2 border-l-red-500/50' : 'border-l-2 border-l-transparent'}`}
                style={{ animationDelay: `${index * 30}ms` }}
                data-testid={`news-item-${item.id}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <Badge variant={style.variant} className="text-[8px] px-1 py-0 h-[15px] font-bold tracking-wider rounded-sm">
                    {item.category.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums ml-auto">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-foreground/85 leading-[1.5] font-medium">
                  {language === 'ar' && item.titleAr ? item.titleAr : item.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Radio className="w-2.5 h-2.5 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/60 font-medium">{item.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function CommodityRow({ c, language }: { c: CommodityData; language: 'en' | 'ar' }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1 font-mono text-xs items-center hover-elevate transition-colors"
      data-testid={`commodity-${c.symbol}`}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-foreground/90 font-bold text-[11px] truncate">{c.symbol}</span>
        <span className="text-[9px] text-muted-foreground/70 leading-tight truncate">{language === 'ar' ? c.nameAr : c.name}</span>
      </div>
      <span className="text-foreground/80 tabular-nums text-right font-semibold whitespace-nowrap text-[11px]">
        {formatPrice(c)}
      </span>
      <div className={`flex items-center gap-0.5 justify-end tabular-nums font-semibold whitespace-nowrap min-w-[48px] text-[11px] ${c.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        <div className={`w-0.5 h-2.5 rounded-full ${c.change >= 0 ? 'bg-emerald-500/40' : 'bg-red-500/40'}`} />
        <span>{c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 py-0.5 bg-primary/5 border-y border-primary/10">
      <span className="text-[8px] uppercase tracking-[0.2em] text-primary/50 font-bold font-mono">{label}</span>
    </div>
  );
}

function CommoditiesPanel({
  commodities,
  language,
  onClose,
}: {
  commodities: CommodityData[];
  language: 'en' | 'ar';
  onClose?: () => void;
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
      />
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-0.5 text-[8px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold border-b border-border/20">
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
              className="px-3 py-1.5 animate-fade-in hover-elevate border-l-2 border-l-red-500/40"
              data-testid={`siren-panel-${s.id}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse-dot shrink-0" />
                <span className="text-[11px] text-red-300/90 font-bold truncate flex-1">
                  {language === 'ar' ? s.locationAr : s.location}
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums shrink-0">
                  {timeAgo(s.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] px-1 py-0.5 rounded border font-bold tracking-wider uppercase font-mono ${colors}`}>
                  {language === 'ar' ? threat.ar : threat.en}
                </span>
                <span className="text-[10px] text-muted-foreground/50 truncate">
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

function FlightRadarPanel({ flights, language, onClose }: { flights: FlightData[]; language: 'en' | 'ar'; onClose?: () => void }) {
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
      />
      {flights.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Plane className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Scanning airspace...</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((f) => {
          const style = FLIGHT_TYPE_STYLES[f.type] || FLIGHT_TYPE_STYLES.commercial;
          return (
            <div
              key={f.id}
              className="px-3 py-2 hover-elevate animate-fade-in"
              data-testid={`flight-${f.id}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-foreground/25 shrink-0 inline-block"
                  style={{ transform: `rotate(${f.heading}deg)`, fontSize: '9px', lineHeight: 1 }}
                >▲</span>
                <span className="text-[10px] font-bold font-mono text-foreground/90 truncate flex-1">{f.callsign}</span>
                <span className={`text-[7px] px-1 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-1 text-[8px] font-mono text-muted-foreground/70">
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

function AdsbPanel({ language, onClose }: { language: 'en' | 'ar'; onClose?: () => void }) {
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
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Radar className="w-3.5 h-3.5 text-cyan-400/70" />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
          ADS-B
        </span>
        <span className="text-[9px] px-1.5 py-0 font-mono text-cyan-400/60 bg-cyan-950/30 rounded border border-cyan-500/20">
          {adsbFlights.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <div className="px-2 py-1.5 border-b border-border/30 flex gap-1 flex-wrap shrink-0">
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
            className={`text-[8px] px-1.5 py-0.5 rounded font-bold font-mono border transition-colors ${
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
            <p className="text-[10px] text-muted-foreground">Scanning ADS-B feeds...</p>
          </div>
        )}

        {selectedFlight && (
          <div className="px-3 py-2 bg-cyan-950/20 border-b border-cyan-500/20 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold font-mono text-cyan-300">{selectedFlight.callsign}</span>
              <button
                onClick={() => setSelectedFlight(null)}
                className="text-muted-foreground/40 text-[10px]"
                data-testid="adsb-close-detail"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px] font-mono">
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
                className={`px-3 py-1.5 cursor-pointer transition-colors ${
                  selectedFlight?.id === f.id ? 'bg-cyan-950/30' : ''
                } ${f.flagged ? 'border-l-2 border-l-amber-500/60' : ''}`}
                onClick={() => setSelectedFlight(f)}
                data-testid={`adsb-flight-${f.id}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-foreground/25 shrink-0 inline-block"
                    style={{ transform: `rotate(${f.heading}deg)`, fontSize: '8px', lineHeight: 1 }}
                  >
                    {'\u25B2'}
                  </span>
                  <span className="text-[9px] font-bold font-mono text-foreground/90 truncate">{f.callsign}</span>
                  <span className="text-[7px] text-muted-foreground/40 font-mono">{f.hex}</span>
                  <span className={`text-[7px] px-1 py-0 rounded border font-bold font-mono ml-auto ${style.color} ${style.bg}`}>
                    {style.label}
                  </span>
                  {f.flagged && <span className="text-[7px] px-1 py-0 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 font-bold font-mono">!</span>}
                </div>
                <div className="flex items-center gap-2 text-[7px] font-mono text-muted-foreground/50">
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

function ConflictEventsPanel({ events, language, onClose }: { events: ConflictEvent[]; language: 'en' | 'ar'; onClose?: () => void }) {
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
      />
      {events.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">No active events</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((e) => {
          const sev = SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.low;
          const icon = EVENT_TYPE_ICONS[e.type] || '📍';
          return (
            <div
              key={e.id}
              className="px-3 py-2 hover-elevate animate-fade-in border-l-2"
              style={{ borderLeftColor: e.severity === 'critical' ? 'rgb(239 68 68 / 0.6)' : e.severity === 'high' ? 'rgb(249 115 22 / 0.6)' : 'transparent' }}
              data-testid={`conflict-event-${e.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] shrink-0">{icon}</span>
                <span className="text-[11px] font-bold font-mono text-foreground truncate flex-1">
                  {language === 'ar' && e.titleAr ? e.titleAr : e.title}
                </span>
                <span className={`text-[7px] px-1 py-0.5 rounded border font-bold font-mono shrink-0 ${sev.color} ${sev.bg}`}>
                  {e.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/80 leading-relaxed line-clamp-2 mb-1">
                {language === 'ar' && e.descriptionAr ? e.descriptionAr : e.description}
              </p>
              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
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

function MaritimePanel({ ships, language, onClose }: { ships: ShipData[]; language: 'en' | 'ar'; onClose?: () => void }) {
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
      />
      {ships.length === 0 && (
        <div className="px-3 py-6 text-center">
          <Anchor className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground">Scanning waters...</p>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {sorted.map((s) => {
          const style = SHIP_TYPE_STYLES[s.type] || SHIP_TYPE_STYLES.cargo;
          return (
            <div
              key={s.id}
              className="px-3 py-2 hover-elevate animate-fade-in"
              data-testid={`ship-${s.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-foreground/30 shrink-0 inline-block"
                  style={{ transform: `rotate(${s.heading}deg)`, fontSize: '10px', lineHeight: 1 }}
                >▲</span>
                <span className="text-[11px] font-bold font-mono text-foreground truncate flex-1">{s.name}</span>
                <span className={`text-[7px] px-1 py-0.5 rounded border font-bold font-mono ${style.color} ${style.bg}`}>
                  {style.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-1 text-[9px] font-mono text-muted-foreground">
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
    <div className={`font-mono text-center ${isImmediate ? 'text-red-400' : isUrgent ? 'text-red-400 animate-pulse' : remaining === 0 ? 'text-muted-foreground/50' : 'text-amber-400/90'}`}>
      <div className="text-sm font-bold tabular-nums leading-none" data-testid={`red-alert-countdown-${alert.id}`}>
        {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}s` : '--'}
      </div>
      <div className="text-[8px] text-muted-foreground/50 mt-0.5">
        {isImmediate ? '\u05DE\u05D9\u05D9\u05D3\u05D9' : remaining > 0 ? 'shelter' : 'expired'}
      </div>
    </div>
  );
}

function RedAlertPanel({ alerts, language, onClose }: { alerts: RedAlert[]; language: 'en' | 'ar'; onClose?: () => void }) {
  const grouped = alerts.reduce<Record<string, RedAlert[]>>((acc, alert) => {
    const key = language === 'ar' ? alert.regionAr : alert.region;
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {});

  const sortedRegions = Object.entries(grouped).sort((a, b) => {
    const minA = Math.min(...a[1].map(a => a.countdown));
    const minB = Math.min(...b[1].map(b => b.countdown));
    return minA - minB;
  });

  return (
    <div className="flex flex-col" data-testid="red-alert-panel">
      <div className="px-3 py-1.5 border-b border-red-900/40 flex items-center gap-2 bg-red-950/20 shrink-0">
        <AlertOctagon className="w-3.5 h-3.5 text-red-400/80" />
        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
            {language === 'ar' ? '\u0627\u0644\u0625\u0646\u0630\u0627\u0631 \u0627\u0644\u0623\u062D\u0645\u0631' : 'RED ALERT'}
          </span>
          <span className="text-[8px] text-red-400/40 font-mono">\u05E6\u05D1\u05E2 \u05D0\u05D3\u05D5\u05DD</span>
        </div>
        <span className="text-[9px] px-1.5 py-0 font-mono text-red-400/70 bg-red-950/40 rounded border border-red-500/25 font-bold">
          {alerts.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-red-400/60 font-bold">LIVE</span>
        </div>
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      {alerts.length === 0 && (
        <div className="px-3 py-8 text-center">
          <Shield className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
          <p className="text-xs text-emerald-400/70 font-mono">{language === 'ar' ? '\u0644\u0627 \u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0646\u0634\u0637\u0629' : 'No active alerts'}</p>
          <p className="text-[10px] text-muted-foreground mt-1">\u05D0\u05D9\u05DF \u05D4\u05EA\u05E8\u05E2\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA</p>
        </div>
      )}

      <div className="divide-y divide-red-900/30">
        {sortedRegions.map(([regionName, regionAlerts]) => (
          <div key={regionName}>
            <div className="px-3 py-1 bg-red-950/30 border-b border-red-900/20">
              <span className="text-[10px] uppercase tracking-[0.15em] text-red-400/80 font-bold font-mono">{regionName}</span>
            </div>
            {regionAlerts.sort((a, b) => a.countdown - b.countdown).map((alert) => {
              const threat = RED_ALERT_THREAT_LABELS[alert.threatType] || RED_ALERT_THREAT_LABELS.rockets;
              const threatColor = RED_ALERT_THREAT_COLORS[alert.threatType] || RED_ALERT_THREAT_COLORS.rockets;
              return (
                <div
                  key={alert.id}
                  className="px-3 py-1.5 flex items-center gap-2 animate-fade-in hover-elevate border-l-2 border-l-red-500/40"
                  data-testid={`red-alert-${alert.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <MapPin className="w-2.5 h-2.5 text-red-400/70 shrink-0" />
                      <span className="text-[11px] text-red-300/90 font-bold truncate">
                        {language === 'ar' ? alert.cityAr : alert.city}
                      </span>
                      <span className="text-[9px] text-red-400/40 font-mono" dir="rtl">{alert.cityHe}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 py-0.5 rounded text-white/90 font-bold tracking-wider uppercase font-mono ${threatColor}`}>
                        {language === 'ar' ? threat.ar : threat.en}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60 font-mono tabular-nums">
                        {timeAgo(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                  <RedAlertCountdown alert={alert} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TelegramPanel({
  messages,
  language,
  onClose,
}: {
  messages: TelegramMessage[];
  language: 'en' | 'ar';
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Telegram Feed' : '\u062A\u0644\u063A\u0631\u0627\u0645'}
        icon={<Send className="w-3.5 h-3.5" />}
        live
        count={messages.length}
        onClose={onClose}
      />
      <div className="divide-y divide-border/20">
        {messages.length === 0 && (
          <div className="px-3 py-6 text-center">
            <SiTelegram className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Connecting to channels...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="px-3 py-2 animate-fade-in hover-elevate" data-testid={`telegram-msg-${msg.id}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <SiTelegram className="w-3 h-3 text-sky-400/80 shrink-0" />
              <span className="text-[11px] text-sky-400/90 font-bold truncate">{msg.channel}</span>
              <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
            </div>
            <p className="text-xs text-foreground/70 leading-[1.55]">
              {language === 'ar' && msg.textAr ? msg.textAr : msg.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapLegend({ activeView, language }: { activeView: string; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-md border border-primary/15 rounded-md p-2 text-[10px] space-y-1" dir="ltr">
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

function AIIntelPanel({ language, onClose }: { language: 'en' | 'ar'; onClose?: () => void }) {
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
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Brain className="w-3.5 h-3.5 text-purple-400/70" />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
          {language === 'en' ? 'AI Intel' : '\u0630\u0643\u0627\u0621'}
        </span>
        <span className="text-[8px] px-1.5 py-0 font-mono text-purple-400/50 bg-purple-950/30 rounded border border-purple-500/20">
          {brief?.model || '...'}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-purple-400/40" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
        {onClose && <PanelMinimizeButton onMinimize={onClose} />}
      </div>

      <ScrollArea className="flex-1">
        {briefLoading && (
          <div className="px-3 py-8 text-center">
            <Brain className="w-6 h-6 text-purple-400/40 mx-auto mb-2 animate-pulse" />
            <p className="text-[10px] text-muted-foreground">Synthesizing intelligence brief...</p>
          </div>
        )}

        {brief && (
          <div className="divide-y divide-border/30">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/70">
                  {language === 'en' ? 'World Brief' : '\u0645\u0648\u062C\u0632 \u0639\u0627\u0644\u0645\u064A'}
                </span>
                {brief.riskLevel && (
                  <Badge className={`text-[8px] px-1 py-0 h-[15px] font-bold border ${RISK_COLORS[brief.riskLevel] || ''}`}>
                    {brief.riskLevel}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-foreground/70 leading-[1.6]">
                {language === 'ar' ? brief.summaryAr : brief.summary}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {brief.focalPoints.map((fp, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-purple-950/30 border border-purple-500/20 text-purple-300/70 font-mono">
                    {fp}
                  </span>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground/40 font-mono mt-1.5">
                {new Date(brief.generatedAt).toLocaleTimeString()} UTC
              </div>
            </div>

            <div className="px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/70 mb-1.5 block">
                {language === 'en' ? 'Key Developments' : '\u062A\u0637\u0648\u0631\u0627\u062A \u0631\u0626\u064A\u0633\u064A\u0629'}
              </span>
              <div className="space-y-1.5">
                {brief.keyDevelopments.map((dev, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="mt-0.5 shrink-0">
                      <Badge className={`text-[7px] px-1 py-0 h-[13px] font-bold border ${DEV_SEVERITY_STYLES[dev.severity] || ''}`}>
                        {dev.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] text-muted-foreground/50 font-bold uppercase tracking-wider">{dev.category}</span>
                      <p className="text-[10px] text-foreground/75 leading-[1.5]">
                        {language === 'ar' ? dev.textAr : dev.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3 h-3 text-amber-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/70">
                  {language === 'en' ? 'AI Deduction' : '\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0630\u0643\u064A'}
                </span>
              </div>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={deductQuery}
                  onChange={(e) => setDeductQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDeduct()}
                  placeholder={language === 'en' ? 'What will happen in the next 24h?' : '\u0645\u0627\u0630\u0627 \u0633\u064A\u062D\u062F\u062B \u0641\u064A \u0627\u0644\u0640 24 \u0633\u0627\u0639\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629\u061F'}
                  className="flex-1 bg-card/50 border border-border/50 rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-purple-500/50 font-mono"
                  data-testid="input-ai-deduction"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] px-2 h-6 text-purple-400"
                  onClick={handleDeduct}
                  disabled={deductMutation.isPending || !deductQuery.trim()}
                  data-testid="button-ai-deduct"
                >
                  {deductMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
              </div>

              {deductResult && (
                <div className="bg-card/30 border border-border/30 rounded p-2 animate-fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-[8px] px-1 py-0 h-[14px] font-mono bg-purple-950/40 border-purple-500/30 text-purple-300">
                      {Math.round(deductResult.confidence * 100)}% confidence
                    </Badge>
                    <span className="text-[8px] text-muted-foreground/40 font-mono">{deductResult.timeframe}</span>
                  </div>
                  <p className="text-[10px] text-foreground/75 leading-[1.6] whitespace-pre-line">
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
  language,
  onClose,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  adsbFlights: AdsbFlight[];
  language: 'en' | 'ar';
  onClose?: () => void;
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');

  const views = [
    { key: 'conflict' as const, icon: AlertTriangle, label: language === 'en' ? 'Conflict' : '\u0646\u0632\u0627\u0639', labelEn: 'Conflict' },
    { key: 'flights' as const, icon: Plane, label: language === 'en' ? 'Flights' : '\u0631\u062D\u0644\u0627\u062A', labelEn: 'Flights' },
    { key: 'maritime' as const, icon: Anchor, label: language === 'en' ? 'Hormuz' : '\u0647\u0631\u0645\u0632', labelEn: 'Hormuz' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-2 bg-card/40 shrink-0">
        <Target className="w-3.5 h-3.5 text-primary/70 shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/80">
          {language === 'en' ? 'Map' : '\u062E\u0631\u064A\u0637\u0629'}
        </span>
        <div className="flex items-center gap-0.5 bg-card/50 rounded border border-border/30 p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
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
          <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-500/60 font-bold">LIVE</span>
        </div>
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
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              }
            >
              <ConflictMap
                events={events}
                flights={flights}
                ships={ships}
                adsbFlights={adsbFlights}
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
            <span className="text-[11px] text-foreground/70 font-mono">
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
    <div className="h-6 border-t border-primary/10 bg-primary/3 overflow-hidden relative shrink-0" data-testid="news-ticker">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 flex items-center pl-2">
        <span className="text-[7px] font-bold tracking-[0.25em] text-primary/60 font-mono">INTEL</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="absolute flex items-center h-full gap-8 animate-ticker-scroll whitespace-nowrap pl-14">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-[10px] font-mono">
            <span className={`font-bold uppercase tracking-wider text-[8px] ${CATEGORY_COLORS[item.category] || 'text-primary'}`}>
              {item.category}
            </span>
            <span className="text-foreground/75">{language === 'ar' && item.titleAr ? item.titleAr : item.title}</span>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <span className="text-muted-foreground/50 text-[9px]">{item.source}</span>
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
    news: true, intel: true, map: true, events: true, radar: true, adsb: false, alerts: true, markets: true,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const closePanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: false }));
  }, []);

  const openPanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: true }));
  }, []);

  const closedPanels = useMemo(() =>
    (Object.keys(visiblePanels) as PanelId[]).filter(k => !visiblePanels[k]),
    [visiblePanels]
  );

  const { data: news = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
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

  const panelOrder: PanelId[] = ['news', 'intel', 'map', 'events', 'radar', 'adsb', 'alerts', 'markets'];
  const activePanels = panelOrder.filter(id => visiblePanels[id]);
  const panelCount = activePanels.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = { news: 11, intel: 13, map: 24, events: 10, radar: 10, adsb: 13, alerts: 12, markets: 16 };
  const [colWidths, setColWidths] = useState(defaultWidths);

  const activeWidths = useMemo(() => {
    const raw = activePanels.map(id => colWidths[id]);
    const total = raw.reduce((s, w) => s + w, 0);
    return raw.map(w => (w / total) * 100);
  }, [activePanels, colWidths]);

  const makeResizer = useCallback((leftIdx: number) => (delta: number) => {
    if (!containerRef.current || leftIdx >= activePanels.length - 1) return;
    const totalWidth = containerRef.current.offsetWidth;
    const pctDelta = (delta / totalWidth) * 100;
    const leftId = activePanels[leftIdx];
    const rightId = activePanels[leftIdx + 1];
    setColWidths(prev => {
      const totalActive = activePanels.reduce((s, id) => s + prev[id], 0);
      const leftPct = (prev[leftId] / totalActive) * 100;
      const rightPct = (prev[rightId] / totalActive) * 100;
      const newLeft = leftPct + pctDelta;
      const newRight = rightPct - pctDelta;
      if (newLeft < 8 || newRight < 8) return prev;
      const leftRaw = (newLeft / 100) * totalActive;
      const rightRaw = (newRight / 100) * totalActive;
      return { ...prev, [leftId]: leftRaw, [rightId]: rightRaw };
    });
  }, [activePanels]);

  const renderPanel = (id: PanelId) => {
    const close = () => closePanel(id);
    switch (id) {
      case 'news':
        return <NewsPanel news={news} language={language} onClose={close} />;
      case 'intel':
        return <AIIntelPanel language={language} onClose={close} />;
      case 'map':
        return <MapSection events={events} flights={flights} ships={ships} adsbFlights={adsbFlights} language={language} onClose={close} />;
      case 'events':
        return (
          <ScrollArea className="h-full">
            <ConflictEventsPanel events={events} language={language} onClose={close} />
          </ScrollArea>
        );
      case 'radar':
        return (
          <>
            <div className="flex-1 flex flex-col min-h-0 border-b border-border overflow-hidden">
              <ScrollArea className="h-full">
                <FlightRadarPanel flights={flights} language={language} onClose={close} />
              </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <MaritimePanel ships={ships} language={language} />
              </ScrollArea>
            </div>
          </>
        );
      case 'adsb':
        return <AdsbPanel language={language} onClose={close} />;
      case 'alerts':
        return (
          <ScrollArea className="h-full">
            <RedAlertPanel alerts={redAlerts} language={language} onClose={close} />
            <div className="border-t border-border">
              <SirensPanel sirens={sirens} language={language} />
            </div>
          </ScrollArea>
        );
      case 'markets':
        return (
          <ScrollArea className="h-full">
            <CommoditiesPanel commodities={commodities} language={language} onClose={close} />
            <div className="border-t border-border">
              <TelegramPanel messages={telegramMessages} language={language} />
            </div>
          </ScrollArea>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="dashboard">
      <header className="h-10 border-b-2 border-primary/15 flex items-center justify-between px-4 bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <Crosshair className="w-3 h-3 text-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[13px] tracking-[0.05em] text-primary font-mono" style={{textShadow:'0 0 18px hsl(185 88% 44% / 0.5)'}}>WARROOM</span>
              <span className="text-[8px] text-muted-foreground/40 tracking-[0.1em] font-mono hidden sm:block">
                {language === 'en' ? 'ME INTEL TERMINAL' : '\u0645\u062D\u0637\u0629 \u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A'}
              </span>
            </div>
          </div>
          <div className="w-px h-5 bg-border/30 hidden sm:block" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/30 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-[9px] text-red-400/90 font-bold tracking-[0.15em] uppercase font-mono">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LiveClock />
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={`text-[10px] px-2 h-7 font-mono rounded ${soundEnabled ? 'text-primary' : 'text-muted-foreground/50'} hover:text-foreground`}
              onClick={() => setSoundEnabled(p => !p)}
              data-testid="button-sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] px-2 h-7 font-mono text-muted-foreground/60 hover:text-foreground rounded"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              data-testid="button-language-toggle"
            >
              <Languages className="w-3.5 h-3.5 mr-1" />
              {language === 'en' ? '\u0639\u0631\u0628\u064A' : 'EN'}
            </Button>
          </div>
          <div className="w-px h-4 bg-border/30" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="text-[9px] text-emerald-400/80 font-bold tracking-wider font-mono hidden sm:inline uppercase">
              {language === 'en' ? 'CONNECTED' : '\u0645\u062A\u0635\u0644'}
            </span>
          </div>
        </div>
      </header>

      <TickerBar commodities={commodities} />

      <SirenBanner sirens={sirens} language={language} />

      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden border-t border-border/20" data-testid="resizable-panels">
        {activePanels.map((id, idx) => (
          <div key={id} className="contents">
            {idx > 0 && <ResizeHandle onResize={makeResizer(idx - 1)} />}
            <div
              className={`overflow-hidden flex flex-col min-h-0 ${idx < activePanels.length - 1 ? 'border-r border-border/30' : ''}`}
              style={{ width: `${activeWidths[idx]}%`, background: 'hsl(var(--background))' }}
            >
              {renderPanel(id)}
            </div>
          </div>
        ))}
        {panelCount === 0 && (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <PanelLeft className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/50 font-medium">{language === 'en' ? 'All panels minimized' : '\u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0635\u063A\u0631\u0629'}</p>
              <p className="text-[11px] text-muted-foreground/30 mt-1">{language === 'en' ? 'Restore panels from the bar below' : '\u0627\u0633\u062A\u0639\u062F \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u0634\u0631\u064A\u0637 \u0623\u062F\u0646\u0627\u0647'}</p>
            </div>
          </div>
        )}
      </div>

      <NewsTicker news={news} language={language} />

      <div className="h-8 border-t border-border/40 flex items-center px-3 bg-card/20 shrink-0 gap-2 overflow-hidden" data-testid="status-bar">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/15">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[9px] text-emerald-400/70 font-mono font-bold">ONLINE</span>
        </div>
        <div className="w-px h-4 bg-border/30" />
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-muted-foreground/50"><span className="text-foreground/35">SRC</span> 12</span>
          <span className="text-muted-foreground/50"><span className="text-foreground/35">EVT</span> {events.length}</span>
          <span className="text-muted-foreground/50"><span className="text-foreground/35">FLT</span> {flights.length}</span>
          <span className="text-muted-foreground/50"><span className="text-cyan-400/35">ADS</span> {adsbFlights.length}</span>
          <span className="text-muted-foreground/50"><span className="text-foreground/35">VES</span> {ships.length}</span>
          <span className="text-muted-foreground/50"><span className="text-foreground/35">MKT</span> {commodities.length}</span>
        </div>
        {(redAlerts.length > 0 || sirens.length > 0) && (
          <>
            <div className="w-px h-4 bg-border/30" />
            <div className="flex items-center gap-2 text-[9px] font-mono">
              {redAlerts.length > 0 && (
                <span className="text-red-400/90 font-bold animate-pulse px-1.5 py-0.5 rounded bg-red-950/30 border border-red-500/20">
                  RED {redAlerts.length}
                </span>
              )}
              {sirens.length > 0 && (
                <span className="text-red-400/70 font-bold px-1.5 py-0.5 rounded bg-red-950/20 border border-red-500/15">
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
              <span className="text-[8px] text-muted-foreground/40 font-mono uppercase tracking-wider hidden sm:inline">Restore:</span>
              {closedPanels.map(id => {
                const cfg = PANEL_CONFIG[id];
                const Icon = cfg.icon;
                return (
                  <button
                    key={id}
                    onClick={() => openPanel(id)}
                    className="group flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-primary/80 bg-primary/10 hover:bg-primary/25 hover:text-primary transition-all border border-primary/25 hover:border-primary/40"
                    title={`Restore ${cfg.label} panel`}
                    data-testid={`button-open-panel-${id}`}
                  >
                    <Maximize2 className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <Icon className="w-2.5 h-2.5" />
                    {language === 'en' ? cfg.label : cfg.labelAr}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <span className="text-[8px] text-muted-foreground/35 font-mono ml-auto hidden sm:inline tracking-wider">
          WARROOM v1.0
        </span>
      </div>
    </div>
  );
}
