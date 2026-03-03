import type { Express } from "express";
import { createServer, type Server } from "http";
import type { NewsItem, CommodityData, ConflictEvent, FlightData, ShipData, TelegramMessage, SirenAlert, RedAlert, AIBrief, AIDeduction, AdsbFlight, EarthquakeEvent, CyberEvent } from "@shared/schema";

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

function generateAdsbFlights(): AdsbFlight[] {
  const now = Date.now();
  return [
    { id: 'ab1', hex: '738066', callsign: 'IAF685', type: 'military', aircraft: 'F-35I Adir', registration: '685', origin: 'LLNV', destination: 'PATROL', lat: jitter(31.8, 0.4), lng: jitter(34.9, 0.4), altitude: 32000, groundSpeed: 540, verticalRate: 0, heading: jitter(45, 10), squawk: '6712', rssi: -12.4, seen: 2, country: 'Israel', flagged: true },
    { id: 'ab2', hex: '738091', callsign: 'IAF902', type: 'military', aircraft: 'F-16I Sufa', registration: '902', origin: 'LLRD', destination: 'PATROL', lat: jitter(33.0, 0.3), lng: jitter(35.5, 0.3), altitude: 28000, groundSpeed: 490, verticalRate: -500, heading: jitter(350, 10), squawk: '6714', rssi: -8.1, seen: 1, country: 'Israel', flagged: true },
    { id: 'ab3', hex: 'AE5420', callsign: 'FORTE12', type: 'surveillance', aircraft: 'RQ-4B Global Hawk', registration: '11-2048', origin: 'OAIX', destination: 'ORBIT', lat: jitter(27.2, 0.8), lng: jitter(51.5, 1.0), altitude: 55200, groundSpeed: 340, verticalRate: 0, heading: jitter(180, 20), squawk: '4572', rssi: -22.5, seen: 4, country: 'USA', flagged: true },
    { id: 'ab4', hex: 'AE6801', callsign: 'DUKE01', type: 'surveillance', aircraft: 'RC-135V Rivet Joint', registration: '64-14841', origin: 'OKAS', destination: 'ORBIT', lat: jitter(28.5, 0.5), lng: jitter(52.5, 0.8), altitude: 42000, groundSpeed: 380, verticalRate: 0, heading: jitter(270, 15), squawk: '4612', rssi: -18.3, seen: 3, country: 'USA', flagged: true },
    { id: 'ab5', hex: 'AE1D8F', callsign: 'HOMER31', type: 'surveillance', aircraft: 'P-8A Poseidon', registration: '169333', origin: 'OBBI', destination: 'PATROL', lat: jitter(26.3, 0.3), lng: jitter(55.8, 0.5), altitude: 25000, groundSpeed: 310, verticalRate: 200, heading: jitter(90, 10), squawk: '4532', rssi: -14.7, seen: 2, country: 'USA', flagged: true },
    { id: 'ab6', hex: '06A1C4', callsign: 'IRGC41', type: 'military', aircraft: 'F-14A Tomcat', registration: '3-6052', origin: 'OISS', destination: 'PATROL', lat: jitter(27.8, 0.4), lng: jitter(56.2, 0.3), altitude: 20000, groundSpeed: 420, verticalRate: 1000, heading: jitter(200, 10), squawk: '2341', rssi: -19.8, seen: 5, country: 'Iran', flagged: true },
    { id: 'ab7', hex: '06A2F1', callsign: 'IRI732', type: 'commercial', aircraft: 'A320-214', registration: 'EP-IEE', origin: 'OIIE', destination: 'OBBI', lat: jitter(29.1, 0.3), lng: jitter(52.0, 0.5), altitude: 36000, groundSpeed: 460, verticalRate: 0, heading: jitter(210, 5), squawk: '1234', rssi: -16.2, seen: 1, country: 'Iran', flagged: false },
    { id: 'ab8', hex: 'A4C2E1', callsign: 'QTR810', type: 'commercial', aircraft: 'B777-3DZ(ER)', registration: 'A7-BAO', origin: 'OTHH', destination: 'EGLL', lat: jitter(30.0, 0.5), lng: jitter(48.0, 0.8), altitude: 39000, groundSpeed: 470, verticalRate: 0, heading: jitter(315, 5), squawk: '7421', rssi: -11.3, seen: 1, country: 'Qatar', flagged: false },
    { id: 'ab9', hex: 'A68C71', callsign: 'UAE422', type: 'commercial', aircraft: 'A380-861', registration: 'A6-EVK', origin: 'OMDB', destination: 'KJFK', lat: jitter(25.8, 0.3), lng: jitter(55.2, 0.3), altitude: 37000, groundSpeed: 475, verticalRate: 0, heading: jitter(340, 5), squawk: '2517', rssi: -9.8, seen: 1, country: 'UAE', flagged: false },
    { id: 'ab10', hex: '4B1A3E', callsign: 'SVA302', type: 'commercial', aircraft: 'B787-9', registration: 'HZ-AR24', origin: 'OEJN', destination: 'OERK', lat: jitter(24.5, 0.5), lng: jitter(44.0, 0.5), altitude: 32000, groundSpeed: 440, verticalRate: -800, heading: jitter(60, 5), squawk: '3561', rssi: -13.5, seen: 2, country: 'Saudi Arabia', flagged: false },
    { id: 'ab11', hex: 'AE07C3', callsign: 'RCH416', type: 'cargo', aircraft: 'C-17A Globemaster III', registration: '07-7178', origin: 'EDDF', destination: 'OKAS', lat: jitter(33.5, 0.5), lng: jitter(42.0, 1.0), altitude: 31000, groundSpeed: 410, verticalRate: 0, heading: jitter(120, 8), squawk: '4617', rssi: -20.1, seen: 3, country: 'USA', flagged: true },
    { id: 'ab12', hex: '43C5E2', callsign: 'THY1872', type: 'commercial', aircraft: 'B737-9 MAX', registration: 'TC-LYA', origin: 'LTFM', destination: 'OEJN', lat: jitter(37.2, 0.3), lng: jitter(39.5, 0.5), altitude: 38000, groundSpeed: 465, verticalRate: 0, heading: jitter(135, 5), squawk: '1647', rssi: -15.4, seen: 1, country: 'Turkey', flagged: false },
    { id: 'ab13', hex: '43D101', callsign: 'RFF02', type: 'surveillance', aircraft: 'RC-135W Airseeker', registration: 'ZZ664', origin: 'OKAS', destination: 'ORBIT', lat: jitter(32.0, 0.5), lng: jitter(44.0, 0.8), altitude: 41000, groundSpeed: 350, verticalRate: 0, heading: jitter(90, 15), squawk: '7612', rssi: -17.9, seen: 2, country: 'UK', flagged: true },
    { id: 'ab14', hex: '3C6512', callsign: 'GAF689', type: 'government', aircraft: 'A319-133(CJ)', registration: '15+02', origin: 'EDDB', destination: 'LLBG', lat: jitter(34.0, 0.3), lng: jitter(36.0, 0.5), altitude: 39000, groundSpeed: 430, verticalRate: 0, heading: jitter(150, 5), squawk: '5411', rssi: -14.1, seen: 2, country: 'Germany', flagged: true },
    { id: 'ab15', hex: 'AE4B21', callsign: 'EVAC01', type: 'military', aircraft: 'C-130J Super Hercules', registration: '08-8604', origin: 'OKBK', destination: 'LLAR', lat: jitter(30.0, 0.5), lng: jitter(38.0, 0.5), altitude: 24000, groundSpeed: 310, verticalRate: -400, heading: jitter(240, 8), squawk: '4621', rssi: -16.8, seen: 3, country: 'USA', flagged: true },
    { id: 'ab16', hex: '06A0E2', callsign: 'IRIAF5', type: 'military', aircraft: 'Su-35S', registration: '3-7364', origin: 'OIFM', destination: 'PATROL', lat: jitter(34.5, 0.3), lng: jitter(47.5, 0.3), altitude: 18000, groundSpeed: 550, verticalRate: 2000, heading: jitter(270, 10), squawk: '2204', rssi: -21.3, seen: 6, country: 'Iran', flagged: true },
    { id: 'ab17', hex: 'A81234', callsign: 'FDX6023', type: 'cargo', aircraft: 'B767-3S2F(ER)', registration: 'N129FE', origin: 'OMDB', destination: 'EDDM', lat: jitter(28.5, 0.4), lng: jitter(50.0, 0.5), altitude: 35000, groundSpeed: 445, verticalRate: 0, heading: jitter(320, 5), squawk: '2341', rssi: -12.9, seen: 1, country: 'USA', flagged: false },
    { id: 'ab18', hex: '710501', callsign: 'MEA315', type: 'commercial', aircraft: 'A321-271NX', registration: 'OD-MRT', origin: 'OLBA', destination: 'LFPG', lat: jitter(35.2, 0.3), lng: jitter(34.8, 0.3), altitude: 34000, groundSpeed: 450, verticalRate: 500, heading: jitter(300, 5), squawk: '6102', rssi: -10.5, seen: 1, country: 'Lebanon', flagged: false },
    { id: 'ab19', hex: '738044', callsign: 'IAF550', type: 'surveillance', aircraft: 'G550 CAEW Eitam', registration: '550', origin: 'LLNV', destination: 'ORBIT', lat: jitter(31.5, 0.5), lng: jitter(34.5, 0.5), altitude: 40000, groundSpeed: 370, verticalRate: 0, heading: jitter(180, 15), squawk: '6720', rssi: -11.8, seen: 2, country: 'Israel', flagged: true },
    { id: 'ab20', hex: 'AE5C01', callsign: 'NCHO11', type: 'surveillance', aircraft: 'E-3G Sentry AWACS', registration: '75-0557', origin: 'OKAS', destination: 'ORBIT', lat: jitter(29.5, 0.5), lng: jitter(47.5, 0.8), altitude: 33000, groundSpeed: 340, verticalRate: 0, heading: jitter(90, 20), squawk: '4560', rssi: -19.2, seen: 3, country: 'USA', flagged: true },
    { id: 'ab21', hex: 'A9F201', callsign: 'N/A', type: 'private', aircraft: 'G650ER', registration: 'VP-CGG', origin: 'OEJN', destination: 'OMDB', lat: jitter(25.0, 0.5), lng: jitter(48.0, 0.5), altitude: 43000, groundSpeed: 480, verticalRate: 0, heading: jitter(90, 5), squawk: '1000', rssi: -15.0, seen: 2, country: 'Cayman Is.', flagged: false },
    { id: 'ab22', hex: '4BA912', callsign: 'RJA182', type: 'commercial', aircraft: 'A321neo', registration: 'JY-AYP', origin: 'OJAI', destination: 'OERK', lat: jitter(28.0, 0.3), lng: jitter(39.0, 0.5), altitude: 37000, groundSpeed: 455, verticalRate: 0, heading: jitter(150, 5), squawk: '3210', rssi: -13.7, seen: 1, country: 'Jordan', flagged: false },
    { id: 'ab23', hex: '06A3B1', callsign: 'QSM412', type: 'cargo', aircraft: 'B747-281F', registration: 'EP-FAB', origin: 'OIIE', destination: 'OISS', lat: jitter(33.0, 0.3), lng: jitter(52.0, 0.5), altitude: 29000, groundSpeed: 400, verticalRate: -600, heading: jitter(180, 5), squawk: '2413', rssi: -18.5, seen: 4, country: 'Iran', flagged: true },
    { id: 'ab24', hex: 'AE68F2', callsign: 'JAKE11', type: 'military', aircraft: 'KC-135R Stratotanker', registration: '62-3534', origin: 'OKAS', destination: 'ORBIT', lat: jitter(31.5, 0.5), lng: jitter(46.0, 0.8), altitude: 28000, groundSpeed: 390, verticalRate: 0, heading: jitter(120, 10), squawk: '4632', rssi: -16.1, seen: 2, country: 'USA', flagged: true },
    { id: 'ab25', hex: '4008F1', callsign: 'BAW115', type: 'commercial', aircraft: 'B787-9', registration: 'G-ZBKR', origin: 'EGLL', destination: 'OMDB', lat: jitter(34.5, 0.5), lng: jitter(38.0, 0.8), altitude: 40000, groundSpeed: 480, verticalRate: 0, heading: jitter(120, 5), squawk: '5231', rssi: -11.8, seen: 1, country: 'UK', flagged: false },
    { id: 'ab26', hex: '3C6742', callsign: 'DLH634', type: 'commercial', aircraft: 'A350-941', registration: 'D-AIXI', origin: 'EDDF', destination: 'VABB', lat: jitter(32.0, 0.4), lng: jitter(44.0, 0.6), altitude: 41000, groundSpeed: 475, verticalRate: 0, heading: jitter(130, 5), squawk: '2714', rssi: -13.2, seen: 1, country: 'Germany', flagged: false },
    { id: 'ab27', hex: '471F52', callsign: 'AFR662', type: 'commercial', aircraft: 'A330-203', registration: 'F-GZCH', origin: 'LFPG', destination: 'OTHH', lat: jitter(36.0, 0.4), lng: jitter(36.5, 0.5), altitude: 38000, groundSpeed: 465, verticalRate: 0, heading: jitter(125, 5), squawk: '3452', rssi: -14.1, seen: 1, country: 'France', flagged: false },
    { id: 'ab28', hex: 'A1B2C3', callsign: 'AAL72', type: 'commercial', aircraft: 'B777-323(ER)', registration: 'N720AN', origin: 'KJFK', destination: 'OTHH', lat: jitter(35.0, 0.5), lng: jitter(33.0, 0.8), altitude: 39000, groundSpeed: 470, verticalRate: 0, heading: jitter(110, 5), squawk: '1423', rssi: -12.5, seen: 1, country: 'USA', flagged: false },
    { id: 'ab29', hex: '896201', callsign: 'KAL618', type: 'commercial', aircraft: 'B777-3B5(ER)', registration: 'HL8210', origin: 'RKSI', destination: 'OEJN', lat: jitter(30.0, 0.6), lng: jitter(55.0, 0.8), altitude: 37000, groundSpeed: 468, verticalRate: -200, heading: jitter(240, 5), squawk: '4312', rssi: -15.7, seen: 1, country: 'South Korea', flagged: false },
    { id: 'ab30', hex: '780A12', callsign: 'CCA934', type: 'commercial', aircraft: 'A350-941', registration: 'B-1085', origin: 'ZBAA', destination: 'OEJN', lat: jitter(28.5, 0.5), lng: jitter(52.0, 0.7), altitude: 40000, groundSpeed: 472, verticalRate: 0, heading: jitter(230, 5), squawk: '5102', rssi: -16.3, seen: 2, country: 'China', flagged: false },
    { id: 'ab31', hex: '800B41', callsign: 'SIA478', type: 'commercial', aircraft: 'A380-841', registration: '9V-SKT', origin: 'WSSS', destination: 'EGLL', lat: jitter(26.0, 0.4), lng: jitter(57.0, 0.5), altitude: 42000, groundSpeed: 485, verticalRate: 0, heading: jitter(310, 5), squawk: '2631', rssi: -10.9, seen: 1, country: 'Singapore', flagged: false },
    { id: 'ab32', hex: '4CA2E1', callsign: 'ETH712', type: 'commercial', aircraft: 'B787-9', registration: 'ET-AUQ', origin: 'HAAB', destination: 'OMDB', lat: jitter(23.5, 0.5), lng: jitter(48.0, 0.6), altitude: 36000, groundSpeed: 455, verticalRate: 200, heading: jitter(50, 5), squawk: '3741', rssi: -14.8, seen: 1, country: 'Ethiopia', flagged: false },
    { id: 'ab33', hex: '06A5C1', callsign: 'IRM741', type: 'commercial', aircraft: 'A310-304', registration: 'EP-IBL', origin: 'OIIE', destination: 'OIAW', lat: jitter(33.5, 0.2), lng: jitter(50.0, 0.3), altitude: 28000, groundSpeed: 420, verticalRate: -600, heading: jitter(200, 5), squawk: '1312', rssi: -17.1, seen: 2, country: 'Iran', flagged: false },
    { id: 'ab34', hex: 'AA0441', callsign: 'UAL164', type: 'commercial', aircraft: 'B777-222(ER)', registration: 'N226UA', origin: 'KORD', destination: 'LLBG', lat: jitter(35.5, 0.4), lng: jitter(35.0, 0.6), altitude: 37000, groundSpeed: 462, verticalRate: 0, heading: jitter(115, 5), squawk: '4501', rssi: -13.0, seen: 1, country: 'USA', flagged: false },
    { id: 'ab35', hex: 'C07A91', callsign: 'ACA856', type: 'commercial', aircraft: 'B787-9', registration: 'C-FRSE', origin: 'CYYZ', destination: 'OTHH', lat: jitter(37.0, 0.5), lng: jitter(41.0, 0.7), altitude: 39000, groundSpeed: 470, verticalRate: 0, heading: jitter(120, 5), squawk: '1562', rssi: -14.5, seen: 1, country: 'Canada', flagged: false },
    { id: 'ab36', hex: '4001E3', callsign: 'VIR11F', type: 'commercial', aircraft: 'A350-1041', registration: 'G-VPOP', origin: 'EGLL', destination: 'LLBG', lat: jitter(34.0, 0.3), lng: jitter(33.5, 0.4), altitude: 36000, groundSpeed: 458, verticalRate: -400, heading: jitter(110, 5), squawk: '6321', rssi: -11.2, seen: 1, country: 'UK', flagged: false },
    { id: 'ab37', hex: '50101A', callsign: 'QFA9', type: 'commercial', aircraft: 'A380-842', registration: 'VH-OQK', origin: 'YSSY', destination: 'EGLL', lat: jitter(25.5, 0.5), lng: jitter(56.5, 0.5), altitude: 41000, groundSpeed: 490, verticalRate: 0, heading: jitter(320, 5), squawk: '7104', rssi: -12.1, seen: 1, country: 'Australia', flagged: false },
    { id: 'ab38', hex: '86C1F2', callsign: 'JAL742', type: 'commercial', aircraft: 'B787-8', registration: 'JA838J', origin: 'RJTT', destination: 'OTHH', lat: jitter(29.0, 0.5), lng: jitter(54.0, 0.6), altitude: 38000, groundSpeed: 475, verticalRate: 0, heading: jitter(250, 5), squawk: '2215', rssi: -15.3, seen: 1, country: 'Japan', flagged: false },
    { id: 'ab39', hex: '4B1B21', callsign: 'GFA215', type: 'commercial', aircraft: 'A321-253NX', registration: 'A9C-NB', origin: 'OBBI', destination: 'OEJN', lat: jitter(24.0, 0.3), lng: jitter(46.5, 0.4), altitude: 34000, groundSpeed: 440, verticalRate: 0, heading: jitter(250, 5), squawk: '3102', rssi: -12.8, seen: 1, country: 'Bahrain', flagged: false },
    { id: 'ab40', hex: 'A6E101', callsign: 'ETD53', type: 'commercial', aircraft: 'B787-10', registration: 'A6-BMH', origin: 'OMAA', destination: 'EGLL', lat: jitter(33.0, 0.5), lng: jitter(40.0, 0.6), altitude: 40000, groundSpeed: 478, verticalRate: 0, heading: jitter(315, 5), squawk: '5421', rssi: -11.5, seen: 1, country: 'UAE', flagged: false },
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
      id: 't1', channel: '@CIG_telegram',
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
      id: 't3', channel: '@sentaborim',
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
      id: 't6', channel: '@CIG_telegram',
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
      id: 't8', channel: '@sentaborim',
      text: 'Iranian FM: "Any attack on our sovereign territory will be met with overwhelming force. All options on the table."',
      textAr: '\u0648\u0632\u064A\u0631 \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A: "\u0623\u064A \u0647\u062C\u0648\u0645 \u0639\u0644\u0649 \u0623\u0631\u0627\u0636\u064A\u0646\u0627 \u0633\u064A\u064F\u0642\u0627\u0628\u0644 \u0628\u0642\u0648\u0629 \u0633\u0627\u062D\u0642\u0629."',
      timestamp: new Date(now - 40 * 60000).toISOString(),
    },
    {
      id: 't9', channel: '@OSINTdefender',
      text: 'SIGINT: Unusual radio traffic on IRGC Navy UHF bands in Strait of Hormuz. Possible coordination of fast boat swarms. Monitoring.',
      textAr: 'إشارات: حركة راديو غير معتادة على ترددات البحرية IRGC. مراقبة مستمرة.',
      timestamp: new Date(now - 5 * 60000).toISOString(),
    },
    {
      id: 't10', channel: '@GeoConfirmed',
      text: 'GEOLOCATED: Satellite imagery confirms 3 Shahed-136 launch positions near Tabriz. Grid refs confirmed via shadow analysis.',
      textAr: 'تأكيد جغرافي: صور أقمار صناعية تؤكد مواقع الإطلاق قرب تبريز.',
      timestamp: new Date(now - 18 * 60000).toISOString(),
    },
    {
      id: 't11', channel: '@YemeniLeaks',
      text: 'Houthi military spokesman: Third ballistic missile salvo fired toward Eilat. "Al-Quds-2" variant. Iron Dome and David\'s Sling both activated.',
      textAr: 'الناطق الحوثي: إطلاق صاروخ ثالث باتجاه إيلات. نوع القدس-2.',
      timestamp: new Date(now - 25 * 60000).toISOString(),
    },
    {
      id: 't12', channel: '@Intel_Slava',
      text: 'CONFIRMED: IDF F-35I Adir squadron departed Ramon AFB on undisclosed mission. F-15I Ra\'am tanker support noted.',
      textAr: 'مؤكد: سرب F-35I اتجه شمالاً من قاعدة رامون الجوية.',
      timestamp: new Date(now - 35 * 60000).toISOString(),
    },
    {
      id: 't13', channel: '@MaritimeSecurity',
      text: 'MSC ARIES: Crew update from satellite phone — still detained in Bandar Abbas. 25 crew of mixed nationality. India, Pakistan, Philippines flagged.',
      textAr: 'طاقم MSC ARIES: لا يزال محتجزاً في بندر عباس.',
      timestamp: new Date(now - 55 * 60000).toISOString(),
    },
    {
      id: 't14', channel: '@CyberKnow20',
      text: 'CYBER: Anonymous Sudan claims DDoS against Israeli banking infrastructure. Partial outages at Bank Hapoalim and Mizrahi-Tefahot confirmed.',
      textAr: 'هجمات إلكترونية: اضطرابات جزئية في البنوك الإسرائيلية.',
      timestamp: new Date(now - 48 * 60000).toISOString(),
    },
    {
      id: 't15', channel: '@AviationIntel',
      text: 'ELINT: E-8C J-STARS airborne over eastern Mediterranean. Ground surveillance mode. Tracking armored movement south Lebanon.',
      textAr: 'E-8C في وضع المراقبة فوق المتوسط. يتتبع حركة مدرعة.',
      timestamp: new Date(now - 62 * 60000).toISOString(),
    },
    {
      id: 't16', channel: '@CENTCOM_Watch',
      text: 'USS Gerald R. Ford (CVN-78) strike group entered eastern Mediterranean. Combined with Eisenhower — two CSGs now in theater.',
      textAr: 'USS جيرالد فورد يدخل المتوسط. مجموعتان ضاربتان الآن في المنطقة.',
      timestamp: new Date(now - 70 * 60000).toISOString(),
    },
    {
      id: 't17', channel: '@LebanoScope',
      text: 'South Lebanon: Hezbollah Radwan forces repositioning in Marjayoun-Khiam corridor. Unusual vehicle movements past 2 hours.',
      textAr: 'قوات رضوان تعيد تموضعها في ممر مرجعيون-خيام.',
      timestamp: new Date(now - 85 * 60000).toISOString(),
    },
    {
      id: 't18', channel: '@OilMarkets',
      text: 'Aramco tanker insurance surcharges +340% week-on-week. Lloyd\'s of London raising "war risk" zone to include all Persian Gulf approaches.',
      textAr: 'ارتفاع أقساط تأمين ناقلات أرامكو 340% أسبوعياً.',
      timestamp: new Date(now - 90 * 60000).toISOString(),
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

function generateRedAlerts(): RedAlert[] {
  const now = Date.now();
  const count = 8 + Math.floor(Math.random() * 10);
  const shuffled = [...RED_ALERT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(a => ({
    ...a,
    timestamp: new Date(now - Math.floor(Math.random() * 120000)).toISOString(),
    active: true,
  }));
}

function generateAIBrief(): AIBrief {
  const now = new Date();
  return {
    id: 'brief-' + Date.now(),
    summary: 'The Iran-Israel-Lebanon theater remains at EXTREME risk levels. Multiple ballistic missile exchanges detected in the past 6 hours, with Israeli air defense systems reporting 94% interception rate. IRGC naval forces have increased patrols in the Strait of Hormuz, threatening commercial shipping lanes. Hezbollah has launched over 200 rockets toward northern Israel in the past 12 hours. US carrier strike group USS Eisenhower has repositioned to patrol station Bravo in the Persian Gulf. Diplomatic channels remain active with Qatar-mediated back-channel communications between Tehran and Washington.',
    summaryAr: '\u0645\u0633\u0631\u062D \u0625\u064A\u0631\u0627\u0646-\u0625\u0633\u0631\u0627\u0626\u064A\u0644-\u0644\u0628\u0646\u0627\u0646 \u064A\u0628\u0642\u0649 \u0639\u0646\u062F \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u062E\u0637\u0631 \u0642\u0635\u0648\u0649. \u062A\u0645 \u0631\u0635\u062F \u062A\u0628\u0627\u062F\u0644\u0627\u062A \u0635\u0627\u0631\u0648\u062E\u064A\u0629 \u0628\u0627\u0644\u064A\u0633\u062A\u064A\u0629 \u0645\u062A\u0639\u062F\u062F\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0633\u062A \u0627\u0644\u0645\u0627\u0636\u064A\u0629.',
    keyDevelopments: [
      {
        text: 'IRGC confirms test-fire of Fattah-2 hypersonic missile from Kermanshah province - estimated Mach 13 velocity detected by early warning systems',
        textAr: '\u0627\u0644\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u064A \u064A\u0624\u0643\u062F \u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E \u0641\u062A\u0627\u062D-2 \u0641\u0631\u0637 \u0635\u0648\u062A\u064A',
        severity: 'critical',
        category: 'Missile Activity'
      },
      {
        text: 'Iron Dome and David\'s Sling batteries depleted to 60% capacity across northern command - emergency resupply from US stockpiles initiated',
        textAr: '\u0628\u0637\u0627\u0631\u064A\u0627\u062A \u0627\u0644\u0642\u0628\u0629 \u0627\u0644\u062D\u062F\u064A\u062F\u064A\u0629 \u0648\u0645\u0642\u0644\u0627\u0639 \u062F\u0627\u0648\u062F \u0627\u0633\u062A\u0646\u0641\u062F\u062A \u0625\u0644\u0649 60%',
        severity: 'critical',
        category: 'Air Defense'
      },
      {
        text: 'Strait of Hormuz: 3 VLCC supertankers rerouted via Oman coast after IRGC fast-attack craft intercept - insurance premiums surge 340%',
        textAr: '\u0645\u0636\u064A\u0642 \u0647\u0631\u0645\u0632: \u062A\u062D\u0648\u064A\u0644 3 \u0646\u0627\u0642\u0644\u0627\u062A \u0639\u0645\u0644\u0627\u0642\u0629 \u0628\u0639\u062F \u0627\u0639\u062A\u0631\u0627\u0636 \u0632\u0648\u0627\u0631\u0642 \u0627\u0644\u062D\u0631\u0633',
        severity: 'high',
        category: 'Maritime'
      },
      {
        text: 'Hezbollah ground forces detected massing near Metula crossing - IDF 91st Division redeployed to northern border',
        textAr: '\u0631\u0635\u062F \u062A\u062C\u0645\u0639 \u0642\u0648\u0627\u062A \u062D\u0632\u0628 \u0627\u0644\u0644\u0647 \u0627\u0644\u0628\u0631\u064A\u0629 \u0642\u0631\u0628 \u0645\u0639\u0628\u0631 \u0645\u0637\u0644\u0629',
        severity: 'high',
        category: 'Ground Forces'
      },
      {
        text: 'IAEA emergency session called after seismic activity detected near Fordow enrichment facility - Iran denies underground test',
        textAr: '\u062C\u0644\u0633\u0629 \u0637\u0627\u0631\u0626\u0629 \u0644\u0644\u0648\u0643\u0627\u0644\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0628\u0639\u062F \u0646\u0634\u0627\u0637 \u0632\u0644\u0632\u0627\u0644\u064A \u0642\u0631\u0628 \u0641\u0631\u062F\u0648',
        severity: 'critical',
        category: 'Nuclear'
      },
      {
        text: 'Brent crude breaks $87 resistance - Goldman Sachs updates target to $95 on Hormuz disruption scenario, gold tests $2,100',
        textAr: '\u062E\u0627\u0645 \u0628\u0631\u0646\u062A \u064A\u0643\u0633\u0631 \u0645\u0642\u0627\u0648\u0645\u0629 87$ - \u0627\u0644\u0630\u0647\u0628 \u064A\u062E\u062A\u0628\u0631 2100$',
        severity: 'medium',
        category: 'Markets'
      },
    ],
    focalPoints: ['Strait of Hormuz', 'Northern Israel', 'Fordow Nuclear Facility', 'Kermanshah', 'South Lebanon'],
    riskLevel: 'EXTREME',
    generatedAt: now.toISOString(),
    model: 'warroom-llm-v3.1',
  };
}

const deductionResponses: Record<string, { response: string; responseAr: string; confidence: number; timeframe: string }> = {
  default: {
    response: 'Based on current trajectory analysis and multi-source intelligence correlation:\n\n1. HIGH PROBABILITY (85%): Iran will conduct additional ballistic missile launches within 24-48 hours, likely targeting Israeli military infrastructure in the Golan Heights and Negev desert.\n\n2. MODERATE PROBABILITY (65%): Hezbollah will escalate rocket fire to include precision-guided munitions targeting Haifa port facilities and northern IDF command centers.\n\n3. ELEVATED RISK (70%): IRGC Navy will attempt to detain or board a commercial vessel in the Strait of Hormuz within 72 hours as leverage.\n\n4. DIPLOMATIC (55%): Qatar-mediated back-channel will produce a 48-hour humanitarian pause proposal by end of week.\n\n5. ECONOMIC IMPACT: Brent crude projected to reach $92-95 range if Hormuz disruption materializes. Gold likely to breach $2,100 resistance.',
    responseAr: '\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u062D\u0627\u0644\u064A \u0648\u0627\u0631\u062A\u0628\u0627\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631: \u0627\u062D\u062A\u0645\u0627\u0644 \u0645\u0631\u062A\u0641\u0639 \u0644\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E \u0625\u064A\u0631\u0627\u0646\u064A\u0629 \u0625\u0636\u0627\u0641\u064A\u0629.',
    confidence: 0.72,
    timeframe: '24-72 hours'
  }
};

function generateDeduction(query: string): AIDeduction {
  const resp = deductionResponses.default;
  return {
    id: 'ded-' + Date.now(),
    query,
    response: resp.response,
    responseAr: resp.responseAr,
    confidence: resp.confidence,
    timeframe: resp.timeframe,
    timestamp: new Date().toISOString(),
  };
}

let earthquakeCache: { data: EarthquakeEvent[]; fetchedAt: number } | null = null;
const EQ_CACHE_TTL = 5 * 60 * 1000;

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

function generateCyberEvents(): CyberEvent[] {
  const now = Date.now();
  return [
    { id: 'cy1', type: 'ddos', target: 'Bank Hapoalim', attacker: 'Anonymous Sudan', severity: 'high', sector: 'financial', country: 'Israel', timestamp: new Date(now - 8 * 60000).toISOString(), description: 'Volumetric DDoS (80Gbps) against Israeli banking infrastructure. Killnet coordination suspected. Partial service degradation confirmed.' },
    { id: 'cy2', type: 'intrusion', target: 'IRGC Command Network', attacker: 'Unit 8200', severity: 'critical', sector: 'military', country: 'Iran', timestamp: new Date(now - 38 * 60000).toISOString(), description: 'Unauthorized access detected in IRGC internal communications. SIGINT exfiltration activity observed on C2 nodes.' },
    { id: 'cy3', type: 'scada', target: 'Saudi Aramco SCADA', attacker: 'APT34', severity: 'critical', sector: 'energy', country: 'Saudi Arabia', timestamp: new Date(now - 82 * 60000).toISOString(), description: 'TRITON-variant malware identified in Aramco ICS. Safety instrumented systems targeted. OT network segment isolated.' },
    { id: 'cy4', type: 'phishing', target: 'IDF Personnel', attacker: 'Hamas Cyber', severity: 'medium', sector: 'military', country: 'Israel', timestamp: new Date(now - 150 * 60000).toISOString(), description: 'Spear-phishing via fake social/dating app profiles targeting IDF soldiers. 14 devices potentially compromised.' },
    { id: 'cy5', type: 'data_exfil', target: 'UAE Ministry of Defense', attacker: 'APT35', severity: 'critical', sector: 'military', country: 'UAE', timestamp: new Date(now - 6 * 3600000).toISOString(), description: 'Data exfiltration via compromised supply-chain vendor. 4.2GB of classified documents transferred to Iranian-linked servers.' },
    { id: 'cy6', type: 'defacement', target: 'Lebanese Gov Portal', severity: 'low', sector: 'government', country: 'Lebanon', timestamp: new Date(now - 9 * 3600000).toISOString(), description: 'Lebanese ministry sites defaced with pro-Hezbollah messaging. Attributed to Lebanese Cyber Army splinter group.' },
    { id: 'cy7', type: 'intrusion', target: 'Bahrain Oil Pipeline', attacker: 'APT33', severity: 'high', sector: 'energy', country: 'Bahrain', timestamp: new Date(now - 14 * 3600000).toISOString(), description: 'Persistent access confirmed in Bahraini pipeline control systems. Wiper malware pre-positioned, not yet activated.' },
    { id: 'cy8', type: 'ddos', target: 'Al Jazeera Streaming', attacker: 'Killnet', severity: 'medium', sector: 'media', country: 'Qatar', timestamp: new Date(now - 20 * 3600000).toISOString(), description: 'Al Jazeera live streaming disrupted for 3 hours. Russian-linked Killnet claimed responsibility via Telegram.' },
    { id: 'cy9', type: 'malware', target: 'Jordan Power Grid', attacker: 'Unknown APT', severity: 'high', sector: 'infrastructure', country: 'Jordan', timestamp: new Date(now - 28 * 3600000).toISOString(), description: 'Industroyer-2 variant detected in SCADA systems managing Jordanian national grid substations.' },
    { id: 'cy10', type: 'intrusion', target: 'Egyptian Intelligence HQ', attacker: 'NSO Pegasus', severity: 'critical', sector: 'government', country: 'Egypt', timestamp: new Date(now - 36 * 3600000).toISOString(), description: 'Pegasus spyware implant discovered on devices belonging to senior Egyptian intelligence officials.' },
  ];
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

  const telegramCache = new Map<string, { data: TelegramMessage[]; fetchedAt: number }>();
  const TELEGRAM_CACHE_TTL = 3 * 60 * 1000;
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

  async function scrapeChannel(channel: string): Promise<TelegramMessage[]> {
    const cached = telegramCache.get(channel);
    if (cached && Date.now() - cached.fetchedAt < TELEGRAM_CACHE_TTL) {
      return cached.data;
    }

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

      if (!response.ok) {
        if (cached) return cached.data;
        return [];
      }

      const html = await response.text();

      const msgRegex = /<div class="tgme_widget_message_wrap[^"]*"[^>]*data-post="([^"]*)"[^>]*>[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time[^>]*datetime="([^"]*)"[^>]*>/g;
      let match;
      let count = 0;
      while ((match = msgRegex.exec(html)) !== null && count < 15) {
        const postId = match[1];
        let text = stripHtmlToText(match[2]);
        const datetime = match[3];

        if (!text || text.length < 5) continue;
        if (!isLikelyEnglishOrArabic(text)) continue;

        if (text.length > 500) {
          text = text.substring(0, 497) + '...';
        }

        msgs.push({
          id: `live_${channel}_${postId.replace('/', '_')}`,
          channel: `@${channel}`,
          text,
          timestamp: datetime || new Date().toISOString(),
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
  }

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
    res.json(generateSirens());
  });

  app.get('/api/red-alerts', (_req, res) => {
    res.json(generateRedAlerts());
  });

  app.get('/api/adsb', (_req, res) => {
    res.json(generateAdsbFlights());
  });

  app.get('/api/ai-brief', (_req, res) => {
    res.json(generateAIBrief());
  });

  app.post('/api/ai-deduct', (req, res) => {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string required' });
    }
    res.json(generateDeduction(query));
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
    send('events', { events: generateEvents(), flights: generateFlights(), ships: generateShips() });
    send('news', generateNews());
    send('sirens', generateSirens());
    send('red-alerts', generateRedAlerts());
    send('adsb', generateAdsbFlights());
    send('ai-brief', generateAIBrief());
    send('telegram', generateTelegram());
    send('cyber', generateCyberEvents());
    fetchEarthquakes().then(eqs => send('earthquakes', eqs));

    intervals.push(setInterval(() => send('commodities', generateCommodities()), 5000));
    intervals.push(setInterval(() => send('adsb', generateAdsbFlights()), 6000));
    intervals.push(setInterval(() => send('red-alerts', generateRedAlerts()), 8000));
    intervals.push(setInterval(() => send('sirens', generateSirens()), 10000));
    intervals.push(setInterval(() => {
      send('events', { events: generateEvents(), flights: generateFlights(), ships: generateShips() });
    }, 15000));
    intervals.push(setInterval(() => send('news', generateNews()), 20000));
    intervals.push(setInterval(() => send('telegram', generateTelegram()), 25000));
    intervals.push(setInterval(() => send('ai-brief', generateAIBrief()), 60000));
    intervals.push(setInterval(() => send('cyber', generateCyberEvents()), 45000));
    intervals.push(setInterval(() => fetchEarthquakes().then(eqs => send('earthquakes', eqs)), 5 * 60000));

    req.on('close', () => {
      intervals.forEach(clearInterval);
    });
  });

  app.get('/api/earthquakes', async (_req, res) => {
    const data = await fetchEarthquakes();
    res.json(data);
  });

  app.get('/api/cyber', (_req, res) => {
    res.json(generateCyberEvents());
  });

  app.get('/api/alert-history', (_req, res) => {
    const now = Date.now();
    const history: Array<RedAlert & { resolved: boolean; resolvedAt?: string }> = [];
    const cities = [
      { city: 'Tel Aviv', cityHe: '\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1', cityAr: '\u062A\u0644 \u0623\u0628\u064A\u0628', region: 'Gush Dan', regionHe: '\u05D2\u05D5\u05E9 \u05D3\u05DF', regionAr: '\u063A\u0648\u0634 \u062F\u0627\u0646', country: 'Israel', countryCode: 'IL', lat: 32.085, lng: 34.782 },
      { city: 'Haifa', cityHe: '\u05D7\u05D9\u05E4\u05D4', cityAr: '\u062D\u064A\u0641\u0627', region: 'Haifa Bay', regionHe: '\u05DE\u05E4\u05E8\u05E5 \u05D7\u05D9\u05E4\u05D4', regionAr: '\u062E\u0644\u064A\u062C \u062D\u064A\u0641\u0627', country: 'Israel', countryCode: 'IL', lat: 32.794, lng: 34.989 },
      { city: 'Sderot', cityHe: '\u05E9\u05D3\u05E8\u05D5\u05EA', cityAr: '\u0633\u062F\u064A\u0631\u0648\u062A', region: 'Gaza Envelope', regionHe: '\u05E2\u05D5\u05D8\u05E3 \u05E2\u05D6\u05D4', regionAr: '\u063A\u0644\u0627\u0641 \u063A\u0632\u0629', country: 'Israel', countryCode: 'IL', lat: 31.525, lng: 34.596 },
      { city: 'Beirut', cityHe: '\u05D1\u05D9\u05E8\u05D5\u05EA', cityAr: '\u0628\u064A\u0631\u0648\u062A', region: 'Beirut', regionHe: '\u05D1\u05D9\u05E8\u05D5\u05EA', regionAr: '\u0628\u064A\u0631\u0648\u062A', country: 'Lebanon', countryCode: 'LB', lat: 33.894, lng: 35.502 },
      { city: 'Isfahan', cityHe: '\u05D0\u05E1\u05E4\u05D4\u05D0\u05DF', cityAr: '\u0623\u0635\u0641\u0647\u0627\u0646', region: 'Isfahan Province', regionHe: '\u05DE\u05D7\u05D5\u05D6 \u05D0\u05E1\u05E4\u05D4\u05D0\u05DF', regionAr: '\u0645\u062D\u0627\u0641\u0638\u0629 \u0623\u0635\u0641\u0647\u0627\u0646', country: 'Iran', countryCode: 'IR', lat: 32.655, lng: 51.668 },
      { city: 'Damascus', cityHe: '\u05D3\u05DE\u05E9\u05E7', cityAr: '\u062F\u0645\u0634\u0642', region: 'Damascus', regionHe: '\u05D3\u05DE\u05E9\u05E7', regionAr: '\u062F\u0645\u0634\u0642', country: 'Syria', countryCode: 'SY', lat: 33.514, lng: 36.277 },
    ];
    const threats: Array<'rockets' | 'missiles' | 'hostile_aircraft_intrusion' | 'uav_intrusion'> = ['rockets', 'missiles', 'hostile_aircraft_intrusion', 'uav_intrusion'];
    for (let i = 0; i < 50; i++) {
      const c = cities[Math.floor(Math.random() * cities.length)];
      const age = Math.floor(Math.random() * 3600 * 12) * 1000;
      const ts = new Date(now - age).toISOString();
      const countdown = [15, 30, 45, 60, 90, 120][Math.floor(Math.random() * 6)];
      const resolved = age > countdown * 1000;
      history.push({
        id: `hist-${i}`,
        ...c,
        countdown,
        threatType: threats[Math.floor(Math.random() * threats.length)],
        timestamp: ts,
        active: !resolved,
        lat: c.lat + (Math.random() - 0.5) * 0.1,
        lng: c.lng + (Math.random() - 0.5) * 0.1,
        resolved,
        resolvedAt: resolved ? new Date(new Date(ts).getTime() + countdown * 1000).toISOString() : undefined,
      });
    }
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(history);
  });

  return httpServer;
}
