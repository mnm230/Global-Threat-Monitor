import React, { useState, useEffect, useMemo } from "react";

// Types
const SEVERITIES = ["CRIT", "HIGH", "ELEV", "INFO"] as const;
type Severity = typeof SEVERITIES[number];

const THEATERS = [
  "NORTHERN_SECTOR",
  "SOUTHERN_CMD",
  "NAVAL_BASE_ALPHA",
  "AIRSPACE_ZULU",
  "DMZ_SECTOR_7",
  "URBAN_CENTER_1",
  "COASTAL_RADAR",
  "OFFSHORE_RIG"
] as const;
type Theater = typeof THEATERS[number];

const EVENT_TYPES = [
  "UAV_DETECT", "ROCKET_FIRE", "SIREN_ACT", "SHIP_MOV",
  "FLIGHT_DEV", "THERMAL_ANOMALY", "INTEL_INTERCEPT", "BORDER_BREACH",
  "RADAR_LOCK", "TROOP_MOV", "COMM_JAMMING", "UNIDENTIFIED_VESSEL"
];

interface IntelEvent {
  id: string;
  timestamp: string;
  dateObj: Date;
  severity: Severity;
  type: string;
  location: Theater;
  description: string;
}

// Generate Mock Data
const generateMockData = (): IntelEvent[] => {
  const events: IntelEvent[] = [];
  const now = new Date();
  
  // Create an uneven distribution profile
  const hotZones = ["NORTHERN_SECTOR", "DMZ_SECTOR_7"];
  const warmZones = ["NAVAL_BASE_ALPHA", "AIRSPACE_ZULU", "URBAN_CENTER_1"];
  // Cold zones will naturally get very few or no events
  
  // Total events
  const totalEvents = 85;
  
  for (let i = 0; i < totalEvents; i++) {
    // Bias towards hot zones
    const rand = Math.random();
    let location: Theater;
    if (rand < 0.5) {
      location = hotZones[Math.floor(Math.random() * hotZones.length)] as Theater;
    } else if (rand < 0.85) {
      location = warmZones[Math.floor(Math.random() * warmZones.length)] as Theater;
    } else {
      location = THEATERS[Math.floor(Math.random() * THEATERS.length)];
    }

    // Severity based on location heat
    let isCrit = false;
    let isHigh = false;
    if (hotZones.includes(location)) {
      isCrit = Math.random() > 0.7;
      isHigh = !isCrit && Math.random() > 0.5;
    } else if (warmZones.includes(location)) {
      isCrit = Math.random() > 0.9;
      isHigh = !isCrit && Math.random() > 0.6;
    } else {
      isCrit = Math.random() > 0.98;
      isHigh = !isCrit && Math.random() > 0.8;
    }
    
    const severity: Severity = isCrit ? "CRIT" : isHigh ? "HIGH" : Math.random() > 0.5 ? "ELEV" : "INFO";
    
    // Time distribution (mostly recent, some older up to 60 mins)
    const minutesAgo = Math.pow(Math.random(), 2) * 60; // Bias toward recent
    const eventTime = new Date(now.getTime() - minutesAgo * 60000);
    
    events.push({
      id: `EVT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${i}`,
      timestamp: eventTime.toISOString().substring(11, 19) + "Z",
      dateObj: eventTime,
      severity,
      type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      location,
      description: `Detected signature match for profile ${Math.floor(Math.random() * 999)}. Sector ${location} reporting irregular activity patterns.`
    });
  }
  
  // Sort descending by time
  return events.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
};

// Styling Helpers
const getSeverityColor = (severity: Severity | null) => {
  switch (severity) {
    case "CRIT": return "#ff4444";
    case "HIGH": return "#ffb74d";
    case "ELEV": return "#ffeb3b";
    case "INFO": return "#4caf50";
    default: return "#4caf50";
  }
};

const getSeverityTextColorClass = (severity: Severity | null) => {
  switch (severity) {
    case "CRIT": return "text-[#ff4444]";
    case "HIGH": return "text-[#ffb74d]";
    case "ELEV": return "text-[#ffeb3b]";
    case "INFO": return "text-[#4caf50]";
    default: return "text-[#4caf50]";
  }
};

