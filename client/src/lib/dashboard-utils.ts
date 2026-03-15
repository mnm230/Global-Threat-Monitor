import type { CommodityData, WARROOMSettings, DEFAULT_SETTINGS as DS } from './dashboard-types';
import type { ConflictEvent, FlightData, ShipData, RedAlert, SirenAlert } from '@shared/schema';

export function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function formatPrice(c: CommodityData): string {
  const decimals = c.price < 10 ? 4 : 2;
  const prefix = c.currency === 'USD' ? '$' : '';
  return `${prefix}${c.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function headingToCompass(deg: number): string {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function isWatchlisted(text: string, watchlist: string[]): boolean {
  if (watchlist.length === 0) return false;
  const lower = text.toLowerCase();
  return watchlist.some(w => lower.includes(w.toLowerCase()));
}

export function getThreatLevel(alertCount: number, sirenCount: number, settings?: WARROOMSettings, alerts?: RedAlert[]): { level: string; color: string; bg: string } {
  const liveWeight = alerts ? alerts.filter(a => a.source === 'live').length * 2 : 0;
  const total = alertCount + sirenCount + liveWeight;
  const s = settings || { criticalThreshold: 15, highThreshold: 8, elevatedThreshold: 3 } as WARROOMSettings;
  if (total > s.criticalThreshold) return { level: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-950/50 border-red-500/40' };
  if (total > s.highThreshold) return { level: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-500/40' };
  if (total > s.elevatedThreshold) return { level: 'ELEVATED', color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-500/40' };
  return { level: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-500/40' };
}

export function sendNotification(title: string, body: string, tag: string, critical: boolean = false) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag,
        requireInteraction: critical,
        data: { url: '/' },
      });
    }).catch(() => {
      new Notification(title, { body, icon: '/favicon.png', tag });
    });
  } else {
    new Notification(title, { body, icon: '/favicon.png', tag });
  }
}

export function generateExportReport(
  events: ConflictEvent[],
  flights: FlightData[],
  ships: ShipData[],
  alerts: RedAlert[],
  sirens: SirenAlert[],
  commodities: CommodityData[],
  threatLevel: { level: string; color: string },
  language: 'en' | 'ar'
): string {
  const now = new Date().toISOString();
  const threatColors: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', ELEVATED: '#eab308', LOW: '#22c55e' };
  const tc = threatColors[threatLevel.level] || '#22c55e';

  const topEvents = [...events].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  }).slice(0, 5);

  const byCountry: Record<string, number> = {};
  alerts.forEach(a => { byCountry[a.country] = (byCountry[a.country] || 0) + 1; });

  const milFlights = flights.filter(f => f.type === 'military' || f.type === 'surveillance');

  const movers = [...commodities].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 6);

  const sevColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WARROOM Intel Report - ${now}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0c10;color:#e0e0e0;font-family:'Courier New',monospace;padding:40px;max-width:900px;margin:0 auto}
h1{color:#f59e0b;font-size:22px;letter-spacing:4px;border-bottom:2px solid #f59e0b33;padding-bottom:12px;margin-bottom:8px}
h2{color:#f59e0b99;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:28px 0 12px;padding:8px 0;border-bottom:1px solid #ffffff15}
.meta{font-size:11px;color:#888;margin-bottom:24px}
.threat{display:inline-block;padding:4px 16px;border-radius:4px;font-weight:bold;font-size:13px;letter-spacing:2px;border:1px solid}
table{width:100%;border-collapse:collapse;margin:8px 0}
th{text-align:left;font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid #ffffff20}
td{padding:6px 8px;font-size:12px;border-bottom:1px solid #ffffff08}
tr:hover{background:#ffffff05}
.sev{font-size:10px;font-weight:bold;padding:2px 8px;border-radius:3px;letter-spacing:1px}
.pos{color:#22c55e}.neg{color:#ef4444}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ffffff15;font-size:10px;color:#666;text-align:center}
.country-row{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0}
.country-badge{background:#1a1a2e;border:1px solid #ffffff15;padding:6px 14px;border-radius:4px;font-size:12px}
.country-badge span{color:#ef4444;font-weight:bold}
.print-btn{position:fixed;top:16px;right:16px;background:#f59e0b;color:#0a0c10;border:none;padding:8px 20px;cursor:pointer;font-family:inherit;font-weight:bold;font-size:12px;letter-spacing:2px;border-radius:4px}
.print-btn:hover{background:#d97706}
@media print{.print-btn{display:none}body{background:#fff;color:#222}h1{color:#b45309}h2{color:#92400e}table,th,td{border-color:#ddd}.country-badge{background:#f5f5f5;border-color:#ddd}}
</style></head><body>
<button class="print-btn" onclick="window.print()">PRINT / PDF</button>
<h1>WARROOM INTELLIGENCE REPORT</h1>
<div class="meta">Generated: ${new Date(now).toLocaleString()} UTC | Classification: OPEN SOURCE</div>
<div style="margin-bottom:24px"><span class="threat" style="color:${tc};border-color:${tc}44;background:${tc}15">THREAT LEVEL: ${escHtml(threatLevel.level)}</span></div>

<h2>Executive Summary</h2>
<p style="font-size:12px;line-height:1.8;color:#ccc;margin:8px 0">${alerts.length} active red alerts across ${Object.keys(byCountry).length} countries. ${sirens.length} sirens active. ${events.length} conflict events tracked. ${milFlights.length} military/surveillance flights airborne. ${ships.length} vessels monitored in strait.</p>

<h2>Red Alert Status (${alerts.length} Active)</h2>
${alerts.length > 0 ? `<div class="country-row">${Object.entries(byCountry).map(([c, n]) => `<div class="country-badge">${escHtml(c)}: <span>${n}</span></div>`).join('')}</div>` : '<p style="font-size:12px;color:#22c55e">No active alerts</p>'}

<h2>Top Events</h2>
<table><thead><tr><th>Severity</th><th>Event</th><th>Description</th><th>Type</th></tr></thead><tbody>
${topEvents.map(e => `<tr><td><span class="sev" style="color:${sevColors[e.severity] || '#6b7280'}">${escHtml(e.severity.toUpperCase())}</span></td><td style="color:#fff">${escHtml(e.title)}</td><td style="color:#aaa">${escHtml(e.description.slice(0, 120))}</td><td style="color:#888">${escHtml(e.type)}</td></tr>`).join('')}
</tbody></table>

<h2>Military Activity (${milFlights.length} Flights)</h2>
<table><thead><tr><th>Callsign</th><th>Type</th><th>Altitude</th><th>Heading</th></tr></thead><tbody>
${milFlights.map(f => `<tr><td style="color:#fff">${escHtml(f.callsign)}</td><td>${escHtml(f.type.toUpperCase())}</td><td>${f.altitude.toLocaleString()} ft</td><td>${Math.round(f.heading)}</td></tr>`).join('')}
</tbody></table>


<h2>Maritime Situation (${ships.length} Vessels)</h2>
<table><thead><tr><th>Vessel</th><th>Type</th><th>Flag</th><th>Speed</th><th>Heading</th></tr></thead><tbody>
${ships.map(s => `<tr><td style="color:#fff">${escHtml(s.name)}</td><td>${escHtml(s.type.toUpperCase())}</td><td>${escHtml(s.flag)}</td><td>${s.speed} kn</td><td>${headingToCompass(s.heading)}</td></tr>`).join('')}
</tbody></table>

<h2>Market Impact</h2>
<table><thead><tr><th>Symbol</th><th>Price</th><th>Change</th></tr></thead><tbody>
${movers.map(c => `<tr><td style="color:#fff">${escHtml(c.symbol)}</td><td>${c.currency === 'USD' ? '$' : ''}${c.price.toFixed(c.price < 10 ? 4 : 2)}</td><td class="${c.changePercent >= 0 ? 'pos' : 'neg'}">${c.changePercent >= 0 ? '+' : ''}${c.changePercent.toFixed(2)}%</td></tr>`).join('')}
</tbody></table>

<div class="footer">Made by M.M — WARROOM v2.0 | Open Source Intelligence Terminal | ${now}</div>
</body></html>`;
  return html;
}
