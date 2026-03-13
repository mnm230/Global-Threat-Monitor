import React, { useState, useEffect } from 'react';
import { Shield, Radio, TrendingUp, TrendingDown, Globe, Newspaper, Activity } from 'lucide-react';

const MOCK_TELEGRAM = [
  { id: 1, channel: 'GLOBAL_INTEL', time: '14:28', text: 'Routine border patrol shifted 5km north. No incidents reported.', color: 'border-blue-500/50' },
  { id: 2, channel: 'WEATHER_OPS', time: '14:15', text: 'Heavy cloud cover expected over northern sectors next 48h.', color: 'border-slate-500/50' },
  { id: 3, channel: 'REGIONAL_OBSERVER', time: '13:59', text: 'Diplomatic convoy arrived at capital safely.', color: 'border-blue-400/50' },
  { id: 4, channel: 'MARITIME_TRACKER', time: '13:42', text: 'Cargo vessel traffic normal in central shipping lanes.', color: 'border-cyan-600/50' },
  { id: 5, channel: 'SYS_ADMIN', time: '13:00', text: 'Routine maintenance completed on backup satellite link.', color: 'border-slate-600/50' },
];

const MOCK_OSINT = [
  { id: 1, source: 'REUTERS', title: 'Global markets stabilize as trade talks resume in Geneva' },
  { id: 2, source: 'AP', title: 'Energy ministers agree on slow production increase' },
  { id: 3, source: 'BLOOMBERG', title: 'Tech sector sees moderate gains amid calm geopolitical landscape' },
  { id: 4, source: 'AL JAZEERA', title: 'Regional leaders discuss infrastructure investments for Q4' },
];

const MOCK_MARKETS = [
  { symbol: 'OIL (BRENT)', price: '82.45', change: '+0.12%', up: true },
  { symbol: 'GOLD', price: '2,015.30', change: '-0.05%', up: false },
  { symbol: 'NATGAS', price: '2.84', change: '+1.20%', up: true },
  { symbol: 'WHEAT', price: '584.25', change: '-0.40%', up: false },
  { symbol: 'USD/ILS', price: '3.62', change: '+0.01%', up: true },
  { symbol: 'BTC', price: '64,210', change: '+2.15%', up: true },
];

