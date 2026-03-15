import React, { useState, useEffect, useMemo } from 'react';

// Types
const SEVERITIES = ['CRIT', 'HIGH', 'ELEV', 'INFO'] as const;
type Severity = typeof SEVERITIES[number];

type EventState = 'pending' | 'acknowledged' | 'dismissed' | 'escalated';

interface IntelEvent {
  id: string;
  timestamp: string; // ISO string
  createdAt: number; // ms timestamp for timer
  severity: Severity;
  type: string;
  location: string;
  description: string;
  state: EventState;
  escalated?: boolean;
  handledAt?: number;
}

// Mock Data Generator
const generateMockData = (): IntelEvent[] => {
  const types = [
    "UAV_DETECT", "ROCKET_FIRE", "SIREN_ACT", "SHIP_MOV", 
    "FLIGHT_DEV", "THERMAL_ANOMALY", "INTEL_INTERCEPT", "BORDER_BREACH",
    "SIGINT_ALERT", "TROOP_MVMT", "COMMS_BLACKOUT", "RADAR_CONTACT"
  ];
  const locations = [
    "NORTHERN_SECTOR", "SOUTHERN_CMD", "NAVAL_BASE_ALPHA", "AIRSPACE_ZULU", 
    "DMZ_SECTOR_7", "URBAN_CENTER_1", "COASTAL_RADAR", "OFFSHORE_RIG",
    "SECTOR_4", "ALPHA_OUTPOST", "CHARLIE_POINT", "DELTA_ZONE"
  ];
  
  const events: IntelEvent[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    const isCrit = Math.random() > 0.85;
    const isHigh = !isCrit && Math.random() > 0.6;
    const isElev = !isCrit && !isHigh && Math.random() > 0.5;
    const severity = isCrit ? "CRIT" : isHigh ? "HIGH" : isElev ? "ELEV" : "INFO";
    
    // Create timestamps in the past 15 minutes
    const offsetMs = Math.floor(Math.random() * 15 * 60 * 1000);
    const eventTime = now - offsetMs;
    
    events.push({
      id: `EVT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${i}`,
      timestamp: new Date(eventTime).toISOString(),
      createdAt: eventTime,
      severity,
      type: types[Math.floor(Math.random() * types.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      description: `Intercepted signals indicate abnormal activity matching profile ${Math.floor(Math.random() * 999)}. Units advised to maintain high alert. Response vectors calculated.`,
      state: 'pending'
    });
  }
  
  return events;
};

// Utils
const formatWaitTime = (ms: number) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
};

const getSeverityColor = (severity: Severity) => {
  switch (severity) {
    case "CRIT": return "text-[#ff4444]";
    case "HIGH": return "text-[#ffb74d]";
    case "ELEV": return "text-[#ffeb3b]";
    case "INFO": return "text-[#4caf50]";
    default: return "text-[#aaa]";
  }
};

export default function TriageQueue() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [handledExpanded, setHandledExpanded] = useState(false);

  useEffect(() => {
    setEvents(generateMockData());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Actions
  const handleAcknowledge = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, state: 'acknowledged', handledAt: Date.now() } : e));
  };

  const handleEscalate = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, escalated: true } : e));
  };

  const handleDismiss = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, state: 'dismissed', handledAt: Date.now() } : e));
  };

  // Derived state
  const pendingActionable = useMemo(() => {
    return events
      .filter(e => e.state === 'pending' && (e.severity === 'CRIT' || e.severity === 'HIGH'))
      .sort((a, b) => a.createdAt - b.createdAt); // oldest first (longest waiting)
  }, [events]);

  const monitoringEvents = useMemo(() => {
    return events
      .filter(e => e.state === 'pending' && (e.severity === 'ELEV' || e.severity === 'INFO'))
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
  }, [events]);

  const handledEvents = useMemo(() => {
    return events
      .filter(e => e.state === 'acknowledged')
      .sort((a, b) => (b.handledAt || 0) - (a.handledAt || 0));
  }, [events]);

  const dismissedCount = events.filter(e => e.state === 'dismissed').length;

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden text-[#d4d4d4]" 
      style={{ 
        backgroundColor: '#0a0808', 
        fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace',
        fontSize: '13px'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .triage-scrollbar::-webkit-scrollbar { width: 6px; }
        .triage-scrollbar::-webkit-scrollbar-track { background: #0a0808; border-left: 1px solid #1a1a1a; }
        .triage-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        .triage-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .pulse-text { animation: subtle-pulse 2s infinite ease-in-out; }
        .pulse-bg { animation: subtle-pulse 2s infinite ease-in-out; background-color: rgba(255, 68, 68, 0.05); }
      `}} />

      {/* Header Bar */}
      <header className="shrink-0 border-b border-[#333] bg-[#111] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-[#ff4444] font-bold text-base tracking-widest">WARROOM // TRIAGE</h1>
          <div className="h-4 w-[1px] bg-[#333]"></div>
          <div className="text-[#888]">{new Date(now).toISOString().substring(11, 19)}Z</div>
        </div>
        <div className="flex gap-4 text-xs font-bold">
          <span className="text-[#ffb74d]">PENDING: {pendingActionable.length + monitoringEvents.length}</span>
          <span className="text-[#4caf50]">HANDLED: {handledEvents.length}</span>
          <span className="text-[#888]">DISMISSED: {dismissedCount}</span>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* REQUIRES ACTION */}
        <div className="flex flex-col shrink-0 max-h-[50vh] border-b border-[#333] bg-[#1a0f0f]">
          <div className="px-4 py-2 border-b border-[#333] flex justify-between items-center bg-[#221111]">
            <h2 className="text-[#ff4444] font-bold text-xs tracking-widest">REQUIRES ACTION ({pendingActionable.length})</h2>
            <div className="text-[10px] text-[#ff4444] opacity-70">CRIT & HIGH PRIORITY</div>
          </div>
          
          <div className="overflow-y-auto triage-scrollbar p-4 flex flex-col gap-3">
            {pendingActionable.length === 0 ? (
              <div className="text-[#888] text-center py-4 text-xs">NO PENDING ACTIONS</div>
            ) : (
              pendingActionable.map(evt => {
                const waitMs = now - evt.createdAt;
                const isCrit = evt.severity === 'CRIT';
                
                return (
                  <div 
                    key={evt.id} 
                    className={`border border-[#333] p-3 flex flex-col gap-2 ${isCrit ? 'border-l-4 border-l-[#ff4444] bg-[#1f1111]' : 'border-l-4 border-l-[#ffb74d] bg-[#151310]'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <span className={`font-bold ${getSeverityColor(evt.severity)}`}>[{evt.severity}]</span>
                        <span className="text-white">{evt.type}</span>
                        {evt.escalated && <span className="text-[#ffb74d]" title="Escalated">⚡</span>}
                      </div>
                      <div className={`text-xs font-bold ${isCrit ? 'text-[#ff4444] pulse-text' : 'text-[#ffb74d]'}`}>
                        WAITING {formatWaitTime(waitMs)}
                      </div>
                    </div>
                    
                    <div className="text-xs text-[#aaa] flex gap-4">
                      <span>LOC: {evt.location}</span>
                      <span>TIME: {evt.timestamp.substring(11, 19)}Z</span>
                      <span>ID: {evt.id}</span>
                    </div>
                    
                    <div className="text-sm text-[#ddd]">
                      {evt.description}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-2">
                      <button 
                        onClick={() => handleEscalate(evt.id)}
                        disabled={evt.escalated}
                        className="px-3 py-1 text-xs border border-[#ffb74d] text-[#ffb74d] hover:bg-[#ffb74d] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#ffb74d] cursor-pointer"
                      >
                        ESC
                      </button>
                      <button 
                        onClick={() => handleAcknowledge(evt.id)}
                        className="px-4 py-1 text-xs font-bold border border-[#4caf50] text-[#4caf50] hover:bg-[#4caf50] hover:text-black transition-colors cursor-pointer"
                      >
                        ACK
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MONITORING */}
        <div className="flex flex-col flex-1 min-h-0 bg-[#0a0808]">
          <div className="px-4 py-2 border-b border-[#333] bg-[#111]">
            <h2 className="text-[#aaa] font-bold text-xs tracking-widest">MONITORING ({monitoringEvents.length})</h2>
          </div>
          <div className="overflow-y-auto triage-scrollbar p-4 flex flex-col gap-2">
            {monitoringEvents.length === 0 ? (
               <div className="text-[#888] text-center py-4 text-xs">NO MONITORING EVENTS</div>
            ) : (
              monitoringEvents.map(evt => (
                <div key={evt.id} className="border border-[#222] p-2 flex items-center gap-4 hover:bg-[#111] transition-colors">
                  <span className={`w-12 text-xs font-bold ${getSeverityColor(evt.severity)}`}>{evt.severity}</span>
                  <span className="w-16 text-xs text-[#888]">{evt.timestamp.substring(11, 19)}Z</span>
                  <span className="w-32 text-xs truncate text-[#ccc]">{evt.type}</span>
                  <span className="w-32 text-xs truncate text-[#888]">{evt.location}</span>
                  <span className="flex-1 text-xs truncate text-[#666]">{evt.description}</span>
                  <button 
                    onClick={() => handleDismiss(evt.id)}
                    className="px-2 py-1 text-[10px] border border-[#444] text-[#888] hover:bg-[#333] hover:text-white transition-colors cursor-pointer"
                  >
                    DISMISS
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HANDLED */}
        <div className="flex flex-col shrink-0 border-t border-[#333] bg-[#0d140d]">
          <div 
            className="px-4 py-2 border-b border-[#333] flex justify-between items-center cursor-pointer hover:bg-[#152015] transition-colors"
            onClick={() => setHandledExpanded(!handledExpanded)}
          >
            <h2 className="text-[#4caf50] font-bold text-xs tracking-widest">
              HANDLED ({handledEvents.length})
            </h2>
            <div className="text-xs text-[#4caf50]">
              {handledExpanded ? '▼ COLLAPSE' : '▲ EXPAND'}
            </div>
          </div>
          
          {handledExpanded && (
            <div className="overflow-y-auto triage-scrollbar p-4 max-h-[30vh] flex flex-col gap-2">
              {handledEvents.length === 0 ? (
                <div className="text-[#888] text-center py-2 text-xs">NO HANDLED EVENTS</div>
              ) : (
                handledEvents.map(evt => (
                  <div key={evt.id} className="border border-[#2a3c2a] bg-[#111a11] p-2 flex items-center gap-4 opacity-70">
                    <span className="text-[#4caf50] text-xs font-bold">✓ HANDLED</span>
                    <span className={`w-12 text-xs ${getSeverityColor(evt.severity)}`}>{evt.severity}</span>
                    <span className="w-32 text-xs truncate text-[#ccc]">{evt.type}</span>
                    <span className="flex-1 text-xs truncate text-[#666]">{evt.description}</span>
                    <span className="text-[10px] text-[#4caf50]">
                      ACK'D AT {evt.handledAt ? new Date(evt.handledAt).toISOString().substring(11, 19) : ''}Z
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
