import { useState, useEffect } from 'react';

const alerts = [
  { id: 1, location: "Ya'ara", region: "Western Galilee", type: "ROCKET", severity: "critical", time: "10s", country: "IL", live: true },
  { id: 2, location: "Arab Al-Aramshe", region: "Confrontation Line", type: "MISSILE", severity: "critical", time: "13s", country: "IL", live: true },
  { id: 3, location: "Shtula", region: "Western Galilee", type: "ROCKET", severity: "critical", time: "16s", country: "IL", live: true },
  { id: 4, location: "Hanita", region: "Western Galilee", type: "UAV", severity: "high", time: "18s", country: "IL", live: true },
  { id: 5, location: "Ghajar", region: "Confrontation Line", type: "ROCKET", severity: "high", time: "1m", country: "IL", live: false },
  { id: 6, location: "Nabatieh", region: "South Lebanon", type: "MISSILE", severity: "medium", time: "1m", country: "LB", live: false },
  { id: 7, location: "Metula", region: "Northern District", type: "UAV", severity: "medium", time: "2m", country: "IL", live: false },
  { id: 8, location: "Kiryat Shmona", region: "Northern District", type: "AIRCRAFT", severity: "low", time: "4m", country: "IL", live: false },
];

const markets = [
  { name: "BRENT", value: "$103.13", change: "+2.66%", up: true },
  { name: "WTI", value: "$98.61", change: "+3.01%", up: true },
  { name: "GOLD", value: "$5,020.70", change: "-1.86%", up: false },
  { name: "SILVER", value: "$80.42", change: "-5.01%", up: false },
  { name: "NATGAS", value: "$3.1410", change: "-2.85%", up: false },
  { name: "WHEAT", value: "$613.25", change: "+3.55%", up: true },
  { name: "COPPER", value: "$5.6790", change: "-2.51%", up: false },
];

const forex = [
  { name: "EUR/USD", value: "1.1417", change: "-1.09%", up: false },
  { name: "GBP/USD", value: "1.3224", change: "-1.18%", up: false },
  { name: "USD/JPY", value: "159.73", change: "+0.41%", up: true },
  { name: "USD/CHF", value: "0.7914", change: "+1.24%", up: true },
  { name: "AUD/USD", value: "0.6984", change: "-2.03%", up: false },
  { name: "USD/CAD", value: "1.3733", change: "+0.96%", up: true },
];

const internetStatus = [
  { country: "Iran", flag: "\u{1F1EE}\u{1F1F7}", status: "DEGRADED", pct: 90, drop: "10% DROP", color: "#f59e0b" },
  { country: "Israel", flag: "\u{1F1EE}\u{1F1F1}", status: "DEGRADED", pct: 87, drop: "13% DROP", color: "#f59e0b" },
  { country: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}", status: "DEGRADED", pct: 89, drop: "11% DROP", color: "#f59e0b" },
  { country: "Iraq", flag: "\u{1F1EE}\u{1F1F6}", status: "ONLINE", pct: 98, drop: null, color: "#10b981" },
  { country: "Syria", flag: "\u{1F1F8}\u{1F1FE}", status: "ONLINE", pct: 97, drop: null, color: "#10b981" },
];

const navItems = [
  { icon: "\uD83D\uDD14", label: "Alerts", count: 526, active: true },
  { icon: "\uD83D\uDCE1", label: "Telegram", count: 300 },
  { icon: "\uD83D\uDCFA", label: "Live Feed", count: null },
  { icon: "\uD83E\uDD16", label: "AI Prediction", count: null },
  { icon: "\u26A1", label: "Events", count: 338 },
  { icon: "\uD83D\uDCC8", label: "Markets", count: 17 },
  { icon: "\uD83C\uDF10", label: "Internet Monitor", count: null },
  { icon: "\u2708\uFE0F", label: "NOTAMs", count: 16 },
  { icon: "\uD83D\uDDFA\uFE0F", label: "Alert Map", count: 526 },
  { icon: "\uD83D\uDCCA", label: "Analytics", count: null },
  { icon: "\uD83D\uDD0D", label: "OSINT Feed", count: null },
  { icon: "\uD83C\uDFAF", label: "Attack Predictor", count: null },
  { icon: "\uD83D\uDE80", label: "Rocket Stats", count: null },
];

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  ROCKET: { bg: "#7f1d1d", text: "#fca5a5", border: "#ef4444" },
  MISSILE: { bg: "#7c2d12", text: "#fdba74", border: "#f97316" },
  UAV: { bg: "#1e3a5f", text: "#93c5fd", border: "#3b82f6" },
  AIRCRAFT: { bg: "#1a2e1a", text: "#86efac", border: "#22c55e" },
};

