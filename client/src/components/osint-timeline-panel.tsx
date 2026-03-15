import { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { Activity } from 'lucide-react';
import { FeedFreshnessContext, PanelHeader } from '@/components/panels/panel-chrome';
import type { RedAlert, TelegramMessage, ConflictEvent } from '@shared/schema';

interface OsintEntry {
  id: string;
  source: 'alert' | 'telegram' | 'event';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  timestamp: string;
  icon: string;
  borderColor: string;
}

const OSINT_SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

const OSINT_PRIORITY_CHANNELS = new Set([
  '@wfwitness', '@ClashReport', '@clashreport', '@AjaNews', '@thewarreporter', '@channelnabatieh',
  '@GeoConfirmed', '@ELINTNews', '@OSINTdefender', '@IntelCrab', '@CIG_telegram',
  '@bintjbeilnews', '@almanarnews', '@AlAhedNews', '@BNONewsRoom', '@Middle_East_Spectator',
]);

const ARABIC_CHANNELS = new Set([
  '@AjaNews', '@channelnabatieh', '@almanarnews', '@AlAhedNews', '@QudsN',
  '@bintjbeilnews', '@lebaborim', '@HezbollahWO', '@ResistanceLB', '@southlebanon',
  '@nabatiehnews', '@mtaborim', '@alaborim', '@inaborim', '@Yemen_Press', '@AlMasiraaTV',
]);

function buildOsintEntries(
  alerts: RedAlert[],
  messages: TelegramMessage[],
  events: ConflictEvent[],
  lang: 'en' | 'ar',
): OsintEntry[] {
  const entries: OsintEntry[] = [];
  const THREAT_SEV: Record<string, OsintEntry['severity']> = {
    missiles: 'critical', hostile_aircraft_intrusion: 'critical',
    rockets: 'high', uav_intrusion: 'medium',
  };
  alerts.forEach(a => entries.push({
    id: `alert-${a.id}`,
    source: 'alert',
    severity: THREAT_SEV[a.threatType] || 'high',
    title: `${a.threatType.replace(/_/g, ' ').toUpperCase()} \u00B7 ${lang === 'ar' ? a.cityAr : a.city}`,
    body: `${a.region} \u00B7 ${a.country}`,
    timestamp: a.timestamp,
    icon: a.threatType === 'missiles' ? '\uD83C\uDFAF' : a.threatType === 'uav_intrusion' ? '\uD83D\uDEF8' : '\uD83D\uDEA8',
    borderColor: '#ef4444',
  }));
  messages.forEach(m => {
    const isPriority = OSINT_PRIORITY_CHANNELS.has(m.channel);
    const isArabicCh = ARABIC_CHANNELS.has(m.channel);
    const arRatio = m.text ? (m.text.match(/[\u0600-\u06FF]/g) || []).length / Math.max(m.text.length, 1) : 0;
    const hasArabicText = isArabicCh || arRatio > 0.25;
    const scan = m.text + (m.textAr || '');
    const hasEajil = scan.includes('\u0639\u0627\u062c\u0644');
    const hasInzar = scan.includes('\u0625\u0646\u0630\u0627\u0631');
    const hasIkhla = scan.includes('\u0625\u062e\u0644\u0627\u0621');
    const isArabicUrgent = hasEajil || hasInzar || hasIkhla;
    const isEnUrgent = /\bBREAKING\b|\bURGENT\b|\bEVACUATION\b/i.test(scan);
    const bodyText = lang === 'ar'
      ? (m.textAr || m.text)
      : hasArabicText
        ? (m.textAr ? `[AR] ${m.textAr}` : `[AR] ${m.text}`)
        : m.text;
    const severity: OsintEntry['severity'] =
      isArabicUrgent || isEnUrgent ? 'critical' :
      isPriority ? 'high' : 'medium';
    const urgencyTag = hasEajil ? '\u26A1\u0639\u0627\u062C\u0644 ' : hasInzar ? '\uD83D\uDD14\u0625\u0646\u0630\u0627\u0631 ' : hasIkhla ? '\uD83D\uDEA8\u0625\u062E\u0644\u0627\u0621 ' : '';
    const icon = isArabicUrgent || isEnUrgent ? '\uD83D\uDEA8' : isPriority ? '\uD83D\uDD34' : hasArabicText ? '\uD83D\uDCFB' : '\uD83D\uDCE1';
    const borderColor = isArabicUrgent || isEnUrgent ? '#ef4444' : isPriority ? '#f97316' : hasArabicText ? '#a78bfa' : '#38bdf8';
    entries.push({
      id: `tg-${m.id}`,
      source: 'telegram',
      severity,
      title: urgencyTag ? `${urgencyTag}${m.channel}` : hasArabicText ? `${m.channel} \uD83C\uDF0D` : m.channel,
      body: bodyText,
      timestamp: m.timestamp,
      icon,
      borderColor,
    });
  });
  events.forEach(e => entries.push({
    id: `evt-${e.id}`,
    source: 'event',
    severity: e.severity,
    title: lang === 'ar' && e.titleAr ? e.titleAr : e.title,
    body: lang === 'ar' && e.descriptionAr ? e.descriptionAr : e.description,
    timestamp: e.timestamp,
    icon: e.type === 'missile' ? '\uD83C\uDFAF' : e.type === 'airstrike' ? '\u2708\uFE0F' : e.type === 'nuclear' ? '\u2622\uFE0F' : '\u26A1',
    borderColor: '#f97316',
  }));
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function OsintTimelinePanel({ alerts, messages, events, language, onClose, onMaximize, isMaximized }: {
  alerts: RedAlert[];
  messages: TelegramMessage[];
  events: ConflictEvent[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  type FilterKey = 'all' | 'alert' | 'telegram' | 'event';
  const freshness = useContext(FeedFreshnessContext);
  const [filter, setFilter] = useState<FilterKey>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const allEntries = useMemo(
    () => buildOsintEntries(alerts, messages, events, language),
    [alerts, messages, events, language],
  );
  const filtered = useMemo(
    () => filter === 'all' ? allEntries : allEntries.filter(e => e.source === filter),
    [allEntries, filter],
  );

  useEffect(() => {
    if (filtered.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevCountRef.current = filtered.length;
  }, [filtered.length]);

  const relTime = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };

  const filterBtns: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: `ALL (${allEntries.length})` },
    { key: 'alert',    label: `ALERTS (${allEntries.filter(e => e.source === 'alert').length})` },
    { key: 'telegram', label: `SIGINT (${allEntries.filter(e => e.source === 'telegram').length})` },
    { key: 'event',    label: `EVENTS (${allEntries.filter(e => e.source === 'event').length})` },
  ];

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="osint-timeline-panel">
      <PanelHeader
        title={language === 'en' ? 'OSINT Timeline' : '\u062C\u062F\u0648\u0644 OSINT'}
        icon={<Activity className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="osint"
      />
      <div className="px-2 py-1 border-b border-border flex gap-1 shrink-0 flex-wrap" style={{background:'hsl(var(--muted))'}}>
        {filterBtns.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wider transition-colors border ${
              filter === key
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'text-muted-foreground/60 hover:text-muted-foreground/85 border-transparent'
            }`}
          >{label}</button>
        ))}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[11px] text-muted-foreground/25 font-mono">NO ENTRIES</div>
        ) : filtered.map(entry => (
          <div
            key={entry.id}
            className="px-3 py-1.5 border-l-2 hover:bg-muted/50 transition-colors"
            style={{ borderLeftColor: entry.borderColor, borderBottom: '1px solid hsl(225 20% 100% / 0.025)' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-[11px] shrink-0 leading-5">{entry.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[8px] px-1 py-px rounded border font-black uppercase shrink-0 ${OSINT_SEVERITY_STYLE[entry.severity]}`}>{entry.severity}</span>
                  <span className="text-[10px] font-bold text-foreground/85 truncate">{entry.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/50 leading-tight line-clamp-2">{entry.body}</p>
              </div>
              <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0 tabular-nums pl-1">{relTime(entry.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
