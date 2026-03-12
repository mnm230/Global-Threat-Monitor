import React, { useState, useEffect } from "react";

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
    const rand = Math.random();
    let severity: Severity = "INFO";
    if (rand < 0.10) severity = "CRIT";
    else if (rand < 0.30) severity = "HIGH";
    else if (rand < 0.60) severity = "ELEV";
    
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

export default function GravityFeed() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [time, setTime] = useState(new Date().toISOString().substring(11, 19));
  
  useEffect(() => {
    setEvents(generateMockData());
    const timer = setInterval(() => {
      setTime(new Date().toISOString().substring(11, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const critCount = events.filter(e => e.severity === 'CRIT').length;
  const highCount = events.filter(e => e.severity === 'HIGH').length;
  const elevCount = events.filter(e => e.severity === 'ELEV').length;
  const infoCount = events.filter(e => e.severity === 'INFO').length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-300 p-4 flex flex-col uppercase tracking-wider relative overflow-hidden" style={{ fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0a0f; border-left: 1px solid #1f2937; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        
        @keyframes pulse-red {
          0%, 100% { background-color: rgba(239, 68, 68, 0.05); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2) inset; border-color: rgba(239, 68, 68, 0.5); }
          50% { background-color: rgba(239, 68, 68, 0.12); box-shadow: 0 0 25px rgba(239, 68, 68, 0.4) inset; border-color: rgba(239, 68, 68, 0.9); }
        }
        
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}} />
      
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50 z-0"></div>

      {/* Header */}
      <header className="border-b border-gray-700 pb-3 mb-4 flex justify-between items-end shrink-0 z-10 relative">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-widest text-white">WARROOM<span className="text-[#ef4444] ml-2">GRAVITY</span></h1>
          <div className="flex items-center gap-2 border border-[#ef4444] px-3 py-1 bg-[#ef4444]/10">
            <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></div>
            <span className="text-xs text-[#ef4444] font-bold">THREAT: CRITICAL</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">SYS.TIME</div>
          <div className="text-xl text-white font-bold">{time}Z</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-6 flex-1 min-h-0 z-10 relative">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-6 shrink-0">
          <div className="border border-gray-800 bg-[#0a0a0f] p-4">
            <h2 className="text-xs text-gray-500 mb-4 border-b border-gray-800 pb-2">SEVERITY DISTRIBUTION</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#ef4444] text-sm font-bold">CRITICAL</span>
                <span className="text-lg text-white font-bold">{critCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#f59e0b] text-sm font-bold">HIGH</span>
                <span className="text-lg text-white font-bold">{highCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#60a5fa] text-sm font-bold">ELEVATED</span>
                <span className="text-lg text-white font-bold">{elevCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280] text-sm font-bold">INFO</span>
                <span className="text-lg text-white font-bold">{infoCount}</span>
              </div>
            </div>
            
            <div className="mt-6 border-t border-gray-800 pt-4">
              <h2 className="text-xs text-gray-500 mb-2">NETWORK STATUS</h2>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>SENSORS</span> <span className="text-green-500">NOMINAL</span></div>
                <div className="flex justify-between"><span>SAT_UPLINK</span> <span className="text-green-500">SECURE</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Feed - Gravity Based */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-10">
          <div className="flex flex-col gap-3">
            {events.map((evt) => {
              if (evt.severity === 'CRIT') {
                return (
                  <div key={evt.id} className="min-h-[120px] border border-[#ef4444] bg-[#ef4444]/5 p-5 mb-2 relative" style={{ animation: 'pulse-red 3s infinite' }}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-[#ef4444] text-white text-xs px-2 py-1 font-bold">CRIT</span>
                        <span className="text-2xl font-bold text-white tracking-wider">{evt.type}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{evt.timestamp}</span>
                    </div>
                    <div className="text-[#ef4444] text-lg mb-2 font-bold bg-[#ef4444]/10 inline-block px-2 py-1 border border-[#ef4444]/30">{evt.location}</div>
                    <p className="text-gray-200 text-sm leading-relaxed mt-2">{evt.description}</p>
                    <div className="mt-3 text-xs text-[#ef4444] font-bold border-t border-[#ef4444]/30 pt-2">ID: {evt.id} // IMMEDIATE ACTION REQUIRED</div>
                  </div>
                );
              }
              
              if (evt.severity === 'HIGH') {
                return (
                  <div key={evt.id} className="min-h-[60px] border-l-[4px] border-[#f59e0b] bg-[#111115] border-y border-r border-gray-800 p-4 mb-1 flex flex-col justify-center hover:bg-[#1a1a20] transition-colors">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-20 shrink-0 text-sm text-gray-400">{evt.timestamp.substring(0,8)}</div>
                      <div className="w-16 shrink-0 font-bold text-[#f59e0b] text-base">HIGH</div>
                      <div className="w-40 shrink-0 font-bold text-gray-100 text-base">{evt.type}</div>
                      <div className="w-40 shrink-0 bg-[#f59e0b]/10 text-[#f59e0b] px-2 py-1 border border-[#f59e0b]/30 truncate text-sm">{evt.location}</div>
                      <div className="flex-1 text-gray-300 truncate text-sm ml-2">{evt.description}</div>
                    </div>
                  </div>
                );
              }
              
              if (evt.severity === 'ELEV') {
                return (
                  <div key={evt.id} className="min-h-[40px] bg-transparent border border-gray-800 p-2 flex items-center gap-4 hover:bg-[#111115] transition-colors text-sm">
                    <div className="w-20 shrink-0 text-gray-500">{evt.timestamp.substring(0,8)}</div>
                    <div className="w-16 shrink-0 text-[#60a5fa] font-bold">ELEV</div>
                    <div className="w-40 shrink-0 text-gray-300">{evt.type}</div>
                    <div className="w-40 shrink-0 text-[#60a5fa] opacity-80 truncate">{evt.location}</div>
                    <div className="flex-1 text-gray-400 truncate">{evt.description}</div>
                  </div>
                );
              }
              
              // INFO
              return (
                <div key={evt.id} className="min-h-[24px] flex items-center gap-4 text-xs opacity-50 hover:opacity-100 transition-opacity py-1 px-2 border-l border-gray-800">
                  <div className="w-20 shrink-0 text-gray-600">{evt.timestamp.substring(0,8)}</div>
                  <div className="w-16 shrink-0 text-[#6b7280]">INFO</div>
                  <div className="w-40 shrink-0 text-gray-500">{evt.type}</div>
                  <div className="flex-1 text-gray-600 truncate">{evt.location} - {evt.description}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center text-gray-600 text-xs tracking-widest pb-4 border-t border-gray-800 pt-4">
            END OF LIVE FEED
          </div>
        </div>
      </div>
    </div>
  );
}
