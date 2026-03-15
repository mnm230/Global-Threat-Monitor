import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Globe, AlertTriangle, Flame, Shield, MapPin, Clock, Loader2,
  ChevronRight, Target, Zap, Radio,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader, PanelMinimizeButton, PanelMaximizeButton } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';

const REGION_META: Record<string, { label: string; labelAr: string; flag: string; color: string }> = {
  all:     { label: 'All',     labelAr: 'الكل',       flag: '🌍', color: '#94a3b8' },
  lebanon: { label: 'Lebanon', labelAr: 'لبنان',      flag: '🇱🇧', color: '#10b981' },
  yemen:   { label: 'Yemen',   labelAr: 'اليمن',      flag: '🇾🇪', color: '#f43f5e' },
  iran:    { label: 'Iran',    labelAr: 'إيران',      flag: '🇮🇷', color: '#a855f7' },
  iraq:    { label: 'Iraq',    labelAr: 'العراق',     flag: '🇮🇶', color: '#f97316' },
  syria:   { label: 'Syria',   labelAr: 'سوريا',      flag: '🇸🇾', color: '#eab308' },
  gcc:     { label: 'GCC',     labelAr: 'الخليج',     flag: '🛢️', color: '#f59e0b' },
  egypt:   { label: 'Egypt',   labelAr: 'مصر',        flag: '🇪🇬', color: '#22d3ee' },
  jordan:  { label: 'Jordan',  labelAr: 'الأردن',     flag: '🇯🇴', color: '#06b6d4' },
};

const THREAT_LEVEL_META: Record<string, { dot: string; label: string }> = {
  high:   { dot: '#ef4444', label: 'HIGH' },
  medium: { dot: '#f59e0b', label: 'MED'  },
  low:    { dot: '#6b7280', label: 'LOW'  },
};

const ATTACK_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  drone:     { icon: '🛸', label: 'Drone/UAV',  color: '#a855f7' },
  missile:   { icon: '🚀', label: 'Missile',    color: '#ef4444' },
  rocket:    { icon: '💥', label: 'Rocket',     color: '#f97316' },
  airstrike: { icon: '✈️', label: 'Airstrike',  color: '#3b82f6' },
  naval:     { icon: '⚓', label: 'Naval',      color: '#0ea5e9' },
  artillery: { icon: '💣', label: 'Artillery',  color: '#d97706' },
  other:     { icon: '⚠️', label: 'Attack',     color: '#94a3b8' },
};

interface RegionalFeedItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  timestamp: string;
  attackType: string;
  relevance: string;
  threatLevel?: 'high' | 'medium' | 'low';
  isSiren?: boolean;
}

