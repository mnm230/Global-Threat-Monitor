import { useState, useEffect } from "react";
import {
  Activity,
  Globe,
  Wifi,
  BarChart2,
  ShieldAlert,
  MapPin,
  Clock,
  Terminal,
  TrendingUp,
  TrendingDown,
  Zap,
  Radio,
} from "lucide-react";
import type {
  RedAlert,
  TelegramMessage,
  CommodityData,
  BreakingNewsItem,
  ConflictEvent,
  FlightData,
} from "@shared/schema";

// ─── SSE Hook ─────────────────────────────────────────────────────────────────

interface EmberData {
  redAlerts: RedAlert[];
  telegram: TelegramMessage[];
  commodities: CommodityData[];
  breakingNews: BreakingNewsItem[];
  events: ConflictEvent[];
  flights: FlightData[];
  connected: boolean;
}

function useEmberData(): EmberData {
  const [redAlerts, setRedAlerts] = useState<RedAlert[]>([]);
  const [telegram, setTelegram] = useState<TelegramMessage[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    const connect = () => {
      es = new EventSource("/api/stream");

      es.onopen = () => {
        setConnected(true);
        retryCount = 0;
      };

      es.addEventListener("red-alerts", (e) => {
        try {
          const raw: RedAlert[] = JSON.parse(e.data);
          const seen = new Set<string>();
          setRedAlerts(raw.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))));
        } catch {}
      });

      es.addEventListener("telegram", (e) => {
        try { setTelegram(JSON.parse(e.data)); } catch {}
      });

      es.addEventListener("commodities", (e) => {
        try { setCommodities(JSON.parse(e.data)); } catch {}
      });

      es.addEventListener("breaking-news", (e) => {
        try { setBreakingNews(JSON.parse(e.data)); } catch {}
      });

      es.addEventListener("events", (e) => {
        try {
          const d = JSON.parse(e.data);
          setEvents(d.events || []);
          setFlights(d.flights || []);
        } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (retryCount < 6) {
          retryTimeout = setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount++), 30000));
        }
      };
    };

    connect();
    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  return { redAlerts, telegram, commodities, breakingNews, events, flights, connected };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function threatLabel(type: RedAlert["threatType"]): string {
  switch (type) {
    case "rockets": return "ROCKET";
    case "missiles": return "MISSILE";
    case "hostile_aircraft_intrusion": return "AIRCRAFT";
    case "uav_intrusion": return "UAV";
    default: return "THREAT";
  }
}

function defcon(count: number): { label: string; color: string } {
  if (count >= 30) return { label: "DEFCON 1", color: "#ef4444" };
  if (count >= 15) return { label: "DEFCON 2", color: "#c75050" };
  if (count >= 5)  return { label: "DEFCON 3", color: "#f97316" };
  if (count >= 1)  return { label: "DEFCON 4", color: "#eab308" };
  return { label: "DEFCON 5", color: "#22c55e" };
}