export default function TheaterMap() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedZone, setExpandedZone] = useState<Theater | null>(null);

  useEffect(() => {
    setEvents(generateMockData());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Process data by theater
  const theaterData = useMemo(() => {
    const data: Record<Theater, IntelEvent[]> = {} as any;
    THEATERS.forEach(t => data[t] = []);
    
    events.forEach(e => {
      data[e.location].push(e);
    });
    
    return data;
  }, [events]);

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-gray-300 p-4 flex flex-col uppercase tracking-wider overflow-hidden" style={{ fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0c0c0c; border-left: 1px solid #1a1a1e; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        
        .pulse-border-crit {
          animation: pulseBorder 2s infinite;
        }
        @keyframes pulseBorder {
          0% { border-color: rgba(255, 68, 68, 0.4); box-shadow: 0 0 0 rgba(255, 68, 68, 0); }
          50% { border-color: rgba(255, 68, 68, 1); box-shadow: 0 0 15px rgba(255, 68, 68, 0.3); }
          100% { border-color: rgba(255, 68, 68, 0.4); box-shadow: 0 0 0 rgba(255, 68, 68, 0); }
        }
      `}} />

      {/* Header Bar */}
      <header className="border-b border-[#1a1a1e] pb-3 mb-4 flex justify-between items-end shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-widest text-white">WARROOM // THEATER VIEW</h1>
          <div className="px-2 py-0.5 bg-[#1a1a1e] text-xs font-bold text-gray-400 border border-[#333]">LIVE</div>
        </div>
        <div className="text-right flex gap-6 items-end">
          <div>
            <div className="text-xs opacity-50 mb-1">GLOBAL EVENTS (1H)</div>
            <div className="text-xl font-bold text-white">{events.length}</div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">SYS.TIME [UTC]</div>
            <div className="text-xl font-bold text-[#ffb74d]">{currentTime.toISOString().substring(11, 19)}Z</div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        
        {/* Theater Cards Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {THEATERS.map((theater) => {
              const zoneEvents = theaterData[theater];
              
              // Calculate zone stats
              const latestEvent = zoneEvents[0];
              const thirtyMinsAgo = new Date(currentTime.getTime() - 30 * 60000);
              const recentEvents = zoneEvents.filter(e => e.dateObj > thirtyMinsAgo);
              
              const isQuiet = recentEvents.length === 0;
              const hasCrit = recentEvents.some(e => e.severity === 'CRIT');
              
              const sevCounts = {
                CRIT: zoneEvents.filter(e => e.severity === 'CRIT').length,
                HIGH: zoneEvents.filter(e => e.severity === 'HIGH').length,
                ELEV: zoneEvents.filter(e => e.severity === 'ELEV').length,
                INFO: zoneEvents.filter(e => e.severity === 'INFO').length,
              };
              
              // Determine highest severity for coloring
              let highestSev: Severity | null = null;
              if (sevCounts.CRIT > 0) highestSev = "CRIT";
              else if (sevCounts.HIGH > 0) highestSev = "HIGH";
              else if (sevCounts.ELEV > 0) highestSev = "ELEV";
              else if (sevCounts.INFO > 0) highestSev = "INFO";
              
              const baseColor = getSeverityColor(highestSev);
              const isExpanded = expandedZone === theater;

              return (
                <div 
                  key={theater}
                  onClick={() => setExpandedZone(isExpanded ? null : theater)}
                  className={`
                    flex flex-col border transition-all cursor-pointer overflow-hidden
                    ${isQuiet ? 'bg-[#0c0c0c] border-[#1a1a1e] opacity-80' : 'bg-[#111116] border-[#22222a]'}
                    ${hasCrit ? 'pulse-border-crit bg-red-950/10' : ''}
                    ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 row-span-2' : ''}
                  `}
                  style={{ 
                    borderLeftWidth: '4px', 
                    borderLeftColor: isQuiet ? '#333' : baseColor 
                  }}
                >
                  {/* Card Header */}
                  <div className="p-3 border-b border-[#1a1a1e] flex justify-between items-start bg-black/20">
                    <div>
                      <h2 className={`font-bold text-sm ${isQuiet ? 'text-gray-500' : 'text-white'}`}>{theater}</h2>
                      <div className="flex gap-2 mt-1">
                        {hasCrit && <span className="px-1.5 py-0.5 bg-red-900/50 text-[#ff4444] text-[10px] border border-red-500/30">HOT</span>}
                        {isQuiet && <span className="px-1.5 py-0.5 bg-gray-900 text-gray-500 text-[10px] border border-gray-700">COLD</span>}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-3xl font-bold leading-none ${isQuiet ? 'text-gray-700' : 'text-white'}`}>
                        {zoneEvents.length}
                      </div>
                      <div className="text-[10px] opacity-50 mt-1">EVENTS</div>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-3 flex-1 flex flex-col">
                    {!isExpanded ? (
                      <>
                        <div className="flex-1 mb-3">
                          <div className="text-xs opacity-50 mb-1">LATEST ACTIVITY</div>
                          {latestEvent ? (
                            <div>
                              <div className="text-xs text-gray-300 font-bold truncate">{latestEvent.type}</div>
                              <div className="text-[10px] opacity-70 mt-0.5">{latestEvent.timestamp}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-600 italic">No recent activity</div>
                          )}
                        </div>
                        
                        {/* Severity Breakdown */}
                        <div className="flex items-center gap-3 pt-3 border-t border-[#1a1a1e]">
                          {SEVERITIES.map(sev => (
                            <div key={sev} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSeverityColor(sev), opacity: sevCounts[sev] > 0 ? 1 : 0.2 }} />
                              <span className={`text-xs ${sevCounts[sev] > 0 ? 'text-gray-300 font-bold' : 'text-gray-700'}`}>
                                {sevCounts[sev]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-[300px]">
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xs opacity-50">ZONE ACTIVITY LOG</div>
                          <div className="text-xs opacity-50">CLICK TO COLLAPSE</div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 border border-[#1a1a1e] bg-black/40">
                          {zoneEvents.length > 0 ? (
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="sticky top-0 bg-[#0a0a0e] z-10">
                                <tr className="border-b border-[#1a1a1e] text-gray-500">
                                  <th className="py-2 pl-2 font-normal w-24">TIME</th>
                                  <th className="py-2 font-normal w-16">SEV</th>
                                  <th className="py-2 font-normal w-32">TYPE</th>
                                  <th className="py-2 pr-2 font-normal">DETAILS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {zoneEvents.map(evt => (
                                  <tr key={evt.id} className="border-b border-[#1a1a1e]/50 hover:bg-white/5">
                                    <td className="py-2 pl-2 align-top text-gray-400">{evt.timestamp}</td>
                                    <td className={`py-2 align-top font-bold ${getSeverityTextColorClass(evt.severity)}`}>
                                      {evt.severity}
                                    </td>
                                    <td className="py-2 align-top text-gray-300">{evt.type}</td>
                                    <td className="py-2 pr-2 align-top text-gray-400 opacity-80">{evt.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="flex items-center justify-center h-full text-sm text-gray-600">
                              NO RECORDED EVENTS FOR THIS THEATER
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Timeline (Right Panel) */}
        <div className="w-80 shrink-0 border border-[#1a1a1e] bg-[#0c0c0c] flex flex-col">
          <div className="p-3 border-b border-[#1a1a1e] bg-black/40">
            <h2 className="text-sm font-bold text-white tracking-widest">GLOBAL TIMELINE</h2>
            <div className="text-[10px] opacity-50 mt-1">ALL THEATERS CHRONOLOGICAL</div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {events.map(evt => (
              <div key={evt.id} className="p-2 border border-[#1a1a1e] bg-black/20 hover:bg-[#1a1a1e] transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-[10px] font-bold ${getSeverityTextColorClass(evt.severity)}`}>
                    [{evt.severity}] {evt.type}
                  </div>
                  <div className="text-[10px] text-gray-500">{evt.timestamp}</div>
                </div>
                <div className="text-xs text-white mb-1 truncate">{evt.location}</div>
                <div className="text-[10px] text-gray-400 opacity-80 line-clamp-2 leading-tight">
                  {evt.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
