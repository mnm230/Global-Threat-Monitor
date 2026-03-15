import type { PanelId } from '@/lib/dashboard-types';
import { PANEL_CONFIG, PANEL_ACCENTS } from '@/lib/dashboard-types';

export function PanelSidebar({
  visiblePanels,
  openPanel,
  closePanel,
  language,
  panelStats,
}: {
  visiblePanels: Record<PanelId, boolean>;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  language: 'en' | 'ar';
  panelStats: Partial<Record<PanelId, string | number>>;
}) {
  const topGroup: PanelId[] = ['alerts', 'regional', 'telegram', 'livefeed', 'aiprediction'];
  const bottomGroup: PanelId[] = ['events', 'markets', 'alertmap', 'analytics', 'osint', 'attackpred', 'rocketstats'];

  const renderBtn = (id: PanelId) => {
    const cfg = PANEL_CONFIG[id];
    if (!cfg) return null;
    const Icon = cfg.icon;
    const active = visiblePanels[id];
    const stat = panelStats[id];
    const accent = PANEL_ACCENTS[id] || 'hsl(var(--primary))';
    return (
      <button
        key={id}
        onClick={() => active ? closePanel(id) : openPanel(id)}
        className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg relative transition-colors
          ${active
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        style={active ? { background: `color-mix(in srgb, ${accent} 10%, transparent)` } : undefined}
        data-testid={`sidebar-panel-${id}`}
        title={active ? `Hide ${cfg.label}` : `Show ${cfg.label}`}
      >
        {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ background: accent }} />}
        <Icon className="w-4 h-4 shrink-0 ml-0.5" style={active ? { color: accent } : undefined} />
        <span className="text-[13px] font-medium flex-1 text-left leading-none truncate">
          {language === 'en' ? cfg.label : cfg.labelAr}
        </span>
        {stat !== undefined && stat !== '' && (
          <span className="text-[10px] tabular-nums shrink-0 px-1.5 py-0.5 rounded-md font-semibold text-muted-foreground/60 bg-muted">
            {stat}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar"
      style={{ width: 208 }}
    >
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Panels</span>
      </div>
      <div className="flex flex-col gap-px px-1.5 pb-1">
        {topGroup.map(id => renderBtn(id))}
      </div>
      <div className="mx-3 my-2 border-t border-border/60" />
      <div className="flex flex-col gap-px px-1.5 pb-3">
        {bottomGroup.map(id => renderBtn(id))}
      </div>
    </div>
  );
}
