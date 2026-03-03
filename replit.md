# WARROOM - Middle East Intelligence Dashboard

## Overview
A Bloomberg Terminal-style real-time intelligence dashboard for monitoring the Middle East conflict region (Iran, Israel, Lebanon). Features missile tracking, flight radar, Strait of Hormuz maritime surveillance, commodity prices, breaking news, Telegram channel feeds, AI intelligence briefing, 3D globe map with 40+ toggleable data layers, and Arabic/English bilingual support.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js REST API
- **Map**: deck.gl + MapLibre GL with CARTO dark basemap, 3D globe support
- **Styling**: Bloomberg Terminal dark theme (dark mode forced)
- **Data**: Live ADS-B flight data via adsb.lol API + simulated data for other feeds, streamed via SSE

## Key Files
- `client/src/pages/dashboard.tsx` - Main dashboard page with all panels (7 panels: news, intel, map, events, radar, alerts, markets)
- `client/src/components/conflict-map.tsx` - deck.gl + MapLibre GL interactive 3D globe map with infrastructure layers
- `client/src/components/theme-provider.tsx` - Dark theme + language (EN/AR) context
- `server/routes.ts` - API endpoints with live ADS-B (adsb.lol) + simulated intelligence data
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
6. **Telegram Feed** - Live Telegram OSINT feeds via `t.me/s/` public scraping + simulated fallback. Server endpoint `/api/telegram/live?channels=...` fetches real messages from public Telegram channels. Custom channels from `localStorage warroom_tg_channels`. Live messages tagged with green "LIVE" badge and emerald left border. Server-side caching (3min TTL) prevents rate-limiting. Language filter rejects non-English/Arabic content (Cyrillic, CJK). Default channels: @OSINTdefender, @IntelCrab, @GeoConfirmed, @CIG_telegram, @sentaborim, @AviationIntel, @ShipTracker, @OilMarkets. Live data fully replaces mock data per-channel (no mixing).
7. **Scrolling Ticker** - Marquee-style ticker with fade edges, all 17 instruments
8. **Language Toggle** - Switch between English and Arabic (RTL support)
9. **Status Bar** - Connection status, event counts, source indicators, closed panel tabs
10. **Live Sirens** - Scrolling red alert banner showing active rocket/missile/UAV sirens
11. **Israel Red Alert (Tzeva Adom)** - Multi-country alert system (57 cities across 12 countries: Israel, Lebanon, Iran, Syria, Iraq, Saudi Arabia, Yemen, UAE, Jordan, Kuwait, Bahrain, Qatar). Redesigned after tzevaadom.co.il: solid red header when active, city/country search filter, country filter tabs (ALL + per-country), country-grouped headers with distinct colors, region-grouped alerts with sticky headers, countdown timers, pulsing active indicators, integrated sirens section (amber), trilingual support (EN/AR/HE)
12. **Alert Sound System** - Web Audio API sine-wave tone on new red alerts/sirens, with sound toggle
13. **Panel Close/Reopen** - 8 closeable panels with reopen tabs in status bar
14. **ADS-B Flight Tracker** - Live ADS-B data from adsb.lol API (free, no key required). Queries 4 geographic zones (Levant, Persian Gulf, UAE, Iraq) + global military feed. Auto-classifies aircraft as military/surveillance/commercial/cargo/private/government. Flags emergency squawks (7700/7600/7500), military aircraft, ISR platforms, high-altitude flights. Falls back to simulated 40-aircraft dataset when API unavailable. LIVE/SIM indicator shows data source. Filter by type (MIL/ISR/CIV/CGO/GOV/PVT), detailed flight cards with hex, registration, aircraft type, altitude, ground speed, vertical rate, squawk, RSSI. Streamed via SSE every 6s with 5s server-side cache.

