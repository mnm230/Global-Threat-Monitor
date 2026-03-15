import { lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { MapErrorBoundary } from '@/components/panel-error-boundary';
import type { RedAlert } from '@shared/schema';

const AlertMapComponent = lazy(() => import('@/components/alert-map'));

const ALERT_THREAT_META: Record<string, { label: string; icon: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  rockets:                    { label: 'Rockets',  icon: '\uD83D\uDE80', dotColor: '#ef4444', textColor: 'text-red-300',    bgColor: 'bg-red-500/15',    borderColor: 'border-red-500/30' },
  missiles:                   { label: 'Missiles', icon: '\uD83C\uDFAF', dotColor: '#f97316', textColor: 'text-orange-300', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30' },
  hostile_aircraft_intrusion: { label: 'Aircraft', icon: '\u2708',  dotColor: '#a855f7', textColor: 'text-purple-300', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30' },
  uav_intrusion:              { label: 'UAV',      icon: '\uD83D\uDD3A', dotColor: '#22d3ee', textColor: 'text-cyan-300',   bgColor: 'bg-cyan-500/15',   borderColor: 'border-cyan-500/30' },
};

export function AlertMapPanel({
  alerts,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  alerts: RedAlert[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const ME_COUNTRIES = new Set([
    'Israel', 'Palestine', 'Gaza', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran',
    'Saudi Arabia', 'Yemen', 'Oman', 'UAE', 'Qatar', 'Bahrain', 'Kuwait',
    'Egypt', 'Libya', 'Turkey', 'Cyprus',
  ]);

  const meAlerts = alerts.filter(a => !a.country || ME_COUNTRIES.has(a.country));

  const now = Date.now();
  const activeAlerts = meAlerts.filter(a => {
    const elapsed = (now - new Date(a.timestamp).getTime()) / 1000;
    return elapsed < a.countdown || a.countdown === 0;
  });

  const byThreat = meAlerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.threatType] = (acc[a.threatType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="alertmap-panel">
      <PanelHeader
        title={language === 'en' ? 'Alert Map' : '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0625\u0646\u0630\u0627\u0631\u0627\u062A'}
        icon={<MapPin className="w-3.5 h-3.5" />}
        live
        count={activeAlerts.length > 0 ? activeAlerts.length : undefined}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="alertmap"
        extra={
          <div className="flex items-center gap-1">
            {Object.entries(ALERT_THREAT_META).map(([key, meta]) => {
              const count = byThreat[key] || 0;
              if (count === 0) return null;
              return (
                <span key={key} className={`text-[9px] font-black px-1 py-0.5 rounded ${meta.bgColor} ${meta.textColor} border ${meta.borderColor} font-mono`}>
                  {meta.icon}{count}
                </span>
              );
            })}
          </div>
        }
      />

      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center" style={{background:'hsl(240 15% 5%)'}}>
                  <MapPin className="w-6 h-6 animate-pulse" style={{color:'rgba(99,102,241,0.7)'}} />
                </div>
              }
            >
              <AlertMapComponent alerts={meAlerts} language={language} />
            </Suspense>
          </MapErrorBoundary>
        </div>
      </div>
    </div>
  );
}
