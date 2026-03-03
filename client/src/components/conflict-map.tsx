import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer, LineLayer, ArcLayer, PolygonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import type { ConflictEvent, FlightData, ShipData, AdsbFlight, RedAlert, ThermalHotspot } from '@shared/schema';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

const REGION_PRESETS: Record<string, ViewState> = {
  global: { longitude: 45, latitude: 25, zoom: 2, pitch: 0, bearing: 0 },
  mena: { longitude: 42, latitude: 28, zoom: 4, pitch: 0, bearing: 0 },
  gulf: { longitude: 52, latitude: 26, zoom: 6, pitch: 0, bearing: 0 },
  levant: { longitude: 36, latitude: 32, zoom: 6, pitch: 0, bearing: 0 },
};

const VIEW_CONFIG: Record<string, ViewState> = {
  conflict: { longitude: 47, latitude: 31, zoom: 5, pitch: 0, bearing: 0 },
  flights: { longitude: 48, latitude: 32, zoom: 5, pitch: 0, bearing: 0 },
  maritime: { longitude: 56.1, latitude: 26.2, zoom: 8, pitch: 0, bearing: 0 },
};

const EVENT_COLORS: Record<string, [number, number, number]> = {
  missile: [239, 68, 68],
  airstrike: [249, 115, 22],
  defense: [34, 211, 238],
  naval: [59, 130, 246],
  ground: [234, 179, 8],
  nuclear: [168, 85, 247],
};

const FLIGHT_COLORS: Record<string, [number, number, number]> = {
  military: [239, 68, 68],
  surveillance: [34, 211, 238],
  commercial: [34, 197, 94],
};

const SHIP_COLORS: Record<string, [number, number, number]> = {
  military: [239, 68, 68],
  tanker: [245, 158, 11],
  cargo: [59, 130, 246],
  patrol: [234, 179, 8],
};

const SEVERITY_RADIUS: Record<string, number> = {
  critical: 12,
  high: 9,
  medium: 7,
  low: 5,
};

const STRAIT_OF_HORMUZ: number[][] = [
  [56.0, 26.1],
  [56.2, 26.3],
  [56.4, 26.6],
  [56.5, 26.8],
  [56.6, 27.0],
];

const MILITARY_BASES = [
  { name: 'Al Udeid Air Base', lat: 25.117, lng: 51.315, country: 'Qatar', operator: 'US' },
  { name: 'Al Dhafra Air Base', lat: 24.248, lng: 54.547, country: 'UAE', operator: 'US' },
  { name: 'Camp Arifjan', lat: 29.085, lng: 48.088, country: 'Kuwait', operator: 'US' },
  { name: 'Incirlik Air Base', lat: 37.002, lng: 35.426, country: 'Turkey', operator: 'US' },
  { name: 'Al Tanf Garrison', lat: 33.513, lng: 38.661, country: 'Syria', operator: 'US' },
  { name: 'Ramat David AFB', lat: 32.665, lng: 35.188, country: 'Israel', operator: 'Israel' },
  { name: 'Nevatim AFB', lat: 31.208, lng: 34.962, country: 'Israel', operator: 'Israel' },
  { name: 'Palmachim AFB', lat: 31.898, lng: 34.691, country: 'Israel', operator: 'Israel' },
  { name: 'Bandar Abbas AFB', lat: 27.183, lng: 56.267, country: 'Iran', operator: 'Iran' },
  { name: 'Isfahan AFB', lat: 32.655, lng: 51.668, country: 'Iran', operator: 'Iran' },
  { name: 'Tabriz AFB', lat: 38.130, lng: 46.235, country: 'Iran', operator: 'Iran' },
  { name: 'Shiraz AFB', lat: 29.540, lng: 52.590, country: 'Iran', operator: 'Iran' },
  { name: 'Bushehr NAB', lat: 28.918, lng: 50.835, country: 'Iran', operator: 'Iran' },
  { name: 'Al Salem Air Base', lat: 29.346, lng: 47.521, country: 'Kuwait', operator: 'US' },
  { name: 'Camp Lemonnier', lat: 11.547, lng: 43.146, country: 'Djibouti', operator: 'US' },
  { name: 'Hatzerim AFB', lat: 31.233, lng: 34.662, country: 'Israel', operator: 'Israel' },
  { name: 'Prince Sultan Air Base', lat: 24.062, lng: 47.580, country: 'Saudi Arabia', operator: 'US' },
  { name: 'Isa Air Base', lat: 25.918, lng: 50.591, country: 'Bahrain', operator: 'US' },
];

const NUCLEAR_FACILITIES = [
  { name: 'Natanz Enrichment', lat: 33.724, lng: 51.727, country: 'Iran', type: 'Enrichment' },
  { name: 'Fordow Enrichment', lat: 34.881, lng: 51.577, country: 'Iran', type: 'Enrichment' },
  { name: 'Bushehr NPP', lat: 28.830, lng: 50.888, country: 'Iran', type: 'Power Plant' },
  { name: 'Isfahan UCF', lat: 32.654, lng: 51.668, country: 'Iran', type: 'Conversion' },
  { name: 'Arak Heavy Water', lat: 34.379, lng: 49.247, country: 'Iran', type: 'Heavy Water' },
  { name: 'Parchin Complex', lat: 35.526, lng: 51.774, country: 'Iran', type: 'Research' },
  { name: 'Dimona Reactor', lat: 31.070, lng: 35.206, country: 'Israel', type: 'Reactor' },
  { name: 'Sorek Nuclear Center', lat: 31.868, lng: 34.705, country: 'Israel', type: 'Research' },
];

const AIR_DEFENSE = [
  { name: 'Iron Dome - Tel Aviv', lat: 32.085, lng: 34.782, country: 'Israel', system: 'Iron Dome' },
  { name: 'Iron Dome - Haifa', lat: 32.794, lng: 34.990, country: 'Israel', system: 'Iron Dome' },
  { name: "David's Sling - Ramat David", lat: 32.665, lng: 35.188, country: 'Israel', system: "David's Sling" },
  { name: 'Arrow - Palmachim', lat: 31.898, lng: 34.691, country: 'Israel', system: 'Arrow' },
  { name: 'S-300 - Isfahan', lat: 32.654, lng: 51.668, country: 'Iran', system: 'S-300' },
  { name: 'S-300 - Bushehr', lat: 28.918, lng: 50.835, country: 'Iran', system: 'S-300' },
  { name: 'Bavar-373 - Tehran', lat: 35.689, lng: 51.389, country: 'Iran', system: 'Bavar-373' },
  { name: 'Pantsir - Abu Dhabi', lat: 24.453, lng: 54.377, country: 'UAE', system: 'Pantsir-S1' },
  { name: 'Iron Dome - Ashkelon', lat: 31.669, lng: 34.574, country: 'Israel', system: 'Iron Dome' },
  { name: 'THAAD - Al Dhafra', lat: 24.248, lng: 54.547, country: 'UAE', system: 'THAAD' },
  { name: 'Patriot - Prince Sultan', lat: 24.062, lng: 47.580, country: 'Saudi Arabia', system: 'Patriot PAC-3' },
];

const UNDERSEA_CABLES = [
  {
    name: 'AAE-1',
    color: [0, 200, 200] as [number, number, number],
    path: [[32.0, 31.2], [34.0, 28.0], [38.0, 21.5], [43.0, 12.5], [50.0, 25.0], [56.0, 25.5], [65.0, 22.0], [72.0, 18.0]],
  },
  {
    name: 'FLAG Europe-Asia',
    color: [200, 100, 0] as [number, number, number],
    path: [[32.3, 31.3], [34.5, 27.5], [39.0, 20.0], [44.0, 11.5], [48.0, 24.5], [57.0, 25.0], [66.0, 21.5], [73.0, 17.0]],
  },
  {
    name: 'SEA-ME-WE-5',
    color: [100, 200, 100] as [number, number, number],
    path: [[32.5, 31.0], [35.0, 27.0], [40.0, 19.0], [45.0, 12.0], [52.0, 24.0], [58.0, 24.5], [68.0, 20.0], [75.0, 15.0]],
  },
  {
    name: 'EIG',
    color: [200, 200, 0] as [number, number, number],
    path: [[32.0, 31.5], [33.5, 28.5], [37.5, 22.0], [42.5, 13.0], [49.0, 25.5], [55.0, 26.0]],
  },
  {
    name: 'FALCON',
    color: [200, 50, 200] as [number, number, number],
    path: [[48.0, 29.5], [50.5, 26.5], [52.0, 25.0], [54.0, 25.5], [56.5, 25.8]],
  },
  {
    name: 'Gulf Bridge International',
    color: [50, 150, 250] as [number, number, number],
    path: [[48.5, 29.3], [50.0, 27.0], [51.5, 26.0], [53.0, 25.5], [55.0, 25.2]],
  },
];

const PIPELINES = [
  {
    name: 'East-West Pipeline (Saudi)',
    color: [200, 150, 50] as [number, number, number],
    path: [[49.5, 26.0], [47.0, 25.5], [44.0, 24.5], [42.0, 24.0], [39.5, 24.5], [38.0, 25.5]],
  },
  {
    name: 'IGAT Pipeline (Iran)',
    color: [100, 150, 200] as [number, number, number],
    path: [[52.0, 27.5], [51.5, 30.0], [51.0, 32.5], [50.5, 34.0], [49.5, 36.0]],
  },
  {
    name: 'Kirkuk-Ceyhan Pipeline',
    color: [150, 200, 100] as [number, number, number],
    path: [[44.4, 35.5], [43.5, 36.0], [42.5, 36.5], [41.0, 37.0], [39.0, 37.0], [36.5, 36.8], [35.9, 36.8]],
  },
  {
    name: 'Tapline',
    color: [200, 100, 150] as [number, number, number],
    path: [[50.2, 26.3], [48.0, 28.5], [46.0, 30.0], [42.0, 31.5], [38.0, 32.5], [36.0, 33.5], [35.5, 34.0]],
  },
  {
    name: 'Dolphin Gas Pipeline',
    color: [120, 200, 180] as [number, number, number],
    path: [[51.5, 25.9], [52.5, 25.5], [54.0, 24.8], [54.5, 24.5]],
  },
  {
    name: 'SUMED Pipeline',
    color: [220, 180, 80] as [number, number, number],
    path: [[32.3, 29.9], [31.5, 30.0], [30.5, 30.2], [29.9, 30.5]],
  },
];

const DRONE_BASES = [
  { name: 'Sde Dov UAV Hub', lat: 32.114, lng: 34.782, country: 'Israel', type: 'Hermes 900' },
  { name: 'Palmachim Drone Wing', lat: 31.900, lng: 34.690, country: 'Israel', type: 'Heron TP' },
  { name: 'Ali Al Salem UAV', lat: 29.346, lng: 47.521, country: 'Kuwait', type: 'MQ-9 Reaper' },
  { name: 'Al Dhafra UAV Ops', lat: 24.250, lng: 54.550, country: 'UAE', type: 'MQ-9 Reaper' },
  { name: 'Shahed Base - Isfahan', lat: 32.700, lng: 51.700, country: 'Iran', type: 'Shahed-136' },
  { name: 'IRGC Drone Center - Kashan', lat: 33.990, lng: 51.460, country: 'Iran', type: 'Mohajer-6' },
  { name: 'Houthi Drone Launch - Sanaa', lat: 15.370, lng: 44.190, country: 'Yemen', type: 'Samad-3' },
];

const COMMAND_CENTERS = [
  { name: 'IDF HQ - Tel Aviv (Hakirya)', lat: 32.074, lng: 34.790, country: 'Israel', type: 'National Command' },
  { name: 'CENTCOM Forward - Al Udeid', lat: 25.120, lng: 51.318, country: 'Qatar', type: 'US CENTCOM' },
  { name: 'IRGC Joint Command - Tehran', lat: 35.700, lng: 51.420, country: 'Iran', type: 'IRGC Command' },
  { name: 'Hezbollah War Room - Dahieh', lat: 33.850, lng: 35.510, country: 'Lebanon', type: 'Militia HQ' },
  { name: 'IDF Northern Command - Safed', lat: 32.966, lng: 35.496, country: 'Israel', type: 'Regional Command' },
  { name: 'IDF Southern Command - Beersheba', lat: 31.252, lng: 34.791, country: 'Israel', type: 'Regional Command' },
  { name: 'Iranian Navy HQ - Bandar Abbas', lat: 27.185, lng: 56.263, country: 'Iran', type: 'Naval Command' },
];

