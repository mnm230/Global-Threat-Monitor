import { useState, useEffect, useRef } from 'react';
import type { RedAlert, SirenAlert, FlightData, CommodityData, TelegramMessage } from '@shared/schema';
import type { Anomaly } from '@/lib/dashboard-types';

export function useAnomalyDetection(
  alerts: RedAlert[],
  sirens: SirenAlert[],
  flights: FlightData[],
  commodities: CommodityData[],
  telegramMessages: TelegramMessage[]
): Anomaly[] {
  const prevAlertCount = useRef(0);
  const prevCommodityPrices = useRef<Record<string, number>>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    const now = new Date().toISOString();
    const newAnomalies: Anomaly[] = [];

    if (prevAlertCount.current > 0 && alerts.length - prevAlertCount.current >= 5) {
      newAnomalies.push({
        id: `anom-alert-${Date.now()}`,
        type: 'alert_spike',
        severity: 'high',
        description: `Alert spike detected: ${alerts.length - prevAlertCount.current} new alerts in rapid succession`,
        timestamp: now,
      });
    }
    prevAlertCount.current = alerts.length;

    const regionSirens: Record<string, number> = {};
    sirens.forEach(s => {
      regionSirens[s.region] = (regionSirens[s.region] || 0) + 1;
    });
    Object.entries(regionSirens).forEach(([region, count]) => {
      if (count >= 3) {
        newAnomalies.push({
          id: `anom-siren-${region}-${Date.now()}`,
          type: 'siren_cluster',
          severity: 'high',
          description: `Siren cluster: ${count} active sirens in ${region}`,
          timestamp: now,
        });
      }
    });

    const milFlights = flights.filter(f => f.type === 'military' || f.type === 'surveillance');
    for (let i = 0; i < milFlights.length; i++) {
      let nearby = 0;
      for (let j = i + 1; j < milFlights.length; j++) {
        const dist = Math.sqrt(Math.pow(milFlights[i].lat - milFlights[j].lat, 2) + Math.pow(milFlights[i].lng - milFlights[j].lng, 2));
        if (dist < 1) nearby++;
      }
      if (nearby >= 3) {
        newAnomalies.push({
          id: `anom-flight-${milFlights[i].callsign}-${Date.now()}`,
          type: 'flight_convergence',
          severity: 'medium',
          description: `Military flight convergence: ${nearby + 1} aircraft within 1° of ${milFlights[i].callsign}`,
          timestamp: now,
        });
        break;
      }
    }

    commodities.forEach((c, i) => {
      if (Math.abs(c.changePercent) > 2) {
        newAnomalies.push({
          id: `anom-price-${c.symbol}-${Date.now()}-${i}`,
          type: 'price_spike',
          severity: 'medium',
          description: `${c.symbol} price spike: ${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(2)}%`,
          timestamp: now,
        });
      }
    });
    const newPrices: Record<string, number> = {};
    commodities.forEach(c => { newPrices[c.symbol] = c.price; });
    prevCommodityPrices.current = newPrices;

    if (newAnomalies.length > 0) {
      setAnomalies(prev => {
        const tenMinAgo = Date.now() - 600000;
        const filtered = prev.filter(a => new Date(a.timestamp).getTime() > tenMinAgo);
        return [...newAnomalies, ...filtered].slice(0, 20);
      });
    } else {
      setAnomalies(prev => {
        const tenMinAgo = Date.now() - 600000;
        const filtered = prev.filter(a => new Date(a.timestamp).getTime() > tenMinAgo);
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }
  }, [alerts, sirens, flights, commodities, telegramMessages]);

  return anomalies;
}
