import { useEffect, useState, type ReactNode } from 'react';

interface AnimatedPanelProps {
  children: ReactNode;
  /** Key changes trigger a re-mount animation */
  animKey?: string | number;
  className?: string;
}

export function AnimatedPanel({ children, animKey, className = '' }: AnimatedPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small rAF delay so the browser registers the initial invisible state before transitioning in
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 180ms ease, transform 180ms ease',
      }}
    >
      {children}
    </div>
  );
}
