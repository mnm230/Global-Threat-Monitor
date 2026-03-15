import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Clock,
  Globe,
  MessageSquare,
  Radio,
  Search,
  Settings,
  Shield,
  Zap,
} from "lucide-react";

export default function SignalDashboard() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white font-sans overflow-hidden flex flex-col selection:bg-[#34D399] selection:text-black">
      {/* Header */}
      <header className="h-12 border-b border-[#1A1A1E] flex items-center justify-between px-4 shrink-0 bg-[#09090B] z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <h1 className="text-[#71717A] text-[11px] font-bold tracking-[0.12em] uppercase">Warroom</h1>
          </div>
          <div className="h-4 w-px bg-[#1A1A1E]" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111113] border border-[#1A1A1E]">
            <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-[11px] font-bold text-[#F59E0B] tracking-wider uppercase">Threat Level: Elevated</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#71717A]">
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">14 NODES ACTIVE</span>
          </div>
          <div className="h-4 w-px bg-[#1A1A1E]" />
          <div className="flex items-center gap-1.5 text-white">
            <Clock className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span className="text-[13px] font-mono">{time} UTC</span>
          </div>
        </div>
      </header>

      {/* Ticker */}
      <div className="h-8 border-b border-[#1A1A1E] bg-[#111113] flex items-center px-4 overflow-hidden shrink-0">
        <div className="flex gap-8 whitespace-nowrap animate-[marquee_20s_linear_infinite] text-[11px] font-mono">
          <span className="text-[#71717A]">LATEST:</span>
          <span className="text-white">USCYBERCOM issues new directive</span>
          <span className="text-[#34D399]">+2.4% SECURE</span>
          <span className="text-[#EF4444]">-1.2% VULN</span>
          <span className="text-white">Anomalous traffic detected in EU-WEST-1</span>
          <span className="text-[#F59E0B]">CRITICAL PATCH REQUIRED FOR CVE-2024-8832</span>
          <span className="text-white">Satellite telemetry nominal</span>
          <span className="text-[#34D399]">SYSTEM STABLE</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-16 border-r border-[#1A1A1E] bg-[#09090B] flex flex-col items-center py-4 shrink-0 gap-6 z-10">
          <NavIcon icon={AlertTriangle} color="#EF4444" active />
          <NavIcon icon={Globe} color="#60A5FA" />
          <NavIcon icon={MessageSquare} color="#A78BFA" />
          <NavIcon icon={BarChart2} color="#F59E0B" />
          <NavIcon icon={Activity} color="#34D399" />
          <div className="mt-auto flex flex-col gap-6">
            <NavIcon icon={Search} color="#71717A" />
            <NavIcon icon={Settings} color="#71717A" />
          </div>
        </aside>

        {/* Main Grid */}
        <main className="flex-1 p-2 overflow-auto bg-[#09090B]">
          <div className="grid grid-cols-12 grid-rows-12 gap-2 h-full min-h-[800px]">
            
            {/* Alerts Panel */}
            <Panel title="Active Alerts" color="#EF4444" className="col-span-12 md:col-span-4 row-span-6 count={14}">
              <div className="flex flex-col gap-1">
                <AlertRow time="14:02:11" loc="AP-SOUTHEAST" msg="Unauth access attempt" critical />
                <AlertRow time="13:58:44" loc="EU-CENTRAL" msg="DDoS mitigation active" />
                <AlertRow time="13:45:09" loc="US-EAST" msg="Firewall rules updated" />
                <AlertRow time="13:12:33" loc="GLOBAL" msg="API latency spike detected" />
                <AlertRow time="12:05:01" loc="US-WEST" msg="Database failover initiated" critical />
                <AlertRow time="11:33:22" loc="AP-NORTHEAST" msg="Suspicious login pattern" />
                <AlertRow time="10:15:00" loc="EU-WEST" msg="SSL certificate expiring" />
              </div>
            </Panel>

            {/* Map Panel */}
            <Panel title="Global Threat Map" color="#60A5FA" className="col-span-12 md:col-span-8 row-span-7">
              <div className="relative w-full h-full border border-[#1A1A1E] rounded bg-[#09090B] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#60A5FA] to-transparent pointer-events-none" />
                {/* Mock Map Grid lines */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#1A1A1E 1px, transparent 1px), linear-gradient(90deg, #1A1A1E 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />
                
                {/* Nodes */}
                <MapNode top="30%" left="20%" color="#EF4444" size={3} pulse />
                <MapNode top="45%" left="70%" color="#34D399" size={2} />
                <MapNode top="60%" left="40%" color="#F59E0B" size={4} pulse />
                <MapNode top="25%" left="55%" color="#60A5FA" size={2} />
                <MapNode top="75%" left="80%" color="#A78BFA" size={1} />
                
                {/* Arc mock */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path d="M 20% 30% Q 30% 10% 55% 25%" stroke="#EF4444" strokeWidth="1" fill="none" strokeDasharray="2 4" className="animate-pulse" />
                  <path d="M 55% 25% Q 60% 40% 40% 60%" stroke="#F59E0B" strokeWidth="1" fill="none" opacity="0.5" />
                </svg>

                <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> CRITICAL</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> WARNING</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" /> SECURE</span>
                </div>
              </div>
            </Panel>

            {/* Markets / Data Grid Panel */}
            <Panel title="Market Intelligence" color="#F59E0B" className="col-span-12 md:col-span-4 row-span-6">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[#1A1A1E] text-[#71717A] text-[11px] font-mono">
                    <th className="py-2 font-normal">SYMBOL</th>
                    <th className="py-2 font-normal text-right">VALUE</th>
                    <th className="py-2 font-normal text-right">24H Δ</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12px]">
                  <MarketRow sym="BTC/USD" val="64,230.00" change="+2.4%" pos />
                  <MarketRow sym="ETH/USD" val="3,450.21" change="-0.8%" />
                  <MarketRow sym="NDX" val="18,204.55" change="+1.2%" pos />
                  <MarketRow sym="VIX" val="14.32" change="-5.4%" />
                  <MarketRow sym="US10Y" val="4.21%" change="+0.02%" pos />
                  <MarketRow sym="GOLD" val="2,340.10" change="+0.5%" pos />
                  <MarketRow sym="OIL/WTI" val="82.45" change="-1.1%" />
                </tbody>
              </table>
            </Panel>

            {/* Telegram Panel */}
            <Panel title="Intercepts (TG)" color="#A78BFA" className="col-span-12 md:col-span-4 row-span-5">
              <div className="flex flex-col gap-2">
                <MsgRow chan="Intel_Alpha" time="14:04" msg="New deployment confirmed in sector 7G. Awaiting further instruction." />
                <MsgRow chan="Market_Whales" time="14:01" msg="Large transfer detected from cold wallet." />
                <MsgRow chan="Sec_Ops_Main" time="13:59" msg="Patch deployed. Monitoring for regressions." />
                <MsgRow chan="Anon_Chat_9" time="13:42" msg="Target acquired. Proceeding with phase 2." />
                <MsgRow chan="Intel_Alpha" time="13:15" msg="Satellite imagery updated." />
              </div>
            </Panel>

            {/* Internet Status Panel */}
            <Panel title="Network Status" color="#34D399" className="col-span-12 md:col-span-4 row-span-5">
              <div className="flex flex-col gap-3 justify-center h-full pt-2">
                <NetRow code="US" pct={99.9} />
                <NetRow code="EU" pct={98.4} />
                <NetRow code="AP" pct={92.1} warn />
                <NetRow code="SA" pct={99.2} />
                <NetRow code="AF" pct={84.5} crit />
              </div>
            </Panel>

            {/* OSINT Panel */}
            <Panel title="OSINT Feed" color="#71717A" className="col-span-12 md:col-span-4 row-span-5">
              <div className="flex flex-col gap-3">
                <OsintRow source="REUTERS" time="10m ago" text="Tech sector sees massive inflows amid new AI regulations." />
                <OsintRow source="HACKER NEWS" time="24m ago" text="Show HN: A new extremely fast key-value store in Rust." />
                <OsintRow source="DEFENSE ONE" time="1h ago" text="Cyber command shifts focus to space-based assets." />
                <OsintRow source="BLOOMBERG" time="2h ago" text="Markets rally following unexpected rate pause." />
              </div>
            </Panel>

          </div>
        </main>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: #09090B;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A1A1E;
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #71717A;
        }
      `}} />
    </div>
  );
}

// Subcomponents

function NavIcon({ icon: Icon, color, active }: { icon: any, color: string, active?: boolean }) {
  return (
    <div className={`relative p-2 rounded cursor-pointer transition-colors ${active ? 'bg-[#111113]' : 'hover:bg-[#111113]'}`}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r" style={{ backgroundColor: color }} />}
      <Icon className="w-5 h-5" style={{ color: active ? color : '#71717A' }} />
    </div>
  );
}

function Panel({ title, color, className, children, count }: any) {
  return (
    <div className={`bg-[#111113] border border-[#1A1A1E] rounded-md flex flex-col overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A1A1E] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-[#71717A] text-[11px] font-bold tracking-[0.12em] uppercase">{title}</h2>
        </div>
        {count && <span className="text-[10px] font-mono text-[#71717A]">{count}</span>}
      </div>
      <div className="p-2.5 overflow-auto flex-1 text-[13px] scrollbar-thin">
        {children}
      </div>
    </div>
  );
}

function AlertRow({ time, loc, msg, critical }: any) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#1A1A1E]/50 last:border-0 hover:bg-[#1A1A1E]/30 transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${critical ? 'bg-[#EF4444] animate-pulse' : 'bg-[#F59E0B]'}`} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-[11px] font-mono text-[#71717A]">{time}</span>
          <span className="text-[10px] font-mono text-[#60A5FA] bg-[#60A5FA]/10 px-1 rounded truncate">{loc}</span>
        </div>
        <span className={`text-[13px] truncate ${critical ? 'text-white font-medium' : 'text-gray-300'}`}>{msg}</span>
      </div>
    </div>
  );
}

function MapNode({ top, left, color, size, pulse }: any) {
  return (
    <div className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style={{ top, left }}>
      {pulse && <div className="absolute rounded-full animate-ping opacity-75" style={{ backgroundColor: color, width: `${size * 12}px`, height: `${size * 12}px` }} />}
      <div className="rounded-full relative z-10" style={{ backgroundColor: color, width: `${size * 4}px`, height: `${size * 4}px` }} />
    </div>
  );
}

function MarketRow({ sym, val, change, pos }: any) {
  return (
    <tr className="border-b border-[#1A1A1E]/50 last:border-0 hover:bg-[#1A1A1E]/30 transition-colors">
      <td className="py-1.5 text-white">{sym}</td>
      <td className="py-1.5 text-right text-gray-300">{val}</td>
      <td className={`py-1.5 text-right ${pos ? 'text-[#34D399]' : 'text-[#EF4444]'}`}>{change}</td>
    </tr>
  );
}

function MsgRow({ chan, time, msg }: any) {
  return (
    <div className="py-1.5 border-b border-[#1A1A1E]/50 last:border-0 hover:bg-[#1A1A1E]/30 transition-colors">
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-[11px] font-bold text-[#A78BFA]">#{chan}</span>
        <span className="text-[10px] font-mono text-[#71717A]">{time}</span>
      </div>
      <p className="text-[12px] text-gray-300 truncate">{msg}</p>
    </div>
  );
}

function NetRow({ code, pct, warn, crit }: any) {
  let color = '#34D399';
  if (warn) color = '#F59E0B';
  if (crit) color = '#EF4444';
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-white">{code} REGION</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 w-full bg-[#1A1A1E] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function OsintRow({ source, time, text }: any) {
  return (
    <div className="py-1.5 border-b border-[#1A1A1E]/50 last:border-0 hover:bg-[#1A1A1E]/30 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold bg-[#1A1A1E] text-[#71717A] px-1 rounded">{source}</span>
        <span className="text-[10px] font-mono text-[#71717A]">{time}</span>
      </div>
      <p className="text-[12px] text-gray-300 line-clamp-2 leading-tight">{text}</p>
    </div>
  );
}
