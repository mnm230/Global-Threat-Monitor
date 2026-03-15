import { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StickyNote, X, Trash2 } from 'lucide-react';
import { timeAgo } from '@/lib/dashboard-utils';
import type { AnalystNote } from '@/lib/dashboard-types';

export function NotesOverlay({ language, onClose }: { language: 'en' | 'ar'; onClose: () => void }) {
  const [notes, setNotes] = useState<AnalystNote[]>(() => {
    try { return JSON.parse(localStorage.getItem('warroom_notes') || '[]'); } catch { return []; }
  });
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState('general');

  const saveNotes = useCallback((updated: AnalystNote[]) => {
    setNotes(updated);
    localStorage.setItem('warroom_notes', JSON.stringify(updated));
  }, []);

  const addNote = useCallback(() => {
    if (!newNote.trim()) return;
    const note: AnalystNote = { id: `n-${Date.now()}`, text: newNote.trim(), timestamp: new Date().toISOString(), category };
    saveNotes([note, ...notes]);
    setNewNote('');
  }, [newNote, category, notes, saveNotes]);

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  }, [notes, saveNotes]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="notes-overlay">
      <div className="w-[500px] max-h-[70vh] bg-card border border-border rounded-lg flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-foreground/90">{language === 'en' ? 'Analyst Notes' : '\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u0644'}</span>
          <span className="text-xs text-muted-foreground/50 font-mono">{notes.length}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted" data-testid="button-close-notes"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex gap-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder={language === 'en' ? 'Add intelligence note...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062D\u0638\u0629...'}
              className="flex-1 bg-muted/50 border border-border rounded px-3 py-1.5 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 font-mono"
              data-testid="input-note"
            />
            <button onClick={addNote} className="px-3 py-1.5 rounded bg-primary/20 border border-primary/30 text-primary text-[11px] font-mono font-bold hover:bg-primary/30 transition-colors" data-testid="button-add-note">
              {language === 'en' ? 'Add' : '\u0625\u0636\u0627\u0641\u0629'}
            </button>
          </div>
          <div className="flex gap-1">
            {['general', 'threat', 'intel', 'maritime'].map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border transition-colors ${category === c ? 'bg-primary/15 border-primary/25 text-primary/90' : 'bg-muted/30 border-border text-foreground/30'}`}>{c.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-border">
            {notes.length === 0 && (
              <div className="px-4 py-8 text-center">
                <StickyNote className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground/50">{language === 'en' ? 'No notes yet' : '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0644\u0627\u062D\u0638\u0627\u062A'}</p>
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} className="px-4 py-2.5 hover:bg-card/30 transition-colors" data-testid={`note-${n.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/70 font-mono font-bold uppercase">{n.category}</span>
                  <span className="text-[11px] text-muted-foreground/50 font-mono ml-auto">{timeAgo(n.timestamp)}</span>
                  <button onClick={() => deleteNote(n.id)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20" data-testid={`button-delete-note-${n.id}`}><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
