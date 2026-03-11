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
} from "lucide-react";

export default function TacticalHUD() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen text-xs overflow-hidden selection:bg-[#22C55E]/30"
      style={{
        backgroundColor: "hsl(200, 15%, 6%)",
        color: "#a3b8c2",
        fontFamily: "'JetBrains Mono', monospace, Courier New, Courier",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        
        .pulse-red {
          animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        
        .hud-panel {
          background-color: hsl(200, 15%, 8%);
          border: 1px solid rgba(34, 197, 94, 0.15);
        }
        
        .hud-grid {
          background-image: 
            linear-gradient(rgba(34, 197, 94, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .scroll-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* TOP HEADER */}
      <header className="h-12 border-b border-[#22C55E]/20 flex items-center justify-between px-4 bg-[#0a1014]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[#22C55E] font-bold tracking-widest text-lg">
            <Radio size={20} className="animate-pulse" />
            WARROOM
          </div>
          
          <div className="flex items-center gap-2 border border-[#DC2626]/30 bg-[#DC2626]/10 px-3 py-1 text-[#DC2626] font-semibold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] pulse-red"></span>
            DEFCON 2
          </div>
          
          <div className="flex items-center gap-2 border border-[#D4A017]/30 bg-[#D4A017]/10 px-3 py-1 text-[#D4A017]">
            <Activity size={14} />
            LIVE OPS
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[#22C55E] text-sm font-bold tracking-wider">{time}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Global Time</div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-6 border-b border-[#22C55E]/10 bg-[#060a0c] overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap text-[#22C55E] opacity-80 text-[10px] uppercase tracking-widest">
          <div className="px-4 border-r border-[#22C55E]/20 flex items-center gap-2">
            <span className="text-[#D4A017]">SYS_01:</span> NOMINAL
          </div>
          <div className="px-4 border-r border-[#22C55E]/20 flex items-center gap-2">
            <span className="text-[#DC2626]">SEC_ALERT:</span> UNAUTHORIZED ACCESS ATTEMPT PORT 8080
          </div>
          <div className="px-4 border-r border-[#22C55E]/20 flex items-center gap-2">
            <span className="text-[#D4A017]">SAT_UPLINK:</span> ESTABLISHED
          </div>
          <div className="px-4 border-r border-[#22C55E]/20 flex items-center gap-2">
            <span className="text-[#22C55E]">NET_TRAFFIC:</span> 45TB/s
          </div>
          <div className="px-4 border-r border-[#22C55E]/20 flex items-center gap-2">
            <span className="text-[#D4A017]">INTEL:</span> NEW DATA AVAILABLE IN SECTOR 7G
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* SIDEBAR */}
        <aside className="w-16 border-r border-[#22C55E]/20 bg-[#0a1014] flex flex-col items-center py-4 gap-6">
          <button className="text-[#22C55E] hover:bg-[#22C55E]/10 p-2 border border-transparent hover:border-[#22C55E]/30 transition-all flex flex-col items-center gap-1 group">
            <Globe size={20} />
            <span className="text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute left-14 bg-[#22C55E]/20 px-2 py-1 border border-[#22C55E]/50">Map</span>
          </button>
          <button className="text-gray-500 hover:text-[#D4A017] hover:bg-[#D4A017]/10 p-2 border border-transparent hover:border-[#D4A017]/30 transition-all flex flex-col items-center gap-1 group">
            <AlertTriangle size={20} />
            <span className="text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute left-14 bg-[#D4A017]/20 px-2 py-1 border border-[#D4A017]/50 text-[#D4A017]">Alerts</span>
          </button>
          <button className="text-gray-500 hover:text-[#22C55E] hover:bg-[#22C55E]/10 p-2 border border-transparent hover:border-[#22C55E]/30 transition-all flex flex-col items-center gap-1 group">
            <Radio size={20} />
            <span className="text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute left-14 bg-[#22C55E]/20 px-2 py-1 border border-[#22C55E]/50 text-[#22C55E]">Sigint</span>
          </button>
          <button className="text-gray-500 hover:text-[#22C55E] hover:bg-[#22C55E]/10 p-2 border border-transparent hover:border-[#22C55E]/30 transition-all flex flex-col items-center gap-1 group">
            <BarChart2 size={20} />
            <span className="text-[8px] uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute left-14 bg-[#22C55E]/20 px-2 py-1 border border-[#22C55E]/50 text-[#22C55E]">Markets</span>
          </button>
          <div className="mt-auto"></div>
          <button className="text-gray-500 hover:text-white p-2 flex flex-col items-center gap-1">
            <Cpu size={20} />
          </button>
        </aside>

        {/* MAIN GRID */}
        <main className="flex-1 p-4 grid grid-cols-12 grid-rows-6 gap-4 overflow-auto scroll-hide">
          
          {/* PANEL: INTEL MAP */}
          <div className="hud-panel col-span-8 row-span-4 flex flex-col relative overflow-hidden group">
            <div className="h-6 border-b border-[#22C55E]/20 bg-[#0a1014] flex items-center px-3 border-t-2 border-t-[#22C55E] z-10 justify-between">
              <span className="uppercase tracking-[0.2em] font-semibold text-[#22C55E]">Intel Map</span>
              <span className="text-[10px] text-gray-500">SEC-99 / LIVE</span>
            </div>
            <div className="flex-1 relative bg-[#04080a] hud-grid">
              {/* Fake Map Grid Details */}
              <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full border-t border-[#22C55E] border-dashed"></div>
                <div className="absolute top-0 left-1/2 h-full border-l border-[#22C55E] border-dashed"></div>
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-[#22C55E] rounded-full flex items-center justify-center">
                   <div className="w-16 h-16 border border-[#22C55E] rounded-full"></div>
                </div>
              </div>
              
              {/* Map Targets */}
              <div className="absolute top-[30%] left-[60%] flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-3 h-3 bg-[#DC2626] rounded-full pulse-red"></div>
                <div className="absolute w-8 h-8 border border-[#DC2626] rounded-full animate-ping opacity-20"></div>
                <div className="absolute left-4 top-4 bg-[#DC2626]/20 border border-[#DC2626]/50 px-2 py-1 text-[#DC2626] whitespace-nowrap">
                  TGT-ALPHA [NAHARIYA]
                </div>
              </div>

              <div className="absolute top-[65%] left-[40%] flex items-center justify-center">
                <div className="w-2 h-2 bg-[#D4A017] rounded-full"></div>
                <div className="absolute left-3 top-3 bg-[#D4A017]/20 border border-[#D4A017]/50 px-2 py-1 text-[#D4A017] whitespace-nowrap opacity-60">
                  UAV-01
                </div>
              </div>

              <div className="absolute top-[20%] left-[25%] flex items-center justify-center">
                <Crosshair className="text-[#22C55E] opacity-50" size={24} />
              </div>
            </div>
          </div>

          {/* PANEL: RED ALERTS */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
            <div className="h-6 border-b border-[#DC2626]/30 bg-[#0a1014] flex items-center px-3 border-t-2 border-t-[#DC2626] justify-between">
              <span className="uppercase tracking-[0.2em] font-semibold text-[#DC2626] flex items-center gap-2">
                <ShieldAlert size={14} /> Red Alerts
              </span>
              <span className="text-[10px] text-gray-500">ACT: 4</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto scroll-hide">
              {[
                { loc: "Nahariya", type: "ROCKET", time: "-00:02:14" },
                { loc: "Rosh HaNikra", type: "UAV", time: "-00:05:32" },
                { loc: "Betzet", type: "ROCKET", time: "-00:12:05" },
                { loc: "Shlomi", type: "INFIL", time: "-01:45:00" },
              ].map((alert, i) => (
                <div key={i} className="bg-[#DC2626]/5 border border-[#DC2626]/20 p-2 flex flex-col gap-1 hover:bg-[#DC2626]/10 transition-colors cursor-default">
                  <div className="flex justify-between items-center">
                    <span className="text-[#DC2626] font-bold flex items-center gap-1">
                      <MapPin size={10} /> {alert.loc}
                    </span>
                    <span className="text-gray-500 text-[10px]">{alert.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="bg-[#DC2626]/20 text-[#DC2626] px-1 text-[9px] border border-[#DC2626]/30">{alert.type}</span>
                    <span className="text-[9px] opacity-50">CONFIRMED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL: SIGINT FEED */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
             <div className="h-6 border-b border-[#22C55E]/20 bg-[#0a1014] flex items-center px-3 border-t-2 border-t-[#22C55E] justify-between">
              <span className="uppercase tracking-[0.2em] font-semibold text-[#22C55E] flex items-center gap-2">
                <Terminal size={14} /> Sigint Feed
              </span>
              <span className="text-[10px] text-gray-500">OSINT/TG</span>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto scroll-hide font-mono text-[10px]">
               {[
                { ch: "CH_ALPHA", text: "Movement detected in sector 4B. Visual confirmation pending.", time: "14:32:01" },
                { ch: "CH_BRAVO", text: "Intercepted comms: 'Operation commencement at 1500Z'", time: "14:28:44" },
                { ch: "G_NEWS", text: "Local reports of explosions near border fence.", time: "14:15:22" },
              ].map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <div className="text-gray-600 shrink-0">[{msg.time}]</div>
                  <div>
                    <span className="text-[#D4A017] shrink-0 mr-1">&lt;{msg.ch}&gt;</span>
                    <span className="text-gray-300">{msg.text}</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 opacity-50">
                  <div className="text-gray-600 shrink-0">[{time.split(' ')[0]}]</div>
                  <div>
                    <span className="text-[#22C55E] shrink-0 mr-1">&gt;</span>
                    <span className="text-gray-300 animate-pulse">_</span>
                  </div>
                </div>
            </div>
          </div>

          {/* PANEL: MKT DATA */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
            <div className="h-6 border-b border-[#D4A017]/30 bg-[#0a1014] flex items-center px-3 border-t-2 border-t-[#D4A017] justify-between">
              <span className="uppercase tracking-[0.2em] font-semibold text-[#D4A017] flex items-center gap-2">
                <BarChart2 size={14} /> Mkt Data
              </span>
              <span className="text-[10px] text-gray-500">GLOBAL SPLY</span>
            </div>
            <div className="flex-1 p-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="pb-1 font-normal">ASSET</th>
                    <th className="pb-1 font-normal text-right">PRICE</th>
                    <th className="pb-1 font-normal text-right">CHG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  <tr>
                    <td className="py-1 text-gray-300">GOLD/OZ</td>
                    <td className="py-1 text-right font-mono text-[#D4A017]">2,415.30</td>
                    <td className="py-1 text-right text-[#22C55E]">+1.2%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-300">BRENT/BBL</td>
                    <td className="py-1 text-right font-mono text-[#D4A017]">84.22</td>
                    <td className="py-1 text-right text-[#DC2626]">-0.5%</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-300">BTC/USD</td>
                    <td className="py-1 text-right font-mono text-[#D4A017]">64,102</td>
                    <td className="py-1 text-right text-[#22C55E]">+2.4%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL: NET STATUS */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
             <div className="h-6 border-b border-[#22C55E]/20 bg-[#0a1014] flex items-center px-3 border-t-2 border-t-[#22C55E] justify-between">
              <span className="uppercase tracking-[0.2em] font-semibold text-[#22C55E] flex items-center gap-2">
                <Wifi size={14} /> Net Status
              </span>
              <span className="text-[10px] text-gray-500">UPLINK</span>
            </div>
            <div className="flex-1 p-3 space-y-3">
              {[
                { loc: "EU-WEST", pct: 98, status: "nominal", color: "bg-[#22C55E]" },
                { loc: "ME-CENTRAL", pct: 45, status: "degraded", color: "bg-[#D4A017]" },
                { loc: "US-EAST", pct: 100, status: "nominal", color: "bg-[#22C55E]" },
              ].map((node, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">{node.loc}</span>
                    <span className={`${node.color.replace('bg-', 'text-')} font-mono`}>{node.pct}% [{node.status.toUpperCase()}]</span>
                  </div>
                  <div className="h-1 bg-gray-900 w-full overflow-hidden">
                    <div className={`h-full ${node.color}`} style={{ width: `${node.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
