import { useState } from 'react';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, Brain, Clock, Flame, Loader2, Target, TrendingDown, TrendingUp, Zap, Rocket, Plane, Crosshair, Shield, ShieldAlert, Siren, Send, Ship,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { PanelHeader } from '@/components/panels/panel-chrome';
import type { AttackPrediction } from '@/lib/dashboard-types';
import type {
  RedAlert, SirenAlert, FlightData, TelegramMessage,
  ConflictEvent, CommodityData, ShipData, ThermalHotspot,
} from '@shared/schema';

export function AIPredictionPanel({ language, onClose, onMaximize, isMaximized, prediction, alerts: liveAlerts = [], sirens: liveSirens = [], flights: liveFlights = [], telegramMessages: liveTelegram = [], events: liveEvents = [], commodities: liveCommodities = [], ships: liveShips = [], thermalHotspots: liveThermal = [] }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  prediction: AttackPrediction | null;
  alerts?: RedAlert[];
  sirens?: SirenAlert[];
  flights?: FlightData[];
  telegramMessages?: TelegramMessage[];
  events?: ConflictEvent[];
  commodities?: CommodityData[];
  ships?: ShipData[];
  thermalHotspots?: ThermalHotspot[];
}) {
  const [activeTab, setActiveTab] = useState<'forecast' | 'vectors' | 'pattern' | 'intel'>('forecast');

  const threatColor = (level: string) => ({
    EXTREME: 'text-red-400', HIGH: 'text-orange-400', ELEVATED: 'text-yellow-400',
    MODERATE: 'text-blue-400', LOW: 'text-green-400',
  }[level] || 'text-orange-400');

  const threatBg = (level: string) => ({
    EXTREME: 'bg-red-500/10 border-red-500/25',
    HIGH: 'bg-orange-500/10 border-orange-500/25',
    ELEVATED: 'bg-yellow-500/10 border-yellow-500/25',
    MODERATE: 'bg-blue-500/10 border-blue-500/25',
    LOW: 'bg-green-500/10 border-green-500/25',
  }[level] || 'bg-orange-500/10 border-orange-500/25');

  const threatGlow = (level: string) => ({
    EXTREME: '0 0 20px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.1)',
    HIGH: '0 0 15px rgba(251,146,60,0.2)',
    ELEVATED: '0 0 10px rgba(250,204,21,0.15)',
    MODERATE: 'none', LOW: 'none',
  }[level] || 'none');

  const probColor = (p: number) =>
    p >= 0.7 ? 'bg-red-500' : p >= 0.4 ? 'bg-yellow-500' : 'bg-blue-500';

  const timeframeLabel = (tf: string) => ({
    imminent: language === 'ar' ? '\u0648\u0634\u064A\u0643' : 'IMMINENT',
    '1h': '1H', '3h': '3H', '6h': '6H', '12h': '12H', '24h': '24H',
  }[tf] || tf.toUpperCase());

  const threatLevel = prediction?.overallThreatLevel || 'MODERATE';
  const threatNum = ({ EXTREME: 5, HIGH: 4, ELEVATED: 3, MODERATE: 2, LOW: 1 }[threatLevel] || 2);
  const confPct = Math.round((prediction?.confidence || 0) * 100);

  const gaugeAngle = -90 + (threatNum / 5) * 180;
  const gaugeColors = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

  return (
    <div className="flex flex-col h-full bg-card" data-testid="panel-aiprediction">
      <PanelHeader
        title={language === 'ar' ? 'توقعات الذكاء الاصطناعي' : 'AI Prediction'}
        icon={<Brain className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="aiprediction"
        extra={
          <>
            {prediction?.dataPoints?.isEscalating && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 text-red-500 rounded-sm border border-red-500/25 animate-pulse">
                Escalating
              </span>
            )}
            {prediction && (
              <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/25 font-medium">
                {confPct}% conf
              </span>
            )}
          </>
        }
      />

      <div className="flex border-b border-border shrink-0 overflow-x-auto scrollbar-none bg-card">
        {(['forecast', 'vectors', 'pattern', 'intel'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 flex-1 py-2 text-[12px] font-medium transition-all ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary bg-primary/8'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
            data-testid={`button-aipred-tab-${tab}`}
          >
            {tab === 'forecast' ? (language === 'ar' ? 'التوقع' : 'Forecast') :
             tab === 'vectors'  ? (language === 'ar' ? 'التهديدات' : 'Vectors') :
             tab === 'pattern'  ? (language === 'ar' ? 'النمط' : 'Pattern') :
             (language === 'ar' ? 'المصادر' : 'Intel')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {!prediction ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="relative">
              <Brain className="w-8 h-8 text-primary/30" />
              <Loader2 className="w-4 h-4 text-primary animate-spin absolute -bottom-1 -right-1" />
            </div>
            <span className="text-sm text-muted-foreground">{language === 'ar' ? '\u062C\u0627\u0631\u064D \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A\u2026' : 'Analyzing threat patterns...'}</span>
          </div>
        ) : (
          <>
            {activeTab === 'forecast' && (
              <div className="p-3 space-y-3">

                {prediction.insufficientData && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-500/60 mx-auto mb-2" />
                    <div className="text-sm font-medium text-yellow-400/80 mb-1">
                      {language === 'ar' ? 'بيانات غير كافية' : 'Insufficient Data'}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {prediction.patternSummary}
                    </div>
                  </div>
                )}

                {/* Threat Level Summary Row */}
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${threatBg(threatLevel)}`}>
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <svg width="56" height="32" viewBox="0 0 64 36" className="overflow-visible">
                      {gaugeColors.map((color, i) => {
                        const startAngle = -90 + (i / 5) * 180;
                        const endAngle = -90 + ((i + 1) / 5) * 180;
                        const startRad = (startAngle * Math.PI) / 180;
                        const endRad = (endAngle * Math.PI) / 180;
                        const r = 28;
                        return (
                          <path key={i}
                            d={`M ${32 + r * Math.cos(startRad)} ${32 + r * Math.sin(startRad)} A ${r} ${r} 0 0 1 ${32 + r * Math.cos(endRad)} ${32 + r * Math.sin(endRad)}`}
                            fill="none" stroke={color} strokeWidth={i + 1 === threatNum ? 5 : 3}
                            opacity={i + 1 === threatNum ? 1 : 0.20}
                          />
                        );
                      })}
                      <line x1="32" y1="32" x2={32 + 20 * Math.cos((gaugeAngle * Math.PI) / 180)} y2={32 + 20 * Math.sin((gaugeAngle * Math.PI) / 180)} stroke={gaugeColors[threatNum - 1]} strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="32" cy="32" r="3" fill={gaugeColors[threatNum - 1]} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xl font-bold leading-none mb-0.5 ${threatColor(threatLevel)}`}>{threatLevel}</div>
                    <div className="text-xs text-muted-foreground mb-2">Threat Level</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${confPct}%`, background: gaugeColors[threatNum-1] }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{confPct}% conf</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{prediction.dataPoints?.velocityPerHour ?? 0}</div>
                    <div className="text-xs text-muted-foreground">alerts/hr</div>
                    {prediction.dataPoints?.isEscalating && (
                      <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 justify-end mt-0.5">
                        <TrendingUp className="w-3 h-3" /> Rising
                      </span>
                    )}
                  </div>
                </div>

                {/* WHEN */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">When — Next Attack Window</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <div className="text-2xl font-bold text-foreground leading-none">
                        {prediction.nextAttackWindow?.label || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        ~{prediction.nextAttackWindow?.estimatedMinutes ?? '?'} min estimated
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="flex items-center gap-1.5 justify-end mb-1">
                        <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((prediction.nextAttackWindow?.confidence ?? 0) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round((prediction.nextAttackWindow?.confidence ?? 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  {prediction.nextAttackWindow?.basis && (
                    <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed border-t border-border pt-2">
                      {prediction.nextAttackWindow.basis}
                    </p>
                  )}
                </div>

                {/* WHERE */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                      <Target className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where — Most Likely Target</span>
                  </div>
                  <div className="text-lg font-bold text-foreground mb-3">{prediction.nextLikelyTarget || (language === 'ar' ? 'بيانات غير كافية' : 'Insufficient data')}</div>
                  {prediction.locationProbabilities && prediction.locationProbabilities.length > 0 && (
                    <div className="space-y-1.5">
                      {prediction.locationProbabilities.slice(0, 5).map((lp, i) => {
                        const pct = Math.round(lp.probability * 100);
                        const barColor = pct >= 65 ? '#ef4444' : pct >= 40 ? '#f97316' : '#3b82f6';
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-base leading-none shrink-0">{lp.countryFlag}</span>
                            <span className="text-[12px] text-foreground/80 flex-1 truncate">{lp.location}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{lp.threatType}</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <span className="text-[11px] font-semibold font-mono w-8 text-right shrink-0" style={{ color: barColor }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FROM WHERE */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">From Where — Likely Origins</span>
                  </div>
                  {(() => {
                    // Aggregate origins from predictions' source field
                    const originMap: Record<string, { count: number; vectors: string[] }> = {};
                    prediction.predictions.forEach(p => {
                      const src = p.source || 'Unknown';
                      if (!originMap[src]) originMap[src] = { count: 0, vectors: [] };
                      originMap[src].count++;
                      if (!originMap[src].vectors.includes(p.threatVector)) originMap[src].vectors.push(p.threatVector);
                    });
                    const origins = Object.entries(originMap).sort((a, b) => b[1].count - a[1].count);
                    const maxCount = origins[0]?.[1].count || 1;
                    return origins.length > 0 ? (
                      <div className="space-y-2">
                        {origins.slice(0, 4).map(([origin, data]) => (
                          <div key={origin} className="flex items-center gap-2">
                            <span className="text-[12px] text-foreground/80 flex-1 truncate font-medium">{origin}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{data.vectors.join(', ')}</span>
                            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                              <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.round((data.count / maxCount) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {prediction.escalationVector && (
                    <div className="mt-2 pt-2 border-t border-border flex items-start gap-2">
                      {prediction.dataPoints?.isEscalating
                        ? <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                        : <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-500" />
                      }
                      <p className="text-xs text-muted-foreground leading-relaxed">{prediction.escalationVector}</p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground/40 text-center space-y-1">
                  <div>{language === 'ar' ? 'تحليل إحصائي للأنماط — ليس استخبارات مؤكدة' : 'Statistical pattern analysis — not confirmed intelligence'}</div>
                  <div>Updated {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                </div>
              </div>
            )}

            {activeTab === 'vectors' && (
              <div className="p-3 space-y-2">
                <div className="rounded border border-border bg-muted/20 p-2.5 mb-1">
                  <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">
                    {language === 'ar' ? '\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0647\u062F\u064A\u062F\u0627\u062A' : 'THREAT VECTOR SUMMARY'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-white/50">{prediction.predictions.length} vectors tracked</span>
                      <div className="flex gap-1 mt-1">
                        {['critical','high','medium','low'].map(sev => {
                          const cnt = prediction.predictions.filter(p => p.severity === sev).length;
                          if (cnt === 0) return null;
                          const sevColors: Record<string,string> = { critical: 'bg-red-500/25 text-red-300', high: 'bg-orange-500/25 text-orange-300', medium: 'bg-yellow-500/25 text-yellow-300', low: 'bg-green-500/25 text-green-300' };
                          return <span key={sev} className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${sevColors[sev]}`}>{cnt} {sev.toUpperCase()}</span>;
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-white/25">AVG PROB</span>
                      <div className={`text-[16px] font-black font-mono ${threatColor(threatLevel)}`}>
                        {prediction.predictions.length > 0 ? Math.round(prediction.predictions.reduce((s,p)=>s+p.probability,0)/prediction.predictions.length*100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {prediction.predictions.map((p, i) => {
                  const isHot = p.probability >= 0.7;
                  const VectorIcons: Record<string, typeof Zap> = { rockets: Rocket, missiles: Target, uav: Plane, cruise_missile: Plane, ballistic: AlertTriangle, mortar: Crosshair, anti_tank: Shield, combined: ShieldAlert };
                  const VIcon = VectorIcons[p.threatVector] || AlertTriangle;
                  return (
                    <div key={i} className={`rounded border p-2.5 transition-all ${isHot ? 'border-red-500/25 bg-red-950/10' : 'border-border bg-muted/20'}`} data-testid={`aipred-vector-${i}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <VIcon className={`w-3.5 h-3.5 shrink-0 ${
                          p.severity === 'critical' ? 'text-red-400' : p.severity === 'high' ? 'text-orange-400' : p.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`} />
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono ${
                          p.severity === 'critical' ? 'bg-red-500/25 text-red-300 border border-red-500/30' :
                          p.severity === 'high' ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' :
                          p.severity === 'medium' ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' :
                          'bg-green-500/25 text-green-300 border border-green-500/30'
                        }`}>{p.threatVector.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-semibold text-white/80 flex-1 truncate">{p.region}</span>
                        <span className="text-[9px] font-mono text-white/35">{timeframeLabel(p.timeframe)}</span>
                      </div>
                      <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full transition-all ${probColor(p.probability)}`} style={{ width: `${Math.round(p.probability * 100)}%`, opacity: 0.8 }} />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-black font-mono text-white/70">{Math.round(p.probability * 100)}%</span>
                      </div>
                      {p.rationale && <p className="text-[9px] text-white/40 leading-relaxed italic">{p.rationale}</p>}
                      {p.source && <div className="text-[8px] font-mono text-white/20 mt-1">SRC: {p.source}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'pattern' && (
              <div className="p-3 space-y-3">
                {prediction.patternSummary && (
                  <div className="rounded-lg border border-violet-500/20 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(139,92,246,0.08)' }}>
                    <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: 'linear-gradient(90deg, hsl(260 40% 20% / 0.6), hsl(260 30% 15% / 0.4))' }}>
                      <Brain className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300/70">
                        {language === 'ar' ? '\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0646\u0645\u0637' : 'AI PATTERN ANALYSIS'}
                      </span>
                    </div>
                    <div className="p-3 bg-violet-500/[0.03]">
                      <p className="text-[10px] text-white/65 leading-relaxed">{prediction.patternSummary}</p>
                    </div>
                  </div>
                )}

                {prediction.dataPoints?.topRegions && prediction.dataPoints.topRegions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-red-400/50" />
                      <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                        {language === 'ar' ? '\u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629' : 'HEAT MAP — TARGETED REGIONS'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {prediction.dataPoints.topRegions.map(({ region, count }, i) => {
                        const maxCount = prediction.dataPoints!.topRegions[0]?.count || 1;
                        const pct = Math.round((count / maxCount) * 100);
                        const heat = pct > 70 ? 'from-red-500/30 to-red-500/5' : pct > 40 ? 'from-orange-500/25 to-orange-500/5' : 'from-blue-500/20 to-blue-500/5';
                        const textColor = pct > 70 ? 'text-red-400' : pct > 40 ? 'text-orange-400' : 'text-blue-400';
                        return (
                          <div key={region} className="relative rounded border border-border overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-r ${heat}`} style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center gap-2 px-2.5 py-1.5">
                              <span className="text-[9px] font-mono text-white/25 w-3">{i + 1}</span>
                              <span className="text-[10px] text-white/60 flex-1 truncate font-medium">{region}</span>
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.07]">
                                <div className={`h-full rounded-full ${pct > 70 ? 'bg-red-400/70' : pct > 40 ? 'bg-orange-400/60' : 'bg-blue-400/50'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-[9px] font-black font-mono w-6 text-right ${textColor}`}>{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded border border-border bg-muted/20 p-2.5">
                  <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-1.5">
                    {language === 'ar' ? '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0648\u0642\u0639' : 'PREDICTION METRICS'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Vectors Tracked</span><span className="text-[10px] font-black font-mono text-violet-400">{prediction.predictions.length}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Confidence</span><span className="text-[10px] font-black font-mono text-cyan-400">{confPct}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Alert Velocity</span><span className="text-[10px] font-black font-mono text-yellow-400">{prediction.dataPoints?.velocityPerHour ?? 0}/hr</span></div>
                    <div className="flex items-center justify-between"><span className="text-[9px] font-mono text-white/30">Status</span><span className={`text-[10px] font-black font-mono ${prediction.dataPoints?.isEscalating ? 'text-red-400' : 'text-green-400'}`}>{prediction.dataPoints?.isEscalating ? 'ESCALATING' : 'STABLE'}</span></div>
                  </div>
                </div>

                <div className="pt-1 border-t border-border">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                    <span className="text-[8px] font-mono text-white/20">
                      {language === 'ar' ? 'آخر تحديث' : 'Updated'}: {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'intel' && (() => {
              // ── Compute raw signal scores from live data ──────────────────
              const now = Date.now();
              const milFlights = liveFlights.filter(f => f.type === 'military' || f.type === 'surveillance');
              const recentTg = liveTelegram.filter(m => (now - new Date(m.timestamp).getTime()) < 30 * 60 * 1000);
              const movingMarkets = liveCommodities.filter(c => Math.abs(c.changePercent) > 0.8);
              const stressedMarkets = liveCommodities.filter(c => Math.abs(c.changePercent) > 2.5);
              const activeAlerts = liveAlerts.filter(a => {
                const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
                return elapsed < a.countdown || a.countdown === 0;
              });
              const alertsByType = liveAlerts.reduce<Record<string,number>>((acc, a) => { acc[a.threatType] = (acc[a.threatType]||0)+1; return acc; }, {});
              const dominantThreat = Object.entries(alertsByType).sort((a,b)=>b[1]-a[1])[0];

              // Raw weights — scale with actual data intensity
              const wAlerts    = Math.min(liveAlerts.length * 4, 45);
              const wSirens    = Math.min(liveSirens.length * 6, 35);
              const wFlights   = Math.min(milFlights.length * 5, 30);
              const wTelegram  = Math.min(recentTg.length * 1.5, 25);
              const wMarkets   = Math.min(movingMarkets.length * 4 + stressedMarkets.length * 6, 20);
              const wThermal   = Math.min(liveThermal.length * 4, 15);
              const wShips     = Math.min(liveShips.length * 0.8, 10);
              const wEvents    = Math.min(liveEvents.length * 1.2, 12);
              const totalRaw = wAlerts + wSirens + wFlights + wTelegram + wMarkets + wThermal + wShips + wEvents || 1;

              const pct = (w: number) => Math.round((w / totalRaw) * 100);

              // Signal quality
              const quality = (raw: number, hi: number, med: number): 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE' =>
                raw === 0 ? 'NONE' : raw >= hi ? 'STRONG' : raw >= med ? 'MODERATE' : 'WEAK';

              const sources = [
                {
                  id: 'alerts',
                  icon: <AlertOctagon className="w-4 h-4" style={{ color: '#ef4444' }} />,
                  label: language === 'ar' ? 'إنذارات الأوريف' : 'OREF Red Alerts',
                  color: '#ef4444',
                  raw: wAlerts,
                  contribution: pct(wAlerts),
                  quality: quality(wAlerts, 20, 8),
                  count: liveAlerts.length,
                  countLabel: language === 'ar' ? 'إنذار' : 'alerts',
                  detail: activeAlerts.length > 0
                    ? `${activeAlerts.length} active · ${dominantThreat ? dominantThreat[0].replace(/_/g,' ') + ' dominant' : ''}`
                    : liveAlerts.length > 0 ? `${liveAlerts.length} total logged` : 'No alerts',
                  subMetrics: [
                    { label: 'Active', value: String(activeAlerts.length), color: '#ef4444' },
                    { label: '30m velocity', value: String(prediction?.dataPoints?.velocity30m ?? 0), color: '#f97316' },
                    { label: '2h velocity', value: String(prediction?.dataPoints?.velocity2h ?? 0), color: '#eab308' },
                  ],
                },
                {
                  id: 'sirens',
                  icon: <Siren className="w-4 h-4" style={{ color: '#fbbf24' }} />,
                  label: language === 'ar' ? 'صفارات الإنذار' : 'Siren Activity',
                  color: '#fbbf24',
                  raw: wSirens,
                  contribution: pct(wSirens),
                  quality: quality(wSirens, 18, 6),
                  count: liveSirens.length,
                  countLabel: language === 'ar' ? 'صفارة' : 'sirens',
                  detail: liveSirens.length > 0
                    ? `${new Set(liveSirens.map(s => s.region)).size} regions · ${liveSirens.filter(s => s.threatType === 'rocket' || s.threatType === 'rockets').length} rocket sirens`
                    : 'No siren data',
                  subMetrics: [
                    { label: 'Regions', value: String(new Set(liveSirens.map(s => s.region)).size), color: '#fbbf24' },
                    { label: 'Clustered', value: String(Object.values(liveSirens.reduce<Record<string,number>>((a,s)=>{a[s.region]=(a[s.region]||0)+1;return a;},{})).filter(c=>c>=2).length), color: '#f97316' },
                  ],
                },
                {
                  id: 'flights',
                  icon: <Plane className="w-4 h-4" style={{ color: '#60a5fa' }} />,
                  label: language === 'ar' ? 'استخبارات الطيران' : 'Flight Intelligence',
                  color: '#60a5fa',
                  raw: wFlights,
                  contribution: pct(wFlights),
                  quality: quality(wFlights, 15, 5),
                  count: milFlights.length,
                  countLabel: language === 'ar' ? 'طائرة' : 'mil/surv',
                  detail: `${milFlights.length} military/surveillance · ${liveFlights.filter(f=>f.type==='fighter').length} fighters · ${liveFlights.filter(f=>f.type==='tanker'||f.type==='refueling').length} tankers`,
                  subMetrics: [
                    { label: 'Military', value: String(liveFlights.filter(f=>f.type==='military').length), color: '#ef4444' },
                    { label: 'Surveillance', value: String(liveFlights.filter(f=>f.type==='surveillance').length), color: '#60a5fa' },
                    { label: 'Total tracked', value: String(liveFlights.length), color: '#94a3b8' },
                  ],
                },
                {
                  id: 'telegram',
                  icon: <Send className="w-4 h-4" style={{ color: '#34d399' }} />,
                  label: language === 'ar' ? 'تلغرام SIGINT' : 'Telegram SIGINT',
                  color: '#34d399',
                  raw: wTelegram,
                  contribution: pct(wTelegram),
                  quality: quality(wTelegram, 20, 6),
                  count: recentTg.length,
                  countLabel: language === 'ar' ? 'رسالة' : 'msgs/30m',
                  detail: `${recentTg.length} msgs in last 30m · ${liveTelegram.length} total monitored`,
                  subMetrics: [
                    { label: '30m surge', value: String(recentTg.length), color: '#34d399' },
                    { label: 'Total', value: String(liveTelegram.length), color: '#6ee7b7' },
                  ],
                },
                {
                  id: 'markets',
                  icon: <TrendingUp className="w-4 h-4" style={{ color: '#facc15' }} />,
                  label: language === 'ar' ? 'ضغط الأسواق' : 'Market Stress Index',
                  color: '#facc15',
                  raw: wMarkets,
                  contribution: pct(wMarkets),
                  quality: quality(wMarkets, 12, 4),
                  count: movingMarkets.length,
                  countLabel: language === 'ar' ? 'أصل متحرك' : 'moving assets',
                  detail: (() => {
                    const oil = liveCommodities.find(c => c.symbol === 'OIL' || c.symbol === 'CRUDE' || c.name?.toLowerCase().includes('oil'));
                    const gold = liveCommodities.find(c => c.symbol === 'GOLD' || c.name?.toLowerCase().includes('gold'));
                    const parts: string[] = [];
                    if (oil) parts.push(`Oil ${oil.changePercent > 0 ? '+' : ''}${oil.changePercent.toFixed(1)}%`);
                    if (gold) parts.push(`Gold ${gold.changePercent > 0 ? '+' : ''}${gold.changePercent.toFixed(1)}%`);
                    if (stressedMarkets.length > 0) parts.push(`${stressedMarkets.length} assets >2.5% move`);
                    return parts.length ? parts.join(' · ') : `${liveCommodities.length} assets monitored`;
                  })(),
                  subMetrics: [
                    { label: 'Moving', value: String(movingMarkets.length), color: '#facc15' },
                    { label: 'Stressed', value: String(stressedMarkets.length), color: '#ef4444' },
                    { label: 'Total', value: String(liveCommodities.length), color: '#94a3b8' },
                  ],
                },
                {
                  id: 'thermal',
                  icon: <Flame className="w-4 h-4" style={{ color: '#f87171' }} />,
                  label: language === 'ar' ? 'النقاط الحرارية' : 'Thermal Hotspots',
                  color: '#f87171',
                  raw: wThermal,
                  contribution: pct(wThermal),
                  quality: quality(wThermal, 6, 2),
                  count: liveThermal.length,
                  countLabel: language === 'ar' ? 'نقطة' : 'hotspots',
                  detail: liveThermal.length > 0 ? `${liveThermal.length} active thermal signatures (MODIS/VIIRS)` : 'No thermal data',
                  subMetrics: [
                    { label: 'Active', value: String(liveThermal.length), color: '#f87171' },
                  ],
                },
                {
                  id: 'maritime',
                  icon: <Ship className="w-4 h-4" style={{ color: '#38bdf8' }} />,
                  label: language === 'ar' ? 'الحركة البحرية' : 'Maritime Activity',
                  color: '#38bdf8',
                  raw: wShips,
                  contribution: pct(wShips),
                  quality: quality(wShips, 10, 3),
                  count: liveShips.length,
                  countLabel: language === 'ar' ? 'سفينة' : 'vessels',
                  detail: `${liveShips.length} vessels in monitored straits`,
                  subMetrics: [
                    { label: 'Tracked', value: String(liveShips.length), color: '#38bdf8' },
                  ],
                },
              ].filter(s => s.raw > 0 || s.count > 0);

              const qualityColor = (q: string) =>
                q === 'STRONG' ? '#22c55e' : q === 'MODERATE' ? '#eab308' : q === 'WEAK' ? '#f97316' : '#4b5563';
              const qualityBg = (q: string) =>
                q === 'STRONG' ? 'rgba(34,197,94,0.12)' : q === 'MODERATE' ? 'rgba(234,179,8,0.12)' : q === 'WEAK' ? 'rgba(249,115,22,0.12)' : 'rgba(75,85,99,0.10)';

              const totalActive = sources.filter(s => s.quality !== 'NONE').length;
              const strongCount = sources.filter(s => s.quality === 'STRONG').length;

              return (
                <div className="p-3 space-y-3">
                  {/* ── Header card ── */}
                  <div className="rounded-lg border border-violet-500/20 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(260 35% 12% / 0.8), hsl(260 25% 9% / 0.6))' }}>
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
                      <Activity className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300/70">
                        {language === 'ar' ? 'تفاصيل مصادر الاستخبارات' : 'INTEL SOURCE ATTRIBUTION'}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-white/25">{totalActive}/{sources.length} sources</span>
                        <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                          {strongCount} STRONG
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-[16px] font-black font-mono text-violet-300">{confPct}%</div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Overall Conf.</div>
                      </div>
                      <div className="text-center border-x border-border">
                        <div className="text-[16px] font-black font-mono" style={{ color: prediction?.dataPoints?.isEscalating ? '#ef4444' : '#22c55e' }}>
                          {prediction?.dataPoints?.isEscalating ? '↑' : '→'}
                        </div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                          {prediction?.dataPoints?.isEscalating ? 'Escalating' : 'Stable'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[16px] font-black font-mono text-yellow-400">{prediction?.dataPoints?.velocityPerHour ?? 0}</div>
                        <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Alerts/hr</div>
                      </div>
                    </div>
                    {/* Combined source bar */}
                    <div className="px-3 pb-2.5">
                      <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-1">Signal Composition</div>
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        {sources.filter(s => s.contribution > 0).map(s => (
                          <div key={s.id} style={{ width: `${s.contribution}%`, background: s.color, opacity: s.quality === 'NONE' ? 0.15 : s.quality === 'WEAK' ? 0.4 : 0.75, transition: 'width 0.6s ease' }} title={`${s.label}: ${s.contribution}%`} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {sources.slice(0, 5).map(s => (
                          <div key={s.id} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                            <span className="text-[7px] font-mono text-white/30">{s.contribution}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Source rows ── */}
                  <div className="space-y-2">
                    {sources.map(source => (
                      <div key={source.id} className="rounded-lg border overflow-hidden" style={{ borderColor: source.color + '25', background: qualityBg(source.quality) }}>
                        {/* Main row */}
                        <div className="px-2.5 py-2 flex items-center gap-2.5">
                          <div className="shrink-0" style={{ color: source.color, opacity: source.quality === 'NONE' ? 0.25 : 1 }}>
                            {source.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold text-white/80 truncate">{source.label}</span>
                              <span className="text-[8px] font-black font-mono px-1.5 py-px rounded shrink-0" style={{ background: qualityColor(source.quality) + '22', color: qualityColor(source.quality), border: `1px solid ${qualityColor(source.quality)}44` }}>
                                {source.quality}
                              </span>
                            </div>
                            <p className="text-[8px] font-mono text-white/35 truncate">{source.detail}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[15px] font-black font-mono leading-none" style={{ color: source.color }}>{source.contribution}%</div>
                            <div className="text-[7px] font-mono text-white/25">of signal</div>
                          </div>
                        </div>
                        {/* Contribution bar */}
                        <div className="mx-2.5 mb-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${source.contribution}%`, background: `linear-gradient(90deg, ${source.color}88, ${source.color})` }} />
                        </div>
                        {/* Sub-metrics */}
                        {source.subMetrics.length > 1 && (
                          <div className="flex divide-x divide-border border-t border-border">
                            {source.subMetrics.map(m => (
                              <div key={m.label} className="flex-1 px-2 py-1 text-center">
                                <div className="text-[11px] font-black font-mono" style={{ color: m.color }}>{m.value}</div>
                                <div className="text-[7px] font-mono text-white/25 uppercase tracking-wide">{m.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── Footer timestamp ── */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                    <span className="text-[8px] font-mono text-white/20">
                      {language === 'ar' ? 'آخر تحديث' : 'Last computed'}: {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-violet-400/40" />
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

