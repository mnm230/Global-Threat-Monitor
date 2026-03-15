import React, { useState, useEffect } from 'react';
import { Shield, Radio, Crosshair, AlertTriangle, Search, History } from 'lucide-react';

const MOCK_ALERTS = [
  { id: '1', city: 'Ashkelon', flag: '🇮🇱', region: 'SOUTHERN ISRAEL', threat: 'rockets', initialCountdown: 0, timestamp: '14:02:01' },
  { id: '2', city: 'Kiryat Shmona', flag: '🇮🇱', region: 'NORTHERN ISRAEL', threat: 'rockets', initialCountdown: 12, timestamp: '14:01:49' },
  { id: '3', city: 'Safed', flag: '🇮🇱', region: 'UPPER GALILEE', threat: 'hostile_aircraft', initialCountdown: 30, timestamp: '14:01:31' },
  { id: '4', city: 'Tel Aviv', flag: '🇮🇱', region: 'DAN REGION', threat: 'rockets', initialCountdown: 45, timestamp: '14:01:16' },
  { id: '5', city: 'Haifa', flag: '🇮🇱', region: 'CARMEL', threat: 'missiles', initialCountdown: 90, timestamp: '14:00:31' },
  { id: '6', city: 'Metula', flag: '🇮🇱', region: 'UPPER GALILEE', threat: 'uav_intrusion', initialCountdown: 180, timestamp: '13:59:01' },
  { id: '7', city: 'Sderot', flag: '🇮🇱', region: 'GAZA ENVELOPE', threat: 'rockets', initialCountdown: -5, timestamp: '13:50:11' },
  { id: '8', city: 'Eilat', flag: '🇮🇱', region: 'SOUTHERN ISRAEL', threat: 'uav_intrusion', initialCountdown: -12, timestamp: '13:45:22' },
];

const MOCK_SIRENS = [
  { id: 's1', city: 'Nahariya', threat: 'rocket' },
  { id: 's2', city: 'Shlomi', threat: 'missile' },
  { id: 's3', city: 'Acre', threat: 'uav' },
];

const THREAT_STYLES: Record<string, { bg: string, text: string, label: string }> = {
  rockets: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', label: 'RKT' },
  missiles: { bg: 'rgba(168,85,247,0.08)', text: '#a855f7', label: 'MSL' },
  uav_intrusion: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', label: 'UAV' },
  hostile_aircraft: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', label: 'ACF' },
};

const TABS = ['ALL', 'RKT', 'MSL', 'UAV', 'ACF'];

