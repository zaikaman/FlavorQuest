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

export const DEVICE_RESOURCE_PROFILES: Record<DevicePerformanceTier, DeviceResourceProfile> = {
  light: {
    tier: 'light',
    mapDefaultZoom: 15,
    mapFlyAnimation: false,
    showAccuracyRing: false,
    showUserPulse: false,
    showPoiLabels: false,
    autoPreloadAudio: false,
    nearbyPreloadRadius: 220,
    backgroundPreload: 'none',
    audioWarmupCount: 0,
  },
  balanced: {
    tier: 'balanced',
    mapDefaultZoom: 16,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    showPoiLabels: true,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 500,
    backgroundPreload: 'nearby',
    audioWarmupCount: 2,
  },
  full: {
    tier: 'full',
    mapDefaultZoom: 17,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    showPoiLabels: true,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 900,
    backgroundPreload: 'all',
    audioWarmupCount: 5,
  },
};

function normalizeNetworkType(value: string | undefined): NetworkType {
  if (value === 'slow-2g' || value === '2g' || value === '3g' || value === '4g') {
    return value;
  }

  return 'unknown';
}

function scoreTier(score: number): DevicePerformanceTier {
  if (score <= 1) {
    return 'light';
  }

  if (score >= 5) {
    return 'full';
  }

  return 'balanced';
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

  let score = 0;

  if (hardwareConcurrency !== null) {
    if (hardwareConcurrency >= 8) {
      score += 3;
    } else if (hardwareConcurrency >= 4) {
      score += 2;
    } else if (hardwareConcurrency >= 2) {
      score += 1;
    } else {
      score -= 1;
    }
  }

  if (deviceMemory !== null) {
    if (deviceMemory >= 8) {
      score += 3;
    } else if (deviceMemory >= 4) {
      score += 2;
    } else if (deviceMemory >= 2) {
      score += 1;
    } else {
      score -= 1;
    }
  }

  if (connectionType === '4g') {
    score += 2;
  } else if (connectionType === '3g') {
    score -= 1;
  } else if (connectionType === '2g') {
    score -= 2;
  } else if (connectionType === 'slow-2g') {
    score -= 3;
  }

  if (saveDataEnabled) {
    score -= 2;
  }

  if (prefersReducedMotion) {
    score -= 1;
  }

  if (viewportWidth < 640 && isTouchDevice) {
    score -= 1;
  }

  if (pixelRatio > 2.5 && viewportWidth < 768) {
    score -= 1;
  }

  return {
    tier: scoreTier(score),
    score,
    hardwareConcurrency,
    deviceMemory,
    effectiveConnectionType: connectionType,
    saveDataEnabled,
    prefersReducedMotion,
    isTouchDevice,
    viewportWidth,
    pixelRatio,
    benchmarkDurationMs: null,
    benchmarkAdjusted: false,
  };
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

  // Keep CPU probe intentionally short (about 12-20ms on most phones).
  const cpuStart = performance.now();
  let checksum = 0;
  let index = 0;

  while (index < 50000 && performance.now() - cpuStart < 20) {
    checksum += Math.sqrt((index % 97) + 1) * Math.sin(index);
    index += 1;
  }

  const cpuDurationMs = performance.now() - cpuStart;

  if (!Number.isFinite(checksum)) {
    return null;
  }

  let scoreDelta: -1 | 0 | 1 = 0;

  if (cpuDurationMs <= 10 && frameLatencyMs <= 22) {
    scoreDelta = 1;
  } else if (cpuDurationMs >= 22 || frameLatencyMs >= 42) {
    scoreDelta = -1;
  }

  return {
    scoreDelta,
    durationMs: Math.round(performance.now() - start),
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
