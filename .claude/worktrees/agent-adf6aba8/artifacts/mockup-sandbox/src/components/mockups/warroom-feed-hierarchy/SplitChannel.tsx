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
  
  // 45 events
  for (let i = 0; i < 45; i++) {
    const rand = Math.random();
    // 15% CRIT, 25% HIGH, 35% ELEV, 25% INFO
    let severity: Severity = "INFO";
    if (rand < 0.15) severity = "CRIT";
    else if (rand < 0.40) severity = "HIGH";
    else if (rand < 0.75) severity = "ELEV";
    else severity = "INFO";
    
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

export default function SplitChannel() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setEvents(generateMockData());
    
    const updateTime = () => {
      setTime(new Date().toISOString().substring(11, 19) + "Z");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const actionEvents = events.filter(e => e.severity === "CRIT" || e.severity === "HIGH");
  const contextEvents = events.filter(e => e.severity === "ELEV" || e.severity === "INFO");

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#a1a1aa] uppercase overflow-hidden" style={{ fontFamily: '"JetBrains Mono", "Courier New", Courier, monospace' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .action-scroll::-webkit-scrollbar { width: 6px; }
        .action-scroll::-webkit-scrollbar-track { background: #0f0a0a; border-left: 1px solid #1a1a1e; }
        .action-scroll::-webkit-scrollbar-thumb { background: #ef4444; }
        .action-scroll::-webkit-scrollbar-thumb:hover { background: #dc2626; }

        .context-scroll::-webkit-scrollbar { width: 6px; }
        .context-scroll::-webkit-scrollbar-track { background: #0a0a0f; border-left: 1px solid #1a1a1e; }
        .context-scroll::-webkit-scrollbar-thumb { background: #3b82f6; }
        .context-scroll::-webkit-scrollbar-thumb:hover { background: #2563eb; }

        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}} />

      {/* Header Bar */}
      <header className="flex justify-between items-center p-3 border-b border-[#1a1a1e] bg-[#09090b] shrink-0 z-10">
        <div className="flex items-baseline gap-4">
          <h1 className="text-xl font-bold tracking-widest text-white m-0 leading-none">WARROOM</h1>
          <span className="text-xs tracking-widest opacity-60 font-medium">SYS.TIME: {time}</span>
        </div>
        <div className="text-xs opacity-80 flex gap-4 bg-[#121215] px-3 py-1.5 border border-[#1a1a1e]">
          <span className="text-[#ef4444]">ACTION: {actionEvents.length}</span>
          <span className="text-[#3b82f6]">CONTEXT: {contextEvents.length}</span>
        </div>
      </header>

      {/* Sync Line */}
      <div className="w-full flex justify-center py-1 bg-[#09090b] border-b border-[#1a1a1e] shrink-0 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[1px] w-full bg-[#1a1a1e] absolute"></div>
        </div>
        <span className="text-[10px] bg-[#09090b] px-2 z-10 opacity-50 tracking-widest">SYNC_MARKER // {time}</span>
      </div>

      {/* Main Content: Two Columns */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: ACTION CHANNEL */}
        <div className="flex-1 flex flex-col bg-[#0f0a0a] min-w-0">
          <div className="p-3 border-b border-[#1a1a1e] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-[#ef4444] tracking-widest m-0 flex items-center gap-2">
              <span>▲</span> ACTION CHANNEL
            </h2>
            <span className="text-[10px] opacity-50">CRIT & HIGH PRIORITY ONLY</span>
          </div>
          
          <div className="flex-1 overflow-y-auto action-scroll p-4 space-y-4 text-[13px]">
            {actionEvents.map(evt => (
              evt.severity === "CRIT" ? (
                // CRIT EVENT
                <div key={evt.id} className="border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 relative flex flex-col gap-2">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ef4444]"></div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#ef4444] pulse-dot"></div>
                    <span className="font-bold text-[#ef4444] tracking-widest">[CRIT]</span>
                    <span className="opacity-70 font-mono text-xs">{evt.timestamp}</span>
                    <span className="opacity-70 text-xs ml-auto">{evt.id}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-[#ef4444]/20 pb-2">
                    <span className="font-bold text-white text-base tracking-widest">{evt.type}</span>
                    <span className="text-[#ef4444] font-medium">{evt.location}</span>
                  </div>
                  <div className="text-white/90 leading-relaxed font-mono">
                    {evt.description}
                  </div>
                </div>
              ) : (
                // HIGH EVENT
                <div key={evt.id} className="border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-2 pl-3 relative flex flex-col gap-1">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#f59e0b]"></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#f59e0b] tracking-widest">[HIGH]</span>
                    <span className="opacity-70 font-mono text-xs">{evt.timestamp}</span>
                    <span className="font-bold text-white tracking-widest ml-2">{evt.type}</span>
                    <span className="opacity-80 text-xs ml-auto">{evt.location}</span>
                  </div>
                  <div className="text-white/70 leading-snug font-mono text-xs mt-1">
                    {evt.description}
                  </div>
                </div>
              )
            ))}
            {actionEvents.length === 0 && (
              <div className="text-center opacity-30 py-8 text-xs tracking-widest">NO ACTION EVENTS</div>
            )}
            <div className="text-center opacity-30 py-4 text-[10px] tracking-widest">END OF ACTION FEED</div>
          </div>
        </div>

        {/* VERTICAL DIVIDER */}
        <div className="w-[1px] bg-[#1a1a1e] shrink-0"></div>

        {/* RIGHT COLUMN: CONTEXT CHANNEL */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f] min-w-0">
          <div className="p-3 border-b border-[#1a1a1e] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-[#3b82f6] tracking-widest m-0 flex items-center gap-2">
              <span>◆</span> CONTEXT CHANNEL
            </h2>
            <span className="text-[10px] opacity-50">ELEV & INFO PRIORITY ONLY</span>
          </div>

          <div className="flex-1 overflow-y-auto context-scroll p-2 space-y-1 text-[11px]">
            {contextEvents.map(evt => (
              evt.severity === "ELEV" ? (
                // ELEV EVENT
                <div key={evt.id} className="border border-[#1a1a1e] bg-[#3b82f6]/5 p-1.5 pl-2 relative flex flex-col">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#3b82f6]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#3b82f6] tracking-widest font-bold">ELEV</span>
                    <span className="opacity-50">{evt.timestamp}</span>
                    <span className="text-white/80 font-bold">{evt.type}</span>
                    <span className="opacity-60">{evt.location}</span>
                  </div>
                  <div className="text-white/50 truncate mt-0.5">
                    {evt.description}
                  </div>
                </div>
              ) : (
                // INFO EVENT
                <div key={evt.id} className="flex gap-2 items-center p-1 border-b border-[#1a1a1e]/50 hover:bg-white/5 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                  <span className="opacity-50">{evt.timestamp}</span>
                  <span className="text-[#a1a1aa] tracking-widest font-medium w-10">INFO</span>
                  <span className="text-white/70">{evt.type}</span>
                  <span className="opacity-50 mx-2">@</span>
                  <span className="opacity-70">{evt.location}</span>
                  <span className="text-white/40 truncate flex-1 ml-2">- {evt.description}</span>
                </div>
              )
            ))}
            {contextEvents.length === 0 && (
              <div className="text-center opacity-30 py-8 text-xs tracking-widest">NO CONTEXT EVENTS</div>
            )}
            <div className="text-center opacity-30 py-4 text-[10px] tracking-widest">END OF CONTEXT FEED</div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="flex justify-between items-center p-2 border-t border-[#1a1a1e] bg-[#09090b] shrink-0 text-[10px] tracking-widest opacity-60">
        <div>TOTAL EVENTS: {events.length}</div>
        <div className="flex gap-4">
          <span className="text-[#ef4444]">CRIT: {events.filter(e => e.severity === 'CRIT').length}</span>
          <span className="text-[#f59e0b]">HIGH: {events.filter(e => e.severity === 'HIGH').length}</span>
          <span className="text-[#3b82f6]">ELEV: {events.filter(e => e.severity === 'ELEV').length}</span>
          <span className="text-[#a1a1aa]">INFO: {events.filter(e => e.severity === 'INFO').length}</span>
        </div>
      </footer>
    </div>
  );
}
