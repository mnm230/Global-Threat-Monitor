import type { TelegramMessage, RedAlert, NewsItem, BreakingNewsItem, SirenAlert } from "@shared/schema";
import { sanitizeText } from "../lib/utils";

const LIVE_TELEGRAM_CHANNELS = [
  'CIG_telegram', 'IntelCrab', 'GeoConfirmed', 'sentaborim', 'OSINTdefender', 'AviationIntel', 'rnintel',
  'ELINTNews', 'BNONewsRoom', 'FirstSquawk', 'Middle_East_Spectator', 'interbellumnews',
  'WarMonitor3', 'claboriau', 'clashreport', 'MEConflictNews', 'AbuAliEnglish',
  'conflictnews', 'ISWResearch', 'warmonitor3', 'WarSpottersINT', 'IntelSlava',
  'NewsInIsrael', 'alaborim', 'inaborim', 'IsraelWarRoom',
  'Israeli_Army_Spokesperson',
  'almanarnews', 'AlAhedNews', 'lebaborim', 'bintjbeilnews', 'lebanonnews2',
  'QudsN', 'mtaborim', 'ResistanceLB', 'LebUpdate', 'LebanonTimes', 'HezbollahWO',
  'NaharnetEnglish', 'L24English', 'LBCINews', 'NOWLebanon', 'MTVLebanonNews',
  'OTVLebanon', 'AlJadeedNews',
  'southlebanon', 'nabatiehnews', 'TyreCityNews', 'SidonOnline', 'BaalbekNews', 'BekaaNow',
  'Yemen_Press', 'YemenUpdate', 'AlMasiraaTV', 'RedSeaMonitor', 'HouthiWatch',
  'GazaNewsPlus', 'PalestineChron', 'PalestineResists', 'GazaWarUpdates', 'QudsNewsNetwork',
  'SyrianObservatry', 'IraqLiveUpdate', 'IranIntl_En', 'IranWire', 'IraqiPMF', 'SyriaDirectNews',
  'SouthFrontEng', 'MilitaryOSINT', 'Aurora_Intel', 'TheDeepStateCom',
  'AjaNews', 'thewarreporter', 'channelnabatieh', 'wfwitness',
];

const PRIORITY_TELEGRAM_CHANNELS = [
  'wfwitness', 'lebaborim', 'bintjbeilnews', 'almanarnews', 'AlAhedNews',
  'HezbollahWO', 'ResistanceLB', 'southlebanon', 'LebUpdate', 'nabatiehnews',
  'MTVLebanonNews', 'LBCINews', 'BNONewsRoom', 'GeoConfirmed', 'ELINTNews',
  'OSINTdefender', 'clashreport', 'QudsN', 'AlMasiraaTV', 'CIG_telegram',
  'Middle_East_Spectator', 'interbellumnews', 'lebanonnews2', 'conflictnews',
  'GazaWarUpdates', 'IranIntl_En', 'PalestineResists', 'ISWResearch',
  'warmonitor3', 'Aurora_Intel', 'AjaNews', 'thewarreporter', 'channelnabatieh',
];

