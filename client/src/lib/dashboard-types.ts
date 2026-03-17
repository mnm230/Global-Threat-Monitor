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
  RocketStats,
} from '@shared/schema';
import type { LayoutItem as GridItemLayout } from 'react-grid-layout/legacy';
import {
  AlertTriangle,
  Newspaper,
  Send,
  Crosshair,
  Anchor,
  BarChart3,
  Activity,
  Globe,
  AlertOctagon,
  MapPin,
  Video,
  Rocket,
  Sparkles,
} from 'lucide-react';

export type {
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
  RocketStats,
};

export interface WARROOMSettings {
  criticalThreshold: number;
  highThreshold: number;
  elevatedThreshold: number;
  notifyRockets: boolean;
  notifyMissiles: boolean;
  notifyUav: boolean;
  notifyAircraft: boolean;
  soundEnabled: boolean;
  volume: number;
  silentMode: boolean;
  notificationLevel: 'all' | 'critical' | 'none';
  defaultLanguage: 'en' | 'ar';
}

export const DEFAULT_SETTINGS: WARROOMSettings = {
  criticalThreshold: 15,
  highThreshold: 8,
  elevatedThreshold: 3,
  notifyRockets: true,
  notifyMissiles: true,
  notifyUav: true,
  notifyAircraft: true,
  soundEnabled: true,
  volume: 70,
  silentMode: false,
  notificationLevel: 'all',
  defaultLanguage: 'en',
};

export function loadSettings(): WARROOMSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('warroom_settings') || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}

export interface Anomaly {
  id: string;
  type: 'alert_spike' | 'siren_cluster' | 'flight_convergence' | 'price_spike' | 'telegram_surge';
  severity: 'high' | 'medium';
  description: string;
  timestamp: string;
}

