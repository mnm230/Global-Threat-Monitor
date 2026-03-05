# WARROOM - Middle East Intelligence Dashboard

## Overview
WARROOM is a real-time intelligence dashboard designed to monitor the Middle East conflict region, offering a comprehensive, Bloomberg Terminal-style interface. Its core purpose is to provide immediate, actionable intelligence on geopolitical events, military movements, and economic indicators across Iran, Israel, and Lebanon. Key capabilities include missile tracking, flight radar, maritime surveillance, commodity price monitoring, breaking news aggregation, Telegram OSINT feeds, and AI-driven intelligence briefings. The project aims to deliver a high-fidelity, real-time geopolitical situational awareness tool with extensive data visualization and bilingual support, serving as a critical resource for analysts and decision-makers in understanding complex regional dynamics.

## User Preferences
Not specified.

## System Architecture
The WARROOM dashboard is built with a modern web stack, prioritizing real-time data delivery, interactive visualization, and a dark, information-dense UI.

**UI/UX Decisions:**
- **Theme:** Glassmorphic military command-center aesthetic with lightened dark theme. Background `hsl(220 40% 8%)`, card `hsl(220 35% 11%)`, borders `hsl(185 30% 18%)`. Cyan primary accent (`hsl(185 100% 42%)`), semi-transparent panel backgrounds with `backdrop-filter: blur`. 1px thin grid lines between panels. Gradient accent lines on panel headers. Subtle glow effects on interactive elements. Header/sidebar/ticker/status bar/bottom sheet all glass. React-grid-layout 1px margins. Inline panel headers use `hsl(220 35% 9% / 0.88)`.
- **Typography:** JetBrains Mono for data, Inter for UI text. Compact font sizes (9-10px) for high information density.
- **Responsiveness:** Adaptive layout for mobile (<768px), tablet (768-1199px), and desktop (1200+), with specific UI adjustments for each breakpoint. Mobile: single-panel view with bottom tab bar (6 primary tabs + "More" bottom sheet), swipe navigation between panels with dot indicators, compact mini commodity ticker, dropdown hamburger menu with status info (SRC/EVT/ADS counts + clock), panel slide transitions, 100dvh viewport, safe-area-inset support, touch-action manipulation, and hidden close/maximize buttons. Touch targets: 52px min tab buttons, 18px icons.
- **Panel System:** Features 12 panels (`intel`, `map`, `telegram`, `events`, `radar`, `adsb`, `alerts`, `markets`, `cyber`, `livefeed`, `alertmap`, `analytics`) in a customizable, resizable grid (react-grid-layout, 12-col, 150px row height). Mobile uses single-panel view, tablet uses 2-column CSS grid. X/Twitter and Avichay panels removed.

**Technical Implementations:**
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Shadcn UI.
- **Backend:** Express.js REST API.
- **Mapping & Visualization:** deck.gl and MapLibre GL with CARTO Dark Matter basemap, featuring custom ultra-dark styling and 40+ toggleable layers. Event markers use a 3-layer rendering system. Alert Map panel uses a separate MapLibre instance for red alert heatmap visualization.
- **Real-time Data:** Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates across all data types.
- **Data Handling:** Shared TypeScript types (`shared/schema.ts`) for consistency.
- **Red Alert System:** Integrates multiple APIs for real-time Israeli Red Alerts with visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data from `adsb.lol` with auto-classification and detailed flight info. Route lookup via `api.adsbdb.com/v0/callsign/{callsign}` (primary) and `hexdb.io/api/v1/route/iata/{callsign}` (fallback), both free/no-key. Server-side cache with 10-minute TTL. Shows origin→destination airports + airline name in flight detail cards.
- **Telegram OSINT:** Scrapes 40+ public Telegram channels with server-side caching and filtering. Priority channels (14) polled every 500ms for near-real-time updates. Full channel list polled every 15s. Covers Israel, Lebanon (ground ops, Hezbollah), Yemen/Houthi/Red Sea, Gaza/Palestine, Iraq, Syria, Iran, and global OSINT trackers.
- **AI Intelligence:** AI world brief panel with risk assessment, key developments, and forecasting.
- **Multi-LLM Intelligence Engine:** Runs OpenAI GPT-4.1, Anthropic Claude Sonnet 4-6, Google Gemini 2.5 Flash, and xAI Grok-3 in parallel via OpenRouter for threat assessments, providing independent and consensus risk levels. Anthropic Claude is the primary model for conflict-content AI tasks (batch classification, AI briefs, deductions, cyber extraction) to avoid Azure OpenAI content filtering on military/conflict topics. OpenAI is still used for the multi-LLM parallel assessment where Anthropic/Gemini/Grok provide fallback coverage.
- **Persistence:** User settings, panel visibility, and layout presets stored in `localStorage`.
- **Performance Optimizations:** React.memo on frequently-rendered components (PanelHeader, CommodityRow, LiveClock, TickerBar). ADS-B flight interpolation uses refs instead of React state (canvas renders independently from React reconciliation). Resize handler debounced via rAF. SSE server-side hash-based deduplication avoids resending unchanged data. CSS containment (`contain: layout style paint`) and `will-change: transform` on all grid items and glass panels for GPU compositing. Memoized alert sound data arrays to prevent unnecessary re-renders.
- **Error Handling:** Generic `PanelErrorBoundary` for robust UI panel error handling.
- **Accessibility:** Implemented `aria-labels` and `role="status"`.

