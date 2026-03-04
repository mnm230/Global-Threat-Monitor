# WARROOM - Middle East Intelligence Dashboard

## Overview
WARROOM is a real-time intelligence dashboard designed to monitor the Middle East conflict region, offering a comprehensive, Bloomberg Terminal-style interface. Its core purpose is to provide immediate, actionable intelligence on geopolitical events, military movements, and economic indicators across Iran, Israel, and Lebanon. Key capabilities include missile tracking, flight radar, maritime surveillance in the Strait of Hormuz, commodity price monitoring, breaking news aggregation, Telegram OSINT feeds, and AI-driven intelligence briefings. The project aims to deliver a high-fidelity, real-time geopolitical situational awareness tool with extensive data visualization and bilingual support, serving as a critical resource for analysts and decision-makers in understanding complex regional dynamics.

## User Preferences
Not specified.

## System Architecture
The WARROOM dashboard is built with a modern web stack, prioritizing real-time data delivery, interactive visualization, and a dark, information-dense UI.

**UI/UX Decisions:**
- **Theme:** Inspired by the Bloomberg Terminal, featuring a dark aesthetic with a warm amber primary accent (`hsl(36 90% 52%)`). The background is a blue-tinted near-black (`hsl(228 28% 4%)`), with subtle white borders for panels and overlays.
- **Typography:** JetBrains Mono is used for data and numbers, while Inter is used for UI text, ensuring clarity and readability.
- **Text Sizing:** A compact font size of 9-10px is used for most data and labels within panels to maximize information density.
- **Responsiveness:** The layout adapts to mobile (<768px), tablet (768-1199px), and desktop (>=1200px) breakpoints. Mobile uses a tab-based single-panel view with bottom navigation bar (6 key panels + "More" picker), hiding ticker bar, event timeline, news ticker, and status bar to maximize screen space. Tablet uses a 2-column auto-rows-fr grid with map/alertmap/godseye spanning full width. Desktop uses a fixed two-row, resizable panel layout. iOS safe areas supported via `env(safe-area-inset-top/bottom)`, viewport-fit=cover, apple-mobile-web-app-capable meta tags.
- **Panel System:** Features 9 core panels (`news`, `telegram`, `intel`, `map`, `events`, `radar`, `adsb`, `alerts`, `markets`) arranged in a two-row grid with customizable resizing. Panels can be minimized, with restore tabs appearing in the status bar.
- **Touch Screen Support:** Comprehensive iPad/tablet/touch optimization. Runtime touch detection (`ontouchstart`/`maxTouchPoints`) adapts UI: panel close/maximize buttons scale from 24px to 36px, map zoom/layer controls scale from 32px to 44px, header height 48px, settings overlay toggle switches scale to 44px, region presets and layer toggles scale to 36px min-height. CSS `@media (pointer: coarse)` rules: resize handles always visible at 20px, `.panel-drag-handle` min-height 40px, range inputs 32px thumb, scrollbars 6px, `.warroom-panel-close/.warroom-panel-maximize` min 32px. Tablet-specific (`768-1199px + pointer:coarse`): header 48px, panel min-height 260px, panel headers 40px. Mobile menu button 44px. Settings save button padded for touch.

