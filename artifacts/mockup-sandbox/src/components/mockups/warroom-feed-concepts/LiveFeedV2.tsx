import { useState, useEffect, useRef, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "BREAKING" | "URGENT" | "DEVELOPING" | "UPDATE" | "ANALYSIS";
type ChannelId =
  | "all"
  | "reuters"
  | "ap"
  | "afp"
  | "idf"
  | "oref"
  | "bellingcat"
  | "isw"
  | "ynet"
  | "toi"
  | "alarabiya"
  | "telegram"
  | "xmonitor"
  | "marinetraffic"
  | "acled"
  | "i24"
  | "bbc"
  | "cnn"
  | "skynews"
  | "france24"
  | "ch12"
  | "ch13"
  | "lbc"
  | "dw";

interface FeedItem {
  id: string;
  channelId: Exclude<ChannelId, "all">;
  severity: Severity;
  headline: string;
  body: string;
  location: string;
  ts: number;
  isNew?: boolean;
  pinned?: boolean;
  mediaType?: "text" | "video" | "photo" | "map";
}

// ─── Channel Registry ─────────────────────────────────────────────────────────

interface Channel {
  id: ChannelId;
  name: string;
  handle: string;
  icon: string;
  accent: string;
  bg: string;
  tag: string; // category badge
  description: string;
  headlines: string[];
  bodies: string[];
  locations: string[];
}

const CHANNELS: Channel[] = [
  {
    id: "reuters",
    name: "Reuters",
    handle: "@Reuters",
    icon: "R",
    accent: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    tag: "WIRE",
    description: "Global wire service — verified breaking news",
    headlines: [
      "Israeli military strikes reported in {loc}, sources say",
      "Ceasefire talks stall as {loc} shelling continues — officials",
      "UN calls for immediate humanitarian corridor in {loc}",
      "Death toll rises to {n} in {loc} following overnight bombardment",
      "U.S. envoy arrives in region as {loc} crisis deepens",
      "Iron Dome intercepts {n} projectiles over {loc}",
    ],
    bodies: [
      "Three Israeli officials and two diplomatic sources confirmed the development, speaking on condition of anonymity as the situation continues to evolve.",
      "Fighting resumed shortly after midnight local time. Casualty figures could not be independently verified.",
      "The United Nations humanitarian coordinator said aid convoys remained blocked for a fourth consecutive day.",
    ],
    locations: ["Gaza", "northern Israel", "the West Bank", "southern Lebanon", "Tel Aviv", "Rafah", "Jenin"],
  },
  {
    id: "ap",
    name: "Associated Press",
    handle: "@AP",
    icon: "AP",
    accent: "#fb923c",
    bg: "rgba(251,146,60,0.08)",
    tag: "WIRE",
    description: "AP Newswire — breaking & verified reporting",
    headlines: [
      "BREAKING: Rockets fired toward {loc}, sirens activated",
      "AP source: Ground operation expanding into {loc}",
      "Displaced civilians mass at {loc} border crossing",
      "Hospital in {loc} reports {n} casualties overnight",
      "Military spokesman: {n} targets struck in {loc} in 12 hours",
    ],
    bodies: [
      "The Associated Press could not immediately verify the claims. A spokesperson for the military declined to comment.",
      "Video verified by AP shows smoke rising from at least three locations in the area.",
      "Local medical sources said the facility was operating at over 200% capacity.",
    ],
    locations: ["Haifa", "Ashkelon", "the Golan", "Beirut suburbs", "southern Gaza", "Nablus", "Ramallah"],
  },
  {
    id: "afp",
    name: "AFP",
    handle: "@AFP",
    icon: "AFP",
    accent: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    tag: "WIRE",
    description: "Agence France-Presse — international wire",
    headlines: [
      "AFP: Explosion reported near {loc} port — witnesses",
      "Warplanes circle over {loc} for second consecutive night",
      "France urges restraint after {loc} clashes kill {n}",
      "Hostage families demand update as {loc} negotiations continue",
      "Aid ship denied entry to {loc} for third time — AFP",
    ],
    bodies: [
      "AFP journalists on the ground reported hearing multiple explosions in quick succession.",
      "French Foreign Ministry issued a statement calling for de-escalation and protection of civilian infrastructure.",
    ],
    locations: ["Tyre", "the Jordan Valley", "Damascus", "Latakia", "Aqaba", "Sinai"],
  },
  {
    id: "idf",
    name: "IDF Spokesperson",
    handle: "@IDF",
    icon: "✡",
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    tag: "OFFICIAL",
    description: "Israel Defense Forces — official operational statements",
    headlines: [
      "IDF: IAF struck {n} terror infrastructure sites in {loc}",
      "IDF confirms rocket fire from {loc} — Iron Dome deployed",
      "Troops operating in {loc} — civilians advised to evacuate",
      "IDF Spokesperson: {n} rockets intercepted, {n} fell short",
      "Naval forces intercept weapons smuggling vessel near {loc}",
      "IDF: UAV launched from {loc} shot down over northern Israel",
    ],
    bodies: [
      "The IDF Spokesperson's Unit stated that the strike targeted military infrastructure used by hostile forces.",
      "Residents in a 5km radius have been instructed to enter protected spaces immediately.",
      "The operation is ongoing. Further details will be released as cleared.",
    ],
    locations: ["Khan Younis", "Rafah Crossing", "Hezbollah positions", "northern Gaza", "the West Bank", "Syrian border"],
  },
  {
    id: "oref",
    name: "OREF Home Front",
    handle: "@OREF_IL",
    icon: "⚠",
    accent: "#f43f5e",
    bg: "rgba(244,63,94,0.1)",
    tag: "OFFICIAL",
    description: "OREF — Red Alert & shelter orders (Tzeva Adom)",
    headlines: [
      "🔴 RED ALERT: {loc} — enter protected space immediately",
      "🔴 RED ALERT: Rocket fire toward {loc}",
      "🟡 ALL CLEAR: {loc} — threat has passed",
      "SHELTER ORDER: {loc} — remain in protected space",
      "IRON DOME INTERCEPT: Projectile neutralized over {loc}",
      "IMPACT REPORT: Rocket struck open area near {loc}, no casualties",
    ],
    bodies: [
      "Residents are instructed to remain in protected spaces for 10 minutes following the all-clear.",
      "Emergency services dispatched to the area. Avoid the scene.",
      "No casualties reported at this time. Assessment teams deployed.",
    ],
    locations: ["Tel Aviv", "Ashdod", "Ashkelon", "Sderot", "Kiryat Shmona", "Nahariya", "Beer Sheva", "Haifa"],
  },
  {
    id: "bellingcat",
    name: "Bellingcat",
    handle: "@bellingcat",
    icon: "🔍",
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    tag: "OSINT",
    description: "Open-source investigation & geolocation",
    headlines: [
      "GEOLOCATED: Strike in {loc} confirmed — coordinates verified",
      "Analysis: Satellite imagery shows new fortifications near {loc}",
      "Video verified: {loc} footage matches known grid reference",
      "Bellingcat identifies vehicle convoy movement near {loc} border",
      "OSINT: Weapons cache visible in {loc} — commercial imagery",
      "Tracking: Ship {n} transponder went dark at {loc} — timeline",
    ],
    bodies: [
      "Using Planet Labs imagery dated within 48 hours, our team has geolocated the structure to within 50m accuracy.",
      "Cross-referencing shadow angles and architecture, the video was confirmed to have been filmed in {loc}.",
      "Four independent investigators verified the findings before publication.",
    ],
    locations: ["southern Lebanon", "the Syrian coast", "northern Gaza", "the Golan Heights", "eastern Syria", "Hormuz Strait"],
  },
  {
    id: "isw",
    name: "ISW",
    handle: "@TheStudyofWar",
    icon: "📊",
    accent: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    tag: "ANALYSIS",
    description: "Institute for the Study of War — operational assessment",
    headlines: [
      "ISW Assessment: {loc} axis remains contested — updated map",
      "Critical Threat: Hezbollah redeploying forces to {loc} sector",
      "ISW: Iranian proxy coordination increasing in {loc}",
      "Operational summary: {loc} front — {date}",
      "ISW flags escalation risk in {loc} following {n} incidents",
      "Assessment update: Naval posture shift observed in {loc}",
    ],
    bodies: [
      "ISW assesses with moderate confidence that forces are repositioning for a renewed offensive axis.",
      "The pattern of activity is consistent with pre-positioning logistics rather than immediate action.",
      "Key takeaway: command and control infrastructure remains degraded but not eliminated.",
    ],
    locations: ["the northern front", "the southern axis", "the eastern corridor", "Lebanese border zone", "Gaza envelope", "Syrian theater"],
  },
  {
    id: "ynet",
    name: "Ynet News",
    handle: "@ynetnews",
    icon: "Y",
    accent: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    tag: "REGIONAL",
    description: "Ynet — Israeli media, Hebrew-language breaking",
    headlines: [
      "פיצוץ בעיר: {loc} — sirens wailing across region",
      "Security cabinet convenes — {loc} situation discussed",
      "Northern communities: {n} rockets since midnight, {n} intercepted",
      "Ynet: Residents of {loc} ordered to home front shelters",
      "Hospital on high alert following {loc} incidents",
      "Channel 12 confirms: {n} arrests in {loc} security operation",
    ],
    bodies: [
      "Ynet correspondent on scene reports heavy smoke visible from residential areas.",
      "The security cabinet held an emergency session lasting over three hours, sources told Ynet.",
    ],
    locations: ["Tel Aviv", "Haifa", "the north", "southern communities", "the border area", "Kiryat Shmona"],
  },
  {
    id: "toi",
    name: "Times of Israel",
    handle: "@TimesofIsrael",
    icon: "📰",
    accent: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    tag: "REGIONAL",
    description: "Times of Israel — English-language Israeli coverage",
    headlines: [
      "Live blog: Situation in {loc} — latest updates",
      "TOI: PM holds security consultation following {loc} escalation",
      "Families in {loc} evacuated for {n}th day as shelling continues",
      "IDF: 'Significant' operation underway in {loc}",
      "Report: Tunnel shaft discovered near {loc} — engineers on scene",
      "TOI poll: {n}% back military operation in {loc}",
    ],
    bodies: [
      "The Times of Israel is tracking the situation in real time. This post will be updated as new information becomes available.",
      "Defense officials declined to comment on operational details but did not deny the report.",
    ],
    locations: ["Judea and Samaria", "the Gaza border", "the Lebanese border", "central Israel", "Jerusalem", "the north"],
  },
  {
    id: "alarabiya",
    name: "Al Arabiya",
    handle: "@AlArabiya_Eng",
    icon: "ع",
    accent: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    tag: "REGIONAL",
    description: "Al Arabiya — pan-Arab satellite news, Saudi-owned",
    headlines: [
      "Al Arabiya: {n} killed in {loc} in overnight strikes",
      "Arab League emergency session called following {loc} events",
      "Saudi FM urges restraint — calls for {loc} ceasefire",
      "Al Arabiya exclusive: {loc} delegation arrives in Cairo",
      "Qatar mediators hold talks in {loc} — sources",
      "Humanitarian situation in {loc} 'catastrophic' — ICRC",
    ],
    bodies: [
      "Al Arabiya correspondents reported widespread destruction in residential districts.",
      "Regional foreign ministers are expected to convene within 48 hours to coordinate a response.",
    ],
    locations: ["Gaza City", "Beirut", "Ramallah", "Amman", "Cairo", "Riyadh", "Tehran"],
  },
  {
    id: "telegram",
    name: "Telegram Monitor",
    handle: "TG Channels",
    icon: "✈",
    accent: "#818cf8",
    bg: "rgba(129,140,248,0.08)",
    tag: "SOCIAL",
    description: "Monitored Telegram channels — raw, unverified signals",
    headlines: [
      "[TG @{ch}] Video circulating — {loc} strike footage, unverified",
      "[TG @{ch}] Claims: {n} rockets fired from {loc} — source unknown",
      "[TG @{ch}] Audio message: {loc} residents report explosions",
      "[TG @{ch}] Photo dump: Military vehicles moving near {loc}",
      "[TG @{ch}] Channel admin posts: '{loc} under fire — live'",
      "[TG @{ch}] Crowds gathering at {loc} — unclear cause",
    ],
    bodies: [
      "⚠ UNVERIFIED — this content has not been independently confirmed. Treat as signal, not fact.",
      "Posted by channel with {n}K subscribers. Content has not been geolocated or verified.",
    ],
    locations: ["northern border", "Gaza envelope", "Lebanese coast", "Golan area", "southern corridor", "West Bank"],
  },
  {
    id: "xmonitor",
    name: "X / Twitter Monitor",
    handle: "X Signals",
    icon: "✕",
    accent: "#e2e8f0",
    bg: "rgba(226,232,240,0.05)",
    tag: "SOCIAL",
    description: "Real-time X / Twitter signal monitoring — unverified",
    headlines: [
      "[X trending] #{loc} — {n}K posts in last 10 min",
      "[X viral] Video claiming to show {loc} incident — {n}K views",
      "[X @{handle}] 'Heard booms from {loc}' — geo-tagged post",
      "[X spike] Search volume for '{loc}+rocket' up {n}% in 5 min",
      "[X thread] Journalist in {loc} reporting live — thread",
      "[X accounts] {n} verified reporters posting from {loc}",
    ],
    bodies: [
      "⚠ SOCIAL SIGNAL — volume and sentiment spike detected. Content quality varies. Cross-reference with verified sources.",
      "Monitoring indicates increased posting activity. Possible ground-truth event. Awaiting confirmation.",
    ],
    locations: ["Tel Aviv", "Haifa", "Beirut", "Gaza", "the north", "southern Israel", "Jerusalem"],
  },
  {
    id: "marinetraffic",
    name: "MarineTraffic",
    handle: "AIS Monitor",
    icon: "⚓",
    accent: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    tag: "MARITIME",
    description: "AIS vessel tracking — Mediterranean & Red Sea",
    headlines: [
      "AIS DARK: Vessel {id} transponder off near {loc}",
      "DIVERSION: {n} commercial ships rerouting around {loc}",
      "ANOMALY: Warship formation detected {loc} — {n} vessels",
      "SPEED CHANGE: Tanker {id} slowing at {loc} — unknown reason",
      "PORT HOLD: {n} ships queued at {loc} — access restricted",
      "NEW CONTACT: Unregistered vessel approaching {loc}",
    ],
    bodies: [
      "Last AIS ping was recorded {n} hours ago. Vessel class: bulk carrier. Flag: {flag}.",
      "The detour adds approximately 4 days to the typical transit. Insurance premiums in the area have spiked.",
    ],
    locations: ["Bab-el-Mandeb", "the Red Sea", "eastern Mediterranean", "Suez approaches", "Haifa port", "Ashdod port", "Gulf of Aden"],
  },
  {
    id: "acled",
    name: "ACLED",
    handle: "@ACLEDinfo",
    icon: "📌",
    accent: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    tag: "DATA",
    description: "Armed Conflict Location & Event Data Project",
    headlines: [
      "ACLED logged {n} conflict events in {loc} — past 24h",
      "New data: Fatality count in {loc} updated to {n} — ACLED",
      "ACLED alert: {loc} crosses {n}-event weekly threshold",
      "Dataset update: Airstrike cluster detected near {loc}",
      "ACLED: Protest events in {loc} up {n}% — week-on-week",
      "Conflict index for {loc} reaches highest level since {year}",
    ],
    bodies: [
      "Data sourced from {n} independent monitoring partners. Confidence level: high. Methodology: triangulated reporting.",
      "These figures represent confirmed events only. Suspected incidents are tracked separately.",
    ],
    locations: ["the West Bank", "southern Gaza", "northern Lebanon", "Syria", "the Sinai", "Yemen", "Iraq"],
  },
];

const SEV_CFG: Record<Severity, { color: string; bg: string; dot: string }> = {
  BREAKING:   { color: "#f87171", bg: "rgba(248,113,113,0.15)", dot: "#f87171" },
  URGENT:     { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  dot: "#fb923c" },
  DEVELOPING: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   dot: "#fbbf24" },
  UPDATE:     { color: "#60a5fa", bg: "rgba(96,165,250,0.09)",  dot: "#60a5fa" },
  ANALYSIS:   { color: "#a3e635", bg: "rgba(163,230,53,0.08)",  dot: "#a3e635" },
};

