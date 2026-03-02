# WARROOM - Middle East Intelligence Dashboard

## Overview
A Bloomberg Terminal-style real-time intelligence dashboard for monitoring the Middle East conflict region (Iran, Israel, Lebanon). Features missile tracking, flight radar, Strait of Hormuz maritime surveillance, commodity prices, breaking news, Telegram channel feeds, AI intelligence briefing, 3D globe map with 40+ toggleable data layers, and Arabic/English bilingual support.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js REST API
- **Map**: deck.gl + MapLibre GL with CARTO dark basemap, 3D globe support
- **Styling**: Bloomberg Terminal dark theme (dark mode forced)
- **Data**: Simulated real-time data with periodic polling via React Query

## Key Files
- `client/src/pages/dashboard.tsx` - Main dashboard page with all panels (7 panels: news, intel, map, events, radar, alerts, markets)
- `client/src/components/conflict-map.tsx` - deck.gl + MapLibre GL interactive 3D globe map with infrastructure layers
- `client/src/components/theme-provider.tsx` - Dark theme + language (EN/AR) context
- `server/routes.ts` - API endpoints returning simulated intelligence data
- `shared/schema.ts` - Shared TypeScript types for all data models

## Features
1. **Breaking News Feed** - 15 news items with category badges (Breaking/Military/Diplomatic/Economic)
2. **AI Intelligence Panel** - Simulated AI world brief with risk level, key developments (severity badges), focal points, and AI deduction/forecasting input with confidence scores
3. **3D Globe Map** - deck.gl + MapLibre GL with Globe/Flat toggle, 4 regional presets (Global/MENA/Gulf/Levant), 3 views:
   - Conflict: Missile sites, airstrikes, ground ops, naval ops, nuclear facilities, air defense
   - Flights: Military, commercial, surveillance aircraft
   - Maritime: Ships in Strait of Hormuz (tankers, cargo, military, patrol)
4. **40+ Infrastructure Data Layers** - Toggleable overlay layers:
   - Military bases (15): US, Israeli, Iranian bases with coordinates
   - Nuclear facilities (8): Natanz, Fordow, Bushehr, Dimona, etc.
   - Air defense systems (8): Iron Dome, David's Sling, Arrow, S-300, Bavar-373
   - Undersea cables (5): AAE-1, FLAG, SEA-ME-WE-5, EIG, FALCON
   - Oil/gas pipelines (4): East-West, IGAT, Kirkuk-Ceyhan, Tapline
   - Key infrastructure (8): Refineries, ports, desalination plants
5. **Markets Panel** - Sectioned into Commodities, Major FX, and Regional FX -- 17 total instruments
6. **Telegram Feed** - Intelligence channel messages from simulated Telegram channels
7. **Scrolling Ticker** - Marquee-style ticker with fade edges, all 17 instruments
8. **Language Toggle** - Switch between English and Arabic (RTL support)
9. **Status Bar** - Connection status, event counts, source indicators, closed panel tabs
10. **Live Sirens** - Scrolling red alert banner showing active rocket/missile/UAV sirens
11. **Israel Red Alert (Tzeva Adom)** - Multi-country alert system (57 cities across 12 countries: Israel, Lebanon, Iran, Syria, Iraq, Saudi Arabia, Yemen, UAE, Jordan, Kuwait, Bahrain, Qatar). Redesigned after tzevaadom.co.il: solid red header when active, city/country search filter, country filter tabs (ALL + per-country), country-grouped headers with distinct colors, region-grouped alerts with sticky headers, countdown timers, pulsing active indicators, integrated sirens section (amber), trilingual support (EN/AR/HE)
12. **Alert Sound System** - Web Audio API sine-wave tone on new red alerts/sirens, with sound toggle
13. **Panel Close/Reopen** - 8 closeable panels with reopen tabs in status bar
14. **ADS-B Flight Tracker** - Dedicated ADS-B panel with 24 tracked aircraft, filter by type (MIL/ISR/CIV/CGO/GOV/PVT), flagged flights highlighted, detailed flight cards showing hex, registration, aircraft type, origin/destination, altitude, ground speed, vertical rate, squawk, RSSI, coordinates. Also rendered as toggleable layer on the 3D map.

## API Endpoints
- `GET /api/news` - Breaking news items (polled every 20s)
- `GET /api/commodities` - Commodity and FX prices (polled every 5s)
- `GET /api/sirens` - Active siren alerts (polled every 10s)
- `GET /api/red-alerts` - Multi-country Red Alert system data, 57 cities across 12 countries (polled every 8s)
- `GET /api/events` - Map events, flights, ships (polled every 15s)
- `GET /api/telegram` - Telegram channel messages (polled every 25s)
- `GET /api/ai-brief` - AI intelligence brief with key developments (polled every 60s)
- `POST /api/ai-deduct` - AI deduction/forecasting (on-demand)
- `GET /api/adsb` - ADS-B flight tracking data, 24 aircraft (polled every 6s)

## Panel System
- 8 panel IDs: news, intel, map, events, radar, adsb, alerts, markets
- Two-row grid layout:
  - Top row (58%): news, intel, map (44%), alerts
  - Bottom row (42%): events, radar, adsb, markets
  - Horizontal resize between rows, vertical resize between panels in each row
- All panels visible by default
- Minimize button (Minus icon) on each panel header
- Closed panels appear as clickable restore tabs in the status bar

## Dependencies
- deck.gl (@deck.gl/core, @deck.gl/layers, @deck.gl/react)
- maplibre-gl
- react-icons (for Telegram logo)
- All standard shadcn/radix components

## Theme
- Dark Bloomberg terminal aesthetic with orange (#F28A1D) primary accent
- JetBrains Mono for data/numbers, Inter for UI text
- Green/red for market indicators
- Purple accent for AI Intelligence panel
- Pulsing red dots for LIVE indicators
