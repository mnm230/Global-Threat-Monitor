import { useState, useRef, memo } from 'react';
import { PanelLeft, X } from 'lucide-react';
import type { FloatState } from '@/lib/dashboard-types';

export const FloatingWindow = memo(function FloatingWindow({
  id, title, icon, children, state, onDock, onClose, onFocus, onDragStart, onDragEnd,
}: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
  state: FloatState; onDock: () => void; onClose: () => void; onFocus: () => void;
  onDragStart?: () => void; onDragEnd?: (x: number, y: number) => void;
}) {
  const [pos, setPos] = useState({ x: state.x, y: state.y });
  const [size, setSize] = useState({ w: state.w, h: state.h });
  const drag = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,[data-no-drag]')) return;
    drag.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    onFocus(); onDragStart?.(); e.preventDefault();
  };
  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPos({
      x: Math.max(0, drag.current.ox + e.clientX - drag.current.mx),
      y: Math.max(0, drag.current.oy + e.clientY - drag.current.my),
    });
  };
  const onTitleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    onDragEnd?.(e.clientX, e.clientY);
  };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resize.current = { mx: e.clientX, my: e.clientY, ow: size.w, oh: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation(); e.preventDefault();
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resize.current) return;
    setSize({
      w: Math.max(300, resize.current.ow + e.clientX - resize.current.mx),
      h: Math.max(220, resize.current.oh + e.clientY - resize.current.my),
    });
  };
  const onResizeUp = () => { resize.current = null; };

  return (
    <div
      onPointerDown={onFocus}
      data-testid={`float-window-${id}`}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        width: size.w, height: size.h, zIndex: state.z,
        display: 'flex', flexDirection: 'column',
        borderRadius: 14, overflow: 'hidden',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        pointerEvents: 'auto',
      }}
    >
      <div
        onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={onTitleUp}
        style={{
          height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
          background: 'hsl(var(--card))',
          borderBottom: '1px solid hsl(var(--border))',
          cursor: 'grab', flexShrink: 0, userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', color: 'hsl(var(--primary))' }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', flex: 1 }}>{title}</span>
        <button
          onClick={onDock} data-no-drag title="Dock back to grid"
          style={{ height: 26, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', flexShrink: 0, fontSize: 11, fontWeight: 600 }}
        >
          <PanelLeft style={{ width: 11, height: 11 }} />
          <span>Dock</span>
        </button>
        <button
          onClick={onClose} data-no-drag title="Close"
          style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.20)', color: 'hsl(0 72% 51%)', cursor: 'pointer', flexShrink: 0 }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
      <div
        onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={onResizeUp}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 18, height: 18,
          cursor: 'nwse-resize', zIndex: 2,
          background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
          borderRadius: '0 0 10px 0',
        }}
      />
    </div>
  );
});
