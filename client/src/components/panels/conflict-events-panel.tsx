import { useState, useMemo, memo } from 'react';
import {
  AlertTriangle, Flame, Globe, MapPin, Clock, Shield, ChevronDown, ChevronRight, Target, Crosshair, Activity,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';
import type { ConflictEvent } from '@shared/schema';
import { ScrollShadow } from '@/components/shared/scroll-shadow';

const SEVERITY_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',    dot: 'bg-red-500' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-500/30',  dot: 'bg-blue-500' },
};
const EVENT_TYPE_ICONS: Record<string, string> = {
  missile:   '🚀',
  airstrike: '💥',
  naval:     '⚓',
  ground:    '🪖',
  defense:   '🛡️',
  nuclear:   '☢️',
};
const AI_EVENT_ASSESSMENTS: Record<string, string> = {
  missile: 'Ballistic trajectory detected — high-confidence threat vector',
  airstrike: 'Fixed-wing or rotary engagement — confirm air defense posture',
  defense: 'Intercept system activation — assess effectiveness window',
  naval: 'Maritime posture shift — monitor Strait of Hormuz corridor',
  ground: 'Frontline contact reported — satellite imagery recommended',
  nuclear: 'Strategic asset activity — immediate escalation risk',
};

export const ConflictEventsPanel = memo(function ConflictEventsPanel({ events, language, onClose, onMaximize, isMaximized }: { events: ConflictEvent[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    // Smart NL filter: match type, severity, country, title
    return sorted.filter(e => {
      if (q.includes('missile') && e.type !== 'missile') return q.includes(e.type);
      const matchType = e.type.includes(q);
      const matchSev = e.severity.includes(q);
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchCountry = (e as any).country?.toLowerCase().includes(q) ?? false;
      const matchDesc = e.description?.toLowerCase().includes(q) ?? false;
      // semantic shortcuts
      if (q === 'critical' || q === 'high' || q === 'medium' || q === 'low') return matchSev;
      return matchType || matchSev || matchTitle || matchCountry || matchDesc;
    });
  }, [events, query]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Conflict Events' : 'أحداث النزاع'}
        icon={<AlertTriangle className="w-3.5 h-3.5" />}
        live
        count={events.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="events"
      />
      {/* AI Natural Language Filter */}
      <div className="px-2 py-1.5 border-b border-border" style={{background:'hsl(var(--muted))'}}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-none" style={{background:'hsl(var(--background))', border:'1px solid hsl(var(--border))'}}>
          <span className="text-[7px] font-mono text-primary/40 font-bold shrink-0">AI▸</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. 'missiles', 'iran', 'critical'..."
            className="flex-1 bg-transparent text-[9px] font-mono text-foreground/70 placeholder:text-foreground/20 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-foreground/30 hover:text-foreground/60 text-[8px] font-mono">✕</button>
          )}
        </div>
      </div>
      {filtered.length === 0 && query && (
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] text-foreground/25 font-mono">No results — try 'missile', 'high', or a country name</p>
        </div>
      )}
      {events.length === 0 && !query && (
        <div className="px-3 py-6 text-center">
          <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[10px] text-foreground/25">No active events</p>
        </div>
      )}
      <ScrollShadow className="flex-1 min-h-0">
        <div className="divide-y divide-border">
        {filtered.map((e) => {
          const sev = SEVERITY_STYLES[e.severity] || SEVERITY_STYLES.low;
          const icon = EVENT_TYPE_ICONS[e.type] || '📍';
          return (
            <div
              key={e.id}
              className="px-3 py-3 hover-elevate border-l-2"
              style={{ borderLeftColor: e.severity === 'critical' ? 'rgb(239 68 68 / 0.6)' : e.severity === 'high' ? 'rgb(249 115 22 / 0.6)' : 'transparent' }}
              data-testid={`conflict-event-${e.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs shrink-0">{icon}</span>
                <span className="text-xs font-bold font-mono text-foreground truncate flex-1">
                  {language === 'ar' && e.titleAr ? e.titleAr : e.title}
                </span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded border font-bold font-mono shrink-0 ${sev.color} ${sev.bg}`}>
                  {e.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">
                {language === 'ar' && e.descriptionAr ? e.descriptionAr : e.description}
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/70 mb-1">
                <span className="uppercase tracking-wider text-foreground/50">{e.type}</span>
                <span className="text-foreground/30">·</span>
                <span>{timeAgo(e.timestamp)}</span>
              </div>
              {AI_EVENT_ASSESSMENTS[e.type] && (
                <div className="flex items-start gap-1 mt-0.5">
                  <span className="text-[7px] font-mono font-bold text-primary/40 shrink-0 mt-0.5">AI▸</span>
                  <span className="text-[8px] font-mono text-foreground/30 leading-snug italic">{AI_EVENT_ASSESSMENTS[e.type]}</span>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </ScrollShadow>
    </div>
  );
});


