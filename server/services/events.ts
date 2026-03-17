import type { ConflictEvent, ThermalHotspot, CyberEvent, TelegramMessage } from "@shared/schema";
import { TtlCache } from "../lib/cache";
import { latestTgMsgs } from "../lib/shared-state";

const GDELT_GEOCODE_MAP: Record<string, { lat: number; lng: number }> = {
  'tel aviv': { lat: 32.085, lng: 34.782 }, 'jerusalem': { lat: 31.769, lng: 35.216 },
  'haifa': { lat: 32.794, lng: 34.990 }, 'gaza': { lat: 31.510, lng: 34.447 },
  'beirut': { lat: 33.894, lng: 35.502 }, 'damascus': { lat: 33.514, lng: 36.277 },
  'tehran': { lat: 35.689, lng: 51.389 }, 'isfahan': { lat: 32.655, lng: 51.668 },
  'baghdad': { lat: 33.312, lng: 44.366 }, 'riyadh': { lat: 24.713, lng: 46.675 },
  'sanaa': { lat: 15.370, lng: 44.191 }, 'aden': { lat: 12.782, lng: 45.037 },
  'amman': { lat: 31.956, lng: 35.946 }, 'cairo': { lat: 30.044, lng: 31.236 },
  'tripoli': { lat: 34.437, lng: 35.850 }, 'aleppo': { lat: 36.202, lng: 37.134 },
  'homs': { lat: 34.730, lng: 36.720 }, 'tabriz': { lat: 38.080, lng: 46.292 },
  'israel': { lat: 31.5, lng: 34.8 }, 'iran': { lat: 32.4, lng: 53.7 },
  'lebanon': { lat: 33.9, lng: 35.9 }, 'syria': { lat: 35.0, lng: 38.0 },
  'yemen': { lat: 15.5, lng: 48.5 }, 'iraq': { lat: 33.2, lng: 43.7 },
  'sderot': { lat: 31.525, lng: 34.596 }, 'ashkelon': { lat: 31.669, lng: 34.571 },
  'nahariya': { lat: 33.005, lng: 35.098 }, 'kiryat shmona': { lat: 33.208, lng: 35.571 },
  'west bank': { lat: 31.95, lng: 35.20 }, 'rafah': { lat: 31.297, lng: 34.255 },
  'khan younis': { lat: 31.345, lng: 34.305 }, 'nablus': { lat: 32.222, lng: 35.262 },
  'hebron': { lat: 31.529, lng: 35.095 }, 'jenin': { lat: 32.461, lng: 35.300 },
  'ramallah': { lat: 31.903, lng: 35.204 }, 'sidon': { lat: 33.563, lng: 35.376 },
  'tyre': { lat: 33.273, lng: 35.194 }, 'baalbek': { lat: 34.006, lng: 36.218 },
  'bint jbeil': { lat: 33.117, lng: 35.432 }, 'bint jbail': { lat: 33.117, lng: 35.432 },
  'khiam': { lat: 33.359, lng: 35.611 }, 'al-khiam': { lat: 33.359, lng: 35.611 },
  'maroun al-ras': { lat: 33.079, lng: 35.465 }, 'maroun': { lat: 33.079, lng: 35.465 },
  'taybeh': { lat: 33.135, lng: 35.490 }, 'ayta ash-shab': { lat: 33.078, lng: 35.384 },
  'yaroun': { lat: 33.092, lng: 35.468 }, 'labbouneh': { lat: 33.069, lng: 35.301 },
  'kfar kila': { lat: 33.332, lng: 35.572 }, 'aitaroun': { lat: 33.070, lng: 35.451 },
  'adaisseh': { lat: 33.286, lng: 35.607 }, 'markaba': { lat: 33.316, lng: 35.582 },
  'alma ash-shab': { lat: 33.098, lng: 35.330 }, 'rmeish': { lat: 33.077, lng: 35.399 },
  'nabatieh': { lat: 33.377, lng: 35.484 }, 'marjayoun': { lat: 33.359, lng: 35.593 },
  'hasbaya': { lat: 33.397, lng: 35.690 }, 'kafr shuba': { lat: 33.418, lng: 35.689 },
  'wazzani': { lat: 33.258, lng: 35.616 }, 'ghajar': { lat: 33.280, lng: 35.643 },
  'houla': { lat: 33.290, lng: 35.580 }, 'shebaa': { lat: 33.436, lng: 35.710 },
  'shebaa farms': { lat: 33.450, lng: 35.750 }, 'southern lebanon': { lat: 33.200, lng: 35.450 },
  'deir ez-zor': { lat: 35.336, lng: 40.145 }, 'idlib': { lat: 35.931, lng: 36.634 },
  'latakia': { lat: 35.524, lng: 35.791 }, 'basra': { lat: 30.508, lng: 47.784 },
  'mosul': { lat: 36.340, lng: 43.130 }, 'erbil': { lat: 36.191, lng: 44.009 },
  'kirkuk': { lat: 35.468, lng: 44.392 }, 'hodeidah': { lat: 14.798, lng: 42.954 },
  'marib': { lat: 15.454, lng: 45.326 }, 'strait of hormuz': { lat: 26.56, lng: 56.25 },
  'red sea': { lat: 20.0, lng: 38.5 }, 'persian gulf': { lat: 27.0, lng: 51.0 },
  'golan': { lat: 33.0, lng: 35.8 }, 'negev': { lat: 30.8, lng: 34.8 },
  'sinai': { lat: 29.5, lng: 33.8 }, 'suez': { lat: 29.97, lng: 32.55 },
  'bandar abbas': { lat: 27.183, lng: 56.267 }, 'natanz': { lat: 33.51, lng: 51.73 },
  'dimona': { lat: 31.07, lng: 35.21 }, 'palmyra': { lat: 34.56, lng: 38.27 },
  'kermanshah': { lat: 34.31, lng: 47.07 }, 'shiraz': { lat: 29.59, lng: 52.58 },
};