const severityDot: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

const ticker = [
  "\uD83D\uDD34 MILITARY \u00B7 After Israel responded to a U \u2014 MISSILE LAUNCH",
  "\uD83D\uDD34 MILITARY \u00B7 Borj Qalaouiyeh targeted a medical emergency center \u2014 MISSILE LAUNCH",
  "\uD83D\uDFE1 MILITARY \u00B7 Alert Zone (\u0628\u0644\u062F\u0629 \u062C\u062F\u0627\u062A\u0627) \u2014 MISSILE LAUNCH",
  "\uD83D\uDD35 INTEL \u00B7 Former Gaza hostage Elkana Bohbot: this war with Iran is different",
  "\uD83D\uDD34 MILITARY \u00B7 Mother and three sons in custody over US embassy bomb in Norway",
];

function PulseDot({ color = "#ef4444" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", width: 10, height: 10, borderRadius: "50%",
        background: color, opacity: 0.4,
        animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
      }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "block" }} />
    </span>
  );
}

function AlertCard({ alert }: { alert: typeof alerts[0] }) {
  const tc = typeColors[alert.type] || typeColors.ROCKET;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 10,
      background: "#111827",
      border: `1px solid ${alert.severity === "critical" ? "#ef444430" : "#1f2937"}`,
      marginBottom: 6, cursor: "pointer", transition: "all 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget.style.background = "#1c2333")}
      onMouseLeave={e => (e.currentTarget.style.background = "#111827")}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: severityDot[alert.severity], flexShrink: 0 }} />
      <div style={{
        padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
        background: tc.bg, color: tc.text, border: `1px solid ${tc.border}30`,
        letterSpacing: 0.5, flexShrink: 0
      }}>{alert.type}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{alert.location}</span>
          {alert.live && <PulseDot color="#10b981" />}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>{alert.region}</div>
      </div>
      <div style={{ color: "#475569", fontSize: 11, flexShrink: 0 }}>{alert.time} ago</div>
    </div>
  );
}

function MarketRow({ item }: { item: { name: string; value: string; change: string; up: boolean } }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", borderRadius: 8, background: "#0f172a",
      marginBottom: 4, border: "1px solid #1e293b"
    }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, width: 70 }}>{item.name}</span>
      <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{item.value}</span>
      <span style={{
        fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
        background: item.up ? "#052e16" : "#450a0a",
        color: item.up ? "#4ade80" : "#f87171"
      }}>{item.change}</span>
    </div>
  );
}

function InternetRow({ item }: { item: typeof internetStatus[0] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{item.flag}</span>
          <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{item.country}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {item.drop && <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 600 }}>{"\u25BC"} {item.drop}</span>}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
            background: item.color + "20", color: item.color, border: `1px solid ${item.color}40`
          }}>{item.status}</span>
        </div>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 4, height: 4, overflow: "hidden" }}>
        <div style={{ width: item.pct + "%", height: "100%", background: item.color, borderRadius: 4, transition: "width 1s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ color: "#475569", fontSize: 10 }}>{item.pct}%</span>
        <span style={{ color: "#334155", fontSize: 10 }}>100%</span>
      </div>
    </div>
  );
}

