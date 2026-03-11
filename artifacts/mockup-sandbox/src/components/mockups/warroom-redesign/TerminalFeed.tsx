import React, { useState, useEffect } from "react";

// Mock data generation
const SEVERITIES = ["CRIT", "HIGH", "ELEV", "INFO"] as const;
type Severity = typeof SEVERITIES[number];

interface IntelEvent {
  id: string;
  timestamp: string;
  severity: Severity;
  type: string;
  location: string;
  description: string;
}

const generateMockData = (): IntelEvent[] => {
  const types = [
    "UAV_DETECT", "ROCKET_FIRE", "SIREN_ACT", "SHIP_MOV", 
    "FLIGHT_DEV", "THERMAL_ANOMALY", "INTEL_INTERCEPT", "BORDER_BREACH"
  ];
  const locations = [
    "NORTHERN_SECTOR", "SOUTHERN_CMD", "NAVAL_BASE_ALPHA", "AIRSPACE_ZULU", 
    "DMZ_SECTOR_7", "URBAN_CENTER_1", "COASTAL_RADAR", "OFFSHORE_RIG"
  ];
  
  const events: IntelEvent[] = [];
  let currentTime = new Date();
  
  for (let i = 0; i < 45; i++) {
    const isCrit = Math.random() > 0.85;
    const isHigh = !isCrit && Math.random() > 0.7;
    const severity = isCrit ? "CRIT" : isHigh ? "HIGH" : Math.random() > 0.5 ? "ELEV" : "INFO";
    
    events.push({
      id: `EVT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${i}`,
      timestamp: currentTime.toISOString().substring(11, 19) + "Z",
      severity,
      type: types[Math.floor(Math.random() * types.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      description: `Intercepted signals indicate abnormal activity matching profile ${Math.floor(Math.random() * 999)}. Units advised to maintain high alert. Response vectors calculated.`
    });
    
    currentTime = new Date(currentTime.getTime() - Math.floor(Math.random() * 300000)); // Subtract up to 5 mins
  }
  
  return events;
};

const getSeverityColor = (severity: Severity) => {
  switch (severity) {
    case "CRIT": return "text-[#ff4444]";
    case "HIGH": return "text-[#ffb74d]"; // Using amber for high
    case "ELEV": return "text-[#ffeb3b]";
    case "INFO": return "text-[#4caf50]";
    default: return "text-[#ffb74d]";
  }
};

export function TerminalFeed() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  
  useEffect(() => {
    setEvents(generateMockData());
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-[#ffb74d] p-4 flex flex-col uppercase tracking-wider overflow-hidden" style={{ fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace' }}>
      {/* Header */}
      <header className="border-b-2 border-[#ffb74d] pb-2 mb-4 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-widest">WARROOM INTEL // CLASSIFIED // TOP SECRET</h1>
          <p className="text-sm opacity-70">SECURE LINK ESTABLISHED. MONITORING LIVE FEED.</p>
        </div>
        <div className="text-right">
          <div className="text-sm">SYS.TIME: {new Date().toISOString().substring(11, 19)}Z</div>
          <div className="text-sm">OP.MODE: SURVEILLANCE</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-6 shrink-0">
          <div className="border border-[#ffb74d] p-4">
            <h2 className="text-sm opacity-70 mb-2 border-b border-[#ffb74d]/50 pb-1">THREAT STATUS</h2>
            <div className="text-4xl font-bold text-[#ff4444] animate-pulse">ELEVATED</div>
            <div className="mt-2 text-xs opacity-70">DEFCON 3 ACTIVE</div>
          </div>
          
          <div className="border border-[#ffb74d] p-4 flex-1">
            <h2 className="text-sm opacity-70 mb-2 border-b border-[#ffb74d]/50 pb-1">SYSTEM STATS</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>SENSORS</span> <span className="text-[#4caf50]">104/104 ON</span></div>
              <div className="flex justify-between"><span>RADAR</span> <span className="text-[#4caf50]">NOMINAL</span></div>
              <div className="flex justify-between"><span>SAT_LINK</span> <span className="text-[#4caf50]">SECURE</span></div>
              <div className="flex justify-between"><span>UAV_NET</span> <span className="text-[#ffb74d]">DEGRADED</span></div>
              <div className="flex justify-between pt-2 mt-2 border-t border-[#ffb74d]/30">
                <span>ACTIVE_EVENTS</span> <span>{events.length}</span>
              </div>
              <div className="flex justify-between">
                <span>CRIT_EVENTS</span> <span className="text-[#ff4444]">{events.filter(e => e.severity === 'CRIT').length}</span>
              </div>
            </div>
            
            <div className="mt-8 border-t border-[#ffb74d]/50 pt-4">
              <div className="text-xs mb-1 opacity-70">DATA STREAM RATE</div>
              <div className="h-16 flex items-end gap-1">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="flex-1 bg-[#ffb74d] opacity-50" style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Feed */}
        <div className="flex-1 border border-[#ffb74d] p-4 overflow-y-auto text-sm leading-relaxed custom-scrollbar relative">
          <style dangerouslySetInnerHTML={{__html: `
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c0a; border-left: 1px solid #ffb74d; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffb74d; }
            .blinking-cursor { animation: blink 1s step-end infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          `}} />
          
          <div className="absolute top-4 right-4">
            <span className="blinking-cursor w-3 h-5 bg-[#ffb74d] inline-block"></span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#ffb74d]/30 text-xs opacity-70">
                <th className="pb-2 font-normal w-24">TIME</th>
                <th className="pb-2 font-normal w-16">SEV</th>
                <th className="pb-2 font-normal w-32">TYPE</th>
                <th className="pb-2 font-normal w-40">LOC</th>
                <th className="pb-2 font-normal">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, idx) => (
                <tr key={evt.id} className="border-b border-[#ffb74d]/10 hover:bg-[#ffb74d]/5 group">
                  <td className="py-2 align-top opacity-70">{evt.timestamp}</td>
                  <td className={`py-2 align-top font-bold ${getSeverityColor(evt.severity)}`}>[{evt.severity}]</td>
                  <td className="py-2 align-top opacity-90">{evt.type}</td>
                  <td className="py-2 align-top opacity-80">{evt.location}</td>
                  <td className="py-2 align-top opacity-90 break-words pr-4">
                    {evt.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 opacity-50 text-xs">END OF FEED // {events.length} RECORDS LISTED</div>
        </div>
      </div>
    </div>
  );
}

export default TerminalFeed;
