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

type Tier = "immediate" | "critical" | "urgent" | "active" | "expired";

const T: Record<Tier, { short: string; accent: string; rowBg: string; barOpacity: number }> = {
  immediate: { short: "IMM", accent: "#ef4444", rowBg: "rgba(153,27,27,0.15)", barOpacity: 1 },
  critical:  { short: "CRT", accent: "#dc2626", rowBg: "rgba(153,27,27,0.07)", barOpacity: 0.8 },
  urgent:    { short: "URG", accent: "#ea580c", rowBg: "rgba(124,45,18,0.04)", barOpacity: 0.6 },
  active:    { short: "ACT", accent: "#92400e", rowBg: "transparent", barOpacity: 0.25 },
  expired:   { short: "EXP", accent: "rgba(255,255,255,0.08)", rowBg: "transparent", barOpacity: 0.08 },
};

function getTier(countdown: number, remaining: number): Tier {
  if (countdown === 0) return "immediate";
  if (remaining <= 0) return "expired";
  if (remaining <= 15) return "critical";
  if (remaining <= 45) return "urgent";
  return "active";
}

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
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
    { city: "Metula", region: "Upper Galilee", country: "Israel" },
    { city: "Tyre", region: "South Lebanon", country: "Lebanon" },
    { city: "Beirut", region: "Mount Lebanon", country: "Lebanon" },
    { city: "Isfahan", region: "Isfahan Province", country: "Iran" },
    { city: "Damascus", region: "Damascus Gov.", country: "Syria" },
    { city: "Aleppo", region: "Northern Syria", country: "Syria" },
    { city: "Riyadh", region: "Central Region", country: "Saudi Arabia" },
  ];
  const threats = ["rockets", "missiles", "uav_intrusion", "hostile_aircraft_intrusion"];
  const now = Date.now();
  return cities.map((c, i) => ({
    id: `SSB-${i}`, ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 2 ? 0 : i < 4 ? 12 : i < 7 ? 40 : i < 10 ? 100 : i < 12 ? 200 : 300,
    timestamp: new Date(now - Math.floor(Math.random() * 60) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

export default function SeverityStackB() {
  const [alerts] = useState(generateMockAlerts);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [_, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(iv); }, []);

  const processed = useMemo(() => {
    let list = [...alerts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.city.toLowerCase().includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
    }
    return list.map(a => {
      const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
      const remaining = Math.max(0, a.countdown - elapsed);
      const tier = getTier(a.countdown, remaining);
      return { alert: a, remaining: a.countdown === 0 ? 0 : remaining, tier };
    });
  }, [alerts, searchQuery, _]);

  const grouped = useMemo(() => {
    const g: Record<Tier, typeof processed> = { immediate: [], critical: [], urgent: [], active: [], expired: [] };
    processed.forEach(p => g[p.tier].push(p));
    return g;
  }, [processed]);

  const totalActive = processed.filter(p => p.tier !== "expired").length;

  const tierSummary = useMemo(() => {
    const bars: { tier: Tier; count: number; pct: number }[] = [];
    const total = processed.length || 1;
    (["immediate", "critical", "urgent", "active", "expired"] as Tier[]).forEach(t => {
      if (grouped[t].length > 0) bars.push({ tier: t, count: grouped[t].length, pct: (grouped[t].length / total) * 100 });
    });
    return bars;
  }, [grouped, processed]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#080604", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .ssb-scroll::-webkit-scrollbar { width: 3px; }
        .ssb-scroll::-webkit-scrollbar-track { background: transparent; }
        .ssb-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.1); border-radius: 2px; }
        .ssb-row { transition: background 0.15s; }
        .ssb-row:hover { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, background: totalActive > 0 ? "linear-gradient(180deg, rgba(127,29,29,0.12), transparent)" : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: totalActive > 0 ? 8 : 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: totalActive > 0 ? "#dc2626" : "rgba(255,255,255,0.08)", boxShadow: totalActive > 0 ? "0 0 6px rgba(220,38,38,0.4)" : "none" }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)", flex: 1 }}>SEVERITY STACK</span>
          {totalActive > 0 && (
            <span style={{ fontSize: 12, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", background: "#dc2626", padding: "2px 7px", borderRadius: 4 }}>{totalActive}</span>
          )}
          <button onClick={() => setSearchOpen(!searchOpen)} style={{
            width: 24, height: 24, borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)",
            background: searchOpen ? "rgba(220,38,38,0.1)" : "transparent",
            color: searchOpen ? "#f87171" : "rgba(255,255,255,0.2)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
          }}>⌕</button>
        </div>

        {totalActive > 0 && (
          <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", gap: 1 }}>
            {tierSummary.filter(b => b.tier !== "expired").map(b => (
              <div key={b.tier} style={{ width: `${b.pct}%`, minWidth: 4, background: T[b.tier].accent, borderRadius: 1, opacity: 0.7 }} />
            ))}
          </div>
        )}
      </div>

      {searchOpen && (
        <div style={{ padding: "6px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)", flexShrink: 0 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." autoFocus
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "5px 9px", fontSize: 10, color: "#fff", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      )}

      {totalActive === 0 && grouped.expired.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.3 }}>
          <span style={{ fontSize: 20 }}>🛡</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#22c55e", letterSpacing: "0.12em" }}>ALL CLEAR</span>
        </div>
      ) : (
        <div className="ssb-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {(["immediate", "critical", "urgent", "active", "expired"] as Tier[]).map(tier => {
            const items = grouped[tier];
            if (items.length === 0) return null;
            const cfg = T[tier];
            const isExp = tier === "expired";

            return (
              <div key={tier}>
                <div style={{
                  padding: "4px 14px", display: "flex", alignItems: "center",
                  borderBottom: `1px solid rgba(255,255,255,0.03)`,
                  position: "sticky" as const, top: 0, zIndex: 10,
                  background: "#080604",
                }}>
                  <div style={{ width: 2, height: 10, borderRadius: 1, background: cfg.accent, marginRight: 8, opacity: cfg.barOpacity }} />
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.22em", color: cfg.accent, fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>
                    {cfg.short}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 900, color: cfg.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                    {items.length}
                  </span>
                </div>

                {items.map(({ alert, remaining, tier: t }) => (
                  <div key={alert.id} className="ssb-row" style={{
                    display: "flex", alignItems: "center", gap: 0,
                    padding: "7px 0 7px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    background: cfg.rowBg,
                    opacity: isExp ? 0.2 : 1,
                  }}>
                    <div style={{
                      width: 40, flexShrink: 0, textAlign: "center",
                      fontSize: t === "immediate" ? 16 : 14,
                      fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
                      color: cfg.accent, fontVariantNumeric: "tabular-nums",
                    }}>
                      {t === "immediate" ? "00" : remaining > 0 ? String(remaining).padStart(2, "0") : "——"}
                    </div>
                    <div style={{ width: 1, height: 18, background: `${cfg.accent}30`, margin: "0 8px", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {alert.city}
                        </span>
                        <span style={{ fontSize: 9, opacity: 0.3, flexShrink: 0 }}>{FLAGS[alert.country]}</span>
                        {alert.source === "live" && (
                          <span style={{ fontSize: 6, fontWeight: 800, padding: "1px 4px", borderRadius: 2, background: "rgba(34,197,94,0.15)", color: "#4ade80", letterSpacing: "0.06em", flexShrink: 0 }}>LIVE</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 7, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: cfg.accent, opacity: 0.55, letterSpacing: "0.05em" }}>
                          {THREAT_CODE[alert.threatType]}
                        </span>
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {alert.region}
                        </span>
                        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.08)", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto", flexShrink: 0 }}>
                          {timeAgo(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.1)" }}>OREF HOME FRONT CMD</span>
        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", color: "rgba(255,255,255,0.1)" }}>{alerts.length} TOTAL</span>
      </div>
    </div>
  );
}
