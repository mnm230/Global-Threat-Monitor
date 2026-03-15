import { useState, useMemo } from 'react';
import {
  Siren, Clock, MapPin, AlertTriangle, ChevronDown, ChevronRight, Volume2, VolumeX, Shield, Timer,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';
import type { SirenAlert } from '@shared/schema';
import { ScrollShadow } from '@/components/shared/scroll-shadow';

const THREAT_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  rocket: { en: 'ROCKET FIRE', ar: 'إطلاق صواريخ', icon: '🚀' },
  missile: { en: 'MISSILE LAUNCH', ar: 'إطلاق صاروخ', icon: '💥' },
  uav: { en: 'HOSTILE UAV', ar: 'طائرة مسيرة معادية', icon: '✈️' },
  hostile_aircraft: { en: 'HOSTILE AIRCRAFT', ar: 'طائرة معادية', icon: '⚠️' },
};

export function SirensPanel({ sirens, language, onClose }: { sirens: SirenAlert[]; language: 'en' | 'ar'; onClose?: () => void }) {
  const sorted = [...sirens].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const THREAT_ACCENT: Record<string, string> = { rocket: '#ef4444', missile: '#a855f7', uav: '#f59e0b', hostile_aircraft: '#3b82f6' };
  const THREAT_ICON: Record<string, string> = { rocket: '🚀', missile: '⚡', uav: '🛸', hostile_aircraft: '✈️' };

  const regionGroups = useMemo(() => {
    const groups: Record<string, SirenAlert[]> = {};
    sorted.forEach(s => {
      const region = language === 'ar' ? (s.regionAr || s.region) : s.region;
      if (!groups[region]) groups[region] = [];
      groups[region].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [sorted, language]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Siren Alerts' : 'صفارات الإنذار'}
        icon={<Siren className="w-3.5 h-3.5" />}
        live
        count={sirens.length}
        onClose={onClose}
        feedKey="sirens"
      />
      {sirens.length === 0 && (
        <div className="px-3 py-8 text-center">
          <Shield className="w-6 h-6 mx-auto mb-2" style={{ color: 'rgba(16,185,129,0.4)' }} />
          <p className="text-[12px] font-bold" style={{ color: 'rgba(16,185,129,0.5)' }}>ALL CLEAR</p>
          <p className="text-[10px] text-muted-foreground/30 mt-1">{language === 'en' ? 'No active siren alerts' : 'لا توجد صفارات إنذار نشطة'}</p>
        </div>
      )}

      {sirens.length > 0 && (
        <div className="shrink-0 px-3 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.03)' }}>
          {Object.entries(
            sorted.reduce((acc, s) => { acc[s.threatType] = (acc[s.threatType] || 0) + 1; return acc; }, {} as Record<string, number>)
          ).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="text-[13px] leading-none">{THREAT_ICON[type] || '🚀'}</span>
              <span className="text-[12px] font-black ra-font-mono" style={{ color: THREAT_ACCENT[type] || '#ef4444' }}>{count}</span>
              <span className="text-[10px] font-bold uppercase ra-font-mono" style={{ color: `${THREAT_ACCENT[type] || '#ef4444'}88`, letterSpacing: '0.06em' }}>
                {(THREAT_LABELS[type] || THREAT_LABELS.rocket).en}
              </span>
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] ra-font-mono font-bold tracking-[0.15em]" style={{ color: 'rgba(239,68,68,0.3)' }}>OREF</span>
        </div>
      )}

      <ScrollShadow className="flex-1 min-h-0">
        <div className="p-2" style={{ scrollbarWidth: 'none' }}>
        {regionGroups.map(([region, regionSirens]) => (
          <div key={region} className="mb-2">
            <div className="flex items-center gap-2 px-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] ra-font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{region}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[10px] font-black ra-font-mono" style={{ color: 'rgba(239,68,68,0.5)' }}>{regionSirens.length}</span>
            </div>
            <div className="space-y-[3px]">
              {regionSirens.map((s) => {
                const threat = THREAT_LABELS[s.threatType] || THREAT_LABELS.rocket;
                const accent = THREAT_ACCENT[s.threatType] || '#ef4444';
                const icon = THREAT_ICON[s.threatType] || '🚀';
                const elapsed = Math.floor((Date.now() - new Date(s.timestamp).getTime()) / 1000);
                const remaining = s.countdown > 0 ? Math.max(0, s.countdown - elapsed) : 0;
                const isCritical = remaining > 0 && remaining <= 30;
                return (
                  <div
                    key={s.id}
                    className="flex items-center rounded-sm overflow-hidden hover-elevate"
                    style={{
                      background: isCritical ? `${accent}0a` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isCritical ? `${accent}30` : `${accent}18`}`,
                    }}
                    data-testid={`siren-panel-${s.id}`}
                  >
                    <div className="self-stretch shrink-0" style={{ width: '3px', background: accent }} />
                    <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2">
                      <span className="text-[13px] leading-none shrink-0">{icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-extrabold truncate leading-tight" style={{ color: `${accent}dd` }}>
                          {language === 'ar' ? s.locationAr : s.location}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 truncate leading-tight mt-0.5 ra-font-mono">
                          {timeAgo(s.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold uppercase ra-font-mono px-1.5 py-0.5 rounded-sm leading-none" style={{ color: `${accent}bb`, background: `${accent}15`, border: `1px solid ${accent}25`, letterSpacing: '0.06em' }}>
                          {language === 'ar' ? threat.ar : threat.en}
                        </span>
                        {remaining > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm ra-font-mono" style={{
                            background: isCritical ? `${accent}20` : `${accent}10`,
                            border: `1px solid ${isCritical ? `${accent}40` : `${accent}20`}`,
                          }}>
                            <Timer className="w-[10px] h-[10px]" style={{ color: `${accent}99` }} />
                            <span className="text-[11px] font-black tabular-nums leading-none" style={{ color: isCritical ? accent : `${accent}cc` }}>
                              {remaining}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </ScrollShadow>
    </div>
  );
}


