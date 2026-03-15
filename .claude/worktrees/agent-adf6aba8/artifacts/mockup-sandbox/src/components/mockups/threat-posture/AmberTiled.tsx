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

export function AmberTiled() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 font-mono text-[10px] select-none" style={{ 
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
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          height: 24px;
          shrink: 0;
        }
        .panel-content {
          padding: 8px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
      `}} />

      <div className="w-[800px] h-[500px] flex flex-col gap-[3px] relative z-10" style={{
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(245, 158, 11, 0.05)",
      }}>
        
        {/* ROW 1: Alerts, Map, Sirens */}
        <div className="flex gap-[3px] flex-1 min-h-0">
          
          {/* Cell [0,0] - ALERTS */}
          <div className="panel flex-1 border-[1px] border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.04)]">
            <div className="panel-header bg-[rgba(239,68,68,0.05)] text-red-400 border-b border-[rgba(239,68,68,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 red-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
              <span className="flex-1 tracking-widest">ALERTS</span>
              <span className="bg-red-500/20 px-1 py-[1px] rounded-[2px] text-[9px] border border-red-500/30">3</span>
            </div>
            <div className="panel-content gap-1.5 justify-center">
              <div className="flex items-center justify-between bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[2px] overflow-hidden">
                <div className="w-[3px] h-full bg-red-500 shrink-0 self-stretch"></div>
                <div className="flex-1 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">KIRYAT SHMONA</span>
                    <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded-[2px] border border-red-500/20">RKT</span>
                  </div>
                  <div className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 12s
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-[2px] overflow-hidden">
                <div className="w-[3px] h-full bg-amber-500 shrink-0 self-stretch"></div>
                <div className="flex-1 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">METULA</span>
                    <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded-[2px] border border-amber-500/20">RKT</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 45s
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-[rgba(245,158,11,0.03)] border border-[rgba(245,158,11,0.1)] rounded-[2px] overflow-hidden">
                <div className="w-[3px] h-full bg-amber-500/70 shrink-0 self-stretch"></div>
                <div className="flex-1 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400/80 font-bold">NAHARIYA</span>
                    <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded-[2px] border border-blue-500/20">UAV</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-500/80 flex items-center gap-1">
                    <Clock size={10} className="opacity-70" /> 90s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cell [0,1] - MAP */}
          <div className="panel flex-1 border-[1px] border-[rgba(245,158,11,0.15)] relative">
            <div className="panel-header text-amber-500/80 border-b border-[rgba(245,158,11,0.1)] bg-[rgba(245,158,11,0.03)] absolute top-0 left-0 right-0 z-20">
              <Crosshair size={12} />
              <span className="flex-1 tracking-widest text-[9px]">TACTICAL MAP</span>
            </div>
            <div className="absolute inset-0 map-grid opacity-30 mt-[24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,28%,4%)] to-transparent opacity-80 z-0 mt-[24px]"></div>
            
            <div className="absolute top-[45%] left-[30%] flex items-center justify-center z-10">
              <div className="absolute w-6 h-6 rounded-full border border-red-500/30 amber-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
              <div className="absolute top-2 left-2 text-[7px] text-red-400 bg-[hsl(222,28%,4%)] px-1 border border-red-500/30 rounded-[2px]">IMPACT_A</div>
            </div>
            
            <div className="absolute top-[35%] left-[65%] flex items-center justify-center z-10">
              <div className="absolute w-5 h-5 rounded-full border border-amber-500/30 amber-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]"></div>
              <div className="absolute top-2 left-2 text-[7px] text-amber-400 bg-[hsl(222,28%,4%)] px-1 border border-amber-500/30 rounded-[2px]">UAV_01</div>
            </div>
            
            <div className="absolute left-0 right-0 h-[2px] bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-0 mt-[24px]" style={{ animation: 'scanline 3s linear infinite' }}></div>
            <div className="absolute bottom-1 right-2 text-[8px] text-white/30 z-20">N 33° 12' / E 35° 34'</div>
          </div>

          {/* Cell [0,2] - SIRENS & STATUS */}
          <div className="panel flex-1 border-[1px] border-[rgba(239,68,68,0.2)]">
            <div className="panel-header text-red-400 border-b border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)]">
              <Radio size={12} className="red-pulse" />
              <span className="flex-1 tracking-widest text-[9px]">SIRENS & STATUS</span>
            </div>
            <div className="panel-content justify-between">
              <div className="flex flex-col gap-2">
                <div className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-1 rounded-[2px] text-[9px] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full red-pulse"></span>
                  GALILEY PANHANDLE
                </div>
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-[2px] text-[9px] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full amber-pulse"></span>
                  UPPER GALILEE
                </div>
              </div>
              
              <div className="flex flex-col gap-1 items-center justify-center p-2 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-[2px]">
                <div className="flex items-center gap-2 text-amber-500 font-bold tracking-widest text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-amber-500 amber-pulse" style={{ boxShadow: "0 0 8px rgba(245, 158, 11, 0.8)" }}></div>
                  CONDITION AMBER
                </div>
                <div className="text-[8px] text-amber-400/70 tracking-widest">THREAT LEVEL: ELEVATED</div>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: Intel, Markets, Analytics */}
        <div className="flex gap-[3px] flex-1 min-h-0">
          
          {/* Cell [1,0] - INTEL FEED */}
          <div className="panel flex-1 border-[1px] border-[rgba(245,158,11,0.2)]">
            <div className="panel-header text-amber-500/90 border-b border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.04)]">
              <Search size={12} />
              <span className="flex-1 tracking-widest text-[9px]">INTEL FEED</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 amber-pulse"></span>
            </div>
            <div className="panel-content gap-2">
              <div className="flex flex-col gap-1 p-1.5 bg-[rgba(239,68,68,0.05)] border-l-2 border-red-500 rounded-r-[2px]">
                <div className="flex justify-between items-center text-[8px] text-white/40">
                  <span>OSINT_LEB • 14:31:44</span>
                  <span className="text-red-400 bg-red-500/20 px-1 rounded-[2px]">URGENT</span>
                </div>
                <div className="text-[9px] text-white/90 leading-tight">
                  MULTIPLE LAUNCHES DETECTED FROM LEBANESE BORDER.
                </div>
              </div>
              <div className="flex flex-col gap-1 p-1.5 bg-[rgba(255,255,255,0.02)] border-l-2 border-amber-500/50 rounded-r-[2px]">
                <div className="flex justify-between items-center text-[8px] text-white/40">
                  <span>IDF_SPOX • 14:28:12</span>
                </div>
                <div className="text-[9px] text-white/70 leading-tight">
                  INTERCEPTIONS REPORTED OVER UPPER GALILEE.
                </div>
              </div>
            </div>
          </div>

          {/* Cell [1,1] - MARKETS */}
          <div className="panel flex-1 border-[1px] border-[rgba(245,158,11,0.1)] opacity-85">
            <div className="panel-header text-amber-500/70 border-b border-[rgba(245,158,11,0.05)] bg-[rgba(245,158,11,0.02)]">
              <TrendingUp size={12} />
              <span className="flex-1 tracking-widest text-[9px]">MARKETS</span>
            </div>
            <div className="panel-content justify-center gap-3 px-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-white/40">OIL</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/80">82.45</span>
                  <TrendingUp size={10} className="text-red-400" />
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-white/40">GOLD</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/80">2,341</span>
                  <TrendingUp size={10} className="text-amber-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">USD/ILS</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/80">3.78</span>
                  <TrendingDown size={10} className="text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Cell [1,2] - ANALYTICS */}
          <div className="panel flex-1 border-[1px] border-[rgba(245,158,11,0.1)] opacity-85">
            <div className="panel-header text-amber-500/70 border-b border-[rgba(245,158,11,0.05)] bg-[rgba(245,158,11,0.02)]">
              <Activity size={12} />
              <span className="flex-1 tracking-widest text-[9px]">ANALYTICS</span>
            </div>
            <div className="panel-content items-center justify-center gap-3">
              <div className="flex flex-col items-center">
                <div className="text-amber-500/80 font-bold text-[24px] leading-none">47</div>
                <div className="text-white/40 text-[8px]">24H EVENTS</div>
              </div>
              
              <div className="flex items-end gap-1.5 h-[30px] opacity-80 mt-2">
                <div className="w-[8px] bg-amber-500/30 h-[40%] rounded-t-[1px]"></div>
                <div className="w-[8px] bg-amber-500/40 h-[60%] rounded-t-[1px]"></div>
                <div className="w-[8px] bg-amber-500/50 h-[30%] rounded-t-[1px]"></div>
                <div className="w-[8px] bg-amber-500/80 h-[90%] rounded-t-[1px]"></div>
                <div className="w-[8px] bg-amber-500/40 h-[50%] rounded-t-[1px]"></div>
                <div className="w-[8px] bg-amber-500/60 h-[70%] rounded-t-[1px]"></div>
              </div>
              
              <div className="text-[7px] text-white/30 tracking-widest mt-1">PEAK: 14:00-15:00 UTC</div>
            </div>
          </div>

        </div>

        {/* BOTTOM ROW: Status Bar */}
        <div className="flex items-center justify-between px-3 h-[24px] shrink-0 rounded-[3px] border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.05)] text-[9px]">
          <div className="flex items-center gap-2 text-white/40">
            <Shield size={10} />
            <span>OREF HOME FRONT CMD</span>
          </div>
          
          <div className="flex items-center gap-2 text-amber-500/80 font-bold tracking-widest">
            <span>WARROOM</span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 amber-pulse" style={{ boxShadow: "0 0 6px rgba(245, 158, 11, 0.6)" }}></div>
            <span>ELEVATED</span>
          </div>
          
          <div className="text-white/40 font-mono">
            14:32:01 UTC &nbsp; {new Date().toISOString().split('T')[0]}
          </div>
        </div>

      </div>
    </div>
  );
}
