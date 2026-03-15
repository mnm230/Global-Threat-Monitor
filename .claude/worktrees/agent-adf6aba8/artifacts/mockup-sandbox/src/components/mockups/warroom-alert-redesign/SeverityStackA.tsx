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

const TIER: Record<Tier, { label: string; accent: string; bg: string; headerBg: string; border: string }> = {
  immediate: { label: "IMMEDIATE", accent: "#ef4444", bg: "rgba(153,27,27,0.18)", headerBg: "rgba(153,27,27,0.25)", border: "rgba(220,38,38,0.5)" },
  critical:  { label: "CRITICAL",  accent: "#dc2626", bg: "rgba(153,27,27,0.08)", headerBg: "rgba(153,27,27,0.14)", border: "rgba(220,38,38,0.25)" },
  urgent:    { label: "URGENT",    accent: "#ea580c", bg: "rgba(124,45,18,0.05)", headerBg: "rgba(124,45,18,0.1)",  border: "rgba(234,88,12,0.2)" },
  active:    { label: "ACTIVE",    accent: "#d97706", bg: "transparent",           headerBg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.05)" },
  expired:   { label: "EXPIRED",   accent: "rgba(255,255,255,0.12)", bg: "transparent", headerBg: "rgba(255,255,255,0.01)", border: "rgba(255,255,255,0.03)" },
};

function getTier(alert: Alert, remaining: number): Tier {
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
    id: `SSA-${i}`, ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 2 ? 0 : i < 4 ? 12 : i < 7 ? 40 : i < 10 ? 100 : i < 12 ? 200 : 300,
    timestamp: new Date(now - Math.floor(Math.random() * 60) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function CountdownCell({ remaining, tier }: { remaining: number; tier: Tier }) {
  const isImm = tier === "immediate";
  const isExp = tier === "expired";
  const cfg = TIER[tier];

  return (
    <div style={{
      minWidth: 42, padding: "4px 5px", borderRadius: 5, textAlign: "center",
      background: isExp ? "rgba(255,255,255,0.02)" : isImm ? "#dc2626" : tier === "critical" ? "rgba(220,38,38,0.5)" : tier === "urgent" ? "rgba(180,83,9,0.4)" : "rgba(255,255,255,0.04)",
      color: isExp ? "rgba(255,255,255,0.1)" : "#fff",
      border: isExp ? "1px solid rgba(255,255,255,0.04)" : `1px solid ${cfg.border}`,
      boxShadow: isImm ? "0 2px 8px rgba(220,38,38,0.3)" : "none",
    }}>
      <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {isImm ? "00" : remaining > 0 ? String(remaining).padStart(2, "0") : "——"}
      </div>
      <div style={{ fontSize: 6, fontWeight: 800, letterSpacing: "0.15em", marginTop: 1, opacity: 0.65, textTransform: "uppercase" }}>
        {isImm ? "NOW" : remaining > 0 ? "SEC" : "EXP"}
      </div>
    </div>
  );
}

function AlertRow({ alert, tier, remaining }: { alert: Alert; tier: Tier; remaining: number }) {
  const cfg = TIER[tier];
  const isExp = tier === "expired";
  const isImm = tier === "immediate";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: isImm ? "10px 12px" : "8px 12px",
      borderBottom: `1px solid ${cfg.border}`,
      background: cfg.bg,
      opacity: isExp ? 0.2 : 1,
      position: "relative" as const,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 4, bottom: 4,
        width: 3, borderRadius: "0 2px 2px 0",
        background: cfg.accent,
        opacity: isExp ? 0.1 : tier === "active" ? 0.3 : 0.7,
      }} />
      <CountdownCell remaining={remaining} tier={tier} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: isImm ? 14 : 12, fontWeight: isImm ? 800 : 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {alert.city}
          </span>
          <span style={{ fontSize: 10, opacity: 0.35, flexShrink: 0 }}>{FLAGS[alert.country]}</span>
          {alert.source === "live" && (
            <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: "rgba(21,128,61,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.15)", letterSpacing: "0.06em", flexShrink: 0 }}>LIVE</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: cfg.accent, opacity: 0.65, letterSpacing: "0.05em" }}>
            {THREAT_CODE[alert.threatType] || "UNK"}
          </span>
          <span style={{ width: 1, height: 7, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {alert.region}
          </span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.12)", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto", flexShrink: 0 }}>
            {timeAgo(alert.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SeverityStackA() {
  const [alerts] = useState(generateMockAlerts);
  const [_, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(iv); }, []);

  const grouped = useMemo(() => {
    const tiers: Record<Tier, { alert: Alert; remaining: number }[]> = { immediate: [], critical: [], urgent: [], active: [], expired: [] };
    alerts.forEach(a => {
      const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
      const remaining = Math.max(0, a.countdown - elapsed);
      const tier = getTier(a, remaining);
      tiers[tier].push({ alert: a, remaining: tier === "immediate" ? 0 : remaining });
    });
    return tiers;
  }, [alerts, _]);

  const totalActive = alerts.length - grouped.expired.length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0c0806", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .ssa-scroll::-webkit-scrollbar { width: 4px; }
        .ssa-scroll::-webkit-scrollbar-track { background: transparent; }
        .ssa-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.12); border-radius: 2px; }
      `}</style>

      <div style={{
        padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: totalActive > 0 ? "linear-gradient(135deg, rgba(127,29,29,0.15), transparent)" : "transparent",
      }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: totalActive > 0 ? "#dc2626" : "rgba(255,255,255,0.1)", boxShadow: totalActive > 0 ? "0 0 8px rgba(220,38,38,0.4)" : "none" }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}>SEVERITY STACK</span>
        {totalActive > 0 && (
          <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", background: "#dc2626", padding: "2px 8px", borderRadius: 5, boxShadow: "0 2px 6px rgba(220,38,38,0.3)" }}>{totalActive}</span>
        )}
      </div>

      {totalActive === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.35 }}>
          <div style={{ fontSize: 22 }}>🛡</div>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#22c55e", letterSpacing: "0.12em" }}>ALL CLEAR</span>
          <span style={{ fontSize: 8, letterSpacing: "0.2em", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)" }}>MONITORING</span>
        </div>
      ) : (
        <div className="ssa-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {(["immediate", "critical", "urgent", "active", "expired"] as Tier[]).map(tier => {
            const items = grouped[tier];
            if (items.length === 0) return null;
            const cfg = TIER[tier];

            return (
              <div key={tier}>
                <div style={{
                  padding: "5px 14px",
                  background: cfg.headerBg,
                  borderBottom: `1px solid ${cfg.border}`,
                  borderTop: `1px solid ${cfg.border}`,
                  display: "flex", alignItems: "center", gap: 0,
                  position: "sticky" as const, top: 0, zIndex: 10,
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: cfg.accent, marginRight: 8, opacity: tier === "expired" ? 0.2 : 0.8 }} />
                  <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.2em", color: cfg.accent, fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: cfg.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                    {items.length}
                  </span>
                </div>
                {items.map(({ alert, remaining }) => (
                  <AlertRow key={alert.id} alert={alert} tier={tier} remaining={remaining} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: "7px 14px", borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.25)", display: "flex", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.12)" }}>OREF HOME FRONT CMD</span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["immediate", "critical", "urgent", "active"] as Tier[]).map(t => {
            if (grouped[t].length === 0) return null;
            return (
              <span key={t} style={{ fontSize: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", color: TIER[t].accent }}>
                {t === "immediate" ? "IMM" : t === "critical" ? "CRIT" : t === "urgent" ? "URG" : "ACT"} {grouped[t].length}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
