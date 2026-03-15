import { useState, useEffect, useRef } from 'react';

export function ResizeHandle({ onResize, direction = 'col' }: { onResize: (delta: number) => void; direction?: 'col' | 'row' }) {
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onResize(direction === 'col' ? e.movementX : e.movementY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (lastTouchRef.current) {
        const delta = direction === 'col'
          ? touch.clientX - lastTouchRef.current.x
          : touch.clientY - lastTouchRef.current.y;
        onResize(delta);
      }
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const handleEnd = () => {
      setIsDragging(false);
      lastTouchRef.current = null;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    document.body.style.cursor = direction === 'col' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onResize, direction]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
  };

  return (
    <div
      className={`${direction === 'col' ? 'w-[3px] cursor-col-resize' : 'h-[3px] cursor-row-resize'} shrink-0 transition-all duration-200 relative group touch-none ${isDragging ? 'bg-primary/60' : 'bg-transparent hover:bg-primary/20'}`}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={handleTouchStart}
      data-testid="resize-handle"
      style={{ background: isDragging ? undefined : 'linear-gradient(to ' + (direction === 'col' ? 'right' : 'bottom') + ', transparent, hsl(32 40% 10%), transparent)' }}
    >
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-20 -ml-[9px]' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-20 -mt-[9px]'} rounded transition-colors ${isDragging ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/5'}`} />
      <div className={`absolute ${direction === 'col' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-10' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-10'} rounded-full transition-all duration-200 ${isDragging ? 'bg-primary shadow-[0_0_8px_hsl(32_92%_50%/0.5)]' : 'bg-transparent group-hover:bg-primary/50'}`} />
      {isDragging && <div className="resize-ghost" />}
    </div>
  );
}
