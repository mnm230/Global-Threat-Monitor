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

type Tier = "immediate" | "critical" | "urgent" | "active" | "expired";

const TIER_CONFIG: Record<Tier, { label: string; bg: string; border: string; accent: string; glow: string }> = {
  immediate: { label: "IMMEDIATE THREAT", bg: "rgba(153,27,27,0.3)", border: "rgba(220,38,38,0.7)", accent: "#ef4444", glow: "0 0 20px rgba(220,38,38,0.3)" },
  critical: { label: "CRITICAL · <15s", bg: "rgba(153,27,27,0.15)", border: "rgba(220,38,38,0.4)", accent: "#dc2626", glow: "0 0 12px rgba(220,38,38,0.15)" },
  urgent: { label: "URGENT · <45s", bg: "rgba(124,45,18,0.12)", border: "rgba(234,88,12,0.3)", accent: "#ea580c", glow: "none" },
  active: { label: "ACTIVE", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", accent: "#d97706", glow: "none" },
  expired: { label: "EXPIRED", bg: "transparent", border: "rgba(255,255,255,0.03)", accent: "rgba(255,255,255,0.15)", glow: "none" },
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
    id: `SEV-${i}`,
    ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 2 ? 0 : i < 4 ? 12 : i < 7 ? 40 : i < 10 ? 100 : i < 12 ? 200 : 300,
    timestamp: new Date(now - Math.floor(Math.random() * 60) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function useRemaining(alert: Alert) {
  const [r, setR] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, alert.countdown - Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000));
    setR(calc());
    const iv = setInterval(() => setR(calc()), 1000);
    return () => clearInterval(iv);
  }, [alert.timestamp, alert.countdown]);
  return r;
}

function getTier(alert: Alert, remaining: number): Tier {
  if (alert.countdown === 0) return "immediate";
  if (remaining <= 0) return "expired";
  if (remaining <= 15) return "critical";
  if (remaining <= 45) return "urgent";
  return "active";
}

function ImmediateCard({ alert }: { alert: Alert }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: "linear-gradient(135deg, rgba(153,27,27,0.45), rgba(69,10,10,0.3))",
        border: "2px solid rgba(239,68,68,0.6)",
        boxShadow: "0 0 24px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
        animation: "threat-pulse 2s ease-in-out infinite",
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #dc2626, #ef4444, #dc2626)", backgroundSize: "200% 100%", animation: "stripe-move 1s linear infinite" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 52 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, textShadow: "0 0 12px rgba(220,38,38,0.8)" }}>!</div>
          <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.15em", color: "#fca5a5", marginTop: 2 }}>NOW</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{alert.city}</span>
            <span style={{ fontSize: 13 }}>{FLAGS[alert.country]}</span>
            {alert.source === "live" && (
              <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "#15803d", color: "#fff" }}>LIVE</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}>
              {THREAT_ICON[alert.threatType]} {alert.threatType.replace(/_/g, " ").toUpperCase()}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{alert.region}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactRow({ alert, tier }: { alert: Alert; tier: Tier }) {
  const remaining = useRemaining(alert);
  const cfg = TIER_CONFIG[tier];
  const isExpired = tier === "expired";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderBottom: `1px solid ${cfg.border}`,
        opacity: isExpired ? 0.3 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <div
        style={{
          minWidth: 36,
          textAlign: "center",
          fontSize: 16,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', monospace",
          color: cfg.accent,
        }}
      >
        {remaining > 0 ? remaining : "—"}
      </div>
      <div style={{ width: 1, height: 20, background: cfg.border, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {alert.city}
      </span>
      <span style={{ fontSize: 10, opacity: 0.4 }}>{FLAGS[alert.country]}</span>
      <span style={{ fontSize: 9, opacity: 0.3, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
        {THREAT_ICON[alert.threatType]}
      </span>
    </div>
  );
}

export default function AlertSeverityStack() {
  const [alerts] = useState(generateMockAlerts);
  const [_, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const grouped = useMemo(() => {
    const tiers: Record<Tier, Alert[]> = { immediate: [], critical: [], urgent: [], active: [], expired: [] };
    alerts.forEach((a) => {
      const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
      const remaining = Math.max(0, a.countdown - elapsed);
      const tier = getTier(a, remaining);
      tiers[tier].push(a);
    });
    return tiers;
  }, [alerts, _]);

  const totalActive = alerts.length - grouped.expired.length;

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
        @keyframes threat-pulse { 0%, 100% { box-shadow: 0 0 24px rgba(220,38,38,0.25); } 50% { box-shadow: 0 0 36px rgba(220,38,38,0.45); } }
        @keyframes stripe-move { from { background-position: 0 0; } to { background-position: 200% 0; } }
        .sev-scroll::-webkit-scrollbar { width: 4px; }
        .sev-scroll::-webkit-scrollbar-track { background: transparent; }
        .sev-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.15); border-radius: 2px; }
      `}</style>

      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: totalActive > 0 ? "linear-gradient(135deg, rgba(127,29,29,0.2), transparent)" : "transparent" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: totalActive > 0 ? "#dc2626" : "rgba(255,255,255,0.15)", boxShadow: totalActive > 0 ? "0 0 8px #dc2626" : "none" }} />
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.12em" }}>SEVERITY STACK</span>
        {totalActive > 0 && (
          <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", background: "#dc2626", padding: "2px 8px", borderRadius: 6 }}>{totalActive}</span>
        )}
      </div>

      {totalActive === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.4 }}>
          <div style={{ fontSize: 24 }}>🛡</div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#22c55e", letterSpacing: "0.1em" }}>ALL CLEAR</span>
        </div>
      ) : (
        <div className="sev-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {(["immediate", "critical", "urgent", "active", "expired"] as Tier[]).map((tier) => {
            const tierAlerts = grouped[tier];
            if (tierAlerts.length === 0) return null;
            const cfg = TIER_CONFIG[tier];

            return (
              <div key={tier}>
                <div
                  style={{
                    padding: "6px 14px",
                    background: cfg.bg,
                    borderBottom: `1px solid ${cfg.border}`,
                    borderTop: `1px solid ${cfg.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    position: "sticky" as const,
                    top: 0,
                    zIndex: 10,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.accent, boxShadow: tier === "immediate" ? "0 0 6px " + cfg.accent : "none" }} />
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: cfg.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: cfg.accent, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
                    {tierAlerts.length}
                  </span>
                </div>

                {tier === "immediate" ? (
                  <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {tierAlerts.map((a) => (
                      <ImmediateCard key={a.id} alert={a} />
                    ))}
                  </div>
                ) : (
                  tierAlerts.map((a) => (
                    <CompactRow key={a.id} alert={a} tier={tier} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.2 }}>OREF HOME FRONT CMD</span>
        <div style={{ display: "flex", gap: 10 }}>
          {(["immediate", "critical", "urgent", "active"] as Tier[]).map((t) => (
            <span key={t} style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", color: TIER_CONFIG[t].accent }}>
              {t.slice(0, 4).toUpperCase()} {grouped[t].length}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