const TAG_COLORS: Record<string, string> = {
  WIRE:     "#f87171",
  OFFICIAL: "#38bdf8",
  OSINT:    "#a78bfa",
  ANALYSIS: "#34d399",
  REGIONAL: "#fbbf24",
  SOCIAL:   "#818cf8",
  MARITIME: "#06b6d4",
  DATA:     "#4ade80",
};

// ─── Mock Generation ──────────────────────────────────────────────────────────

let _uid = 500;
const uid = () => `F${++_uid}`;

const TP = ["Gaza", "Haifa", "Beirut", "Sderot", "Rafah", "Jenin", "Damascus", "Tehran", "the north", "the border"];
const CH = ["BreakingIL", "GazaLive", "MidEastNow", "WarAlert", "LiveIDF"];
const FLAGS = ["Panama", "Liberia", "Marshall Islands", "Malta", "Cyprus"];

function fill(s: string): string {
  return s
    .replace(/{loc}/g,    () => TP[Math.floor(Math.random() * TP.length)])
    .replace(/{n}/g,      () => String(2 + Math.floor(Math.random() * 120)))
    .replace(/{ch}/g,     () => CH[Math.floor(Math.random() * CH.length)])
    .replace(/{handle}/g, () => "@war_reporter_" + Math.floor(Math.random() * 99))
    .replace(/{id}/g,     () => "MV-" + Math.floor(Math.random() * 9999).toString().padStart(4, "0"))
    .replace(/{flag}/g,   () => FLAGS[Math.floor(Math.random() * FLAGS.length)])
    .replace(/{year}/g,   () => String(2019 + Math.floor(Math.random() * 4)))
    .replace(/{date}/g,   () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));
}

