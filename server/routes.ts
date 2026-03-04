import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

function sanitizeText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
import type { NewsItem, CommodityData, ConflictEvent, FlightData, ShipData, TelegramMessage, SirenAlert, RedAlert, AIBrief, AIDeduction, AdsbFlight, EarthquakeEvent, CyberEvent, ThermalHotspot, ThreatClassification, ClassifiedMessage, AlertPattern, FalseAlarmScore, AnalyticsSnapshot, LLMAssessment, RedditPost, SanctionMatch, WeatherData, SatelliteImage } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const grok = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
});

const ADSB_API_BASE = 'https://api.adsb.lol/v2';

const ADSB_QUERY_POINTS = [
  { lat: 32.0, lon: 35.0, dist: 200 },
  { lat: 28.0, lon: 50.0, dist: 250 },
  { lat: 25.5, lon: 55.0, dist: 200 },
  { lat: 33.5, lon: 44.0, dist: 200 },
];

const MILITARY_HEX_PREFIXES = [
  'AE', 'AF', '3F', '43C', '43D',
  '738', '06A',
];

const MILITARY_CALLSIGN_PATTERNS = [
  /^FORTE/i, /^DUKE/i, /^HOMER/i, /^JAKE/i, /^RCH/i, /^NCHO/i,
  /^EVAC/i, /^RFF/i, /^LAGR/i, /^TOPCAT/i, /^DARKS/i,
  /^IAF/i, /^IRGC/i, /^IRIAF/i, /^GAF/i,
  /^VIPER/i, /^COBRA/i, /^HAWK/i, /^REAPER/i,
];

const SURVEILLANCE_TYPES = ['GLEX', 'GL5T', 'E3CF', 'E3TF', 'E6', 'RC135', 'P8', 'RQ4', 'MQ9', 'U2'];

function classifyAircraftType(ac: Record<string, unknown>): AdsbFlight['type'] {
  const hex = ((ac.hex as string) || '').toUpperCase();
  const callsign = ((ac.flight as string) || '').trim().toUpperCase();
  const category = (ac.category as string) || '';
  const dbType = ((ac.t as string) || '').toUpperCase();

  if (SURVEILLANCE_TYPES.some(st => dbType.includes(st))) return 'surveillance';

  for (const prefix of MILITARY_HEX_PREFIXES) {
    if (hex.startsWith(prefix)) {
      if (MILITARY_CALLSIGN_PATTERNS.some(p => p.test(callsign))) return 'military';
    }
  }
  if (MILITARY_CALLSIGN_PATTERNS.some(p => p.test(callsign))) return 'military';

  if (category === 'A5' || category === 'A4') {
    if (dbType.includes('C17') || dbType.includes('C130') || dbType.includes('C5') ||
        dbType.includes('B74') || dbType.includes('B77') || dbType.includes('A33')) {
      const reg = ((ac.r as string) || '').toUpperCase();
      if (/^\d{2}-\d{4}/.test(reg) || /^N\d{5}/.test(reg)) return 'cargo';
    }
  }

  if (category === 'B2' || category === 'B1' || category === 'B4') return 'military';

  if (dbType.includes('GLEX') || dbType.includes('GL5T') || dbType.includes('GLF') ||
      dbType.includes('CL60') || dbType.includes('FA50') || dbType.includes('FA7X') ||
      dbType.includes('G280') || dbType.includes('LJ')) {
    if (!callsign.match(/^[A-Z]{3}\d/)) return 'private';
  }

  if (callsign.match(/^[A-Z]{3}\d/) || category === 'A3' || category === 'A5') return 'commercial';

  if (dbType.includes('C17') || dbType.includes('C130') || dbType.includes('KC') ||
      dbType.includes('B74') && !callsign.match(/^[A-Z]{3}\d/)) return 'cargo';

  return 'commercial';
}

function isFlaggedFlight(ac: Record<string, unknown>, acType: AdsbFlight['type']): { flagged: boolean; flagReason?: string } {
  const squawk = (ac.squawk as string) || '';
  const emergency = (ac.emergency as string) || 'none';
  const alt = (typeof ac.alt_baro === 'number' ? ac.alt_baro : 0) as number;
  const callsign = ((ac.flight as string) || '').trim();

  if (emergency !== 'none' && emergency !== '') return { flagged: true, flagReason: `EMERGENCY: ${emergency}` };
  if (squawk === '7700') return { flagged: true, flagReason: 'SQUAWK 7700 - EMERGENCY' };
  if (squawk === '7600') return { flagged: true, flagReason: 'SQUAWK 7600 - COMM FAILURE' };
  if (squawk === '7500') return { flagged: true, flagReason: 'SQUAWK 7500 - HIJACK' };
  if (acType === 'military') return { flagged: true, flagReason: 'Military aircraft' };
  if (acType === 'surveillance') return { flagged: true, flagReason: 'ISR/Surveillance platform' };
  if (acType === 'government') return { flagged: true, flagReason: 'Government aircraft' };
  if (alt > 50000) return { flagged: true, flagReason: `High altitude: ${alt}ft` };

  return { flagged: false };
}

function countryFromHex(hex: string): string {
  const h = hex.toUpperCase();
  if (h.startsWith('738') || h.startsWith('739') || h.startsWith('73A')) return 'Israel';
  if (h.startsWith('06A') || h.startsWith('06B')) return 'Iran';
  if (h.startsWith('AE') || h.startsWith('AF') || h.startsWith('A')) return 'USA';
  if (h.startsWith('710') || h.startsWith('711')) return 'Saudi Arabia';
  if (h.startsWith('400') || h.startsWith('401') || h.startsWith('43')) return 'UK';
  if (h.startsWith('3C') || h.startsWith('3D')) return 'Germany';
  if (h.startsWith('47')) return 'France';
  if (h.startsWith('896') || h.startsWith('897')) return 'South Korea';
  if (h.startsWith('780')) return 'China';
  if (h.startsWith('4CA')) return 'Ireland';
  if (h.startsWith('4B')) return 'Bahrain';
  if (h.startsWith('A6') || h.startsWith('896E')) return 'UAE';
  if (h.startsWith('760')) return 'Qatar';
  if (h.startsWith('800') || h.startsWith('801')) return 'India';
  if (h.startsWith('C0')) return 'Canada';
  if (h.startsWith('50')) return 'Australia';
  if (h.startsWith('86')) return 'Japan';
  return 'Unknown';
}

function transformAdsbAircraft(ac: Record<string, unknown>, index: number): AdsbFlight | null {
  const hex = (ac.hex as string) || '';
  const altBaro = ac.alt_baro;
  if (!hex || altBaro === 'ground' || altBaro === undefined) return null;

  const lat = ac.lat as number | undefined;
  const lon = ac.lon as number | undefined;
  if (lat === undefined || lon === undefined) return null;

  const callsign = ((ac.flight as string) || 'N/A').trim() || 'N/A';
  const acType = classifyAircraftType(ac);
  const { flagged, flagReason } = isFlaggedFlight(ac, acType);

  return {
    id: `live-${hex}`,
    hex: hex.toUpperCase(),
    callsign,
    type: acType,
    aircraft: ((ac.t as string) || 'Unknown').toUpperCase(),
    registration: ((ac.r as string) || hex.toUpperCase()),
    origin: '',
    destination: '',
    lat,
    lng: lon,
    altitude: typeof altBaro === 'number' ? altBaro : 0,
    groundSpeed: (ac.gs as number) || 0,
    verticalRate: (ac.baro_rate as number) || (ac.geom_rate as number) || 0,
    heading: (ac.track as number) || (ac.true_heading as number) || 0,
    squawk: (ac.squawk as string) || '0000',
    rssi: (ac.rssi as number) || -30,
    seen: (ac.seen as number) || 0,
    country: countryFromHex(hex),
    flagged,
    flagReason,
  };
}

let cachedLiveFlights: AdsbFlight[] = [];
let lastFetchTime = 0;
const FETCH_COOLDOWN_MS = 0;

async function fetchLiveAdsbFlights(): Promise<AdsbFlight[]> {
  const now = Date.now();
  if (now - lastFetchTime < FETCH_COOLDOWN_MS && cachedLiveFlights.length > 0) {
    return cachedLiveFlights;
  }

  try {
    const seenHexes = new Set<string>();
    const allFlights: AdsbFlight[] = [];

    const geoQueries = ADSB_QUERY_POINTS.map(async (pt) => {
      const url = `${ADSB_API_BASE}/lat/${pt.lat}/lon/${pt.lon}/dist/${pt.dist}`;
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) return [];
      const data = await resp.json() as { ac?: Record<string, unknown>[] };
      return data.ac || [];
    });

    const milQuery = (async () => {
      try {
        const resp = await fetch(`${ADSB_API_BASE}/mil`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { ac?: Record<string, unknown>[] };
        return (data.ac || []).filter((a: Record<string, unknown>) => {
          const lat = a.lat as number | undefined;
          const lon = a.lon as number | undefined;
          if (lat === undefined || lon === undefined) return false;
          return lat > 15 && lat < 42 && lon > 25 && lon < 65;
        });
      } catch { return []; }
    })();

    const results = await Promise.allSettled([...geoQueries, milQuery]);

    let idx = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const ac of result.value) {
          const hex = ((ac.hex as string) || '').toLowerCase();
          if (seenHexes.has(hex)) continue;
          seenHexes.add(hex);
          const flight = transformAdsbAircraft(ac, idx++);
          if (flight) allFlights.push(flight);
        }
      }
    }

    if (allFlights.length > 0) {
      allFlights.sort((a, b) => {
        const priority: Record<string, number> = { military: 0, surveillance: 1, government: 2, cargo: 3, commercial: 4, private: 5 };
        return (priority[a.type] ?? 5) - (priority[b.type] ?? 5);
      });
      cachedLiveFlights = allFlights;
      lastFetchTime = now;
      console.log(`[ADSB] Fetched ${allFlights.length} live aircraft from adsb.lol`);
    } else if (cachedLiveFlights.length > 0) {
      return cachedLiveFlights;
    } else {
      console.log('[ADSB] No live data available');
      return [];
    }

    return allFlights;
  } catch (err) {
    console.error('[ADSB] API fetch failed:', (err as Error).message);
    if (cachedLiveFlights.length > 0) return cachedLiveFlights;
    return [];
  }
}

// --- Shared news category classifier ---
function classifyTitle(text: string): 'breaking' | 'military' | 'diplomatic' | 'economic' {
  const lower = text.toLowerCase();
  if (/market|oil|crude|gold|price|surge|drop|stock|trade|dollar|yen|euro|economy|gdp|rate|inflation/i.test(lower)) return 'economic';
  if (/military|strike|missile|bomb|attack|air\s*force|navy|army|defense|weapon|drone|intercept|operation|war|combat|troops|artillery|killed|wounded/i.test(lower)) return 'military';
  if (/diplomat|ceasefire|negotiat|talk|summit|ambassador|\bun\b|nato|sanction|treaty|peace|resolution/i.test(lower)) return 'diplomatic';
  return 'breaking';
}

// --- Live News API Integration ---
const NEWS_CACHE_TTL = 10_000;
const NEWS_QUERY = 'israel OR iran OR hezbollah OR hamas OR missile OR attack OR war OR conflict';

let newsApiCache: { data: NewsItem[]; fetchedAt: number } | null = null;
let gnewsCache:   { data: NewsItem[]; fetchedAt: number } | null = null;
let mediastackCache: { data: NewsItem[]; fetchedAt: number } | null = null;

async function fetchNewsAPI(): Promise<NewsItem[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  if (newsApiCache && Date.now() - newsApiCache.fetchedAt < NEWS_CACHE_TTL) return newsApiCache.data;
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(NEWS_QUERY)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
    const json = await res.json() as { articles?: Array<{ title?: string; url?: string; publishedAt?: string; source?: { name?: string } }> };
    const items: NewsItem[] = (json.articles || [])
      .filter(a => a.title && a.title !== '[Removed]')
      .map((a, i) => ({
        id: `newsapi_${Date.now()}_${i}`,
        title: a.title!,
        source: a.source?.name || 'NewsAPI',
        category: classifyTitle(a.title!),
        timestamp: a.publishedAt || new Date().toISOString(),
        url: a.url,
      }));
    newsApiCache = { data: items, fetchedAt: Date.now() };
    console.log(`[NEWSAPI] Fetched ${items.length} articles`);
    return items;
  } catch (err) {
    console.log('[NEWSAPI] Error:', err instanceof Error ? err.message : err);
    return newsApiCache?.data ?? [];
  }
}

async function fetchGNews(): Promise<NewsItem[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];
  if (gnewsCache && Date.now() - gnewsCache.fetchedAt < NEWS_CACHE_TTL) return gnewsCache.data;
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(NEWS_QUERY)}&lang=en&max=10&sortby=publishedAt&token=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
    const json = await res.json() as { articles?: Array<{ title?: string; url?: string; publishedAt?: string; source?: { name?: string } }> };
    const items: NewsItem[] = (json.articles || [])
      .filter(a => a.title)
      .map((a, i) => ({
        id: `gnews_${Date.now()}_${i}`,
        title: a.title!,
        source: a.source?.name || 'GNews',
        category: classifyTitle(a.title!),
        timestamp: a.publishedAt || new Date().toISOString(),
        url: a.url,
      }));
    gnewsCache = { data: items, fetchedAt: Date.now() };
    console.log(`[GNEWS] Fetched ${items.length} articles`);
    return items;
  } catch (err) {
    console.log('[GNEWS] Error:', err instanceof Error ? err.message : err);
    return gnewsCache?.data ?? [];
  }
}

async function fetchMediastack(): Promise<NewsItem[]> {
  const key = process.env.MEDIASTACK_KEY;
  if (!key) return [];
  if (mediastackCache && Date.now() - mediastackCache.fetchedAt < NEWS_CACHE_TTL) return mediastackCache.data;
  try {
    const url = `http://api.mediastack.com/v1/news?access_key=${key}&keywords=${encodeURIComponent('israel,iran,war,conflict,missile,attack')}&languages=en&limit=25&sort=published_desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Mediastack HTTP ${res.status}`);
    const json = await res.json() as { data?: Array<{ title?: string; url?: string; published_at?: string; source?: string }> };
    const items: NewsItem[] = (json.data || [])
      .filter(a => a.title)
      .map((a, i) => ({
        id: `mediastack_${Date.now()}_${i}`,
        title: a.title!,
        source: a.source || 'Mediastack',
        category: classifyTitle(a.title!),
        timestamp: a.published_at || new Date().toISOString(),
        url: a.url,
      }));
    mediastackCache = { data: items, fetchedAt: Date.now() };
    console.log(`[MEDIASTACK] Fetched ${items.length} articles`);
    return items;
  } catch (err) {
    console.log('[MEDIASTACK] Error:', err instanceof Error ? err.message : err);
    return mediastackCache?.data ?? [];
  }
}

const X_FEED_ACCOUNTS = [
  // --- Israeli military / official ---
  'AvichayAdraee',      // IDF Arabic Spokesperson (EN+AR)
  'IDF',                // Israeli Defense Forces official (EN)
  'IsraelRadar_',       // Israel Radar — real-time alerts (EN)
  'IsraeliPM',          // Israeli PM office (EN)
  // --- Lebanon / Hezbollah monitoring ---
  'NaharnetEnglish',    // Naharnet — Lebanese news English (EN)
  'LBCINews',           // LBCI Lebanon news (AR/EN)
  'AlJumhuriya_ar',     // Lebanese political news (AR)
  // --- Regional OSINT / conflict ---
  'IntelCrab',          // Intel Crab — ME OSINT (EN)
  'sentdefender',       // Sentinel Defender (EN)
  'AuroraIntel',        // Aurora Intel (EN)
  'Faytuks',            // Faytuks — ME news (EN+AR)
  'Conflicts',          // Conflicts — global conflict tracking (EN)
  'ELINTNews',          // ELINT News (EN)
  'charles_lister',     // Charles Lister — Syria/Lebanon analyst (EN)
  'QalaatAlMudiq',      // Qalaat Al-Mudiq — Syria/Lebanon OSINT (EN+AR)
  'MiddleEastEye',      // Middle East Eye (EN+AR)
  // --- Breaking news ---
  'FirstSquawk',        // First Squawk — financial/geopolitical (EN)
  'BNONews',            // BNO News — breaking (EN)
  'NOWLebanon',         // NOW Lebanon — English Lebanon news (EN)
];
const X_CACHE_TTL = 120_000;
const X_RATE_LIMIT_BACKOFF = 300_000;
const xFeedCache = new Map<string, { data: NewsItem[]; fetchedAt: number }>();
const xInFlight = new Map<string, Promise<NewsItem[]>>();
const xRateLimitedAccounts = new Map<string, number>();

