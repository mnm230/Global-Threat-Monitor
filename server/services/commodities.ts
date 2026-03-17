import type { CommodityData } from "@shared/schema";
import { randomUA } from "../lib/utils";

interface CommodityMetaItem {
  symbol: string;
  name: string;
  nameAr: string;
  fallback: number;
  currency: string;
  category: 'commodity' | 'fx-major' | 'fx' | 'index';
  stooqSymbol?: string;
  yahooSymbol?: string;
  stooqDivisor?: number;
  fxKey?: string;
  invert?: boolean;
}

const COMMODITY_META: CommodityMetaItem[] = [
  { symbol: 'BRENT', name: 'Brent Crude', nameAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A', fallback: 88.06, currency: 'USD', category: 'commodity', stooqSymbol: 'cb.f', yahooSymbol: 'BZ=F' },
  { symbol: 'WTI', name: 'WTI Crude', nameAr: '\u062E\u0627\u0645 \u063A\u0631\u0628 \u062A\u0643\u0633\u0627\u0633', fallback: 84.40, currency: 'USD', category: 'commodity', stooqSymbol: 'cl.f', yahooSymbol: 'CL=F' },
  { symbol: 'GOLD', name: 'Gold Spot', nameAr: '\u0627\u0644\u0630\u0647\u0628', fallback: 5147.30, currency: 'USD', category: 'commodity', stooqSymbol: 'gc.f', yahooSymbol: 'GC=F' },
  { symbol: 'SILVER', name: 'Silver Spot', nameAr: '\u0627\u0644\u0641\u0636\u0629', fallback: 87.34, currency: 'USD', category: 'commodity', stooqSymbol: 'si.f', stooqDivisor: 100, yahooSymbol: 'SI=F' },
  { symbol: 'NATGAS', name: 'Natural Gas', nameAr: '\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0637\u0628\u064A\u0639\u064A', fallback: 3.03, currency: 'USD', category: 'commodity', stooqSymbol: 'ng.f', yahooSymbol: 'NG=F' },
  { symbol: 'WHEAT', name: 'Wheat Futures', nameAr: '\u0639\u0642\u0648\u062F \u0627\u0644\u0642\u0645\u062D', fallback: 602.50, currency: 'USD', category: 'commodity', stooqSymbol: 'zw.f', yahooSymbol: 'ZW=F' },
  { symbol: 'COPPER', name: 'Copper', nameAr: '\u0627\u0644\u0646\u062D\u0627\u0633', fallback: 5.90, currency: 'USD', category: 'commodity', stooqSymbol: 'hg.f', stooqDivisor: 100, yahooSymbol: 'HG=F' },
  { symbol: 'EUR/USD', name: 'Euro/US Dollar', nameAr: '\u064A\u0648\u0631\u0648/\u062F\u0648\u0644\u0627\u0631', fallback: 1.1640, currency: '', category: 'fx-major', fxKey: 'EUR', stooqSymbol: 'eurusd', yahooSymbol: 'EURUSD=X' },
  { symbol: 'GBP/USD', name: 'British Pound/Dollar', nameAr: '\u062C\u0646\u064A\u0647/\u062F\u0648\u0644\u0627\u0631', fallback: 1.3440, currency: '', category: 'fx-major', fxKey: 'GBP', stooqSymbol: 'gbpusd', yahooSymbol: 'GBPUSD=X' },
  { symbol: 'USD/JPY', name: 'US Dollar/Yen', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u064A\u0646', fallback: 157.67, currency: '', category: 'fx-major', fxKey: 'JPY', invert: true, stooqSymbol: 'usdjpy', yahooSymbol: 'USDJPY=X' },
  { symbol: 'USD/CHF', name: 'US Dollar/Swiss Franc', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0641\u0631\u0646\u0643', fallback: 0.7778, currency: '', category: 'fx-major', fxKey: 'CHF', invert: true, stooqSymbol: 'usdchf', yahooSymbol: 'USDCHF=X' },
  { symbol: 'AUD/USD', name: 'Aussie Dollar/Dollar', nameAr: '\u0623\u0633\u062A\u0631\u0627\u0644\u064A/\u062F\u0648\u0644\u0627\u0631', fallback: 0.7074, currency: '', category: 'fx-major', fxKey: 'AUD', stooqSymbol: 'audusd', yahooSymbol: 'AUDUSD=X' },
  { symbol: 'USD/CAD', name: 'US Dollar/Canadian', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0643\u0646\u062F\u064A', fallback: 1.3589, currency: '', category: 'fx-major', fxKey: 'CAD', invert: true, stooqSymbol: 'usdcad', yahooSymbol: 'USDCAD=X' },
  { symbol: 'USD/ILS', name: 'US Dollar/Shekel', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0634\u064A\u0642\u0644', fallback: 3.0847, currency: '', category: 'fx', fxKey: 'ILS', invert: true, stooqSymbol: 'usdils', yahooSymbol: 'USDILS=X' },
  { symbol: 'USD/IRR', name: 'US Dollar/Rial', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644', fallback: 42150, currency: '', category: 'fx', fxKey: 'IRR', invert: true },
  { symbol: 'USD/SAR', name: 'US Dollar/Riyal', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A', fallback: 3.7542, currency: '', category: 'fx', fxKey: 'SAR', invert: true, stooqSymbol: 'usdsar', yahooSymbol: 'USDSAR=X' },
  { symbol: 'USD/AED', name: 'US Dollar/Dirham', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u062F\u0631\u0647\u0645', fallback: 3.6729, currency: '', category: 'fx', fxKey: 'AED', invert: true, yahooSymbol: 'USDAED=X' },
  // Regional stock indices
  { symbol: 'TASI', name: 'Saudi Tadawul (TASI)', nameAr: '\u0645\u0624\u0634\u0631 \u062A\u062F\u0627\u0648\u0644 \u0627\u0644\u0633\u0639\u0648\u062F\u064A', fallback: 11480, currency: 'SAR', category: 'index', yahooSymbol: '^TASI' },
  { symbol: 'DFM', name: 'Dubai Financial Market', nameAr: '\u0633\u0648\u0642 \u062F\u0628\u064A \u0627\u0644\u0645\u0627\u0644\u064A', fallback: 4320, currency: 'AED', category: 'index', yahooSymbol: '^DFMGI' },
  { symbol: 'ADX', name: 'Abu Dhabi Index (ADX)', nameAr: '\u0645\u0624\u0634\u0631 \u0623\u0628\u0648\u0638\u0628\u064A', fallback: 9180, currency: 'AED', category: 'index', yahooSymbol: '^FTFADGI' },
  { symbol: 'TA-125', name: 'Tel Aviv 125', nameAr: '\u0628\u0648\u0631\u0635\u0629 \u062A\u0644 \u0623\u0628\u064A\u0628 125', fallback: 2140, currency: 'ILS', category: 'index', yahooSymbol: '^TA125.TA' },
  { symbol: 'EGX30', name: 'Egypt Exchange 30', nameAr: '\u0628\u0648\u0631\u0635\u0629 \u0645\u0635\u0631 30', fallback: 27500, currency: 'EGP', category: 'index', yahooSymbol: '^CASE' },
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

let liveCommodityPrices: Record<string, { price: number; change: number; changePercent: number }> = {};
let liveCommodityFetchedAt = 0;
const COMMODITY_PRICE_TTL = 12_000;
let commodityFetchInFlight: Promise<void> | null = null;

async function fetchYahooQuote(yahooSymbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const encoded = encodeURIComponent(yahooSymbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const json = await resp.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }> } };
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    if (!price || price <= 0) return null;
    const prev = (prevClose && prevClose > 0) ? prevClose : price;
    const change = price - prev;
    const changePercent = prev !== 0 ? (change / prev) * 100 : 0;
    return { price, change, changePercent };
  } catch {
    return null;
  }
}

async function fetchStooqQuote(stooqSymbol: string, divisor: number = 1): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcvp&d=d&e=csv`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': randomUA() },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const csv = (await resp.text()).trim();
    const parts = csv.split(',');
    if (parts.length < 9 || parts[6] === 'N/D') return null;
    const rawClose = parseFloat(parts[6]);
    const rawPrevClose = parseFloat(parts[8]);
    if (isNaN(rawClose) || rawClose <= 0) return null;
    const close = rawClose / divisor;
    const prev = (!isNaN(rawPrevClose) && rawPrevClose > 0) ? rawPrevClose / divisor : close;
    const change = close - prev;
    const changePercent = prev !== 0 ? (change / prev) * 100 : 0;
    return { price: close, change, changePercent };
  } catch {
    return null;
  }
}

async function fetchLiveCommodityPrices(): Promise<void> {
  if (Date.now() - liveCommodityFetchedAt < COMMODITY_PRICE_TTL && Object.keys(liveCommodityPrices).length > 0) return;
  if (commodityFetchInFlight) return commodityFetchInFlight;
  commodityFetchInFlight = _doFetchCommodityPrices().finally(() => { commodityFetchInFlight = null; });
  return commodityFetchInFlight;
}

async function _doFetchCommodityPrices(): Promise<void> {
  const allItems = COMMODITY_META
    .filter(m => m.yahooSymbol || m.stooqSymbol)
    .map(m => ({
      stooqSymbol: m.stooqSymbol,
      yahooSymbol: m.yahooSymbol,
      symbol: m.symbol,
      category: m.category,
      divisor: m.stooqDivisor || 1,
    }));

  const results = await Promise.allSettled(
    allItems.map(async item => {
      if (item.yahooSymbol) {
        const result = await fetchYahooQuote(item.yahooSymbol);
        if (result) return { item, result, source: 'yahoo' };
      }
      if (item.stooqSymbol) {
        const result = await fetchStooqQuote(item.stooqSymbol, item.divisor);
        if (result) return { item, result, source: 'stooq' };
      }
      return { item, result: null, source: 'none' };
    })
  );

  let successCount = 0;
  let yahooCount = 0;
  let stooqCount = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.result) {
      const key = r.value.item.stooqSymbol ?? r.value.item.yahooSymbol;
      if (key) liveCommodityPrices[key] = r.value.result;
      successCount++;
      if (r.value.source === 'yahoo') yahooCount++;
      else if (r.value.source === 'stooq') stooqCount++;
    }
  }

  if (successCount > 0) {
    liveCommodityFetchedAt = Date.now();
    console.log(`[MARKETS] ${successCount}/${allItems.length} quotes (yahoo:${yahooCount} stooq:${stooqCount})`);
  } else {
    liveCommodityPrices = {};
    liveCommodityFetchedAt = 0;
    console.log(`[MARKETS] All market data fetches failed, using fallbacks`);
  }
}

let fxStooqFetchInFlight: Promise<void> | null = null;
async function refreshFxFromStooq(): Promise<void> {
  if (fxStooqFetchInFlight) return fxStooqFetchInFlight;
  fxStooqFetchInFlight = _doRefreshFx().finally(() => { fxStooqFetchInFlight = null; });
  return fxStooqFetchInFlight;
}

async function _doRefreshFx(): Promise<void> {
  const fxItems = COMMODITY_META
    .filter(m => (m.category === 'fx-major' || m.category === 'fx') && (m.yahooSymbol || m.stooqSymbol))
    .map(m => ({ stooqSymbol: m.stooqSymbol, yahooSymbol: m.yahooSymbol }));

  const results = await Promise.allSettled(
    fxItems.map(async item => {
      if (item.yahooSymbol) {
        const result = await fetchYahooQuote(item.yahooSymbol);
        if (result && item.stooqSymbol) return { stooqSymbol: item.stooqSymbol, result };
      }
      if (item.stooqSymbol) {
        const result = await fetchStooqQuote(item.stooqSymbol);
        if (result) return { stooqSymbol: item.stooqSymbol, result };
      }
      return null;
    })
  );
  let updated = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.result && r.value.stooqSymbol) {
      liveCommodityPrices[r.value.stooqSymbol] = r.value.result;
      updated++;
    }
  }
  if (updated > 0) liveCommodityFetchedAt = Date.now();
}

let commodityPriceState: Record<string, { price: number; prevPrice: number }> = {};

export function generateCommodities(): CommodityData[] {
  const fxRates = liveFxRates;
  const results: CommodityData[] = [];

  for (const item of COMMODITY_META) {
    const meta = item;
    let basePrice: number | null = null;
    let liveChange = 0;
    let liveChangePercent = 0;

    const priceKey = meta.stooqSymbol ?? meta.yahooSymbol;
    if (priceKey && liveCommodityPrices[priceKey]) {
      const live = liveCommodityPrices[priceKey];
      basePrice = live.price;
      liveChange = live.change;
      liveChangePercent = live.changePercent;
    } else if (meta.fxKey && fxRates[meta.fxKey]) {
      const rate = fxRates[meta.fxKey];
      basePrice = meta.invert ? rate : (1 / rate);
    }

    if (basePrice === null) {
      basePrice = item.fallback;
    }

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

export function startCommodityIntervals(): void {
  fetchLiveFxRates();
  fetchLiveCommodityPrices();
  setInterval(() => fetchLiveFxRates(), 30_000);
  setInterval(() => fetchLiveCommodityPrices(), 60_000);
}

export { refreshFxFromStooq };

export function clearCache(): void {
  liveCommodityPrices = {};
  liveCommodityFetchedAt = 0;
  liveFxRates = {};
  liveFxFetchedAt = 0;
  commodityPriceState = {};
}
