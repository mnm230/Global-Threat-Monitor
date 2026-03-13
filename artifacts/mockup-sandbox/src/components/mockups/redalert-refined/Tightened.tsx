import React, { useState } from 'react';
import { Search, Shield, History } from 'lucide-react';

// --- MOCK DATA ---
const ALERTS = [
  { id: 1, city: 'Tel Aviv', country: '🇮🇱', threat: 'rockets', typeCode: 'RKT', countdown: 45, severity: 'critical', region: 'Central Israel', timestamp: '14:32:01' },
  { id: 2, city: 'Haifa', country: '🇮🇱', threat: 'missiles', typeCode: 'MSL', countdown: 90, severity: 'urgent', region: 'Northern Israel', timestamp: '14:31:45' },
  { id: 3, city: 'Kiryat Shmona', country: '🇮🇱', threat: 'rockets', typeCode: 'RKT', countdown: 12, severity: 'critical', region: 'Galilee Panhandle', timestamp: '14:31:12' },
  { id: 4, city: 'Ashkelon', country: '🇮🇱', threat: 'rockets', typeCode: 'RKT', countdown: 0, severity: 'critical', region: 'Southern Israel', timestamp: '14:30:59' },
  { id: 5, city: 'Metula', country: '🇮🇱', threat: 'uav_intrusion', typeCode: 'UAV', countdown: 180, severity: 'standard', region: 'Northern Israel', timestamp: '14:30:10' },
  { id: 6, city: 'Safed', country: '🇮🇱', threat: 'hostile_aircraft', typeCode: 'ACF', countdown: 30, severity: 'warning', region: 'Upper Galilee', timestamp: '14:29:55' },
  { id: 7, city: 'Sderot', country: '🇮🇱', threat: 'rockets', typeCode: 'RKT', countdown: -1, severity: 'expired', region: 'Southern Israel', timestamp: '14:25:00' },
  { id: 8, city: 'Nahariya', country: '🇮🇱', threat: 'missiles', typeCode: 'MSL', countdown: -1, severity: 'expired', region: 'Western Galilee', timestamp: '14:20:12' },
];

const SIRENS = [
  { id: 1, city: 'Nahariya', threat: 'rocket', color: '#dc2626' },
  { id: 2, city: 'Shlomi', threat: 'missile', color: '#b91c1c' },
  { id: 3, city: 'Acre', threat: 'uav', color: '#991b1b' },
];