**Feature Specifications:**
- **Core Panels:** Breaking News Feed, Markets Panel (17 instruments), YouTube Live Feed Panel (5 channels + custom URL), Analytics Dashboard Panel, Cyber Threats Panel (ME-only intelligence).
- **Mapping Tools:** Map Search (autocomplete), Maritime EEZ Layer, Animated Missile Arcs, Distance/Radius Tool, Threat Heat Map, Alert Density Heat Map, Satellite Thermal Hotspots (NASA FIRMS VIIRS data).
- **Alerting & Monitoring:** Live Sirens (scrolling banner), Anomaly Detection (alert spikes, flight concentrations, price surges), Desktop Notifications, Alert Filtering & History (with a 24h scrollable timeline and escalation detection).
- **Intelligence & Workflow:** Language Toggle (English/Arabic), Panel Maximization, Threat Level Banner, Analyst Notes, Correlation Engine, Historical Timeline, Export/Report.
- **Interactive Elements:** Radar Panel Click-to-Detail (flights/ships), Flight Click-to-Pan.
- **Sound Improvements:** Distinct synthesized tones per threat type with volume control.

**SSE Intervals:** commodities 15s, ADS-B 10s, red-alerts 3s, GDELT 15s, news 15s, priority telegram 500ms, full telegram 15s, AI brief 10s, X feed 60s, thermal 10s, cyber 10s, classified 10s, analytics 10s.
**Cache TTLs:** All caches ≤10s with specific longer TTLs for X (120s) and OSINT_RSS (60s). Global cache flush every 15 minutes.

## External Dependencies
- **ADS-B Data:** `api.airplanes.live/v2` — 9 geo-query points covering Israel, Lebanon, Persian Gulf, UAE, Iraq/Syria, Red Sea, Turkey, Egypt, and Tehran. Plus global military endpoint filtered to MENA bounding box. ~90 aircraft per cycle. FR24-style golden yellow plane icons with per-type color coding (red=military, cyan=surveillance, yellow=commercial, amber=cargo, blue=government).
- **Red Alert Data:** `api.tzevaadom.co.il/notifications` (live), `api.tzevaadom.co.il/alerts-history` (6h window, up to 30 groups), Tzevaadom WebSocket (`wss://ws.tzevaadom.co.il/socket`), Telegram extraction. OREF direct/history APIs are geo-blocked (403). All sources merged and deduplicated.
- **Satellite Thermal Data:** NASA FIRMS (`firms.modaps.eosdis.nasa.gov`) — timestamps constructed from `acqDate`+`acqTime` fields, 48h recency filter, up to 40 hotspots as conflict events
- **Commodity Prices:** Stooq.com CSV API (`stooq.com/q/l/`). Individual requests per symbol with format `f=sd2t2ohlcvp` (includes previous close for change calculation). 7 commodity symbols: cb.f (Brent), cl.f (WTI), gc.f (Gold), si.f (Silver, ÷100 for $/oz), ng.f (NatGas), zw.f (Wheat), hg.f (Copper, ÷100 for $/lb). 60s TTL, 60s refresh interval. Falls back to hardcoded prices if all fetches fail.
- **OSINT Feed:** Multi-layer X scraping: xcancel.com/nitter.cz HTML scraping (primary, extracts tweet-content/tweet-date/tweet-link from timeline HTML), Nitter RSS (secondary), X syndication endpoint (fallback). Uses UA rotation (6 user agents) and exponential backoff for rate-limited accounts. OSINT RSS feeds (17 sources): Long War Journal, Breaking Defense, Middle East Eye, Al-Monitor, MEMO, Jerusalem Post, War on the Rocks, Defense News, Asharq Al-Awsat, Press TV, i24 News, The National, Google News ME, France 24 ME, BBC Middle East, Al Jazeera, NYT Middle East. Always merged with X account posts when available. Free News RSS: BBC ME, Al Jazeera, Google News War, NYT ME. Cyber RSS: CyberScoop, HackerNews, The Record, DarkReading, Unit42, CheckPoint, Securelist, CyberShafarat.
- **Mapping:** CARTO (basemap), deck.gl, MapLibre GL
- **Icons:** react-icons
- **UI Components:** shadcn/ui, radix-ui
- **Telegram:** `t.me/s/` (for public channel scraping) — 38 channels across all ME theaters. Priority fast-lane (14 channels at 500ms): wfwitness, lebaborim, bintjbeilnews, almanarnews, AlAhedNews, BNONewsRoom, GeoConfirmed, ELINTNews, OSINTdefender, clashreport, QudsN, AlMasiraaTV, CIG_telegram, Middle_East_Spectator. Full list (38 channels at 15s) adds: Yemen_Press, YemenUpdate, GazaNewsPlus, PalestineChron, SyrianObservatry, IraqLiveUpdate, SouthFrontEng, MilitaryOSINT, and more.
- **YouTube:** YouTube API (for embedding live streams)