import type {
  DeviceCapabilityAssessment,
  DevicePerformancePreference,
  DevicePerformanceTier,
  DeviceResourceProfile,
  EffectiveDevicePerformance,
  UserSettings,
} from '@/lib/types/index';

type NetworkType = DeviceCapabilityAssessment['effectiveConnectionType'];

interface QuickBenchmarkResult {
  scoreDelta: -1 | 0 | 1;
  durationMs: number;
  iterations: number;
  frameLatencyMs: number;
  cpuDurationMs: number;
}

type NavigatorWithDeviceInfo = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  };
  deviceMemory?: number;
  msMaxTouchPoints?: number;
};

export interface DevicePerformanceSignals {
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  effectiveConnectionType: NetworkType;
  saveDataEnabled: boolean;
  prefersReducedMotion: boolean;
  isTouchDevice: boolean;
  viewportWidth: number;
  pixelRatio: number;
}

export const DEVICE_RESOURCE_PROFILES: Record<DevicePerformanceTier, DeviceResourceProfile> = {
  light: {
    tier: 'light',
    mapDefaultZoom: 14,
    mapFlyAnimation: false,
    showAccuracyRing: false,
    showUserPulse: false,
    showPoiLabels: false,
    showPoiLabelsOnMobile: false,
    showNearbyPoiHalos: false,
    focusSelectedPoi: false,
    autoPreloadAudio: false,
    nearbyPreloadRadius: 220,
    backgroundPreload: 'none',
    audioWarmupCount: 0,
    detailCardVariant: 'compact',
  },
  balanced: {
    tier: 'balanced',
    mapDefaultZoom: 16,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    showPoiLabels: true,
    showPoiLabelsOnMobile: false,
    showNearbyPoiHalos: false,
    focusSelectedPoi: false,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 500,
    backgroundPreload: 'nearby',
    audioWarmupCount: 2,
    detailCardVariant: 'compact',
  },
  full: {
    tier: 'full',
    mapDefaultZoom: 18,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    showPoiLabels: true,
    showPoiLabelsOnMobile: true,
    showNearbyPoiHalos: true,
    focusSelectedPoi: true,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 900,
    backgroundPreload: 'all',
    audioWarmupCount: 5,
    detailCardVariant: 'rich',
  },
};

function normalizeNetworkType(value: string | undefined): NetworkType {
  if (value === 'slow-2g' || value === '2g' || value === '3g' || value === '4g') {
    return value;
  }

  return 'unknown';
}

function scoreTier(score: number): DevicePerformanceTier {
  if (score <= 0) {
    return 'light';
  }

  if (score >= 5) {
    return 'full';
  }

  return 'balanced';
}

function inferDeviceMemory(deviceMemory: number | null, hardwareConcurrency: number | null): number | null {
  if (deviceMemory !== null) {
    return deviceMemory;
  }

  if (hardwareConcurrency === null) {
    return null;
  }

  if (hardwareConcurrency >= 8) {
    return 8;
  }

  if (hardwareConcurrency >= 6) {
    return 6;
  }

  if (hardwareConcurrency >= 4) {
    return 4;
  }

  if (hardwareConcurrency >= 2) {
    return 2;
  }

  return 1;
}

function scoreHardwareConcurrency(hardwareConcurrency: number | null): number {
  if (hardwareConcurrency === null) {
    return 0;
  }

  if (hardwareConcurrency >= 8) {
    return 3;
  }

  if (hardwareConcurrency >= 6) {
    return 2;
  }

  if (hardwareConcurrency >= 4) {
    return 1;
  }

  if (hardwareConcurrency >= 2) {
    return 0;
  }

  return -1;
}

function scoreDeviceMemory(deviceMemory: number | null): number {
  if (deviceMemory === null) {
    return 0;
  }

  if (deviceMemory >= 8) {
    return 3;
  }

  if (deviceMemory >= 6) {
    return 2;
  }

  if (deviceMemory >= 4) {
    return 1;
  }

  if (deviceMemory >= 2) {
    return 0;
  }

  return -1;
}

