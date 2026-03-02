# WARROOM - Middle East Intelligence Dashboard

## Overview
A Bloomberg Terminal-style real-time intelligence dashboard for monitoring the Middle East conflict region (Iran, Israel, Lebanon). Features missile tracking, flight radar, Strait of Hormuz maritime surveillance, commodity prices, breaking news, and Telegram channel feeds with Arabic/English bilingual support.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn UI
- **Backend**: Express.js REST API
- **Map**: Leaflet + react-leaflet with CartoDB dark tiles
- **Styling**: Bloomberg Terminal dark theme (dark mode forced)
- **Data**: Simulated real-time data with periodic polling via React Query

## Key Files
- `client/src/pages/dashboard.tsx` - Main dashboard page with all panels
- `client/src/components/conflict-map.tsx` - Leaflet interactive map component
- `client/src/components/theme-provider.tsx` - Dark theme + language (EN/AR) context
- `server/routes.ts` - API endpoints returning simulated intelligence data
- `shared/schema.ts` - Shared TypeScript types for all data models

## Features
1. **Breaking News Feed** - 15 news items with category badges (Breaking/Military/Diplomatic/Economic)
2. **Intelligence Map** - Interactive dark-themed map with 3 views:
   - Conflict: Missile sites, airstrikes, ground ops, naval ops, nuclear facilities, air defense
   - Flights: Military, commercial, surveillance aircraft
   - Maritime: Ships in Strait of Hormuz (tankers, cargo, military, patrol)
3. **Commodity Prices** - Live-updating prices for oil, gold, silver, natural gas, FX pairs
4. **Telegram Feed** - Intelligence channel messages from simulated Telegram channels
5. **Scrolling Ticker** - Marquee-style commodity price ticker bar
6. **Language Toggle** - Switch between English and Arabic (RTL support)
7. **Status Bar** - Connection status, event counts, source indicators

## API Endpoints
- `GET /api/news` - Breaking news items (polled every 20s)
- `GET /api/commodities` - Commodity and FX prices (polled every 5s)
- `GET /api/events` - Map events, flights, ships (polled every 15s)
- `GET /api/telegram` - Telegram channel messages (polled every 25s)

## Dependencies
- leaflet + react-leaflet@4.2.1 (React 18 compatible)
- @types/leaflet
- react-icons (for Telegram logo)
- All standard shadcn/radix components

## Theme
- Dark Bloomberg terminal aesthetic with orange (#F28A1D) primary accent
- JetBrains Mono for data/numbers, Inter for UI text
- Green/red for market indicators
- Pulsing red dots for LIVE indicators
