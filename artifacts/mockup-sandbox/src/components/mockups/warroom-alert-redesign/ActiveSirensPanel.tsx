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

const THREAT_LABELS: Record<string, { code: string; label: string }> = {
  rockets:                   { code: "RKT", label: "Rockets" },
  missiles:                  { code: "MSL", label: "Missiles" },
  uav_intrusion:             { code: "UAV", label: "UAV" },
  hostile_aircraft_intrusion:{ code: "ACF", label: "Aircraft" },
};

type Tier = "immediate" | "critical" | "urgent" | "active" | "expired";

const TIER_CFG: Record<Tier, {
  label: string; short: string;
  accent: string; dimAccent: string;
  rowBg: string; headerBg: string;
  border: string; pulse: boolean;
}> = {
  immediate: {
    label: "IMPACT NOW",   short: "IMM",
    accent: "#f87171",     dimAccent: "rgba(248,113,113,0.18)",
    rowBg:    "rgba(127,29,29,0.25)",
    headerBg: "rgba(127,29,29,0.45)",
    border:   "rgba(248,113,113,0.35)",
    pulse: true,
  },
  critical: {
    label: "CRITICAL",     short: "CRT",
    accent: "#fb923c",     dimAccent: "rgba(251,146,60,0.12)",
    rowBg:    "rgba(124,45,18,0.18)",
    headerBg: "rgba(124,45,18,0.32)",
    border:   "rgba(251,146,60,0.25)",
    pulse: false,
  },
  urgent: {
    label: "URGENT",       short: "URG",
    accent: "#fbbf24",     dimAccent: "rgba(251,191,36,0.08)",
    rowBg:    "rgba(92,70,0,0.12)",
    headerBg: "rgba(92,70,0,0.22)",
    border:   "rgba(251,191,36,0.18)",
    pulse: false,
  },
  active: {
    label: "ACTIVE",       short: "ACT",
    accent: "#60a5fa",     dimAccent: "rgba(96,165,250,0.06)",
    rowBg:    "rgba(30,58,138,0.1)",
    headerBg: "rgba(30,58,138,0.2)",
    border:   "rgba(96,165,250,0.12)",
    pulse: false,
  },
  expired: {
    label: "EXPIRED",      short: "EXP",
    accent: "rgba(255,255,255,0.2)",  dimAccent: "transparent",
    rowBg:    "transparent",
    headerBg: "rgba(255,255,255,0.02)",
    border:   "rgba(255,255,255,0.04)",
    pulse: false,
  },
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
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

const generateMockAlerts = (): Alert[] => {
  const cities = [
    { city: "Tel Aviv",      region: "Gush Dan",       country: "Israel" },
    { city: "Haifa",         region: "Haifa Bay",       country: "Israel" },
    { city: "Ashkelon",      region: "Shfelah",         country: "Israel" },
    { city: "Sderot",        region: "Western Negev",   country: "Israel" },
    { city: "Kiryat Shmona", region: "Upper Galilee",   country: "Israel" },
    { city: "Nahariya",      region: "W. Galilee",      country: "Israel" },
    { city: "Beer Sheva",    region: "Negev",           country: "Israel" },
    { city: "Metula",        region: "Upper Galilee",   country: "Israel" },
    { city: "Tyre",          region: "South Lebanon",   country: "Lebanon" },
    { city: "Beirut",        region: "Mount Lebanon",   country: "Lebanon" },
    { city: "Isfahan",       region: "Isfahan Province",country: "Iran" },
    { city: "Damascus",      region: "Damascus Gov.",   country: "Syria" },
    { city: "Aleppo",        region: "N. Syria",        country: "Syria" },
    { city: "Riyadh",        region: "Central Region",  country: "Saudi Arabia" },
  ];
  const threats = ["rockets", "missiles", "uav_intrusion", "hostile_aircraft_intrusion"];
  const now = Date.now();
  return cities.map((c, i) => ({
    id: `ASP-${i}`, ...c,
    threatType: threats[i % threats.length],
    countdown: i < 2 ? 0 : i < 4 ? 12 : i < 7 ? 38 : i < 10 ? 95 : i < 12 ? 190 : 290,
    timestamp: new Date(now - (i * 7 + Math.floor(Math.random() * 15)) * 1000).toISOString(),
    source: i % 3 === 0 ? "live" : "oref",
  }));
};

function CountdownBadge({ tier, remaining, countdown }: { tier: Tier; remaining: number; countdown: number }) {
  const cfg = TIER_CFG[tier];
  const isImm = tier === "immediate";
  const isExp = tier === "expired";
  const pct = isImm ? 0 : countdown > 0 ? Math.max(0, (remaining / countdown) * 100) : 0;

  return (
    <div style={{ flexShrink: 0, width: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isImm
          ? "rgba(127,29,29,0.6)"
          : isExp
          ? "rgba(255,255,255,0.02)"
          : cfg.dimAccent,
        border: `1.5px solid ${isExp ? "rgba(255,255,255,0.05)" : cfg.border}`,
        position: "relative" as const,
        overflow: "hidden",
      }}>
        {!isImm && !isExp && countdown > 0 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: `${pct}%`,
            background: `${cfg.accent}18`,
            transition: "height 1s linear",
          }} />
        )}
        <span style={{
          fontSize: isImm ? 17 : 18,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          color: isExp ? "rgba(255,255,255,0.12)" : cfg.accent,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          position: "relative",
        }}>
          {isImm ? "⚠" : remaining > 0 ? String(remaining).padStart(2, "0") : "—"}
        </span>
        <span style={{
          fontSize: 7, fontWeight: 800,
          letterSpacing: "0.18em",
          color: isExp ? "rgba(255,255,255,0.08)" : `${cfg.accent}99`,
          textTransform: "uppercase",
          lineHeight: 1,
          marginTop: 2,
          position: "relative",
        }}>
          {isImm ? "NOW" : remaining > 0 ? "SEC" : "EXP"}
        </span>
      </div>
    </div>
  );
}

