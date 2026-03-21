'use client';

import { useEffect, useState } from 'react';
import type { DeviceCapabilityAssessment } from '@/lib/types/index';
import { assessDevicePerformance } from '@/lib/services/device-performance';

type NavigatorWithConnection = Navigator & {
  connection?: {
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  };
};

export function useDevicePerformance() {
  const [assessment, setAssessment] = useState<DeviceCapabilityAssessment | null>(null);

  useEffect(() => {
    const updateAssessment = () => {
      setAssessment(assessDevicePerformance());
    };

    updateAssessment();

    const nav = navigator as NavigatorWithConnection;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = nav.connection;

    window.addEventListener('resize', updateAssessment);
    motionQuery.addEventListener?.('change', updateAssessment);
    connection?.addEventListener?.('change', updateAssessment);

    return () => {
      window.removeEventListener('resize', updateAssessment);
      motionQuery.removeEventListener?.('change', updateAssessment);
      connection?.removeEventListener?.('change', updateAssessment);
    };
  }, []);

  return assessment;
}
