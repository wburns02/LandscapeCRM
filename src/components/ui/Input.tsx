import { type InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-earth-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-3 py-2.5 bg-earth-900 border rounded-lg text-earth-100 placeholder-earth-500',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
            'min-h-[44px]',
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-earth-700 focus:border-green-500 focus:ring-green-500/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="text-sm text-earth-400">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
