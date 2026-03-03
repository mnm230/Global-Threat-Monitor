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
- **Responsiveness:** The layout adapts to mobile (<768px), tablet (768-1199px), and desktop (>=1200px) breakpoints, featuring a single-column stack on mobile, a two-column grid on tablets, and a fixed two-row, resizable panel layout on desktops.
- **Panel System:** Features 9 core panels (`news`, `telegram`, `intel`, `map`, `events`, `radar`, `adsb`, `alerts`, `markets`) arranged in a two-row grid with customizable resizing. Panels can be minimized, with restore tabs appearing in the status bar.
- **Touch Screen Support:** Enhanced for touch devices with enlarged tap targets, touch event handling for resizing and map interactions, and CSS adjustments to optimize for coarse pointers.

**Technical Implementations:**
- **Frontend:** Developed using React, TypeScript, Vite, TailwindCSS, and Shadcn UI for a robust and efficient user interface.
- **Backend:** An Express.js REST API serves data and handles external API integrations.
- **Mapping & Visualization:** Utilizes deck.gl and MapLibre GL with a CARTO dark basemap, supporting both 2D and 3D globe visualizations. Features 37 infrastructure data layers categorized for operational, military, strategic, and humanitarian insights.
- **Real-time Data:** Employs Server-Sent Events (SSE) via a single `/api/stream` endpoint for continuous updates across all data types (commodities, ADS-B, red-alerts, sirens, events, news, telegram, AI-brief).
- **Data Handling:** Shared TypeScript types (`shared/schema.ts`) ensure data consistency across frontend and backend.
- **Red Alert System:** Integrates multiple primary and fallback APIs for real-time Israeli Red Alerts (Tzeva Adom), displaying alerts with visual urgency tiers and trilingual support.
- **ADS-B Tracking:** Live ADS-B data is sourced from `adsb.lol`, with auto-classification of aircraft types and detailed flight information.
- **Telegram OSINT:** Scrapes public Telegram channels via `t.me/s/` for live OSINT feeds, with server-side caching and language filtering.
- **AI Intelligence:** Features a simulated AI world brief panel with risk assessment, key developments, and AI deduction/forecasting capabilities.
- **Persistence:** Panel visibility, layout presets, and user settings (e.g., alert thresholds, custom watchlists, analyst notes) are persisted in `localStorage`.
- **Error Handling:** Generic `PanelErrorBoundary` for robust error handling in UI panels.
- **Accessibility:** Implemented `aria-labels` and `role="status"` for improved accessibility.

**Feature Specifications:**
- **Breaking News Feed:** Displays 15 categorized news items.
- **Markets Panel:** Monitors 17 instruments across commodities, major FX, and regional FX, with a scrolling ticker.
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
- **Animated Missile Arcs:** Simulates missile trajectories with animated arcs.
- **Distance/Radius Tool:** Measures distances and radii on the map.
- **Satellite Thermal Hotspots:** Real NASA FIRMS VIIRS satellite data showing thermal/fire anomalies across MENA region. Two toggleable layers: point markers (sized by FRP, colored by confidence) and heatmap visualization. Data from NOAA-20 satellite, refreshed every 15 minutes, cached server-side. Accessible via `/api/thermal-hotspots` endpoint and SSE `thermal` event. Map layers: "Thermal Hotspots" (ScatterplotLayer) and "Thermal Heat Map" (HeatmapLayer) in the SATELLITE layer group.

## External Dependencies
- **ADS-B Data:** `adsb.lol` (for live flight tracking)
- **Red Alert Data:** `api.tzevaadom.co.il/notifications` and `api.tzevaadom.co.il/alerts-history`, with `oref.org.il` as a tertiary fallback.
- **Earthquake Data:** USGS
- **Satellite Thermal Data:** NASA FIRMS (`firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv`) — real-time VIIRS fire/thermal detection data, filtered to MENA region (lat 12-42, lng 24-63)
- **X/Twitter News Feeds:** `syndication.twitter.com/srv/timeline-profile/screen-name/{handle}` — scrapes public X/Twitter profiles (@FirstSquawk, @AvichayAdraee) for real-time news headlines. Labeled as "First Squawk" and "IDF Spokesperson" sources. 2-min cache TTL, auto-categorized (breaking/military/diplomatic/economic), merged with static news and sorted by timestamp. Arabic tweets get `titleAr` populated automatically.
- **Mapping:** CARTO (basemap), deck.gl, MapLibre GL
- **Icons:** react-icons
- **UI Components:** shadcn/ui, radix-ui
- **Telegram:** `t.me/s/` (for public channel scraping)
- **YouTube:** YouTube API (for embedding live streams)