export function assessDevicePerformanceFromSignals(
  signals: DevicePerformanceSignals
): DeviceCapabilityAssessment {
  const inferredMemory = inferDeviceMemory(signals.deviceMemory, signals.hardwareConcurrency);
  let score = 0;

  score += scoreHardwareConcurrency(signals.hardwareConcurrency);
  score += scoreDeviceMemory(inferredMemory);

  if (signals.effectiveConnectionType === '4g') {
    score += 1;
  } else if (signals.effectiveConnectionType === '2g') {
    score -= 2;
  } else if (signals.effectiveConnectionType === 'slow-2g') {
    score -= 3;
  }

  if (signals.saveDataEnabled) {
    score -= 2;
  }

  if (signals.prefersReducedMotion) {
    score -= 1;
  }

  // High-density mobile screens are common on powerful phones, so do not
  // down-rank them by default. Only penalize truly constrained touch devices.
  if (
    signals.isTouchDevice &&
    signals.hardwareConcurrency !== null &&
    signals.hardwareConcurrency <= 2 &&
    signals.pixelRatio > 2.5 &&
    signals.viewportWidth < 768
  ) {
    score -= 1;
  }

  // Missing browser hints should not automatically push otherwise modern devices
  // into the lowest tier.
  if (signals.hardwareConcurrency === null && signals.deviceMemory === null) {
    score += 1;
  }

  return {
    tier: scoreTier(score),
    score,
    hardwareConcurrency: signals.hardwareConcurrency,
    deviceMemory: signals.deviceMemory,
    effectiveConnectionType: signals.effectiveConnectionType,
    saveDataEnabled: signals.saveDataEnabled,
    prefersReducedMotion: signals.prefersReducedMotion,
    isTouchDevice: signals.isTouchDevice,
    viewportWidth: signals.viewportWidth,
    pixelRatio: signals.pixelRatio,
    benchmarkDurationMs: null,
    benchmarkAdjusted: false,
  };
}

export function assessDevicePerformance(): DeviceCapabilityAssessment {
  if (typeof window === 'undefined') {
    return {
      tier: 'balanced',
      score: 0,
      hardwareConcurrency: null,
      deviceMemory: null,
      effectiveConnectionType: 'unknown',
      saveDataEnabled: false,
      prefersReducedMotion: false,
      isTouchDevice: false,
      viewportWidth: 1280,
      pixelRatio: 1,
      benchmarkDurationMs: null,
      benchmarkAdjusted: false,
    };
  }

  const nav = navigator as NavigatorWithDeviceInfo;
  const connectionType = normalizeNetworkType(nav.connection?.effectiveType);
  const hardwareConcurrency =
    typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const saveDataEnabled = Boolean(nav.connection?.saveData);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const viewportWidth = window.innerWidth;
  const pixelRatio = window.devicePixelRatio || 1;
  const isTouchDevice = navigator.maxTouchPoints > 0 || Boolean(nav.msMaxTouchPoints);

  return assessDevicePerformanceFromSignals({
    hardwareConcurrency,
    deviceMemory,
    effectiveConnectionType: connectionType,
    saveDataEnabled,
    prefersReducedMotion,
    isTouchDevice,
    viewportWidth,
    pixelRatio,
  });
}

export function deriveQuickBenchmarkScoreDelta(metrics: {
  iterations: number;
  cpuDurationMs: number;
  frameLatencyMs: number;
}): -1 | 0 | 1 {
  const completedAllIterations = metrics.iterations >= 60000;

  if (completedAllIterations && metrics.cpuDurationMs <= 16 && metrics.frameLatencyMs <= 24) {
    return 1;
  }

  if (metrics.frameLatencyMs >= 48) {
    return -1;
  }

  if (!completedAllIterations && metrics.iterations < 28000 && metrics.cpuDurationMs >= 18) {
    return -1;
  }

  return 0;
}

