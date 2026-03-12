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

const THREAT_CODE: Record<string, string> = {
  rockets: "RKT", missiles: "MSL", uav_intrusion: "UAV", hostile_aircraft_intrusion: "ACF",
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

type Urgency = "immediate" | "critical" | "urgent" | "active" | "expired";

function getUrgency(alert: Alert, remaining: number): Urgency {
  if (alert.countdown === 0) return "immediate";
  if (remaining <= 0) return "expired";
  if (remaining <= 15) return "critical";
  if (remaining <= 45) return "urgent";
  return "active";
}

const URGENCY_COLORS: Record<Urgency, { ring: string; text: string; accent: string; stripe: string; bg: string }> = {
  immediate: { ring: "#ef4444", text: "#fecaca", accent: "#ef4444", stripe: "#ef4444", bg: "rgba(239,68,68,0.06)" },
  critical:  { ring: "#f87171", text: "#fecaca", accent: "#f87171", stripe: "#ef4444", bg: "rgba(239,68,68,0.03)" },
  urgent:    { ring: "#f59e0b", text: "#fde68a", accent: "#f59e0b", stripe: "#f59e0b", bg: "transparent" },
  active:    { ring: "#475569", text: "#94a3b8", accent: "#64748b", stripe: "#334155", bg: "transparent" },
  expired:   { ring: "#1e293b", text: "#1e293b", accent: "#1e293b", stripe: "#0f172a", bg: "transparent" },
};

function CountdownRing({ alert, remaining, urgency }: { alert: Alert; remaining: number; urgency: Urgency }) {
  const isImmediate = alert.countdown === 0;
  const isExpired = urgency === "expired";
  const progress = isImmediate ? 1 : alert.countdown > 0 ? remaining / alert.countdown : 0;

  const size = 42;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const colors = URGENCY_COLORS[urgency];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(100,116,139,0.06)" strokeWidth={strokeWidth} />
        {!isExpired && (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.ring} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            opacity={urgency === "active" ? 0.5 : 1}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: isImmediate ? 16 : 14, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
          color: colors.text,
        }}>
          {isImmediate ? "!" : remaining > 0 ? remaining : "·"}
        </span>
        {!isExpired && !isImmediate && remaining > 0 && (
          <span style={{ fontSize: 6, fontWeight: 600, color: colors.accent, opacity: 0.6, marginTop: 1, letterSpacing: "0.08em" }}>SEC</span>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
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
  const immCount = alerts.filter(a => a.countdown === 0).length;

  const countrySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { if (a.countdown === 0 || Math.max(0, a.countdown - Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000)) > 0) counts[a.country] = (counts[a.country] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [alerts, _]);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#080e1a",
      color: "#cbd5e1",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        .qs-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px 12px 0; margin: 0 16px; border-bottom: 1px solid rgba(100,116,139,0.05); transition: background 0.2s; cursor: default; position: relative; }
        .qs-row:hover { background: rgba(100,116,139,0.03); border-radius: 8px; }
        .qs-row.expired { opacity: 0.15; }
        .qs-scroll::-webkit-scrollbar { width: 3px; }
        .qs-scroll::-webkit-scrollbar-track { background: transparent; }
        .qs-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.1); border-radius: 3px; }
      `}</style>

      <div style={{
        padding: "16px 18px",
        borderBottom: "1px solid rgba(100,116,139,0.07)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: activeCount > 0 ? 10 : 0 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: activeCount > 0 ? "#ef4444" : "#1e293b",
            boxShadow: activeCount > 0 ? "0 0 10px rgba(239,68,68,0.25)" : "none",
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", color: "#64748b", flex: 1 }}>Alerts</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: "#fca5a5", background: "rgba(239,68,68,0.07)",
              padding: "3px 10px", borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.1)",
            }}>{activeCount}</span>
          )}
          <button onClick={() => setSearchOpen(!searchOpen)} style={{
            width: 28, height: 28, borderRadius: 8,
            border: "1px solid rgba(100,116,139,0.08)",
            background: searchOpen ? "rgba(100,116,139,0.06)" : "transparent",
            color: searchOpen ? "#94a3b8" : "#334155",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>⌕</button>
        </div>

        {activeCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {immCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ fontSize: 10, color: "#f87171", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{immCount} immediate</span>
              </div>
            )}
            {countrySummary.slice(0, 3).map(([c, n]) => (
              <span key={c} style={{ fontSize: 9, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                {FLAGS[c]} {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {searchOpen && (
        <div style={{ padding: "6px 18px 10px", borderBottom: "1px solid rgba(100,116,139,0.05)", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search locations..." autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(100,116,139,0.04)", border: "1px solid rgba(100,116,139,0.08)",
                borderRadius: 8, padding: "8px 12px 8px 30px", fontSize: 11, color: "#cbd5e1", outline: "none",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#334155" }}>⌕</span>
          </div>
        </div>
      )}

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "1.5px solid rgba(34,197,94,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            background: "rgba(34,197,94,0.03)",
          }}>🛡</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80", letterSpacing: "0.02em", marginBottom: 4 }}>All clear</div>
            <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: "0.05em" }}>No active threats · monitoring</div>
          </div>
        </div>
      ) : (
        <div className="qs-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map(alert => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
            const isImmediate = alert.countdown === 0;
            const isExpired = !isImmediate && remaining <= 0;
            const urgency = getUrgency(alert, remaining);
            const colors = URGENCY_COLORS[urgency];

            return (
              <div key={alert.id} className={`qs-row ${isExpired ? "expired" : ""}`} style={{ background: colors.bg }}>
                <div style={{
                  position: "absolute", left: 0, top: 4, bottom: 4,
                  width: 2, borderRadius: 1,
                  background: colors.stripe,
                  opacity: isExpired ? 0.2 : urgency === "active" ? 0.3 : 0.7,
                }} />
                <CountdownRing alert={alert} remaining={remaining === -1 ? 0 : remaining} urgency={urgency} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      color: isExpired ? "#1e293b" : urgency === "immediate" || urgency === "critical" ? "#fecaca" : "#e2e8f0",
                    }}>
                      {alert.city}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.35 }}>{FLAGS[alert.country]}</span>
                    {alert.source === "live" && (
                      <span style={{
                        fontSize: 7, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                        background: "rgba(34,197,94,0.07)", color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.1)",
                        letterSpacing: "0.04em",
                      }}>Live</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: colors.accent, opacity: urgency === "active" || urgency === "expired" ? 0.5 : 0.7,
                      letterSpacing: "0.04em",
                    }}>
                      {THREAT_CODE[alert.threatType] || "UNK"}
                    </span>
                    <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.01em" }}>
                      {alert.region}
                    </span>
                    <span style={{ fontSize: 8, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto", flexShrink: 0 }}>
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: "10px 18px", borderTop: "1px solid rgba(100,116,139,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        background: "rgba(0,0,0,0.15)",
      }}>
        <span style={{ fontSize: 8, color: "#1e293b", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>HOME FRONT COMMAND</span>
        <span style={{ fontSize: 8, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>{alerts.length} total · {activeCount} active</span>
      </div>
    </div>
  );
}
