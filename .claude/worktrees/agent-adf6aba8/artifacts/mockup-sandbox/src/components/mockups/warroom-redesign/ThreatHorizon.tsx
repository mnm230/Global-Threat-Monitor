import React, { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Crosshair, Map as MapIcon, Navigation, Radio, Shield, ShieldAlert, Target, Zap } from "lucide-react";

type ThreatLevel = "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";

const COLORS = {
  LOW: { bg: "#0d1117", accent: "#3b82f6", mapBg: "#161b22", mapLand: "#21262d" },
  ELEVATED: { bg: "#140e00", accent: "#f59e0b", mapBg: "#1c1400", mapLand: "#291e00" },
  HIGH: { bg: "#130800", accent: "#ea580c", mapBg: "#1f0d00", mapLand: "#331600" },
  CRITICAL: { bg: "#1a0000", accent: "#ef4444", mapBg: "#2d0000", mapLand: "#450000" }
};

interface Alert {
  id: string;
  time: string;
  type: string;
  location: string;
  desc: string;
  severity: "info" | "elevated" | "high" | "critical";
}

const ALERTS: Alert[] = [
  { id: "1", time: "14:32:01", type: "ROCKET", location: "NORTH SECTOR", desc: "Multiple launches detected", severity: "critical" },
  { id: "2", time: "14:31:45", type: "UAV", location: "COASTAL", desc: "Unidentified drone track", severity: "high" },
  { id: "3", time: "14:28:12", type: "NAVAL", location: "RED SEA", desc: "Vessel course deviation", severity: "elevated" },
  { id: "4", time: "14:25:00", type: "SIREN", location: "METROPOLIS", desc: "Air raid warning active", severity: "critical" },
  { id: "5", time: "14:15:22", type: "THERMAL", location: "BORDER WEST", desc: "Infrared bloom detected", severity: "high" },
  { id: "6", time: "14:10:05", type: "COMMS", location: "GLOBAL", desc: "Encrypted chatter spike", severity: "info" },
  { id: "7", time: "14:05:30", type: "FLIGHT", location: "AIRSPACE B", desc: "Commercial rerouting", severity: "info" },
  { id: "8", time: "13:59:45", type: "GROUND", location: "SECTOR 7G", desc: "Convoy movement confirmed", severity: "elevated" },
];

