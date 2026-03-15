import { useState } from 'react';
import { Layout, X, Trash2, Save } from 'lucide-react';
import type { LayoutPreset } from '@/lib/dashboard-types';
import { BUILT_IN_PRESETS } from '@/lib/dashboard-types';

export function LayoutPresetsDropdown({ language, presets, onLoad, onSave, onDelete, onClose }: {
  language: 'en' | 'ar';
  presets: LayoutPreset[];
  onLoad: (preset: LayoutPreset) => void;
  onSave: (name: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  return (
    <div className="absolute top-10 right-0 z-[150] w-64 bg-card border border-border rounded-lg" data-testid="layout-presets-dropdown" style={{boxShadow:'0 8px 20px rgb(0 0 0 / 0.35)'}}>
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Layout className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-xs font-bold font-mono text-foreground/80 uppercase tracking-wider">{language === 'en' ? 'Layout Presets' : '\u0642\u0648\u0627\u0644\u0628'}</span>
        <div className="flex-1" />
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"><X className="w-3 h-3" /></button>
      </div>
      <div className="p-2 space-y-1">
        {presets.map(p => (
          <div key={p.name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors group" data-testid={`preset-${p.name}`}>
            <button onClick={() => { onLoad(p); onClose(); }} className="flex-1 text-left text-[11px] font-mono text-foreground/80 hover:text-foreground">{p.name}</button>
            {!BUILT_IN_PRESETS.find(b => b.name === p.name) && (
              <button onClick={() => onDelete(p.name)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 active:bg-red-500/30 opacity-60 hover:opacity-100"><Trash2 className="w-3 h-3 text-red-400/60" /></button>
            )}
          </div>
        ))}
      </div>
      <div className="px-2 pb-2 border-t border-border pt-2">
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            placeholder={language === 'en' ? 'Save current...' : '\u062D\u0641\u0638 \u0627\u0644\u062D\u0627\u0644\u064A...'}
            className="flex-1 bg-muted/50 border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder:text-foreground/20 focus:outline-none font-mono"
            data-testid="input-preset-name"
          />
          <button
            onClick={() => { if (newName.trim()) { onSave(newName.trim()); setNewName(''); onClose(); } }}
            className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-bold hover:bg-primary/30"
            data-testid="button-save-preset"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