const RADAR_SITES = [
  { name: 'Green Pine - Negev', lat: 31.0, lng: 34.8, country: 'Israel', system: 'Green Pine' },
  { name: 'AN/TPY-2 - Dimona', lat: 31.068, lng: 35.200, country: 'Israel', system: 'AN/TPY-2 (US)' },
  { name: 'Ghadir Radar - Garmsar', lat: 35.2, lng: 52.3, country: 'Iran', system: 'Ghadir' },
  { name: 'Sepehr Radar - Khorasan', lat: 36.3, lng: 59.6, country: 'Iran', system: 'Sepehr' },
  { name: 'Qamar Radar - Ahvaz', lat: 31.3, lng: 48.7, country: 'Iran', system: 'Qamar' },
  { name: 'EW Station - Cyprus', lat: 34.6, lng: 32.9, country: 'UK', system: 'RAF Akrotiri EW' },
];

const BALLISTIC_SITES = [
  { name: 'Shahrud Missile Base', lat: 36.430, lng: 55.000, country: 'Iran', type: 'MRBM' },
  { name: 'Tabriz Missile Base', lat: 38.080, lng: 46.300, country: 'Iran', type: 'SRBM' },
  { name: 'Khorramabad Missile Site', lat: 33.490, lng: 48.350, country: 'Iran', type: 'MRBM' },
  { name: 'Kermanshah Missile Base', lat: 34.330, lng: 47.080, country: 'Iran', type: 'SRBM' },
  { name: 'Semnan Space Center', lat: 35.234, lng: 53.920, country: 'Iran', type: 'SLV/ICBM' },
  { name: 'Jericho Silo - Sdot Micha', lat: 31.700, lng: 34.960, country: 'Israel', type: 'IRBM' },
];

const ARMS_DEPOTS = [
  { name: 'IRGC Parchin Storage', lat: 35.530, lng: 51.780, country: 'Iran', type: 'Weapons Complex' },
  { name: 'Imam Ali Base (T-4)', lat: 34.522, lng: 37.632, country: 'Syria', type: 'IRGC Depot' },
  { name: 'Hezbollah Arms Cache - Hermel', lat: 34.392, lng: 36.385, country: 'Lebanon', type: 'Militia Cache' },
  { name: 'IDF Tzrifin Depot', lat: 31.860, lng: 34.880, country: 'Israel', type: 'Central Armory' },
  { name: 'IRGC Khojir Complex', lat: 35.620, lng: 51.660, country: 'Iran', type: 'Underground' },
];

const SPECIAL_FORCES = [
  { name: 'Sayeret Matkal HQ', lat: 31.870, lng: 34.840, country: 'Israel', type: 'Tier-1 SOF' },
  { name: 'Shayetet 13 Base', lat: 32.800, lng: 34.960, country: 'Israel', type: 'Naval SOF' },
  { name: 'IRGC Quds Force - Tehran', lat: 35.700, lng: 51.400, country: 'Iran', type: 'IRGC-QF' },
  { name: 'Delta/JSOC Forward - Erbil', lat: 36.200, lng: 44.010, country: 'Iraq', type: 'US SOF' },
  { name: 'SAS Forward - Akrotiri', lat: 34.590, lng: 32.990, country: 'UK', type: 'UK SOF' },
];

const ANTI_SHIP_BATTERIES = [
  { name: 'Noor ASCM - Abu Musa', lat: 25.870, lng: 55.030, country: 'Iran', system: 'Noor (C-802)' },
  { name: 'Khalij Fars - Bandar Lengeh', lat: 26.560, lng: 54.880, country: 'Iran', system: 'Khalij Fars' },
  { name: 'IRGCN Jask Battery', lat: 25.640, lng: 57.770, country: 'Iran', system: 'Qader' },
  { name: 'Harpoon - Haifa', lat: 32.810, lng: 34.990, country: 'Israel', system: 'Harpoon' },
  { name: 'Houthi ASCM - Hodeidah', lat: 14.798, lng: 42.954, country: 'Yemen', system: 'C-802 variant' },
];

const CYBER_CENTERS = [
  { name: 'Unit 8200 HQ - Herzliya', lat: 32.162, lng: 34.775, country: 'Israel', type: 'SIGINT/Cyber' },
  { name: 'CyberCommand - Beersheba', lat: 31.264, lng: 34.800, country: 'Israel', type: 'Cyber Ops' },
  { name: 'IRGC Cyber HQ - Tehran', lat: 35.710, lng: 51.370, country: 'Iran', type: 'Offensive Cyber' },
  { name: 'NSA/CSS Georgia (Forward)', lat: 25.100, lng: 51.320, country: 'Qatar', type: 'US NSA' },
  { name: 'GCHQ Ayios Nikolaos', lat: 35.080, lng: 33.900, country: 'UK', type: 'SIGINT Station' },
];

const ELINT_SITES = [
  { name: 'Mt. Hermon SIGINT', lat: 33.415, lng: 35.858, country: 'Israel', type: 'ELINT/SIGINT' },
  { name: 'Urim SIGINT Base', lat: 31.320, lng: 34.430, country: 'Israel', type: 'SIGINT' },
  { name: 'Pine Gap Relay (Diego Garcia)', lat: -7.316, lng: 72.411, country: 'US/UK', type: 'Relay Station' },
  { name: 'Misawa Relay (Forward)', lat: 25.020, lng: 51.360, country: 'US', type: 'ELINT Forward' },
];

const AIRPORTS = [
  { name: 'Ben Gurion Intl (TLV)', lat: 32.011, lng: 34.887, country: 'Israel', type: 'International' },
  { name: 'Imam Khomeini Intl (IKA)', lat: 35.416, lng: 51.152, country: 'Iran', type: 'International' },
  { name: 'Beirut Rafic Hariri (BEY)', lat: 33.821, lng: 35.488, country: 'Lebanon', type: 'International' },
  { name: 'Dubai Intl (DXB)', lat: 25.253, lng: 55.365, country: 'UAE', type: 'International' },
  { name: 'King Khalid Intl (RUH)', lat: 24.958, lng: 46.699, country: 'Saudi Arabia', type: 'International' },
  { name: 'Queen Alia Intl (AMM)', lat: 31.723, lng: 35.993, country: 'Jordan', type: 'International' },
  { name: 'Hamad Intl (DOH)', lat: 25.261, lng: 51.565, country: 'Qatar', type: 'International' },
  { name: 'Baghdad Intl (BGW)', lat: 33.262, lng: 44.236, country: 'Iraq', type: 'International' },
];

const REFINERIES = [
  { name: 'Abadan Refinery', lat: 30.339, lng: 48.293, country: 'Iran', capacity: '400k bpd' },
  { name: 'Ras Tanura Refinery', lat: 26.632, lng: 50.093, country: 'Saudi Arabia', capacity: '550k bpd' },
  { name: 'Jubail Industrial', lat: 27.011, lng: 49.659, country: 'Saudi Arabia', capacity: '400k bpd' },
  { name: 'Ruwais Refinery', lat: 24.114, lng: 52.730, country: 'UAE', capacity: '837k bpd' },
  { name: 'Haifa Refinery', lat: 32.810, lng: 35.000, country: 'Israel', capacity: '197k bpd' },
  { name: 'Shuaiba Refinery', lat: 29.035, lng: 48.160, country: 'Kuwait', capacity: '200k bpd' },
  { name: 'Isfahan Refinery', lat: 32.630, lng: 51.650, country: 'Iran', capacity: '375k bpd' },
];

const PORTS = [
  { name: 'Jebel Ali Port', lat: 25.007, lng: 55.071, country: 'UAE', type: 'Commercial Mega-Port' },
  { name: 'Bandar Abbas Port', lat: 27.188, lng: 56.261, country: 'Iran', type: 'Naval/Commercial' },
  { name: 'Haifa Port', lat: 32.819, lng: 34.988, country: 'Israel', type: 'Commercial' },
  { name: 'Chabahar Port', lat: 25.296, lng: 60.643, country: 'Iran', type: 'Strategic Deep-Water' },
  { name: 'King Abdulaziz Port (Dammam)', lat: 26.480, lng: 50.200, country: 'Saudi Arabia', type: 'Commercial' },
  { name: 'Port of Fujairah', lat: 25.142, lng: 56.356, country: 'UAE', type: 'Oil Terminal' },
  { name: 'Duqm Port', lat: 19.670, lng: 57.712, country: 'Oman', type: 'Strategic/Naval' },
  { name: 'Tartus Naval Base', lat: 34.890, lng: 35.870, country: 'Syria', type: 'Russian Naval' },
];

const DESALINATION = [
  { name: 'Ras Al Khair Desal', lat: 27.148, lng: 49.271, country: 'Saudi Arabia', capacity: '1.025M m3/d' },
  { name: 'Sorek B Desalination', lat: 31.648, lng: 34.555, country: 'Israel', capacity: '200k m3/d' },
  { name: 'Jebel Ali Desal', lat: 25.060, lng: 55.090, country: 'UAE', capacity: '636k m3/d' },
  { name: 'Ashkelon Desalination', lat: 31.620, lng: 34.530, country: 'Israel', capacity: '118k m3/d' },
  { name: 'Jubail Desal Plant', lat: 26.960, lng: 49.610, country: 'Saudi Arabia', capacity: '800k m3/d' },
];

const POWER_PLANTS = [
  { name: 'Shoaiba Power Plant', lat: 20.680, lng: 39.510, country: 'Saudi Arabia', type: 'Oil/Gas 5600MW' },
  { name: 'Jebel Ali Power Station', lat: 25.040, lng: 55.100, country: 'UAE', type: 'Gas 8695MW' },
  { name: 'Orot Rabin Power Plant', lat: 32.420, lng: 34.875, country: 'Israel', type: 'Coal/Gas 2590MW' },
  { name: 'Montazeri Power Plant', lat: 32.630, lng: 51.640, country: 'Iran', type: 'Gas 2000MW' },
  { name: 'Barakah Nuclear Plant', lat: 23.960, lng: 52.260, country: 'UAE', type: 'Nuclear 5380MW' },
];

const TELECOM_HUBS = [
  { name: 'TelecomCity Jeddah (Landing)', lat: 21.500, lng: 39.170, country: 'Saudi Arabia', type: 'Cable Landing' },
  { name: 'Fujairah Cable Station', lat: 25.140, lng: 56.340, country: 'UAE', type: 'Cable Landing' },
  { name: 'Suez Canal Cable Hub', lat: 30.000, lng: 32.570, country: 'Egypt', type: 'Cable Junction' },
  { name: 'Bezeq Central - Tel Aviv', lat: 32.070, lng: 34.780, country: 'Israel', type: 'Telecom HQ' },
];

const REFUGEE_CAMPS = [
  { name: 'Zaatari Refugee Camp', lat: 32.293, lng: 36.323, country: 'Jordan', population: '80,000' },
  { name: 'Azraq Camp', lat: 31.842, lng: 36.838, country: 'Jordan', population: '42,000' },
  { name: 'Ain al-Hilweh', lat: 33.540, lng: 35.380, country: 'Lebanon', population: '55,000' },
  { name: 'Shatila Camp', lat: 33.860, lng: 35.500, country: 'Lebanon', population: '22,000' },
  { name: 'Domiz Camp', lat: 36.753, lng: 42.928, country: 'Iraq', population: '35,000' },
  { name: 'Dadaab Complex', lat: 0.056, lng: 40.335, country: 'Kenya', population: '230,000' },
];

const BORDER_CROSSINGS = [
  { name: 'Rafah Crossing', lat: 31.273, lng: 34.248, country: 'Egypt/Palestine', type: 'Major Land' },
  { name: 'Allenby Bridge', lat: 31.873, lng: 35.534, country: 'Jordan/Palestine', type: 'Major Land' },
  { name: 'Reyhanli/Bab al-Hawa', lat: 36.243, lng: 36.649, country: 'Turkey/Syria', type: 'Humanitarian' },
  { name: 'Chaman Crossing', lat: 30.917, lng: 66.445, country: 'Pakistan/Afghanistan', type: 'Major Land' },
  { name: 'Ibrahim Khalil', lat: 37.145, lng: 42.381, country: 'Iraq/Turkey', type: 'Commercial' },
  { name: 'Mandali Crossing', lat: 33.750, lng: 45.540, country: 'Iraq/Iran', type: 'Military/Commercial' },
];

const UN_POSITIONS = [
  { name: 'UNIFIL HQ - Naqoura', lat: 33.117, lng: 35.140, country: 'Lebanon', force: 'UNIFIL' },
  { name: 'UNDOF - Golan', lat: 33.130, lng: 35.850, country: 'Syria/Israel', force: 'UNDOF' },
  { name: 'UNTSO - Jerusalem', lat: 31.774, lng: 35.236, country: 'Israel', force: 'UNTSO' },
  { name: 'UNAMI - Baghdad', lat: 33.310, lng: 44.370, country: 'Iraq', force: 'UNAMI' },
  { name: 'UNDP Yemen - Aden', lat: 12.825, lng: 45.028, country: 'Yemen', force: 'UNDP' },
];

