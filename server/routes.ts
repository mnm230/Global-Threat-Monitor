import type { Express } from "express";
import type { Server } from "http";
import type { SitrepWindow } from "@shared/schema";

import {
  alertHistory, latestTgMsgs, latestXPosts, latestAlerts,
  classifiedMessageCache,
  setLatestTgMsgs, setLatestXPosts, setLatestAlerts,
  sseBroadcasters, broadcastSse, recordAlertHistory,
} from "./lib/shared-state";

import { generateNews, fetchXFeeds } from "./services/news";
import { generateCommodities, startCommodityIntervals } from "./services/commodities";
import { fetchGDELTConflictEvents, fetchThermalHotspots, fetchCyberEvents } from "./services/events";
import { fetchOrefAlerts, generateRedAlerts, connectTzevaadomWebSocket, fetchDynamicCities } from "./services/alerts";
import {
  classifyMessages, generateAnalytics, generateSitrep,
  runMultiLLMAssessment, computeConsensus,
} from "./services/analytics";
import {
  fetchLiveTelegram, fetchPriorityTelegram, fetchLiveChannels,
  detectBreakingNews, mapAlertsToSirens,
} from "./services/telegram";
import {
  generateRocketStats, generateAttackPrediction, fetchLiveConflictFeed,
  fetchEpicFury, handleAiAnalyst, invalidateAttackPredictionCache,
} from "./services/rocket-stats";

