import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { LayoutItem as GridItemLayout, Layout as GridLayout2 } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useLanguage } from '@/components/theme-provider';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type {
  NewsItem,
  CommodityData,
  ConflictEvent,
  FlightData,
  ShipData,
  TelegramMessage,
  SirenAlert,
  RedAlert,

  ThermalHotspot,
  BreakingNewsItem,
  Sitrep,
  SitrepWindow,
  RocketStats,
  RocketCorridor,
} from '@shared/schema';
import {
  Radio,
  Ship,
  Plane,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Languages,
  Newspaper,
  Send,
  Crosshair,
  Anchor,
  BarChart3,
  Target,
  Activity,
  Globe,
  Siren,
  ShieldAlert,
  MapPin,
  Timer,
  AlertOctagon,
  Shield,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  PanelLeft,
  Brain,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  Zap,
  Loader2,
  Plus,
  Trash2,
  Hash,
  Bell,
  BellOff,
  FileDown,
  StickyNote,
  Eye,
  Star,
  Link2,
  History,
  Save,
  Layout,
  Search,
  Settings,
  TriangleAlert,
  Menu,
  Video,
  MoreHorizontal,
  Rocket,
  ArrowRight,
  Flame,
  Download,
  GripVertical,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { ScrollShadow } from '@/components/shared/scroll-shadow';
import { headingToCompass, timeAgo, getThreatLevel, sendNotification, generateExportReport } from '@/lib/dashboard-utils';
import { AnimatedPanel } from '@/components/shared/animated-panel';
import { FeedFreshnessContext, PanelHeader, PanelMinimizeButton, PanelMaximizeButton, FreshnessBadge } from '@/components/panels/panel-chrome';
const AnalyticsPanel = lazy(() => import('@/components/panels/analytics-panel').then(m => ({ default: m.AnalyticsPanel })));
import { TelegramPanel } from '@/components/panels/telegram-panel';
const AIPredictionPanel = lazy(() => import('@/components/panels/ai-prediction-panel').then(m => ({ default: m.AIPredictionPanel })));
import { RocketStatsPanel } from '@/components/panels/rocket-stats-panel';
import { RedAlertPanel } from '@/components/panels/red-alert-panel';
import { AttackPredictorPanel } from '@/components/panels/attack-predictor-panel';
import { RegionalAttacksPanel } from '@/components/panels/regional-attacks-panel';
import { LiveFeedPanel } from '@/components/panels/live-feed-panel';
import { CommoditiesPanel } from '@/components/panels/commodities-panel';
import { SirensPanel } from '@/components/panels/sirens-panel';
import { FlightRadarPanel } from '@/components/panels/flight-radar-panel';
import { ConflictEventsPanel } from '@/components/panels/conflict-events-panel';
import { MaritimePanel } from '@/components/panels/maritime-panel';

import {
  type WARROOMSettings,
  type PanelId,
  type LayoutPreset,
  DEFAULT_SETTINGS,
  loadSettings,
  PANEL_CONFIG,
  PANEL_ACCENTS,
  DEFAULT_GRID_LAYOUT,
  BUILT_IN_PRESETS,
  SWIPE_TABS,
  isTouchDevice,
} from '@/lib/dashboard-types';
import { useSSE } from '@/hooks/use-sse';
import { useAlertSound } from '@/hooks/use-alert-sound';
import { useDesktopNotifications } from '@/hooks/use-notifications';
import { useAnomalyDetection } from '@/hooks/use-anomaly-detection';
import { useEscalation } from '@/hooks/use-escalation';
import { useCorrelations } from '@/hooks/use-correlations';
import { useFloatingPanels } from '@/hooks/use-floating-panels';

import { PanelErrorBoundary } from '@/components/panel-error-boundary';
import { ResizeHandle } from '@/components/resize-handle';
import { LiveClock } from '@/components/live-clock';
import { EscalationBanner } from '@/components/escalation-banner';
import { EventTimeline } from '@/components/event-timeline';
import { NewsTicker } from '@/components/news-ticker';
import { SirenBanner } from '@/components/siren-banner';
import { FloatingWindow } from '@/components/floating-window';
import { PanelSidebar } from '@/components/panel-sidebar';
import { OsintTimelinePanel } from '@/components/osint-timeline-panel';
import { AlertMapPanel } from '@/components/alert-map-panel';
import { LiveFlightTracker } from '@/components/live-flight-tracker';

import { NotesOverlay } from '@/components/overlays/notes-overlay';
import { WatchlistOverlay } from '@/components/overlays/watchlist-overlay';
import { AlertHistoryOverlay } from '@/components/overlays/alert-history-overlay';
import { SettingsOverlay } from '@/components/overlays/settings-overlay';
import { LayoutPresetsDropdown } from '@/components/overlays/layout-presets-dropdown';

const RGL = WidthProvider(GridLayout);

export default function Dashboard() {
  const { language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<WARROOMSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return w >= 768 && (isTouch ? w < 1400 : w < 1200);
  });
  const [isLandscape, setIsLandscape] = useState(() => typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelId>('alerts');
  const [showMobilePanelPicker, setShowMobilePanelPicker] = useState(false);
  const swipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  const panelWrapperRef = useRef<HTMLDivElement>(null);
  const panelsScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        setIsMobile(w < 768);
        // Tablet: touch devices up to 1400px (catches iPad Pro 12.9" landscape), or non-touch small screens up to 1200px
        setIsTablet(w >= 768 && (isTouch ? w < 1400 : w < 1200));
        setIsLandscape(w > h);
      });
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 100));
    return () => {
      window.removeEventListener('resize', check);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const scrollStateRef = useRef({ showDown: false, showTop: false });
  // Shared physics scroll controller — buttons and wheel use the same engine
  const physicsScrollRef = useRef<{ scrollBy: (delta: number) => void; scrollTo: (y: number) => void }>({
    scrollBy: () => {}, scrollTo: () => {},
  });
  useEffect(() => {
    const el = panelsScrollRef.current;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 40;
        const shouldShowDown = !atBottom && scrollHeight > clientHeight + 40;
        const shouldShowTop = scrollTop > 80;
        if (shouldShowDown !== scrollStateRef.current.showDown) {
          scrollStateRef.current.showDown = shouldShowDown;
          setShowScrollDown(shouldShowDown);
        }
        if (shouldShowTop !== scrollStateRef.current.showTop) {
          scrollStateRef.current.showTop = shouldShowTop;
          setShowScrollTop(shouldShowTop);
        }
      });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (rafId) cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) return;
    const container = panelsScrollRef.current;
    if (!container) return;

    let targetY = container.scrollTop;
    let velocity = 0;
    let lastTime = 0;
    let raf: number | null = null;

    const SPRING = 0.14;    // how fast it catches up (higher = snappier)
    const DAMPING = 0.80;   // momentum decay per frame (higher = more glide)
    const MIN_DELTA = 0.4;  // stop threshold in pixels

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      const gap = targetY - container.scrollTop;
      velocity = velocity * Math.pow(DAMPING, dt) + gap * SPRING * dt;
      const next = container.scrollTop + velocity;
      const max = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.max(0, Math.min(max, next));
      if (Math.abs(gap) < MIN_DELTA && Math.abs(velocity) < MIN_DELTA) {
        container.scrollTop = Math.max(0, Math.min(max, targetY));
        velocity = 0;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (!raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    // Expose to scroll buttons via ref (native wheel scroll is used; physics only for button clicks)
    physicsScrollRef.current = {
      scrollBy: (delta: number) => {
        if (!raf) { targetY = container.scrollTop; velocity = 0; }
        const max = container.scrollHeight - container.clientHeight;
        targetY = Math.max(0, Math.min(max, targetY + delta));
        startAnimation();
      },
      scrollTo: (y: number) => {
        if (!raf) { targetY = container.scrollTop; velocity = 0; }
        const max = container.scrollHeight - container.clientHeight;
        targetY = Math.max(0, Math.min(max, y));
        velocity = (targetY - container.scrollTop) * 0.08;
        startAnimation();
      },
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      physicsScrollRef.current = { scrollBy: () => {}, scrollTo: () => {} };
    };
  }, [isMobile, isTablet]);




  const defaultVisible: Record<PanelId, boolean> = { telegram: true, events: true, alerts: true, regional: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: true, attackpred: true, rocketstats: true, aiprediction: true };
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
      if (saved.visiblePanels) return { ...defaultVisible, ...saved.visiblePanels };
    } catch {}
    return defaultVisible;
  });
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return localStorage.getItem('warroom_notif_enabled') !== 'false';
    }
    return false;
  });
  const [showNotes, setShowNotes] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showLayoutPresets, setShowLayoutPresets] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<PanelId>('alerts');
  const [savedPresets, setSavedPresets] = useState<LayoutPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_layouts') || '[]');
      return [...BUILT_IN_PRESETS, ...saved];
    } catch { return [...BUILT_IN_PRESETS]; }
  });
  const [gridLayout, setGridLayout] = useState<GridItemLayout[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_grid_layout_v9') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        const defaults = new Map(DEFAULT_GRID_LAYOUT.map(d => [d.i, d]));
        const merged = saved.map((item: GridItemLayout) => {
          const def = defaults.get(item.i);
          if (def) return { ...item, minW: def.minW, minH: def.minH };
          return item;
        });
        // Add any new panels from DEFAULT_GRID_LAYOUT not present in saved layout
        const savedIds = new Set(saved.map((item: GridItemLayout) => item.i));
        for (const def of DEFAULT_GRID_LAYOUT) {
          if (!savedIds.has(def.i)) merged.push(def);
        }
        return merged;
      }
    } catch {}
    return DEFAULT_GRID_LAYOUT;
  });

  const compactedVisibleLayout = useMemo(() => {
    const filtered = gridLayout.filter(item => visiblePanels[item.i as PanelId]);
    const sorted = [...filtered].sort((a, b) => a.y - b.y || a.x - b.x);
    const cols = 12;
    const colHeights = new Array(cols).fill(0);
    return sorted.map(item => {
      let minY = 0;
      for (let c = item.x; c < Math.min(item.x + item.w, cols); c++) {
        minY = Math.max(minY, colHeights[c]);
      }
      const compacted = { ...item, y: minY };
      for (let c = compacted.x; c < Math.min(compacted.x + compacted.w, cols); c++) {
        colHeights[c] = compacted.y + compacted.h;
      }
      return compacted;
    });
  }, [gridLayout, visiblePanels]);

  const sse = useSSE();
  const { news, commodities, events, flights, ships, sirens, redAlerts, telegramMessages, thermalHotspots, breakingNews, attackPrediction, rocketStats, connected, feedFreshness } = sse;

  const [mapFocusLocation, setMapFocusLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [popupTrackFlight, setPopupTrackFlight] = useState<{ callsign: string; lat: number; lng: number; heading: number; altitude: number; speed: number; type: string; source: 'radar' } | null>(null);

  const anomalies = useAnomalyDetection(redAlerts, sirens, flights, commodities, telegramMessages);
  const [escalationDismissed, setEscalationDismissed] = useState(false);
  const escalation = useEscalation(redAlerts, soundEnabled, notificationsEnabled);
  // Auto-reset dismissed state when escalation level rises
  useEffect(() => { setEscalationDismissed(false); }, [escalation.level]);

  const panelPersistTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleGridLayoutChange = useCallback((newLayout: GridLayout2) => {
    setGridLayout(prev => {
      const updated = new Map(prev.map(item => [item.i, item]));
      for (const item of newLayout) {
        updated.set(item.i, item as GridItemLayout);
      }
      const merged = Array.from(updated.values());
      try { localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  const closePanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: false }));
    if (maximizedPanel === id) setMaximizedPanel(null);
  }, [maximizedPanel]);

  const openPanel = useCallback((id: PanelId) => {
    setVisiblePanels(prev => ({ ...prev, [id]: true }));
  }, []);

  const toggleMaximize = useCallback((id: PanelId) => {
    setMaximizedPanel(prev => prev === id ? null : id);
  }, []);

  const { floatingPanels, draggingFloatId, setDraggingFloatId, dockZoneRef, popOutPanel, dockPanel, closeFloatPanel, focusFloatPanel } = useFloatingPanels(closePanel);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedPanel) setMaximizedPanel(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [maximizedPanel]);

  const toggleNotifications = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked by your browser.\nTo enable: click the lock icon in the address bar → Notifications → Allow.');
      return;
    }
    if (!notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('warroom_notif_enabled', 'true');
          sendNotification('🔔 WARROOM Notifications Active', 'You will receive alerts for red alerts, sirens, and breaking news.', 'warroom-init');
        }
      });
    } else {
      setNotificationsEnabled(prev => {
        localStorage.setItem('warroom_notif_enabled', String(!prev));
        return !prev;
      });
    }
  }, [notificationsEnabled]);

  const closedPanels = useMemo(() =>
    (Object.keys(visiblePanels) as PanelId[]).filter(k => !visiblePanels[k]),
    [visiblePanels]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, locked: false };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    swipeRef.current = null;
    const threshold = Math.min(60, window.innerWidth * 0.15);
    if (Math.abs(dx) < threshold) return;
    const idx = SWIPE_TABS.indexOf(mobileActivePanel);
    const base = idx === -1 ? 0 : idx;
    if (dx < 0) {
      setMobileActivePanel(SWIPE_TABS[(base + 1) % SWIPE_TABS.length]);
    } else {
      setMobileActivePanel(SWIPE_TABS[(base - 1 + SWIPE_TABS.length) % SWIPE_TABS.length]);
    }
    setShowMobilePanelPicker(false);
  }, [mobileActivePanel]);

  useEffect(() => {
    const el = panelWrapperRef.current;
    if (!el || !isMobile) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!swipeRef.current || swipeRef.current.locked) return;
      const dx = Math.abs(e.touches[0].clientX - swipeRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - swipeRef.current.y);
      if (dx > dy && dx > 8) {
        swipeRef.current.locked = true;
        e.preventDefault();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [isMobile]);

  const alertSoundData = useMemo(() => redAlerts.map(a => ({ id: a.id, threatType: a.threatType })), [redAlerts]);
  const sirenSoundData = useMemo(() => sirens.map(s => ({ id: s.id, threatType: s.threatType })), [sirens]);
  useAlertSound(alertSoundData, soundEnabled, settings.silentMode, settings.volume);
  useAlertSound(sirenSoundData, soundEnabled, settings.silentMode, settings.volume);
  useDesktopNotifications(redAlerts, sirens, news, notificationsEnabled, settings.notificationLevel);

  const threatLevel = useMemo(() => getThreatLevel(redAlerts.length, sirens.length, settings, redAlerts), [redAlerts, sirens.length, settings]);
  const correlations = useCorrelations(events, redAlerts, sirens, flights);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });

  const topRow: PanelId[] = ['telegram', 'alertmap', 'alerts', 'regional', 'livefeed'];
  const bottomRow: PanelId[] = ['events', 'markets', 'analytics', 'osint', 'attackpred', 'rocketstats', 'aiprediction'];
  const allPanels: PanelId[] = [...topRow, ...bottomRow];
  const activeTop = topRow.filter(id => visiblePanels[id]);
  const activeBottom = bottomRow.filter(id => visiblePanels[id]);
  const panelCount = activeTop.length + activeBottom.length;

  const [readyPanels, setReadyPanels] = useState<Set<PanelId>>(() => new Set(topRow));
  useEffect(() => {
    if (isMobile || isTablet) {
      setReadyPanels(new Set(allPanels));
      return;
    }
    setReadyPanels(new Set(topRow));
    const batches: PanelId[][] = [
      ['events', 'markets', 'aiprediction'],
      ['analytics', 'osint'],
      ['attackpred', 'rocketstats', 'livefeed'],
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    batches.forEach((batch, i) => {
      timers.push(setTimeout(() => {
        setReadyPanels(prev => {
          const next = new Set(prev);
          batch.forEach(id => next.add(id));
          return next;
        });
      }, (i + 1) * 400));
    });
    return () => timers.forEach(clearTimeout);
  }, [isMobile, isTablet]);

  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidths: Record<PanelId, number> = {
    telegram: 16, alertmap: 36, alerts: 16, regional: 16, livefeed: 16,
    events: 22, markets: 28,
    analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28,
  };
  const [colWidths, setColWidths] = useState<Record<PanelId, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
      if (saved.colWidths) return { ...defaultWidths, ...saved.colWidths };
    } catch {}
    return defaultWidths;
  });
  const [rowSplit, setRowSplit] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warroom_panel_state_v2') || '{}');
      if (saved.rowSplit) return saved.rowSplit;
    } catch {}
    return 58;
  });

  useEffect(() => {
    if (panelPersistTimeout.current) clearTimeout(panelPersistTimeout.current);
    panelPersistTimeout.current = setTimeout(() => {
      try { localStorage.setItem('warroom_panel_state_v2', JSON.stringify({ visiblePanels, colWidths, rowSplit })); } catch {}
    }, 500);
  }, [visiblePanels, colWidths, rowSplit]);

  const savePreset = useCallback((name: string) => {
    const preset: LayoutPreset = { name, visiblePanels: { ...visiblePanels }, colWidths: { ...colWidths }, rowSplit, gridLayout: [...gridLayout] };
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    customPresets.push(preset);
    try { localStorage.setItem('warroom_layouts', JSON.stringify(customPresets)); } catch {}
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [visiblePanels, colWidths, rowSplit, gridLayout, savedPresets]);

  const loadPreset = useCallback((preset: LayoutPreset) => {
    setVisiblePanels(preset.visiblePanels);
    setColWidths(preset.colWidths);
    setRowSplit(preset.rowSplit);
    if (preset.gridLayout && preset.gridLayout.length > 0) {
      setGridLayout(preset.gridLayout);
      try { localStorage.setItem('warroom_grid_layout_v9', JSON.stringify(preset.gridLayout)); } catch {}
    }
    setMaximizedPanel(null);
  }, []);

  const deletePreset = useCallback((name: string) => {
    const customPresets = savedPresets.filter(p => !BUILT_IN_PRESETS.find(b => b.name === p.name) && p.name !== name);
    try { localStorage.setItem('warroom_layouts', JSON.stringify(customPresets)); } catch {}
    setSavedPresets([...BUILT_IN_PRESETS, ...customPresets]);
  }, [savedPresets]);

  const handleExport = useCallback(() => {
    const html = generateExportReport(events, flights, ships, redAlerts, sirens, commodities, threatLevel, language);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `warroom-report-${new Date().toISOString().slice(0, 16).replace(':', '')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [events, flights, ships, redAlerts, sirens, commodities, threatLevel, language]);

  const computeWidths = useCallback((panels: PanelId[]) => {
    const raw = panels.map(id => colWidths[id]);
    const total = raw.reduce((s, w) => s + w, 0);
    return raw.map(w => (w / total) * 100);
  }, [colWidths]);

  const activeTopWidths = useMemo(() => computeWidths(activeTop), [activeTop, computeWidths]);
  const activeBottomWidths = useMemo(() => computeWidths(activeBottom), [activeBottom, computeWidths]);

  const makeRowResizer = useCallback((row: PanelId[], leftIdx: number) => (delta: number) => {
    if (!containerRef.current || leftIdx >= row.length - 1) return;
    const totalWidth = containerRef.current.offsetWidth;
    const pctDelta = (delta / totalWidth) * 100;
    const leftId = row[leftIdx];
    const rightId = row[leftIdx + 1];
    setColWidths(prev => {
      const totalActive = row.reduce((s, id) => s + prev[id], 0);
      const leftPct = (prev[leftId] / totalActive) * 100;
      const rightPct = (prev[rightId] / totalActive) * 100;
      const newLeft = leftPct + pctDelta;
      const newRight = rightPct - pctDelta;
      if (newLeft < 8 || newRight < 8) return prev;
      return { ...prev, [leftId]: (newLeft / 100) * totalActive, [rightId]: (newRight / 100) * totalActive };
    });
  }, []);

  const makeVerticalResizer = useCallback(() => (delta: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.offsetHeight;
    const pctDelta = (delta / totalHeight) * 100;
    setRowSplit(prev => {
      const next = prev + pctDelta;
      if (next < 30 || next > 80) return prev;
      return next;
    });
  }, []);

  const renderPanel = (id: PanelId) => {
    const close = isMobile ? undefined : () => closePanel(id);
    const maximize = isMobile ? undefined : () => toggleMaximize(id);
    const isMax = isMobile ? false : maximizedPanel === id;
    const panel = (() => {
      switch (id) {
        case 'aiprediction':
          return <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}><AIPredictionPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} alerts={redAlerts} sirens={sirens} flights={flights} telegramMessages={telegramMessages} events={events} commodities={commodities} ships={ships} thermalHotspots={thermalHotspots} /></Suspense>;
        case 'events':
          return <ConflictEventsPanel events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alerts':
          return <RedAlertPanel alerts={redAlerts.filter(a => !a.country || a.country === 'Israel')} sirens={sirens} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} onShowHistory={() => setShowAlertHistory(true)} />;
        case 'regional':
          return <RegionalAttacksPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;

        case 'telegram':
          return <TelegramPanel messages={telegramMessages} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} soundEnabled={soundEnabled} silentMode={settings.silentMode} volume={settings.volume} />;
        case 'markets':
          return <CommoditiesPanel commodities={commodities} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'livefeed':
          return <LiveFeedPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'alertmap':
          return <AlertMapPanel alerts={redAlerts} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'analytics':
          return <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}><AnalyticsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} /></Suspense>;
        case 'osint':
          return <OsintTimelinePanel alerts={redAlerts} messages={telegramMessages} events={events} language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} />;
        case 'attackpred':
          return <AttackPredictorPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} prediction={attackPrediction} />;
        case 'rocketstats':
          return <RocketStatsPanel language={language} onClose={close} onMaximize={maximize} isMaximized={isMax} stats={rocketStats} />;
      }
    })();
    return panel ?? null;
  };

  return (<FeedFreshnessContext.Provider value={feedFreshness}>
    <div className={`flex flex-col bg-background text-foreground h-screen ${isMobile || isTablet ? '!h-[100dvh]' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: (isMobile || isTablet) && isLandscape ? 'env(safe-area-inset-left, 0px)' : undefined, paddingRight: (isMobile || isTablet) && isLandscape ? 'env(safe-area-inset-right, 0px)' : undefined }} data-testid="dashboard">
      <header className={`${isMobile ? (isLandscape ? 'h-8' : 'h-9') : isTouchDevice ? 'min-h-[40px]' : 'h-9'} border-b flex items-center justify-between px-2 md:px-3 shrink-0 relative z-50 warroom-header bg-card`}>
        {/* Left — Branding */}
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 hidden sm:flex bg-primary/10 border border-primary/20">
              <span className="text-primary text-[10px]">&#x25C8;</span>
            </div>
            <span className={`${isMobile ? 'text-[12px]' : 'text-[13px]'} font-bold tracking-[.08em] uppercase text-foreground select-none whitespace-nowrap font-mono`}>
              Warroom
            </span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-px rounded bg-red-500/8 border border-red-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-[9px] text-red-500 font-bold font-mono uppercase tracking-wider">Live</span>
          </div>
          {(isMobile || isTablet) && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge">
              <ShieldAlert className={`w-3 h-3 ${threatLevel.color}`} />
              <span className={`text-[11px] font-semibold ${threatLevel.color}`}>{threatLevel.level}</span>
            </div>
          )}
        </div>
        {/* Center — Key status (desktop only) */}
        {!isMobile && !isTablet && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${threatLevel.bg}`} role="status" aria-live="polite" data-testid="threat-level-badge">
              <ShieldAlert className={`w-3 h-3 ${threatLevel.color}`} />
              <span className={`text-[10px] font-bold font-mono ${threatLevel.color}`}>{threatLevel.level}</span>
            </div>
            {redAlerts.length > 0 && (
              <>
                <div className="w-px h-3.5 bg-border" />
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/8 border border-red-500/20">
                  <span className="text-[10px] font-bold text-red-500 font-mono">{redAlerts.length}</span>
                  <span className="text-[9px] text-red-400 font-mono">ALR</span>
                </div>
              </>
            )}
            <div className="w-px h-3.5 bg-border" />
            <LiveClock />
          </div>
        )}
        <div className="flex items-center gap-2">
          {(isMobile || isTablet) && <div className="flex items-center"><LiveClock /></div>}
          {isMobile || isTablet ? (
            <div className="warroom-mobile-menu-anchor">
              <button
                onClick={() => setShowMobileMenu(p => !p)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground active:bg-white/[0.06] transition-colors"
                aria-label="Open menu"
                data-testid="button-mobile-menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <a
                href="/ember"
                className="px-2 h-7 rounded text-[11px] font-mono font-bold text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] transition-all duration-150 inline-flex items-center gap-1"
                title="Compact Ember View"
              >
                EMBER
              </a>
              <div className="w-px h-3.5 bg-border mx-0.5" />
              <Button
                size="sm" variant="ghost"
                className={`px-2 h-7 rounded text-[11px] transition-all duration-150
                  ${typeof Notification !== 'undefined' && Notification.permission === 'denied'
                    ? 'text-red-500/70 hover:text-red-400'
                    : notificationsEnabled
                      ? 'text-primary hover:text-primary/80'
                      : 'text-foreground/30 hover:text-foreground/80'}
                  hover:bg-muted/40 active:bg-muted/60`}
                onClick={toggleNotifications}
                data-testid="button-notifications-toggle"
                title={
                  typeof Notification !== 'undefined' && Notification.permission === 'denied'
                    ? 'Notifications blocked — click for instructions'
                    : notificationsEnabled ? 'Notifications ON — click to disable' : 'Enable desktop notifications'
                }
              >
                {typeof Notification !== 'undefined' && Notification.permission === 'denied'
                  ? <BellOff className="w-3.5 h-3.5" />
                  : notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </Button>
              {notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                <Button
                  size="sm" variant="ghost"
                  className="px-1.5 h-7 rounded text-[9px] font-mono font-bold text-foreground/25 hover:text-primary hover:bg-primary/10 transition-all duration-150 tracking-widest"
                  title="Fire a test notification for each type"
                  data-testid="button-test-notification"
                  onClick={() => {
                    sendNotification('🚨 RED ALERT — Tel Aviv', 'MISSILE LAUNCH · Dan Region, Israel', 'test-alert', true);
                    setTimeout(() => sendNotification('🔊 SIREN — Haifa', 'ROCKET FIRE · Northern District', 'test-siren', false), 1500);
                    setTimeout(() => sendNotification('📰 BREAKING — Reuters', 'Test: live news notifications are working', 'test-news', false), 3000);
                  }}
                >
                  TEST
                </Button>
              )}
              <Button size="sm" variant="ghost" className={`px-2 h-7 rounded text-[11px] ${soundEnabled ? 'text-primary' : 'text-foreground/30'} hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150`} onClick={() => setSoundEnabled(p => !p)} data-testid="button-sound-toggle" aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] active:bg-amber-500/15 transition-all duration-150" onClick={() => setShowNotes(true)} data-testid="button-notes" aria-label="Analyst Notes" title="Analyst Notes">
                <StickyNote className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-amber-400 hover:bg-amber-500/[0.08] active:bg-amber-500/15 transition-all duration-150" onClick={() => setShowWatchlist(true)} data-testid="button-watchlist" aria-label="Watchlist" title="Watchlist">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <div className="relative">
                <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-primary hover:bg-primary/[0.08] active:bg-primary/15 transition-all duration-150" onClick={() => setShowLayoutPresets(p => !p)} data-testid="button-layouts" aria-label="Layout Presets" title="Layout Presets">
                  <Layout className="w-3.5 h-3.5" />
                </Button>
                {showLayoutPresets && (
                  <LayoutPresetsDropdown language={language} presets={savedPresets} onLoad={loadPreset} onSave={savePreset} onDelete={deletePreset} onClose={() => setShowLayoutPresets(false)} />
                )}
              </div>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/[0.08] active:bg-emerald-500/15 transition-all duration-150" onClick={handleExport} data-testid="button-export" aria-label="Export Report" title="Export Report">
                <FileDown className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/30 hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150" onClick={() => setShowSettings(true)} data-testid="button-settings" aria-label="Settings" title="Settings">
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="px-2 h-7 rounded text-foreground/35 hover:text-foreground/80 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150 font-mono text-[10px]" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} data-testid="button-language-toggle" aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
                <Languages className="w-3.5 h-3.5 mr-0.5" />
                {language === 'en' ? '\u0639\u0631\u0628\u064A' : 'EN'}
              </Button>
            </div>
          )}
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${connected ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-red-500/10 border-red-500/25'}`} role="status" aria-label={connected ? 'Connected to server' : 'Disconnected'} title={connected ? 'Stream connected' : 'Stream disconnected'}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-500'}`} />
            <span className={`text-[11px] font-medium hidden sm:inline ${connected ? 'text-emerald-500' : 'text-red-500'}`}>
              {connected ? (language === 'en' ? 'Online' : '\u0645\u062A\u0635\u0644') : (language === 'en' ? 'Offline' : '\u0645\u0646\u0642\u0637\u0639')}
            </span>
          </div>
        </div>
      </header>
      {!escalationDismissed && <EscalationBanner state={escalation} onDismiss={() => setEscalationDismissed(true)} />}

      <div className="flex flex-1 min-h-0">
        {!isMobile && !isTablet && (
          <PanelSidebar
            visiblePanels={visiblePanels}
            openPanel={openPanel}
            closePanel={closePanel}
            language={language}
            panelStats={{
              alerts: redAlerts.filter(a => !a.country || a.country === 'Israel').length > 0 ? `${redAlerts.filter(a => !a.country || a.country === 'Israel').length} IL` : '',
              regional: 'LIVE',
              telegram: telegramMessages.length > 0 ? `${telegramMessages.length}` : '',
              livefeed: '',
              events: events.length > 0 ? `${events.length}` : '',
              markets: commodities.length > 0 ? `${commodities.length}` : '',
              alertmap: redAlerts.length > 0 ? `${redAlerts.length}` : '',
              analytics: '',
            }}
          />
        )}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">

      {showMobileMenu && (isMobile || isTablet) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-2 top-full z-50 mt-1 rounded-xl border border-border bg-card shadow-lg min-w-[180px]" data-testid="mobile-menu">
            <div className="p-1.5 flex flex-col gap-0.5">
              {[
                { id: 'notif', icon: Bell, label: notificationsEnabled ? 'Notif ON' : 'Notif OFF', action: () => { toggleNotifications(); setShowMobileMenu(false); }, active: notificationsEnabled },
                { id: 'sound', icon: soundEnabled ? Volume2 : VolumeX, label: soundEnabled ? 'Sound ON' : 'Sound OFF', action: () => { setSoundEnabled((p: boolean) => !p); setShowMobileMenu(false); }, active: soundEnabled },
                { id: 'notes', icon: StickyNote, label: language === 'ar' ? 'ملاحظات' : 'Notes', action: () => { setShowNotes(true); setShowMobileMenu(false); } },
                { id: 'watchlist', icon: Eye, label: language === 'ar' ? 'مراقبة' : 'Watchlist', action: () => { setShowWatchlist(true); setShowMobileMenu(false); } },
                { id: 'export', icon: FileDown, label: language === 'ar' ? 'تصدير' : 'Export', action: () => { handleExport(); setShowMobileMenu(false); } },
                { id: 'settings', icon: Settings, label: language === 'ar' ? 'إعدادات' : 'Settings', action: () => { setShowSettings(true); setShowMobileMenu(false); } },
                { id: 'ember', icon: Globe, label: 'Ember View', action: () => { window.location.href = '/ember'; } },
                { id: 'language', icon: Languages, label: language === 'en' ? 'عربي' : 'English', action: () => { setLanguage(language === 'en' ? 'ar' : 'en'); setShowMobileMenu(false); } },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    data-testid={`mobile-menu-${item.id}`}
                    className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-lg text-[11px] font-medium transition-colors active:bg-white/[0.08] min-h-[48px] ${item.active ? 'text-primary' : 'text-foreground/60 hover:text-foreground/80'}`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border px-3 py-2">
              <div className="flex items-center gap-2 text-[8px] font-mono text-foreground/20">
                <span>SRC {[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, redAlerts.length > 0 || sirens.length > 0].filter(Boolean).length}</span>
                <span>·</span>
                <span>EVT {events.length}</span>
                <span className="ml-auto"><LiveClock /></span>
              </div>
            </div>
          </div>
        </>
      )}

      {isMobile && redAlerts.length > 0 && (
        <div className="warroom-mobile-mini-ticker shrink-0" data-testid="mobile-mini-ticker">
          {redAlerts.length > 0 && (
            <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-red-400/70">{redAlerts.length} ALERTS</span>
            </div>
          )}
        </div>
      )}

      <SirenBanner sirens={sirens} breakingNews={breakingNews} language={language} hidden={!!maximizedPanel} />

      <div
        ref={panelsScrollRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0, overscrollBehavior: 'contain' }}
        data-testid="resizable-panels"
      >
        {isMobile ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Outer touch container — stable ref for swipe detection */}
            <div
              ref={panelWrapperRef}
              className="relative flex-1 min-h-0 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* All SWIPE_TABS panels always mounted — prevents unmount/remount flicker on tab switch */}
              {(SWIPE_TABS).map(id => (
                <div key={id} className={`absolute inset-0 flex flex-col ${mobileActivePanel === id ? 'z-10' : 'z-0 mobile-panel-hidden'}`}>
                  {renderPanel(id)}
                </div>
              ))}
              {!(['alertmap', 'alerts', 'regional', 'telegram', 'events'] as PanelId[]).includes(mobileActivePanel) && (
                <AnimatedPanel animKey={mobileActivePanel} className="absolute inset-0 flex flex-col z-10">
                  {renderPanel(mobileActivePanel)}
                </AnimatedPanel>
              )}
            </div>
            {/* Swipe dots — hidden when alerts panel is full-screen */}
            {mobileActivePanel !== 'alerts' && (
              <div className="warroom-mobile-swipe-dots shrink-0" data-testid="mobile-swipe-dots">
                {SWIPE_TABS.map(id => (
                  <button
                    key={id}
                    className="flex items-center justify-center p-2"
                    style={{ touchAction: 'manipulation', minWidth: 32, minHeight: 32 }}
                    onClick={() => setMobileActivePanel(id)}
                    aria-label={`Switch to ${PANEL_CONFIG[id]?.label || id}`}
                    data-testid={`swipe-dot-${id}`}
                  >
                    <span className={`dot ${mobileActivePanel === id ? 'active' : ''}`} style={{ pointerEvents: 'none' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Tab bar — hidden when alerts panel is full-screen; replaced by floating nav */}
            {mobileActivePanel !== 'alerts' ? (
              <div className="shrink-0 border-t border-border flex items-center warroom-mobile-tabs" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }} data-testid="mobile-tab-bar">
                {(SWIPE_TABS).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const isActive = mobileActivePanel === id;
                  const hasAlert = id === 'alerts' && redAlerts.length > 0;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isRegional = id === 'regional';
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex-1 min-w-[44px] min-h-[56px] py-1.5 flex flex-col items-center gap-1 transition-all relative ${isActive ? (isRegional ? 'text-emerald-400' : 'text-primary') : 'text-foreground/30 active:text-foreground/60'} ${hasAlert && !isActive ? 'text-red-400' : ''}`}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      data-testid={`mobile-tab-${id}`}
                    >
                      {isActive && <div className={`absolute top-0 left-1 right-1 h-[2px] rounded-b ${isRegional ? 'bg-emerald-500' : 'bg-primary'}`} />}
                      <Icon className={`w-[18px] h-[18px] transition-transform ${isActive ? 'scale-105' : ''}`} />
                      <span className={`text-[8px] font-medium transition-colors leading-tight text-center ${isActive ? (isRegional ? 'text-emerald-400' : 'text-primary') : 'text-muted-foreground'}`}>{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                      {hasAlert && <div className="absolute top-1.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                      {hasTelegram && !isActive && <div className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowMobilePanelPicker(p => !p)}
                  className={`min-w-[52px] min-h-[56px] py-2 flex flex-col items-center gap-1.5 transition-colors ${showMobilePanelPicker ? 'text-primary' : 'text-foreground/30 active:text-foreground/60'}`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  data-testid="mobile-tab-more"
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wide">{language === 'ar' ? 'المزيد' : 'More'}</span>
                </button>
              </div>
            ) : (
              /* Floating nav — compact, integrated into alerts full-screen */
              <div
                className="shrink-0 flex items-center justify-around px-2"
                style={{
                  paddingTop: 8,
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
                  background: 'hsl(20 10% 5%)',
                  borderTop: '1px solid rgba(239,68,68,0.12)',
                }}
                data-testid="mobile-tab-bar"
              >
                {(['alertmap', 'regional', 'telegram', 'events'] as PanelId[]).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const hasTelegram = id === 'telegram' && telegramMessages.length > 0;
                  const isRegional = id === 'regional';
                  const iconColor = isRegional ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.28)';
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className="flex flex-col items-center gap-1 rounded-lg transition-all active:scale-90 active:bg-white/5 relative"
                      style={{
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        minWidth: 56, minHeight: 42, padding: '6px 8px',
                        color: iconColor,
                      }}
                      data-testid={`mobile-tab-${id}`}
                      aria-label={cfg.label}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="text-[9px] font-mono font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.20)' }}>
                        {language === 'ar' ? cfg.labelAr : cfg.label}
                      </span>
                      {hasTelegram && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowMobilePanelPicker(p => !p)}
                  className="flex flex-col items-center gap-1 rounded-lg transition-all active:scale-90 active:bg-white/5"
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    minWidth: 44, minHeight: 42, padding: '6px 8px',
                    color: 'rgba(255,255,255,0.22)',
                  }}
                  data-testid="mobile-tab-more"
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" />
                  <span className="text-[9px] font-mono font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.18)' }}>MORE</span>
                </button>
              </div>
            )}
            {/* Bottom Sheet Backdrop */}
            {showMobilePanelPicker && (
              <div
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => setShowMobilePanelPicker(false)}
              />
            )}
            <div
              className={`fixed left-0 right-0 bottom-0 z-50 warroom-bottom-sheet ${showMobilePanelPicker ? 'warroom-bottom-sheet--open' : ''}`}
              style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileActivePanel === 'alerts' ? '60px' : '64px'})`, paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
              data-testid="mobile-panel-picker"
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-1 rounded-full bg-white/[0.12]" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-foreground/40">
                  {language === 'ar' ? 'لوحات إضافية' : 'More Panels'}
                </span>
                <button onClick={() => setShowMobilePanelPicker(false)} className="w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-foreground/60 rounded-lg active:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2.5 p-3">
                {allPanels.filter(id => !(SWIPE_TABS as PanelId[]).includes(id)).map(id => {
                  const cfg = PANEL_CONFIG[id];
                  const Icon = cfg.icon;
                  const count = 0;
                  return (
                    <button
                      key={id}
                      onClick={() => { setMobileActivePanel(id); setShowMobilePanelPicker(false); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-h-[64px] ${mobileActivePanel === id ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'text-foreground/40 bg-white/[0.03] active:bg-white/[0.08]'}`}
                      data-testid={`mobile-picker-${id}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[8px] font-mono font-bold leading-tight text-center">{language === 'ar' ? cfg.labelAr : cfg.label}</span>
                      {count > 0 && <span className="text-[7px] font-mono text-foreground/25">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isTablet ? (
          <div
            className="grid gap-2 p-2 overflow-y-auto"
            style={{
              gridTemplateColumns: isLandscape ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gridAutoRows: `minmax(${isLandscape ? '300px' : '340px'}, auto)`,
              background: 'hsl(var(--background))',
              paddingLeft: 'max(8px, env(safe-area-inset-left))',
              paddingRight: 'max(8px, env(safe-area-inset-right))',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            }}
          >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const isWide = id === 'alertmap';
              const mapH = isLandscape ? '440px' : '500px';
              const alertsH = isLandscape ? '340px' : '400px';
              const alertmapH = isLandscape ? '420px' : '480px';
              const defaultH = isLandscape ? '300px' : '340px';
              return (
                <div
                  key={id}
                  className="panel-enter"
                  style={{
                    gridColumn: isWide ? `1 / -1` : undefined,
                    minHeight: id === 'alerts' ? alertsH : id === 'alertmap' ? alertmapH : defaultH,
                    background: 'hsl(20 10% 7%)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: id === 'alerts' ? '1px solid hsl(0 72% 51% / 0.35)' : '1px solid hsl(20 8% 13%)',
                    boxShadow: '0 2px 14px rgba(0,0,0,.60)',
                  }}
                >
                  {renderPanel(id)}
                </div>
              );
            })}
          </div>
        ) : maximizedPanel && visiblePanels[maximizedPanel] ? (
          <div style={{ height: 'calc(100vh - 120px)' }} className="flex flex-col overflow-hidden">
            {renderPanel(maximizedPanel)}
          </div>
        ) : panelCount === 0 ? (
          <div className="flex items-center justify-center bg-background" style={{ minHeight: 400 }}>
            <div className="text-center">
              <PanelLeft className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground/50 font-medium">{language === 'en' ? 'All panels minimized' : '\u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0635\u063A\u0631\u0629'}</p>
              <p className="text-[10px] text-muted-foreground/30 mt-1">{language === 'en' ? 'Restore panels from the bar below' : '\u0627\u0633\u062A\u0639\u062F \u0627\u0644\u0644\u0648\u062D\u0627\u062A \u0645\u0646 \u0627\u0644\u0634\u0631\u064A\u0637 \u0623\u062F\u0646\u0627\u0647'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dock drop zone — visible only while dragging a floating window */}
            <div
              ref={dockZoneRef}
              style={{
                display: draggingFloatId ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                margin: '0 4px 4px',
                height: 44,
                borderRadius: 10,
                border: '2px dashed hsl(32 92% 50% / 0.7)',
                background: 'hsl(32 92% 50% / 0.07)',
                color: 'hsl(32 92% 55%)',
                fontSize: 12, fontWeight: 600,
                pointerEvents: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              <PanelLeft style={{ width: 14, height: 14 }} />
              Drop here to dock
            </div>
            {/* CSS for always-visible resize handles */}
            <style>{`.react-resizable-handle{opacity:1!important;background-color:rgba(255,255,255,0.12)!important;border-radius:3px;width:14px!important;height:14px!important}.react-resizable-handle::after{border-color:rgba(255,255,255,0.35)!important;border-width:0 2px 2px 0!important;width:6px!important;height:6px!important}.react-resizable-handle:hover{background-color:hsl(32 92% 50% / 0.55)!important}`}</style>
            <RGL
              layout={compactedVisibleLayout}
              cols={12}
              rowHeight={82}
              compactType="vertical"
              onLayoutChange={handleGridLayoutChange}
              draggableHandle=".panel-drag-handle"
              draggableCancel="button,input,select,textarea,a,[data-no-drag],canvas,.maplibregl-canvas,.maplibregl-canvas-container,#deck-canvas"
              margin={[8, 8]}
              containerPadding={[6, 6]}
              resizeHandles={['se', 'e', 's', 'sw', 'w', 'n', 'ne', 'nw']}
              style={{ paddingBottom: 80 }}
            >
            {allPanels.filter(id => visiblePanels[id]).map(id => {
              const hasAlertGlow = id === 'alerts' && redAlerts.length > 0;
              const isFloating = !!floatingPanels[id];
              const Icon = PANEL_CONFIG[id]?.icon;
              return (
                <div
                  key={id}
                  className="group flex flex-col overflow-hidden"
                  style={{
                    '--panel-accent': PANEL_ACCENTS[id] || 'hsl(var(--primary))',
                    borderRadius: 12,
                    background: isFloating ? 'hsl(20 8% 9%)' : 'hsl(20 10% 7%)',
                    border: isFloating
                      ? '1.5px dashed hsl(20 8% 16%)'
                      : hasAlertGlow
                        ? '1px solid hsl(0 70% 50% / 0.45)'
                        : '1px solid hsl(20 8% 13%)',
                    boxShadow: hasAlertGlow && !isFloating
                      ? '0 0 0 3px hsl(0 70% 50% / 0.08), 0 4px 20px rgba(0,0,0,.60)'
                      : '0 2px 12px rgba(0,0,0,.55)',
                    position: 'relative',
                    zIndex: hasAlertGlow ? 2 : undefined,
                  } as React.CSSProperties}
                  data-testid={hasAlertGlow && !isFloating ? 'alert-panel-glow' : undefined}
                >
                  {isFloating ? (
                    /* placeholder while panel is floating */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'default' }}>
                      {Icon && <Icon style={{ width: 18, height: 18, color: 'hsl(var(--muted-foreground) / 0.3)' }} />}
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{PANEL_CONFIG[id]?.label || id}</span>
                      <button
                        onClick={() => dockPanel(id)} data-no-drag
                        style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontWeight: 500 }}
                      >Dock</button>
                    </div>
                  ) : !readyPanels.has(id) ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid hsl(20 8% 12%)' }}>
                        {Icon && <Icon style={{ width: 14, height: 14, color: 'hsl(var(--muted-foreground) / 0.25)' }} />}
                        <div style={{ height: 8, width: 80, borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.08)' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                        <div className="skeleton-line" style={{ height: 10, width: '90%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.06)' }} />
                        <div className="skeleton-line" style={{ height: 10, width: '70%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.05)' }} />
                        <div className="skeleton-line" style={{ height: 10, width: '55%', borderRadius: 4, background: 'hsl(var(--muted-foreground) / 0.04)' }} />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: 'hsl(var(--muted-foreground) / 0.2)' }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isMobile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); popOutPanel(id); }}
                          data-no-drag
                          className="absolute top-[42px] right-1.5 z-[90] opacity-40 hover:opacity-100 transition-opacity duration-150"
                          aria-label="Pop out panel"
                          title="Pop out as floating window"
                          style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                        >
                          <ExternalLink style={{ width: 11, height: 11 }} />
                        </button>
                      )}
                      <PanelErrorBoundary panelName={PANEL_CONFIG[id]?.label || id}>
                        <div className="panel-enter flex flex-col flex-1 min-h-0">
                          {renderPanel(id)}
                        </div>
                      </PanelErrorBoundary>
                    </>
                  )}
                </div>
              );
            })}
          </RGL>
          </>
        )}
      </div>

      {/* ── Floating Windows ── */}
      {Object.entries(floatingPanels).map(([id, state]) => {
        const panelId = id as PanelId;
        const cfg = PANEL_CONFIG[panelId];
        const Icon = cfg?.icon;
        return (
          <FloatingWindow
            key={id} id={id}
            title={cfg?.label || id}
            icon={Icon ? <Icon style={{ width: 14, height: 14 }} /> : null}
            state={state!}
            onDock={() => dockPanel(panelId)}
            onClose={() => closeFloatPanel(panelId)}
            onFocus={() => focusFloatPanel(panelId)}
            onDragStart={() => setDraggingFloatId(panelId)}
            onDragEnd={(x, y) => {
              setDraggingFloatId(null);
              const zone = dockZoneRef.current;
              if (zone) {
                const r = zone.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                  dockPanel(panelId);
                }
              }
            }}
          >
            {renderPanel(panelId)}
          </FloatingWindow>
        );
      })}

      {/* ── Floating scroll buttons (desktop only) ── */}
      {!isMobile && !maximizedPanel && (
        <div style={{ position: 'fixed', right: 18, bottom: 90, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
          {showScrollTop && (
            <button
              onClick={() => physicsScrollRef.current.scrollTo(0)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'hsl(20 10% 8% / 0.88)', border: '1px solid hsl(32 92% 50% / 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 12px hsl(32 92% 50% / 0.12)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Scroll to top"
              aria-label="Scroll to top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(32 92% 50% / 0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
          )}
          {showScrollDown && (
            <button
              onClick={() => physicsScrollRef.current.scrollBy(window.innerHeight * 0.75)}
              style={{
                pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%',
                background: 'hsl(20 10% 8% / 0.88)', border: '1px solid hsl(32 92% 50% / 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 14px hsl(32 92% 50% / 0.15)',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Scroll down"
              aria-label="Scroll down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(32 92% 50% / 0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {!isMobile && <EventTimeline events={events} language={language} />}

      {!isMobile && <NewsTicker news={news} language={language} />}

      {!isMobile && (
        <div className="h-8 border-t border-border flex items-center px-3 shrink-0 gap-2 overflow-hidden bg-muted/50" data-testid="status-bar">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-400'}`} />
            <span className={`text-[11px] font-medium ${connected ? 'text-muted-foreground' : 'text-red-500'}`}>{connected ? 'Online' : 'Offline'}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><span className="font-medium text-foreground/60">Src</span> {[news.length > 0, commodities.length > 0, events.length > 0, telegramMessages.length > 0, thermalHotspots.length > 0, redAlerts.length > 0 || sirens.length > 0, flights.length > 0].filter(Boolean).length}</span>
            <span><span className="font-medium text-foreground/60">Events</span> {events.length}</span>
            <span><span className="font-medium text-foreground/60">Flights</span> {flights.length}</span>
            <span><span className="font-medium text-foreground/60">Markets</span> {commodities.length}</span>
          </div>
          {(redAlerts.length > 0 || sirens.length > 0) && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                {redAlerts.length > 0 && (
                  <span className="text-[11px] text-red-500 font-semibold animate-pulse px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25">
                    {redAlerts.length} Alerts
                  </span>
                )}
                {sirens.length > 0 && (
                  <span className="text-[11px] text-red-500 font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25">
                    {sirens.length} Sirens
                  </span>
                )}
              </div>
            </>
          )}
          {correlations.length > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{correlations.length} correlations</span>
              </div>
            </>
          )}
          <span className="text-[11px] text-muted-foreground/50 ml-auto hidden sm:inline">
            Warroom v2.1
          </span>
        </div>
      )}

      {popupTrackFlight && (
        <LiveFlightTracker
          flight={popupTrackFlight}
          allFlights={flights}
          language={language}
          onClose={() => setPopupTrackFlight(null)}
        />
      )}
      {showNotes && <NotesOverlay language={language} onClose={() => setShowNotes(false)} />}
      {showWatchlist && <WatchlistOverlay language={language} onClose={() => setShowWatchlist(false)} onUpdate={setWatchlist} />}
      {showAlertHistory && <AlertHistoryOverlay language={language} onClose={() => setShowAlertHistory(false)} />}
      {showSettings && <SettingsOverlay settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} language={language} />}
        </div>
      </div>
    </div>
    </FeedFreshnessContext.Provider>
  );
}
