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
4. **37 Infrastructure Data Layers** (grouped into 7 categories, 40+ with operational layers):
   - OPERATIONAL (6): Conflict Events, Flight Tracks, Ship Tracks, ADS-B Flights, Missile Trajectories, Strait of Hormuz
   - MILITARY (6): Military Bases (18), Drone/UAV Bases (7), Command Centers (7), Special Forces (5), Radar/EW Stations (6), Arms Depots (5)
   - STRATEGIC (6): Nuclear Facilities (8), Ballistic Missile Sites (6), Air Defense Systems (11), Anti-Ship Batteries (5), Cyber/SIGINT Centers (5), ELINT Stations (4)
   - INFRASTRUCTURE (7): Airports (8), Refineries (7), Ports (8), Desalination Plants (5), Power Plants (5), Telecom/Cable Hubs (4), Oil/Gas Fields (8)
   - ROUTES & ZONES (5): Undersea Cables (6), Pipelines (6), Supply Routes (3), Shipping Lanes (3), No-Fly Zones (3)
   - HUMANITARIAN (5): Refugee Camps (6), Border Crossings (6), UN Positions (5), Hospitals (5), Embassies (6)
   - THREAT ACTORS (2): Proxy Militias (7), Tunnel Networks (5)
   - Layer panel: Collapsible groups with toggle-all/off, active count, color-coded indicators
5. **Markets Panel** - Sectioned into Commodities, Major FX, and Regional FX -- 17 total instruments
6. **Telegram Feed** - Intelligence channel messages from simulated Telegram channels
7. **Scrolling Ticker** - Marquee-style ticker with fade edges, all 17 instruments
8. **Language Toggle** - Switch between English and Arabic (RTL support)
9. **Status Bar** - Connection status, event counts, source indicators, closed panel tabs
10. **Live Sirens** - Scrolling red alert banner showing active rocket/missile/UAV sirens
11. **Israel Red Alert (Tzeva Adom)** - Multi-country alert system (57 cities across 12 countries: Israel, Lebanon, Iran, Syria, Iraq, Saudi Arabia, Yemen, UAE, Jordan, Kuwait, Bahrain, Qatar). Redesigned after tzevaadom.co.il: solid red header when active, city/country search filter, country filter tabs (ALL + per-country), country-grouped headers with distinct colors, region-grouped alerts with sticky headers, countdown timers, pulsing active indicators, integrated sirens section (amber), trilingual support (EN/AR/HE)
12. **Alert Sound System** - Web Audio API sine-wave tone on new red alerts/sirens, with sound toggle
13. **Panel Close/Reopen** - 8 closeable panels with reopen tabs in status bar
14. **ADS-B Flight Tracker** - Dedicated ADS-B panel with 40 tracked aircraft (23 commercial, 6 military, 6 surveillance, 3 cargo, 1 government, 1 private), filter by type (MIL/ISR/CIV/CGO/GOV/PVT), flagged flights highlighted, detailed flight cards showing hex, registration, aircraft type, origin/destination, altitude, ground speed, vertical rate, squawk, RSSI, coordinates. Civil aviation includes BAW, DLH, AFR, AAL, KAL, CCA, SIA, ETH, IRM, UAL, ACA, VIR, QFA, JAL, GFA, ETD. Also rendered as toggleable layer on the 3D map.

