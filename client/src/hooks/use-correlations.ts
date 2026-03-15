import { useMemo } from 'react';
import type { ConflictEvent, RedAlert, SirenAlert, FlightData } from '@shared/schema';
import type { Correlation } from '@/lib/dashboard-types';

export function useCorrelations(events: ConflictEvent[], alerts: RedAlert[], sirens: SirenAlert[], flights: FlightData[]): Correlation[] {
  return useMemo(() => {
    const correlations: Correlation[] = [];
    let cId = 0;

    events.forEach(evt => {
      if (evt.type === 'missile' || evt.type === 'airstrike') {
        const relatedAlerts = alerts.filter(a => {
          const dist = Math.sqrt(Math.pow(a.lat - evt.lat, 2) + Math.pow(a.lng - evt.lng, 2));
          return dist < 2;
        });
        const relatedSirens = sirens.filter(s => {
          const timeDiff = Math.abs(new Date(s.timestamp).getTime() - new Date(evt.timestamp).getTime());
          return timeDiff < 300000;
        });
        if (relatedAlerts.length > 0 || relatedSirens.length > 0) {
          const items: Correlation['items'] = [{ type: 'event', id: evt.id, label: evt.title }];
          relatedAlerts.forEach(a => items.push({ type: 'alert', id: a.id, label: a.city }));
          relatedSirens.forEach(s => items.push({ type: 'siren', id: s.id, label: s.location }));
          correlations.push({ id: `corr-${cId++}`, items, reason: 'Spatial and temporal proximity' });
        }
      }

      if (evt.type === 'defense') {
        const nearbyFlights = flights.filter(f => {
          if (f.type !== 'military') return false;
          const dist = Math.sqrt(Math.pow(f.lat - evt.lat, 2) + Math.pow(f.lng - evt.lng, 2));
          return dist < 3;
        });
        if (nearbyFlights.length > 0) {
          const items: Correlation['items'] = [{ type: 'event', id: evt.id, label: evt.title }];
          nearbyFlights.forEach(f => items.push({ type: 'flight', id: f.id, label: f.callsign }));
          correlations.push({ id: `corr-${cId++}`, items, reason: 'Military response pattern' });
        }
      }
    });

    return correlations;
  }, [events, alerts, sirens, flights]);
}
