import {
  alertHistory, latestTgMsgs, latestXPosts, latestAlerts,
  classifiedMessageCache,
  setLatestTgMsgs, setLatestXPosts, setLatestAlerts,
  broadcastSse, recordAlertHistory,
} from "../lib/shared-state";

import { generateNews, fetchXFeeds } from "./news";
import { generateCommodities } from "./commodities";
import { fetchGDELTConflictEvents, fetchThermalHotspots } from "./events";
import { fetchOrefAlerts, generateRedAlerts } from "./alerts";
import { classifyMessages, generateAnalytics } from "./analytics";
import { fetchLiveTelegram, fetchPriorityTelegram, detectBreakingNews, mapAlertsToSirens } from "./telegram";
import { generateRocketStats, generateAttackPrediction } from "./rocket-stats";

import { clearCache as clearNewsCache } from "./news";
import { clearCache as clearCommoditiesCache } from "./commodities";
import { clearCache as clearEventsCache } from "./events";
import { clearCache as clearAlertsCache } from "./alerts";
import { clearCache as clearAnalyticsCache } from "./analytics";
import { clearCache as clearTelegramCache } from "./telegram";
import { clearCache as clearRocketStatsCache } from "./rocket-stats";

interface LatestData {
  commodities: unknown;
  redAlerts: unknown;
  sirens: unknown;
  breakingNews: unknown;
  telegram: unknown;
  events: unknown;
  news: unknown;
  thermal: unknown;
  classified: unknown;
  analytics: unknown;
  attackPrediction: unknown;
  rocketStats: unknown;
}

const latest: Partial<LatestData> = {};

export function getLatestSnapshot(): Partial<LatestData> {
  return { ...latest };
}

let started = false;
const intervals: NodeJS.Timeout[] = [];

function broadcast(event: string, data: unknown) {
  broadcastSse(event, data);
}

async function refreshRedAlerts() {
  try {
    const alerts = await generateRedAlerts();
    setLatestAlerts(alerts);
    recordAlertHistory(alerts);
    latest.redAlerts = alerts;
    broadcast('red-alerts', alerts);
    const activeSirens = mapAlertsToSirens(alerts);
    latest.sirens = activeSirens;
    broadcast('sirens', activeSirens);
    const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, alerts);
    latest.breakingNews = breaking;
    broadcast('breaking-news', breaking);
  } catch {}
}

async function refreshTelegramPriority() {
  try {
    const tgMsgs = await fetchPriorityTelegram();
    setLatestTgMsgs(tgMsgs);
    latest.telegram = tgMsgs;
    broadcast('telegram', tgMsgs);
    const breaking = detectBreakingNews(tgMsgs, latestXPosts, latestAlerts);
    latest.breakingNews = breaking;
    broadcast('breaking-news', breaking);
  } catch {}
}

async function refreshTelegramFull() {
  try {
    const tgMsgs = await fetchLiveTelegram();
    setLatestTgMsgs(tgMsgs);
    latest.telegram = tgMsgs;
    broadcast('telegram', tgMsgs);
  } catch {}
}

async function refreshEvents() {
  try {
    const events = await fetchGDELTConflictEvents(fetchOrefAlerts);
    latest.events = { events, flights: [], ships: [] };
    broadcast('events', latest.events);
  } catch {}
}

async function refreshNews() {
  try {
    const news = await generateNews();
    latest.news = news;
    broadcast('news', news);
  } catch {}
}

async function refreshThermal() {
  try {
    const hotspots = await fetchThermalHotspots();
    latest.thermal = hotspots;
    broadcast('thermal', hotspots);
  } catch {}
}

async function refreshXFeeds() {
  try {
    const xPosts = await fetchXFeeds();
    setLatestXPosts(xPosts);
  } catch {}
}

async function refreshClassified() {
  try {
    const tgMsgs = latestTgMsgs.length > 0 ? latestTgMsgs : await fetchPriorityTelegram().catch(() => []);
    if (tgMsgs.length > 0) {
      const classified = await classifyMessages(tgMsgs);
      latest.classified = classified;
      broadcast('classified', classified);
    }
  } catch {}
}

async function refreshAnalytics() {
  try {
    const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
    const [conflictEvents, thermalHotspots] = await Promise.all([
      fetchGDELTConflictEvents(fetchOrefAlerts),
      fetchThermalHotspots(),
    ]);
    const analytics = generateAnalytics(
      alerts,
      classifiedMessageCache,
      conflictEvents,
      thermalHotspots.filter(h => h.confidence === 'high' || h.confidence === 'nominal').length,
      0,
    );
    latest.analytics = analytics;
    broadcast('analytics', analytics);
  } catch {}
}

async function refreshAttackPrediction() {
  try {
    const pred = await generateAttackPrediction();
    latest.attackPrediction = pred;
    broadcast('attack-prediction', pred);
  } catch {}
}

function refreshRocketStats() {
  try {
    const stats = generateRocketStats();
    latest.rocketStats = stats;
    broadcast('rocket-stats', stats);
  } catch {}
}

function refreshCommodities() {
  latest.commodities = generateCommodities();
  broadcast('commodities', latest.commodities);
}

function flushAllCaches() {
  console.log('[CACHE-FLUSH] Clearing all caches (15-min interval)');
  clearNewsCache();
  clearCommoditiesCache();
  clearEventsCache();
  clearAlertsCache();
  clearAnalyticsCache();
  clearTelegramCache();
  clearRocketStatsCache();
}

export function startSseScheduler(): void {
  if (started) return;
  started = true;

  refreshCommodities();
  refreshRedAlerts();
  refreshTelegramFull().then(() => {
    const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, latestAlerts);
    latest.breakingNews = breaking;
    broadcast('breaking-news', breaking);
  });

  setTimeout(() => {
    refreshEvents().then(() => {
      refreshAnalytics();
    });
    refreshNews();
  }, 500);

  setTimeout(() => {
    refreshThermal();
  }, 1500);

  setTimeout(() => {
    refreshXFeeds();
    refreshClassified();
  }, 3000);

  setTimeout(() => {
    refreshAttackPrediction();
    refreshRocketStats();
  }, 4000);

  intervals.push(setInterval(refreshCommodities, 30_000));
  intervals.push(setInterval(refreshRedAlerts, 3_000));
  intervals.push(setInterval(refreshTelegramPriority, 3_000));
  intervals.push(setInterval(refreshTelegramFull, 30_000));
  intervals.push(setInterval(refreshEvents, 60_000));
  intervals.push(setInterval(refreshNews, 30_000));
  intervals.push(setInterval(refreshThermal, 30_000));
  intervals.push(setInterval(refreshXFeeds, 90_000));
  intervals.push(setInterval(refreshClassified, 20_000));
  intervals.push(setInterval(refreshAnalytics, 30_000));
  intervals.push(setInterval(refreshAttackPrediction, 60_000));
  intervals.push(setInterval(refreshRocketStats, 30_000));
  intervals.push(setInterval(flushAllCaches, 15 * 60_000));
}

export function stopSseScheduler(): void {
  intervals.forEach(clearInterval);
  intervals.length = 0;
  started = false;
}
