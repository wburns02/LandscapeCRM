import { type SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-earth-200">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full px-3 py-2.5 bg-earth-900 border rounded-lg text-earth-100',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
            'min-h-[44px] appearance-none cursor-pointer',
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-earth-700 focus:border-green-500 focus:ring-green-500/30',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-earth-500">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