export async function runQuickDeviceBenchmark(): Promise<QuickBenchmarkResult | null> {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return null;
  }

  const start = performance.now();

  // Wait one frame to capture current rendering latency.
  const frameStart = performance.now();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  const frameLatencyMs = performance.now() - frameStart;

  const maxIterations = 60000;
  const maxRuntimeMs = 24;

  // Keep CPU probe intentionally short while still allowing fast devices to
  // differentiate themselves by completed iterations.
  const cpuStart = performance.now();
  let checksum = 0;
  let index = 0;

  while (index < maxIterations && performance.now() - cpuStart < maxRuntimeMs) {
    checksum += Math.sqrt((index % 97) + 1) * Math.sin(index);
    index += 1;
  }

  const cpuDurationMs = performance.now() - cpuStart;

  if (!Number.isFinite(checksum)) {
    return null;
  }

  const scoreDelta = deriveQuickBenchmarkScoreDelta({
    iterations: index,
    cpuDurationMs,
    frameLatencyMs,
  });

  return {
    scoreDelta,
    durationMs: Math.round(performance.now() - start),
    iterations: index,
    frameLatencyMs,
    cpuDurationMs: Math.round(cpuDurationMs * 100) / 100,
  };
}

export function applyQuickBenchmarkAdjustment(
  assessment: DeviceCapabilityAssessment,
  benchmark: QuickBenchmarkResult
): DeviceCapabilityAssessment {
  const adjustedScore = assessment.score + benchmark.scoreDelta;

  return {
    ...assessment,
    score: adjustedScore,
    tier: scoreTier(adjustedScore),
    benchmarkDurationMs: benchmark.durationMs,
    benchmarkAdjusted: benchmark.scoreDelta !== 0,
  };
}

function downgradeTier(tier: DevicePerformanceTier): DevicePerformanceTier {
  if (tier === 'full') {
    return 'balanced';
  }

  return 'light';
}

function tierRank(tier: DevicePerformanceTier): number {
  if (tier === 'light') {
    return 0;
  }

  if (tier === 'balanced') {
    return 1;
  }

  return 2;
}

function lowerTier(tierA: DevicePerformanceTier, tierB: DevicePerformanceTier): DevicePerformanceTier {
  return tierRank(tierA) <= tierRank(tierB) ? tierA : tierB;
}

function getSafetyCapTier(assessment: DeviceCapabilityAssessment | null | undefined): DevicePerformanceTier {
  if (!assessment) {
    return 'full';
  }

  const hasConstrainedNetwork =
    assessment.saveDataEnabled ||
    assessment.effectiveConnectionType === 'slow-2g' ||
    assessment.effectiveConnectionType === '2g';

  if (hasConstrainedNetwork) {
    return 'light';
  }

  // Weak devices should not be forced into full profile.
  if (assessment.score <= 2 || assessment.tier === 'light') {
    return 'balanced';
  }

  return 'full';
}

function toTier(preference: Exclude<DevicePerformancePreference, 'system'>): DevicePerformanceTier {
  return preference;
}

export function resolveDevicePerformance(
  settings: Pick<UserSettings, 'performancePreference' | 'batterySaverMode'> | null | undefined,
  assessment: DeviceCapabilityAssessment | null | undefined
): EffectiveDevicePerformance {
  const detectedTier = assessment?.tier ?? 'balanced';
  const source = settings?.performancePreference ?? 'system';
  const requestedTier = source === 'system' ? detectedTier : toTier(source);
  const batterySaverAdjusted = Boolean(settings?.batterySaverMode && requestedTier !== 'light');
  const batteryTier = batterySaverAdjusted ? downgradeTier(requestedTier) : requestedTier;

  const safetyCapTier = source === 'system' ? 'full' : getSafetyCapTier(assessment);
  const effectiveTier = lowerTier(batteryTier, safetyCapTier);
  const safetyAdjusted = source !== 'system' && effectiveTier !== batteryTier;

  return {
    source,
    detectedTier,
    effectiveTier,
    batterySaverAdjusted,
    safetyAdjusted,
    safetyCapTier,
    profile: DEVICE_RESOURCE_PROFILES[effectiveTier],
  };
}