## Enhancement Features (T001-T005)
15. **Fullscreen/Maximize Panels** - PanelMaximizeButton on all major panels (Map, ADS-B, AI Intel, Red Alert). Click to expand to 100% of panel area. Escape key restores.
16. **Threat Level Banner** - Dynamic header badge (CRITICAL/HIGH/ELEVATED/LOW) computed from aggregate red alerts + sirens count.
17. **Desktop Notifications** - Browser Notification API integration for new red alerts. Bell toggle in header. Permission request on first enable.
18. **Alert Threat Type Filtering** - Filter buttons (ALL/ROCKETS/MISSILES/UAV/AIRCRAFT) in RedAlertPanel to filter by threat type.
19. **Alert History** - History button in RedAlert panel header. Modal overlay with scrollable historical alerts, search, resolved/active status. Backed by `/api/alert-history` endpoint.
20. **Analyst Notes** - StickyNote overlay toggled from header. localStorage-persisted notes with categories (general/threat/intel/maritime). Add/delete.
21. **Saved Layout Presets** - Layout dropdown in header. 3 built-in presets (Default/Maritime Focus/Air Defense) + custom save/load/delete. localStorage-persisted.
22. **Custom Watchlists** - Eye icon in header opens watchlist manager. Add callsigns/ship names/cities. Tracked via localStorage.
23. **Correlation Engine** - `useCorrelations` hook analyzing events, alerts, sirens, flights for spatial/temporal patterns. Shows CORR count in status bar.
24. **Historical Timeline** - Thin timeline bar between panels and news ticker showing past 1-hour events as colored dots. Hover tooltip with event name.
25. **Export/Report** - FileDown button in header generates downloadable .txt intelligence report with threat level, alert summary, top events, military flights, commodity movers.
26. **Threat Heat Map** - HeatmapLayer from @deck.gl/aggregation-layers showing event/alert intensity. Togglable in operational layer group. Yellow-red color ramp. Combines conflict events (weighted by severity) and red alerts (weighted by threat type).
27. **Animated Missile Arcs** - ArcLayer with requestAnimationFrame animation showing 8 missile trajectories (Tehran>TelAviv, Sanaa>Eilat, Gaza>Ashkelon, etc.). Color-coded by type (ballistic/cruise/rocket/antiship). Animated warhead dots travel along arcs. Togglable layer.
28. **Distance/Radius Tool** - Measure button in map toolbar. Click to set center point, move mouse to measure distance. Shows geodesic circle (PathLayer) and line (LineLayer). Readout displays km, nautical miles, and statute miles. Click again to clear.

## API Endpoints
- `GET /api/news` - Breaking news items (polled every 20s)
- `GET /api/commodities` - Commodity and FX prices (polled every 5s)
- `GET /api/sirens` - Active siren alerts (polled every 10s)
- `GET /api/red-alerts` - Multi-country Red Alert system data, 57 cities across 12 countries (polled every 8s)
- `GET /api/events` - Map events, flights, ships (polled every 15s)
- `GET /api/telegram` - Telegram channel messages (polled every 25s)
- `GET /api/ai-brief` - AI intelligence brief with key developments (polled every 60s)
- `POST /api/ai-deduct` - AI deduction/forecasting (on-demand)
- `GET /api/adsb` - ADS-B flight tracking data, 40 aircraft (polled every 6s)
- `GET /api/alert-history` - 50 historical alerts with resolved status (on-demand)

## Panel System
- 9 panel IDs: news, telegram, intel, map, events, radar, adsb, alerts, markets
- Two-row grid layout:
  - Top row (58%): news (16%), telegram (14%), intel (16%), map (36%), alerts (18%)
  - Bottom row (42%): events, radar, adsb, markets
  - Horizontal resize between rows, vertical resize between panels in each row
- All panels visible by default
- Minimize button (Minus icon) on each panel header
- Closed panels appear as clickable restore tabs in the status bar

## Dependencies
- deck.gl (@deck.gl/core, @deck.gl/layers, @deck.gl/react, @deck.gl/aggregation-layers)
- maplibre-gl
- react-icons (for Telegram logo)
- All standard shadcn/radix components

## Theme & Text Sizing
- Dark Bloomberg terminal aesthetic with amber/orange primary accent (--primary: 32 95% 50%)
- Background: --background: 225 30% 3%
- WARROOM logo: amber text shadow hsl(32 95% 50% / 0.6)
- JetBrains Mono for data/numbers, Inter for UI text
- Green/red for market indicators
- Purple accent for AI Intelligence panel
- Pulsing red dots for LIVE indicators
- Terminal-density text sizing: 10-11px for data labels, 9-10px for secondary info, 12px for headers/titles
- No text-sm (14px) or text-[14px] in data panels - all reduced for Bloomberg terminal density
- Overlay panels (notes, watchlist, history) use text-xs (12px) headers and text-[11px] body

## Touch Screen Support
- ResizeHandle supports touch events (touchstart/touchmove/touchend) with delta tracking and wider invisible hit area (12px wide)
- Timeline events use 16px tap targets wrapping 8px dots, with click-to-toggle tooltips
- Map tooltips appear on tap (click) with tap-to-dismiss; mouse hover still works for desktop
- Layer toggle targets enlarged to 12px dots with 28px minHeight rows for easy tapping
- Map toolbar buttons (Globe, Region, Measure) have minHeight 32-36px
- Header buttons enlarged to h-8 (32px) with active:bg-* states for touch feedback
- Panel minimize/maximize buttons enlarged to w-7 h-7 (28px) with active states
- Preset delete buttons always visible (not hover-only) for touch accessibility
- CSS @media (hover: none) and (pointer: coarse) suppresses sticky hover effects and adds tap highlights
- All interactive elements have minimum 28px touch targets
