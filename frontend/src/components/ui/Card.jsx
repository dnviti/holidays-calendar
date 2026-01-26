import React from 'react';
import clsx from 'clsx';

export const Card = ({ className, children, ...props }) => {
  return (
    <div className={clsx('card', className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }) => (
  <div className={clsx('mb-4', className)} {...props}>{children}</div>
);

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={clsx('text-xl font-bold', className)} {...props}>{children}</h3>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={className} {...props}>{children}</div>
);