function pickSeverity(ch: Channel): Severity {
  if (ch.id === "oref" || ch.id === "idf") {
    const r = Math.random();
    return r < 0.3 ? "BREAKING" : r < 0.55 ? "URGENT" : r < 0.8 ? "DEVELOPING" : "UPDATE";
  }
  if (ch.tag === "SOCIAL") {
    return Math.random() < 0.15 ? "BREAKING" : Math.random() < 0.4 ? "UPDATE" : "DEVELOPING";
  }
  if (ch.tag === "ANALYSIS" || ch.tag === "DATA") return Math.random() < 0.1 ? "URGENT" : "ANALYSIS";
  const r = Math.random();
  return r < 0.12 ? "BREAKING" : r < 0.3 ? "URGENT" : r < 0.6 ? "DEVELOPING" : "UPDATE";
}

function makeItem(ch: Channel, tsOffset = 0): FeedItem {
  const sev = pickSeverity(ch);
  const headline = ch.headlines[Math.floor(Math.random() * ch.headlines.length)];
  const body     = ch.bodies[Math.floor(Math.random() * ch.bodies.length)];
  const loc      = ch.locations[Math.floor(Math.random() * ch.locations.length)];
  return {
    id: uid(),
    channelId: ch.id as Exclude<ChannelId, "all">,
    severity: sev,
    headline: fill(headline),
    body:     fill(body),
    location: loc,
    ts:       Date.now() - tsOffset,
    isNew:    false,
    mediaType: Math.random() > 0.75 ? (Math.random() > 0.5 ? "photo" : "video") : "text",
  };
}

