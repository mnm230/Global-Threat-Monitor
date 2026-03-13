import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Crosshair, Radio, Activity, MapPin, Siren, AlertOctagon, TrendingUp, X } from 'lucide-react';

export function ConditionRed() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toISOString().substring(11, 19);

  return (
    <div className="cr-wrapper" style={{ fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace' }}>
      <style>{`
        .cr-wrapper {
          min-height: 100vh;
          background-color: hsl(222, 28%, 4%);
          background-image: linear-gradient(rgba(127, 29, 29, 0.06), rgba(127, 29, 29, 0.06));
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          color: #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-variant-numeric: tabular-nums;
        }

        .cr-dashboard {
          width: 800px;
          height: 500px;
          background: #0b1120;
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 3px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(220, 38, 38, 0.1);
        }

        .cr-warning-stripe {
          height: 4px;
          width: 100%;
          background: repeating-linear-gradient(
            45deg,
            #ef4444,
            #ef4444 10px,
            #450a0a 10px,
            #450a0a 20px
          );
          background-size: 28px 28px;
          animation: stripe-move 0.5s linear infinite;
        }

        @keyframes stripe-move {
          0% { background-position: 0 0; }
          100% { background-position: -28px 0; }
        }

        .cr-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(127, 29, 29, 0.1);
          border-bottom: 1px solid rgba(239, 68, 68, 0.25);
          font-size: 11px;
        }

        .cr-status-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cr-rapid-pulse {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: rapid-pulse 0.4s ease-in-out infinite alternate;
        }

        @keyframes rapid-pulse {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 8px #ef4444; }
        }

        .cr-seek-shelter {
          background: #ef4444;
          color: white;
          padding: 2px 6px;
          font-weight: bold;
          border-radius: 2px;
          animation: flash-shelter 0.8s infinite alternate;
        }

        @keyframes flash-shelter {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }

        .cr-main {
          display: flex;
          flex: 1;
          gap: 8px;
          padding: 8px;
          overflow: hidden;
        }

        .cr-tactical {
          flex: 0 0 65%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cr-sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cr-panel {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 3px;
          display: flex;
          flex-direction: column;
        }

        .cr-alerts-panel {
          flex: 1;
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.15);
        }

        .cr-panel-header {
          padding: 6px 8px;
          border-bottom: 1px solid rgba(239, 68, 68, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: bold;
          color: #ef4444;
        }

        .cr-alerts-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cr-count-badge {
          background: #ef4444;
          color: white;
          padding: 1px 6px;
          border-radius: 2px;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }

        .cr-live-badge {
          border: 1px solid #22c55e;
          color: #22c55e;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 9px;
        }

        .cr-alert-list {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px;
        }

        .cr-alert-row {
          display: flex;
          align-items: center;
          padding: 6px;
          background: rgba(127, 29, 29, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-left: 3px solid #ef4444;
          border-radius: 2px;
          gap: 8px;
          animation: slide-in 0.3s ease-out;
        }

        .cr-alert-row.critical {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
        }

        @keyframes slide-in {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .cr-countdown {
          width: 32px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #334155;
          color: #94a3b8;
          font-size: 11px;
          font-weight: bold;
          border-radius: 2px;
        }

        .cr-countdown.critical {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #f87171;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
          animation: countdown-pulse 0.8s infinite alternate;
        }
        
        .cr-countdown.now {
          background: #ef4444;
          color: white;
        }

        @keyframes countdown-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }

        .cr-city {
          flex: 1;
          font-size: 14px;
          font-weight: bold;
          color: #f1f5f9;
        }

        .cr-region {
          font-size: 9px;
          color: #94a3b8;
          margin-left: 6px;
        }

        .cr-threat-badge {
          font-size: 9px;
          padding: 1px 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          color: #cbd5e1;
        }

        .cr-sirens-strip {
          height: 48px;
          display: flex;
          gap: 6px;
        }
        
        .cr-siren-chip {
          flex: 1;
          background: rgba(127, 29, 29, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 8px;
          position: relative;
          overflow: hidden;
        }
        
        .cr-siren-chip::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #ef4444;
        }
        
        .cr-siren-label {
          font-size: 9px;
          color: #94a3b8;
        }
        
        .cr-siren-val {
          font-size: 11px;
          font-weight: bold;
          color: #f1f5f9;
        }

        .cr-map-panel {
          flex: 1;
          position: relative;
          background: #0f172a;
          overflow: hidden;
        }
        
        .cr-map-label {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 10px;
          color: #ef4444;
          font-weight: bold;
        }

        .cr-map-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .cr-map-target {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 10px #ef4444;
        }
        
        .cr-map-line {
          position: absolute;
          width: 2px;
          background: linear-gradient(to bottom, rgba(239, 68, 68, 0), #ef4444);
          transform-origin: top center;
        }

        .cr-telegram-panel {
          height: 80px;
        }
        
        .cr-tg-msg {
          padding: 6px 8px;
          border-bottom: 1px solid rgba(239, 68, 68, 0.1);
        }
        
        .cr-tg-time {
          font-size: 9px;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        
        .cr-tg-text {
          font-size: 10px;
          color: #ef4444;
          font-weight: bold;
        }

        .cr-collapsed-strip {
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 9px;
          color: rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.3);
          border: 1px dashed rgba(148, 163, 184, 0.2);
          border-radius: 2px;
        }

        .cr-bottom-bar {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          background: rgba(127, 29, 29, 0.15);
          border-top: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .cr-dim {
          opacity: 0.5;
        }
      `}</style>

      <div className="cr-dashboard">
        <div className="cr-warning-stripe"></div>
        <div className="cr-top-bar">
          <div className="cr-status-left">
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>WARROOM</span>
            <span className="cr-dim">|</span>
            <div className="cr-rapid-pulse"></div>
            <span style={{ color: '#f87171' }}>CONDITION RED - ACTIVE ENGAGEMENT</span>
          </div>
          <div className="cr-status-left">
            <span className="cr-seek-shelter">SEEK SHELTER</span>
            <span style={{ color: '#f87171' }}>{timeString} UTC</span>
          </div>
        </div>

        <div className="cr-main">
          <div className="cr-tactical">
            <div className="cr-panel cr-alerts-panel">
              <div className="cr-panel-header">
                <div className="cr-alerts-header-left">
                  <div className="cr-rapid-pulse"></div>
                  <span>ALERTS</span>
                  <span className="cr-count-badge">8</span>
                  <span className="cr-live-badge">LIVE</span>
                </div>
                <div className="cr-alerts-header-left cr-dim">
                  <Radio size={12} />
                  <Activity size={12} />
                  <MapPin size={12} />
                </div>
              </div>
              <div className="cr-alert-list">
                {[
                  { city: 'ASHKELON', region: 'LAKHISH', threat: 'ROCKET', countdown: 'NOW', critical: true, flag: '🇮🇱' },
                  { city: 'TEL AVIV', region: 'DAN', threat: 'BALLISTIC', countdown: '12', critical: true, flag: '🇮🇱' },
                  { city: 'SDEROT', region: 'GAZA ENVELOPE', threat: 'ROCKET', countdown: 'NOW', critical: true, flag: '🇮🇱' },
                  { city: 'KIRYAT SHMONA', region: 'UPPER GALILEE', threat: 'ROCKET', countdown: '5', critical: true, flag: '🇮🇱' },
                  { city: 'METULA', region: 'UPPER GALILEE', threat: 'ROCKET', countdown: '15', critical: false, flag: '🇮🇱' },
                  { city: 'HAIFA', region: 'CARMEL', threat: 'UAV', countdown: '45', critical: false, flag: '🇮🇱' },
                  { city: 'SAFED', region: 'UPPER GALILEE', threat: 'ROCKET', countdown: '90', critical: false, flag: '🇮🇱' },
                ].map((alert, i) => (
                  <div key={i} className={`cr-alert-row ${alert.critical ? 'critical' : ''}`} style={{ animationDelay: \`\${i * 0.05}s\` }}>
                    <div className={`cr-countdown ${alert.critical ? 'critical' : ''} ${alert.countdown === 'NOW' ? 'now' : ''}`}>
                      {alert.countdown}
                    </div>
                    <div className="cr-city">
                      {alert.city} <span className="cr-region">{alert.region}</span>
                    </div>
                    <span>{alert.flag}</span>
                    <span className="cr-threat-badge">{alert.threat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cr-sirens-strip">
              <div className="cr-siren-chip">
                <span className="cr-siren-label">TEL AVIV AREA</span>
                <span className="cr-siren-val">ACTIVE SIRENS</span>
              </div>
              <div className="cr-siren-chip">
                <span className="cr-siren-label">SOUTH (GAZA BORDER)</span>
                <span className="cr-siren-val">MULTIPLE IMPACTS</span>
              </div>
              <div className="cr-siren-chip">
                <span className="cr-siren-label">NORTH (LEBANON)</span>
                <span className="cr-siren-val">BARRAGE INCOMING</span>
              </div>
              <div className="cr-siren-chip" style={{ borderLeftColor: '#fcd34d' }}>
                <span className="cr-siren-label">CARMEL REGION</span>
                <span className="cr-siren-val" style={{ color: '#fcd34d' }}>UAV SUSPICION</span>
              </div>
            </div>
          </div>

          <div className="cr-sidebar">
            <div className="cr-panel cr-map-panel">
              <div className="cr-map-grid"></div>
              <span className="cr-map-label">TACTICAL MAP</span>
              
              {/* North cluster */}
              <div className="cr-map-target" style={{ top: '20%', left: '60%' }}></div>
              <div className="cr-map-target" style={{ top: '22%', left: '58%' }}></div>
              <div className="cr-map-target" style={{ top: '25%', left: '62%' }}></div>
              <div className="cr-map-target" style={{ top: '15%', left: '65%' }}></div>
              <div className="cr-map-line" style={{ top: '0', left: '62%', height: '22%', transform: 'rotate(15deg)' }}></div>
              <div className="cr-map-line" style={{ top: '0', left: '58%', height: '20%', transform: 'rotate(-5deg)' }}></div>

              {/* Central/South cluster */}
              <div className="cr-map-target" style={{ top: '60%', left: '40%' }}></div>
              <div className="cr-map-target" style={{ top: '65%', left: '42%' }}></div>
              <div className="cr-map-target" style={{ top: '75%', left: '35%' }}></div>
              <div className="cr-map-line" style={{ top: '30%', left: '20%', height: '35%', transform: 'rotate(-25deg)' }}></div>
              <div className="cr-map-line" style={{ top: '40%', left: '15%', height: '40%', transform: 'rotate(-30deg)' }}></div>
            </div>

            <div className="cr-panel cr-telegram-panel">
              <div className="cr-panel-header" style={{ borderBottom: 'none', paddingBottom: '2px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Crosshair size={10} /> RAW INTEL</span>
              </div>
              <div className="cr-tg-msg">
                <div className="cr-tg-time">14:31:55 UTC • OSINT_IL</div>
                <div className="cr-tg-text">MASSIVE BARRAGE FROM LEBANON, OVER 40 PROJECTILES IDENTIFIED</div>
              </div>
              <div className="cr-tg-msg">
                <div className="cr-tg-time">14:31:42 UTC • GAZA_REPORT</div>
                <div className="cr-tg-text">ROCKET LAUNCHES REPORTED TOWARDS ASHKELON / SDEROT</div>
              </div>
            </div>

            <div className="cr-collapsed-strip">
              MKT <span className="cr-dim">|</span> OSINT <span className="cr-dim">|</span> ANALYTICS
            </div>
          </div>
        </div>

        <div className="cr-bottom-bar">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={12} /> OREF HOME FRONT CMD
            </span>
            <span className="cr-dim">|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={12} /> ACTIVE THREATS: 8
            </span>
            <span className="cr-dim">|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Siren size={12} /> SIRENS: 4
            </span>
          </div>
          <div className="cr-dim" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} /> THREAT POSTURE: EXTREME
          </div>
        </div>
      </div>
    </div>
  );
}
