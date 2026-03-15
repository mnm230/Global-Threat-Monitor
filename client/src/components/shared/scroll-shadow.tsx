import { useRef, useEffect, useState, type ReactNode } from 'react';

interface ScrollShadowProps {
  children: ReactNode;
  className?: string;
  fadeColor?: string;
  shadowSize?: number;
}

export function ScrollShadow({ children, className = '', fadeColor = 'hsl(var(--card))', shadowSize = 28 }: ScrollShadowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setShowTop(el.scrollTop > 4);
      setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); mo.disconnect(); };
  }, []);

  return (
    <div className={`relative flex flex-col min-h-0 overflow-hidden ${className}`}>
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none transition-opacity duration-200"
        style={{
          height: shadowSize,
          opacity: showTop ? 1 : 0,
          background: `linear-gradient(to bottom, ${fadeColor}, transparent)`,
        }}
      />
      <div ref={ref} className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {children}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none transition-opacity duration-200"
        style={{
          height: shadowSize,
          opacity: showBottom ? 1 : 0,
          background: `linear-gradient(to top, ${fadeColor}, transparent)`,
        }}
      />
    </div>
  );
}
