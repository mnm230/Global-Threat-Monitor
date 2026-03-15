import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Globe,
  Radio,
  Wifi,
  Crosshair,
  BarChart2,
  Cpu,
  ShieldAlert,
  MapPin,
  Clock,
  Terminal,
  MessageSquare,
  AlertCircle
} from "lucide-react";

export default function NeonPulse() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen text-[10px] overflow-hidden selection:bg-[#ff0066]/30 relative"
      style={{
        backgroundColor: "#0a0e1a",
        color: "#ffffff",
        fontFamily: "'JetBrains Mono', monospace, Courier New, Courier",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        .glow-cyan {
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.15);
        }
        
        .glow-magenta {
          box-shadow: 0 0 12px rgba(255, 0, 102, 0.4);
        }
        
        .pulse-magenta {
          animation: pulse-magenta 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-magenta {
          0%, 100% { opacity: 1; box-shadow: 0 0 15px rgba(255, 0, 102, 0.6); }
          50% { opacity: .7; box-shadow: 0 0 5px rgba(255, 0, 102, 0.2); }
        }

        .pulse-cyan {
          animation: pulse-cyan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-cyan {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(0, 229, 255, 0.5); }
          50% { opacity: .6; box-shadow: 0 0 2px rgba(0, 229, 255, 0.1); }
        }
        
        .hud-panel {
          background-color: #0d1224;
          border: 1px solid #00e5ff;
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.15);
        }
        
        .hud-panel:hover {
          box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
        }
        
        .dot-grid {
          background-image: radial-gradient(rgba(0, 229, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .scroll-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(0, 229, 255, 0.3);
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
          animation: scan 8s linear infinite;
          pointer-events: none;
          z-index: 50;
        }
        
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        .gradient-underline {
          background: linear-gradient(90deg, #ff0066 0%, #00e5ff 100%);
          height: 1px;
          width: 100%;
        }
      `}} />

      {/* BACKGROUND DOT GRID & SCAN LINE */}
      <div className="absolute inset-0 dot-grid pointer-events-none"></div>
      <div className="scan-line"></div>

      {/* TOP HEADER */}
      <header className="h-12 border-b border-[#00e5ff]/30 flex items-center justify-between px-4 bg-[#0a0e1a] relative z-10 glow-cyan">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[#00e5ff] font-bold tracking-widest text-[14px]">
            <Radio size={18} className="animate-pulse" />
            WARROOM_OS
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-6 absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 border border-[#ff0066] bg-[#ff0066]/10 px-3 py-1 text-[#ff0066] font-bold tracking-wider shadow-[0_0_10px_rgba(255,0,102,0.3)]">
            <span className="w-2 h-2 rounded-full bg-[#ff0066] pulse-magenta"></span>
            DEFCON 2
          </div>
          <div className="text-[#ffffff] text-[12px] font-bold tracking-wider flex items-center gap-2 bg-[#0d1224] border border-[#00e5ff]/50 px-3 py-1 glow-cyan">
            <Clock size={12} className="text-[#00e5ff]"/>
            {time}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
              <span className="text-[#00e5ff] text-[10px]">SYS.OP</span>
              <span className="text-white/50 text-[8px]">ROOT</span>
             </div>
             <div className="w-8 h-8 rounded-full border border-[#00e5ff] flex items-center justify-center bg-[#0d1224] glow-cyan">
                <ShieldAlert size={14} className="text-[#00e5ff]"/>
             </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-8 border-b border-[#00e5ff]/20 bg-[#060810] overflow-hidden flex items-center relative z-10">
        <div className="flex whitespace-nowrap text-[10px] uppercase tracking-widest font-bold">
          <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">WTI_CRUDE</span>
            <span className="text-white">82.14</span>
            <span className="text-[#00e5ff]">+1.2%</span>
          </div>
          <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">BRENT</span>
            <span className="text-white">86.42</span>
            <span className="text-[#ff0066]">-0.8%</span>
          </div>
           <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">GOLD_OZ</span>
            <span className="text-white">2,345.10</span>
            <span className="text-[#00e5ff]">+0.4%</span>
          </div>
          <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">BTC_USD</span>
            <span className="text-white">67,210</span>
            <span className="text-[#ff0066]">-2.1%</span>
          </div>
          <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">EUR_USD</span>
            <span className="text-white">1.084</span>
            <span className="text-[#00e5ff]">+0.1%</span>
          </div>
          <div className="px-6 border-r border-[#00e5ff]/30 flex items-center gap-2">
            <span className="text-[#00e5ff]">SPX500</span>
            <span className="text-white">5,204.30</span>
            <span className="text-[#00e5ff]">+1.5%</span>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-12 gap-4 h-[calc(100vh-80px)] overflow-hidden relative z-10">
        
        {/* ROW 1 */}
        {/* PANEL: INTEL MAP */}
        <div className="hud-panel col-span-6 flex flex-col relative overflow-hidden group">
          <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <Globe size={14} className="text-[#00e5ff]" /> THEATER_MAP // GLOBAL
            </span>
            <span className="text-[10px] text-[#00e5ff] border border-[#00e5ff]/50 px-1">LIVE</span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 relative bg-[#060810] overflow-hidden">
            <div className="absolute inset-0 dot-grid opacity-50"></div>
            {/* Map Accents */}
            <div className="absolute top-1/2 left-0 w-full border-t border-[#00e5ff]/20"></div>
            <div className="absolute top-0 left-1/2 h-full border-l border-[#00e5ff]/20"></div>
            
            <div className="absolute top-[20%] left-[30%] w-48 h-48 border border-[#00e5ff]/30 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 border border-[#7c4dff]/40 rounded-full"></div>
            </div>

            {/* Targets */}
            <div className="absolute top-[40%] left-[60%] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#ff0066] rounded-full pulse-magenta"></div>
              <div className="absolute w-12 h-12 border border-[#ff0066] rounded-full animate-ping opacity-30"></div>
              <div className="absolute left-4 top-[-10px] bg-[#0a0e1a] border border-[#ff0066] px-2 py-1 text-white whitespace-nowrap glow-magenta z-10">
                <span className="text-[#ff0066] font-bold mr-2">!</span>TGT_DAMASCUS_01
              </div>
            </div>

            <div className="absolute top-[60%] left-[35%] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#00e5ff] rounded-full pulse-cyan"></div>
              <div className="absolute left-4 top-2 bg-[#0a0e1a] border border-[#00e5ff]/50 px-2 py-0.5 text-white whitespace-nowrap opacity-80">
                UAV_PATROL_X9
              </div>
            </div>

             <div className="absolute top-[30%] left-[70%] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#7c4dff] rounded-full shadow-[0_0_8px_#7c4dff]"></div>
              <div className="absolute left-4 top-2 bg-[#0a0e1a] border border-[#7c4dff]/50 px-2 py-0.5 text-white whitespace-nowrap opacity-80">
                SIGINT_NODE
              </div>
            </div>

            <div className="absolute bottom-4 left-4 text-[#00e5ff]/50 text-[8px] flex flex-col gap-1">
              <span>COORD: 33.5138° N, 36.2765° E</span>
              <span>SCALE: 1:50,000</span>
            </div>
          </div>
        </div>

        {/* PANEL: RED ALERTS */}
        <div className="hud-panel col-span-3 flex flex-col">
          <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#ff0066]" /> ACTIVE_THREATS
            </span>
            <span className="text-[10px] text-[#ff0066] pulse-magenta">4_NEW</span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto scroll-hide">
            {[
              { loc: "DAMASCUS_SUBURB", type: "KINETIC", time: "-00:02:14" },
              { loc: "RED_SEA_SECTOR", type: "NAVAL_DRONE", time: "-00:05:32" },
              { loc: "BEIRUT_SOUTH", type: "AIRSPACE_V", time: "-00:12:05" },
              { loc: "GOLAN_HGT", type: "ARTILLERY", time: "-01:45:00" },
              { loc: "HOMS_FACILITY", type: "KINETIC", time: "-02:10:00" },
            ].map((alert, i) => (
              <div key={i} className="bg-[#0a0e1a] border border-[#ff0066]/40 p-2 flex flex-col gap-1 hover:border-[#ff0066] hover:bg-[#ff0066]/10 transition-colors cursor-default relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff0066] group-hover:w-2 transition-all"></div>
                <div className="flex justify-between items-center pl-2">
                  <span className="text-white font-bold flex items-center gap-1 text-[11px]">
                     {alert.loc}
                  </span>
                  <span className="text-[#00e5ff] text-[9px]">{alert.time}</span>
                </div>
                <div className="flex justify-between items-center mt-1 pl-2">
                  <span className="bg-[#ff0066]/20 text-[#ff0066] px-1 text-[9px] border border-[#ff0066]/50 uppercase">{alert.type}</span>
                  <span className="text-[#ff0066] text-[9px] font-bold">CRITICAL</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL: EVENTS */}
        <div className="hud-panel col-span-3 flex flex-col">
           <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <Activity size={14} className="text-[#7c4dff]" /> INTEL_EVENTS
            </span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto scroll-hide">
            {[
              { title: "Convoy Movement Detected", desc: "Satellite imagery confirms movement of 12 heavy vehicles near border.", src: "SAT_IMINT", time: "10m ago", color: "#7c4dff" },
              { title: "Cyber Penetration Attempt", desc: "Multiple login failures on DEF-NET gateway originating from known hostile IP blocks.", src: "CYBER_COM", time: "45m ago", color: "#00e5ff" },
              { title: "Diplomatic Comm Intercept", desc: "Encrypted transmission intercepted, decryption in progress (Est. 4h).", src: "SIGINT_A", time: "2h ago", color: "#7c4dff" },
            ].map((ev, i) => (
              <div key={i} className="bg-[#0a0e1a] border border-white/10 p-2 flex flex-col gap-2 hover:border-[#7c4dff]/50 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="text-white font-bold text-[11px] leading-tight">{ev.title}</span>
                </div>
                <span className="text-white/60 text-[9px] leading-relaxed">{ev.desc}</span>
                <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1">
                  <span className="text-[9px]" style={{color: ev.color}}>[{ev.src}]</span>
                  <span className="text-white/40 text-[9px]">{ev.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 2 */}
        {/* PANEL: TELEGRAM */}
        <div className="hud-panel col-span-4 flex flex-col">
          <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <MessageSquare size={14} className="text-[#00e5ff]" /> COMMS_INTERCEPT
            </span>
             <span className="text-[10px] text-white/50">RAW_FEED</span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto scroll-hide">
            {[
              { source: "@OSINT_Update", text: "Local sources reporting massive power outage in Sector 4 following blasts.", time: "14:32:01" },
              { source: "CH_SEC_09", text: "Units mobilized. Awaiting further instruction.", time: "14:28:44" },
              { source: "@WarMonitor", text: "Air traffic completely halted over designated area. NOTAM issued.", time: "14:15:22" },
              { source: "UNVERIFIED_NET", text: "Video surfaces showing air defense intercept over populated zone.", time: "14:02:10" },
            ].map((msg, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <div className="text-[#00e5ff]/50 shrink-0 mt-0.5">[{msg.time}]</div>
                <div className="flex flex-col">
                  <span className="text-[#7c4dff] font-bold">{msg.source}</span>
                  <span className="text-white/80 mt-0.5">{msg.text}</span>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4 items-center">
               <span className="text-[#00e5ff] font-bold">&gt;</span>
               <span className="w-2 h-4 bg-[#00e5ff] animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* PANEL: MARKETS */}
        <div className="hud-panel col-span-4 flex flex-col">
          <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <BarChart2 size={14} className="text-[#00e5ff]" /> GLOBAL_MARKETS
            </span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 p-4 grid grid-cols-2 gap-4">
            {[
               { sym: "BRENT", val: "86.42", chg: "-0.8%", isUp: false },
               { sym: "WTI", val: "82.14", chg: "+1.2%", isUp: true },
               { sym: "GOLD", val: "2,345.10", chg: "+0.4%", isUp: true },
               { sym: "BTC", val: "67,210", chg: "-2.1%", isUp: false },
               { sym: "USD/ILS", val: "3.72", chg: "+0.5%", isUp: true },
               { sym: "VIX", val: "15.40", chg: "+4.2%", isUp: true },
            ].map((mkt, i) => (
              <div key={i} className="bg-[#0a0e1a] border border-white/10 p-3 flex flex-col justify-between group hover:border-[#00e5ff]/50 transition-colors">
                <span className="text-white/60 font-bold">{mkt.sym}</span>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-white text-[14px] font-bold">{mkt.val}</span>
                  <span className={`${mkt.isUp ? 'text-[#00e5ff]' : 'text-[#ff0066]'} font-bold text-[11px]`}>
                    {mkt.chg}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL: SYSTEM STATUS */}
        <div className="hud-panel col-span-4 flex flex-col">
          <div className="h-7 bg-[#0a0e1a] flex items-center px-3 justify-between">
            <span className="uppercase tracking-widest text-[11px] font-bold text-white flex items-center gap-2">
              <Cpu size={14} className="text-[#7c4dff]" /> SYS_DIAGNOSTICS
            </span>
          </div>
          <div className="gradient-underline"></div>
          <div className="flex-1 p-4 flex flex-col gap-4">
             {[
                { label: "SAT_UPLINK", val: 98, color: "#00e5ff" },
                { label: "GRID_POWER", val: 100, color: "#00e5ff" },
                { label: "DATA_NODE_M1", val: 65, color: "#7c4dff" },
                { label: "SEC_FIREWALL", val: 42, color: "#ff0066" },
              ].map((sys, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-white">{sys.label}</span>
                    <span style={{color: sys.color}}>{sys.val}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0a0e1a] border border-white/10 w-full overflow-hidden">
                    <div className="h-full relative" style={{ width: `${sys.val}%`, backgroundColor: sys.color }}>
                       <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center text-[#00e5ff]">
                 <span className="flex items-center gap-2"><AlertCircle size={12}/> SYS_INTEGRITY: OPTIMAL</span>
                 <span className="bg-[#00e5ff]/20 px-2 py-0.5 border border-[#00e5ff]/50">RUNNING</span>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
