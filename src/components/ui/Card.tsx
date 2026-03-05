import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, header, footer, padding = true, hover, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-earth-900/60 border border-earth-800 rounded-xl backdrop-blur-sm',
        hover && 'hover:border-earth-600 hover:bg-earth-900/80 transition-all duration-200 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {header && (
        <div className="px-5 py-4 border-b border-earth-800">
          {header}
        </div>
      )}
      {padding ? <div className="p-5">{children}</div> : children}
      {footer && (
        <div className="px-5 py-3 border-t border-earth-800 bg-earth-900/40 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