export function WarroomV2() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeCountry, setActiveCountry] = useState("ALL");
  const [activeTab, setActiveTab] = useState("MARKETS");
  const [time, setTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const filters = ["ALL", "ROCKETS", "MISSILES", "UAV", "AIRCRAFT"];
  const countries = ["ALL (526)", "\u{1F1EE}\u{1F1F1} Israel (523)", "\u{1F1F1}\u{1F1E7} Lebanon (2)", "\u{1F1EE}\u{1F1F7} Iran (1)"];

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter !== "ALL" && a.type !== activeFilter.slice(0, -1) && a.type !== activeFilter) return false;
    return true;
  });

  const utcTime = time.toUTCString().slice(17, 25);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
        @keyframes slide-in { from{transform:translateX(-10px);opacity:0} to{transform:translateX(0);opacity:1} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        * { box-sizing: border-box; }
      `}</style>

      {/* TOP NAV */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 52, background: "#0a0f1a",
        borderBottom: "1px solid #1e293b", flexShrink: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"\u26A1"}</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9", letterSpacing: 1 }}>WARROOM</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "#10b98120", border: "1px solid #10b98140" }}>
            <PulseDot color="#10b981" />
            <span style={{ color: "#10b981", fontSize: 11, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 8, background: "#ef444415", border: "1px solid #ef444440" }}>
            <span style={{ color: "#ef4444", fontSize: 11 }}>{"\u26A0"}</span>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 12 }}>CRITICAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>526</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Alerts</span>
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            Fri, Mar 13 {"\u00B7"} <span style={{ color: "#94a3b8" }}>{utcTime} UTC</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "#10b98115", border: "1px solid #10b98130" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "block" }} />
            <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>Online</span>
          </div>
        </div>
      </div>

      {/* TICKER */}
      <div style={{
        background: "#0d1117", borderBottom: "1px solid #1e293b",
        padding: "6px 0", overflow: "hidden", flexShrink: 0, position: "relative"
      }}>
        <div style={{ display: "flex", gap: 40, padding: "0 20px", overflowX: "auto", whiteSpace: "nowrap" }}>
          {ticker.map((t, i) => (
            <span key={i} style={{ color: "#94a3b8", fontSize: 11, flexShrink: 0 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* MARKETS STRIP */}
      <div style={{
        display: "flex", gap: 0, background: "#0a0f1a",
        borderBottom: "1px solid #1e293b", padding: "0 20px",
        overflowX: "auto", flexShrink: 0
      }}>
        {[
          { n: "WTI", v: "$98.61", c: "+3.01%", up: true },
          { n: "GOLD", v: "$5,020.70", c: "-1.86%", up: false },
          { n: "SILVER", v: "$80.42", c: "-5.01%", up: false },
          { n: "NATGAS", v: "$3.1410", c: "-2.85%", up: false },
          { n: "WHEAT", v: "$613.25", c: "+3.55%", up: true },
          { n: "EUR/USD", v: "1.1417", c: "-1.09%", up: false },
          { n: "GBP/USD", v: "1.3224", c: "-1.18%", up: false },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRight: "1px solid #1e293b", flexShrink: 0 }}>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>{m.n}</span>
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{m.v}</span>
            <span style={{ color: m.up ? "#4ade80" : "#f87171", fontSize: 11 }}>{m.c}</span>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{
          width: sidebarCollapsed ? 56 : 200, background: "#0a0f1a",
          borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column",
          transition: "width 0.3s", flexShrink: 0, overflow: "hidden"
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid #1e293b" }}>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
              width: "100%", padding: "6px", borderRadius: 6, background: "#1e293b",
              border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14
            }}>{sidebarCollapsed ? "\u2192" : "\u2190 Collapse"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {navItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                background: item.active ? "#1e3a5f" : "transparent",
                border: item.active ? "1px solid #3b82f620" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
                whiteSpace: "nowrap", overflow: "hidden"
              }}
                onMouseEnter={e => !item.active && (e.currentTarget.style.background = "#111827")}
                onMouseLeave={e => !item.active && (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span style={{ color: item.active ? "#93c5fd" : "#94a3b8", fontSize: 12, fontWeight: item.active ? 600 : 400, flex: 1 }}>{item.label}</span>
                    {item.count && <span style={{ color: item.active ? "#60a5fa" : "#475569", fontSize: 10, fontWeight: 700 }}>{item.count}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div style={{ width: 360, background: "#0d1117", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>ALERTS</span>
                <span style={{ background: "#ef4444", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5 }}>512</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 5, background: "#10b98115", border: "1px solid #10b98130" }}>
                  <PulseDot color="#10b981" />
                  <span style={{ color: "#10b981", fontSize: 10, fontWeight: 700 }}>LIVE 511</span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>{"\uD83D\uDD0D"}</span>
              <input placeholder="Search city, region..." style={{
                width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8,
                background: "#111827", border: "1px solid #1e293b", color: "#94a3b8",
                fontSize: 12, outline: "none"
              }} />
            </div>

            {/* Type Filters */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: activeFilter === f ? "#3b82f6" : "#1e293b",
                  color: activeFilter === f ? "white" : "#64748b",
                  border: "none", cursor: "pointer", transition: "all 0.15s"
                }}>{f}</button>
              ))}
            </div>

            {/* Country Filters */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {countries.map(c => (
                <button key={c} onClick={() => setActiveCountry(c)} style={{
                  padding: "3px 8px", borderRadius: 5, fontSize: 10,
                  background: activeCountry === c ? "#1e3a5f" : "#111827",
                  color: activeCountry === c ? "#93c5fd" : "#475569",
                  border: `1px solid ${activeCountry === c ? "#3b82f640" : "#1e293b"}`,
                  cursor: "pointer", transition: "all 0.15s"
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Alert List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {filteredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </div>

          {/* Active Sirens Footer */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #1e293b", background: "#0a0f1a" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PulseDot color="#f59e0b" />
                <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>ACTIVE SIRENS</span>
                <span style={{ background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4 }}>15</span>
              </div>
              <span style={{ color: "#475569", fontSize: 10 }}>OREF</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 7, background: "#1a0a0a", border: "1px solid #ef444430" }}>
              <span style={{ color: "#fca5a5", fontSize: 11 }}>{"\u26A1"} Alert Zone ({"\u0628\u0644\u062F\u0629 \u062C\u062F\u0627\u062A\u0627"})</span>
              <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>MISSILE LAUNCH</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Threat Level Banner */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 20px", background: "#0d1117", borderBottom: "1px solid #1e293b"
          }}>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Threat Level", value: "CRITICAL", color: "#ef4444" },
                { label: "Active Alerts", value: "526", color: "#f59e0b" },
                { label: "Active Sirens", value: "15", color: "#f59e0b" },
                { label: "Correlations", value: "303", color: "#3b82f6" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 14 }}>{s.value}</div>
                  <div style={{ color: "#475569", fontSize: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["MARKETS", "INTERNET", "OSINT"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                  background: activeTab === tab ? "#1e3a5f" : "#111827",
                  color: activeTab === tab ? "#93c5fd" : "#475569",
                  border: `1px solid ${activeTab === tab ? "#3b82f640" : "#1e293b"}`,
                  cursor: "pointer", transition: "all 0.15s"
                }}>{tab}</button>
              ))}
            </div>
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {activeTab === "MARKETS" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#0d1117", borderRadius: 12, padding: 16, border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>COMMODITIES</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <PulseDot color="#10b981" />
                      <span style={{ color: "#10b981", fontSize: 10 }}>LIVE</span>
                    </div>
                  </div>
                  {markets.map((m, i) => <MarketRow key={i} item={m} />)}
                </div>

                <div style={{ background: "#0d1117", borderRadius: 12, padding: 16, border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>MAJOR FX</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <PulseDot color="#10b981" />
                      <span style={{ color: "#10b981", fontSize: 10 }}>LIVE</span>
                    </div>
                  </div>
                  {forex.map((m, i) => <MarketRow key={i} item={m} />)}
                </div>
              </div>
            )}

            {activeTab === "INTERNET" && (
              <div style={{ background: "#0d1117", borderRadius: 12, padding: 20, border: "1px solid #1e293b", maxWidth: 500 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>INTERNET MONITOR</span>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[["13", "COUNTRIES"], ["10", "ONLINE"], ["3", "DEGRADED"], ["0", "DOWN"]].map(([v, l]) => (
                      <div key={l} style={{ textAlign: "center" as const }}>
                        <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{v}</div>
                        <div style={{ color: "#475569", fontSize: 9 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {internetStatus.map((item, i) => <InternetRow key={i} item={item} />)}
              </div>
            )}

            {activeTab === "OSINT" && (
              <div style={{ background: "#0d1117", borderRadius: 12, padding: 20, border: "1px solid #1e293b" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>OSINT FEED</div>
                {[
                  { src: "Jerusalem Post", text: "Minwailers, bodies as Indian ships granted passage through Hormuz", type: "military", time: "2m" },
                  { src: "Jerusalem Post", text: "For former Gaza hostage Elkana Bohbot, this war with Iran is different", type: "intel", time: "5m" },
                  { src: "Reuters", text: "Mother and three sons in custody over US embassy bomb in Norway", type: "military", time: "8m" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "12px", borderRadius: 8, background: "#111827", border: "1px solid #1e293b", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: item.type === "military" ? "#7f1d1d" : "#1e3a5f",
                        color: item.type === "military" ? "#fca5a5" : "#93c5fd"
                      }}>{item.type.toUpperCase()}</span>
                      <span style={{ color: "#475569", fontSize: 10 }}>{item.src}</span>
                      <span style={{ color: "#334155", fontSize: 10, marginLeft: "auto" }}>{item.time} ago</span>
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20, padding: "6px 20px",
            background: "#0a0f1a", borderTop: "1px solid #1e293b", fontSize: 11
          }}>
            {[
              { label: "Online", value: "\u25CF", color: "#10b981" },
              { label: "Src 6", color: "#64748b" },
              { label: "Events 338", color: "#64748b" },
              { label: "Flights 0", color: "#64748b" },
              { label: "Markets 17", color: "#64748b" },
            ].map((s, i) => (
              <span key={i} style={{ color: s.color || "#64748b" }}>
                {s.value && <span style={{ marginRight: 4 }}>{s.value}</span>}
                {s.label}
              </span>
            ))}
            <span style={{ marginLeft: "auto", color: "#334155", fontSize: 10 }}>Warroom v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
