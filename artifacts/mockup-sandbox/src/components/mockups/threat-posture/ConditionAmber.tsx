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

export function ConditionAmber() {
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
        
        .panel {
          background-color: rgba(222, 24%, 6%, 0.8);
          border: 1px solid rgba(245, 158, 11, 0.12);
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          padding: 6px 10px;
          border-bottom: 1px solid rgba(245, 158, 11, 0.12);
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }
      `}} />

      <div className="w-full max-w-[800px] h-[500px] flex flex-col gap-2 relative z-10" style={{
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(245, 158, 11, 0.05)",
      }}>
        
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between px-3 h-[32px] shrink-0 rounded-[3px] border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-2 text-amber-500/60 font-bold">
            <Shield size={14} className="opacity-80" />
            <span>WARROOM</span>
          </div>
          
          <div className="flex items-center gap-3 text-amber-500 font-bold tracking-widest text-[12px]">
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

        {/* MAIN GRID */}
        <div className="flex gap-2 flex-1 min-h-0">
          
          {/* LEFT SIDE - ALERTS (55%) */}
          <div className="flex flex-col gap-2 w-[55%]">
            
            {/* ALERTS PANEL */}
            <div className="panel flex-1 border-[rgba(239,68,68,0.3)] shadow-[0_0_10px_rgba(239,68,68,0.05)]">
              <div className="panel-header bg-[rgba(239,68,68,0.05)] text-red-400 border-b-[rgba(239,68,68,0.2)]">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 red-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                <span className="flex-1 tracking-widest">TACTICAL ALERTS</span>
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded-[2px] text-[10px] border border-red-500/30">3</span>
              </div>
              
              <div className="flex flex-col p-2 gap-2 overflow-hidden flex-1">
                
                {/* Critical Alert */}
                <div className="flex items-stretch bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[3px] relative overflow-hidden">
                  <div className="w-1 bg-red-500 shrink-0"></div>
                  <div className="flex-1 p-2.5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold text-[12px]">KIRYAT SHMONA</span>
                        <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded-[2px] border border-red-500/20">RKT</span>
                      </div>
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <MapPin size={10} /> Northern Border
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[16px] font-bold text-red-500 flex items-center gap-1">
                        <Clock size={12} className="opacity-70" /> 12s
                      </div>
                      <span className="text-[9px] text-red-400/60">IMPACT EST</span>
                    </div>
                  </div>
                </div>

                {/* Warning Alert 1 */}
                <div className="flex items-stretch bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-[3px]">
                  <div className="w-1 bg-amber-500 shrink-0"></div>
                  <div className="flex-1 p-2.5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">METULA</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded-[2px] border border-amber-500/20">RKT</span>
                      </div>
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <MapPin size={10} /> Northern Border
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[14px] font-bold text-amber-500 flex items-center gap-1">
                        <Clock size={12} className="opacity-70" /> 45s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning Alert 2 */}
                <div className="flex items-stretch bg-[rgba(245,158,11,0.03)] border border-[rgba(245,158,11,0.1)] rounded-[3px]">
                  <div className="w-1 bg-amber-500/70 shrink-0"></div>
                  <div className="flex-1 p-2.5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400/80 font-bold">NAHARIYA</span>
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded-[2px] border border-blue-500/20">UAV</span>
                      </div>
                      <span className="text-[10px] text-white/50 flex items-center gap-1">
                        <MapPin size={10} /> Coastal Region
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[14px] font-bold text-amber-500/80 flex items-center gap-1">
                        <Clock size={12} className="opacity-70" /> 90s
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SIRENS FOOTER */}
            <div className="panel shrink-0 border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)] p-2 flex flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-red-400/80 px-2 border-r border-red-500/20">
                <Radio size={12} className="red-pulse" />
                <span className="font-bold">ACTIVE SIRENS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-[2px] text-[10px] flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full red-pulse"></span>
                  GALILEY PANHANDLE
                </div>
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-[2px] text-[10px] flex items-center gap-1">
                  <span className="w-1 h-1 bg-amber-500 rounded-full amber-pulse"></span>
                  UPPER GALILEE
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE (45%) */}
          <div className="flex flex-col gap-2 w-[45%]">
            
            {/* MAP PLACEHOLDER */}
            <div className="panel flex-1 relative overflow-hidden">
              <div className="absolute inset-0 map-grid opacity-30"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,28%,4%)] to-transparent opacity-80 z-0"></div>
              
              <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center z-10 bg-gradient-to-b from-[hsl(222,28%,4%)] to-transparent">
                <div className="flex items-center gap-2 text-amber-500/80">
                  <Crosshair size={12} />
                  <span className="font-bold tracking-widest text-[10px]">TACTICAL MAP</span>
                </div>
                <div className="text-[9px] text-white/30">N 33° 12' 44" / E 35° 34' 11"</div>
              </div>
              
              {/* Map Blips */}
              <div className="absolute top-[30%] left-[40%] flex items-center justify-center z-10">
                <div className="absolute w-8 h-8 rounded-full border border-red-500/30 amber-pulse"></div>
                <div className="absolute w-4 h-4 rounded-full border border-red-500/50 red-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                <div className="absolute top-2 left-3 text-[8px] text-red-400 bg-[hsl(222,28%,4%)] px-1 border border-red-500/30 rounded-[2px]">IMPACT_ZONE_A</div>
              </div>
              
              <div className="absolute top-[20%] left-[60%] flex items-center justify-center z-10">
                <div className="absolute w-6 h-6 rounded-full border border-amber-500/30 amber-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></div>
                <div className="absolute top-2 left-2 text-[8px] text-amber-400 bg-[hsl(222,28%,4%)] px-1 border border-amber-500/30 rounded-[2px]">UAV_TRACK_01</div>
              </div>
              
              {/* Fake scanning line */}
              <div className="absolute left-0 right-0 h-[2px] bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-0" style={{ animation: 'scanline 4s linear infinite' }}></div>
            </div>

            {/* TELEGRAM PANEL */}
            <div className="panel h-[120px] shrink-0 border-[rgba(245,158,11,0.2)]">
              <div className="panel-header text-amber-500/80 bg-[rgba(245,158,11,0.05)]">
                <Search size={12} />
                <span className="flex-1 text-[10px]">INTEL FEED</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 amber-pulse"></span>
              </div>
              
              <div className="flex flex-col p-2 gap-1.5 overflow-hidden">
                <div className="flex flex-col gap-1 p-1.5 bg-[rgba(239,68,68,0.05)] border-l-2 border-red-500 rounded-r-[2px]">
                  <div className="flex justify-between items-center text-[9px] text-white/40">
                    <span>OSINT_LEB • 14:31:44</span>
                    <span className="text-red-400">URGENT</span>
                  </div>
                  <div className="text-[10px] text-white/90 leading-tight">
                    <span className="text-red-400 font-bold mr-1">>></span>
                    MULTIPLE LAUNCHES DETECTED FROM LEBANESE BORDER TOWARDS GALILEE.
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 p-1.5 bg-[rgba(255,255,255,0.02)] border-l-2 border-amber-500/50 rounded-r-[2px]">
                  <div className="flex justify-between items-center text-[9px] text-white/40">
                    <span>IDF_SPOX • 14:28:12</span>
                    <span className="text-amber-400/60">UPDATE</span>
                  </div>
                  <div className="text-[10px] text-white/70 leading-tight">
                    INTERCEPTIONS REPORTED OVER UPPER GALILEE REGION. NO CASUALTIES THUS FAR.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM ROW - COMPRESSED */}
        <div className="flex gap-2 h-[28px] shrink-0 opacity-70">
          {/* MARKETS */}
          <div className="panel flex-1 flex-row items-center justify-around px-4 bg-[rgba(245,158,11,0.02)] border-[rgba(245,158,11,0.1)]">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px]">OIL</span>
              <span className="text-white/80">82.45</span>
              <TrendingUp size={10} className="text-red-400" />
            </div>
            <div className="w-[1px] h-3 bg-white/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px]">GOLD</span>
              <span className="text-white/80">2,341</span>
              <TrendingUp size={10} className="text-amber-400" />
            </div>
            <div className="w-[1px] h-3 bg-white/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px]">USD/ILS</span>
              <span className="text-white/80">3.78</span>
              <TrendingDown size={10} className="text-green-400" />
            </div>
          </div>
          
          {/* ANALYTICS */}
          <div className="panel w-[150px] shrink-0 flex-row items-center justify-center gap-2 bg-[rgba(245,158,11,0.02)] border-[rgba(245,158,11,0.1)]">
            <Zap size={10} className="text-amber-500/60" />
            <span className="text-white/40 text-[9px]">24H EVENTS:</span>
            <span className="text-amber-500/80 font-bold">47</span>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="flex items-center justify-between px-2 h-[20px] shrink-0 text-[9px] text-amber-500/40 border-t border-[rgba(245,158,11,0.1)] pt-1">
          <div className="flex items-center gap-2">
            <Shield size={10} />
            <span>OREF HOME FRONT CMD</span>
          </div>
          <div className="flex items-center gap-1 font-bold text-amber-500/60 tracking-widest">
            <AlertTriangle size={10} className="amber-pulse" />
            THREAT LEVEL: ELEVATED
          </div>
          <div className="font-mono">{new Date().toISOString().split('T')[0]}</div>
        </div>

      </div>
    </div>
  );
}
