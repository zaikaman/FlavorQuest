/**
 * Toast Component
 *
 * Notification toast messages
 *
 * Types:
 * - success: Green toast với checkmark
 * - error: Red toast với X
 * - warning: Yellow toast với exclamation
 * - info: Blue toast với info icon
 *
 * Positions:
 * - top-right (default)
 * - top-left
 * - top-center
 * - bottom-right
 * - bottom-left
 * - bottom-center
 *
 * Duration: Auto-dismiss sau N milliseconds (default: 5000ms)
 */

'use client';

import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ type = 'info', title, message, duration = 5000, onClose }: ToastProps) {
  const [isRendered, setIsRendered] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsRendered(false);
          onClose?.();
        }, 220);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isRendered) return null;

  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500',
      icon: 'text-green-500',
      title: 'text-green-900 dark:text-green-100',
      message: 'text-green-700 dark:text-green-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-500',
      icon: 'text-red-500',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-500',
      icon: 'text-yellow-500',
      title: 'text-yellow-900 dark:text-yellow-100',
      message: 'text-yellow-700 dark:text-yellow-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500',
      icon: 'text-blue-500',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-700 dark:text-blue-300',
    },
  };

  const style = typeStyles[type];

  const icons = {
    success: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`pointer-events-auto mb-3 flex items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-[0_18px_40px_-20px_rgba(12,10,9,0.65)] backdrop-blur-xl transition-all duration-200 ease-out ${style.bg} ${style.border} ${isLeaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
      role="alert"
    >
      <div className={`mt-0.5 flex-shrink-0 ${style.icon}`}>{icons[type]}</div>

      <div className="min-w-0 flex-1">
        {title && <h4 className={`font-semibold ${style.title}`}>{title}</h4>}
        <p className={`text-sm ${style.message}`}>{message}</p>
      </div>

      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(() => {
            setIsRendered(false);
            onClose?.();
          }, 220);
        }}
        className={`flex-shrink-0 rounded p-1 transition-colors ${style.icon} hover:bg-black/5 dark:hover:bg-white/5`}
        aria-label="Close"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * Toast Container Component
 */
export interface ToastContainerProps {
  position?:
    | 'top-right'
    | 'top-left'
    | 'top-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center';
  children?: React.ReactNode;
}

export function ToastContainer({ position = 'top-right', children }: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 sm:top-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6',
  };

  // If no children, render empty container for future toasts
  if (!children) {
    return (
      <div
        id="toast-container"
        className={`pointer-events-none fixed z-[120] w-[calc(100vw-2rem)] max-w-sm ${positionClasses[position]}`}
        aria-live="polite"
        aria-atomic="true"
      />
    );
  }

  return (
    <div
      className={`pointer-events-none fixed z-[120] w-[calc(100vw-2rem)] max-w-sm ${positionClasses[position]}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </div>
  );
}
