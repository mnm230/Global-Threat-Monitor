import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Siren, ShieldAlert, MapPin, AlertTriangle, Zap } from 'lucide-react';
import { timeAgo } from '@/lib/dashboard-utils';
import { THREAT_LABELS } from '@/lib/dashboard-types';
import type { SirenAlert, BreakingNewsItem } from '@shared/schema';

export function SirenBanner({ sirens, breakingNews = [], language, hidden }: { sirens: SirenAlert[]; breakingNews?: BreakingNewsItem[]; language: 'en' | 'ar'; hidden?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const activeSirens = sirens.filter(s => {
    const ts = new Date(s.timestamp).getTime();
    if (isNaN(ts)) return false;
    const age = Date.now() - ts;
    return s.active || age < 120_000;
  });

  const hasContent = activeSirens.length > 0 || breakingNews.length > 0;
  if (!hasContent || hidden) return null;

  const hasSirens = activeSirens.length > 0;
  const hasCritical = breakingNews.some(b => b.severity === 'critical');

  const sortedSirens = [...activeSirens].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const sortedBreaking = [...breakingNews].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const bgStyle = hasSirens
    ? {background:'hsl(0 72% 51% / 0.06)', borderColor:'hsl(0 72% 51% / 0.25)'}
    : hasCritical
      ? {background:'hsl(38 92% 50% / 0.06)', borderColor:'hsl(38 92% 50% / 0.25)'}
      : {background:'hsl(221 83% 53% / 0.04)', borderColor:'hsl(221 83% 53% / 0.20)'};

  return (
    <div className="border-b shrink-0" data-testid="siren-banner" style={bgStyle}>
      <div
        className={`${hasSirens ? 'animate-siren-bg' : ''} flex items-center gap-2 px-4 cursor-pointer select-none`}
        onClick={() => setExpanded(!expanded)}
        data-testid="button-siren-toggle"
      >
        <div className="flex items-center gap-2 py-1 shrink-0">
          {hasSirens ? (
            <>
              <div className="w-4 h-4 rounded-sm flex items-center justify-center animate-siren-flash" style={{background:'hsl(0 80% 50% / 0.15)', border:'1px solid hsl(0 80% 50% / 0.4)'}}>
                <Siren className="w-2.5 h-2.5 text-red-400/90" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400/60 font-mono whitespace-nowrap">
                {language === 'en' ? 'ACTIVE SIRENS' : '\u0635\u0641\u0627\u0631\u0627\u062A \u0646\u0634\u0637\u0629'}
              </span>
              <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-[14px] font-mono font-bold animate-pulse-dot">
                {activeSirens.length}
              </Badge>
            </>
          ) : (
            <>
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${hasCritical ? 'animate-siren-flash' : ''}`} style={{background: hasCritical ? 'hsl(30 80% 50% / 0.15)' : 'hsl(32 80% 50% / 0.1)', border: hasCritical ? '1px solid hsl(30 80% 50% / 0.4)' : '1px solid hsl(32 80% 50% / 0.25)'}}>
                <Zap className={`w-2.5 h-2.5 ${hasCritical ? 'text-amber-400/90' : 'text-amber-500/70'}`} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-[0.25em] font-mono whitespace-nowrap ${hasCritical ? 'text-amber-400/70' : 'text-amber-500/50'}`}>
                {language === 'en' ? 'BREAKING' : '\u0639\u0627\u062C\u0644'}
              </span>
              <Badge variant={hasCritical ? 'destructive' : 'secondary'} className="text-[8px] px-1.5 py-0 h-[14px] font-mono font-bold">
                {breakingNews.length}
              </Badge>
            </>
          )}
        </div>

        <div className="flex-1 overflow-hidden min-w-0">
          <div className="flex items-center gap-4 animate-siren-scroll whitespace-nowrap">
            {hasSirens && [...sortedSirens, ...sortedSirens].map((s, i) => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              return (
                <span key={`siren-${s.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                  <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-red-300 font-bold">
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className="text-red-500/70">{'\u2022'}</span>
                  <span className="text-red-400/80 text-[10px]">
                    {language === 'ar' ? threat.ar : threat.en}
                  </span>
                  <span className="text-red-900/60 mx-1">{'\u2502'}</span>
                </span>
              );
            })}
            {[...sortedBreaking, ...sortedBreaking].map((item, i) => (
              <span key={`brk-${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs font-mono">
                {item.severity === 'critical' ? (
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                )}
                <span className={`font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-amber-400/80'}`}>
                  {(item.headline || '').length > 100 ? (item.headline || '').slice(0, 100) + '...' : (item.headline || '')}
                </span>
                <span className="text-foreground/20 text-[9px]">
                  {item.source === 'telegram' ? `TG/${item.channel?.replace('@', '')}` : item.source === 'x' ? `X/${item.channel}` : 'ALERT'}
                </span>
                <span className="text-foreground/10 mx-1">{'\u2502'}</span>
              </span>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className={`text-[10px] px-2 h-6 font-mono shrink-0 ${hasSirens ? 'text-red-400 hover:bg-red-900/30' : hasCritical ? 'text-amber-400 hover:bg-amber-900/20' : 'text-amber-500 hover:bg-amber-900/20'}`}
          data-testid="button-siren-expand"
        >
          {expanded ? '\u25B2' : '\u25BC'} {language === 'en' ? 'Details' : '\u062A\u0641\u0627\u0635\u064A\u0644'}
        </Button>
      </div>

      {expanded && (
        <div className={`border-t ${hasSirens ? 'border-red-900/30 bg-red-950/20' : 'border-border bg-card/40'} max-h-[180px] overflow-auto`}>
          {sortedSirens.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-red-900/20">
              {sortedSirens.map((s) => {
                const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
                return (
                  <div key={s.id} className="px-3 py-2 bg-background/80" data-testid={`siren-alert-${s.id}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-[11px] text-red-300 font-bold truncate">
                        {language === 'ar' ? s.locationAr : s.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-bold tracking-wider rounded-sm">
                        {language === 'ar' ? threat.ar : threat.en}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono ml-auto tabular-nums">
                        {timeAgo(s.timestamp)}
                      </span>
                    </div>
                    <span className="text-[10px] text-red-400/60 mt-0.5 block">
                      {language === 'ar' ? s.regionAr : s.region}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {sortedBreaking.length > 0 && (
            <div className={`${sortedSirens.length > 0 ? 'border-t border-border' : ''}`}>
              {sortedBreaking.map((item) => (
                <div key={item.id} className="px-4 py-2 border-b border-border" data-testid={`breaking-${item.id}`}>
                  <div className="flex items-center gap-2">
                    {item.severity === 'critical' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={`text-[11px] font-bold ${item.severity === 'critical' ? 'text-amber-300' : 'text-amber-400/80'}`}>
                      {item.headline}
                    </span>
                    <span className="text-[9px] text-foreground/30 font-mono ml-auto shrink-0 tabular-nums">
                      {timeAgo(item.timestamp)} {'\u2022'} {item.source === 'telegram' ? `TG` : item.source === 'x' ? 'X' : 'SYS'}/{item.channel?.replace('@', '') || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