function AlertRow({ alert, tier, remaining }: { alert: Alert; tier: Tier; remaining: number }) {
  const cfg = TIER_CFG[tier];
  const isExp = tier === "expired";
  const isImm = tier === "immediate";
  const threat = THREAT_LABELS[alert.threatType] || { code: "UNK", label: "Unknown" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: isImm ? "12px 16px" : "9px 16px",
      borderBottom: `1px solid ${cfg.border}`,
      background: cfg.rowBg,
      opacity: isExp ? 0.22 : 1,
      position: "relative" as const,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 6, bottom: 6,
        width: 3, borderRadius: "0 3px 3px 0",
        background: cfg.accent,
        opacity: isExp ? 0.15 : isImm ? 1 : 0.6,
      }} />
      <CountdownBadge tier={tier} remaining={remaining} countdown={alert.countdown} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: isImm ? 15 : 13, fontWeight: isImm ? 800 : 700,
            color: isExp ? "rgba(255,255,255,0.3)" : "#fff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1,
          }}>
            {alert.city}
          </span>
          <span style={{ fontSize: 13, flexShrink: 0, opacity: isExp ? 0.3 : 0.8 }}>
            {FLAGS[alert.country]}
          </span>
          {alert.source === "live" && !isExp && (
            <span style={{
              fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3,
              background: "rgba(34,197,94,0.12)", color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.2)", letterSpacing: "0.06em", flexShrink: 0,
            }}>LIVE</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: isExp ? "rgba(255,255,255,0.15)" : cfg.accent,
            letterSpacing: "0.08em",
            background: isExp ? "transparent" : cfg.dimAccent,
            padding: "2px 5px", borderRadius: 3,
            border: isExp ? "none" : `1px solid ${cfg.border}`,
            flexShrink: 0,
          }}>
            {threat.code}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {alert.region}
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
            {timeAgo(alert.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TierHeader({ tier, count }: { tier: Tier; count: number }) {
  const cfg = TIER_CFG[tier];
  return (
    <div style={{
      padding: "6px 16px", display: "flex", alignItems: "center", gap: 8,
      background: cfg.headerBg,
      borderBottom: `1px solid ${cfg.border}`,
      borderTop: `1px solid ${cfg.border}`,
      position: "sticky" as const, top: 0, zIndex: 10,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{
        width: 3, height: 13, borderRadius: 2,
        background: cfg.accent,
        opacity: tier === "expired" ? 0.25 : 0.9,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: "0.2em",
        color: cfg.accent, fontFamily: "'JetBrains Mono', monospace",
        flex: 1, textTransform: "uppercase",
      }}>
        {cfg.label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 900,
        color: cfg.accent,
        fontFamily: "'JetBrains Mono', monospace",
        background: `${cfg.accent}18`,
        padding: "1px 7px", borderRadius: 4,
        border: `1px solid ${cfg.border}`,
      }}>
        {count}
      </span>
    </div>
  );
}

export default function ActiveSirensPanel() {
  const [alerts] = useState(generateMockAlerts);
  const [tick, setTick] = useState(0);
  const [pulseOn, setPulseOn] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setPulseOn(p => !p), 700);
    return () => clearInterval(iv);
  }, []);

  const processed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts
      .filter(a => !q || a.city.toLowerCase().includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q))
      .map(a => {
        const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
        const remaining = Math.max(0, a.countdown - elapsed);
        const tier = getTier(a.countdown, remaining);
        return { alert: a, remaining: a.countdown === 0 ? 0 : remaining, tier };
      });
  }, [alerts, searchQuery, tick]);

  const grouped = useMemo(() => {
    const g: Record<Tier, typeof processed> = { immediate: [], critical: [], urgent: [], active: [], expired: [] };
    processed.forEach(p => g[p.tier].push(p));
    return g;
  }, [processed]);

  const activeCount = processed.filter(p => p.tier !== "expired").length;
  const hasImmediate = grouped.immediate.length > 0;

  const tierSummaryBars = (["immediate", "critical", "urgent", "active"] as Tier[])
    .filter(t => grouped[t].length > 0)
    .map(t => ({ tier: t, pct: (grouped[t].length / Math.max(activeCount, 1)) * 100 }));

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#060e1c",
      color: "#fff",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes asp-pulse-border {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(248,113,113,0.25); }
          50%       { box-shadow: inset 0 0 0 1px rgba(248,113,113,0.65), 0 0 16px rgba(248,113,113,0.1); }
        }
        @keyframes asp-dot-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
        .asp-scroll::-webkit-scrollbar { width: 4px; }
        .asp-scroll::-webkit-scrollbar-track { background: transparent; }
        .asp-scroll::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.12); border-radius: 2px; }
        .asp-row-hover:hover { background: rgba(255,255,255,0.025) !important; cursor: default; }
        .asp-imm-flash { animation: asp-pulse-border 1.4s ease-in-out infinite; }
        .asp-dot-blink { animation: asp-dot-blink 0.7s step-start infinite; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{
        padding: "11px 16px 10px",
        borderBottom: `1px solid ${hasImmediate ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.06)"}`,
        flexShrink: 0,
        background: hasImmediate
          ? "linear-gradient(180deg, rgba(127,29,29,0.22) 0%, transparent 100%)"
          : "linear-gradient(180deg, rgba(30,58,138,0.14) 0%, transparent 100%)",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: activeCount > 0 ? 9 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            <div
              className={hasImmediate ? "asp-dot-blink" : ""}
              style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: activeCount === 0 ? "rgba(255,255,255,0.1)" : hasImmediate ? "#f87171" : "#60a5fa",
                boxShadow: activeCount === 0 ? "none" : hasImmediate ? "0 0 8px rgba(248,113,113,0.5)" : "0 0 6px rgba(96,165,250,0.4)",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
              ACTIVE SIRENS
            </span>
            {activeCount > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                background: hasImmediate ? "#f87171" : "#1d4ed8",
                padding: "2px 8px", borderRadius: 5,
                boxShadow: hasImmediate ? "0 2px 8px rgba(248,113,113,0.35)" : "0 2px 6px rgba(29,78,216,0.3)",
                color: "#fff",
              }}>
                {activeCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
              {timeStr}
            </span>
            {grouped.expired.length > 0 && (
              <button
                onClick={() => setShowExpired(s => !s)}
                style={{
                  fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 4,
                  background: showExpired ? "rgba(255,255,255,0.06)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.28)", cursor: "pointer",
                }}
              >
                {showExpired ? "HIDE EXP" : `+${grouped.expired.length} EXP`}
              </button>
            )}
          </div>
        </div>

        {/* Severity bar */}
        {activeCount > 0 && (
          <div style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", gap: 2, marginBottom: 8 }}>
            {tierSummaryBars.map(b => (
              <div key={b.tier} style={{
                flex: b.pct, minWidth: 3,
                background: TIER_CFG[b.tier].accent,
                borderRadius: 2, opacity: 0.75,
                transition: "flex 0.5s ease",
              }} />
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter by city, region, country..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 6, padding: "6px 10px",
            fontSize: 11, color: "#fff", outline: "none",
            fontFamily: "inherit",
            color: "rgba(255,255,255,0.7)",
          }}
        />
      </div>

      {/* ─── BODY ─── */}
      {activeCount === 0 && (!showExpired || grouped.expired.length === 0) ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ fontSize: 28, opacity: 0.5 }}>🛡</div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#4ade80", letterSpacing: "0.14em" }}>ALL CLEAR</span>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.15)" }}>
            OREF MONITORING ACTIVE
          </span>
        </div>
      ) : (
        <div
          className="asp-scroll"
          style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
        >
          {(["immediate", "critical", "urgent", "active"] as Tier[]).map(tier => {
            const items = grouped[tier];
            if (items.length === 0) return null;
            const isImm = tier === "immediate";

            return (
              <div key={tier} className={isImm ? "asp-imm-flash" : ""}>
                <TierHeader tier={tier} count={items.length} />
                {items.map(({ alert, remaining }) => (
                  <div key={alert.id} className="asp-row-hover">
                    <AlertRow alert={alert} tier={tier} remaining={remaining} />
                  </div>
                ))}
              </div>
            );
          })}

          {showExpired && grouped.expired.length > 0 && (
            <div>
              <TierHeader tier="expired" count={grouped.expired.length} />
              {grouped.expired.map(({ alert, remaining }) => (
                <div key={alert.id}>
                  <AlertRow alert={alert} tier="expired" remaining={remaining} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{
        padding: "7px 16px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.14)" }}>
          OREF HOME FRONT COMMAND
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(["immediate", "critical", "urgent", "active"] as Tier[]).map(t => {
            if (grouped[t].length === 0) return null;
            return (
              <span key={t} style={{
                fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.08em", color: TIER_CFG[t].accent,
                opacity: 0.75,
              }}>
                {TIER_CFG[t].short} {grouped[t].length}
              </span>
            );
          })}
          {grouped.expired.length > 0 && (
            <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.14)" }}>
              EXP {grouped.expired.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
