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

type DeviceCopyKey =
  | 'tourExperience'
  | 'deviceProfileTitle'
  | 'deviceProfileDescription'
  | 'deviceProfileDetectedLabel'
  | 'deviceProfileAppliedLabel'
  | 'deviceProfileSystem'
  | 'deviceProfileLight'
  | 'deviceProfileBalanced'
  | 'deviceProfileFull'
  | 'deviceProfileAutoDescription'
  | 'deviceProfileLightDescription'
  | 'deviceProfileBalancedDescription'
  | 'deviceProfileFullDescription'
  | 'deviceProfileUnknown'
  | 'deviceProfileMotionReduced'
  | 'deviceProfileMotionStandard'
  | 'deviceProfileBatteryHint';

const PERFORMANCE_OPTIONS: DevicePerformancePreference[] = ['system', 'light', 'balanced', 'full'];

const DEVICE_PROFILE_COPY: Partial<Record<Language, Record<DeviceCopyKey, string>>> = {
  vi: {
    tourExperience: 'Trải nghiệm tour',
    deviceProfileTitle: 'Hồ sơ thiết bị',
    deviceProfileDescription:
      'FlavorQuest tự điều chỉnh chuyển động, bản đồ và tải nền để hợp với máy bạn đang dùng.',
    deviceProfileDetectedLabel: 'Hệ thống nhận diện',
    deviceProfileAppliedLabel: 'Đang áp dụng',
    deviceProfileSystem: 'Tự động',
    deviceProfileLight: 'Nhẹ',
    deviceProfileBalanced: 'Cân bằng',
    deviceProfileFull: 'Đầy đủ',
    deviceProfileAutoDescription:
      'Ứng dụng tự cân bằng chuyển động, độ chi tiết bản đồ và tải nền theo thiết bị hiện tại.',
    deviceProfileLightDescription:
      'Giảm hiệu ứng và hạn chế tải nền để ưu tiên pin cùng độ ổn định.',
    deviceProfileBalancedDescription:
      'Giữ trải nghiệm mượt cho đa số thiết bị mà không tải quá nặng.',
    deviceProfileFullDescription:
      'Ưu tiên chuyển động mượt và tải trước rộng hơn khi thiết bị còn dư sức.',
    deviceProfileUnknown: 'Chưa rõ',
    deviceProfileMotionReduced: 'Giảm chuyển động',
    deviceProfileMotionStandard: 'Chuyển động chuẩn',
    deviceProfileBatteryHint:
      'Chế độ tiết kiệm pin đang làm hồ sơ hoạt động thận trọng hơn một nấc.',
  },
  en: {
    tourExperience: 'Tour Experience',
    deviceProfileTitle: 'Device profile',
    deviceProfileDescription:
      "FlavorQuest adapts map motion, visuals, and background loading to fit the device you're using.",
    deviceProfileDetectedLabel: 'System detected',
    deviceProfileAppliedLabel: 'Currently using',
    deviceProfileSystem: 'Auto',
    deviceProfileLight: 'Light',
    deviceProfileBalanced: 'Balanced',
    deviceProfileFull: 'Full',
    deviceProfileAutoDescription:
      'Let the app balance motion, map detail, and background loading for this device automatically.',
    deviceProfileLightDescription:
      'Reduce visual effects and background loading to favor battery life and stability.',
    deviceProfileBalancedDescription:
      'Keep the experience smooth for most devices without pushing resource use too far.',
    deviceProfileFullDescription:
      'Favor richer motion and wider preloading when the device has room to spare.',
    deviceProfileUnknown: 'Unknown',
    deviceProfileMotionReduced: 'Reduced motion',
    deviceProfileMotionStandard: 'Standard motion',
    deviceProfileBatteryHint:
      'Battery Saver is making the active profile one step more conservative.',
  },
  ja: {
    tourExperience: 'ツアー体験',
    deviceProfileTitle: 'デバイスプロファイル',
    deviceProfileDescription:
      'FlavorQuest はお使いの端末に合わせて、地図の動きや表示、バックグラウンド読み込みを調整します。',
    deviceProfileDetectedLabel: 'システム判定',
    deviceProfileAppliedLabel: '現在の設定',
    deviceProfileSystem: '自動',
    deviceProfileLight: '軽量',
    deviceProfileBalanced: '標準',
    deviceProfileFull: 'フル',
    deviceProfileAutoDescription:
      '現在の端末に合わせて、動きや地図の詳細、バックグラウンド読み込みを自動で調整します。',
    deviceProfileLightDescription:
      '視覚効果とバックグラウンド読み込みを抑えて、電池持ちと安定性を優先します。',
    deviceProfileBalancedDescription: '多くの端末で快適さと負荷のバランスを保ちます。',
    deviceProfileFullDescription:
      '端末に余裕があるときは、より豊かな動きと広めの先読みを優先します。',
    deviceProfileUnknown: '不明',
    deviceProfileMotionReduced: '動きを抑える',
    deviceProfileMotionStandard: '標準の動き',
    deviceProfileBatteryHint:
      '省電力モードにより、現在のプロファイルは一段控えめに調整されています。',
  },
  fr: {
    tourExperience: 'Expérience de visite',
    deviceProfileTitle: "Profil de l'appareil",
    deviceProfileDescription:
      "FlavorQuest adapte les mouvements, la carte et les chargements en arrière-plan selon l'appareil utilisé.",
    deviceProfileDetectedLabel: 'Détection du système',
    deviceProfileAppliedLabel: 'Profil actif',
    deviceProfileSystem: 'Automatique',
    deviceProfileLight: 'Léger',
    deviceProfileBalanced: 'Équilibré',
    deviceProfileFull: 'Complet',
    deviceProfileAutoDescription:
      "L'application ajuste automatiquement les animations, la carte et le chargement en arrière-plan.",
    deviceProfileLightDescription:
      'Réduit les effets visuels et les chargements en arrière-plan pour préserver la batterie et la stabilité.',
    deviceProfileBalancedDescription:
      'Conserve une expérience fluide pour la plupart des appareils sans consommer trop de ressources.',
    deviceProfileFullDescription:
      "Privilégie des animations plus riches et un préchargement plus large quand l'appareil le permet.",
    deviceProfileUnknown: 'Inconnu',
    deviceProfileMotionReduced: 'Mouvement réduit',
    deviceProfileMotionStandard: 'Mouvement standard',
    deviceProfileBatteryHint:
      "Le mode économie d'énergie rend le profil actif un cran plus prudent.",
  },
  ko: {
    tourExperience: '투어 경험',
    deviceProfileTitle: '기기 프로필',
    deviceProfileDescription:
      'FlavorQuest는 현재 기기에 맞춰 지도 움직임, 화면 표현, 백그라운드 로딩을 조절합니다.',
    deviceProfileDetectedLabel: '시스템 감지',
    deviceProfileAppliedLabel: '현재 적용',
    deviceProfileSystem: '자동',
    deviceProfileLight: '가볍게',
    deviceProfileBalanced: '균형',
    deviceProfileFull: '풍부하게',
    deviceProfileAutoDescription:
      '현재 기기에 맞춰 움직임, 지도 디테일, 백그라운드 로딩을 자동으로 조절합니다.',
    deviceProfileLightDescription:
      '시각 효과와 백그라운드 로딩을 줄여 배터리와 안정성을 우선합니다.',
    deviceProfileBalancedDescription: '대부분의 기기에서 부드러움과 자원 사용의 균형을 맞춥니다.',
    deviceProfileFullDescription:
      '기기 여유가 충분할 때 더 풍부한 움직임과 넓은 사전 로딩을 우선합니다.',
    deviceProfileUnknown: '알 수 없음',
    deviceProfileMotionReduced: '움직임 줄이기',
    deviceProfileMotionStandard: '기본 움직임',
    deviceProfileBatteryHint: '절전 모드로 인해 현재 프로필이 한 단계 더 보수적으로 적용됩니다.',
  },
  zh: {
    tourExperience: '导览体验',
    deviceProfileTitle: '设备配置',
    deviceProfileDescription:
      'FlavorQuest 会根据你当前设备的状态，调整地图动效、界面呈现和后台预加载。',
    deviceProfileDetectedLabel: '系统识别',
    deviceProfileAppliedLabel: '当前启用',
    deviceProfileSystem: '自动',
    deviceProfileLight: '轻量',
    deviceProfileBalanced: '均衡',
    deviceProfileFull: '完整',
    deviceProfileAutoDescription: '让应用根据当前设备自动平衡动效、地图细节和后台加载。',
    deviceProfileLightDescription: '减少视觉效果和后台加载，优先保证续航与稳定性。',
    deviceProfileBalancedDescription: '在大多数设备上兼顾流畅体验和资源占用。',
    deviceProfileFullDescription: '当设备性能充足时，优先启用更丰富的动效和更宽的预加载范围。',
    deviceProfileUnknown: '未知',
    deviceProfileMotionReduced: '减少动效',
    deviceProfileMotionStandard: '标准动效',
    deviceProfileBatteryHint: '省电模式会让当前配置再保守一级。',
  },
};