async function scrapeXAccount(screenName: string): Promise<NewsItem[]> {
  const cached = xFeedCache.get(screenName);
  if (cached && Date.now() - cached.fetchedAt < X_CACHE_TTL) {
    return cached.data;
  }

  const existing = xInFlight.get(screenName);
  if (existing) return existing;

  const promise = _scrapeXAccountInner(screenName);
  xInFlight.set(screenName, promise);
  try {
    return await promise;
  } finally {
    xInFlight.delete(screenName);
  }
}

async function _scrapeXAccountInner(screenName: string): Promise<NewsItem[]> {
  const cached = xFeedCache.get(screenName);

  const accountRateLimit = xRateLimitedAccounts.get(screenName) ?? 0;
  if (Date.now() < accountRateLimit) {
    if (cached) return cached.data;
    return [];
  }

  const items: NewsItem[] = [];
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 10000);
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    const response = await fetch(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${screenName}`,
      {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Referer': 'https://platform.twitter.com/',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        xRateLimitedAccounts.set(screenName, Date.now() + X_RATE_LIMIT_BACKOFF);
        console.log(`[X-FEED] @${screenName} rate limited (429), backing off for ${X_RATE_LIMIT_BACKOFF / 60000} minutes`);
      }
      if (cached) return cached.data;
      return [];
    }

    const html = await response.text();
    const jsonMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!jsonMatch) {
      console.log(`[X-FEED] No __NEXT_DATA__ found for @${screenName}, HTML length: ${html.length}`);
      if (cached) return cached.data;
      return [];
    }

    const nextData = JSON.parse(jsonMatch[1]);
    const rawEntries = nextData?.props?.pageProps?.timeline?.entries;
    const entries = Array.isArray(rawEntries)
      ? rawEntries
      : rawEntries && typeof rawEntries === 'object'
        ? Object.values(rawEntries)
        : null;
    if (!entries || entries.length === 0) {
      console.log(`[X-FEED] No entries found for @${screenName}, rawEntries type: ${typeof rawEntries}`);
      if (cached) return cached.data;
      return [];
    }

    const ACCOUNT_LABELS: Record<string, string> = {
      // Israeli / official
      AvichayAdraee: 'IDF Arabic Spokesperson',
      IDF: 'IDF Official',
      IsraelRadar_: 'Israel Radar',
      IsraeliPM: 'Israeli PM',
      // Lebanon
      NaharnetEnglish: 'Naharnet Lebanon',
      LBCINews: 'LBCI News Lebanon',
      AlJumhuriya_ar: 'Al Jumhuriya (AR)',
      // OSINT / analysts
      IntelCrab: 'Intel Crab',
      sentdefender: 'Sentinel Defender',
      AuroraIntel: 'Aurora Intel',
      Faytuks: 'Faytuks',
      Conflicts: 'Conflicts',
      ELINTNews: 'ELINT News',
      charles_lister: 'Charles Lister',
      QalaatAlMudiq: 'Qalaat Al-Mudiq',
      MiddleEastEye: 'Middle East Eye',
      // Breaking news
      FirstSquawk: 'First Squawk',
      BNONews: 'BNO News',
      NOWLebanon: 'NOW Lebanon',
    };
    const sourceLabel = ACCOUNT_LABELS[screenName] || `@${screenName}`;

    let count = 0;
    for (const entry of entries) {
      if (count >= 20) break;
      const tweet = entry?.content?.tweet;
      if (!tweet) continue;

      let text = tweet.full_text || tweet.text || '';
      if (!text || text.length < 10) continue;

      text = text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();
      if (text.length < 5) continue;

      // Only allow English and Arabic — skip Hebrew, Farsi, and other scripts
      const hasHebrew = /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(text);
      const hasFarsi = /[\u06A9\u06AF\u06CC\u067E\u0686\u0698]/.test(text);
      const hasCyrillic = /[\u0400-\u04FF]/.test(text);
      if (hasHebrew || hasFarsi || hasCyrillic) continue;

      if (text.length > 300) {
        text = text.substring(0, 297) + '...';
      }
      text = sanitizeText(text);

      const category = classifyTitle(text);

      let timestamp = '';
      if (tweet.created_at) {
        try {
          timestamp = new Date(tweet.created_at).toISOString();
        } catch {
          timestamp = new Date().toISOString();
        }
      } else {
        timestamp = new Date().toISOString();
      }

      const titleAr = /[\u0600-\u06FF]/.test(text) ? text : undefined;

      items.push({
        id: `x_${screenName}_${tweet.id_str || count}`,
        title: text,
        ...(titleAr ? { titleAr } : {}),
        source: sourceLabel,
        category,
        timestamp,
        url: tweet.permalink ? `https://x.com${tweet.permalink}` : undefined,
      });
      count++;
    }

    xFeedCache.set(screenName, { data: items, fetchedAt: Date.now() });
    if (items.length > 0) {
      console.log(`[X-FEED] Fetched ${items.length} posts from @${screenName}`);
    }
  } catch (err) {
    console.log(`[X-FEED] Error scraping @${screenName}:`, err instanceof Error ? err.message : err);
    if (cached) return cached.data;
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  return items;
}

const OSINT_RSS_FEEDS = [
  { url: 'https://liveuamap.com/rss/mideast', source: 'LiveUAMap ME', icon: 'map' },
  { url: 'https://www.janes.com/feeds/news', source: 'Janes Defense', icon: 'shield' },
  { url: 'https://www.longwarjournal.org/feed', source: 'Long War Journal', icon: 'target' },
  { url: 'https://www.criticalthreats.org/feed', source: 'Critical Threats', icon: 'alert' },
  { url: 'https://www.understandingwar.org/feed', source: 'ISW', icon: 'chart' },
  { url: 'https://feeds.feedburner.com/defenseone/all', source: 'Defense One', icon: 'shield' },
  { url: 'https://breakingdefense.com/feed/', source: 'Breaking Defense', icon: 'alert' },
  { url: 'https://www.timesofisrael.com/feed/', source: 'Times of Israel', icon: 'news' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya EN', icon: 'news' },
];
let osintFeedCache: { data: NewsItem[]; fetchedAt: number } | null = null;
const OSINT_FEED_CACHE_TTL = 60_000;

async function fetchOSINTRSSFeeds(): Promise<NewsItem[]> {
  if (osintFeedCache && Date.now() - osintFeedCache.fetchedAt < OSINT_FEED_CACHE_TTL) {
    return osintFeedCache.data;
  }
  const results: NewsItem[] = [];
  await Promise.allSettled(OSINT_RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WARROOM/2.0)' },
      });
      if (!res.ok) return;
      const xml = await res.text();
      const items = xml.split(/<item[\s>]/i).slice(1, 15);
      for (const item of items) {
        const cdataTitle = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1];
        const plainTitle = item.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
        let text = (cdataTitle || plainTitle || '').replace(/<[^>]+>/g, '').trim();
        if (!text || text.length < 10) continue;
        text = sanitizeText(text);
        if (text.length > 300) text = text.substring(0, 297) + '...';
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1];
        const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
        let timestamp = new Date().toISOString();
        if (pubDate) { try { timestamp = new Date(pubDate).toISOString(); } catch {} }
        const titleAr = /[\u0600-\u06FF]/.test(text) ? text : undefined;
        results.push({
          id: `osint_${feed.source.replace(/\s/g, '_')}_${results.length}_${Date.now()}`,
          title: text,
          ...(titleAr ? { titleAr } : {}),
          source: feed.source,
          category: classifyTitle(text),
          timestamp,
          url: link || undefined,
        });
      }
    } catch {}
  }));
  if (results.length > 0) {
    console.log(`[X-FEED] OSINT RSS: Fetched ${results.length} items from ${OSINT_RSS_FEEDS.length} feeds`);
  }
  osintFeedCache = { data: results, fetchedAt: Date.now() };
  return results;
}

async function fetchXFeeds(): Promise<NewsItem[]> {
  const batchSize = 3;
  const results: NewsItem[][] = [];
  for (let i = 0; i < X_FEED_ACCOUNTS.length; i += batchSize) {
    const batch = X_FEED_ACCOUNTS.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(a => scrapeXAccount(a)));
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value.length > 0) results.push(r.value);
    }
    if (i + batchSize < X_FEED_ACCOUNTS.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  const xPosts = results.flat();

  if (xPosts.length < 5) {
    const osintPosts = await fetchOSINTRSSFeeds();
    xPosts.push(...osintPosts);
  }

  xPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return xPosts;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


const FREE_NEWS_RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.reuters.com/reuters/worldnews', source: 'Reuters' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NYT Middle East' },
];

let freeRssCache: { data: NewsItem[]; fetchedAt: number } | null = null;
const FREE_RSS_TTL = 10_000;

async function fetchFreeNewsRSS(): Promise<NewsItem[]> {
  if (freeRssCache && Date.now() - freeRssCache.fetchedAt < FREE_RSS_TTL) return freeRssCache.data;
  const items: NewsItem[] = [];
  await Promise.allSettled(FREE_NEWS_RSS_FEEDS.map(async ({ url, source }) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const xml = await res.text();
      const entries = xml.split(/<item[\s>]/i).slice(1);
      for (const entry of entries.slice(0, 15)) {
        const cdataTitle = entry.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1];
        const plainTitle = entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
        const title = (cdataTitle || plainTitle || '').replace(/<[^>]+>/g, '').trim();
        if (!title || title.length < 10) continue;
        const pubDate = entry.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ||
                        entry.match(/<dc:date>([\s\S]*?)<\/dc:date>/i)?.[1]?.trim() || '';
        const link = entry.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
        const timestamp = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        items.push({
          id: `rss_${source.replace(/\s/g, '_')}_${Date.now()}_${items.length}`,
          title,
          source,
          category: classifyTitle(title),
          timestamp,
          url: link || undefined,
        });
      }
    } catch {}
  }));
  console.log(`[FREE-RSS] Fetched ${items.length} articles from free feeds`);
  freeRssCache = { data: items, fetchedAt: Date.now() };
  return items;
}

