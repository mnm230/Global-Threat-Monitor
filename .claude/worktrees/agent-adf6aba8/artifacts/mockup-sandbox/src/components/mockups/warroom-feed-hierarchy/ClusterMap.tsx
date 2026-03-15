import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Layers, Activity, AlertTriangle, Radio, Crosshair, Zap, Shield, Navigation } from "lucide-react";

// Types
const SEVERITIES = ["CRIT", "HIGH", "ELEV", "INFO"] as const;
type Severity = typeof SEVERITIES[number];

interface IntelEvent {
  id: string;
  timestamp: string; // ISO string
  severity: Severity;
  type: string;
  location: string;
  description: string;
}

interface EventCluster {
  id: string;
  type: string;
  location: string;
  events: IntelEvent[];
  startTime: string;
  endTime: string;
  maxSeverity: Severity;
  isSingleton: boolean;
}

// Severity configuration
const SEVERITY_CONFIG: Record<Severity, { color: string; value: number }> = {
  CRIT: { color: "#ff4444", value: 4 },
  HIGH: { color: "#ffb74d", value: 3 },
  ELEV: { color: "#ffeb3b", value: 2 },
  INFO: { color: "#4caf50", value: 1 },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "ROCKET_FIRE": <AlertTriangle size={14} />,
  "UAV_DETECT": <Navigation size={14} />,
  "SIREN_ACT": <Radio size={14} />,
  "SHIP_MOV": <Crosshair size={14} />,
  "FLIGHT_DEV": <Activity size={14} />,
  "BORDER_BREACH": <Shield size={14} />,
  "THERMAL_ANOMALY": <Zap size={14} />
};

