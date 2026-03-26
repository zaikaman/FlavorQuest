'use client';

import { useEffect, useRef, useState } from 'react';
import type { DeviceCapabilityAssessment } from '@/lib/types/index';
import {
  applyQuickBenchmarkAdjustment,
  assessDevicePerformance,
  runQuickDeviceBenchmark,
} from '@/lib/services/device-performance';

type NavigatorWithConnection = Navigator & {
  connection?: {
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  };
};

export function useDevicePerformance() {
  const [assessment, setAssessment] = useState<DeviceCapabilityAssessment | null>(null);
  const benchmarkRef = useRef<Awaited<ReturnType<typeof runQuickDeviceBenchmark>>>(null);

  useEffect(() => {
    let isCancelled = false;

    const updateAssessment = () => {
      const nextAssessment = assessDevicePerformance();

      if (benchmarkRef.current) {
        setAssessment(applyQuickBenchmarkAdjustment(nextAssessment, benchmarkRef.current));
        return;
      }

      setAssessment(nextAssessment);
    };

    updateAssessment();

    const runBenchmark = async () => {
      const result = await runQuickDeviceBenchmark();
      if (isCancelled || !result) {
        return;
      }

      benchmarkRef.current = result;
      updateAssessment();
    };

    void runBenchmark();

    const nav = navigator as NavigatorWithConnection;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = nav.connection;

    window.addEventListener('resize', updateAssessment);
    motionQuery.addEventListener?.('change', updateAssessment);
    connection?.addEventListener?.('change', updateAssessment);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', updateAssessment);
      motionQuery.removeEventListener?.('change', updateAssessment);
      connection?.removeEventListener?.('change', updateAssessment);
    };
  }, []);

  return assessment;
}
