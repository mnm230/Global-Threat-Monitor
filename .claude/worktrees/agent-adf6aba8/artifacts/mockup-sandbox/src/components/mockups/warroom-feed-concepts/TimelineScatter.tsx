import React, { useState, useEffect, useMemo } from 'react';

const SEVERITIES = ['CRIT', 'HIGH', 'ELEV', 'INFO'] as const;
type Severity = typeof SEVERITIES[number];

interface IntelEvent {
  id: string;
  timestamp: Date;
  severity: Severity;
  type: string;
  location: string;
  description: string;
  yJitter: number;
}

const EVENT_TYPES = [
  'UAV_DETECT', 'ROCKET_FIRE', 'SIREN_ACT', 'SHIP_MOV', 
  'FLIGHT_DEV', 'THERMAL_ANOMALY', 'INTEL_INTERCEPT', 'BORDER_BREACH'
];

const LOCATIONS = [
  'NORTHERN_SECTOR', 'SOUTHERN_CMD', 'NAVAL_BASE_ALPHA', 'AIRSPACE_ZULU', 
  'DMZ_SECTOR_7', 'URBAN_CENTER_1', 'COASTAL_RADAR', 'OFFSHORE_RIG'
];

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Generate mock data with clusters
const generateMockData = (): IntelEvent[] => {
  const events: IntelEvent[] = [];
  const now = new Date();
  
  // Create 3-4 clusters
  const numClusters = 3 + Math.floor(Math.random() * 2);
  const clusterCenters = Array.from({ length: numClusters }, () => 
    new Date(now.getTime() - Math.random() * TWO_HOURS_MS)
  );

  let eventId = 1;

  const createEvent = (time: Date, forceSeverity?: Severity): IntelEvent => {
    const isCrit = forceSeverity === 'CRIT' || Math.random() > 0.9;
    const isHigh = forceSeverity === 'HIGH' || (!isCrit && Math.random() > 0.7);
    const severity = forceSeverity || (isCrit ? 'CRIT' : isHigh ? 'HIGH' : Math.random() > 0.5 ? 'ELEV' : 'INFO');
    
    return {
      id: `EVT-${String(eventId++).padStart(4, '0')}`,
      timestamp: time,
      severity,
      type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      description: `Detected anomalous activity signature. Tracking vectors and analyzing threat potential. Ground units advised.`,
      yJitter: (Math.random() - 0.5) * 60 // +/- 30% jitter within band
    };
  };

  // Background noise
  for (let i = 0; i < 30; i++) {
    const time = new Date(now.getTime() - Math.random() * TWO_HOURS_MS);
    events.push(createEvent(time));
  }

  // Clusters
  clusterCenters.forEach(center => {
    const burstSize = 5 + Math.floor(Math.random() * 10);
    const hasCrit = Math.random() > 0.3;
    
    if (hasCrit) {
      events.push(createEvent(new Date(center.getTime()), 'CRIT'));
    }
    
    for (let i = 0; i < burstSize; i++) {
      // cluster within +/- 3 minutes
      const time = new Date(center.getTime() + (Math.random() - 0.5) * 6 * 60 * 1000);
      events.push(createEvent(time, Math.random() > 0.8 ? 'HIGH' : undefined));
    }
  });

  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const SEVERITY_STYLES = {
  CRIT: { color: '#ff4444', size: 12, label: 'CRIT' },
  HIGH: { color: '#ffb74d', size: 10, label: 'HIGH' },
  ELEV: { color: '#2196f3', size: 8, label: 'ELEV' },
  INFO: { color: '#9e9e9e', size: 6, label: 'INFO' }
};

export default function TimelineScatter() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [now, setNow] = useState(new Date());
  const [hoveredEvent, setHoveredEvent] = useState<IntelEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<IntelEvent | null>(null);

  useEffect(() => {
    const initialEvents = generateMockData();
    setEvents(initialEvents);
    
    // Default select most recent CRIT
    const crits = initialEvents.filter(e => e.severity === 'CRIT');
    if (crits.length > 0) {
      setSelectedEvent(crits[crits.length - 1]);
    } else {
      setSelectedEvent(initialEvents[initialEvents.length - 1]);
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const timeStart = now.getTime() - TWO_HOURS_MS;
  const timeEnd = now.getTime();

  // Grid lines every 15 mins
  const gridLines = useMemo(() => {
    const lines = [];
    let t = Math.ceil(timeStart / (15 * 60 * 1000)) * (15 * 60 * 1000);
    while (t <= timeEnd) {
      lines.push(new Date(t));
      t += 15 * 60 * 1000;
    }
    return lines;
  }, [timeStart, timeEnd]);

  // Sparkline data (events per 2-minute bucket)
  const sparklineBuckets = 60; // 120 mins / 2
  const sparkline = useMemo(() => {
    const buckets = new Array(sparklineBuckets).fill(0);
    events.forEach(e => {
      const idx = Math.floor(((e.timestamp.getTime() - timeStart) / TWO_HOURS_MS) * sparklineBuckets);
      if (idx >= 0 && idx < sparklineBuckets) {
        buckets[idx]++;
      }
    });
    const max = Math.max(...buckets, 1);
    return buckets.map(v => v / max);
  }, [events, timeStart]);

  const activeEvent = hoveredEvent || selectedEvent;

  return (
    <div 
      className="flex flex-col h-screen w-full overflow-hidden text-gray-300"
      style={{ 
        backgroundColor: '#08080c', 
        fontFamily: '"JetBrains Mono", monospace',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-[#1a1a1e]">
        <div className="flex items-center gap-4">
          <div className="text-red-500 font-bold tracking-widest text-lg">WARROOM // TIMELINE VIEW</div>
          <div className="px-2 py-1 bg-[#1a1a1e] text-xs text-gray-400 border border-[#2a2a2e]">LIVE FEED</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500">UTC CLOCK</div>
            <div className="text-sm font-bold tracking-widest">{now.toISOString().substring(11, 19)}Z</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500">RANGE</div>
            <div className="text-sm text-blue-400">LAST 2H</div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        
        {/* Scatter Plot Area */}
        <div className="flex-1 flex flex-col relative border-r border-[#1a1a1e] bg-[#0a0a0f]"
             style={{ background: 'radial-gradient(circle at center, #111116 0%, #08080c 100%)' }}>
          
          {/* Y-Axis Labels & Band Backgrounds */}
          <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
            {SEVERITIES.map((sev, i) => (
              <div key={sev} className="flex-1 relative border-b border-[#1a1a1e]/50 last:border-b-0">
                <div className="absolute left-2 top-2 text-[10px] text-gray-600 font-bold tracking-wider opacity-50">
                  {sev}
                </div>
              </div>
            ))}
          </div>

          {/* X-Axis Grid */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {gridLines.map((time, i) => {
              const xPos = ((time.getTime() - timeStart) / TWO_HOURS_MS) * 100;
              return (
                <div 
                  key={i} 
                  className="absolute top-0 bottom-0 border-l border-[#1a1a1e] opacity-30"
                  style={{ left: \`\${xPos}%\` }}
                >
                  <div className="absolute bottom-2 left-1 text-[9px] text-gray-600">
                    {time.toISOString().substring(11, 16)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Points */}
          <div className="absolute inset-0 z-10 p-4">
            <div className="relative w-full h-full">
              {events.map(event => {
                const xPos = ((event.timestamp.getTime() - timeStart) / TWO_HOURS_MS) * 100;
                if (xPos < 0 || xPos > 100) return null;

                const bandIndex = SEVERITIES.indexOf(event.severity);
                const bandHeight = 100 / SEVERITIES.length;
                const baseY = bandIndex * bandHeight + (bandHeight / 2);
                
                // convert jitter from percentage of band to percentage of total height
                const yPos = baseY + (event.yJitter / 100 * bandHeight * 0.8);

                const style = SEVERITY_STYLES[event.severity];
                const isActive = activeEvent?.id === event.id;

                return (
                  <div
                    key={event.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-crosshair transition-all duration-200"
                    style={{
                      left: \`\${xPos}%\`,
                      top: \`\${yPos}%\`,
                      width: style.size,
                      height: style.size,
                      zIndex: isActive || event.severity === 'CRIT' ? 50 : 10
                    }}
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div 
                      className="w-full h-full rounded-full absolute inset-0"
                      style={{
                        backgroundColor: style.color,
                        boxShadow: \`0 0 \${isActive ? '12px' : '4px'} \${style.color}\`,
                        opacity: isActive ? 1 : 0.8,
                        transform: isActive ? 'scale(1.5)' : 'scale(1)'
                      }}
                    />
                    {event.severity === 'CRIT' && (
                      <div 
                        className="w-full h-full rounded-full absolute inset-0 animate-ping opacity-50"
                        style={{ backgroundColor: style.color }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/20 rounded-full animate-spin-slow" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-none bg-[#0a0a0f] flex flex-col z-20 overflow-y-auto"
             style={{ 
               boxShadow: '-10px 0 20px rgba(0,0,0,0.5)',
             }}>
          
          <div className="p-4 border-b border-[#1a1a1e]">
            <h2 className="text-xs text-gray-500 tracking-widest mb-1">SELECTED EVENT</h2>
            <div className="text-sm font-bold">
              {activeEvent ? activeEvent.id : 'NONE'}
            </div>
          </div>

          {activeEvent ? (
            <div className="flex-1 p-4 flex flex-col gap-6">
              
              <div>
                <div className="text-[10px] text-gray-500 mb-1">SEVERITY</div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: SEVERITY_STYLES[activeEvent.severity].color }}
                >
                  [{activeEvent.severity}]
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1">TIMESTAMP</div>
                <div className="text-sm text-gray-200">{activeEvent.timestamp.toISOString()}</div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1">CLASSIFICATION</div>
                <div className="text-sm text-blue-400 font-bold">{activeEvent.type}</div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1">LOCATION</div>
                <div className="text-sm text-gray-300">{activeEvent.location}</div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1">DESCRIPTION</div>
                <div className="text-sm text-gray-400 leading-relaxed border-l-2 border-[#1a1a1e] pl-3">
                  {activeEvent.description}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <button className="w-full py-2 bg-[#1a1a1e] hover:bg-[#2a2a2e] text-xs text-white border border-[#333] transition-colors">
                  VIEW FULL DOSSIER
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 flex items-center justify-center text-xs text-gray-600">
              SELECT NODE FOR DETAILS
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sparkline Bar */}
      <div className="flex-none h-16 border-t border-[#1a1a1e] bg-[#050508] flex p-2 gap-4">
        <div className="flex flex-col justify-center px-4 border-r border-[#1a1a1e]">
          <div className="text-[9px] text-gray-500">EVENT DENSITY</div>
          <div className="text-xs font-bold text-gray-300">{events.length} EVTS</div>
        </div>
        
        <div className="flex-1 flex items-end gap-[2px] py-1">
          {sparkline.map((val, i) => (
            <div 
              key={i} 
              className="flex-1 bg-blue-500/30 hover:bg-blue-400/50 transition-colors"
              style={{ 
                height: \`\${Math.max(val * 100, 5)}%\`,
                borderTop: val > 0.8 ? '1px solid #ff4444' : val > 0.5 ? '1px solid #ffb74d' : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: \`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      \`}} />
    </div>
  );
}