// Mock data generation (40+ events)
const generateMockData = (): IntelEvent[] => {
  const events: IntelEvent[] = [];
  let baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - 3); // Start 3 hours ago

  const addEvent = (type: string, location: string, severity: Severity, offsetMinutes: number, desc?: string) => {
    const t = new Date(baseTime.getTime() + offsetMinutes * 60000);
    events.push({
      id: `EVT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${events.length}`,
      timestamp: t.toISOString(),
      severity,
      type,
      location,
      description: desc || `Detected ${type.replace('_', ' ')} in ${location}. Sensors tracking activity.`
    });
  };

  // Cluster 1: 5 ROCKET_FIRE in NORTHERN_SECTOR within 12 min
  addEvent("ROCKET_FIRE", "NORTHERN_SECTOR", "HIGH", 10, "Initial barrage detected from launch site Alpha.");
  addEvent("ROCKET_FIRE", "NORTHERN_SECTOR", "CRIT", 12, "Multiple projectiles tracked. Impact warning issued.");
  addEvent("ROCKET_FIRE", "NORTHERN_SECTOR", "HIGH", 15, "Secondary volley detected.");
  addEvent("ROCKET_FIRE", "NORTHERN_SECTOR", "ELEV", 18, "Trajectory adjustments observed in mid-flight.");
  addEvent("ROCKET_FIRE", "NORTHERN_SECTOR", "CRIT", 21, "Heavy barrage confirmed. Interception systems engaged.");

  // Cluster 2: 4 UAV_DETECT in AIRSPACE_ZULU within 10 min
  addEvent("UAV_DETECT", "AIRSPACE_ZULU", "ELEV", 40, "Unidentified drone entered restricted zone.");
  addEvent("UAV_DETECT", "AIRSPACE_ZULU", "ELEV", 43, "Drone loitering near sector perimeter.");
  addEvent("UAV_DETECT", "AIRSPACE_ZULU", "HIGH", 47, "Swarm behavior detected. Three additional units visible.");
  addEvent("UAV_DETECT", "AIRSPACE_ZULU", "CRIT", 49, "Drones descending rapidly towards critical infrastructure.");

  // Cluster 3: 3 SIREN_ACT in URBAN_CENTER within 5 min
  addEvent("SIREN_ACT", "URBAN_CENTER", "INFO", 60, "Early warning sirens activated automatically.");
  addEvent("SIREN_ACT", "URBAN_CENTER", "INFO", 62, "Civilian evacuation protocols initiated.");
  addEvent("SIREN_ACT", "URBAN_CENTER", "HIGH", 64, "Sector-wide broadcast confirmed.");

  // Cluster 4: 3 BORDER_BREACH in DMZ_SECTOR_7 within 8 min
  addEvent("BORDER_BREACH", "DMZ_SECTOR_7", "CRIT", 80, "Perimeter fence integrity compromised.");
  addEvent("BORDER_BREACH", "DMZ_SECTOR_7", "CRIT", 83, "Multiple thermal signatures moving past the perimeter.");
  addEvent("BORDER_BREACH", "DMZ_SECTOR_7", "HIGH", 87, "Ground units dispatched to intercept.");

  // Cluster 5: 3 SHIP_MOV in NAVAL_BASE_ALPHA within 14 min
  addEvent("SHIP_MOV", "NAVAL_BASE_ALPHA", "INFO", 110, "Vessel departed without clearance.");
  addEvent("SHIP_MOV", "NAVAL_BASE_ALPHA", "ELEV", 115, "Vessel accelerating towards maritime border.");
  addEvent("SHIP_MOV", "NAVAL_BASE_ALPHA", "HIGH", 122, "Vessel ignoring radio communications.");

  // Cluster 6: 4 THERMAL_ANOMALY in OFFSHORE_RIG within 11 min
  addEvent("THERMAL_ANOMALY", "OFFSHORE_RIG", "ELEV", 130, "Temperature spikes in lower deck.");
  addEvent("THERMAL_ANOMALY", "OFFSHORE_RIG", "HIGH", 133, "Fire suppression systems offline.");
  addEvent("THERMAL_ANOMALY", "OFFSHORE_RIG", "CRIT", 138, "Major structural heat anomaly. Evacuation recommended.");
  addEvent("THERMAL_ANOMALY", "OFFSHORE_RIG", "CRIT", 140, "Explosion detected. Rescue teams deployed.");

  // Singletons & Scattered (20+ events)
  addEvent("FLIGHT_DEV", "SOUTHERN_CMD", "HIGH", 5, "Commercial flight off course by 5 degrees.");
  addEvent("THERMAL_ANOMALY", "URBAN_CENTER", "ELEV", 25, "Localized fire reported in industrial park.");
  addEvent("UAV_DETECT", "SOUTHERN_CMD", "INFO", 35, "Recreational drone spotted near boundary.");
  addEvent("FLIGHT_DEV", "AIRSPACE_ZULU", "HIGH", 55, "Military aircraft squawking emergency code.");
  addEvent("ROCKET_FIRE", "SOUTHERN_CMD", "HIGH", 70, "Isolated launch detected. Intercepted.");
  addEvent("SIREN_ACT", "COASTAL_RADAR", "INFO", 95, "Test siren activation successful.");
  addEvent("SHIP_MOV", "NAVAL_BASE_ALPHA", "INFO", 105, "Scheduled patrol boat departing.");
  addEvent("BORDER_BREACH", "NORTHERN_SECTOR", "ELEV", 125, "Wildlife triggered motion sensors.");
  addEvent("UAV_DETECT", "COASTAL_RADAR", "INFO", 145, "Weather monitoring drone active.");
  addEvent("FLIGHT_DEV", "AIRSPACE_ZULU", "ELEV", 150, "Helicopter altitude variance reported.");
  addEvent("SIREN_ACT", "DMZ_SECTOR_7", "HIGH", 152, "Manual siren trigger by outpost guard.");
  addEvent("ROCKET_FIRE", "URBAN_CENTER", "CRIT", 155, "Projectile exploded mid-air due to malfunction.");
  addEvent("SHIP_MOV", "COASTAL_RADAR", "ELEV", 158, "Unregistered fishing boat near exclusion zone.");
  addEvent("THERMAL_ANOMALY", "SOUTHERN_CMD", "INFO", 160, "Routine flare-off at refinery.");
  addEvent("UAV_DETECT", "DMZ_SECTOR_7", "HIGH", 162, "Reconnaissance drone matching enemy profile.");
  addEvent("BORDER_BREACH", "AIRSPACE_ZULU", "ELEV", 165, "Radar ghosting anomaly tracked.");
  addEvent("FLIGHT_DEV", "NORTHERN_SECTOR", "INFO", 168, "Supply drop flight delayed.");
  addEvent("SHIP_MOV", "SOUTHERN_CMD", "INFO", 170, "Submarine resurfacing in designated area.");
  addEvent("SIREN_ACT", "NAVAL_BASE_ALPHA", "ELEV", 172, "Shift change sirens.");
  addEvent("THERMAL_ANOMALY", "NORTHERN_SECTOR", "HIGH", 175, "Engine malfunction on armored vehicle.");
  addEvent("ROCKET_FIRE", "DMZ_SECTOR_7", "CRIT", 178, "Anti-tank missile fired at outpost.");
  
  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const formatTime = (iso: string) => {
  return new Date(iso).toISOString().substring(11, 19) + "Z";
};
const formatTimeShort = (iso: string) => {
  return new Date(iso).toISOString().substring(11, 16);
};