function classifyGDELTEventType(title: string): ConflictEvent['type'] {
  const t = title.toLowerCase();
  if (/missile|ballistic|icbm|scud|launch/i.test(t)) return 'missile';
  if (/airstrike|air strike|bombing|bomb|strike|sortie/i.test(t)) return 'airstrike';
  if (/drone|uav|unmanned/i.test(t)) return 'airstrike';
  if (/naval|ship|maritime|vessel|boat|submarine|fleet/i.test(t)) return 'naval';
  if (/intercept|defense|iron dome|patriot|sling|arrow/i.test(t)) return 'defense';
  if (/nuclear|enrichment|uranium|centrifuge|iaea/i.test(t)) return 'nuclear';
  if (/troop|infantry|ground|incursion|invasion|tank|armored/i.test(t)) return 'ground';
  if (/rocket|mortar|shell|artillery/i.test(t)) return 'missile';
  return 'ground';
}

function classifyGDELTSeverity(tone: number, title: string): ConflictEvent['severity'] {
  const t = title.toLowerCase();
  if (/breaking|urgent|critical|mass casualt|nuclear/i.test(t) || tone < -8) return 'critical';
  if (/attack|strike|killed|destroy|launch|intercept/i.test(t) || tone < -5) return 'high';
  if (/warning|tension|deploy|threat|military/i.test(t) || tone < -2) return 'medium';
  return 'low';
}

function geocodeFromTitle(title: string): { lat: number; lng: number } | null {
  const lower = title.toLowerCase();
  for (const [place, coords] of Object.entries(GDELT_GEOCODE_MAP)) {
    if (lower.includes(place)) return coords;
  }
  return null;
}

const gdeltCache = new TtlCache<ConflictEvent[]>(30_000);

const HISTORY_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const historicalEvents: ConflictEvent[] = [];
const historicalEventIds = new Set<string>();

