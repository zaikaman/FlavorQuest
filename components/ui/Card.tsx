/**
 * Card Component
 * 
 * Container component với shadow và border
 * 
 * Variants:
 * - default: Standard card with shadow
 * - outline: Card với border only
 * - elevated: Card với larger shadow
 * 
 * Padding:
 * - none: No padding
 * - sm: 12px
 * - md: 16px (default)
 * - lg: 24px
 */

'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const baseClasses = 'rounded-xl bg-white transition-all duration-200 dark:bg-gray-800';

  const variantClasses = {
    default: 'shadow-md',
    outline: 'border-2 border-gray-200 dark:border-gray-700',
    elevated: 'shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverClass = hover ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Header Component
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Title Component
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}

/**
 * Card Description Component
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`} {...props}>
      {children}
    </p>
  );
}

/**
 * Card Content Component
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`} {...props}>
      {children}
    </div>
  );
}
