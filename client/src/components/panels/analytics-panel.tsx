import { useState, useCallback, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Activity, Rocket, Shield, Sparkles, TrendingUp, AlertTriangle,
  Crosshair, Brain, Download, Loader2, Zap,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PanelHeader, FeedFreshnessContext } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';

interface EscalationForecastData {
  nextHour: number;
  next3Hours: number;
  velocityPerHour: number;
  confidence: number;
  direction: 'surging' | 'escalating' | 'stable' | 'cooling';
  basisHours: number;
  projectedPeak: string;
}

interface RegionAnomalyData {
  region: string;
  currentCount: number;
  rollingAvg: number;
  zScore: number;
  pctAboveAvg: number;
  severity: 'critical' | 'warning';
}

interface PatternData {
  id: string;
  type: string;
  confidence: number;
  description: string;
  detectedAt: string;
  affectedRegions: string[];
  alertCount: number;
}

interface FalseAlarmData {
  alertId: string;
  score: number;
  reasons: string[];
  recommendation: 'likely_real' | 'uncertain' | 'likely_false';
}

interface AnalyticsData {
  alertsByRegion: Record<string, number>;
  alertsByType: Record<string, number>;
  alertsByCountry?: Record<string, number>;
  alertTimeline: { time: string; count: number; regions?: Record<string, number>; types?: Record<string, number>; countries?: Record<string, number> }[];
  topSources: { channel: string; count: number; reliability: number }[];
  activeAlertCount: number;
  falseAlarmRate: number;
  avgResponseTime: number;
  threatTrend: 'escalating' | 'stable' | 'deescalating';
  patterns: PatternData[];
  falseAlarms: FalseAlarmData[];
  escalationForecast?: EscalationForecastData;
  regionAnomalies?: RegionAnomalyData[];
  conflictEventCount?: number;
  thermalHotspotCount?: number;
  militaryFlightCount?: number;
  eventsByType?: Record<string, number>;
  eventsByCountry?: Record<string, number>;
  telegramByCountry?: Record<string, number>;
  lastUpdated?: string;
}

