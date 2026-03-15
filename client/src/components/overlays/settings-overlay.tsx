import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, VolumeX, Volume2 } from 'lucide-react';
import type { WARROOMSettings } from '@/lib/dashboard-types';
import { isTouchDevice } from '@/lib/dashboard-types';

export function SettingsOverlay({ settings, onSave, onClose, language }: { settings: WARROOMSettings; onSave: (s: WARROOMSettings) => void; onClose: () => void; language: 'en' | 'ar' }) {
  const [local, setLocal] = useState({ ...settings });
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const handleSave = () => {
    localStorage.setItem('warroom_settings', JSON.stringify(local));
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="settings-overlay">
      <div className="w-[95vw] max-w-[520px] max-h-[90dvh] bg-background border border-primary/30 rounded-xl flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 12px 28px rgb(0 0 0 / 0.4)'}}>
        <div className={`px-4 ${isTouchDevice ? 'py-4' : 'py-3'} border-b border-primary/20 bg-primary/5 flex items-center gap-2 rounded-t-xl`}>
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold font-mono text-primary tracking-wider">{t('SETTINGS', '\u0625\u0639\u062F\u0627\u062F\u0627\u062A')}</span>
          <div className="flex-1" />
          <button onClick={onClose} className={`${isTouchDevice ? 'w-10 h-10' : 'w-6 h-6'} flex items-center justify-center rounded hover:bg-primary/20 active:bg-primary/30`} aria-label="Close settings" data-testid="button-close-settings"><X className={`${isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'} text-primary/60`} /></button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Threat Thresholds', '\u0639\u062A\u0628\u0627\u062A \u0627\u0644\u062A\u0647\u062F\u064A\u062F')}</span>
              {([
                { key: 'criticalThreshold' as const, label: 'CRITICAL', color: 'text-red-400' },
                { key: 'highThreshold' as const, label: 'HIGH', color: 'text-orange-400' },
                { key: 'elevatedThreshold' as const, label: 'ELEVATED', color: 'text-yellow-400' },
              ] as const).map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3 mb-2">
                  <span className={`text-[11px] font-mono font-bold w-20 ${color}`}>{label}</span>
                  <input
                    type="range" min={1} max={30} value={local[key]}
                    onChange={e => setLocal(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                    className="flex-1 accent-primary h-1" data-testid={`slider-${key}`}
                  />
                  <span className="text-xs font-mono text-foreground/60 w-8 text-right">{local[key]}</span>
                </div>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Notification Types', '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A')}</span>
              {([
                { key: 'notifyRockets' as const, label: 'Rockets' },
                { key: 'notifyMissiles' as const, label: 'Missiles' },
                { key: 'notifyUav' as const, label: 'UAV Intrusion' },
                { key: 'notifyAircraft' as const, label: 'Hostile Aircraft' },
              ] as const).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-3 ${isTouchDevice ? 'mb-3 py-1' : 'mb-2'} cursor-pointer group`} data-testid={`toggle-${key}`}>
                  <div
                    className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local[key] ? 'bg-primary' : 'bg-border/50'}`}
                    onClick={() => setLocal(p => ({ ...p, [key]: !p[key] }))}
                  >
                    <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local[key] ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90 transition-colors">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Sound', '\u0635\u0648\u062A')}</span>
              <label className={`flex items-center gap-3 cursor-pointer group mb-3 ${isTouchDevice ? 'py-1' : ''}`} data-testid="toggle-sound">
                <div className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local.soundEnabled ? 'bg-primary' : 'bg-border/50'}`} onClick={() => setLocal(p => ({ ...p, soundEnabled: !p.soundEnabled }))}>
                  <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local.soundEnabled ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90">{t('Alert sounds', '\u0623\u0635\u0648\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631')}</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer group mb-3 ${isTouchDevice ? 'py-1' : ''}`} data-testid="toggle-silent-mode">
                <div className={`${isTouchDevice ? 'w-11 h-6' : 'w-8 h-4'} rounded-full transition-colors relative ${local.silentMode ? 'bg-red-500' : 'bg-border/50'}`} onClick={() => setLocal(p => ({ ...p, silentMode: !p.silentMode }))}>
                  <div className={`absolute ${isTouchDevice ? 'top-1 w-4 h-4' : 'top-0.5 w-3 h-3'} rounded-full bg-white shadow transition-transform ${local.silentMode ? (isTouchDevice ? 'translate-x-5' : 'translate-x-4') : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-mono text-foreground/70 group-hover:text-foreground/90">{t('Silent mode (mute all)', '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0635\u0627\u0645\u062A')}</span>
              </label>
              <div className="flex items-center gap-3 mb-2">
                <VolumeX className="w-3 h-3 text-foreground/40" />
                <input type="range" min={0} max={100} value={local.volume} onChange={e => setLocal(p => ({ ...p, volume: parseInt(e.target.value) }))} className="flex-1 accent-primary h-1" data-testid="slider-volume" />
                <Volume2 className="w-3 h-3 text-foreground/40" />
                <span className="text-xs font-mono text-foreground/60 w-8 text-right">{local.volume}%</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Push Notifications', '\u0625\u0634\u0639\u0627\u0631\u0627\u062A')}</span>
              <div className="flex gap-2">
                {(['all', 'critical', 'none'] as const).map(l => (
                  <button key={l} onClick={() => setLocal(p => ({ ...p, notificationLevel: l }))}
                    className={`text-xs px-3 py-1.5 rounded font-mono font-bold border transition-colors ${local.notificationLevel === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted/20 border-border text-foreground/30 hover:bg-muted/40'}`}
                    data-testid={`button-notify-${l}`}
                  >{l === 'all' ? t('All Alerts', '\u0627\u0644\u0643\u0644') : l === 'critical' ? t('Critical Only', '\u062D\u0631\u062C\u0629 \u0641\u0642\u0637') : t('None', '\u0644\u0627 \u0634\u064A\u0621')}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3 block">{t('Default Language', '\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629')}</span>
              <div className="flex gap-2">
                {(['en', 'ar'] as const).map(l => (
                  <button key={l} onClick={() => setLocal(p => ({ ...p, defaultLanguage: l }))}
                    className={`text-xs px-4 py-1.5 rounded font-mono font-bold border transition-colors ${local.defaultLanguage === l ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-muted/20 border-border text-foreground/30 hover:bg-muted/40'}`}
                    data-testid={`button-lang-${l}`}
                  >{l === 'en' ? 'English' : '\u0639\u0631\u0628\u064A'}</button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="px-4 py-3 border-t border-primary/20 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[10px] px-4 py-1.5 rounded font-mono text-foreground/40 hover:text-foreground border border-border hover:bg-muted/40 transition-colors" data-testid="button-cancel-settings">{t('Cancel', '\u0625\u0644\u063A\u0627\u0621')}</button>
          <button onClick={handleSave} className={`text-xs ${isTouchDevice ? 'px-6 py-3' : 'px-4 py-1.5'} rounded font-mono font-bold text-background bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors`} data-testid="button-save-settings">{t('Save', '\u062D\u0641\u0638')}</button>
        </div>
      </div>
    </div>
  );
}
