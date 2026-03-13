import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "CRIT" | "HIGH" | "ELEV" | "INFO";
type ChannelId = "oref" | "sigint" | "humint" | "osint" | "naval" | "airops" | "cyber" | "comms";

interface FeedEvent {
  id: string;
  channelId: ChannelId;
  severity: Severity;
  type: string;
  location: string;
  summary: string;
  detail: string;
  ts: number; // ms
  isNew?: boolean;
}

// ─── Channel Definitions ─────────────────────────────────────────────────────

interface ChannelDef {
  id: ChannelId;
  label: string;
  abbr: string;
  icon: string;
  accent: string;
  dimAccent: string;
  description: string;
  eventTypes: string[];
  locations: string[];
  detailTemplates: string[];
}

const CHANNELS: ChannelDef[] = [
  {
    id: "oref",
    label: "OREF ALERTS",
    abbr: "OREF",
    icon: "⚠",
    accent: "#f87171",
    dimAccent: "rgba(248,113,113,0.1)",
    description: "Home Front Command — Active siren & strike alerts",
    eventTypes: ["ROCKET_FIRE", "SIREN_ACT", "IMPACT_RPT", "INTERCEPT_RPT", "ALL_CLEAR", "SHELTER_ORDER"],
    locations: ["Tel Aviv / Gush Dan", "Haifa Bay", "Ashkelon Coast", "Western Negev", "Upper Galilee", "Beer Sheva", "Nahariya", "Sderot"],
    detailTemplates: [
      "Rocket fire detected from {dir}. Shelter immediately. Expected impact in {t} seconds.",
      "Iron Dome intercept reported over {loc}. Debris may fall — remain sheltered.",
      "All-clear issued for {loc} following confirmed intercept. No impact recorded.",
      "Siren activated in {loc}. Threat classification: {type}. Evacuate to protected space.",
    ],
  },
  {
    id: "sigint",
    label: "SIGINT",
    abbr: "SIG",
    icon: "📡",
    accent: "#a78bfa",
    dimAccent: "rgba(167,139,250,0.1)",
    description: "Signals Intelligence — Intercepted comms & emissions",
    eventTypes: ["COMMS_INTERCEPT", "RADAR_EMISSION", "FREQ_ANOMALY", "EW_DETECT", "DRONE_LINK", "SAT_INTERCEPT"],
    locations: ["Northern Sector", "Syrian Border", "Lebanese Airspace", "Red Sea Corridor", "Gulf Sector", "Eastern DMZ"],
    detailTemplates: [
      "Encrypted burst transmission intercepted on freq {f} MHz. Origin triangulated to {loc}.",
      "Unknown radar emission detected bearing {deg}°. Possible {type} profile. Analysis pending.",
      "UAV control link active on {f} MHz. Estimated operator position: {loc}.",
      "Satellite uplink intercept suggests coordinated operation. Multiple nodes active.",
    ],
  },
  {
    id: "humint",
    label: "HUMINT",
    abbr: "HUM",
    icon: "👁",
    accent: "#34d399",
    dimAccent: "rgba(52,211,153,0.09)",
    description: "Human Intelligence — Agent reports & field contacts",
    eventTypes: ["SOURCE_RPT", "FIELD_OBS", "ASSET_CONTACT", "AGENT_MSG", "INFORMANT_TIP", "COVERT_OBSERVATION"],
    locations: ["Beirut Station", "Damascus Network", "Tehran Circuit", "Gaza Sub-station", "Southern Liaison", "Northern Asset"],
    detailTemplates: [
      "Asset [{src}] reports unusual vehicle movement near {loc}. Convoy of {n} vehicles, direction {dir}.",
      "Informant tip: leadership meeting scheduled at undisclosed location. Verification in progress.",
      "Field observer reports troop concentration at {loc}. Estimated {n}+ personnel, armed.",
      "Agent contact made. Intelligence package received. Awaiting secure transmission.",
    ],
  },
  {
    id: "osint",
    label: "OSINT",
    abbr: "OSI",
    icon: "🌐",
    accent: "#38bdf8",
    dimAccent: "rgba(56,189,248,0.09)",
    description: "Open Source Intelligence — Social, media & public signals",
    eventTypes: ["SOCIAL_SIGNAL", "MEDIA_REPORT", "SATELLITE_IMG", "VIDEO_VERIFY", "FORUM_ACTIVITY", "PRESS_MONITOR"],
    locations: ["Regional Social", "News Wires", "Telegram Channels", "Twitter/X Monitor", "YouTube Feeds", "Dark Web Forums"],
    detailTemplates: [
      "Spike in social media posts from {loc} reporting {type}. Geotag cluster confirmed.",
      "Unverified video circulating showing {type} at {loc}. OSINT team analyzing for authenticity.",
      "Commercial satellite image shows changes at {loc} consistent with {type}. Timestamped {t}h ago.",
      "Forum activity surge on {platform}: keywords matching {type} up {n}% in past hour.",
    ],
  },
  {
    id: "naval",
    label: "NAVAL OPS",
    abbr: "NAV",
    icon: "⚓",
    accent: "#22d3ee",
    dimAccent: "rgba(34,211,238,0.09)",
    description: "Maritime — Vessel tracking & naval activity",
    eventTypes: ["VESSEL_TRACK", "AIS_ANOMALY", "SHIP_MANEUVER", "SUB_CONTACT", "MARITIME_BLOCK", "NAVAL_EXERCISE"],
    locations: ["Red Sea", "Mediterranean East", "Persian Gulf", "Gulf of Oman", "Bab-el-Mandeb", "Suez Corridor", "Haifa Port"],
    detailTemplates: [
      "AIS transponder disabled on vessel {id} last seen at {loc}. Classification: {type}.",
      "Unusual maneuver pattern detected: {n} vessels holding formation at {loc}.",
      "Suspected submarine contact at {loc}. Surface assets repositioning.",
      "Naval blockade activity reported at {loc}. Commercial shipping diverted.",
    ],
  },
  {
    id: "airops",
    label: "AIR OPS",
    abbr: "AIR",
    icon: "✈",
    accent: "#fbbf24",
    dimAccent: "rgba(251,191,36,0.09)",
    description: "Airspace — Military & hostile aviation activity",
    eventTypes: ["FLIGHT_DEVIATION", "RADAR_CONTACT", "AIRSPACE_VIOL", "UAV_INTRUSION", "INTERCEPT_VEC", "NO_FLY_BREACH"],
    locations: ["Airspace Zulu", "Northern Corridor", "Coastal Approach", "Eastern Boundary", "Southern Entry", "Offshore Sector"],
    detailTemplates: [
      "Unidentified radar contact bearing {deg}° at altitude {alt}ft. Speed {spd} kts. IFF: {iff}.",
      "Aircraft deviation from filed flight plan. Last contact {loc}. Intercept vectors computed.",
      "UAV intrusion detected at {loc}. Altitude {alt}ft. EW jamming authorized.",
      "Airspace violation: hostile aircraft crossed restricted zone at {loc}. QRA scrambled.",
    ],
  },
  {
    id: "cyber",
    label: "CYBER",
    abbr: "CYB",
    icon: "⚡",
    accent: "#fb923c",
    dimAccent: "rgba(251,146,60,0.09)",
    description: "Cyber — Intrusions, attacks & infrastructure threats",
    eventTypes: ["INTRUSION_DETECT", "DDoS_ALERT", "MALWARE_ID", "CRED_BREACH", "INFRA_PROBE", "RANSOMWARE", "SUPPLY_CHAIN"],
    locations: ["Defense Network", "Power Grid Node", "Water Authority", "Comms Infrastructure", "Financial Sector", "Govt Portal"],
    detailTemplates: [
      "Intrusion attempt detected on {loc}. Source IPs: {n} unique, geo: {geo}. Blocked at perimeter.",
      "DDoS attack targeting {loc}. Volume: {n} Gbps. Mitigation engaged. Service degraded {pct}%.",
      "Malware signature [{id}] identified in {loc} environment. Lateral movement attempted.",
      "Credential harvesting campaign active. Targeting {loc} personnel. Phishing emails detected.",
    ],
  },
  {
    id: "comms",
    label: "COMMS",
    abbr: "COM",
    icon: "📻",
    accent: "#a3e635",
    dimAccent: "rgba(163,230,53,0.09)",
    description: "Communications — Internal ops, command dispatches",
    eventTypes: ["CMD_DISPATCH", "UNIT_REPORT", "LIAISON_MSG", "INTEL_UPDATE", "SITREP", "FLASH_MSG"],
    locations: ["HQ Command", "Northern HQ", "Southern HQ", "Naval HQ", "Air Command", "Joint Ops Center"],
    detailTemplates: [
      "SITREP from {loc}: Situation developing. {n} units deployed. Awaiting confirmation.",
      "Flash message from {loc}: Immediate action required on {type}. All stations acknowledge.",
      "Liaison from {loc}: Coordination request for joint response. Contact {call}.",
      "Command dispatch: ROE update effective immediately. All units acknowledge receipt.",
    ],
  },
];