// --- STYLES ---
const theme = {
  bg: 'hsl(222, 28%, 4%)',
  panelBg: 'rgba(255, 255, 255, 0.02)',
  divider: 'rgba(255, 255, 255, 0.06)',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  red: '#ef4444',
  redDark: '#dc2626',
  blue: '#3b82f6',
  green: '#22c55e',
  fontMono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  radius: '3px',
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily: theme.fontMono,
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 20px',
    boxSizing: 'border-box',
    textTransform: 'uppercase',
    fontVariantNumeric: 'tabular-nums',
  },
  panel: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: theme.bg,
    border: `1px solid ${theme.divider}`,
    borderRadius: theme.radius,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    borderBottom: `1px solid ${theme.divider}`,
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    backgroundColor: theme.red,
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  pulseDotSiren: {
    width: '6px',
    height: '6px',
    backgroundColor: theme.red,
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  headerTitle: {
    fontWeight: 900,
    fontSize: '12px',
    letterSpacing: '0.15em',
    color: theme.red,
  },
  countBadge: {
    backgroundColor: theme.redDark,
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '0 6px',
    height: '18px',
    lineHeight: '18px',
    borderRadius: theme.radius,
    display: 'inline-flex',
    alignItems: 'center',
  },
  livePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: theme.green,
    border: `1px solid rgba(34, 197, 94, 0.3)`,
    fontSize: '9px',
    fontWeight: 'bold',
    height: '18px',
    padding: '0 6px',
    borderRadius: theme.radius,
    display: 'inline-flex',
    alignItems: 'center',
    letterSpacing: '0.05em',
  },
  threatIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: theme.textMuted,
    marginLeft: 'auto',
  },
  threatIconBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    height: '18px',
  },
  filtersRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px',
    borderBottom: `1px solid ${theme.divider}`,
    height: '34px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    height: '100%',
  },
  tab: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: theme.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    letterSpacing: '0.05em',
  },
  tabActive: {
    color: 'white',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: 'white',
  },
  searchIcon: {
    color: theme.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: theme.radius,
  },
  searchInput: {
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${theme.divider}`,
    borderRadius: theme.radius,
    color: 'white',
    fontSize: '10px',
    padding: '0 6px',
    height: '20px',
    width: '60px',
    fontFamily: theme.fontMono,
    outline: 'none',
  },
  countryFiltersRow: {
    display: 'flex',
    padding: '8px 10px',
    gap: '6px',
    borderBottom: `1px solid ${theme.divider}`,
    overflowX: 'auto',
  },
  countryChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '18px',
    padding: '0 6px',
    border: `1px solid ${theme.divider}`,
    borderRadius: theme.radius,
    fontSize: '10px',
    fontWeight: 'bold',
    color: theme.textMuted,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  countryChipActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderBottom: `1px solid ${theme.divider}`,
    position: 'relative',
    gap: '10px',
    minHeight: '44px',
  },
  alertEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
  },
  countdownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '32px',
    borderRadius: theme.radius,
    flexShrink: 0,
  },
  countdownNumber: {
    fontSize: '14px',
    fontWeight: 900,
    lineHeight: 1,
    color: 'white',
  },
  countdownLabel: {
    fontSize: '7px',
    fontWeight: 'bold',
    opacity: 0.7,
    marginTop: '1px',
    color: 'white',
  },
  alertDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  alertCityLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cityName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  regionText: {
    fontSize: '10px',
    color: theme.textMuted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  alertMetaLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgePill: {
    height: '18px',
    padding: '0 4px',
    borderRadius: theme.radius,
    border: `1px solid ${theme.divider}`,
    fontSize: '9px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    color: theme.textMuted,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tgBadge: {
    height: '18px',
    padding: '0 4px',
    borderRadius: theme.radius,
    border: `1px solid rgba(59, 130, 246, 0.3)`,
    fontSize: '9px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    color: theme.blue,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  timestamp: {
    fontSize: '9px',
    color: theme.textMuted,
    marginLeft: 'auto',
  },
  sirenFooter: {
    borderTop: `1px solid ${theme.red}`,
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sirenHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sirenTitle: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: theme.red,
    letterSpacing: '0.1em',
  },
  sirenChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  sirenChip: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '18px',
    padding: '0 6px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: `1px solid ${theme.divider}`,
    borderRadius: theme.radius,
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
  },
  sirenChipEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '2px',
  },
  bottomFooter: {
    padding: '8px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1px solid ${theme.divider}`,
  },
  footerText: {
    fontSize: '9px',
    fontWeight: 'bold',
    color: 'white',
    opacity: 0.20,
    letterSpacing: '0.1em',
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'urgent': return '#b91c1c';
    case 'warning': return '#991b1b';
    case 'standard': return '#3f0a0a';
    case 'expired': return 'transparent';
    default: return 'transparent';
  }
};

