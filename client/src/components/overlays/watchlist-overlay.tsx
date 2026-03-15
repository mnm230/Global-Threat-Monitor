import { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, X, Star } from 'lucide-react';

export function WatchlistOverlay({ language, onClose, onUpdate }: { language: 'en' | 'ar'; onClose: () => void; onUpdate: (items: string[]) => void }) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_watchlist') || '[]'); } catch { return []; }
  });
  const [newItem, setNewItem] = useState('');

  const save = useCallback((updated: string[]) => {
    setItems(updated);
    localStorage.setItem('warroom_watchlist', JSON.stringify(updated));
    onUpdate(updated);
  }, [onUpdate]);

  const add = useCallback(() => {
    if (!newItem.trim() || items.includes(newItem.trim())) return;
    save([...items, newItem.trim()]);
    setNewItem('');
  }, [newItem, items, save]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="watchlist-overlay">
      <div className="w-[400px] max-h-[60vh] bg-card border border-border rounded-lg flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Watchlist' : '\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629'}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-watchlist"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={language === 'en' ? 'Callsign, ship name, city...' : '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0626\u0631\u0629 \u0623\u0648 \u0627\u0644\u0633\u0641\u064A\u0646\u0629...'}
              className="flex-1 bg-muted/50 border border-border rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-amber-500/40 font-mono"
              data-testid="input-watchlist"
            />
            <button onClick={add} className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold hover:bg-amber-500/30 transition-colors" data-testid="button-add-watchlist">+</button>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {items.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 text-center py-4">{language === 'en' ? 'Add items to track across all panels' : '\u0623\u0636\u0641 \u0639\u0646\u0627\u0635\u0631 \u0644\u0644\u062A\u062A\u0628\u0639'}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <div key={item} className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] font-mono" data-testid={`watchlist-item-${item}`}>
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>{item}</span>
                  <button onClick={() => save(items.filter(i => i !== item))} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-500/30"><X className="w-3 h-3 text-red-400/70" /></button>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
