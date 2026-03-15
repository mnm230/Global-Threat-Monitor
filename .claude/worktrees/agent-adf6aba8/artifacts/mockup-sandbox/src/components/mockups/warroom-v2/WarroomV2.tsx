import { useState, useEffect, useRef, memo, createContext, useContext } from 'react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const alerts = [
  { id: 1, location: "Ya'ara",         region: "Western Galilee",    type: "ROCKET",   severity: "critical", time: "10s", country: "IL", live: true  },
  { id: 2, location: "Arab Al-Aramshe",region: "Confrontation Line", type: "MISSILE",  severity: "critical", time: "13s", country: "IL", live: true  },
  { id: 3, location: "Shtula",         region: "Western Galilee",    type: "ROCKET",   severity: "critical", time: "16s", country: "IL", live: true  },
  { id: 4, location: "Hanita",         region: "Western Galilee",    type: "UAV",      severity: "high",     time: "18s", country: "IL", live: true  },
  { id: 5, location: "Ghajar",         region: "Confrontation Line", type: "ROCKET",   severity: "high",     time: "1m",  country: "IL", live: false },
  { id: 6, location: "Nabatieh",       region: "South Lebanon",      type: "MISSILE",  severity: "medium",   time: "1m",  country: "LB", live: false },
  { id: 7, location: "Metula",         region: "Northern District",  type: "UAV",      severity: "medium",   time: "2m",  country: "IL", live: false },
  { id: 8, location: "Kiryat Shmona",  region: "Northern District",  type: "AIRCRAFT", severity: "low",      time: "4m",  country: "IL", live: false },
];

const markets = [
  { name: "BRENT",  value: "$103.13",   change: "+2.66%", up: true  },
  { name: "WTI",    value: "$98.61",    change: "+3.01%", up: true  },
  { name: "GOLD",   value: "$5,020.70", change: "-1.86%", up: false },
  { name: "SILVER", value: "$80.42",    change: "-5.01%", up: false },
  { name: "NATGAS", value: "$3.1410",   change: "-2.85%", up: false },
  { name: "WHEAT",  value: "$613.25",   change: "+3.55%", up: true  },
  { name: "COPPER", value: "$5.6790",   change: "-2.51%", up: false },
];

const forex = [
  { name: "EUR/USD", value: "1.1417", change: "-1.09%", up: false },
  { name: "GBP/USD", value: "1.3224", change: "-1.18%", up: false },
  { name: "USD/JPY", value: "159.73", change: "+0.41%", up: true  },
  { name: "USD/CHF", value: "0.7914", change: "+1.24%", up: true  },
  { name: "AUD/USD", value: "0.6984", change: "-2.03%", up: false },
  { name: "USD/CAD", value: "1.3733", change: "+0.96%", up: true  },
];

const internetStatus = [
  { country: "Iran",         flag: "🇮🇷", status: "DEGRADED", pct: 90, drop: "10% DROP", color: "#f59e0b" },
  { country: "Israel",       flag: "🇮🇱", status: "DEGRADED", pct: 87, drop: "13% DROP", color: "#f59e0b" },
  { country: "Saudi Arabia", flag: "🇸🇦", status: "DEGRADED", pct: 89, drop: "11% DROP", color: "#f59e0b" },
  { country: "Iraq",         flag: "🇮🇶", status: "ONLINE",   pct: 98, drop: null,       color: "#10b981" },
  { country: "Syria",        flag: "🇸🇾", status: "ONLINE",   pct: 97, drop: null,       color: "#10b981" },
];

const navItems = [
  { icon: "🔔", label: "Alerts",    count: 526,  active: true  },
  { icon: "📡", label: "Telegram",  count: 300,  active: false },
  { icon: "📺", label: "Live Feed", count: null, active: false },
  { icon: "🤖", label: "AI Predict",count: null, active: false },
  { icon: "⚡", label: "Events",    count: 338,  active: false },
  { icon: "📈", label: "Markets",   count: 17,   active: false },
  { icon: "🌐", label: "Internet",  count: null, active: false },
  { icon: "✈️", label: "NOTAMs",   count: 16,   active: false },
  { icon: "🗺️", label: "Alert Map",count: 526,  active: false },
  { icon: "📊", label: "Analytics", count: null, active: false },
  { icon: "🔍", label: "OSINT Feed",count: null, active: false },
  { icon: "🎯", label: "Predictor", count: null, active: false },
  { icon: "🚀", label: "Rockets",   count: null, active: false },
];

const tabletNavItems = [
  { icon: "🔔", label: "Alerts",   active: true  },
  { icon: "📡", label: "Telegram", active: false },
  { icon: "⚡",  label: "Events",  active: false },
  { icon: "📈", label: "Markets",  active: false },
  { icon: "🌐", label: "Internet", active: false },
  { icon: "✈️", label: "NOTAMs",  active: false },
  { icon: "🗺️", label: "Map",     active: false },
  { icon: "🔍", label: "OSINT",   active: false },
  { icon: "📊", label: "Stats",   active: false },
];

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  ROCKET:   { bg: "#7f1d1d", text: "#fca5a5", border: "#ef4444" },
  MISSILE:  { bg: "#7c2d12", text: "#fdba74", border: "#f97316" },
  UAV:      { bg: "#1e3a5f", text: "#93c5fd", border: "#3b82f6" },
  AIRCRAFT: { bg: "#1a2e1a", text: "#86efac", border: "#22c55e" },
};

