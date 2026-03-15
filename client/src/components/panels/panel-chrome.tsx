import { useState, useEffect, useContext, createContext, memo, type ReactNode } from 'react';
import { X, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import type { FeedFreshness } from '@/lib/dashboard-types';

export const FeedFreshnessContext = createContext<FeedFreshness>({});

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const touchBtnClass = isTouchDevice ? 'w-9 h-9' : 'w-6 h-6';
const touchIconClass = isTouchDevice ? 'w-4 h-4' : 'w-3.5 h-3.5';

export function PanelMinimizeButton({ onMinimize }: { onMinimize: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onMinimize(); }}
      className={`${touchBtnClass} rounded flex items-center justify-center text-foreground/40 hover:text-red-400 hover:bg-red-500/15 active:bg-red-500/25 active:scale-95 transition-all duration-100 warroom-panel-close`}
      style={{ border: '1px solid transparent' }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid hsl(0 80% 55% / 0.35)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
      title="Close panel"
      aria-label="Close panel"
      data-testid="button-panel-close"
    >
      <X className={touchIconClass} />
    </button>
  );
}

export function PanelMaximizeButton({ isMaximized, onToggle }: { isMaximized: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`${touchBtnClass} rounded flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/15 active:bg-primary/25 active:scale-95 transition-all duration-100 warroom-panel-maximize`}
      style={{ border: '1px solid transparent' }}
      onMouseEnter={e => (e.currentTarget.style.border = '1px solid hsl(32 92% 50% / 0.35)')}
      onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
      title={isMaximized ? "Restore panel" : "Maximize panel"}
      aria-label={isMaximized ? "Restore panel" : "Maximize panel"}
      data-testid="button-panel-maximize"
    >
      {isMaximized ? <Minimize2 className={touchIconClass} /> : <Maximize2 className={touchIconClass} />}
    </button>
  );
}

export function FreshnessBadge({ lastUpdate }: { lastUpdate?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  if (!lastUpdate) return null;
  const age = Math.floor((now - lastUpdate) / 1000);
  if (age < 15) return (
    <span className="flex items-center gap-1 text-[10px] font-bold ra-font-mono tabular-nums" style={{ color: 'rgba(16,185,129,0.6)' }} data-testid="freshness-live">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
      LIVE
    </span>
  );
  if (age < 60) return (
    <span className="text-[10px] font-bold ra-font-mono tabular-nums" style={{ color: 'rgba(234,179,8,0.6)' }} data-testid="freshness-delayed">
      {age}s
    </span>
  );
  if (age < 300) return (
    <span className="text-[10px] font-bold ra-font-mono tabular-nums" style={{ color: 'rgba(239,68,68,0.6)' }} data-testid="freshness-stale">
      {Math.floor(age / 60)}m
    </span>
  );
  return (
    <span className="text-[10px] font-bold ra-font-mono tabular-nums px-1 rounded-sm" style={{ color: 'rgba(239,68,68,0.8)', background: 'rgba(239,68,68,0.1)' }} data-testid="freshness-offline">
      STALE
    </span>
  );
}

export const PanelHeader = memo(function PanelHeader({
  title,
  icon,
  live,
  count,
  onClose,
  extra,
  onMaximize,
  isMaximized,
  feedKey,
}: {
  title: string;
  icon: ReactNode;
  live?: boolean;
  count?: number;
  onClose?: () => void;
  extra?: ReactNode;
  onMaximize?: () => void;
  isMaximized?: boolean;
  feedKey?: string;
}) {
  const freshness = useContext(FeedFreshnessContext);
  const feedLastUpdate = feedKey ? freshness[feedKey] : undefined;
  return (
    <div className="panel-drag-handle h-[40px] px-2.5 flex items-center gap-1.5 shrink-0 cursor-grab active:cursor-grabbing select-none">
      <GripVertical className="w-3 h-3 text-muted-foreground/25 shrink-0 -mr-1" /><span className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-muted-foreground/60 shrink-0">{icon}</span>
      <span className="text-[12px] font-extrabold text-foreground/80 leading-none tracking-[.08em] uppercase font-mono">{title}</span>
      {count !== undefined && (
        <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums leading-none font-mono bg-muted/40 px-1.5 py-0.5 rounded-sm">
          {count}
        </span>
      )}
      {extra}
      <div className="flex-1" />
      {feedLastUpdate ? (
        <FreshnessBadge lastUpdate={feedLastUpdate} />
      ) : live ? (
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[10px] text-emerald-500/60 font-extrabold uppercase tracking-wider font-mono">live</span>
        </div>
      ) : null}
      {onMaximize && <PanelMaximizeButton isMaximized={!!isMaximized} onToggle={onMaximize} />}
      {onClose && <PanelMinimizeButton onMinimize={onClose} />}
    </div>
  );
});
