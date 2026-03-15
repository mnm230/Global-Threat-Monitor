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
    id: `CLP-${i}`, ...c,
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

  const accentColor = isExpired ? "#333" : isCritical ? "#ef4444" : remaining <= 45 ? "#f59e0b" : "#525252";

  return (
    <div style={{
      minWidth: 48, padding: "4px 0", textAlign: "center",
      borderRight: `2px solid ${accentColor}`,
      position: "relative" as const,
    }}>
      <div style={{
        fontSize: 20, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
        color: isExpired ? "#333" : isCritical ? "#ef4444" : remaining <= 45 ? "#f59e0b" : "#e5e5e5",
        animation: isCritical && !isExpired ? "clinical-blink 1s step-end infinite" : "none",
      }}>
        {isImmediate ? "00" : remaining > 0 ? String(remaining).padStart(2, "0") : "--"}
      </div>
      <div style={{
        fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", marginTop: 1, textTransform: "uppercase",
        color: isExpired ? "#333" : accentColor,
      }}>
        {isImmediate ? "IMMD" : remaining > 0 ? "SEC" : "NULL"}
      </div>
    </div>
  );
}

export default function TriageClinicalProtocol() {
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

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#000000",
      color: "#e5e5e5",
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    }}>
      <style>{`
        @keyframes clinical-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes scan-line { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
        .cl-row { display: flex; align-items: center; gap: 0; padding: 0; border-bottom: 1px solid #1a1a1a; transition: background 0.1s; cursor: default; }
        .cl-row:hover { background: #0a0a0a; }
        .cl-row.critical { background: rgba(239,68,68,0.04); }
        .cl-row.expired { opacity: 0.2; }
        .cl-scroll::-webkit-scrollbar { width: 2px; }
        .cl-scroll::-webkit-scrollbar-track { background: #000; }
        .cl-scroll::-webkit-scrollbar-thumb { background: #333; }
      `}</style>

      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${activeCount > 0 ? "#ef4444" : "#1a1a1a"}`,
        display: "flex", alignItems: "center", gap: 0, flexShrink: 0,
        background: activeCount > 0 ? "rgba(239,68,68,0.03)" : "transparent",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 6, height: 6,
            background: activeCount > 0 ? "#ef4444" : "#333",
            animation: activeCount > 0 ? "clinical-blink 1s step-end infinite" : "none",
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#737373" }}>
            ALERT FEED
          </span>
          {activeCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#ef4444" }}>{activeCount}</span>
              <span style={{ fontSize: 8, color: "#525252", letterSpacing: "0.15em" }}>ACTIVE</span>
              {immCount > 0 && (
                <>
                  <span style={{ color: "#262626" }}>|</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#ef4444", animation: "clinical-blink 1s step-end infinite" }}>{immCount}</span>
                  <span style={{ fontSize: 8, color: "#525252", letterSpacing: "0.15em" }}>IMMD</span>
                </>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          width: 24, height: 24,
          border: `1px solid ${searchOpen ? "#ef4444" : "#262626"}`,
          background: "transparent",
          color: searchOpen ? "#ef4444" : "#525252",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
        }}>⌕</button>
      </div>

      {searchOpen && (
        <div style={{ padding: "6px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="SEARCH..." autoFocus
            style={{
              width: "100%", background: "transparent", border: "1px solid #262626",
              padding: "5px 8px", fontSize: 10, color: "#e5e5e5", outline: "none",
              letterSpacing: "0.1em",
            }}
          />
        </div>
      )}

      <div style={{
        padding: "4px 14px", borderBottom: "1px solid #1a1a1a", flexShrink: 0,
        display: "flex", gap: 0, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: "#404040",
      }}>
        <span style={{ width: 62, textAlign: "center" }}>T-SEC</span>
        <span style={{ flex: 1, paddingLeft: 10 }}>LOCATION</span>
        <span style={{ width: 40, textAlign: "center" }}>TYPE</span>
        <span style={{ width: 36, textAlign: "center" }}>SRC</span>
      </div>

      {activeCount === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", letterSpacing: "0.2em" }}>STATUS: CLEAR</span>
          <span style={{ fontSize: 8, letterSpacing: "0.25em", color: "#333" }}>NO ACTIVE THREATS</span>
        </div>
      ) : (
        <div className="cl-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {sorted.map(alert => {
            const now = Date.now();
            const elapsed = Math.floor((now - new Date(alert.timestamp).getTime()) / 1000);
            const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
            const isImmediate = alert.countdown === 0;
            const isExpired = !isImmediate && remaining <= 0;
            const isCritical = isImmediate || (remaining > 0 && remaining <= 15);

            return (
              <div key={alert.id} className={`cl-row ${isCritical ? "critical" : ""} ${isExpired ? "expired" : ""}`}>
                <div style={{ width: 62, flexShrink: 0 }}>
                  <CountdownBadge alert={alert} />
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isExpired ? "#333" : "#e5e5e5" }}>
                      {alert.city.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 9, color: "#404040" }}>{FLAGS[alert.country]}</span>
                  </div>
                  <div style={{ fontSize: 8, color: "#404040", letterSpacing: "0.08em" }}>
                    {alert.region.toUpperCase()}
                  </div>
                </div>
                <div style={{ width: 40, textAlign: "center", flexShrink: 0 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                    color: isCritical ? "#ef4444" : "#525252",
                    padding: "2px 4px",
                    border: `1px solid ${isCritical ? "rgba(239,68,68,0.3)" : "#262626"}`,
                  }}>
                    {THREAT_CODE[alert.threatType] || "UNK"}
                  </span>
                </div>
                <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}>
                  {alert.source === "live" ? (
                    <span style={{ fontSize: 7, fontWeight: 800, color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span>
                  ) : (
                    <span style={{ fontSize: 7, fontWeight: 700, color: "#333", letterSpacing: "0.1em" }}>OREF</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        padding: "6px 14px", borderTop: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "#262626" }}>HOME FRONT COMMAND // OREF</span>
        <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "#262626" }}>{alerts.length} RECORDS</span>
      </div>
    </div>
  );
}