const severityDot: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#6b7280",
};

const ticker = [
  "🔴 MILITARY · After Israel responded to a U — MISSILE LAUNCH",
  "🔴 MILITARY · Borj Qalaouiyeh targeted a medical emergency center — MISSILE LAUNCH",
  "🟡 MILITARY · Alert Zone (بلدة جداتا) — MISSILE LAUNCH",
  "🔵 INTEL · Former Gaza hostage Elkana Bohbot: this war with Iran is different",
  "🔴 MILITARY · Mother and three sons in custody over US embassy bomb in Norway",
];

// ─── Themes ───────────────────────────────────────────────────────────────────

const themes = {
  dark: {
    name: "Dark",
    pageBg: "#080c14", navBg: "#0a0f1a", panelBg: "#0d1117",
    cardBg: "#111827", cardHover: "#1c2333", rowBg: "#0f172a",
    border: "#1e293b",
    textPrimary: "#f1f5f9", textSecondary: "#e2e8f0", textMuted: "#94a3b8",
    textFaint: "#64748b", textFaintest: "#475569", textDimmed: "#334155",
    activeBg: "#1e3a5f", activeBorder: "#3b82f620", activeText: "#93c5fd", activeCount: "#60a5fa",
    btnBg: "#1e293b", btnText: "#94a3b8", inputBg: "#111827",
    progressBg: "#1e293b", sirenBg: "#0a0f1a", sirenItemBg: "#1a0a0a",
    upBg: "#052e16", upText: "#4ade80", downBg: "#450a0a", downText: "#f87171",
    swatchBg: "#080c14", swatchAccent: "#3b82f6",
  },
  navy: {
    name: "Navy",
    pageBg: "#040e1f", navBg: "#06122a", panelBg: "#081836",
    cardBg: "#0c2040", cardHover: "#112650", rowBg: "#06102a",
    border: "#1a3354",
    textPrimary: "#e8f2ff", textSecondary: "#d4e5ff", textMuted: "#7faacc",
    textFaint: "#4a7aa0", textFaintest: "#3a6080", textDimmed: "#2a4f70",
    activeBg: "#0c3060", activeBorder: "#5090d020", activeText: "#90c8ff", activeCount: "#70b0f0",
    btnBg: "#0e2040", btnText: "#6090bb", inputBg: "#0a1830",
    progressBg: "#0e2040", sirenBg: "#06122a", sirenItemBg: "#1a0a14",
    upBg: "#052a14", upText: "#4adc80", downBg: "#2a0a10", downText: "#ff8080",
    swatchBg: "#040e1f", swatchAccent: "#5090d0",
  },
  light: {
    name: "Light",
    pageBg: "#f0f4f8", navBg: "#ffffff", panelBg: "#f8fafc",
    cardBg: "#ffffff", cardHover: "#f1f5f9", rowBg: "#f8fafc",
    border: "#e2e8f0",
    textPrimary: "#0f172a", textSecondary: "#1e293b", textMuted: "#475569",
    textFaint: "#94a3b8", textFaintest: "#94a3b8", textDimmed: "#cbd5e1",
    activeBg: "#eff6ff", activeBorder: "#3b82f640", activeText: "#2563eb", activeCount: "#3b82f6",
    btnBg: "#f1f5f9", btnText: "#64748b", inputBg: "#ffffff",
    progressBg: "#e2e8f0", sirenBg: "#ffffff", sirenItemBg: "#fff1f2",
    upBg: "#f0fdf4", upText: "#16a34a", downBg: "#fef2f2", downText: "#dc2626",
    swatchBg: "#f0f4f8", swatchAccent: "#2563eb",
  },
} as const;

type ThemeKey = keyof typeof themes;
type T = typeof themes[ThemeKey];

const ThemeCtx = createContext<{ themeKey: ThemeKey; setTheme: (k: ThemeKey) => void; t: T }>({
  themeKey: "dark", setTheme: () => {}, t: themes.dark,
});
const useTheme = () => useContext(ThemeCtx);

// ─── Theme Switcher ────────────────────────────────────────────────────────────

