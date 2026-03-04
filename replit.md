# WARROOM - Middle East Intelligence Dashboard

## Overview
WARROOM is a real-time intelligence dashboard designed to monitor the Middle East conflict region, offering a comprehensive, Bloomberg Terminal-style interface. Its core purpose is to provide immediate, actionable intelligence on geopolitical events, military movements, and economic indicators across Iran, Israel, and Lebanon. Key capabilities include missile tracking, flight radar, maritime surveillance, commodity price monitoring, breaking news aggregation, Telegram OSINT feeds, and AI-driven intelligence briefings. The project aims to deliver a high-fidelity, real-time geopolitical situational awareness tool with extensive data visualization and bilingual support, serving as a critical resource for analysts and decision-makers in understanding complex regional dynamics.

## User Preferences
Not specified.

## System Architecture
The WARROOM dashboard is built with a modern web stack, prioritizing real-time data delivery, interactive visualization, and a dark, information-dense UI.

**UI/UX Decisions:**
- **Theme:** Bloomberg Terminal-inspired dark aesthetic with a warm amber primary accent (`hsl(36 90% 52%)`) and a blue-tinted near-black background (`hsl(228 28% 4%)`).
- **Typography:** JetBrains Mono for data, Inter for UI text. Compact font sizes (9-10px) for high information density.
- **Responsiveness:** Adaptive layout for mobile, tablet, and desktop, with specific UI adjustments for each breakpoint and comprehensive touch screen support.
- **Panel System:** Features 13 panels (`intel`, `map`, `telegram`, `events`, `radar`, `adsb`, `alerts`, `markets`, `cyber`, `livefeed`, `alertmap`, `analytics`, `xfeed`) in a customizable, resizable grid. Seismic and God's Eye panels were removed.

**Technical Implementations:**
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Shadcn UI.
- **Backend:** Express.js REST API.
- **Mapping & Visualization:** deck.gl and MapLibre GL with CARTO Dark Matter basemap, featuring custom ultra-dark styling and 40+ toggleable layers. Event markers use a 3-layer rendering system. Alert Map panel uses a separate MapLibre instance for red alert heatmap visualization.
- **Real-time Data:** Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates across all data types.
- **Data Handling:** Shared TypeScript types (`shared/schema.ts`) for consistency.
- **Red Alert System:** Integrates multiple APIs for real-time Israeli Red Alerts with visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data from `adsb.lol` with auto-classification and detailed flight info.
- **Telegram OSINT:** Scrapes public Telegram channels with server-side caching and filtering.
- **AI Intelligence:** AI world brief panel with risk assessment, key developments, and forecasting.
- **Multi-LLM Intelligence Engine:** Runs OpenAI GPT-4.1, Anthropic Claude Sonnet 4-6, Google Gemini 2.5 Flash, and xAI Grok-3 in parallel via OpenRouter for threat assessments, providing independent and consensus risk levels.
- **Persistence:** User settings, panel visibility, and layout presets stored in `localStorage`.
- **Error Handling:** Generic `PanelErrorBoundary` for robust UI panel error handling.
- **Accessibility:** Implemented `aria-labels` and `role="status"`.

**Feature Specifications:**
- **Core Panels:** Breaking News Feed, Markets Panel (17 instruments), YouTube Live Feed Panel (5 channels + custom URL), Analytics Dashboard Panel, Cyber Threats Panel (ME-only intelligence), X/Twitter & OSINT Feed Panel (dual-source with fallback).
- **Mapping Tools:** Map Search (autocomplete), Maritime EEZ Layer, Animated Missile Arcs, Distance/Radius Tool, Threat Heat Map, Alert Density Heat Map, Satellite Thermal Hotspots (NASA FIRMS VIIRS data).
- **Alerting & Monitoring:** Live Sirens (scrolling banner), Anomaly Detection (alert spikes, flight concentrations, price surges), Desktop Notifications, Alert Filtering & History (with a 24h scrollable timeline and escalation detection).
- **Intelligence & Workflow:** Language Toggle (English/Arabic), Panel Maximization, Threat Level Banner, Analyst Notes, Correlation Engine, Historical Timeline, Export/Report.
- **Interactive Elements:** Radar Panel Click-to-Detail (flights/ships), Flight Click-to-Pan.
- **Sound Improvements:** Distinct synthesized tones per threat type with volume control.

**SSE Intervals:** commodities 15s, ADS-B 10s, red-alerts 3s, GDELT 15s, news 15s, telegram 15s, AI brief 10s, X feed 60s, thermal 10s, cyber 10s, classified 10s, analytics 10s.
**Cache TTLs:** All caches ≤10s with specific longer TTLs for X (120s) and OSINT_RSS (60s). Global cache flush every 15 minutes.

## External Dependencies
- **ADS-B Data:** `adsb.lol`
- **Red Alert Data:** `api.tzevaadom.co.il/notifications`, `api.tzevaadom.co.il/alerts-history`, `oref.org.il`
- **Satellite Thermal Data:** NASA FIRMS (`firms.modaps.eosdis.nasa.gov`) — timestamps constructed from `acqDate`+`acqTime` fields, 48h recency filter, up to 40 hotspots as conflict events
- **Commodity Prices:** Yahoo Finance v8 spark batch endpoint with crumb/cookie authentication. Fetches consent cookie from `fc.yahoo.com`, gets crumb from `/v1/test/getcrumb`, then queries `query2.finance.yahoo.com/v8/finance/spark` (with `query1` fallback). Single request for all 7 symbols (BZ=F, CL=F, GC=F, SI=F, NG=F, ZW=F, HG=F), 60s TTL. Crumb cached for 10 minutes. Auto-resets crumb on 401/403.
- **OSINT Feed:** Multi-layer X scraping: xcancel.com/nitter.cz HTML scraping (primary, extracts tweet-content/tweet-date/tweet-link from timeline HTML), Nitter RSS (secondary), X syndication endpoint (fallback). Uses UA rotation (6 user agents) and exponential backoff for rate-limited accounts. OSINT RSS feeds (17 sources): Long War Journal, Breaking Defense, Middle East Eye, Al-Monitor, MEMO, Jerusalem Post, War on the Rocks, Defense News, Asharq Al-Awsat, Press TV, i24 News, Times of Israel, Al Arabiya, France 24 ME, BBC Middle East, Al Jazeera, NYT Middle East. Always merged with X account posts when available.
- **Mapping:** CARTO (basemap), deck.gl, MapLibre GL
- **Icons:** react-icons
- **UI Components:** shadcn/ui, radix-ui
- **Telegram:** `t.me/s/` (for public channel scraping) — 15 channels: CIG_telegram, IntelCrab, GeoConfirmed, sentaborim, OSINTdefender, AviationIntel, rnintel, ELINTNews, BNONewsRoom, FirstSquawk, Middle_East_Spectator, interbellumnews, WarMonitor3, claboriau, lebaborim, lebanonnews2
- **YouTube:** YouTube API (for embedding live streams)