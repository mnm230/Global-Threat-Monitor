import { useState, useEffect, useMemo, useRef, memo, useContext } from 'react';
import {
  AlertOctagon, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Clock, History, MapPin, Shield, Siren, Target, Zap, Radio, Search, X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader, PanelMinimizeButton, PanelMaximizeButton, FreshnessBadge, FeedFreshnessContext } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';
import type { RedAlert, SirenAlert } from '@shared/schema';
import { useIsMobile } from '@/hooks/use-mobile';

const THREAT_ICONS: Record<string, string> = {
  rockets: '🚀', missiles: '⚡', hostile_aircraft_intrusion: '✈️', uav_intrusion: '🛸',
};
const THREAT_SHORT_CODE: Record<string, string> = {
  rockets: 'RKT', missiles: 'MSL', hostile_aircraft_intrusion: 'ACF', uav_intrusion: 'UAV',
};
const ALERT_THREAT_META: Record<string, { label: string; icon: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  rockets:                    { label: 'Rockets',  icon: '🚀', dotColor: '#ef4444', textColor: 'text-red-300',    bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
  missiles:                   { label: 'Missiles', icon: '🎯', dotColor: '#f97316', textColor: 'text-orange-300', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  hostile_aircraft_intrusion: { label: 'Aircraft', icon: '✈',  dotColor: '#a855f7', textColor: 'text-purple-300', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30' },
  uav_intrusion:              { label: 'UAV',      icon: '🔺', dotColor: '#22d3ee', textColor: 'text-cyan-300',   bgColor: 'bg-cyan-500/15',   borderColor: 'border-cyan-500/30' },
};
const THREAT_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  rocket: { en: 'ROCKET FIRE', ar: 'إطلاق صواريخ', icon: '🚀' },
  missile: { en: 'MISSILE LAUNCH', ar: 'إطلاق صاروخ', icon: '💥' },
  uav: { en: 'HOSTILE UAV', ar: 'طائرة مسيرة معادية', icon: '✈️' },
  hostile_aircraft: { en: 'HOSTILE AIRCRAFT', ar: 'طائرة معادية', icon: '⚠️' },
};

export function getAlertUrgencyTier(remaining: number, countdown: number): 'critical' | 'urgent' | 'warning' | 'standard' | 'expired' {
  if (countdown === 0) return 'critical';
  if (remaining <= 0) return 'expired';
  if (remaining <= 15) return 'critical';
  if (remaining <= 45) return 'urgent';
  if (remaining <= 90) return 'warning';
  return 'standard';
}

function useAlertRemaining(alert: RedAlert) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
      return Math.max(0, alert.countdown - elapsed);
    };
    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [alert.timestamp, alert.countdown]);
  return remaining;
}