function isCorruptedTranslation(value: string, fallback: string) {
  if (value === fallback) {
    return false;
  }

  return /\u00C3|\uFFFD/.test(value) || (value.includes('?') && /[^\x00-\x7F]/.test(fallback));
}

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
  const deviceCopy = DEVICE_PROFILE_COPY[language] ?? DEVICE_PROFILE_COPY.en!;

  const effectivePerformance = useMemo(
    () => resolveDevicePerformance(settings, deviceAssessment),
    [deviceAssessment, settings]
  );

  const getDeviceCopy = useCallback(
    (key: DeviceCopyKey) => {
      const fallback = deviceCopy[key];
      const translated = t(`settings.${key}`, undefined, fallback);
      return isCorruptedTranslation(translated, fallback) ? fallback : translated;
    },
    [deviceCopy, t]
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
      toast.error(t('settings.signOutFailed', undefined, 'Đăng xuất thất bại. Vui lòng thử lại.'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const getPerformanceLabel = (value: DevicePerformancePreference | DevicePerformanceTier) => {
    switch (value) {
      case 'system':
        return getDeviceCopy('deviceProfileSystem');
      case 'light':
        return getDeviceCopy('deviceProfileLight');
      case 'balanced':
        return getDeviceCopy('deviceProfileBalanced');
      case 'full':
        return getDeviceCopy('deviceProfileFull');
      default:
        return getDeviceCopy('deviceProfileBalanced');
    }
  };

  const getPerformanceDescription = (value: DevicePerformancePreference) => {
    switch (value) {
      case 'system':
        return getDeviceCopy('deviceProfileAutoDescription');
      case 'light':
        return getDeviceCopy('deviceProfileLightDescription');
      case 'balanced':
        return getDeviceCopy('deviceProfileBalancedDescription');
      case 'full':
        return getDeviceCopy('deviceProfileFullDescription');
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background-dark animate-slideUp absolute inset-0 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background-dark sticky top-0 z-10 shrink-0 border-b border-white/5 px-4 py-4">
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
                <div className="grid max-h-[20rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        language === lang.code
                          ? 'border-primary bg-primary/18 text-white shadow-[0_12px_30px_rgba(242,108,13,0.18)]'
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm leading-5 font-semibold">{lang.nativeName}</p>
                          <p className="mt-1 text-xs text-white/65">{lang.name}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase ${
                            language === lang.code
                              ? 'bg-white/18 text-white'
                              : 'bg-white/8 text-white/55'
                          }`}
                        >
                          {lang.shortLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="my-4 h-px bg-white/10" />

              <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(242,108,13,0.18),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {getDeviceCopy('deviceProfileTitle')}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-white/70">
                      {getDeviceCopy('deviceProfileDescription')}
                    </p>
                  </div>
                  <span className="text-primary rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase">
                    {getPerformanceLabel(effectivePerformance.effectiveTier)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs tracking-[0.18em] text-white/45 uppercase">
                      {getDeviceCopy('deviceProfileDetectedLabel')}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {getPerformanceLabel(effectivePerformance.detectedTier)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs tracking-[0.18em] text-white/45 uppercase">
                      {getDeviceCopy('deviceProfileAppliedLabel')}
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {getPerformanceLabel(effectivePerformance.effectiveTier)}
                    </p>
                  </div>
                </div>

                {effectivePerformance.batterySaverAdjusted && (
                  <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    {getDeviceCopy('deviceProfileBatteryHint')}
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
                            <p className="font-semibold text-white">
                              {getPerformanceLabel(option)}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-white/70">
                              {getPerformanceDescription(option)}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary">
                              check_circle
                            </span>
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
                  {getDeviceCopy('tourExperience')}
                </h3>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{t('settings.autoMode')}</p>
                    <p className="text-muted text-sm">{t('tour.autoMode')}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayEnabled}
                      onChange={(e) => updateSetting('autoPlayEnabled', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer-checked:bg-primary h-7 w-12 rounded-full bg-white/20 after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </label>
                </div>
              </section>

              <div className="my-4 h-px bg-white/10" />

              <section className="mb-6">
                <h3 className="mb-3 text-lg font-bold text-white">{t('battery.lowPowerMode')}</h3>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{t('settings.batteryOptimization')}</p>
                    <p className="text-muted text-sm">{t('battery.recommendation')}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.batterySaverMode}
                      onChange={(e) => updateSetting('batterySaverMode', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer-checked:bg-primary h-7 w-12 rounded-full bg-white/20 after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
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

              <div className="pt-4 pb-8 text-center">
                <p className="text-muted text-sm">FlavorQuest v1.0.0</p>
                <a href="#" className="text-primary text-sm hover:underline">
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
