import type { Express } from "express";
import type { Server } from "http";
import type { SitrepWindow } from "@shared/schema";

import {
  alertHistory, latestTgMsgs, latestXPosts, latestAlerts,
  classifiedMessageCache,
  setLatestAlerts,
  sseBroadcasters, broadcastSse, recordAlertHistory,
} from "./lib/shared-state";

import { generateNews } from "./services/news";
import { generateCommodities, startCommodityIntervals } from "./services/commodities";
import { fetchGDELTConflictEvents, fetchThermalHotspots, fetchCyberEvents } from "./services/events";
import { fetchOrefAlerts, generateRedAlerts, connectTzevaadomWebSocket, fetchDynamicCities } from "./services/alerts";
import {
  classifyMessages, generateAnalytics, generateSitrep,
  runMultiLLMAssessment, computeConsensus,
} from "./services/analytics";
import {
  fetchLiveTelegram, fetchLiveChannels,
  detectBreakingNews, mapAlertsToSirens,
} from "./services/telegram";
import type { RedAlert } from "@shared/schema";
import {
  generateRocketStats, generateAttackPrediction, fetchLiveConflictFeed,
  fetchEpicFury, handleAiAnalyst, invalidateAttackPredictionCache,
} from "./services/rocket-stats";

import { fetchWeatherData } from "./services/weather";
import { startSseScheduler, getLatestSnapshot } from "./services/sse-scheduler";

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {

  fetchDynamicCities();
  startCommodityIntervals();

  app.get('/api/news', async (_req, res) => {
    const news = await generateNews();
    res.json(news);
  });

  app.get('/api/commodities', (_req, res) => {
    res.json(generateCommodities());
  });

  app.get('/api/events', async (_req, res) => {
    const events = await fetchGDELTConflictEvents(fetchOrefAlerts);
    res.json(events);
  });

  app.get('/api/red-alerts', async (_req, res) => {
    const alerts = await generateRedAlerts();
    setLatestAlerts(alerts);
    recordAlertHistory(alerts);
    res.json(alerts);
  });

  app.get('/api/sirens', async (_req, res) => {
    const alerts = await generateRedAlerts();
    setLatestAlerts(alerts);
    recordAlertHistory(alerts);
    const sirens = mapAlertsToSirens(alerts);
    res.json(sirens);
  });

  app.get('/api/thermal', async (_req, res) => {
    const hotspots = await fetchThermalHotspots();
    res.json(hotspots);
  });

  app.get('/api/cyber', async (_req, res) => {
    const events = await fetchCyberEvents();
    res.json(events);
  });

  app.get('/api/telegram', async (_req, res) => {
    const msgs = await fetchLiveTelegram();
    res.json(msgs);
  });

  app.get('/api/telegram/live', async (req, res) => {
    const channelsParam = req.query.channels as string;
    if (!channelsParam) {
      res.json([]);
      return;
    }
    const msgs = await fetchLiveChannels(channelsParam);
    res.json(msgs);
  });

  app.get('/api/breaking-news', async (_req, res) => {
    const alerts = latestAlerts.length > 0 ? latestAlerts : await generateRedAlerts();
    const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, alerts);
    res.json(breaking);
  });

  app.get('/api/analytics', async (_req, res) => {
    const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
    const events = await fetchGDELTConflictEvents(fetchOrefAlerts);
    const analytics = generateAnalytics(alerts, classifiedMessageCache, events);
    res.json(analytics);
  });

  app.get('/api/classify', async (_req, res) => {
    const classified = await classifyMessages(latestTgMsgs);
    res.json(classified);
  });

  app.post('/api/multi-llm', async (_req, res) => {
    const alerts = alertHistory.length > 0 ? alertHistory : await generateRedAlerts();
    const classified = await classifyMessages(latestTgMsgs);
    const assessments = await runMultiLLMAssessment(alerts, classified);
    const consensus = computeConsensus(assessments);
    res.json({ assessments, ...consensus });
  });

  app.get('/api/sitrep', async (req, res) => {
    const window = (req.query.window as SitrepWindow) || '6h';
    if (!['1h', '6h', '24h'].includes(window)) {
      res.status(400).json({ error: 'Invalid window' });
      return;
    }
    const sitrep = await generateSitrep(window);
    res.json(sitrep);
  });

  app.get('/api/rocket-stats', (_req, res) => {
    res.json(generateRocketStats());
  });

  app.get('/api/attack-prediction', async (_req, res) => {
    const prediction = await generateAttackPrediction();
    res.json(prediction);
  });

  app.get('/api/live-conflict-feed', async (_req, res) => {
    const feed = await fetchLiveConflictFeed();
    res.json(feed);
  });

  app.get('/api/epic-fury', async (_req, res) => {
    const data = await fetchEpicFury();
    res.json(data);
  });

  app.get('/api/weather', async (_req, res) => {
    const data = await fetchWeatherData();
    res.json(data);
  });

  app.post('/api/ai-analyst', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const { question = '', clientContext } = req.body || {};
    const response = handleAiAnalyst(question as string, clientContext || {});
    const lines = response.split('\n');
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) {
        res.write(`data: ${JSON.stringify({ token: lines[i] + '\n' })}\n\n`);
        i++;
      } else {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        clearInterval(iv);
        res.end();
      }
    }, 30);
  });

  app.get('/api/alert-history', (_req, res) => {
    const now = Date.now();
    const BUCKET_COUNT = 96;
    const BUCKET_SIZE_MS = 15 * 60 * 1000;
    const windowStart = now - BUCKET_COUNT * BUCKET_SIZE_MS;

    const buckets: Array<{ startTime: string; endTime: string; count: number; alerts: Array<RedAlert & { resolved: boolean; resolvedAt?: string }> }> = [];
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

  connectTzevaadomWebSocket((alerts) => {
    broadcastSse('red-alerts', alerts);
    setLatestAlerts(alerts);
    recordAlertHistory(alerts);
    const sirens = mapAlertsToSirens(alerts);
    broadcastSse('sirens', sirens);
    invalidateAttackPredictionCache();
  });

  startSseScheduler();

  app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':\n\n');

    const lastHashes = new Map<string, string>();
    const send = (event: string, data: unknown) => {
      try {
        const json = JSON.stringify(data);
        const hash = Buffer.from(json.slice(0, 200) + json.length).toString('base64');
        if (lastHashes.get(event) === hash) return;
        lastHashes.set(event, hash);
        res.write(`event: ${event}\ndata: ${json}\n\n`);
      } catch {}
    };

    sseBroadcasters.add(send);
    req.on('close', () => {
      sseBroadcasters.delete(send);
    });

    const snapshot = getLatestSnapshot();
    if (snapshot.commodities) send('commodities', snapshot.commodities);
    if (snapshot.redAlerts) send('red-alerts', snapshot.redAlerts);
    if (snapshot.sirens) send('sirens', snapshot.sirens);
    if (snapshot.breakingNews) send('breaking-news', snapshot.breakingNews);
    if (snapshot.telegram) send('telegram', snapshot.telegram);
    if (snapshot.events) send('events', snapshot.events);
    if (snapshot.news) send('news', snapshot.news);
    if (snapshot.thermal) send('thermal', snapshot.thermal);
    if (snapshot.classified) send('classified', snapshot.classified);
    if (snapshot.analytics) send('analytics', snapshot.analytics);
    if (snapshot.attackPrediction) send('attack-prediction', snapshot.attackPrediction);
    if (snapshot.rocketStats) send('rocket-stats', snapshot.rocketStats);
  });

}
