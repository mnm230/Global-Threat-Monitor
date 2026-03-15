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
  | "lbc";

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

  // ── Arabic TV ─────────────────────────────────────────────────────────────────
  {
    id: "jadeed" as any,
    name: "Al Jadeed",
    handle: "الجديد",
    icon: "ج",
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    tag: "AR-TV",
    description: "Lebanese independent — Beirut ground coverage, neutral-ish",
    headlines: [
      "الجديد: انفجار يهز {loc} — فرق الإنقاذ تتحرك",
      "Al Jadeed exclusive: Lebanese sources on {loc} ceasefire status",
      "الجديد: مراسلتنا في {loc} ترصد الأوضاع لحظة بلحظة",
      "Al Jadeed: {n} injured in {loc} as strikes continue overnight",
      "الجديد: حراك دبلوماسي لوقف إطلاق النار في {loc}",
      "Al Jadeed reporter sheltering in {loc} — live update via phone",
      "الجديد عاجل: دمار واسع في {loc} بعد الغارات الليلية",
    ],
    bodies: [
      "Al Jadeed correspondent live: 'We are hearing explosions at regular intervals. Civil defense teams are overwhelmed in {loc}.'",
      "مراسلة الجديد: الدمار واسع النطاق في {loc}، وفرق الدفاع المدني تعمل بطاقتها القصوى.",
      "Al Jadeed: Local health authorities report {n} casualties, figures unconfirmed by independent sources.",
    ],
    locations: ["Beirut", "southern Lebanon", "Tyre", "Sidon", "Baalbek", "the Bekaa Valley", "Dahiyeh", "Nabatieh"],
  },
  {
    id: "alarabytv" as any,
    name: "Al Araby TV",
    handle: "العربي",
    icon: "ع",
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    tag: "AR-TV",
    description: "Qatar-backed pan-Arab — opposition & diaspora angle",
    headlines: [
      "العربي: مصادر في {loc} تتحدث عن تصعيد غير مسبوق",
      "Al Araby TV: Opposition groups in {loc} warn of humanitarian collapse",
      "العربي: ناشطون يوثقون انتهاكات في {loc} — فيديوهات",
      "Al Araby TV: {n} civilian structures hit in {loc} — report",
      "العربي: مطالبات بتحقيق دولي في أحداث {loc}",
      "Al Araby TV: Diaspora communities rally over {loc} situation",
      "العربي عاجل: مصادر في {loc} تؤكد سقوط ضحايا مدنيين",
    ],
    bodies: [
      "Al Araby TV: Activist networks documented the incidents using satellite imagery and on-the-ground testimonies from {loc}.",
      "العربي: ناشطون حقوقيون يطالبون بمحاسبة المسؤولين عن الانتهاكات في {loc}.",
      "Al Araby correspondent: 'The voices from inside {loc} are telling a very different story from official accounts.'",
    ],
    locations: ["Gaza", "the West Bank", "Beirut", "Ramallah", "Jenin", "Rafah", "Damascus", "Iraqi Kurdistan"],
  },

  // ── TV Channels ──────────────────────────────────────────────────────────────
  {
    id: "i24",
    name: "i24 NEWS",
    handle: "i24NEWS",
    icon: "📺",
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.09)",
    tag: "TV",
    description: "Israeli English-language broadcast — Tel Aviv studio",
    headlines: [
      "i24 LIVE: Sirens heard in {loc} — correspondent on ground",
      "i24 CHYRON: Iron Dome intercepts detected over {loc}",
      "LIVE BROADCAST: Explosions reported in {loc} region",
      "i24 EXCLUSIVE: IDF official speaks on {loc} operation",
      "BREAKING — i24: Hostage family speaks out following {loc} news",
      "i24 REPORTER: Smoke visible from studio in direction of {loc}",
      "ON AIR: Emergency press conference live from {loc}",
    ],
    bodies: [
      "i24 NEWS correspondent reporting live from the scene: 'We can hear the Iron Dome interceptors firing overhead. Residents are moving to shelters.'",
      "Studio anchor: 'We are receiving unconfirmed reports of additional launches. Our team in {loc} is attempting to confirm.'",
      "i24's military correspondent: 'This is consistent with what we've seen in previous escalation rounds — a coordinated multi-front pressure campaign.'",
    ],
    locations: ["Tel Aviv", "Haifa", "Ashkelon", "the north", "the southern envelope", "Jerusalem", "the border"],
  },
  {
    id: "bbc",
    name: "BBC World News",
    handle: "BBC News",
    icon: "BBC",
    accent: "#e11d48",
    bg: "rgba(225,29,72,0.08)",
    tag: "TV",
    description: "BBC World News broadcast — international coverage",
    headlines: [
      "BBC: Our correspondent in {loc} reports heavy gunfire overnight",
      "LIVE: BBC panel — analysts assess {loc} ground situation",
      "BBC VERIFIED: Video from {loc} shows aftermath of strike",
      "BBC NEWSNIGHT: {loc} crisis — what happens next?",
      "BBC: UK foreign secretary calls for ceasefire in {loc}",
      "BBC BREAKING: {n} reported dead in {loc} — unverified",
      "BBC WORLD SERVICE: {loc} residents describe night of bombardment",
    ],
    bodies: [
      "BBC correspondent: 'The situation here is extremely tense. We've been moved from our original position twice in the last hour due to security concerns.'",
      "The BBC cannot independently verify casualty figures cited by local health authorities.",
      "BBC analysis: The diplomatic track appears to have stalled, with both sides hardening their public positions ahead of any potential talks.",
    ],
    locations: ["Gaza City", "Beirut", "Jerusalem", "Ramallah", "Tel Aviv", "Cairo", "Amman"],
  },
  {
    id: "cnn",
    name: "CNN International",
    handle: "CNN",
    icon: "CNN",
    accent: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    tag: "TV",
    description: "CNN International — breaking news and analysis",
    headlines: [
      "CNN BREAKING: Massive explosion heard in {loc} — anchor",
      "CNN: Source tells us ground operation imminent in {loc}",
      "LIVE COVERAGE: CNN team sheltering as sirens sound in {loc}",
      "CNN EXCLUSIVE: Senior official briefs on {loc} strategy",
      "CNN: Hostage deal 'closer than ever' — source familiar with talks",
      "SITUATION ROOM: {loc} updates — {n} rockets fired since midnight",
      "CNN REPORTER: 'I can see the smoke from where I'm standing in {loc}'",
    ],
    bodies: [
      "CNN's anchor: 'We want to warn viewers that some of the images coming in from {loc} are disturbing.'",
      "A source familiar with the negotiations told CNN the two sides remain 'far apart' on key issues.",
      "CNN military analyst: 'What we're seeing is a calibrated escalation designed to achieve specific tactical objectives.'",
    ],
    locations: ["Tel Aviv", "Gaza", "Washington DC", "Beirut", "the West Bank", "Cairo", "the region"],
  },
  {
    id: "skynews",
    name: "Sky News",
    handle: "Sky News",
    icon: "SKY",
    accent: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
    tag: "TV",
    description: "Sky News — British rolling news broadcast",
    headlines: [
      "SKY: LIVE — {loc} latest as situation deteriorates",
      "Sky News correspondent pinned down in {loc} — reports via phone",
      "SKY BREAKING: Israeli PM addresses nation following {loc} attack",
      "Sky News: UK nationals advised to leave {loc} immediately",
      "EXCLUSIVE — Sky News: Ceasefire proposal 'on the table' — source",
      "Sky News: International airport in {loc} suspends flights",
      "SKY DATA: {n} incidents logged in {loc} in past 48 hours",
    ],
    bodies: [
      "Sky News presenter: 'We can now bring you live pictures from our camera in {loc} — you can see the smoke on the horizon.'",
      "Sky correspondent via phone: 'There's been a significant escalation in the past 20 minutes. We're hearing repeated explosions.'",
      "Sky News analysis: The pattern of strikes suggests a deliberate targeting of logistics infrastructure.",
    ],
    locations: ["the Middle East", "London", "Beirut", "Tel Aviv", "Gaza", "the border region", "Riyadh"],
  },
  {
    id: "france24",
    name: "France 24",
    handle: "France 24",
    icon: "F24",
    accent: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    tag: "TV",
    description: "France 24 English — Paris-based international news",
    headlines: [
      "France 24: Paris condemns strikes on {loc} civilian area",
      "F24 LIVE: Our reporter in {loc} — 'the situation is critical'",
      "France 24: EU emergency summit called over {loc} crisis",
      "F24 BREAKING: French nationals trapped in {loc} — embassy confirms",
      "France 24 correspondent: Night sky over {loc} lit by explosions",
      "F24 ANALYSIS: {loc} — decoding the escalation ladder",
      "France 24: Macron calls for 'maximum restraint' following {loc}",
    ],
    bodies: [
      "France 24 correspondent in the field: 'The French embassy has been trying to reach nationals in the area. Communications are intermittent.'",
      "France 24 analyst: 'Paris is walking a difficult line here — maintaining alliance commitments while appealing to Arab partners.'",
    ],
    locations: ["Beirut", "Paris", "Gaza", "Jerusalem", "Cairo", "Ramallah", "southern Lebanon"],
  },
  {
    id: "ch12",
    name: "Channel 12",
    handle: "N12 / Keshet",
    icon: "12",
    accent: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    tag: "TV",
    description: "Keshet N12 — Israeli commercial TV, Hebrew breaking news",
    headlines: [
      "N12 BREAKING: Sirens in {loc} — מצב חירום — stay in shelter",
      "Channel 12: צבע אדום — Red Alert declared in {loc}",
      "N12 REPORTER live from {loc}: rockets visible from position",
      "Channel 12: PM's office to hold press conference — {loc} related",
      "N12 EXCLUSIVE: IDF source confirms operation in {loc} widening",
      "Channel 12: {n} קטיושות — Katyushas fired toward {loc}",
      "N12: Cabinet session ends — war cabinet votes on {loc} response",
    ],
    bodies: [
      "N12 anchor reporting live: 'We are asking all residents of {loc} to remain in their protected spaces until further notice.'",
      "Channel 12 military correspondent: 'The IDF is not confirming details, but our sources say the operation entered a new phase tonight.'",
    ],
    locations: ["Tel Aviv", "Haifa", "the north", "Kiryat Shmona", "Beer Sheva", "Ashkelon", "the envelope"],
  },
  {
    id: "ch13",
    name: "Channel 13",
    handle: "N13 / Reshet",
    icon: "13",
    accent: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    tag: "TV",
    description: "Reshet N13 — Israeli commercial TV, investigative & breaking",
    headlines: [
      "Channel 13: מיוחד — Special report from {loc}",
      "N13 BREAKING: Drone shot down over {loc} — IDF confirms",
      "Channel 13: Hospital in {loc} overwhelmed — footage obtained",
      "N13 EXCLUSIVE: Leaked intel — {loc} threat assessment",
      "Channel 13: {n} rockets since sunset — {loc} under sustained fire",
      "N13: Families of hostages protest outside {loc} — live",
      "Channel 13 reporter: 'This is the most intense night we've seen in {loc}'",
    ],
    bodies: [
      "Channel 13 anchor: 'Our correspondent managed to reach the scene in {loc}. We will go live as soon as the connection is stable.'",
      "N13 security correspondent: 'Multiple sources confirm the strike package was larger than initially reported.'",
    ],
    locations: ["Tel Aviv", "the south", "Sderot", "the north", "Haifa", "Jerusalem", "Gaza border communities"],
  },
  {
    id: "lbc",
    name: "LBC Lebanon",
    handle: "LBCI",
    icon: "LBC",
    accent: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    tag: "TV",
    description: "Lebanese Broadcasting Corporation — Beirut-based live coverage",
    headlines: [
      "LBCI: Explosion heard in {loc} — correspondent rushing to scene",
      "LBC: Lebanese army on high alert following {loc} incident",
      "LBCI BREAKING: {n} killed in {loc} strike — health ministry",
      "LBC: Hezbollah releases statement on {loc} operation",
      "LBCI: Mass exodus from {loc} as fighting intensifies",
      "LBC correspondent in {loc}: 'Buildings still on fire, no fire trucks'",
      "LBCI: Beirut airport warns of airspace closure near {loc}",
    ],
    bodies: [
      "LBCI correspondent reporting: 'We arrived at the scene in {loc} to find emergency teams still working. The smell of smoke is overwhelming.'",
      "Lebanon's Information Minister issued a statement condemning what he called 'flagrant aggression' against Lebanese territory.",
    ],
    locations: ["southern Lebanon", "Beirut", "Tyre", "Sidon", "Baalbek", "the Bekaa", "Dahiyeh"],
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
  TV:       "#e879f9",
  "AR-TV":  "#fb923c",
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
  if (ch.tag === "TV" || ch.tag === "AR-TV") {
    const r = Math.random();
    return r < 0.22 ? "BREAKING" : r < 0.48 ? "URGENT" : r < 0.75 ? "DEVELOPING" : "UPDATE";
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
  const isBreaking  = item.severity === "BREAKING";
  const isUrgent    = item.severity === "URGENT";
  const isLow       = !isBreaking && !isUrgent;

  const cardBg = isBreaking
    ? "rgba(248,113,113,0.05)"
    : isUrgent
    ? "rgba(251,146,60,0.03)"
    : "transparent";

  const borderColor = isBreaking
    ? "#f87171"
    : isUrgent
    ? "#fb923c"
    : "transparent";

  const headlineFontSize = isBreaking ? 14 : isUrgent ? 13 : 12;
  const headlineFontWeight = isBreaking ? 700 : isUrgent ? 600 : 500;
  const headlineColor = isBreaking
    ? "#fff"
    : isLow
    ? "rgba(255,255,255,0.78)"
    : "rgba(255,255,255,0.9)";

  const mono = "'JetBrains Mono', monospace";

  return (
    <div
      onClick={onToggle}
      className={"lfv2-card" + (item.isNew ? " lfv2-new" : "")}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "10px 16px",
        cursor: "pointer",
        background: cardBg,
        borderLeft: `3px solid ${borderColor}`,
        position: "relative" as const,
      }}
    >
      {/* Zone 1: metadata row */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5, flexWrap: "nowrap" as const }}>
        {/* Source handle badge */}
        <span style={{
          fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
          background: ch.bg, color: ch.accent,
          border: `1px solid ${ch.accent}25`,
          fontFamily: mono, letterSpacing: "0.08em",
          flexShrink: 0,
        }}>
          {ch.handle}
        </span>
        {/* Tag pill */}
        {ch.tag === "TV" || ch.tag === "AR-TV" ? (
          <span style={{
            fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 3,
            color: "#e879f9", background: "rgba(232,121,249,0.12)",
            border: "1px solid rgba(232,121,249,0.3)",
            letterSpacing: "0.12em", flexShrink: 0,
            fontFamily: mono,
          }}>ON AIR</span>
        ) : (
          <span style={{
            fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 3,
            color: TAG_COLORS[ch.tag] || "#aaa",
            border: `1px solid ${(TAG_COLORS[ch.tag] || "#aaa")}30`,
            letterSpacing: "0.12em", flexShrink: 0,
            fontFamily: mono,
          }}>
            {ch.tag}
          </span>
        )}
        {/* Severity pill */}
        <span style={{
          fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3,
          background: sev.bg, color: sev.color,
          border: `1px solid ${sev.color}30`,
          letterSpacing: "0.1em", flexShrink: 0,
          fontFamily: mono,
        }}>
          {item.severity}
        </span>
        {/* Media icon */}
        {item.mediaType && item.mediaType !== "text" && (
          <span style={{ fontSize: 9, color: MEDIA_COLOR[item.mediaType], flexShrink: 0 }}>
            {MEDIA_ICON[item.mediaType]}
          </span>
        )}
        {/* NEW badge */}
        {item.isNew && (
          <span style={{
            fontSize: 7, fontWeight: 900, color: "#22c55e",
            background: "rgba(34,197,94,0.15)", padding: "1px 6px", borderRadius: 10,
            border: "1px solid rgba(34,197,94,0.3)", letterSpacing: "0.12em",
            fontFamily: mono, flexShrink: 0,
          }}>NEW</span>
        )}
        <span style={{ flex: 1 }} />
        {/* Time ago */}
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: mono, flexShrink: 0 }}>
          {fmtAgo(item.ts)}
        </span>
      </div>

      {/* Zone 2: headline */}
      <div style={{
        fontSize: headlineFontSize,
        fontWeight: headlineFontWeight,
        color: headlineColor,
        lineHeight: 1.4,
        marginBottom: expanded ? 0 : 5,
      }}>
        {item.headline}
      </div>

      {/* Zone 3: footer (collapsed only) */}
      {!expanded && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: mono }}>
            📍 {item.location}
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)" }}>···</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>▼</span>
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          borderRadius: 6,
          padding: 12,
          marginTop: 8,
        }}>
          <p style={{
            fontSize: 14, lineHeight: 1.7,
            color: "rgba(255,255,255,0.6)",
            margin: "0 0 10px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {item.body}
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: mono }}>
              ID: {item.id}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: mono }}>
              {fmtTime(item.ts)}
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: mono }}>
              📍 {item.location}
            </span>
            {item.mediaType && item.mediaType !== "text" && (
              <span style={{ fontSize: 9, color: MEDIA_COLOR[item.mediaType], fontFamily: mono }}>
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

  const mono = "'JetBrains Mono', monospace";
  const sevCounts = (["BREAKING", "URGENT", "DEVELOPING", "UPDATE", "ANALYSIS"] as Severity[]).map(s => ({
    s,
    count: filtered.filter(i => i.severity === s).length,
  }));
  const totalFiltered = filtered.length;

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#0f1117", color: "#fff",
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
        .lfv2-ticker-track { animation: lfv2-ticker 70s linear infinite; display:flex; gap:0; white-space:nowrap; }
        .lfv2-ticker-track:hover { animation-play-state: paused; }
        .lfv2-scroll::-webkit-scrollbar { width: 3px; }
        .lfv2-scroll::-webkit-scrollbar-track { background: transparent; }
        .lfv2-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .lfv2-ch { transition: background 0.12s; }
        .lfv2-ch:hover { background: rgba(255,255,255,0.04) !important; }
        .lfv2-card { cursor: pointer; transition: background 0.12s; }
        .lfv2-card:hover { background: rgba(255,255,255,0.018) !important; }
        .lfv2-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .lfv2-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#1a1c2a", flexShrink: 0,
      }}>
        {/* Left: LIVE FEEDS label + unread */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
          <div className="lfv2-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", fontFamily: mono }}>LIVE FEEDS</span>
          {totalUnread > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 900, background: "#ef4444", color: "#fff",
              padding: "1px 7px", borderRadius: 10,
              fontFamily: mono,
            }}>{totalUnread > 99 ? "99+" : totalUnread}</span>
          )}
        </div>
        {/* Center: sources pill */}
        <span style={{
          fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", fontFamily: mono,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          padding: "2px 10px", borderRadius: 10, letterSpacing: "0.1em",
        }}>
          {SOURCES.length} SOURCES
        </span>
        {/* Right: item count + clock */}
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: mono }}>
          {items.length} items
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: mono }}>
          {nowStr}
        </span>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <div
          className="lfv2-sidebar-scroll"
          style={{
            width: 200, flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column",
            background: "#13151f",
            overflowY: "auto",
          }}
        >
          {/* ALL FEEDS pill row */}
          {(() => {
            const isActive = activeId === "all";
            return (
              <div
                className="lfv2-ch"
                onClick={() => switchChannel("all")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
                  cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                  borderLeft: isActive ? "3px solid rgba(255,255,255,0.4)" : "3px solid transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {/* Icon box */}
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.25)",
                  fontSize: 13,
                }}>⬡</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isActive ? 11 : 10.5,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                    letterSpacing: "0.04em",
                  }}>ALL FEEDS</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 1, fontFamily: mono }}>{items.length} items</div>
                </div>
                {totalUnread > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 900, background: "#ef4444", color: "#fff",
                    padding: "1px 6px", borderRadius: 10, flexShrink: 0,
                    fontFamily: mono,
                  }}>{totalUnread > 99 ? "99+" : totalUnread}</span>
                )}
              </div>
            );
          })()}

          {/* Group labels + channels */}
          {["TV", "AR-TV", "WIRE", "OFFICIAL", "REGIONAL", "OSINT", "ANALYSIS", "SOCIAL", "MARITIME", "DATA"].map(tag => {
            const chs = SOURCES.filter(c => c.tag === tag);
            if (chs.length === 0) return null;
            const tagColor = TAG_COLORS[tag] ?? "rgba(255,255,255,0.18)";
            return (
              <div key={tag}>
                {/* Group label */}
                <div style={{ padding: "10px 12px 4px" }}>
                  <div style={{
                    fontSize: 8, fontWeight: 900, letterSpacing: "0.2em",
                    color: tagColor, opacity: 0.6,
                    fontFamily: mono,
                  }}>{tag}</div>
                  <div style={{ height: 1, background: tagColor, opacity: 0.08, margin: "3px 0 2px" }} />
                </div>
                {chs.map(c => {
                  const isActive = activeId === c.id;
                  const u = unread[c.id] ?? 0;
                  const itemCount = items.filter(i => i.channelId === c.id).length;
                  return (
                    <div
                      key={c.id}
                      className="lfv2-ch"
                      onClick={() => switchChannel(c.id as ChannelId)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
                        cursor: "pointer",
                        background: isActive ? `${c.accent}12` : "transparent",
                        borderLeft: isActive ? `3px solid ${c.accent}` : "3px solid transparent",
                      }}
                    >
                      {/* Icon box */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isActive ? `${c.accent}15` : "rgba(255,255,255,0.04)",
                        color: isActive ? c.accent : "rgba(255,255,255,0.25)",
                        fontSize: typeof c.icon === "string" && c.icon.length > 1 ? 9 : 13,
                        fontFamily: mono, fontWeight: 900,
                      }}>{c.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: isActive ? 11 : 10.5,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? c.accent : "rgba(255,255,255,0.42)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{c.name}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 1, fontFamily: mono }}>
                          {itemCount} items
                        </div>
                      </div>
                      {u > 0 && (
                        <span style={{
                          fontSize: 9, fontWeight: 900, background: "#ef4444", color: "#fff",
                          padding: "1px 6px", borderRadius: 10, flexShrink: 0,
                          fontFamily: mono,
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
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: activeCh ? `linear-gradient(180deg, ${activeCh.bg}, transparent 100%)` : "#161824",
            flexShrink: 0,
          }}>
            {/* Colored top-border strip */}
            <div style={{ height: 2, background: activeCh ? activeCh.accent : "rgba(255,255,255,0.15)" }} />

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px 6px" }}>
              {activeCh ? (
                <>
                  <span style={{ fontSize: 18 }}>{activeCh.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: activeCh.accent, letterSpacing: "0.06em" }}>
                    {activeCh.name}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: mono }}>{activeCh.handle}</span>
                  <span style={{
                    fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 3,
                    background: `${TAG_COLORS[activeCh.tag] ?? "#aaa"}18`,
                    color: TAG_COLORS[activeCh.tag] ?? "#aaa",
                    letterSpacing: "0.1em", fontFamily: mono,
                    border: `1px solid ${TAG_COLORS[activeCh.tag] ?? "#aaa"}25`,
                    flexShrink: 0,
                  }}>
                    {activeCh.tag}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 10, color: "rgba(255,255,255,0.3)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{activeCh.description}</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>ALL FEEDS</span>
                  <span style={{ flex: 1 }} />
                </>
              )}
              {/* LIVE indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <div className="lfv2-blink" style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", fontFamily: mono }}>LIVE</span>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" as const, padding: "0 16px 10px" }}>
              {(["ALL", "BREAKING", "URGENT", "DEVELOPING", "UPDATE", "ANALYSIS"] as const).map(s => {
                const isOn = sevFilter === s;
                const color = s === "ALL" ? "rgba(255,255,255,0.45)" : SEV_CFG[s].color;
                return (
                  <button key={s} onClick={() => setSevFilter(s)} style={{
                    fontSize: 9, fontWeight: 800, padding: "4px 9px", borderRadius: 5,
                    fontFamily: mono, letterSpacing: "0.08em",
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
                  borderRadius: 6, padding: "5px 12px", fontSize: 11,
                  color: "rgba(255,255,255,0.7)", outline: "none", width: 130, fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => setAutoScroll(a => !a)}
                style={{
                  fontSize: 9, fontWeight: 800, padding: "4px 9px", borderRadius: 5,
                  fontFamily: mono, letterSpacing: "0.08em",
                  cursor: "pointer",
                  background: autoScroll ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${autoScroll ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
                  color: autoScroll ? "#4ade80" : "rgba(255,255,255,0.3)",
                }}
              >{autoScroll ? "AUTO ▼" : "PAUSED ‖"}</button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "#1a1c28", flexShrink: 0,
            padding: "5px 12px 0",
          }}>
            {/* Pills row */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, paddingBottom: 5 }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {sevCounts.filter(x => x.count > 0).map(({ s, count }) => (
                  <span key={s} style={{
                    fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: 10,
                    background: SEV_CFG[s].bg, color: SEV_CFG[s].color,
                    border: `1px solid ${SEV_CFG[s].color}30`,
                    fontFamily: mono, letterSpacing: "0.06em",
                  }}>
                    {s} {count}
                  </span>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: mono }}>
                {totalFiltered} of {items.length}
              </span>
            </div>
            {/* Severity bar */}
            {totalFiltered > 0 && (
              <div style={{ display: "flex", height: 2, marginBottom: 0 }}>
                {sevCounts.filter(x => x.count > 0).map(({ s, count }) => (
                  <div key={s} style={{
                    flex: count,
                    background: SEV_CFG[s].color,
                    opacity: 0.7,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Feed */}
          <div
            ref={feedRef}
            className="lfv2-scroll"
            onScroll={e => { const el = e.currentTarget; setAutoScroll(el.scrollTop < 60); }}
            style={{ flex: 1, overflowY: "auto", minHeight: 0, background: "#0f1117" }}
          >
            {filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6 }}>
                <span style={{ fontSize: 28, opacity: 0.2 }}>📭</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: mono }}>NO ITEMS</span>
                {activeCh && (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2, maxWidth: 200, textAlign: "center" }}>
                    {activeCh.description}
                  </span>
                )}
              </div>
            ) : filtered.map(item => {
              const ch = CH_MAP[item.channelId];
              return (
                <FeedCard
                  key={item.id}
                  item={item}
                  ch={ch}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TICKER ─────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#13151f",
        overflow: "hidden", flexShrink: 0,
        height: 30, display: "flex", alignItems: "center",
      }}>
        {/* LIVE label section */}
        <div style={{
          width: 70, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          background: "rgba(34,197,94,0.06)",
        }}>
          <div className="lfv2-blink" style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 7, fontWeight: 900, color: "#4ade80", letterSpacing: "0.14em", fontFamily: mono }}>LIVE</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" as const }}>
          <div ref={tickerRef} className="lfv2-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => {
              const ch = CH_MAP[item.channelId];
              const sev = SEV_CFG[item.severity];
              return (
                <span key={`${item.id}-${i}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0 16px",
                  fontSize: 9, whiteSpace: "nowrap",
                }}>
                  <span style={{ color: ch.accent, fontWeight: 800, fontFamily: mono, fontSize: 8 }}>{ch.handle}</span>
                  <span style={{ color: sev.color, fontWeight: 700, fontFamily: mono, fontSize: 7 }}>{item.severity}</span>
                  <span style={{ color: "rgba(255,255,255,0.55)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>{item.headline}</span>
                  <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
