import type { RedAlert, RocketStats, RocketCorridor, NewsItem, TelegramMessage } from "@shared/schema";
import { TtlCache } from "../lib/cache";
import { alertHistory, latestAlerts, classifiedMessageCache } from "../lib/shared-state";
import { sanitizeText } from "../lib/utils";
import { fetchNewsAPI, fetchGNews, fetchMediastack, fetchFreeNewsRSS } from "./news";

const rocketStatsCache = new TtlCache<RocketStats>(20_000);

const ORIGIN_INFERENCE_MAP: Record<string, { origin: string; originCountry: string }> = {
  'Upper Galilee':      { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Western Galilee':    { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Galil Elyon':        { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'HaGalil HaElyon':   { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Kiryat Shmona':      { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Nahariya':           { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Metula':             { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Safed':              { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Haifa':              { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Haifa Bay':          { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Acre':               { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Krayot':             { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Dan':                { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Confrontation Line': { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Northern District':  { origin: 'Hezbollah (Iran Proxy)', originCountry: 'Lebanon' },
  'Gaza Envelope':      { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Sderot':             { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Ashkelon':           { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Ashdod':             { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Netivot':            { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Ofakim':             { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Eshkol':             { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Sha\'ar HaNegev':  { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Sdot Negev':         { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Hof Ashkelon':       { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Be\'er Sheva':     { origin: 'Hamas / PIJ (Gaza)', originCountry: 'Palestine' },
  'Tel Aviv':           { origin: 'Iran IRGC / Houthis (Ballistic)', originCountry: 'Iran' },
  'Gush Dan':           { origin: 'Iran IRGC / Houthis (Ballistic)', originCountry: 'Iran' },
  'Sharon':             { origin: 'Iran IRGC / Houthis (Ballistic)', originCountry: 'Iran' },
  'Jerusalem':          { origin: 'Iran IRGC / Houthis (Ballistic)', originCountry: 'Iran' },
  'Negev':              { origin: 'Houthis / Ansar Allah (Iran Proxy)', originCountry: 'Yemen' },
  'Eilat':              { origin: 'Houthis / Ansar Allah (Iran Proxy)', originCountry: 'Yemen' },
  'Arava':              { origin: 'Houthis / Ansar Allah (Iran Proxy)', originCountry: 'Yemen' },
  'Red Sea':            { origin: 'Houthis / Ansar Allah (Iran Proxy)', originCountry: 'Yemen' },
  'Golan Heights':      { origin: 'Iran-backed Syrian Militias', originCountry: 'Syria' },
  'Golan':              { origin: 'Iran-backed Syrian Militias', originCountry: 'Syria' },
  'Jordan Valley':      { origin: 'Iraqi Islamic Resistance (Iran Proxy)', originCountry: 'Iraq' },
  'South Lebanon':      { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Beirut':             { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Dahieh':             { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Tyre':               { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Sidon':              { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Baalbek':            { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Bekaa':              { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Nabatieh':           { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Damascus':           { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Aleppo':             { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Sanaa':              { origin: 'US-led Coalition (Op. Rough Rider)', originCountry: 'United States' },
  'Hodeidah':           { origin: 'US-led Coalition (Op. Rough Rider)', originCountry: 'United States' },
  'Tehran':             { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Isfahan':            { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Baghdad':            { origin: 'US-led Coalition', originCountry: 'United States' },
  'Rafah':              { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Khan Younis':        { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Gaza City':          { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Jabalia':            { origin: 'Israel (IDF)', originCountry: 'Israel' },
  'Deir al-Balah':      { origin: 'Israel (IDF)', originCountry: 'Israel' },
};

function inferOrigin(alert: RedAlert): { origin: string; originCountry: string } {
  const region = alert.region || '';
  const city = alert.city || '';
  const country = alert.country || '';

  if (ORIGIN_INFERENCE_MAP[city]) return ORIGIN_INFERENCE_MAP[city];
  if (ORIGIN_INFERENCE_MAP[region]) return ORIGIN_INFERENCE_MAP[region];

  for (const [key, val] of Object.entries(ORIGIN_INFERENCE_MAP)) {
    if (region.toLowerCase().includes(key.toLowerCase()) || city.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }

  if (country === 'Israel') {
    if (alert.threatType === 'hostile_aircraft_intrusion' || alert.threatType === 'uav_intrusion') {
      return { origin: 'Hezbollah / Iran (UAV)', originCountry: 'Lebanon' };
    }
    return { origin: 'Iran Proxy Network (Multi-Front)', originCountry: 'Iran' };
  }
  if (country === 'Lebanon') return { origin: 'Israel (IDF)', originCountry: 'Israel' };
  if (country === 'Syria') return { origin: 'Israel (IDF)', originCountry: 'Israel' };
  if (country === 'Yemen') return { origin: 'US-led Coalition (Op. Rough Rider)', originCountry: 'United States' };
  if (country === 'Iran') return { origin: 'Israel (IDF)', originCountry: 'Israel' };
  if (country === 'Iraq') return { origin: 'US-led Coalition', originCountry: 'United States' };

  return { origin: 'Unknown', originCountry: 'Unknown' };
}

export function generateRocketStats(): RocketStats {
  const rocketCached = rocketStatsCache.get();
  if (rocketCached) {
    return rocketCached;
  }

  const now = Date.now();
  const alerts = alertHistory.length > 0 ? alertHistory : [];
  const corridorMap: Record<string, RocketCorridor> = {};
  const totalByOrigin: Record<string, number> = {};
  const totalByTarget: Record<string, number> = {};
  const byThreatType: Record<string, number> = {};
  const hourBuckets: Record<string, number> = {};

  const rocketTypes = new Set(['rockets', 'missiles', 'hostile_aircraft_intrusion', 'uav_intrusion']);

  for (const alert of alerts) {
    if (!rocketTypes.has(alert.threatType)) continue;
    const { origin, originCountry } = inferOrigin(alert);
    const targetRegion = alert.region || alert.city || alert.country || 'Unknown';
    const targetCountry = alert.country || 'Unknown';
    const corridorKey = `${origin}\u2192${targetRegion}`;

    if (!corridorMap[corridorKey]) {
      corridorMap[corridorKey] = {
        origin,
        originCountry,
        target: targetRegion,
        targetCountry,
        totalAlerts: 0,
        rockets: 0,
        missiles: 0,
        drones: 0,
        lastAlert: alert.timestamp,
        threatTypes: [],
        active: false,
      };
    }
    const c = corridorMap[corridorKey];
    c.totalAlerts++;
    if (alert.threatType === 'rockets') c.rockets++;
    else if (alert.threatType === 'missiles') c.missiles++;
    else if (alert.threatType === 'uav_intrusion' || alert.threatType === 'hostile_aircraft_intrusion') c.drones++;

    if (!c.threatTypes.includes(alert.threatType)) c.threatTypes.push(alert.threatType);
    if (new Date(alert.timestamp) > new Date(c.lastAlert)) c.lastAlert = alert.timestamp;

    const ageMs = now - new Date(alert.timestamp).getTime();
    if (ageMs < 3600000) c.active = true;

    totalByOrigin[origin] = (totalByOrigin[origin] || 0) + 1;
    totalByTarget[targetRegion] = (totalByTarget[targetRegion] || 0) + 1;
    byThreatType[alert.threatType] = (byThreatType[alert.threatType] || 0) + 1;

    const alertHour = new Date(alert.timestamp).getUTCHours().toString().padStart(2, '0') + ':00';
    hourBuckets[alertHour] = (hourBuckets[alertHour] || 0) + 1;
  }

  const corridors = Object.values(corridorMap).sort((a, b) => b.totalAlerts - a.totalAlerts);
  const totalAlerts = corridors.reduce((s, c) => s + c.totalAlerts, 0);
  const activeFronts = new Set(corridors.filter(c => c.active).map(c => `${c.originCountry}\u2192${c.targetCountry}`)).size;

  const peakHour = Object.entries(hourBuckets).sort(([, a], [, b]) => b - a)[0]?.[0] || '\u2014';

  const last24h = alerts.filter(a => rocketTypes.has(a.threatType) && now - new Date(a.timestamp).getTime() < 86400000).length;
  const last1h = alerts.filter(a => rocketTypes.has(a.threatType) && now - new Date(a.timestamp).getTime() < 3600000).length;

  const stats: RocketStats = {
    corridors,
    totalByOrigin,
    totalByTarget,
    totalAlerts,
    byThreatType,
    peakHour,
    activeFronts,
    last24h,
    last1h,
    generatedAt: new Date().toISOString(),
  };

  rocketStatsCache.set(stats);
  return stats;
}

const conflictFeedCache = new TtlCache<Record<string, unknown>[]>(15_000);

const GCC_KEYWORDS = [
  'saudi', 'riyadh', 'jizan', 'najran', 'khamis mushait', 'abha', 'jeddah', 'mecca', 'medina',
  'dammam', 'dhahran', 'jubail', 'yanbu', 'tabuk', 'al-qatif', 'aramco', 'sabic', 'ras tanura',
  'uae', 'abu dhabi', 'dubai', 'sharjah', 'fujairah', 'al ain', 'ras al khaimah',
  'kuwait', 'kuwait city', 'bahrain', 'manama', 'muharraq',
  'qatar', 'doha', 'al udeid', 'oman', 'muscat', 'salalah', 'sohar', 'masirah',
  'gcc', 'gulf', 'gulf state', 'arabian gulf', 'strait of hormuz', 'persian gulf',
];
const LEBANON_KEYWORDS = [
  'lebanon', 'lebanese', 'beirut', 'hezbollah', 'hizballah', 'hizb allah',
  'south lebanon', 'southern lebanon', 'nabatieh', 'baalbek', 'tyre', 'sour', 'sidon', 'saida',
  'tripoli leb', 'byblos', 'jounieh', 'zahle', 'hermel', 'akkar', 'chouf',
  'unifil', 'litani', 'bekaa', 'beqaa', 'nasrallah', 'naim qassem',
  'bint jbeil', 'marjayoun', 'khiam', 'naqoura', 'kfar kila', 'mays al-jabal',
  'dahieh', 'dahiyeh', 'southern suburb', 'amal movement', 'laad', 'radwan',
];
const YEMEN_KEYWORDS = [
  'yemen', 'yemeni', 'houthi', 'houthis', 'ansarallah', 'ansar allah', 'ansar al-allah',
  'hodeidah', 'hudaydah', 'hodeida', 'sanaa', "sana'a", 'aden', 'taiz', 'marib', 'marib',
  'shabwa', 'lahij', 'al-bayda', 'zinjibar', 'al-hazm', 'dhamar', 'ibb', 'al-mukalla',
  'bab el-mandeb', 'bab-el-mandeb', 'mandab', 'red sea attack', 'red sea drone',
  'gulf of aden', 'socotra', 'hussein al-houthi', 'abdulmalik al-houthi',
  'islamic resistance in iraq', 'houthi missile', 'houthi drone', 'ballistic houthi',
];
const SYRIA_KEYWORDS = [
  'syria', 'syrian', 'damascus', 'aleppo', 'idlib', 'deir ez-zor', 'deir ezzor', 'derazor',
  'raqqa', 'daraa', 'homs', 'hama', 'latakia', 'tartus', 'quneitra', 'suweida', 'suwayda',
  'qamishli', 'kobane', 'ain al-arab', 'manbij', 'afrin', 'euphrates', 'palmyra', 'abu kamal',
  'sdf', 'ypg', 'isis', 'isil', 'daesh', 'hayat tahrir', 'hts', 'jabhat al-nusra',
  'hnc', 'saa', 'ndf', 'wagner syria', 'iran-backed syria',
];
const IRAQ_KEYWORDS = [
  'iraq', 'iraqi', 'baghdad', 'mosul', 'basra', 'kirkuk', 'erbil', 'irbil', 'sulaymaniyah',
  'fallujah', 'ramadi', 'tikrit', 'samarra', 'diyala', 'baquba', 'taji', 'karbala', 'najaf',
  'anbar', 'al-asad airbase', 'ain al-asad', 'habaniyah', 'tuz khurmatu',
  'pmu', 'pmf', 'kataib hezbollah', 'kataib', 'hashd', 'popular mobilization',
  'islamic resistance in iraq', 'asa\'ib ahl al-haq', 'harakat hezbollah', 'badr organization',
  'kurdistan', 'peshmerga', 'pkk iraq',
];
const EGYPT_KEYWORDS = [
  'egypt', 'egyptian', 'cairo', 'sinai', 'north sinai', 'south sinai',
  'rafah crossing', 'kerem shalom', 'arish', 'sheikh zuweid', 'bir al-abed',
  'suez', 'suez canal', 'port said', 'ismailia', 'suez city',
  'luxor', 'aswan', 'sharm el-sheikh', 'dahab',
];
const JORDAN_KEYWORDS = [
  'jordan', 'jordanian', 'amman', 'aqaba', 'zarqa', 'irbid', 'mafraq',
  'azraq', 'ruwaished', 'al-mafraq', 'karak', 'petra', 'wadi rum',
  'hashemite', 'arab legion', 'jaf (jordan)',
];
const IRAN_KEYWORDS = [
  'iran', 'iranian', 'tehran', 'isfahan', 'natanz', 'fordow', 'arak', 'bushehr', 'kharg',
  'irgc', 'revolutionary guard', 'sepah', 'quds force', 'qods force', 'soleimani',
  'khamenei', 'raisi', 'pezeshkian', 'zarif', 'shamkhani',
  'persian gulf iran', 'strait of hormuz iran', 'nuclear iran', 'iran nuclear',
  'iran missile', 'iran drone', 'iran attack', 'iran proxy', 'iran-backed',
  'shahab', 'emad', 'sejjil', 'kheibar', 'fateh', 'zolfaghar', 'fattah hypersonic',
  'mohajer', 'shahed', 'arash drone', 'qaem',
];
const ATTACK_KEYWORDS = [
  'rocket', 'missile', 'drone', 'uav', 'strike', 'attack', 'launch', 'intercept',
  'barrage', 'salvo', 'ballistic', 'airstrike', 'air strike', 'bombing', 'bomb',
  'shelling', 'shell', 'killed', 'dead', 'wounded', 'casualties', 'death toll',
  'raid', 'offensive', 'explosion', 'blast', 'fire', 'hit', 'struck', 'destroy',
  'artillery', 'mortar', 'infiltration', 'breach', 'clash', 'operation', 'incursion',
  'engagement', 'combat', 'targeted', 'assassination', 'liquidate', 'eliminate',
  'naval attack', 'ship attack', 'vessel attack', 'tanker seized', 'tanker hit',
  'ambush', 'hostage', 'abduct', 'capture', 'cross-border', 'cross border',
];

const NORTH_ISRAEL_BORDER_CITIES = [
  'Kiryat Shmona', 'Metula', 'Shlomi', 'Nahariya', 'Avivim', 'Rosh Hanikra',
  'Maalot-Tarshiha', 'Karmiel', 'Safed', 'Tzfat', 'Acre', 'Akko', 'Haifa',
  'Beit Hillel', 'Manara', 'Margaliot', 'Yiftah', 'Ramot Naftali', 'Dishon',
  'Yiron', 'Jish', 'Fassouta', 'Arab al-Aramshe', 'Sasa', 'Hurfeish',
  'Peki\'in', 'Tarshiha', 'Kabul', 'Shfaram', 'Majd al-Krum',
  'Golan Heights', '\u05d4\u05e8 \u05d3\u05d1', '\u05db\u05e8\u05de\u05d9\u05d0\u05dc', '\u05e7\u05e8\u05d9\u05d9\u05ea \u05e9\u05de\u05d5\u05e0\u05d4', '\u05de\u05d8\u05d5\u05dc\u05d4', '\u05e9\u05dc\u05d5\u05de\u05d9', '\u05e0\u05d4\u05e8\u05d9\u05d4',
];

function classifyConflictFeedItem(title: string): { attackType: string; relevance: string; threatLevel: 'high' | 'medium' | 'low' } {
  const lo = title.toLowerCase();
  const isGCC     = GCC_KEYWORDS.some(k => lo.includes(k));
  const isLebanon = LEBANON_KEYWORDS.some(k => lo.includes(k));
  const isYemen   = YEMEN_KEYWORDS.some(k => lo.includes(k));
  const isSyria   = SYRIA_KEYWORDS.some(k => lo.includes(k));
  const isIraq    = IRAQ_KEYWORDS.some(k => lo.includes(k));
  const isEgypt   = EGYPT_KEYWORDS.some(k => lo.includes(k));
  const isJordan  = JORDAN_KEYWORDS.some(k => lo.includes(k));
  const isIran    = IRAN_KEYWORDS.some(k => lo.includes(k));

  let relevance = 'general';
  if (isLebanon) relevance = 'lebanon';
  else if (isYemen) relevance = 'yemen';
  else if (isIran) relevance = 'iran';
  else if (isIraq) relevance = 'iraq';
  else if (isSyria) relevance = 'syria';
  else if (isGCC) relevance = 'gcc';
  else if (isEgypt) relevance = 'egypt';
  else if (isJordan) relevance = 'jordan';

  if (isYemen && isGCC) relevance = 'gcc';
  if (isLebanon && isGCC) relevance = 'both';
  if (isIran && isGCC) relevance = 'iran';
  if (isIran && isLebanon) relevance = 'lebanon';
  if (isIran && isIraq) relevance = 'iraq';

  let attackType = 'other';
  if (/drone|uav|shahed|shaheed|kamikaze|loitering|tb2|bayraktar|mohajer|arash/i.test(lo)) attackType = 'drone';
  else if (/ballistic|cruise|hypersonic|qassam|katyusha|grad|fattah|sejjil|emad|kheibar|zolfaghar|shahab/i.test(lo)) attackType = 'missile';
  else if (/rocket|mortar|rpg|grad|rl burst/i.test(lo)) attackType = 'rocket';
  else if (/airstrike|air strike|air raid|bombing|warplane|jet|f-35|f-16|f-15|f-18|su-35|apache|helicopter gunship/i.test(lo)) attackType = 'airstrike';
  else if (/naval|ship|vessel|destroyer|frigate|tanker|cargo|corvette|submarine|speedboat|maritime/i.test(lo)) attackType = 'naval';
  else if (/artillery|shelling|cannon|howitzer|grad mlrs/i.test(lo)) attackType = 'artillery';
  else if (/missile/i.test(lo)) attackType = 'missile';

  let threatLevel: 'high' | 'medium' | 'low' = 'low';
  const highWords = /killed|dead|casualties|death toll|wounded|ballistic|nuclear|massive barrage|dozens|hundreds|explosion|blast|destroyed|struck|hypersonic|warship|tanker seized/i;
  const medWords  = /rocket|missile|drone|airstrike|attack|launch|intercept|barrage|shelling|infiltr|clash|raid|offensive/i;
  if (highWords.test(lo)) threatLevel = 'high';
  else if (medWords.test(lo)) threatLevel = 'medium';

  return { attackType, relevance, threatLevel };
}

function buildLebanonSirenItems(): any[] {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  const borderAlerts = (alertHistory.length > 0 ? alertHistory : latestAlerts)
    .filter(a => {
      const ts = new Date(a.timestamp).getTime();
      if (ts < cutoff) return false;
      const city = a.city || '';
      const region = a.region || '';
      return NORTH_ISRAEL_BORDER_CITIES.some(bc =>
        city.includes(bc) || region.includes(bc) || bc.includes(city)
      );
    });

  const grouped: RedAlert[][] = [];
  const sorted = [...borderAlerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  for (const alert of sorted) {
    const ts = new Date(alert.timestamp).getTime();
    const last = grouped[grouped.length - 1];
    if (last && ts - new Date(last[0].timestamp).getTime() < 3 * 60 * 1000) {
      last.push(alert);
    } else {
      grouped.push([alert]);
    }
  }

  return grouped.map((group, i) => {
    const first = group[0];
    const cities = [...new Set(group.map(a => a.city).filter(Boolean))].slice(0, 3);
    const threatType = first.threatType || 'rockets';
    const attackType = threatType.includes('uav') ? 'drone' : threatType.includes('missile') ? 'missile' : 'rocket';
    const cityList = cities.join(', ') || first.region || 'Northern Israel';
    return {
      id: `siren_border_${first.id || i}`,
      title: `\ud83d\udea8 Hezbollah ${attackType === 'drone' ? 'drone' : attackType === 'missile' ? 'missile' : 'rocket'} attack: ${cityList} (northern Israel border)`,
      source: 'Tzeva Adom (Live Siren)',
      url: undefined,
      timestamp: first.timestamp,
      attackType,
      relevance: 'lebanon',
      isSiren: true,
      cities,
      count: group.length,
    };
  }).reverse();
}

const REGIONAL_RSS_FEEDS = [
  { url: 'https://www.naharnet.com/stories/en/rss.xml', source: 'Naharnet' },
  { url: 'https://today.lorientlejour.com/rss', source: "L'Orient Today" },
  { url: 'https://news.google.com/rss/search?q=hezbollah+attack+rocket+missile+lebanon&hl=en-US&gl=US&ceid=US:en', source: 'GN: Hezbollah' },
  { url: 'https://news.google.com/rss/search?q=south+lebanon+IDF+airstrike+killed&hl=en-US&gl=US&ceid=US:en', source: 'GN: S.Lebanon' },
  { url: 'https://news.google.com/rss/search?q=beirut+explosion+strike+hezbollah&hl=en-US&gl=US&ceid=US:en', source: 'GN: Beirut' },
  { url: 'https://news.google.com/rss/search?q=houthi+attack+missile+drone+red+sea+ship&hl=en-US&gl=US&ceid=US:en', source: 'GN: Houthi' },
  { url: 'https://news.google.com/rss/search?q=ansarallah+launch+strike+ballistic&hl=en-US&gl=US&ceid=US:en', source: 'GN: Ansar Allah' },
  { url: 'https://news.google.com/rss/search?q=yemen+airstrike+killed+US+coalition+strike&hl=en-US&gl=US&ceid=US:en', source: 'GN: Yemen Strikes' },
  { url: 'https://news.google.com/rss/search?q=red+sea+ship+attack+tanker+drone+houthi&hl=en-US&gl=US&ceid=US:en', source: 'GN: Red Sea' },
  { url: 'https://news.google.com/rss/search?q=bab+el-mandeb+gulf+aden+maritime+attack&hl=en-US&gl=US&ceid=US:en', source: 'GN: Gulf of Aden' },
  { url: 'https://www.syriahr.com/en/feed/', source: 'SOHR (Syria)' },
  { url: 'https://news.google.com/rss/search?q=syria+airstrike+attack+killed+military&hl=en-US&gl=US&ceid=US:en', source: 'GN: Syria' },
  { url: 'https://news.google.com/rss/search?q=idlib+deir+ezzor+damascus+strike+explosion&hl=en-US&gl=US&ceid=US:en', source: 'GN: Syria Cities' },
  { url: 'https://news.google.com/rss/search?q=HTS+SDF+ISIS+Syria+offensive+attack&hl=en-US&gl=US&ceid=US:en', source: 'GN: Syria Factions' },
  { url: 'https://news.google.com/rss/search?q=iraq+drone+attack+militia+PMU+PMF&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iraq' },
  { url: 'https://news.google.com/rss/search?q=kataib+hezbollah+islamic+resistance+iraq+attack&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iraq Militia' },
  { url: 'https://news.google.com/rss/search?q=erbil+baghdad+taji+basra+attack+explosion&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iraq Cities' },
  { url: 'https://www.rudaw.net/english/rss', source: 'Rudaw (Kurdistan)' },
  { url: 'https://news.google.com/rss/search?q=saudi+arabia+houthi+attack+missile+drone&hl=en-US&gl=US&ceid=US:en', source: 'GN: KSA-Houthi' },
  { url: 'https://news.google.com/rss/search?q=UAE+attack+drone+security+threat&hl=en-US&gl=US&ceid=US:en', source: 'GN: UAE Security' },
  { url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'The National (UAE)' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya' },
  { url: 'https://www.arabnews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'Arab News (KSA)' },
  { url: 'https://news.google.com/rss/search?q=iran+missile+drone+attack+IRGC+strike&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran Military' },
  { url: 'https://news.google.com/rss/search?q=iran+nuclear+natanz+fordow+sanction&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran Nuclear' },
  { url: 'https://news.google.com/rss/search?q=israel+iran+strike+attack+retaliation&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran-Israel' },
  { url: 'https://www.iranintl.com/en/rss', source: 'Iran International' },
  { url: 'https://news.google.com/rss/search?q=sinai+egypt+attack+explosion+north+sinai&hl=en-US&gl=US&ceid=US:en', source: 'GN: Egypt/Sinai' },
  { url: 'https://news.google.com/rss/search?q=jordan+drone+attack+security+threat&hl=en-US&gl=US&ceid=US:en', source: 'GN: Jordan' },
  { url: 'https://www.middleeasteye.net/rss', source: 'Middle East Eye' },
  { url: 'https://news.google.com/rss/search?q=middle+east+attack+killed+strike+military&hl=en-US&gl=US&ceid=US:en', source: 'GN: ME Attacks' },
  { url: 'https://news.google.com/rss/search?q=IDF+strike+Gaza+West+Bank+Rafah+killed&hl=en-US&gl=US&ceid=US:en', source: 'GN: IDF Ops' },
];

const regionalRssCache = new TtlCache<Record<string, unknown>[]>(60_000);

async function fetchRegionalRSS(): Promise<Record<string, unknown>[]> {
  const rssCached = regionalRssCache.get();
  if (rssCached) {
    return rssCached;
  }
  const items: any[] = [];
  await Promise.allSettled(REGIONAL_RSS_FEEDS.map(async ({ url, source }) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARROOM/2.0; +https://warroom.app)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const entries = xml.split(/<item[\s>]/i).slice(1, 20);
      for (const entry of entries) {
        const cdataTitle = entry.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1];
        const plainTitle = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
        const rawTitle = (cdataTitle || plainTitle || '').replace(/<[^>]+>/g, '').trim();
        if (!rawTitle || rawTitle.length < 12) continue;
        const pubDate = entry.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
        const cdataLink = entry.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i)?.[1];
        const plainLink = entry.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim();
        const guidLink = entry.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/i)?.[1];
        const link = cdataLink || plainLink || guidLink || '';
        let timestamp = new Date().toISOString();
        if (pubDate) { try { timestamp = new Date(pubDate).toISOString(); } catch {} }
        items.push({
          id: `regional_rss_${source}_${items.length}_${Date.now()}`,
          title: rawTitle,
          source,
          url: link || undefined,
          timestamp,
          category: 'military',
        });
      }
    } catch { /* feed unreachable */ }
  }));
  regionalRssCache.set(items);
  return items;
}

export async function fetchLiveConflictFeed(): Promise<any[]> {
  const feedCached = conflictFeedCache.get();
  if (feedCached) {
    return feedCached;
  }

  const sirenItems = buildLebanonSirenItems();

  const [newsR, gnewsR, mediastackR, freeRssR, regionalRssR] = await Promise.allSettled([
    fetchNewsAPI(),
    fetchGNews(),
    fetchMediastack(),
    fetchFreeNewsRSS(),
    fetchRegionalRSS(),
  ]);

  const newsPool = [
    ...(newsR.status === 'fulfilled' ? newsR.value : []),
    ...(gnewsR.status === 'fulfilled' ? gnewsR.value : []),
    ...(mediastackR.status === 'fulfilled' ? mediastackR.value : []),
    ...(freeRssR.status === 'fulfilled' ? freeRssR.value : []),
    ...(regionalRssR.status === 'fulfilled' ? regionalRssR.value : []),
  ];

  let gdeltItems: any[] = [];
  try {
    const gdeltParseDate = (d: string) =>
      new Date(d.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')).toISOString();

    const gdeltQ1 = encodeURIComponent(
      '(rocket OR missile OR drone OR airstrike OR shelling OR killed OR casualties OR explosion) ' +
      '(Yemen OR Houthi OR Lebanon OR Hezbollah OR Syria OR Iraq OR "Saudi Arabia" OR UAE OR Kuwait OR Qatar OR Bahrain OR Oman)'
    );
    const gdeltQ2 = encodeURIComponent(
      '(missile OR drone OR attack OR nuclear OR IRGC OR strike OR killed) ' +
      '(Iran OR Iranian OR Natanz OR Fordow OR IRGC OR "Islamic Republic" OR "Red Sea" OR "Strait of Hormuz")'
    );

    const [gdR1, gdR2] = await Promise.allSettled([
      fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQ1}&mode=artlist&maxrecords=60&format=json&sort=datedesc&timespan=18h&sourcelang=eng`, { signal: AbortSignal.timeout(9000) }),
      fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQ2}&mode=artlist&maxrecords=40&format=json&sort=datedesc&timespan=18h&sourcelang=eng`, { signal: AbortSignal.timeout(9000) }),
    ]);

    const mapGdelt = (r: PromiseSettledResult<Response>, prefix: string) => {
      if (r.status !== 'fulfilled' || !r.value.ok) return Promise.resolve([]);
      return r.value.json().then((j: any) =>
        (j.articles || []).map((a: any, i: number) => ({
          id: `gdelt_${prefix}_${i}_${Date.now()}`,
          title: (a.title || '').replace(/<[^>]+>/g, '').trim(),
          source: a.domain || 'GDELT',
          url: a.url,
          timestamp: a.seendate ? gdeltParseDate(a.seendate) : new Date().toISOString(),
          category: 'military',
        })).filter((a: any) => a.title && a.title.length > 10)
      );
    };

    const [gd1, gd2] = await Promise.all([mapGdelt(gdR1, 'reg'), mapGdelt(gdR2, 'iran')]);
    gdeltItems = [...gd1, ...gd2];
  } catch { /* GDELT timeout */ }

  const ALL_REGIONAL_KEYWORDS = [
    ...GCC_KEYWORDS, ...LEBANON_KEYWORDS, ...YEMEN_KEYWORDS,
    ...SYRIA_KEYWORDS, ...IRAQ_KEYWORDS, ...EGYPT_KEYWORDS, ...JORDAN_KEYWORDS, ...IRAN_KEYWORDS,
  ];
  const combined = [...newsPool, ...gdeltItems];
  const filtered = combined.filter(item => {
    const lo = (item.title || '').toLowerCase();
    const hasAttack = ATTACK_KEYWORDS.some(k => lo.includes(k));
    const isRegional = ALL_REGIONAL_KEYWORDS.some(k => lo.includes(k));
    return hasAttack && isRegional;
  });

  const normalise = (t: string) => t.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
  const seen = new Set<string>();
  const deduped = filtered.filter(item => {
    const key = normalise(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const newsResult = deduped.slice(0, 120).map(item => {
    const { attackType, relevance, threatLevel } = classifyConflictFeedItem(item.title);
    return {
      id: item.id,
      title: sanitizeText(item.title),
      source: item.source,
      url: item.url || undefined,
      timestamp: item.timestamp,
      attackType,
      relevance,
      threatLevel,
      isSiren: false,
    };
  }).filter(item => item.relevance !== 'general');

  const THREAT_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sortItems = (arr: any[]) => arr.sort((a, b) => {
    const tsDiff = (THREAT_SCORE[b.threatLevel] || 1) - (THREAT_SCORE[a.threatLevel] || 1);
    if (tsDiff !== 0) return tsDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const all = [...sirenItems, ...sortItems(newsResult)];

  conflictFeedCache.set(all);
  return all;
}

const attackPredictionCache = new TtlCache<Record<string, unknown>>(25_000);

export function invalidateAttackPredictionCache(): void {
  attackPredictionCache.clear();
}

export async function generateAttackPrediction(): Promise<Record<string, unknown>> {
  const predCached = attackPredictionCache.get();
  if (predCached) return predCached;

  const now = Date.now();
  const alerts = alertHistory.length > 0 ? alertHistory : latestAlerts;

  const last30m  = alerts.filter(a => now - new Date(a.timestamp).getTime() < 30 * 60000);
  const prior30m = alerts.filter(a => { const age = now - new Date(a.timestamp).getTime(); return age >= 30 * 60000 && age < 60 * 60000; });
  const last2h   = alerts.filter(a => now - new Date(a.timestamp).getTime() < 2 * 3600000);
  const last6h   = alerts.filter(a => now - new Date(a.timestamp).getTime() < 6 * 3600000);

  const DECAY = 0.5;
  const regionWeights: Record<string, number> = {};
  const regionTypeMap: Record<string, Record<string, number>> = {};
  const regionRecentCounts: Record<string, number> = {};

  for (const a of last6h) {
    const ageHours = (now - new Date(a.timestamp).getTime()) / 3600000;
    const w = Math.exp(-DECAY * ageHours);
    const region = a.region || a.country || 'Unknown';
    regionWeights[region] = (regionWeights[region] || 0) + w;
    if (!regionTypeMap[region]) regionTypeMap[region] = {};
    regionTypeMap[region][a.threatType] = (regionTypeMap[region][a.threatType] || 0) + 1;
    if (ageHours < 1) regionRecentCounts[region] = (regionRecentCounts[region] || 0) + 1;
  }

  const typeWeights: Record<string, number> = {};
  for (const a of last6h) {
    const ageHours = (now - new Date(a.timestamp).getTime()) / 3600000;
    typeWeights[a.threatType] = (typeWeights[a.threatType] || 0) + Math.exp(-DECAY * ageHours);
  }
  const sortedTypes = Object.entries(typeWeights).sort(([, a], [, b]) => b - a);
  const dominantType = sortedTypes[0]?.[0] || 'unknown';

  const velocity30m = last30m.length;
  const velocity2h  = last2h.length;
  const velocityPerHour = velocity2h / 2;
  const escalationRatio = prior30m.length > 0 ? velocity30m / prior30m.length : (velocity30m >= 3 ? 2.0 : 1.0);
  const isEscalating   = escalationRatio > 1.3 && velocity30m >= 2;
  const isDeescalating = prior30m.length > 0 && velocity30m < prior30m.length * 0.5;

  const sortedRecent = [...last2h].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const intervals: number[] = [];
  for (let i = 1; i < sortedRecent.length; i++) {
    const gap = (new Date(sortedRecent[i].timestamp).getTime() - new Date(sortedRecent[i - 1].timestamp).getTime()) / 60000;
    if (gap > 0.5 && gap < 90) intervals.push(gap);
  }
  const sortedIvl = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIvl.length > 0 ? sortedIvl[Math.floor(sortedIvl.length / 2)] : 20;
  const meanInterval   = intervals.length > 0 ? intervals.reduce((s, v) => s + v, 0) / intervals.length : 20;
  const estInterval = intervals.length >= 4 ? medianInterval * 0.65 + meanInterval * 0.35 : meanInterval;
  const lastAlertTs = sortedRecent.length > 0 ? new Date(sortedRecent[sortedRecent.length - 1].timestamp).getTime() : now - 3600000;
  const minutesSinceLast = (now - lastAlertTs) / 60000;
  const rawEstMin = Math.max(0, Math.round(estInterval - minutesSinceLast));
  const timingLabel = intervals.length === 0 ? 'unknown' : rawEstMin <= 5 ? 'imminent' : rawEstMin <= 20 ? '~15min' : rawEstMin <= 45 ? '~30min' : rawEstMin <= 90 ? '~1h' : rawEstMin <= 150 ? '~2h' : 'unknown';
  const timingBasis = intervals.length >= 3
    ? `Median interval ${medianInterval.toFixed(0)} min from ${intervals.length} gaps; ${minutesSinceLast.toFixed(0)} min since last alert`
    : `Insufficient gap data (${intervals.length} samples); velocity-based estimate`;
  const timingConfidence = Math.min(0.82, (Math.min(intervals.length, 12) / 12) * 0.82);

  const KINETIC_RE = /launch(ed|ing)?|rocket[s]? (fired|launched)|incoming|intercept(ed)?|explosion|strike|impact|siren|alert|salvo|barrage|missile|drone|uav|airstr|attack|hit|bomb/i;
  const REGION_RE: Record<string, RegExp> = {
    'Northern Israel': /northern? israel|galilee|haifa|kiryat|tiberias|nahariya|acre|hadera|afula|beit she|tzfat|safed|upper galilee|north/i,
    'Central Israel': /tel aviv|gush dan|central|ramat|petah tikva|rishon|herzliya|netanya|kfar saba|ra'anana|ben gurion/i,
    'Southern Israel': /south(ern)? israel|negev|ashkelon|ashdod|beer.?sheva|sderot|kibbutz|eshkol|lachish/i,
    'West Bank': /west bank|jenin|nablus|ramallah|hebron|tulkarm|qalqilya|jericho|bethlehem|kalkilya/i,
    'Gaza': /\bgaza\b|rafah|khan younis|beit lahiya|jabalia|deir al.bal|north gaza/i,
    'Lebanon': /\blebanon\b|beirut|southern lebanon|litani|dahiy|bekaa|nabatieh|tyre|sidon|baalbek|south leb/i,
    'Yemen': /\byemen\b|houthi|sanaa|aden|red sea|bab el.?mandeb|hodeidah/i,
    'Syria': /\bsyria\b|damascus|aleppo|deir ez.?zor|homs|idlib/i,
    'Iraq': /\biraq\b|baghdad|erbil|mosul|basra/i,
  };

  const intelRegionBoost: Record<string, number> = {};
  const twoHoursAgo = now - 2 * 3600000;

  for (const m of classifiedMessageCache) {
    const msgTime = new Date(m.timestamp).getTime();
    if (msgTime < twoHoursAgo) continue;
    const ageHours = (now - msgTime) / 3600000;
    const msgWeight = Math.exp(-DECAY * ageHours);
    const sevMult = m.classification?.severity === 'critical' ? 1.5 : m.classification?.severity === 'high' ? 1.0 : 0.4;
    const isKinetic = KINETIC_RE.test(m.text);
    for (const [region, re] of Object.entries(REGION_RE)) {
      if (re.test(m.text)) {
        const boost = msgWeight * sevMult * (isKinetic ? 1.3 : 0.6);
        intelRegionBoost[region] = (intelRegionBoost[region] || 0) + boost;
      }
    }
  }

  const allRegions = new Set([...Object.keys(regionWeights), ...Object.keys(intelRegionBoost)]);
  const maxAlertW = Math.max(1e-9, ...Object.values(regionWeights));
  const maxIntelW = Math.max(1e-9, ...Object.values(intelRegionBoost));
  const combinedScores: Record<string, number> = {};
  for (const region of allRegions) {
    const aScore = (regionWeights[region] || 0) / maxAlertW;
    const iScore = (intelRegionBoost[region] || 0) / maxIntelW;
    combinedScores[region] = aScore * 0.70 + iScore * 0.30;
  }
  const sortedRegions = Object.entries(combinedScores)
    .filter(([r, s]) => s > 0.01 && r !== 'Unknown Region' && r !== 'Unknown')
    .sort(([, a], [, b]) => b - a);

  const CHAINS: Record<string, string[]> = {
    rockets:   ['rockets', 'missiles', 'airstrike'],
    uav:       ['uav', 'airstrike', 'missiles'],
    missiles:  ['missiles', 'airstrike', 'rockets'],
    airstrike: ['airstrike', 'missiles', 'uav'],
    mortar:    ['mortar', 'rockets', 'ground'],
    anti_tank: ['anti_tank', 'ground', 'rockets'],
  };

  const COUNTRY_MAP: Record<string, { code: string; flag: string }> = {
    'Northern Israel': { code: 'IL', flag: '\ud83c\uddee\ud83c\uddf1' },
    'Central Israel':  { code: 'IL', flag: '\ud83c\uddee\ud83c\uddf1' },
    'Southern Israel': { code: 'IL', flag: '\ud83c\uddee\ud83c\uddf1' },
    Israel:            { code: 'IL', flag: '\ud83c\uddee\ud83c\uddf1' },
    'West Bank':       { code: 'PS', flag: '\ud83c\uddf5\ud83c\uddf8' },
    Gaza:              { code: 'PS', flag: '\ud83c\uddf5\ud83c\uddf8' },
    Palestine:         { code: 'PS', flag: '\ud83c\uddf5\ud83c\uddf8' },
    Lebanon:           { code: 'LB', flag: '\ud83c\uddf1\ud83c\udde7' },
    Yemen:             { code: 'YE', flag: '\ud83c\uddfe\ud83c\uddea' },
    Syria:             { code: 'SY', flag: '\ud83c\uddf8\ud83c\uddfe' },
    Iraq:              { code: 'IQ', flag: '\ud83c\uddee\ud83c\uddf6' },
    Iran:              { code: 'IR', flag: '\ud83c\uddee\ud83c\uddf7' },
    Jordan:            { code: 'JO', flag: '\ud83c\uddef\ud83c\uddf4' },
    'Saudi Arabia':    { code: 'SA', flag: '\ud83c\uddf8\ud83c\udde6' },
  };
  const resolveCountry = (region: string) => {
    for (const [key, info] of Object.entries(COUNTRY_MAP)) {
      if (region.toLowerCase().includes(key.toLowerCase())) return info;
    }
    return { code: '??', flag: '\ud83c\udff3\ufe0f' };
  };

  const criticalIntelCount = classifiedMessageCache.filter(m => {
    const age = now - new Date(m.timestamp).getTime();
    return age < 3600000 && m.classification?.severity === 'critical';
  }).length;

  let threatScore = 0;
  if      (velocity30m >= 15) threatScore += 4;
  else if (velocity30m >= 8)  threatScore += 3;
  else if (velocity30m >= 3)  threatScore += 2;
  else if (velocity30m >= 1)  threatScore += 1;
  if (isEscalating && escalationRatio > 2.5) threatScore += 2;
  else if (isEscalating)      threatScore += 1;
  if      (criticalIntelCount >= 5) threatScore += 2;
  else if (criticalIntelCount >= 2) threatScore += 1;
  if      (velocityPerHour >= 20)   threatScore += 1;

  const overallThreatLevel =
    threatScore >= 7 ? 'EXTREME' :
    threatScore >= 5 ? 'HIGH' :
    threatScore >= 3 ? 'ELEVATED' :
    threatScore >= 1 ? 'MODERATE' : 'LOW';

  const dataQuality = Math.min(1,
    (Math.min(last6h.length, 50)                  / 50)  * 0.50 +
    (Math.min(classifiedMessageCache.length, 20)  / 20)  * 0.30 +
    (Math.min(intervals.length, 10)               / 10)  * 0.20,
  );
  const overallConfidence = parseFloat(Math.min(0.85, dataQuality * 0.85).toFixed(2));

  const SOURCE_LABELS: Record<string, string> = {
    rockets:   'Rocket alert source',
    missiles:  'Missile alert source',
    uav:       'UAV/drone alert source',
    airstrike: 'Airstrike alert source',
    mortar:    'Mortar alert source',
    anti_tank: 'Anti-tank alert source',
    ground:    'Ground alert source',
  };

  const predictions = sortedRegions.slice(0, 5).map(([region, score], i) => {
    const regionTypeDist = regionTypeMap[region] || {};
    const domRegionType  = Object.entries(regionTypeDist).sort(([, a], [, b]) => b - a)[0]?.[0] || dominantType;
    const hasIntelBoost  = (intelRegionBoost[region] || 0) > 0;
    const recentHits     = regionRecentCounts[region] || 0;

    const baseProbability = Math.min(0.85, score * 0.80);
    const adjProbability  = parseFloat((hasIntelBoost ? Math.min(0.88, baseProbability * 1.08) : baseProbability).toFixed(2));
    const severity        = adjProbability >= 0.75 ? 'critical' : adjProbability >= 0.55 ? 'high' : adjProbability >= 0.35 ? 'medium' : 'low';

    const timeframe = intervals.length < 2 ? 'unknown'
      : i === 0 && rawEstMin <= 30 ? (rawEstMin <= 5 ? 'imminent' : '1h')
      : i <= 1 ? '3h' : '6h';

    const rationale = hasIntelBoost
      ? `Intel-corroborated: ${(regionWeights[region] || 0).toFixed(1)} decay-weighted score + active OSINT signals.${recentHits > 0 ? ` ${recentHits} alerts in last hour.` : ''}`
      : `${(regionWeights[region] || 0).toFixed(1)} time-decay score from ${last6h.filter(a => (a.region || a.country) === region).length} recent alerts.${recentHits > 0 ? ` ${recentHits} hits last hour.` : ''}`;

    return {
      region,
      threatVector: CHAINS[domRegionType]?.[0] || domRegionType,
      probability: adjProbability,
      timeframe,
      source: SOURCE_LABELS[domRegionType] || 'Regional threat actors',
      rationale,
      severity,
    };
  });

  const trendWord    = isEscalating ? 'escalating' : isDeescalating ? 'de-escalating' : 'steady';
  const topRegionStr = sortedRegions.slice(0, 3).map(([r]) => r).join(', ');
  const patternSummary =
    `${last6h.length} alerts tracked over 6h at ${velocityPerHour.toFixed(1)}/hr ${trendWord} tempo. ` +
    `Highest concentration: ${topRegionStr || 'no active zones'}. ` +
    (criticalIntelCount > 0
      ? `${criticalIntelCount} critical OSINT signal${criticalIntelCount > 1 ? 's' : ''} corroborate threat assessment.`
      : 'OSINT signals at baseline levels.');

  const escalationVector = isEscalating
    ? `${escalationRatio.toFixed(1)}x surge detected \u2014 multi-axis pressure building across ${sortedRegions[0]?.[0] || 'primary theaters'}`
    : isDeescalating
      ? `Kinetic tempo declining \u2014 activity reducing across active fronts`
      : `Sustained operational pressure in ${sortedRegions[0]?.[0] || 'active zones'}`;

  const locationProbabilities = sortedRegions.slice(0, 8).map(([location, score]) => {
    const countryInfo  = resolveCountry(location);
    const locTypeDist  = regionTypeMap[location] || {};
    const locDomType   = Object.entries(locTypeDist).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
    return {
      location,
      country:     countryInfo.code,
      probability: parseFloat(Math.min(0.88, score * 0.82).toFixed(2)),
      threatType:  locDomType,
      countryFlag: countryInfo.flag,
    };
  });

  const insufficientData = last6h.length < 3;

  const result = {
    predictions: insufficientData ? [] : predictions,
    overallThreatLevel: insufficientData ? 'LOW' : overallThreatLevel,
    escalationVector: insufficientData ? 'Insufficient alert data for escalation analysis' : escalationVector,
    nextLikelyTarget: sortedRegions[0]?.[0] || null,
    confidence: insufficientData ? 0 : overallConfidence,
    patternSummary: insufficientData
      ? `Only ${last6h.length} alert(s) in last 6 hours \u2014 insufficient data for reliable predictions. Predictions will populate as more alerts are received.`
      : patternSummary,
    insufficientData,
    generatedAt: new Date().toISOString(),
    dataPoints: {
      totalAlerts: alerts.length,
      velocity30m,
      velocity2h: last2h.length,
      velocityPerHour: parseFloat(velocityPerHour.toFixed(1)),
      isEscalating,
      topRegions: sortedRegions.slice(0, 5).map(([r, s]) => ({
        region: r,
        count:  Math.round(s * 10),
        score:  parseFloat(s.toFixed(3)),
      })),
    },
    nextAttackWindow: {
      estimatedMinutes: rawEstMin,
      confidence:       parseFloat(timingConfidence.toFixed(2)),
      basis:            timingBasis,
      label:            timingLabel,
    },
    locationProbabilities,
  };

  attackPredictionCache.set(result);
  return result;
}

export async function fetchEpicFury(): Promise<any> {
  const response = await fetch('https://littlemoiz.com/', {
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36' },
  });
  const html = await response.text();

  const num = (patterns: RegExp[]): number | null => {
    for (const re of patterns) {
      const m = html.match(re);
      if (m) { const n = parseInt(m[1].replace(/,/g, '')); if (!isNaN(n)) return n; }
    }
    return null;
  };

  return {
    day: num([/[Dd]ay\s*[:#]?\s*(\d+)/, /\u05d9\u05d5\u05dd\s*(\d+)/]),
    lastUpdated: (() => { const m = html.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/); return m ? `${m[1]} ${m[2]}` : null; })(),
    ballisticMissiles: num([/(1[,.]?0\d\d)/, /(\d{1,4})\s*[Bb]allistic/]),
    dronesUAVs: num([/(3[,.]?0\d\d)/, /(\d{1,4})\s*[Dd]rone/]),
    missilesToIsrael: num([/(\d{2,3})\s*[Mm]issiles?\s*to\s*Israel/, /Israel[^\d]{0,20}(\d{2,3})\s*[Mm]issile/]),
    launchersDestroyed: num([/(\d{3})\s*[Ll]aunch/, /[Ll]aunch[^\d]{0,10}(\d{3})/]),
    countriesAttacked: num([/(\d{1,2})\s*[Cc]ountries?\s*[Aa]ttack/, /[Cc]ountries[^\d]{0,10}(\d{1,2})/]),
    israelKilled: num([/Israel[^\d]{0,40}(\d{1,3})\s*[Kk]ill/, /(\d{1,3})\s*[Kk]illed[^\d]{0,40}Israel/]),
    israelWounded: num([/Israel[^\d]{0,40}(\d{1,4})\s*[Ww]ound/, /(\d{1,4})\s*[Ww]ounded[^\d]{0,40}Israel/]),
    iranKilled: num([/Iran[^\d]{0,40}(\d{1,4})\s*[Kk]ill/, /(\d{1,4})\s*[Kk]illed[^\d]{0,40}Iran/]),
    iranWounded: num([/Iran[^\d]{0,40}(\d{1,4})\s*[Ww]ound/, /(\d{1,4})\s*[Ww]ounded[^\d]{0,40}Iran/]),
    lebanonKilled: num([/Lebanon[^\d]{0,40}(\d{1,4})\s*[Kk]ill/, /(\d{1,4})\s*[Kk]illed[^\d]{0,40}Lebanon/]),
    fetchedAt: new Date().toISOString(),
    source: 'littlemoiz.com',
    htmlLength: html.length,
  };
}

export function handleAiAnalyst(question: string, clientContext: any): string {
  const ctx = clientContext || {};
  const q = (question as string).toLowerCase();

  const threatLevel  = ctx.threatLevel  || 'MODERATE';
  const confidence   = Math.round((ctx.confidence || 0.5) * 100);
  const nextTarget   = ctx.nextTarget   || 'Unknown';
  const escVector    = ctx.escalationVector || '';
  const velocity     = (ctx.velocityPerHour as number | undefined) ?? 0;
  const velocity30m  = (ctx.velocity30m    as number | undefined) ?? 0;
  const isEscalating = ctx.isEscalating as boolean | undefined;
  const win          = ctx.nextAttackWindow as { label?: string; estimatedMinutes?: number; confidence?: number; basis?: string } | undefined;
  const locs         = (ctx.locationProbabilities as Array<{ countryFlag: string; location: string; probability: number; threatType: string }> | undefined) || [];
  const topLocs      = locs.slice(0, 5);

  const dtg = new Date().toUTCString();
  const trendWord = isEscalating ? 'ESCALATING' : 'STABLE';
  const locList = topLocs.length > 0
    ? topLocs.map((l, i) => `  ${i + 1}. ${l.countryFlag} ${l.location} \u2014 ${Math.round(l.probability * 100)}% (${l.threatType})`).join('\n')
    : '  Insufficient data for location ranking.';

  if (q.includes('when') || q.includes('next attack') || q.includes('timing') || q.includes('time')) {
    return `TIMING ASSESSMENT \u2014 ${dtg}\n\nNext Attack Window: ${win?.label?.toUpperCase() ?? 'UNKNOWN'}\nEstimated: ~${win?.estimatedMinutes ?? '?'} minutes\nWindow Confidence: ${Math.round((win?.confidence ?? 0) * 100)}%\n\nBasis: ${win?.basis ?? 'Insufficient interval data for statistical estimation.'}\n\nVelocity context: ${velocity.toFixed(1)} alerts/hr over the last 2 hours with ${velocity30m} events in the last 30 minutes. ${isEscalating ? 'The current escalation trajectory suggests the next event may arrive ahead of the historical average interval.' : 'Tempo is consistent with baseline operational patterns \u2014 no acceleration detected.'}\n\nOverall threat environment: ${threatLevel} (${confidence}% confidence)${escVector ? `\n\nEscalation vector: ${escVector}` : ''}`;
  } else if (q.includes('where') || q.includes('location') || q.includes('target') || q.includes('area') || q.includes('region')) {
    return `TARGET PROBABILITY ASSESSMENT \u2014 ${dtg}\n\nPrimary Target: ${nextTarget}\n\nStrike Probability by Location:\n${locList}\n\nAnalysis: ${escVector || 'Sustained operational pressure across active fronts.'}\n\nProbabilities are derived from time-decay weighted alert history (\u03bb=0.5, half-life ~1.4h) fused with OSINT signals from monitored Telegram channels. Recent events carry exponentially higher weight than older ones, so a sudden regional surge will dominate the ranking within minutes.\n\nOverall threat level: ${threatLevel} (${confidence}% confidence)`;
  } else if (q.includes('escalat') || q.includes('stable') || q.includes('trend') || q.includes('situation')) {
    return `ESCALATION ASSESSMENT \u2014 ${dtg}\n\nStatus: ${trendWord}\nThreat Level: ${threatLevel}\nConfidence: ${confidence}%\n\nAlert Velocity: ${velocity.toFixed(1)}/hr (${velocity30m} events in last 30 min)${escVector ? `\n\nEscalation vector: ${escVector}` : ''}\n\n${isEscalating ? `ESCALATION INDICATORS DETECTED: Alert tempo has increased significantly in the last 30 minutes relative to the prior window. This pattern is consistent with an active multi-launch sequence or the opening phase of a coordinated operation. Recommend elevated readiness in ${nextTarget} and adjacent zones.` : `SITUATION STABLE: Current alert velocity is within historical baseline parameters. No significant acceleration detected. The operational tempo suggests routine harassment fire or isolated incidents rather than a coordinated escalation. Continue standard monitoring posture.`}\n\nTop targeted areas: ${topLocs.slice(0, 3).map(l => l.location).join(', ') || 'data pending'}`;
  } else if (q.includes('iran') || q.includes('hezbollah') || q.includes('hamas') || q.includes('houthi') || q.includes('source') || q.includes('osint')) {
    const lebLocs   = topLocs.filter(l => l.countryFlag === '\ud83c\uddf1\ud83c\udde7' || l.location.toLowerCase().includes('lebanon'));
    const iranLocs  = topLocs.filter(l => l.countryFlag === '\ud83c\uddee\ud83c\uddf7' || l.location.toLowerCase().includes('iran'));
    const yemenLocs = topLocs.filter(l => l.countryFlag === '\ud83c\uddfe\ud83c\uddea' || l.location.toLowerCase().includes('yemen'));
    return `ACTOR INTELLIGENCE ASSESSMENT \u2014 ${dtg}\n\nCurrent Threat Level: ${threatLevel} (${confidence}% confidence)\n\nHEZBOLLAH / LEBANON FRONT:\n${lebLocs.length > 0 ? lebLocs.map(l => `  \u2022 ${l.location}: ${Math.round(l.probability * 100)}% probability (${l.threatType})`).join('\n') : '  No Lebanon-origin indicators in current window.'}\n\nIRAN DIRECT THREAT:\n${iranLocs.length > 0 ? iranLocs.map(l => `  \u2022 ${l.location}: ${Math.round(l.probability * 100)}%`).join('\n') : '  No direct Iranian strike indicators in current window.'}\n\nHOUTHI / YEMEN FRONT:\n${yemenLocs.length > 0 ? yemenLocs.map(l => `  \u2022 ${l.location}: ${Math.round(l.probability * 100)}% (${l.threatType})`).join('\n') : '  No active Houthi indicators in current window.'}\n\nAlert velocity: ${velocity.toFixed(1)}/hr \u2014 ${trendWord}${escVector ? `\nEscalation: ${escVector}` : ''}`;
  } else {
    return `INTELLIGENCE BRIEFING \u2014 ${dtg}\n\nTHREAT LEVEL: ${threatLevel}\nCONFIDENCE: ${confidence}%\nSTATUS: ${trendWord}\n\nNEXT ATTACK WINDOW:\n  Estimated: ${win?.label?.toUpperCase() ?? 'UNKNOWN'} (~${win?.estimatedMinutes ?? '?'} min)\n  Confidence: ${Math.round((win?.confidence ?? 0) * 100)}%\n  ${win?.basis ?? ''}\n\nPRIMARY TARGET: ${nextTarget}\n\nTOP STRIKE PROBABILITIES:\n${locList}\n\nVELOCITY METRICS:\n  Past 30 min: ${velocity30m} alerts\n  Per hour:    ${velocity.toFixed(1)} alerts/hr\n  Trend:       ${trendWord}\n${escVector ? `\nESCALATION VECTOR:\n  ${escVector}` : ''}\n\nASSESSMENT: ${isEscalating ? `Elevated kinetic activity indicates an active attack sequence. Priority alert zones are ${topLocs.slice(0, 2).map(l => l.location).join(' and ') || nextTarget}. Recommend immediate defensive posture elevation.` : `Operational tempo is within normal parameters. No immediate mass-launch indicators. Continue standard threat monitoring.`}`;
  }
}

export function clearCache(): void {
  rocketStatsCache.clear();
  conflictFeedCache.clear();
  regionalRssCache.clear();
  attackPredictionCache.clear();
}