export function Tightened() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      <div style={styles.panel}>
        
        {/* HEADER BAR */}
        <div style={styles.headerRow}>
          <div style={styles.pulseDot} />
          <div style={styles.headerTitle}>ALERTS</div>
          <div style={styles.countBadge}>{ALERTS.length}</div>
          <div style={styles.livePill}>LIVE</div>
          
          <div style={styles.threatIcons}>
            <div style={styles.threatIconBadge}>🚀 <span style={{color: 'white'}}>3</span></div>
            <div style={styles.threatIconBadge}>⚡ <span style={{color: 'white'}}>1</span></div>
            <div style={styles.threatIconBadge}>🛸 <span style={{color: 'white'}}>2</span></div>
          </div>
        </div>

        {/* FILTER TABS & SEARCH */}
        <div style={styles.filtersRow}>
          <div style={styles.tabsContainer}>
            {['ALL', 'RKT', 'MSL', 'UAV', 'ACF'].map(tab => (
              <div 
                key={tab} 
                style={{...styles.tab, ...(activeTab === tab ? styles.tabActive : {})}}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {activeTab === tab && <div style={styles.tabUnderline} />}
              </div>
            ))}
          </div>
          <div 
            style={styles.searchIcon}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? (
              <input 
                type="text" 
                placeholder="SRC..." 
                style={styles.searchInput}
                autoFocus
                onBlur={() => setSearchOpen(false)}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <Search size={12} strokeWidth={3} />
            )}
          </div>
        </div>

        {/* COUNTRY FILTER CHIPS */}
        <div style={styles.countryFiltersRow}>
          <div style={{...styles.countryChip, ...styles.countryChipActive}}>
            🇮🇱 <span>6</span>
          </div>
          <div style={styles.countryChip}>
            🇱🇧 <span>2</span>
          </div>
          <div style={styles.countryChip}>
            🇾🇪 <span>0</span>
          </div>
        </div>

        {/* ALERT ROWS (TRIAGE LIST) */}
        <div style={styles.alertsList}>
          {ALERTS.map(alert => (
            <div key={alert.id} style={styles.alertRow}>
              <div style={{...styles.alertEdge, backgroundColor: getSeverityColor(alert.severity)}} />
              
              <div style={{
                ...styles.countdownBox, 
                backgroundColor: alert.severity === 'expired' ? 'transparent' : getSeverityColor(alert.severity),
                border: alert.severity === 'expired' ? `1px solid ${theme.divider}` : 'none'
              }}>
                {alert.countdown >= 0 ? (
                  <>
                    <span style={{...styles.countdownNumber, color: alert.severity === 'expired' ? theme.textMuted : 'white'}}>
                      {alert.countdown === 0 ? '!!' : alert.countdown}
                    </span>
                    <span style={{...styles.countdownLabel, color: alert.severity === 'expired' ? theme.textMuted : 'white'}}>SEC</span>
                  </>
                ) : (
                  <History size={12} color={theme.textMuted} />
                )}
              </div>

              <div style={styles.alertDetails}>
                <div style={styles.alertCityLine}>
                  <span style={{...styles.cityName, opacity: alert.severity === 'expired' ? 0.5 : 1}}>{alert.city}</span>
                  <span style={{opacity: alert.severity === 'expired' ? 0.5 : 1}}>{alert.country}</span>
                  <span style={styles.regionText}>{alert.region}</span>
                </div>
                
                <div style={styles.alertMetaLine}>
                  <div style={styles.badgePill}>{alert.typeCode}</div>
                  {alert.countdown >= 0 && (
                    <>
                      <div style={{...styles.badgePill, color: theme.green, borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.05)'}}>LIVE</div>
                      <div style={styles.tgBadge}>TG</div>
                    </>
                  )}
                  <span style={styles.timestamp}>{alert.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SIREN FOOTER */}
        <div style={styles.sirenFooter}>
          <div style={styles.sirenHeader}>
            <div style={styles.pulseDotSiren} />
            <div style={styles.sirenTitle}>SIRENS</div>
            <div style={styles.countBadge}>{SIRENS.length}</div>
          </div>
          <div style={styles.sirenChips}>
            {SIRENS.map(siren => (
              <div key={siren.id} style={styles.sirenChip}>
                <div style={{...styles.sirenChipEdge, backgroundColor: siren.color}} />
                <span style={{marginLeft: '4px'}}>{siren.city}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div style={styles.bottomFooter}>
          <div style={styles.footerText}>OREF HOME FRONT CMD</div>
          <div style={styles.footerText}>TOTAL: 1,492</div>
        </div>

      </div>
    </div>
  );
}