export function ThreatHorizon() {
  const [level, setLevel] = useState<ThreatLevel>("HIGH");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const theme = COLORS[level];

  return (
    <div 
      className="flex h-screen w-full font-sans text-white overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.accent, transition: "background-color 0.5s ease" }}
    >
      {/* Map Column (65%) */}
      <div className="w-[65%] h-full relative border-r border-opacity-20" style={{ borderColor: theme.accent, backgroundColor: theme.mapBg }}>
        {/* Decorative Grid */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ 
            backgroundImage: `linear-gradient(${theme.accent} 1px, transparent 1px), linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)`,
            backgroundSize: '40px 40px' 
          }}
        />
        
        {/* Map Header */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-md backdrop-blur-sm border border-opacity-30" style={{ borderColor: theme.accent }}>
          <MapIcon size={18} />
          <span className="font-mono text-sm tracking-widest">GEO-STRATEGIC OVERVIEW</span>
          <span className="text-xs opacity-70 ml-4 font-mono">{currentTime.toISOString().split('T')[1].split('.')[0]} UTC</span>
        </div>

        {/* Abstract Map SVG */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <svg className="w-full h-full opacity-60" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            {/* Abstract Landmasses */}
            <path d="M100,300 Q150,200 250,220 T400,180 T550,250 T700,150 T850,280 Q900,350 850,450 T700,500 T500,480 T300,520 T150,450 Z" 
                  fill={theme.mapLand} stroke={theme.accent} strokeWidth="1" strokeOpacity="0.3" />
            <path d="M600,100 Q650,50 750,80 T900,120 Q950,200 880,220 T700,180 Z" 
                  fill={theme.mapLand} stroke={theme.accent} strokeWidth="1" strokeOpacity="0.3" />
            <path d="M50,150 Q80,80 180,100 T300,50 Q350,120 280,180 T150,220 Z" 
                  fill={theme.mapLand} stroke={theme.accent} strokeWidth="1" strokeOpacity="0.3" />
            
            {/* Grid Rings */}
            <circle cx="500" cy="300" r="100" fill="none" stroke={theme.accent} strokeWidth="1" strokeOpacity="0.1" strokeDasharray="4 4"/>
            <circle cx="500" cy="300" r="200" fill="none" stroke={theme.accent} strokeWidth="1" strokeOpacity="0.1" strokeDasharray="4 4"/>
            <circle cx="500" cy="300" r="300" fill="none" stroke={theme.accent} strokeWidth="1" strokeOpacity="0.1" strokeDasharray="4 4"/>
            
            {/* Crosshairs */}
            <line x1="0" y1="300" x2="1000" y2="300" stroke={theme.accent} strokeWidth="1" strokeOpacity="0.2" />
            <line x1="500" y1="0" x2="500" y2="600" stroke={theme.accent} strokeWidth="1" strokeOpacity="0.2" />

            {/* Pulsing Dots (Hotspots) */}
            <g className="animate-pulse">
              <circle cx="480" cy="280" r="6" fill={level === 'CRITICAL' ? '#ef4444' : theme.accent} />
              <circle cx="480" cy="280" r="16" fill="none" stroke={level === 'CRITICAL' ? '#ef4444' : theme.accent} strokeWidth="2" className="animate-ping opacity-75" style={{ transformOrigin: '480px 280px' }}/>
            </g>
            <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
              <circle cx="550" cy="320" r="4" fill={theme.accent} />
              <circle cx="550" cy="320" r="12" fill="none" stroke={theme.accent} strokeWidth="1" className="animate-ping opacity-50" style={{ transformOrigin: '550px 320px' }}/>
            </g>
            <g className="animate-pulse" style={{ animationDelay: '1s' }}>
              <circle cx="680" cy="180" r="5" fill={theme.accent} />
            </g>
            <g className="animate-pulse" style={{ animationDelay: '0.2s' }}>
              <circle cx="320" cy="450" r="4" fill={theme.accent} />
            </g>
            <g className="animate-pulse" style={{ animationDelay: '1.5s' }}>
              <circle cx="750" cy="420" r="3" fill={theme.accent} />
            </g>
            <g className="animate-pulse" style={{ animationDelay: '0.8s' }}>
              <circle cx="200" cy="150" r="4" fill={theme.accent} />
            </g>

            {/* Ship Tracks */}
            <path d="M250,550 Q350,500 450,520" fill="none" stroke={theme.accent} strokeWidth="1.5" strokeDasharray="4 2" className="animate-pulse"/>
            <polygon points="450,520 440,515 442,525" fill={theme.accent} />
            
            <path d="M850,50 Q800,100 750,90" fill="none" stroke={theme.accent} strokeWidth="1.5" strokeDasharray="4 2" className="animate-pulse"/>
            <polygon points="750,90 760,85 758,95" fill={theme.accent} />

            {/* Aircraft Icons (Simple Polygons) */}
            <g transform="translate(380, 200) rotate(45)">
              <polygon points="0,-8 6,8 0,5 -6,8" fill={theme.accent} />
            </g>
            <g transform="translate(620, 380) rotate(-30)">
              <polygon points="0,-8 6,8 0,5 -6,8" fill={theme.accent} />
            </g>
          </svg>
        </div>

        {/* Legend / Overlay Controls */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2 bg-black/40 p-4 rounded-md backdrop-blur-sm border border-opacity-30 text-xs font-mono" style={{ borderColor: theme.accent }}>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ backgroundColor: level === 'CRITICAL' ? '#ef4444' : theme.accent }}></div><span>ACTIVE HOTSPOT</span></div>
          <div className="flex items-center space-x-2"><div className="w-4 h-[1px] bg-white" style={{ backgroundColor: theme.accent }}></div><span>NAVAL TRACK</span></div>
          <div className="flex items-center space-x-2"><Navigation size={10} style={{ color: theme.accent }} className="rotate-45"/><span>AIRCRAFT</span></div>
        </div>
      </div>

      {/* Status Column (35%) */}
      <div className="w-[35%] h-full flex flex-col p-6 space-y-6 overflow-hidden bg-black/20">
        
        {/* Threat Level Indicator */}
        <div 
          className="w-full rounded-lg p-6 flex flex-col items-center justify-center border-2 shadow-lg"
          style={{ 
            borderColor: theme.accent, 
            backgroundColor: level === 'CRITICAL' ? '#2d0000' : 'transparent',
            boxShadow: `0 0 20px ${theme.accent}20`,
            animation: level === 'CRITICAL' ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          <span className="text-sm font-mono tracking-widest opacity-80 mb-2">SYSTEM THREAT LEVEL</span>
          <div className="flex items-center space-x-3">
            {level === 'CRITICAL' ? <AlertTriangle size={32} className="animate-bounce"/> : <Shield size={32} />}
            <span className="text-4xl font-black tracking-tighter">{level}</span>
          </div>
        </div>

        {/* Controls (For Demo Purposes) */}
        <div className="flex space-x-2 justify-center">
          {(["LOW", "ELEVATED", "HIGH", "CRITICAL"] as ThreatLevel[]).map(l => (
            <button 
              key={l}
              onClick={() => setLevel(l)}
              className="px-2 py-1 text-[10px] font-mono border rounded hover:bg-white/10 transition-colors"
              style={{ 
                borderColor: COLORS[l].accent, 
                color: level === l ? '#fff' : COLORS[l].accent,
                backgroundColor: level === l ? COLORS[l].accent : 'transparent'
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Key Stats */}
        <div className="flex-none space-y-3">
          <h3 className="font-mono text-sm tracking-widest opacity-70 border-b pb-2 mb-4" style={{ borderColor: theme.accent }}>KEY METRICS</h3>
          
          <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-opacity-20" style={{ borderColor: theme.accent }}>
            <div className="flex items-center space-x-3"><Radio size={16}/><span className="font-mono text-sm">ACTIVE SENSORS</span></div>
            <span className="font-mono text-lg font-bold">1,248</span>
          </div>
          
          <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-opacity-20" style={{ borderColor: theme.accent }}>
            <div className="flex items-center space-x-3"><Target size={16}/><span className="font-mono text-sm">TRACKED ENTITIES</span></div>
            <span className="font-mono text-lg font-bold">492</span>
          </div>
          
          <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-opacity-20" style={{ borderColor: theme.accent }}>
            <div className="flex items-center space-x-3"><Zap size={16}/><span className="font-mono text-sm">GRID STABILITY</span></div>
            <span className="font-mono text-lg font-bold">98.4%</span>
          </div>
          
          <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-opacity-20" style={{ borderColor: theme.accent }}>
            <div className="flex items-center space-x-3"><ShieldAlert size={16}/><span className="font-mono text-sm">DEFENSE POSTURE</span></div>
            <span className="font-mono text-lg font-bold">DEFCON 3</span>
          </div>
        </div>

        {/* Alert Log */}
        <div className="flex-1 flex flex-col overflow-hidden pt-2">
          <h3 className="font-mono text-sm tracking-widest opacity-70 border-b pb-2 mb-4" style={{ borderColor: theme.accent }}>LIVE INCIDENT LOG</h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin" style={{ scrollbarColor: `${theme.accent} transparent` }}>
            {ALERTS.map((alert, i) => (
              <div 
                key={alert.id}
                className="p-3 rounded border border-opacity-30 bg-black/40 hover:bg-black/60 transition-colors flex flex-col space-y-1"
                style={{ 
                  borderColor: alert.severity === 'critical' ? '#ef4444' : (alert.severity === 'high' ? '#ea580c' : theme.accent),
                  borderLeftWidth: '4px'
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {alert.severity === 'critical' && <AlertCircle size={14} className="text-red-500 animate-pulse"/>}
                    <span className="font-mono text-xs opacity-70">{alert.time}</span>
                    <span className="font-bold text-xs tracking-wider">{alert.type}</span>
                  </div>
                  <span className="font-mono text-[10px] bg-black/50 px-2 py-0.5 rounded">{alert.location}</span>
                </div>
                <p className="text-sm opacity-90">{alert.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
