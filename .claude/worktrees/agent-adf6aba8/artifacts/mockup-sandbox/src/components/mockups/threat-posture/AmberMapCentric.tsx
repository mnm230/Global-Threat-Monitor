import React from "react";
import {
  Shield,
  Radio,
  Search,
  AlertTriangle,
  Crosshair,
  Activity,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  Zap,
} from "lucide-react";

export function AmberMapCentric() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 font-mono text-[11px] select-none" style={{ 
      backgroundColor: "hsl(222, 28%, 4%)", 
      backgroundImage: "linear-gradient(to bottom, rgba(245, 158, 11, 0.02), rgba(245, 158, 11, 0.02))",
      color: "hsl(213, 14%, 82%)",
      fontVariantNumeric: "tabular-nums",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-amber {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .amber-pulse { animation: pulse-amber 2s infinite ease-in-out; }
        .red-pulse { animation: pulse-red 1s infinite ease-in-out; }
        .map-grid {
          background-size: 20px 20px;
          background-image: 
            linear-gradient(to right, rgba(245, 158, 11, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 158, 11, 0.05) 1px, transparent 1px);
        }
        
        .overlay-panel {
          backdrop-filter: blur(8px);
          background-color: rgba(10, 15, 30, 0.7);
          border: 1px solid rgba(245, 158, 11, 0.12);
          border-radius: 3px;
        }
      `}} />

      <div className="w-full max-w-[800px] h-[500px] relative overflow-hidden rounded-[3px] border border-amber-500/20" style={{
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(245, 158, 11, 0.05)",
      }}>
        
        {/* MAP BACKGROUND (Primary Frame) */}
        <div className="absolute inset-0 bg-[hsl(222,28%,4%)]">
          <div className="absolute inset-0 map-grid"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,28%,2%)] to-transparent opacity-80 z-0"></div>
          
          {/* Coordinates Top Right (behind top bar but visible) */}
          <div className="absolute top-[36px] right-3 text-[9px] text-white/30 z-0">
            N 33° 12' 44" / E 35° 34' 11"
          </div>
          
          {/* Map Blips */}
          <div className="absolute top-[25%] left-[35%] flex items-center justify-center z-0">
            <div className="absolute w-8 h-8 rounded-full border border-red-500/30 amber-pulse"></div>
            <div className="absolute w-4 h-4 rounded-full border border-red-500/50 red-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
            <div className="absolute top-2 left-3 text-[8px] text-red-400 bg-[hsl(222,28%,4%)]/80 backdrop-blur-sm px-1 border border-red-500/30 rounded-[2px]">IMPACT_ZONE_A</div>
          </div>
          
          <div className="absolute top-[20%] left-[55%] flex items-center justify-center z-0">
            <div className="absolute w-6 h-6 rounded-full border border-amber-500/30 amber-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></div>
            <div className="absolute top-2 left-2 text-[8px] text-amber-400 bg-[hsl(222,28%,4%)]/80 backdrop-blur-sm px-1 border border-amber-500/30 rounded-[2px]">UAV_TRACK_01</div>
          </div>
          
          {/* Fake scanning line */}
          <div className="absolute left-0 right-0 h-[2px] bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-0" style={{ animation: 'scanline 4s linear infinite' }}></div>
        </div>

        {/* TOP EDGE */}
        <div className="absolute top-0 left-0 right-0 h-[28px] overlay-panel !border-t-0 !border-l-0 !border-r-0 !rounded-none flex items-center justify-between px-3 z-10 bg-[rgba(10,15,30,0.7)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-amber-500/60 font-bold">
              <Shield size={14} className="opacity-80" />
              <span>WARROOM</span>
            </div>
            
            <div className="w-[1px] h-3 bg-amber-500/20"></div>
            
            <div className="flex items-center gap-2 text-amber-500/80">
              <Crosshair size={12} />
              <span className="font-bold tracking-widest text-[10px]">TACTICAL MAP</span>
            </div>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 text-amber-500 font-bold tracking-widest text-[12px]">
            <div className="w-2 h-2 rounded-full bg-amber-500 amber-pulse" style={{ boxShadow: "0 0 8px rgba(245, 158, 11, 0.8)" }}></div>
            <span>CONDITION AMBER - ELEVATED</span>
          </div>
          
          <div className="flex items-center gap-4 text-amber-400">
            <span className="opacity-70">14:32:01 UTC</span>
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-[2px] border border-amber-500/30">
              <Activity size={12} />
              <span>3 ACTIVE</span>
            </div>
          </div>
        </div>

        {/* LEFT SIDEBAR */}
        <div className="absolute top-[36px] left-2 bottom-[88px] w-[200px] overlay-panel flex flex-col z-10 bg-[rgba(10,15,30,0.8)]">
          <div className="p-2 border-b border-[rgba(245,158,11,0.12)] bg-[rgba(239,68,68,0.05)] text-red-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 red-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
            <span className="flex-1 tracking-widest font-bold text-[10px]">TACTICAL ALERTS</span>
            <span className="bg-red-500/20 px-1.5 py-0.5 rounded-[2px] text-[10px] border border-red-500/30">3</span>
          </div>
          
          <div className="p-2 flex flex-col gap-2 overflow-y-auto flex-1">
            {/* Critical Alert */}
            <div className="flex items-stretch bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[3px] overflow-hidden">
              <div className="w-[3px] bg-red-500 shrink-0"></div>
              <div className="flex-1 p-1.5 flex flex-col gap-1 relative">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold text-[10px]">KIRYAT SHMONA</span>
                  <div className="text-[12px] font-bold text-red-500 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 12s
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded-[2px] border border-red-500/20">RKT</span>
                </div>
              </div>
            </div>

            {/* Warning Alert 1 */}
            <div className="flex items-stretch bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-[3px] overflow-hidden">
              <div className="w-[3px] bg-amber-500 shrink-0"></div>
              <div className="flex-1 p-1.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold text-[10px]">METULA</span>
                  <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 45s
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded-[2px] border border-amber-500/20">RKT</span>
                </div>
              </div>
            </div>

            {/* Warning Alert 2 */}
            <div className="flex items-stretch bg-[rgba(245,158,11,0.03)] border border-[rgba(245,158,11,0.1)] rounded-[3px] overflow-hidden">
              <div className="w-[3px] bg-amber-500/70 shrink-0"></div>
              <div className="flex-1 p-1.5 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400/80 font-bold text-[10px]">NAHARIYA</span>
                  <div className="text-[11px] font-bold text-amber-500/80 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 90s
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded-[2px] border border-blue-500/20">UAV</span>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              {/* Sirens */}
              <div className="text-[9px] text-red-400/80 mb-1 flex items-center gap-1">
                <Radio size={10} className="red-pulse" /> ACTIVE SIRENS
              </div>
              <div className="flex flex-col gap-1">
                <div className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-[2px] text-[9px] flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full red-pulse"></span>
                  GALILEY PANHANDLE
                </div>
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-[2px] text-[9px] flex items-center gap-1">
                  <span className="w-1 h-1 bg-amber-500 rounded-full amber-pulse"></span>
                  UPPER GALILEE
                </div>
              </div>
              
              <div className="h-[1px] bg-amber-500/20 my-2"></div>
              
              <div className="flex items-center gap-2 text-[9px] text-white/40">
                <Zap size={10} className="text-amber-500/60" />
                <span>24H EVENTS:</span>
                <span className="text-amber-500/80 font-bold">47</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM EDGE */}
        <div className="absolute bottom-0 left-0 right-0 h-[80px] overlay-panel !border-b-0 !border-l-0 !border-r-0 !rounded-none flex bg-[rgba(10,15,30,0.75)] z-10">
          
          {/* INTEL FEED (Left 60%) */}
          <div className="w-[60%] border-r border-[rgba(245,158,11,0.12)] p-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-amber-500/80 mb-0.5">
              <Search size={10} />
              <span className="font-bold text-[9px]">INTEL FEED</span>
            </div>
            
            <div className="flex gap-2 text-[9px]">
              <div className="w-1/2 flex flex-col p-1.5 bg-[rgba(239,68,68,0.05)] border-l-2 border-red-500 rounded-r-[2px]">
                <div className="flex justify-between text-white/40 mb-1">
                  <span>OSINT_LEB</span><span>14:31:44</span>
                </div>
                <div className="text-white/90 truncate">
                  <span className="text-red-400 font-bold mr-1">&gt;&gt;</span>
                  MULTIPLE LAUNCHES DETECTED FROM LEBANESE BORDER
                </div>
              </div>
              
              <div className="w-1/2 flex flex-col p-1.5 bg-[rgba(255,255,255,0.02)] border-l-2 border-amber-500/50 rounded-r-[2px]">
                <div className="flex justify-between text-white/40 mb-1">
                  <span>IDF_SPOX</span><span>14:28:12</span>
                </div>
                <div className="text-white/70 truncate">
                  INTERCEPTIONS REPORTED OVER UPPER GALILEE.
                </div>
              </div>
            </div>
          </div>
          
          {/* MARKETS (Right 40%) */}
          <div className="w-[40%] p-2 flex flex-col justify-between">
            <div className="flex items-center justify-around bg-[rgba(245,158,11,0.02)] border border-[rgba(245,158,11,0.1)] rounded-[2px] p-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white/40 text-[9px]">OIL</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/80 font-bold">82.45</span>
                  <TrendingUp size={10} className="text-red-400" />
                </div>
              </div>
              <div className="w-[1px] h-6 bg-white/10"></div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white/40 text-[9px]">GOLD</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/80 font-bold">2,341</span>
                  <TrendingUp size={10} className="text-amber-400" />
                </div>
              </div>
              <div className="w-[1px] h-6 bg-white/10"></div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white/40 text-[9px]">USD/ILS</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/80 font-bold">3.78</span>
                  <TrendingDown size={10} className="text-green-400" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[8px] text-amber-500/40 px-1">
              <div className="flex items-center gap-1">
                <Shield size={8} /> OREF HOME FRONT CMD
              </div>
              <div className="font-mono">{new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
