# WARROOM — Middle East Intelligence Dashboard

A Bloomberg Terminal-style real-time intelligence dashboard for monitoring the Middle East conflict region. WARROOM provides immediate, actionable situational awareness across military activity, geopolitical events, economic indicators, and open-source intelligence (OSINT).

---

## Features

### Real-Time Alerts & Monitoring
- **Red Alert System (Tzeva Adom)** — Live Israeli rocket/missile/UAV sirens with 3-second polling, visual urgency tiers, trilingual support (Hebrew/Arabic/English), and configurable alert sounds per threat type
- **ADS-B Flight Tracking** — Live military and civilian aircraft tracking via `adsb.lol` with auto-classification, click-to-pan map integration, and detailed flight HUD
- **Maritime Surveillance** — Ship tracking in the Strait of Hormuz and regional waters with vessel detail cards and MarineTraffic links
- **Earthquake Monitoring** — Real-time USGS seismic data for the MENA region

### Intelligence & OSINT
- **Breaking News Feed** — Aggregated news from multiple sources, categorized by topic
- **Telegram OSINT** — Live scraping of public Telegram channels for ground-level intelligence
- **X / Twitter Feed** — 27 curated OSINT accounts with RSS fallback (Long War Journal, ISW, Critical Threats, LiveUAMap, and more)
- **AI Intelligence Briefing** — Automated threat assessments powered by a multi-LLM engine
- **Cyber Threat Intelligence** — Middle East-focused cyber threat monitoring with APT group tracking (OilRig, Charming Kitten, MuddyWater, and 15+ more)
- **YouTube Live Feeds** — Embedded live streams from Al Jazeera, France 24, Sky News Arabia, and TRT World

### Multi-LLM Analysis Engine
Four AI models run in parallel to produce consensus threat assessments:
- **OpenAI GPT-4.1** — Primary analysis
- **Anthropic Claude Sonnet 4** — Cross-validation
- **Google Gemini 2.5 Flash** — Fast supplementary analysis
- **xAI Grok-3** (via OpenRouter) — Alternative perspective

Each model independently evaluates risk level, provides key insights, and reports confidence. The system computes a weighted consensus with model agreement percentage.

### 3D Map & Visualization
- **Interactive Map** — deck.gl + MapLibre GL with CARTO Dark Matter basemap
- **40+ Toggleable Layers** — Military bases, airfields, missile sites, nuclear facilities, oil infrastructure, naval bases, EEZ zones, conflict zones
- **Satellite Thermal Hotspots** — Real NASA FIRMS VIIRS data showing fires and thermal anomalies
- **Alert Density Heatmap** — Visual alert clustering weighted by recency and severity
- **Animated Missile Arcs** — Trajectory visualization
- **Distance/Radius Tool** — On-map measurement

### Markets & Economic Data
- **17 Instruments** — Brent crude, WTI, gold, natural gas, major FX pairs (USD/ILS, USD/SAR, EUR/USD), and regional currencies
- **Live Ticker** — Scrolling price updates with real-time FX rates from Open Exchange Rates

### Analytics & Reporting
- **Grafana-Style Analytics Panel** — Alert statistics, 24-hour timeline, regional breakdowns, source reliability scores, pattern detection
- **Alert History Timeline** — 24h scrollable view with 15-minute buckets, visual clustering, escalation detection
- **Correlation Engine** — Identifies spatial/temporal patterns across events and alerts
- **Export/Report** — Downloadable intelligence reports
- **Analyst Notes** — Persistent categorized sticky notes

### Platform
- **Bilingual** — Full English and Arabic (RTL) support
- **Responsive** — Desktop (resizable panels), tablet (2-column grid), mobile (tab-based navigation with bottom bar)
- **Touch Optimized** — iPad/tablet support with scaled controls
- **Push Notifications** — Service Worker-based notifications for critical alerts even when backgrounded
- **Dark Theme** — Information-dense Bloomberg Terminal aesthetic with amber accent

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, TailwindCSS, Shadcn/UI |
| Backend | Express.js, Node.js |
| Mapping | deck.gl, MapLibre GL, Leaflet, CARTO basemaps |
| Real-time | Server-Sent Events (SSE) |
| AI/LLM | OpenAI, Anthropic, Google Gemini, OpenRouter (Grok) |
| Charts | Recharts |
| State | TanStack React Query, localStorage |
| Types | Zod, Drizzle-Zod, shared TypeScript schemas |

