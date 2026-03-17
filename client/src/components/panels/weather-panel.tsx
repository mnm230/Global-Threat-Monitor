import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wind, Eye, Droplets } from 'lucide-react';
import { PanelHeader, FeedFreshnessContext } from '@/components/panels/panel-chrome';
import { ScrollShadow } from '@/components/shared/scroll-shadow';

interface WeatherPoint {
  name: string;
  nameAr: string;
  country: string;
  flag: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  visibility: number;
  weatherCode: number;
  description: string;
  icon: string;
  operationalImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  updatedAt: string;
}

function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

const IMPACT_COLOR: Record<string, string> = {
  minimal: 'text-green-400',
  moderate: 'text-yellow-400',
  significant: 'text-orange-400',
  severe: 'text-red-400',
};

const IMPACT_BG: Record<string, string> = {
  minimal: 'bg-green-400/5 border-green-400/20',
  moderate: 'bg-yellow-400/8 border-yellow-400/25',
  significant: 'bg-orange-400/10 border-orange-400/30',
  severe: 'bg-red-500/15 border-red-500/35',
};

export function WeatherPanel({ language, onClose, onMaximize, isMaximized }: {
  language: 'en' | 'ar';
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  useContext(FeedFreshnessContext);

  const { data: weatherData, isLoading } = useQuery<WeatherPoint[]>({
    queryKey: ['/api/weather'],
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const hasSignificant = weatherData?.some(w => w.operationalImpact === 'significant' || w.operationalImpact === 'severe');

  return (
    <div className="flex flex-col h-full bg-[hsl(20,10%,6%)]">
      <PanelHeader
        icon="🌤️"
        title={language === 'ar' ? 'الأحوال الجوية' : 'WEATHER OPS'}
        count={weatherData?.length}
        onClose={onClose}
        onMaximize={onMaximize}
        isMaximized={isMaximized}
        feedKey="weather"
        extra={
          hasSignificant ? (
            <span className="text-orange-400 text-[10px] font-mono animate-pulse">⚠ OPS IMPACT</span>
          ) : undefined
        }
      />
      <ScrollShadow className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 space-y-1.5">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground text-xs font-mono">
              FETCHING WEATHER DATA...
            </div>
          )}
          {!isLoading && (!weatherData || weatherData.length === 0) && (
            <div className="text-center py-8 text-muted-foreground text-xs font-mono">
              NO WEATHER DATA
            </div>
          )}
          {weatherData?.map(w => (
            <div key={w.name} className={`rounded border p-2 ${IMPACT_BG[w.operationalImpact]}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{w.icon}</span>
                  <div>
                    <div className="font-mono text-xs font-bold text-foreground">
                      {w.flag} {language === 'ar' ? w.nameAr : w.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{w.country}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-foreground">{w.temp}°C</div>
                  <div className="text-[10px] text-muted-foreground font-mono">feels {w.feelsLike}°C</div>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono mb-1.5">{w.description}</div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{w.windSpeed}km/h {windDirLabel(w.windDir)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>{w.visibility}km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-300 shrink-0" />
                  <span>{w.humidity}%</span>
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Ops Impact</span>
                <span className={`text-[9px] font-mono font-bold uppercase ${IMPACT_COLOR[w.operationalImpact]}`}>
                  {w.operationalImpact}
                </span>
              </div>
            </div>
          ))}
          {weatherData && weatherData.length > 0 && (
            <div className="text-[9px] text-muted-foreground/50 text-center font-mono pt-1">
              Open-Meteo • Updated {new Date(weatherData[0].updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
