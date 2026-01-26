import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = React.forwardRef(({ className, label, error, options = [], placeholder, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={clsx('input appearance-none pr-10', className, {
            'border-danger': error,
            'text-text-secondary': !props.value && placeholder
          })}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-secondary">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <span className="text-xs text-danger mt-1 block" style={{ color: 'var(--danger-color)' }}>{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
