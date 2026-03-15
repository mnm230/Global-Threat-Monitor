import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AlertTriangle, Crosshair, Download, ExternalLink, Flame, Globe, Loader2, Radio, Rocket, Shield, Target, Zap, ArrowRight,
} from 'lucide-react';
import { PanelHeader } from '@/components/panels/panel-chrome';
import type { RocketStats, RocketCorridor } from '@shared/schema';

export function RocketStatsPanel({ language, onClose, onMaximize, isMaximized, stats }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; stats: RocketStats | null }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [activeTab, setActiveTab] = useState<'overview' | 'epic' | 'live'>('overview');
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [liveFeedLoading, setLiveFeedLoading] = useState(false);
  const [liveFeedError, setLiveFeedError] = useState(false);
  const [epicData, setEpicData] = useState<Record<string, any> | null>(null);
  const [epicLoading, setEpicLoading] = useState(false);
  const [epicFetchedAt, setEpicFetchedAt] = useState<string | null>(null);
  const [epicError, setEpicError] = useState(false);
  const fetchEpic = useCallback(async () => {
    setEpicLoading(true);
    setEpicError(false);
    try {
      const res = await fetch('/api/epic-fury');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data.error) { setEpicData(data); setEpicFetchedAt(new Date().toLocaleTimeString()); }
      else setEpicError(true);
    } catch { setEpicError(true); }
    setEpicLoading(false);
  }, []);
  const liveFetchedRef = useRef(false);

  const originEntries = stats ? Object.entries(stats.totalByOrigin).sort(([, a], [, b]) => b - a) : [];
  const targetEntries = stats ? Object.entries(stats.totalByTarget).sort(([, a], [, b]) => b - a).slice(0, 10) : [];
  const maxOrigin = originEntries.length > 0 ? Math.max(...originEntries.map(e => e[1])) : 1;
  const maxTarget = targetEntries.length > 0 ? Math.max(...targetEntries.map(e => e[1])) : 1;

  const corridors = stats?.corridors || [];
  const totalAlerts = stats?.totalAlerts || 0;

  useEffect(() => {
    if (activeTab !== 'live' || liveFetchedRef.current) return;
    liveFetchedRef.current = true;
    setLiveFeedLoading(true);
    setLiveFeedError(false);
    fetch('/api/live-conflict-feed')
      .then(r => r.json())
      .then(data => { setLiveFeed(Array.isArray(data) ? data : []); setLiveFeedLoading(false); })
      .catch(() => { setLiveFeedError(true); setLiveFeedLoading(false); });
  }, [activeTab]);

  const getCountryIcon = (country: string) => {
    if (country === 'Israel') return <Shield className="w-3 h-3 text-blue-400" />;
    if (country === 'Lebanon') return <Target className="w-3 h-3 text-green-400" />;
    if (country === 'Palestine') return <Flame className="w-3 h-3 text-orange-400" />;
    if (country === 'Iran') return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (country === 'Yemen') return <Crosshair className="w-3 h-3 text-yellow-400" />;
    if (country === 'Syria') return <Radio className="w-3 h-3 text-purple-400" />;
    if (country === 'Iraq') return <Zap className="w-3 h-3 text-amber-400" />;
    if (country === 'United States') return <Globe className="w-3 h-3 text-cyan-400" />;
    if (['Saudi Arabia','UAE','Kuwait','Bahrain','Qatar','Oman'].includes(country)) return <Shield className="w-3 h-3 text-emerald-400" />;
    return <Globe className="w-3 h-3 text-gray-400" />;
  };

  const attackTypeColor = (at: string) => {
    if (at === 'rocket') return '#f97316';
    if (at === 'missile') return '#ef4444';
    if (at === 'drone') return '#facc15';
    if (at === 'airstrike') return '#60a5fa';
    if (at === 'naval') return '#34d399';
    return '#94a3b8';
  };
  const attackTypeLabel = (at: string) => ({'rocket':'ROCKET','missile':'MISSILE','drone':'DRONE','airstrike':'AIRSTRIKE','naval':'NAVAL'}[at] || 'EVENT');

  const CorridorRow = ({ c, barColor, maxAlerts }: { c: RocketCorridor; barColor: string; maxAlerts: number }) => (
    <div className="flex items-center gap-1.5 text-[9px] py-0.5">
      {getCountryIcon(c.originCountry)}
      <span className="text-foreground/70 font-mono w-[60px] truncate">{c.origin}</span>
      <ArrowRight className="w-2.5 h-2.5 shrink-0" style={{ color: barColor + '80' }} />
      {getCountryIcon(c.targetCountry)}
      <span className="text-foreground/50 font-mono w-[60px] truncate">{c.target}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden mx-1" style={{ background: 'hsl(var(--muted))' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.totalAlerts / Math.max(maxAlerts, 1)) * 100)}%`, background: c.active ? barColor : barColor + '55' }} />
      </div>
      <span className="text-foreground/80 font-mono font-bold w-[36px] text-right">{c.totalAlerts.toLocaleString()}</span>
      {c.active && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: barColor }} />}
    </div>
  );

  const TypeBreakdown = ({ corridorList, color }: { corridorList: RocketCorridor[]; color: string }) => {
    const rockets = corridorList.reduce((s, c) => s + c.rockets, 0);
    const missiles = corridorList.reduce((s, c) => s + c.missiles, 0);
    const drones = corridorList.reduce((s, c) => s + c.drones, 0);
    const total = corridorList.reduce((s, c) => s + c.totalAlerts, 0);
    if (!total) return null;
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${color}18` }}>
        {rockets > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Rockets','صواريخ')}: <span className="text-orange-400 font-bold">{rockets.toLocaleString()}</span></span>}
        {missiles > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('Missiles','قذائف')}: <span className="text-red-400 font-bold">{missiles.toLocaleString()}</span></span>}
        {drones > 0 && <span className="text-[8px] font-mono text-foreground/40">{t('UAV/Drones','مسيّرات')}: <span className="text-yellow-400 font-bold">{drones.toLocaleString()}</span></span>}
      </div>
    );
  };

  const threatTypeLabels: Record<string, { label: string; color: string }> = {
    rockets: { label: t('Rockets','صواريخ'), color: '#f97316' },
    missiles: { label: t('Missiles','قذائف'), color: '#ef4444' },
    uav_intrusion: { label: t('UAV Intrusion','مسيّرات'), color: '#facc15' },
    hostile_aircraft_intrusion: { label: t('Hostile Aircraft','طائرات معادية'), color: '#a78bfa' },
  };

  const TABS = [
    { id: 'overview', label: t('Overview','نظرة') },
    { id: 'epic',     label: t('Op. Fury','شاغت') },
    { id: 'live',     label: t('Live','مباشر') },
  ] as const;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="panel-rocketstats">
      <PanelHeader
        title={t('Alert Statistics', 'إحصائيات التنبيهات')}
        icon={<Rocket className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="rocketstats"
        extra={
          <span className="text-[9px] text-foreground/40 font-mono px-1 py-0.5 rounded" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}} data-testid="badge-live-data">{t('LIVE DATA', 'بيانات حية')}</span>
        }
      />

      <div className="flex shrink-0 border-b" style={{background:'hsl(var(--muted))', borderColor:'hsl(var(--border))'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
            style={{ color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', borderBottom: activeTab === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent', background: activeTab === tab.id ? 'hsl(var(--primary) / 0.08)' : 'transparent' }}>
            {tab.id === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2" style={{background:'hsl(var(--background))'}}>
        {!stats && activeTab !== 'live' ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        ) : activeTab === 'overview' ? (
          <>
            <div className="grid grid-cols-3 gap-1.5" data-testid="stats-summary">
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[15px] font-black text-primary font-mono" data-testid="text-total-alerts">{totalAlerts.toLocaleString()}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Total Alerts', 'إجمالي التنبيهات')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(0 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-orange-400 font-mono" data-testid="text-last-24h">{stats!.last24h}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Last 24h', 'آخر 24 ساعة')}</div>
              </div>
              <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(45 30% 25% / 0.3)'}}>
                <div className="text-[15px] font-black text-yellow-400 font-mono" data-testid="text-active-fronts">{stats!.activeFronts}</div>
                <div className="text-[7px] text-foreground/50 uppercase tracking-wider">{t('Active Fronts', 'جبهات نشطة')}</div>
              </div>
            </div>

            {Object.keys(stats!.byThreatType || {}).length > 0 && (
              <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="flex items-center gap-1 mb-1.5">
                  <Rocket className="w-3 h-3 text-primary/70" />
                  <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('By Threat Type', 'حسب نوع التهديد')}</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(stats!.byThreatType).sort(([,a],[,b]) => b - a).map(([type, count]) => {
                    const info = threatTypeLabels[type] || { label: type, color: '#94a3b8' };
                    const maxThreat = Math.max(...Object.values(stats!.byThreatType), 1);
                    return (
                      <div key={type} className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono w-[85px] truncate" style={{ color: info.color }}>{info.label}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--background))'}}>
                          <div className="h-full rounded-full transition-[width] duration-500" style={{width:`${(count / maxThreat) * 100}%`, background: info.color}} />
                        </div>
                        <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right font-bold">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {corridors.length > 0 && (
              <div className="rounded p-2" style={{background:'hsl(0 30% 16% / 0.4)', border:'1px solid hsl(0 40% 30% / 0.3)'}}>
                <div className="flex items-center gap-1 mb-1.5">
                  <ArrowRight className="w-3 h-3 text-red-400" />
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">{t(`Alert Corridors (${totalAlerts.toLocaleString()})`, `ممرات التنبيهات`)}</span>
                </div>
                <div className="space-y-0.5" data-testid="corridors-list">
                  {corridors.slice(0, 10).map((c, i) => (
                    <CorridorRow key={i} c={c} barColor="#ef4444" maxAlerts={corridors[0]?.totalAlerts || 1} />
                  ))}
                </div>
                <TypeBreakdown corridorList={corridors} color="#ef4444" />
              </div>
            )}

            {corridors.length === 0 && (
              <div className="rounded p-3 text-center" style={{background:'hsl(var(--muted) / 0.3)', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[9px] font-mono text-foreground/40">{t('No rocket/missile/UAV alerts recorded yet. Corridors populate from live Tzevaadom data.','لم يتم تسجيل تنبيهات بعد. البيانات تُجمع من مصدر حي.')}</div>
              </div>
            )}

            {originEntries.length > 0 && (
              <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="flex items-center gap-1 mb-1.5">
                  <Rocket className="w-3 h-3 text-primary/70" />
                  <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('By Estimated Origin', 'حسب المصدر المقدّر')}</span>
                </div>
                <div className="space-y-1" data-testid="origin-chart">
                  {originEntries.map(([origin, count], i) => (
                    <div key={origin} className="flex items-center gap-1.5" data-testid={`origin-bar-${i}`}>
                      <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{origin}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--background))'}}>
                        <div className="h-full rounded-full transition-[width] duration-500" style={{width:`${(count / maxOrigin) * 100}%`, background: count === maxOrigin ? 'hsl(32 92% 50%)' : 'hsl(32 60% 38%)'}} />
                      </div>
                      <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {targetEntries.length > 0 && (
              <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="flex items-center gap-1 mb-1.5">
                  <Target className="w-3 h-3 text-red-400/70" />
                  <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Top Alert Regions', 'أكثر المناطق تنبيهاً')}</span>
                </div>
                <div className="space-y-1" data-testid="target-chart">
                  {targetEntries.map(([target, count], i) => (
                    <div key={target} className="flex items-center gap-1.5" data-testid={`target-bar-${i}`}>
                      <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{target}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--background))'}}>
                        <div className="h-full rounded-full transition-[width] duration-500" style={{width:`${(count / maxTarget) * 100}%`, background: count === maxTarget ? 'hsl(0 70% 50%)' : 'hsl(0 50% 35%)'}} />
                      </div>
                      <span className="text-[8px] text-foreground/70 font-mono w-[34px] text-right">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded p-1.5" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Peak Hour', 'ساعة الذروة')}</div>
                <div className="text-[12px] font-bold text-primary font-mono" data-testid="text-peak-hour">{stats!.peakHour}{stats!.peakHour !== '—' ? ' UTC' : ''}</div>
              </div>
              <div className="rounded p-1.5" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[7px] text-foreground/40 uppercase tracking-wider mb-0.5">{t('Last Hour', 'الساعة الأخيرة')}</div>
                <div className="text-[12px] font-bold font-mono" data-testid="text-last-1h">
                  <span className={stats!.last1h > 5 ? 'text-red-400' : stats!.last1h > 0 ? 'text-orange-400' : 'text-green-400'}>{stats!.last1h}</span>
                  <span className="text-[8px] text-foreground/40 ml-1">{t('alerts', 'تنبيهات')}</span>
                </div>
              </div>
            </div>

            <div className="text-[7px] text-foreground/30 text-center font-mono" data-testid="text-rocket-generated-at">
              {t('Live data from Tzevaadom + Telegram. Origins estimated from geography. Alert ≠ confirmed launch.', 'بيانات حية من צבע אדום + تيليغرام. المصادر مقدّرة جغرافياً. تنبيه ≠ إطلاق مؤكد.')}
            </div>
          </>
        ) : activeTab === 'epic' ? (
          <>
            {/* Operation Header */}
            <div className="rounded p-2" style={{background:'hsl(0 30% 16% / 0.5)', border:'1px solid hsl(0 50% 30% / 0.4)'}}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider font-mono">{t('Operation Epic Fury','عملية شاغت الاري')}</span>
                <button
                  onClick={fetchEpic}
                  disabled={epicLoading}
                  className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  style={{background:'hsl(0 40% 20% / 0.7)', border:'1px solid hsl(0 50% 35% / 0.5)', color:'hsl(0 70% 70%)'}}
                >
                  {epicLoading ? <Loader2 className="w-2 h-2 animate-spin" /> : <Download className="w-2 h-2" />}
                  {epicLoading ? t('Fetching…','جلب…') : t('Refresh','تحديث')}
                </button>
              </div>
              {epicError && <div className="text-[7px] font-mono text-red-400/60 mb-1">{t('Fetch failed — site may be JS-rendered','فشل الجلب')}</div>}
              {epicFetchedAt && !epicError && <div className="text-[7px] font-mono text-emerald-400/50 mb-1">{t(`Live · fetched ${epicFetchedAt}`,`مباشر · ${epicFetchedAt}`)}</div>}
              <div className="grid grid-cols-3 gap-1 text-center mt-1.5">
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Start','البداية')}</div>
                  <div className="text-[9px] font-bold font-mono text-foreground/80">28/02/2026</div>
                </div>
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Day','اليوم')}</div>
                  <div className="text-[15px] font-black font-mono text-red-400">{epicData?.day ?? 13}</div>
                </div>
                <div>
                  <div className="text-[8px] text-foreground/40 uppercase tracking-wider">{t('Updated','تحديث')}</div>
                  <div className="text-[9px] font-bold font-mono text-foreground/80">13/03/2026</div>
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('Ballistic Missiles','صواريخ باليستية'), value: '~1,040', color: '#ef4444', sub: t('Region-wide','المنطقة') },
                { label: t('Drones / UAVs','طائرات مسيّرة'), value: '~3,000', color: '#facc15', sub: t('Region-wide','المنطقة') },
                { label: t('Missiles → Israel','صواريخ نحو إسرائيل'), value: '~200', color: '#f97316', sub: t('Directed','موجّهة') },
                { label: t('Lebanon Rockets','صواريخ لبنان'), value: '~25,000', color: '#a78bfa', sub: t('Cumulative','تراكمي') },
                { label: t('Countries Attacked','دول مهاجَمة'), value: '12', color: '#60a5fa', sub: t('States','دول') },
                { label: t('Launchers Destroyed','قاذفات مدمّرة'), value: '300', color: '#34d399', sub: t('Confirmed','مؤكّد') },
                { label: t('Air Refueling Ops','تزود جوي'), value: '12', color: '#22d3ee', sub: t('Sorties','طلعة') },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:`1px solid ${color}28`}}>
                  <div className="text-[13px] font-black font-mono" style={{ color }}>{value}</div>
                  <div className="text-[7px] text-foreground/60 font-bold uppercase tracking-wider leading-tight">{label}</div>
                  <div className="text-[6px] text-foreground/30 font-mono mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            {/* Interception Events by Country */}
            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Interception Events by Country','حوادث الاعتراض بالدولة')}</span>
              </div>
              {[
                { country: 'UAE', value: 1797, ballistic: 229, drones: 1439 },
                { country: 'Israel', value: 650, ballistic: 400, drones: 250 },
                { country: 'Kuwait', value: 682, ballistic: 226, drones: 425 },
                { country: 'Bahrain', value: 285, ballistic: 86, drones: 173 },
                { country: 'Qatar', value: 237, ballistic: 131, drones: 63 },
                { country: 'Saudi Arabia', value: 170, ballistic: 14, drones: 110 },
                { country: 'Jordan', value: 90, ballistic: 30, drones: 60 },
                { country: 'Oman', value: 15, ballistic: 0, drones: 8 },
                { country: 'Iraq', value: 12, ballistic: 0, drones: 12 },
                { country: 'Cyprus', value: 3, ballistic: 2, drones: 1 },
              ].map(({ country, value, ballistic, drones }, _i, arr) => {
                const max = arr[0].value;
                return (
                  <div key={country} className="flex items-center gap-1 mb-0.5">
                    {getCountryIcon(country)}
                    <span className="text-[8px] text-foreground/60 font-mono w-[75px] truncate">{country}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'hsl(var(--muted))'}}>
                      <div className="h-full rounded-full" style={{width:`${(value/max)*100}%`, background:'#34d399'}} />
                    </div>
                    <span className="text-[8px] text-emerald-400 font-mono font-bold w-[30px] text-right">{value.toLocaleString()}</span>
                    <span className="text-[6px] text-foreground/25 font-mono w-[48px] text-right">{ballistic > 0 ? `${ballistic}B` : ''}{ballistic > 0 && drones > 0 ? '/' : ''}{drones > 0 ? `${drones}D` : ''}</span>
                  </div>
                );
              })}
              <div className="text-[7px] text-foreground/25 font-mono mt-1">{t('B = Ballistic · D = Drones','ب = باليستي · م = مسيّر')}</div>
            </div>

            {/* Day 13 Activity */}
            <div className="rounded p-2" style={{background:'hsl(45 30% 14% / 0.4)', border:'1px solid hsl(45 40% 25% / 0.3)'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">{t('Day 13 Activity (12/03/2026)','نشاط اليوم 13')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(0 40% 30% / 0.3)'}}>
                  <div className="text-[15px] font-black text-red-400 font-mono">25</div>
                  <div className="text-[7px] text-foreground/40 uppercase tracking-wider">{t('Ballistic','باليستي')}</div>
                </div>
                <div className="rounded p-1.5 text-center" style={{background:'hsl(var(--muted))', border:'1px solid hsl(48 40% 30% / 0.3)'}}>
                  <div className="text-[15px] font-black text-yellow-400 font-mono">65</div>
                  <div className="text-[7px] text-foreground/40 uppercase tracking-wider">{t('Drones','مسيّرات')}</div>
                </div>
              </div>
              <div className="text-[7px] font-mono text-foreground/40 leading-relaxed">
                <span className="text-yellow-400/70 font-bold">{t('Targets: ','الأهداف: ')}</span>
                {t('Jerusalem · Shaybah Field · UAE Ministry of Defense','القدس · حقل الشيبة · وزارة الدفاع الإماراتية')}
              </div>
            </div>

            {/* Casualties */}
            <div className="rounded p-2" style={{background:'hsl(var(--muted))', border:'1px solid hsl(var(--border))'}}>
              <div className="flex items-center gap-1 mb-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-bold text-foreground/80 uppercase tracking-wider">{t('Casualty Figures','الخسائر البشرية')}</span>
              </div>
              {[
                { party: 'Israel', killed: epicData?.israelKilled ?? 18, wounded: (epicData?.israelWounded ?? 2745) as number | null, extra: '3,400 displaced · 50,719 alerts', color: '#60a5fa' },
                { party: 'Lebanon', killed: epicData?.lebanonKilled ?? 634, wounded: 1586 as number | null, extra: '750,000 displaced', color: '#34d399' },
                { party: 'Iran', killed: epicData?.iranKilled ?? 1348, wounded: (epicData?.iranWounded ?? 6186) as number | null, extra: '~45 targeted ops · 14 senior officials', color: '#ef4444' },
                { party: 'Middle East (excl. IL)', killed: 28, wounded: 478 as number | null, extra: null as string | null, color: '#f97316' },
                { party: 'United States', killed: 7, wounded: null as number | null, extra: null as string | null, color: '#a78bfa' },
              ].map(({ party, killed, wounded, extra, color }) => (
                <div key={party} className="mb-1.5 last:mb-0 pb-1.5 last:pb-0" style={{borderBottom:'1px solid hsl(var(--border) / 0.5)'}}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {getCountryIcon(party)}
                    <span className="text-[9px] font-bold font-mono" style={{ color }}>{party}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-4">
                    <span className="text-[8px] font-mono text-foreground/40">{t('Killed','قتلى')}: <span className="text-red-400 font-bold">{killed.toLocaleString()}</span></span>
                    {wounded != null && <span className="text-[8px] font-mono text-foreground/40">{t('Wounded','جرحى')}: <span className="text-orange-400 font-bold">{wounded.toLocaleString()}</span></span>}
                    {extra && <span className="text-[8px] font-mono text-foreground/30">{extra}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[7px] text-foreground/30 text-center font-mono">{t('Source: littlemoiz.com · IDF Spokesperson · INSS · Ynet · Day 13 (13/03/2026)','المصدر: littlemoiz.com · المتحدث الإسرائيلي · INSS · يديعوت')}</div>
          </>
        ) : (
          /* Live Feed */
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-foreground/60 uppercase tracking-wider">{t('Live Conflict Intelligence','مصدر الاستخبارات المباشر')}</span>
            </div>
            <div className="text-[7px] font-mono text-foreground/30 mb-2">{t('Filtered for GCC & Lebanon attack events · GDELT + NewsAPI + GNews','مُرشَّح · GDELT + NewsAPI + GNews')}</div>

            {liveFeedLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
                <span className="text-[9px] font-mono text-foreground/40">{t('Fetching live data…','جلب البيانات…')}</span>
              </div>
            )}
            {liveFeedError && (
              <div className="rounded p-3 text-center" style={{background:'hsl(var(--destructive) / 0.08)', border:'1px solid hsl(var(--destructive) / 0.25)'}}>
                <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <div className="text-[8px] font-mono text-red-400">{t('Failed to fetch live feed. API keys may be required.','فشل في جلب البيانات. قد تحتاج مفاتيح API.')}</div>
              </div>
            )}
            {!liveFeedLoading && !liveFeedError && liveFeed.length === 0 && (
              <div className="rounded p-3 text-center" style={{background:'hsl(var(--muted) / 0.3)', border:'1px solid hsl(var(--border))'}}>
                <div className="text-[8px] font-mono text-foreground/40">{t('No recent conflict events found. Feed refreshes every 30s.','لا أحداث حديثة. يتجدد كل 30 ثانية.')}</div>
              </div>
            )}
            {liveFeed.map((item: any) => {
              const color = attackTypeColor(item.attackType);
              const label = attackTypeLabel(item.attackType);
              const ageMin = Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000);
              const ageStr = ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`;
              const relevanceBadge = item.relevance === 'gcc' ? { text: 'GCC', color: '#f97316' }
                : item.relevance === 'lebanon' ? { text: 'LBN', color: '#34d399' }
                : item.relevance === 'both' ? { text: 'MULTI', color: '#facc15' } : null;
              return (
                <div key={item.id} className="rounded p-2" style={{background:'hsl(var(--muted) / 0.5)', border:`1px solid ${color}20`}}>
                  <div className="flex items-start gap-1.5">
                    <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                      <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded" style={{background: color + '20', color, border:`1px solid ${color}35`}}>{label}</span>
                      {relevanceBadge && <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded text-center" style={{background: relevanceBadge.color + '20', color: relevanceBadge.color, border:`1px solid ${relevanceBadge.color}35`}}>{relevanceBadge.text}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.url
                        ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-foreground/80 leading-tight hover:text-primary transition-colors line-clamp-2 block">{item.title}</a>
                        : <p className="text-[9px] font-mono text-foreground/80 leading-tight line-clamp-2">{item.title}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[7px] font-mono text-foreground/35">{item.source}</span>
                        <span className="text-[7px] font-mono text-foreground/25">{ageStr}</span>
                        {item.url && <ExternalLink className="w-2.5 h-2.5 text-foreground/20" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {liveFeed.length > 0 && (
              <button className="w-full py-1.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-all hover:bg-white/5"
                style={{border:'1px solid hsl(var(--border))', color:'hsl(32 80% 50%)'}}
                onClick={() => { liveFetchedRef.current = false; setLiveFeed([]); setActiveTab('overview'); setTimeout(() => setActiveTab('live'), 50); }}>
                {t('Refresh Feed','تحديث')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