const telegramCache = new Map<string, { data: TelegramMessage[]; fetchedAt: number }>();
const TELEGRAM_CACHE_TTL = 0;
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

      const arabicRatio = text ? (text.match(/[\u0600-\u06FF]/g) || []).length / Math.max(text.length, 1) : 0;
      const isArabicMsg = arabicRatio > 0.25;
      msgs.push({
        id: `live_${channel}_${postId.replace('/', '_')}`,
        channel: `@${channel}`,
        text: text || (image ? '[Photo]' : ''),
        timestamp: datetime || new Date().toISOString(),
        ...(image ? { image } : {}),
        ...(isArabicMsg && text ? { textAr: text } : {}),
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
        const arRatio = (texts[i].match(/[\u0600-\u06FF]/g) || []).length / Math.max(texts[i].length, 1);
        msgs.push({
          id: `live_${channel}_alt_${i}`,
          channel: `@${channel}`,
          text: texts[i],
          timestamp: times[i] || new Date().toISOString(),
          ...(arRatio > 0.25 ? { textAr: texts[i] } : {}),
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

export async function fetchLiveTelegram(): Promise<TelegramMessage[]> {
  const results = await Promise.all(
    LIVE_TELEGRAM_CHANNELS.map(ch => scrapeChannel(ch).catch(() => []))
  );
  const allMessages = results.flat();
  allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return allMessages.slice(0, 300);
}

export async function fetchPriorityTelegram(): Promise<TelegramMessage[]> {
  const fresh = await Promise.all(
    PRIORITY_TELEGRAM_CHANNELS.map(ch => scrapeChannel(ch).catch(() => []))
  );
  const freshMsgs = fresh.flat();

  const otherMsgs: TelegramMessage[] = [];
  for (const ch of LIVE_TELEGRAM_CHANNELS) {
    if (PRIORITY_TELEGRAM_CHANNELS.includes(ch)) continue;
    const cached = telegramCache.get(ch);
    if (cached) otherMsgs.push(...cached.data);
  }

  const all = [...freshMsgs, ...otherMsgs];
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return all.slice(0, 300);
}

export async function fetchLiveChannels(channelsParam: string): Promise<TelegramMessage[]> {
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
  return allMessages;
}

const BREAKING_KEYWORDS_CRITICAL = /\b(BREAKING|URGENT|JUST IN|BREAKING NEWS)\b/i;
const BREAKING_PATTERNS_CRITICAL = /\b(nuclear\s+(strike|attack|weapon|detonation)|chemical\s+(attack|weapon)|mass\s+casualt|invaded?|declaration\s+of\s+war|ceasefire\s+(declared|announced|agreement)|capital\s+(hit|struck|attacked|bombed)|strait\s+of\s+hormuz\s+(closed|blocked|mined)|aircraft\s+carrier\s+(hit|sunk|struck)|oil\s+facility\s+(hit|struck|attacked)|blackout\s+hit|total\s+blackout|power\s+grid|all\s+provinces)\b/i;
const BREAKING_PATTERNS_HIGH = /\b(airstrike|air\s*strike|missile\s+(hit|strike|launch|attack|fired|intercept)|rocket\s+(fire|barrage|attack|launch)|drone\s+(attack|strike|intercept)|explosion|siren|sirens?\s+(sounding|activated)|ground\s+(operation|invasion|offensive)|troops\s+(advancing|enter)|tanks?\s+(enter|advancing)|intercepted?\s+in\s+the\s+sk(y|ies)|casualties?\s+report|wounded|killed|dead|shot\s+down|base\s+under\s+attack|airport\s+under\s+attack|sunk|sinking|hit\s+by\s+(missile|rocket|drone))\b/i;
const EMOJI_URGENCY = /[\u26A0\uFE0F\u2757\u2755]/;

let breakingNewsCache: BreakingNewsItem[] = [];
const seenBreakingIds = new Set<string>();

export function detectBreakingNews(
  telegramMsgs: TelegramMessage[],
  xPosts: NewsItem[],
  alerts: RedAlert[]
): BreakingNewsItem[] {
  const now = Date.now();
  const items: BreakingNewsItem[] = [];
  const recencyMs = 10 * 60 * 1000;

  for (const msg of telegramMsgs) {
    const ts = new Date(msg.timestamp).getTime();
    if (isNaN(ts) || now - ts > recencyMs) continue;
    const text = msg.text || '';
    if (text.length < 15) continue;

    let severity: 'critical' | 'high' | null = null;

    if (BREAKING_KEYWORDS_CRITICAL.test(text) && (BREAKING_PATTERNS_HIGH.test(text) || BREAKING_PATTERNS_CRITICAL.test(text))) {
      severity = BREAKING_PATTERNS_CRITICAL.test(text) ? 'critical' : 'high';
    } else if (BREAKING_PATTERNS_CRITICAL.test(text)) {
      severity = 'critical';
    } else if (EMOJI_URGENCY.test(text) && BREAKING_PATTERNS_HIGH.test(text)) {
      severity = 'high';
    }

    if (!severity) continue;

    const id = `brk_tg_${msg.id}`;
    if (seenBreakingIds.has(id)) {
      const existing = breakingNewsCache.find(b => b.id === id);
      if (existing) items.push(existing);
      continue;
    }

    const headline = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200);

    if (headline.length < 10) continue;

    seenBreakingIds.add(id);
    items.push({
      id,
      headline,
      source: 'telegram',
      channel: msg.channel,
      severity,
      timestamp: msg.timestamp,
      originalText: text.slice(0, 500),
    });
  }

  for (const post of xPosts) {
    const ts = new Date(post.timestamp).getTime();
    if (isNaN(ts) || now - ts > recencyMs) continue;
    const text = post.title || '';
    if (text.length < 15) continue;

    let severity: 'critical' | 'high' | null = null;

    if (BREAKING_KEYWORDS_CRITICAL.test(text) && (BREAKING_PATTERNS_HIGH.test(text) || BREAKING_PATTERNS_CRITICAL.test(text))) {
      severity = BREAKING_PATTERNS_CRITICAL.test(text) ? 'critical' : 'high';
    } else if (BREAKING_PATTERNS_CRITICAL.test(text)) {
      severity = 'critical';
    } else if (EMOJI_URGENCY.test(text) && BREAKING_PATTERNS_HIGH.test(text)) {
      severity = 'high';
    }

    if (!severity) continue;

    const id = `brk_x_${post.id || post.title?.slice(0, 30)}`;
    if (seenBreakingIds.has(id)) {
      const existing = breakingNewsCache.find(b => b.id === id);
      if (existing) items.push(existing);
      continue;
    }

    seenBreakingIds.add(id);
    items.push({
      id,
      headline: text.replace(/https?:\/\/\S+/g, '').replace(/\n+/g, ' ').trim().slice(0, 200),
      source: 'x',
      channel: post.source,
      severity,
      timestamp: post.timestamp,
    });
  }

  const activeAlerts = alerts.filter(a => {
    const ts = new Date(a.timestamp).getTime();
    return !isNaN(ts) && now - ts < 120_000 && a.active;
  });
  if (activeAlerts.length >= 5) {
    const regions = [...new Set(activeAlerts.map(a => a.region))];
    const id = `brk_alert_${Math.floor(now / 60000)}`;
    if (!seenBreakingIds.has(id)) {
      seenBreakingIds.add(id);
      items.push({
        id,
        headline: `Mass alert activation: ${activeAlerts.length} active sirens across ${regions.join(', ')}`,
        headlineAr: `\u062A\u0641\u0639\u064A\u0644 \u0625\u0646\u0630\u0627\u0631\u0627\u062A \u062C\u0645\u0627\u0639\u064A\u0629: ${activeAlerts.length} \u0635\u0641\u0627\u0631\u0629 \u0646\u0634\u0637\u0629 \u0641\u064A ${regions.join('\u060C ')}`,
        source: 'alert',
        severity: activeAlerts.length >= 15 ? 'critical' : 'high',
        timestamp: new Date().toISOString(),
      });
    }
  }

  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const deduped = items.slice(0, 15);
  breakingNewsCache = deduped;

  if (seenBreakingIds.size > 500) {
    const keepIds = new Set(deduped.map(i => i.id));
    for (const id of seenBreakingIds) {
      if (!keepIds.has(id)) seenBreakingIds.delete(id);
    }
  }

  return deduped;
}

const SIREN_THREAT_MAP: Record<string, 'rocket' | 'missile' | 'uav' | 'hostile_aircraft'> = {
  rockets: 'rocket',
  missiles: 'missile',
  uav_intrusion: 'uav',
  hostile_aircraft_intrusion: 'hostile_aircraft',
};

export function mapAlertsToSirens(alerts: RedAlert[]): SirenAlert[] {
  const now = Date.now();
  const sirenThreatTypes = new Set(['rockets', 'missiles', 'uav_intrusion', 'hostile_aircraft_intrusion']);
  return alerts
    .filter(a => {
      if (!sirenThreatTypes.has(a.threatType)) return false;
      const ts = new Date(a.timestamp).getTime();
      if (isNaN(ts)) return false;
      if (a.active) return true;
      const remaining = a.countdown - Math.floor((now - ts) / 1000);
      if (remaining > 0) return true;
      return now - ts < 900_000;
    })
    .map(a => ({
      id: `siren_${a.id}`,
      location: a.city,
      locationAr: a.cityAr,
      region: a.region,
      regionAr: a.regionAr,
      threatType: (SIREN_THREAT_MAP[a.threatType] || 'rocket') as SirenAlert['threatType'],
      countdown: a.countdown,
      timestamp: a.timestamp,
      active: a.active || (a.countdown > 0 && (a.countdown - Math.floor((now - new Date(a.timestamp).getTime()) / 1000)) > 0),
    }));
}

export function clearCache(): void {
  telegramCache.clear();
  breakingNewsCache = [];
  seenBreakingIds.clear();
}