export function AnalyticsPanel({ language, onClose, onMaximize, isMaximized }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
    refetchInterval: 10000,
    staleTime: 0,
  });
  const [exportingPdf, setExportingPdf] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'regions' | 'sources' | 'patterns' | 'epicfury'>('overview');
  const [epicFuryData, setEpicFuryData] = useState<Record<string, any> | null>(null);
  const [epicFuryLoading, setEpicFuryLoading] = useState(false);
  const [epicFuryFetchedAt, setEpicFuryFetchedAt] = useState<string | null>(null);
  const [epicFuryError, setEpicFuryError] = useState(false);
  const fetchEpicFury = useCallback(async () => {
    setEpicFuryLoading(true);
    setEpicFuryError(false);
    try {
      const res = await fetch('/api/epic-fury');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data.error) { setEpicFuryData(data); setEpicFuryFetchedAt(new Date().toLocaleTimeString()); }
      else setEpicFuryError(true);
    } catch { setEpicFuryError(true); }
    setEpicFuryLoading(false);
  }, []);

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const freshness = useContext(FeedFreshnessContext);

  const patterns = analytics?.patterns ?? [];
  const falseAlarms = analytics?.falseAlarms ?? [];

  const regionEntries = analytics ? Object.entries(analytics.alertsByRegion).sort((a, b) => b[1] - a[1]).slice(0, 12) : [];
  const typeEntries = analytics ? Object.entries(analytics.alertsByType).sort((a, b) => b[1] - a[1]) : [];
  const maxRegion = regionEntries.length > 0 ? Math.max(...regionEntries.map(e => e[1])) : 1;
  const maxType = typeEntries.length > 0 ? Math.max(...typeEntries.map(e => e[1])) : 1;
  const maxTimeline = analytics?.alertTimeline ? Math.max(...analytics.alertTimeline.map(t => t.count), 1) : 1;

  const trendColor = analytics?.threatTrend === 'escalating' ? 'text-red-400' : analytics?.threatTrend === 'deescalating' ? 'text-emerald-400' : 'text-yellow-400';
  const trendIcon = analytics?.threatTrend === 'escalating' ? '▲' : analytics?.threatTrend === 'deescalating' ? '▼' : '●';

  const timeline = analytics?.alertTimeline ?? [];
  const totalAlerts = timeline.reduce((s, b) => s + b.count, 0);
  const peakHour = timeline.length > 0 ? timeline.reduce((peak, b) => b.count > peak.count ? b : peak, { time: '--', count: 0 }) : { time: '--', count: 0 };
  const totalRegions = regionEntries.length;
  const totalTypes = typeEntries.length;

  const anomalyCount = analytics?.regionAnomalies?.length ?? 0;
  const computedThreatLevel: 'CRITICAL'|'HIGH'|'ELEVATED'|'MODERATE'|'LOW' = (() => {
    if (!analytics) return 'LOW';
    const active = analytics.activeAlertCount;
    const escalating = analytics.threatTrend === 'escalating';
    if (active > 10 || (escalating && anomalyCount > 3)) return 'CRITICAL';
    if (active > 5  || (escalating && anomalyCount > 1)) return 'HIGH';
    if (active > 0  || anomalyCount > 0)                 return 'ELEVATED';
    if (totalAlerts > 20)                                return 'MODERATE';
    return 'LOW';
  })();

  const threatLevelConfig = {
    CRITICAL: { gradient: 'linear-gradient(135deg,rgb(127 29 29/0.9),rgb(185 28 28/0.5))', border:'border-red-500/50', badge:'bg-red-600/80 text-red-100', glow:'shadow-[0_0_20px_rgb(239_68_68_/_0.3)]', desc:'Immediate threat. Multiple active alerts across theater.' },
    HIGH:     { gradient: 'linear-gradient(135deg,rgb(120 53 15/0.9),rgb(194 65 12/0.5))',  border:'border-orange-500/40', badge:'bg-orange-600/80 text-orange-100', glow:'', desc:'Elevated threat posture. Active incidents in theater.' },
    ELEVATED: { gradient: 'linear-gradient(135deg,rgb(113 63 18/0.85),rgb(120 72 12/0.6))', border:'border-yellow-500/35', badge:'bg-yellow-600/70 text-yellow-100', glow:'', desc:'Elevated conditions. Monitor for escalation.' },
    MODERATE: { gradient: 'linear-gradient(135deg,rgb(20 83 45/0.8),rgb(6 78 59/0.6))',    border:'border-emerald-500/30', badge:'bg-emerald-700/60 text-emerald-100', glow:'', desc:'Moderate activity. Situation being monitored.' },
    LOW:      { gradient: 'linear-gradient(135deg,rgb(15 23 42/0.95),rgb(20 30 55/0.8))',  border:'border-border', badge:'bg-slate-700/50 text-slate-300', glow:'', desc:'Routine monitoring. No significant threats detected.' },
  };

  const last6 = (analytics?.alertTimeline ?? []).slice(-6);
  const sparkMax = Math.max(...last6.map(b => b.count), 1);
  const makeSparkPath = (data: typeof last6) => {
    if (data.length < 2) return '';
    const w = 40, h = 10;
    return data.map((b, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (b.count / sparkMax) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };
  const sparkPath = makeSparkPath(last6);

  const exportPdf = useCallback(async () => {
    if (!analytics) return;
    setExportingPdf(true);
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 45, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageW, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('CONFLICT INTELLIGENCE REPORT', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text(`Generated: ${now.toUTCString()}`, pageW / 2, 25, { align: 'center' });
      doc.text('CLASSIFICATION: OSINT // UNCLASSIFIED', pageW / 2, 31, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('War Room Analytics Dashboard — Real-time Conflict Monitoring Platform', pageW / 2, 38, { align: 'center' });

      // Threat level badge top-right
      const tlColors: Record<string, [number,number,number]> = { CRITICAL:[220,38,38], HIGH:[234,88,12], ELEVATED:[202,138,4], MODERATE:[5,150,105], LOW:[71,85,105] };
      const tlColor = tlColors[computedThreatLevel] || [71,85,105];
      doc.setFillColor(tlColor[0], tlColor[1], tlColor[2]);
      doc.roundedRect(pageW - 52, 8, 42, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('THREAT LEVEL', pageW - 31, 13.5, { align: 'center' });
      doc.setFontSize(9);
      doc.text(computedThreatLevel, pageW - 31, 17.5, { align: 'center' });

      let y = 52;

      doc.setFillColor(30, 30, 50);
      doc.roundedRect(10, y, pageW - 20, 28, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('EXECUTIVE SUMMARY', 15, y + 6);
      doc.setDrawColor(220, 38, 38);
      doc.line(15, y + 8, 60, y + 8);

      const trendLabel = analytics.threatTrend === 'escalating' ? 'ESCALATING' : analytics.threatTrend === 'deescalating' ? 'DE-ESCALATING' : 'STABLE';
      const summaryStats = [
        `Active Alerts: ${analytics.activeAlertCount}`,
        `Total (24h): ${totalAlerts}`,
        `False Alarm Rate: ${(analytics.falseAlarmRate * 100).toFixed(1)}%`,
        `Avg Response: ${analytics.avgResponseTime}s`,
        `Trend: ${trendLabel}`,
        `Peak Hour: ${peakHour?.time || '--'} UTC (${peakHour?.count || 0} alerts)`,
        `Conflict Events: ${analytics.conflictEventCount ?? 0}`,
        `Thermal Hotspots: ${analytics.thermalHotspotCount ?? 0}`,
      ];
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      const col1 = summaryStats.slice(0, 4);
      const col2 = summaryStats.slice(4);
      col1.forEach((s, i) => doc.text(s, 15, y + 14 + i * 4));
      col2.forEach((s, i) => doc.text(s, pageW / 2 + 5, y + 14 + i * 4));

      y += 34;

      if (analytics.escalationForecast) {
        const fc = analytics.escalationForecast;
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ESCALATION FORECAST', 15, y + 6);
        doc.setDrawColor(251, 146, 60);
        doc.line(15, y + 8, 55, y + 8);
        doc.setFontSize(9);
        doc.setTextColor(220, 220, 220);
        const dirIcon = fc.direction === 'surging' ? '▲▲' : fc.direction === 'escalating' ? '▲' : fc.direction === 'cooling' ? '▼' : '●';
        doc.text(`${dirIcon} Direction: ${fc.direction.toUpperCase()} | Next 1h: ${fc.nextHour} alerts | Next 3h: ${fc.next3Hours} alerts | Velocity: ${fc.velocityPerHour >= 0 ? '+' : ''}${fc.velocityPerHour}/hr | Confidence: ${Math.round(fc.confidence * 100)}%`, 15, y + 14);
        y += 24;
      }

      // 24h Alert Timeline chart
      if (analytics.alertTimeline && analytics.alertTimeline.length > 0) {
        if (y > 200) { doc.addPage(); y = 15; }
        doc.setFillColor(220, 38, 38);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(20, 25, 45);
        const tlHeight = 28;
        doc.roundedRect(10, y, pageW - 20, tlHeight + 10, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('24H ALERT TIMELINE', 15, y + 6);
        doc.setDrawColor(239, 68, 68);
        doc.line(15, y + 8, 52, y + 8);
        const tl = analytics.alertTimeline;
        const tlMax = Math.max(...tl.map((b: {time:string;count:number}) => b.count), 1);
        const peakBucket = tl.reduce((pk: {time:string;count:number}, b: {time:string;count:number}) => b.count > pk.count ? b : pk, {time:'',count:0});
        const barW = (pageW - 30) / tl.length;
        const chartTop = y + 10;
        tl.forEach((b: {time:string;count:number}, i: number) => {
          const bh = Math.max(1, (b.count / tlMax) * tlHeight);
          const bx = 15 + i * barW;
          const by = chartTop + tlHeight - bh;
          const isPk = b.count === peakBucket.count && b.time === peakBucket.time;
          if (isPk) { doc.setFillColor(239, 68, 68); }
          else if (b.count > tlMax * 0.7) { doc.setFillColor(239, 68, 68); }
          else if (b.count > tlMax * 0.4) { doc.setFillColor(251, 146, 60); }
          else if (b.count > tlMax * 0.15) { doc.setFillColor(245, 158, 11); }
          else { doc.setFillColor(59, 130, 246); }
          doc.rect(bx, by, Math.max(0.5, barW - 0.5), bh, 'F');
          if (isPk && b.count > 0) {
            doc.setFontSize(6);
            doc.setTextColor(239, 68, 68);
            doc.text(`${b.count}`, bx + barW/2, by - 1, {align:'center'});
          }
        });
        // Hour axis labels
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        ['0h','6h','12h','18h','23h'].forEach((lbl, i) => {
          const positions = [0, 6, 12, 18, 23];
          const xPos = 15 + (positions[i] / 23) * (pageW - 30);
          doc.text(lbl, xPos, chartTop + tlHeight + 5);
        });
        y += tlHeight + 14;
      }

      if (regionEntries.length > 0) {
        doc.setFillColor(59, 130, 246);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + regionEntries.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY REGION', 15, y + 6);
        doc.setDrawColor(59, 130, 246);
        doc.line(15, y + 8, 50, y + 8);
        regionEntries.forEach(([region, count], i) => {
          const rowY = y + 13 + i * 5.5;
          const pct = (count / maxRegion) * 100;
          if (i % 2 === 0) { doc.setFillColor(255,255,255); doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(200, 200, 200);
          doc.text(region, 15, rowY);
          doc.setFillColor(pct > 70 ? 239 : pct > 40 ? 251 : 59, pct > 70 ? 68 : pct > 40 ? 146 : 130, pct > 70 ? 68 : pct > 40 ? 60 : 246);
          doc.roundedRect(55, rowY - 3, Math.max(2, (count / maxRegion) * 100), 3, 1, 1, 'F');
          doc.setTextColor(180, 180, 180);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + regionEntries.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (typeEntries.length > 0) {
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + typeEntries.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY TYPE', 15, y + 6);
        doc.setDrawColor(168, 85, 247);
        doc.line(15, y + 8, 48, y + 8);
        typeEntries.forEach(([type, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(200, 200, 200);
          doc.text(type.replace(/_/g, ' ').toUpperCase(), 15, rowY);
          doc.setTextColor(180, 180, 180);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + typeEntries.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (analytics.topSources.length > 0) {
        doc.setFillColor(25, 25, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + analytics.topSources.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('SOURCE RELIABILITY', 15, y + 6);
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y + 8, 50, y + 8);
        analytics.topSources.forEach((src, i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,25,40); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          const rel = src.reliability;
          doc.setTextColor(rel > 0.85 ? 74 : rel > 0.7 ? 250 : 248, rel > 0.85 ? 222 : rel > 0.7 ? 204 : 113, rel > 0.85 ? 128 : rel > 0.7 ? 21 : 113);
          doc.text(`${(rel * 100).toFixed(0)}%`, 15, rowY);
          doc.setTextColor(200, 200, 200);
          doc.text(src.channel, 30, rowY);
          doc.setTextColor(140, 140, 140);
          doc.text(`${src.count} msgs`, 140, rowY);
        });
        y += 14 + analytics.topSources.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // Alerts by Country horizontal bars
      if (analytics.alertsByCountry && Object.keys(analytics.alertsByCountry).length > 0) {
        doc.setFillColor(16, 185, 129);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        const countryArr = Object.entries(analytics.alertsByCountry as Record<string,number>).sort((a,b)=>b[1]-a[1]).slice(0,8);
        const maxCt = Math.max(...countryArr.map(e=>e[1]),1);
        const totalCt = countryArr.reduce((s,e)=>s+e[1],0);
        doc.setFillColor(25, 35, 45);
        doc.roundedRect(10, y, pageW - 20, 8 + countryArr.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ALERTS BY COUNTRY', 15, y + 6);
        doc.setDrawColor(16, 185, 129);
        doc.line(15, y + 8, 52, y + 8);
        countryArr.forEach(([country, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(20,35,30); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          const barLen = Math.max(2, (count / maxCt) * 80);
          const pctStr = totalCt > 0 ? `${((count/totalCt)*100).toFixed(0)}%` : '0%';
          doc.setFontSize(8);
          doc.setTextColor(200, 220, 200);
          doc.text(country, 15, rowY);
          doc.setFillColor(16, 185, 129);
          doc.roundedRect(55, rowY - 3, barLen, 3, 1, 1, 'F');
          doc.setTextColor(140, 200, 160);
          doc.text(pctStr, 140, rowY);
          doc.text(String(count), 160, rowY);
        });
        y += 14 + countryArr.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // Telegram Intel by Country
      if (analytics.telegramByCountry && Object.keys(analytics.telegramByCountry).length > 0) {
        doc.setFillColor(6, 182, 212);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        const tgArr = Object.entries(analytics.telegramByCountry as Record<string,number>).sort((a,b)=>b[1]-a[1]);
        doc.setFillColor(15, 30, 40);
        doc.roundedRect(10, y, pageW - 20, 8 + tgArr.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('TELEGRAM INTEL BY COUNTRY', 15, y + 6);
        doc.setDrawColor(6, 182, 212);
        doc.line(15, y + 8, 58, y + 8);
        tgArr.forEach(([country, count], i) => {
          const rowY = y + 13 + i * 5.5;
          if (i % 2 === 0) { doc.setFillColor(15,35,45); doc.rect(11, rowY - 3.5, pageW - 22, 5, 'F'); }
          doc.setFontSize(8);
          doc.setTextColor(150, 230, 240);
          doc.text(country, 15, rowY);
          doc.setTextColor(100, 200, 220);
          doc.text(`${count} mentions`, 140, rowY);
        });
        y += 14 + tgArr.length * 5.5;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      // AI Patterns
      const patternsData = analytics.patterns ?? [];
      if (patternsData.length > 0) {
        doc.setFillColor(168, 85, 247);
        doc.rect(10, y, pageW - 20, 0.5, 'F');
        y += 2;
        doc.setFillColor(20, 15, 40);
        doc.roundedRect(10, y, pageW - 20, 8 + patternsData.length * 6, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('AI DETECTED PATTERNS', 15, y + 6);
        doc.setDrawColor(168, 85, 247);
        doc.line(15, y + 8, 55, y + 8);
        patternsData.forEach((pat: {type:string;confidence:number;description:string}, i: number) => {
          const rowY = y + 13 + i * 6;
          if (i % 2 === 0) { doc.setFillColor(25,18,45); doc.rect(11, rowY - 3.5, pageW - 22, 5.5, 'F'); }
          const conf = Math.round(pat.confidence * 100);
          const confColor: [number,number,number] = conf > 70 ? [167,243,208] : conf > 40 ? [253,230,138] : [252,165,165];
          doc.setFillColor(...confColor);
          doc.roundedRect(15, rowY - 2.5, 16, 4, 1, 1, 'F');
          doc.setFontSize(7);
          doc.setTextColor(20, 20, 20);
          doc.text(`${conf}%`, 23, rowY + 0.5, {align:'center'});
          doc.setFontSize(8);
          doc.setTextColor(200, 180, 255);
          doc.text(pat.type.toUpperCase(), 34, rowY);
          doc.setTextColor(160, 150, 200);
          const desc = pat.description.length > 80 ? pat.description.slice(0, 77) + '...' : pat.description;
          doc.text(desc, 34, rowY + 3.5);
        });
        y += 14 + patternsData.length * 6;
      }

      if (y > 240) { doc.addPage(); y = 15; }

      if (analytics.regionAnomalies && analytics.regionAnomalies.length > 0) {
        doc.setFillColor(30, 20, 20);
        doc.roundedRect(10, y, pageW - 20, 8 + analytics.regionAnomalies.length * 5.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('ANOMALY DETECTION', 15, y + 6);
        doc.setDrawColor(245, 158, 11);
        doc.line(15, y + 8, 50, y + 8);
        analytics.regionAnomalies.forEach((a, i) => {
          const rowY = y + 13 + i * 5.5;
          doc.setFontSize(8);
          doc.setTextColor(a.severity === 'critical' ? 248 : 251, a.severity === 'critical' ? 113 : 191, a.severity === 'critical' ? 113 : 36);
          doc.text(`[${a.severity.toUpperCase()}]`, 15, rowY);
          doc.setTextColor(200, 200, 200);
          doc.text(`${a.region} — +${a.pctAboveAvg}% above avg (z=${a.zScore.toFixed(1)})`, 38, rowY);
        });
        y += 14 + analytics.regionAnomalies.length * 5.5;
      }

      const pageCount = doc.internal.pages.length - 1;
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(15, 23, 42);
        doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageW, 10, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`CONFLICT INTELLIGENCE REPORT — Page ${p}/${pageCount} — ${now.toISOString().split('T')[0]}`, pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
      }

      doc.save(`conflict-intel-report-${now.toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
    }
  }, [analytics, totalAlerts, peakHour, regionEntries, maxRegion, typeEntries, computedThreatLevel]);

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-analytics">
      <PanelHeader
        title={t('Analytics', '\u062A\u062D\u0644\u064A\u0644\u0627\u062A')}
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="analytics"
        extra={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={exportPdf}
                disabled={exportingPdf || !analytics}
                className="w-6 h-6 rounded flex items-center justify-center text-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
                aria-label="Export Intelligence Report"
                data-testid="button-export-pdf"
              >
                {exportingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono">
              Export Intelligence Report (PDF)
            </TooltipContent>
          </Tooltip>
        }
      />

      <div className="flex border-b border-border shrink-0" style={{ background: 'hsl(var(--muted))' }}>
        {(['overview', 'regions', 'sources', 'patterns', 'epicfury'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAnalyticsTab(tab)}
            className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors ${
              analyticsTab === tab
                ? 'text-blue-300 border-b border-blue-400'
                : 'text-muted-foreground/60 hover:text-white/60'
            }`}
            data-testid={`button-tab-${tab}`}
          >
            {tab === 'overview' ? t('Overview', '\u0646\u0638\u0631\u0629') :
             tab === 'regions' ? t('Regions', '\u0645\u0646\u0627\u0637\u0642') :
             tab === 'sources' ? t('Sources', '\u0645\u0635\u0627\u062F\u0631') :
             tab === 'epicfury' ? t('Op. Fury', '\u0634\u0627\u063a\u062a') :
             t('Patterns', '\u0623\u0646\u0645\u0627\u0637')}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {!analytics ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-primary/40 animate-spin mx-auto" /></div>
          ) : (
            <TooltipProvider delayDuration={200}>

              {analyticsTab === 'overview' && (
                <>
                  {analytics.lastUpdated && (
                    <div className="flex items-center gap-1.5 cursor-default -mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[9px] font-mono text-foreground/30">
                        Updated {timeAgo(analytics.lastUpdated)}
                      </span>
                    </div>
                  )}

                  {analytics && (
                    <div className={`rounded border ${threatLevelConfig[computedThreatLevel].border} overflow-hidden ${threatLevelConfig[computedThreatLevel].glow}`}
                      style={{background: threatLevelConfig[computedThreatLevel].gradient}} data-testid="section-threat-level">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded self-start ${threatLevelConfig[computedThreatLevel].badge}`}>THREAT LEVEL</span>
                          <span className="text-2xl font-black font-mono tracking-widest text-white leading-none">{computedThreatLevel}</span>
                          <span className="text-[9px] font-mono text-white/50 max-w-[160px] leading-relaxed">{threatLevelConfig[computedThreatLevel].desc}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">Active</span>
                          <span className="text-4xl font-black font-mono text-white/90 leading-none tabular-nums">{analytics.activeAlertCount}</span>
                          <span className={`text-[9px] font-mono font-bold ${trendColor}`}>{trendIcon} {analytics.threatTrend.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.escalationForecast && (() => {
                    const fc = analytics.escalationForecast;
                    const dirConfig = {
                      surging:    { label: 'SURGING',    color: 'text-red-400',    bg: 'bg-red-950/30 border-red-500/30',    icon: '▲▲', glow: 'shadow-[0_0_12px_rgb(239_68_68_/_0.25)]' },
                      escalating: { label: 'ESCALATING', color: 'text-orange-400', bg: 'bg-orange-950/25 border-orange-500/25', icon: '▲', glow: '' },
                      stable:     { label: 'STABLE',     color: 'text-yellow-400', bg: 'bg-yellow-950/20 border-yellow-500/20', icon: '●', glow: '' },
                      cooling:    { label: 'COOLING',    color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-500/20', icon: '▼', glow: '' },
                    }[fc.direction];
                    const confPct = Math.round(fc.confidence * 100);
                    const velSign = fc.velocityPerHour >= 0 ? '+' : '';
                    return (
                      <div className={`rounded border p-2.5 ${dirConfig.bg} ${dirConfig.glow}`} data-testid="section-escalation-forecast">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${dirConfig.color}`} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Escalation Forecast', '\u062A\u0648\u0642\u0639\u0627\u062A \u0627\u0644\u062A\u0635\u0639\u064A\u062F')}</span>
                          <div className="flex-1" />
                          <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded ${dirConfig.color}`} style={{background:'rgb(0 0 0 / 0.25)'}}>
                            {dirConfig.icon} {dirConfig.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 1h</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.nextHour}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Next 3h</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.next3Hours}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Velocity</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{velSign}{Math.round(fc.velocityPerHour)}</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 rounded bg-black/20">
                            <span className="text-[7px] font-mono text-foreground/35 tracking-wider uppercase">Peak</span>
                            <span className={`text-lg font-black font-mono leading-none ${dirConfig.color}`}>{fc.projectedPeak || '--'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-foreground/30">{t('Confidence', '\u0627\u0644\u062B\u0642\u0629')}</span>
                          <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${fc.confidence > 0.6 ? 'bg-emerald-400/70' : fc.confidence > 0.35 ? 'bg-yellow-400/70' : 'bg-red-400/50'}`} style={{ width: `${confPct}%` }} />
                          </div>
                          <span className={`text-[8px] font-black font-mono ${fc.confidence > 0.6 ? 'text-emerald-400' : fc.confidence > 0.35 ? 'text-yellow-400' : 'text-red-400/70'}`}>{confPct}%</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: t('ACTIVE','\u0646\u0634\u0637'), value: analytics.activeAlertCount, color: 'text-red-400', accent: 'hsl(0 72% 51%)', border: 'border-red-500/15', bg: 'bg-red-950/15', testid: 'text-active-alerts', tooltip: 'Oref red alerts currently within countdown window' },
                      { label: t('24H TOTAL','\u0625\u062C\u0645\u0627\u0644\u064A'), value: totalAlerts, color: 'text-orange-400', accent: 'hsl(25 95% 53%)', border: 'border-orange-500/15', bg: 'bg-orange-950/15', testid: 'text-total-24h', tooltip: 'Total alerts across all regions in the last 24 hours' },
                      { label: t('FALSE ALM','\u0643\u0627\u0630\u0628'), value: `${(analytics.falseAlarmRate * 100).toFixed(1)}%`, color: 'text-yellow-400', accent: 'hsl(48 96% 53%)', border: 'border-yellow-500/15', bg: 'bg-yellow-950/15', testid: 'text-false-alarm-rate', tooltip: 'Estimated false alarm rate based on AI scoring' },
                      { label: t('TREND','\u0627\u062A\u062C\u0627\u0647'), value: `${trendIcon}`, color: trendColor, accent: 'hsl(175 60% 40%)', border: 'border-border', bg: 'bg-muted/20', testid: 'text-trend', sub: analytics.threatTrend.slice(0,4).toUpperCase(), tooltip: `Threat trend: ${analytics.threatTrend}` },
                    ].map(stat => (
                      <Tooltip key={stat.label}>
                        <TooltipTrigger asChild>
                          <div className={`${stat.bg} border ${stat.border} rounded overflow-hidden cursor-default hover:brightness-125 transition-all`} style={{borderLeft: `3px solid ${stat.accent}`}}>
                            <div className="px-2 py-1.5 flex flex-col gap-0.5">
                              <span className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none">{stat.label}</span>
                              <span className={`text-lg font-black font-mono leading-tight tabular-nums ${stat.color}`} data-testid={stat.testid}>{stat.value}</span>
                              {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-60`}>{stat.sub}</span>}
                              {sparkPath && (
                                <svg width="40" height="10" className="mt-1 opacity-35" viewBox="0 0 40 10">
                                  <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={stat.color} />
                                </svg>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                          <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: t('CONFLICT EVT','\u0623\u062D\u062F\u0627\u062B'), value: analytics.conflictEventCount ?? 0, color: 'text-orange-400', accent: 'hsl(25 95% 53%)', border: 'border-orange-500/15', bg: 'bg-orange-950/15', tooltip: `${analytics.conflictEventCount ?? 0} mapped conflict events from GDELT, Oref, NASA FIRMS`, sub: analytics.eventsByType ? Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1])[0]?.[0]?.toUpperCase() : undefined },
                      { label: t('THERMAL SAT','\u062D\u0631\u0627\u0631\u064A'), value: analytics.thermalHotspotCount ?? 0, color: 'text-red-300', accent: 'hsl(0 72% 51%)', border: 'border-red-500/15', bg: 'bg-red-950/15', tooltip: 'NASA FIRMS VIIRS satellite thermal hotspots in theater (48h)', sub: 'NASA' },
                      { label: t('MIL FLIGHT','\u0637\u064A\u0631\u0627\u0646'), value: analytics.militaryFlightCount ?? 0, color: 'text-purple-400', accent: 'hsl(270 60% 60%)', border: 'border-purple-500/15', bg: 'bg-purple-950/15', tooltip: 'Military aircraft tracked via ADS-B in Middle East', sub: 'ADS-B' },
                    ].map(stat => (
                      <Tooltip key={stat.label}>
                        <TooltipTrigger asChild>
                          <div className={`${stat.bg} border ${stat.border} rounded overflow-hidden cursor-default hover:brightness-125 transition-all`} style={{borderLeft: `3px solid ${stat.accent}`}}>
                            <div className="px-2 py-1.5 flex flex-col gap-0.5">
                              <span className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none truncate">{stat.label}</span>
                              <span className={`text-lg font-black font-mono leading-tight tabular-nums ${stat.color}`}>{stat.value}</span>
                              {stat.sub && <span className={`text-[8px] font-mono ${stat.color} opacity-60 truncate max-w-full`}>{stat.sub}</span>}
                              {sparkPath && (
                                <svg width="40" height="10" className="mt-1 opacity-35" viewBox="0 0 40 10">
                                  <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={stat.color} />
                                </svg>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                          <p className="text-foreground/70 leading-relaxed">{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-border">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('24h Alert Timeline', '\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A 24 \u0633\u0627\u0639\u0629')}</span>
                      <div className="flex items-center gap-2">
                        {peakHour && peakHour.count > 0 && (
                          <span className="text-[8px] font-mono text-red-400/70 font-bold">⚡ Peak {peakHour.time}</span>
                        )}
                        <span className="text-[8px] font-mono text-foreground/25">UTC · {totalAlerts}</span>
                      </div>
                    </div>
                    <div className="rounded border border-border overflow-hidden" data-testid="chart-timeline">
                      <div className="relative flex items-end gap-[2px] bg-white/[0.015] px-1.5 pt-2" style={{height: '72px'}}>
                      {[25,50,75].map(pct => (
                        <div key={pct} className="absolute pointer-events-none" style={{bottom:`${pct}%`,left:0,right:0,borderTop:'1px dotted rgba(255,255,255,0.05)'}} />
                      ))}
                      {(analytics.alertTimeline ?? []).map((b, i) => {
                        const topRegions = Object.entries(b.regions || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const topTypes = Object.entries(b.types || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const topCountries = Object.entries(b.countries || {}).sort((a,b)=>b[1]-a[1]).slice(0,4);
                        const isPeak = peakHour && b.time === peakHour.time && b.count === peakHour.count;
                        const barColor = isPeak ? 'rgb(239 68 68 / 0.95)' : b.count > maxTimeline * 0.7 ? 'rgb(239 68 68 / 0.75)' : b.count > maxTimeline * 0.4 ? 'rgb(251 146 60 / 0.65)' : 'rgb(59 130 246 / 0.45)';
                        return (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <div className="flex-1 flex flex-col items-center justify-end h-full group cursor-default">
                                <div className={`w-full rounded-t-sm transition-all group-hover:brightness-150 group-hover:scale-y-[1.08] min-h-[2px] origin-bottom ${isPeak ? 'ring-1 ring-red-400/60 shadow-[0_0_6px_rgb(239_68_68_/_0.4)]' : ''}`} style={{ height: `${Math.max(4, (b.count / maxTimeline) * 88)}%`, background: barColor }} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-black/95 border-white/10 p-2 min-w-[130px]">
                              <p className="text-[11px] font-black font-mono text-foreground/90 mb-1">{b.time} UTC {isPeak ? '(PEAK)' : ''}</p>
                              <p className="text-[10px] font-mono text-foreground/60 mb-1.5">{b.count} alert{b.count !== 1 ? 's' : ''}</p>
                              {topRegions.length > 0 && (
                                <div className="mb-1">
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Regions</p>
                                  {topRegions.map(([r, c]) => (<div key={r} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55">{r}</span><span className="text-[9px] font-bold font-mono text-orange-300/80">{c}</span></div>))}
                                </div>
                              )}
                              {topTypes.length > 0 && (
                                <div>
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Types</p>
                                  {topTypes.map(([tp, c]) => (<div key={tp} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55 uppercase">{tp.replace(/_/g,' ')}</span><span className="text-[9px] font-bold font-mono text-blue-300/80">{c}</span></div>))}
                                </div>
                              )}
                              {topCountries.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-[8px] font-mono text-foreground/35 uppercase tracking-wider mb-0.5">Countries</p>
                                  {topCountries.map(([c, ct]) => (<div key={c} className="flex justify-between gap-3"><span className="text-[9px] font-mono text-foreground/55">{c}</span><span className="text-[9px] font-bold font-mono text-emerald-300/80">{ct}</span></div>))}
                                </div>
                              )}
                              {b.count === 0 && <p className="text-[9px] font-mono text-foreground/25 italic">No alerts this hour</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                      </div>
                      {/* Hour axis labels */}
                      <div className="flex items-center px-1.5 py-1 border-t border-border bg-muted/30">
                        {['0h','','','','','','6h','','','','','','12h','','','','','','18h','','','','','23h'].map((lbl, i) => (
                          <div key={i} className="flex-1 text-center">
                            {lbl && <span className="text-[7px] font-mono text-foreground/25 tabular-nums">{lbl}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {analytics.eventsByType && Object.keys(analytics.eventsByType).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Live Event Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u062D\u062F\u0627\u062B')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.eventsByType).reduce((s,v)=>s+v,0)} total</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analytics.eventsByType).sort((a,b)=>b[1]-a[1]).map(([type, count]) => {
                          const colors: Record<string, string> = { missile: 'bg-red-950/40 border-red-500/25 text-red-300', airstrike: 'bg-orange-950/40 border-orange-500/25 text-orange-300', defense: 'bg-cyan-950/40 border-cyan-500/25 text-cyan-300', ground: 'bg-yellow-950/40 border-yellow-500/25 text-yellow-300', naval: 'bg-blue-950/40 border-blue-500/25 text-blue-300', nuclear: 'bg-purple-950/40 border-purple-500/25 text-purple-300' };
                          return (
                            <span key={type} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors[type] || 'bg-white/[0.03] border-white/10 text-foreground/50'}`}>
                              {type.toUpperCase()} {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analytics.alertsByCountry && Object.keys(analytics.alertsByCountry).length > 0 && (
                    <div data-testid="section-country-breakdown">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Alerts by Country', '\u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062F\u0648\u0644\u0629')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.alertsByCountry).reduce((s,v)=>s+v,0)} total</span>
                      </div>
                      <div className="space-y-1.5">
                        {(() => {
                          const totalCountry = Object.values(analytics.alertsByCountry!).reduce((s,v)=>s+v,0);
                          const maxCountry = Math.max(...Object.values(analytics.alertsByCountry!));
                          const countryFlags: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Syria: '🇸🇾', Iraq: '🇮🇶', Yemen: '🇾🇪', 'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Palestine: '🇵🇸', Jordan: '🇯🇴' };
                          return Object.entries(analytics.alertsByCountry!).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([country, count]) => {
                            const barPct = (count / maxCountry) * 100;
                            const totalPct = totalCountry > 0 ? ((count / totalCountry) * 100).toFixed(0) : '0';
                            const countryColors: Record<string, string> = { Israel: 'bg-blue-500/60', Lebanon: 'bg-emerald-500/60', Iran: 'bg-purple-500/60', Syria: 'bg-yellow-500/60', Iraq: 'bg-orange-500/60', Yemen: 'bg-rose-500/60', 'Saudi Arabia': 'bg-green-500/60', UAE: 'bg-sky-500/60' };
                            const tgCount = analytics.telegramByCountry?.[country] || 0;
                            const evtCount = analytics.eventsByCountry?.[country] || 0;
                            const flag = countryFlags[country] || '';
                            return (
                              <Tooltip key={country}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-default hover:bg-white/[0.03] rounded px-1 py-0.5 transition-colors group">
                                    <span className="text-[11px] leading-none w-4 shrink-0">{flag}</span>
                                    <span className="text-[9px] font-mono text-foreground/60 w-14 truncate">{country}</span>
                                    <div className="flex-1 h-3 bg-muted/30 rounded-sm overflow-hidden relative">
                                      <div className={`h-full ${countryColors[country] || 'bg-blue-500/50'} rounded-sm transition-all`} style={{ width: `${Math.max(4, barPct)}%` }} />
                                    </div>
                                    <span className="text-[8px] font-mono text-foreground/30 w-6 text-right tabular-nums">{totalPct}%</span>
                                    <span className="text-[9px] font-bold font-mono text-foreground/55 w-5 text-right tabular-nums">{count}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                                  <p className="text-foreground/80 font-bold mb-0.5">{flag} {country}</p>
                                  <p className="text-foreground/50">{count} alerts · {totalPct}% of total</p>
                                  {tgCount > 0 && <p className="text-cyan-400/70">{tgCount} Telegram mentions</p>}
                                  {evtCount > 0 && <p className="text-orange-400/70">{evtCount} conflict events</p>}
                                </TooltipContent>
                              </Tooltip>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {analytics.telegramByCountry && Object.keys(analytics.telegramByCountry).length > 0 && (
                    <div data-testid="section-telegram-intel">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Telegram Intel by Country', '\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A \u062A\u064A\u0644\u064A\u063A\u0631\u0627\u0645')}</span>
                        <span className="text-[8px] font-mono text-foreground/25">{Object.values(analytics.telegramByCountry).reduce((s,v)=>s+v,0)} mentions</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(analytics.telegramByCountry).sort((a,b)=>b[1]-a[1]).map(([country, count]) => {
                          const countryChipColors: Record<string, string> = { Israel: 'bg-blue-950/40 border-blue-500/25 text-blue-300', Lebanon: 'bg-emerald-950/40 border-emerald-500/25 text-emerald-300', Yemen: 'bg-rose-950/40 border-rose-500/25 text-rose-300', Iran: 'bg-purple-950/40 border-purple-500/25 text-purple-300', Syria: 'bg-yellow-950/40 border-yellow-500/25 text-yellow-300' };
                          return (
                            <span key={country} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${countryChipColors[country] || 'bg-white/[0.03] border-white/10 text-foreground/50'}`}>
                              {country.toUpperCase()} {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analytics.regionAnomalies && analytics.regionAnomalies.length > 0 && (
                    <div data-testid="section-region-anomalies">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 font-mono">{t('Anomaly Detection', '\u0631\u0635\u062F \u0627\u0644\u0634\u0630\u0648\u0630')}</span>
                        <div className="flex-1" />
                        <span className="text-[8px] font-mono text-foreground/30">{analytics.regionAnomalies.length} flagged</span>
                      </div>
                      <div className="space-y-1" data-testid="list-anomalies">
                        {analytics.regionAnomalies.map(a => {
                          const isCrit = a.severity === 'critical';
                          const barPct = Math.min(100, Math.round((a.zScore / 4) * 100));
                          return (
                            <div key={a.region} className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${isCrit ? 'bg-red-950/25 border-red-500/25 hover:border-red-500/45' : 'bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40'}`} data-testid={`anomaly-${a.region.toLowerCase().replace(/\s/g, '-')}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCrit ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                              <span className={`text-[10px] font-bold font-mono w-16 truncate ${isCrit ? 'text-red-300' : 'text-amber-300'}`}>{a.region}</span>
                              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${isCrit ? 'bg-red-400/65' : 'bg-amber-400/55'}`} style={{ width: `${barPct}%` }} />
                              </div>
                              <div className="flex flex-col items-end gap-0">
                                <span className={`text-[9px] font-black font-mono ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>{a.pctAboveAvg > 0 ? '+' : ''}{a.pctAboveAvg}%</span>
                                <span className="text-[7px] font-mono text-foreground/25">z={a.zScore.toFixed(1)}</span>
                              </div>
                              <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ml-1 ${isCrit ? 'text-red-400 bg-red-950/50 border-red-500/30' : 'text-amber-400 bg-amber-950/40 border-amber-500/25'}`}>{isCrit ? 'CRIT' : 'WARN'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded border border-border bg-muted/20 p-2.5" data-testid="section-quick-stats">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-3 h-3 text-amber-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/40 font-mono">{t('Session Intelligence Summary', '\u0645\u0644\u062E\u0635 \u0627\u0644\u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        { label: t('Regions Affected', '\u0627\u0644\u0645\u0646\u0627\u0637\u0642'), value: String(totalRegions), color: 'text-blue-400' },
                        { label: t('Threat Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062A\u0647\u062F\u064A\u062F'), value: String(totalTypes), color: 'text-purple-400' },
                        { label: t('Avg Response Time', '\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629'), value: `${analytics.avgResponseTime}s`, color: 'text-cyan-400' },
                        { label: t('Intelligence Feeds', '\u062E\u0644\u0627\u0635\u0627\u062A'), value: String(analytics.topSources.length), color: 'text-emerald-400' },
                        { label: t('AI Patterns Found', '\u0623\u0646\u0645\u0627\u0637 \u0630\u0643\u064A\u0629'), value: String(patterns.length), color: 'text-violet-400' },
                        { label: t('False Alarm Cases', '\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629'), value: String(falseAlarms.length), color: 'text-yellow-400' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-0.5">
                          <span className="text-[9px] font-mono text-foreground/35">{row.label}</span>
                          <span className={`text-[10px] font-black font-mono ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {analyticsTab === 'regions' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Alerts by Region', '\u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0645\u0646\u0637\u0642\u0629')}</span>
                      <span className="text-[8px] font-mono text-foreground/25">{regionEntries.reduce((s,[,v])=>s+v,0)} total across {regionEntries.length} regions</span>
                    </div>
                    <div className="space-y-1" data-testid="chart-by-region">
                      {regionEntries.map(([region, count], i) => {
                        const pct = (count / maxRegion) * 100;
                        const barColor = pct > 70 ? 'bg-red-500/60' : pct > 40 ? 'bg-orange-500/55' : 'bg-amber-500/45';
                        const avgPerHour = (analytics.alertTimeline ?? []).length > 0 ? (count / (analytics.alertTimeline ?? []).length).toFixed(1) : '0';
                        return (
                          <Tooltip key={region}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/20 rounded px-1 py-0.5 transition-colors">
                                <span className="text-[8px] font-mono text-foreground/25 w-3">{i+1}</span>
                                <span className="text-[9px] font-mono text-foreground/55 w-20 truncate">{region}</span>
                                <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.max(6, pct)}%` }} />
                                </div>
                                <span className="text-[9px] font-bold font-mono text-foreground/50 w-6 text-right">{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[180px]">
                              <p className="text-foreground/80 font-bold">{region}</p>
                              <p className="text-foreground/50">{count} alerts ({pct.toFixed(0)}% of max)</p>
                              <p className="text-foreground/40">~{avgPerHour} alerts/hour avg</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('By Threat Type', '\u062D\u0633\u0628 \u0646\u0648\u0639 \u0627\u0644\u062A\u0647\u062F\u064A\u062F')}</span>
                      <span className="text-[8px] font-mono text-foreground/25">{typeEntries.length} types</span>
                    </div>
                    <div className="space-y-1" data-testid="chart-by-type">
                      {typeEntries.map(([type, count]) => {
                        const pct = (count / maxType) * 100;
                        const typeColors: Record<string, string> = { missile: 'bg-red-500/60', airstrike: 'bg-orange-500/55', rocket: 'bg-amber-500/50', drone: 'bg-purple-500/55', artillery: 'bg-yellow-500/50', ground_incursion: 'bg-emerald-500/50', gps_jamming: 'bg-cyan-500/50', gps_spoofing: 'bg-cyan-400/50', power: 'bg-yellow-400/50', hospital: 'bg-rose-400/50' };
                        const pctOfTotal = totalAlerts > 0 ? ((count / totalAlerts) * 100).toFixed(1) : '0';
                        return (
                          <Tooltip key={type}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default hover:bg-muted/20 rounded px-1 py-0.5 transition-colors">
                                <span className="text-[9px] font-mono text-foreground/45 w-16 truncate uppercase">{type.replace(/_/g,' ')}</span>
                                <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                                  <div className={`h-full ${typeColors[type] || 'bg-blue-500/50'} rounded-full`} style={{ width: `${Math.max(6, pct)}%` }} />
                                </div>
                                <span className="text-[8px] font-mono text-foreground/30 w-8 text-right">{pctOfTotal}%</span>
                                <span className="text-[9px] font-bold font-mono text-foreground/50 w-6 text-right">{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono">
                              <p className="text-foreground/70">{type.replace(/_/g,' ').toUpperCase()}: {count} events ({pctOfTotal}% of total)</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {analyticsTab === 'sources' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Source Reliability', '\u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631')}</span>
                      <span className="text-[9px] font-mono text-foreground/30">{analytics.topSources.length} feeds</span>
                    </div>
                    <div className="space-y-1" data-testid="table-sources">
                      {analytics.topSources.map((src) => {
                        const reliabilityPct = (src.reliability * 100).toFixed(0);
                        const reliabilityColor = src.reliability > 0.85 ? 'text-emerald-400' : src.reliability > 0.7 ? 'text-yellow-400' : 'text-red-400';
                        const reliabilityBg = src.reliability > 0.85 ? 'bg-emerald-950/30 border-emerald-500/20' : src.reliability > 0.7 ? 'bg-yellow-950/30 border-yellow-500/20' : 'bg-red-950/30 border-red-500/20';
                        const reliabilityLabel = src.reliability > 0.85 ? 'High reliability' : src.reliability > 0.7 ? 'Moderate reliability' : 'Low reliability';
                        const reliabilityBar = src.reliability * 100;
                        return (
                          <Tooltip key={src.channel}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 px-2 py-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-border cursor-default">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.reliability > 0.85 ? 'bg-emerald-400' : src.reliability > 0.7 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-mono text-foreground/65 block truncate">{src.channel}</span>
                                  <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${src.reliability > 0.85 ? 'bg-emerald-400/60' : src.reliability > 0.7 ? 'bg-yellow-400/60' : 'bg-red-400/50'}`} style={{ width: `${reliabilityBar}%` }} />
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono text-foreground/30 shrink-0">{src.count}msg</span>
                                <div className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border shrink-0 ${reliabilityBg} ${reliabilityColor}`}>{reliabilityPct}%</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[200px]">
                              <p className="text-foreground/80 font-bold mb-0.5">{src.channel}</p>
                              <p className={`${reliabilityColor} mb-0.5`}>{reliabilityLabel}</p>
                              <p className="text-foreground/40">{src.count} messages processed</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3 h-3 text-emerald-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/40 font-mono">{t('Source Health Overview', '\u0635\u062D\u0629 \u0627\u0644\u0645\u0635\u0627\u062F\u0631')}</span>
                    </div>
                    {(() => {
                      const highRel = analytics.topSources.filter(s => s.reliability > 0.85).length;
                      const medRel = analytics.topSources.filter(s => s.reliability > 0.7 && s.reliability <= 0.85).length;
                      const lowRel = analytics.topSources.filter(s => s.reliability <= 0.7).length;
                      const totalMsgs = analytics.topSources.reduce((s, src) => s + src.count, 0);
                      const avgRel = analytics.topSources.length > 0 ? (analytics.topSources.reduce((s, src) => s + src.reliability, 0) / analytics.topSources.length * 100).toFixed(1) : '0';
                      return (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">High Reliability</span><span className="text-[10px] font-black font-mono text-emerald-400">{highRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Medium Reliability</span><span className="text-[10px] font-black font-mono text-yellow-400">{medRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Low Reliability</span><span className="text-[10px] font-black font-mono text-red-400">{lowRel}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-foreground/35">Avg Reliability</span><span className="text-[10px] font-black font-mono text-blue-400">{avgRel}%</span></div>
                          <div className="flex items-center justify-between col-span-2 pt-1 border-t border-border"><span className="text-[9px] font-mono text-foreground/35">Total Messages</span><span className="text-[10px] font-black font-mono text-cyan-400">{totalMsgs.toLocaleString()}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {analyticsTab === 'patterns' && (
                <>
                  {patterns.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Detected Patterns', '\u0623\u0646\u0645\u0627\u0637')}</span>
                        <span className="text-[8px] font-mono text-foreground/25 ml-auto">{patterns.length} found</span>
                      </div>
                      <div className="space-y-1.5" data-testid="list-patterns">
                        {patterns.map(p => (
                          <Tooltip key={p.id}>
                            <TooltipTrigger asChild>
                              <div className="p-2.5 rounded bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-default" data-testid={`pattern-${p.id}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                  <span className="text-[11px] font-bold text-purple-300 font-mono uppercase">{p.type.replace(/_/g, ' ')}</span>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${p.confidence > 0.7 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-400'}`}>{(p.confidence * 100).toFixed(0)}%</span>
                                  <span className="ml-auto text-[8px] font-mono text-foreground/30">{timeAgo(p.detectedAt)}</span>
                                </div>
                                <p className="text-[10px] text-foreground/50 leading-relaxed">{p.description}</p>
                                {p.affectedRegions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p.affectedRegions.map(r => (
                                      <span key={r} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-950/30 border border-purple-500/15 text-purple-300/70">{r}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                              <p className="text-foreground/50 mb-0.5">Detected at</p>
                              <p className="text-foreground/80">{new Date(p.detectedAt).toUTCString()}</p>
                              <p className="text-foreground/40 mt-0.5">{p.alertCount} alerts in pattern</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {falseAlarms.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400/70" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('False Alarm Analysis', '\u062A\u062D\u0644\u064A\u0644 \u0625\u0646\u0630\u0627\u0631\u0627\u062A \u0643\u0627\u0630\u0628\u0629')}</span>
                        <span className="text-[8px] font-mono text-foreground/25 ml-auto">{falseAlarms.length} analyzed</span>
                      </div>
                      <div className="space-y-1" data-testid="list-false-alarms">
                        {falseAlarms.slice(0, 12).map(fa => (
                          <Tooltip key={fa.alertId}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/20 hover:bg-muted/40 transition-colors cursor-default" data-testid={`false-alarm-${fa.alertId}`}>
                                <div className={`w-2 h-2 rounded-full ${fa.score > 0.7 ? 'bg-red-500' : fa.score > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                                <span className="text-[10px] font-mono text-foreground/60 flex-1 truncate">{fa.recommendation.replace(/_/g, ' ')}</span>
                                <span className="text-[10px] font-mono text-foreground/40 truncate max-w-[120px]">{fa.reasons[0] || ''}</span>
                                <span className="text-[10px] font-bold font-mono text-foreground/50">{(fa.score * 100).toFixed(0)}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-black/90 border-white/10 text-[10px] font-mono max-w-[220px]">
                              <p className={`font-bold mb-1 ${fa.score > 0.7 ? 'text-red-400' : fa.score > 0.4 ? 'text-yellow-400' : 'text-emerald-400'}`}>{fa.recommendation.replace(/_/g,' ').toUpperCase()}</p>
                              <p className="text-foreground/50 mb-0.5">Alert ID: {fa.alertId}</p>
                              {fa.reasons.map((r, i) => <p key={i} className="text-foreground/60">• {r}</p>)}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {patterns.length === 0 && falseAlarms.length === 0 && (
                    <div className="py-6 text-center">
                      <Brain className="w-6 h-6 text-purple-400/30 mx-auto mb-2" />
                      <span className="text-[10px] font-mono text-foreground/30">{t('No patterns detected yet', '\u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0623\u0646\u0645\u0627\u0637')}</span>
                    </div>
                  )}
                </>
              )}

              {analyticsTab === 'epicfury' && (
                <>
                  <div className="rounded border border-red-500/30 overflow-hidden" style={{background:'linear-gradient(135deg,rgb(127 29 29/0.7),rgb(60 10 10/0.5))'}}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-[10px] font-black text-red-300 uppercase tracking-wider font-mono">Operation Epic Fury</span>
                        <button
                          onClick={fetchEpicFury}
                          disabled={epicFuryLoading}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          style={{background:'hsl(0 40% 25% / 0.6)', border:'1px solid hsl(0 50% 40% / 0.5)', color:'hsl(0 80% 75%)'}}
                        >
                          {epicFuryLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                          {epicFuryLoading ? 'Fetching…' : 'Refresh'}
                        </button>
                      </div>
                      {epicFuryError && <div className="text-[7px] font-mono text-red-400/70 mb-1">Failed to fetch — site may be JS-rendered. Showing last known data.</div>}
                      {epicFuryFetchedAt && !epicFuryError && <div className="text-[7px] font-mono text-emerald-400/60 mb-1">Live data fetched at {epicFuryFetchedAt}</div>}
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Start</div>
                          <div className="text-[11px] font-black font-mono text-foreground/80">28/02/2026</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Day</div>
                          <div className="text-2xl font-black font-mono text-red-400">{epicFuryData?.day ?? 13}</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-foreground/40 uppercase tracking-wider">Updated</div>
                          <div className="text-[11px] font-black font-mono text-foreground/80">{epicFuryData?.lastUpdated ?? '13/03/2026'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="w-3.5 h-3.5 text-orange-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Cumulative Metrics</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { label: 'Ballistic Missiles', value: '~1,040', color: 'text-red-400', accent: 'hsl(0 72% 51%)', sub: 'Region-wide' },
                        { label: 'Drones / UAVs', value: '~3,000', color: 'text-yellow-400', accent: 'hsl(48 96% 53%)', sub: 'Region-wide' },
                        { label: 'Missiles to Israel', value: '~200', color: 'text-orange-400', accent: 'hsl(25 95% 53%)', sub: 'Directed' },
                        { label: 'Lebanon Rockets', value: '~25,000', color: 'text-purple-400', accent: 'hsl(270 60% 60%)', sub: 'Cumulative' },
                        { label: 'Countries Attacked', value: '12', color: 'text-blue-400', accent: 'hsl(215 90% 60%)', sub: 'States' },
                        { label: 'Launchers Destroyed', value: '300', color: 'text-emerald-400', accent: 'hsl(160 84% 39%)', sub: 'Confirmed' },
                        { label: 'Air Refueling Ops', value: '12', color: 'text-cyan-400', accent: 'hsl(195 90% 50%)', sub: 'Sorties' },
                      ] as const).map(({ label, value, color, accent, sub }) => (
                        <div key={label} className="rounded overflow-hidden border border-border/50" style={{borderLeft:`3px solid ${accent}`}}>
                          <div className="px-2 py-1.5 bg-muted/30">
                            <div className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none truncate">{label}</div>
                            <div className={`text-lg font-black font-mono leading-tight tabular-nums ${color}`}>{value}</div>
                            <div className="text-[7px] text-foreground/25 font-mono">{sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crosshair className="w-3.5 h-3.5 text-blue-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">IDF Strikes on Lebanon (Cumulative)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[
                        { label: 'Airstrikes', value: '6,200+', color: 'text-blue-400', accent: 'hsl(215 90% 60%)', sub: 'Sep 2024 – present' },
                        { label: 'Hezbollah Sites', value: '1,400+', color: 'text-orange-400', accent: 'hsl(25 95% 53%)', sub: 'Military infrastructure' },
                        { label: 'Dahieh Strikes', value: '180+', color: 'text-red-400', accent: 'hsl(0 72% 51%)', sub: 'Beirut southern suburb' },
                        { label: 'Cmd. Eliminated', value: '40+', color: 'text-purple-400', accent: 'hsl(270 60% 60%)', sub: 'Senior Hezbollah officials' },
                        { label: 'Ground Ops', value: '~45 km²', color: 'text-cyan-400', accent: 'hsl(195 90% 50%)', sub: 'S. Lebanon buffer zone' },
                        { label: 'IAF Sorties', value: '14,000+', color: 'text-emerald-400', accent: 'hsl(160 84% 39%)', sub: 'Total flown' },
                      ].map(({ label, value, color, accent, sub }) => (
                        <div key={label} className="rounded overflow-hidden border border-border/50" style={{borderLeft:`3px solid ${accent}`}}>
                          <div className="px-2 py-1.5 bg-muted/30">
                            <div className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none truncate">{label}</div>
                            <div className={`text-base font-black font-mono leading-tight tabular-nums ${color}`}>{value}</div>
                            <div className="text-[7px] text-foreground/25 font-mono">{sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { zone: 'South Lebanon (Ground)', type: 'Ground / Air', detail: 'Buffer zone ops, tunnel clearance' },
                        { zone: 'Dahieh — Beirut', type: 'Precision Strike', detail: 'Hezbollah command + weapons storage' },
                        { zone: 'Bekaa Valley', type: 'Airstrike', detail: 'Arms depots, Radwan HQ positions' },
                        { zone: 'Baalbek–Hermel', type: 'Airstrike', detail: 'IRGC logistics + medium-range launchers' },
                        { zone: 'Tyre–Sidon Coast', type: 'Naval / Air', detail: 'Port interdiction, coastal launchers' },
                      ].map(({ zone, type, detail }) => (
                        <div key={zone} className="flex items-start gap-2 rounded p-2 bg-muted/15 border border-border/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80 mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-bold font-mono text-foreground/70 truncate">{zone}</span>
                              <span className="text-[8px] font-mono text-blue-400/70 shrink-0">{type}</span>
                            </div>
                            <div className="text-[8px] font-mono text-foreground/35 mt-0.5">{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Interception Events by Country</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { country: 'UAE', value: 1797, ballistic: 229, drones: 1439 },
                        { country: 'Kuwait', value: 682, ballistic: 226, drones: 425 },
                        { country: 'Bahrain', value: 285, ballistic: 86, drones: 173 },
                        { country: 'Qatar', value: 237, ballistic: 131, drones: 63 },
                        { country: 'Saudi Arabia', value: 170, ballistic: 14, drones: 110 },
                        { country: 'Jordan', value: 90, ballistic: 30, drones: 60 },
                        { country: 'Israel', value: 650, ballistic: 400, drones: 250 },
                        { country: 'Oman', value: 15, ballistic: 0, drones: 8 },
                        { country: 'Iraq', value: 12, ballistic: 0, drones: 12 },
                        { country: 'Cyprus', value: 3, ballistic: 2, drones: 1 },
                      ].map(({ country, value, ballistic, drones }) => {
                        const pct = (value / 1797) * 100;
                        return (
                          <div key={country} className="flex items-center gap-2">
                            <span className="text-[9px] text-foreground/60 font-mono w-[90px] truncate">{country}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/30">
                              <div className="h-full rounded-full" style={{width:`${pct}%`, background:'hsl(160 84% 39%)'}} />
                            </div>
                            <span className="text-[9px] text-emerald-400 font-mono font-bold w-[32px] text-right tabular-nums">{value.toLocaleString()}</span>
                            <span className="text-[7px] text-foreground/30 font-mono w-[70px]">{ballistic > 0 ? `${ballistic}B` : ''}{ballistic > 0 && drones > 0 ? '·' : ''}{drones > 0 ? `${drones}D` : ''}</span>
                          </div>
                        );
                      })}
                      <div className="text-[7px] text-foreground/25 font-mono mt-1">B = Ballistic · D = Drones</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Casualty Figures</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { party: 'Israel', killed: epicFuryData?.israelKilled ?? 18, wounded: (epicFuryData?.israelWounded ?? 2745) as number | null, notes: '3,400 displaced · 50,719 alerts' as string | null, color: '#60a5fa' },
                        { party: 'Lebanon', killed: epicFuryData?.lebanonKilled ?? 634, wounded: 1586 as number | null, notes: '750,000 displaced' as string | null, color: '#34d399' },
                        { party: 'Iran', killed: epicFuryData?.iranKilled ?? 1348, wounded: (epicFuryData?.iranWounded ?? 6186) as number | null, notes: '~45 targeted ops (14 senior officials)' as string | null, color: '#ef4444' },
                        { party: 'Middle East (excl. Israel)', killed: 28, wounded: 478 as number | null, notes: null as string | null, color: '#f97316' },
                        { party: 'United States', killed: 7, wounded: null as number | null, notes: null as string | null, color: '#a78bfa' },
                      ].map(({ party, killed, wounded, notes, color }) => (
                        <div key={party} className="rounded p-2.5 bg-muted/20 border border-border/40">
                          <span className="text-[10px] font-bold font-mono" style={{ color }}>{party}</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            <div className="flex flex-col">
                              <span className="text-[7px] text-foreground/35 uppercase tracking-wider">Killed</span>
                              <span className="text-[13px] font-black font-mono text-red-400 tabular-nums leading-tight">{killed.toLocaleString()}</span>
                            </div>
                            {wounded != null && (
                              <div className="flex flex-col">
                                <span className="text-[7px] text-foreground/35 uppercase tracking-wider">Wounded</span>
                                <span className="text-[13px] font-black font-mono text-orange-400 tabular-nums leading-tight">{wounded.toLocaleString()}</span>
                              </div>
                            )}
                            {notes && <span className="text-[8px] font-mono text-foreground/30 self-end pb-0.5">{notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-400/70" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">Day 13 Activity (12/03/2026)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div className="rounded p-2 bg-muted/20 border border-border/40">
                        <div className="text-[7px] text-foreground/35 uppercase tracking-wider">Ballistic Missiles</div>
                        <div className="text-xl font-black font-mono text-red-400 tabular-nums">25</div>
                      </div>
                      <div className="rounded p-2 bg-muted/20 border border-border/40">
                        <div className="text-[7px] text-foreground/35 uppercase tracking-wider">Drones</div>
                        <div className="text-xl font-black font-mono text-yellow-400 tabular-nums">65</div>
                      </div>
                    </div>
                    <div className="rounded p-2 bg-muted/20 border border-border/40">
                      <div className="text-[7px] text-foreground/35 uppercase tracking-wider mb-1">Targets Hit</div>
                      <div className="text-[8px] font-mono text-foreground/60">Jerusalem · Shaybah Field · UAE Ministry of Defense</div>
                    </div>
                  </div>

                  <div className="text-[7px] text-foreground/25 text-center font-mono pt-1">
                    Source: littlemoiz.com · IDF Spokesperson · INSS · Ynet · Day 13 (13/03/2026)
                  </div>
                </>
              )}

            </TooltipProvider>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
