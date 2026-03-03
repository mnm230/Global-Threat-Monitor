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

export interface AdsbFlight {
  id: string;
  hex: string;
  callsign: string;
  type: 'military' | 'commercial' | 'surveillance' | 'cargo' | 'private' | 'government';
  aircraft: string;
  registration: string;
  origin: string;
  destination: string;
  lat: number;
  lng: number;
  altitude: number;
  groundSpeed: number;
  verticalRate: number;
  heading: number;
  squawk: string;
  rssi: number;
  seen: number;
  country: string;
  flagged: boolean;
  flagReason?: string;
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

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth: number;
  timestamp: string;
  url?: string;
  felt?: number;
  tsunami?: number;
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