function mergeIntoHistory(events: ConflictEvent[]) {
  const cutoff = Date.now() - HISTORY_MAX_AGE;
  const pruneIdx = historicalEvents.findIndex(e => new Date(e.timestamp).getTime() > cutoff);
  if (pruneIdx > 0) historicalEvents.splice(0, pruneIdx);
  for (const e of events) {
    if (!historicalEventIds.has(e.id)) {
      historicalEventIds.add(e.id);
      historicalEvents.push(e);
    }
  }
  historicalEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

const SOUTH_LEBANON_VILLAGES: Record<string, { lat: number; lng: number; label: string }> = {
  'bint jbeil': { lat: 33.117, lng: 35.432, label: 'Bint Jbeil' },
  'bint jbail': { lat: 33.117, lng: 35.432, label: 'Bint Jbeil' },
  'khiam': { lat: 33.359, lng: 35.611, label: 'Al-Khiam' },
  'al-khiam': { lat: 33.359, lng: 35.611, label: 'Al-Khiam' },
  'maroun al-ras': { lat: 33.079, lng: 35.465, label: "Maroun al-Ras" },
  'maroun': { lat: 33.079, lng: 35.465, label: "Maroun al-Ras" },
  'taybeh': { lat: 33.135, lng: 35.490, label: 'Taybeh' },
  'ayta ash-shab': { lat: 33.078, lng: 35.384, label: "Ayta ash-Shab" },
  'yaroun': { lat: 33.092, lng: 35.468, label: 'Yaroun' },
  'labbouneh': { lat: 33.069, lng: 35.301, label: 'Labbouneh' },
  'kfar kila': { lat: 33.332, lng: 35.572, label: 'Kfar Kila' },
  'aitaroun': { lat: 33.070, lng: 35.451, label: 'Aitaroun' },
  'adaisseh': { lat: 33.286, lng: 35.607, label: 'Adaisseh' },
  'markaba': { lat: 33.316, lng: 35.582, label: 'Markaba' },
  'alma ash-shab': { lat: 33.098, lng: 35.330, label: "Alma ash-Shab" },
  'rmeish': { lat: 33.077, lng: 35.399, label: 'Rmeish' },
  'nabatieh': { lat: 33.377, lng: 35.484, label: 'Nabatieh' },
  'marjayoun': { lat: 33.359, lng: 35.593, label: 'Marjayoun' },
  'hasbaya': { lat: 33.397, lng: 35.690, label: 'Hasbaya' },
  'kafr shuba': { lat: 33.418, lng: 35.689, label: 'Kafr Shuba' },
  'wazzani': { lat: 33.258, lng: 35.616, label: 'Wazzani' },
  'ghajar': { lat: 33.280, lng: 35.643, label: 'Ghajar' },
  'houla': { lat: 33.290, lng: 35.580, label: 'Houla' },
  'shebaa': { lat: 33.436, lng: 35.710, label: 'Shebaa' },
  'shebaa farms': { lat: 33.450, lng: 35.750, label: 'Shebaa Farms' },
  'southern lebanon': { lat: 33.200, lng: 35.450, label: 'Southern Lebanon' },
  'south lebanon': { lat: 33.200, lng: 35.450, label: 'Southern Lebanon' },
  'litani': { lat: 33.280, lng: 35.480, label: 'Litani River' },
  'tyre': { lat: 33.273, lng: 35.194, label: 'Tyre' },
  'sur': { lat: 33.273, lng: 35.194, label: 'Tyre (Sur)' },
  'sidon': { lat: 33.563, lng: 35.376, label: 'Sidon' },
  'saida': { lat: 33.563, lng: 35.376, label: 'Sidon (Saida)' },
  'baalbek': { lat: 34.006, lng: 36.218, label: 'Baalbek' },
  'hermel': { lat: 34.394, lng: 36.385, label: 'Hermel' },
  'tripoli': { lat: 34.437, lng: 35.850, label: 'Tripoli' },
  'dahiyeh': { lat: 33.852, lng: 35.492, label: 'Dahiyeh' },
  'dahieh': { lat: 33.852, lng: 35.492, label: 'Dahiyeh' },
  'southern suburbs': { lat: 33.852, lng: 35.492, label: 'Dahiyeh (Southern Suburbs)' },
  'jounieh': { lat: 33.981, lng: 35.618, label: 'Jounieh' },
  'zahle': { lat: 33.846, lng: 35.902, label: 'Zahle' },
  'rashaya': { lat: 33.497, lng: 35.843, label: 'Rashaya' },
  'bent jbeil': { lat: 33.117, lng: 35.432, label: 'Bint Jbeil' },
  'aita al-shaab': { lat: 33.078, lng: 35.384, label: 'Aita al-Shaab' },
  'aita el shaab': { lat: 33.078, lng: 35.384, label: 'Aita al-Shaab' },
  'blida': { lat: 33.110, lng: 35.475, label: 'Blida' },
  'mais al-jabal': { lat: 33.106, lng: 35.399, label: 'Mais al-Jabal' },
  'mays al-jabal': { lat: 33.106, lng: 35.399, label: 'Mais al-Jabal' },
  'aynata': { lat: 33.193, lng: 35.527, label: 'Aynata' },
  'naqoura': { lat: 33.117, lng: 35.140, label: 'Naqoura' },
  'ras al-ain': { lat: 33.230, lng: 35.540, label: 'Ras al-Ain' },
  'tebnine': { lat: 33.199, lng: 35.407, label: 'Tebnine' },
  'tibnin': { lat: 33.199, lng: 35.407, label: 'Tebnine' },
  'deir mimas': { lat: 33.334, lng: 35.552, label: 'Deir Mimas' },
  'khirbet selm': { lat: 33.185, lng: 35.463, label: 'Khirbet Selm' },
  'jezzine': { lat: 33.545, lng: 35.590, label: 'Jezzine' },
  'chouf': { lat: 33.700, lng: 35.580, label: 'Chouf' },
  'aley': { lat: 33.810, lng: 35.600, label: 'Aley' },
  'bekaa': { lat: 33.850, lng: 36.000, label: 'Bekaa Valley' },
  'bekaa valley': { lat: 33.850, lng: 36.000, label: 'Bekaa Valley' },
  'qana': { lat: 33.209, lng: 35.298, label: 'Qana' },
  'kunin': { lat: 33.159, lng: 35.472, label: 'Kunin' },
  'chihine': { lat: 33.092, lng: 35.419, label: 'Chihine' },
  'deir siriane': { lat: 33.130, lng: 35.430, label: 'Deir Siriane' },
  'kafr hamam': { lat: 33.123, lng: 35.451, label: 'Kafr Hamam' },
  'hanine': { lat: 33.168, lng: 35.407, label: 'Hanine' },
  'rachaf': { lat: 33.148, lng: 35.486, label: 'Rachaf' },
};

const GROUND_INVASION_PATTERNS = [
  /idf\s+(?:forces?|troops?|soldiers?|units?)\s+(?:enter|advance|push|move|operate|raid|storm)\s+(?:into\s+)?([a-z\s\-']+)/i,
  /(?:ground\s+(?:incursion|invasion|operation|offensive|forces?)|land\s+(?:operation|invasion|incursion))\s+(?:into\s+|in\s+|near\s+)?([a-z\s\-']+)/i,
  /(?:tanks?|armored|infantry|troops?|forces?)\s+(?:enter|inside|advancing|spotted|seen)\s+(?:in\s+|into\s+)?([a-z\s\-']+)/i,
  /(?:clashes?|fighting|combat|battle|engagement)\s+(?:in|at|near|around)\s+([a-z\s\-']+)/i,
  /(?:airstrike|strike|bombing|shelling|artillery)\s+(?:in|on|near|targeting)\s+([a-z\s\-']+)/i,
  /([a-z\s\-']+)\s+(?:under\s+attack|targeted|raided|stormed|bombarded|shelled)/i,
  /hezbollah\s+(?:fire|launches?|fires?|targets?|attacks?)\s+(?:from|near|at)\s+([a-z\s\-']+)/i,
  /(?:القوات الإسرائيلية|قوات الجيش الإسرائيلي|الجيش الإسرائيلي)\s+(?:تتوغل|تدخل|تتقدم|تتمركز)\s+(?:في|إلى|داخل)\s+([^\n.،]+)/i,
  /(?:اشتباكات|معارك|قصف|غارات?)\s+(?:في|على|قرب|بالقرب من)\s+([^\n.،]+)/i,
  /(?:بلدة|قرية|منطقة)\s+([^\n.،]+)\s+(?:تتعرض|تحت نيران|استهداف)/i,
];

function extractLebanonGroundEvents(tgMsgs: TelegramMessage[]): ConflictEvent[] {
  const events: ConflictEvent[] = [];
  const now = Date.now();
  const seen = new Set<string>();
  const recentMsgs = tgMsgs.filter(m => now - new Date(m.timestamp).getTime() < 12 * 3_600_000);

  for (const msg of recentMsgs) {
    const text = msg.text;
    if (!text || text.length < 10) continue;
    const hasLebanonContext = /lebanon|hezbollah|south lebanon|litani|idf ground|ground operation|nabatieh|tyre|sidon|baalbek|dahiy[ae]h|bekaa|marjayoun|naqoura|unifil|بنت جبيل|الخيام|مارون|لبنان|جنوب لبنان|حزب الله|النبطية|صيدا|صور|بيروت|بعلبك|الضاحية|البقاع|مرجعيون|الناقورة|المقاومة اللبنانية|جنوبي لبنان/i.test(text);
    if (!hasLebanonContext) continue;

    let matchedVillage: { lat: number; lng: number; label: string } | null = null;
    let locationName = '';
    const lowerText = text.toLowerCase();

    for (const [key, village] of Object.entries(SOUTH_LEBANON_VILLAGES)) {
      if (lowerText.includes(key)) {
        matchedVillage = village;
        locationName = village.label;
        break;
      }
    }

    if (!matchedVillage) {
      for (const pattern of GROUND_INVASION_PATTERNS) {
        const m = text.match(pattern);
        if (m && m[1]) {
          const loc = m[1].trim().toLowerCase().replace(/[.!?,]+$/, '');
          if (loc.length < 3 || loc.length > 40) continue;
          const known = SOUTH_LEBANON_VILLAGES[loc];
          if (known) { matchedVillage = known; locationName = known.label; break; }
          for (const [key, village] of Object.entries(SOUTH_LEBANON_VILLAGES)) {
            if (loc.includes(key) || key.includes(loc)) {
              matchedVillage = village; locationName = village.label; break;
            }
          }
          if (matchedVillage) break;
        }
      }
    }

    if (!matchedVillage) {
      matchedVillage = { lat: 33.150, lng: 35.420, label: 'Southern Lebanon' };
      locationName = 'Southern Lebanon';
    }

    const dedupeKey = `${matchedVillage.lat.toFixed(2)}_${matchedVillage.lng.toFixed(2)}_${msg.id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let type: ConflictEvent['type'] = 'ground';
    if (/airstrike|air strike|bomb|strike|غارة|قصف جوي/i.test(text)) type = 'airstrike';
    else if (/missile|rocket|ballistic|صاروخ|إطلاق/i.test(text)) type = 'missile';
    else if (/intercept|iron dome|defense|اعتراض/i.test(text)) type = 'defense';

    let severity: ConflictEvent['severity'] = 'medium';
    if (/killed|dead|casualt|martyr|شهيد|قتيل|مجزرة/i.test(text)) severity = 'critical';
    else if (/advance|enter|storm|تتوغل|تدخل|اقتحام/i.test(text)) severity = 'high';

    const snippet = text.length > 120 ? text.substring(0, 117) + '…' : text;
    events.push({
      id: `tg_ground_${msg.id}`,
      type,
      lat: matchedVillage.lat,
      lng: matchedVillage.lng,
      title: `[Ground] ${locationName}`,
      description: `${msg.channel} — ${snippet}`,
      timestamp: msg.timestamp,
      severity,
    });
  }
  return events;
}

const thermalCache = new TtlCache<ThermalHotspot[]>(10_000);

export async function fetchThermalHotspots(): Promise<ThermalHotspot[]> {
  const thermalCached = thermalCache.get();
  if (thermalCached) return thermalCached;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(
      'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv',
      { headers: { 'User-Agent': 'WARROOM-Dashboard/1.0' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`FIRMS HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return thermalCache.get() || [];
    const header = lines[0].split(',');
    const latIdx = header.indexOf('latitude');
    const lngIdx = header.indexOf('longitude');
    const briIdx = header.indexOf('bright_ti4');
    const frpIdx = header.indexOf('frp');
    const confIdx = header.indexOf('confidence');
    const satIdx = header.indexOf('satellite');
    const dateIdx = header.indexOf('acq_date');
    const timeIdx = header.indexOf('acq_time');
    const dnIdx = header.indexOf('daynight');

    const hotspots: ThermalHotspot[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < header.length) continue;
      const lat = parseFloat(cols[latIdx]);
      const lng = parseFloat(cols[lngIdx]);
      if (lat < 12 || lat > 42 || lng < 24 || lng > 63) continue;
      const confRaw = (cols[confIdx] || '').toLowerCase().trim();
      const confidence: 'low' | 'nominal' | 'high' = confRaw === 'high' ? 'high' : confRaw === 'nominal' ? 'nominal' : 'low';
      hotspots.push({
        id: `th-${i}`,
        lat, lng,
        brightness: parseFloat(cols[briIdx]) || 0,
        frp: parseFloat(cols[frpIdx]) || 0,
        confidence,
        satellite: cols[satIdx] || 'N20',
        instrument: 'VIIRS',
        acqDate: cols[dateIdx] || '',
        acqTime: cols[timeIdx] || '',
        dayNight: (cols[dnIdx] || 'D').trim() as 'D' | 'N',
      });
    }
    thermalCache.set(hotspots);
    console.log(`[FIRMS] Fetched ${hotspots.length} thermal hotspots in MENA region`);
    return hotspots;
  } catch (err) {
    console.error('[FIRMS] Fetch error:', err);
    return thermalCache.get() || [];
  }
}

const cyberCache = new TtlCache<CyberEvent[]>(10_000);

const CYBER_RSS_FEEDS = [
  'https://cyberscoop.com/feed/',
  'https://feeds.feedburner.com/TheHackersNews',
  'https://therecord.media/feed/',
  'https://www.darkreading.com/rss.xml',
  'https://unit42.paloaltonetworks.com/feed/',
  'https://blog.checkpoint.com/feed/',
  'https://securelist.com/feed/',
  'https://cybershafarat.com/feed/',
];

const ME_COUNTRIES = new Set([
  'iran', 'israel', 'palestine', 'palestinian', 'lebanon', 'syria', 'iraq',
  'saudi arabia', 'uae', 'united arab emirates', 'qatar', 'bahrain', 'kuwait',
  'oman', 'yemen', 'jordan', 'egypt', 'turkey', 'libya', 'tunisia', 'morocco',
  'afghanistan', 'pakistan', 'gaza', 'west bank',
]);

const ME_APT_KEYWORDS = [
  'apt33', 'apt34', 'apt35', 'apt39', 'apt42', 'elfin', 'oilrig', 'oil rig',
  'charming kitten', 'muddywater', 'muddy water', 'moses staff', 'agrius',
  'phosphorus', 'imperial kitten', 'scarred manticore', 'lebanese cedar',
  'gaza cybergang', 'molerats', 'arid viper', 'sidewinder', 'copykittens',
  'volatile cedar', 'iran', 'israel', 'hezbollah', 'hamas', 'irgc',
  'persian', 'tehran', 'tel aviv', 'riyadh', 'saudi', 'qatar', 'bahrain',
  'emirati', 'dubai', 'abu dhabi', 'ankara', 'turkish', 'kurdish',
  'middle east', 'mena', 'gulf', 'levant',
];

function isMERelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return ME_APT_KEYWORDS.some(kw => lower.includes(kw));
}

const ME_COUNTRY_ALIASES: Record<string, string> = {
  'ksa': 'saudi arabia', 'u.a.e.': 'uae', 'united arab emirates': 'uae',
  'iran, islamic republic of': 'iran', 'republic of turkey': 'turkey',
  'türkiye': 'turkey', 'turkiye': 'turkey', 'state of palestine': 'palestine',
  'hashemite kingdom of jordan': 'jordan', 'arab republic of egypt': 'egypt',
  'republic of iraq': 'iraq', 'syrian arab republic': 'syria',
  'republic of lebanon': 'lebanon', 'republic of yemen': 'yemen',
};

function isMECountry(country: string): boolean {
  const lower = country.toLowerCase().trim();
  return ME_COUNTRIES.has(lower) || ME_COUNTRIES.has(ME_COUNTRY_ALIASES[lower] || '');
}

async function fetchCyberRSSArticles(): Promise<Array<{ title: string; description: string; pubDate: string; link: string }>> {
  const results: Array<{ title: string; description: string; pubDate: string; link: string }> = [];
  await Promise.allSettled(CYBER_RSS_FEEDS.map(async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return;
      const xml = await res.text();
      const items = xml.split(/<item[\s>]/i).slice(1);
      for (const item of items.slice(0, 15)) {
        const cdataTitle = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1];
        const plainTitle = item.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
        const title = (cdataTitle || plainTitle || '').replace(/<[^>]+>/g, '').trim();
        const cdataDesc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1];
        const plainDesc = item.match(/<description>([\s\S]*?)<\/description>/i)?.[1];
        const description = (cdataDesc || plainDesc || '').replace(/<[^>]+>/g, '').trim().slice(0, 300);
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
        const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
        if (title.length > 10) results.push({ title, description, pubDate, link });
      }
    } catch {}
  }));
  return results;
}

async function fetchOTXPulses(): Promise<CyberEvent[]> {
  const key = process.env.OTX_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20&page=1', {
      headers: { 'X-OTX-API-KEY': key },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json() as { results?: Array<{ id: string; name: string; description: string; created: string; tags: string[]; targeted_countries: string[]; malware_families: string[] }> };
    const events: CyberEvent[] = [];
    for (const pulse of (json.results || []).slice(0, 15)) {
      const country = pulse.targeted_countries?.[0] || 'Unknown';
      const tags = (pulse.tags || []).join(' ').toLowerCase();
      const type: CyberEvent['type'] =
        tags.includes('ransomware') || tags.includes('malware') ? 'malware' :
        tags.includes('phish') ? 'phishing' :
        tags.includes('ddos') ? 'ddos' :
        tags.includes('scada') || tags.includes('ics') || tags.includes('ot') ? 'scada' :
        tags.includes('exfil') || tags.includes('data theft') ? 'data_exfil' :
        tags.includes('defac') ? 'defacement' : 'intrusion';
      const sector: CyberEvent['sector'] =
        tags.includes('government') || tags.includes('gov') ? 'government' :
        tags.includes('military') || tags.includes('defense') ? 'military' :
        tags.includes('financial') || tags.includes('bank') ? 'financial' :
        tags.includes('energy') || tags.includes('oil') || tags.includes('gas') ? 'energy' :
        tags.includes('telecom') ? 'telecom' :
        tags.includes('media') ? 'media' : 'infrastructure';
      events.push({
        id: `otx_${pulse.id.slice(0, 8)}`,
        type, target: pulse.name.slice(0, 60),
        attacker: pulse.malware_families?.[0] || undefined,
        severity: tags.includes('critical') ? 'critical' : tags.includes('high') ? 'high' : tags.includes('low') ? 'low' : 'medium',
        sector, country,
        timestamp: pulse.created,
        description: (pulse.description || pulse.name).slice(0, 200),
      });
    }
    console.log(`[CYBER] OTX returned ${events.length} pulses`);
    return events;
  } catch {
    return [];
  }
}

export async function fetchCyberEvents(): Promise<CyberEvent[]> {
  const cyberCached = cyberCache.get();
  if (cyberCached) return cyberCached;
  try {
    const [articles, otxEvents] = await Promise.all([fetchCyberRSSArticles(), fetchOTXPulses()]);
    const otxME = otxEvents.filter(e => isMECountry(e.country) || isMERelevant(e.target + ' ' + (e.attacker || '') + ' ' + e.description));
    const merged = [...otxME];
    const seen = new Set<string>();
    const deduped = merged.filter(e => {
      const key = e.target.toLowerCase().slice(0, 20);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);
    console.log(`[CYBER] ME-filtered: ${deduped.length} events (OTX ME: ${otxME.length})`);
    cyberCache.set(deduped);
    return deduped;
  } catch (err) {
    console.error('[CYBER] Fetch error:', err instanceof Error ? err.message : err);
    return cyberCache.get() || [];
  }
}

export async function fetchGDELTConflictEvents(fetchOrefAlerts: () => Promise<import("@shared/schema").RedAlert[]>): Promise<ConflictEvent[]> {
  const cached = gdeltCache.get();
  if (cached) return cached;

  const events: ConflictEvent[] = [];

  try {
    const redAlerts = await fetchOrefAlerts();
    for (let i = 0; i < redAlerts.length; i++) {
      const alert = redAlerts[i];
      if (!alert.lat || !alert.lng) continue;
      events.push({
        id: `alert_${alert.id}`,
        type: alert.threatType === 'rockets' ? 'missile' : alert.threatType === 'missiles' ? 'missile' : alert.threatType === 'uav_intrusion' ? 'airstrike' : 'defense',
        lat: alert.lat, lng: alert.lng,
        title: alert.city,
        description: `Active alert: ${alert.threatType} - ${alert.region}`,
        timestamp: alert.timestamp,
        severity: alert.countdown <= 15 ? 'critical' : alert.countdown <= 45 ? 'high' : 'medium',
      });
    }
  } catch {}

  try {
    if (latestTgMsgs.length > 0) {
      const groundEvents = extractLebanonGroundEvents(latestTgMsgs);
      events.push(...groundEvents);
      if (groundEvents.length > 0) console.log(`[GROUND] ${groundEvents.length} Lebanon ground events from Telegram`);
    }
  } catch {}

  try {
    const hotspots = await fetchThermalHotspots();
    const recentHotspots = hotspots
      .filter(h => {
        const ts = new Date(`${h.acqDate}T${String(h.acqTime).padStart(4, '0').slice(0, 2)}:${String(h.acqTime).padStart(4, '0').slice(2)}:00Z`).getTime();
        return !isNaN(ts) && Date.now() - ts < 48 * 3600 * 1000;
      })
      .slice(0, 40);
    for (let i = 0; i < recentHotspots.length; i++) {
      const h = recentHotspots[i];
      const ts = new Date(`${h.acqDate}T${String(h.acqTime).padStart(4, '0').slice(0, 2)}:${String(h.acqTime).padStart(4, '0').slice(2)}:00Z`).toISOString();
      const confLabel = h.confidence === 'high' ? 'HIGH' : h.confidence === 'nominal' ? 'NOM' : 'LOW';
      events.push({
        id: `thermal_${h.lat.toFixed(3)}_${h.lng.toFixed(3)}_${i}`,
        type: 'airstrike',
        lat: h.lat, lng: h.lng,
        title: `Thermal anomaly (${confLabel} confidence)`,
        description: `NASA FIRMS satellite detection - ${h.brightness.toFixed(0)}K brightness, ${h.frp.toFixed(1)} MW FRP`,
        timestamp: ts,
        severity: h.confidence === 'high' ? 'high' : h.confidence === 'nominal' ? 'medium' : 'low',
      });
    }
  } catch {}

  try {
    const query = encodeURIComponent('(missile OR airstrike OR attack OR military) (Israel OR Iran OR Lebanon OR Syria OR Gaza)');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json&sort=datedesc&timespan=24h`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = await resp.json() as { articles?: Array<{ title: string; seendate: string; domain: string; sourcecountry?: string }> };
      if (data.articles) {
        for (let i = 0; i < data.articles.length; i++) {
          const article = data.articles[i];
          const coords = geocodeFromTitle(article.title);
          if (!coords) continue;
          const type = classifyGDELTEventType(article.title);
          const severity = classifyGDELTSeverity(-3, article.title);
          const ts = article.seendate
            ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString()
            : new Date().toISOString();
          events.push({
            id: `gdelt_${i}`, type,
            lat: coords.lat, lng: coords.lng,
            title: article.title.length > 80 ? article.title.substring(0, 77) + '...' : article.title,
            description: `Source: ${article.domain} | ${article.sourcecountry || 'International'}`,
            timestamp: ts, severity,
          });
        }
        console.log(`[GDELT] Fetched ${data.articles.length} articles`);
      }
    }
  } catch {
    console.log('[GDELT] API unavailable, using other real sources');
  }

  const seen = new Set<string>();
  const deduped = events.filter(e => {
    const key = `${e.lat.toFixed(2)}_${e.lng.toFixed(2)}_${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  gdeltCache.set(deduped);
  mergeIntoHistory(deduped);
  const counts = {
    alerts: events.filter(e => e.id.startsWith('alert_')).length,
    thermal: events.filter(e => e.id.startsWith('thermal_')).length,
    gdelt: events.filter(e => e.id.startsWith('gdelt_')).length,
  };
  console.log(`[EVENTS] ${deduped.length} real conflict events (alerts: ${counts.alerts}, thermal: ${counts.thermal}, gdelt: ${counts.gdelt})`);
  return deduped;
}

export function clearCache(): void {
  gdeltCache.clear();
  thermalCache.clear();
  cyberCache.clear();
}