export interface AttackPrediction {
  predictions: Array<{
    region: string;
    threatVector: string;
    probability: number;
    timeframe: string;
    source: string;
    rationale: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
  overallThreatLevel: string;
  escalationVector: string;
  nextLikelyTarget: string | null;
  confidence: number;
  patternSummary: string;
  insufficientData?: boolean;
  generatedAt: string;
  dataPoints: {
    totalAlerts: number;
    velocity30m: number;
    velocity2h: number;
    velocityPerHour: number;
    isEscalating: boolean;
    topRegions: Array<{ region: string; count: number }>;
  };
  nextAttackWindow?: {
    estimatedMinutes: number;
    confidence: number;
    basis: string;
    label: string;
  };
  locationProbabilities?: Array<{
    location: string;
    country: string;
    probability: number;
    threatType: string;
    countryFlag: string;
  }>;
}

export type FeedFreshness = Record<string, number>;

export interface SSEData {
  news: NewsItem[];
  commodities: CommodityData[];
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  sirens: SirenAlert[];
  redAlerts: RedAlert[];
  telegramMessages: TelegramMessage[];
  thermalHotspots: ThermalHotspot[];
  breakingNews: BreakingNewsItem[];
  attackPrediction: AttackPrediction | null;
  rocketStats: RocketStats | null;
  connected: boolean;
  feedFreshness: FeedFreshness;
}

export type PanelId = 'events' | 'alerts' | 'regional' | 'markets' | 'telegram' | 'livefeed' | 'alertmap' | 'analytics' | 'osint' | 'attackpred' | 'rocketstats' | 'aiprediction' | 'weather';

export interface Correlation {
  id: string;
  items: { type: 'event' | 'alert' | 'siren' | 'flight'; id: string; label: string }[];
  reason: string;
}

export interface EscalationState {
  level: 'WATCH' | 'WARNING' | 'CRITICAL' | null;
  count: number;
  rate: number;
}

export interface AnalystNote {
  id: string;
  text: string;
  timestamp: string;
  category: string;
}

export interface LayoutPreset {
  name: string;
  visiblePanels: Record<PanelId, boolean>;
  colWidths: Record<PanelId, number>;
  rowSplit: number;
  gridLayout?: GridItemLayout[];
}

export interface FloatState { x: number; y: number; w: number; h: number; z: number }

export interface BasePanelProps {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

export const PANEL_CONFIG: Record<PanelId, { icon: typeof Newspaper; label: string; labelAr: string }> = {
  aiprediction: { icon: Sparkles, label: 'AI Prediction', labelAr: 'توقعات الذكاء الاصطناعي' },
  telegram: { icon: Send, label: 'Telegram', labelAr: '\u062A\u0644\u063A\u0631\u0627\u0645' },
  events: { icon: AlertTriangle, label: 'Events', labelAr: '\u0623\u062D\u062F\u0627\u062B' },
  alerts: { icon: AlertOctagon, label: 'Alerts', labelAr: 'تحذيرات إسرائيل' },
  regional: { icon: Globe, label: 'Regional Attacks', labelAr: 'هجمات إقليمية' },
  markets: { icon: BarChart3, label: 'Markets', labelAr: '\u0623\u0633\u0648\u0627\u0642' },
  livefeed: { icon: Video, label: 'Live Feed', labelAr: '\u0628\u062B \u0645\u0628\u0627\u0634\u0631' },
  alertmap: { icon: MapPin, label: 'Alert Map', labelAr: '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A' },
  analytics: { icon: BarChart3, label: 'Analytics', labelAr: '\u062A\u062D\u0644\u064A\u0644\u0627\u062A' },
  osint: { icon: Activity, label: 'OSINT Feed', labelAr: 'تغذية OSINT' },
  attackpred: { icon: Crosshair, label: 'Attack Predictor', labelAr: 'توقع الهجوم' },
  rocketstats: { icon: Rocket, label: 'Rocket Stats', labelAr: 'إحصائيات الصواريخ' },
  weather: { icon: Activity, label: 'Weather Ops', labelAr: 'الأحوال الجوية' },
};

export const PANEL_ACCENTS: Partial<Record<PanelId, string>> = {
  alerts:       'hsl(0 65% 48%)',
  regional:     'hsl(142 55% 38%)',
  telegram:     'hsl(32 80% 48%)',
  events:       'hsl(36 65% 48%)',
  markets:      'hsl(250 50% 52%)',
  aiprediction: 'hsl(260 50% 52%)',
  analytics:    'hsl(24 70% 45%)',
  osint:        'hsl(40 70% 48%)',
  livefeed:     'hsl(28 65% 46%)',
  alertmap:     'hsl(12 60% 46%)',
  attackpred:   'hsl(24 60% 46%)',
  rocketstats:  'hsl(175 50% 40%)',
  weather:      'hsl(200 55% 42%)',
};

export const DEFAULT_GRID_LAYOUT: GridItemLayout[] = [
  { i: 'alerts',       x: 0,  y: 0,  w: 3,  h: 7,  minW: 2, minH: 4 },
  { i: 'regional',     x: 3,  y: 0,  w: 3,  h: 7,  minW: 2, minH: 4 },
  { i: 'alertmap',     x: 6,  y: 0,  w: 5,  h: 7,  minW: 3, minH: 4 },
  { i: 'telegram',     x: 11, y: 0,  w: 1,  h: 7,  minW: 1, minH: 3 },
  { i: 'aiprediction', x: 0,  y: 7,  w: 3,  h: 5,  minW: 2, minH: 3 },
  { i: 'events',       x: 3,  y: 7,  w: 4,  h: 5,  minW: 2, minH: 3 },
  { i: 'markets',      x: 7,  y: 7,  w: 5,  h: 5,  minW: 2, minH: 3 },
  { i: 'livefeed',     x: 0,  y: 12, w: 12, h: 4,  minW: 3, minH: 2 },
  { i: 'osint',        x: 0,  y: 16, w: 6,  h: 6,  minW: 3, minH: 3 },
  { i: 'analytics',    x: 6,  y: 16, w: 6,  h: 6,  minW: 2, minH: 3 },
  { i: 'attackpred',   x: 0,  y: 22, w: 12, h: 5,  minW: 3, minH: 3 },
  { i: 'rocketstats',  x: 0,  y: 27, w: 9,  h: 6,  minW: 3, minH: 3 },
  { i: 'weather',      x: 9,  y: 27, w: 3,  h: 6,  minW: 2, minH: 4 },
];

export const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    name: 'Default',
    visiblePanels: { telegram: true, events: true, alerts: true, regional: true, markets: true, livefeed: true, alertmap: true, analytics: true, osint: false, attackpred: false, rocketstats: false, aiprediction: true, weather: false },
    colWidths: { telegram: 16, alerts: 16, regional: 16, livefeed: 16, events: 22, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28, weather: 22 },
    rowSplit: 58,
  },
  {
    name: 'Maritime Focus',
    visiblePanels: { telegram: false, events: false, alerts: false, regional: false, markets: true, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false, weather: false },
    colWidths: { telegram: 16, alerts: 26, regional: 26, livefeed: 20, events: 22, markets: 30, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28, weather: 22 },
    rowSplit: 60,
  },
  {
    name: 'Air Defense',
    visiblePanels: { telegram: false, events: true, alerts: true, regional: true, markets: false, livefeed: false, alertmap: true, analytics: false, osint: false, attackpred: true, rocketstats: false, aiprediction: true, weather: false },
    colWidths: { telegram: 16, alerts: 50, regional: 50, livefeed: 20, events: 25, markets: 28, alertmap: 28, analytics: 28, osint: 28, attackpred: 22, rocketstats: 22, aiprediction: 28, weather: 22 },
    rowSplit: 55,
  },
  {
    name: 'Mobile',
    visiblePanels: { telegram: true, events: false, alerts: true, regional: true, markets: false, livefeed: true, alertmap: true, analytics: false, osint: false, attackpred: false, rocketstats: false, aiprediction: false, weather: false },
    colWidths: { telegram: 100, alerts: 100, regional: 100, livefeed: 100, events: 100, markets: 100, alertmap: 100, analytics: 100, osint: 100, attackpred: 100, rocketstats: 100, aiprediction: 100, weather: 100 },
    rowSplit: 50,
  },
];

export const SWIPE_TABS: PanelId[] = ['alertmap', 'alerts', 'regional', 'telegram', 'events'];

export const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export const THREAT_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  rocket: { en: 'ROCKET FIRE', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0648\u0627\u0631\u064A\u062E', icon: '\u{1F680}' },
  missile: { en: 'MISSILE LAUNCH', ar: '\u0625\u0637\u0644\u0627\u0642 \u0635\u0627\u0631\u0648\u062E', icon: '\u{1F4A5}' },
  uav: { en: 'HOSTILE UAV', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0633\u064A\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u2708\uFE0F' },
  hostile_aircraft: { en: 'HOSTILE AIRCRAFT', ar: '\u0637\u0627\u0626\u0631\u0629 \u0645\u0639\u0627\u062F\u064A\u0629', icon: '\u26A0\uFE0F' },
};

export interface RegionalFeedItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  timestamp: string;
  attackType: string;
  relevance: string;
  threatLevel?: 'high' | 'medium' | 'low';
  isSiren?: boolean;
}
