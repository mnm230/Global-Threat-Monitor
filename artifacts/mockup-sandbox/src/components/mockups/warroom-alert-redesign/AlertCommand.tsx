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
  lat: number;
  lng: number;
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
    { city: "Tel Aviv", region: "Gush Dan", country: "Israel", lat: 32.08, lng: 34.78 },
    { city: "Haifa", region: "Haifa Bay", country: "Israel", lat: 32.79, lng: 34.99 },
    { city: "Ashkelon", region: "Shfelah", country: "Israel", lat: 31.67, lng: 34.57 },
    { city: "Sderot", region: "Western Negev", country: "Israel", lat: 31.52, lng: 34.59 },
    { city: "Kiryat Shmona", region: "Upper Galilee", country: "Israel", lat: 33.21, lng: 35.57 },
    { city: "Nahariya", region: "Western Galilee", country: "Israel", lat: 33.00, lng: 35.09 },
    { city: "Beer Sheva", region: "Negev", country: "Israel", lat: 31.25, lng: 34.79 },
    { city: "Tyre", region: "South Lebanon", country: "Lebanon", lat: 33.27, lng: 35.20 },
    { city: "Beirut", region: "Mount Lebanon", country: "Lebanon", lat: 33.89, lng: 35.50 },
    { city: "Isfahan", region: "Isfahan Province", country: "Iran", lat: 32.65, lng: 51.68 },
    { city: "Damascus", region: "Damascus Gov.", country: "Syria", lat: 33.51, lng: 36.29 },
    { city: "Aleppo", region: "Northern Syria", country: "Syria", lat: 36.20, lng: 37.15 },
  ];
  const threats = ["rockets", "missiles", "uav_intrusion", "hostile_aircraft_intrusion"];
  const now = Date.now();
  return cities.map((c, i) => ({
    id: `CMD-${i}`,
    ...c,
    threatType: threats[Math.floor(Math.random() * threats.length)],
    countdown: i < 2 ? 0 : i < 4 ? 15 : i < 7 ? 50 : i < 10 ? 120 : 250,
    timestamp: new Date(now - Math.floor(Math.random() * 120) * 1000).toISOString(),
    source: Math.random() > 0.7 ? "live" : "oref",
  }));
};

