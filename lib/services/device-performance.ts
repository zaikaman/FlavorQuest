import type {
  DeviceCapabilityAssessment,
  DevicePerformancePreference,
  DevicePerformanceTier,
  DeviceResourceProfile,
  EffectiveDevicePerformance,
  UserSettings,
} from '@/lib/types/index';

type NetworkType = DeviceCapabilityAssessment['effectiveConnectionType'];

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
    autoPreloadAudio: false,
    nearbyPreloadRadius: 220,
  },
  balanced: {
    tier: 'balanced',
    mapDefaultZoom: 16,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 500,
  },
  full: {
    tier: 'full',
    mapDefaultZoom: 17,
    mapFlyAnimation: true,
    showAccuracyRing: true,
    showUserPulse: true,
    autoPreloadAudio: true,
    nearbyPreloadRadius: 900,
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
  };
}

function downgradeTier(tier: DevicePerformanceTier): DevicePerformanceTier {
  if (tier === 'full') {
    return 'balanced';
  }

  return 'light';
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
  const effectiveTier = batterySaverAdjusted ? downgradeTier(requestedTier) : requestedTier;

  return {
    source,
    detectedTier,
    effectiveTier,
    batterySaverAdjusted,
    profile: DEVICE_RESOURCE_PROFILES[effectiveTier],
  };
}
