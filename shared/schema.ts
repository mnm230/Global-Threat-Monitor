import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export interface NewsItem {
  id: string;
  title: string;
  titleAr?: string;
  source: string;
  category: 'breaking' | 'military' | 'diplomatic' | 'economic';
  timestamp: string;
  url?: string;
}

export interface CommodityData {
  symbol: string;
  name: string;
  nameAr: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  category: 'commodity' | 'fx' | 'fx-major';
}

export interface ConflictEvent {
  id: string;
  type: 'missile' | 'airstrike' | 'naval' | 'ground' | 'defense' | 'nuclear';
  lat: number;
  lng: number;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface FlightData {
  id: string;
  callsign: string;
  type: 'military' | 'commercial' | 'surveillance';
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
  aircraft?: string;
  origin?: string;
  squawk?: string;
}


export interface ShipData {
  id: string;
  name: string;
  type: 'tanker' | 'cargo' | 'military' | 'patrol';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  flag: string;
}

export interface TelegramMessage {
  id: string;
  channel: string;
  text: string;
  textAr?: string;
  timestamp: string;
  image?: string;
}

export interface SirenAlert {
  id: string;
  location: string;
  locationAr: string;
  region: string;
  regionAr: string;
  threatType: 'rocket' | 'missile' | 'uav' | 'hostile_aircraft';
  timestamp: string;
  active: boolean;
}

export interface RedAlert {
  id: string;
  city: string;
  cityHe: string;
  cityAr: string;
  region: string;
  regionHe: string;
  regionAr: string;
  country: string;
  countryCode: string;
  countdown: number;
  threatType: 'rockets' | 'missiles' | 'hostile_aircraft_intrusion' | 'uav_intrusion';
  timestamp: string;
  active: boolean;
  lat: number;
  lng: number;
  source?: 'live' | 'sim';
}

export interface AIBriefDevelopment {
  text: string;
  textAr: string;
  severity: 'critical' | 'high' | 'medium';
  category: string;
}

export interface AIBrief {
  id: string;
  summary: string;
  summaryAr: string;
  keyDevelopments: AIBriefDevelopment[];
  focalPoints: string[];
  riskLevel: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE';
  generatedAt: string;
  model: string;
  tacticalSituation?: string;
  escalationIndicators?: string[];
  actorAnalysis?: string;
}

export interface AIDeduction {
  id: string;
  query: string;
  response: string;
  responseAr: string;
  confidence: number;
  timeframe: string;
  timestamp: string;
}

export interface ThreatClassification {
  category: 'missile_launch' | 'airstrike' | 'naval_movement' | 'ground_offensive' | 'air_defense' | 'drone_activity' | 'nuclear_related' | 'economic_impact' | 'diplomatic' | 'humanitarian' | 'cyber_attack' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  entities: string[];
  locations: string[];
  keywords: string[];
}

export interface ClassifiedMessage extends TelegramMessage {
  classification?: ThreatClassification;
}

export interface AlertPattern {
  id: string;
  type: 'launch_cycle' | 'escalation' | 'deescalation' | 'geographic_shift' | 'time_pattern';
  description: string;
  confidence: number;
  detectedAt: string;
  affectedRegions: string[];
  predictedNext?: string;
  intervalMinutes?: number;
  alertCount: number;
}

export interface FalseAlarmScore {
  alertId: string;
  score: number;
  reasons: string[];
  recommendation: 'likely_real' | 'uncertain' | 'likely_false';
}

export interface LLMAssessment {
  engine: string;
  model: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  summary: string;
  keyInsights: string[];
  confidence: number;
  generatedAt: string;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

export interface EscalationForecast {
  nextHour: number;
  next3Hours: number;
  velocityPerHour: number;
  confidence: number;
  direction: 'surging' | 'escalating' | 'stable' | 'cooling';
  basisHours: number;
  projectedPeak: string;
}

export interface RegionAnomaly {
  region: string;
  currentCount: number;
  rollingAvg: number;
  zScore: number;
  pctAboveAvg: number;
  severity: 'critical' | 'warning';
}

export interface AnalyticsSnapshot {
  alertsByRegion: Record<string, number>;
  alertsByType: Record<string, number>;
  alertTimeline: { time: string; count: number; regions?: Record<string, number>; types?: Record<string, number> }[];
  avgResponseTime: number;
  activeAlertCount: number;
  falseAlarmRate: number;
  threatTrend: 'escalating' | 'stable' | 'deescalating';
  topSources: { channel: string; count: number; reliability: number }[];
  patterns: AlertPattern[];
  falseAlarms: FalseAlarmScore[];
  llmAssessments?: LLMAssessment[];
  consensusRisk?: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  modelAgreement?: number;
  escalationForecast?: EscalationForecast;
  regionAnomalies?: RegionAnomaly[];
  conflictEventCount?: number;
  thermalHotspotCount?: number;
  militaryFlightCount?: number;
  eventsByType?: Record<string, number>;
  lastUpdated?: string;
}

export interface CyberEvent {
  id: string;
  type: 'ddos' | 'intrusion' | 'malware' | 'phishing' | 'defacement' | 'data_exfil' | 'scada';
  target: string;
  attacker?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sector: 'government' | 'military' | 'financial' | 'energy' | 'telecom' | 'media' | 'infrastructure';
  country: string;
  timestamp: string;
  description: string;
}

export interface EWEvent {
  id: string;
  type: 'gps_jamming' | 'gps_spoofing' | 'comms_jamming' | 'radar_spoofing' | 'drone_ew';
  lat: number;
  lng: number;
  radiusKm: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  country: string;
  affectedSystems: string[];
  timestamp: string;
  description: string;
  source: string;
  active: boolean;
}

export interface InfraEvent {
  id: string;
  type: 'power' | 'water' | 'hospital' | 'bridge' | 'port' | 'fuel' | 'telecom' | 'airport';
  lat: number;
  lng: number;
  country: string;
  region: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  description: string;
  source: string;
  casualties?: number;
}

export interface ThermalHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  frp: number;
  confidence: 'low' | 'nominal' | 'high';
  satellite: string;
  instrument: string;
  acqDate: string;
  acqTime: string;
  dayNight: 'D' | 'N';
}

export interface BreakingNewsItem {
  id: string;
  headline: string;
  headlineAr?: string;
  source: 'telegram' | 'x' | 'alert';
  channel?: string;
  severity: 'critical' | 'high';
  timestamp: string;
  originalText?: string;
}

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  url: string;
  permalink: string;
  timestamp: string;
  flair?: string;
  thumbnail?: string;
}