## Enhancement Features (v2: T001-T010)
29. **Error Boundaries** - Generic PanelErrorBoundary wraps all panels, catches errors and shows retry button
30. **Accessibility** - aria-labels on all icon-only buttons, role="status" aria-live="polite" on threat badge, focus-visible rings
31. **Mobile/Tablet Layout** - Viewport <768px detection, hamburger menu, tab bar navigation, 44px touch targets, Mobile preset, CSS media queries
32. **SSE (Server-Sent Events)** - Single EventSource connection replaces all polling. `/api/stream` endpoint sends named events (commodities, events, news, sirens, red-alerts, adsb, ai-brief, telegram). Exponential backoff reconnection (max 5 retries, 30s max delay). Connection indicator in header.
33. **HTML Intelligence Export** - Dark-themed styled HTML report with sections for alerts, events, military flights, ADS-B, maritime, market movers. Opens in new window with Print/PDF button.
34. **Map Search** - Autocomplete search overlay on conflict-map.tsx with indexed static data (bases, facilities, infrastructure). Keyboard navigation, fly-to + pulsing highlight.
35. **Maritime EEZ Layer** - 12 EEZ zones (Iran, Saudi Arabia, UAE, Oman, Kuwait, Qatar, Bahrain, Iraq, Yemen, Egypt, Israel, Lebanon) as PolygonLayer. Toggleable under MARITIME group in layer panel.
36. **Configurable Thresholds** - Settings overlay with sliders for CRITICAL/HIGH/ELEVATED alert thresholds. Persisted to localStorage `warroom_settings`.
37. **Anomaly Detection** - useAnomalyDetection hook monitoring alert spikes, siren clusters, flight concentrations, price spikes, telegram surges. Amber badge on AI panel, anomaly feed with timestamps.
38. **Panel State Persistence** - visiblePanels saved to localStorage `warroom_panel_state` with 500ms debounce.

## Earlier Enhancement Features (T001-T005)
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
- `GET /api/stream` - SSE endpoint streaming all data types (commodities 5s, adsb 6s, red-alerts 8s, sirens 10s, events 15s, news 20s, telegram 25s, ai-brief 60s)
- `GET /api/news` - Breaking news items
- `GET /api/commodities` - Commodity and FX prices
- `GET /api/sirens` - Active siren alerts
- `GET /api/red-alerts` - Multi-country Red Alert system data, 57 cities across 12 countries
- `GET /api/events` - Map events, flights, ships
- `GET /api/telegram` - Telegram channel messages
- `GET /api/telegram/live` - Live Telegram channel scraping with custom channels
- `GET /api/ai-brief` - AI intelligence brief with key developments
- `POST /api/ai-deduct` - AI deduction/forecasting (on-demand)
- `GET /api/adsb` - ADS-B flight tracking data, 40 aircraft
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

## Theme & Text Sizing (v2 Style Refresh)
- Dark Bloomberg terminal aesthetic with warm amber primary (--primary: 36 90% 52%)
- Background: --background: 228 28% 4% (blue-tinted near-black)
- Card: --card: 228 24% 5.5%
- Border: --border: 228 16% 11% (very subtle, near-invisible)
- Panel borders use border-white/[0.03] to border-white/[0.06] pattern (not border-border/)
- Overlay/modal borders use border-white/[0.08]
- Header: h-12 with bg-card/80 backdrop-blur-xl, WARROOM logo gradient box
- Panel headers: h-10 style, 2px left accent, text-[10px] tracking-[0.2em], text-foreground/40
- Status bar: h-8, text-[9px], bg-card/30
- Event timeline: h-8, bg-card/15
- News ticker: h-7, bg-card/20, text-[10px] items
- Resize handles: 1px width (w-px/h-px), hover to bg-primary/25
- WARROOM logo: amber text shadow hsl(36 90% 52% / 0.6)
- JetBrains Mono for data/numbers, Inter for UI text
- Green/red for market indicators, cyan for ADS-B, purple for AI Intel
- Text sizing: 9-10px for all data/labels, no text-[12px] or text-[14px] or text-sm in panels
- Input fields: bg-white/[0.03] border-white/[0.07], text-[10px], placeholder text-foreground/20
- Filter tabs: text-[9px], bg-white/[0.02] border-white/[0.05] inactive

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
