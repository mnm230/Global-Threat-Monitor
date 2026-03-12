import { useState, useEffect, useMemo } from "react";

interface Alert {
  id: string;
  city: string;
  region: string;
  country: string;
  threatType: string;
  countdown: number;
  timestamp: string;
  source: "oref" | "live";
}

const FLAGS: Record<string, string> = {
  Israel: "🇮🇱", Lebanon: "🇱🇧", Iran: "🇮🇷", Syria: "🇸🇾",
  Iraq: "🇮🇶", Yemen: "🇾🇪", "Saudi Arabia": "🇸🇦", Jordan: "🇯🇴",
};

const THREAT_ICON: Record<string, string> = {
  rockets: "🚀", missiles: "⚡", uav_intrusion: "🛸", hostile_aircraft_intrusion: "✈️",
};

const generateMockAlerts = (): Alert[] => {
  const cities = [
    { city: "Tel Aviv", region: "Gush Dan", country: "Israel" },
    { city: "Haifa", region: "Haifa Bay", country: "Israel" },
    { city: "Ashkelon", region: "Shfelah", country: "Israel" },
    { city: "Sderot", region: "Western Negev", country: "Israel" },
    { city: "Kiryat Shmona", region: "Upper Galilee", country: "Israel" },
    { city: "Nahariya", region: "Western Galilee", country: "Israel" },
    { city: "Beer Sheva", region: "Negev", country: "Israel" },
    { city: "Tyre", region: "South Lebanon", country: "Lebanon" },
    { city: "Beirut", region: "Mount Lebanon", country: "Lebanon" },
    { city: "Isfahan", region: "Isfahan Province", country: "Iran" },
    { city: "Riyadh", region: "Central Region", country: "Saudi Arabia" },
    { city: "Aleppo", region: "Northern Syria", country: "Syria" },
  ];
  const threats = ["rockets", "missiles", "uav_intrusion", "hostile_aircraft_intrusion"];
  const now = Date.now();
  return cities.map((c, i) => ({
    id: `WOP-${i}`, ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 3 ? 0 : [15, 30, 60, 90, 120, 180][Math.floor(Math.random() * 6)],
    timestamp: new Date(now - Math.floor(Math.random() * 180) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function CountdownBadge({ alert }: { alert: Alert }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, alert.countdown - Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000));
    setRemaining(calc());
    const iv = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(iv);
  }, [alert.timestamp, alert.countdown]);

  const isImmediate = alert.countdown === 0;
  const isExpired = !isImmediate && remaining <= 0;
  const isCritical = isImmediate || remaining <= 15;

  const bg = isExpired
    ? "rgba(180,140,100,0.06)"
    : isCritical
      ? "linear-gradient(135deg, #c2410c, #9a3412)"
      : remaining <= 45
        ? "linear-gradient(135deg, #b45309, #92400e)"
        : "rgba(180,140,100,0.12)";

  return (
    <div
      style={{
        minWidth: 46,
        padding: "5px 7px",
        borderRadius: 10,
        textAlign: "center",
        background: bg,
        color: isExpired ? "rgba(180,140,100,0.25)" : isCritical ? "#fef3c7" : remaining <= 45 ? "#fde68a" : "rgba(253,230,138,0.6)",
        border: isExpired ? "1px solid rgba(180,140,100,0.1)" : isCritical ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(180,140,100,0.15)",
        boxShadow: isCritical && !isExpired ? "0 2px 16px rgba(194,65,12,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
        animation: isCritical && !isExpired ? "ember-pulse 2s ease-in-out infinite" : "none",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
        {isImmediate ? "!" : remaining > 0 ? remaining : "—"}
      </div>
      <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", marginTop: 2, opacity: 0.65, textTransform: "uppercase" }}>
        {isImmediate ? "NOW" : remaining > 0 ? "SEC" : "EXP"}
      </div>
    </div>
  );
}

export default function TriageWarmOperator() {
  const [alerts] = useState(generateMockAlerts);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [_, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(iv); }, []);

  const sorted = useMemo(() => {
    let list = [...alerts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.city.toLowerCase().includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const now = Date.now();
      const remA = a.countdown === 0 ? -1 : Math.max(0, a.countdown - Math.floor((now - new Date(a.timestamp).getTime()) / 1000));
      const remB = b.countdown === 0 ? -1 : Math.max(0, b.countdown - Math.floor((now - new Date(b.timestamp).getTime()) / 1000));
      if (remA === -1 && remB !== -1) return -1;
      if (remB === -1 && remA !== -1) return 1;
      if (remA === -1 && remB === -1) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      const activeA = remA > 0 ? 1 : 0;
      const activeB = remB > 0 ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return remA - remB;
    });
  }, [alerts, searchQuery]);

  const activeCount = alerts.filter(a => a.countdown === 0 || Math.max(0, a.countdown - Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000)) > 0).length;

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "linear-gradient(180deg, #1a120b 0%, #0f0a06 100%)",
      color: "#f5e6d3",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes ember-pulse { 0%, 100% { box-shadow: 0 2px 16px rgba(194,65,12,0.4); } 50% { box-shadow: 0 2px 24px rgba(194,65,12,0.65); } }
        @keyframes slide-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .wo-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(180,140,100,0.06); transition: all 0.2s; cursor: default; animation: slide-in 0.3s ease-out; border-radius: 0; }
        .wo-row:hover { background: rgba(180,140,100,0.04); }
        .wo-row.critical { background: rgba(194,65,12,0.08); border-left: 3px solid #c2410c; }
        .wo-row.expired { opacity: 0.25; }
        .wo-scroll::-webkit-scrollbar { width: 3px; }
        .wo-scroll::-webkit-scrollbar-track { background: transparent; }
        .wo-scroll::-webkit-scrollbar-thumb { background: rgba(180,140,100,0.15); border-radius: 3px; }
      `}</style>

      <div style={{
        padding: "14px 16px",
        borderBottom: activeCount > 0 ? "1px solid rgba(194,65,12,0.25)" : "1px solid rgba(180,140,100,0.08)",
        background: activeCount > 0 ? "linear-gradient(135deg, rgba(124,45,18,0.15), transparent)" : "transparent",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: activeCount > 0 ? "#c2410c" : "rgba(180,140,100,0.2)",
            boxShadow: activeCount > 0 ? "0 0 10px rgba(194,65,12,0.5)" : "none",
            animation: activeCount > 0 ? "ember-pulse 2s infinite" : "none",
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,230,211,0.65)" }}>ALERTS</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              background: "linear-gradient(135deg, #c2410c, #9a3412)",
              color: "#fef3c7", padding: "3px 9px", borderRadius: 8,
              boxShadow: "0 2px 10px rgba(194,65,12,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}>{activeCount}</span>
          )}
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          width: 28, height: 28, borderRadius: 8,
          border: "1px solid rgba(180,140,100,0.12)",
          background: searchOpen ? "rgba(194,65,12,0.12)" : "rgba(180,140,100,0.05)",
          color: searchOpen ? "#fb923c" : "rgba(180,140,100,0.35)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
        }}>⌕</button>
      </div>

      {searchOpen && (
        <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(180,140,100,0.06)", background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="City, region, country..." autoFocus
            style={{
              width: "100%", background: "rgba(180,140,100,0.05)", border: "1px solid rgba(180,140,100,0.12)",
              borderRadius: 8, padding: "7px 11px", fontSize: 11, color: "#f5e6d3", outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>
      )}

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.4 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡</div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#4ade80", letterSpacing: "0.1em" }}>ALL CLEAR</span>
          <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", color: "rgba(180,140,100,0.4)" }}>MONITORING ACTIVE</span>
        </div>
      ) : (
        <div className="wo-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map(alert => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
            const isImmediate = alert.countdown === 0;
            const isExpired = !isImmediate && remaining <= 0;
            const isCritical = isImmediate || (remaining > 0 && remaining <= 15);

            return (
              <div key={alert.id} className={`wo-row ${isCritical ? "critical" : ""} ${isExpired ? "expired" : ""}`}>
                <CountdownBadge alert={alert} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isExpired ? "rgba(180,140,100,0.3)" : "#f5e6d3" }}>
                      {alert.city}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.45 }}>{FLAGS[alert.country] || ""}</span>
                    {alert.source === "live" && (
                      <span style={{ fontSize: 7, fontWeight: 700, padding: "2px 5px", borderRadius: 5, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", letterSpacing: "0.08em" }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(180,140,100,0.3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
                    {alert.region} · {THREAT_ICON[alert.threatType] || "🚀"} {alert.threatType.replace(/_/g, " ").toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: "8px 16px", borderTop: "1px solid rgba(180,140,100,0.06)",
        background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.14em", color: "rgba(180,140,100,0.2)", textTransform: "uppercase" }}>OREF HOME FRONT CMD</span>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.14em", color: "rgba(180,140,100,0.2)" }}>{alerts.length} TOTAL</span>
      </div>
    </div>
  );
}