**Technical Implementations:**
- **Frontend:** Developed using React, TypeScript, Vite, TailwindCSS, and Shadcn UI for a robust and efficient user interface.
- **Backend:** An Express.js REST API serves data and handles external API integrations.
- **Mapping & Visualization:** Utilizes deck.gl and MapLibre GL with CARTO Dark Matter basemap (OpenStreetMap data). Proper OSM attribution displayed on all maps. Styled in liveuamap.com-inspired ultra-dark aesthetic. Custom overrides: near-black water (#080c14), very dark background (#06090f), dark land (#0c1018), subtle borders (#2a3344 at 35% opacity), dimmed labels/roads/buildings. Event markers use 3-layer rendering (outer glow + ring + core dot). Click popup cards are liveuamap-style with left accent color bar, category tag, timestamp, coordinates, and Google Maps link. Tools panel (top-left) and Layers panel (top-right) are minimal and semi-transparent. Zoom +/- controls on bottom-right. 40+ toggleable layers with dot indicators. Alert Map panel uses separate MapLibre instance for red alert heatmap visualization.
- **Real-time Data:** Employs Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates across all data types (commodities, ADS-B, red-alerts, sirens, events, news, telegram, AI-brief).
- **Data Handling:** Shared TypeScript types (`shared/schema.ts`) ensure data consistency across frontend and backend.
- **Red Alert System:** Integrates multiple primary and fallback APIs for real-time Israeli Red Alerts (Tzeva Adom), displaying alerts with visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data is sourced from `adsb.lol`, with auto-classification of aircraft types and detailed flight information.
- **Telegram OSINT:** Scrapes public Telegram channels via `t.me/s/` for live OSINT feeds, with server-side caching, language filtering, and inline media lightbox for images/photos.
- **AI Intelligence:** AI world brief panel with risk assessment, key developments, and AI deduction/forecasting capabilities.
- **Multi-LLM Intelligence Engine:** Runs OpenAI GPT-4.1, Anthropic Claude Sonnet 4-6, Google Gemini 2.5 Flash, and xAI Grok-3 (via OpenRouter) in parallel for threat assessments. Each model provides independent risk level, summary, key insights, confidence score, and latency. Consensus risk computed via weighted average of risk levels (EXTREME=5, HIGH=4, ELEVATED=3, MODERATE=2, LOW=1). Model agreement percentage shown (based on max divergence). Cached 30s server-side. 15s per-provider timeout. Integrated into Analytics panel with per-engine cards, divergence/agreement alerts, and consensus box. Frontend shows engine-colored cards (OpenAI=emerald, Anthropic=orange, Google=blue, xAI=rose) with status indicators.
- **Persistence:** Panel visibility, layout presets, and user settings (e.g., alert thresholds, custom watchlists, analyst notes) are persisted in `localStorage`.
- **Error Handling:** Generic `PanelErrorBoundary` for robust error handling in UI panels.
- **Accessibility:** Implemented `aria-labels` and `role="status"` for improved accessibility.

**Feature Specifications:**
- **Breaking News Feed:** Displays 15 categorized news items.
- **Markets Panel:** Monitors 17 instruments across commodities, major FX, and regional FX, with a scrolling ticker. FX rates sourced live from Open Exchange Rates API (5-min cache). Commodity prices use real FX rates with no simulated jitter.
- **Language Toggle:** Supports English and Arabic (RTL).
- **Live Sirens:** Displays active rocket/missile/UAV sirens via a scrolling red alert banner.
- **YouTube Live Feed Panel:** Embeds live YouTube streams, configurable via settings.
- **Map Search:** Autocomplete search for facilities and infrastructure on the map.
- **Maritime EEZ Layer:** Visualizes 12 EEZ zones in the region.
- **Anomaly Detection:** Monitors alert spikes, flight concentrations, and price surges.
- **Panel Maximization:** Allows panels to expand to 100% of the view area.
- **Threat Level Banner:** Dynamic header badge indicating overall threat level.
- **Desktop Notifications:** Browser notifications for new red alerts.
- **Alert Filtering & History:** Filters alerts by threat type and provides a historical view.
- **Analyst Notes:** Persistent, categorized sticky notes.
- **Correlation Engine:** Identifies spatial/temporal patterns across events and alerts.
- **Historical Timeline:** Visualizes past events on a timeline.
- **Export/Report:** Generates downloadable intelligence reports.
- **Threat Heat Map:** Visualizes event/alert intensity using a heatmap layer.
- **Alert Density Heat Map:** Dedicated toggleable heatmap layer showing red alert density weighted by recency (newer = brighter) and severity (missiles > rockets > UAV). Dark red → orange → yellow color range. Found in "OPERATIONAL" layer group.
- **Animated Missile Arcs:** Simulates missile trajectories with animated arcs.
- **Distance/Radius Tool:** Measures distances and radii on the map.
- **Satellite Thermal Hotspots:** Real NASA FIRMS VIIRS satellite data showing thermal/fire anomalies across MENA region. Two toggleable layers: point markers (sized by FRP, colored by confidence) and heatmap visualization. Data from NOAA-20 satellite, refreshed every 15 minutes, cached server-side. Accessible via `/api/thermal-hotspots` endpoint and SSE `thermal` event. Map layers: "Thermal Hotspots" (ScatterplotLayer) and "Thermal Heat Map" (HeatmapLayer) in the SATELLITE layer group.
- **Analytics Dashboard Panel:** Fetches from `/api/analytics`, `/api/patterns`, `/api/false-alarms`. Shows stats (active alerts, false alarm rate, avg response time, threat trend), 24h timeline sparkline, alerts by region/type bar charts, source reliability table, detected patterns, and false alarm analysis.
- **Sound Improvements:** Distinct synthesized tones per threat type (rockets=rapid beep, missiles=sustained low sweep, UAV=3-pulse mid-tone, hostile aircraft=descending siren). Volume slider (0-100%), silent mode toggle. Settings stored in localStorage.
- **Alert History Timeline:** 24h scrollable timeline in Alert History overlay. 96 x 15-min buckets with stacked bars colored by threat type. Visual clustering (5+ alerts = highlight). Escalation detection (3+ increasing consecutive buckets). Click bucket to view details.
- **Browser Push Notifications:** Service Worker (`client/public/sw.js`) enables persistent notifications when tab is backgrounded. Uses `postMessage` to SW which calls `showNotification`. Click notification focuses/opens dashboard tab. Notification level setting: All/Critical Only/None.
- **X / Twitter Feed Panel:** Live X/Twitter OSINT feed panel scraping 13 accounts (FirstSquawk, AvichayAdraee, IntelCrab, sentdefender, IsraelRadar_, AuroraIntel, Faytuks, Conflicts, BNONews, igaboriau, NotWoofers, ELINTNews, charles_lister). Backend: `fetchXFeeds()` with 2-min cache, per-account rate limiting (5-min backoff on 429), `/api/x-feed` REST endpoint, `x-feed` SSE event at 5s intervals. Frontend: `XFeedPanel` component with account filter tabs, verified badge, category badges (breaking/military/diplomatic/humanitarian/economic/nuclear), relative timestamps, external links. Panel ID: `xfeed`, visible by default in Default layout preset. Note: Twitter syndication endpoint may block cloud server IPs — X feed works best from non-cloud IPs.
- **Flight Click-to-Pan:** Clicking a flight row or "Locate on Map" button in FlightRadarPanel/AdsbPanel pans the conflict map to that flight's coordinates (zoom 9). Uses `mapFocusLocation` state in Dashboard → `focusLocation` prop on MapSection → ConflictMap. ConflictMap uses `useEffect` with `prevFocusRef` dedup to avoid redundant pans.

**SSE Intervals:** commodities 5s, ADS-B 2s, red-alerts 8s, GDELT 10s, news 10s, telegram 10s, AI brief 10s, X feed 5s, earthquakes 10s, thermal 10s, cyber 10s, classified 10s, analytics 10s.
**Cache TTLs:** All caches ≤10s (NEWS 10s, X 10s, GDELT 10s, FX 10s, COMMODITY 10s, EQ 10s, THERMAL 10s, CYBER 10s, TELEGRAM 10s, AI_CLASSIFY 10s, AI_BRIEF 10s, OREF 0s). FETCH_COOLDOWN_MS=0 (ADS-B throttled by SSE interval). Client staleTime=0, refetchOnWindowFocus=true.
- **Radar Panel Click-to-Detail:** FlightRadarPanel and MaritimePanel support click-to-select on list items. Clicking a flight/ship expands a detail card showing type, altitude/flag, speed, heading, coordinates (lat/lng), with links to Google Maps, FlightRadar24 (flights), and MarineTraffic (ships). Each list row also has a quick Google Maps pin icon. Detail card dismissable via X button or re-clicking.

## External Dependencies
- **ADS-B Data:** `adsb.lol` (for live flight tracking)
- **Red Alert Data:** `api.tzevaadom.co.il/notifications` and `api.tzevaadom.co.il/alerts-history`, with `oref.org.il` as a tertiary fallback.
- **Earthquake Data:** USGS
- **Satellite Thermal Data:** NASA FIRMS (`firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv`) — real-time VIIRS fire/thermal detection data, filtered to MENA region (lat 12-42, lng 24-63)
- **X/Twitter News Feeds:** `syndication.twitter.com/srv/timeline-profile/screen-name/{handle}` — scrapes public X/Twitter profiles (@FirstSquawk, @AvichayAdraee) for real-time news headlines. Labeled as "First Squawk" and "IDF Spokesperson" sources. 2-min cache TTL, auto-categorized (breaking/military/diplomatic/economic), merged with static news and sorted by timestamp. Arabic tweets get `titleAr` populated automatically.
- **Mapping:** CARTO (basemap), deck.gl, MapLibre GL
- **Icons:** react-icons
- **UI Components:** shadcn/ui, radix-ui
- **Telegram:** `t.me/s/` (for public channel scraping, 30s cache TTL with in-flight request deduplication and rate-limit backoff)

## Security
- **sanitizeText():** Strips all HTML tags, script/style blocks, `javascript:` URIs, and event handler attributes from feed content. Applied after `stripHtmlToText()` as a second safety layer. Does NOT use HTML entity encoding (which caused double-encoding of `&amp;quot;` in Telegram/X feeds). React auto-escapes all text content on render — no `dangerouslySetInnerHTML` is used.
- **Helmet CSP:** Content Security Policy headers via helmet, allowing YouTube iframes, CARTO tiles, and external images.
- **Rate Limiting:** express-rate-limit at 120 req/min; SSE endpoints exempt.
- **Body Size Limits:** 1mb max request body.
- **YouTube:** YouTube API (for embedding live streams)