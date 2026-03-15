import { useState } from 'react';
import {
  AlertTriangle, Brain, ChevronDown, ChevronRight, Crosshair, Globe, Loader2, MapPin, Shield, Sparkles, Target, TrendingUp, Zap, Plane, ShieldAlert, Clock, Activity, TrendingDown,
} from 'lucide-react';
import { PanelHeader } from '@/components/panels/panel-chrome';
import type { AttackPrediction } from '@/lib/dashboard-types';

export function AttackPredictorPanel({ language, onClose, onMaximize, isMaximized, prediction }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean; prediction: AttackPrediction | null }) {
  const threatColors: Record<string, string> = {
    EXTREME: 'text-red-400',
    HIGH: 'text-orange-400',
    ELEVATED: 'text-yellow-400',
    MODERATE: 'text-blue-400',
    LOW: 'text-green-400',
  };
  const threatBgs: Record<string, string> = {
    EXTREME: 'bg-red-500/15 border-red-500/30',
    HIGH: 'bg-orange-500/15 border-orange-500/30',
    ELEVATED: 'bg-yellow-500/15 border-yellow-500/30',
    MODERATE: 'bg-blue-500/15 border-blue-500/30',
    LOW: 'bg-green-500/15 border-green-500/30',
  };
  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border-green-500/30',
  };
  const VectorIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'rockets': return <Zap className="w-3 h-3 text-red-400" />;
      case 'missiles': return <Target className="w-3 h-3 text-orange-400" />;
      case 'uav': return <Plane className="w-3 h-3 text-yellow-400" />;
      case 'cruise_missile': return <Plane className="w-3 h-3 text-red-300" />;
      case 'ballistic': return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'mortar': return <Crosshair className="w-3 h-3 text-orange-300" />;
      case 'anti_tank': return <Shield className="w-3 h-3 text-blue-400" />;
      case 'combined': return <ShieldAlert className="w-3 h-3 text-yellow-300" />;
      default: return <AlertTriangle className="w-3 h-3 text-white/50" />;
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="panel-attackpred">
      <PanelHeader
        title={language === 'ar' ? 'توقع الهجوم بالذكاء الاصطناعي' : 'AI Attack Predictor'}
        icon={<Crosshair className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="attackpred"
        extra={
          prediction?.dataPoints?.isEscalating ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/25 text-red-300 rounded-sm border border-red-500/30 animate-pulse" data-testid="badge-escalating">ESCALATING</span>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {!prediction ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40">Generating AI predictions...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Threat Level Banner */}
            <div className={`flex items-center justify-between p-2 rounded border ${threatBgs[prediction.overallThreatLevel] || threatBgs.HIGH}`} data-testid="threat-level-banner">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${threatColors[prediction.overallThreatLevel] || 'text-orange-400'}`} />
                <div>
                  <div className={`text-[11px] font-bold ${threatColors[prediction.overallThreatLevel] || 'text-orange-400'}`}>
                    {prediction.overallThreatLevel} THREAT
                  </div>
                  <div className="text-[9px] text-white/50">
                    AI Confidence: {Math.round(prediction.confidence * 100)}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-white/40">Next target</div>
                <div className="text-[10px] font-medium text-white/80" data-testid="text-next-target">{prediction.nextLikelyTarget}</div>
              </div>
            </div>

            {/* ═══ NEXT ATTACK WINDOW ═══ */}
            {prediction.nextAttackWindow && (
              <div className={`rounded border p-2.5 ${prediction.nextAttackWindow.label === 'imminent' ? 'border-red-500/50 bg-red-500/10' : prediction.nextAttackWindow.label === '~15min' ? 'border-orange-500/40 bg-orange-500/8' : 'border-yellow-500/25 bg-yellow-500/5'}`} data-testid="next-attack-window">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-3 h-3 text-yellow-400/80" />
                  <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{language === 'ar' ? 'توقيت الهجوم القادم' : 'Next Attack Window'}</span>
                  {prediction.nextAttackWindow.label === 'imminent' && (
                    <span className="px-1 py-0.5 text-[8px] font-black text-red-400 bg-red-500/20 rounded border border-red-500/40 animate-pulse tracking-wider">⚠ IMMINENT</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[22px] font-black font-mono leading-none ${prediction.nextAttackWindow.label === 'imminent' ? 'text-red-400' : prediction.nextAttackWindow.estimatedMinutes <= 30 ? 'text-orange-400' : 'text-yellow-300'}`}>
                      {prediction.nextAttackWindow.label === 'imminent' ? '< 5 MIN' : prediction.nextAttackWindow.label === 'unknown' ? '---' : prediction.nextAttackWindow.label.toUpperCase()}
                    </div>
                    <div className="text-[8px] text-white/40 mt-0.5 leading-tight max-w-[160px]">{prediction.nextAttackWindow.basis}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] text-white/40 mb-1">Timing confidence</div>
                    <div className="flex items-center gap-1 justify-end">
                      <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ${prediction.nextAttackWindow.confidence >= 0.7 ? 'bg-orange-400' : prediction.nextAttackWindow.confidence >= 0.45 ? 'bg-yellow-400' : 'bg-white/30'}`}
                          style={{ width: `${Math.round(prediction.nextAttackWindow.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-white/50">{Math.round(prediction.nextAttackWindow.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Velocity Strip */}
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 flex-1">
                <Activity className="w-3 h-3 text-amber-400/70" />
                <span className="text-[9px] text-white/50">{prediction.dataPoints.totalAlerts} alerts</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <Zap className="w-3 h-3 text-yellow-400/70" />
                <span className="text-[9px] text-white/50">{prediction.dataPoints.velocityPerHour}/hr</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                {prediction.dataPoints.isEscalating ? <TrendingUp className="w-3 h-3 text-red-400/70" /> : <TrendingDown className="w-3 h-3 text-green-400/70" />}
                <span className="text-[9px] text-white/50">{prediction.dataPoints.velocity30m} / 30m</span>
              </div>
            </div>

            {/* ═══ STRIKE PROBABILITY BY LOCATION ═══ */}
            {prediction.locationProbabilities && prediction.locationProbabilities.length > 0 && (
              <div className="space-y-1.5" data-testid="location-probabilities">
                <div className="flex items-center gap-1.5 px-1">
                  <MapPin className="w-3 h-3 text-red-400/70" />
                  <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{language === 'ar' ? 'احتمالية الاستهداف بالموقع' : 'Strike Probability by Location'}</span>
                </div>
                {prediction.locationProbabilities.sort((a, b) => b.probability - a.probability).map((lp, i) => (
                  <div key={i} className="px-1" data-testid={`loc-prob-${i}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] leading-none">{lp.countryFlag}</span>
                      <span className="text-[9px] font-medium text-white/80 flex-1 truncate">{lp.location}</span>
                      <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${lp.probability >= 0.7 ? 'bg-red-500/25 text-red-300' : lp.probability >= 0.4 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/8 text-white/40'}`}>
                        {Math.round(lp.probability * 100)}%
                      </span>
                      <span className="text-[8px] text-white/25 font-mono">{lp.threatType.replace('_', ' ')}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ${lp.probability >= 0.7 ? 'bg-gradient-to-r from-red-500 to-red-400' : lp.probability >= 0.5 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : lp.probability >= 0.3 ? 'bg-gradient-to-r from-yellow-500/80 to-yellow-400/60' : 'bg-white/20'}`}
                        style={{ width: `${Math.round(lp.probability * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Threat Predictions */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider px-1">{language === 'ar' ? 'توقعات التهديد' : 'Threat Predictions'}</div>
              {prediction.predictions.map((p, i) => (
                <div key={i} className={`p-2 rounded border ${severityColors[p.severity]} bg-opacity-50`} data-testid={`prediction-card-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <VectorIcon type={p.threatVector} />
                      <span className="text-[10px] font-semibold text-white/90">{p.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${p.probability >= 0.7 ? 'bg-red-500/25 text-red-300' : p.probability >= 0.4 ? 'bg-yellow-500/25 text-yellow-300' : 'bg-blue-500/25 text-blue-300'}`} data-testid={`text-probability-${i}`}>
                        {Math.round(p.probability * 100)}%
                      </span>
                      <span className="text-[9px] text-white/40 font-mono" data-testid={`text-timeframe-${i}`}>{p.timeframe}</span>
                    </div>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/10 mb-1.5">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ${p.probability >= 0.7 ? 'bg-red-400' : p.probability >= 0.4 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.round(p.probability * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[9px] text-white/50 leading-relaxed flex-1">{p.rationale}</div>
                    <div className="text-[8px] text-white/30 shrink-0">
                      {p.threatVector.replace('_', ' ')} | {p.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 rounded border border-amber-500/15 bg-amber-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3 h-3 text-amber-400/70" />
                <span className="text-[9px] font-semibold text-amber-300/80 uppercase tracking-wider">{language === 'ar' ? 'تحليل الأنماط' : 'Pattern Analysis'}</span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed" data-testid="text-pattern-summary">{prediction.patternSummary}</p>
            </div>

            <div className="p-2 rounded border border-border bg-muted/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="w-3 h-3 text-orange-400/70" />
                <span className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">{language === 'ar' ? 'اتجاه التصعيد' : 'Escalation Vector'}</span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed" data-testid="text-escalation-vector">{prediction.escalationVector}</p>
            </div>

            {prediction.dataPoints.topRegions.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] font-semibold text-white/40 uppercase tracking-wider px-1">{language === 'ar' ? 'مناطق مستهدفة' : 'Targeted Regions'}</div>
                {prediction.dataPoints.topRegions.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-1" data-testid={`region-bar-${i}`}>
                    <span className="text-[9px] text-white/60 w-20 truncate">{r.region}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/40 transition-all duration-500"
                        style={{ width: `${Math.min(100, (r.count / Math.max(...prediction.dataPoints.topRegions.map(x => x.count), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/40 font-mono w-8 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[8px] text-white/20 text-center pt-1" data-testid="text-generated-at">
              Updated: {new Date(prediction.generatedAt).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