export function ConditionGreen() {
  const [time, setTime] = useState('14:32:01 UTC');

  useEffect(() => {
    // In a real app this would tick
    const interval = setInterval(() => {
      const d = new Date();
      setTime(`${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')} UTC`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: 'hsl(222 28% 4%)' }}>
      
      {/* DASHBOARD WRAPPER */}
      <div 
        className="w-full max-w-[1200px] flex flex-col"
        style={{ 
          fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          color: 'rgba(255,255,255,0.7)',
          fontVariantNumeric: 'tabular-nums',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between px-4 mb-4 rounded" style={{ height: '28px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[11px] font-bold text-white/20 tracking-widest flex items-center gap-2">
            <Radio size={12} /> WARROOM SYSTEM
          </div>
          <div className="flex items-center gap-2 text-green-500/80 text-[12px] font-bold">
            <div className="w-2 h-2 rounded-full bg-green-500/80" />
            CONDITION GREEN
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>{time}</span>
            <div className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-1 text-[9px]">
              <Shield size={10} /> ALL CLEAR
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          
          {/* COLUMN 1 - INTEL */}
          <div className="flex flex-col gap-4">
            {/* TELEGRAM PANEL */}
            <div className="rounded border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden" style={{ height: '260px' }}>
              <div className="px-3 py-1.5 border-b border-white/10 text-[10px] text-white/40 flex items-center gap-2 bg-white/[0.01]">
                <Activity size={12} /> RAW INTERCEPTS
              </div>
              <div className="p-3 flex flex-col gap-2 overflow-hidden flex-1">
                {MOCK_TELEGRAM.map(msg => (
                  <div key={msg.id} className={`pl-2 border-l-2 ${msg.color} text-[10px] leading-relaxed`}>
                    <div className="flex items-center justify-between text-white/40 mb-1">
                      <span>[{msg.channel}]</span>
                      <span>{msg.time}</span>
                    </div>
                    <div className="text-white/60 truncate">{msg.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* OSINT PANEL */}
            <div className="rounded border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden" style={{ height: '180px' }}>
              <div className="px-3 py-1.5 border-b border-white/10 text-[10px] text-white/40 flex items-center gap-2 bg-white/[0.01]">
                <Newspaper size={12} /> OSINT FEED
              </div>
              <div className="p-3 flex flex-col gap-3 overflow-hidden flex-1">
                {MOCK_OSINT.map(item => (
                  <div key={item.id} className="text-[10px]">
                    <span className="text-blue-400/50 mr-2">■ {item.source}</span>
                    <span className="text-white/60">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2 - ANALYTICS */}
          <div className="flex flex-col gap-4">
            {/* MARKETS PANEL */}
            <div className="rounded border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden" style={{ height: '260px' }}>
              <div className="px-3 py-1.5 border-b border-white/10 text-[10px] text-white/40 flex items-center gap-2 bg-white/[0.01]">
                <Globe size={12} /> GLOBAL MARKETS
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                {MOCK_MARKETS.map(market => (
                  <div key={market.symbol} className="bg-white/[0.02] border border-white/5 p-2 rounded flex flex-col gap-1">
                    <div className="text-[10px] text-white/40">{market.symbol}</div>
                    <div className="text-[13px] text-white/80">{market.price}</div>
                    <div className={`text-[9px] flex items-center gap-1 ${market.up ? 'text-green-400/70' : 'text-white/40'}`}>
                      {market.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {market.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ANALYTICS PANEL */}
            <div className="rounded border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden" style={{ height: '180px' }}>
              <div className="px-3 py-1.5 border-b border-white/10 text-[10px] text-white/40 flex items-center gap-2 bg-white/[0.01]">
                <Activity size={12} /> EVENTS LAST 24H
              </div>
              <div className="p-4 flex-1 flex items-end justify-between gap-1">
                {/* Mock bar chart with low values */}
                {[...Array(24)].map((_, i) => {
                  const h = 5 + Math.random() * 20;
                  return (
                    <div key={i} className="w-full bg-blue-500/20 rounded-t" style={{ height: `${h}%` }}></div>
                  );
                })}
              </div>
              <div className="px-4 pb-2 text-[8px] text-white/30 flex justify-between">
                <span>T-24H</span>
                <span>NOW</span>
              </div>
            </div>
          </div>

          {/* COLUMN 3 - MONITORING */}
          <div className="flex flex-col gap-4">
            {/* MAP PLACEHOLDER */}
            <div className="rounded border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden relative" style={{ height: '350px' }}>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="absolute inset-0 flex items-center justify-center text-white/20 text-[14px] tracking-widest font-bold">
                SECTOR MAP NOMINAL
              </div>
              {/* Dim Dots */}
              <div className="absolute top-[30%] left-[40%] w-1.5 h-1.5 bg-blue-400/40 rounded-full" />
              <div className="absolute top-[60%] left-[20%] w-1.5 h-1.5 bg-blue-400/40 rounded-full" />
              <div className="absolute top-[45%] left-[70%] w-1.5 h-1.5 bg-blue-400/40 rounded-full" />
            </div>

            {/* MINIMAL ALERTS PANEL */}
            <div className="rounded border border-green-500/20 bg-green-500/[0.02] flex items-center justify-between p-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded">
                  <Shield size={20} className="text-green-500/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-green-500/80 text-[12px] font-bold">NO ACTIVE THREATS</span>
                  <span className="text-white/30 text-[9px]">SYSTEMS MONITORING ACTIVE</span>
                </div>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-white/60 text-[12px]">512</span>
                <span className="text-white/30 text-[9px]">SCANS/6H</span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="flex items-center justify-between px-2 text-[9px] text-white/30 tracking-widest mt-auto border-t border-white/5 pt-2">
          <div>OREF HOME FRONT CMD</div>
          <div>PANELS: 11/11 [NOMINAL]</div>
          <div>{time} SYS_OK</div>
        </div>

      </div>
    </div>
  );
}
