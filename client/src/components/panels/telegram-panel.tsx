import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, ExternalLink, Hash, Plus, Search, Settings, Trash2, X, BarChart3, Activity,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelHeader } from '@/components/panels/panel-chrome';
import { timeAgo } from '@/lib/dashboard-utils';
import type { TelegramMessage } from '@shared/schema';

const DEFAULT_CHANNELS = ['@bintjbeilnews', '@wfwitness', '@ClashReport', '@OSINTdefender', '@IntelCrab', '@GeoConfirmed', '@CIG_telegram', '@sentaborim', '@AviationIntel', '@rnintel', '@lebaborim', '@almanarnews', '@AlAhedNews', '@lebanonnews2', '@NewsInIsrael', '@alaborim', '@AbuAliEnglish', '@Yemen_Press', '@clashreport', '@inaborim', '@MEConflictNews', '@ELINTNews', '@BNONewsRoom', '@Middle_East_Spectator', '@interbellumnews', '@QudsN', '@GazaNewsPlus', '@SouthFrontEng', '@MilitaryOSINT', '@LBCINews', '@NaharnetEnglish', '@ISWResearch', '@conflictnews', '@IranIntl_En', '@warmonitor3', '@WarSpottersINT', '@AjaNews', '@thewarreporter', '@channelnabatieh'];

