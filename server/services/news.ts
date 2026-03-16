import type { NewsItem } from "@shared/schema";
import { sanitizeText, classifyTitle } from "../lib/utils";

const NEWS_CACHE_TTL = 10_000;
const NEWS_QUERY = 'israel OR iran OR hezbollah OR hamas OR missile OR attack OR war OR conflict';

let newsApiCache: { data: NewsItem[]; fetchedAt: number } | null = null;
let gnewsCache: { data: NewsItem[]; fetchedAt: number } | null = null;
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

const OSINT_RSS_FEEDS = [
  { url: 'https://www.longwarjournal.org/feed', source: 'Long War Journal' },
  { url: 'https://breakingdefense.com/feed/', source: 'Breaking Defense' },
  { url: 'https://www.middleeasteye.net/rss', source: 'Middle East Eye' },
  { url: 'https://www.al-monitor.com/rss', source: 'Al-Monitor' },
  { url: 'https://www.middleeastmonitor.com/feed/', source: 'MEMO' },
  { url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', source: 'Jerusalem Post' },
  { url: 'https://feeds.feedburner.com/WarOnTheRocks', source: 'War on the Rocks' },
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'Defense News' },
  { url: 'https://english.aawsat.com/feed', source: 'Asharq Al-Awsat' },
  { url: 'https://www.presstv.ir/RSS', source: 'Press TV (Iran)' },
  { url: 'https://www.i24news.tv/en/rss', source: 'i24 News (Israel)' },
  { url: 'https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml', source: 'The National' },
  { url: 'https://news.google.com/rss/search?q=middle+east+conflict&hl=en-US&gl=US&ceid=US:en', source: 'Google News ME' },
  { url: 'https://www.france24.com/en/middle-east/rss', source: 'France 24 ME' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC Middle East' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NYT Middle East' },
  { url: 'https://www.dailystar.com.lb/RSS.aspx', source: 'Daily Star Lebanon' },
  { url: 'https://english.alaraby.co.uk/rss', source: 'The New Arab' },
  { url: 'https://www.lorientlejour.com/rss', source: "L'Orient Le Jour" },
  { url: 'https://today.lorientlejour.com/rss', source: "L'Orient Today (EN)" },
  { url: 'https://www.naharnet.com/stories/en/rss.xml', source: 'Naharnet EN' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya EN' },
  { url: 'https://news.google.com/rss/search?q=south+lebanon+hezbollah+IDF+invasion&hl=en-US&gl=US&ceid=US:en', source: 'Google OSINT Lebanon' },
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
  const posts = await fetchOSINTRSSFeeds();
  posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return posts;
}

const FREE_NEWS_RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC ME' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NYT ME' },
  { url: 'https://news.google.com/rss/search?q=iran+israel+war+attack+strike&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran-Israel War' },
  { url: 'https://news.google.com/rss/search?q=lebanon+war+hezbollah+attack&hl=en-US&gl=US&ceid=US:en', source: 'GN: Lebanon War' },
  { url: 'https://news.google.com/rss/search?q=south+lebanon+IDF+hezbollah+airstrike&hl=en-US&gl=US&ceid=US:en', source: 'GN: S.Lebanon IDF' },
  { url: 'https://news.google.com/rss/search?q=beirut+strike+explosion+hezbollah&hl=en-US&gl=US&ceid=US:en', source: 'GN: Beirut' },
  { url: 'https://news.google.com/rss/search?q=nabatieh+bint+jbeil+sidon+lebanon+military&hl=en-US&gl=US&ceid=US:en', source: 'GN: Leb Cities' },
  { url: 'https://news.google.com/rss/search?q=houthi+attack+missile+drone+red+sea+ship&hl=en-US&gl=US&ceid=US:en', source: 'GN: Houthi' },
  { url: 'https://news.google.com/rss/search?q=yemen+airstrike+strike+killed+US+coalition&hl=en-US&gl=US&ceid=US:en', source: 'GN: Yemen Strikes' },
  { url: 'https://news.google.com/rss/search?q=red+sea+shipping+attack+tanker+seized&hl=en-US&gl=US&ceid=US:en', source: 'GN: Red Sea' },
  { url: 'https://news.google.com/rss/search?q=syria+airstrike+attack+killed+military&hl=en-US&gl=US&ceid=US:en', source: 'GN: Syria' },
  { url: 'https://news.google.com/rss/search?q=iraq+attack+drone+militia+pmu+pmf&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iraq' },
  { url: 'https://news.google.com/rss/search?q=saudi+arabia+attack+houthi+missile&hl=en-US&gl=US&ceid=US:en', source: 'GN: KSA' },
  { url: 'https://news.google.com/rss/search?q=uae+attack+drone+security+threat&hl=en-US&gl=US&ceid=US:en', source: 'GN: UAE' },
  { url: 'https://news.google.com/rss/search?q=iran+missile+drone+IRGC+attack+nuclear&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran' },
  { url: 'https://news.google.com/rss/search?q=iran+sanctions+nuclear+deal+threat&hl=en-US&gl=US&ceid=US:en', source: 'GN: Iran Nuclear' },
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

export async function generateNews(): Promise<NewsItem[]> {
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

export { fetchNewsAPI, fetchGNews, fetchMediastack, fetchFreeNewsRSS, fetchXFeeds };

export function clearCache(): void {
  newsApiCache = null;
  gnewsCache = null;
  mediastackCache = null;
  osintFeedCache = null;
  freeRssCache = null;
}