async function generateNews(): Promise<NewsItem[]> {
  try {
    const [xNews, newsApiItems, gnewsItems, mediastackItems, rssItems] = await Promise.all([
      fetchXFeeds().catch(() => [] as NewsItem[]),
      fetchNewsAPI(),
      fetchGNews(),
      fetchMediastack(),
      fetchFreeNewsRSS().catch(() => [] as NewsItem[]),
    ]);

    const liveItems = [...xNews, ...newsApiItems, ...gnewsItems, ...mediastackItems, ...rssItems];

    const seen = new Set<string>();
    const deduped = liveItems.filter(item => {
      const key = item.title.toLowerCase().substring(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return deduped.slice(0, 60);
  } catch {
    return [];
  }
}

const COMMODITY_META = [
  { symbol: 'BRENT', name: 'Brent Crude', nameAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A', fallback: 84.72, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'BZ=F' },
  { symbol: 'WTI', name: 'WTI Crude', nameAr: '\u062E\u0627\u0645 \u063A\u0631\u0628 \u062A\u0643\u0633\u0627\u0633', fallback: 80.35, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'CL=F' },
  { symbol: 'GOLD', name: 'Gold Spot', nameAr: '\u0627\u0644\u0630\u0647\u0628', fallback: 2068.40, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'GC=F' },
  { symbol: 'SILVER', name: 'Silver Spot', nameAr: '\u0627\u0644\u0641\u0636\u0629', fallback: 23.85, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'SI=F' },
  { symbol: 'NATGAS', name: 'Natural Gas', nameAr: '\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0637\u0628\u064A\u0639\u064A', fallback: 3.42, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'NG=F' },
  { symbol: 'WHEAT', name: 'Wheat Futures', nameAr: '\u0639\u0642\u0648\u062F \u0627\u0644\u0642\u0645\u062D', fallback: 612.50, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'ZW=F' },
  { symbol: 'COPPER', name: 'Copper', nameAr: '\u0627\u0644\u0646\u062D\u0627\u0633', fallback: 8542.00, currency: 'USD', category: 'commodity' as const, yahooSymbol: 'HG=F' },
  { symbol: 'EUR/USD', name: 'Euro/US Dollar', nameAr: '\u064A\u0648\u0631\u0648/\u062F\u0648\u0644\u0627\u0631', fallback: 1.0862, currency: '', category: 'fx-major' as const, fxKey: 'EUR' },
  { symbol: 'GBP/USD', name: 'British Pound/Dollar', nameAr: '\u062C\u0646\u064A\u0647/\u062F\u0648\u0644\u0627\u0631', fallback: 1.2674, currency: '', category: 'fx-major' as const, fxKey: 'GBP' },
  { symbol: 'USD/JPY', name: 'US Dollar/Yen', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u064A\u0646', fallback: 149.82, currency: '', category: 'fx-major' as const, fxKey: 'JPY', invert: true },
  { symbol: 'USD/CHF', name: 'US Dollar/Swiss Franc', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0641\u0631\u0646\u0643', fallback: 0.8815, currency: '', category: 'fx-major' as const, fxKey: 'CHF', invert: true },
  { symbol: 'AUD/USD', name: 'Aussie Dollar/Dollar', nameAr: '\u0623\u0633\u062A\u0631\u0627\u0644\u064A/\u062F\u0648\u0644\u0627\u0631', fallback: 0.6542, currency: '', category: 'fx-major' as const, fxKey: 'AUD' },
  { symbol: 'USD/CAD', name: 'US Dollar/Canadian', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0643\u0646\u062F\u064A', fallback: 1.3598, currency: '', category: 'fx-major' as const, fxKey: 'CAD', invert: true },
  { symbol: 'USD/ILS', name: 'US Dollar/Shekel', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0634\u064A\u0642\u0644', fallback: 3.92, currency: '', category: 'fx' as const, fxKey: 'ILS', invert: true },
  { symbol: 'USD/IRR', name: 'US Dollar/Rial', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644', fallback: 42150, currency: '', category: 'fx' as const, fxKey: 'IRR', invert: true },
  { symbol: 'USD/SAR', name: 'US Dollar/Riyal', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A', fallback: 3.7500, currency: '', category: 'fx' as const, fxKey: 'SAR', invert: true },
  { symbol: 'USD/AED', name: 'US Dollar/Dirham', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u062F\u0631\u0647\u0645', fallback: 3.6725, currency: '', category: 'fx' as const, fxKey: 'AED', invert: true },
];

let liveFxRates: Record<string, number> = {};
let liveFxFetchedAt = 0;
const FX_CACHE_TTL = 10_000;

async function fetchLiveFxRates(): Promise<Record<string, number>> {
  if (Date.now() - liveFxFetchedAt < FX_CACHE_TTL && Object.keys(liveFxRates).length > 0) {
    return liveFxRates;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.rates) {
        liveFxRates = data.rates;
        liveFxFetchedAt = Date.now();
      }
    }
  } catch {}
  return liveFxRates;
}

// Live commodity prices from Yahoo Finance (free, no API key required)
let liveCommodityPrices: Record<string, { price: number; change: number; changePercent: number }> = {};
let liveCommodityFetchedAt = 0;
const COMMODITY_PRICE_TTL = 10_000;

async function fetchLiveCommodityPrices(): Promise<void> {
  if (Date.now() - liveCommodityFetchedAt < COMMODITY_PRICE_TTL && Object.keys(liveCommodityPrices).length > 0) return;
  const symbols = COMMODITY_META
    .filter(m => (m as typeof m & { yahooSymbol?: string }).yahooSymbol)
    .map(m => (m as typeof m & { yahooSymbol?: string }).yahooSymbol!)
    .join(',');
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`Yahoo Finance HTTP ${resp.status}`);
    const data = await resp.json() as { quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number }> } };
    const results = data?.quoteResponse?.result || [];
    for (const q of results) {
      if (q.regularMarketPrice != null) {
        liveCommodityPrices[q.symbol] = {
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      }
    }
    liveCommodityFetchedAt = Date.now();
    console.log(`[YAHOO-FINANCE] Fetched ${results.length} commodity prices`);
  } catch (err) {
    console.log('[YAHOO-FINANCE] Error:', err instanceof Error ? err.message : err);
  }
}

let commodityPriceState: Record<string, { price: number; prevPrice: number }> = {};

function generateCommodities(): CommodityData[] {
  const fxRates = liveFxRates;
  const results: CommodityData[] = [];

  for (const item of COMMODITY_META) {
    const meta = item as typeof item & { fxKey?: string; invert?: boolean; yahooSymbol?: string };
    let basePrice: number | null = null;
    let liveChange = 0;
    let liveChangePercent = 0;

    if (meta.yahooSymbol && liveCommodityPrices[meta.yahooSymbol]) {
      const live = liveCommodityPrices[meta.yahooSymbol];
      basePrice = live.price;
      liveChange = live.change;
      liveChangePercent = live.changePercent;
    } else if (meta.fxKey && fxRates[meta.fxKey]) {
      const rate = fxRates[meta.fxKey];
      basePrice = meta.invert ? rate : (1 / rate);
    }

    // Skip items with no live data — no fake fallback prices
    if (basePrice === null) continue;

    const prev = commodityPriceState[item.symbol];
    const currentPrice = basePrice;
    const prevPrice = prev ? prev.price : basePrice;
    commodityPriceState[item.symbol] = { price: currentPrice, prevPrice };

    results.push({
      symbol: item.symbol,
      name: item.name,
      nameAr: item.nameAr,
      price: Number(currentPrice.toFixed(currentPrice < 10 ? 4 : 2)),
      change: Number(liveChange.toFixed(currentPrice < 10 ? 4 : 2)),
      changePercent: Number(liveChangePercent.toFixed(2)),
      currency: item.currency,
      category: item.category,
    });
  }

  return results;
}

fetchLiveFxRates();
fetchLiveCommodityPrices();
setInterval(() => fetchLiveFxRates(), 10_000);
setInterval(() => fetchLiveCommodityPrices(), 10_000);

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

let gdeltCache: { data: ConflictEvent[]; fetchedAt: number } | null = null;
const GDELT_CACHE_TTL = 10_000;

// Rolling 7-day historical event buffer
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

async function fetchGDELTConflictEvents(): Promise<ConflictEvent[]> {
  if (gdeltCache && Date.now() - gdeltCache.fetchedAt < GDELT_CACHE_TTL) {
    return gdeltCache.data;
  }

  const events: ConflictEvent[] = [];

  try {
    const redAlerts = await fetchOrefAlerts();
    for (let i = 0; i < redAlerts.length; i++) {
      const alert = redAlerts[i];
      if (!alert.lat || !alert.lng) continue;
      events.push({
        id: `alert_${alert.id}`,
        type: alert.threatType === 'rockets' ? 'missile' : alert.threatType === 'missiles' ? 'missile' : alert.threatType === 'uav_intrusion' ? 'airstrike' : 'defense',
        lat: alert.lat,
        lng: alert.lng,
        title: alert.city,
        description: `Active alert: ${alert.threatType} - ${alert.region}`,
        timestamp: alert.timestamp,
        severity: alert.countdown <= 15 ? 'critical' : alert.countdown <= 45 ? 'high' : 'medium',
      });
    }
  } catch {}

  try {
    const hotspots = await fetchThermalHotspots();
    const recentHotspots = hotspots
      .filter(h => Date.now() - new Date(h.timestamp).getTime() < 24 * 3600 * 1000)
      .slice(0, 30);
    for (let i = 0; i < recentHotspots.length; i++) {
      const h = recentHotspots[i];
      events.push({
        id: `thermal_${i}`,
        type: 'airstrike',
        lat: h.lat,
        lng: h.lng,
        title: `Thermal anomaly (${h.confidence}% confidence)`,
        description: `NASA FIRMS satellite detection - ${h.brightness.toFixed(0)}K brightness`,
        timestamp: h.timestamp,
        severity: h.confidence >= 80 ? 'high' : h.confidence >= 50 ? 'medium' : 'low',
      });
    }
  } catch {}

  try {
    const eqs = await fetchEarthquakes();
    for (let i = 0; i < eqs.length; i++) {
      const eq = eqs[i];
      events.push({
        id: `eq_${i}`,
        type: 'ground',
        lat: eq.lat,
        lng: eq.lng,
        title: `M${eq.magnitude} Earthquake`,
        description: `${eq.place || 'Unknown location'} - Depth: ${eq.depth}km`,
        timestamp: eq.timestamp,
        severity: eq.magnitude >= 5 ? 'critical' : eq.magnitude >= 4 ? 'high' : eq.magnitude >= 3 ? 'medium' : 'low',
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
            id: `gdelt_${i}`,
            type,
            lat: coords.lat,
            lng: coords.lng,
            title: article.title.length > 80 ? article.title.substring(0, 77) + '...' : article.title,
            description: `Source: ${article.domain} | ${article.sourcecountry || 'International'}`,
            timestamp: ts,
            severity,
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

  gdeltCache = { data: deduped, fetchedAt: Date.now() };
  mergeIntoHistory(deduped);
  console.log(`[EVENTS] ${deduped.length} real conflict events (alerts: ${events.filter(e => e.id.startsWith('alert_')).length}, thermal: ${events.filter(e => e.id.startsWith('thermal_')).length}, seismic: ${events.filter(e => e.id.startsWith('eq_')).length}, gdelt: ${events.filter(e => e.id.startsWith('gdelt_')).length})`);
  return deduped;
}


const RED_ALERT_POOL: Omit<RedAlert, 'timestamp' | 'active'>[] = [
  // ISRAEL
  { id: 'ra1', city: 'Sderot', cityHe: 'שדרות', cityAr: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'rockets', lat: 31.525, lng: 34.596 },
  { id: 'ra2', city: 'Ashkelon', cityHe: 'אשקלון', cityAr: 'عسقلان', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 31.669, lng: 34.571 },
  { id: 'ra3', city: 'Be\'er Sheva', cityHe: 'באר שבע', cityAr: 'بئر السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', country: 'Israel', countryCode: 'IL', countdown: 60, threatType: 'rockets', lat: 31.252, lng: 34.791 },
  { id: 'ra4', city: 'Tel Aviv', cityHe: 'תל אביב', cityAr: 'تل أبيب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.085, lng: 34.782 },
  { id: 'ra5', city: 'Haifa', cityHe: 'חיפה', cityAr: 'حيفا', region: 'Haifa Bay', regionHe: 'מפרץ חיפה', regionAr: 'خليج حيفا', country: 'Israel', countryCode: 'IL', countdown: 60, threatType: 'rockets', lat: 32.794, lng: 34.990 },
  { id: 'ra6', city: 'Kiryat Shmona', cityHe: 'קריית שמונה', cityAr: 'كريات شمونة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 0, threatType: 'rockets', lat: 33.208, lng: 35.571 },
  { id: 'ra7', city: 'Nahariya', cityHe: 'נהריה', cityAr: 'نهاريا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'rockets', lat: 33.005, lng: 35.098 },
  { id: 'ra8', city: 'Metula', cityHe: 'מטולה', cityAr: 'المطلة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 0, threatType: 'rockets', lat: 33.280, lng: 35.578 },
  { id: 'ra9', city: 'Tiberias', cityHe: 'טבריה', cityAr: 'طبريا', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'missiles', lat: 32.796, lng: 35.530 },
  { id: 'ra10', city: 'Netanya', cityHe: 'נתניה', cityAr: 'نتانيا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'hostile_aircraft_intrusion', lat: 32.333, lng: 34.857 },
  { id: 'ra11', city: 'Safed', cityHe: 'צפת', cityAr: 'صفد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'uav_intrusion', lat: 32.966, lng: 35.496 },
  { id: 'ra12', city: 'Eilat', cityHe: 'אילת', cityAr: 'إيلات', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'missiles', lat: 29.558, lng: 34.952 },
  { id: 'ra13', city: 'Rishon LeZion', cityHe: 'ראשון לציון', cityAr: 'ريشون لتسيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 31.964, lng: 34.804 },
  { id: 'ra14', city: 'Petah Tikva', cityHe: 'פתח תקווה', cityAr: 'بيتح تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.089, lng: 34.886 },
  { id: 'ra15', city: 'Ashdod', cityHe: 'אשדוד', cityAr: 'أسدود', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 45, threatType: 'rockets', lat: 31.801, lng: 34.650 },
  { id: 'ra16', city: 'Herzliya', cityHe: 'הרצליה', cityAr: 'هرتسليا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.166, lng: 34.846 },
  { id: 'ra17', city: 'Acre', cityHe: 'עכו', cityAr: 'عكا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 32.928, lng: 35.076 },
  { id: 'ra18', city: 'Karmiel', cityHe: 'כרמיאל', cityAr: 'كرميئيل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجליل الأسفل', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 32.919, lng: 35.296 },
  { id: 'ra19', city: 'Nof HaGalil', cityHe: 'נוף הגליל', cityAr: 'نوف هجليل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفל', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'uav_intrusion', lat: 32.700, lng: 35.320 },
  { id: 'ra20', city: 'Jerusalem', cityHe: 'ירושלים', cityAr: 'القدس', region: 'Jerusalem', regionHe: 'ירושלים', regionAr: 'القدس', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'missiles', lat: 31.769, lng: 35.216 },
  // LEBANON
  { id: 'ra21', city: 'Beirut', cityHe: 'ביירות', cityAr: 'بيروت', region: 'Beirut', regionHe: 'ביירות', regionAr: 'بيروت', country: 'Lebanon', countryCode: 'LB', countdown: 45, threatType: 'missiles', lat: 33.894, lng: 35.502 },
  { id: 'ra22', city: 'Sidon', cityHe: 'צידון', cityAr: 'صيدا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 33.563, lng: 35.376 },
  { id: 'ra23', city: 'Tyre', cityHe: 'צור', cityAr: 'صور', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 15, threatType: 'missiles', lat: 33.273, lng: 35.194 },
  { id: 'ra24', city: 'Tripoli', cityHe: 'טריפולי', cityAr: 'طرابلس', region: 'North Lebanon', regionHe: 'צפון לבנון', regionAr: 'شمال لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 60, threatType: 'missiles', lat: 34.437, lng: 35.850 },
  { id: 'ra25', city: 'Baalbek', cityHe: 'בעלבכ', cityAr: 'بعلبك', region: 'Bekaa Valley', regionHe: 'בקעת הבקאע', regionAr: 'وادي البقاع', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 34.006, lng: 36.218 },
  { id: 'ra26', city: 'Nabatieh', cityHe: 'נבטייה', cityAr: 'النبطية', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.378, lng: 35.484 },
  // IRAN
  { id: 'ra27', city: 'Tehran', cityHe: 'טהרן', cityAr: 'طهران', region: 'Tehran Province', regionHe: 'מחוז טהרן', regionAr: 'محافظة طهران', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 35.689, lng: 51.389 },
  { id: 'ra28', city: 'Isfahan', cityHe: 'אספהאן', cityAr: 'أصفهان', region: 'Isfahan Province', regionHe: 'מחוז אספהאן', regionAr: 'محافظة أصفهان', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 32.655, lng: 51.668 },
  { id: 'ra29', city: 'Shiraz', cityHe: 'שיראז', cityAr: 'شيراز', region: 'Fars Province', regionHe: 'מחוז פארס', regionAr: 'محافظة فارس', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 29.592, lng: 52.584 },
  { id: 'ra30', city: 'Tabriz', cityHe: 'תבריז', cityAr: 'تبريز', region: 'East Azerbaijan', regionHe: 'אזרבייג\'ן מזרחי', regionAr: 'أذربيجان الشرقية', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 38.080, lng: 46.292 },
  { id: 'ra31', city: 'Kermanshah', cityHe: 'כרמנשאה', cityAr: 'كرمانشاه', region: 'Kermanshah Province', regionHe: 'מחוז כרמנשאה', regionAr: 'محافظة كرمانشاه', country: 'Iran', countryCode: 'IR', countdown: 60, threatType: 'missiles', lat: 34.314, lng: 47.065 },
  { id: 'ra32', city: 'Bandar Abbas', cityHe: 'בנדר עבאס', cityAr: 'بندر عباس', region: 'Hormozgan', regionHe: 'הורמוזגן', regionAr: 'هرمزجان', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 27.183, lng: 56.267 },
  { id: 'ra33', city: 'Bushehr', cityHe: 'בושהר', cityAr: 'بوشهر', region: 'Bushehr Province', regionHe: 'מחוז בושהר', regionAr: 'محافظة بوشهر', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 28.922, lng: 50.838 },
  // SYRIA
  { id: 'ra34', city: 'Damascus', cityHe: 'דמשק', cityAr: 'دمشق', region: 'Damascus', regionHe: 'דמשק', regionAr: 'دمشق', country: 'Syria', countryCode: 'SY', countdown: 60, threatType: 'missiles', lat: 33.514, lng: 36.277 },
  { id: 'ra35', city: 'Aleppo', cityHe: 'חלב', cityAr: 'حلب', region: 'Aleppo Governorate', regionHe: 'מחוז חלב', regionAr: 'محافظة حلب', country: 'Syria', countryCode: 'SY', countdown: 90, threatType: 'missiles', lat: 36.202, lng: 37.160 },
  { id: 'ra36', city: 'Homs', cityHe: 'חומס', cityAr: 'حمص', region: 'Homs Governorate', regionHe: 'מחוז חומס', regionAr: 'محافظة حمص', country: 'Syria', countryCode: 'SY', countdown: 45, threatType: 'missiles', lat: 34.730, lng: 36.720 },
  { id: 'ra37', city: 'Latakia', cityHe: 'לטקיה', cityAr: 'اللاذقية', region: 'Latakia Governorate', regionHe: 'מחוז לטקיה', regionAr: 'محافظة اللاذقية', country: 'Syria', countryCode: 'SY', countdown: 60, threatType: 'missiles', lat: 35.540, lng: 35.770 },
  { id: 'ra38', city: 'Deir ez-Zor', cityHe: 'דיר א-זור', cityAr: 'دير الزور', region: 'Deir ez-Zor', regionHe: 'דיר א-זור', regionAr: 'دير الزور', country: 'Syria', countryCode: 'SY', countdown: 30, threatType: 'uav_intrusion', lat: 35.336, lng: 40.146 },
  // IRAQ
  { id: 'ra39', city: 'Baghdad', cityHe: 'בגדד', cityAr: 'بغداد', region: 'Baghdad', regionHe: 'בגדד', regionAr: 'بغداد', country: 'Iraq', countryCode: 'IQ', countdown: 90, threatType: 'rockets', lat: 33.313, lng: 44.366 },
  { id: 'ra40', city: 'Erbil', cityHe: 'ארביל', cityAr: 'أربيل', region: 'Kurdistan Region', regionHe: 'כורדיסטן', regionAr: 'إقليم كردستان', country: 'Iraq', countryCode: 'IQ', countdown: 60, threatType: 'missiles', lat: 36.191, lng: 44.009 },
  { id: 'ra41', city: 'Basra', cityHe: 'בצרה', cityAr: 'البصرة', region: 'Basra Governorate', regionHe: 'מחוז בצרה', regionAr: 'محافظة البصرة', country: 'Iraq', countryCode: 'IQ', countdown: 90, threatType: 'rockets', lat: 30.508, lng: 47.783 },
  { id: 'ra42', city: 'Sulaymaniyah', cityHe: 'סולימאניה', cityAr: 'السليمانية', region: 'Kurdistan Region', regionHe: 'כורדיסטן', regionAr: 'إقليم كردستان', country: 'Iraq', countryCode: 'IQ', countdown: 45, threatType: 'uav_intrusion', lat: 35.557, lng: 45.435 },
  // SAUDI ARABIA
  { id: 'ra43', city: 'Riyadh', cityHe: 'ריאד', cityAr: 'الرياض', region: 'Riyadh Region', regionHe: 'מחוז ריאד', regionAr: 'منطقة الرياض', country: 'Saudi Arabia', countryCode: 'SA', countdown: 120, threatType: 'missiles', lat: 24.713, lng: 46.675 },
  { id: 'ra44', city: 'Jeddah', cityHe: 'ג\'דה', cityAr: 'جدة', region: 'Makkah Region', regionHe: 'מחוז מכה', regionAr: 'منطقة مكة المكرمة', country: 'Saudi Arabia', countryCode: 'SA', countdown: 120, threatType: 'missiles', lat: 21.486, lng: 39.177 },
  { id: 'ra45', city: 'Dhahran', cityHe: 'דהרן', cityAr: 'الظهران', region: 'Eastern Province', regionHe: 'המחוז המזרחי', regionAr: 'المنطقة الشرقية', country: 'Saudi Arabia', countryCode: 'SA', countdown: 60, threatType: 'missiles', lat: 26.282, lng: 50.114 },
  { id: 'ra46', city: 'Abha', cityHe: 'אבהא', cityAr: 'أبها', region: 'Asir Region', regionHe: 'מחוז עסיר', regionAr: 'منطقة عسير', country: 'Saudi Arabia', countryCode: 'SA', countdown: 45, threatType: 'uav_intrusion', lat: 18.216, lng: 42.505 },
  { id: 'ra47', city: 'Jizan', cityHe: 'ג\'יזאן', cityAr: 'جيزان', region: 'Jizan Region', regionHe: 'מחוז ג\'יזאן', regionAr: 'منطقة جازان', country: 'Saudi Arabia', countryCode: 'SA', countdown: 30, threatType: 'rockets', lat: 16.889, lng: 42.551 },
  // YEMEN
  { id: 'ra48', city: 'Sanaa', cityHe: 'צנעא', cityAr: 'صنعاء', region: 'Sanaa Governorate', regionHe: 'מחוז צנעא', regionAr: 'محافظة صنعاء', country: 'Yemen', countryCode: 'YE', countdown: 30, threatType: 'missiles', lat: 15.355, lng: 44.207 },
  { id: 'ra49', city: 'Aden', cityHe: 'עדן', cityAr: 'عدن', region: 'Aden Governorate', regionHe: 'מחוז עדן', regionAr: 'محافظة عدن', country: 'Yemen', countryCode: 'YE', countdown: 45, threatType: 'missiles', lat: 12.779, lng: 45.037 },
  { id: 'ra50', city: 'Marib', cityHe: 'מאריב', cityAr: 'مأرب', region: 'Marib Governorate', regionHe: 'מחוז מאריב', regionAr: 'محافظة مأرب', country: 'Yemen', countryCode: 'YE', countdown: 15, threatType: 'rockets', lat: 15.454, lng: 45.323 },
  // UAE
  { id: 'ra51', city: 'Abu Dhabi', cityHe: 'אבו דאבי', cityAr: 'أبو ظبي', region: 'Abu Dhabi', regionHe: 'אבו דאבי', regionAr: 'أبو ظبي', country: 'UAE', countryCode: 'AE', countdown: 120, threatType: 'missiles', lat: 24.453, lng: 54.377 },
  { id: 'ra52', city: 'Dubai', cityHe: 'דובאי', cityAr: 'دبي', region: 'Dubai', regionHe: 'דובאי', regionAr: 'دبي', country: 'UAE', countryCode: 'AE', countdown: 120, threatType: 'missiles', lat: 25.205, lng: 55.270 },
  // JORDAN
  { id: 'ra53', city: 'Amman', cityHe: 'עמאן', cityAr: 'عمان', region: 'Amman Governorate', regionHe: 'מחוז עמאן', regionAr: 'محافظة العاصمة', country: 'Jordan', countryCode: 'JO', countdown: 90, threatType: 'missiles', lat: 31.951, lng: 35.934 },
  { id: 'ra54', city: 'Irbid', cityHe: 'ארביד', cityAr: 'إربد', region: 'Irbid Governorate', regionHe: 'מחוז ארביד', regionAr: 'محافظة إربد', country: 'Jordan', countryCode: 'JO', countdown: 60, threatType: 'uav_intrusion', lat: 32.556, lng: 35.850 },
  // KUWAIT
  { id: 'ra55', city: 'Kuwait City', cityHe: 'כווית סיטי', cityAr: 'مدينة الكويت', region: 'Al Asimah', regionHe: 'אל-עאצמה', regionAr: 'العاصمة', country: 'Kuwait', countryCode: 'KW', countdown: 90, threatType: 'missiles', lat: 29.376, lng: 47.977 },
  // BAHRAIN
  { id: 'ra56', city: 'Manama', cityHe: 'מנאמה', cityAr: 'المنامة', region: 'Capital Governorate', regionHe: 'מחוז הבירה', regionAr: 'محافظة العاصمة', country: 'Bahrain', countryCode: 'BH', countdown: 90, threatType: 'missiles', lat: 26.223, lng: 50.587 },
  // QATAR
  { id: 'ra57', city: 'Doha', cityHe: 'דוחא', cityAr: 'الدوحة', region: 'Ad Dawhah', regionHe: 'אד-דוחה', regionAr: 'الدوحة', country: 'Qatar', countryCode: 'QA', countdown: 120, threatType: 'missiles', lat: 25.286, lng: 51.534 },
];

const TZEVAADOM_API_URL = 'https://api.tzevaadom.co.il/notifications';
const OREF_API_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';

const OREF_THREAT_MAP: Record<number, RedAlert['threatType']> = {
  1: 'rockets',
  2: 'missiles',
  3: 'hostile_aircraft_intrusion',
  4: 'uav_intrusion',
  5: 'rockets',
  6: 'rockets',
  7: 'uav_intrusion',
  13: 'missiles',
};

const OREF_CITY_COORDS: Record<string, { lat: number; lng: number; en: string; ar: string; region: string; regionHe: string; regionAr: string; countdown: number }> = {
  'שדרות': { lat: 31.525, lng: 34.596, en: 'Sderot', ar: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'אשקלון': { lat: 31.669, lng: 34.571, en: 'Ashkelon', ar: 'عسقلان', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'באר שבע': { lat: 31.252, lng: 34.791, en: "Be'er Sheva", ar: 'بئر السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל אביב': { lat: 32.085, lng: 34.782, en: 'Tel Aviv', ar: 'تل أبيب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חיפה': { lat: 32.794, lng: 34.990, en: 'Haifa', ar: 'حيفا', region: 'Haifa Bay', regionHe: 'מפרץ חיפה', regionAr: 'خليج حيفا', countdown: 60 },
  'ירושלים': { lat: 31.769, lng: 35.216, en: 'Jerusalem', ar: 'القدس', region: 'Jerusalem', regionHe: 'ירושלים', regionAr: 'القدس', countdown: 90 },
  'קריית שמונה': { lat: 33.208, lng: 35.571, en: 'Kiryat Shmona', ar: 'كريات شمونة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'נהריה': { lat: 33.005, lng: 35.098, en: 'Nahariya', ar: 'نهاريا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מטולה': { lat: 33.280, lng: 35.578, en: 'Metula', ar: 'المطلة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'טבריה': { lat: 32.796, lng: 35.530, en: 'Tiberias', ar: 'طبريا', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', countdown: 30 },
  'נתניה': { lat: 32.333, lng: 34.857, en: 'Netanya', ar: 'نتانيا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'צפת': { lat: 32.966, lng: 35.496, en: 'Safed', ar: 'صفد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'אילת': { lat: 29.558, lng: 34.952, en: 'Eilat', ar: 'إيلات', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'ראשון לציון': { lat: 31.964, lng: 34.804, en: 'Rishon LeZion', ar: 'ريشون لتسيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'פתח תקווה': { lat: 32.089, lng: 34.886, en: 'Petah Tikva', ar: 'بيتح تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אשדוד': { lat: 31.801, lng: 34.650, en: 'Ashdod', ar: 'أسدود', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'הרצליה': { lat: 32.166, lng: 34.846, en: 'Herzliya', ar: 'هرتسليا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'עכו': { lat: 32.928, lng: 35.076, en: 'Acre', ar: 'عكا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 30 },
  'כרמיאל': { lat: 32.919, lng: 35.296, en: 'Karmiel', ar: 'كرميئيل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נוף הגליל': { lat: 32.700, lng: 35.320, en: 'Nof HaGalil', ar: 'نوف هجليل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'רמת גן': { lat: 32.068, lng: 34.824, en: 'Ramat Gan', ar: 'رمات غان', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'בת ים': { lat: 32.023, lng: 34.751, en: 'Bat Yam', ar: 'بات يام', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חולון': { lat: 32.011, lng: 34.773, en: 'Holon', ar: 'حولون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'בני ברק': { lat: 32.084, lng: 34.835, en: 'Bnei Brak', ar: 'بني براك', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חדרה': { lat: 32.434, lng: 34.919, en: 'Hadera', ar: 'الخضيرة', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'עפולה': { lat: 32.608, lng: 35.289, en: 'Afula', ar: 'العفولة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'דימונה': { lat: 31.069, lng: 35.033, en: 'Dimona', ar: 'ديمونا', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערד': { lat: 31.261, lng: 35.213, en: 'Arad', ar: 'عراد', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'גשר הזיו': { lat: 33.053, lng: 35.142, en: 'Gesher HaZiv', ar: 'جسر الزيو', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מצובה': { lat: 33.076, lng: 35.191, en: 'Matzuva', ar: 'متسوبا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'סער': { lat: 33.030, lng: 35.114, en: "Sa'ar", ar: 'سعر', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'יערה': { lat: 33.065, lng: 35.238, en: "Ya'ara", ar: 'يعرا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'שלומי': { lat: 33.079, lng: 35.146, en: 'Shlomi', ar: 'شلومي', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חניתה': { lat: 33.094, lng: 35.194, en: 'Hanita', ar: 'حنيتا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'ראש הנקרה': { lat: 33.104, lng: 35.114, en: 'Rosh HaNikra', ar: 'رأس الناقورة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'בצת': { lat: 33.060, lng: 35.175, en: 'Betzet', ar: 'بيتست', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'לימן': { lat: 33.058, lng: 35.147, en: 'Liman', ar: 'ليمان', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'כברי': { lat: 33.025, lng: 35.141, en: 'Kabri', ar: 'كابري', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אביבים': { lat: 33.136, lng: 35.545, en: 'Avivim', ar: 'أفيفيم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'יפתח': { lat: 33.120, lng: 35.518, en: 'Yiftah', ar: 'يفتاح', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מלכיה': { lat: 33.232, lng: 35.575, en: 'Malkia', ar: 'ملكية', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعלى', countdown: 0 },
  'דפנה': { lat: 33.225, lng: 35.632, en: 'Dafna', ar: 'دافنا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'שניר': { lat: 33.253, lng: 35.646, en: 'Snir', ar: 'سنير', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מנרה': { lat: 33.233, lng: 35.541, en: 'Manara', ar: 'منارة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'יראון': { lat: 33.113, lng: 35.436, en: "Yir'on", ar: 'يرعون', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מרגליות': { lat: 33.190, lng: 35.575, en: 'Margaliot', ar: 'مرغليوت', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'בירנית': { lat: 33.086, lng: 35.370, en: 'Biranit', ar: 'بيرانيت', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'זרעית': { lat: 33.093, lng: 35.278, en: 'Zar\'it', ar: 'زرعيت', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'שתולה': { lat: 33.091, lng: 35.322, en: 'Shtula', ar: 'شتولا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'דובב': { lat: 33.112, lng: 35.388, en: 'Dovev', ar: 'دوبيف', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מעלות תרשיחא': { lat: 33.017, lng: 35.270, en: "Ma'alot-Tarshiha", ar: 'معالوت ترشيحا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'הגושרים': { lat: 33.218, lng: 35.625, en: 'HaGoshrim', ar: 'هجوشريم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'בית הלל': { lat: 33.196, lng: 35.603, en: 'Beit Hillel', ar: 'بيت هيلل', region: 'Upper Galilee', regionHe: 'גליل עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'חוף בצת': { lat: 33.065, lng: 35.104, en: 'Hof Betzet', ar: 'شاطئ بيتست', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חוף אכזיב': { lat: 33.049, lng: 35.106, en: 'Achziv Beach', ar: 'شاطئ أخزيف', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'עבדון': { lat: 33.020, lng: 35.176, en: 'Avdon', ar: 'عبدون', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'בן עמי': { lat: 33.007, lng: 35.133, en: "Ben Ami", ar: 'بن عمي', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'רמת טראמפ': { lat: 33.130, lng: 35.771, en: 'Ramat Trump', ar: 'رامات ترامب', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'שעל': { lat: 33.100, lng: 35.770, en: "Sha'al", ar: 'شعال', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'יונתן': { lat: 33.033, lng: 35.768, en: 'Yonatan', ar: 'يوناتان', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'כפר סבא': { lat: 32.175, lng: 34.907, en: 'Kfar Saba', ar: 'كفار سابا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'לוד': { lat: 31.951, lng: 34.892, en: 'Lod', ar: 'اللد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רמלה': { lat: 31.929, lng: 34.871, en: 'Ramla', ar: 'الرملة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רחובות': { lat: 31.898, lng: 34.811, en: 'Rehovot', ar: 'رحوفوت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'יבנה': { lat: 31.877, lng: 34.739, en: 'Yavne', ar: 'يبنة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 60 },
  'גבעתיים': { lat: 32.071, lng: 34.812, en: "Giv'atayim", ar: 'جفعاتايم', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'ראש העין': { lat: 32.096, lng: 34.957, en: "Rosh HaAyin", ar: 'رأس العين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'הוד השרון': { lat: 32.155, lng: 34.888, en: 'Hod HaSharon', ar: 'هود هشارون', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'רעננה': { lat: 32.184, lng: 34.871, en: "Ra'anana", ar: 'رعنانا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'רמת השרון': { lat: 32.145, lng: 34.839, en: 'Ramat HaSharon', ar: 'رمات هشارون', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'גני תקווה': { lat: 32.063, lng: 34.872, en: 'Ganei Tikva', ar: 'غاني تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'קריית אונו': { lat: 32.063, lng: 34.855, en: 'Kiryat Ono', ar: 'كريات أونو', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'גבעת שמואל': { lat: 32.077, lng: 34.853, en: "Giv'at Shmuel", ar: 'جفعات شموئيل', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אור יהודה': { lat: 32.031, lng: 34.852, en: 'Or Yehuda', ar: 'أور يهودا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'יהוד מונוסון': { lat: 32.033, lng: 34.886, en: 'Yehud-Monosson', ar: 'يهود', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אלעד': { lat: 32.052, lng: 34.952, en: 'Elad', ar: 'إلعاد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שוהם': { lat: 31.996, lng: 34.946, en: 'Shoham', ar: 'شوهام', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שדרות, איבים': { lat: 31.525, lng: 34.596, en: 'Sderot / Ivim', ar: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'נתיב העשרה': { lat: 31.556, lng: 34.520, en: 'Netiv HaAsara', ar: 'نتيف هعسارا', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 0 },
  'יד מרדכי': { lat: 31.588, lng: 34.557, en: 'Yad Mordechai', ar: 'ياد مردخاي', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ניצנים': { lat: 31.711, lng: 34.544, en: 'Nitzanim', ar: 'نتسانيم', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'כרמיה': { lat: 31.579, lng: 34.540, en: 'Karmia', ar: 'كرميا', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'אפרת': { lat: 31.654, lng: 35.155, en: 'Efrat', ar: 'إفرات', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'כפר עציון': { lat: 31.651, lng: 35.118, en: 'Kfar Etzion', ar: 'كفار عتصيون', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'אריאל': { lat: 32.106, lng: 35.174, en: 'Ariel', ar: 'أريئيل', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'קרני שומרון': { lat: 32.178, lng: 35.098, en: 'Karnei Shomron', ar: 'كرني شومرون', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'כפר קאסם': { lat: 32.113, lng: 34.976, en: 'Kafr Qasim', ar: 'كفر قاسم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'עין בוקק': { lat: 31.200, lng: 35.363, en: 'Ein Bokek', ar: 'عين بوقيق', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מצדה': { lat: 31.316, lng: 35.354, en: 'Masada', ar: 'مسادا', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מרעית': { lat: 31.240, lng: 34.625, en: "Mar'it", ar: 'مرعيت', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'כסייפה': { lat: 31.230, lng: 34.974, en: 'Kuseife', ar: 'كسيفة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל ערד': { lat: 31.280, lng: 35.130, en: 'Tel Arad', ar: 'تل عراد', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל אביב - דרום העיר ויפו': { lat: 32.052, lng: 34.759, en: 'Tel Aviv - South & Jaffa', ar: 'تل أبيب جنوب ويافا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - מזרח': { lat: 32.087, lng: 34.800, en: 'Tel Aviv - East', ar: 'تل أبيب شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - מרכז העיר': { lat: 32.075, lng: 34.775, en: 'Tel Aviv - Center', ar: 'تل أبيب وسط', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - עבר הירקון': { lat: 32.100, lng: 34.790, en: 'Tel Aviv - North Yarkon', ar: 'تل أبيب شمال', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'הרצליה - מערב': { lat: 32.163, lng: 34.793, en: 'Herzliya West', ar: 'هرتسليا غرب', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'הרצליה - מרכז וגליל ים': { lat: 32.166, lng: 34.830, en: 'Herzliya Center', ar: 'هرتسليا وسط', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'ראשון לציון - מזרח': { lat: 31.970, lng: 34.820, en: 'Rishon LeZion East', ar: 'ريشون لتسيون شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'ראשון לציון - מערב': { lat: 31.960, lng: 34.790, en: 'Rishon LeZion West', ar: 'ريشون لتسيون غرب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'רמת גן - מזרח': { lat: 32.068, lng: 34.840, en: 'Ramat Gan East', ar: 'رمات غان شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'רמת גן - מערב': { lat: 32.068, lng: 34.810, en: 'Ramat Gan West', ar: 'رمات غان غرب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'סביון': { lat: 32.044, lng: 34.866, en: 'Savyon', ar: 'سافيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'מזרעה': { lat: 33.040, lng: 35.135, en: "Mazra'a", ar: 'مزرعة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'שבי ציון': { lat: 33.005, lng: 35.082, en: 'Shavei Tzion', ar: 'شافي تسيون', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'רגבה': { lat: 33.016, lng: 35.156, en: 'Regba', ar: 'رجبة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'איזור תעשייה מילואות צפון': { lat: 33.070, lng: 35.130, en: 'Northern Industrial Zone', ar: 'منطقة صناعية شمالية', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אל פורעה': { lat: 31.193, lng: 34.776, en: "Al-Fur'a", ar: 'الفرعة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'כפר הנוקדים': { lat: 31.521, lng: 35.218, en: 'Kfar HaNokdim', ar: 'كفار هنوقديم', region: 'Judean Desert', regionHe: 'מדבר יהודה', regionAr: 'صحراء يهودا', countdown: 60 },
  'מלונות ים המלח מרכז': { lat: 31.170, lng: 35.363, en: 'Dead Sea Hotels Central', ar: 'فنادق البحر الميت', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מרחצאות עין גדי': { lat: 31.454, lng: 35.384, en: 'Ein Gedi Spa', ar: 'حمامات عين جدي', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'חוות מנחם': { lat: 31.220, lng: 35.350, en: 'Havat Menachem', ar: 'حافات مناحيم', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'בית שקמה': { lat: 31.614, lng: 34.549, en: 'Beit Shikma', ar: 'بيت شقمة', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ארז': { lat: 31.538, lng: 34.539, en: 'Erez', ar: 'إيرز', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 0 },
  'דורות': { lat: 31.489, lng: 34.568, en: 'Dorot', ar: 'دوروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'גברעם': { lat: 31.530, lng: 34.602, en: "Gav'ram", ar: 'غافرام', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'חלץ': { lat: 31.547, lng: 34.608, en: 'Heletz', ar: 'حيلتس', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 30 },
  'ניר עם': { lat: 31.550, lng: 34.565, en: 'Nir Am', ar: 'نير عام', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'עזר': { lat: 31.629, lng: 34.553, en: 'Ezer', ar: 'عيزر', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'מבקיעים': { lat: 31.558, lng: 34.560, en: "Mavki'im", ar: 'مافقيعيم', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ברור חיל': { lat: 31.582, lng: 34.573, en: 'Bror Hayil', ar: 'برور حايل', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'משען': { lat: 31.621, lng: 34.559, en: "Mash'en", ar: 'مشعن', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'כפר סילבר': { lat: 31.578, lng: 34.553, en: 'Kfar Silver', ar: 'كفار سيلفر', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'גיאה': { lat: 31.613, lng: 34.563, en: "Ge'a", ar: 'جيعا', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'אור הנר': { lat: 31.539, lng: 34.598, en: 'Or HaNer', ar: 'أور هنير', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'בת הדר': { lat: 31.624, lng: 34.554, en: 'Bat HaDar', ar: 'بات هدار', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'תלמי יפה': { lat: 31.609, lng: 34.553, en: 'Talme Yafe', ar: 'تلمي يافا', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'נירית': { lat: 32.164, lng: 34.913, en: 'Nirit', ar: 'نيريت', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'צופית': { lat: 32.148, lng: 34.935, en: 'Tzofit', ar: 'تسوفيت', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'כפר שמריהו': { lat: 32.184, lng: 34.804, en: 'Kfar Shmaryahu', ar: 'كفار شمارياهو', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'אלקנה': { lat: 32.109, lng: 35.033, en: 'Elkana', ar: 'ألكانا', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'בית דגן': { lat: 32.004, lng: 34.833, en: 'Beit Dagan', ar: 'بيت دجن', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'באר יעקב': { lat: 31.943, lng: 34.834, en: "Be'er Ya'akov", ar: 'بئير يعقوب', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נווה דניאל': { lat: 31.657, lng: 35.135, en: 'Neve Daniel', ar: 'نيفي دانيال', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'אלון שבות': { lat: 31.655, lng: 35.127, en: 'Alon Shvut', ar: 'ألون شفوت', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'ניר ישראל': { lat: 31.611, lng: 34.547, en: 'Nir Yisrael', ar: 'نير إسرائيل', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'דיר אל-אסד': { lat: 32.928, lng: 35.268, en: 'Deir al-Asad', ar: 'دير الأسد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 30 },
  'מגדל': { lat: 32.830, lng: 35.516, en: 'Migdal', ar: 'مجدل', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', countdown: 30 },
  'כפר מנדא': { lat: 32.812, lng: 35.265, en: 'Kafr Manda', ar: 'كفر مندا', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'ג\'דיידה-מכר': { lat: 32.929, lng: 35.145, en: 'Judeida-Makr', ar: 'جديدة المكر', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אבו סנאן': { lat: 32.955, lng: 35.169, en: 'Abu Snan', ar: 'أبو سنان', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ירכא': { lat: 32.958, lng: 35.187, en: 'Yirka', ar: 'يركا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מג\'ד אל-כרום': { lat: 32.919, lng: 35.244, en: 'Majd al-Krum', ar: 'مجد الكروم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כאבול': { lat: 32.876, lng: 35.213, en: 'Kabul', ar: 'كابول', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'טמרה': { lat: 32.855, lng: 35.198, en: 'Tamra', ar: 'طمرة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'שפרעם': { lat: 32.805, lng: 35.172, en: 'Shefa-Amr', ar: 'شفا عمرو', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'סכנין': { lat: 32.863, lng: 35.299, en: 'Sakhnin', ar: 'سخنين', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'עראבה': { lat: 32.851, lng: 35.337, en: 'Arraba', ar: 'عرابة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'דבוריה': { lat: 32.695, lng: 35.374, en: 'Daburiyya', ar: 'دبورية', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'כפר כנא': { lat: 32.750, lng: 35.340, en: 'Kafr Kanna', ar: 'كفر كنا', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נצרת': { lat: 32.700, lng: 35.297, en: 'Nazareth', ar: 'الناصرة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'ריינה': { lat: 32.711, lng: 35.310, en: 'Reineh', ar: 'الرينة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'עילוט': { lat: 32.720, lng: 35.268, en: 'Ilut', ar: 'إعيلوط', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'טורעאן': { lat: 32.780, lng: 35.336, en: "Tur'an", ar: 'طرعان', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'בועיינה-נוג\'ידאת': { lat: 32.764, lng: 35.357, en: 'Bueine Nujeidat', ar: 'بوعينة نجيدات', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נאעורה': { lat: 32.636, lng: 35.383, en: "Na'ura", ar: 'ناعورة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'מוקייבלה': { lat: 32.621, lng: 35.266, en: 'Muqeible', ar: 'مقيبلة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'פסוטה': { lat: 33.075, lng: 35.253, en: 'Fassuta', ar: 'فسوطة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חורפיש': { lat: 33.028, lng: 35.341, en: 'Hurfeish', ar: 'حرفيش', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ג\'ת': { lat: 32.874, lng: 35.100, en: 'Jatt', ar: 'جت', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 30 },
  'פקיעין': { lat: 32.975, lng: 35.321, en: "Peqi'in", ar: 'بقيعين', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כישור': { lat: 32.945, lng: 35.204, en: 'Kishor', ar: 'كيشور', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ג\'ולס': { lat: 32.938, lng: 35.172, en: 'Julis', ar: 'جولس', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'בית ג\'ן': { lat: 32.888, lng: 35.391, en: 'Beit Jann', ar: 'بيت جن', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 30 },
  'ג\'ש (גוש חלב)': { lat: 33.022, lng: 35.448, en: 'Jish', ar: 'الجش', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ראמה': { lat: 32.937, lng: 35.369, en: 'Rama', ar: 'رامة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'עין אל-אסד': { lat: 32.937, lng: 35.276, en: 'Ein al-Asad', ar: 'عين الأسد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ביריה': { lat: 32.979, lng: 35.507, en: 'Birya', ar: 'بريا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'עמוקה': { lat: 33.004, lng: 35.496, en: 'Amuka', ar: 'عموقة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'חצור הגלילית': { lat: 32.972, lng: 35.542, en: 'Hatzor HaGlilit', ar: 'حتسور الجليل', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ראש פינה': { lat: 32.969, lng: 35.542, en: 'Rosh Pina', ar: 'روش بينا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כנף': { lat: 32.800, lng: 35.744, en: 'Kanaf', ar: 'كناف', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'קצרין': { lat: 32.996, lng: 35.692, en: 'Katzrin', ar: 'كتسرين', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 15 },
  'מג\'דל שמס': { lat: 33.270, lng: 35.773, en: 'Majdal Shams', ar: 'مجدل شمس', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'מסעדה': { lat: 33.231, lng: 35.748, en: "Mas'ada", ar: 'مسعدة', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'עין קנייא': { lat: 33.244, lng: 35.762, en: 'Ein Qiniyye', ar: 'عين قنية', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'בוקעאתא': { lat: 33.226, lng: 35.781, en: "Buq'ata", ar: 'بقعاتا', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'כפר יאסיף': { lat: 32.948, lng: 35.139, en: 'Kafr Yasif', ar: 'كفر ياسيف', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ג\'דיידה': { lat: 32.929, lng: 35.145, en: 'Judeida', ar: 'الجديدة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'עספיא': { lat: 32.729, lng: 35.055, en: 'Isfiya', ar: 'عسفيا', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'דלית אל-כרמל': { lat: 32.695, lng: 35.042, en: 'Daliyat al-Karmel', ar: 'دالية الكرمل', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'אום אל-פחם': { lat: 32.519, lng: 35.153, en: 'Umm al-Fahm', ar: 'أم الفحم', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'באקה אל-גרביה': { lat: 32.419, lng: 35.049, en: 'Baqa al-Gharbiyye', ar: 'باقة الغربية', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'ג\'ת': { lat: 32.389, lng: 35.026, en: 'Jatt', ar: 'جت', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'טייבה': { lat: 32.267, lng: 35.009, en: 'Tayibe', ar: 'الطيبة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'טירה': { lat: 32.234, lng: 34.952, en: 'Tira', ar: 'الطيرة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'קלנסווה': { lat: 32.286, lng: 34.986, en: 'Qalansawe', ar: 'قلنسوة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ג\'לג\'וליה': { lat: 32.155, lng: 34.961, en: 'Jaljulia', ar: 'جلجولية', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רהט': { lat: 31.395, lng: 34.759, en: 'Rahat', ar: 'رهط', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערערה-בנגב': { lat: 31.148, lng: 34.989, en: 'Ar\'ara BaNegev', ar: 'عرعرة النقب', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'לקיה': { lat: 31.321, lng: 34.818, en: 'Lakiya', ar: 'لقية', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'חורה': { lat: 31.296, lng: 34.913, en: 'Hura', ar: 'حورة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל שבע': { lat: 31.252, lng: 34.825, en: 'Tel Sheva', ar: 'تل السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'עומר': { lat: 31.265, lng: 34.850, en: 'Omer', ar: 'عومر', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'מיתר': { lat: 31.324, lng: 34.935, en: 'Meitar', ar: 'ميتار', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'להבים': { lat: 31.373, lng: 34.812, en: 'Lehavim', ar: 'لهافيم', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערד-תעשייה': { lat: 31.260, lng: 35.200, en: 'Arad Industrial', ar: 'عراد صناعية', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ירוחם': { lat: 30.988, lng: 34.929, en: 'Yeruham', ar: 'يروحام', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'מצפה רמון': { lat: 30.611, lng: 34.801, en: 'Mitzpe Ramon', ar: 'متسبي رامون', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'עין גדי': { lat: 31.462, lng: 35.389, en: 'Ein Gedi', ar: 'عين جدي', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'נען': { lat: 31.873, lng: 34.869, en: "Na'an", ar: 'نعان', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'קריית מלאכי': { lat: 31.728, lng: 34.748, en: 'Kiryat Malakhi', ar: 'كريات ملاخي', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'גן יבנה': { lat: 31.793, lng: 34.707, en: 'Gan Yavne', ar: 'غان يافني', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'אופקים': { lat: 31.312, lng: 34.622, en: 'Ofakim', ar: 'أوفاكيم', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 45 },
  'נתיבות': { lat: 31.420, lng: 34.589, en: 'Netivot', ar: 'نتيفوت', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 30 },
};

let orefCache: { data: RedAlert[]; timestamp: number } | null = null;
const OREF_CACHE_TTL = 0;

const HE_TRANSLITERATION: Record<string, string> = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'kh', 'ט': 't',
  'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
  'ע': 'a', 'פ': 'p', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
  "'": "'", "׳": "'", '"': '', '״': '',
};

function transliterateHebrew(he: string): string {
  if (!/[\u0590-\u05FF]/.test(he)) return he;
  let result = '';
  for (const ch of he) {
    if (HE_TRANSLITERATION[ch] !== undefined) {
      result += HE_TRANSLITERATION[ch];
    } else {
      result += ch;
    }
  }
  result = result.replace(/\s+/g, ' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function parseCityAlerts(cities: string[], threat: number, timestamp: string): RedAlert[] {
  const alerts: RedAlert[] = [];
  const threatType = OREF_THREAT_MAP[threat] || 'rockets';
  for (const cityHe of cities) {
    const trimmed = cityHe.trim();
    if (!trimmed) continue;
    const known = OREF_CITY_COORDS[trimmed];
    const cityEn = known?.en || transliterateHebrew(trimmed);
    alerts.push({
      id: `oref-${trimmed}-${threat}-${timestamp}`,
      city: cityEn,
      cityHe: trimmed,
      cityAr: known?.ar || trimmed,
      region: known?.region || 'Israel',
      regionHe: known?.regionHe || 'ישראל',
      regionAr: known?.regionAr || 'إسرائيل',
      country: 'Israel',
      countryCode: 'IL',
      countdown: known?.countdown ?? 30,
      threatType,
      timestamp,
      active: true,
      lat: known?.lat ?? 31.5,
      lng: known?.lng ?? 35.0,
      source: 'live',
    });
  }
  return alerts;
}

const TZEVAADOM_HISTORY_URL = 'https://api.tzevaadom.co.il/alerts-history';

async function fetchFromTzevaadom(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const resp = await fetch(TZEVAADOM_API_URL, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const raw = await resp.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const alerts: RedAlert[] = [];
  for (const item of raw) {
    if (item.isDrill) continue;
    const cities: string[] = item.cities || [];
    const threat = item.threat || 1;
    let ts: string;
    if (typeof item.time === 'number') {
      ts = new Date(item.time * 1000).toISOString();
    } else if (typeof item.time === 'string') {
      ts = new Date(item.time).toISOString();
    } else {
      ts = new Date().toISOString();
    }
    alerts.push(...parseCityAlerts(cities, threat, ts));
  }
  return alerts;
}

async function fetchTzevaadomHistory(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const resp = await fetch(TZEVAADOM_HISTORY_URL, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const raw = await resp.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const alerts: RedAlert[] = [];
  const now = Date.now();
  const recentGroups = raw.filter((g: any) => {
    if (!g.alerts || g.alerts.length === 0) return false;
    const groupTime = g.alerts[0].time * 1000;
    return (now - groupTime) < 3600000;
  }).slice(0, 10);
  for (const group of recentGroups) {
    for (const item of group.alerts) {
      if (item.isDrill) continue;
      const cities: string[] = item.cities || [];
      const threat = item.threat || 1;
      let ts: string;
      if (typeof item.time === 'number') {
        ts = new Date(item.time * 1000).toISOString();
      } else if (typeof item.time === 'string') {
        ts = new Date(item.time).toISOString();
      } else {
        ts = new Date().toISOString();
      }
      alerts.push(...parseCityAlerts(cities, threat, ts));
    }
  }
  return alerts;
}

async function fetchFromOrefDirect(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const resp = await fetch(OREF_API_URL, {
    signal: controller.signal,
    headers: {
      'Referer': 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; WARROOM/2.0)',
    },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const text = await resp.text();
  if (!text || text.trim() === '' || text.trim() === '[]') return [];
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) return [];
  const alerts: RedAlert[] = [];
  for (const item of raw) {
    const cityHe = (item.data || item.title || '').trim();
    const cat = item.cat || 1;
    const ts = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
    alerts.push(...parseCityAlerts([cityHe], cat, ts));
  }
  return alerts;
}

async function fetchOrefAlerts(): Promise<RedAlert[]> {
  const now = Date.now();
  if (orefCache && (now - orefCache.timestamp) < OREF_CACHE_TTL) {
    return orefCache.data;
  }

  let alerts: RedAlert[] = [];

  try {
    alerts = await fetchFromTzevaadom();
  } catch {}

  if (alerts.length === 0) {
    try {
      alerts = await fetchFromOrefDirect();
    } catch {}
  }

  if (alerts.length === 0) {
    try {
      alerts = await fetchTzevaadomHistory();
      alerts.forEach(a => { a.active = false; a.countdown = 0; });
    } catch {}
  }

  if (alerts.length > 0) {
    orefCache = { data: alerts, timestamp: now };
  } else {
    orefCache = { data: [], timestamp: now };
  }

  return orefCache.data;
}

async function generateRedAlerts(): Promise<RedAlert[]> {
  const liveAlerts = await fetchOrefAlerts();
  return liveAlerts;
}

const alertHistory: RedAlert[] = [];
const classifiedMessageCache: ClassifiedMessage[] = [];
let aiClassificationCache: { data: ClassifiedMessage[]; fetchedAt: number } | null = null;
const AI_CLASSIFY_CACHE_TTL = 10_000;
let aiBriefCache: { data: AIBrief; fetchedAt: number } | null = null;
const AI_BRIEF_CACHE_TTL = 10_000;

function recordAlertHistory(alerts: RedAlert[]) {
  for (const a of alerts) {
    if (!alertHistory.find(h => h.id === a.id)) {
      alertHistory.push(a);
    }
  }
  if (alertHistory.length > 2000) alertHistory.splice(0, alertHistory.length - 2000);
}

async function classifyThreatWithAI(text: string): Promise<ThreatClassification> {
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: `You are a military intelligence analyst. Classify the following OSINT message. Return ONLY valid JSON with this exact schema:
{"category":"missile_launch|airstrike|naval_movement|ground_offensive|air_defense|drone_activity|nuclear_related|economic_impact|diplomatic|humanitarian|cyber_attack|unknown","severity":"critical|high|medium|low","confidence":0.0-1.0,"entities":["named entities"],"locations":["place names"],"keywords":["key terms"]}`
        },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      max_completion_tokens: 300,
    });
    const raw = resp.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || 'unknown',
        severity: parsed.severity || 'medium',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      };
    }
  } catch (err) {
    console.error('[AI-Classify] Error:', (err as Error).message);
  }
  return classifyThreatLocal(text);
}

function classifyThreatLocal(text: string): ThreatClassification {
  const lower = text.toLowerCase();
  const categories: Record<string, string[]> = {
    missile_launch: ['missile', 'launch', 'ballistic', 'rocket fire', 'rockets fired', 'launches', 'salvo'],
    airstrike: ['airstrike', 'air strike', 'bombing', 'bombed', 'sortie', 'f-35', 'f-15', 'jdam', 'bunker buster', 'strike on'],
    naval_movement: ['navy', 'naval', 'warship', 'carrier', 'destroyer', 'frigate', 'strait', 'maritime', 'tanker'],
    ground_offensive: ['troops', 'ground forces', 'infantry', 'armored', 'tank', 'incursion', 'crossing', 'offensive'],
    air_defense: ['intercepted', 'intercept', 'iron dome', 'arrow', "david's sling", 'thaad', 'patriot', 'air defense', 'shot down', 'downed'],
    drone_activity: ['drone', 'uav', 'shahed', 'hermes', 'reaper', 'heron', 'unmanned'],
    nuclear_related: ['nuclear', 'enrichment', 'uranium', 'iaea', 'fordow', 'natanz', 'centrifuge'],
    economic_impact: ['oil', 'crude', 'brent', 'gold', 'markets', 'sanctions', 'trade', 'price', 'commodity'],
    diplomatic: ['diplomat', 'negotiations', 'ceasefire', 'embassy', 'un security council', 'summit'],
    humanitarian: ['civilian', 'refugees', 'displaced', 'humanitarian', 'hospital', 'casualties', 'killed', 'wounded', 'dead'],
    cyber_attack: ['cyber', 'hack', 'ddos', 'breach', 'malware'],
  };

  let bestCategory: ThreatClassification['category'] = 'unknown';
  let maxScore = 0;
  const entities: string[] = [];
  const locations: string[] = [];
  const keywords: string[] = [];

  for (const [cat, terms] of Object.entries(categories)) {
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) {
        score++;
        keywords.push(term);
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat as ThreatClassification['category'];
    }
  }

  const locationPatterns = /\b(Israel|Iran|Lebanon|Syria|Iraq|Gaza|Yemen|Saudi Arabia|UAE|Qatar|Kuwait|Bahrain|Oman|Jordan|Turkey|Cyprus|Tel Aviv|Haifa|Tehran|Isfahan|Beirut|Damascus|Baghdad|Erbil|Sanaa|Riyadh|Dubai|Doha|Golan|Negev|Hormuz|Natanz|Fordow|Bushehr)\b/gi;
  const locMatches = text.match(locationPatterns) || [];
  locations.push(...[...new Set(locMatches.map(l => l.trim()))]);

  const entityPatterns = /\b(IDF|IRGC|Hezbollah|Hamas|Houthi|NATO|CENTCOM|IAF|USAF|IRGCN|PIJ|PMF|Mossad|CIA|UN|IAEA|Quds Force)\b/gi;
  const entMatches = text.match(entityPatterns) || [];
  entities.push(...[...new Set(entMatches.map(e => e.trim()))]);

  let severity: ThreatClassification['severity'] = 'low';
  if (lower.includes('breaking') || lower.includes('urgent') || lower.includes('critical') || lower.includes('mass casualt')) severity = 'critical';
  else if (lower.includes('confirmed') || lower.includes('multiple') || lower.includes('heavy')) severity = 'high';
  else if (maxScore >= 2) severity = 'medium';

  return {
    category: bestCategory,
    severity,
    confidence: Math.min(1, 0.3 + maxScore * 0.15),
    entities,
    locations,
    keywords: [...new Set(keywords)],
  };
}

async function classifyMessages(messages: TelegramMessage[]): Promise<ClassifiedMessage[]> {
  if (aiClassificationCache && Date.now() - aiClassificationCache.fetchedAt < AI_CLASSIFY_CACHE_TTL) {
    return aiClassificationCache.data;
  }

  const recent = messages.slice(0, 20);
  const results: ClassifiedMessage[] = [];

  const batchTexts = recent.map(m => m.text).join('\n---MSG_SEP---\n');
  let aiResults: ThreatClassification[] | null = null;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: `You are a military intelligence analyst. Classify each OSINT message separated by ---MSG_SEP---. Return a JSON array of objects, one per message, with this schema per object:
{"category":"missile_launch|airstrike|naval_movement|ground_offensive|air_defense|drone_activity|nuclear_related|economic_impact|diplomatic|humanitarian|cyber_attack|unknown","severity":"critical|high|medium|low","confidence":0.0-1.0,"entities":["named entities"],"locations":["place names"],"keywords":["key terms"]}
Return ONLY the JSON array, no other text.`
        },
        { role: 'user', content: batchTexts }
      ],
      temperature: 0.1,
      max_completion_tokens: 2000,
    });
    const raw = resp.choices?.[0]?.message?.content?.trim() || '';
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      aiResults = JSON.parse(arrMatch[0]);
    }
  } catch (err) {
    console.error('[AI-Classify-Batch] Error:', (err as Error).message);
  }

  for (let i = 0; i < recent.length; i++) {
    const msg = recent[i];
    let classification: ThreatClassification;
    if (aiResults && aiResults[i]) {
      const r = aiResults[i];
      classification = {
        category: r.category || 'unknown',
        severity: r.severity || 'medium',
        confidence: Math.min(1, Math.max(0, r.confidence || 0.5)),
        entities: Array.isArray(r.entities) ? r.entities : [],
        locations: Array.isArray(r.locations) ? r.locations : [],
        keywords: Array.isArray(r.keywords) ? r.keywords : [],
      };
    } else {
      classification = classifyThreatLocal(msg.text);
    }
    results.push({ ...msg, classification });
  }

  aiClassificationCache = { data: results, fetchedAt: Date.now() };
  classifiedMessageCache.length = 0;
  classifiedMessageCache.push(...results);
  return results;
}

function detectAlertPatterns(alerts: RedAlert[]): AlertPattern[] {
  const patterns: AlertPattern[] = [];
  if (alerts.length < 3) return patterns;

  const sorted = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const regionGroups: Record<string, RedAlert[]> = {};
  for (const a of sorted) {
    const key = a.region || a.country;
    if (!regionGroups[key]) regionGroups[key] = [];
    regionGroups[key].push(a);
  }

  for (const [region, regionAlerts] of Object.entries(regionGroups)) {
    if (regionAlerts.length < 3) continue;

    const intervals: number[] = [];
    for (let i = 1; i < regionAlerts.length; i++) {
      const diff = (new Date(regionAlerts[i].timestamp).getTime() - new Date(regionAlerts[i - 1].timestamp).getTime()) / 60000;
      if (diff > 0 && diff < 120) intervals.push(diff);
    }

    if (intervals.length >= 2) {
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const variance = intervals.reduce((s, v) => s + (v - avg) ** 2, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? stdDev / avg : 1;

      if (cv < 0.5 && avg < 60) {
        const lastTime = new Date(regionAlerts[regionAlerts.length - 1].timestamp).getTime();
        const predictedNext = new Date(lastTime + avg * 60000).toISOString();

        patterns.push({
          id: `pat-cycle-${region}-${Date.now()}`,
          type: 'launch_cycle',
          description: `Detected ~${Math.round(avg)}min launch cycle in ${region} (${regionAlerts.length} alerts, CV=${cv.toFixed(2)})`,
          confidence: Math.min(0.95, 0.5 + (1 - cv) * 0.5),
          detectedAt: new Date().toISOString(),
          affectedRegions: [region],
          predictedNext,
          intervalMinutes: Math.round(avg),
          alertCount: regionAlerts.length,
        });
      }
    }
  }

  const recentWindow = 30 * 60000;
  const now = Date.now();
  const recentAlerts = sorted.filter(a => now - new Date(a.timestamp).getTime() < recentWindow);
  const olderAlerts = sorted.filter(a => {
    const age = now - new Date(a.timestamp).getTime();
    return age >= recentWindow && age < recentWindow * 2;
  });

  if (recentAlerts.length > olderAlerts.length * 1.5 && recentAlerts.length >= 5) {
    const escalationRate = olderAlerts.length > 0 ? recentAlerts.length / olderAlerts.length : recentAlerts.length;
    const regions = [...new Set(recentAlerts.map(a => a.region || a.country))];
    patterns.push({
      id: `pat-esc-${Date.now()}`,
      type: 'escalation',
      description: `Alert rate increased ${escalationRate.toFixed(1)}x in last 30min (${recentAlerts.length} vs ${olderAlerts.length} previous)`,
      confidence: Math.min(0.9, 0.4 + escalationRate * 0.1),
      detectedAt: new Date().toISOString(),
      affectedRegions: regions,
      alertCount: recentAlerts.length,
    });
  } else if (olderAlerts.length > recentAlerts.length * 1.5 && olderAlerts.length >= 5) {
    const regions = [...new Set(olderAlerts.map(a => a.region || a.country))];
    patterns.push({
      id: `pat-deesc-${Date.now()}`,
      type: 'deescalation',
      description: `Alert rate decreased in last 30min (${recentAlerts.length} vs ${olderAlerts.length} previous)`,
      confidence: 0.6,
      detectedAt: new Date().toISOString(),
      affectedRegions: regions,
      alertCount: recentAlerts.length,
    });
  }

  const recentRegionCounts: Record<string, number> = {};
  const olderRegionCounts: Record<string, number> = {};
  for (const a of recentAlerts) recentRegionCounts[a.region || a.country] = (recentRegionCounts[a.region || a.country] || 0) + 1;
  for (const a of olderAlerts) olderRegionCounts[a.region || a.country] = (olderRegionCounts[a.region || a.country] || 0) + 1;

  for (const [region, count] of Object.entries(recentRegionCounts)) {
    if (count >= 3 && (!olderRegionCounts[region] || olderRegionCounts[region] < 2)) {
      patterns.push({
        id: `pat-geo-${region}-${Date.now()}`,
        type: 'geographic_shift',
        description: `New alert cluster emerged in ${region} (${count} alerts, not seen in previous window)`,
        confidence: 0.65,
        detectedAt: new Date().toISOString(),
        affectedRegions: [region],
        alertCount: count,
      });
    }
  }

  return patterns;
}

function scoreFalseAlarms(alerts: RedAlert[]): FalseAlarmScore[] {
  const scores: FalseAlarmScore[] = [];

  for (const alert of alerts) {
    const reasons: string[] = [];
    let score = 0;

    if (alert.source === 'sim') {
      score += 0.3;
      reasons.push('Simulated source (not live API)');
    }

    if (alert.countdown === 0) {
      score += 0.2;
      reasons.push('Zero countdown timer');
    }

    const elapsed = (Date.now() - new Date(alert.timestamp).getTime()) / 1000;
    if (elapsed > alert.countdown * 2 && alert.countdown > 0) {
      score += 0.15;
      reasons.push('Alert expired but no follow-up reports');
    }

    const sameRegionAlerts = alerts.filter(a =>
      a.id !== alert.id &&
      a.region === alert.region &&
      Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 120000
    );
    if (sameRegionAlerts.length === 0 && alert.threatType === 'rockets') {
      score += 0.1;
      reasons.push('Isolated alert with no corroborating nearby alerts');
    }

    if (alert.source === 'live' && sameRegionAlerts.filter(a => a.source === 'live').length > 0) {
      score -= 0.3;
      reasons.push('Corroborated by multiple live sources');
    }

    const finalScore = Math.max(0, Math.min(1, score));
    let recommendation: FalseAlarmScore['recommendation'] = 'likely_real';
    if (finalScore > 0.5) recommendation = 'likely_false';
    else if (finalScore > 0.25) recommendation = 'uncertain';

    scores.push({
      alertId: alert.id,
      score: parseFloat(finalScore.toFixed(2)),
      reasons,
      recommendation,
    });
  }

  return scores;
}

let multiLLMCache: { data: LLMAssessment[]; fetchedAt: number } | null = null;
const MULTI_LLM_CACHE_TTL = 30_000;

async function runMultiLLMAssessment(alerts: RedAlert[], messages: ClassifiedMessage[]): Promise<LLMAssessment[]> {
  if (multiLLMCache && Date.now() - multiLLMCache.fetchedAt < MULTI_LLM_CACHE_TTL) {
    return multiLLMCache.data;
  }

  const alertSummary = alerts.length > 0
    ? `Active alerts: ${alerts.length}. Regions: ${[...new Set(alerts.map(a => a.country))].join(', ')}. Types: ${[...new Set(alerts.map(a => a.threatType))].join(', ')}. Latest: ${alerts.slice(0, 5).map(a => `${a.city} (${a.threatType})`).join('; ')}.`
    : 'No active alerts.';

  const criticalMsgs = messages
    .filter(m => m.classification && (m.classification.severity === 'critical' || m.classification.severity === 'high'))
    .slice(0, 8);
  const intelDigest = criticalMsgs.map(m => `[${m.channel}] ${m.text.slice(0, 150)}`).join('\n');

  const systemPrompt = `You are a senior military intelligence analyst. Assess the current Middle East threat environment based on the data provided. Return ONLY valid JSON:
{"riskLevel":"EXTREME|HIGH|ELEVATED|MODERATE|LOW","summary":"2-3 sentence assessment","keyInsights":["insight1","insight2","insight3"],"confidence":0.0-1.0}`;

  const userPrompt = `ALERT STATUS: ${alertSummary}\n\nINTELLIGENCE DIGEST:\n${intelDigest || 'Limited OSINT available.'}`;

  const runOpenAI = async (): Promise<LLMAssessment> => {
    const start = Date.now();
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_completion_tokens: 500,
      });
      const raw = resp.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          engine: 'OpenAI',
          model: 'GPT-4.1',
          riskLevel: (['EXTREME', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'].includes(parsed.riskLevel) ? parsed.riskLevel : 'HIGH') as LLMAssessment['riskLevel'],
          summary: parsed.summary || 'Assessment pending.',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 5) : [],
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
          status: 'success',
        };
      }
      throw new Error('No valid JSON in response');
    } catch (err) {
      return {
        engine: 'OpenAI', model: 'GPT-4.1', riskLevel: 'MODERATE', summary: '',
        keyInsights: [], confidence: 0, generatedAt: new Date().toISOString(),
        latencyMs: Date.now() - start, status: 'error', error: (err as Error).message,
      };
    }
  };

  const runAnthropic = async (): Promise<LLMAssessment> => {
    const start = Date.now();
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const raw = resp.content[0]?.type === 'text' ? resp.content[0].text.trim() : '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          engine: 'Anthropic',
          model: 'Claude Sonnet',
          riskLevel: (['EXTREME', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'].includes(parsed.riskLevel) ? parsed.riskLevel : 'HIGH') as LLMAssessment['riskLevel'],
          summary: parsed.summary || 'Assessment pending.',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 5) : [],
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
          status: 'success',
        };
      }
      throw new Error('No valid JSON in response');
    } catch (err) {
      return {
        engine: 'Anthropic', model: 'Claude Sonnet', riskLevel: 'MODERATE', summary: '',
        keyInsights: [], confidence: 0, generatedAt: new Date().toISOString(),
        latencyMs: Date.now() - start, status: 'error', error: (err as Error).message,
      };
    }
  };

  const runGemini = async (): Promise<LLMAssessment> => {
    const start = Date.now();
    try {
      const resp = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: { maxOutputTokens: 800, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
      });
      let raw = '';
      if (resp.candidates && resp.candidates[0]?.content?.parts) {
        for (const part of resp.candidates[0].content.parts) {
          if (part.text) raw += part.text;
        }
      }
      raw = raw.trim() || resp.text?.trim() || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          engine: 'Google',
          model: 'Gemini 2.5 Flash',
          riskLevel: (['EXTREME', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'].includes(parsed.riskLevel) ? parsed.riskLevel : 'HIGH') as LLMAssessment['riskLevel'],
          summary: parsed.summary || 'Assessment pending.',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 5) : [],
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
          status: 'success',
        };
      }
      throw new Error('No valid JSON in response');
    } catch (err) {
      return {
        engine: 'Google', model: 'Gemini 2.5 Flash', riskLevel: 'MODERATE', summary: '',
        keyInsights: [], confidence: 0, generatedAt: new Date().toISOString(),
        latencyMs: Date.now() - start, status: 'error', error: (err as Error).message,
      };
    }
  };

  const runGrok = async (): Promise<LLMAssessment> => {
    const start = Date.now();
    try {
      const resp = await grok.chat.completions.create({
        model: 'x-ai/grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8192,
      });
      const raw = resp.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          engine: 'xAI',
          model: 'Grok-3',
          riskLevel: (['EXTREME', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'].includes(parsed.riskLevel) ? parsed.riskLevel : 'HIGH') as LLMAssessment['riskLevel'],
          summary: parsed.summary || 'Assessment pending.',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 5) : [],
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - start,
          status: 'success',
        };
      }
      throw new Error('No valid JSON in response');
    } catch (err) {
      return {
        engine: 'xAI', model: 'Grok-3', riskLevel: 'MODERATE', summary: '',
        keyInsights: [], confidence: 0, generatedAt: new Date().toISOString(),
        latencyMs: Date.now() - start, status: 'error', error: (err as Error).message,
      };
    }
  };

  const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([promise, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

  const timeoutFallback = (engine: string, model: string): LLMAssessment => ({
    engine, model, riskLevel: 'MODERATE', summary: '', keyInsights: [],
    confidence: 0, generatedAt: new Date().toISOString(), latencyMs: 15000,
    status: 'timeout', error: 'Request timed out (15s)',
  });

  const results = await Promise.allSettled([
    withTimeout(runOpenAI(), 15000, timeoutFallback('OpenAI', 'GPT-4.1')),
    withTimeout(runAnthropic(), 15000, timeoutFallback('Anthropic', 'Claude Sonnet')),
    withTimeout(runGemini(), 15000, timeoutFallback('Google', 'Gemini 2.5 Flash')),
    withTimeout(runGrok(), 15000, timeoutFallback('xAI', 'Grok-3')),
  ]);
  const assessments = results.map(r => r.status === 'fulfilled' ? r.value : {
    engine: 'Unknown', model: 'Unknown', riskLevel: 'MODERATE' as const, summary: '',
    keyInsights: [], confidence: 0, generatedAt: new Date().toISOString(),
    latencyMs: 0, status: 'error' as const, error: 'Promise rejected',
  });

  multiLLMCache = { data: assessments, fetchedAt: Date.now() };
  return assessments;
}

function computeConsensus(assessments: LLMAssessment[]): { consensusRisk: LLMAssessment['riskLevel']; modelAgreement: number } {
  const successful = assessments.filter(a => a.status === 'success');
  if (successful.length === 0) return { consensusRisk: 'MODERATE', modelAgreement: 0 };

  const riskOrder: Record<string, number> = { LOW: 1, MODERATE: 2, ELEVATED: 3, HIGH: 4, EXTREME: 5 };
  const riskValues = successful.map(a => riskOrder[a.riskLevel] || 2);
  const avgRisk = riskValues.reduce((s, v) => s + v, 0) / riskValues.length;

  let consensusRisk: LLMAssessment['riskLevel'] = 'MODERATE';
  if (avgRisk >= 4.5) consensusRisk = 'EXTREME';
  else if (avgRisk >= 3.5) consensusRisk = 'HIGH';
  else if (avgRisk >= 2.5) consensusRisk = 'ELEVATED';
  else if (avgRisk >= 1.5) consensusRisk = 'MODERATE';
  else consensusRisk = 'LOW';

  const maxDiff = Math.max(...riskValues) - Math.min(...riskValues);
  const modelAgreement = Math.max(0, 1 - maxDiff * 0.25);

  return { consensusRisk, modelAgreement: parseFloat(modelAgreement.toFixed(2)) };
}

function generateAnalytics(alerts: RedAlert[], messages: ClassifiedMessage[]): AnalyticsSnapshot {
  const regionCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const timeMap: Record<string, number> = {};
  const channelCounts: Record<string, number> = {};

  for (const a of alerts) {
    const region = a.region || a.country || 'Unknown';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    typeCounts[a.threatType] = (typeCounts[a.threatType] || 0) + 1;

    const timeKey = new Date(a.timestamp).toISOString().slice(0, 16);
    timeMap[timeKey] = (timeMap[timeKey] || 0) + 1;
  }

  for (const m of messages) {
    channelCounts[m.channel] = (channelCounts[m.channel] || 0) + 1;
  }

  const timeline = Object.entries(timeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([time, count]) => ({ time, count }));

  const now = Date.now();
  const activeCount = alerts.filter(a => {
    const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
    return elapsed < a.countdown || a.countdown === 0;
  }).length;

  const falseAlarms = scoreFalseAlarms(alerts);
  const falseCount = falseAlarms.filter(f => f.recommendation === 'likely_false').length;
  const falseAlarmRate = alerts.length > 0 ? falseCount / alerts.length : 0;

  const avgCountdown = alerts.length > 0
    ? alerts.reduce((s, a) => s + a.countdown, 0) / alerts.length
    : 0;

  const recentCount = alerts.filter(a => now - new Date(a.timestamp).getTime() < 30 * 60000).length;
  const olderCount = alerts.filter(a => {
    const age = now - new Date(a.timestamp).getTime();
    return age >= 30 * 60000 && age < 60 * 60000;
  }).length;
  let threatTrend: AnalyticsSnapshot['threatTrend'] = 'stable';
  if (recentCount > olderCount * 1.3) threatTrend = 'escalating';
  else if (olderCount > recentCount * 1.3) threatTrend = 'deescalating';

  const topSources = Object.entries(channelCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([channel, count]) => ({
      channel,
      count,
      reliability: channel.includes('OSINT') || channel.includes('Intel') ? 0.85 : channel.includes('news') ? 0.7 : 0.75,
    }));

  const patterns = detectAlertPatterns(alerts);

  return {
    alertsByRegion: regionCounts,
    alertsByType: typeCounts,
    alertTimeline: timeline,
    avgResponseTime: Math.round(avgCountdown),
    activeAlertCount: activeCount,
    falseAlarmRate: parseFloat(falseAlarmRate.toFixed(2)),
    threatTrend,
    topSources,
    patterns,
    falseAlarms,
  };
}

async function generateAIBriefLive(alerts: RedAlert[], messages: ClassifiedMessage[]): Promise<AIBrief> {
  if (aiBriefCache && Date.now() - aiBriefCache.fetchedAt < AI_BRIEF_CACHE_TTL) {
    return aiBriefCache.data;
  }

  const criticalMsgs = messages
    .filter(m => m.classification && (m.classification.severity === 'critical' || m.classification.severity === 'high'))
    .slice(0, 10);

  const alertSummary = alerts.length > 0
    ? `Active alerts: ${alerts.length} (${[...new Set(alerts.map(a => a.country))].join(', ')}). Types: ${[...new Set(alerts.map(a => a.threatType))].join(', ')}.`
    : 'No active alerts.';

  const intelDigest = criticalMsgs.map(m => `[${m.channel}] ${m.text.slice(0, 200)}`).join('\n');

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: `You are a senior military intelligence analyst producing a classified situation brief for a war room. Write concise, professional intelligence assessments. Return ONLY valid JSON:
{
  "summary": "2-3 paragraph situation assessment",
  "summaryAr": "Arabic translation of summary",
  "keyDevelopments": [{"text":"development","textAr":"Arabic","severity":"critical|high|medium","category":"category name"}],
  "focalPoints": ["key locations/topics"],
  "riskLevel": "EXTREME|HIGH|ELEVATED|MODERATE"
}`
        },
        {
          role: 'user',
          content: `Generate intelligence brief based on current data:\n\nALERT STATUS: ${alertSummary}\n\nINTELLIGENCE DIGEST:\n${intelDigest || 'Limited OSINT available.'}\n\nProvide assessment with 4-6 key developments.`
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 1500,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const brief: AIBrief = {
        id: 'brief-ai-' + Date.now(),
        summary: parsed.summary || 'Assessment generation in progress.',
        summaryAr: parsed.summaryAr || '',
        keyDevelopments: Array.isArray(parsed.keyDevelopments) ? parsed.keyDevelopments.map((d: Record<string, unknown>) => ({
          text: (d.text as string) || '',
          textAr: (d.textAr as string) || '',
          severity: (['critical', 'high', 'medium'].includes(d.severity as string) ? d.severity : 'medium') as 'critical' | 'high' | 'medium',
          category: (d.category as string) || 'General',
        })) : [],
        focalPoints: Array.isArray(parsed.focalPoints) ? parsed.focalPoints : [],
        riskLevel: (['EXTREME', 'HIGH', 'ELEVATED', 'MODERATE'].includes(parsed.riskLevel) ? parsed.riskLevel : 'HIGH') as AIBrief['riskLevel'],
        generatedAt: new Date().toISOString(),
        model: 'warroom-gpt-5.1',
      };
      aiBriefCache = { data: brief, fetchedAt: Date.now() };
      return brief;
    }
  } catch (err) {
    console.error('[AI-Brief] Error:', (err as Error).message);
  }

  const fallback: AIBrief = {
    id: `brief-fallback-${Date.now()}`,
    summary: 'AI intelligence briefing temporarily unavailable. All LLM providers failed to respond.',
    summaryAr: '\u0645\u0644\u062E\u0635 \u0627\u0644\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0645\u0624\u0642\u062A\u0627\u064B',
    keyDevelopments: [],
    focalPoints: [],
    riskLevel: 'HIGH',
    generatedAt: new Date().toISOString(),
    model: 'fallback',
  };
  aiBriefCache = { data: fallback, fetchedAt: Date.now() };
  return fallback;
}

async function generateDeductionLive(query: string, alerts: RedAlert[], messages: ClassifiedMessage[]): Promise<AIDeduction> {
  const alertContext = alerts.slice(0, 10).map(a => `${a.city} (${a.threatType}) at ${a.timestamp}`).join('; ');
  const intelContext = messages.slice(0, 5).map(m => `[${m.channel}] ${m.text.slice(0, 150)}`).join('\n');

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: `You are a senior intelligence analyst in a war room. Answer the analyst's query with numbered probability-based assessments. Be specific with percentages and timeframes. Format as structured intelligence assessment with 3-5 key points. Also provide a confidence score (0-1) and timeframe. Return ONLY valid JSON:
{"response":"your assessment","responseAr":"Arabic translation","confidence":0.0-1.0,"timeframe":"e.g. 24-48 hours"}`
        },
        {
          role: 'user',
          content: `QUERY: ${query}\n\nCURRENT ALERTS: ${alertContext || 'None active'}\n\nRECENT INTEL:\n${intelContext || 'Limited data available.'}`
        }
      ],
      temperature: 0.4,
      max_completion_tokens: 1000,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: 'ded-ai-' + Date.now(),
        query,
        response: parsed.response || 'Analysis pending.',
        responseAr: parsed.responseAr || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        timeframe: parsed.timeframe || '24-48 hours',
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('[AI-Deduct] Error:', (err as Error).message);
  }

  return {
    id: 'ded-fallback-' + Date.now(),
    query,
    response: 'AI deduction temporarily unavailable. The intelligence analysis provider did not respond.',
    responseAr: '\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0645\u0624\u0642\u062A\u0627\u064B',
    confidence: 0,
    timeframe: 'N/A',
    timestamp: new Date().toISOString(),
  };
}



let earthquakeCache: { data: EarthquakeEvent[]; fetchedAt: number } | null = null;
const EQ_CACHE_TTL = 10_000;

async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  if (earthquakeCache && Date.now() - earthquakeCache.fetchedAt < EQ_CACHE_TTL) {
    return earthquakeCache.data;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const resp = await fetch(
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=12&maxlatitude=42&minlongitude=24&maxlongitude=63&minmagnitude=2.5&limit=25&orderby=time',
      { headers: { 'User-Agent': 'WARROOM-Dashboard/1.0' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as { features: Array<{ id: string; properties: { mag: number; place: string; time: number; url: string; felt: number; tsunami: number }; geometry: { coordinates: [number, number, number] } }> };
    const events: EarthquakeEvent[] = json.features.map(f => ({
      id: f.id,
      magnitude: Math.round(f.properties.mag * 10) / 10,
      place: f.properties.place,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: Math.round(f.geometry.coordinates[2] * 10) / 10,
      timestamp: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
      felt: f.properties.felt || 0,
      tsunami: f.properties.tsunami || 0,
    }));
    earthquakeCache = { data: events, fetchedAt: Date.now() };
    return events;
  } catch {
    return earthquakeCache?.data || [];
  }
}

let thermalCache: { data: ThermalHotspot[]; fetchedAt: number } | null = null;
const THERMAL_CACHE_TTL = 10_000;

async function fetchThermalHotspots(): Promise<ThermalHotspot[]> {
  if (thermalCache && Date.now() - thermalCache.fetchedAt < THERMAL_CACHE_TTL) {
    return thermalCache.data;
  }
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
    if (lines.length < 2) return thermalCache?.data || [];
    const header = lines[0].split(',');
    const latIdx = header.indexOf('latitude');
    const lngIdx = header.indexOf('longitude');
    const briIdx = header.indexOf('bright_ti4');
    const frpIdx = header.indexOf('frp');
    const confIdx = header.indexOf('confidence');
    const satIdx = header.indexOf('satellite');
    const instrIdx = -1;
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
        lat,
        lng,
        brightness: parseFloat(cols[briIdx]) || 0,
        frp: parseFloat(cols[frpIdx]) || 0,
        confidence,
        satellite: cols[satIdx] || 'N20',
        instrument: instrIdx >= 0 ? (cols[instrIdx] || 'VIIRS') : 'VIIRS',
        acqDate: cols[dateIdx] || '',
        acqTime: cols[timeIdx] || '',
        dayNight: (cols[dnIdx] || 'D').trim() as 'D' | 'N',
      });
    }
    thermalCache = { data: hotspots, fetchedAt: Date.now() };
    console.log(`[FIRMS] Fetched ${hotspots.length} thermal hotspots in MENA region`);
    return hotspots;
  } catch (err) {
    console.error('[FIRMS] Fetch error:', err);
    return thermalCache?.data || [];
  }
}

// --- Real Cyber Threat Intelligence ---
const CYBER_CACHE_TTL = 10_000;
let cyberCache: { data: CyberEvent[]; fetchedAt: number } | null = null;

const CYBER_RSS_FEEDS = [
  'https://www.bleepingcomputer.com/feed/',
  'https://feeds.feedburner.com/TheHackersNews',
  'https://therecord.media/feed/',
  'https://www.darkreading.com/rss.xml',
];

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
    for (const pulse of (json.results || []).slice(0, 8)) {
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
        type,
        target: pulse.name.slice(0, 60),
        attacker: pulse.malware_families?.[0] || undefined,
        severity: tags.includes('critical') ? 'critical' : tags.includes('high') ? 'high' : tags.includes('low') ? 'low' : 'medium',
        sector,
        country,
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

async function fetchCyberEvents(): Promise<CyberEvent[]> {
  if (cyberCache && Date.now() - cyberCache.fetchedAt < CYBER_CACHE_TTL) return cyberCache.data;

  try {
    const [articles, otxEvents] = await Promise.all([fetchCyberRSSArticles(), fetchOTXPulses()]);

    let gptEvents: CyberEvent[] = [];
    if (articles.length > 0 && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      const articlesText = articles.slice(0, 25).map((a, i) =>
        `${i + 1}. TITLE: ${a.title}\nDATE: ${a.pubDate}\nSUMMARY: ${a.description}`
      ).join('\n\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_completion_tokens: 2500,
        messages: [
          {
            role: 'system',
            content: `You are a cyber threat intelligence analyst for a Middle East OSINT dashboard. Extract real cybersecurity incidents from news articles. Focus on: Iran, Israel, Gulf states (UAE, Saudi Arabia, Qatar, Bahrain), Lebanon, Egypt, Jordan, Turkey. Also include global APT campaigns, ransomware, and critical infrastructure attacks.

Return a JSON array of 6-12 events. Each object MUST have:
- id: string (e.g. "cy_001")
- type: exactly one of "ddos"|"intrusion"|"malware"|"phishing"|"defacement"|"data_exfil"|"scada"
- target: string (targeted org/system, max 60 chars)
- attacker: string (threat actor/group if known, omit if unknown)
- severity: exactly one of "critical"|"high"|"medium"|"low"
- sector: exactly one of "government"|"military"|"financial"|"energy"|"telecom"|"media"|"infrastructure"
- country: string (target country name)
- timestamp: ISO 8601 string (use article pub date)
- description: string (1-2 sentence intelligence-style summary, max 200 chars)

Return ONLY a valid JSON array. No markdown, no explanation.`,
          },
          {
            role: 'user',
            content: `Extract cyber events from these recent cybersecurity news articles:\n\n${articlesText}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim() || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as CyberEvent[];
        gptEvents = parsed.filter(e => e.id && e.type && e.target && e.severity && e.sector && e.country && e.timestamp && e.description);
      }
      console.log(`[CYBER] GPT extracted ${gptEvents.length} events from ${articles.length} RSS articles`);
    }

    const merged = [...gptEvents, ...otxEvents];
    const seen = new Set<string>();
    const deduped = merged.filter(e => {
      const key = e.target.toLowerCase().slice(0, 20);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    if (deduped.length > 0) {
      cyberCache = { data: deduped, fetchedAt: Date.now() };
      return deduped;
    }
    throw new Error('No events extracted');
  } catch (err) {
    console.error('[CYBER] Fetch error:', err instanceof Error ? err.message : err);
    return cyberCache?.data || [];
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get('/api/news', async (_req, res) => {
    res.json(await generateNews());
  });

  app.get('/api/commodities', (_req, res) => {
    res.json(generateCommodities());
  });

  app.get('/api/events', async (_req, res) => {
    const events = await fetchGDELTConflictEvents();
    res.json({
      events,
      flights: [],
      ships: [],
    });
  });

  const LIVE_TELEGRAM_CHANNELS = ['CIG_telegram', 'IntelCrab', 'GeoConfirmed', 'sentaborim', 'OSINTdefender', 'AviationIntel', 'rnintel'];

  const telegramCache = new Map<string, { data: TelegramMessage[]; fetchedAt: number }>();
  const TELEGRAM_CACHE_TTL = 10_000;
  const MAX_CACHE_CHANNELS = 50;
  const ALLOWED_CHANNEL_PATTERN = /^[a-zA-Z0-9_]{3,64}$/;

  function isLikelyEnglishOrArabic(text: string): boolean {
    if (text.length < 20) return true;
    const sample = text.substring(0, 200);
    const latinChars = (sample.match(/[a-zA-Z]/g) || []).length;
    const arabicChars = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const cyrillicChars = (sample.match(/[\u0400-\u04FF]/g) || []).length;
    const cjkChars = (sample.match(/[\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
    const total = sample.length || 1;
    const enArRatio = (latinChars + arabicChars) / total;
    const otherRatio = (cyrillicChars + cjkChars) / total;
    if (otherRatio > 0.3) return false;
    if (enArRatio > 0.15) return true;
    const digitsPunct = (sample.match(/[\d\s#@.,!?;:()\-]/g) || []).length;
    if ((latinChars + arabicChars + digitsPunct) / total > 0.5) return true;
    return false;
  }

  function stripHtmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  const inflightRequests = new Map<string, Promise<TelegramMessage[]>>();
  const rateLimitBackoff = new Map<string, number>();

  async function scrapeChannel(channel: string): Promise<TelegramMessage[]> {
    const cached = telegramCache.get(channel);
    const backoffUntil = rateLimitBackoff.get(channel) || 0;
    if (cached && (Date.now() - cached.fetchedAt < TELEGRAM_CACHE_TTL || Date.now() < backoffUntil)) {
      return cached.data;
    }

    const inflight = inflightRequests.get(channel);
    if (inflight) return inflight;

    const doScrape = async (): Promise<TelegramMessage[]> => {
    const msgs: TelegramMessage[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`https://t.me/s/${channel}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 429) {
        rateLimitBackoff.set(channel, Date.now() + 120000);
        if (cached) return cached.data;
        return [];
      }

      if (!response.ok) {
        if (cached) return cached.data;
        return [];
      }

      const html = await response.text();

      const blocks = html.split(/<div class="tgme_widget_message_wrap/);
      let count = 0;
      for (let bi = 1; bi < blocks.length && count < 15; bi++) {
        const block = blocks[bi];

        const postMatch = block.match(/data-post="([^"]*)"/);
        if (!postMatch) continue;
        const postId = postMatch[1];

        const textMatch = block.match(/tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        let text = textMatch ? stripHtmlToText(textMatch[1]) : '';

        const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"[^>]*>/);
        const datetime = timeMatch ? timeMatch[1] : '';

        let image: string | undefined;
        const photoMatch = block.match(/tgme_widget_message_photo_wrap[\s\S]*?background-image:\s*url\('([^']+)'\)/);
        if (photoMatch && photoMatch[1] && !photoMatch[1].includes('emoji')) {
          image = photoMatch[1];
        }
        if (!image) {
          const videoThumb = block.match(/tgme_widget_message_video_thumb[\s\S]*?background-image:\s*url\('([^']+)'\)/);
          if (videoThumb && videoThumb[1] && !videoThumb[1].includes('emoji')) {
            image = videoThumb[1];
          }
        }

        if ((!text || text.length < 5) && !image) continue;
        if (text && !isLikelyEnglishOrArabic(text) && !image) continue;

        if (text && text.length > 500) {
          text = text.substring(0, 497) + '...';
        }
        if (text) text = sanitizeText(text);

        msgs.push({
          id: `live_${channel}_${postId.replace('/', '_')}`,
          channel: `@${channel}`,
          text: text || (image ? '[Photo]' : ''),
          timestamp: datetime || new Date().toISOString(),
          ...(image ? { image } : {}),
        });
        count++;
      }

      if (count === 0) {
        const altRegex = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        const timeRegex = /<time[^>]*datetime="([^"]*)"[^>]*>/g;
        const texts: string[] = [];
        const times: string[] = [];
        let m;
        while ((m = altRegex.exec(html)) !== null) {
          const t = stripHtmlToText(m[1]);
          if (t.length >= 5 && isLikelyEnglishOrArabic(t)) {
            texts.push(t.length > 500 ? t.substring(0, 497) + '...' : t);
          }
        }
        while ((m = timeRegex.exec(html)) !== null) {
          times.push(m[1]);
        }
        const limit = Math.min(texts.length, times.length, 15);
        for (let i = 0; i < limit; i++) {
          msgs.push({
            id: `live_${channel}_alt_${i}`,
            channel: `@${channel}`,
            text: texts[i],
            timestamp: times[i] || new Date().toISOString(),
          });
        }
      }

      telegramCache.set(channel, { data: msgs, fetchedAt: Date.now() });
    } catch {
      if (cached) return cached.data;
      return [];
    }

    return msgs;
    };

    const promise = doScrape().finally(() => inflightRequests.delete(channel));
    inflightRequests.set(channel, promise);
    return promise;
  }

  async function fetchLiveTelegram(): Promise<TelegramMessage[]> {
    const results = await Promise.all(
      LIVE_TELEGRAM_CHANNELS.map(ch => scrapeChannel(ch).catch(() => []))
    );
    const allMessages = results.flat();
    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allMessages.slice(0, 50);
  }

  app.get('/api/telegram', async (_req, res) => {
    try {
      res.json(await fetchLiveTelegram());
    } catch {
      res.json([]);
    }
  });

  app.get('/api/telegram/live', async (req, res) => {
    const channelsParam = req.query.channels as string;
    if (!channelsParam) {
      return res.json([]);
    }
    const channels = channelsParam.split(',')
      .map(c => c.trim().replace(/^@/, ''))
      .filter(c => c && ALLOWED_CHANNEL_PATTERN.test(c))
      .slice(0, 12);

    if (telegramCache.size > MAX_CACHE_CHANNELS) {
      let oldest = '';
      let oldestTime = Infinity;
      for (const [key, val] of Array.from(telegramCache)) {
        if (val.fetchedAt < oldestTime) { oldest = key; oldestTime = val.fetchedAt; }
      }
      if (oldest) telegramCache.delete(oldest);
    }

    const results = await Promise.all(channels.map(ch => scrapeChannel(ch)));
    const allMessages = results.flat();
    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(allMessages);
  });

  app.get('/api/sirens', (_req, res) => {
    res.json([]);
  });

  app.get('/api/red-alerts', async (_req, res) => {
    res.json(await generateRedAlerts());
  });

  app.get('/api/adsb', async (_req, res) => {
    const flights = await fetchLiveAdsbFlights();
    res.json(flights);
  });

  app.get('/api/ai-brief', async (_req, res) => {
    const alerts = await generateRedAlerts();
    const messages = classifiedMessageCache;
    try {
      const brief = await generateAIBriefLive(alerts, messages);
      res.json(brief);
    } catch {
      res.status(503).json({ error: 'AI brief unavailable' });
    }
  });

  app.post('/api/ai-deduct', async (req, res) => {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string required' });
    }
    const alerts = await generateRedAlerts();
    const messages = classifiedMessageCache;
    try {
      const result = await generateDeductionLive(query, alerts, messages);
      res.json(result);
    } catch {
      res.status(503).json({ error: 'AI deduction unavailable' });
    }
  });

  app.get('/api/ai-classify', async (_req, res) => {
    const messages = classifiedMessageCache;
    const classified = await classifyMessages(messages);
    res.json(classified);
  });

  app.get('/api/analytics', async (_req, res) => {
    const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
    const messages = classifiedMessageCache;
    const [analytics, llmAssessments] = await Promise.all([
      Promise.resolve(generateAnalytics(alerts, messages)),
      runMultiLLMAssessment(alerts, messages),
    ]);
    const { consensusRisk, modelAgreement } = computeConsensus(llmAssessments);
    res.json({ ...analytics, llmAssessments, consensusRisk, modelAgreement });
  });

  app.get('/api/patterns', async (_req, res) => {
    const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
    const patterns = detectAlertPatterns(alerts);
    res.json(patterns);
  });

  app.get('/api/false-alarms', async (_req, res) => {
    const alerts = await generateRedAlerts();
    const scores = scoreFalseAlarms(alerts);
    res.json(scores);
  });

  app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':\n\n');

    const intervals: NodeJS.Timeout[] = [];

    const send = (event: string, data: unknown) => {
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {}
    };

    send('commodities', generateCommodities());
    fetchGDELTConflictEvents().then(async (events) => {
      const adsbFlights = await fetchLiveAdsbFlights();
      const flights = adsbFlights.map(f => ({
        id: f.id, callsign: f.callsign,
        type: (f.type === 'cargo' || f.type === 'private' || f.type === 'government') ? 'commercial' as const : f.type as 'military' | 'commercial' | 'surveillance',
        lat: f.lat, lng: f.lng, altitude: f.altitude, heading: f.heading,
        speed: f.groundSpeed, aircraft: f.aircraft, origin: f.origin, squawk: f.squawk,
      }));
      send('events', { events, flights, ships: [] });
    });
    generateNews().then(news => send('news', news));
    send('sirens', []);
    generateRedAlerts().then(alerts => {
      recordAlertHistory(alerts);
      send('red-alerts', alerts);
    });
    fetchLiveAdsbFlights().then(flights => send('adsb', flights));
    fetchLiveTelegram().then(tgMsgs => {
      send('telegram', tgMsgs);
      const classified = tgMsgs.map(m => ({ ...m }) as ClassifiedMessage);
      generateAIBriefLive([], classified).then(brief => send('ai-brief', brief));
      classifyMessages(tgMsgs).then(c => send('classified', c));
    }).catch(() => {
      send('telegram', []);
    });
    fetchCyberEvents().then(events => send('cyber', events));
    fetchXFeeds().then(xPosts => send('x-feed', xPosts));
    fetchEarthquakes().then(eqs => send('earthquakes', eqs));
    fetchThermalHotspots().then(hotspots => send('thermal', hotspots));

    generateRedAlerts().then(alerts => {
      const analytics = generateAnalytics(alerts, classifiedMessageCache);
      send('analytics', analytics);
    });

    intervals.push(setInterval(() => send('commodities', generateCommodities()), 15000));
    intervals.push(setInterval(() => fetchLiveAdsbFlights().then(flights => send('adsb', flights)), 10000));
    intervals.push(setInterval(() => generateRedAlerts().then(alerts => {
      recordAlertHistory(alerts);
      send('red-alerts', alerts);
    }), 3000));
    intervals.push(setInterval(() => {
      fetchGDELTConflictEvents().then(async (events) => {
        const adsbFlights = await fetchLiveAdsbFlights();
        const flights = adsbFlights.map(f => ({
          id: f.id, callsign: f.callsign,
          type: (f.type === 'cargo' || f.type === 'private' || f.type === 'government') ? 'commercial' as const : f.type as 'military' | 'commercial' | 'surveillance',
          lat: f.lat, lng: f.lng, altitude: f.altitude, heading: f.heading,
          speed: f.groundSpeed, aircraft: f.aircraft, origin: f.origin, squawk: f.squawk,
        }));
        send('events', { events, flights, ships: [] });
      });
    }, 15000));
    intervals.push(setInterval(() => generateNews().then(news => send('news', news)), 15000));
    intervals.push(setInterval(() => {
      fetchLiveTelegram().then(tgMsgs => send('telegram', tgMsgs)).catch(() => {});
    }, 15000));
    intervals.push(setInterval(async () => {
      const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
      const messages = classifiedMessageCache.length > 0 ? classifiedMessageCache : [];
      const brief = await generateAIBriefLive(alerts, messages);
      send('ai-brief', brief);
    }, 10000));
    intervals.push(setInterval(() => fetchXFeeds().then(xPosts => send('x-feed', xPosts)), 60000));
    intervals.push(setInterval(() => fetchEarthquakes().then(eqs => send('earthquakes', eqs)), 10000));
    intervals.push(setInterval(() => fetchThermalHotspots().then(hotspots => send('thermal', hotspots)), 10000));
    intervals.push(setInterval(() => fetchCyberEvents().then(events => send('cyber', events)), 10000));

    intervals.push(setInterval(async () => {
      const tgMsgs = await fetchLiveTelegram().catch(() => []);
      if (tgMsgs.length > 0) {
        const classified = await classifyMessages(tgMsgs);
        send('classified', classified);
      }
    }, 10000));

    intervals.push(setInterval(async () => {
      const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
      const analytics = generateAnalytics(alerts, classifiedMessageCache);
      send('analytics', analytics);
    }, 10000));

    intervals.push(setInterval(() => {
      console.log('[CACHE-FLUSH] Clearing all caches (15-min interval)');
      newsApiCache = null;
      gnewsCache = null;
      mediastackCache = null;
      xFeedCache.clear();
      osintFeedCache = null;
      freeRssCache = null;
      liveFxRates = {};
      liveFxFetchedAt = 0;
      gdeltCache = null;
      orefCache = null;
      aiBriefCache = null;
      aiClassificationCache = null;
      multiLLMCache = null;
      earthquakeCache = null;
      thermalCache = null;
      cyberCache = null;
    }, 15 * 60 * 1000));

    req.on('close', () => {
      intervals.forEach(clearInterval);
    });
  });

  app.get('/api/earthquakes', async (_req, res) => {
    const data = await fetchEarthquakes();
    res.json(data);
  });

  app.get('/api/thermal-hotspots', async (_req, res) => {
    const data = await fetchThermalHotspots();
    res.json(data);
  });

  app.get('/api/cyber', async (_req, res) => {
    const data = await fetchCyberEvents();
    res.json(data);
  });

  app.get('/api/x-feed', async (_req, res) => {
    const data = await fetchXFeeds();
    res.json(data);
  });

  app.get('/api/alert-history', (_req, res) => {
    const now = Date.now();
    const BUCKET_COUNT = 96;
    const BUCKET_SIZE_MS = 15 * 60 * 1000;
    const windowStart = now - BUCKET_COUNT * BUCKET_SIZE_MS;

    const buckets: Array<{ startTime: string; endTime: string; count: number; alerts: any[] }> = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const bStart = windowStart + i * BUCKET_SIZE_MS;
      const bEnd = bStart + BUCKET_SIZE_MS;
      buckets.push({
        startTime: new Date(bStart).toISOString(),
        endTime: new Date(bEnd).toISOString(),
        count: 0,
        alerts: [],
      });
    }

    for (const alert of alertHistory) {
      const alertTime = new Date(alert.timestamp).getTime();
      if (alertTime < windowStart || alertTime >= now) continue;
      const bucketIndex = Math.floor((alertTime - windowStart) / BUCKET_SIZE_MS);
      if (bucketIndex >= 0 && bucketIndex < BUCKET_COUNT) {
        const age = now - alertTime;
        const resolved = !alert.active || age > alert.countdown * 1000;
        buckets[bucketIndex].alerts.push({
          ...alert,
          resolved,
          resolvedAt: resolved ? new Date(alertTime + alert.countdown * 1000).toISOString() : undefined,
        });
        buckets[bucketIndex].count++;
      }
    }

    res.json(buckets);
  });

  app.get('/api/replay-data', (_req, res) => {
    res.json({
      events: historicalEvents,
      alerts: alertHistory.slice(0, 500),
    });
  });

  return httpServer;
}
