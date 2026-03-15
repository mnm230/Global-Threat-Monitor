import { useState, useRef, useCallback } from 'react';
import type { PanelId, FloatState } from '@/lib/dashboard-types';

export function useFloatingPanels(closePanel: (id: PanelId) => void) {
  const [floatingPanels, setFloatingPanels] = useState<Partial<Record<PanelId, FloatState>>>({});
  const floatTopZ = useRef(600);
  const [draggingFloatId, setDraggingFloatId] = useState<PanelId | null>(null);
  const dockZoneRef = useRef<HTMLDivElement | null>(null);

  const popOutPanel = useCallback((id: PanelId) => {
    floatTopZ.current += 1;
    setFloatingPanels(prev => {
      if (prev[id]) {
        return { ...prev, [id]: { ...prev[id]!, z: floatTopZ.current } };
      }
      const count = Object.keys(prev).length;
      const w = Math.min(window.innerWidth * 0.38, 540);
      const h = Math.min(window.innerHeight * 0.58, 560);
      return {
        ...prev,
        [id]: {
          x: Math.max(40, (window.innerWidth - w) / 2 + count * 28),
          y: Math.max(60, (window.innerHeight - h) / 2 + count * 28),
          w, h, z: floatTopZ.current,
        },
      };
    });
  }, []);

  const dockPanel = useCallback((id: PanelId) => {
    setFloatingPanels(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const closeFloatPanel = useCallback((id: PanelId) => {
    setFloatingPanels(prev => { const n = { ...prev }; delete n[id]; return n; });
    closePanel(id);
  }, [closePanel]);

  const focusFloatPanel = useCallback((id: PanelId) => {
    floatTopZ.current += 1;
    setFloatingPanels(prev =>
      prev[id] ? { ...prev, [id]: { ...prev[id]!, z: floatTopZ.current } } : prev
    );
  }, []);

  return {
    floatingPanels,
    draggingFloatId,
    setDraggingFloatId,
    dockZoneRef,
    popOutPanel,
    dockPanel,
    closeFloatPanel,
    focusFloatPanel,
  };
}
