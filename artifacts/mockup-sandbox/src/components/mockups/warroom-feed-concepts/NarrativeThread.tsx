import React, { useState, useEffect } from "react";

// Types
const SEVERITIES = ["CRIT", "HIGH", "ELEV", "INFO"] as const;
type Severity = typeof SEVERITIES[number];

interface IntelEvent {
  id: string;
  timestamp: Date;
  severity: Severity;
  type: string;
  location: string;
  description: string;
}

interface Thread {
  id: string;
  location: string;
  events: IntelEvent[];
  severity: Severity;
  startTime: Date;
  endTime: Date;
  spanMinutes: number;
}

// Generate data to form specific threads
const generateMockData = (): IntelEvent[] => {
  const events: IntelEvent[] = [];
  const now = new Date();

  const addEvent = (
    minutesAgo: number,
    location: string,
    type: string,
    severity: Severity,
    desc: string
  ) => {
    events.push({
      id: `EVT-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      timestamp: new Date(now.getTime() - minutesAgo * 60000),
      severity,
      type,
      location,
      description: desc,
    });
  };

  // Thread 1: NORTHERN_SECTOR (4 events, 18 min)
  addEvent(5, "NORTHERN_SECTOR", "THERMAL_ANOMALY", "CRIT", "Multiple secondary explosions detected in grid 77.");
  addEvent(10, "NORTHERN_SECTOR", "ROCKET_FIRE", "CRIT", "Launch detected. Trajectory indicates populated areas.");
  addEvent(15, "NORTHERN_SECTOR", "SIREN_ACT", "HIGH", "Early warning systems activated across sector.");
  addEvent(23, "NORTHERN_SECTOR", "UAV_DETECT", "ELEV", "Unidentified drone entered airspace from north.");

  // Thread 2: NAVAL_BASE_ALPHA (3 events, 12 min)
  addEvent(30, "NAVAL_BASE_ALPHA", "BORDER_BREACH", "CRIT", "Perimeter sensors triggered at sector 4.");
  addEvent(36, "NAVAL_BASE_ALPHA", "INTEL_INTERCEPT", "HIGH", "Encrypted burst transmission intercepted near coastline.");
  addEvent(42, "NAVAL_BASE_ALPHA", "SHIP_MOV", "ELEV", "Unregistered vessel matching fast-attack profile approaching.");

  // Thread 3: AIRSPACE_ZULU (3 events, 8 min)
  addEvent(45, "AIRSPACE_ZULU", "UAV_DETECT", "HIGH", "Visual confirmation of loitering munition.");
  addEvent(50, "AIRSPACE_ZULU", "FLIGHT_DEV", "ELEV", "Commercial flight 884 instructed to divert.");
  addEvent(53, "AIRSPACE_ZULU", "FLIGHT_DEV", "INFO", "Anomalous radar track detected descending rapidly.");

  // Thread 4: URBAN_CENTER_1 (2 events, 5 min)
  addEvent(60, "URBAN_CENTER_1", "ROCKET_FIRE", "CRIT", "Impact confirmed in industrial zone.");
  addEvent(65, "URBAN_CENTER_1", "SIREN_ACT", "HIGH", "Warning sirens active.");

  // 25 Singletons
  const singletonLocations = ["SOUTHERN_CMD", "DMZ_SECTOR_7", "COASTAL_RADAR", "OFFSHORE_RIG"];
  const singletonTypes = ["SHIP_MOV", "THERMAL_ANOMALY", "INTEL_INTERCEPT", "UAV_DETECT"];
  
  // Distribute singletons across a wide time range to avoid clustering
  const timeSlots = [2, 12, 18, 28, 38, 48, 55, 62, 70, 75, 85, 95, 110, 125, 140, 160, 180, 200, 220, 250, 280, 300, 320, 350, 400];
  
  timeSlots.forEach((minAgo, i) => {
    const isCrit = Math.random() > 0.9;
    const isHigh = !isCrit && Math.random() > 0.8;
    const severity: Severity = isCrit ? "CRIT" : isHigh ? "HIGH" : Math.random() > 0.5 ? "ELEV" : "INFO";
    
    addEvent(
      minAgo,
      singletonLocations[i % singletonLocations.length],
      singletonTypes[i % singletonTypes.length],
      severity,
      `Routine monitoring logged isolated ${singletonTypes[i % singletonTypes.length].toLowerCase()} event.`
    );
  });

  return events;
};

// Group events into threads and singletons
const processEvents = (rawEvents: IntelEvent[]) => {
  // Sort ascending by time
  const sorted = [...rawEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  const locationGroups: Record<string, IntelEvent[]> = {};
  const threads: Thread[] = [];
  const singletons: IntelEvent[] = [];

  // Grouping logic: same location, within 20 mins of the LAST event in that group
  sorted.forEach(evt => {
    if (!locationGroups[evt.location]) {
      locationGroups[evt.location] = [evt];
    } else {
      const group = locationGroups[evt.location];
      const lastEvt = group[group.length - 1];
      const diffMins = (evt.timestamp.getTime() - lastEvt.timestamp.getTime()) / 60000;
      
      if (diffMins <= 20) {
        group.push(evt);
      } else {
        // Gap too large, finalize previous group
        if (group.length > 1) {
          threads.push(createThread(group));
        } else {
          singletons.push(group[0]);
        }
        // Start new group
        locationGroups[evt.location] = [evt];
      }
    }
  });

  // Finalize remaining groups
  Object.values(locationGroups).forEach(group => {
    if (group.length > 1) {
      threads.push(createThread(group));
    } else if (group.length === 1) {
      singletons.push(group[0]);
    }
  });

  return { threads, singletons };
};

const createThread = (events: IntelEvent[]): Thread => {
  // Determine highest severity
  const severityRank = { "CRIT": 4, "HIGH": 3, "ELEV": 2, "INFO": 1 };
  const threadSev = events.reduce((max, evt) => 
    severityRank[evt.severity] > severityRank[max] ? evt.severity : max
  , "INFO" as Severity);

  const startTime = events[0].timestamp;
  const endTime = events[events.length - 1].timestamp;
  const spanMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  return {
    id: `THR-${Math.floor(Math.random() * 10000)}`,
    location: events[0].location,
    events,
    severity: threadSev,
    startTime,
    endTime,
    spanMinutes
  };
};

const getSeverityColor = (severity: Severity, type: "text" | "border" | "bg" | "hex" = "text") => {
  const colors = {
    CRIT: { text: "text-[#ff4444]", border: "border-[#ff4444]", bg: "bg-[#ff4444]", hex: "#ff4444", subtle: "bg-[#ff4444]/5" },
    HIGH: { text: "text-[#ffb74d]", border: "border-[#ffb74d]", bg: "bg-[#ffb74d]", hex: "#ffb74d", subtle: "bg-[#ffb74d]/5" },
    ELEV: { text: "text-[#ffeb3b]", border: "border-[#ffeb3b]", bg: "bg-[#ffeb3b]", hex: "#ffeb3b", subtle: "bg-[#ffeb3b]/5" },
    INFO: { text: "text-[#4caf50]", border: "border-[#4caf50]", bg: "bg-[#4caf50]", hex: "#4caf50", subtle: "bg-[#4caf50]/5" }
  };
  return colors[severity][type] || colors[severity].text;
};

const getSeveritySubtleBg = (severity: Severity) => {
  switch (severity) {
    case "CRIT": return "bg-[#ff4444]/10";
    case "HIGH": return "bg-[#ffb74d]/10";
    case "ELEV": return "bg-[#ffeb3b]/10";
    case "INFO": return "bg-[#4caf50]/10";
  }
};

const formatTime = (date: Date) => date.toISOString().substring(11, 19) + "Z";

export default function NarrativeThread() {
  const [feedItems, setFeedItems] = useState<Array<{type: 'thread', data: Thread} | {type: 'singleton', data: IntelEvent}>>([]);
  const [stats, setStats] = useState({ threads: 0, singletons: 0, total: 0 });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const rawEvents = generateMockData();
    const { threads, singletons } = processEvents(rawEvents);
    
    setStats({
      threads: threads.length,
      singletons: singletons.length,
      total: rawEvents.length
    });

    const items = [
      ...threads.map(t => ({ type: 'thread' as const, data: t })),
      ...singletons.map(s => ({ type: 'singleton' as const, data: s }))
    ];

    // Sort by most recent event descending
    items.sort((a, b) => {
      const timeA = a.type === 'thread' ? a.data.endTime.getTime() : a.data.timestamp.getTime();
      const timeB = b.type === 'thread' ? b.data.endTime.getTime() : b.data.timestamp.getTime();
      return timeB - timeA;
    });

    setFeedItems(items);

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090d] text-[#e0e0e0] flex flex-col uppercase tracking-wider overflow-hidden" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <style dangerouslySetInnerHTML={{__html: \`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #09090d; border-left: 1px solid #333; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; }
        
        @keyframes pulse-ring {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(var(--ring-color), 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(var(--ring-color), 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(var(--ring-color), 0); }
        }
        
        .origin-dot {
          animation: pulse-ring 2s infinite;
        }
      \`}} />

      {/* Header Bar */}
      <header className="border-b border-[#333] bg-[#111115] p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-widest text-white">WARROOM // NARRATIVE</h1>
          <div className="h-4 w-px bg-[#333]"></div>
          <div className="text-[#888] text-sm">{stats.threads} THREADS / {stats.singletons} SINGLETONS / {stats.total} TOTAL EVENTS</div>
        </div>
        <div className="text-right text-[#aaa] font-bold">
          {formatTime(now)}
        </div>
      </header>

      {/* Main Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          {feedItems.map((item, idx) => {
            if (item.type === 'thread') {
              const thread = item.data;
              const sevHex = getSeverityColor(thread.severity, "hex") as string;
              
              return (
                <div key={thread.id} className={\`relative border-l-4 \${getSeverityColor(thread.severity, "border")} bg-[#111115] p-5 mb-6\`}>
                  {/* Subtle BG tint */}
                  <div className={\`absolute inset-0 pointer-events-none \${getSeveritySubtleBg(thread.severity)}\`} style={{ opacity: 0.5 }} />
                  
                  {/* Thread Header */}
                  <div className="relative z-10 flex justify-between items-end border-b border-[#333] pb-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">THREAD #{idx + 1} — {thread.location}</h2>
                      <div className="text-xs text-[#888] flex items-center gap-3">
                        <span className={getSeverityColor(thread.severity, "text")}>[{thread.severity} CLUSTER]</span>
                        <span>SPAN: {thread.spanMinutes} MIN</span>
                        <span>{thread.events.length} EVENTS</span>
                      </div>
                    </div>
                  </div>

                  {/* Thread Events (Timeline) */}
                  <div className="relative z-10 pl-4">
                    {/* Vertical connecting line */}
                    <div className="absolute left-6 top-4 bottom-4 w-[2px]" style={{ backgroundColor: sevHex, opacity: 0.6 }} />

                    <div className="space-y-6">
                      {thread.events.map((evt, eIdx) => {
                        const isFirst = eIdx === 0;
                        const isLast = eIdx === thread.events.length - 1;
                        
                        return (
                          <div key={evt.id} className="relative pl-10">
                            {/* Dot */}
                            <div 
                              className={\`absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full \${isFirst ? 'origin-dot' : ''}\`}
                              style={{ 
                                backgroundColor: sevHex,
                                ...(isFirst ? { '--ring-color': parseInt(sevHex.slice(1,3),16) + ',' + parseInt(sevHex.slice(3,5),16) + ',' + parseInt(sevHex.slice(5,7),16) } as React.CSSProperties : {})
                              }}
                            />
                            
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-3">
                                <span className="text-[#888] text-sm w-24">{formatTime(evt.timestamp)}</span>
                                <span className={\`font-bold \${getSeverityColor(evt.severity, "text")}\`}>[{evt.severity}]</span>
                                <span className="text-white font-bold">{evt.type}</span>
                                {isFirst && <span className="text-[10px] bg-[#333] text-white px-1.5 py-0.5 ml-2">ORIGIN</span>}
                                {isLast && <span className="text-[10px] bg-[#fff] text-black px-1.5 py-0.5 ml-2">LATEST</span>}
                              </div>
                            </div>
                            <div className="text-[#aaa] text-sm max-w-2xl leading-relaxed">
                              {evt.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            } else {
              const singleton = item.data;
              return (
                <div key={singleton.id} className="border-l border-[#444] bg-[#0f0f13] p-4 ml-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[#777] text-sm w-24">{formatTime(singleton.timestamp)}</span>
                      <span className={\`font-bold \${getSeverityColor(singleton.severity, "text")}\`}>[{singleton.severity}]</span>
                      <span className="text-[#ccc]">{singleton.type}</span>
                      <span className="text-[#666] text-xs">@ {singleton.location}</span>
                    </div>
                  </div>
                  <div className="text-[#888] text-sm pl-[108px] max-w-2xl">
                    {singleton.description}
                  </div>
                </div>
              );
            }
          })}

          <div className="text-center text-[#555] text-xs pt-8 pb-4">
            END OF NARRATIVE FEED
          </div>
        </div>
      </div>
    </div>
  );
}
