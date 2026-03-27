import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyQuickBenchmarkAdjustment,
  assessDevicePerformanceFromSignals,
  deriveQuickBenchmarkScoreDelta,
} from '../../lib/services/device-performance.ts';

test('iPhone 14 Plus style signals no longer fall into light tier', () => {
  const assessment = assessDevicePerformanceFromSignals({
    hardwareConcurrency: 6,
    deviceMemory: null,
    effectiveConnectionType: 'unknown',
    saveDataEnabled: false,
    prefersReducedMotion: false,
    isTouchDevice: true,
    viewportWidth: 428,
    pixelRatio: 3,
  });

  assert.equal(assessment.tier, 'balanced');
  assert.ok(assessment.score >= 4);
});

test('strong desktop stays in full tier', () => {
  const assessment = assessDevicePerformanceFromSignals({
    hardwareConcurrency: 8,
    deviceMemory: 16,
    effectiveConnectionType: '4g',
    saveDataEnabled: false,
    prefersReducedMotion: false,
    isTouchDevice: false,
    viewportWidth: 1440,
    pixelRatio: 2,
  });

  assert.equal(assessment.tier, 'full');
});

test('constrained mobile devices still resolve to light', () => {
  const assessment = assessDevicePerformanceFromSignals({
    hardwareConcurrency: 2,
    deviceMemory: null,
    effectiveConnectionType: 'unknown',
    saveDataEnabled: false,
    prefersReducedMotion: false,
    isTouchDevice: true,
    viewportWidth: 360,
    pixelRatio: 3,
  });

  assert.equal(assessment.tier, 'light');
});

test('quick benchmark rewards clearly fast devices', () => {
  assert.equal(
    deriveQuickBenchmarkScoreDelta({
      iterations: 60000,
      cpuDurationMs: 14,
      frameLatencyMs: 18,
    }),
    1
  );
});

test('quick benchmark penalizes clearly slow or janky devices', () => {
  assert.equal(
    deriveQuickBenchmarkScoreDelta({
      iterations: 18000,
      cpuDurationMs: 22,
      frameLatencyMs: 52,
    }),
    -1
  );
});

test('fast benchmark can lift a strong mobile from balanced to full', () => {
  const baseAssessment = assessDevicePerformanceFromSignals({
    hardwareConcurrency: 6,
    deviceMemory: null,
    effectiveConnectionType: 'unknown',
    saveDataEnabled: false,
    prefersReducedMotion: false,
    isTouchDevice: true,
    viewportWidth: 428,
    pixelRatio: 3,
  });

  const adjusted = applyQuickBenchmarkAdjustment(baseAssessment, {
    scoreDelta: 1,
    durationMs: 32,
    iterations: 60000,
    frameLatencyMs: 18,
    cpuDurationMs: 14,
  });

  assert.equal(adjusted.tier, 'full');
});
