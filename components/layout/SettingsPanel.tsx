/**
 * SettingsPanel Component
 * T094, T096-T098 - Panel cài đặt đầy đủ
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { useDevicePerformance } from '@/lib/hooks/useDevicePerformance';
import { resolveDevicePerformance } from '@/lib/services/device-performance';
import { loadSettings, saveSettings } from '@/lib/services/storage';
import { FeedSkeleton, InlineSpinner, Skeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import type {
  DevicePerformancePreference,
  DevicePerformanceTier,
  Language,
  UserSettings,
} from '@/lib/types/index';
import { DEFAULT_USER_SETTINGS } from '@/lib/types/index';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: UserSettings) => void;
}

const LANGUAGE_FLAGS: Record<Language, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
  ja: '🇯🇵',
  fr: '🇫🇷',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

const PERFORMANCE_OPTIONS: DevicePerformancePreference[] = ['system', 'light', 'balanced', 'full'];

export function SettingsPanel({ isOpen, onClose, onSettingsChange }: SettingsPanelProps) {
  const router = useRouter();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { user, signOut } = useAuth();
  const { t } = useTranslations();
  const toast = useToast();
  const deviceAssessment = useDevicePerformance();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const effectivePerformance = useMemo(
    () => resolveDevicePerformance(settings, deviceAssessment),
    [deviceAssessment, settings]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
      await saveSettings(newSettings);
    },
    [onSettingsChange, settings]
  );

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    await updateSetting('language', lang);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;

    const shouldSignOut = window.confirm(
      t('settings.signOutConfirm', undefined, 'Bạn có chắc chắn muốn đăng xuất?')
    );

    if (!shouldSignOut) return;

    setIsSigningOut(true);

    try {
      await signOut();
      onClose();
      router.replace('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error(
        t('settings.signOutFailed', undefined, 'Đăng xuất thất bại. Vui lòng thử lại.')
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const getPerformanceLabel = (value: DevicePerformancePreference | DevicePerformanceTier) => {
    switch (value) {
      case 'system':
        return t('settings.deviceProfileSystem', undefined, 'Tự động');
      case 'light':
        return t('settings.deviceProfileLight', undefined, 'Nhẹ');
      case 'balanced':
        return t('settings.deviceProfileBalanced', undefined, 'Cân bằng');
      case 'full':
        return t('settings.deviceProfileFull', undefined, 'Đầy đủ');
      default:
        return t('settings.deviceProfileBalanced', undefined, 'Cân bằng');
    }
  };

  const getPerformanceDescription = (value: DevicePerformancePreference) => {
    switch (value) {
      case 'system':
        return t(
          'settings.deviceProfileAutoDescription',
          undefined,
          'Ứng dụng tự cân bằng chuyển động, bản đồ và tải nền theo máy của bạn.'
        );
      case 'light':
        return t(
          'settings.deviceProfileLightDescription',
          undefined,
          'Giảm hiệu ứng và hạn chế tải nền để ưu tiên pin cùng độ ổn định.'
        );
      case 'balanced':
        return t(
          'settings.deviceProfileBalancedDescription',
          undefined,
          'Giữ trải nghiệm mượt cho phần lớn thiết bị mà không tải quá nặng.'
        );
      case 'full':
        return t(
          'settings.deviceProfileFullDescription',
          undefined,
          'Ưu tiên chuyển động mượt và tải trước rộng hơn khi thiết bị dư sức.'
        );
      default:
        return '';
    }
  };

  const deviceFacts = [
    `CPU ${deviceAssessment?.hardwareConcurrency ?? '—'}`,
    deviceAssessment?.deviceMemory
      ? `RAM ${deviceAssessment.deviceMemory} GB`
      : `RAM ${t('settings.deviceProfileUnknown', undefined, 'Chưa rõ')}`,
    deviceAssessment?.effectiveConnectionType && deviceAssessment.effectiveConnectionType !== 'unknown'
      ? deviceAssessment.effectiveConnectionType.toUpperCase()
      : t('settings.deviceProfileUnknown', undefined, 'Chưa rõ'),
    deviceAssessment?.prefersReducedMotion
      ? t('settings.deviceProfileMotionReduced', undefined, 'Giảm chuyển động')
      : t('settings.deviceProfileMotionStandard', undefined, 'Chuyển động chuẩn'),
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-0 flex flex-col overflow-hidden bg-background-dark animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 shrink-0 border-b border-white/5 bg-background-dark px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-12">
          {isLoading ? (
            <div className="space-y-6 py-2">
              <div>
                <Skeleton className="h-6 w-28" />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                </div>
              </div>
              <div className="h-px bg-white/10" />
              <FeedSkeleton items={4} />
            </div>
          ) : (
            <>
              <section className="mb-6">
                <h3 className="mb-3 text-lg font-bold text-white">{t('settings.language')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                        language === lang.code
                          ? 'border-primary bg-primary text-white'
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{LANGUAGE_FLAGS[lang.code]}</span>
                      <span className="text-sm font-medium">{lang.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="my-4 h-px bg-white/10" />

              <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(242,108,13,0.18),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {t('settings.deviceProfileTitle', undefined, 'Hồ sơ thiết bị')}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-white/70">
                      {t(
                        'settings.deviceProfileDescription',
                        undefined,
                        'FlavorQuest tự điều chỉnh chuyển động, bản đồ và tải nền để hợp với máy bạn đang dùng.'
                      )}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {getPerformanceLabel(effectivePerformance.effectiveTier)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                      {t('settings.deviceProfileDetectedLabel', undefined, 'Hệ thống nhận diện')}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {getPerformanceLabel(effectivePerformance.detectedTier)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                      {t('settings.deviceProfileAppliedLabel', undefined, 'Đang áp dụng')}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {getPerformanceLabel(effectivePerformance.effectiveTier)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {deviceFacts.map((fact) => (
                    <span
                      key={fact}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
                    >
                      {fact}
                    </span>
                  ))}
                </div>

                {effectivePerformance.batterySaverAdjusted && (
                  <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    {t(
                      'settings.deviceProfileBatteryHint',
                      undefined,
                      'Chế độ tiết kiệm pin đang làm hồ sơ hoạt động thận trọng hơn một nấc.'
                    )}
                  </p>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {PERFORMANCE_OPTIONS.map((option) => {
                    const isSelected = settings.performancePreference === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateSetting('performancePreference', option)}
                        className={`rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/20 shadow-[0_10px_30px_rgba(242,108,13,0.18)]'
                            : 'border-white/10 bg-black/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{getPerformanceLabel(option)}</p>
                            <p className="mt-1 text-sm leading-5 text-white/70">
                              {getPerformanceDescription(option)}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="my-4 h-px bg-white/10" />

              <section className="mb-6">
                <h3 className="mb-3 text-lg font-bold text-white">
                  {t('settings.tourExperience', undefined, 'Trải nghiệm tour')}
                </h3>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{t('settings.autoMode')}</p>
                    <p className="text-sm text-muted">{t('tour.autoMode')}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayEnabled}
                      onChange={e => updateSetting('autoPlayEnabled', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-7 w-12 rounded-full bg-white/20 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all after:content-['']" />
                  </label>
                </div>

                <div className="py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-white">{t('settings.volume')}</p>
                    <span className="text-sm text-muted">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg text-muted">volume_mute</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.volume * 100}
                      onChange={e => updateSetting('volume', Number(e.target.value) / 100)}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary"
                    />
                    <span className="material-symbols-outlined text-lg text-muted">volume_up</span>
                  </div>
                </div>

                <div className="py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-white">{t('settings.geofenceRadius')}</p>
                    <span className="text-sm text-muted">{settings.geofenceRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={settings.geofenceRadius}
                    onChange={e => updateSetting('geofenceRadius', Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted">
                    <span>{t('settings.geofenceClose')}</span>
                    <span>{t('settings.geofenceFar')}</span>
                  </div>
                </div>
              </section>

              <div className="my-4 h-px bg-white/10" />

              <section className="mb-6">
                <h3 className="mb-3 text-lg font-bold text-white">{t('battery.lowPowerMode')}</h3>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{t('settings.batteryOptimization')}</p>
                    <p className="text-sm text-muted">{t('battery.recommendation')}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.batterySaverMode}
                      onChange={e => updateSetting('batterySaverMode', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-7 w-12 rounded-full bg-white/20 peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all after:content-['']" />
                  </label>
                </div>
              </section>

              {user && (
                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-bold text-white">
                    {t('settings.account', undefined, 'Tài khoản')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningOut ? (
                      <InlineSpinner
                        label={t('settings.signingOut', undefined, 'Đang đăng xuất...')}
                        color="primary"
                      />
                    ) : (
                      t('settings.signOut', undefined, 'Đăng xuất')
                    )}
                  </button>
                </section>
              )}

              <div className="pb-8 pt-4 text-center">
                <p className="text-sm text-muted">FlavorQuest v1.0.0</p>
                <a href="#" className="text-sm text-primary hover:underline">
                  {t('common.privacyPolicy')}
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