/** full: text+swatch (desktop) | mini: swatch-only rect (tablet) | dots: small circles (mobile) */
function ThemeSwitcher({ variant = "full" }: { variant?: "full" | "mini" | "dots" }) {
  const { themeKey, setTheme, t } = useTheme();

  if (variant === "dots") {
    // Three small coloured circles — fits in tight mobile top bar
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {(Object.keys(themes) as ThemeKey[]).map(key => {
          const isActive = themeKey === key;
          const th = themes[key];
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              title={th.name}
              style={{
                width: 16, height: 16, borderRadius: "50%", padding: 0,
                background: th.swatchBg,
                border: `2px solid ${isActive ? th.swatchAccent : (themeKey === "light" ? "#c8d3de" : "#334155")}`,
                cursor: "pointer",
                boxShadow: isActive ? `0 0 0 2px ${th.swatchAccent}40` : "none",
                transition: "all 0.2s",
                outline: "none",
                position: "relative" as const,
                overflow: "hidden",
              }}
            >
              {/* accent stripe */}
              <span style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: "45%",
                background: th.swatchAccent + "99",
              }} />
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "mini") {
    // Swatch-only pill — no text, wider rects, fits in tablet top bar
    return (
      <div style={{
        display: "flex", gap: 3, padding: 3, borderRadius: 9,
        background: themeKey === "light" ? "#dde3eb" : "#050912",
        border: `1px solid ${themeKey === "light" ? "#c8d3de" : "#111827"}`,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
      }}>
        {(Object.keys(themes) as ThemeKey[]).map(key => {
          const isActive = themeKey === key;
          const th = themes[key];
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              title={th.name}
              style={{
                display: "flex", width: 28, height: 18, borderRadius: 5,
                overflow: "hidden", padding: 0, border: "none", cursor: "pointer",
                outline: isActive ? `1.5px solid ${th.swatchAccent}` : "1.5px solid transparent",
                boxShadow: isActive ? `0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px ${th.swatchAccent}30` : "none",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <span style={{ flex: "0 0 55%", background: th.swatchBg }} />
              <span style={{ flex: "0 0 45%", background: th.swatchAccent + "99" }} />
            </button>
          );
        })}
      </div>
    );
  }

  // full variant
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 10,
      background: themeKey === "light" ? "#dde3eb" : "#050912",
      border: `1px solid ${themeKey === "light" ? "#c8d3de" : "#111827"}`,
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)",
    }}>
      {(Object.keys(themes) as ThemeKey[]).map(key => {
        const isActive = themeKey === key;
        const th = themes[key];
        return (
          <button key={key} onClick={() => setTheme(key)} title={th.name} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 7,
            fontSize: 11, fontWeight: isActive ? 700 : 500,
            background: isActive ? (themeKey === "light" ? "#ffffff" : t.activeBg) : "transparent",
            color: isActive ? t.activeText : t.textFaint,
            border: "none", cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", letterSpacing: 0.4,
            boxShadow: isActive ? (themeKey === "light" ? "0 1px 4px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.5)") : "none",
          }}>
            <span style={{
              display: "inline-flex", width: 15, height: 10, borderRadius: 3, overflow: "hidden", flexShrink: 0,
              border: `1px solid ${isActive ? th.swatchAccent + "60" : (themeKey === "light" ? "#c8d3de" : "#1e293b")}`,
              boxShadow: isActive ? `0 0 0 1.5px ${th.swatchAccent}30` : "none",
              transition: "border-color 0.2s",
            }}>
              <span style={{ width: "55%", height: "100%", background: th.swatchBg }} />
              <span style={{ width: "45%", height: "100%", background: th.swatchAccent + "99" }} />
            </span>
            {th.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const LiveClock = memo(function LiveClock({ color }: { color?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      if (ref.current) ref.current.textContent = new Date().toUTCString().slice(17, 25) + " UTC";
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return <span ref={ref} style={{ color: color ?? "#94a3b8" }} />;
});

function PulseDot({ color = "#ef4444" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10 }}>
      <span style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite", willChange: "transform, opacity" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

const AlertCard = memo(function AlertCard({ alert }: { alert: typeof alerts[0] }) {
  const { t, themeKey } = useTheme();
  const darkTc = typeColors[alert.type] || typeColors.ROCKET;
  const lightTypeColors: Record<string, { bg: string; text: string; border: string }> = {
    ROCKET:   { bg: "#fee2e2", text: "#b91c1c", border: "#ef4444" },
    MISSILE:  { bg: "#ffedd5", text: "#c2410c", border: "#f97316" },
    UAV:      { bg: "#dbeafe", text: "#1d4ed8", border: "#3b82f6" },
    AIRCRAFT: { bg: "#dcfce7", text: "#15803d", border: "#22c55e" },
  };
  const tc = themeKey === "light" ? (lightTypeColors[alert.type] || lightTypeColors.ROCKET) : darkTc;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 12px", borderRadius: 10,
      background: t.cardBg,
      border: `1px solid ${alert.severity === "critical" ? "#ef444430" : t.border}`,
      marginBottom: 6, cursor: "pointer", transition: "background 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.background = t.cardHover)}
      onMouseLeave={e => (e.currentTarget.style.background = t.cardBg)}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: severityDot[alert.severity], flexShrink: 0 }} />
      <div style={{ padding: "3px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}30`, letterSpacing: 0.5, flexShrink: 0 }}>{alert.type}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: t.textPrimary, fontWeight: 600, fontSize: 13 }}>{alert.location}</span>
          {alert.live && <PulseDot color="#10b981" />}
        </div>
        <div style={{ color: t.textFaint, fontSize: 11, marginTop: 1 }}>{alert.region}</div>
      </div>
      <div style={{ color: t.textFaintest, fontSize: 11, flexShrink: 0 }}>{alert.time} ago</div>
    </div>
  );
});

function MarketRow({ item }: { item: { name: string; value: string; change: string; up: boolean } }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, background: t.rowBg, marginBottom: 4, border: `1px solid ${t.border}` }}>
      <span style={{ color: t.textMuted, fontSize: 12, fontWeight: 500, width: 70 }}>{item.name}</span>
      <span style={{ color: t.textPrimary, fontSize: 13, fontWeight: 600 }}>{item.value}</span>
      <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: item.up ? t.upBg : t.downBg, color: item.up ? t.upText : t.downText }}>{item.change}</span>
    </div>
  );
}