const HOSPITALS = [
  { name: 'Rambam Medical Center', lat: 32.832, lng: 34.990, country: 'Israel', type: 'Military Trauma' },
  { name: 'Shifa Hospital', lat: 31.520, lng: 34.440, country: 'Palestine', type: 'Major Medical' },
  { name: 'AUBMC - Beirut', lat: 33.900, lng: 35.480, country: 'Lebanon', type: 'Major Medical' },
  { name: 'Landstuhl Regional (Forward Evac)', lat: 25.350, lng: 51.440, country: 'Qatar', type: 'US Military Medical' },
  { name: 'King Fahd Military Hospital', lat: 24.700, lng: 46.740, country: 'Saudi Arabia', type: 'Military Hospital' },
];

const EMBASSIES = [
  { name: 'US Embassy - Baghdad', lat: 33.298, lng: 44.395, country: 'Iraq', type: 'US Embassy' },
  { name: 'US Embassy - Amman', lat: 31.953, lng: 35.930, country: 'Jordan', type: 'US Embassy' },
  { name: 'US Embassy - Beirut (Awkar)', lat: 33.920, lng: 35.560, country: 'Lebanon', type: 'US Embassy' },
  { name: 'Russian Embassy - Damascus', lat: 33.505, lng: 36.290, country: 'Syria', type: 'Russian Embassy' },
  { name: 'Iranian Embassy - Beirut', lat: 33.880, lng: 35.520, country: 'Lebanon', type: 'Iranian Embassy' },
  { name: 'Chinese Embassy - Riyadh', lat: 24.690, lng: 46.690, country: 'Saudi Arabia', type: 'Chinese Embassy' },
];

const PROXY_MILITIA = [
  { name: 'Hezbollah - Southern Suburb', lat: 33.852, lng: 35.512, country: 'Lebanon', group: 'Hezbollah' },
  { name: 'Hezbollah - South Lebanon', lat: 33.200, lng: 35.300, country: 'Lebanon', group: 'Hezbollah' },
  { name: 'PMF/Hashd HQ - Baghdad', lat: 33.320, lng: 44.360, country: 'Iraq', group: 'PMF (Hashd)' },
  { name: 'Kata\'ib Hezbollah - Jurf al-Sakhar', lat: 32.900, lng: 44.120, country: 'Iraq', group: "Kata'ib Hezbollah" },
  { name: 'Houthi HQ - Sanaa', lat: 15.369, lng: 44.191, country: 'Yemen', group: 'Ansar Allah (Houthi)' },
  { name: 'PIJ - Gaza', lat: 31.510, lng: 34.450, country: 'Palestine', group: 'Palestinian Islamic Jihad' },
  { name: 'Hamas Military Wing - Gaza', lat: 31.520, lng: 34.460, country: 'Palestine', group: 'Hamas (Izz ad-Din)' },
];

const TUNNEL_NETWORKS = [
  { name: 'Gaza Tunnel Complex (North)', lat: 31.540, lng: 34.500, country: 'Palestine', type: 'Hamas Cross-Border' },
  { name: 'Gaza Tunnel Complex (South)', lat: 31.270, lng: 34.260, country: 'Palestine', type: 'Smuggling/Military' },
  { name: 'Hezbollah Tunnel - Metula', lat: 33.280, lng: 35.580, country: 'Lebanon/Israel', type: 'Attack Tunnel' },
  { name: 'Fordow Underground Facility', lat: 34.880, lng: 51.575, country: 'Iran', type: 'Hardened Nuclear' },
  { name: 'Natanz Underground Halls', lat: 33.720, lng: 51.725, country: 'Iran', type: 'Hardened Enrichment' },
];

const EEZ_ZONES = [
  {
    name: 'Iran EEZ',
    color: [220, 50, 50, 40] as [number, number, number, number],
    borderColor: [220, 50, 50, 120] as [number, number, number, number],
    polygon: [[53.0, 25.0], [56.3, 26.5], [57.0, 25.4], [57.3, 24.0], [56.0, 22.0], [54.5, 22.5], [53.5, 23.5], [53.0, 25.0]] as [number, number][],
  },
  {
    name: 'Saudi Arabia EEZ',
    color: [34, 197, 94, 30] as [number, number, number, number],
    borderColor: [34, 197, 94, 100] as [number, number, number, number],
    polygon: [[50.5, 28.0], [50.0, 26.5], [50.2, 25.0], [50.8, 24.5], [51.0, 24.0], [50.5, 22.0], [49.0, 22.0], [48.5, 23.0], [48.8, 25.0], [49.5, 27.0], [50.5, 28.0]] as [number, number][],
  },
  {
    name: 'UAE EEZ',
    color: [59, 130, 246, 30] as [number, number, number, number],
    borderColor: [59, 130, 246, 100] as [number, number, number, number],
    polygon: [[52.0, 25.2], [54.0, 26.2], [55.5, 26.0], [56.3, 25.5], [56.0, 24.5], [55.0, 24.0], [54.0, 24.0], [53.0, 24.5], [52.0, 25.2]] as [number, number][],
  },
  {
    name: 'Oman EEZ',
    color: [168, 85, 247, 30] as [number, number, number, number],
    borderColor: [168, 85, 247, 100] as [number, number, number, number],
    polygon: [[56.5, 26.5], [57.5, 25.0], [59.5, 23.5], [59.8, 22.0], [58.5, 20.5], [57.0, 20.0], [56.0, 21.0], [55.0, 23.0], [56.0, 25.5], [56.5, 26.5]] as [number, number][],
  },
  {
    name: 'Kuwait EEZ',
    color: [250, 204, 21, 35] as [number, number, number, number],
    borderColor: [250, 204, 21, 110] as [number, number, number, number],
    polygon: [[48.0, 29.5], [48.5, 29.8], [49.0, 29.3], [48.8, 28.8], [48.3, 28.8], [48.0, 29.5]] as [number, number][],
  },
  {
    name: 'Qatar EEZ',
    color: [139, 92, 246, 30] as [number, number, number, number],
    borderColor: [139, 92, 246, 100] as [number, number, number, number],
    polygon: [[51.0, 26.2], [51.8, 26.5], [52.0, 25.8], [51.8, 24.8], [51.0, 24.5], [50.5, 25.0], [50.7, 25.8], [51.0, 26.2]] as [number, number][],
  },
  {
    name: 'Bahrain EEZ',
    color: [236, 72, 153, 35] as [number, number, number, number],
    borderColor: [236, 72, 153, 110] as [number, number, number, number],
    polygon: [[50.3, 26.3], [50.7, 26.4], [50.8, 26.0], [50.6, 25.8], [50.3, 25.9], [50.3, 26.3]] as [number, number][],
  },
  {
    name: 'Iraq EEZ',
    color: [245, 158, 11, 30] as [number, number, number, number],
    borderColor: [245, 158, 11, 100] as [number, number, number, number],
    polygon: [[47.8, 30.0], [48.5, 30.0], [48.8, 29.5], [48.5, 29.4], [47.8, 29.5], [47.8, 30.0]] as [number, number][],
  },
  {
    name: 'Yemen EEZ',
    color: [239, 68, 68, 25] as [number, number, number, number],
    borderColor: [239, 68, 68, 80] as [number, number, number, number],
    polygon: [[42.5, 12.5], [43.5, 12.8], [45.0, 13.0], [48.0, 14.0], [52.0, 16.5], [51.0, 14.0], [48.5, 12.0], [45.0, 11.5], [42.5, 12.5]] as [number, number][],
  },
  {
    name: 'Israel EEZ',
    color: [96, 165, 250, 30] as [number, number, number, number],
    borderColor: [96, 165, 250, 100] as [number, number, number, number],
    polygon: [[34.0, 33.3], [34.8, 33.5], [34.8, 31.5], [34.3, 31.2], [33.5, 31.5], [33.5, 33.0], [34.0, 33.3]] as [number, number][],
  },
  {
    name: 'Lebanon EEZ',
    color: [16, 185, 129, 30] as [number, number, number, number],
    borderColor: [16, 185, 129, 100] as [number, number, number, number],
    polygon: [[35.1, 34.7], [35.5, 34.7], [35.0, 34.0], [34.5, 33.8], [34.0, 33.5], [34.0, 34.2], [35.1, 34.7]] as [number, number][],
  },
  {
    name: 'Egypt EEZ (Red Sea)',
    color: [245, 158, 11, 25] as [number, number, number, number],
    borderColor: [245, 158, 11, 80] as [number, number, number, number],
    polygon: [[33.5, 28.0], [35.0, 28.5], [36.5, 27.5], [37.5, 24.0], [36.0, 22.0], [35.0, 22.5], [34.0, 24.0], [33.5, 28.0]] as [number, number][],
  },
];

const OIL_GAS_FIELDS = [
  { name: 'Ghawar Oil Field', lat: 25.400, lng: 49.200, country: 'Saudi Arabia', type: 'Oil (Largest)' },
  { name: 'South Pars / North Dome', lat: 26.000, lng: 52.000, country: 'Iran/Qatar', type: 'Gas (Largest)' },
  { name: 'Burgan Oil Field', lat: 28.900, lng: 47.950, country: 'Kuwait', type: 'Oil' },
  { name: 'Rumaila Oil Field', lat: 30.450, lng: 47.350, country: 'Iraq', type: 'Oil' },
  { name: 'Tamar Gas Field', lat: 32.600, lng: 33.600, country: 'Israel', type: 'Offshore Gas' },
  { name: 'Leviathan Gas Field', lat: 32.900, lng: 33.300, country: 'Israel', type: 'Offshore Gas' },
  { name: 'Kirkuk Oil Field', lat: 35.400, lng: 44.400, country: 'Iraq', type: 'Oil' },
  { name: 'Marun Oil Field', lat: 31.350, lng: 49.500, country: 'Iran', type: 'Oil' },
];

const SUPPLY_ROUTES = [
  {
    name: 'Iran-Syria Arms Corridor',
    color: [220, 50, 50] as [number, number, number],
    path: [[51.4, 35.7], [48.0, 34.0], [45.0, 34.0], [42.0, 34.5], [38.0, 34.0], [36.3, 33.9]],
  },
  {
    name: 'US Central Logistics (Kuwait-Iraq)',
    color: [50, 150, 250] as [number, number, number],
    path: [[47.9, 29.3], [47.0, 30.5], [45.5, 32.0], [44.4, 33.3]],
  },
  {
    name: 'Houthi Supply Line (Iran-Yemen)',
    color: [200, 80, 200] as [number, number, number],
    path: [[57.0, 25.5], [55.0, 22.0], [50.0, 18.0], [45.0, 15.5], [44.2, 15.3]],
  },
];

const SHIPPING_LANES = [
  {
    name: 'Strait of Hormuz TSS',
    color: [0, 180, 230] as [number, number, number],
    path: [[56.1, 25.8], [56.3, 26.2], [56.5, 26.5], [56.6, 26.8], [56.7, 27.1], [56.5, 27.5]],
  },
  {
    name: 'Bab el-Mandeb Strait TSS',
    color: [0, 180, 230] as [number, number, number],
    path: [[43.0, 12.3], [43.3, 12.5], [43.5, 12.8], [43.2, 13.2]],
  },
  {
    name: 'Suez Canal Approach',
    color: [0, 180, 230] as [number, number, number],
    path: [[32.3, 31.3], [32.4, 31.0], [32.5, 30.5], [32.6, 30.0], [32.5, 29.9]],
  },
];

const NO_FLY_ZONES = [
  {
    name: 'Damascus TFR',
    color: [255, 60, 60] as [number, number, number],
    path: [[36.0, 33.7], [36.6, 33.7], [36.6, 33.3], [36.0, 33.3], [36.0, 33.7]],
  },
  {
    name: 'Dimona Restricted Airspace',
    color: [255, 60, 60] as [number, number, number],
    path: [[35.0, 31.2], [35.4, 31.2], [35.4, 30.9], [35.0, 30.9], [35.0, 31.2]],
  },
  {
    name: 'Natanz P-57 TFR',
    color: [255, 60, 60] as [number, number, number],
    path: [[51.5, 33.9], [52.0, 33.9], [52.0, 33.5], [51.5, 33.5], [51.5, 33.9]],
  },
];