function generateInitial(): FeedItem[] {
  const items: FeedItem[] = [];
  const sources = CHANNELS.filter(c => c.id !== "all");
  sources.forEach(ch => {
    const n = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      items.push(makeItem(ch, Math.floor(Math.random() * 25 * 60 * 1000)));
    }
  });
  return items.sort((a, b) => b.ts - a.ts);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10)   return "just now";
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MEDIA_ICON: Record<string, string> = { video: "▶", photo: "◼", text: "", map: "◉" };
const MEDIA_COLOR: Record<string, string> = { video: "#fb923c", photo: "#a78bfa", text: "", map: "#38bdf8" };

function FeedCard({
  item, ch, expanded, onToggle,
}: {
  item: FeedItem;
  ch: Channel;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sev = SEV_CFG[item.severity];
  const isBreaking = item.severity === "BREAKING";
  const isUrgent   = item.severity === "URGENT";

  return (
    <div
      onClick={onToggle}
      className={item.isNew ? "lfv2-new" : ""}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: expanded ? "12px 16px" : "9px 16px",
        cursor: "pointer",
        background: expanded
          ? ch.bg
          : isBreaking
          ? "rgba(248,113,113,0.04)"
          : "transparent",
        borderLeft: `3px solid ${isBreaking || isUrgent ? sev.color : "transparent"}`,
        transition: "background 0.15s",
        position: "relative" as const,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        {/* Source badge */}
        <span style={{
          fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4,
          background: ch.bg, color: ch.accent,
          border: `1px solid ${ch.accent}30`,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em",
          flexShrink: 0,
        }}>
          {ch.handle}
        </span>
        {/* Tag */}
        <span style={{
          fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 3,
          color: TAG_COLORS[ch.tag] || "#aaa",
          border: `1px solid ${TAG_COLORS[ch.tag] || "#aaa"}30`,
          letterSpacing: "0.12em", flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {ch.tag}
        </span>
        {/* Severity */}
        <span style={{
          fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
          background: sev.bg, color: sev.color,
          border: `1px solid ${sev.color}30`,
          letterSpacing: "0.1em", flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {item.severity}
        </span>
        {/* Media type icon */}
        {item.mediaType && item.mediaType !== "text" && (
          <span style={{ fontSize: 9, color: MEDIA_COLOR[item.mediaType], flexShrink: 0 }}>
            {MEDIA_ICON[item.mediaType]}
          </span>
        )}
        {item.isNew && (
          <span style={{
            fontSize: 7, fontWeight: 900, color: "#22c55e",
            background: "rgba(34,197,94,0.12)", padding: "1px 5px", borderRadius: 3,
            border: "1px solid rgba(34,197,94,0.2)", letterSpacing: "0.1em",
            fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
          }}>NEW</span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {fmtAgo(item.ts)}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", flexShrink: 0, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontSize: isBreaking ? 13 : 12,
        fontWeight: isBreaking ? 700 : 600,
        color: isBreaking ? "#fff" : "rgba(255,255,255,0.82)",
        lineHeight: 1.4,
        marginBottom: expanded ? 10 : 0,
      }}>
        {item.headline}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 10,
        }}>
          <p style={{
            fontSize: 12, lineHeight: 1.7,
            color: "rgba(255,255,255,0.58)",
            margin: "0 0 10px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {item.body}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
              📍 {item.location}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtTime(item.ts)}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
              ID: {item.id}
            </span>
            {item.mediaType && item.mediaType !== "text" && (
              <span style={{ fontSize: 9, color: MEDIA_COLOR[item.mediaType], fontFamily: "'JetBrains Mono', monospace" }}>
                {MEDIA_ICON[item.mediaType]} {item.mediaType.toUpperCase()} ATTACHED
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const CH_MAP = Object.fromEntries(CHANNELS.map(c => [c.id, c])) as Record<ChannelId, Channel>;
const SOURCES = CHANNELS.filter(c => c.id !== "all") as Channel[];

export default function LiveFeedV2() {
  const [items, setItems] = useState<FeedItem[]>(() => generateInitial());
  const [activeId, setActiveId] = useState<ChannelId>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<Severity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>(() =>
    Object.fromEntries(SOURCES.map(c => [c.id, 0]))
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const [tick, setTick] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Stream new items
  useEffect(() => {
    const schedule = () => {
      const delay = 1800 + Math.random() * 4000;
      return setTimeout(() => {
        const ch = SOURCES[Math.floor(Math.random() * SOURCES.length)];
        const item: FeedItem = { ...makeItem(ch), isNew: true };
        setItems(prev => [item, ...prev.slice(0, 399)]);
        setUnread(prev => ({
          ...prev,
          [ch.id]: ch.id === activeId ? 0 : prev[ch.id] + 1,
        }));
        setTimeout(() => {
          setItems(prev => prev.map(e => e.id === item.id ? { ...e, isNew: false } : e));
        }, 5000);
        schedule();
      }, delay);
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, [activeId]);

  // Clear unread on channel switch
  const switchChannel = (id: ChannelId) => {
    setActiveId(id);
    setUnread(prev => ({ ...prev, [id]: 0 }));
    setExpandedId(null);
    setSevFilter("ALL");
    setSearch("");
  };

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && feedRef.current) feedRef.current.scrollTop = 0;
  }, [items, autoScroll]);

  const activeCh = activeId === "all" ? null : CH_MAP[activeId];

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (activeId !== "all" && item.channelId !== activeId) return false;
      if (sevFilter !== "ALL" && item.severity !== sevFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.headline.toLowerCase().includes(q) && !item.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, activeId, sevFilter, search, tick]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const nowStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Ticker items (latest 20 overall)
  const tickerItems = useMemo(() => items.slice(0, 20), [items]);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#060a14", color: "#fff",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes lfv2-in {
          from { opacity: 0; background: rgba(255,255,255,0.05); transform: translateY(-6px); }
          to   { opacity: 1; background: transparent; transform: translateY(0); }
        }
        .lfv2-new { animation: lfv2-in 0.3s ease-out; }
        @keyframes lfv2-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .lfv2-blink { animation: lfv2-blink 0.9s step-start infinite; }
        @keyframes lfv2-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .lfv2-ticker-track { animation: lfv2-ticker 80s linear infinite; display:flex; gap:0; white-space:nowrap; }
        .lfv2-ticker-track:hover { animation-play-state: paused; }
        .lfv2-scroll::-webkit-scrollbar { width: 3px; }
        .lfv2-scroll::-webkit-scrollbar-track { background: transparent; }
        .lfv2-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
        .lfv2-ch { transition: background 0.12s; }
        .lfv2-ch:hover { background: rgba(255,255,255,0.03) !important; }
        .lfv2-card:hover { background: rgba(255,255,255,0.015) !important; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "9px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.35)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
          <div className="lfv2-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)" }}>LIVE FEEDS</span>
          {totalUnread > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 900, background: "#ef4444", color: "#fff",
              padding: "1px 7px", borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{totalUnread > 99 ? "99+" : totalUnread}</span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          {nowStr}
        </span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
          {items.length} ITEMS · {SOURCES.length} SOURCES
        </span>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <div style={{
          width: 172, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          background: "rgba(0,0,0,0.25)",
          overflowY: "auto",
        }}>
          {/* ALL channel */}
          {(() => {
            const isActive = activeId === "all";
            return (
              <div
                className="lfv2-ch"
                onClick={() => switchChannel("all")}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeft: isActive ? "3px solid rgba(255,255,255,0.4)" : "3px solid transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span style={{ fontSize: 12, opacity: isActive ? 1 : 0.45, width: 22, textAlign: "center" }}>⬡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, color: isActive ? "#fff" : "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>ALL FEEDS</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.18)", marginTop: 1 }}>{items.length} items</div>
                </div>
              </div>
            );
          })()}

          {/* Group labels */}
          {["WIRE", "OFFICIAL", "OSINT", "ANALYSIS", "REGIONAL", "SOCIAL", "MARITIME", "DATA"].map(tag => {
            const chs = SOURCES.filter(c => c.tag === tag);
            if (chs.length === 0) return null;
            return (
              <div key={tag}>
                <div style={{ padding: "8px 12px 3px", fontSize: 7, fontWeight: 900, letterSpacing: "0.22em", color: TAG_COLORS[tag] ?? "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace", opacity: 0.7 }}>
                  {tag}
                </div>
                {chs.map(c => {
                  const isActive = activeId === c.id;
                  const u = unread[c.id] ?? 0;
                  return (
                    <div
                      key={c.id}
                      className="lfv2-ch"
                      onClick={() => switchChannel(c.id as ChannelId)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                        cursor: "pointer",
                        background: isActive ? `${c.accent}10` : "transparent",
                        borderLeft: isActive ? `3px solid ${c.accent}` : "3px solid transparent",
                      }}
                    >
                      <span style={{
                        fontSize: typeof c.icon === "string" && c.icon.length > 1 ? 9 : 12,
                        fontWeight: 900, width: 22, textAlign: "center",
                        color: isActive ? c.accent : "rgba(255,255,255,0.3)",
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}>{c.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 10, fontWeight: isActive ? 700 : 500,
                          color: isActive ? c.accent : "rgba(255,255,255,0.42)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{c.name}</div>
                        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.16)", marginTop: 1 }}>
                          {items.filter(i => i.channelId === c.id).length} items
                        </div>
                      </div>
                      {u > 0 && (
                        <span style={{
                          fontSize: 9, fontWeight: 900, background: "#ef4444", color: "#fff",
                          padding: "0px 5px", borderRadius: 8, flexShrink: 0,
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 16, textAlign: "center",
                        }}>{u > 99 ? "99+" : u}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── MAIN PANEL ───────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>

          {/* Channel header bar */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: activeCh ? `linear-gradient(90deg, ${activeCh.bg}, transparent)` : "rgba(255,255,255,0.02)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {activeCh ? (
                <>
                  <span style={{ fontSize: 14 }}>{activeCh.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: activeCh.accent, letterSpacing: "0.06em" }}>
                    {activeCh.name}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{activeCh.handle}</span>
                  <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: `${TAG_COLORS[activeCh.tag]}18`, color: TAG_COLORS[activeCh.tag], letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", fontSize: 7 as any }}>
                    {activeCh.tag}
                  </span>
                  <span style={{ flex: 1, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{activeCh.description}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>ALL FEEDS</span>
                  <span style={{ flex: 1 }} />
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <div className="lfv2-blink" style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em" }}>LIVE</span>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" as const }}>
              {(["ALL", "BREAKING", "URGENT", "DEVELOPING", "UPDATE", "ANALYSIS"] as const).map(s => {
                const isOn = sevFilter === s;
                const color = s === "ALL" ? "rgba(255,255,255,0.45)" : SEV_CFG[s].color;
                return (
                  <button key={s} onClick={() => setSevFilter(s)} style={{
                    fontSize: 8, fontWeight: 800, padding: "3px 7px", borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em",
                    cursor: "pointer",
                    background: isOn ? (s === "ALL" ? "rgba(255,255,255,0.08)" : SEV_CFG[s].bg) : "transparent",
                    border: `1px solid ${isOn ? color : "rgba(255,255,255,0.07)"}`,
                    color: isOn ? color : "rgba(255,255,255,0.28)",
                    transition: "all 0.15s",
                  }}>{s}</button>
                );
              })}
              <div style={{ flex: 1 }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 5, padding: "4px 10px", fontSize: 11,
                  color: "rgba(255,255,255,0.7)", outline: "none", width: 130, fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => setAutoScroll(a => !a)}
                style={{
                  fontSize: 8, fontWeight: 800, padding: "4px 8px", borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em",
                  cursor: "pointer",
                  background: autoScroll ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${autoScroll ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
                  color: autoScroll ? "#4ade80" : "rgba(255,255,255,0.3)",
                }}
              >{autoScroll ? "AUTO ▼" : "PAUSED ‖"}</button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(0,0,0,0.2)", flexShrink: 0,
          }}>
            {(["BREAKING", "URGENT", "DEVELOPING", "UPDATE", "ANALYSIS"] as Severity[]).map(s => {
              const count = filtered.filter(i => i.severity === s).length;
              if (count === 0) return null;
              return (
                <div key={s} style={{
                  padding: "4px 10px", borderRight: "1px solid rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 7, fontWeight: 800, color: SEV_CFG[s].color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>{s}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: SEV_CFG[s].color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                </div>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "4px 12px", fontSize: 8, color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center" }}>
              {filtered.length} shown
            </div>
          </div>

          {/* Feed */}
          <div
            ref={feedRef}
            className="lfv2-scroll"
            onScroll={e => { const el = e.currentTarget; setAutoScroll(el.scrollTop < 60); }}
            style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
          >
            {filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, opacity: 0.25 }}>
                <span style={{ fontSize: 22 }}>📭</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>NO ITEMS</span>
              </div>
            ) : filtered.map(item => {
              const ch = CH_MAP[item.channelId];
              return (
                <div key={item.id} className="lfv2-card">
                  <FeedCard
                    item={item}
                    ch={ch}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TICKER ─────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.4)",
        overflow: "hidden", flexShrink: 0,
        height: 26, display: "flex", alignItems: "center",
      }}>
        <div style={{
          width: 60, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(34,197,94,0.08)",
        }}>
          <span style={{ fontSize: 7, fontWeight: 900, color: "#4ade80", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" as const }}>
          <div ref={tickerRef} className="lfv2-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => {
              const ch = CH_MAP[item.channelId];
              const sev = SEV_CFG[item.severity];
              return (
                <span key={`${item.id}-${i}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0 20px", borderRight: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 9, whiteSpace: "nowrap",
                }}>
                  <span style={{ color: ch.accent, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 8 }}>{ch.handle}</span>
                  <span style={{ color: sev.color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 7 }}>{item.severity}</span>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{item.headline}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