function MapDot({ alert, selected, onClick, mapBounds }: { alert: Alert; selected: boolean; onClick: () => void; mapBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number; width: number; height: number } }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000));
    setRemaining(calc());
    const iv = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(iv);
  }, [alert.timestamp, alert.countdown]);

  const isImmediate = alert.countdown === 0;
  const isExpired = !isImmediate && remaining <= 0;
  const isCritical = isImmediate || (remaining > 0 && remaining <= 15);

  const x = ((alert.lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * mapBounds.width;
  const y = ((mapBounds.maxLat - alert.lat) / (mapBounds.maxLat - mapBounds.minLat)) * mapBounds.height;

  const dotColor = isExpired ? "rgba(255,255,255,0.15)" : isCritical ? "#ef4444" : remaining <= 45 ? "#ea580c" : "#d97706";
  const dotSize = isExpired ? 6 : isCritical ? 12 : 8;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {isCritical && !isExpired && (
        <circle cx={x} cy={y} r={dotSize + 8} fill="none" stroke={dotColor} strokeWidth={1.5} opacity={0.3}>
          <animate attributeName="r" from={String(dotSize)} to={String(dotSize + 16)} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={x} cy={y} r={dotSize} fill={dotColor} opacity={isExpired ? 0.3 : 0.8} stroke={selected ? "#fff" : "none"} strokeWidth={selected ? 2 : 0}>
        {isCritical && !isExpired && <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />}
      </circle>
      {selected && (
        <text x={x} y={y - dotSize - 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={800} fontFamily="'JetBrains Mono', monospace">
          {alert.city}
        </text>
      )}
    </g>
  );
}

function CountdownInline({ alert }: { alert: Alert }) {
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
    <span
      style={{
        fontSize: 14,
        fontWeight: 900,
        fontFamily: "'JetBrains Mono', monospace",
        color: isExpired ? "rgba(255,255,255,0.15)" : isCritical ? "#ef4444" : remaining <= 45 ? "#ea580c" : "#d97706",
        textShadow: isCritical && !isExpired ? "0 0 8px rgba(220,38,38,0.6)" : "none",
        minWidth: 32,
        textAlign: "right" as const,
        display: "inline-block",
      }}
    >
      {isImmediate ? "NOW" : remaining > 0 ? `${remaining}s` : "EXP"}
    </span>
  );
}

export default function AlertCommand() {
  const [alerts] = useState(generateMockAlerts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [_, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const mapBounds = useMemo(() => {
    const lats = alerts.map((a) => a.lat);
    const lngs = alerts.map((a) => a.lng);
    const pad = 1.5;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad * 2,
      maxLng: Math.max(...lngs) + pad * 2,
      width: 420,
      height: 200,
    };
  }, [alerts]);

  const sorted = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const now = Date.now();
      const remA = a.countdown === 0 ? -1 : Math.max(0, a.countdown - Math.floor((now - new Date(a.timestamp).getTime()) / 1000));
      const remB = b.countdown === 0 ? -1 : Math.max(0, b.countdown - Math.floor((now - new Date(b.timestamp).getTime()) / 1000));
      if (remA === -1 && remB !== -1) return -1;
      if (remB === -1 && remA !== -1) return 1;
      const activeA = remA > 0 || remA === -1 ? 1 : 0;
      const activeB = remB > 0 || remB === -1 ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return (remA === -1 ? 0 : remA) - (remB === -1 ? 0 : remB);
    });
  }, [alerts, _]);

  const activeCount = alerts.filter((a) => {
    if (a.countdown === 0) return true;
    return Math.max(0, a.countdown - Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000)) > 0;
  }).length;

  const countrySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => { counts[a.country] = (counts[a.country] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [alerts]);

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
        .cmd-scroll::-webkit-scrollbar { width: 4px; }
        .cmd-scroll::-webkit-scrollbar-track { background: transparent; }
        .cmd-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.15); border-radius: 2px; }
        .cmd-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.15s; }
        .cmd-row:hover { background: rgba(220,38,38,0.06); }
        .cmd-row.selected { background: rgba(220,38,38,0.1); border-left: 3px solid #dc2626; }
      `}</style>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: activeCount > 0 ? "linear-gradient(135deg, rgba(127,29,29,0.15), transparent)" : "transparent" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeCount > 0 ? "#dc2626" : "rgba(255,255,255,0.15)", boxShadow: activeCount > 0 ? "0 0 8px #dc2626" : "none" }} />
        <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.12em" }}>COMMAND VIEW</span>
        {activeCount > 0 && (
          <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", background: "#dc2626", padding: "2px 8px", borderRadius: 6 }}>{activeCount}</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {countrySummary.slice(0, 4).map(([c, n]) => (
            <span key={c} style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", opacity: 0.4, letterSpacing: "0.05em" }}>
              {FLAGS[c]} {n}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
          position: "relative",
          height: 200,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(127,29,29,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 6, left: 10, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.2 }}>THREAT MAP</div>

        <svg width={mapBounds.width} height={mapBounds.height} style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}>
          <defs>
            <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-fade)" />

          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 25} x2={mapBounds.width} y2={i * 25} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 25} y1={0} x2={i * 25} y2={mapBounds.height} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
          ))}

          {alerts.map((alert) => (
            <MapDot
              key={alert.id}
              alert={alert}
              selected={selectedId === alert.id}
              onClick={() => setSelectedId(selectedId === alert.id ? null : alert.id)}
              mapBounds={mapBounds}
            />
          ))}
        </svg>
      </div>

      <div className="cmd-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {sorted.map((alert) => {
          const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
          const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
          const isExpired = remaining !== -1 && remaining <= 0;

          return (
            <div
              key={alert.id}
              className={`cmd-row ${selectedId === alert.id ? "selected" : ""}`}
              onClick={() => setSelectedId(selectedId === alert.id ? null : alert.id)}
              style={{ opacity: isExpired ? 0.3 : 1 }}
            >
              <span style={{ fontSize: 11, flexShrink: 0, width: 18, textAlign: "center" }}>{THREAT_ICON[alert.threatType]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {alert.city}
                </div>
                <div style={{ fontSize: 9, opacity: 0.3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {FLAGS[alert.country]} {alert.region}
                </div>
              </div>
              {alert.source === "live" && (
                <span style={{ fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 3, background: "#15803d", color: "#fff", letterSpacing: "0.1em", flexShrink: 0 }}>LIVE</span>
              )}
              <CountdownInline alert={alert} />
            </div>
          );
        })}
      </div>

      <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.2 }}>OREF HOME FRONT CMD</span>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", opacity: 0.2 }}>{alerts.length} TOTAL · {activeCount} ACTIVE</span>
      </div>
    </div>
  );
}
