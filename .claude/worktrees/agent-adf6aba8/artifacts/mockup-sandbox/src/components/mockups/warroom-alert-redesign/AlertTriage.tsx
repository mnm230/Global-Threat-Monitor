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

  return cities.map((c, i) => {
    const age = Math.floor(Math.random() * 180) * 1000;
    const countdown = i < 3 ? 0 : [15, 30, 60, 90, 120, 180][Math.floor(Math.random() * 6)];
    return {
      id: `TRG-${i}`,
      ...c,
      threatType: threats[Math.floor(Math.random() * threats.length)],
      countdown,
      timestamp: new Date(now - age).toISOString(),
      source: Math.random() > 0.7 ? "live" : "oref",
    };
  });
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

  return (
    <div
      style={{
        minWidth: 44,
        padding: "4px 6px",
        borderRadius: 6,
        textAlign: "center",
        background: isExpired ? "rgba(255,255,255,0.03)" : isCritical ? "#dc2626" : remaining <= 45 ? "#ea580c" : "#991b1b",
        color: isExpired ? "rgba(255,255,255,0.15)" : "#fff",
        border: isExpired ? "1px solid rgba(255,255,255,0.06)" : "none",
        boxShadow: isCritical && !isExpired ? "0 0 12px rgba(220,38,38,0.6)" : "none",
        animation: isCritical && !isExpired ? "pulse-glow 1.5s ease-in-out infinite" : "none",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
        {isImmediate ? "!" : remaining > 0 ? remaining : "—"}
      </div>
      <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.15em", marginTop: 2, opacity: 0.7, textTransform: "uppercase" }}>
        {isImmediate ? "NOW" : remaining > 0 ? "SEC" : "EXP"}
      </div>
    </div>
  );
}

export default function AlertTriage() {
  const [alerts] = useState(generateMockAlerts);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [_, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const sorted = useMemo(() => {
    let list = [...alerts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.city.toLowerCase().includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
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

  const activeCount = alerts.filter((a) => {
    if (a.countdown === 0) return true;
    return Math.max(0, a.countdown - Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000)) > 0;
  }).length;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0c0806",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes pulse-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .triage-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; cursor: default; animation: slide-in 0.3s ease-out; }
        .triage-row:hover { background: rgba(220,38,38,0.06); }
        .triage-row.critical { background: rgba(127,29,29,0.2); border-left: 3px solid #dc2626; }
        .triage-row.expired { opacity: 0.35; }
        .triage-scroll::-webkit-scrollbar { width: 4px; }
        .triage-scroll::-webkit-scrollbar-track { background: transparent; }
        .triage-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.2); border-radius: 2px; }
      `}</style>

      <div
        style={{
          padding: "12px 14px",
          borderBottom: activeCount > 0 ? "2px solid rgba(220,38,38,0.5)" : "1px solid rgba(255,255,255,0.06)",
          background: activeCount > 0 ? "linear-gradient(135deg, rgba(127,29,29,0.25), rgba(15,8,6,1))" : "rgba(255,255,255,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: activeCount > 0 ? "#dc2626" : "rgba(255,255,255,0.15)",
              boxShadow: activeCount > 0 ? "0 0 8px #dc2626" : "none",
              animation: activeCount > 0 ? "pulse-glow 1.5s infinite" : "none",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>ALERTS</span>
          {activeCount > 0 && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                background: "#dc2626",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: 6,
                boxShadow: "0 2px 8px rgba(220,38,38,0.4)",
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
            background: searchOpen ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)",
            color: searchOpen ? "#f87171" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          ⌕
        </button>
      </div>

      {searchOpen && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="City, region, country..."
            autoFocus
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: "#fff",
              outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>
      )}

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.4 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡</div>
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.1em", color: "#22c55e" }}>ALL CLEAR</span>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>MONITORING ACTIVE</span>
        </div>
      ) : (
        <div className="triage-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map((alert) => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
            const isImmediate = alert.countdown === 0;
            const isExpired = !isImmediate && remaining <= 0;
            const isCritical = isImmediate || (remaining > 0 && remaining <= 15);

            return (
              <div key={alert.id} className={`triage-row ${isCritical ? "critical" : ""} ${isExpired ? "expired" : ""}`}>
                <CountdownBadge alert={alert} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {alert.city}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.5 }}>{FLAGS[alert.country] || ""}</span>
                    {alert.source === "live" && (
                      <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "#15803d", color: "#fff", letterSpacing: "0.1em" }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.35, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
                    {alert.region} · {THREAT_ICON[alert.threatType] || "🚀"} {alert.threatType.replace(/_/g, " ").toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.25, textTransform: "uppercase" }}>
          OREF HOME FRONT CMD
        </span>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.25 }}>
          {alerts.length} TOTAL
        </span>
      </div>
    </div>
  );
}
