'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Toast, ToastContainer, type ToastProps } from '@/components/ui/Toast';

type ToastType = NonNullable<ToastProps['type']>;

interface ToastInput {
  title?: string;
  message: string;
  duration?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (type: ToastType, input: ToastInput | string) => void;
  success: (input: ToastInput | string) => void;
  error: (input: ToastInput | string) => void;
  warning: (input: ToastInput | string) => void;
  info: (input: ToastInput | string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function normalizeToastInput(input: ToastInput | string): ToastInput {
  return typeof input === 'string' ? { message: input } : input;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((type: ToastType, input: ToastInput | string) => {
    const normalized = normalizeToastInput(input);
    const id = `toast-${Date.now()}-${idRef.current++}`;

    setToasts((prev) => [
      ...prev,
      {
        id,
        type,
        ...normalized,
      },
    ]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (input) => show('success', input),
      error: (input) => show('error', input),
      warning: (input) => show('warning', input),
      info: (input) => show('info', input),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position="top-right">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={() => dismiss(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