export interface SanctionMatch {
  entityName: string;
  matchedAgainst: string;
  matchType: 'vessel' | 'aircraft' | 'entity';
  listSource: 'OFAC_SDN' | 'EU_SANCTIONS' | 'UN_SANCTIONS';
  confidence: number;
  details: string;
  sanctionId: string;
  country?: string;
  matchField: string;
  timestamp: string;
}

export interface WeatherData {
  id: string;
  location: string;
  lat: number;
  lng: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  visibility: number;
  pressure: number;
  cloudCover: number;
  description: string;
  icon: string;
  condition: 'clear' | 'clouds' | 'rain' | 'storm' | 'snow' | 'fog' | 'dust' | 'haze';
  operationalImpact: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  impactDetails: string;
  timestamp: string;
}

export interface SatelliteImage {
  id: string;
  location: string;
  lat: number;
  lng: number;
  source: 'sentinel2' | 'landsat' | 'modis' | 'viirs';
  date: string;
  resolution: string;
  cloudCover: number;
  thumbnailUrl: string;
  fullUrl: string;
  bands: string;
  description: string;
  changeDetected?: boolean;
  changeType?: 'construction' | 'destruction' | 'military_activity' | 'fire' | 'flooding' | 'none';
}

export type SitrepWindow = '1h' | '6h' | '24h';

export interface SitrepKeyEvent {
  dtg: string;
  location: string;
  event: string;
  significance: 'critical' | 'high' | 'medium';
}

export interface Sitrep {
  id: string;
  window: SitrepWindow;
  dtg: string;
  riskLevel: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'MODERATE';
  situation: string;
  opfor: string;
  blufor: string;
  keyEvents: SitrepKeyEvent[];
  intelligence: string;
  infrastructure: string;
  ewCyber: string;
  commandersAssessment: string;
  outlook: string;
  alertCount: number;
  eventCount: number;
  generatedAt: string;
  model: string;
}