---

## Architecture

```
client/                     # React frontend (Vite)
  src/
    pages/
      dashboard.tsx         # Main dashboard (single-page app)
    components/
      conflict-map.tsx      # Primary 3D map with deck.gl layers
      alert-map.tsx         # Red alert heatmap visualization
      ui/                   # Shadcn UI components
    index.css               # Global styles, CSS variables, dark theme

server/
  index.ts                  # Express server entry
  routes.ts                 # All API routes, SSE, data fetching, AI orchestration
  vite.ts                   # Vite dev server integration
  storage.ts                # Storage interface

shared/
  schema.ts                 # Shared TypeScript types (Zod + Drizzle)
```

### Data Flow

1. **Server** fetches data from 15+ external sources on configurable intervals
2. **SSE stream** (`/api/stream`) pushes updates to all connected clients
3. **Frontend** renders panels with TanStack Query, auto-refreshing on window focus
4. **AI engines** process aggregated data in parallel, producing consensus assessments
5. **Caches** flush globally every 15 minutes to ensure data freshness

---

## External Data Sources

| Source | Data | Update Interval |
|--------|------|----------------|
| [adsb.lol](https://adsb.lol) | Live ADS-B aircraft positions | 10s |
| [Tzeva Adom API](https://api.tzevaadom.co.il) | Israeli red alerts / sirens | 3s |
| [USGS](https://earthquake.usgs.gov) | Earthquake data | 10s |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov) | VIIRS satellite thermal hotspots | 15min |
| [Open Exchange Rates](https://openexchangerates.org) | FX rates | 5min |
| [GDELT](https://api.gdeltproject.org) | Global event data | 15s |
| Telegram (`t.me/s/`) | OSINT channel scraping | 15s |
| Twitter Syndication | 27 OSINT accounts | 60s |
| OSINT RSS Feeds | 9 defense/intel publications | 60s |
| Cyber RSS (7 feeds) | BleepingComputer, Unit42, Check Point, SecureList, etc. | 10s |
| YouTube | Live news streams (5 channels) | On-demand |

---

## Getting Started

### Prerequisites
- Node.js 20+
- API keys for AI providers (configured via Replit integrations):
  - OpenAI (GPT-4.1)
  - Anthropic (Claude Sonnet)
  - Google Gemini
  - OpenRouter (Grok-3)

### Running

```bash
npm run dev
```

This starts both the Express backend and Vite frontend dev server on port 5000.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Express session signing |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API access |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API access |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Google Gemini API access |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` | OpenRouter (Grok) API access |

---

## SSE Event Types

The `/api/stream` endpoint emits these event types:

| Event | Data | Interval |
|-------|------|----------|
| `commodities` | Market prices, FX rates | 15s |
| `adsb` | Aircraft positions | 10s |
| `red-alerts` | Active sirens | 3s |
| `news` | Breaking news items | 15s |
| `telegram` | Telegram OSINT posts | 15s |
| `ai-brief` | AI intelligence assessment | 10s |
| `xfeed` | X/Twitter posts | 60s |
| `earthquakes` | Seismic events | 10s |
| `thermal` | NASA thermal hotspots | 10s |
| `cyber` | Cyber threat events | 10s |
| `classified` | AI threat classification | 10s |
| `analytics` | Dashboard analytics | 10s |
| `gdelt` | GDELT geopolitical events | 15s |

---

## Security

- **Content Security Policy** via Helmet (allowlisted domains for iframes, tiles, images)
- **Rate Limiting** — 120 requests/minute per IP (SSE exempt)
- **Input Sanitization** — HTML stripping, script/event handler removal on all feed content
- **No `dangerouslySetInnerHTML`** — React auto-escaping for all rendered text
- **Request Body Limits** — 1MB maximum

---

## License

This project is proprietary. All rights reserved.
