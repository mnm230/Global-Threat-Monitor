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

const THREAT_LABEL: Record<string, string> = {
  rockets: "Rocket fire", missiles: "Missile launch", uav_intrusion: "UAV detected", hostile_aircraft_intrusion: "Hostile aircraft",
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
    id: `QSN-${i}`, ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 3 ? 0 : [15, 30, 60, 90, 120, 180][Math.floor(Math.random() * 6)],
    timestamp: new Date(now - Math.floor(Math.random() * 180) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function CountdownRing({ alert }: { alert: Alert }) {
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
  const progress = isImmediate ? 1 : alert.countdown > 0 ? remaining / alert.countdown : 0;

  const size = 38;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const ringColor = isExpired ? "#1e293b" : isCritical ? "#ef4444" : remaining <= 45 ? "#f59e0b" : "#475569";
  const textColor = isExpired ? "#334155" : isCritical ? "#fca5a5" : remaining <= 45 ? "#fde68a" : "#94a3b8";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={isExpired ? "#0f172a" : "rgba(100,116,139,0.1)"} strokeWidth={strokeWidth} />
        {!isExpired && (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          >
            {isCritical && <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />}
          </circle>
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: textColor }}>
          {isImmediate ? "!" : remaining > 0 ? remaining : "·"}
        </span>
      </div>
    </div>
  );
}

export default function TriageQuietSentinel() {
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
      background: "#0b1120",
      color: "#cbd5e1",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes gentle-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .qs-row { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid rgba(100,116,139,0.07); transition: all 0.25s ease; cursor: default; animation: fade-up 0.4s ease-out; }
        .qs-row:hover { background: rgba(100,116,139,0.04); }
        .qs-row.critical { background: rgba(239,68,68,0.04); }
        .qs-row.expired { opacity: 0.2; }
        .qs-scroll::-webkit-scrollbar { width: 3px; }
        .qs-scroll::-webkit-scrollbar-track { background: transparent; }
        .qs-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.12); border-radius: 3px; }
      `}</style>

      <div style={{
        padding: "16px 18px 14px",
        borderBottom: "1px solid rgba(100,116,139,0.08)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: activeCount > 0 ? "#ef4444" : "#334155",
            boxShadow: activeCount > 0 ? "0 0 12px rgba(239,68,68,0.3)" : "none",
            animation: activeCount > 0 ? "gentle-breathe 3s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: "#64748b" }}>Alerts</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: "#fca5a5", background: "rgba(239,68,68,0.08)",
              padding: "3px 10px", borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.12)",
            }}>{activeCount}</span>
          )}
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          width: 30, height: 30, borderRadius: 10,
          border: "1px solid rgba(100,116,139,0.1)",
          background: searchOpen ? "rgba(100,116,139,0.08)" : "transparent",
          color: searchOpen ? "#94a3b8" : "#334155",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          transition: "all 0.2s",
        }}>⌕</button>
      </div>

      {searchOpen && (
        <div style={{ padding: "8px 18px 10px", borderBottom: "1px solid rgba(100,116,139,0.06)", flexShrink: 0 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search locations..." autoFocus
            style={{
              width: "100%", background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.1)",
              borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#cbd5e1", outline: "none",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
        </div>
      )}

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "1.5px solid rgba(34,197,94,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            background: "rgba(34,197,94,0.04)",
          }}>🛡</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#4ade80", letterSpacing: "0.02em" }}>All clear</span>
          <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.06em" }}>Monitoring active</span>
        </div>
      ) : (
        <div className="qs-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map(alert => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
            const isImmediate = alert.countdown === 0;
            const isExpired = !isImmediate && remaining <= 0;
            const isCritical = isImmediate || (remaining > 0 && remaining <= 15);

            return (
              <div key={alert.id} className={`qs-row ${isCritical ? "critical" : ""} ${isExpired ? "expired" : ""}`}>
                <CountdownRing alert={alert} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      color: isExpired ? "#1e293b" : isCritical ? "#fca5a5" : "#e2e8f0",
                    }}>
                      {alert.city}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.4 }}>{FLAGS[alert.country]}</span>
                    {alert.source === "live" && (
                      <span style={{
                        fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 6,
                        background: "rgba(34,197,94,0.08)", color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.12)",
                      }}>Live</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.01em" }}>
                    {THREAT_LABEL[alert.threatType] || "Unknown"} · {alert.region}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: "10px 18px", borderTop: "1px solid rgba(100,116,139,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: "#1e293b", letterSpacing: "0.06em" }}>Home Front Command</span>
        <span style={{ fontSize: 9, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>{alerts.length} total</span>
      </div>
    </div>
  );
}
