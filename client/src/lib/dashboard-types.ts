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

export type PanelId = 'telegram' | 'events' | 'alerts' | 'markets' | 'livefeed' | 'alertmap' | 'analytics' | 'osint' | 'attackpred' | 'rocketstats' | 'aiprediction' | 'regional';

export interface Correlation {
  id: string;
  type: 'alert_flight' | 'siren_alert' | 'multi_region' | 'surge';
  description: string;
  confidence: number;
  timestamp: string;
  items: string[];
}

export interface EscalationState {
  level: 'stable' | 'rising' | 'elevated' | 'critical';
  message: string;
  detail: string;
  since: number;
  dismissed: boolean;
}

export interface BasePanelProps {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}