const KEY_SYMBOLS = ["GC=F", "XAG=F", "BZ=F", "CL=F", "NG=F", "ZW=F"];
const SYMBOL_LABELS: Record<string, string> = {
  "GC=F": "GOLD/OZ", "XAG=F": "SILVER/OZ",
  "BZ=F": "BRENT/BBL", "CL=F": "WTI/BBL",
  "NG=F": "NATGAS", "ZW=F": "WHEAT/BU",
};

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#6b7280",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarmEmberPage() {
  const { redAlerts, telegram, commodities, breakingNews, events, flights, connected } = useEmberData();
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) + "Z"
  );

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) + "Z");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const dc = defcon(redAlerts.length);
  const milFlights = flights.filter((f) => f.type === "military" || f.type === "surveillance");
  const criticalEvents = [...events].filter((e) => e.severity === "critical" || e.severity === "high").slice(0, 3);

  // Theater status: alert counts by country
  const byCountry: Record<string, number> = {};
  redAlerts.forEach((a) => { byCountry[a.country] = (byCountry[a.country] || 0) + 1; });
  const theaterEntries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCountryCount = Math.max(...theaterEntries.map(([, n]) => n), 1);

  // Market data: filter to key symbols
  const keyMarkets = KEY_SYMBOLS
    .map((sym) => commodities.find((c) => c.symbol === sym))
    .filter(Boolean) as CommodityData[];
  const displayMarkets = keyMarkets.length > 0 ? keyMarkets : commodities.slice(0, 6);

  // Ticker content
  const tickerItems = breakingNews.length > 0
    ? breakingNews.map((b) => b.headline)
    : telegram.slice(0, 8).map((m) => `[${m.channel}] ${m.text.slice(0, 120)}`);
  const tickerText = tickerItems.length > 0
    ? tickerItems.join("   ·   ")
    : "NO ACTIVE ALERTS — MONITORING OPERATIONAL — ALL SYSTEMS NOMINAL";

  // ── Shared panel content fragments ──────────────────────────────────────────

  const statItems = [
    { label: "Active Alerts", value: redAlerts.length, icon: ShieldAlert, color: "#c75050" },
    { label: "Conflict Events", value: events.length, icon: Zap, color: "#f97316" },
    { label: "Mil. Flights", value: milFlights.length, icon: Radio, color: "#d4a574" },
    { label: "SIGINT Msgs", value: telegram.length, icon: Terminal, color: "#c88b4a" },
  ];

  const StatBar = () => (
    <div className="grid grid-cols-4 gap-0 divide-x divide-[#d4a574]/5">
      {statItems.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex flex-col items-center justify-center py-3 gap-1">
          <Icon size={14} style={{ color }} className="opacity-70" />
          <div className="text-xl font-semibold" style={{ color }}>{value}</div>
          <div className="text-[10px] text-[#8c7a6b] uppercase tracking-wider text-center leading-tight">{label}</div>
        </div>
      ))}
    </div>
  );

  const AlertsContent = () => (
    <>
      <div className="h-12 border-b border-[#c75050]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl shrink-0">
        <div className="flex items-center gap-2 text-[#c75050]">
          <ShieldAlert size={16} className="opacity-80" />
          <span className="font-medium text-sm">Active Alerts</span>
        </div>
        <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#c75050]/10">
          {redAlerts.length} EVENTS
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto scroll-hide bg-[#16120f]/20">
        {redAlerts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#8c7a6b] text-xs uppercase tracking-wider opacity-50">
            No active alerts
          </div>
        ) : (
          redAlerts.slice(0, 12).map((a) => (
            <div
              key={a.id}
              className="bg-[#1a1512] border border-[#c75050]/15 p-3 rounded-lg flex flex-col gap-1.5 hover:border-[#c75050]/30 transition-all shadow-sm"
            >
              <div className="flex justify-between items-center">
                <span className="text-[#c75050] font-medium flex items-center gap-1.5 text-sm">
                  <MapPin size={11} className="opacity-70 shrink-0" />
                  <span className="truncate">{a.city || a.region}</span>
                </span>
                <span className="text-[#8c7a6b] text-[10px] shrink-0 ml-1">{timeAgo(a.timestamp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-[#c75050]/10 text-[#c75050] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide border border-[#c75050]/20">
                  {threatLabel(a.threatType)}
                </span>
                <span className="text-[#8c7a6b] text-[10px] uppercase tracking-wider">{a.country}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const SigintContent = () => (
    <>
      <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[#8c7a6b] opacity-70" />
          <span className="font-medium text-sm text-[#d4a574]">Signals Intelligence</span>
        </div>
        <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#d4a574]/5">
          {telegram.length} MSGS
        </span>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto scroll-hide bg-[#16120f]/20">
        {telegram.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#8c7a6b] text-xs uppercase tracking-wider opacity-50">
            Awaiting feed
          </div>
        ) : (
          telegram.slice(0, 15).map((m) => (
            <div key={m.id} className="flex gap-3 leading-relaxed">
              <div className="text-[#8c7a6b] shrink-0 font-mono text-[10px] mt-0.5">
                {new Date(m.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="min-w-0">
                <span className="text-[#c88b4a] font-medium mr-1.5 text-[10px] uppercase tracking-wider bg-[#c88b4a]/10 px-1.5 py-0.5 rounded">
                  {m.channel.replace(/^@/, "")}
                </span>
                <span className="text-[#a89b8d] text-xs">{m.text.slice(0, 160)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const MarketsContent = () => (
    <>
      <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-[#8c7a6b] opacity-70" />
          <span className="font-medium text-sm text-[#d4a574]">Market Status</span>
        </div>
      </div>
      <div className="flex-1 bg-[#16120f]/20 overflow-hidden">
        {displayMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#8c7a6b] text-xs uppercase tracking-wider opacity-50">
            Loading markets
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#8c7a6b] text-[10px] uppercase tracking-wider border-b border-[#d4a574]/5">
                <th className="py-1.5 px-4 font-medium">Asset</th>
                <th className="py-1.5 px-3 font-medium text-right">Price</th>
                <th className="py-1.5 px-3 font-medium text-right">Chg%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4a574]/5">
              {displayMarkets.slice(0, 6).map((c) => (
                <tr key={c.symbol} className="hover:bg-[#d4a574]/5 transition-colors">
                  <td className="py-1.5 px-4 text-[#a89b8d] text-xs">
                    {SYMBOL_LABELS[c.symbol] || c.name.toUpperCase()}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[#d4a574] font-medium text-xs">
                    {c.currency === "USD" ? "$" : ""}{c.price < 10 ? c.price.toFixed(4) : c.price.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-xs">
                    <span className={`flex items-center justify-end gap-0.5 ${c.changePercent >= 0 ? "text-[#d4a574]" : "text-[#c75050]"}`}>
                      {c.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {c.changePercent >= 0 ? "+" : ""}{c.changePercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  const TheaterContent = () => (
    <>
      <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-[#8c7a6b] opacity-70" />
          <span className="font-medium text-sm text-[#d4a574]">Theater Status</span>
        </div>
      </div>
      <div className="flex-1 px-5 bg-[#16120f]/20 flex flex-col justify-center gap-3">
        {theaterEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#8c7a6b] text-xs uppercase tracking-wider opacity-50">
            No alert activity
          </div>
        ) : (
          theaterEntries.map(([country, count]) => {
            const pct = (count / maxCountryCount) * 100;
            const color = pct > 70 ? "#c75050" : pct > 40 ? "#c88b4a" : "#d4a574";
            return (
              <div key={country} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#a89b8d]">{country}</span>
                  <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color }}>
                    {count} {count === 1 ? "alert" : "alerts"}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1a1512] rounded-full overflow-hidden border border-[#d4a574]/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div
      className="min-h-screen text-sm selection:bg-[#c88b4a]/30 flex flex-col"
      style={{
        backgroundColor: "#16120f",
        backgroundImage: "radial-gradient(circle at 50% 0%, #211c17 0%, #16120f 100%)",
        color: "#a89b8d",
        fontFamily: "'Inter', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .pulse-amber {
          animation: pulse-amber 3s ease-in-out infinite;
        }
        @keyframes pulse-amber {
          0%, 100% { opacity: 0.8; box-shadow: 0 0 8px rgba(212,165,116,0.4); }
          50% { opacity: 0.3; box-shadow: 0 0 2px rgba(212,165,116,0.1); }
        }

        .pulse-orange {
          animation: pulse-orange 2s ease-in-out infinite;
        }
        @keyframes pulse-orange {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(200,139,74,0.6); }
          50% { opacity: 0.4; box-shadow: 0 0 2px rgba(200,139,74,0.2); }
        }

        .hud-panel {
          background-color: #1a1512;
          border: 1px solid rgba(212,165,116,0.1);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(180,120,60,0.04), inset 0 1px 0 rgba(255,255,255,0.02);
          transition: all 0.3s ease;
        }

        .hud-panel:hover {
          border-color: rgba(212,165,116,0.25);
          box-shadow: 0 8px 32px rgba(180,120,60,0.08), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 12px rgba(212,165,116,0.05);
        }

        .scroll-hide::-webkit-scrollbar { display: none; }

        .ticker-track {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker-scroll 60s linear infinite;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />

      {/* TOP HEADER */}
      <header className="h-14 sm:h-14 border-b border-[#d4a574]/10 flex items-center justify-between px-4 sm:px-6 bg-[#1a1512]/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 text-[#d4a574] font-semibold tracking-wider text-lg">
            <Globe size={22} className="opacity-80" />
            <span className="hidden xs:inline">WARROOM</span>
          </div>

          <div
            className="flex items-center gap-2 bg-[#1a1512] border px-3 sm:px-4 py-1.5 rounded-full font-medium text-sm"
            style={{ borderColor: dc.color + "33", color: dc.color }}
          >
            <span className="w-2.5 h-2.5 rounded-full pulse-orange" style={{ backgroundColor: dc.color }} />
            <span className="hidden sm:inline">{dc.label}</span>
            <span className="sm:hidden">{dc.label.split(" ")[0]}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#1a1512] border border-[#c88b4a]/20 px-4 py-1.5 rounded-full text-[#c88b4a] font-medium text-sm">
            <Activity size={16} />
            {connected ? "LIVE OPS" : "RECONNECTING"}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/"
            className="text-[#8c7a6b] hover:text-[#d4a574] text-xs uppercase tracking-wider transition-colors hidden lg:inline"
          >
            ← Full Dashboard
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <Clock size={16} className="text-[#8c7a6b]" />
            <div className="text-right flex flex-col justify-center">
              <div className="text-[#d4a574] text-xs sm:text-sm font-medium tracking-wide leading-tight">{time}</div>
              <div className="text-[11px] text-[#8c7a6b] uppercase tracking-wider leading-tight">UTC</div>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-8 border-b border-[#d4a574]/5 bg-[#16120f] overflow-hidden flex items-center shrink-0">
        <div className="shrink-0 px-3 border-r border-[#d4a574]/10 text-[#c88b4a] text-[10px] font-medium uppercase tracking-wider">
          INTEL
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-track text-[#a89b8d] text-[11px] uppercase tracking-wider font-medium px-4">
            <span>{tickerText}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
            <span>{tickerText}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
        <div className="shrink-0 px-3 border-l border-[#d4a574]/10">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${connected ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
        </div>
      </div>

      {/* ── MOBILE / TABLET LAYOUT (< lg) ── */}
      <div className="lg:hidden flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">

          {/* Stat bar */}
          <div className="hud-panel p-3">
            <StatBar />
          </div>

          {/* Alerts + SIGINT: stacked on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="hud-panel flex flex-col min-h-[260px]">
              <AlertsContent />
            </div>
            <div className="hud-panel flex flex-col min-h-[260px]">
              <SigintContent />
            </div>
          </div>

          {/* Markets + Theater: stacked on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="hud-panel flex flex-col min-h-[200px]">
              <MarketsContent />
            </div>
            <div className="hud-panel flex flex-col min-h-[200px]">
              <TheaterContent />
            </div>
          </div>

        </div>

        {/* Sticky back button (mobile/tablet only) */}
        <div className="sticky bottom-0 border-t border-[#d4a574]/10 bg-[#16120f] py-3 px-4">
          <a href="/" className="flex items-center justify-center gap-2 text-[#8c7a6b] hover:text-[#d4a574] text-sm transition-colors">
            ← Back to Full Dashboard
          </a>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (lg+) — original grid ── */}
      <div className="hidden lg:block p-4 h-[calc(100vh-88px)] box-border">
        <main className="w-full h-full grid grid-cols-12 grid-rows-6 gap-4">

          {/* ── STRATEGIC OVERVIEW ── */}
          <div className="hud-panel col-span-8 row-span-4 flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl shrink-0">
              <div className="flex items-center gap-2 text-[#d4a574]">
                <Globe size={16} className="opacity-70" />
                <span className="font-medium text-sm">Strategic Overview</span>
              </div>
              <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#d4a574]/5">
                {connected ? "LIVE" : "RECONNECTING"}
              </span>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-4 gap-0 border-b border-[#d4a574]/5 shrink-0">
              {statItems.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex flex-col items-center justify-center py-3 border-r border-[#d4a574]/5 last:border-0 gap-1">
                  <Icon size={14} style={{ color }} className="opacity-70" />
                  <div className="text-xl font-semibold" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-[#8c7a6b] uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            {/* Map area + critical events */}
            <div className="flex-1 flex overflow-hidden">
              {/* Abstract map */}
              <div className="flex-1 relative bg-[#16120f]/50 overflow-hidden">
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(26,21,18,0.8)] pointer-events-none z-10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-10 border border-[#d4a574] rounded-[40px] rotate-3" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] opacity-[0.06] border border-[#c88b4a] rounded-[30px] -rotate-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] opacity-[0.04] border border-[#d4a574] rounded-[20px] rotate-6" />

                {/* Active alert dots — top N by region */}
                {redAlerts.slice(0, 8).map((a, i) => {
                  const positions = [
                    { top: "28%", left: "62%" }, { top: "35%", left: "55%" },
                    { top: "22%", left: "70%" }, { top: "42%", left: "48%" },
                    { top: "55%", left: "65%" }, { top: "18%", left: "45%" },
                    { top: "60%", left: "38%" }, { top: "32%", left: "75%" },
                  ];
                  const pos = positions[i];
                  return (
                    <div key={a.id} className="absolute z-20 flex items-center" style={pos}>
                      <div
                        className="w-2.5 h-2.5 rounded-full pulse-orange shadow-[0_0_8px_rgba(199,80,80,0.7)]"
                        style={{ backgroundColor: i < 3 ? "#c75050" : "#c88b4a" }}
                      />
                      {i < 4 && (
                        <div className="absolute left-4 top-0 bg-[#1a1512] border border-[#c75050]/20 px-2 py-1 rounded text-[#c75050] whitespace-nowrap text-[10px] shadow-lg">
                          {a.city || a.region}
                        </div>
                      )}
                    </div>
                  );
                })}

                {redAlerts.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="text-[#8c7a6b] text-sm uppercase tracking-widest opacity-40">No Active Alerts</div>
                  </div>
                )}
              </div>

              {/* Critical events sidebar */}
              {criticalEvents.length > 0 && (
                <div className="w-56 border-l border-[#d4a574]/10 flex flex-col bg-[#16120f]/30 shrink-0">
                  <div className="px-3 py-2 border-b border-[#d4a574]/5 text-[10px] text-[#8c7a6b] uppercase tracking-wider">
                    Critical Events
                  </div>
                  <div className="flex-1 overflow-y-auto scroll-hide divide-y divide-[#d4a574]/5">
                    {criticalEvents.map((ev) => (
                      <div key={ev.id} className="p-3 hover:bg-[#d4a574]/5 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ color: SEV_COLORS[ev.severity], backgroundColor: SEV_COLORS[ev.severity] + "15" }}
                          >
                            {ev.severity}
                          </span>
                          <span className="text-[10px] text-[#8c7a6b]">{timeAgo(ev.timestamp)}</span>
                        </div>
                        <div className="text-[#d4a574] text-xs font-medium leading-snug">{ev.title}</div>
                        <div className="text-[#8c7a6b] text-[10px] mt-0.5 leading-snug line-clamp-2">{ev.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ACTIVE ALERTS ── */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
            <AlertsContent />
          </div>

          {/* ── SIGINT FEED ── */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
            <SigintContent />
          </div>

          {/* ── MARKET STATUS ── */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
            <MarketsContent />
          </div>

          {/* ── THEATER STATUS ── */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
            <TheaterContent />
          </div>

        </main>
      </div>
    </div>
  );
}