type LayerKey =
  | 'events'
  | 'flights'
  | 'ships'
  | 'adsbFlights'
  | 'missileLines'
  | 'animatedArcs'
  | 'heatmap'
  | 'hormuzStrait'
  | 'militaryBases'
  | 'nuclearFacilities'
  | 'airDefense'
  | 'underseaCables'
  | 'pipelines'
  | 'droneBases'
  | 'commandCenters'
  | 'radarSites'
  | 'ballisticSites'
  | 'armsDepots'
  | 'specialForces'
  | 'antiShipBatteries'
  | 'cyberCenters'
  | 'elintSites'
  | 'airports'
  | 'refineries'
  | 'ports'
  | 'desalination'
  | 'powerPlants'
  | 'telecomHubs'
  | 'oilGasFields'
  | 'refugeeCamps'
  | 'borderCrossings'
  | 'unPositions'
  | 'hospitals'
  | 'embassies'
  | 'proxyMilitia'
  | 'tunnelNetworks'
  | 'eezBoundaries'
  | 'supplyRoutes'
  | 'shippingLanes'
  | 'noFlyZones'
  | 'satelliteThermal'
  | 'thermalHeatmap'
  | 'alertHeatmap';

const MISSILE_TRAJECTORIES = [
  { id: 'traj-1', source: [51.4, 35.7], target: [34.8, 32.1], label: 'Tehran > Tel Aviv', type: 'ballistic' },
  { id: 'traj-2', source: [48.4, 33.5], target: [34.6, 31.5], label: 'W.Iraq > Beersheva', type: 'cruise' },
  { id: 'traj-3', source: [44.2, 15.4], target: [34.9, 29.6], label: 'Sanaa > Eilat', type: 'ballistic' },
  { id: 'traj-4', source: [35.5, 33.9], target: [35.0, 32.8], label: 'S.Lebanon > Haifa', type: 'rocket' },
  { id: 'traj-5', source: [34.5, 31.5], target: [34.8, 31.7], label: 'Gaza > Ashkelon', type: 'rocket' },
  { id: 'traj-6', source: [47.1, 34.0], target: [44.4, 33.3], label: 'W.Iran > Baghdad', type: 'cruise' },
  { id: 'traj-7', source: [56.3, 27.2], target: [54.4, 24.5], label: 'Hormuz > Abu Dhabi', type: 'cruise' },
  { id: 'traj-8', source: [42.5, 14.8], target: [43.3, 12.6], label: 'Houthi > Bab el-Mandeb', type: 'antiship' },
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LayerConfig {
  key: LayerKey;
  label: string;
  color: string;
  defaultOn: boolean;
  group: string;
}

const LAYER_GROUPS = [
  { id: 'operational', label: 'OPERATIONAL', color: '#ef4444' },
  { id: 'military', label: 'MILITARY', color: '#3b82f6' },
  { id: 'strategic', label: 'STRATEGIC', color: '#a855f7' },
  { id: 'infrastructure', label: 'INFRASTRUCTURE', color: '#f59e0b' },
  { id: 'linear', label: 'ROUTES & ZONES', color: '#06b6d4' },
  { id: 'humanitarian', label: 'HUMANITARIAN', color: '#22c55e' },
  { id: 'threat', label: 'THREAT ACTORS', color: '#f43f5e' },
  { id: 'maritime', label: 'MARITIME', color: '#0ea5e9' },
  { id: 'satellite', label: 'SATELLITE', color: '#ff6b35' },
];

const LAYER_CONFIGS: LayerConfig[] = [
  { key: 'events', label: 'Conflict Events', color: '#ef4444', defaultOn: true, group: 'operational' },
  { key: 'flights', label: 'Flight Tracks', color: '#22d3ee', defaultOn: true, group: 'operational' },
  { key: 'ships', label: 'Ship Tracks', color: '#3b82f6', defaultOn: true, group: 'operational' },
  { key: 'adsbFlights', label: 'ADS-B Flights', color: '#06b6d4', defaultOn: false, group: 'operational' },
  { key: 'missileLines', label: 'Missile Trajectories', color: '#ef4444', defaultOn: true, group: 'operational' },
  { key: 'animatedArcs', label: 'Animated Missile Arcs', color: '#f43f5e', defaultOn: false, group: 'operational' },
  { key: 'heatmap', label: 'Threat Heat Map', color: '#fbbf24', defaultOn: false, group: 'operational' },
  { key: 'hormuzStrait', label: 'Strait of Hormuz', color: '#f97316', defaultOn: true, group: 'operational' },

  { key: 'militaryBases', label: 'Military Bases', color: '#3b82f6', defaultOn: false, group: 'military' },
  { key: 'droneBases', label: 'Drone/UAV Bases', color: '#818cf8', defaultOn: false, group: 'military' },
  { key: 'commandCenters', label: 'Command Centers', color: '#f472b6', defaultOn: false, group: 'military' },
  { key: 'specialForces', label: 'Special Forces', color: '#a78bfa', defaultOn: false, group: 'military' },
  { key: 'radarSites', label: 'Radar/EW Stations', color: '#34d399', defaultOn: false, group: 'military' },
  { key: 'armsDepots', label: 'Arms Depots', color: '#fb923c', defaultOn: false, group: 'military' },

  { key: 'nuclearFacilities', label: 'Nuclear Facilities', color: '#a855f7', defaultOn: false, group: 'strategic' },
  { key: 'ballisticSites', label: 'Ballistic Missile Sites', color: '#f43f5e', defaultOn: false, group: 'strategic' },
  { key: 'airDefense', label: 'Air Defense Systems', color: '#22d3ee', defaultOn: false, group: 'strategic' },
  { key: 'antiShipBatteries', label: 'Anti-Ship Batteries', color: '#fb7185', defaultOn: false, group: 'strategic' },
  { key: 'cyberCenters', label: 'Cyber/SIGINT Centers', color: '#2dd4bf', defaultOn: false, group: 'strategic' },
  { key: 'elintSites', label: 'ELINT Stations', color: '#38bdf8', defaultOn: false, group: 'strategic' },

  { key: 'airports', label: 'Airports', color: '#94a3b8', defaultOn: false, group: 'infrastructure' },
  { key: 'refineries', label: 'Refineries', color: '#f59e0b', defaultOn: false, group: 'infrastructure' },
  { key: 'ports', label: 'Ports', color: '#60a5fa', defaultOn: false, group: 'infrastructure' },
  { key: 'desalination', label: 'Desalination Plants', color: '#67e8f9', defaultOn: false, group: 'infrastructure' },
  { key: 'powerPlants', label: 'Power Plants', color: '#fbbf24', defaultOn: false, group: 'infrastructure' },
  { key: 'telecomHubs', label: 'Telecom/Cable Hubs', color: '#a3e635', defaultOn: false, group: 'infrastructure' },
  { key: 'oilGasFields', label: 'Oil/Gas Fields', color: '#ca8a04', defaultOn: false, group: 'infrastructure' },

  { key: 'underseaCables', label: 'Undersea Cables', color: '#06b6d4', defaultOn: false, group: 'linear' },
  { key: 'pipelines', label: 'Pipelines', color: '#ca8a04', defaultOn: false, group: 'linear' },
  { key: 'supplyRoutes', label: 'Supply Routes', color: '#ef4444', defaultOn: false, group: 'linear' },
  { key: 'shippingLanes', label: 'Shipping Lanes', color: '#0ea5e9', defaultOn: false, group: 'linear' },
  { key: 'noFlyZones', label: 'No-Fly Zones', color: '#ef4444', defaultOn: false, group: 'linear' },

  { key: 'refugeeCamps', label: 'Refugee Camps', color: '#22c55e', defaultOn: false, group: 'humanitarian' },
  { key: 'borderCrossings', label: 'Border Crossings', color: '#facc15', defaultOn: false, group: 'humanitarian' },
  { key: 'unPositions', label: 'UN Positions', color: '#60a5fa', defaultOn: false, group: 'humanitarian' },
  { key: 'hospitals', label: 'Hospitals', color: '#f87171', defaultOn: false, group: 'humanitarian' },
  { key: 'embassies', label: 'Embassies', color: '#c084fc', defaultOn: false, group: 'humanitarian' },

  { key: 'proxyMilitia', label: 'Proxy Militias', color: '#f43f5e', defaultOn: false, group: 'threat' },
  { key: 'tunnelNetworks', label: 'Tunnel Networks', color: '#a3a3a3', defaultOn: false, group: 'threat' },

  { key: 'eezBoundaries', label: 'EEZ Boundaries', color: '#0ea5e9', defaultOn: false, group: 'maritime' },

  { key: 'satelliteThermal', label: 'Thermal Hotspots', color: '#ff6b35', defaultOn: false, group: 'satellite' },
  { key: 'thermalHeatmap', label: 'Thermal Heat Map', color: '#ff3300', defaultOn: false, group: 'satellite' },

  { key: 'alertHeatmap', label: 'Alert Density Map', color: '#dc2626', defaultOn: false, group: 'operational' },
];

interface SearchItem {
  name: string;
  lat: number;
  lng: number;
  category: string;
  detail: string;
}

const SEARCH_CATEGORY_ICONS: Record<string, string> = {
  'Military Base': 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
  'Nuclear Facility': 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  'Air Defense': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'Drone Base': 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'Command Center': 'M3 3h18v18H3z M3 9h18 M9 21V9',
  'Radar Site': 'M2 12a10 10 0 0 1 10-10 M2 12a10 10 0 0 0 10 10 M12 2v20',
  'Ballistic Site': 'M12 19V5 M5 12l7-7 7 7',
  'Arms Depot': 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  'Special Forces': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'Anti-Ship Battery': 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3',
  'Cyber Center': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
  'ELINT Site': 'M2 12a10 10 0 0 1 10-10',
  'Airport': 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l6.5 3.8-2.9 2.9L5 14c-.4 0-.8.2-1 .5l-.2.3c-.2.3-.1.8.2 1l3.2 2.2 2.2 3.2c.2.3.7.4 1 .2l.3-.2c.3-.2.5-.6.5-1l-.5-2.3 2.9-2.9 3.8 6.5c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z',
  'Refinery': 'M14 2v6.172a2 2 0 0 0 .586 1.414l5.71 5.71a.5.5 0 0 1-.354.854H4.058a.5.5 0 0 1-.354-.854l5.71-5.71A2 2 0 0 0 10 8.172V2',
  'Port': 'M22 17H2 M6 17V3 M10 17V9 M14 17V5 M18 17V9',
  'Desalination': 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  'Power Plant': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  'Telecom Hub': 'M2 12h6 M14 12h6 M12 2v6 M12 14v6',
  'Oil/Gas Field': 'M14 2v6.172a2 2 0 0 0 .586 1.414l5.71 5.71a.5.5 0 0 1-.354.854H4.058',
  'Refugee Camp': 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  'Border Crossing': 'M18 6L6 18 M6 6l12 12',
  'UN Position': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'Hospital': 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'Embassy': 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
  'Proxy Militia': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'Tunnel Network': 'M12 22V8 M5 12H2a10 10 0 0 1 20 0h-3',
  'Conflict Event': 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  'Default': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
};

const SEARCH_CATEGORY_COLORS: Record<string, string> = {
  'Military Base': '#3b82f6',
  'Nuclear Facility': '#a855f7',
  'Air Defense': '#22d3ee',
  'Drone Base': '#818cf8',
  'Command Center': '#f472b6',
  'Radar Site': '#34d399',
  'Ballistic Site': '#f43f5e',
  'Arms Depot': '#fb923c',
  'Special Forces': '#a78bfa',
  'Anti-Ship Battery': '#fb7185',
  'Cyber Center': '#2dd4bf',
  'ELINT Site': '#38bdf8',
  'Airport': '#94a3b8',
  'Refinery': '#f59e0b',
  'Port': '#60a5fa',
  'Desalination': '#67e8f9',
  'Power Plant': '#fbbf24',
  'Telecom Hub': '#a3e635',
  'Oil/Gas Field': '#ca8a04',
  'Refugee Camp': '#22c55e',
  'Border Crossing': '#facc15',
  'UN Position': '#60a5fa',
  'Hospital': '#f87171',
  'Embassy': '#c084fc',
  'Proxy Militia': '#f43f5e',
  'Tunnel Network': '#a3a3a3',
  'Conflict Event': '#ef4444',
  'Default': '#9ca3af',
};

function buildSearchIndex(events: ConflictEvent[], redAlerts: RedAlert[]): SearchItem[] {
  const items: SearchItem[] = [];

  for (const b of MILITARY_BASES) items.push({ name: b.name, lat: b.lat, lng: b.lng, category: 'Military Base', detail: `${b.operator} - ${b.country}` });
  for (const n of NUCLEAR_FACILITIES) items.push({ name: n.name, lat: n.lat, lng: n.lng, category: 'Nuclear Facility', detail: `${n.type} - ${n.country}` });
  for (const a of AIR_DEFENSE) items.push({ name: a.name, lat: a.lat, lng: a.lng, category: 'Air Defense', detail: `${a.system} - ${a.country}` });
  for (const d of DRONE_BASES) items.push({ name: d.name, lat: d.lat, lng: d.lng, category: 'Drone Base', detail: `${d.type} - ${d.country}` });
  for (const c of COMMAND_CENTERS) items.push({ name: c.name, lat: c.lat, lng: c.lng, category: 'Command Center', detail: `${c.type} - ${c.country}` });
  for (const r of RADAR_SITES) items.push({ name: r.name, lat: r.lat, lng: r.lng, category: 'Radar Site', detail: `${r.system} - ${r.country}` });
  for (const b of BALLISTIC_SITES) items.push({ name: b.name, lat: b.lat, lng: b.lng, category: 'Ballistic Site', detail: `${b.type} - ${b.country}` });
  for (const a of ARMS_DEPOTS) items.push({ name: a.name, lat: a.lat, lng: a.lng, category: 'Arms Depot', detail: `${a.type} - ${a.country}` });
  for (const s of SPECIAL_FORCES) items.push({ name: s.name, lat: s.lat, lng: s.lng, category: 'Special Forces', detail: `${s.type} - ${s.country}` });
  for (const a of ANTI_SHIP_BATTERIES) items.push({ name: a.name, lat: a.lat, lng: a.lng, category: 'Anti-Ship Battery', detail: `${a.system} - ${a.country}` });
  for (const c of CYBER_CENTERS) items.push({ name: c.name, lat: c.lat, lng: c.lng, category: 'Cyber Center', detail: `${c.type} - ${c.country}` });
  for (const e of ELINT_SITES) items.push({ name: e.name, lat: e.lat, lng: e.lng, category: 'ELINT Site', detail: `${e.type} - ${e.country}` });
  for (const a of AIRPORTS) items.push({ name: a.name, lat: a.lat, lng: a.lng, category: 'Airport', detail: `${a.type} - ${a.country}` });
  for (const r of REFINERIES) items.push({ name: r.name, lat: r.lat, lng: r.lng, category: 'Refinery', detail: `${r.capacity} - ${r.country}` });
  for (const p of PORTS) items.push({ name: p.name, lat: p.lat, lng: p.lng, category: 'Port', detail: `${p.type} - ${p.country}` });
  for (const d of DESALINATION) items.push({ name: d.name, lat: d.lat, lng: d.lng, category: 'Desalination', detail: `${d.capacity} - ${d.country}` });
  for (const p of POWER_PLANTS) items.push({ name: p.name, lat: p.lat, lng: p.lng, category: 'Power Plant', detail: `${p.type} - ${p.country}` });
  for (const t of TELECOM_HUBS) items.push({ name: t.name, lat: t.lat, lng: t.lng, category: 'Telecom Hub', detail: `${t.type} - ${t.country}` });
  for (const o of OIL_GAS_FIELDS) items.push({ name: o.name, lat: o.lat, lng: o.lng, category: 'Oil/Gas Field', detail: `${o.type} - ${o.country}` });
  for (const r of REFUGEE_CAMPS) items.push({ name: r.name, lat: r.lat, lng: r.lng, category: 'Refugee Camp', detail: `Pop: ${r.population} - ${r.country}` });
  for (const b of BORDER_CROSSINGS) items.push({ name: b.name, lat: b.lat, lng: b.lng, category: 'Border Crossing', detail: `${b.type} - ${b.country}` });
  for (const u of UN_POSITIONS) items.push({ name: u.name, lat: u.lat, lng: u.lng, category: 'UN Position', detail: `${u.force} - ${u.country}` });
  for (const h of HOSPITALS) items.push({ name: h.name, lat: h.lat, lng: h.lng, category: 'Hospital', detail: `${h.type} - ${h.country}` });
  for (const e of EMBASSIES) items.push({ name: e.name, lat: e.lat, lng: e.lng, category: 'Embassy', detail: `${e.type} - ${e.country}` });
  for (const p of PROXY_MILITIA) items.push({ name: p.name, lat: p.lat, lng: p.lng, category: 'Proxy Militia', detail: `${p.group} - ${p.country}` });
  for (const t of TUNNEL_NETWORKS) items.push({ name: t.name, lat: t.lat, lng: t.lng, category: 'Tunnel Network', detail: `${t.type} - ${t.country}` });

  for (const ev of events) {
    items.push({ name: ev.title, lat: ev.lat, lng: ev.lng, category: 'Conflict Event', detail: `${ev.type} - ${ev.severity}` });
  }
  for (const ra of redAlerts) {
    items.push({ name: `Red Alert: ${ra.city}`, lat: ra.lat, lng: ra.lng, category: 'Conflict Event', detail: `${ra.threatType} - ${ra.country}` });
  }

  return items;
}

interface TooltipInfo {
  x: number;
  y: number;
  text: string;
  detail?: string;
}

interface MeasurePoint {
  lng: number;
  lat: number;
}

interface ConflictMapProps {
  events: ConflictEvent[];
  flights: FlightData[];
  ships: ShipData[];
  adsbFlights?: AdsbFlight[];
  redAlerts?: RedAlert[];
  thermalHotspots?: ThermalHotspot[];
  activeView: 'conflict' | 'flights' | 'maritime';
  language?: 'en' | 'ar';
  mapStyle?: string;
}

export default function ConflictMap({ events, flights, ships, adsbFlights = [], redAlerts = [], thermalHotspots = [], activeView, language = 'en', mapStyle = MAP_STYLE }: ConflictMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const isMountedStyle = useRef(true);

  const [viewState, setViewState] = useState<ViewState>(VIEW_CONFIG[activeView]);
  const [isGlobe, setIsGlobe] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const cfg of LAYER_CONFIGS) {
      state[cfg.key] = cfg.defaultOn;
    }
    return state as Record<LayerKey, boolean>;
  });
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const g: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(lg => { g[lg.id] = lg.id === 'operational'; });
    return g;
  });
  const [mapToolsOpen, setMapToolsOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureCenter, setMeasureCenter] = useState<MeasurePoint | null>(null);
  const [measureCursor, setMeasureCursor] = useState<MeasurePoint | null>(null);
  const [arcTime, setArcTime] = useState(0);
  const arcAnimRef = useRef<number>(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1);
  const [highlightedPoint, setHighlightedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightPulse, setHighlightPulse] = useState(0);
  const highlightAnimRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(() => buildSearchIndex(events, redAlerts), [events, redAlerts]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches: SearchItem[] = [];
    for (const item of searchIndex) {
      if (matches.length >= 8) break;
      if (item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)) {
        matches.push(item);
      }
    }
    return matches;
  }, [searchQuery, searchIndex]);

  const selectSearchResult = useCallback((item: SearchItem) => {
    setViewState({
      longitude: item.lng,
      latitude: item.lat,
      zoom: 10,
      pitch: 0,
      bearing: 0,
    });
    setHighlightedPoint({ lat: item.lat, lng: item.lng });
    setSearchQuery('');
    setSearchOpen(false);
    setSearchActiveIndex(-1);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchActiveIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && searchActiveIndex >= 0 && searchActiveIndex < searchResults.length) {
      e.preventDefault();
      selectSearchResult(searchResults[searchActiveIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
      setSearchActiveIndex(-1);
      searchInputRef.current?.blur();
    }
  }, [searchResults, searchActiveIndex, selectSearchResult]);

  useEffect(() => {
    if (!highlightedPoint) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      setHighlightPulse(t => (t + 0.02) % 1);
      highlightAnimRef.current = requestAnimationFrame(animate);
    };
    highlightAnimRef.current = requestAnimationFrame(animate);
    const timeout = setTimeout(() => {
      setHighlightedPoint(null);
    }, 8000);
    return () => {
      running = false;
      cancelAnimationFrame(highlightAnimRef.current);
      clearTimeout(timeout);
    };
  }, [highlightedPoint]);

  useEffect(() => {
    const vs = VIEW_CONFIG[activeView];
    setViewState(vs);
  }, [activeView]);

  useEffect(() => {
    if (!layerVisibility.animatedArcs) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      setArcTime(t => (t + 0.005) % 1);
      arcAnimRef.current = requestAnimationFrame(animate);
    };
    arcAnimRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(arcAnimRef.current);
    };
  }, [layerVisibility.animatedArcs]);

  const measureDistance = useMemo(() => {
    if (!measureCenter || !measureCursor) return null;
    return haversineDistance(measureCenter.lat, measureCenter.lng, measureCursor.lat, measureCursor.lng);
  }, [measureCenter, measureCursor]);

  const toggleMeasureMode = useCallback(() => {
    setMeasureMode(prev => {
      if (prev) {
        setMeasureCenter(null);
        setMeasureCursor(null);
      }
      return !prev;
    });
  }, []);

  const handleMapClick = useCallback((info: { coordinate?: number[]; object?: Record<string, unknown>; layer?: { id: string }; x: number; y: number }) => {
    if (measureMode && info.coordinate) {
      const [lng, lat] = info.coordinate;
      if (!measureCenter) {
        setMeasureCenter({ lng, lat });
        setMeasureCursor({ lng, lat });
      } else {
        setMeasureCenter(null);
        setMeasureCursor(null);
      }
      return;
    }
    if (info.object && info.layer) {
      const obj = info.object as Record<string, unknown>;
      let text = '';
      let detail = '';
      const layerId = info.layer.id;

      if (layerId === 'events-layer') {
        const e = obj as unknown as ConflictEvent;
        text = language === 'ar' && e.titleAr ? e.titleAr : e.title;
        detail = `${e.type} | ${e.severity}`;
      } else if (layerId === 'flights-layer') {
        const f = obj as unknown as FlightData;
        text = f.callsign;
        detail = `${f.type} | Alt: ${f.altitude}ft | ${f.speed}kts`;
      } else if (layerId === 'ships-layer') {
        const s = obj as unknown as ShipData;
        text = s.name;
        detail = `${s.type} | ${s.flag} | ${s.speed}kts`;
      } else if (layerId === 'adsb-layer') {
        text = `${obj.callsign} (${obj.hex})`;
        detail = `${obj.aircraft} | ${obj.country} | ${obj.altitude}ft`;
      } else {
        text = (obj.name as string) || '';
        const detailParts = [obj.type || obj.system || obj.capacity, obj.operator || obj.group || obj.force, obj.country].filter(Boolean);
        detail = detailParts.join(' | ');
      }

      if (text) {
        setTooltip(prev => prev?.text === text ? null : { x: info.x, y: info.y, text, detail });
      }
    } else {
      setTooltip(null);
    }
  }, [measureMode, measureCenter, language]);

  const handleMapHover = useCallback((info: { coordinate?: number[] }) => {
    if (measureMode && measureCenter && info.coordinate) {
      const [lng, lat] = info.coordinate;
      setMeasureCursor({ lng, lat });
    }
  }, [measureMode, measureCenter]);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const map = new MapLibreMap({
        container: containerRef.current,
        style: mapStyle,
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        pitch: viewState.pitch,
        bearing: viewState.bearing,
        interactive: false,
        attributionControl: false,
      });

      map.on('style.load', () => {
        const layers = map.getStyle()?.layers || [];
        for (const layer of layers) {
          if (layer.id.includes('boundary') || layer.id.includes('border') || layer.id.includes('admin')) {
            try {
              if (layer.type === 'line') {
                map.setPaintProperty(layer.id, 'line-opacity', 0.7);
                map.setPaintProperty(layer.id, 'line-color', '#556677');
              }
            } catch {}
          }
          if (layer.id.includes('water') && layer.type === 'fill') {
            try {
              map.setPaintProperty(layer.id, 'fill-color', '#0d1b2a');
            } catch {}
          }
          if (layer.type === 'background') {
            try {
              map.setPaintProperty(layer.id, 'background-color', '#0a0e17');
            } catch {}
          }
          if (layer.id.includes('landcover') || layer.id.includes('landuse')) {
            try {
              if (layer.type === 'fill') {
                map.setPaintProperty(layer.id, 'fill-opacity', 0.15);
              }
            } catch {}
          }
        }
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch {
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMountedStyle.current) { isMountedStyle.current = false; return; }
    if (!mapRef.current) return;
    mapRef.current.setStyle(mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
    });
  }, [viewState]);

  const handleHover = useCallback((info: { x: number; y: number; object?: Record<string, unknown>; layer?: { id: string } }) => {
    if (info.object && info.layer) {
      const obj = info.object as Record<string, unknown>;
      let text = '';
      let detail = '';
      const layerId = info.layer.id;

      if (layerId === 'events-layer') {
        const e = obj as unknown as ConflictEvent;
        text = language === 'ar' && e.titleAr ? e.titleAr : e.title;
        detail = `${e.type} | ${e.severity}`;
      } else if (layerId === 'flights-layer') {
        const f = obj as unknown as FlightData;
        text = f.callsign;
        detail = `${f.type} | Alt: ${f.altitude}ft | ${f.speed}kts`;
      } else if (layerId === 'ships-layer') {
        const s = obj as unknown as ShipData;
        text = s.name;
        detail = `${s.type} | ${s.flag} | ${s.speed}kts`;
      } else if (layerId === 'military-bases-layer') {
        text = obj.name as string;
        detail = `${obj.operator} | ${obj.country}`;
      } else if (layerId === 'nuclear-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'air-defense-layer') {
        text = obj.name as string;
        detail = `${obj.system} | ${obj.country}`;
      } else if (layerId === 'adsb-layer') {
        text = `${obj.callsign} (${obj.hex})`;
        detail = `${obj.aircraft} | ${obj.country} | ${obj.altitude}ft`;
      } else if (layerId === 'drone-bases-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'command-centers-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'radar-sites-layer') {
        text = obj.name as string;
        detail = `${obj.system} | ${obj.country}`;
      } else if (layerId === 'ballistic-sites-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'arms-depots-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'special-forces-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'anti-ship-layer') {
        text = obj.name as string;
        detail = `${obj.system} | ${obj.country}`;
      } else if (layerId === 'cyber-centers-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'elint-sites-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'airports-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'refineries-layer') {
        text = obj.name as string;
        detail = `${obj.capacity} | ${obj.country}`;
      } else if (layerId === 'ports-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'desal-layer') {
        text = obj.name as string;
        detail = `${obj.capacity} | ${obj.country}`;
      } else if (layerId === 'power-plants-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'telecom-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'oil-gas-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'refugee-camps-layer') {
        text = obj.name as string;
        detail = `Pop: ${obj.population} | ${obj.country}`;
      } else if (layerId === 'border-crossings-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'un-positions-layer') {
        text = obj.name as string;
        detail = `${obj.force} | ${obj.country}`;
      } else if (layerId === 'hospitals-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'embassies-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'proxy-militia-layer') {
        text = obj.name as string;
        detail = `${obj.group} | ${obj.country}`;
      } else if (layerId === 'tunnel-networks-layer') {
        text = obj.name as string;
        detail = `${obj.type} | ${obj.country}`;
      } else if (layerId === 'eez-boundaries-layer') {
        text = obj.name as string;
        detail = 'Exclusive Economic Zone';
      } else if (layerId === 'animated-arcs-layer') {
        text = obj.label as string;
        detail = `${obj.type} trajectory`;
      }

      if (text) {
        setTooltip({ x: info.x, y: info.y, text, detail });
      } else {
        setTooltip(null);
      }
    } else {
      setTooltip(null);
    }
    handleMapHover(info as { coordinate?: number[] });
  }, [language, handleMapHover]);

  const onViewStateChange = useCallback(({ viewState: vs }: { viewState: ViewState }) => {
    setViewState(vs);
  }, []);

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayerVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const toggleAllInGroup = useCallback((groupId: string, on: boolean) => {
    setLayerVisibility(prev => {
      const next = { ...prev };
      LAYER_CONFIGS.filter(c => c.group === groupId).forEach(c => { next[c.key] = on; });
      return next;
    });
  }, []);

  const setRegion = useCallback((region: keyof typeof REGION_PRESETS) => {
    const preset = REGION_PRESETS[region];
    if (preset) setViewState(preset);
  }, []);

  const toggleGlobe = useCallback(() => {
    setIsGlobe(prev => {
      const next = !prev;
      setViewState(vs => ({
        ...vs,
        pitch: next ? 45 : 0,
        bearing: next ? -15 : 0,
      }));
      return next;
    });
  }, []);

  const activeLayerCount = useMemo(() => {
    return Object.values(layerVisibility).filter(Boolean).length;
  }, [layerVisibility]);

  const heatmapData = useMemo(() => {
    const points: { position: [number, number]; weight: number }[] = [];
    for (const e of events) {
      const w = e.severity === 'critical' ? 10 : e.severity === 'high' ? 7 : e.severity === 'medium' ? 4 : 2;
      points.push({ position: [e.lng, e.lat], weight: w });
    }
    for (const a of redAlerts) {
      const w = a.threatType === 'missiles' ? 8 : a.threatType === 'rockets' ? 6 : 4;
      points.push({ position: [a.lng, a.lat], weight: w });
    }
    return points;
  }, [events, redAlerts]);

  const alertHeatmapData = useMemo(() => {
    const now = Date.now();
    return redAlerts.map(a => {
      const age = now - new Date(a.timestamp).getTime();
      const recencyWeight = Math.max(0.2, 1 - age / (3600000 * 6));
      const severityWeight = a.threatType === 'missiles' ? 10 : a.threatType === 'rockets' ? 8 : a.threatType === 'hostile_aircraft_intrusion' ? 7 : 5;
      return { position: [a.lng, a.lat] as [number, number], weight: severityWeight * recencyWeight };
    });
  }, [redAlerts]);

  const layers = useMemo(() => {
    const result: any[] = [];

    if (layerVisibility.events) {
      result.push(
        new ScatterplotLayer({
          id: 'events-layer',
          data: events,
          getPosition: (d: ConflictEvent) => [d.lng, d.lat],
          getRadius: (d: ConflictEvent) => (SEVERITY_RADIUS[d.severity] || 7) * 800,
          getFillColor: (d: ConflictEvent) => [...(EVENT_COLORS[d.type] || [239, 68, 68]), 120] as [number, number, number, number],
          getLineColor: (d: ConflictEvent) => [...(EVENT_COLORS[d.type] || [239, 68, 68]), 200] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          pickable: true,
        })
      );
    }

    if (layerVisibility.missileLines) {
      const missiles = events.filter(e => e.type === 'missile');
      if (missiles.length >= 2) {
        const lineData = [];
        for (let i = 0; i < missiles.length - 1; i++) {
          lineData.push({
            source: [missiles[i].lng, missiles[i].lat],
            target: [missiles[i + 1].lng, missiles[i + 1].lat],
          });
        }
        result.push(
          new LineLayer({
            id: 'missile-lines-layer',
            data: lineData,
            getSourcePosition: (d: { source: number[]; target: number[] }) => d.source as [number, number],
            getTargetPosition: (d: { source: number[]; target: number[] }) => d.target as [number, number],
            getColor: [239, 68, 68, 80],
            getWidth: 2,
            widthMinPixels: 1,
          })
        );
      }
    }

    if (layerVisibility.flights) {
      result.push(
        new ScatterplotLayer({
          id: 'flights-layer',
          data: flights,
          getPosition: (d: FlightData) => [d.lng, d.lat],
          getRadius: 4000,
          getFillColor: (d: FlightData) => [...(FLIGHT_COLORS[d.type] || [34, 197, 94]), 180] as [number, number, number, number],
          getLineColor: (d: FlightData) => [...(FLIGHT_COLORS[d.type] || [34, 197, 94]), 230] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 3,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.ships) {
      result.push(
        new ScatterplotLayer({
          id: 'ships-layer',
          data: ships,
          getPosition: (d: ShipData) => [d.lng, d.lat],
          getRadius: 5000,
          getFillColor: (d: ShipData) => [...(SHIP_COLORS[d.type] || [59, 130, 246]), 150] as [number, number, number, number],
          getLineColor: (d: ShipData) => [...(SHIP_COLORS[d.type] || [59, 130, 246]), 220] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.hormuzStrait) {
      result.push(
        new PathLayer({
          id: 'hormuz-layer',
          data: [{ path: STRAIT_OF_HORMUZ }],
          getPath: (d: { path: number[][] }) => d.path as [number, number][],
          getColor: [249, 115, 22, 120],
          getWidth: 3,
          widthMinPixels: 2,
          getDashArray: [12, 6],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
        })
      );
    }

    if (layerVisibility.militaryBases) {
      result.push(
        new ScatterplotLayer({
          id: 'military-bases-layer',
          data: MILITARY_BASES,
          getPosition: (d: (typeof MILITARY_BASES)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [59, 130, 246, 140],
          getLineColor: [59, 130, 246, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.nuclearFacilities) {
      result.push(
        new ScatterplotLayer({
          id: 'nuclear-layer',
          data: NUCLEAR_FACILITIES,
          getPosition: (d: (typeof NUCLEAR_FACILITIES)[0]) => [d.lng, d.lat],
          getRadius: 10000,
          getFillColor: [168, 85, 247, 160],
          getLineColor: [168, 85, 247, 240],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          pickable: true,
        })
      );
    }

    if (layerVisibility.airDefense) {
      result.push(
        new ScatterplotLayer({
          id: 'air-defense-layer',
          data: AIR_DEFENSE,
          getPosition: (d: (typeof AIR_DEFENSE)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [34, 211, 238, 140],
          getLineColor: [34, 211, 238, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.underseaCables) {
      for (const cable of UNDERSEA_CABLES) {
        result.push(
          new PathLayer({
            id: `cable-${cable.name}`,
            data: [{ path: cable.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...cable.color, 120] as [number, number, number, number],
            getWidth: 2,
            widthMinPixels: 1,
          })
        );
      }
    }

    if (layerVisibility.pipelines) {
      for (const pipe of PIPELINES) {
        result.push(
          new PathLayer({
            id: `pipeline-${pipe.name}`,
            data: [{ path: pipe.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...pipe.color, 150] as [number, number, number, number],
            getWidth: 3,
            widthMinPixels: 2,
          })
        );
      }
    }

    const ADSB_COLORS: Record<string, [number, number, number]> = {
      military: [239, 68, 68],
      surveillance: [34, 211, 238],
      commercial: [34, 197, 94],
      cargo: [245, 158, 11],
      private: [168, 85, 247],
      government: [59, 130, 246],
    };

    if (layerVisibility.adsbFlights && adsbFlights.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'adsb-layer',
          data: adsbFlights,
          getPosition: (d: AdsbFlight) => [d.lng, d.lat],
          getRadius: 5000,
          getFillColor: (d: AdsbFlight) => [...(ADSB_COLORS[d.type] || [34, 197, 94]), d.flagged ? 200 : 120] as [number, number, number, number],
          getLineColor: (d: AdsbFlight) => [...(ADSB_COLORS[d.type] || [34, 197, 94]), 255] as [number, number, number, number],
          stroked: true,
          lineWidthMinPixels: 1,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          pickable: true,
        })
      );
    }

    if (layerVisibility.droneBases) {
      result.push(
        new ScatterplotLayer({
          id: 'drone-bases-layer',
          data: DRONE_BASES,
          getPosition: (d: (typeof DRONE_BASES)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [129, 140, 248, 140],
          getLineColor: [129, 140, 248, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.commandCenters) {
      result.push(
        new ScatterplotLayer({
          id: 'command-centers-layer',
          data: COMMAND_CENTERS,
          getPosition: (d: (typeof COMMAND_CENTERS)[0]) => [d.lng, d.lat],
          getRadius: 9000,
          getFillColor: [244, 114, 182, 160],
          getLineColor: [244, 114, 182, 240],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.radarSites) {
      result.push(
        new ScatterplotLayer({
          id: 'radar-sites-layer',
          data: RADAR_SITES,
          getPosition: (d: (typeof RADAR_SITES)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [52, 211, 153, 140],
          getLineColor: [52, 211, 153, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.ballisticSites) {
      result.push(
        new ScatterplotLayer({
          id: 'ballistic-sites-layer',
          data: BALLISTIC_SITES,
          getPosition: (d: (typeof BALLISTIC_SITES)[0]) => [d.lng, d.lat],
          getRadius: 10000,
          getFillColor: [244, 63, 94, 170],
          getLineColor: [244, 63, 94, 250],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          pickable: true,
        })
      );
    }

    if (layerVisibility.armsDepots) {
      result.push(
        new ScatterplotLayer({
          id: 'arms-depots-layer',
          data: ARMS_DEPOTS,
          getPosition: (d: (typeof ARMS_DEPOTS)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [251, 146, 60, 150],
          getLineColor: [251, 146, 60, 230],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.specialForces) {
      result.push(
        new ScatterplotLayer({
          id: 'special-forces-layer',
          data: SPECIAL_FORCES,
          getPosition: (d: (typeof SPECIAL_FORCES)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [167, 139, 250, 150],
          getLineColor: [167, 139, 250, 230],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.antiShipBatteries) {
      result.push(
        new ScatterplotLayer({
          id: 'anti-ship-layer',
          data: ANTI_SHIP_BATTERIES,
          getPosition: (d: (typeof ANTI_SHIP_BATTERIES)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [251, 113, 133, 150],
          getLineColor: [251, 113, 133, 230],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 15,
          pickable: true,
        })
      );
    }

    if (layerVisibility.cyberCenters) {
      result.push(
        new ScatterplotLayer({
          id: 'cyber-centers-layer',
          data: CYBER_CENTERS,
          getPosition: (d: (typeof CYBER_CENTERS)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [45, 212, 191, 140],
          getLineColor: [45, 212, 191, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.elintSites) {
      result.push(
        new ScatterplotLayer({
          id: 'elint-sites-layer',
          data: ELINT_SITES,
          getPosition: (d: (typeof ELINT_SITES)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [56, 189, 248, 140],
          getLineColor: [56, 189, 248, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.airports) {
      result.push(
        new ScatterplotLayer({
          id: 'airports-layer',
          data: AIRPORTS,
          getPosition: (d: (typeof AIRPORTS)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [148, 163, 184, 120],
          getLineColor: [148, 163, 184, 200],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.refineries) {
      result.push(
        new ScatterplotLayer({
          id: 'refineries-layer',
          data: REFINERIES,
          getPosition: (d: (typeof REFINERIES)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [245, 158, 11, 150],
          getLineColor: [245, 158, 11, 230],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.ports) {
      result.push(
        new ScatterplotLayer({
          id: 'ports-layer',
          data: PORTS,
          getPosition: (d: (typeof PORTS)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [96, 165, 250, 140],
          getLineColor: [96, 165, 250, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.desalination) {
      result.push(
        new ScatterplotLayer({
          id: 'desal-layer',
          data: DESALINATION,
          getPosition: (d: (typeof DESALINATION)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [103, 232, 249, 130],
          getLineColor: [103, 232, 249, 210],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.powerPlants) {
      result.push(
        new ScatterplotLayer({
          id: 'power-plants-layer',
          data: POWER_PLANTS,
          getPosition: (d: (typeof POWER_PLANTS)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [251, 191, 36, 140],
          getLineColor: [251, 191, 36, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.telecomHubs) {
      result.push(
        new ScatterplotLayer({
          id: 'telecom-layer',
          data: TELECOM_HUBS,
          getPosition: (d: (typeof TELECOM_HUBS)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [163, 230, 53, 130],
          getLineColor: [163, 230, 53, 210],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.oilGasFields) {
      result.push(
        new ScatterplotLayer({
          id: 'oil-gas-layer',
          data: OIL_GAS_FIELDS,
          getPosition: (d: (typeof OIL_GAS_FIELDS)[0]) => [d.lng, d.lat],
          getRadius: 12000,
          getFillColor: [202, 138, 4, 120],
          getLineColor: [202, 138, 4, 200],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 20,
          pickable: true,
        })
      );
    }

    if (layerVisibility.refugeeCamps) {
      result.push(
        new ScatterplotLayer({
          id: 'refugee-camps-layer',
          data: REFUGEE_CAMPS,
          getPosition: (d: (typeof REFUGEE_CAMPS)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [34, 197, 94, 140],
          getLineColor: [34, 197, 94, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.borderCrossings) {
      result.push(
        new ScatterplotLayer({
          id: 'border-crossings-layer',
          data: BORDER_CROSSINGS,
          getPosition: (d: (typeof BORDER_CROSSINGS)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [250, 204, 21, 140],
          getLineColor: [250, 204, 21, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.unPositions) {
      result.push(
        new ScatterplotLayer({
          id: 'un-positions-layer',
          data: UN_POSITIONS,
          getPosition: (d: (typeof UN_POSITIONS)[0]) => [d.lng, d.lat],
          getRadius: 7000,
          getFillColor: [96, 165, 250, 140],
          getLineColor: [96, 165, 250, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
        })
      );
    }

    if (layerVisibility.hospitals) {
      result.push(
        new ScatterplotLayer({
          id: 'hospitals-layer',
          data: HOSPITALS,
          getPosition: (d: (typeof HOSPITALS)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [248, 113, 113, 140],
          getLineColor: [248, 113, 113, 220],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.embassies) {
      result.push(
        new ScatterplotLayer({
          id: 'embassies-layer',
          data: EMBASSIES,
          getPosition: (d: (typeof EMBASSIES)[0]) => [d.lng, d.lat],
          getRadius: 5000,
          getFillColor: [192, 132, 252, 130],
          getLineColor: [192, 132, 252, 210],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          pickable: true,
        })
      );
    }

    if (layerVisibility.proxyMilitia) {
      result.push(
        new ScatterplotLayer({
          id: 'proxy-militia-layer',
          data: PROXY_MILITIA,
          getPosition: (d: (typeof PROXY_MILITIA)[0]) => [d.lng, d.lat],
          getRadius: 8000,
          getFillColor: [244, 63, 94, 150],
          getLineColor: [244, 63, 94, 230],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 16,
          pickable: true,
        })
      );
    }

    if (layerVisibility.tunnelNetworks) {
      result.push(
        new ScatterplotLayer({
          id: 'tunnel-networks-layer',
          data: TUNNEL_NETWORKS,
          getPosition: (d: (typeof TUNNEL_NETWORKS)[0]) => [d.lng, d.lat],
          getRadius: 6000,
          getFillColor: [163, 163, 163, 130],
          getLineColor: [163, 163, 163, 210],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 12,
          pickable: true,
        })
      );
    }

    if (layerVisibility.eezBoundaries) {
      result.push(
        new PolygonLayer({
          id: 'eez-boundaries-layer',
          data: EEZ_ZONES,
          getPolygon: (d: (typeof EEZ_ZONES)[0]) => d.polygon,
          getFillColor: (d: (typeof EEZ_ZONES)[0]) => d.color,
          getLineColor: (d: (typeof EEZ_ZONES)[0]) => d.borderColor,
          lineWidthMinPixels: 1,
          pickable: true,
        })
      );
    }

    if (layerVisibility.supplyRoutes) {
      for (const route of SUPPLY_ROUTES) {
        result.push(
          new PathLayer({
            id: `supply-${route.name}`,
            data: [{ path: route.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...route.color, 140] as [number, number, number, number],
            getWidth: 3,
            widthMinPixels: 2,
            getDashArray: [8, 4],
            dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true })],
          })
        );
      }
    }

    if (layerVisibility.shippingLanes) {
      for (const lane of SHIPPING_LANES) {
        result.push(
          new PathLayer({
            id: `shipping-${lane.name}`,
            data: [{ path: lane.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...lane.color, 100] as [number, number, number, number],
            getWidth: 4,
            widthMinPixels: 2,
          })
        );
      }
    }

    if (layerVisibility.noFlyZones) {
      for (const zone of NO_FLY_ZONES) {
        result.push(
          new PathLayer({
            id: `nfz-${zone.name}`,
            data: [{ path: zone.path }],
            getPath: (d: { path: number[][] }) => d.path as [number, number][],
            getColor: [...zone.color, 100] as [number, number, number, number],
            getWidth: 2,
            widthMinPixels: 1,
            getDashArray: [6, 4],
            dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true })],
          })
        );
      }
    }

    if (layerVisibility.heatmap && heatmapData.length > 0) {
      result.push(
        new HeatmapLayer({
          id: 'heatmap-layer',
          data: heatmapData,
          getPosition: (d: { position: [number, number] }) => d.position,
          getWeight: (d: { weight: number }) => d.weight,
          radiusPixels: 60,
          intensity: 1.5,
          threshold: 0.05,
          colorRange: [
            [255, 255, 178],
            [254, 204, 92],
            [253, 141, 60],
            [240, 59, 32],
            [189, 0, 38],
            [128, 0, 38],
          ],
          aggregation: 'SUM',
        })
      );
    }

    if (layerVisibility.alertHeatmap && alertHeatmapData.length > 0) {
      result.push(
        new HeatmapLayer({
          id: 'alert-heatmap-layer',
          data: alertHeatmapData,
          getPosition: (d: { position: [number, number] }) => d.position,
          getWeight: (d: { weight: number }) => d.weight,
          radiusPixels: 45,
          intensity: 2,
          threshold: 0.03,
          colorRange: [
            [75, 0, 0],
            [139, 0, 0],
            [200, 30, 30],
            [239, 68, 68],
            [251, 146, 60],
            [253, 224, 71],
          ],
          aggregation: 'SUM',
        })
      );
    }

    if (layerVisibility.animatedArcs) {
      const ARC_COLORS: Record<string, [number, number, number]> = {
        ballistic: [239, 68, 68],
        cruise: [249, 115, 22],
        rocket: [234, 179, 8],
        antiship: [59, 130, 246],
      };
      result.push(
        new ArcLayer({
          id: 'animated-arcs-layer',
          data: MISSILE_TRAJECTORIES,
          getSourcePosition: (d: (typeof MISSILE_TRAJECTORIES)[0]) => d.source as [number, number],
          getTargetPosition: (d: (typeof MISSILE_TRAJECTORIES)[0]) => d.target as [number, number],
          getSourceColor: (d: (typeof MISSILE_TRAJECTORIES)[0]) => [...(ARC_COLORS[d.type] || [239, 68, 68]), 200] as [number, number, number, number],
          getTargetColor: (d: (typeof MISSILE_TRAJECTORIES)[0]) => [...(ARC_COLORS[d.type] || [239, 68, 68]), 60] as [number, number, number, number],
          getWidth: 3,
          getHeight: 0.4,
          tilt: Math.sin(arcTime * Math.PI * 2) * 15,
          greatCircle: true,
          widthMinPixels: 2,
          pickable: true,
        })
      );
      const headPositions = MISSILE_TRAJECTORIES.map(t => {
        const srcLng = t.source[0];
        const srcLat = t.source[1];
        const tgtLng = t.target[0];
        const tgtLat = t.target[1];
        const progress = arcTime;
        return {
          position: [
            srcLng + (tgtLng - srcLng) * progress,
            srcLat + (tgtLat - srcLat) * progress,
          ] as [number, number],
          type: t.type,
        };
      });
      result.push(
        new ScatterplotLayer({
          id: 'arc-heads-layer',
          data: headPositions,
          getPosition: (d: { position: [number, number] }) => d.position,
          getRadius: 6000,
          getFillColor: [255, 255, 255, 220],
          getLineColor: [239, 68, 68, 255],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 4,
          radiusMaxPixels: 8,
        })
      );
    }

    if (measureMode && measureCenter) {
      result.push(
        new ScatterplotLayer({
          id: 'measure-center-layer',
          data: [{ position: [measureCenter.lng, measureCenter.lat] }],
          getPosition: (d: { position: [number, number] }) => d.position,
          getRadius: 3000,
          getFillColor: [255, 255, 0, 200],
          getLineColor: [255, 255, 0, 255],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 10,
        })
      );
      if (measureCursor && measureDistance && measureDistance > 0) {
        const segments = 64;
        const R = 6371;
        const angularDist = measureDistance / R;
        const cLat = measureCenter.lat * Math.PI / 180;
        const cLng = measureCenter.lng * Math.PI / 180;
        const circlePoints: [number, number][] = [];
        for (let i = 0; i <= segments; i++) {
          const bearing = (2 * Math.PI * i) / segments;
          const lat = Math.asin(Math.sin(cLat) * Math.cos(angularDist) + Math.cos(cLat) * Math.sin(angularDist) * Math.cos(bearing));
          const lng = cLng + Math.atan2(Math.sin(bearing) * Math.sin(angularDist) * Math.cos(cLat), Math.cos(angularDist) - Math.sin(cLat) * Math.sin(lat));
          circlePoints.push([lng * 180 / Math.PI, lat * 180 / Math.PI]);
        }
        result.push(
          new PathLayer({
            id: 'measure-radius-layer',
            data: [{ path: circlePoints }],
            getPath: (d: { path: [number, number][] }) => d.path,
            getColor: [255, 255, 0, 150],
            getWidth: 2,
            widthMinPixels: 1,
            getDashArray: [8, 4],
            dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true })],
          })
        );
        result.push(
          new LineLayer({
            id: 'measure-line-layer',
            data: [{
              source: [measureCenter.lng, measureCenter.lat] as [number, number],
              target: [measureCursor.lng, measureCursor.lat] as [number, number],
            }],
            getSourcePosition: (d: { source: [number, number] }) => d.source,
            getTargetPosition: (d: { target: [number, number] }) => d.target,
            getColor: [255, 255, 0, 180],
            getWidth: 2,
            widthMinPixels: 1,
          })
        );
      }
    }

    if (highlightedPoint) {
      const pulseScale = 1 + Math.sin(highlightPulse * Math.PI * 2) * 0.5;
      const pulseAlpha = Math.floor(120 + Math.sin(highlightPulse * Math.PI * 2) * 80);
      result.push(
        new ScatterplotLayer({
          id: 'search-highlight-ring',
          data: [{ position: [highlightedPoint.lng, highlightedPoint.lat] }],
          getPosition: (d: { position: [number, number] }) => d.position,
          getRadius: 15000 * pulseScale,
          getFillColor: [59, 130, 246, 0],
          getLineColor: [59, 130, 246, pulseAlpha] as [number, number, number, number],
          stroked: true,
          filled: false,
          lineWidthMinPixels: 3,
          radiusMinPixels: 12,
          radiusMaxPixels: 40,
        })
      );
      result.push(
        new ScatterplotLayer({
          id: 'search-highlight-center',
          data: [{ position: [highlightedPoint.lng, highlightedPoint.lat] }],
          getPosition: (d: { position: [number, number] }) => d.position,
          getRadius: 4000,
          getFillColor: [59, 130, 246, 200],
          getLineColor: [255, 255, 255, 255],
          stroked: true,
          lineWidthMinPixels: 2,
          radiusMinPixels: 6,
          radiusMaxPixels: 12,
        })
      );
    }

    if (layerVisibility.satelliteThermal && thermalHotspots.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'thermal-hotspots-layer',
          data: thermalHotspots,
          getPosition: (d: ThermalHotspot) => [d.lng, d.lat],
          getRadius: (d: ThermalHotspot) => Math.max(2000, Math.min(d.frp * 150, 15000)),
          getFillColor: (d: ThermalHotspot) => {
            const intensity = Math.min(d.brightness / 400, 1);
            if (d.confidence === 'high') return [255, Math.round(80 * (1 - intensity)), 0, Math.round(160 + 80 * intensity)] as [number, number, number, number];
            if (d.confidence === 'nominal') return [255, Math.round(140 * (1 - intensity)), 20, Math.round(120 + 60 * intensity)] as [number, number, number, number];
            return [255, 180, 60, 100] as [number, number, number, number];
          },
          getLineColor: (d: ThermalHotspot) => {
            if (d.confidence === 'high') return [255, 60, 0, 220] as [number, number, number, number];
            if (d.confidence === 'nominal') return [255, 120, 20, 180] as [number, number, number, number];
            return [255, 160, 40, 140] as [number, number, number, number];
          },
          stroked: true,
          lineWidthMinPixels: 1,
          radiusMinPixels: 3,
          radiusMaxPixels: 18,
          pickable: true,
        })
      );
    }

    if (layerVisibility.thermalHeatmap && thermalHotspots.length > 0) {
      result.push(
        new HeatmapLayer({
          id: 'thermal-heatmap-layer',
          data: thermalHotspots,
          getPosition: (d: ThermalHotspot) => [d.lng, d.lat],
          getWeight: (d: ThermalHotspot) => d.frp || 1,
          radiusPixels: 50,
          intensity: 2,
          threshold: 0.03,
          colorRange: [
            [20, 10, 0],
            [80, 20, 0],
            [160, 40, 0],
            [220, 80, 0],
            [255, 140, 0],
            [255, 220, 100],
          ],
          aggregation: 'SUM',
        })
      );
    }

    return result;
  }, [events, flights, ships, adsbFlights, thermalHotspots, layerVisibility, heatmapData, alertHeatmapData, arcTime, measureMode, measureCenter, measureCursor, measureDistance, highlightedPoint, highlightPulse]);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'deck-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '1';
    containerRef.current.appendChild(canvas);

    const deck = new Deck({
      canvas,
      initialViewState: viewState,
      controller: true,
      layers: [],
      onHover: handleHover as any,
      onClick: handleMapClick as any,
      onViewStateChange: onViewStateChange as any,
      getTooltip: () => null,
    });

    deckRef.current = deck;

    return () => {
      deck.finalize();
      deckRef.current = null;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deckRef.current) {
      deckRef.current.setProps({
        layers,
        viewState,
      });
    }
  }, [layers, viewState]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(5,8,16,0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <button
            data-testid="button-toggle-map-tools"
            onClick={() => setMapToolsOpen(!mapToolsOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 10px',
              background: 'none',
              border: 'none',
              borderBottom: mapToolsOpen ? '1px solid rgba(255,255,255,0.06)' : 'none',
              cursor: 'pointer',
              color: '#d1d5db',
              minHeight: 32,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              {language === 'ar' ? 'أدوات' : 'TOOLS'}
            </span>
            <span style={{ fontSize: 8, color: '#6b7280', marginLeft: 'auto' }}>{mapToolsOpen ? '▲' : '▼'}</span>
          </button>

          {mapToolsOpen && (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  data-testid="button-toggle-globe"
                  onClick={toggleGlobe}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    borderRadius: 5,
                    border: `1px solid ${isGlobe ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    background: isGlobe ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    color: isGlobe ? '#93c5fd' : '#9ca3af',
                    cursor: 'pointer',
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                  </svg>
                  {isGlobe ? '3D' : '2D'}
                </button>
                <button
                  data-testid="button-measure-tool"
                  onClick={toggleMeasureMode}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    borderRadius: 5,
                    border: `1px solid ${measureMode ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    background: measureMode ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)',
                    color: measureMode ? '#fde047' : '#9ca3af',
                    cursor: 'pointer',
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                    <path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" />
                  </svg>
                  {measureMode ? 'ON' : (language === 'ar' ? 'قياس' : 'MEAS')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 3 }}>
                {(['global', 'mena', 'gulf', 'levant'] as const).map(region => (
                  <button
                    key={region}
                    data-testid={`button-region-${region}`}
                    onClick={() => setRegion(region)}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: 9,
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      borderRadius: 4,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      minHeight: 24,
                    }}
                  >
                    {region === 'global' ? 'ALL' : region === 'levant' ? 'LEV' : region.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#666"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  ref={searchInputRef}
                  data-testid="input-map-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                    setSearchActiveIndex(-1);
                  }}
                  onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                  onBlur={() => { setTimeout(() => setSearchOpen(false), 200); }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                  style={{
                    width: '100%',
                    padding: '6px 26px 6px 26px',
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 5,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#ddd',
                    backdropFilter: 'blur(8px)',
                    outline: 'none',
                    minHeight: 28,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    data-testid="button-clear-search"
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); setSearchActiveIndex(-1); }}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: '2px 4px',
                      lineHeight: 1,
                    }}
                    aria-label="Clear search"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {searchOpen && searchResults.length > 0 && (
                  <div
                    ref={searchDropdownRef}
                    data-testid="search-results-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'rgba(10, 10, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      overflow: 'hidden',
                      zIndex: 30,
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {searchResults.map((item, idx) => {
                      const iconPath = SEARCH_CATEGORY_ICONS[item.category] || SEARCH_CATEGORY_ICONS['Default'];
                      const iconColor = SEARCH_CATEGORY_COLORS[item.category] || SEARCH_CATEGORY_COLORS['Default'];
                      const isActive = idx === searchActiveIndex;
                      return (
                        <button
                          key={`${item.name}-${item.lat}-${item.lng}-${idx}`}
                          data-testid={`search-result-${idx}`}
                          onClick={() => selectSearchResult(item)}
                          onMouseEnter={() => setSearchActiveIndex(idx)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 8px',
                            background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                            border: 'none',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            minHeight: 34,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d={iconPath} />
                          </svg>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ color: '#eee', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ color: '#666', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.category} | {item.detail}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'rgba(10, 10, 20, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      padding: '10px 8px',
                      zIndex: 30,
                    }}
                  >
                    <div style={{ color: '#666', fontSize: 10, textAlign: 'center', fontFamily: 'monospace' }}>
                      {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex flex-col" style={{ maxHeight: 'calc(100% - 24px)' }}>
        <div
          className="flex flex-col overflow-hidden"
          style={{
            background: 'rgba(5,8,16,0.93)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 10,
            boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
            minWidth: panelOpen ? 210 : 'auto',
            maxWidth: 230,
          }}
        >
          {/* Header */}
          <button
            data-testid="button-toggle-layers-panel"
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex items-center justify-between gap-2 px-3 py-2 w-full text-left"
            style={{ borderBottom: panelOpen ? '1px solid rgba(245,158,11,0.12)' : 'none' }}
          >
            <div className="flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
              <span style={{ color: '#e5c97a', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                LAYERS
              </span>
            </div>
            <span style={{ color: '#6b7280', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }}>
              {activeLayerCount}{panelOpen ? ' ▲' : ' ▼'}
            </span>
          </button>

          {/* Groups */}
          {panelOpen && (
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {LAYER_GROUPS.map(group => {
                const groupLayers = LAYER_CONFIGS.filter(c => c.group === group.id);
                const activeInGroup = groupLayers.filter(c => layerVisibility[c.key]).length;
                const isExpanded = expandedGroups[group.id];
                return (
                  <div key={group.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center" style={{ padding: '3px 6px 3px 8px', gap: 4 }}>
                      <button
                        data-testid={`toggle-group-${group.id}`}
                        onClick={() => toggleGroup(group.id)}
                        className="flex items-center gap-1.5 flex-1 text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', minHeight: 26 }}
                      >
                        <span style={{ color: group.color, fontSize: 7, opacity: 0.8 }}>{isExpanded ? '▼' : '▶'}</span>
                        <span style={{ color: group.color, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                          {group.label}
                        </span>
                        <span style={{ color: '#374151', fontSize: 8, fontFamily: 'monospace', marginLeft: 2 }}>
                          {activeInGroup}/{groupLayers.length}
                        </span>
                      </button>
                      <button
                        data-testid={`toggle-all-${group.id}`}
                        onClick={() => toggleAllInGroup(group.id, activeInGroup < groupLayers.length)}
                        style={{
                          background: activeInGroup > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 3,
                          color: activeInGroup > 0 ? '#d97706' : '#4b5563',
                          cursor: 'pointer',
                          fontSize: 8,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '2px 5px',
                          letterSpacing: '0.05em',
                          minHeight: 20,
                        }}
                      >
                        {activeInGroup === groupLayers.length ? 'OFF' : 'ALL'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div style={{ paddingBottom: 2 }}>
                        {groupLayers.map(cfg => (
                          <label
                            key={cfg.key}
                            data-testid={`toggle-layer-${cfg.key}`}
                            className="flex items-center gap-2 cursor-pointer select-none"
                            style={{
                              padding: '3px 8px 3px 20px',
                              minHeight: 24,
                              background: layerVisibility[cfg.key] ? 'rgba(255,255,255,0.025)' : 'transparent',
                              transition: 'background 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={layerVisibility[cfg.key]}
                              onChange={() => toggleLayer(cfg.key)}
                              style={{ display: 'none' }}
                            />
                            <span style={{
                              width: 22, height: 11, borderRadius: 6, flexShrink: 0,
                              background: layerVisibility[cfg.key] ? cfg.color : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${layerVisibility[cfg.key] ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                              boxShadow: layerVisibility[cfg.key] ? `0 0 6px ${cfg.color}55` : 'none',
                              position: 'relative',
                              display: 'inline-flex',
                              alignItems: 'center',
                              transition: 'all 0.15s',
                            }}>
                              <span style={{
                                position: 'absolute',
                                width: 7, height: 7, borderRadius: '50%',
                                background: layerVisibility[cfg.key] ? '#fff' : 'rgba(255,255,255,0.25)',
                                left: layerVisibility[cfg.key] ? 13 : 2,
                                transition: 'left 0.15s',
                              }} />
                            </span>
                            <span style={{
                              fontSize: 10,
                              color: layerVisibility[cfg.key] ? '#d1d5db' : '#4b5563',
                              fontFamily: 'monospace',
                              lineHeight: 1.2,
                              transition: 'color 0.15s',
                            }}>
                              {cfg.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div
          onClick={() => setTooltip(null)}
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 400) - 260),
            top: Math.max(tooltip.y - 12, 8),
            zIndex: 20,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            padding: '8px 12px',
            pointerEvents: 'auto',
            maxWidth: 260,
            cursor: 'pointer',
          }}
        >
          <div style={{ color: '#eee', fontSize: 12, fontWeight: 600 }}>{tooltip.text}</div>
          {tooltip.detail && (
            <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>{tooltip.detail}</div>
          )}
          <div style={{ color: '#555', fontSize: 9, marginTop: 4 }}>Tap to dismiss</div>
        </div>
      )}

      {measureMode && (
        <div
          data-testid="measure-readout"
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            zIndex: 20,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,0,0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#ffff00', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            {language === 'ar' ? 'اداة القياس' : 'Distance Tool'}
          </div>
          {measureCenter && measureDistance !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ color: '#ddd', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                {measureDistance < 1 ? `${(measureDistance * 1000).toFixed(0)} m` : `${measureDistance.toFixed(1)} km`}
              </div>
              <div style={{ color: '#888', fontSize: 10 }}>
                {(measureDistance * 0.539957).toFixed(1)} nm | {(measureDistance * 0.621371).toFixed(1)} mi
              </div>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                {language === 'ar' ? 'انقر لمسح' : 'Click to clear'}
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', fontSize: 11 }}>
              {language === 'ar' ? 'انقر على الخريطة لتعيين نقطة المركز' : 'Click map to set center point'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
