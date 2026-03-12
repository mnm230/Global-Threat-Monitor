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

const THREAT_CODE: Record<string, string> = {
  rockets: "RKT", missiles: "MSL", uav_intrusion: "UAV", hostile_aircraft_intrusion: "ACF",
};

type Urgency = "immediate" | "critical" | "urgent" | "active" | "expired";

const URGENCY_STRIPE: Record<Urgency, string> = {
  immediate: "#ef4444",
  critical: "#dc2626",
  urgent: "#ea580c",
  active: "#991b1b",
  expired: "rgba(255,255,255,0.04)",
};

const URGENCY_BG: Record<Urgency, string> = {
  immediate: "rgba(153,27,27,0.22)",
  critical: "rgba(153,27,27,0.12)",
  urgent: "rgba(124,45,18,0.06)",
  active: "transparent",
  expired: "transparent",
};

function getUrgency(alert: Alert, remaining: number): Urgency {
  if (alert.countdown === 0) return "immediate";
  if (remaining <= 0) return "expired";
  if (remaining <= 15) return "critical";
  if (remaining <= 45) return "urgent";
  return "active";
}

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

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
    id: `RA-${i}`, ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 3 ? 0 : [15, 30, 60, 90, 120, 180][Math.floor(Math.random() * 6)],
    timestamp: new Date(now - Math.floor(Math.random() * 180) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function CountdownBadge({ remaining, urgency }: { remaining: number; urgency: Urgency }) {
  const isImmediate = urgency === "immediate";
  const isExpired = urgency === "expired";
  const isCritOrImm = urgency === "immediate" || urgency === "critical";

  const bg = isExpired
    ? "rgba(255,255,255,0.03)"
    : isCritOrImm
      ? "#dc2626"
      : urgency === "urgent"
        ? "#b45309"
        : "rgba(153,27,27,0.4)";

  return (
    <div style={{
      minWidth: 46, padding: "5px 6px", borderRadius: 6, textAlign: "center",
      background: bg,
      color: isExpired ? "rgba(255,255,255,0.12)" : "#fff",
      border: isExpired ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.25)",
      boxShadow: isCritOrImm && !isExpired ? "0 2px 10px rgba(220,38,38,0.35)" : "none",
    }}>
      <div style={{
        fontSize: isImmediate ? 20 : 18, fontWeight: 900,
        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {isImmediate ? "00" : remaining > 0 ? String(remaining).padStart(2, "0") : "——"}
      </div>
      <div style={{
        fontSize: 7, fontWeight: 800, letterSpacing: "0.15em",
        marginTop: 2, opacity: 0.7, textTransform: "uppercase",
      }}>
        {isImmediate ? "NOW" : remaining > 0 ? "SEC" : "EXP"}
      </div>
    </div>
  );
}

export default function TriageRefinedA() {
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

  const tierCounts = useMemo(() => {
    const c = { immediate: 0, critical: 0, urgent: 0, active: 0, expired: 0 };
    alerts.forEach(a => {
      const rem = a.countdown === 0 ? -1 : Math.max(0, a.countdown - Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000));
      c[getUrgency(a, rem)]++;
    });
    return c;
  }, [alerts, _]);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#0c0806", color: "#fff",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        .ra-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px 9px 14px; position: relative; cursor: default; transition: background 0.15s; }
        .ra-row:hover { background: rgba(220,38,38,0.04); }
        .ra-row.expired { opacity: 0.25; }
        .ra-scroll::-webkit-scrollbar { width: 4px; }
        .ra-scroll::-webkit-scrollbar-track { background: transparent; }
        .ra-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.15); border-radius: 2px; }
      `}</style>

      <div style={{
        padding: "12px 14px",
        borderBottom: activeCount > 0 ? "1px solid rgba(220,38,38,0.35)" : "1px solid rgba(255,255,255,0.05)",
        background: activeCount > 0 ? "linear-gradient(135deg, rgba(127,29,29,0.2), rgba(12,8,6,1))" : "transparent",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: activeCount > 0 ? "#dc2626" : "rgba(255,255,255,0.12)",
            boxShadow: activeCount > 0 ? "0 0 8px rgba(220,38,38,0.5)" : "none",
          }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>ALERTS</span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
              background: "#dc2626", color: "#fff",
              padding: "2px 8px", borderRadius: 5,
              boxShadow: "0 2px 8px rgba(220,38,38,0.35)",
            }}>{activeCount}</span>
          )}
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          width: 26, height: 26, borderRadius: 5,
          border: "1px solid rgba(255,255,255,0.07)",
          background: searchOpen ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.03)",
          color: searchOpen ? "#f87171" : "rgba(255,255,255,0.3)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        }}>⌕</button>
      </div>

      {searchOpen && (
        <div style={{ padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.25)", flexShrink: 0 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="City, region, country..." autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(220,38,38,0.15)",
              borderRadius: 5, padding: "6px 10px", fontSize: 11, color: "#fff", outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
        </div>
      )}

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.35 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡</div>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.12em", color: "#22c55e" }}>ALL CLEAR</span>
          <span style={{ fontSize: 8, letterSpacing: "0.2em", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)" }}>MONITORING ACTIVE</span>
        </div>
      ) : (
        <div className="ra-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map(alert => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? 0 : Math.max(0, alert.countdown - elapsed);
            const urgency = getUrgency(alert, remaining);
            const isExpired = urgency === "expired";
            const stripe = URGENCY_STRIPE[urgency];

            return (
              <div key={alert.id} className={`ra-row ${isExpired ? "expired" : ""}`}
                style={{ background: URGENCY_BG[urgency], borderBottom: `1px solid rgba(255,255,255,0.03)` }}
              >
                <div style={{
                  position: "absolute", left: 0, top: 6, bottom: 6,
                  width: 3, borderRadius: "0 2px 2px 0",
                  background: stripe,
                  opacity: isExpired ? 0.15 : urgency === "active" ? 0.4 : 0.85,
                }} />
                <CountdownBadge remaining={remaining} urgency={urgency} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {alert.city}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }}>{FLAGS[alert.country]}</span>
                    {alert.source === "live" && (
                      <span style={{
                        fontSize: 7, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                        background: "rgba(21,128,61,0.2)", color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.2)",
                        letterSpacing: "0.08em", flexShrink: 0,
                      }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      color: URGENCY_STRIPE[urgency], opacity: isExpired ? 0.3 : 0.6,
                      letterSpacing: "0.06em",
                    }}>
                      {THREAT_CODE[alert.threatType] || "UNK"}
                    </span>
                    <span style={{ width: 1, height: 8, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {alert.region}
                    </span>
                    <span style={{
                      fontSize: 8, color: "rgba(255,255,255,0.15)", fontFamily: "'JetBrains Mono', monospace",
                      marginLeft: "auto", flexShrink: 0,
                    }}>
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
        padding: "7px 14px", borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)" }}>
          OREF HOME FRONT CMD
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["immediate", "critical", "urgent", "active"] as Urgency[]).map(t => {
            if (tierCounts[t] === 0) return null;
            return (
              <span key={t} style={{
                fontSize: 7, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em", color: URGENCY_STRIPE[t],
              }}>
                {t === "immediate" ? "IMM" : t === "critical" ? "CRIT" : t === "urgent" ? "URG" : "ACT"} {tierCounts[t]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
