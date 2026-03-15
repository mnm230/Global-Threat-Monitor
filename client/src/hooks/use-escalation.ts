import { useState, useEffect, useRef } from 'react';
import type { RedAlert } from '@shared/schema';
import type { EscalationState } from '@/lib/dashboard-types';
import { audioCtxRef } from '@/lib/audio-alerts';
import { sendNotification } from '@/lib/dashboard-utils';

export function useEscalation(
  alerts: RedAlert[],
  soundEnabled: boolean,
  notificationsEnabled: boolean,
): EscalationState {
  const WINDOW_MS = 60_000;
  const seenIds = useRef<Set<string>>(new Set());
  const tsLog = useRef<number[]>([]);
  const prevLevel = useRef<EscalationState['level']>(null);
  const [state, setState] = useState<EscalationState>({ level: null, count: 0, rate: 0 });

  useEffect(() => {
    const now = Date.now();

    alerts.forEach(a => {
      if (seenIds.current.has(a.id)) return;
      seenIds.current.add(a.id);
      const t = new Date(a.timestamp).getTime();
      if (t > now - WINDOW_MS) tsLog.current.push(t);
    });

    tsLog.current = tsLog.current.filter(t => t > now - WINDOW_MS);
    const count = tsLog.current.length;
    const rate = Math.round(count);

    let level: EscalationState['level'] = null;
    if (count >= 15)     level = 'CRITICAL';
    else if (count >= 8) level = 'WARNING';
    else if (count >= 3) level = 'WATCH';

    const LEVELS = [null, 'WATCH', 'WARNING', 'CRITICAL'] as const;
    const prevL = prevLevel.current;
    const isEscalating = LEVELS.indexOf(level) > LEVELS.indexOf(prevL);

    if (isEscalating && level) {
      if (soundEnabled) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          const t = ctx.currentTime;
          const beeps = level === 'CRITICAL' ? 5 : level === 'WARNING' ? 3 : 2;
          const freq = level === 'CRITICAL' ? 1100 : level === 'WARNING' ? 880 : 660;
          for (let i = 0; i < beeps; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.06, t + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.14);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.15);
          }
        } catch {}
      }
      if (notificationsEnabled) {
        const emoji = level === 'CRITICAL' ? '🔴' : level === 'WARNING' ? '🟠' : '🟡';
        sendNotification(
          `${emoji} ESCALATION — ${level}`,
          `${count} alerts in the last 60 seconds`,
          `escalation-${level}`,
          level === 'CRITICAL',
        );
      }
    }

    prevLevel.current = level;
    setState({ level, count, rate });
  }, [alerts, soundEnabled, notificationsEnabled]);

  return state;
}