export default function ClusterMap() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setEvents(generateMockData());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clustering logic
  const clusters = useMemo(() => {
    if (!events.length) return [];
    
    // Sort ascending for clustering (oldest to newest)
    const sortedAsc = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const formedClusters: EventCluster[] = [];
    
    sortedAsc.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      
      // Find a matching cluster within 15 minutes
      const match = formedClusters.find(c => 
        c.type === event.type && 
        c.location === event.location &&
        (eventTime - new Date(c.endTime).getTime()) <= 15 * 60 * 1000
      );

      if (match) {
        match.events.push(event);
        match.endTime = event.timestamp;
        
        // Update max severity
        if (SEVERITY_CONFIG[event.severity].value > SEVERITY_CONFIG[match.maxSeverity].value) {
          match.maxSeverity = event.severity;
        }
        match.isSingleton = false;
      } else {
        formedClusters.push({
          id: `CLUS-${event.id}`,
          type: event.type,
          location: event.location,
          events: [event],
          startTime: event.timestamp,
          endTime: event.timestamp,
          maxSeverity: event.severity,
          isSingleton: true
        });
      }
    });

    // Sort clusters descending by latest event time
    return formedClusters.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  }, [events]);

  const multiClusters = clusters.filter(c => !c.isSingleton);
  const singletons = clusters.filter(c => c.isSingleton);

  // Stats
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    multiClusters.forEach(c => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [multiClusters]);

  const severityDistribution = useMemo(() => {
    const counts: Record<Severity, number> = { CRIT: 0, HIGH: 0, ELEV: 0, INFO: 0 };
    events.forEach(e => counts[e.severity]++);
    return counts;
  }, [events]);

  return (
    <div className="min-h-screen bg-[#0c0c14] text-[#a0a0b0] p-4 flex flex-col uppercase tracking-wider overflow-hidden text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0c0c14; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a3a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
      `}} />

      {/* Header */}
      <header className="border-b border-[#2a2a3a] pb-3 mb-4 flex justify-between items-end shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
              <Layers className="text-[#22d3ee]" size={20} />
              WARROOM // CLUSTER_MAP
            </h1>
            <p className="text-xs text-[#22d3ee] mt-1 tracking-widest opacity-80">
              {multiClusters.length} CLUSTERS / {events.length} RAW EVENTS
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-white font-bold">{now.toISOString().substring(11, 19)}Z</div>
          <div className="text-xs opacity-60">UTC CLOCK</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar pr-2">
          {/* Severity Chart */}
          <div className="bg-[#14141e] border border-[#2a2a3a] p-4">
            <h2 className="text-xs text-white mb-3 flex items-center gap-2 border-b border-[#2a2a3a] pb-2">
              <Activity size={14} /> RAW EVENT SEVERITY
            </h2>
            <div className="space-y-3">
              {SEVERITIES.map(sev => {
                const count = severityDistribution[sev];
                const pct = events.length ? (count / events.length) * 100 : 0;
                return (
                  <div key={sev}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: SEVERITY_CONFIG[sev].color }}>{sev}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#0c0c14] w-full">
                      <div 
                        className="h-full transition-all duration-1000" 
                        style={{ width: \`\${pct}%\`, backgroundColor: SEVERITY_CONFIG[sev].color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cluster Types */}
          <div className="bg-[#14141e] border border-[#2a2a3a] p-4 flex-1">
            <h2 className="text-xs text-white mb-3 flex items-center gap-2 border-b border-[#2a2a3a] pb-2">
              <Layers size={14} /> DETECTED PATTERNS
            </h2>
            <div className="space-y-2">
              {typeBreakdown.length > 0 ? (
                typeBreakdown.map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center text-xs p-2 bg-[#0c0c14] border border-[#2a2a3a]">
                    <span className="flex items-center gap-2">
                      <span className="text-[#22d3ee]">{TYPE_ICONS[type] || <Activity size={12} />}</span>
                      {type}
                    </span>
                    <span className="text-[#22d3ee] font-bold">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs opacity-50 italic">NO PATTERNS DETECTED</div>
              )}
            </div>
            
            <div className="mt-6 border-t border-[#2a2a3a] pt-3 text-xs">
              <div className="opacity-60 mb-1">CLUSTERING ENGINE</div>
              <div className="flex justify-between"><span>WINDOW</span> <span className="text-[#22d3ee]">15 MIN</span></div>
              <div className="flex justify-between"><span>GROUP BY</span> <span className="text-[#22d3ee]">TYPE + LOC</span></div>
              <div className="flex justify-between"><span>STATUS</span> <span className="text-[#4caf50]">ONLINE</span></div>
            </div>
          </div>
        </div>

        {/* Right Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 relative">
          <div className="sticky top-0 bg-[#0c0c14] z-10 border-b border-[#2a2a3a] pb-2 mb-2 flex text-xs opacity-60 px-4">
            <div className="w-32">TIME / SPAN</div>
            <div className="w-16">SEV</div>
            <div className="flex-1">INTELLIGENCE DATA</div>
          </div>

          {clusters.map(cluster => (
            <ClusterItem key={cluster.id} cluster={cluster} />
          ))}
          
          <div className="mt-4 pt-4 border-t border-[#2a2a3a] text-center text-xs opacity-50 pb-8">
            <span className="text-[#22d3ee]">{events.length}</span> RAW EVENTS → <span className="text-[#22d3ee]">{multiClusters.length}</span> CLUSTERS + <span className="text-[#22d3ee]">{singletons.length}</span> SINGLETONS
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for clusters to handle expansion state
function ClusterItem({ cluster }: { cluster: EventCluster }) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = !cluster.isSingleton;
  const sevColor = SEVERITY_CONFIG[cluster.maxSeverity].color;

  if (!isMulti) {
    const evt = cluster.events[0];
    return (
      <div className="flex items-center px-4 py-2 hover:bg-[#14141e] border border-transparent hover:border-[#2a2a3a] transition-colors group">
        <div className="w-32 text-xs opacity-60 group-hover:opacity-100 transition-opacity">{formatTime(evt.timestamp)}</div>
        <div className="w-16 font-bold" style={{ color: SEVERITY_CONFIG[evt.severity].color }}>{evt.severity}</div>
        <div className="flex-1 flex gap-4 items-center">
          <div className="w-40 font-bold opacity-80 flex items-center gap-2">
            <span className="opacity-50">{TYPE_ICONS[evt.type] || <Activity size={14} />}</span>
            {evt.type}
          </div>
          <div className="w-40 opacity-70">{evt.location}</div>
          <div className="flex-1 opacity-60 truncate" title={evt.description}>{evt.description}</div>
        </div>
      </div>
    );
  }

  // Multi-event cluster
  const durationMin = Math.round((new Date(cluster.endTime).getTime() - new Date(cluster.startTime).getTime()) / 60000) || 1;
  
  return (
    <div className="flex flex-col mb-1">
      {/* Cluster Header Card */}
      <div 
        className="bg-[#14141e] border border-[#2a2a3a] border-l-4 flex items-center p-3 cursor-pointer hover:bg-[#1a1a24] transition-colors"
        style={{ borderLeftColor: sevColor }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-32 text-xs text-[#22d3ee] flex flex-col">
          <span>{formatTimeShort(cluster.startTime)}—{formatTimeShort(cluster.endTime)}</span>
          <span className="opacity-50">{durationMin} MIN SPAN</span>
        </div>
        <div className="w-16 font-bold" style={{ color: sevColor }}>{cluster.maxSeverity}</div>
        <div className="flex-1 flex items-center">
          <div className="bg-[#0c0c14] border border-[#2a2a3a] px-2 py-1 flex items-center gap-2 mr-4">
            <span className="text-[#22d3ee] font-bold">{cluster.events.length}×</span>
            <span className="flex items-center gap-1">
              <span className="text-[#22d3ee] opacity-70">{TYPE_ICONS[cluster.type] || <Activity size={14} />}</span>
              {cluster.type}
            </span>
          </div>
          <div className="opacity-80 flex-1 flex items-center gap-2">
            <Navigation size={12} className="opacity-50" />
            {cluster.location}
          </div>
        </div>
        <div className="text-[#22d3ee] opacity-70 ml-4">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {/* Expanded Events */}
      {expanded && (
        <div className="pl-6 border-l-2 border-[#14141e] ml-2 mt-1 flex flex-col gap-1 pb-2">
          {cluster.events.slice().reverse().map((evt) => (
            <div key={evt.id} className="flex items-center px-4 py-1.5 hover:bg-[#14141e]/50 border-l border-[#2a2a3a] ml-4 text-xs">
              <div className="w-24 opacity-50">{formatTime(evt.timestamp)}</div>
              <div className="w-16 font-bold" style={{ color: SEVERITY_CONFIG[evt.severity].color }}>{evt.severity}</div>
              <div className="flex-1 opacity-60 truncate">{evt.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
