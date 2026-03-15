import type { NewsItem } from '@shared/schema';

export function NewsTicker({ news, language }: { news: NewsItem[]; language: 'en' | 'ar' }) {
  if (!news.length) return null;
  const CATEGORY_COLORS: Record<string, string> = {
    breaking: 'text-red-400/80',
    military: 'text-amber-400/70',
    diplomatic: 'text-sky-400/70',
    economic: 'text-emerald-400/70',
  };
  const items = [...news, ...news, ...news];
  return (
    <div className="h-6 border-t border-border overflow-hidden relative shrink-0 bg-muted/40" data-testid="news-ticker">
      <div className="absolute inset-y-0 left-0 w-14 z-10 flex items-center pl-3 bg-gradient-to-r from-muted/80 to-transparent">
        <span className="text-[10px] font-semibold text-muted-foreground">News</span>
      </div>
      <div className="absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-muted/80 to-transparent" />
      <div className="absolute flex items-center h-full gap-8 animate-ticker-scroll whitespace-nowrap pl-14">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className={`font-semibold text-[10px] ${CATEGORY_COLORS[item.category] || 'text-primary'}`}>
              {item.category}
            </span>
            <span className="text-foreground/70">{language === 'ar' && item.titleAr ? item.titleAr : item.title}</span>
            <span className="text-muted-foreground text-[10px]">{item.source}</span>
            <span className="text-border mx-1">{'\u2502'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