export function RegionalAttacksPanel({ language, onClose, onMaximize, isMaximized }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [items, setItems] = useState<RegionalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/live-conflict-feed');
      if (!res.ok) throw new Error('fetch failed');
      const data: RegionalFeedItem[] = await res.json();
      setItems(data);
      setLastUpdate(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const filtered = useMemo(() => {
    const base = regionFilter === 'all' ? items : items.filter(item => item.relevance === regionFilter || item.relevance === 'both');
    // siren items always float to the top
    return [...base].sort((a, b) => (b.isSiren ? 1 : 0) - (a.isSiren ? 1 : 0));
  }, [items, regionFilter]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach(item => {
      const r = item.relevance;
      if (r && r !== 'general') {
        counts[r] = (counts[r] || 0) + 1;
        if (r === 'both') {
          counts['lebanon'] = (counts['lebanon'] || 0) + 1;
          counts['gcc'] = (counts['gcc'] || 0) + 1;
        }
      }
    });
    return counts;
  }, [items]);

  const fmtAge = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="regional-attacks-panel">
      {/* Header */}
      <div className="shrink-0 panel-drag-handle cursor-grab active:cursor-grabbing select-none px-3 py-2"
        style={{ borderBottom: '1px solid rgba(16,185,129,0.18)', background: 'linear-gradient(180deg, rgba(6,78,59,0.18) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-25" />
          </div>
          <Globe className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
          <span className="text-[13px] font-black uppercase tracking-[0.12em] font-mono text-emerald-400">
            {t('REGIONAL ATTACKS', 'هجمات إقليمية')}
          </span>
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[12px] font-black text-white px-1.5 py-px rounded-sm font-mono"
              style={{ background: items.length > 0 ? '#059669' : 'rgba(255,255,255,0.06)', boxShadow: items.length > 0 ? '0 0 8px rgba(16,185,129,0.3)' : 'none' }}>
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {lastUpdate && (
              <span className="text-[9px] font-mono text-foreground/25">{fmtAge(lastUpdate.toISOString())} ago</span>
            )}
            {loading && <Loader2 className="w-3 h-3 text-emerald-500/40 animate-spin" />}
            {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
            {onClose && <PanelMinimizeButton onMinimize={onClose} />}
          </div>
        </div>
      </div>

      {/* Region filter tabs */}
      <div className="shrink-0 flex overflow-x-auto gap-px px-2 py-1.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.12)', scrollbarWidth: 'none' }}>
        {Object.entries(REGION_META).map(([key, meta]) => {
          const count = regionCounts[key] || 0;
          if (key !== 'all' && count === 0) return null;
          const isActive = regionFilter === key;
          return (
            <button key={key} onClick={() => setRegionFilter(key)}
              className="shrink-0 font-bold font-mono text-[10px] px-2 py-1 rounded-sm transition-all"
              style={{
                background: isActive ? meta.color + '22' : 'transparent',
                border: `1px solid ${isActive ? meta.color + '66' : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? meta.color : 'rgba(255,255,255,0.30)',
              }}
            >{meta.flag} {language === 'ar' ? meta.labelAr : meta.label}{key !== 'all' ? ` ${count}` : ''}</button>
          );
        })}
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-1.5 flex flex-col gap-1">
          {loading && !items.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 text-emerald-500/40 animate-spin" />
              <span className="text-[11px] font-mono text-foreground/30">{t('Loading regional data...', 'جاري التحميل...')}</span>
            </div>
          ) : error && !items.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500/40" />
              <span className="text-[11px] font-mono text-foreground/30">{t('Data unavailable', 'البيانات غير متاحة')}</span>
              <button onClick={fetchData} className="text-[10px] font-mono text-emerald-500/60 hover:text-emerald-400 transition-colors">retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Globe className="w-6 h-6 text-foreground/15" />
              <span className="text-[11px] font-mono text-foreground/25">{t('No recent incidents', 'لا توجد حوادث حديثة')}</span>
            </div>
          ) : (
            filtered.map(item => {
              const atMeta  = ATTACK_TYPE_META[item.attackType] || ATTACK_TYPE_META.other;
              const regMeta = REGION_META[item.relevance === 'both' ? 'gcc' : item.relevance] || REGION_META.all;
              const isSiren = !!item.isSiren;
              const tlMeta  = !isSiren ? (THREAT_LEVEL_META[item.threatLevel || 'low'] || THREAT_LEVEL_META.low) : null;
              const isHigh  = !isSiren && item.threatLevel === 'high';
              return (
                <div key={item.id}
                  className="rounded-sm px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                  style={isSiren ? {
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.28)',
                    boxShadow: '0 0 8px rgba(239,68,68,0.10)',
                  } : isHigh ? {
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.15)',
                  } : {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 text-[12px] mt-px">{isSiren ? '🚨' : atMeta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        {isSiren && (
                          <span className="text-[9px] font-black font-mono px-1.5 py-px rounded-sm animate-pulse"
                            style={{ background: 'rgba(239,68,68,0.20)', color: '#f87171', border: '1px solid rgba(239,68,68,0.45)', letterSpacing: '0.08em' }}>
                            🚨 {language === 'ar' ? 'صفارة حية' : 'LIVE SIREN'}
                          </span>
                        )}
                        <span className="text-[9px] font-bold font-mono px-1 py-px rounded-sm"
                          style={{ background: regMeta.color + '22', color: regMeta.color, border: `1px solid ${regMeta.color}44` }}>
                          {regMeta.flag} {language === 'ar' ? regMeta.labelAr : regMeta.label}
                        </span>
                        {!isSiren && (
                          <span className="text-[9px] font-mono px-1 py-px rounded-sm"
                            style={{ background: atMeta.color + '18', color: atMeta.color + 'cc', border: `1px solid ${atMeta.color}33` }}>
                            {atMeta.label}
                          </span>
                        )}
                        {item.relevance === 'both' && (
                          <span className="text-[9px] font-mono px-1 py-px rounded-sm"
                            style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                            🛢️ {language === 'ar' ? 'الخليج' : 'GCC'}
                          </span>
                        )}
                        {tlMeta && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono px-1 py-px rounded-sm"
                            style={{ background: tlMeta.dot + '15', color: tlMeta.dot, border: `1px solid ${tlMeta.dot}33` }}>
                            <span className="inline-block w-1 h-1 rounded-full" style={{ background: tlMeta.dot }} />
                            {tlMeta.label}
                          </span>
                        )}
                      </div>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className={`text-[11px] font-medium leading-snug block transition-colors hover:text-foreground ${isSiren ? 'text-red-300/90' : isHigh ? 'text-foreground/85' : 'text-foreground/70'}`}>
                          {item.title}
                        </a>
                      ) : (
                        <p className={`text-[11px] font-medium leading-snug ${isSiren ? 'text-red-300/90' : isHigh ? 'text-foreground/85' : 'text-foreground/70'}`}>{item.title}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-mono text-foreground/30">{item.source}</span>
                        <span className="text-[9px] text-foreground/20">·</span>
                        <span className="text-[9px] font-mono text-foreground/25">{fmtAge(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
