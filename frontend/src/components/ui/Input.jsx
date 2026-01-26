import React from 'react';
import clsx from 'clsx';

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={clsx('input', className, {
          'border-danger': error,
        })}
        {...props}
      />
      {error && <span className="text-xs text-danger mt-1 block" style={{ color: 'var(--danger-color)' }}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