function RedAlertCountdown({ alert, mobile }: { alert: RedAlert; mobile?: boolean }) {
  const remaining = useAlertRemaining(alert);
  const isImmediate = alert.countdown === 0;
  const tier = getAlertUrgencyTier(remaining, alert.countdown);

  const tierBg: Record<string, string> = {
    critical: '#dc2626',
    urgent:   '#b91c1c',
    warning:  '#991b1b',
    standard: '#3f0a0a',
    expired:  'transparent',
  };
  const tierBorder: Record<string, string> = {
    critical: 'rgba(248,113,113,0.5)',
    urgent:   'rgba(239,68,68,0.4)',
    warning:  'rgba(220,38,38,0.35)',
    standard: 'rgba(239,68,68,0.18)',
    expired:  'rgba(239,68,68,0.08)',
  };
  const tierGlow: Record<string, string> = {
    critical: '0 0 22px rgba(220,38,38,0.55), 0 2px 10px rgba(0,0,0,0.5)',
    urgent:   '0 0 12px rgba(185,28,28,0.35), 0 2px 8px rgba(0,0,0,0.4)',
    warning:  '0 1px 6px rgba(0,0,0,0.35)',
    standard: '0 1px 4px rgba(0,0,0,0.3)',
    expired:  'none',
  };
  const tierText: Record<string, string> = {
    critical: '#fff',
    urgent:   '#fecaca',
    warning:  '#fca5a5',
    standard: 'rgba(252,165,165,0.65)',
    expired:  'rgba(239,68,68,0.22)',
  };

  const isCritical = tier === 'critical';
  const pct = isImmediate ? 100 : alert.countdown > 0 ? Math.round(Math.max(0, (remaining / alert.countdown)) * 100) : 0;

  if (mobile) {
    const numSize = isCritical ? 26 : tier === 'expired' ? 17 : 22;
    return (
      <div
        className={isCritical ? 'eas-countdown-pulse' : ''}
        style={{
          minWidth: 64, height: 64, borderRadius: 3, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, padding: '6px 4px',
          background: tier === 'expired' ? 'rgba(255,255,255,0.025)' : tierBg[tier],
          color: tierText[tier],
          border: `1.5px solid ${tierBorder[tier]}`,
          boxShadow: tierGlow[tier],
        }}
        data-testid={`red-alert-countdown-${alert.id}`}
      >
        <div style={{ fontSize: numSize, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
        </div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800, opacity: isCritical ? 0.95 : 0.55 }}>
          {isImmediate ? 'IMM' : remaining > 0 ? 'SEC' : 'EXP'}
        </div>
        {!isImmediate && tier !== 'expired' && (
          <div style={{ width: '80%', height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginTop: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'rgba(255,255,255,0.7)', transition: 'width 1s linear' }} />
          </div>
        )}
      </div>
    );
  }

  const numSize = isCritical ? 24 : 21;
  return (
    <div
      className={isCritical ? 'eas-countdown-pulse' : ''}
      style={{
        minWidth: 56, borderRadius: 3, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
        background: tierBg[tier],
        color: tierText[tier],
        border: `1.5px solid ${tierBorder[tier]}`,
        boxShadow: isCritical ? '0 0 12px rgba(220,38,38,0.45)' : 'none',
      }}
      data-testid={`red-alert-countdown-${alert.id}`}
    >
      <div style={{ fontSize: numSize, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {isImmediate ? 'NOW' : remaining > 0 ? `${remaining}` : '--'}
      </div>
      <div style={{ fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, opacity: 0.75 }}>
        {isImmediate ? 'IMM' : remaining > 0 ? 'SEC' : 'EXP'}
      </div>
    </div>
  );
}

export const RedAlertPanel = memo(function RedAlertPanel({ alerts, sirens = [], language, onClose, onMaximize, isMaximized, onShowHistory }: { alerts: RedAlert[]; sirens?: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; onShowHistory?: () => void }) {
  const freshness = useContext(FeedFreshnessContext);
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [threatFilter, setThreatFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const alertScrollRef = useRef<HTMLDivElement>(null);
  const prevAlertCountRef = useRef(alerts.length);
  const [_, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current) {
      const viewport = alertScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (viewport) viewport.scrollTop = 0;
    }
    prevAlertCountRef.current = alerts.length;
  }, [alerts.length]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { const c = a.country || 'Unknown'; counts[c] = (counts[c] || 0) + 1; });
    return counts;
  }, [alerts]);

  const countryOrder = ['Israel', 'Lebanon', 'Iran', 'Syria', 'Iraq', 'Saudi Arabia', 'Yemen', 'UAE', 'Jordan', 'Kuwait', 'Bahrain', 'Qatar'];

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (threatFilter !== 'all') filtered = filtered.filter(a => a.threatType === threatFilter);
    if (countryFilter !== 'ALL') filtered = filtered.filter(a => a.country === countryFilter);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a => a.city.toLowerCase().includes(q) || a.cityHe.includes(q) || a.cityAr.includes(q) || a.region.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
  }, [alerts, searchQuery, countryFilter, threatFilter]);

  const triageSorted = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const nowMs = Date.now();
      const remA = a.countdown === 0 ? -1 : Math.max(0, a.countdown - Math.floor((nowMs - new Date(a.timestamp).getTime()) / 1000));
      const remB = b.countdown === 0 ? -1 : Math.max(0, b.countdown - Math.floor((nowMs - new Date(b.timestamp).getTime()) / 1000));
      if (remA === -1 && remB !== -1) return -1;
      if (remB === -1 && remA !== -1) return 1;
      if (remA === -1 && remB === -1) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      const activeA = remA > 0 ? 1 : 0;
      const activeB = remB > 0 ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;
      return remA - remB;
    });
  }, [filteredAlerts, _]);

  const liveCount = alerts.filter(a => a.source === 'live').length;
  const activeCount = useMemo(() => alerts.filter(a => {
    const elapsed = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 1000);
    return a.countdown === 0 || elapsed < a.countdown;
  }).length, [alerts, _]);
  const hasActiveAlerts = alerts.length > 0;

  const FLAG_MAP: Record<string, string> = { Israel: '🇮🇱', Lebanon: '🇱🇧', Iran: '🇮🇷', Syria: '🇸🇾', Iraq: '🇮🇶', 'Saudi Arabia': '🇸🇦', Yemen: '🇾🇪', UAE: '🇦🇪', Jordan: '🇯🇴', Kuwait: '🇰🇼', Bahrain: '🇧🇭', Qatar: '🇶🇦' };
  const SHORT_NAMES: Record<string, string> = { 'Saudi Arabia': 'KSA', 'United Arab Emirates': 'UAE' };
  const ACCENT: Record<string, string> = { Israel: '#3b82f6', Lebanon: '#10b981', Iran: '#a855f7', Syria: '#eab308', Iraq: '#f97316', 'Saudi Arabia': '#22c55e', Yemen: '#f43f5e', UAE: '#0ea5e9', Jordan: '#f59e0b', Kuwait: '#14b8a6', Bahrain: '#ec4899', Qatar: '#6366f1' };

  const threatCounts = useMemo(() => {
    const c: Record<string, number> = {};
    alerts.forEach(a => { c[a.threatType] = (c[a.threatType] || 0) + 1; });
    return c;
  }, [alerts]);

  return (
    <div className="h-full flex flex-col min-h-0 ra-panel-bg" data-testid="red-alert-panel">

      {/* ── HEADER — compact mission-control bar ── */}
      <div
        className={`shrink-0 select-none ${isMobile ? 'px-4 py-2.5' : 'panel-drag-handle cursor-grab active:cursor-grabbing'}`}
        style={{
          borderBottom: `1px solid ${hasActiveAlerts ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
          background: hasActiveAlerts ? 'linear-gradient(180deg, rgba(127,29,29,0.18) 0%, transparent 100%)' : 'hsl(var(--muted))',
        }}
      >
        <div className={`flex items-center gap-2 ${isMobile ? '' : 'px-3 py-2'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative shrink-0" style={{ width: 10, height: 10 }}>
              <div className={`w-2.5 h-2.5 rounded-full ${hasActiveAlerts ? 'bg-red-500 eas-flash' : 'bg-red-900/40'}`} />
              {hasActiveAlerts && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-30" />}
            </div>
            <span className={`${isMobile ? 'text-[17px]' : 'text-[15px]'} font-black uppercase tracking-[0.15em] ra-font-mono ${hasActiveAlerts ? 'text-red-400' : 'text-red-500/25'}`}>
              {language === 'ar' ? '🇮🇱 تحذيرات إسرائيل' : '🇮🇱 IL ALERTS'}
            </span>
            {hasActiveAlerts && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black text-white ra-tabular ra-font-mono rounded-sm leading-none ${isMobile ? 'text-[18px] px-2.5 py-1' : 'text-[16px] px-2 py-0.5'}`}
                  style={{ background: '#dc2626', boxShadow: '0 0 10px rgba(220,38,38,0.4)' }}
                  data-testid="text-alert-count"
                >{activeCount}</span>
                {liveCount > 0 && (
                  <span className={`${isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1.5 py-px'} font-black ra-font-mono uppercase tracking-wider rounded-sm`} style={{ background: 'rgba(21,128,61,0.3)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', height: 18, display: 'inline-flex', alignItems: 'center' }}>LIVE</span>
                )}
              </div>
            )}
            {hasActiveAlerts && !isMobile && (
              <div className="flex items-center gap-1.5 ml-auto overflow-hidden">
                {Object.entries(threatCounts).slice(0, 4).map(([type, count]) => (
                  <span key={type} className="text-[10px] ra-font-mono font-bold text-white/25 shrink-0" style={{ height: 18, display: 'inline-flex', alignItems: 'center' }}>
                    {THREAT_ICONS[type] || '🚀'}{count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMobile && hasActiveAlerts && (
              <button onClick={() => setShowSearch(p => !p)}
                className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all active:scale-95 ${showSearch ? 'text-red-300' : 'text-white/30'}`}
                style={{ background: showSearch ? 'rgba(220,38,38,0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)' }}
                aria-label="Search"
              ><Search className="w-3.5 h-3.5" /></button>
            )}
            {onShowHistory && (
              <button onClick={onShowHistory} className={`${isMobile ? 'w-8 h-8' : 'w-6 h-6'} rounded-sm flex items-center justify-center text-foreground/30 transition-all active:scale-95`} style={{ border: '1px solid rgba(255,255,255,0.06)' }} title="Alert History" data-testid="button-alert-history">
                <History className={`${isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
              </button>
            )}
            <FreshnessBadge lastUpdate={freshness['alerts']} />
            {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
            {onClose && <PanelMinimizeButton onMinimize={onClose} />}
          </div>
        </div>
      </div>

      {/* ── FILTERS — segmented tabs ── */}
      {hasActiveAlerts && isMobile ? (
        <div className="shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
          {showSearch && (
            <div className="relative px-3 pt-2 pb-1.5">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن مدينة...' : 'Search city, region...'}
                className="ra-search-input" autoFocus data-testid="input-red-alert-search"
                style={{ fontSize: 14, padding: '8px 10px 8px 34px', borderRadius: 6 }} />
              <Search className="absolute w-3.5 h-3.5 text-red-500/30" style={{ left: 20, top: '50%', transform: 'translateY(-50%)' }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute w-5 h-5 flex items-center justify-center rounded text-white/30" style={{ top: '50%', right: 16, transform: 'translateY(-50%)' }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex overflow-x-auto px-3 py-1.5 gap-px" style={{ scrollbarWidth: 'none' }}>
            {([['all','ALL'],['rockets','RKT'],['missiles','MSL'],['uav_intrusion','UAV'],['hostile_aircraft_intrusion','ACFT']] as [string,string][]).map(([key, label]) => {
              const isActive = threatFilter === key;
              return (
                <button key={key} onClick={() => setThreatFilter(key)}
                  className="shrink-0 font-bold ra-font-mono transition-all active:scale-95"
                  style={{ fontSize: 11, padding: '4px 10px', letterSpacing: '0.1em',
                    background: isActive ? 'rgba(220,38,38,0.25)' : 'transparent',
                    borderBottom: isActive ? '2px solid #ef4444' : '2px solid transparent',
                    color: isActive ? '#fca5a5' : 'rgba(255,255,255,0.25)', }}
                  data-testid={`button-threat-filter-${key}`}
                >{key !== 'all' ? (THREAT_ICONS[key] || '') + ' ' : ''}{label}</button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 px-3 pb-2">
            <span className="text-[9px] ra-font-mono font-bold text-red-500/40 uppercase tracking-widest">🇮🇱 Israel Only</span>
          </div>
        </div>
      ) : hasActiveAlerts ? (
        <div className="shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.12)' }}>
          <div className="flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {([['all','ALL'],['rockets','RKT'],['missiles','MSL'],['uav_intrusion','UAV'],['hostile_aircraft_intrusion','ACFT']] as [string,string][]).map(([key, label]) => (
              <button key={key} onClick={() => setThreatFilter(key)}
                className="flex-1 ra-font-mono font-bold transition-colors"
                style={{ fontSize: 11, padding: '6px 0', letterSpacing: '0.12em',
                  borderBottom: threatFilter === key ? '2px solid #ef4444' : '2px solid transparent',
                  color: threatFilter === key ? '#fca5a5' : 'rgba(255,255,255,0.22)',
                  background: threatFilter === key ? 'rgba(220,38,38,0.08)' : 'transparent', }}
                data-testid={`button-threat-filter-${key}`}
              >{label}</button>
            ))}
            <button onClick={() => setShowSearch(p => !p)}
              className={`shrink-0 w-7 h-7 rounded-sm flex items-center justify-center transition-all ${showSearch ? 'text-red-300' : 'text-white/20'}`}
              style={{ background: showSearch ? 'rgba(220,38,38,0.12)' : 'transparent', marginRight: 4 }}
              aria-label="Search" data-testid="button-search-toggle"
            ><Search className="w-3 h-3" /></button>
          </div>
          {showSearch && (
            <div className="px-2.5 py-1.5">
              <div className="relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
                  className="ra-search-input" data-testid="input-red-alert-search" autoFocus />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-red-500/25" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute w-4 h-4 flex items-center justify-center rounded text-white/30" style={{ top: '50%', right: 6, transform: 'translateY(-50%)' }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="text-[9px] ra-font-mono font-bold text-red-500/40 uppercase tracking-widest">🇮🇱 Israel Red Alerts Only</span>
          </div>
        </div>
      ) : null}

      {/* ── EMPTY STATE ── */}
      {!hasActiveAlerts && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className={`${isMobile ? 'w-16 h-16 mb-4' : 'w-10 h-10 mb-2.5'} rounded-md flex items-center justify-center`} style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Shield className={`${isMobile ? 'w-7 h-7' : 'w-5 h-5'} text-green-600/60`} />
          </div>
          <p className={`${isMobile ? 'text-[20px]' : 'text-[15px]'} font-black text-green-500/70 mb-1 tracking-[0.15em] ra-font-mono uppercase`}>
            {language === 'ar' ? 'لا تنبيهات' : 'ALL CLEAR'}
          </p>
          <p className={`${isMobile ? 'text-[12px]' : 'text-[11px]'} text-white/20 tracking-wider uppercase ra-font-mono`}>
            {language === 'ar' ? 'لا تهديدات نشطة' : 'No active threats'}
          </p>
        </div>
      )}

      {/* ── TRIAGE LIST — data-strip layout ── */}
      {hasActiveAlerts && (
        <ScrollArea ref={alertScrollRef} className="flex-1 min-h-0">
          <div className={isMobile ? 'px-2 pt-1.5 pb-1 flex flex-col gap-1.5' : ''}>
            {triageSorted.map(alert => {
              const nowMs = Date.now();
              const elapsed = Math.floor((nowMs - new Date(alert.timestamp).getTime()) / 1000);
              const remaining = alert.countdown === 0 ? -1 : Math.max(0, alert.countdown - elapsed);
              const isImmediate = alert.countdown === 0;
              const isExpired = !isImmediate && remaining <= 0;
              const isCritical = isImmediate || (remaining > 0 && remaining <= 15);
              const isLive = alert.source === 'live';
              const ageMs = nowMs - new Date(alert.timestamp).getTime();
              const isIncoming = ageMs < 9000 && !isExpired;
              const threatIcon = THREAT_ICONS[alert.threatType] || '🚀';
              const threatCode = THREAT_SHORT_CODE[alert.threatType] || 'RKT';

              if (isMobile) {
                return (
                  <div key={alert.id} className="alert-slide-in relative rounded-md overflow-hidden"
                    style={{
                      background: isCritical && !isExpired ? 'rgba(127,29,29,0.35)' : isExpired ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                      border: isCritical && !isExpired ? '1px solid rgba(239,68,68,0.30)' : isExpired ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(255,255,255,0.05)',
                      opacity: isExpired ? 0.35 : 1,
                    }}
                    data-testid={`red-alert-${alert.id}`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
                      background: isCritical && !isExpired ? '#ef4444' : !isExpired && remaining > 0 ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.04)',
                    }} />
                    <div className="flex items-center gap-2.5 py-2.5 pr-3" style={{ paddingLeft: 12 }}>
                      <RedAlertCountdown alert={alert} mobile />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isIncoming && (
                            <span className="eas-flash shrink-0 font-black text-[8px] px-1.5 py-px rounded-sm ra-font-mono" style={{ background: '#b91c1c', color: '#fecaca', letterSpacing: '0.12em' }}>INCOMING</span>
                          )}
                          <span className={`font-extrabold truncate leading-tight ${isExpired ? 'text-white/20' : isCritical ? 'text-[15px] text-white' : 'text-[14px] text-white/85'}`}>
                            {language === 'ar' ? alert.cityAr : alert.city}
                          </span>
                          <span className="text-[12px] shrink-0 opacity-50">{FLAG_MAP[alert.country]}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] ra-font-mono font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
                            {threatIcon} {threatCode}
                          </span>
                          <span className="text-[9px] ra-font-mono truncate" style={{ color: 'rgba(255,255,255,0.15)' }}>
                            {language === 'ar' ? alert.regionAr : alert.region}
                          </span>
                          <span className="ml-auto flex items-center gap-1 shrink-0">
                            {isLive && <span className="text-[7px] font-bold px-1 py-px rounded-sm ra-font-mono" style={{ background: 'rgba(21,128,61,0.2)', color: '#4ade80' }} data-testid={`source-badge-${alert.id}`}>LIVE</span>}
                            {alert.sourceChannel && (
                              <a href={alert.sourceUrl || `https://t.me/s/${alert.sourceChannel.replace(/^@/, '')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-[8px] font-bold px-1 py-px rounded-sm"
                                style={{ background: '#0088cc12', color: '#29b6f6', textDecoration: 'none' }}
                                onClick={(e) => e.stopPropagation()} data-testid={`tg-source-${alert.id}`}
                              >TG</a>
                            )}
                            <span className="text-[8px] ra-font-mono text-white/15">{timeAgo(alert.timestamp)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={alert.id} className="alert-slide-in flex items-center gap-2 group"
                  style={{
                    padding: '5px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: isCritical && !isExpired ? 'rgba(127,29,29,0.15)' : 'transparent',
                    opacity: isExpired ? 0.30 : 1,
                    transition: 'background 0.15s',
                  }}
                  data-testid={`red-alert-${alert.id}`}
                >
                  <div className="shrink-0 self-stretch" style={{ width: 3, background: isCritical && !isExpired ? '#ef4444' : !isExpired && remaining > 0 ? 'rgba(249,115,22,0.4)' : 'transparent', borderRadius: '0 1px 1px 0' }} />
                  <RedAlertCountdown alert={alert} />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-px">
                        {isIncoming && <span className="eas-flash text-[9px] font-black ra-font-mono px-1.5 py-px rounded-sm shrink-0" style={{ background: '#dc2626', color: '#fecaca', letterSpacing: '0.1em' }}>IN</span>}
                        <span className={`font-bold truncate text-[14px] leading-tight ${isExpired ? 'text-white/20' : 'text-white/90'}`}>
                          {language === 'ar' ? alert.cityAr : alert.city}
                        </span>
                        <span className="text-[12px] shrink-0 opacity-35">{FLAG_MAP[alert.country]}</span>
                      </div>
                      <div className="flex items-center gap-1" style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        <span>{language === 'ar' ? alert.regionAr : alert.region}</span>
                      </div>
                    </div>
                    <span className="text-[10px] ra-font-mono font-bold shrink-0 px-1.5 rounded-sm" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height: 18, display: 'inline-flex', alignItems: 'center' }}>
                      {threatIcon} {threatCode}
                    </span>
                    {isLive && <span className="text-[9px] font-bold px-1.5 rounded-sm ra-font-mono shrink-0" style={{ background: 'rgba(21,128,61,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)', height: 18, display: 'inline-flex', alignItems: 'center' }} data-testid={`source-badge-${alert.id}`}>LIVE</span>}
                    {alert.sourceChannel && (
                      <a href={alert.sourceUrl || `https://t.me/s/${alert.sourceChannel.replace(/^@/, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[9px] font-bold px-1.5 rounded-sm shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: '#0088cc12', color: '#29b6f6', textDecoration: 'none', border: '1px solid rgba(59,130,246,0.15)', height: 18, display: 'inline-flex' }}
                        onClick={(e) => e.stopPropagation()} data-testid={`tg-source-${alert.id}`}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.636l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.923z" /></svg>
                        TG
                      </a>
                    )}
                    <span className="text-[9px] ra-font-mono text-white/15 shrink-0 tabular-nums">{timeAgo(alert.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* ── SIRENS FOOTER ── */}
      {sirens.length > 0 && (() => {
        const THREAT_ACCENT: Record<string, string> = { rocket: '#ef4444', missile: '#a855f7', uav: '#f59e0b', hostile_aircraft: '#3b82f6' };
        const THREAT_ICON: Record<string, string> = { rocket: '🚀', missile: '⚡', uav: '🛸', hostile_aircraft: '✈️' };
        const regionMap: Record<string, number> = {};
        sirens.forEach(s => {
          const r = language === 'ar' ? (s.regionAr || s.region) : s.region;
          regionMap[r] = (regionMap[r] || 0) + 1;
        });
        const regionCount = Object.keys(regionMap).length;
        return (
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(239,68,68,0.35)', background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(0,0,0,0.4) 100%)' }}>
          <div className={`${isMobile ? 'px-4 py-2' : 'px-3 py-1.5'} flex items-center gap-2`}>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-red-500 eas-flash`} />
                <div className={`absolute inset-0 ${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-red-500 animate-ping opacity-40`} />
              </div>
              <span className={`${isMobile ? 'text-[13px]' : 'text-[12px]'} font-black uppercase tracking-[0.15em] text-red-400/80 ra-font-mono`}>
                {language === 'ar' ? 'صفارات' : 'SIRENS'}
              </span>
            </div>
            <div className={`${isMobile ? 'text-[14px] min-w-[28px]' : 'text-[13px] min-w-[24px]'} font-black text-white text-center ra-tabular ra-font-mono leading-none py-0.5 rounded-sm`} style={{ background: 'rgba(239,68,68,0.5)', border: '1px solid rgba(239,68,68,0.35)' }}>{sirens.length}</div>
            <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-red-400/40 ra-font-mono font-bold`}>{regionCount} {language === 'ar' ? 'مناطق' : regionCount === 1 ? 'region' : 'regions'}</span>
            <div className="flex-1" />
            <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-red-400/30 ra-font-mono font-bold tracking-[0.2em] uppercase`}>OREF LIVE</span>
          </div>
          <div className={isMobile ? 'max-h-[220px]' : 'max-h-[200px]'} style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1.5 px-3 pb-2' : 'gap-1 px-2 pb-1.5'}`}>
            {sirens.map(s => {
              const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
              const accent = THREAT_ACCENT[s.threatType] || '#ef4444';
              const icon = THREAT_ICON[s.threatType] || '🚀';
              const elapsed = Math.floor((Date.now() - new Date(s.timestamp).getTime()) / 1000);
              const remaining = s.countdown > 0 ? Math.max(0, s.countdown - elapsed) : 0;
              const isCritical = remaining > 0 && remaining <= 30;
              return (
                <div key={s.id} className="flex items-center rounded-sm overflow-hidden" data-testid={`siren-panel-${s.id}`}
                  style={{
                    background: isCritical ? `${accent}0c` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCritical ? `${accent}35` : `${accent}22`}`,
                    height: isMobile ? '32px' : '28px',
                  }}>
                  <div className="self-stretch shrink-0" style={{ width: '3px', background: accent }} />
                  <span className={`${isMobile ? 'text-[12px]' : 'text-[11px]'} leading-none shrink-0 pl-1`}>{icon}</span>
                  <span className={`${isMobile ? 'text-[13px]' : 'text-[12px]'} font-extrabold truncate leading-none px-1.5`} style={{ color: `${accent}dd`, maxWidth: isMobile ? '130px' : '120px' }}>
                    {language === 'ar' ? s.locationAr : s.location}
                  </span>
                  <span className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} font-bold uppercase ra-font-mono shrink-0 leading-none px-1 py-px rounded-sm`} style={{ color: `${accent}99`, background: `${accent}10`, letterSpacing: '0.06em' }}>
                    {language === 'ar' ? threat.ar : threat.en}
                  </span>
                  {remaining > 0 && (
                    <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} font-black ra-font-mono tabular-nums shrink-0 leading-none px-1`} style={{ color: isCritical ? accent : `${accent}88` }}>
                      {remaining}s
                    </span>
                  )}
                  <div className="w-1" />
                </div>
              );
            })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── FOOTER ── */}
      {!isMobile && (
        <div className="shrink-0 px-3.5 py-1.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
          <span className="text-[9px] ra-font-mono tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.20)' }}>OREF HOME FRONT COMMAND</span>
          <span className="text-[9px] ra-font-mono tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.20)' }}>{alerts.length} TOTAL</span>
        </div>
      )}
    </div>
  );
});


