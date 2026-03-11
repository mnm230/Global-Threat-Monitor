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

export function WarmEmber() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + 'Z');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen text-sm overflow-hidden selection:bg-[#c88b4a]/30"
      style={{
        backgroundColor: "#16120f",
        backgroundImage: "radial-gradient(circle at 50% 0%, #211c17 0%, #16120f 100%)",
        color: "#a89b8d",
        fontFamily: "'Inter', sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        
        .pulse-amber {
          animation: pulse-amber 3s ease-in-out infinite;
        }
        @keyframes pulse-amber {
          0%, 100% { opacity: 0.8; box-shadow: 0 0 8px rgba(212, 165, 116, 0.4); }
          50% { opacity: 0.3; box-shadow: 0 0 2px rgba(212, 165, 116, 0.1); }
        }

        .pulse-orange {
          animation: pulse-orange 2s ease-in-out infinite;
        }
        @keyframes pulse-orange {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(200, 139, 74, 0.6); }
          50% { opacity: 0.4; box-shadow: 0 0 2px rgba(200, 139, 74, 0.2); }
        }
        
        .hud-panel {
          background-color: #1a1512;
          border: 1px solid rgba(212, 165, 116, 0.1);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(180, 120, 60, 0.04), inset 0 1px 0 rgba(255,255,255,0.02);
          transition: all 0.3s ease;
        }
        
        .hud-panel:hover {
          border-color: rgba(212, 165, 116, 0.25);
          box-shadow: 0 8px 32px rgba(180, 120, 60, 0.08), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 12px rgba(212, 165, 116, 0.05);
        }

        .scroll-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* TOP HEADER */}
      <header className="h-14 border-b border-[#d4a574]/10 flex items-center justify-between px-6 bg-[#1a1512]/80 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-[#d4a574] font-semibold tracking-wider text-lg">
            <Globe size={22} className="opacity-80" />
            WARROOM
          </div>
          
          <div className="flex items-center gap-2 bg-[#1a1512] border border-[#c75050]/20 px-4 py-1.5 rounded-full text-[#c75050] font-medium text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c75050] pulse-orange"></span>
            DEFCON 2
          </div>
          
          <div className="flex items-center gap-2 bg-[#1a1512] border border-[#c88b4a]/20 px-4 py-1.5 rounded-full text-[#c88b4a] font-medium text-sm">
            <Activity size={16} />
            LIVE OPS
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-[#8c7a6b]" />
            <div className="text-right flex flex-col justify-center">
              <div className="text-[#d4a574] text-sm font-medium tracking-wide leading-tight">{time}</div>
              <div className="text-[11px] text-[#8c7a6b] uppercase tracking-wider leading-tight">Global Time</div>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-8 border-b border-[#d4a574]/5 bg-[#16120f] overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap text-[#a89b8d] text-[11px] uppercase tracking-wider font-medium">
          <div className="px-6 border-r border-[#d4a574]/10 flex items-center gap-2">
            <span className="text-[#8c7a6b]">SYS_01:</span> <span className="text-[#d4a574]">NOMINAL</span>
          </div>
          <div className="px-6 border-r border-[#d4a574]/10 flex items-center gap-2">
            <span className="text-[#c75050]">SEC_ALERT:</span> UNAUTHORIZED ACCESS ATTEMPT PORT 8080
          </div>
          <div className="px-6 border-r border-[#d4a574]/10 flex items-center gap-2">
            <span className="text-[#8c7a6b]">SAT_UPLINK:</span> <span className="text-[#c88b4a]">ESTABLISHED</span>
          </div>
          <div className="px-6 border-r border-[#d4a574]/10 flex items-center gap-2">
            <span className="text-[#8c7a6b]">NET_TRAFFIC:</span> <span className="text-[#d4a574]">45TB/s</span>
          </div>
          <div className="px-6 border-r border-[#d4a574]/10 flex items-center gap-2">
            <span className="text-[#8c7a6b]">INTEL:</span> NEW DATA AVAILABLE IN SECTOR 7G
          </div>
        </div>
      </div>

      <div className="p-6 h-[calc(100vh-88px)] box-border">
        {/* MAIN GRID */}
        <main className="w-full h-full grid grid-cols-12 grid-rows-6 gap-6">
          
          {/* PANEL: INTEL MAP */}
          <div className="hud-panel col-span-8 row-span-4 flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-[#d4a574]">
                <Globe size={16} className="opacity-70" />
                <span className="font-medium text-sm">Strategic Overview</span>
              </div>
              <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#d4a574]/5">SEC-99 / LIVE</span>
            </div>
            <div className="flex-1 relative bg-[#16120f]/50 overflow-hidden">
              {/* Soft vignette */}
              <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(26,21,18,0.8)] pointer-events-none z-10"></div>
              
              {/* Map abstract visualization */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-20 border border-[#d4a574] rounded-[40px] rotate-3"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] opacity-10 border border-[#c88b4a] rounded-[30px] -rotate-2"></div>
              
              {/* Map Targets */}
              <div className="absolute top-[30%] left-[60%] flex items-center justify-center group z-20">
                <div className="w-3 h-3 bg-[#c75050] rounded-full pulse-orange shadow-[0_0_10px_rgba(199,80,80,0.8)]"></div>
                <div className="absolute w-12 h-12 border border-[#c75050] rounded-full animate-ping opacity-10"></div>
                <div className="absolute left-6 top-1 bg-[#1a1512] border border-[#c75050]/30 px-3 py-1.5 rounded-md text-[#c75050] whitespace-nowrap text-xs shadow-lg backdrop-blur-md transition-all">
                  TGT-ALPHA <span className="text-[#c75050]/60 ml-1">NAHARIYA</span>
                </div>
              </div>

              <div className="absolute top-[65%] left-[40%] flex items-center justify-center z-20">
                <div className="w-2.5 h-2.5 bg-[#c88b4a] rounded-full shadow-[0_0_8px_rgba(200,139,74,0.6)]"></div>
                <div className="absolute left-5 top-1 bg-[#1a1512] border border-[#c88b4a]/20 px-3 py-1.5 rounded-md text-[#c88b4a] whitespace-nowrap text-xs shadow-lg backdrop-blur-md opacity-80">
                  UAV-01
                </div>
              </div>

              <div className="absolute top-[20%] left-[25%] flex items-center justify-center z-20">
                <Crosshair className="text-[#d4a574] opacity-30" size={32} strokeWidth={1} />
              </div>
            </div>
          </div>

          {/* PANEL: RED ALERTS */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
            <div className="h-12 border-b border-[#c75050]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-[#c75050]">
                <ShieldAlert size={16} className="opacity-80" />
                <span className="font-medium text-sm">Active Alerts</span>
              </div>
              <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#c75050]/10">4 EVENTS</span>
            </div>
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto scroll-hide bg-[#16120f]/20">
              {[
                { loc: "Nahariya", type: "ROCKET", time: "-00:02:14" },
                { loc: "Rosh HaNikra", type: "UAV", time: "-00:05:32" },
                { loc: "Betzet", type: "ROCKET", time: "-00:12:05" },
                { loc: "Shlomi", type: "INFIL", time: "-01:45:00" },
              ].map((alert, i) => (
                <div key={i} className="bg-[#1a1512] border border-[#c75050]/15 p-3 rounded-lg flex flex-col gap-2 hover:border-[#c75050]/30 transition-all shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[#c75050] font-medium flex items-center gap-1.5 text-sm">
                      <MapPin size={12} className="opacity-70" /> {alert.loc}
                    </span>
                    <span className="text-[#8c7a6b] text-xs">{alert.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="bg-[#c75050]/10 text-[#c75050] px-2 py-0.5 rounded text-[10px] font-medium tracking-wide border border-[#c75050]/20">{alert.type}</span>
                    <span className="text-[#8c7a6b] text-[10px] uppercase tracking-wider">Confirmed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL: SIGINT FEED */}
          <div className="hud-panel col-span-4 row-span-3 flex flex-col">
             <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-[#8c7a6b]">
                <Terminal size={16} className="opacity-70" />
                <span className="font-medium text-sm text-[#d4a574]">Signals Intelligence</span>
              </div>
              <span className="text-xs text-[#8c7a6b] bg-[#16120f] px-2 py-1 rounded-md border border-[#d4a574]/5">LIVE</span>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto scroll-hide text-sm bg-[#16120f]/20">
               {[
                { ch: "CH_ALPHA", text: "Movement detected in sector 4B. Visual confirmation pending.", time: "14:32:01" },
                { ch: "CH_BRAVO", text: "Intercepted comms: 'Operation commencement at 1500Z'", time: "14:28:44" },
                { ch: "G_NEWS", text: "Local reports of explosions near border fence.", time: "14:15:22" },
              ].map((msg, i) => (
                <div key={i} className="flex gap-3 leading-relaxed">
                  <div className="text-[#8c7a6b] shrink-0 font-mono text-xs mt-0.5">{msg.time}</div>
                  <div>
                    <span className="text-[#c88b4a] font-medium mr-2 text-xs uppercase tracking-wider bg-[#c88b4a]/10 px-1.5 py-0.5 rounded">{msg.ch}</span>
                    <span className="text-[#a89b8d]">{msg.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL: MKT DATA */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
            <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-[#8c7a6b]">
                <BarChart2 size={16} className="opacity-70" />
                <span className="font-medium text-sm text-[#d4a574]">Market Status</span>
              </div>
            </div>
            <div className="flex-1 p-2 bg-[#16120f]/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[#8c7a6b] text-xs uppercase tracking-wider">
                    <th className="py-2 px-3 font-medium">Asset</th>
                    <th className="py-2 px-3 font-medium text-right">Price</th>
                    <th className="py-2 px-3 font-medium text-right">Chg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4a574]/5">
                  <tr className="hover:bg-[#d4a574]/5 transition-colors">
                    <td className="py-2.5 px-3 text-[#a89b8d] text-sm">GOLD/OZ</td>
                    <td className="py-2.5 px-3 text-right text-[#d4a574] font-medium">2,415.30</td>
                    <td className="py-2.5 px-3 text-right text-[#d4a574]/80 text-sm">+1.2%</td>
                  </tr>
                  <tr className="hover:bg-[#d4a574]/5 transition-colors">
                    <td className="py-2.5 px-3 text-[#a89b8d] text-sm">BRENT/BBL</td>
                    <td className="py-2.5 px-3 text-right text-[#d4a574] font-medium">84.22</td>
                    <td className="py-2.5 px-3 text-right text-[#c75050] text-sm">-0.5%</td>
                  </tr>
                  <tr className="hover:bg-[#d4a574]/5 transition-colors">
                    <td className="py-2.5 px-3 text-[#a89b8d] text-sm">BTC/USD</td>
                    <td className="py-2.5 px-3 text-right text-[#d4a574] font-medium">64,102</td>
                    <td className="py-2.5 px-3 text-right text-[#d4a574]/80 text-sm">+2.4%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL: NET STATUS */}
          <div className="hud-panel col-span-4 row-span-2 flex flex-col">
             <div className="h-12 border-b border-[#d4a574]/10 bg-[#1a1512] flex items-center px-5 justify-between rounded-t-xl">
              <div className="flex items-center gap-2 text-[#8c7a6b]">
                <Wifi size={16} className="opacity-70" />
                <span className="font-medium text-sm text-[#d4a574]">Network Health</span>
              </div>
            </div>
            <div className="flex-1 p-5 space-y-4 bg-[#16120f]/20 flex flex-col justify-center">
              {[
                { loc: "EU-WEST", pct: 98, status: "nominal", color: "bg-[#d4a574]/80", text: "text-[#d4a574]/80" },
                { loc: "ME-CENTRAL", pct: 45, status: "degraded", color: "bg-[#c88b4a]", text: "text-[#c88b4a]" },
                { loc: "US-EAST", pct: 100, status: "nominal", color: "bg-[#d4a574]/80", text: "text-[#d4a574]/80" },
              ].map((node, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#a89b8d]">{node.loc}</span>
                    <span className={`${node.text} text-[11px] uppercase tracking-wide font-medium`}>{node.pct}% — {node.status}</span>
                  </div>
                  <div className="h-1.5 bg-[#1a1512] rounded-full overflow-hidden border border-[#d4a574]/5">
                    <div className={`h-full ${node.color} rounded-full transition-all duration-1000`} style={{ width: `${node.pct}%` }}></div>
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

export default WarmEmber;
