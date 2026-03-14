# WARROOM - Middle East Intelligence Dashboard

## Overview
WARROOM is a real-time intelligence dashboard, styled like a Bloomberg Terminal, providing actionable intelligence on geopolitical events, military movements, and economic indicators in the Middle East, specifically Iran, Israel, and Lebanon. Its core capabilities include missile tracking, flight radar, maritime surveillance, commodity price monitoring, breaking news aggregation, Telegram OSINT feeds, and AI-driven intelligence briefings. The project aims to offer a high-fidelity, real-time geopolitical situational awareness tool with extensive data visualization and bilingual support for analysts and decision-makers.

## User Preferences
Not specified.

## System Architecture
The WARROOM dashboard is built using a modern web stack, emphasizing real-time data delivery, interactive visualization, and a dark, information-dense UI.

**UI/UX Decisions:**
- **Theme:** Warm Command Center — dark charcoal background (`hsl(20 10% 5%)`), orange-gold primary accent (`hsl(32 92% 50%)`), minimal shadows, 4px border-radius, tight 4px grid gaps. Monospace-heavy typography. All scrollbar, focus, selection, glow, and grid interaction colors use warm hsl(32/25/20) tones instead of blue.
- **Typography:** Fira Sans for display/body, Fira Mono for data readouts and panel headers, with compact font sizes (13px base) for maximum information density. Google Fonts loads Fira Sans + Fira Mono.
- **Clocks:** Displays both UTC and Lebanon/Beirut time with timezone labels.
- **Responsiveness:** Adaptive layouts for mobile, tablet, and desktop, with specific UI adjustments for each, including single-panel views for mobile and CSS grid layouts for tablets.
- **Panel System:** Features customizable, resizable panels (`telegram`, `events`, `alerts`, `markets`, `livefeed`, `alertmap`, `analytics`, `osint`, `attackpred`, `rocketstats`, `aiprediction`) within a React-grid-layout. Internet Monitor (netblack) and NOTAM panels removed.
- **Alert Map:** Full-width panel leveraging MapLibre GL with responsive overlays for different screen sizes and a red alert heatmap visualization.

**Technical Implementations:**
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Shadcn UI.
- **Backend:** Express.js REST API.
- **Mapping & Visualization:** deck.gl and MapLibre GL with a custom ultra-dark CARTO basemap and 40+ toggleable layers, supporting a 3-layer rendering system for event markers.
- **Real-time Data:** Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates.
- **Red Alert System:** Integrates multiple APIs for real-time Israeli Red Alerts, including visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data with auto-classification, detailed flight info, and server-side caching.
- **Telegram OSINT:** Scrapes 50+ public Telegram channels with server-side caching and filtering, focusing on near-real-time updates for priority channels.
- **AI Intelligence:** AI world brief panel with risk assessment and forecasting, and an AI Attack Predictor panel using Anthropic Claude for probabilistic attack predictions.
- **Alert Statistics:** Dedicated panel showing real-time alert data from Tzevaadom + Telegram feeds. Displays alert counts by threat type, estimated origin corridors (geographic inference), top alert regions, active fronts, and peak hour. No fabricated intercept rates or synthetic historical data — all stats derived from actual alert activations. Op. Fury and Live conflict feed tabs retained.
- **Multi-LLM Intelligence Engine:** Runs OpenAI GPT, Anthropic Claude, Google Gemini, and xAI Grok in parallel for threat assessments, with Anthropic Claude being primary for conflict-content AI tasks.
- **Persistence:** User settings, panel visibility, and layout presets stored in `localStorage`.
- **Performance Optimizations:** Extensive use of `React.memo`, debounced resize handlers, SSE server-side deduplication, CSS containment, `will-change`, memoized data arrays, and `requestAnimationFrame` batching for SSE events. Progressive panel rendering on desktop (top row immediate, bottom row in 3 batches at 400ms intervals). Staggered initial SSE data fetches (critical data immediate, secondary at 500ms, tertiary at 1.5s, OSINT at 3s). Reduced polling intervals (Telegram 3s, red alerts 3s, thermal 30s, news 30s, GDELT 60s, attack prediction 60s). Removed unused maplibre-gl JS import (CSS-only).
- **Error Handling:** Generic `PanelErrorBoundary` for robust UI panel error handling.
- **Per-Panel Freshness Indicators:** `FeedFreshnessContext` tracks last-received timestamps per SSE feed. `FreshnessBadge` in PanelHeader shows LIVE (green, <15s), delayed (yellow, seconds count), stale (red, minutes/STALE). Wired via `feedKey` prop on all panels: Markets, Sirens, Flight Radar, Conflict Events, Maritime, Live Feed, Telegram, OSINT, Analytics, Alert Map, Rocket Stats, AI Prediction, Attack Predictor, and Red Alerts.
- **Standardized PanelHeader:** All panels use the unified `PanelHeader` component (32px tall, monospace uppercase, with feedKey/extra/count props). Exception: RedAlertPanel retains a custom header for mobile-responsive active-alert styling but integrates FreshnessBadge directly.
- **Panel Controls Visibility:** Pop-out buttons always visible at 40% opacity (previously hidden until hover). Maximize/minimize buttons have aria-labels.
- **Text Readability:** CSS font-size floor rules (`.react-grid-item` and global) enforce 11px minimum for all text classes. Inline fontSize values throughout dashboard also enforce 11px floor. Opacity floors for muted/foreground text in panels (minimum 0.35-0.45 alpha).
- **XSS Security:** `escHtml()` utility sanitizes all external data in the export report HTML (event titles, descriptions, country names, callsigns, ship names, market symbols) before interpolation into `document.write`.
- **Color System:** Warm Command Center tokens throughout. All structural UI accents (header bar, breaking news, toolbar buttons, focus rings, grid hover/drag/placeholder, resize handles, mobile dots) use orange/amber tones. Data-semantic colors (country chips, severity badges, cyber types, stat grid values) retain functional colors (red/purple/emerald/cyan/blue) for differentiation. AIPrediction panel uses amber accents.
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