function InternetRow({ item }: { item: typeof internetStatus[0] }) {
  const { t } = useTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{item.flag}</span>
          <span style={{ color: t.textSecondary, fontSize: 13, fontWeight: 600 }}>{item.country}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {item.drop && <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 600 }}>▼ {item.drop}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: item.color + "20", color: item.color, border: `1px solid ${item.color}40` }}>{item.status}</span>
        </div>
      </div>
      <div style={{ background: t.progressBg, borderRadius: 4, height: 4, overflow: "hidden" }}>
        <div style={{ width: item.pct + "%", height: "100%", background: item.color, borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ color: t.textFaintest, fontSize: 10 }}>{item.pct}%</span>
        <span style={{ color: t.textDimmed, fontSize: 10 }}>100%</span>
      </div>
    </div>
  );
}

// ─── Shared panel content ─────────────────────────────────────────────────────

function MarketsPanel() {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[{ label: "COMMODITIES", data: markets }, { label: "MAJOR FX", data: forex }].map(({ label, data }) => (
        <div key={label} style={{ background: t.panelBg, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><PulseDot color="#10b981" /><span style={{ color: "#10b981", fontSize: 10 }}>LIVE</span></div>
          </div>
          {data.map((m, i) => <MarketRow key={i} item={m} />)}
        </div>
      ))}
    </div>
  );
}

