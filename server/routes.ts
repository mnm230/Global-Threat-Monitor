import type { Express } from "express";
import { createServer, type Server } from "http";
import type { NewsItem, CommodityData, ConflictEvent, FlightData, ShipData, TelegramMessage, SirenAlert } from "@shared/schema";

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNews(): NewsItem[] {
  const now = Date.now();
  const items: NewsItem[] = [
    {
      id: '1',
      title: 'IDF confirms interception of ballistic missile over northern Israel',
      titleAr: '\u0627\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u0633\u0631\u0627\u0626\u064A\u0644\u064A \u064A\u0624\u0643\u062F \u0627\u0639\u062A\u0631\u0627\u0636 \u0635\u0627\u0631\u0648\u062E \u0628\u0627\u0644\u064A\u0633\u062A\u064A \u0641\u0648\u0642 \u0634\u0645\u0627\u0644 \u0625\u0633\u0631\u0627\u0626\u064A\u0644',
      source: 'Reuters',
      category: 'breaking',
      timestamp: new Date(now - 2 * 60000).toISOString(),
    },
    {
      id: '2',
      title: 'IRGC deploys additional naval assets to Strait of Hormuz',
      titleAr: '\u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A \u064A\u0646\u0634\u0631 \u0623\u0635\u0648\u0644\u0627\u064B \u0628\u062D\u0631\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629 \u0641\u064A \u0645\u0636\u064A\u0642 \u0647\u0631\u0645\u0632',
      source: 'Al Jazeera',
      category: 'military',
      timestamp: new Date(now - 5 * 60000).toISOString(),
    },
    {
      id: '3',
      title: 'Hezbollah launches barrage of rockets toward Haifa Bay area',
      titleAr: '\u062D\u0632\u0628 \u0627\u0644\u0644\u0647 \u064A\u0637\u0644\u0642 \u0648\u0627\u0628\u0644\u0627\u064B \u0645\u0646 \u0627\u0644\u0635\u0648\u0627\u0631\u064A\u062E \u0628\u0627\u062A\u062C\u0627\u0647 \u0645\u0646\u0637\u0642\u0629 \u062E\u0644\u064A\u062C \u062D\u064A\u0641\u0627',
      source: 'BBC News',
      category: 'breaking',
      timestamp: new Date(now - 8 * 60000).toISOString(),
    },
    {
      id: '4',
      title: 'US carrier strike group USS Eisenhower repositions in Persian Gulf',
      titleAr: '\u0645\u062C\u0645\u0648\u0639\u0629 \u062D\u0627\u0645\u0644\u0629 \u0627\u0644\u0637\u0627\u0626\u0631\u0627\u062A \u0623\u064A\u0632\u0646\u0647\u0627\u0648\u0631 \u062A\u0639\u064A\u062F \u062A\u0645\u0648\u0636\u0639\u0647\u0627 \u0641\u064A \u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u0641\u0627\u0631\u0633\u064A',
      source: 'CNN',
      category: 'military',
      timestamp: new Date(now - 12 * 60000).toISOString(),
    },
    {
      id: '5',
      title: 'Lebanon calls for emergency UN Security Council session on escalation',
      titleAr: '\u0644\u0628\u0646\u0627\u0646 \u064A\u062F\u0639\u0648 \u0644\u062C\u0644\u0633\u0629 \u0637\u0627\u0631\u0626\u0629 \u0644\u0645\u062C\u0644\u0633 \u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u062F\u0648\u0644\u064A \u0628\u0634\u0623\u0646 \u0627\u0644\u062A\u0635\u0639\u064A\u062F',
      source: 'Al Arabiya',
      category: 'diplomatic',
      timestamp: new Date(now - 18 * 60000).toISOString(),
    },
    {
      id: '6',
      title: 'Iran warns of "devastating response" if nuclear facilities targeted',
      titleAr: '\u0625\u064A\u0631\u0627\u0646 \u062A\u062D\u0630\u0631 \u0645\u0646 "\u0631\u062F \u0645\u062F\u0645\u0631" \u0625\u0630\u0627 \u0627\u0633\u062A\u064F\u0647\u062F\u0641\u062A \u0645\u0646\u0634\u0622\u062A\u0647\u0627 \u0627\u0644\u0646\u0648\u0648\u064A\u0629',
      source: 'IRNA',
      category: 'breaking',
      timestamp: new Date(now - 22 * 60000).toISOString(),
    },
    {
      id: '7',
      title: 'Brent crude surges past $85 as Hormuz shipping risks intensify',
      titleAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A \u064A\u0642\u0641\u0632 \u0641\u0648\u0642 85 \u062F\u0648\u0644\u0627\u0631\u0627\u064B \u0645\u0639 \u062A\u0635\u0627\u0639\u062F \u0645\u062E\u0627\u0637\u0631 \u0627\u0644\u0634\u062D\u0646 \u0641\u064A \u0647\u0631\u0645\u0632',
      source: 'Bloomberg',
      category: 'economic',
      timestamp: new Date(now - 28 * 60000).toISOString(),
    },
    {
      id: '8',
      title: 'Saudi Arabia restricts airspace over eastern provinces amid tensions',
      titleAr: '\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629 \u062A\u0642\u064A\u062F \u0627\u0644\u0645\u062C\u0627\u0644 \u0627\u0644\u062C\u0648\u064A \u0641\u0648\u0642 \u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0634\u0631\u0642\u064A\u0629 \u0648\u0633\u0637 \u0627\u0644\u062A\u0648\u062A\u0631\u0627\u062A',
      source: 'Reuters',
      category: 'military',
      timestamp: new Date(now - 35 * 60000).toISOString(),
    },
    {
      id: '9',
      title: 'IDF ground operations intensify in southern Lebanon border zone',
      titleAr: '\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0628\u0631\u064A\u0629 \u0644\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u0633\u0631\u0627\u0626\u064A\u0644\u064A \u062A\u062A\u0635\u0627\u0639\u062F \u0641\u064A \u0645\u0646\u0637\u0642\u0629 \u062C\u0646\u0648\u0628 \u0644\u0628\u0646\u0627\u0646 \u0627\u0644\u062D\u062F\u0648\u062F\u064A\u0629',
      source: 'Times of Israel',
      category: 'military',
      timestamp: new Date(now - 42 * 60000).toISOString(),
    },
    {
      id: '10',
      title: 'Russia and China call for immediate ceasefire in joint statement',
      titleAr: '\u0631\u0648\u0633\u064A\u0627 \u0648\u0627\u0644\u0635\u064A\u0646 \u062A\u062F\u0639\u0648\u0627\u0646 \u0644\u0648\u0642\u0641 \u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0631 \u0641\u0648\u0631\u0627\u064B \u0641\u064A \u0628\u064A\u0627\u0646 \u0645\u0634\u062A\u0631\u0643',
      source: 'TASS',
      category: 'diplomatic',
      timestamp: new Date(now - 50 * 60000).toISOString(),
    },
    {
      id: '11',
      title: 'Gold reaches $2,080 as investors seek safe-haven assets',
      titleAr: '\u0627\u0644\u0630\u0647\u0628 \u064A\u0635\u0644 \u0625\u0644\u0649 2080 \u062F\u0648\u0644\u0627\u0631\u0627\u064B \u0645\u0639 \u0644\u062C\u0648\u0621 \u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631\u064A\u0646 \u0644\u0644\u0645\u0644\u0627\u0630\u0627\u062A \u0627\u0644\u0622\u0645\u0646\u0629',
      source: 'Financial Times',
      category: 'economic',
      timestamp: new Date(now - 58 * 60000).toISOString(),
    },
    {
      id: '12',
      title: 'Iron Dome intercepts multiple projectiles over Tel Aviv metropolitan',
      titleAr: '\u0627\u0644\u0642\u0628\u0629 \u0627\u0644\u062D\u062F\u064A\u062F\u064A\u0629 \u062A\u0639\u062A\u0631\u0636 \u0639\u062F\u0629 \u0645\u0642\u0630\u0648\u0641\u0627\u062A \u0641\u0648\u0642 \u0645\u0646\u0637\u0642\u0629 \u062A\u0644 \u0623\u0628\u064A\u0628 \u0627\u0644\u0643\u0628\u0631\u0649',
      source: 'Haaretz',
      category: 'breaking',
      timestamp: new Date(now - 65 * 60000).toISOString(),
    },
    {
      id: '13',
      title: 'CENTCOM confirms additional F-35 squadron deployment to region',
      titleAr: '\u0627\u0644\u0642\u064A\u0627\u062F\u0629 \u0627\u0644\u0645\u0631\u0643\u0632\u064A\u0629 \u062A\u0624\u0643\u062F \u0646\u0634\u0631 \u0633\u0631\u0628 \u0625\u0636\u0627\u0641\u064A \u0645\u0646 \u0637\u0627\u0626\u0631\u0627\u062A F-35 \u0641\u064A \u0627\u0644\u0645\u0646\u0637\u0642\u0629',
      source: 'Pentagon',
      category: 'military',
      timestamp: new Date(now - 72 * 60000).toISOString(),
    },
    {
      id: '14',
      title: 'Turkey closes Incirlik airbase to offensive operations in the conflict',
      titleAr: '\u062A\u0631\u0643\u064A\u0627 \u062A\u063A\u0644\u0642 \u0642\u0627\u0639\u062F\u0629 \u0625\u0646\u062C\u0631\u0644\u064A\u0643 \u0627\u0644\u062C\u0648\u064A\u0629 \u0623\u0645\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0647\u062C\u0648\u0645\u064A\u0629',
      source: 'Anadolu Agency',
      category: 'diplomatic',
      timestamp: new Date(now - 80 * 60000).toISOString(),
    },
    {
      id: '15',
      title: 'Qatar mediators arrive in Tehran for emergency de-escalation talks',
      titleAr: '\u0648\u0633\u0637\u0627\u0621 \u0642\u0637\u0631\u064A\u0648\u0646 \u064A\u0635\u0644\u0648\u0646 \u0637\u0647\u0631\u0627\u0646 \u0644\u0625\u062C\u0631\u0627\u0621 \u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0637\u0627\u0631\u0626\u0629 \u0644\u062E\u0641\u0636 \u0627\u0644\u062A\u0635\u0639\u064A\u062F',
      source: 'Al Jazeera',
      category: 'diplomatic',
      timestamp: new Date(now - 90 * 60000).toISOString(),
    },
  ];
  return items;
}