export const TelegramPanel = memo(function TelegramPanel({
  messages,
  language,
  onClose,
  onMaximize,
  isMaximized,
  soundEnabled = false,
  silentMode = false,
  volume = 70,
}: {
  messages: TelegramMessage[];
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  soundEnabled?: boolean;
  silentMode?: boolean;
  volume?: number;
}) {
  const [customChannels, setCustomChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('warroom_tg_channels');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newChannel, setNewChannel] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());
  const prevMsgIdsRef = useRef<Set<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);
  const [telegramTab, setTelegramTab] = useState<'feed' | 'stats' | 'channels'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const allChannels = useMemo(() => [...DEFAULT_CHANNELS, ...customChannels], [customChannels]);
  const customOnly = useMemo(() => customChannels.filter(c => !DEFAULT_CHANNELS.includes(c)), [customChannels]);
  const customQueryParam = useMemo(() => customOnly.map(c => c.replace('@', '')).join(','), [customOnly]);

  const { data: customMessages = [] } = useQuery<TelegramMessage[]>({
    queryKey: ['/api/telegram/live', customQueryParam],
    queryFn: async () => {
      const resp = await fetch(`/api/telegram/live?channels=${encodeURIComponent(customQueryParam)}`);
      if (!resp.ok) return [];
      return await resp.json();
    },
    refetchInterval: 30000,
    staleTime: 25000,
    enabled: customOnly.length > 0,
  });

  const addChannel = useCallback(() => {
    const ch = newChannel.trim();
    if (!ch) return;
    const formatted = ch.startsWith('@') ? ch : `@${ch}`;
    if (allChannels.includes(formatted)) return;
    const updated = [...customChannels, formatted];
    setCustomChannels(updated);
    localStorage.setItem('warroom_tg_channels', JSON.stringify(updated));
    setNewChannel('');
  }, [newChannel, customChannels, allChannels]);

  const removeChannel = useCallback((ch: string) => {
    const updated = customChannels.filter(c => c !== ch);
    setCustomChannels(updated);
    localStorage.setItem('warroom_tg_channels', JSON.stringify(updated));
  }, [customChannels]);

  const stableOrderRef = useRef<string[]>([]);
  const filteredMessages = useMemo(() => {
    const merged = customOnly.length > 0 ? [...messages, ...customMessages] : [...messages];
    const seen = new Set<string>();
    const deduped = merged.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const msgMap = new Map(deduped.map(m => [m.id, m]));
    const newIds = deduped.filter(m => !stableOrderRef.current.includes(m.id)).map(m => m.id);
    newIds.sort((a, b) => new Date(msgMap.get(b)!.timestamp).getTime() - new Date(msgMap.get(a)!.timestamp).getTime());
    const kept = stableOrderRef.current.filter(id => msgMap.has(id));
    stableOrderRef.current = [...newIds, ...kept];
    return stableOrderRef.current.map(id => msgMap.get(id)!);
  }, [messages, customMessages, customOnly]);

  const clearNewMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const currentIds = new Set(filteredMessages.map(m => m.id));
    if (prevMsgIdsRef.current.size > 0) {
      const freshIds: string[] = [];
      currentIds.forEach(id => {
        if (!prevMsgIdsRef.current.has(id)) freshIds.push(id);
      });
      if (freshIds.length > 0) {
        if (clearNewMsgTimerRef.current) clearTimeout(clearNewMsgTimerRef.current);
        setNewMsgIds(prev => new Set([...Array.from(prev), ...freshIds]));
        clearNewMsgTimerRef.current = setTimeout(() => setNewMsgIds(new Set()), 6000);
      }
    }
    prevMsgIdsRef.current = currentIds;
  }, [filteredMessages, soundEnabled, silentMode, volume]);

  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const displayMessages = useMemo(() => {
    let msgs = !channelFilter ? filteredMessages : filteredMessages.filter(m => m.channel === channelFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter(m => m.text.toLowerCase().includes(q) || (m.textAr ?? '').toLowerCase().includes(q));
    }
    return msgs;
  }, [filteredMessages, channelFilter, searchQuery]);

  // ── Stats derived data ──────────────────────────────────────────────────────
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMessages.forEach(m => { counts[m.channel] = (counts[m.channel] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredMessages]);

  const hourlyActivity = useMemo(() => {
    const buckets: Record<number, number> = {};
    const now = Date.now();
    for (let h = 0; h < 12; h++) buckets[h] = 0;
    filteredMessages.forEach(m => {
      const age = (now - new Date(m.timestamp).getTime()) / 3600000;
      const bucket = Math.floor(age);
      if (bucket < 12) buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    return Array.from({ length: 12 }, (_, i) => ({ hour: i, count: buckets[i] || 0 })).reverse();
  }, [filteredMessages]);

  const topKeywords = useMemo(() => {
    const freq: Record<string, number> = {};
    const stop = new Set(['the','a','an','in','on','to','of','and','is','are','was','were','for','with','at','by','from','that','this','it','as','be','been','have','has','had','not','but','or','they','we','you','he','she','his','her','its','our','their']);
    filteredMessages.forEach(m => {
      m.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
        if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [filteredMessages]);

  const recentActivity = useMemo(() => {
    const cutoff = Date.now() - 3600000;
    return filteredMessages.filter(m => new Date(m.timestamp).getTime() > cutoff).length;
  }, [filteredMessages]);

  const breakingCount = useMemo(() => filteredMessages.filter(m => /BREAKING|URGENT|FLASH|عاجل/i.test(m.text)).length, [filteredMessages]);

  // ── Priority helper ─────────────────────────────────────────────────────────
  const getPriority = (text: string): { label: string; color: string } | null => {
    if (/BREAKING|URGENT|FLASH|عاجل/i.test(text)) return { label: 'BREAKING', color: '#ef4444' };
    if (/\bALERT\b|WARNING|ATTACK|STRIKE|MISSILE|صاروخ|هجوم/i.test(text)) return { label: 'ALERT', color: '#f97316' };
    if (/DEVELOPING|UPDATE|تطور/i.test(text)) return { label: 'UPDATE', color: '#facc15' };
    return null;
  };

  const maxHourly = Math.max(...hourlyActivity.map(h => h.count), 1);
  const maxChannel = channelCounts.length > 0 ? channelCounts[0][1] : 1;

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="telegram-panel">
      <PanelHeader
        title={language === 'en' ? 'Telegram OSINT' : 'تلغرام OSINT'}
        icon={<SiTelegram className="w-3.5 h-3.5" />}
        live
        count={filteredMessages.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="telegram"
        extra={
          <div className="flex items-center gap-1">
            {newMsgIds.size > 0 && (
              <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-1.5 rounded" data-testid="text-new-count">
                +{newMsgIds.size} NEW
              </span>
            )}
            <button
              onClick={() => setShowManager(!showManager)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-sky-500/10 transition-colors"
              data-testid="button-toggle-channel-manager"
            >
              <Settings className="w-3 h-3 text-sky-400/50 hover:text-sky-400/80 transition-colors" />
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-border/40 shrink-0" style={{ background: 'hsl(var(--muted))' }}>
        {(['feed', 'stats', 'channels'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTelegramTab(tab)}
            className="flex-1 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
            style={{
              color: telegramTab === tab ? 'hsl(199 89% 70%)' : 'hsl(var(--muted-foreground) / 0.55)',
              borderBottom: telegramTab === tab ? '2px solid hsl(199 89% 60%)' : '2px solid transparent',
              background: telegramTab === tab ? 'hsl(199 89% 50% / 0.07)' : 'transparent',
            }}
          >
            {tab === 'feed' && <SiTelegram className="w-2.5 h-2.5" />}
            {tab === 'stats' && <BarChart3 className="w-2.5 h-2.5" />}
            {tab === 'channels' && <Hash className="w-2.5 h-2.5" />}
            {tab === 'feed' ? t('Feed', 'مباشر') : tab === 'stats' ? t('Stats', 'إحصاء') : t('Channels', 'قنوات')}
            {tab === 'feed' && filteredMessages.length > 0 && (
              <span className="text-[7px] font-mono opacity-60">{filteredMessages.length}</span>
            )}
            {tab === 'stats' && breakingCount > 0 && (
              <span className="text-[7px] font-mono font-black text-red-400">{breakingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Channel manager */}
      {showManager && (
        <div className="border-b border-sky-800/20 bg-sky-950/20 px-3 py-2.5 shrink-0 space-y-2">
          <div className="flex gap-1.5">
            <div className="flex-1 relative">
              <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40" />
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                placeholder={t('Add channel...', 'اسم القناة...')}
                className="w-full h-7 text-[11px] font-mono pl-7 pr-2 rounded-md bg-background/60 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/25 focus:outline-none focus:border-sky-500/50 transition-colors"
                data-testid="input-telegram-channel"
              />
            </div>
            <button
              onClick={addChannel}
              className="h-7 px-3 text-[10px] font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded-md border border-sky-500/25 transition-colors"
              data-testid="button-add-channel"
            >
              {t('ADD', 'إضافة')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {allChannels.map(ch => {
              const isCustom = customChannels.includes(ch);
              return (
                <div
                  key={ch}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    isCustom
                      ? 'bg-sky-500/15 text-sky-300/90 border border-sky-500/20'
                      : 'bg-muted/30 text-muted-foreground/50 border border-border/30'
                  }`}
                  data-testid={`channel-tag-${ch.replace('@', '')}`}
                >
                  <SiTelegram className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{ch.replace('@', '')}</span>
                  {isCustom && (
                    <button
                      onClick={() => removeChannel(ch)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-500/20 transition-colors"
                      data-testid={`button-remove-channel-${ch.replace('@', '')}`}
                    >
                      <X className="w-2.5 h-2.5 text-red-400/60" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxImage(null); }}
          tabIndex={0}
          role="dialog"
          data-testid="telegram-lightbox"
        >
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
            onError={() => setLightboxImage(null)}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 border border-white/25 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            data-testid="button-close-lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── FEED TAB ─────────────────────────────────────────────────────────── */}
      {telegramTab === 'feed' && (
        <>
          {/* Channel filter pills */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 bg-card/40 shrink-0 overflow-x-auto" data-testid="telegram-channel-filters">
            <button
              onClick={() => setChannelFilter(null)}
              className={`px-2 py-1 rounded text-[9px] font-mono font-bold whitespace-nowrap transition-all ${
                !channelFilter
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-muted-foreground/50 hover:text-sky-400/70 hover:bg-sky-500/5 border border-transparent'
              }`}
              data-testid="button-filter-all"
            >
              ALL ({filteredMessages.length})
            </button>
            {allChannels.map(ch => {
              const count = filteredMessages.filter(m => m.channel === ch).length;
              if (count === 0) return null;
              const shortName = ch.replace('@', '').slice(0, 12);
              return (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(channelFilter === ch ? null : ch)}
                  className={`px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap transition-all ${
                    channelFilter === ch
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                      : 'text-muted-foreground/40 hover:text-sky-400/60 hover:bg-sky-500/5 border border-transparent'
                  }`}
                  data-testid={`button-filter-${ch.replace('@', '')}`}
                >
                  {shortName} <span className="text-sky-400/50 ml-0.5">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="px-2 py-1.5 border-b border-border/20 shrink-0">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Search messages…', 'بحث في الرسائل…')}
                className="w-full h-6 text-[10px] font-mono pl-6 pr-6 rounded bg-background/50 border border-sky-800/25 text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-sky-500/40 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-[8px] font-mono text-sky-400/50 mt-0.5">{displayMessages.length} result{displayMessages.length !== 1 ? 's' : ''}</div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1.5">
              <div ref={topRef} />
              {displayMessages.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <SiTelegram className="w-6 h-6 text-sky-400/20 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground/60">
                    {searchQuery ? t('No messages match your search', 'لا توجد نتائج') :
                     messages.length === 0 ? t('Connecting to live feeds...', 'جاري الاتصال...') :
                     channelFilter ? t('No messages from this channel', 'لا توجد رسائل') :
                     t('No messages yet', 'لا توجد رسائل')}
                  </p>
                </div>
              )}
              {displayMessages.map((msg) => {
                const isExpanded = expandedMsgId === msg.id;
                const isLive = msg.id.startsWith('live_');
                const isNew = newMsgIds.has(msg.id);
                const text = language === 'ar' && msg.textAr ? msg.textAr : msg.text;
                const channelName = msg.channel.replace('@', '');
                const priority = getPriority(msg.text);
                const highlightText = (str: string) => {
                  if (!searchQuery.trim()) return str;
                  const idx = str.toLowerCase().indexOf(searchQuery.toLowerCase());
                  if (idx === -1) return str;
                  return str.slice(0, idx) + '【' + str.slice(idx, idx + searchQuery.length) + '】' + str.slice(idx + searchQuery.length);
                };
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                      isNew
                        ? 'bg-emerald-950/30 ring-1 ring-emerald-500/30'
                        : priority?.label === 'BREAKING'
                          ? 'bg-red-950/20 ring-1 ring-red-500/20'
                          : isExpanded
                            ? 'bg-sky-950/30 ring-1 ring-sky-500/15'
                            : 'bg-muted/20 hover:bg-sky-950/15'
                    }`}
                    onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                    data-testid={`telegram-msg-${msg.id}`}
                  >
                    {msg.image && !isExpanded && (
                      <div
                        className="relative w-full h-56 overflow-hidden cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.image!); }}
                        data-testid={`img-thumbnail-${msg.id}`}
                      >
                        <img
                          src={msg.image}
                          alt=""
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).closest('[data-testid]')!.parentElement!.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center gap-1.5 pointer-events-none">
                          <SiTelegram className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="text-[10px] text-white font-bold truncate">{channelName}</span>
                          {isNew && <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/40 px-1 rounded shrink-0">NEW</span>}
                          {isLive && !isNew && <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/30 px-1 rounded shrink-0">LIVE</span>}
                          <span className="text-[9px] text-white/60 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
                        </div>
                      </div>
                    )}

                    <div className="px-2.5 py-2">
                      {(!msg.image || isExpanded) && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                            <SiTelegram className="w-3 h-3 text-sky-400/90" />
                          </div>
                          <span className="text-xs text-sky-400 font-bold truncate">{channelName}</span>
                          {priority && (
                            <span className="text-[7px] font-mono font-black px-1 py-0.5 rounded shrink-0" style={{background: priority.color + '20', color: priority.color, border: `1px solid ${priority.color}40`}}>{priority.label}</span>
                          )}
                          {isNew && !priority && (
                            <span className="text-[7px] font-mono font-bold text-emerald-300 bg-emerald-500/25 px-1 rounded border border-emerald-500/30 shrink-0">NEW</span>
                          )}
                          {isLive && !isNew && !priority && (
                            <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1 rounded border border-emerald-500/20 shrink-0">LIVE</span>
                          )}
                          <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto tabular-nums shrink-0">{timeAgo(msg.timestamp)}</span>
                        </div>
                      )}

                      {isExpanded && msg.image && (
                        <div className="rounded-md overflow-hidden mb-2 border border-sky-800/20">
                          <img
                            src={msg.image}
                            alt=""
                            className="w-full max-h-96 object-cover bg-black/20 cursor-zoom-in hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.image!); }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            data-testid={`img-telegram-${msg.id}`}
                          />
                        </div>
                      )}

                      <p className={`text-sm leading-[1.65] ${isExpanded ? 'text-foreground/90 whitespace-pre-wrap' : 'text-foreground/70 line-clamp-2'}`}>
                        {highlightText(text)}
                      </p>

                      {isExpanded && (
                        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-sky-800/15">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                            <Clock className="w-2.5 h-2.5" />
                            <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <a
                            href={`https://t.me/${channelName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] text-sky-400/50 hover:text-sky-400/90 transition-colors ml-auto"
                            data-testid={`link-telegram-channel-${msg.id}`}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{t('Open channel', 'فتح القناة')}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {/* ── STATS TAB ────────────────────────────────────────────────────────── */}
      {telegramTab === 'stats' && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('Total Msgs', 'الرسائل'), value: filteredMessages.length, color: 'text-sky-400', accent: 'hsl(199 89% 50%)' },
                { label: t('Last Hour', 'آخر ساعة'), value: recentActivity, color: 'text-emerald-400', accent: 'hsl(160 84% 39%)' },
                { label: t('Breaking', 'عاجل'), value: breakingCount, color: breakingCount > 0 ? 'text-red-400' : 'text-foreground/30', accent: 'hsl(0 72% 51%)' },
              ].map(({ label, value, color, accent }) => (
                <div key={label} className="rounded overflow-hidden border border-border/40" style={{borderLeft:`3px solid ${accent}`}}>
                  <div className="px-2 py-1.5 bg-muted/30">
                    <div className="text-[8px] text-foreground/40 font-mono tracking-wider leading-none">{label}</div>
                    <div className={`text-xl font-black font-mono leading-tight tabular-nums ${color}`}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 12h Activity Timeline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-sky-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Activity (last 12h)', 'النشاط (12 ساعة)')}</span>
              </div>
              <div className="flex items-end gap-0.5 h-12 rounded bg-muted/20 border border-border/30 p-1.5">
                {hourlyActivity.map(({ hour, count }) => (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(2, (count / maxHourly) * 36)}px`,
                        background: count > maxHourly * 0.7 ? 'hsl(199 89% 55%)' : count > 0 ? 'hsl(199 89% 40%)' : 'hsl(var(--muted))',
                      }}
                    />
                    {hour % 3 === 0 && <span className="text-[6px] font-mono text-foreground/25">{hour === 0 ? 'now' : `${hour}h`}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages per channel */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SiTelegram className="w-3.5 h-3.5 text-sky-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Messages by Channel', 'رسائل حسب القناة')}</span>
              </div>
              <div className="space-y-1.5">
                {channelCounts.slice(0, 12).map(([ch, count]) => (
                  <div key={ch} className="flex items-center gap-2">
                    <span className="text-[9px] text-sky-400/70 font-mono w-[110px] truncate">{ch.replace('@', '')}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/30">
                      <div className="h-full rounded-full transition-all" style={{width:`${(count / maxChannel) * 100}%`, background:'hsl(199 89% 45%)'}} />
                    </div>
                    <span className="text-[9px] text-sky-300 font-mono font-bold w-[24px] text-right tabular-nums">{count}</span>
                  </div>
                ))}
                {filteredMessages.length === 0 && (
                  <div className="text-center py-4 text-[10px] font-mono text-foreground/30">{t('No data yet', 'لا بيانات')}</div>
                )}
              </div>
            </div>

            {/* Top Keywords */}
            {topKeywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-sky-400/70" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 font-mono">{t('Top Keywords', 'الكلمات الأكثر تكراراً')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {topKeywords.map(([word, count]) => (
                    <button
                      key={word}
                      onClick={() => { setSearchQuery(word); setTelegramTab('feed'); }}
                      className="px-2 py-0.5 rounded text-[8px] font-mono transition-all hover:opacity-80 active:scale-95"
                      style={{
                        background: `hsl(199 89% ${Math.max(15, 30 - (topKeywords.indexOf([word, count]) * 1))}% / 0.25)`,
                        border: '1px solid hsl(199 89% 50% / 0.2)',
                        color: `hsl(199 89% ${Math.max(55, 75 - topKeywords.indexOf([word, count]))}%)`,
                        fontSize: `${Math.max(11, 13 - Math.floor(topKeywords.indexOf([word, count]) / 5))}px`,
                      }}
                    >
                      {word} <span className="opacity-50">{count}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[7px] font-mono text-foreground/25 mt-1">{t('Click a keyword to search feed', 'انقر للبحث في المحادثات')}</div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* ── CHANNELS TAB ─────────────────────────────────────────────────────── */}
      {telegramTab === 'channels' && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            {/* Add channel form always visible here */}
            <div className="rounded border border-sky-800/25 bg-sky-950/15 p-2.5 space-y-2">
              <div className="text-[9px] font-mono font-bold text-sky-400/60 uppercase tracking-wider">{t('Add Channel', 'إضافة قناة')}</div>
              <div className="flex gap-1.5">
                <div className="flex-1 relative">
                  <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-400/40" />
                  <input
                    type="text"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                    placeholder={t('@channel or username', '@القناة')}
                    className="w-full h-7 text-[11px] font-mono pl-7 pr-2 rounded bg-background/60 border border-sky-800/30 text-sky-100/90 placeholder:text-sky-400/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
                <button
                  onClick={addChannel}
                  className="h-7 px-3 text-[10px] font-mono font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 rounded border border-sky-500/25 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {t('Add', 'إضافة')}
                </button>
              </div>
            </div>

            {/* Default channels */}
            <div>
              <div className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-wider mb-1.5">{t('Default Channels', 'القنوات الافتراضية')}</div>
              <div className="space-y-1">
                {DEFAULT_CHANNELS.map(ch => {
                  const count = filteredMessages.filter(m => m.channel === ch).length;
                  const lastMsg = filteredMessages.find(m => m.channel === ch);
                  return (
                    <div key={ch} className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border/30 hover:border-sky-500/20 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
                        <SiTelegram className="w-3.5 h-3.5 text-sky-400/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-sky-300 font-mono truncate">{ch.replace('@', '')}</div>
                        {lastMsg && <div className="text-[8px] text-foreground/30 font-mono truncate">{lastMsg.text.slice(0, 50)}{lastMsg.text.length > 50 ? '…' : ''}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[9px] font-mono font-bold text-sky-400">{count}</span>
                        <a
                          href={`https://t.me/${ch.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-foreground/20 hover:text-sky-400/60 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom channels */}
            {customOnly.length > 0 && (
              <div>
                <div className="text-[9px] font-mono font-bold text-foreground/30 uppercase tracking-wider mb-1.5">{t('Custom Channels', 'قنوات مخصصة')}</div>
                <div className="space-y-1">
                  {customOnly.map(ch => {
                    const count = filteredMessages.filter(m => m.channel === ch).length;
                    return (
                      <div key={ch} className="flex items-center gap-2 p-2 rounded bg-sky-950/20 border border-sky-800/25">
                        <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0">
                          <SiTelegram className="w-3.5 h-3.5 text-sky-300/80" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-sky-200 font-mono truncate">{ch.replace('@', '')}</div>
                          <div className="text-[8px] text-sky-400/40 font-mono">{t('Custom', 'مخصص')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono font-bold text-sky-400">{count}</span>
                          <a
                            href={`https://t.me/${ch.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-foreground/20 hover:text-sky-400/60 transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <button
                            onClick={() => removeChannel(ch)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-400/50 hover:text-red-400/80" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});

