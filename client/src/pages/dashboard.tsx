import { useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/theme-provider';
import type {
  NewsItem,
  CommodityData,
  ConflictEvent,
  FlightData,
  ShipData,
  TelegramMessage,
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
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';

const ConflictMap = lazy(() => import('@/components/conflict-map'));

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
      <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">{dateStr}</span>
      <span className="text-sm text-foreground font-mono font-semibold tabular-nums tracking-tight">{formatted}</span>
      <span className="text-[9px] text-muted-foreground">UTC</span>
    </div>
  );
}

function TickerBar({ commodities }: { commodities: CommodityData[] }) {
  if (!commodities.length) return <div className="h-7 border-b border-border bg-card/20" />;
  const items = [...commodities, ...commodities, ...commodities];

  return (
    <div className="h-7 border-b border-border bg-card/20 overflow-hidden relative" data-testid="ticker-bar">
      <div className="absolute flex items-center h-full gap-6 animate-ticker-scroll whitespace-nowrap px-4">
        {items.map((c, i) => (
          <span key={`${c.symbol}-${i}`} className="inline-flex items-center gap-1 font-mono text-[10px]">
            <span className="text-primary font-bold">{c.symbol}</span>
            <span className="text-foreground/80">
              {c.currency === 'USD' ? '$' : ''}{c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`inline-flex items-center gap-0.5 ${c.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
            </span>
            <span className="text-border mx-1">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  icon,
  live,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  live?: boolean;
  count?: number;
}) {
  return (
    <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 bg-card/40 shrink-0">
      <span className="text-primary">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{title}</span>
      {count !== undefined && (
        <span className="text-[9px] text-muted-foreground font-mono">({count})</span>
      )}
      {live && (
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-red-400 font-bold">LIVE</span>
        </div>
      )}
    </div>
  );
}

const CATEGORY_STYLES: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; color: string }> = {
  breaking: { variant: 'destructive', color: 'text-red-400' },
  military: { variant: 'default', color: 'text-orange-400' },
  diplomatic: { variant: 'secondary', color: 'text-blue-400' },
  economic: { variant: 'outline', color: 'text-emerald-400' },
};

function NewsPanel({ news, language }: { news: NewsItem[]; language: 'en' | 'ar' }) {
  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Breaking News' : '\u0623\u062E\u0628\u0627\u0631 \u0639\u0627\u062C\u0644\u0629'}
        icon={<Newspaper className="w-3.5 h-3.5" />}
        live
        count={news.length}
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
            return (
              <div
                key={item.id}
                className="px-3 py-2 hover-elevate cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
                data-testid={`news-item-${item.id}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <Badge variant={style.variant} className="text-[8px] px-1 py-0 h-3.5 font-bold tracking-wider">
                    {item.category.toUpperCase()}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground font-mono tabular-nums">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-foreground/90 leading-[1.5] font-medium">
                  {language === 'ar' && item.titleAr ? item.titleAr : item.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Radio className="w-2 h-2 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground font-medium">{item.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function CommoditiesPanel({
  commodities,
  language,
}: {
  commodities: CommodityData[];
  language: 'en' | 'ar';
}) {
  return (
    <div className="flex flex-col">
      <PanelHeader
        title={language === 'en' ? 'Commodities & FX' : '\u0627\u0644\u0633\u0644\u0639 \u0648\u0627\u0644\u0639\u0645\u0644\u0627\u062A'}
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        live
      />
      <div className="divide-y divide-border/20">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 px-3 py-1 text-[8px] uppercase tracking-[0.15em] text-muted-foreground font-bold border-b border-border/30">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Chg%</span>
        </div>
        {commodities.map((c) => (
          <div
            key={c.symbol}
            className="grid grid-cols-[1fr_auto_auto] gap-x-2 px-3 py-1.5 font-mono text-[10px] items-center hover-elevate"
            data-testid={`commodity-${c.symbol}`}
          >
            <div className="flex flex-col">
              <span className="text-foreground font-bold text-[10px]">{c.symbol}</span>
              <span className="text-[8px] text-muted-foreground leading-tight">{language === 'ar' ? c.nameAr : c.name}</span>
            </div>
            <span className="text-foreground tabular-nums text-right font-semibold">
              {c.currency === 'USD' ? '$' : ''}{c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-0.5 justify-end tabular-nums font-semibold ${c.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              <span>{c.change >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelegramPanel({
  messages,
  language,
}: {
  messages: TelegramMessage[];
  language: 'en' | 'ar';
}) {
  return (
    <div className="flex flex-col h-full">
      <PanelHeader
        title={language === 'en' ? 'Telegram Feed' : '\u062A\u0644\u063A\u0631\u0627\u0645'}
        icon={<Send className="w-3.5 h-3.5" />}
        live
        count={messages.length}
      />
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
          {messages.length === 0 && (
            <div className="px-3 py-6 text-center">
              <SiTelegram className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">Connecting to channels...</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="px-3 py-1.5 animate-fade-in" data-testid={`telegram-msg-${msg.id}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <SiTelegram className="w-2.5 h-2.5 text-sky-400" />
                <span className="text-[9px] text-sky-400 font-bold">{msg.channel}</span>
                <span className="text-[8px] text-muted-foreground font-mono ml-auto tabular-nums">{timeAgo(msg.timestamp)}</span>
              </div>
              <p className="text-[10px] text-foreground/75 leading-[1.5]">
                {language === 'ar' && msg.textAr ? msg.textAr : msg.text}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MapLegend({ activeView, language }: { activeView: string; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md p-2 text-[8px] space-y-0.5" dir="ltr">
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

function MapSection({
  events,
  flights,
  ships,
  language,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  language: 'en' | 'ar';
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');

  const views = [
    { key: 'conflict' as const, icon: AlertTriangle, label: language === 'en' ? 'Conflict' : '\u0646\u0632\u0627\u0639', labelEn: 'Conflict' },
    { key: 'flights' as const, icon: Plane, label: language === 'en' ? 'Flights' : '\u0631\u062D\u0644\u0627\u062A', labelEn: 'Flights' },
    { key: 'maritime' as const, icon: Anchor, label: language === 'en' ? 'Hormuz' : '\u0647\u0631\u0645\u0632', labelEn: 'Hormuz' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5 bg-card/40 shrink-0 flex-wrap">
        <Target className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mr-auto">
          {language === 'en' ? 'Intelligence Map' : '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A'}
        </span>
        <div className="flex items-center gap-0.5">
          {views.map((v) => (
            <Button
              key={v.key}
              size="sm"
              variant={activeView === v.key ? 'default' : 'ghost'}
              className="text-[9px] px-2"
              onClick={() => setActiveView(v.key)}
              data-testid={`button-map-${v.key}`}
            >
              <v.icon className="w-3 h-3 mr-1" />
              {v.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-red-400 font-bold">LIVE</span>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-card/20">
                <div className="text-center">
                  <Globe className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Loading map...</p>
                </div>
              </div>
            }
          >
            <ConflictMap
              events={events}
              flights={flights}
              ships={ships}
              activeView={activeView}
              language={language}
            />
          </Suspense>
        </div>
        <MapLegend activeView={activeView} language={language} />
        <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-foreground/70 font-mono">
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

export default function Dashboard() {
  const { language, setLanguage } = useLanguage();

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

  const events = intelData?.events || [];
  const flights = intelData?.flights || [];
  const ships = intelData?.ships || [];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden" data-testid="dashboard">
      <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-card/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight text-primary font-mono">WARROOM</span>
          </div>
          <Badge variant="destructive" className="h-3.5 text-[7px] px-1 font-bold tracking-[0.15em] animate-pulse-dot">
            LIVE
          </Badge>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="text-[9px] text-muted-foreground hidden md:inline font-medium">
            {language === 'en' ? 'Middle East Intelligence Terminal' : '\u0645\u062D\u0637\u0629 \u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A \u0627\u0644\u0634\u0631\u0642 \u0627\u0644\u0623\u0648\u0633\u0637'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LiveClock />
          <Separator orientation="vertical" className="h-4" />
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] px-2 font-mono"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            data-testid="button-language-toggle"
          >
            <Languages className="w-3 h-3 mr-1" />
            {language === 'en' ? '\u0639\u0631\u0628\u064A' : 'EN'}
          </Button>
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] text-emerald-400 font-bold tracking-wider hidden sm:inline">
              {language === 'en' ? 'CONNECTED' : '\u0645\u062A\u0635\u0644'}
            </span>
          </div>
        </div>
      </header>

      <TickerBar commodities={commodities} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-border min-h-0 overflow-hidden">
        <div className="col-span-1 lg:col-span-3 bg-background overflow-hidden flex flex-col min-h-0">
          <NewsPanel news={news} language={language} />
        </div>

        <div className="col-span-1 lg:col-span-6 bg-background overflow-hidden flex flex-col min-h-0">
          <MapSection events={events} flights={flights} ships={ships} language={language} />
        </div>

        <div className="col-span-1 lg:col-span-3 bg-background overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-shrink-0" style={{ maxHeight: '55%' }}>
            <CommoditiesPanel commodities={commodities} language={language} />
          </div>
          <div className="border-t border-border flex-1 overflow-hidden min-h-0">
            <TelegramPanel messages={telegramMessages} language={language} />
          </div>
        </div>
      </div>

      <div className="h-5 border-t border-border flex items-center px-3 bg-card/20 shrink-0 gap-3 overflow-hidden" data-testid="status-bar">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[8px] text-muted-foreground font-mono font-medium">ONLINE</span>
        </div>
        <span className="text-[8px] text-muted-foreground font-mono">
          SRC: 12
        </span>
        <span className="text-[8px] text-muted-foreground font-mono">
          EVT: {events.length}
        </span>
        <span className="text-[8px] text-muted-foreground font-mono">
          FLT: {flights.length}
        </span>
        <span className="text-[8px] text-muted-foreground font-mono">
          VES: {ships.length}
        </span>
        <span className="text-[8px] text-muted-foreground font-mono ml-auto hidden sm:inline">
          WARROOM TERMINAL v1.0 | {language === 'en' ? 'Iran-Israel-Lebanon Theater' : '\u0645\u0633\u0631\u062D \u0625\u064A\u0631\u0627\u0646-\u0625\u0633\u0631\u0627\u0626\u064A\u0644-\u0644\u0628\u0646\u0627\u0646'}
        </span>
      </div>
    </div>
  );
}