export function Polished() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [alerts, setAlerts] = useState(MOCK_ALERTS.map(a => ({ ...a, currentCountdown: a.initialCountdown })));

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => prev.map(a => ({
        ...a,
        currentCountdown: a.currentCountdown > -999 ? a.currentCountdown - 1 : a.currentCountdown
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTierStyle = (seconds: number) => {
    if (seconds <= 0) return { bg: '#dc2626', color: '#ffffff' }; // critical red
    if (seconds <= 15) return { bg: '#ea580c', color: '#ffffff' }; // urgent orange
    if (seconds <= 45) return { bg: '#eab308', color: '#000000' }; // warning yellow
    if (seconds <= 90) return { bg: '#3b82f6', color: '#ffffff' }; // info blue
    return { bg: '#1f2937', color: '#9ca3af' }; // standard dark
  };

  const getLeftEdgeColor = (seconds: number) => {
    if (seconds <= 0) return 'transparent'; // expired
    if (seconds <= 15) return '#ef4444'; // critical
    if (seconds <= 45) return '#f97316'; // active
    return '#3b82f6';
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'hsl(222 28% 4%)', // Deep navy background
      fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
      display: 'flex',
      justifyContent: 'center',
      padding: '20px 10px',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      <style>{`
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); opacity: 1; }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); opacity: 0.5; }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(239,68,68,0.5); }
          50% { opacity: 0.8; text-shadow: 0 0 2px rgba(239,68,68,0.2); }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '380px',
        backgroundColor: '#0a0f18',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '3px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse-dot 1.5s infinite'
              }} />
              <span style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '0.08em' }}>ALERTS</span>
              <div style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '3px',
                fontSize: '18px',
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)',
                animation: 'pulse-glow 2s infinite'
              }}>
                {alerts.filter(a => a.currentCountdown > 0).length}
              </div>
            </div>
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <div style={{ width: '4px', height: '4px', backgroundColor: '#22c55e', borderRadius: '50%' }} />
              LIVE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={10} /> OREF
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Crosshair size={10} color="#ef4444" /> {alerts.filter(a => a.threat === 'rockets').length}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Radio size={10} color="#a855f7" /> {alerts.filter(a => a.threat === 'missiles').length}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Plane size={10} color="#f59e0b" /> {alerts.filter(a => a.threat.includes('uav') || a.threat.includes('aircraft')).length}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  padding: '8px 0',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  borderBottom: isActive ? '3px solid #ef4444' : '3px solid transparent',
                  boxShadow: isActive ? '0 2px 6px rgba(239,68,68,0.2)' : 'none',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Country Filter Chips */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto'
        }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '2px 8px',
            borderRadius: '3px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}>
            <span>🇮🇱</span>
            <span style={{ fontWeight: 700 }}>{alerts.length}</span>
          </div>
        </div>

        {/* Alerts List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {alerts.map((alert, index) => {
            const isExpired = alert.currentCountdown <= 0;
            const tierStyle = getTierStyle(alert.currentCountdown);
            const edgeColor = getLeftEdgeColor(alert.currentCountdown);
            const threatStyle = THREAT_STYLES[alert.threat] || THREAT_STYLES.rockets;
            
            return (
              <div key={alert.id} style={{
                position: 'relative',
                display: 'flex',
                padding: '8px 12px',
                backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                opacity: isExpired ? 0.4 : 1,
                transition: 'opacity 0.3s ease',
              }}>
                {/* Edge Bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: edgeColor
                }} />

                {/* Strikethrough for expired */}
                {isExpired && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '12px',
                    right: '12px',
                    height: '1px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    zIndex: 10
                  }} />
                )}

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '4px' }}>
                  {/* Countdown Timer */}
                  <div style={{
                    width: '46px',
                    padding: '4px 0',
                    textAlign: 'center',
                    backgroundColor: tierStyle.bg,
                    color: tierStyle.color,
                    borderRadius: '3px',
                    fontSize: '12px',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease'
                  }}>
                    {isExpired ? '00:00' : formatTime(alert.currentCountdown)}
                  </div>

                  {/* City Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{alert.city}</span>
                      <span style={{ fontSize: '12px' }}>{alert.flag}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.02em' }}>
                      {alert.region}
                    </div>
                  </div>

                  {/* Badges & Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {!isExpired && (
                        <span style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          padding: '1px 4px',
                          borderRadius: '2px',
                          fontSize: '8px',
                          fontWeight: 700
                        }}>LIVE</span>
                      )}
                      <span style={{
                        backgroundColor: threatStyle.bg,
                        color: threatStyle.text,
                        padding: '1px 4px',
                        borderRadius: '2px',
                        fontSize: '9px',
                        fontWeight: 700,
                        border: `1px solid ${threatStyle.text}20`
                      }}>
                        {threatStyle.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Siren Footer */}
        <div style={{
          borderTop: '1px solid #ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>SIRENS</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>{MOCK_SIRENS.length} ACTIVE</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {MOCK_SIRENS.map(siren => (
              <div
                key={siren.id}
                style={{
                  padding: '3px 8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '3px',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.border = '1px solid rgba(239,68,68,0.6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.border = '1px solid rgba(239,68,68,0.3)';
                }}
              >
                <AlertTriangle size={10} color="#ef4444" />
                {siren.city}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#05080c',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={10} />
            OREF HOME FRONT CMD
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>
            TOTAL: {MOCK_ALERTS.length}
          </div>
        </div>
      </div>
    </div>
  );
}
