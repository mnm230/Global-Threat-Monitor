import { useEffect, useRef } from 'react';
import { playAlertSound } from '@/lib/audio-alerts';

export function useAlertSound(alerts: { id: string; threatType?: string }[], enabled: boolean, silentMode: boolean, volume: number) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    if (!enabled || silentMode) return;

    const currentIds = new Set(alerts.map(a => a.id));

    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      prevIdsRef.current = currentIds;
      return;
    }

    const newAlerts = alerts.filter(a => !prevIdsRef.current.has(a.id));
    if (newAlerts.length > 0) {
      playAlertSound(newAlerts[0].threatType, volume);
    }
    prevIdsRef.current = currentIds;
  }, [alerts, enabled, silentMode, volume]);
}