function MarketSectionPanel({ label, data }: { label: string; data: typeof markets }) {
  const { t } = useTheme();
  return (
    <div style={{ background: t.panelBg, borderRadius: 12, padding: 14, border: `1px solid ${t.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><PulseDot color="#10b981" /><span style={{ color: "#10b981", fontSize: 10 }}>LIVE</span></div>
      </div>
      {data.map((m, i) => <MarketRow key={i} item={m} />)}
    </div>
  );
}

function InternetPanel() {
  const { t } = useTheme();
  return (
    <div style={{ background: t.panelBg, borderRadius: 12, padding: 16, border: `1px solid ${t.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>INTERNET MONITOR</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[["13","COUNTRIES"],["10","ONLINE"],["3","DEGRADED"],["0","DOWN"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" as const }}>
              <div style={{ color: t.textPrimary, fontWeight: 700, fontSize: 14 }}>{v}</div>
              <div style={{ color: t.textFaint, fontSize: 9 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {internetStatus.map((item, i) => <InternetRow key={i} item={item} />)}
    </div>
  );
}

function OsintPanel() {
  const { t, themeKey } = useTheme();
  const items = [
    { src: "Jerusalem Post", text: "Minwailers, bodies as Indian ships granted passage through Hormuz", type: "military", time: "2m" },
    { src: "Jerusalem Post", text: "For former Gaza hostage Elkana Bohbot, this war with Iran is different", type: "intel", time: "5m" },
    { src: "Reuters",        text: "Mother and three sons in custody over US embassy bomb in Norway",     type: "military", time: "8m" },
  ];
  return (
    <div style={{ background: t.panelBg, borderRadius: 12, padding: 16, border: `1px solid ${t.border}` }}>
      <div style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 13 }}>OSINT FEED</div>
      {items.map((item, i) => (
        <div key={i} style={{ padding: "11px", borderRadius: 9, background: t.cardBg, border: `1px solid ${t.border}`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: item.type === "military" ? (themeKey === "light" ? "#fee2e2" : "#7f1d1d") : (themeKey === "light" ? "#dbeafe" : "#1e3a5f"), color: item.type === "military" ? (themeKey === "light" ? "#b91c1c" : "#fca5a5") : (themeKey === "light" ? "#1d4ed8" : "#93c5fd") }}>{item.type.toUpperCase()}</span>
            <span style={{ color: t.textFaint, fontSize: 10 }}>{item.src}</span>
            <span style={{ color: t.textDimmed, fontSize: 10, marginLeft: "auto" }}>{item.time} ago</span>
          </div>
          <p style={{ color: t.textMuted, fontSize: 12, margin: 0, lineHeight: 1.55 }}>{item.text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Scroll-fade wrapper ───────────────────────────────────────────────────────
// Adds a right-edge gradient so users can see there's more to scroll

function ScrollFade({ children, bg, style }: { children: React.ReactNode; bg: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", ...style }}>
      {children}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 56, background: `linear-gradient(to right, transparent, ${bg})`, pointerEvents: "none", zIndex: 1 }} />
    </div>
  );
}

// ─── Empty alert state ─────────────────────────────────────────────────────────

function EmptyAlerts({ filter }: { filter: string }) {
  const { t } = useTheme();
  return (
    <div style={{ textAlign: "center" as const, padding: "40px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📭</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>No alerts</div>
      <div style={{ fontSize: 11, color: t.textFaint }}>
        {filter === "ALL" ? "No active alerts at this time" : `No ${filter.toLowerCase()} alerts right now`}
      </div>
    </div>
  );
}

// ─── MOBILE ────────────────────────────────────────────────────────────────────

const mobileTabs = [
  { id: "ALERTS",   icon: "🔔", label: "Alerts",  badge: "526" },
  { id: "MARKETS",  icon: "📈", label: "Markets", badge: null  },
  { id: "INTERNET", icon: "🌐", label: "Web",     badge: null  },
  { id: "OSINT",    icon: "🔍", label: "OSINT",   badge: null  },
];

function MobileLayout() {
  const { t } = useTheme();
  const [activeTab, setActiveTab] = useState("ALERTS");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const filters = ["ALL", "ROCKETS", "MISSILES", "UAV", "AIRCRAFT"];
  const filterToType: Record<string, string> = { ROCKETS: "ROCKET", MISSILES: "MISSILE" };
  const filteredAlerts = alerts.filter(a =>
    activeFilter === "ALL" || a.type === (filterToType[activeFilter] ?? activeFilter)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: t.pageBg, color: t.textSecondary, fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* TOP NAV */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: 48, background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, letterSpacing: 1 }}>WARROOM</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: "#10b98120", border: "1px solid #10b98140" }}>
            <PulseDot color="#10b981" />
            <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: "#ef444415", border: "1px solid #ef444440" }}>
            <span style={{ color: "#ef4444", fontSize: 10 }}>⚠</span>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 11 }}>CRITICAL</span>
          </div>
          <ThemeSwitcher variant="dots" />
        </div>
      </div>

      {/* TICKER */}
      <ScrollFade bg={t.panelBg} style={{ background: t.panelBg, borderBottom: `1px solid ${t.border}`, padding: "5px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 28, padding: "0 14px", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {ticker.map((tk, i) => <span key={i} style={{ color: t.textMuted, fontSize: 11, flexShrink: 0 }}>{tk}</span>)}
        </div>
      </ScrollFade>

      {/* MARKETS MINI STRIP */}
      <ScrollFade bg={t.navBg} style={{ display: "flex", background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", flex: 1 } as React.CSSProperties}>
        {[
          { n: "WTI", v: "$98.61", c: "+3.01%", up: true }, { n: "GOLD", v: "$5,020", c: "-1.86%", up: false },
          { n: "SILVER", v: "$80.42", c: "-5.01%", up: false }, { n: "EUR/USD", v: "1.1417", c: "-1.09%", up: false },
          { n: "WHEAT", v: "$613.25", c: "+3.55%", up: true },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRight: `1px solid ${t.border}`, flexShrink: 0 }}>
            <span style={{ color: t.textFaint, fontSize: 10, fontWeight: 600 }}>{m.n}</span>
            <span style={{ color: t.textSecondary, fontSize: 11, fontWeight: 600 }}>{m.v}</span>
            <span style={{ color: m.up ? t.upText : t.downText, fontSize: 10 }}>{m.c}</span>
          </div>
        ))}
      </div>
      </ScrollFade>

      {/* STATS ROW */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 14px", background: t.panelBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        {[
          { label: "Threat", value: "CRITICAL", color: "#ef4444" },
          { label: "Alerts", value: "526",      color: "#f59e0b" },
          { label: "Sirens", value: "15",        color: "#f59e0b" },
          { label: "Corr.",  value: "303",       color: "#3b82f6" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" as const }}>
            <div style={{ color: s.color, fontWeight: 800, fontSize: 13 }}>{s.value}</div>
            <div style={{ color: t.textFaint, fontSize: 9, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        {activeTab === "ALERTS" && (
          <div style={{ padding: "12px" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "8px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: activeFilter === f ? "#3b82f6" : t.btnBg,
                  color: activeFilter === f ? "white" : t.textFaint,
                  border: "none", cursor: "pointer", minHeight: 44,
                }}>{f}</button>
              ))}
            </div>
            {filteredAlerts.length === 0
              ? <EmptyAlerts filter={activeFilter} />
              : filteredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}
        {activeTab === "MARKETS"  && <div style={{ padding: "12px" }}><MarketsPanel /></div>}
        {activeTab === "INTERNET" && <div style={{ padding: "12px" }}><InternetPanel /></div>}
        {activeTab === "OSINT"    && <div style={{ padding: "12px" }}><OsintPanel /></div>}
      </div>

      {/* ACTIVE SIRENS — sticky above tab bar, visible only on Alerts tab */}
      {activeTab === "ALERTS" && (
        <div style={{ background: t.sirenBg, borderTop: "1px solid #ef444330", padding: "8px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <PulseDot color="#f59e0b" />
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>ACTIVE SIRENS</span>
            <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4 }}>15</span>
          </div>
          <div style={{ padding: "7px 10px", borderRadius: 7, background: t.sirenItemBg, border: "1px solid #ef444430", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fca5a5", fontSize: 11 }}>⚡ Alert Zone (بلدة جداتا)</span>
            <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>MISSILE LAUNCH</span>
          </div>
        </div>
      )}

      {/* BOTTOM TAB BAR */}
      <div style={{ display: "flex", background: t.navBg, borderTop: `1px solid ${t.border}`, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {mobileTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, position: "relative", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: "10px 4px 8px",
            background: "transparent", border: "none", cursor: "pointer",
            borderTop: activeTab === tab.id ? `2px solid ${t.activeText}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, marginTop: 3, fontWeight: activeTab === tab.id ? 700 : 400, color: activeTab === tab.id ? t.activeText : t.textFaintest }}>{tab.label}</span>
            {tab.badge && (
              <span style={{ position: "absolute", top: 5, right: "50%", transform: "translateX(12px)", fontSize: 9, background: "#ef4444", color: "white", padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TABLET ────────────────────────────────────────────────────────────────────

function TabletLayout() {
  const { t } = useTheme();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("MARKETS");

  const filters = ["ALL", "ROCKET", "MISSILE", "UAV"];
  const filteredAlerts = alerts.filter(a => activeFilter === "ALL" || a.type === activeFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: t.pageBg, color: t.textSecondary, fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 50, background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, letterSpacing: 1 }}>WARROOM</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: "#10b98120", border: "1px solid #10b98140" }}>
            <PulseDot color="#10b981" />
            <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeSwitcher variant="mini" />
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 7, background: "#ef444415", border: "1px solid #ef444440" }}>
            <span style={{ color: "#ef4444", fontSize: 10 }}>⚠</span>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 11 }}>CRITICAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>526</span>
            <span style={{ color: t.textFaint, fontSize: 11 }}>alerts</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block" }} />
            <LiveClock color={t.textMuted} />
          </div>
        </div>
      </div>

      {/* TICKER */}
      <ScrollFade bg={t.panelBg} style={{ background: t.panelBg, borderBottom: `1px solid ${t.border}`, padding: "5px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 32, padding: "0 14px", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {ticker.map((tk, i) => <span key={i} style={{ color: t.textMuted, fontSize: 10.5, flexShrink: 0 }}>{tk}</span>)}
        </div>
      </ScrollFade>

      {/* MARKETS STRIP */}
      <ScrollFade bg={t.navBg} style={{ background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", flex: 1 } as React.CSSProperties}>
        {[
          { n: "WTI", v: "$98.61", c: "+3.01%", up: true }, { n: "GOLD", v: "$5,020", c: "-1.86%", up: false },
          { n: "SILVER", v: "$80.42", c: "-5.01%", up: false }, { n: "EUR/USD", v: "1.1417", c: "-1.09%", up: false },
          { n: "WHEAT", v: "$613.25", c: "+3.55%", up: true }, { n: "GBP/USD", v: "1.3224", c: "-1.18%", up: false },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRight: `1px solid ${t.border}`, flexShrink: 0 }}>
            <span style={{ color: t.textFaint, fontSize: 10, fontWeight: 600 }}>{m.n}</span>
            <span style={{ color: t.textSecondary, fontSize: 11, fontWeight: 600 }}>{m.v}</span>
            <span style={{ color: m.up ? t.upText : t.downText, fontSize: 10 }}>{m.c}</span>
          </div>
        ))}
      </div>
      </ScrollFade>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ICON RAIL */}
        <div style={{ width: 52, background: t.navBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0", gap: 2, flexShrink: 0, overflowY: "auto" }}>
          {tabletNavItems.map((item, i) => (
            <div key={i} title={item.label} style={{
              width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: item.active ? t.activeBg : "transparent",
              border: item.active ? `1px solid ${t.activeBorder}` : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
            }}
              onMouseEnter={e => !item.active && (e.currentTarget.style.background = t.cardHover)}
              onMouseLeave={e => !item.active && (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
            </div>
          ))}
        </div>

        {/* ALERTS PANEL */}
        <div style={{ width: 290, background: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "11px 12px 9px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <span style={{ color: t.textPrimary, fontWeight: 700, fontSize: 13 }}>ALERTS</span>
              <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>526</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "1px 6px", borderRadius: 4, background: "#10b98115", border: "1px solid #10b98130" }}>
                <PulseDot color="#10b981" />
                <span style={{ color: "#10b981", fontSize: 9, fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: t.textFaintest, fontSize: 12 }}>🔍</span>
              <input placeholder="Search..." style={{ width: "100%", padding: "6px 8px 6px 26px", borderRadius: 7, background: t.inputBg, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 11, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                  background: activeFilter === f ? "#3b82f6" : t.btnBg,
                  color: activeFilter === f ? "white" : t.textFaint,
                  border: "none", cursor: "pointer",
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {filteredAlerts.length === 0
              ? <EmptyAlerts filter={activeFilter} />
              : filteredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${t.border}`, background: t.sirenBg, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <PulseDot color="#f59e0b" />
              <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>ACTIVE SIRENS</span>
              <span style={{ background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3 }}>15</span>
              <span style={{ color: t.textFaint, fontSize: 9, marginLeft: "auto" }}>OREF</span>
            </div>
            <div style={{ padding: "5px 9px", borderRadius: 6, background: t.sirenItemBg, border: "1px solid #ef444430", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fca5a5", fontSize: 10 }}>⚡ Alert Zone (بلدة جداتا)</span>
              <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 700 }}>MISSILE</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: t.panelBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Threat",  value: "CRITICAL", color: "#ef4444" },
                { label: "Alerts",  value: "526",      color: "#f59e0b" },
                { label: "Sirens",  value: "15",        color: "#f59e0b" },
                { label: "Correl.", value: "303",       color: "#3b82f6" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 13 }}>{s.value}</div>
                  <div style={{ color: t.textFaint, fontSize: 9 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["MARKETS", "INTERNET", "OSINT"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: activeTab === tab ? t.activeBg : t.cardBg,
                  color: activeTab === tab ? t.activeText : t.textFaint,
                  border: `1px solid ${activeTab === tab ? t.activeBorder : t.border}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}>{tab}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {activeTab === "MARKETS"  && <MarketsPanel />}
            {activeTab === "INTERNET" && <InternetPanel />}
            {activeTab === "OSINT"    && <OsintPanel />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "5px 16px", background: t.navBg, borderTop: `1px solid ${t.border}`, fontSize: 10, flexShrink: 0 }}>
            <span style={{ color: "#10b981" }}>● Online</span>
            <span style={{ color: t.textFaint }}>Src 6</span>
            <span style={{ color: t.textFaint }}>Events 338</span>
            <span style={{ color: t.textFaint }}>Markets 17</span>
            <span style={{ marginLeft: "auto", color: t.textDimmed }}>Warroom v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DESKTOP ───────────────────────────────────────────────────────────────────

function DesktopLayout() {
  const { t } = useTheme();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeCountry, setActiveCountry] = useState("ALL");
  const [activeTab, setActiveTab] = useState("MARKETS");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const filters = ["ALL", "ROCKETS", "MISSILES", "UAV", "AIRCRAFT"];
  const countries = ["ALL (526)", "🇮🇱 Israel (523)", "🇱🇧 Lebanon (2)", "🇮🇷 Iran (1)"];
  const filterToType: Record<string, string> = { ROCKETS: "ROCKET", MISSILES: "MISSILE" };
  const countryToCode: Record<string, string> = { "🇮🇱 Israel (523)": "IL", "🇱🇧 Lebanon (2)": "LB", "🇮🇷 Iran (1)": "IR" };
  const filteredAlerts = alerts.filter(a => {
    const typeOk = activeFilter === "ALL" || a.type === (filterToType[activeFilter] ?? activeFilter);
    const code = countryToCode[activeCountry];
    return typeOk && (!code || a.country === code);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: t.pageBg, color: t.textSecondary, fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* TOP NAV */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, letterSpacing: 1 }}>WARROOM</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "#10b98120", border: "1px solid #10b98140" }}>
            <PulseDot color="#10b981" />
            <span style={{ color: "#10b981", fontSize: 11, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeSwitcher variant="full" />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 8, background: "#ef444415", border: "1px solid #ef444440" }}>
            <span style={{ color: "#ef4444", fontSize: 11 }}>⚠</span>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12 }}>CRITICAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>526</span>
            <span style={{ color: t.textFaint, fontSize: 12 }}>Alerts</span>
          </div>
          <div style={{ color: t.textFaint, fontSize: 12 }}>
            Fri, Mar 13 · <LiveClock color={t.textMuted} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "#10b98115", border: "1px solid #10b98130" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block" }} />
            <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>Online</span>
          </div>
        </div>
      </div>

      {/* TICKER */}
      <ScrollFade bg={t.panelBg} style={{ background: t.panelBg, borderBottom: `1px solid ${t.border}`, padding: "6px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 40, padding: "0 20px", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" } as React.CSSProperties}>
          {ticker.map((tk, i) => <span key={i} style={{ color: t.textMuted, fontSize: 11, flexShrink: 0 }}>{tk}</span>)}
        </div>
      </ScrollFade>

      {/* MARKETS STRIP */}
      <ScrollFade bg={t.navBg} style={{ background: t.navBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", padding: "0 20px", overflowX: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
          {[
            { n: "WTI", v: "$98.61", c: "+3.01%", up: true }, { n: "GOLD", v: "$5,020.70", c: "-1.86%", up: false },
            { n: "SILVER", v: "$80.42", c: "-5.01%", up: false }, { n: "NATGAS", v: "$3.1410", c: "-2.85%", up: false },
            { n: "WHEAT", v: "$613.25", c: "+3.55%", up: true }, { n: "EUR/USD", v: "1.1417", c: "-1.09%", up: false },
            { n: "GBP/USD", v: "1.3224", c: "-1.18%", up: false },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRight: `1px solid ${t.border}`, flexShrink: 0 }}>
              <span style={{ color: t.textFaint, fontSize: 11, fontWeight: 600 }}>{m.n}</span>
              <span style={{ color: t.textSecondary, fontSize: 12, fontWeight: 600 }}>{m.v}</span>
              <span style={{ color: m.up ? t.upText : t.downText, fontSize: 11 }}>{m.c}</span>
            </div>
          ))}
        </div>
      </ScrollFade>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{ width: sidebarCollapsed ? 56 : 200, background: t.navBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transition: "width 0.3s", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px", borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ width: "100%", padding: "6px", borderRadius: 6, background: t.btnBg, border: "none", color: t.btnText, cursor: "pointer", fontSize: 14 }}>
              {sidebarCollapsed ? "→" : "← Collapse"}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {navItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                background: item.active ? t.activeBg : "transparent",
                border: item.active ? `1px solid ${t.activeBorder}` : "1px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", transition: "background 0.15s",
              }}
                onMouseEnter={e => !item.active && (e.currentTarget.style.background = t.cardHover)}
                onMouseLeave={e => !item.active && (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                <span style={{
                  display: "flex", alignItems: "center", flex: 1, gap: 0, overflow: "hidden",
                  opacity: sidebarCollapsed ? 0 : 1,
                  transition: "opacity 0.2s ease",
                  pointerEvents: sidebarCollapsed ? "none" : "auto",
                }}>
                  <span style={{ color: item.active ? t.activeText : t.textMuted, fontSize: 12, fontWeight: item.active ? 600 : 400, flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                  {item.count && <span style={{ color: item.active ? t.activeCount : t.textFaint, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{item.count}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div style={{ width: 360, background: t.panelBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ color: t.textPrimary, fontWeight: 700, fontSize: 15 }}>ALERTS</span>
              <span style={{ background: "#ef4444", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5 }}>526</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 5, background: "#10b98115", border: "1px solid #10b98130" }}>
                <PulseDot color="#10b981" />
                <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textFaintest, fontSize: 13 }}>🔍</span>
              <input placeholder="Search city, region..." style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8, background: t.inputBg, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: activeFilter === f ? "#3b82f6" : t.btnBg, color: activeFilter === f ? "white" : t.textFaint, border: "none", cursor: "pointer" }}>{f}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {countries.map(c => (
                <button key={c} onClick={() => setActiveCountry(c)} style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, background: activeCountry === c ? t.activeBg : t.cardBg, color: activeCountry === c ? t.activeText : t.textFaintest, border: `1px solid ${activeCountry === c ? t.activeBorder : t.border}`, cursor: "pointer" }}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {filteredAlerts.length === 0
              ? <EmptyAlerts filter={activeFilter} />
              : filteredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, background: t.sirenBg }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PulseDot color="#f59e0b" />
                <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>ACTIVE SIRENS</span>
                <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4 }}>15</span>
              </div>
              <span style={{ color: t.textFaint, fontSize: 10 }}>OREF</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 7, background: t.sirenItemBg, border: "1px solid #ef444430" }}>
              <span style={{ color: "#fca5a5", fontSize: 11 }}>⚡ Alert Zone (بلدة جداتا)</span>
              <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>MISSILE LAUNCH</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: t.panelBg, borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Threat Level",  value: "CRITICAL", color: "#ef4444" },
                { label: "Active Alerts", value: "526",      color: "#f59e0b" },
                { label: "Active Sirens", value: "15",        color: "#f59e0b" },
                { label: "Correlations",  value: "303",       color: "#3b82f6" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 14 }}>{s.value}</div>
                  <div style={{ color: t.textFaint, fontSize: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["MARKETS", "INTERNET", "OSINT"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: activeTab === tab ? t.activeBg : t.cardBg, color: activeTab === tab ? t.activeText : t.textFaint, border: `1px solid ${activeTab === tab ? t.activeBorder : t.border}`, cursor: "pointer" }}>{tab}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {activeTab === "MARKETS"  && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><MarketSectionPanel label="COMMODITIES" data={markets} /><MarketSectionPanel label="MAJOR FX" data={forex} /></div>}
            {activeTab === "INTERNET" && <InternetPanel />}
            {activeTab === "OSINT"    && <OsintPanel />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "6px 20px", background: t.navBg, borderTop: `1px solid ${t.border}`, fontSize: 11 }}>
            <span style={{ color: "#10b981" }}>● Online</span>
            <span style={{ color: t.textFaint }}>Src 6</span>
            <span style={{ color: t.textFaint }}>Events 338</span>
            <span style={{ color: t.textFaint }}>Flights 0</span>
            <span style={{ color: t.textFaint }}>Markets 17</span>
            <span style={{ marginLeft: "auto", color: t.textDimmed, fontSize: 10 }}>Warroom v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────

type Breakpoint = "mobile" | "tablet" | "desktop";
function getBreakpoint(w: number): Breakpoint {
  if (w < 768) return "mobile";
  if (w < 1100) return "tablet";
  return "desktop";
}

export function WarroomV2() {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window !== "undefined" ? getBreakpoint(window.innerWidth) : "desktop"
  );
  const [themeKey, setTheme] = useState<ThemeKey>("dark");

  useEffect(() => {
    const mqlMobile = window.matchMedia("(max-width: 767px)");
    const mqlTablet = window.matchMedia("(min-width: 768px) and (max-width: 1099px)");
    const update = () => setBp(getBreakpoint(window.innerWidth));
    mqlMobile.addEventListener("change", update);
    mqlTablet.addEventListener("change", update);
    return () => {
      mqlMobile.removeEventListener("change", update);
      mqlTablet.removeEventListener("change", update);
    };
  }, []);

  const t = themes[themeKey];

  return (
    <ThemeCtx.Provider value={{ themeKey, setTheme, t }}>
      <style>{`
        @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${t.pageBg}}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:2px}
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: ${t.textFaint}; opacity: 1; }
      `}</style>
      {bp === "mobile"  && <MobileLayout />}
      {bp === "tablet"  && <TabletLayout />}
      {bp === "desktop" && <DesktopLayout />}
    </ThemeCtx.Provider>
  );
}
