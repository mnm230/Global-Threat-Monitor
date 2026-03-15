import { useState, memo, useCallback } from 'react';
import {
  Video, ExternalLink, Globe, Play, Plus, X, Settings,
} from 'lucide-react';
import { PanelHeader } from '@/components/panels/panel-chrome';

export const LIVE_CHANNELS = [
  { id: 'aje',     label: 'AJ ENG',   labelAr: 'الجزيرة EN', channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg', videoId: 'gCNeDWCI0vo' },
  { id: 'aja',     label: 'AJ AR',    labelAr: 'الجزيرة ع',  channelId: 'UCBvxne3r4hL7GKxufPsOmRg', videoId: 'bNyUyrR0PHo' },
  { id: 'sky',     label: 'SKY AR',   labelAr: 'سكاي عربية', channelId: 'UCdsMKkuVRqTmYKvIiMbZJmA', videoId: 'U--OjmpjF5o' },
  { id: 'france',  label: 'F24 ENG',  labelAr: 'فرانس 24',   channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg', videoId: '' },
  { id: 'jadeed',  label: 'AL JADEED', labelAr: 'الجديد',     channelId: 'UCBKJsRj3mSsg_eDHrsYOHMg', videoId: '' },
  { id: 'araby',   label: 'AL ARABY', labelAr: 'العربي',      channelId: 'UCbqBj1gZsJJjU2jCVasqL-g', videoId: 'e2RgSa1Wt5o' },
] as const;

export const LiveFeedPanel = memo(function LiveFeedPanel({ language, onClose, onMaximize, isMaximized }: { language: 'en' | 'ar'; onClose?: () => void; onMaximize?: () => void; isMaximized?: boolean }) {
  const [activeChannel, setActiveChannel] = useState<typeof LIVE_CHANNELS[number]['id']>('aja');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customVideoId, setCustomVideoId] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  const currentChannel = LIVE_CHANNELS.find(c => c.id === activeChannel)!;
  const embedSrc = customVideoId
    ? `https://www.youtube-nocookie.com/embed/${customVideoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
    : currentChannel.videoId
      ? `https://www.youtube-nocookie.com/embed/${currentChannel.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
      : `https://www.youtube-nocookie.com/embed/live_stream?channel=${currentChannel.channelId}&autoplay=1&mute=1&rel=0&modestbranding=1`;

  const handleSetUrl = useCallback(() => {
    const match = customUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/);
    if (match) {
      setCustomVideoId(match[1]);
      setShowUrlInput(false);
      setCustomUrl('');
      setIframeError(false);
    }
  }, [customUrl]);

  const handleSelectChannel = (id: typeof LIVE_CHANNELS[number]['id']) => {
    setActiveChannel(id);
    setCustomVideoId(null);
    setIframeError(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0" data-testid="livefeed-panel">
      <PanelHeader
        icon={<Video className="w-3.5 h-3.5 text-red-400" />}
        title={language === 'en' ? 'LIVE FEED' : '\u0628\u062B \u0645\u0628\u0627\u0634\u0631'}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="livefeed"
        extra={
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
              <span className="text-[9px] text-red-500 font-bold tracking-wider font-mono">LIVE</span>
            </div>
            <button
              onClick={() => setShowUrlInput(p => !p)}
              className="w-6 h-6 rounded flex items-center justify-center text-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Change stream URL"
              data-testid="button-change-stream"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        }
      />
      <div className="px-2 py-1 border-b border-border bg-muted/40 flex items-center gap-1 shrink-0 overflow-x-auto">
        {LIVE_CHANNELS.map(ch => (
          <button
            key={ch.id}
            onClick={() => handleSelectChannel(ch.id)}
            data-testid={`button-channel-${ch.id}`}
            className={`flex-1 py-1 rounded text-[9px] font-mono font-bold transition-colors border whitespace-nowrap min-w-0 ${
              activeChannel === ch.id && !customVideoId
                ? 'bg-red-500/10 text-red-500 border-red-500/25'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted'
            }`}
          >
            {language === 'ar' ? ch.labelAr : ch.label}
          </button>
        ))}
      </div>
      {showUrlInput && (
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetUrl()}
            placeholder="Paste YouTube live URL..."
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:border-primary/50"
            data-testid="input-stream-url"
          />
          <button
            onClick={handleSetUrl}
            className="px-2 py-1 rounded text-[9px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            data-testid="button-set-stream"
          >
            SET
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 bg-muted/20 relative">
        <iframe
          key={customVideoId || currentChannel.videoId || currentChannel.channelId}
          src={embedSrc}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms"
          title="Live Feed"
          data-testid="livefeed-iframe"
          onError={() => setIframeError(true)}
        />
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
            <Video className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-[11px] text-muted-foreground font-mono mb-3">{language === 'en' ? 'Stream unavailable' : '\u0627\u0644\u0628\u062B \u063A\u064A\u0631 \u0645\u062A\u0627\u062D'}</p>
            <button
              onClick={() => { setIframeError(false); handleSelectChannel(activeChannel); }}
              className="px-3 py-1 rounded text-[9px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              data-testid="button-retry-stream"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
});


