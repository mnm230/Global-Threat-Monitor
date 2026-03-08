# WARROOM - Middle East Intelligence Dashboard

## Overview
WARROOM is a real-time intelligence dashboard, styled like a Bloomberg Terminal, providing actionable intelligence on geopolitical events, military movements, and economic indicators in the Middle East, specifically Iran, Israel, and Lebanon. Its core capabilities include missile tracking, flight radar, maritime surveillance, commodity price monitoring, breaking news aggregation, Telegram OSINT feeds, and AI-driven intelligence briefings. The project aims to offer a high-fidelity, real-time geopolitical situational awareness tool with extensive data visualization and bilingual support for analysts and decision-makers.

## User Preferences
Not specified.

## System Architecture
The WARROOM dashboard is built using a modern web stack, emphasizing real-time data delivery, interactive visualization, and a dark, information-dense UI.

**UI/UX Decisions:**
- **Theme:** Military command-center aesthetic with a deep dark theme, teal primary accents, and subtle glow effects. Utilizes `hsl` color values for consistency.
- **Typography:** Fira Sans for headers and Fira Mono for data readouts, with compact font sizes for high information density.
- **Clocks:** Displays both UTC and Lebanon/Beirut time with timezone labels.
- **Responsiveness:** Adaptive layouts for mobile, tablet, and desktop, with specific UI adjustments for each, including single-panel views for mobile and CSS grid layouts for tablets.
- **Panel System:** Features 18 customizable, resizable panels (`map`, `telegram`, `events`, `alerts`, `markets`, `gpsspoof`, `netblack`, `notams`, `infra`, `livefeed`, `alertmap`, `analytics`, `osint`, `sitrep`, `attackpred`, `rocketstats`, `aiprediction`) within a React-grid-layout.
- **Alert Map:** Full-width panel leveraging MapLibre GL with responsive overlays for different screen sizes and a red alert heatmap visualization.

**Technical Implementations:**
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Shadcn UI.
- **Backend:** Express.js REST API.
- **Mapping & Visualization:** deck.gl and MapLibre GL with a custom ultra-dark CARTO basemap and 40+ toggleable layers, supporting a 3-layer rendering system for event markers.
- **Real-time Data:** Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates.
- **Red Alert System:** Integrates multiple APIs for real-time Israeli Red Alerts, including visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data with auto-classification, detailed flight info, and server-side caching.
- **GPS Spoofing Detection:** Analyzes ADS-B NACp/NIC/SIL fields to detect and cluster GPS spoofing/jamming zones with severity levels.
- **Internet Blackout Monitoring:** Uses IHR API for real-time BGP routing health of 13 Middle Eastern countries with defined thresholds for online, degraded, disrupted, and blackout statuses.
- **NOTAM Panel:** Fetches/generates NOTAMs for key ME airports, inferring airspace closures from red alerts and GPS interference.
- **Telegram OSINT:** Scrapes 50+ public Telegram channels with server-side caching and filtering, focusing on near-real-time updates for priority channels.
- **AI Intelligence:** AI world brief panel with risk assessment and forecasting, and an AI Attack Predictor panel using Anthropic Claude for probabilistic attack predictions.
- **Rocket/Missile Stats:** Dedicated panel tracking rocket, missile, and drone launches, including origin inference, intercept rates, and active fronts.
- **Multi-LLM Intelligence Engine:** Runs OpenAI GPT, Anthropic Claude, Google Gemini, and xAI Grok in parallel for threat assessments, with Anthropic Claude being primary for conflict-content AI tasks.
- **Persistence:** User settings, panel visibility, and layout presets stored in `localStorage`.
- **Performance Optimizations:** Extensive use of `React.memo`, debounced resize handlers, SSE server-side deduplication, CSS containment, `will-change`, memoized data arrays, and `requestAnimationFrame` batching for SSE events.
- **Error Handling:** Generic `PanelErrorBoundary` for robust UI panel error handling.
- **Accessibility:** Implemented `aria-labels` and `role="status"`.
- **Feature Specifications:** Includes core panels like Breaking News, Markets, YouTube Live, Analytics, Cyber Threats, and mapping tools such as Map Search, Maritime EEZ Layer, Animated Missile Arcs, and Threat Heat Maps. Alerting features include Live Sirens, Anomaly Detection, Desktop Notifications, and Alert Filtering. Intelligence and workflow tools provide Language Toggle, Panel Maximization, Threat Level Banner, Analyst Notes, Correlation Engine, and PDF export for reports. Interactive elements enable click-to-detail on radar panels. Sound improvements include modern emergency broadcast alert tones and distinct chimes for Telegram OSINT messages.

## External Dependencies
- **ADS-B Data:** `api.airplanes.live/v2` for live flight data.
- **Red Alert Data:** `api.tzevaadom.co.il/notifications`, `api.tzevaadom.co.il/alerts-history`, Tzevaadom WebSocket, and Telegram extraction.
- **Satellite Thermal Data:** NASA FIRMS (`firms.modaps.eosdis.nasa.gov`) for thermal hotspots.
- **Commodity Prices:** Stooq.com CSV API (`stooq.com/q/l/`) for 7 key commodity symbols.
- **OSINT Feed:** Multi-layer X scraping (xcancel.com/nitter.cz, Nitter RSS, X syndication endpoint) and 17 OSINT RSS feeds including Long War Journal, Breaking Defense, Middle East Eye, and various news sources.
- **Mapping:** CARTO (basemap), deck.gl, MapLibre GL.
- **Icons:** react-icons.
- **UI Components:** shadcn/ui, radix-ui.
- **Telegram:** `t.me/s/` for scraping 38 public channels, with priority given to 14 channels for fast-lane updates.
- **YouTube:** YouTube API for embedding live streams.