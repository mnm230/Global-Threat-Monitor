import { useState, useEffect, memo } from 'react';

export const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fmtOpts = { hour12: false, hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const };
  const utcTime = time.toLocaleTimeString('en-US', { ...fmtOpts, timeZone: 'UTC' });
  const beirutTime = time.toLocaleTimeString('en-US', { ...fmtOpts, timeZone: 'Asia/Beirut' });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="flex items-center gap-1.5" data-testid="text-clock">
      <span className="text-[10px] text-muted-foreground/60 hidden md:inline font-mono">{dateStr}</span>
      <div className="flex items-center gap-1 bg-muted/60 border border-border rounded px-1.5 py-0.5">
        <span className="text-[10px] text-foreground/80 font-mono tabular-nums">{utcTime}</span>
        <span className="text-[8px] text-muted-foreground/50 font-mono">UTC</span>
        <div className="w-px h-2.5 bg-border mx-0.5" />
        <span className="text-[10px] text-primary font-mono tabular-nums">{beirutTime}</span>
        <span className="text-[8px] text-muted-foreground/50 font-mono">BEY</span>
      </div>
    </div>
  );
});
