import { useEffect, useState, type ReactNode } from 'react';

interface AnimatedPanelProps {
  children: ReactNode;
  animKey?: string | number;
  className?: string;
}

export function AnimatedPanel({ children, animKey, className = '' }: AnimatedPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [animKey]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {children}
    </div>
  );
}