function generateCommodities(): CommodityData[] {
  const basePrices = [
    { symbol: 'BRENT', name: 'Brent Crude', nameAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A', base: 84.72, currency: 'USD', category: 'commodity' as const },
    { symbol: 'WTI', name: 'WTI Crude', nameAr: '\u062E\u0627\u0645 \u063A\u0631\u0628 \u062A\u0643\u0633\u0627\u0633', base: 80.35, currency: 'USD', category: 'commodity' as const },
    { symbol: 'GOLD', name: 'Gold Spot', nameAr: '\u0627\u0644\u0630\u0647\u0628', base: 2068.40, currency: 'USD', category: 'commodity' as const },
    { symbol: 'SILVER', name: 'Silver Spot', nameAr: '\u0627\u0644\u0641\u0636\u0629', base: 23.85, currency: 'USD', category: 'commodity' as const },
    { symbol: 'NATGAS', name: 'Natural Gas', nameAr: '\u0627\u0644\u063A\u0627\u0632 \u0627\u0644\u0637\u0628\u064A\u0639\u064A', base: 3.42, currency: 'USD', category: 'commodity' as const },
    { symbol: 'WHEAT', name: 'Wheat Futures', nameAr: '\u0639\u0642\u0648\u062F \u0627\u0644\u0642\u0645\u062D', base: 612.50, currency: 'USD', category: 'commodity' as const },
    { symbol: 'COPPER', name: 'Copper', nameAr: '\u0627\u0644\u0646\u062D\u0627\u0633', base: 8542.00, currency: 'USD', category: 'commodity' as const },
    { symbol: 'EUR/USD', name: 'Euro/US Dollar', nameAr: '\u064A\u0648\u0631\u0648/\u062F\u0648\u0644\u0627\u0631', base: 1.0862, currency: '', category: 'fx-major' as const },
    { symbol: 'GBP/USD', name: 'British Pound/Dollar', nameAr: '\u062C\u0646\u064A\u0647/\u062F\u0648\u0644\u0627\u0631', base: 1.2674, currency: '', category: 'fx-major' as const },
    { symbol: 'USD/JPY', name: 'US Dollar/Yen', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u064A\u0646', base: 149.82, currency: '', category: 'fx-major' as const },
    { symbol: 'USD/CHF', name: 'US Dollar/Swiss Franc', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0641\u0631\u0646\u0643', base: 0.8815, currency: '', category: 'fx-major' as const },
    { symbol: 'AUD/USD', name: 'Aussie Dollar/Dollar', nameAr: '\u0623\u0633\u062A\u0631\u0627\u0644\u064A/\u062F\u0648\u0644\u0627\u0631', base: 0.6542, currency: '', category: 'fx-major' as const },
    { symbol: 'USD/CAD', name: 'US Dollar/Canadian', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0643\u0646\u062F\u064A', base: 1.3598, currency: '', category: 'fx-major' as const },
    { symbol: 'USD/ILS', name: 'US Dollar/Shekel', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0634\u064A\u0642\u0644', base: 3.92, currency: '', category: 'fx' as const },
    { symbol: 'USD/IRR', name: 'US Dollar/Rial', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644', base: 42150, currency: '', category: 'fx' as const },
    { symbol: 'USD/LBP', name: 'US Dollar/Lira', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0644\u064A\u0631\u0629', base: 89750, currency: '', category: 'fx' as const },
    { symbol: 'USD/SAR', name: 'US Dollar/Riyal', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A', base: 3.7500, currency: '', category: 'fx' as const },
    { symbol: 'USD/AED', name: 'US Dollar/Dirham', nameAr: '\u062F\u0648\u0644\u0627\u0631/\u062F\u0631\u0647\u0645', base: 3.6725, currency: '', category: 'fx' as const },
  ];

  return basePrices.map((item) => {
    const volatility = item.category === 'commodity' ? 0.02 : item.category === 'fx-major' ? 0.003 : 0.005;
    const changePercent = (Math.random() - 0.45) * volatility * 100;
    const change = item.base * (changePercent / 100);
    return {
      symbol: item.symbol,
      name: item.name,
      nameAr: item.nameAr,
      price: Number((item.base + change).toFixed(item.base < 10 ? 4 : 2)),
      change: Number(change.toFixed(item.base < 10 ? 4 : 2)),
      changePercent: Number(changePercent.toFixed(2)),
      currency: item.currency,
      category: item.category,
    };
  });
}

function generateEvents(): ConflictEvent[] {
  const now = Date.now();
  return [
    {
      id: 'e1', type: 'missile', lat: 35.6892, lng: 51.389,
      title: 'Tehran', titleAr: '\u0637\u0647\u0631\u0627\u0646',
      description: 'IRGC missile launch complex - Emad-2 ballistic missile site',
      descriptionAr: '\u0645\u062C\u0645\u0639 \u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E \u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A',
      timestamp: new Date(now - 10 * 60000).toISOString(), severity: 'critical',
    },
    {
      id: 'e2', type: 'defense', lat: 32.0853, lng: 34.7818,
      title: 'Tel Aviv', titleAr: '\u062A\u0644 \u0623\u0628\u064A\u0628',
      description: 'Iron Dome battery active - multiple interceptions confirmed',
      descriptionAr: '\u0628\u0637\u0627\u0631\u064A\u0629 \u0627\u0644\u0642\u0628\u0629 \u0627\u0644\u062D\u062F\u064A\u062F\u064A\u0629 \u0646\u0634\u0637\u0629',
      timestamp: new Date(now - 5 * 60000).toISOString(), severity: 'critical',
    },
    {
      id: 'e3', type: 'missile', lat: 33.8938, lng: 35.5018,
      title: 'Beirut', titleAr: '\u0628\u064A\u0631\u0648\u062A',
      description: 'Hezbollah rocket launch sites in southern suburbs',
      descriptionAr: '\u0645\u0648\u0627\u0642\u0639 \u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E \u062D\u0632\u0628 \u0627\u0644\u0644\u0647 \u0641\u064A \u0627\u0644\u0636\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0646\u0648\u0628\u064A\u0629',
      timestamp: new Date(now - 15 * 60000).toISOString(), severity: 'high',
    },
    {
      id: 'e4', type: 'naval', lat: jitter(26.56, 0.2), lng: jitter(56.25, 0.2),
      title: 'Strait of Hormuz', titleAr: '\u0645\u0636\u064A\u0642 \u0647\u0631\u0645\u0632',
      description: 'IRGC Navy fast attack craft patrol - increased activity',
      descriptionAr: '\u062F\u0648\u0631\u064A\u0629 \u0632\u0648\u0627\u0631\u0642 \u0647\u062C\u0648\u0645\u064A\u0629 \u0633\u0631\u064A\u0639\u0629 \u0644\u0628\u062D\u0631\u064A\u0629 \u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A',
      timestamp: new Date(now - 20 * 60000).toISOString(), severity: 'high',
    },
    {
      id: 'e5', type: 'nuclear', lat: 32.6546, lng: 51.668,
      title: 'Isfahan - Natanz', titleAr: '\u0623\u0635\u0641\u0647\u0627\u0646 - \u0646\u0637\u0646\u0632',
      description: 'Nuclear enrichment facility - IAEA monitoring active',
      descriptionAr: '\u0645\u0646\u0634\u0623\u0629 \u062A\u062E\u0635\u064A\u0628 \u0646\u0648\u0648\u064A - \u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0648\u0643\u0627\u0644\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0646\u0634\u0637\u0629',
      timestamp: new Date(now - 60 * 60000).toISOString(), severity: 'medium',
    },
    {
      id: 'e6', type: 'ground', lat: 33.15, lng: 35.35,
      title: 'South Lebanon', titleAr: '\u062C\u0646\u0648\u0628 \u0644\u0628\u0646\u0627\u0646',
      description: 'IDF ground incursion - armored units advancing',
      descriptionAr: '\u062A\u0648\u063A\u0644 \u0628\u0631\u064A \u0644\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u0633\u0631\u0627\u0626\u064A\u0644\u064A - \u0648\u062D\u062F\u0627\u062A \u0645\u062F\u0631\u0639\u0629 \u062A\u062A\u0642\u062F\u0645',
      timestamp: new Date(now - 8 * 60000).toISOString(), severity: 'critical',
    },
    {
      id: 'e7', type: 'airstrike', lat: 33.5138, lng: 36.2765,
      title: 'Damascus', titleAr: '\u062F\u0645\u0634\u0642',
      description: 'Israeli airstrikes on Iranian military assets',
      descriptionAr: '\u063A\u0627\u0631\u0627\u062A \u0625\u0633\u0631\u0627\u0626\u064A\u0644\u064A\u0629 \u0639\u0644\u0649 \u0623\u0635\u0648\u0644 \u0639\u0633\u0643\u0631\u064A\u0629 \u0625\u064A\u0631\u0627\u0646\u064A\u0629',
      timestamp: new Date(now - 30 * 60000).toISOString(), severity: 'high',
    },
    {
      id: 'e8', type: 'defense', lat: 32.794, lng: 34.9896,
      title: 'Haifa', titleAr: '\u062D\u064A\u0641\u0627',
      description: "David's Sling interceptor battery activated",
      descriptionAr: '\u062A\u0641\u0639\u064A\u0644 \u0628\u0637\u0627\u0631\u064A\u0629 \u0627\u0639\u062A\u0631\u0627\u0636 \u0645\u0642\u0644\u0627\u0639 \u062F\u0627\u0648\u062F',
      timestamp: new Date(now - 3 * 60000).toISOString(), severity: 'critical',
    },
    {
      id: 'e9', type: 'nuclear', lat: 31.0695, lng: 35.2063,
      title: 'Dimona', titleAr: '\u062F\u064A\u0645\u0648\u0646\u0627',
      description: 'Israeli nuclear research center - heightened security',
      descriptionAr: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0623\u0628\u062D\u0627\u062B \u0627\u0644\u0646\u0648\u0648\u064A\u0629 \u0627\u0644\u0625\u0633\u0631\u0627\u0626\u064A\u0644\u064A - \u0623\u0645\u0646 \u0645\u0634\u062F\u062F',
      timestamp: new Date(now - 45 * 60000).toISOString(), severity: 'medium',
    },
    {
      id: 'e10', type: 'naval', lat: 27.1832, lng: 56.2666,
      title: 'Bandar Abbas', titleAr: '\u0628\u0646\u062F\u0631 \u0639\u0628\u0627\u0633',
      description: 'Iranian Navy main base - submarine activity detected',
      descriptionAr: '\u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u062D\u0631\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A\u0629 - \u0646\u0634\u0627\u0637 \u063A\u0648\u0627\u0635\u0627\u062A',
      timestamp: new Date(now - 25 * 60000).toISOString(), severity: 'high',
    },
    {
      id: 'e11', type: 'missile', lat: 34.33, lng: 47.08,
      title: 'Kermanshah', titleAr: '\u0643\u0631\u0645\u0627\u0646\u0634\u0627\u0647',
      description: 'IRGC ballistic missile base - launch preparations reported',
      descriptionAr: '\u0642\u0627\u0639\u062F\u0629 \u0635\u0648\u0627\u0631\u064A\u062E \u0628\u0627\u0644\u064A\u0633\u062A\u064A\u0629 - \u0627\u0633\u062A\u0639\u062F\u0627\u062F\u0627\u062A \u0625\u0637\u0644\u0627\u0642',
      timestamp: new Date(now - 18 * 60000).toISOString(), severity: 'high',
    },
    {
      id: 'e12', type: 'airstrike', lat: 34.73, lng: 36.72,
      title: 'Homs', titleAr: '\u062D\u0645\u0635',
      description: 'Airstrikes on weapons depot - secondary explosions',
      descriptionAr: '\u063A\u0627\u0631\u0627\u062A \u0639\u0644\u0649 \u0645\u0633\u062A\u0648\u062F\u0639 \u0623\u0633\u0644\u062D\u0629 - \u0627\u0646\u0641\u062C\u0627\u0631\u0627\u062A \u062B\u0627\u0646\u0648\u064A\u0629',
      timestamp: new Date(now - 40 * 60000).toISOString(), severity: 'medium',
    },
    {
      id: 'e13', type: 'ground', lat: 31.78, lng: 35.23,
      title: 'Jerusalem', titleAr: '\u0627\u0644\u0642\u062F\u0633',
      description: 'Heightened military presence - security level raised',
      descriptionAr: '\u062A\u0639\u0632\u064A\u0632 \u0627\u0644\u062A\u0648\u0627\u062C\u062F \u0627\u0644\u0639\u0633\u0643\u0631\u064A - \u0631\u0641\u0639 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0623\u0645\u0646',
      timestamp: new Date(now - 55 * 60000).toISOString(), severity: 'medium',
    },
  ];
}

function generateFlights(): FlightData[] {
  return [
    { id: 'f1', callsign: 'IAF001', type: 'military', lat: jitter(32.5, 0.5), lng: jitter(35.2, 0.5), altitude: 35000, heading: 45, speed: 520 },
    { id: 'f2', callsign: 'IAF002', type: 'military', lat: jitter(33.1, 0.3), lng: jitter(35.8, 0.3), altitude: 28000, heading: 15, speed: 480 },
    { id: 'f3', callsign: 'FORTE12', type: 'surveillance', lat: jitter(30.5, 0.5), lng: jitter(50.0, 1.0), altitude: 55000, heading: 180, speed: 340 },
    { id: 'f4', callsign: 'DUKE01', type: 'surveillance', lat: jitter(28.0, 0.5), lng: jitter(52.0, 0.5), altitude: 42000, heading: 270, speed: 380 },
    { id: 'f5', callsign: 'QR810', type: 'commercial', lat: jitter(29.5, 0.3), lng: jitter(48.0, 0.5), altitude: 38000, heading: 310, speed: 460 },
    { id: 'f6', callsign: 'EK422', type: 'commercial', lat: jitter(26.0, 0.3), lng: jitter(55.0, 0.3), altitude: 36000, heading: 350, speed: 475 },
    { id: 'f7', callsign: 'USN-P8A', type: 'surveillance', lat: jitter(26.8, 0.3), lng: jitter(56.0, 0.5), altitude: 25000, heading: 90, speed: 320 },
    { id: 'f8', callsign: 'IRGC-F14', type: 'military', lat: jitter(27.5, 0.3), lng: jitter(56.5, 0.3), altitude: 20000, heading: 200, speed: 420 },
    { id: 'f9', callsign: 'SV302', type: 'commercial', lat: jitter(25.5, 0.3), lng: jitter(46.0, 0.5), altitude: 39000, heading: 60, speed: 450 },
    { id: 'f10', callsign: 'USAF-KC', type: 'military', lat: jitter(31.0, 0.5), lng: jitter(47.0, 0.5), altitude: 30000, heading: 120, speed: 400 },
    { id: 'f11', callsign: 'TK1872', type: 'commercial', lat: jitter(37.0, 0.3), lng: jitter(40.0, 0.5), altitude: 37000, heading: 135, speed: 465 },
    { id: 'f12', callsign: 'RAF-RC', type: 'surveillance', lat: jitter(33.0, 0.5), lng: jitter(42.0, 0.5), altitude: 40000, heading: 90, speed: 350 },
  ];
}

function generateShips(): ShipData[] {
  return [
    { id: 's1', name: 'MT Stena Impero', type: 'tanker', lat: jitter(26.4, 0.15), lng: jitter(56.15, 0.15), heading: 45, speed: 12, flag: 'UK' },
    { id: 's2', name: 'MT Pacific Voyager', type: 'tanker', lat: jitter(26.6, 0.1), lng: jitter(56.35, 0.1), heading: 220, speed: 10, flag: 'Panama' },
    { id: 's3', name: 'USS Eisenhower', type: 'military', lat: jitter(25.8, 0.2), lng: jitter(55.5, 0.3), heading: 30, speed: 18, flag: 'USA' },
    { id: 's4', name: 'IRIN Alvand', type: 'military', lat: jitter(26.8, 0.1), lng: jitter(56.6, 0.1), heading: 180, speed: 15, flag: 'Iran' },
    { id: 's5', name: 'MSC Flaminia', type: 'cargo', lat: jitter(26.2, 0.15), lng: jitter(56.0, 0.15), heading: 60, speed: 14, flag: 'Germany' },
    { id: 's6', name: 'Al Dafna', type: 'tanker', lat: jitter(26.3, 0.1), lng: jitter(56.25, 0.1), heading: 40, speed: 11, flag: 'Qatar' },
    { id: 's7', name: 'IRGC Patrol 7', type: 'patrol', lat: jitter(26.55, 0.05), lng: jitter(56.3, 0.05), heading: 270, speed: 22, flag: 'Iran' },
    { id: 's8', name: 'MT Nissos Rhenia', type: 'tanker', lat: jitter(26.7, 0.12), lng: jitter(56.45, 0.12), heading: 35, speed: 13, flag: 'Greece' },
    { id: 's9', name: 'HMS Diamond', type: 'military', lat: jitter(26.1, 0.15), lng: jitter(55.8, 0.2), heading: 50, speed: 16, flag: 'UK' },
    { id: 's10', name: 'IRGC Patrol 3', type: 'patrol', lat: jitter(26.45, 0.05), lng: jitter(56.2, 0.05), heading: 90, speed: 25, flag: 'Iran' },
  ];
}

function generateTelegram(): TelegramMessage[] {
  const now = Date.now();
  return [
    {
      id: 't1', channel: '@WarMonitor',
      text: 'ALERT: Multiple launches detected from western Iran. Tracking in progress. Air defense systems activated across Israel.',
      textAr: '\u062A\u0646\u0628\u064A\u0647: \u0631\u0635\u062F \u0639\u0645\u0644\u064A\u0627\u062A \u0625\u0637\u0644\u0627\u0642 \u0645\u062A\u0639\u062F\u062F\u0629 \u0645\u0646 \u063A\u0631\u0628 \u0625\u064A\u0631\u0627\u0646. \u062A\u062A\u0628\u0639 \u062C\u0627\u0631\u064D. \u062A\u0641\u0639\u064A\u0644 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062F\u0641\u0627\u0639 \u0627\u0644\u062C\u0648\u064A.',
      timestamp: new Date(now - 3 * 60000).toISOString(),
    },
    {
      id: 't2', channel: '@IntelCrab',
      text: 'USS Eisenhower CSG moving to patrol station Bravo. Additional Aegis destroyers joining formation.',
      textAr: '\u0645\u062C\u0645\u0648\u0639\u0629 \u0623\u064A\u0632\u0646\u0647\u0627\u0648\u0631 \u062A\u062A\u062D\u0631\u0643 \u0625\u0644\u0649 \u0645\u0648\u0642\u0639 \u0627\u0644\u062F\u0648\u0631\u064A\u0629 \u0628\u0631\u0627\u0641\u0648.',
      timestamp: new Date(now - 8 * 60000).toISOString(),
    },
    {
      id: 't3', channel: '@MENAconflict',
      text: 'Breaking: Explosions reported in Isfahan province. Iranian state media confirms "loud sounds" heard near military sites.',
      textAr: '\u0639\u0627\u062C\u0644: \u0627\u0646\u0641\u062C\u0627\u0631\u0627\u062A \u0641\u064A \u0645\u062D\u0627\u0641\u0638\u0629 \u0623\u0635\u0641\u0647\u0627\u0646. \u0648\u0633\u0627\u0626\u0644 \u0625\u0639\u0644\u0627\u0645 \u0625\u064A\u0631\u0627\u0646\u064A\u0629 \u062A\u0624\u0643\u062F "\u0623\u0635\u0648\u0627\u062A \u0639\u0627\u0644\u064A\u0629".',
      timestamp: new Date(now - 15 * 60000).toISOString(),
    },
    {
      id: 't4', channel: '@ShipTracker',
      text: 'Strait of Hormuz: 3 VLCC tankers diverted from normal shipping lane due to IRGC patrol activity. Traffic backing up.',
      textAr: '\u0645\u0636\u064A\u0642 \u0647\u0631\u0645\u0632: \u062A\u062D\u0648\u064A\u0644 3 \u0646\u0627\u0642\u0644\u0627\u062A \u0646\u0641\u0637 \u0639\u0645\u0644\u0627\u0642\u0629 \u0628\u0633\u0628\u0628 \u0646\u0634\u0627\u0637 \u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A.',
      timestamp: new Date(now - 22 * 60000).toISOString(),
    },
    {
      id: 't5', channel: '@AviationIntel',
      text: 'FORTE12 (RQ-4 Global Hawk) orbiting over Persian Gulf at FL550. USN P-8A Poseidon conducting ASW patrol near Hormuz.',
      textAr: 'FORTE12 (\u0637\u0627\u0626\u0631\u0629 \u0628\u062F\u0648\u0646 \u0637\u064A\u0627\u0631 RQ-4) \u062A\u062D\u0644\u0642 \u0641\u0648\u0642 \u0627\u0644\u062E\u0644\u064A\u062C \u0627\u0644\u0641\u0627\u0631\u0633\u064A.',
      timestamp: new Date(now - 30 * 60000).toISOString(),
    },
    {
      id: 't6', channel: '@WarMonitor',
      text: 'UPDATE: Sirens sounding in Haifa, Tiberias and upper Galilee. Residents ordered to shelters immediately.',
      textAr: '\u062A\u062D\u062F\u064A\u062B: \u0635\u0641\u0627\u0631\u0627\u062A \u0625\u0646\u0630\u0627\u0631 \u0641\u064A \u062D\u064A\u0641\u0627 \u0648\u0637\u0628\u0631\u064A\u0627 \u0648\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649. \u0627\u0644\u0633\u0643\u0627\u0646 \u0645\u0637\u0627\u0644\u0628\u0648\u0646 \u0628\u0627\u0644\u062A\u0648\u062C\u0647 \u0644\u0644\u0645\u0644\u0627\u062C\u0626.',
      timestamp: new Date(now - 1 * 60000).toISOString(),
    },
    {
      id: 't7', channel: '@OilMarkets',
      text: 'Brent crude bid $85.40 - highest since October. Options market pricing 15% chance of $100+ oil within 30 days.',
      textAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A \u064A\u0631\u062A\u0641\u0639 \u0625\u0644\u0649 85.40 \u062F\u0648\u0644\u0627\u0631\u0627\u064B - \u0627\u0644\u0623\u0639\u0644\u0649 \u0645\u0646\u0630 \u0623\u0643\u062A\u0648\u0628\u0631.',
      timestamp: new Date(now - 12 * 60000).toISOString(),
    },
    {
      id: 't8', channel: '@MENAconflict',
      text: 'Iranian FM: "Any attack on our sovereign territory will be met with overwhelming force. All options on the table."',
      textAr: '\u0648\u0632\u064A\u0631 \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A: "\u0623\u064A \u0647\u062C\u0648\u0645 \u0639\u0644\u0649 \u0623\u0631\u0627\u0636\u064A\u0646\u0627 \u0633\u064A\u064F\u0642\u0627\u0628\u0644 \u0628\u0642\u0648\u0629 \u0633\u0627\u062D\u0642\u0629."',
      timestamp: new Date(now - 40 * 60000).toISOString(),
    },
  ];
}

function generateSirens(): SirenAlert[] {
  const now = Date.now();
  const allSirens: SirenAlert[] = [
    { id: 's1', location: 'Tel Aviv - Gush Dan', locationAr: '\u062A\u0644 \u0623\u0628\u064A\u0628 - \u063A\u0648\u0634 \u062F\u0627\u0646', region: 'Central Israel', regionAr: '\u0648\u0633\u0637 \u0625\u0633\u0631\u0627\u0626\u064A\u0644', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 120000)).toISOString(), active: true },
    { id: 's2', location: 'Haifa Bay', locationAr: '\u062E\u0644\u064A\u062C \u062D\u064A\u0641\u0627', region: 'Northern Israel', regionAr: '\u0634\u0645\u0627\u0644 \u0625\u0633\u0631\u0627\u0626\u064A\u0644', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 180000)).toISOString(), active: true },
    { id: 's3', location: 'Kiryat Shmona', locationAr: '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629', region: 'Upper Galilee', regionAr: '\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 90000)).toISOString(), active: true },
    { id: 's4', location: 'Nahariya', locationAr: '\u0646\u0647\u0627\u0631\u064A\u0627', region: 'Western Galilee', regionAr: '\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u063A\u0631\u0628\u064A', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 60000)).toISOString(), active: true },
    { id: 's5', location: 'Ashkelon', locationAr: '\u0639\u0633\u0642\u0644\u0627\u0646', region: 'Southern Israel', regionAr: '\u062C\u0646\u0648\u0628 \u0625\u0633\u0631\u0627\u0626\u064A\u0644', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 150000)).toISOString(), active: true },
    { id: 's6', location: 'Sderot', locationAr: '\u0633\u062F\u064A\u0631\u0648\u062A', region: 'Gaza Envelope', regionAr: '\u063A\u0644\u0627\u0641 \u063A\u0632\u0629', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 45000)).toISOString(), active: true },
    { id: 's7', location: 'Tiberias', locationAr: '\u0637\u0628\u0631\u064A\u0627', region: 'Sea of Galilee', regionAr: '\u0628\u062D\u064A\u0631\u0629 \u0637\u0628\u0631\u064A\u0627', threatType: 'missile', timestamp: new Date(now - Math.floor(Math.random() * 200000)).toISOString(), active: true },
    { id: 's8', location: 'Be\'er Sheva', locationAr: '\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639', region: 'Negev', regionAr: '\u0627\u0644\u0646\u0642\u0628', threatType: 'rocket', timestamp: new Date(now - Math.floor(Math.random() * 100000)).toISOString(), active: true },
    { id: 's9', location: 'Safed', locationAr: '\u0635\u0641\u062F', region: 'Upper Galilee', regionAr: '\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649', threatType: 'uav', timestamp: new Date(now - Math.floor(Math.random() * 130000)).toISOString(), active: true },
    { id: 's10', location: 'Netanya', locationAr: '\u0646\u062A\u0627\u0646\u064A\u0627', region: 'Sharon Plain', regionAr: '\u0633\u0647\u0644 \u0627\u0644\u0634\u0627\u0631\u0648\u0646', threatType: 'hostile_aircraft', timestamp: new Date(now - Math.floor(Math.random() * 170000)).toISOString(), active: true },
    { id: 's11', location: 'Riyadh', locationAr: '\u0627\u0644\u0631\u064A\u0627\u0636', region: 'Saudi Arabia', regionAr: '\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629', threatType: 'missile', timestamp: new Date(now - Math.floor(Math.random() * 250000)).toISOString(), active: true },
    { id: 's12', location: 'Erbil', locationAr: '\u0623\u0631\u0628\u064A\u0644', region: 'Iraqi Kurdistan', regionAr: '\u0643\u0631\u062F\u0633\u062A\u0627\u0646 \u0627\u0644\u0639\u0631\u0627\u0642', threatType: 'uav', timestamp: new Date(now - Math.floor(Math.random() * 300000)).toISOString(), active: true },
  ];

  const count = 3 + Math.floor(Math.random() * 5);
  const shuffled = allSirens.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get('/api/news', (_req, res) => {
    res.json(generateNews());
  });

  app.get('/api/commodities', (_req, res) => {
    res.json(generateCommodities());
  });

  app.get('/api/events', (_req, res) => {
    res.json({
      events: generateEvents(),
      flights: generateFlights(),
      ships: generateShips(),
    });
  });

  app.get('/api/telegram', (_req, res) => {
    res.json(generateTelegram());
  });

  app.get('/api/sirens', (_req, res) => {
    res.json(generateSirens());
  });

  return httpServer;
}
