import { TtlCache } from "../lib/cache";

interface WeatherLocation {
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  country: string;
  flag: string;
}

export interface WeatherPoint {
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

const WEATHER_LOCATIONS: WeatherLocation[] = [
  { name: 'Tel Aviv', nameAr: '\u062a\u0644 \u0623\u0628\u064a\u0628', lat: 32.085, lng: 34.782, country: 'Israel', flag: '\u{1f1ee}\u{1f1f1}' },
  { name: 'Tehran', nameAr: '\u0637\u0647\u0631\u0627\u0646', lat: 35.689, lng: 51.389, country: 'Iran', flag: '\u{1f1ee}\u{1f1f7}' },
  { name: 'Beirut', nameAr: '\u0628\u064a\u0631\u0648\u062a', lat: 33.894, lng: 35.502, country: 'Lebanon', flag: '\u{1f1f1}\u{1f1e7}' },
  { name: 'Baghdad', nameAr: '\u0628\u063a\u062f\u0627\u062f', lat: 33.312, lng: 44.366, country: 'Iraq', flag: '\u{1f1ee}\u{1f1f6}' },
  { name: 'Riyadh', nameAr: '\u0627\u0644\u0631\u064a\u0627\u0636', lat: 24.713, lng: 46.675, country: 'Saudi Arabia', flag: '\u{1f1f8}\u{1f1e6}' },
  { name: 'Sanaa', nameAr: '\u0635\u0646\u0639\u0627\u0621', lat: 15.370, lng: 44.191, country: 'Yemen', flag: '\u{1f1fe}\u{1f1ea}' },
  { name: 'Damascus', nameAr: '\u062f\u0645\u0634\u0642', lat: 33.514, lng: 36.277, country: 'Syria', flag: '\u{1f1f8}\u{1f1fe}' },
  { name: 'Gaza', nameAr: '\u063a\u0632\u0629', lat: 31.510, lng: 34.447, country: 'Palestine', flag: '\u{1f1f5}\u{1f1f8}' },
  { name: 'Jerusalem', nameAr: '\u0627\u0644\u0642\u062f\u0633', lat: 31.769, lng: 35.216, country: 'Israel/Palestine', flag: '\u{1f54d}' },
  { name: 'Aden', nameAr: '\u0639\u062f\u0646', lat: 12.782, lng: 45.037, country: 'Yemen', flag: '\u{1f1fe}\u{1f1ea}' },
];

const weatherCache = new TtlCache<WeatherPoint[]>(10 * 60_000);

function getWeatherMeta(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Clear', icon: '\u2600\ufe0f' };
  if (code <= 2) return { description: 'Partly Cloudy', icon: '\u26c5' };
  if (code === 3) return { description: 'Overcast', icon: '\u2601\ufe0f' };
  if (code <= 49) return { description: 'Foggy', icon: '\u{1f32b}\ufe0f' };
  if (code <= 59) return { description: 'Drizzle', icon: '\u{1f326}\ufe0f' };
  if (code <= 69) return { description: 'Rain', icon: '\u{1f327}\ufe0f' };
  if (code <= 79) return { description: 'Snow', icon: '\u2744\ufe0f' };
  if (code <= 82) return { description: 'Rain Showers', icon: '\u{1f326}\ufe0f' };
  if (code <= 86) return { description: 'Snow Showers', icon: '\u{1f328}\ufe0f' };
  if (code <= 99) return { description: 'Thunderstorm', icon: '\u26c8\ufe0f' };
  return { description: 'Unknown', icon: '\u{1f321}\ufe0f' };
}

function getOpsImpact(windSpeed: number, visKm: number, code: number): WeatherPoint['operationalImpact'] {
  if (code >= 95 || windSpeed > 60) return 'severe';
  if (windSpeed > 40 || code >= 80 || visKm < 2) return 'significant';
  if (windSpeed > 25 || code >= 50 || visKm < 5) return 'moderate';
  return 'minimal';
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    visibility: number;
  };
}

export async function fetchWeatherData(): Promise<WeatherPoint[]> {
  const cached = weatherCache.get();
  if (cached) return cached;

  try {
    const results = await Promise.allSettled(
      WEATHER_LOCATIONS.map(async (loc) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&forecast_days=1`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return null;
        const json = await r.json() as OpenMeteoResponse;
        const c = json.current;
        const visKm = (c.visibility || 10000) / 1000;
        const { description, icon } = getWeatherMeta(c.weather_code);
        return {
          name: loc.name, nameAr: loc.nameAr, country: loc.country, flag: loc.flag,
          temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature),
          humidity: c.relative_humidity_2m, windSpeed: Math.round(c.wind_speed_10m),
          windDir: c.wind_direction_10m, visibility: Math.round(visKm * 10) / 10,
          weatherCode: c.weather_code, description, icon,
          operationalImpact: getOpsImpact(c.wind_speed_10m, visKm, c.weather_code),
          updatedAt: new Date().toISOString(),
        } as WeatherPoint;
      })
    );
    const data = results
      .filter((r): r is PromiseFulfilledResult<WeatherPoint> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
    if (data.length > 0) {
      weatherCache.set(data);
      console.log(`[WEATHER] Fetched ${data.length}/${WEATHER_LOCATIONS.length} locations`);
    }
    return data;
  } catch (err) {
    console.log('[WEATHER] Error:', err instanceof Error ? err.message : err);
    return weatherCache.get() ?? [];
  }
}

export function clearCache(): void {
  weatherCache.clear();
}
