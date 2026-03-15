import type { CommodityData } from './dashboard-types';

export function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatPrice(c: CommodityData): string {
  const price = c.price;
  if (c.category === 'fx' || c.category === 'fx-major') {
    return price >= 100 ? price.toFixed(2) : price >= 10 ? price.toFixed(3) : price.toFixed(4);
  }
  return price >= 1000 ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : price.toFixed(2);
}

export function headingToCompass(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function isWatchlisted(text: string, watchlist: string[]): boolean {
  if (!watchlist.length) return false;
  const lower = text.toLowerCase();
  return watchlist.some(term => lower.includes(term.toLowerCase()));
}

export function getThreatLevel(alertCount: number, sirenCount: number, settings?: { criticalThreshold: number; highThreshold: number; elevatedThreshold: number }, alerts?: { threatType?: string }[]): { level: string; color: string; bg: string } {
  const t = settings || { criticalThreshold: 15, highThreshold: 8, elevatedThreshold: 3 };
  const total = alertCount + sirenCount;
  if (total >= t.criticalThreshold) return { level: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-950/50 border-red-500/30' };
  if (total >= t.highThreshold) return { level: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-500/25' };
  if (total >= t.elevatedThreshold) return { level: 'ELEVATED', color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-500/25' };
  if (total > 0) return { level: 'GUARDED', color: 'text-blue-500', bg: 'bg-blue-950/40 border-blue-500/25' };
  return { level: 'LOW', color: 'text-green-500', bg: 'bg-green-950/40 border-green-500/25' };
}
