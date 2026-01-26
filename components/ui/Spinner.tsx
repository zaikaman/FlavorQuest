/**
 * Spinner Component
 * 
 * Loading spinner indicator
 * 
 * Sizes:
 * - xs: 16px
 * - sm: 20px
 * - md: 24px (default)
 * - lg: 32px
 * - xl: 40px
 * 
 * Colors:
 * - primary: Red (default)
 * - secondary: Gray
 * - white: White (for dark backgrounds)
 */

'use client';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-5 h-5 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-10 h-10 border-3',
  };

  const colorClasses = {
    primary: 'border-red-500 border-t-transparent',
    secondary: 'border-gray-400 border-t-transparent dark:border-gray-600',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Full Page Spinner Component
 */
export interface FullPageSpinnerProps {
  message?: string;
}

export function FullPageSpinner({ message }: FullPageSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <Spinner size="xl" />
      {message && (
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">{message}</p>
      )}
    </div>
  );
}

/**
 * Inline Spinner với text
 */
export interface SpinnerWithTextProps {
  text: string;
  size?: SpinnerProps['size'];
  color?: SpinnerProps['color'];
}

export function SpinnerWithText({ text, size = 'sm', color = 'primary' }: SpinnerWithTextProps) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size={size} color={color} />
      <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
    </div>
  );
}
