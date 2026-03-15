import { useState, memo, lazy, Suspense } from 'react';
import { AlertTriangle, Plane, Anchor, MapPin } from 'lucide-react';
import { PanelMaximizeButton, PanelMinimizeButton } from '@/components/panels/panel-chrome';
import { MapErrorBoundary } from '@/components/panel-error-boundary';
import type { ConflictEvent, FlightData, RedAlert, ThermalHotspot } from '@shared/schema';

const ConflictMap = lazy(() => import('@/components/conflict-map'));

const MAP_STYLE_OPTIONS = [
  { id: 'dark',    label: 'Dark',    provider: 'CARTO', dot: '#1e293b', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'light',   label: 'Light',   provider: 'CARTO', dot: '#e2e8f0', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'voyager', label: 'Voyager', provider: 'CARTO', dot: '#78350f', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'ofm',     label: 'Liberty', provider: 'OFM',   dot: '#1d4ed8', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'bright',  label: 'Bright',  provider: 'OFM',   dot: '#065f46', url: 'https://tiles.openfreemap.org/styles/bright' },
] as const;

function MapLegend({ activeView, language }: { activeView: string; language: 'en' | 'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const conflictItems = [
    { color: '#ef4444', label: t('Missile/Strike', '\u0635\u0627\u0631\u0648\u062E/\u0636\u0631\u0628\u0629') },
    { color: '#f97316', label: t('Airstrike', '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629') },
    { color: '#3b82f6', label: t('Naval Ops', '\u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u0631\u064A\u0629') },
    { color: '#eab308', label: t('Ground', '\u0628\u0631\u064A') },
    { color: '#22c55e', label: t('Air Defense', '\u062F\u0641\u0627\u0639 \u062C\u0648\u064A') },
    { color: '#a855f7', label: t('Nuclear Site', '\u0645\u0648\u0642\u0639 \u0646\u0648\u0648\u064A') },
  ];
  const flightItems = [
    { color: '#ef4444', label: t('Military', '\u0639\u0633\u0643\u0631\u064A') },
    { color: '#22d3ee', label: t('Surveillance', '\u0627\u0633\u062A\u0637\u0644\u0627\u0639') },
    { color: '#f9c31f', label: t('Commercial', '\u062A\u062C\u0627\u0631\u064A') },
  ];
  const items = activeView === 'conflict' ? conflictItems : flightItems;
  return (
    <div
      dir="ltr"
      style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 1000,
        background: 'rgba(4,7,16,0.96)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontFamily: "var(--font-mono)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 7 }}>
        {activeView === 'conflict' ? 'EVENT TYPES' : 'AIRCRAFT'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const MapSection = memo(function MapSection({
  events,
  flights,
  redAlerts,
  thermalHotspots,
  language,
  onClose,
  onMaximize,
  isMaximized,
  focusLocation,
  isVisible,
}: {
  events: ConflictEvent[];
  flights: FlightData[];
  redAlerts: RedAlert[];
  thermalHotspots: ThermalHotspot[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
  isVisible?: boolean;
}) {
  const [activeView, setActiveView] = useState<'conflict' | 'flights' | 'maritime'>('conflict');
  const [mapStyleId, setMapStyleId] = useState<typeof MAP_STYLE_OPTIONS[number]['id']>('dark');
  const mapStyleUrl = MAP_STYLE_OPTIONS.find(s => s.id === mapStyleId)!.url;
  const hasActiveThreats = redAlerts.length > 0;

  const MODES = [
    { key: 'conflict' as const, icon: AlertTriangle, label: 'CONFLICT', color: '#ef4444' },
    { key: 'flights'  as const, icon: Plane,         label: 'AIR',      color: '#22d3ee' },
    { key: 'maritime' as const, icon: Anchor,        label: 'MARITIME', color: '#3b82f6' },
  ];
  const activeMode = MODES.find(m => m.key === activeView)!;

  const statRow = [
    { label: 'EVT',  value: events.length,          color: '#f97316',                              pulse: false },
    { label: 'ALR',  value: redAlerts.length,        color: hasActiveThreats ? '#ef4444' : '#3a4555', pulse: hasActiveThreats },
    { label: 'AIR',  value: flights.length,          color: '#22d3ee',                              pulse: false },
    { label: 'FIRE', value: thermalHotspots.length,  color: '#ff6b35',                              pulse: false },
  ];

  return (
    <div className="h-full flex flex-col min-h-0" style={{ fontFamily: "var(--font-mono)" }}>
      <div
        className="panel-drag-handle shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ background: 'rgba(2,5,12,0.98)', borderBottom: '1px solid rgba(34,211,238,0.12)', position: 'relative' }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${activeMode.color}55 20%, ${activeMode.color}99 50%, ${activeMode.color}55 80%, transparent)`,
          transition: 'background 0.35s',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 42 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 2, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color, boxShadow: `0 0 8px ${activeMode.color}bb`, transition: 'background-color 0.2s ease' }} />
              <div style={{ width: 4, height: 4, borderRadius: 1, background: activeMode.color + '44', transition: 'background-color 0.2s ease' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,211,238,0.82)', lineHeight: 1.25 }}>THEATRE OF OPERATIONS</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', color: 'rgba(255,255,255,0.16)', lineHeight: 1 }}>MIDDLE EAST \u00B7 MENA \u00B7 GULF</span>
            </div>
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 2, flexShrink: 0 }} data-no-drag>
            {MODES.map(m => {
              const active = activeView === m.key;
              return (
                <button key={m.key} onClick={() => setActiveView(m.key)} data-testid={`button-map-${m.key}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 9px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: active ? `${m.color}1e` : 'transparent',
                    color: active ? m.color : 'rgba(255,255,255,0.22)',
                    boxShadow: active ? `0 0 0 1px ${m.color}44, inset 0 0 10px ${m.color}0d` : 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  }}
                >
                  <m.icon style={{ width: 9, height: 9 }} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
            {statRow.map(({ label, value, color, pulse }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: `${color}0e`, border: `1px solid ${color}22`, borderRadius: 4 }}>
                {pulse && <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'eas-flash 1.1s ease-in-out infinite', flexShrink: 0, transform: 'translateZ(0)' }} />}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
          </div>

          {hasActiveThreats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, animation: 'eas-pulse-border 1.2s ease-in-out infinite', flexShrink: 0, transform: 'translateZ(0)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 7px rgba(239,68,68,0.8)', animation: 'eas-flash 0.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', color: '#ef4444' }}>ACTIVE THREAT</span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: 2, flexShrink: 0 }} data-no-drag>
            {(['CARTO', 'OFM'] as const).map(provider => {
              const providerStyles = MAP_STYLE_OPTIONS.filter(s => s.provider === provider);
              const isProviderActive = providerStyles.some(s => s.id === mapStyleId);
              return (
                <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {provider !== 'CARTO' && <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.06)', margin: '0 1px' }} />}
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: isProviderActive ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.15)', padding: '0 3px', fontFamily: 'monospace' }}>
                    {provider}
                  </span>
                  {providerStyles.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setMapStyleId(s.id)}
                      data-testid={`button-map-style-${s.id}`}
                      title={`${s.provider} ${s.label}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.06em', borderRadius: 3, border: 'none',
                        cursor: 'pointer',
                        background: mapStyleId === s.id ? 'rgba(34,211,238,0.12)' : 'transparent',
                        color: mapStyleId === s.id ? '#22d3ee' : 'rgba(255,255,255,0.22)',
                        transition: 'background-color 0.12s ease, color 0.12s ease',
                      }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: 2, flexShrink: 0,
                        background: s.dot,
                        border: mapStyleId === s.id ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.15)',
                      }} />
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff6b35', boxShadow: '0 0 5px rgba(255,107,53,0.65)' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,107,53,0.65)' }}>FIRMS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.20)', borderRadius: 4, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.65)', animation: 'eas-flash 1.8s ease-in-out infinite', transform: 'translateZ(0)' }} />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(34,197,94,0.65)' }}>LIVE</span>
          </div>

          {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
          {onClose && <PanelMinimizeButton onMinimize={onClose} />}
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <MapErrorBoundary>
            <Suspense fallback={
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,5,12,0.96)', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.14)', borderTop: '2px solid rgba(34,211,238,0.85)', animation: 'spin 0.9s linear infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(34,211,238,0.45)', letterSpacing: '0.22em', fontFamily: 'monospace' }}>INITIALISING MAP</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', letterSpacing: '0.2em', fontFamily: 'monospace' }}>THEATRE OF OPERATIONS</span>
                </div>
              </div>
            }>
              <ConflictMap
                events={events}
                flights={flights}
                redAlerts={redAlerts}
                thermalHotspots={thermalHotspots}
                activeView={activeView}
                language={language}
                mapStyle={mapStyleUrl}
                focusLocation={focusLocation}
                isVisible={isVisible}
              />
            </Suspense>
          </MapErrorBoundary>
        </div>
        <MapLegend activeView={activeView} language={language} />
      </div>
    </div>
  );
});
