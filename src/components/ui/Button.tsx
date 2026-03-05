import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-earth-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        {
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg shadow-green-900/20': variant === 'primary',
          'bg-earth-800 text-earth-100 hover:bg-earth-700 focus:ring-earth-500 border border-earth-700': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
          'text-earth-300 hover:text-earth-100 hover:bg-earth-800/50 focus:ring-earth-500': variant === 'ghost',
          'bg-green-700 text-white hover:bg-green-800 focus:ring-green-500': variant === 'success',
        },
        {
          'px-3 py-1.5 text-sm min-h-[32px]': size === 'sm',
          'px-4 py-2.5 text-sm min-h-[40px]': size === 'md',
          'px-6 py-3 text-base min-h-[48px]': size === 'lg',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
