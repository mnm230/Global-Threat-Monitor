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

export function FrostProtocol() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + "Z"
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + "Z"
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen text-[13px] overflow-hidden"
      style={{
        backgroundColor: "#f7f8fa",
        color: "#3a4553",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');
        
        .frost-panel {
          background-color: #ffffff;
          border: 1px solid #e2e6ec;
          border-radius: 2px;
        }
        
        .scroll-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* TOP HEADER */}
      <header className="h-12 bg-white flex items-center justify-between px-6 border-b border-[#e2e6ec] relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#4a90d9]" />
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-[#3a4553] font-medium tracking-[0.1em] text-sm">
            <Radio size={16} strokeWidth={1.5} />
            WARROOM
          </div>
          
          <div className="flex items-center gap-2 border border-[#e2e6ec] px-3 py-1 text-[#c44d5a] font-medium tracking-wide text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c44d5a]"></span>
            DEFCON 2
          </div>
          
          <div className="flex items-center gap-2 border border-[#e2e6ec] px-3 py-1 text-[#3a4553] font-medium text-xs">
            <Activity size={12} strokeWidth={1.5} className="text-[#4a90d9]" />
            LIVE OPS
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right flex items-center gap-4">
            <div className="text-[#3a4553] text-sm font-medium tracking-wider">{time}</div>
            <div className="text-[9px] text-[#718096] uppercase tracking-[0.15em]">Global Time</div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-8 border-b border-[#e2e6ec] bg-[#fdfdfd] overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap text-[#5a6777] text-[10px] uppercase tracking-[0.15em] font-medium">
          <div className="px-6 border-r border-[#e2e6ec] flex items-center gap-2">
            <span className="text-[#4a90d9]">SYS_01:</span> NOMINAL
          </div>
          <div className="px-6 border-r border-[#e2e6ec] flex items-center gap-2">
            <span className="text-[#c44d5a]">SEC_ALERT:</span> UNAUTHORIZED ACCESS ATTEMPT PORT 8080
          </div>
          <div className="px-6 border-r border-[#e2e6ec] flex items-center gap-2">
            <span className="text-[#4a90d9]">SAT_UPLINK:</span> ESTABLISHED
          </div>
          <div className="px-6 border-r border-[#e2e6ec] flex items-center gap-2">
            <span className="text-[#3a4553]">NET_TRAFFIC:</span> 45TB/s
          </div>
          <div className="px-6 border-r border-[#e2e6ec] flex items-center gap-2">
            <span className="text-[#4a90d9]">INTEL:</span> NEW DATA AVAILABLE IN SECTOR 7G
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* MAIN GRID - No Sidebar for cleaner look, integrated into top or panels if needed, but keeping structure per instructions means preserving left elements or adjusting */}
        <aside className="w-16 border-r border-[#e2e6ec] bg-[#ffffff] flex flex-col items-center py-6 gap-8">
          <button className="text-[#5a6777] hover:text-[#4a90d9] transition-colors flex flex-col items-center gap-1 group relative">
            <Globe size={18} strokeWidth={1.5} />
          </button>
          <button className="text-[#5a6777] hover:text-[#4a90d9] transition-colors flex flex-col items-center gap-1 group relative">
            <AlertTriangle size={18} strokeWidth={1.5} />
          </button>
          <button className="text-[#5a6777] hover:text-[#4a90d9] transition-colors flex flex-col items-center gap-1 group relative">
            <Radio size={18} strokeWidth={1.5} />
          </button>
          <button className="text-[#5a6777] hover:text-[#4a90d9] transition-colors flex flex-col items-center gap-1 group relative">
            <BarChart2 size={18} strokeWidth={1.5} />
          </button>
          <div className="mt-auto"></div>
          <button className="text-[#5a6777] hover:text-[#4a90d9] transition-colors flex flex-col items-center gap-1">
            <Cpu size={18} strokeWidth={1.5} />
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6 grid grid-cols-12 grid-rows-6 gap-6 overflow-auto scroll-hide bg-[#f7f8fa]">
          
          {/* PANEL: INTEL MAP */}
          <div className="frost-panel col-span-8 row-span-4 flex flex-col relative overflow-hidden">
            <div className="h-10 border-b border-[#e2e6ec] bg-white flex items-center px-5 justify-between">
              <span className="uppercase tracking-[0.25em] font-medium text-[#3a4553] text-[10px]">Intel Map</span>
              <span className="text-[10px] tracking-wider text-[#718096]">SEC-99 / LIVE</span>
            </div>
            <div className="flex-1 relative bg-[#fafbfc]">
              {/* Clinical Map Grid Details */}
              <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full border-t border-[#e2e6ec] border-solid"></div>
                <div className="absolute top-0 left-1/2 h-full border-l border-[#e2e6ec] border-solid"></div>
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-[#e2e6ec] rounded-full flex items-center justify-center">
                   <div className="w-16 h-16 border border-[#e2e6ec] rounded-full"></div>
                </div>
              </div>
              
              {/* Map Targets */}
              <div className="absolute top-[30%] left-[60%] flex items-center justify-center">
                <div className="w-2 h-2 bg-[#c44d5a] rounded-full"></div>
                <div className="absolute left-4 top-4 bg-white border border-[#e2e6ec] px-3 py-1.5 text-[#3a4553] text-xs font-medium whitespace-nowrap shadow-sm">
                  TGT-ALPHA <span className="text-[#718096] ml-2 font-normal">NAHARIYA</span>
                </div>
              </div>

              <div className="absolute top-[65%] left-[40%] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#4a90d9] rounded-full"></div>
                <div className="absolute left-3 top-3 bg-white border border-[#e2e6ec] px-2 py-1 text-[#5a6777] text-[10px] tracking-wide whitespace-nowrap">
                  UAV-01
                </div>
              </div>

              <div className="absolute top-[20%] left-[25%] flex items-center justify-center">
                <Crosshair className="text-[#718096] opacity-40" size={20} strokeWidth={1} />
              </div>
            </div>
          </div>

          {/* PANEL: RED ALERTS */}
          <div className="frost-panel col-span-4 row-span-3 flex flex-col">
            <div className="h-10 border-b border-[#e2e6ec] bg-white flex items-center px-5 justify-between">
              <span className="uppercase tracking-[0.25em] font-medium text-[#3a4553] flex items-center gap-2 text-[10px]">
                <ShieldAlert size={12} strokeWidth={1.5} className="text-[#c44d5a]" /> Critical Events
              </span>
              <span className="text-[10px] tracking-wider text-[#718096]">ACT: 4</span>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto scroll-hide">
              {[
                { loc: "Nahariya", type: "ROCKET", time: "-00:02:14" },
                { loc: "Rosh HaNikra", type: "UAV", time: "-00:05:32" },
                { loc: "Betzet", type: "ROCKET", time: "-00:12:05" },
                { loc: "Shlomi", type: "INFIL", time: "-01:45:00" },
              ].map((alert, i) => (
                <div key={i} className="border border-[#e2e6ec] p-3 flex flex-col gap-2 bg-white">
                  <div className="flex justify-between items-center">
                    <span className="text-[#3a4553] font-medium flex items-center gap-2 text-xs">
                      <MapPin size={12} strokeWidth={1.5} className="text-[#718096]" /> {alert.loc}
                    </span>
                    <span className="text-[#718096] text-[10px] font-mono">{alert.time}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[#c44d5a] font-medium text-[9px] tracking-wider uppercase">{alert.type}</span>
                    <span className="text-[9px] text-[#718096] uppercase tracking-wider">CONFIRMED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL: SIGINT FEED */}
          <div className="frost-panel col-span-4 row-span-3 flex flex-col">
             <div className="h-10 border-b border-[#e2e6ec] bg-white flex items-center px-5 justify-between">
              <span className="uppercase tracking-[0.25em] font-medium text-[#3a4553] flex items-center gap-2 text-[10px]">
                <Terminal size={12} strokeWidth={1.5} className="text-[#4a90d9]" /> Signal Intelligence
              </span>
              <span className="text-[10px] tracking-wider text-[#718096]">OSINT/TG</span>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto scroll-hide text-xs">
               {[
                { ch: "CH_ALPHA", text: "Movement detected in sector 4B. Visual confirmation pending.", time: "14:32:01" },
                { ch: "CH_BRAVO", text: "Intercepted comms: 'Operation commencement at 1500Z'", time: "14:28:44" },
                { ch: "G_NEWS", text: "Local reports of explosions near border fence.", time: "14:15:22" },
              ].map((msg, i) => (
                <div key={i} className="flex gap-4 items-start border-b border-[#f0f2f5] pb-4 last:border-0 last:pb-0">
                  <div className="text-[#718096] shrink-0 font-mono text-[10px] mt-0.5">{msg.time}</div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[#4a90d9] text-[10px] font-medium tracking-wider">{msg.ch}</span>
                    <span className="text-[#3a4553] leading-relaxed">{msg.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL: MKT DATA */}
          <div className="frost-panel col-span-4 row-span-2 flex flex-col">
            <div className="h-10 border-b border-[#e2e6ec] bg-white flex items-center px-5 justify-between">
              <span className="uppercase tracking-[0.25em] font-medium text-[#3a4553] flex items-center gap-2 text-[10px]">
                <BarChart2 size={12} strokeWidth={1.5} className="text-[#718096]" /> Market Indices
              </span>
              <span className="text-[10px] tracking-wider text-[#718096]">GLOBAL SPLY</span>
            </div>
            <div className="flex-1 p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e6ec] text-[#718096]">
                    <th className="pb-3 text-[10px] font-medium tracking-wider uppercase">Asset</th>
                    <th className="pb-3 text-[10px] font-medium tracking-wider uppercase text-right">Price</th>
                    <th className="pb-3 text-[10px] font-medium tracking-wider uppercase text-right">Chg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f5]">
                  <tr>
                    <td className="py-3 text-[#3a4553] font-medium text-xs">GOLD/OZ</td>
                    <td className="py-3 text-right font-mono text-[#5a6777] text-xs">2,415.30</td>
                    <td className="py-3 text-right text-[#3a4553] text-xs font-medium">+1.2%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-[#3a4553] font-medium text-xs">BRENT/BBL</td>
                    <td className="py-3 text-right font-mono text-[#5a6777] text-xs">84.22</td>
                    <td className="py-3 text-right text-[#c44d5a] text-xs font-medium">-0.5%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-[#3a4553] font-medium text-xs">BTC/USD</td>
                    <td className="py-3 text-right font-mono text-[#5a6777] text-xs">64,102</td>
                    <td className="py-3 text-right text-[#3a4553] text-xs font-medium">+2.4%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL: NET STATUS */}
          <div className="frost-panel col-span-4 row-span-2 flex flex-col">
             <div className="h-10 border-b border-[#e2e6ec] bg-white flex items-center px-5 justify-between">
              <span className="uppercase tracking-[0.25em] font-medium text-[#3a4553] flex items-center gap-2 text-[10px]">
                <Wifi size={12} strokeWidth={1.5} className="text-[#4a90d9]" /> Network Uplink
              </span>
              <span className="text-[10px] tracking-wider text-[#718096]">STATUS</span>
            </div>
            <div className="flex-1 p-5 space-y-4">
              {[
                { loc: "EU-WEST", pct: 98, status: "nominal", color: "bg-[#4a90d9]" },
                { loc: "ME-CENTRAL", pct: 45, status: "degraded", color: "bg-[#c44d5a]" },
                { loc: "US-EAST", pct: 100, status: "nominal", color: "bg-[#4a90d9]" },
              ].map((node, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#5a6777] font-medium tracking-wide">{node.loc}</span>
                    <span className="text-[#718096] font-mono tracking-wider">{node.pct}% <span className="ml-1 text-[#3a4553]">{node.status.toUpperCase()}</span></span>
                  </div>
                  <div className="h-1 bg-[#f0f2f5] w-full rounded-none overflow-hidden">
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

export default FrostProtocol;
