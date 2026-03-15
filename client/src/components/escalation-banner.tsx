import type { EscalationState } from '@/lib/dashboard-types';

export function EscalationBanner({ state, onDismiss }: { state: EscalationState; onDismiss: () => void }) {
  if (!state.level) return null;
  const cfg = {
    CRITICAL: {
      bg: 'hsl(0 72% 51% / 0.08)',
      border: 'hsl(0 72% 51% / 0.30)',
      dot: 'bg-red-500',
      text: 'text-red-500',
      label: 'Critical Escalation',
      badge: 'bg-red-500/15 border-red-500/35 text-red-500',
    },
    WARNING: {
      bg: 'hsl(38 92% 50% / 0.08)',
      border: 'hsl(38 92% 50% / 0.30)',
      dot: 'bg-orange-500',
      text: 'text-orange-500',
      label: 'Warning — High Alert Rate',
      badge: 'bg-orange-500/15 border-orange-500/35 text-orange-500',
    },
    WATCH: {
      bg: 'hsl(48 92% 50% / 0.08)',
      border: 'hsl(48 92% 50% / 0.30)',
      dot: 'bg-yellow-500',
      text: 'text-yellow-500',
      label: 'Watch — Activity Surge',
      badge: 'bg-yellow-500/15 border-yellow-500/35 text-yellow-500',
    },
  }[state.level];
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 shrink-0 z-40 relative border-b"
      style={{ background: cfg.bg, borderBottomColor: cfg.border }}
      role="alert"
      data-testid="escalation-banner"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="relative shrink-0">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <div className={`absolute inset-0 rounded-full ${cfg.dot} alert-dot-ping`} />
        </div>
        <span className={`text-[12px] font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${cfg.badge}`}>
          {state.count}/min
        </span>
        <div className="flex-1" />
        <button
          onClick={onDismiss}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all hover:opacity-80 ${cfg.badge}`}
          data-testid="button-dismiss-escalation"
        >Dismiss</button>
      </div>
    </div>
  );
}