const SEV_CFG: Record<Severity, { label: string; color: string; bg: string }> = {
  CRIT: { label: "CRIT", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  HIGH: { label: "HIGH", color: "#fb923c", bg: "rgba(251,146,60,0.1)" },
  ELEV: { label: "ELEV", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
  INFO: { label: "INFO", color: "#60a5fa", bg: "rgba(96,165,250,0.07)" },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

let _uid = 1000;
function uid() { return `E${++_uid}`; }

function fill(template: string): string {
  return template
    .replace("{dir}", ["N", "NE", "SW", "NW"][Math.floor(Math.random() * 4)])
    .replace("{t}", String(10 + Math.floor(Math.random() * 50)))
    .replace("{loc}", "sector " + Math.floor(Math.random() * 9 + 1))
    .replace("{type}", ["RKT", "MSL", "UAV", "ACF"][Math.floor(Math.random() * 4)])
    .replace("{f}", String(200 + Math.floor(Math.random() * 800)))
    .replace("{deg}", String(Math.floor(Math.random() * 360)))
    .replace("{n}", String(3 + Math.floor(Math.random() * 20)))
    .replace("{src}", `ALPHA-${Math.floor(Math.random() * 9 + 1)}`)
    .replace("{id}", `VES-${Math.floor(Math.random() * 999)}`)
    .replace("{alt}", String(500 + Math.floor(Math.random() * 30000)))
    .replace("{spd}", String(100 + Math.floor(Math.random() * 500)))
    .replace("{iff}", Math.random() > 0.5 ? "SQUAWK 7700" : "NO RESPONSE")
    .replace("{pct}", String(10 + Math.floor(Math.random() * 80)))
    .replace("{geo}", ["RU", "IR", "CN", "NK"][Math.floor(Math.random() * 4)])
    .replace("{platform}", ["Telegram", "Twitter", "Reddit"][Math.floor(Math.random() * 3)])
    .replace("{call}", `BRAVO-${Math.floor(Math.random() * 9 + 1)}`);
}

function makeEvent(ch: ChannelDef, severityBias?: Severity): FeedEvent {
  const r = Math.random();
  const severity: Severity = severityBias ?? (r < 0.12 ? "CRIT" : r < 0.35 ? "HIGH" : r < 0.65 ? "ELEV" : "INFO");
  const template = ch.detailTemplates[Math.floor(Math.random() * ch.detailTemplates.length)];
  return {
    id: uid(),
    channelId: ch.id,
    severity,
    type: ch.eventTypes[Math.floor(Math.random() * ch.eventTypes.length)],
    location: ch.locations[Math.floor(Math.random() * ch.locations.length)],
    summary: fill(template).slice(0, 72) + "…",
    detail: fill(template) + " " + fill(template),
    ts: Date.now() - Math.floor(Math.random() * 8 * 60 * 1000),
    isNew: false,
  };
}

function generateInitialFeed(): FeedEvent[] {
  const events: FeedEvent[] = [];
  CHANNELS.forEach(ch => {
    const count = 6 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) events.push(makeEvent(ch));
  });
  return events.sort((a, b) => b.ts - a.ts);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SevPill({ severity }: { severity: Severity }) {
  const cfg = SEV_CFG[severity];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.1em", flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

function EventCard({
  evt, accent, dimAccent, expanded, onToggle,
}: {
  evt: FeedEvent; accent: string; dimAccent: string;
  expanded: boolean; onToggle: () => void;
}) {
  const isHigh = evt.severity === "CRIT" || evt.severity === "HIGH";

  return (
    <div
      onClick={onToggle}
      className={evt.isNew ? "lfeed-new" : ""}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: expanded ? dimAccent : evt.isNew ? `${accent}08` : "transparent",
        cursor: "pointer",
        transition: "background 0.2s",
        borderLeft: `3px solid ${isHigh ? SEV_CFG[evt.severity].color : "transparent"}`,
        position: "relative" as const,
      }}
    >
      {/* Collapsed row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 11px" }}>
        {evt.isNew && (
          <span style={{
            fontSize: 7, fontWeight: 900, color: accent,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em", flexShrink: 0,
            background: `${accent}18`, padding: "1px 5px", borderRadius: 3,
          }}>NEW</span>
        )}
        <SevPill severity={evt.severity} />
        <span style={{
          fontSize: 10, fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#e5e7eb", letterSpacing: "0.06em", flexShrink: 0,
          whiteSpace: "nowrap",
        }}>
          {evt.type}
        </span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>
          {evt.location}
        </span>
        <span style={{
          flex: 1, fontSize: 10, color: "rgba(255,255,255,0.38)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          minWidth: 0,
        }}>
          {evt.summary}
        </span>
        <span style={{
          fontSize: 9, color: "rgba(255,255,255,0.2)",
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
        }}>
          {fmtAgo(evt.ts)}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 14px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 8, marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              ID: {evt.id}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtTime(evt.ts)}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              LOC: {evt.location}
            </span>
          </div>
          <p style={{
            fontSize: 12, lineHeight: 1.65,
            color: "rgba(255,255,255,0.7)", margin: 0,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {evt.detail}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveFeedChannels() {
  const [events, setEvents] = useState<FeedEvent[]>(() => generateInitialFeed());
  const [activeChannel, setActiveChannel] = useState<ChannelId>("oref");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [searchQ, setSearchQ] = useState("");
  const [unread, setUnread] = useState<Record<ChannelId, number>>(() =>
    Object.fromEntries(CHANNELS.map(c => [c.id, 0])) as Record<ChannelId, number>
  );
  const [tick, setTick] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Clock tick
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Stream new events every 3–6s
  useEffect(() => {
    const inject = () => {
      const ch = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
      const evt: FeedEvent = { ...makeEvent(ch), ts: Date.now(), isNew: true };
      setEvents(prev => [evt, ...prev.slice(0, 299)]);
      setUnread(prev => ({
        ...prev,
        [ch.id]: ch.id === activeChannel ? prev[ch.id] : prev[ch.id] + 1,
      }));
      // Clear "new" flag after 4s
      setTimeout(() => {
        setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, isNew: false } : e));
      }, 4000);
    };

    const schedule = () => {
      const delay = 2500 + Math.random() * 3500;
      return setTimeout(() => { inject(); schedule(); }, delay);
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, [activeChannel]);

  // Clear unread when switching to channel
  const switchChannel = useCallback((id: ChannelId) => {
    setActiveChannel(id);
    setUnread(prev => ({ ...prev, [id]: 0 }));
    setExpandedId(null);
    setFilter("ALL");
    setSearchQ("");
  }, []);

  // Auto-scroll to top on new events
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const ch = CHANNELS.find(c => c.id === activeChannel)!;
  const channelEvents = events.filter(e => e.channelId === activeChannel);
  const filtered = channelEvents.filter(e => {
    if (filter !== "ALL" && e.severity !== filter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return e.type.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q);
    }
    return true;
  });

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const nowStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#070b14", color: "#fff",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes lfeed-slide-in {
          from { opacity: 0; transform: translateY(-8px); background: rgba(255,255,255,0.06); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lfeed-new { animation: lfeed-slide-in 0.35s ease-out; }
        .lfeed-scroll::-webkit-scrollbar { width: 4px; }
        .lfeed-scroll::-webkit-scrollbar-track { background: transparent; }
        .lfeed-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
        .lfeed-ch:hover { background: rgba(255,255,255,0.04) !important; }
        .lfeed-filter:hover { opacity: 1 !important; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)" }}>
            LIVE FEEDS
          </span>
          {totalUnread > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 900, background: "#ef4444",
              padding: "1px 7px", borderRadius: 10, color: "#fff",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {totalUnread}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
          {nowStr}
        </span>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div style={{
          width: 160, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          background: "rgba(0,0,0,0.2)",
          overflowY: "auto",
        }}>
          <div style={{ padding: "8px 10px 4px", fontSize: 8, fontWeight: 800, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
            CHANNELS
          </div>
          {CHANNELS.map(c => {
            const isActive = c.id === activeChannel;
            const unreadCount = unread[c.id];
            return (
              <div
                key={c.id}
                className="lfeed-ch"
                onClick={() => switchChannel(c.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 10px",
                  cursor: "pointer",
                  background: isActive ? `${c.accent}14` : "transparent",
                  borderLeft: isActive ? `3px solid ${c.accent}` : "3px solid transparent",
                  transition: "background 0.15s",
                  position: "relative" as const,
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, opacity: isActive ? 1 : 0.5 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: isActive ? 800 : 600,
                    color: isActive ? c.accent : "rgba(255,255,255,0.45)",
                    letterSpacing: "0.04em", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.18)", marginTop: 1 }}>
                    {events.filter(e => e.channelId === c.id).length} events
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 900,
                    background: "#ef4444", color: "#fff",
                    padding: "1px 5px", borderRadius: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── MAIN FEED ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>

          {/* Channel header */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: `linear-gradient(90deg, ${ch.dimAccent}, transparent)`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{ch.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: ch.accent, letterSpacing: "0.1em" }}>{ch.label}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>—</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flex: 1 }}>{ch.description}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px rgba(34,197,94,0.5)" }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* Severity filters */}
              {(["ALL", "CRIT", "HIGH", "ELEV", "INFO"] as const).map(s => {
                const isOn = filter === s;
                const color = s === "ALL" ? "rgba(255,255,255,0.5)" : SEV_CFG[s].color;
                return (
                  <button
                    key={s}
                    className="lfeed-filter"
                    onClick={() => setFilter(s)}
                    style={{
                      fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4,
                      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em",
                      cursor: "pointer",
                      background: isOn ? (s === "ALL" ? "rgba(255,255,255,0.1)" : SEV_CFG[s].bg) : "transparent",
                      border: `1px solid ${isOn ? color : "rgba(255,255,255,0.08)"}`,
                      color: isOn ? color : "rgba(255,255,255,0.3)",
                      opacity: isOn ? 1 : 0.7,
                      transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
              <div style={{ flex: 1 }} />
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search…"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "4px 9px", fontSize: 11, color: "rgba(255,255,255,0.7)",
                  outline: "none", width: 140, fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => setAutoScroll(a => !a)}
                style={{
                  fontSize: 9, fontWeight: 700, padding: "4px 8px", borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em",
                  cursor: "pointer",
                  background: autoScroll ? "rgba(34,197,94,0.1)" : "transparent",
                  border: `1px solid ${autoScroll ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: autoScroll ? "#4ade80" : "rgba(255,255,255,0.3)",
                }}
              >
                {autoScroll ? "AUTO ▼" : "PAUSED"}
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(0,0,0,0.15)", flexShrink: 0,
          }}>
            {(["CRIT", "HIGH", "ELEV", "INFO"] as Severity[]).map(s => {
              const count = channelEvents.filter(e => e.severity === s).length;
              if (count === 0) return null;
              return (
                <div key={s} style={{
                  padding: "5px 12px", borderRight: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: SEV_CFG[s].color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{s}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: SEV_CFG[s].color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                </div>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "5px 12px", fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center" }}>
              {filtered.length} / {channelEvents.length} shown
            </div>
          </div>

          {/* Feed */}
          <div
            ref={feedRef}
            className="lfeed-scroll"
            onScroll={e => {
              const el = e.currentTarget;
              setAutoScroll(el.scrollTop < 40);
            }}
            style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
          >
            {filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, opacity: 0.3 }}>
                <span style={{ fontSize: 24 }}>{ch.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>NO EVENTS</span>
              </div>
            ) : (
              filtered.map(evt => (
                <EventCard
                  key={evt.id}
                  evt={evt}
                  accent={ch.accent}
                  dimAccent={ch.dimAccent}
                  expanded={expandedId === evt.id}
                  onToggle={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "5px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.15)" }}>
          {CHANNELS.length} CHANNELS · {events.length} TOTAL EVENTS
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          {CHANNELS.filter(c => unread[c.id] > 0).map(c => (
            <span key={c.id} style={{ fontSize: 8, color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {c.abbr} +{unread[c.id]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
