import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Map as MapIcon, 
  MessageSquare, 
  TrendingUp, 
  Globe, 
  Brain,
  ShieldAlert,
  Clock,
  Menu,
  Bell,
  Search,
  ChevronRight
} from 'lucide-react';

// --- Colors ---
// Base Background: hsl(225,25%,8%) -> #0f121b
// Card Background: hsl(225,20%,12%) -> #181b24
// Primary Blue: #3B82F6
// Alert Rose: #F43F5E
// AI Violet: #8B5CF6
// Positive Emerald: #10B981

const THEME = {
  bgBase: 'bg-[#0f121b]',
  bgCard: 'bg-[#181b24]',
  textBase: 'text-slate-300',
  textMuted: 'text-slate-500',
  textBright: 'text-slate-100',
  accentBlue: '#3B82F6',
  accentRose: '#F43F5E',
  accentViolet: '#8B5CF6',
  accentEmerald: '#10B981',
};

// --- Reusable Panel Component ---
const Panel = ({ 
  title, 
  icon: Icon, 
  accentColor, 
  children,
  className = ''
}: { 
  title: string; 
  icon: any; 
  accentColor: string; 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div 
      className={`relative rounded-[14px] overflow-hidden flex flex-col ${THEME.bgCard} ${className}`}
      style={{
        boxShadow: `0 4px 20px -2px rgba(0,0,0,0.5), 0 0 15px -3px ${accentColor}15`,
        border: `1px solid ${accentColor}20`,
        background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%), #181b24`
      }}
    >
      {/* Left accent stripe */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ 
          backgroundColor: accentColor,
          boxShadow: `0 0 10px ${accentColor}80`
        }}
      />
      
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2 border-b border-white/5">
        <Icon size={16} style={{ color: accentColor }} />
        <h3 className={`text-[13px] font-semibold tracking-[0.08em] uppercase ${THEME.textBright}`}>
          {title}
        </h3>
      </div>
      
      {/* Content */}
      <div className="p-4 flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default function MidnightLux() {
  const [time, setTime] = useState(new Date().toISOString().split('T')[1].slice(0, 8));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toISOString().split('T')[1].slice(0, 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen ${THEME.bgBase} text-slate-300 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden`}>
      
      {/* HEADER */}
      <header className="h-16 border-b border-white/10 bg-[#0f121b]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <ShieldAlert className="text-blue-500" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-widest text-white">WARROOM</h1>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Live System</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">DEFCON 3</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search intelligence..." 
              className="bg-black/20 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors w-64 text-slate-200 placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
            <Clock size={14} />
            {time} UTC
          </div>
          <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>
        </div>
      </header>

      {/* TICKER */}
      <div className="h-8 border-b border-white/5 bg-black/40 flex items-center overflow-hidden shrink-0 text-[11px] font-mono whitespace-nowrap">
        <div className="animate-[ticker_30s_linear_infinite] flex gap-8 px-4 text-slate-400">
          <span className="flex items-center gap-2">CRUDE <span className="text-emerald-400">82.40 +1.2%</span></span>
          <span className="flex items-center gap-2">GOLD <span className="text-emerald-400">2340.50 +0.4%</span></span>
          <span className="flex items-center gap-2">BTC <span className="text-rose-400">64200.00 -2.1%</span></span>
          <span className="flex items-center gap-2">EUR/USD <span className="text-emerald-400">1.0840 +0.1%</span></span>
          <span className="flex items-center gap-2">VIX <span className="text-rose-400">14.20 +5.4%</span></span>
          <span className="flex items-center gap-2">CRUDE <span className="text-emerald-400">82.40 +1.2%</span></span>
          <span className="flex items-center gap-2">GOLD <span className="text-emerald-400">2340.50 +0.4%</span></span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0 bg-[#0f121b]/50">
          <button className="p-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors tooltip-trigger relative">
            <Activity size={20} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <MapIcon size={20} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <MessageSquare size={20} />
          </button>
          <button className="p-3 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <TrendingUp size={20} />
          </button>
          <div className="flex-1" />
          <button className="p-3 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
        </aside>

        {/* MAIN GRID */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-12 grid-rows-2 gap-4 h-full min-h-[700px]">
            
            {/* Alerts Panel - Col 1-4, Row 1 */}
            <Panel title="Red Alerts" icon={AlertTriangle} accentColor={THEME.accentRose} className="col-span-12 md:col-span-4">
              <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { loc: 'Strait of Hormuz', time: '14:22Z', type: 'Naval Activity', sev: 'high' },
                  { loc: 'Kyiv', time: '13:45Z', type: 'Air Raid', sev: 'critical' },
                  { loc: 'Taipei', time: '12:10Z', type: 'Cyber Intrusion', sev: 'medium' },
                  { loc: 'Red Sea', time: '11:05Z', type: 'Drone Intercept', sev: 'high' }
                ].map((alert, i) => (
                  <div key={i} className="bg-black/20 rounded-[10px] p-3 border border-white/5 hover:border-rose-500/30 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${alert.sev === 'critical' ? 'bg-rose-500 animate-pulse' : alert.sev === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm font-medium text-slate-200">{alert.loc}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex justify-between items-center">
                      <span>{alert.type}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400" />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Map Panel - Col 5-12, Row 1 */}
            <Panel title="Global Theater" icon={Globe} accentColor={THEME.accentBlue} className="col-span-12 md:col-span-8 relative">
              <div className="absolute inset-4 rounded-[10px] border border-white/5 bg-[#0a0c13] overflow-hidden">
                {/* Grid Overlay */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {/* Simulated Map Elements */}
                <div className="absolute top-1/4 left-1/3 w-3 h-3 rounded-full bg-rose-500/50 animate-ping" />
                <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e]" />
                
                <div className="absolute top-1/2 left-2/3 w-3 h-3 rounded-full bg-amber-500/50 animate-ping" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
                
                <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_#3b82f6]" />
                <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_#3b82f6]" />

                {/* Overlays */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                  <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">Active Zones</span>
                      <span className="text-sm font-semibold text-white">4</span>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase">Assets Deployed</span>
                      <span className="text-sm font-semibold text-white">1,204</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* AI Panel - Col 1-4, Row 2 */}
            <Panel title="AI Assessment" icon={Brain} accentColor={THEME.accentViolet} className="col-span-12 md:col-span-4">
              <div className="flex flex-col gap-4 h-full">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-[10px] p-4 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/20 blur-2xl rounded-full" />
                  <div className="flex justify-between items-end mb-4 relative z-10">
                    <div>
                      <h4 className="text-xs text-violet-300 font-semibold mb-1 uppercase">Escalation Probability</h4>
                      <div className="text-2xl font-bold text-white">78<span className="text-sm text-slate-400 font-normal">%</span></div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-[3px] border-violet-500 border-t-transparent border-r-transparent rotate-45 flex items-center justify-center">
                      <span className="text-xs font-bold text-violet-400 -rotate-45">HIGH</span>
                    </div>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-rose-500 w-[78%]" />
                  </div>
                </div>

                <div className="flex-1 bg-black/20 rounded-[10px] p-4 border border-white/5 flex flex-col gap-3">
                  <h4 className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Key Factors</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0 shadow-[0_0_8px_#8b5cf6]" />
                      <p className="text-xs text-slate-300 leading-relaxed">Unusual troop movements detected near border sector 4B. Imagery confirms armored units.</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0 shadow-[0_0_8px_#8b5cf6]" />
                      <p className="text-xs text-slate-300 leading-relaxed">Chatter volume on monitored frequencies increased 400% in last 2 hours.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </Panel>

            {/* Intel Panel - Col 5-8, Row 2 */}
            <Panel title="Signals Intel" icon={MessageSquare} accentColor={THEME.accentBlue} className="col-span-12 md:col-span-4">
              <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { src: 'TG_CH_89', time: '14:28Z', msg: 'Coordination confirmed for secondary phase. Awaiting green light.', type: 'intercept' },
                  { src: 'OSINT_BOT', time: '14:25Z', msg: 'Multiple reports of localized internet outages in target region.', type: 'osint' },
                  { src: 'SIGINT_ALPHA', time: '14:15Z', msg: 'Encrypted burst transmission detected from known hostile IP block.', type: 'intercept' }
                ].map((msg, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-mono text-blue-400">{msg.src}</span>
                      <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
                    </div>
                    <div className={`p-3 rounded-[10px] text-xs leading-relaxed ${
                      msg.type === 'intercept' 
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-tl-sm' 
                        : 'bg-white/5 border border-white/10 text-slate-300 rounded-tr-sm'
                    }`}>
                      {msg.msg}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Status Panel - Col 9-12, Row 2 */}
            <Panel title="Network Status" icon={Activity} accentColor={THEME.accentEmerald} className="col-span-12 md:col-span-4">
              <div className="flex flex-col gap-4 h-full">
                {[
                  { node: 'US-EAST Core', status: 100, color: 'bg-emerald-500' },
                  { node: 'EU-WEST Relay', status: 85, color: 'bg-emerald-500' },
                  { node: 'AP-SOUTH Edge', status: 42, color: 'bg-amber-500' },
                  { node: 'ME-CENTRAL Ops', status: 12, color: 'bg-rose-500' },
                  { node: 'SATCOM Link Alpha', status: 98, color: 'bg-emerald-500' },
                ].map((node, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">{node.node}</span>
                      <span className="font-mono text-slate-400">{node.status}%</span>
                    </div>
                    <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full ${node.color} relative`} 
                        style={{ width: \`\${node.status}%\` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-auto pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">System Integrity</span>
                    <span className="text-emerald-400 font-semibold">NOMINAL</span>
                  </div>
                </div>
              </div>
            </Panel>

          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  );
}
