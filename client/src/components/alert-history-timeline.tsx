import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Loader2 } from 'lucide-react';
import type { RedAlert } from '@shared/schema';

export function AlertHistoryTimeline({ language }: { language: 'en' | 'ar' }) {
  const { data: history = [], isLoading } = useQuery<Array<RedAlert & { resolved: boolean; resolvedAt?: string }>>({
    queryKey: ['/api/alert-history'],
    refetchInterval: 10000,
    staleTime: 0,
  });
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  const now = Date.now();
  const bucketSize = 15 * 60 * 1000;
  const bucketCount = 96;

  const buckets = useMemo(() => {
    const b: Array<{ start: number; end: number; alerts: Array<RedAlert & { resolved: boolean }>; byType: Record<string, number> }> = [];
    for (let i = 0; i < bucketCount; i++) {
      const end = now - i * bucketSize;
      const start = end - bucketSize;
      const alerts = history.filter(a => {
        const ts = new Date(a.timestamp).getTime();
        return ts >= start && ts < end;
      });
      const byType: Record<string, number> = {};
      alerts.forEach(a => { byType[a.threatType] = (byType[a.threatType] || 0) + 1; });
      b.unshift({ start, end, alerts, byType });
    }
    return b;
  }, [history, now]);

  const maxCount = Math.max(...buckets.map(b => b.alerts.length), 1);

  const escalating = useMemo(() => {
    const recent = buckets.slice(-12);
    let increasing = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].alerts.length > recent[i - 1].alerts.length) increasing++;
    }
    return increasing >= 3;
  }, [buckets]);

  const selectedAlerts = selectedBucket !== null ? buckets[selectedBucket]?.alerts || [] : [];
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const THREAT_COLORS: Record<string, string> = {
    rockets: 'bg-red-500',
    missiles: 'bg-orange-500',
    uav_intrusion: 'bg-yellow-500',
    hostile_aircraft_intrusion: 'bg-purple-500',
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 text-red-400/40 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-2" data-testid="alert-history-timeline">
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-red-400/60" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('24h Timeline', '\u062C\u062F\u0648\u0644 24 \u0633\u0627\u0639\u0629')}</span>
        {escalating && (
          <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-400 animate-pulse" data-testid="badge-escalating">
            {t('ESCALATING', '\u062A\u0635\u0627\u0639\u062F')}
          </span>
        )}
      </div>
      <div className="flex items-end gap-px h-14 bg-muted/20 rounded border border-border p-1 overflow-x-auto" data-testid="timeline-bars">
        {buckets.map((b, i) => {
          const isCluster = b.alerts.length >= 5;
          const isSelected = selectedBucket === i;
          return (
            <button
              key={i}
              className={`flex-shrink-0 w-1.5 flex flex-col items-stretch justify-end rounded-sm transition-all cursor-pointer hover:opacity-100 ${isSelected ? 'ring-1 ring-primary' : ''} ${isCluster ? 'ring-1 ring-red-500/50' : ''}`}
              style={{ height: '100%', opacity: b.alerts.length > 0 ? 1 : 0.3 }}
              onClick={() => setSelectedBucket(isSelected ? null : i)}
              title={`${new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${b.alerts.length} alerts`}
              data-testid={`timeline-bucket-${i}`}
            >
              {Object.entries(b.byType).map(([type, count]) => (
                <div
                  key={type}
                  className={`w-full rounded-sm ${THREAT_COLORS[type] || 'bg-red-500'} opacity-70`}
                  style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
                />
              ))}
              {b.alerts.length === 0 && <div className="w-full h-[2px] bg-white/10 rounded-sm" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[9px] font-mono text-foreground/30">
        <span>{t('24h ago', '\u0642\u0628\u0644 24 \u0633\u0627\u0639\u0629')}</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span>{t('Now', '\u0627\u0644\u0622\u0646')}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(THREAT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${color}`} />
            <span className="text-[9px] font-mono text-foreground/40 uppercase">{type.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
      {selectedBucket !== null && selectedAlerts.length > 0 && (
        <div className="border border-border rounded bg-muted/20 p-2 space-y-1 max-h-32 overflow-y-auto" data-testid="timeline-detail">
          <span className="text-[9px] font-mono text-foreground/40">{new Date(buckets[selectedBucket].start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {selectedAlerts.length} {t('alerts', '\u0625\u0646\u0630\u0627\u0631\u0627\u062A')}</span>
          {selectedAlerts.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${a.resolved ? 'bg-emerald-500/50' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[10px] font-mono text-foreground/70">{a.city}</span>
              <span className="text-[9px] font-mono text-foreground/30 uppercase">{a.threatType.replace(/_/g, ' ')}</span>
              <span className="text-[9px] font-mono text-foreground/20 ml-auto">{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
