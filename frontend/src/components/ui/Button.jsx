import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  startIcon,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={clsx('btn', `btn-${variant}`, className, {
        'opacity-50 cursor-not-allowed': disabled || isLoading,
        'px-2 py-1 text-xs': size === 'sm',
        'px-4 py-2 text-sm': size === 'md',
        'px-6 py-3 text-lg': size === 'lg',
      })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
      {startIcon && <span className="inline-flex mr-2">{startIcon}</span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
