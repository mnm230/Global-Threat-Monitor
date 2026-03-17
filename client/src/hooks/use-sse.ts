import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SSEData, FeedFreshness } from '@/lib/dashboard-types';
import type { RedAlert } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

export function useSSE(): SSEData {
  const [news, setNews] = useState<SSEData['news']>([]);
  const [commodities, setCommodities] = useState<SSEData['commodities']>([]);
  const [events, setEvents] = useState<SSEData['events']>([]);
  const [flights, setFlights] = useState<SSEData['flights']>([]);
  const [ships, setShips] = useState<SSEData['ships']>([]);
  const [sirens, setSirens] = useState<SSEData['sirens']>([]);
  const [redAlerts, setRedAlerts] = useState<SSEData['redAlerts']>([]);
  const [telegramMessages, setTelegramMessages] = useState<SSEData['telegramMessages']>([]);
  const [thermalHotspots, setThermalHotspots] = useState<SSEData['thermalHotspots']>([]);
  const [breakingNews, setBreakingNews] = useState<SSEData['breakingNews']>([]);
  const [attackPrediction, setAttackPrediction] = useState<SSEData['attackPrediction']>(null);
  const [rocketStats, setRocketStats] = useState<SSEData['rocketStats']>(null);
  const [connected, setConnected] = useState(false);
  const feedFreshnessRef = useRef<FeedFreshness>({});
  const [feedFreshness, setFeedFreshness] = useState<FeedFreshness>({});
  const retryCount = useRef(0);
  const pending = useRef<Partial<Omit<SSEData, 'connected' | 'feedFreshness'>>>({});
  const rafId = useRef<number | null>(null);

  const markFresh = useCallback((feed: string) => {
    feedFreshnessRef.current[feed] = Date.now();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = feedFreshnessRef.current;
      setFeedFreshness(prev => {
        const keys = Object.keys(next);
        if (keys.length !== Object.keys(prev).length) return { ...next };
        for (const k of keys) { if (prev[k] !== next[k]) return { ...next }; }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const batch = pending.current;
      pending.current = {};
      if (Object.keys(batch).length === 0) return;
      if ('news' in batch) setNews(batch.news!);
      if ('commodities' in batch) setCommodities(batch.commodities!);
      if ('events' in batch) setEvents(batch.events!);
      if ('flights' in batch) setFlights(batch.flights!);
      if ('ships' in batch) setShips(batch.ships!);
      if ('sirens' in batch) setSirens(batch.sirens!);
      if ('redAlerts' in batch) setRedAlerts(batch.redAlerts!);
      if ('telegramMessages' in batch) setTelegramMessages(batch.telegramMessages!);
      if ('thermalHotspots' in batch) setThermalHotspots(batch.thermalHotspots!);
      if ('breakingNews' in batch) setBreakingNews(batch.breakingNews!);
      if ('attackPrediction' in batch) setAttackPrediction(batch.attackPrediction!);
      if ('rocketStats' in batch) setRocketStats(batch.rocketStats!);
    });
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      es = new EventSource('/api/stream');

      es.onopen = () => {
        setConnected(true);
        retryCount.current = 0;
      };

      es.addEventListener('commodities', (e) => {
        try { pending.current.commodities = JSON.parse(e.data); markFresh('markets'); scheduleFlush(); } catch {}
      });
      es.addEventListener('events', (e) => {
        try {
          const d = JSON.parse(e.data);
          pending.current.events = d.events || [];
          pending.current.flights = d.flights || [];
          pending.current.ships = d.ships || [];
          markFresh('events'); markFresh('livefeed'); markFresh('ships');
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('news', (e) => {
        try { pending.current.news = JSON.parse(e.data); markFresh('osint'); scheduleFlush(); } catch {}
      });
      es.addEventListener('sirens', (e) => {
        try { pending.current.sirens = JSON.parse(e.data); markFresh('sirens'); scheduleFlush(); } catch {}
      });
      es.addEventListener('red-alerts', (e) => {
        try {
          const raw = JSON.parse(e.data);
          const seen = new Set<string>();
          pending.current.redAlerts = (raw as RedAlert[]).filter(a => seen.has(a.id) ? false : (seen.add(a.id), true));
          markFresh('alerts'); markFresh('alertmap');
          scheduleFlush();
        } catch {}
      });
      es.addEventListener('telegram', (e) => {
        try { pending.current.telegramMessages = JSON.parse(e.data); markFresh('telegram'); scheduleFlush(); } catch {}
      });
      es.addEventListener('thermal', (e) => {
        try { pending.current.thermalHotspots = JSON.parse(e.data); markFresh('thermal'); scheduleFlush(); } catch {}
      });
      es.addEventListener('breaking-news', (e) => {
        try { pending.current.breakingNews = JSON.parse(e.data); markFresh('breaking'); scheduleFlush(); } catch {}
      });
      es.addEventListener('analytics', (e) => {
        try { queryClient.setQueryData(['/api/analytics'], (old: Record<string, unknown> | undefined) => ({ ...old, ...JSON.parse(e.data) })); markFresh('analytics'); } catch {}
      });
      es.addEventListener('attack-prediction', (e) => {
        try { pending.current.attackPrediction = JSON.parse(e.data); markFresh('attackpred'); markFresh('aiprediction'); scheduleFlush(); } catch {}
      });
      es.addEventListener('rocket-stats', (e) => {
        try { pending.current.rocketStats = JSON.parse(e.data); markFresh('rocketstats'); scheduleFlush(); } catch {}
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        // Always retry — exponential backoff capped at 30s (never give up)
        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        retryCount.current++;
        retryTimeout = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [scheduleFlush]);

  return useMemo(() => ({
    news, commodities, events, flights, ships,
    sirens, redAlerts, telegramMessages,
    thermalHotspots, breakingNews,
    attackPrediction, rocketStats,
    connected, feedFreshness,
  }), [news, commodities, events, flights, ships, sirens, redAlerts, telegramMessages, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected, feedFreshness]);
}
