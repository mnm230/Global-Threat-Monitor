import { useState, useMemo, memo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Fuel,
  Gem, Wheat, Activity, Zap, ChevronDown, ChevronRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { formatPrice } from '@/lib/dashboard-utils';
import type { CommodityData } from '@shared/schema';
import { ScrollShadow } from '@/components/shared/scroll-shadow';

export const MarketTile = memo(function MarketTile({ c, language }: { c: CommodityData; language: 'en' | 'ar' }) {
  const up = c.change >= 0;
  const pctAbs = Math.abs(c.changePercent);
  const isHot = pctAbs >= 1.5;
  const borderColor = up ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)';
  const glowColor = isHot ? (up ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)') : 'transparent';

  return (
    <div
      className="relative overflow-hidden rounded-md border transition-all duration-200 hover:border-opacity-60 group"
      style={{ borderColor, background: `linear-gradient(135deg, ${glowColor}, transparent 70%)` }}
      data-testid={`commodity-${c.symbol}`}
    >
      <div className="px-2.5 py-2 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-black tracking-wide text-foreground/80 font-mono truncate">{c.symbol}</span>
          <div
            className={`flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${up ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}
          >
            <TrendingUp className={`w-2.5 h-2.5 ${up ? '' : 'rotate-180'}`} />
            <span>{up ? '+' : ''}{c.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-1">
          <span className="text-sm font-bold tabular-nums text-foreground/95 font-mono leading-none">
            {formatPrice(c)}
          </span>
          <span className="text-[8px] text-foreground/30 font-mono truncate max-w-[60px] text-right leading-tight">
            {language === 'ar' ? c.nameAr : c.name}
          </span>
        </div>
      </div>
      {isHot && (
        <div
          className="absolute top-0 right-0 w-1 h-full"
          style={{ background: up ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)' }}
        />
      )}
    </div>
  );
});

function MarketSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2 pb-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[8px] uppercase tracking-[0.25em] text-foreground/25 font-bold font-mono shrink-0">{label} ({count})</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export const CommoditiesPanel = memo(function CommoditiesPanel({
  commodities,
  language,
  onClose,
  onMaximize,
  isMaximized,
}: {
  commodities: CommodityData[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const indices = commodities.filter(c => c.category === 'index');
  const cmdty = commodities.filter(c => c.category === 'commodity');
  const fxMajor = commodities.filter(c => c.category === 'fx-major');
  const fxRegional = commodities.filter(c => c.category === 'fx');

  const gainers = commodities.filter(c => c.changePercent > 0).length;
  const losers = commodities.filter(c => c.changePercent < 0).length;
  const topMover = [...commodities].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelHeader
        title={language === 'en' ? 'Markets' : '\u0627\u0644\u0623\u0633\u0648\u0627\u0642'}
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        live
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="markets"
      />
      <div className="shrink-0 px-2.5 py-2 border-b border-border flex items-center gap-2 flex-wrap" data-testid="market-summary-bar">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-400/80 font-bold">{gainers}</span>
          <span className="text-foreground/25">{language === 'en' ? 'up' : '\u0635\u0639\u0648\u062F'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-red-400/80 font-bold">{losers}</span>
          <span className="text-foreground/25">{language === 'en' ? 'down' : '\u0647\u0628\u0648\u0637'}</span>
        </div>
        {topMover && (
          <div className="ml-auto flex items-center gap-1 text-[9px] font-mono text-foreground/35">
            <Zap className="w-2.5 h-2.5 text-amber-400/60" />
            <span className="text-foreground/50 font-bold">{topMover.symbol}</span>
            <span className={topMover.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
              {topMover.change >= 0 ? '+' : ''}{topMover.changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
      <ScrollShadow className="flex-1 min-h-0">
        <div className="px-2 pb-2">
          {indices.length > 0 && (
            <>
              <MarketSectionHeader label={language === 'en' ? 'Regional Indices' : '\u0645\u0624\u0634\u0631\u0627\u062A \u0625\u0642\u0644\u064A\u0645\u064A\u0629'} count={indices.length} />
              <div className="grid grid-cols-2 gap-1.5">
                {indices.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
              </div>
            </>
          )}
          <MarketSectionHeader label={language === 'en' ? 'Commodities' : '\u0627\u0644\u0633\u0644\u0639'} count={cmdty.length} />
          <div className="grid grid-cols-2 gap-1.5">
            {cmdty.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
          </div>
          <MarketSectionHeader label={language === 'en' ? 'Major FX' : '\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629'} count={fxMajor.length} />
          <div className="grid grid-cols-2 gap-1.5">
            {fxMajor.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
          </div>
          <MarketSectionHeader label={language === 'en' ? 'Regional FX' : '\u0639\u0645\u0644\u0627\u062A \u0625\u0642\u0644\u064A\u0645\u064A\u0629'} count={fxRegional.length} />
          <div className="grid grid-cols-2 gap-1.5">
            {fxRegional.map(c => <MarketTile key={c.symbol} c={c} language={language} />)}
          </div>
        </div>
      </ScrollShadow>
    </div>
  );
});