import { clearCache as clearNewsCache } from "./services/news";
import { clearCache as clearCommoditiesCache } from "./services/commodities";
import { clearCache as clearEventsCache } from "./services/events";
import { clearCache as clearAlertsCache } from "./services/alerts";
import { clearCache as clearAnalyticsCache } from "./services/analytics";
import { clearCache as clearTelegramCache } from "./services/telegram";
import { clearCache as clearRocketStatsCache } from "./services/rocket-stats";

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
    res.json({ events, flights: [], ships: [] });
  });

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
    const messages = await fetchLiveChannels(channelsParam);
    res.json(messages);
  });

  app.get('/api/sirens', (_req, res) => {
    res.json([]);
  });

  app.get('/api/red-alerts', async (_req, res) => {
    res.json(await generateRedAlerts());
  });

  app.get('/api/sitrep', async (req, res) => {
    const raw = (req.query.window as string) || '1h';
    const window: SitrepWindow = (['1h', '6h', '24h'].includes(raw) ? raw : '1h') as SitrepWindow;
    try {
      const sitrep = await generateSitrep(window);
      res.json(sitrep);
    } catch {
      res.status(503).json({ error: 'SITREP generation unavailable' });
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
    const [conflictEvents, thermalHotspots, llmAssessments] = await Promise.all([
      fetchGDELTConflictEvents(fetchOrefAlerts),
      fetchThermalHotspots(),
      runMultiLLMAssessment(alerts, messages),
    ]);
    const thermalCount = thermalHotspots.filter(h => h.confidence === 'high' || h.confidence === 'nominal').length;
    const analytics = generateAnalytics(alerts, messages, conflictEvents, thermalCount, 0);
    const { consensusRisk, modelAgreement } = computeConsensus(llmAssessments);
    res.json({ ...analytics, llmAssessments, consensusRisk, modelAgreement });
  });

  app.get('/api/ai-status', (_req, res) => {
    res.json({ engines: [], onlineCount: 0, totalCount: 0, checkedAt: new Date().toISOString() });
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

  app.get('/api/rocket-stats', (_req, res) => {
    try {
      const stats = generateRocketStats();
      res.json(stats);
    } catch {
      res.status(500).json({ error: 'Failed to generate rocket stats' });
    }
  });

  app.get('/api/live-conflict-feed', async (_req, res) => {
    try {
      const data = await fetchLiveConflictFeed();
      res.json(data);
    } catch (err) {
      console.error('[CONFLICT-FEED]', err);
      res.status(500).json({ error: 'Failed to fetch conflict feed' });
    }
  });

  app.get('/api/attack-prediction', async (_req, res) => {
    try {
      const prediction = await generateAttackPrediction();
      res.json(prediction);
    } catch {
      res.status(500).json({ error: 'Failed to generate attack prediction' });
    }
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

  app.get('/api/epic-fury', async (_req, res) => {
    try {
      const data = await fetchEpicFury();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Fetch failed', fetchedAt: new Date().toISOString() });
    }
  });

  app.post('/api/ai-analyst', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const { question = '', clientContext } = req.body || {};
    const response = handleAiAnalyst(question as string, clientContext);

    const tokens = response.split(/(?<=\s)|(?=\s)/);
    let i = 0;
    const tick = setInterval(() => {
      if (i >= tokens.length) {
        clearInterval(tick);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }
      res.write(`data: ${JSON.stringify({ text: tokens[i] })}\n\n`);
      i++;
    }, 18);

    req.on('close', () => clearInterval(tick));
  });

  connectTzevaadomWebSocket((alerts) => {
    setLatestAlerts(alerts);
    recordAlertHistory(alerts);
    invalidateAttackPredictionCache();
    broadcastSse('red-alerts', alerts);
    broadcastSse('sirens', mapAlertsToSirens(alerts));
    const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, alerts);
    broadcastSse('breaking-news', breaking);
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
    req.on('close', () => sseBroadcasters.delete(send));

    setLatestXPosts([]);
    setLatestAlerts([]);

    const staggerTimers: ReturnType<typeof setTimeout>[] = [];

    send('commodities', generateCommodities());
    generateRedAlerts().then(alerts => {
      setLatestAlerts(alerts);
      recordAlertHistory(alerts);
      send('red-alerts', alerts);
      const activeSirens = mapAlertsToSirens(alerts);
      send('sirens', activeSirens);
      const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, alerts);
      send('breaking-news', breaking);
    });
    fetchLiveTelegram().then(tgMsgs => {
      setLatestTgMsgs(tgMsgs);
      send('telegram', tgMsgs);
      const breaking = detectBreakingNews(tgMsgs, latestXPosts, latestAlerts);
      send('breaking-news', breaking);
    }).catch(() => {
      send('telegram', []);
    });

    staggerTimers.push(setTimeout(() => {
      fetchGDELTConflictEvents(fetchOrefAlerts).then((events) => {
        send('events', { events, flights: [], ships: [] });
        const analytics = generateAnalytics(latestAlerts, classifiedMessageCache, events);
        send('analytics', analytics);
      });
      generateNews().then(news => send('news', news));
    }, 500));

    staggerTimers.push(setTimeout(() => {
      fetchThermalHotspots().then(hotspots => send('thermal', hotspots));
    }, 1500));

    staggerTimers.push(setTimeout(() => {
      fetchXFeeds().then(xPosts => {
        setLatestXPosts(xPosts);
        const breaking = detectBreakingNews(latestTgMsgs, xPosts, latestAlerts);
        send('breaking-news', breaking);
      });
      classifyMessages(latestTgMsgs).then(c => send('classified', c)).catch(() => {});
    }, 3000));

    intervals.push(setInterval(() => send('commodities', generateCommodities()), 30000));
    intervals.push(setInterval(() => generateRedAlerts().then(alerts => {
      setLatestAlerts(alerts);
      recordAlertHistory(alerts);
      send('red-alerts', alerts);
      const activeSirens = mapAlertsToSirens(alerts);
      send('sirens', activeSirens);
      const breaking = detectBreakingNews(latestTgMsgs, latestXPosts, alerts);
      send('breaking-news', breaking);
    }), 3000));
    intervals.push(setInterval(() => {
      fetchGDELTConflictEvents(fetchOrefAlerts).then((events) => {
        send('events', { events, flights: [], ships: [] });
      });
    }, 60000));
    intervals.push(setInterval(() => generateNews().then(news => send('news', news)), 30000));
    intervals.push(setInterval(() => {
      fetchPriorityTelegram().then(tgMsgs => {
        setLatestTgMsgs(tgMsgs);
        send('telegram', tgMsgs);
        const breaking = detectBreakingNews(tgMsgs, latestXPosts, latestAlerts);
        send('breaking-news', breaking);
      }).catch(() => {});
    }, 3000));
    intervals.push(setInterval(() => {
      fetchLiveTelegram().then(tgMsgs => {
        setLatestTgMsgs(tgMsgs);
        send('telegram', tgMsgs);
      }).catch(() => {});
    }, 30000));
    intervals.push(setInterval(() => fetchXFeeds().then(xPosts => {
      setLatestXPosts(xPosts);
    }), 90000));

    intervals.push(setInterval(() => fetchThermalHotspots().then(hotspots => send('thermal', hotspots)), 30000));

    intervals.push(setInterval(async () => {
      const tgMsgs = latestTgMsgs.length > 0 ? latestTgMsgs : await fetchPriorityTelegram().catch(() => []);
      if (tgMsgs.length > 0) {
        const classified = await classifyMessages(tgMsgs);
        send('classified', classified);
      }
    }, 20000));

    intervals.push(setInterval(async () => {
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
      send('analytics', analytics);
    }, 30000));

    generateAttackPrediction().then(pred => send('attack-prediction', pred)).catch(() => {});
    intervals.push(setInterval(async () => {
      const pred = await generateAttackPrediction();
      send('attack-prediction', pred);
    }, 60000));

    try { send('rocket-stats', generateRocketStats()); } catch {}
    intervals.push(setInterval(() => {
      try { send('rocket-stats', generateRocketStats()); } catch {}
    }, 30000));

    intervals.push(setInterval(() => {
      console.log('[CACHE-FLUSH] Clearing all caches (15-min interval)');
      clearNewsCache();
      clearCommoditiesCache();
      clearEventsCache();
      clearAlertsCache();
      clearAnalyticsCache();
      clearTelegramCache();
      clearRocketStatsCache();
    }, 15 * 60 * 1000));

    req.on('close', () => {
      staggerTimers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    });
  });

}
