/**
 * SettingsPanel Component
 * T094, T096-T098 - Panel cài đặt đầy đủ
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { loadSettings, saveSettings } from '@/lib/services/storage';
import type { UserSettings, Language } from '@/lib/types/index';
import { GEOFENCE_RADIUS_METERS } from '@/lib/constants/index';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_FLAGS: Record<Language, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
  ja: '🇯🇵',
  fr: '🇫🇷',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { t } = useTranslations();
  const [settings, setSettings] = useState<UserSettings>({
    language: 'vi',
    volume: 0.8,
    autoPlayEnabled: true,
    geofenceRadius: GEOFENCE_RADIUS_METERS,
    batterySaverMode: false,
    showNotifications: true,
    preferredMapZoom: 15,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
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
    load();
  }, []);

  // Save settings
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  // Handle language change
  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    await updateSetting('language', lang);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-0 bg-background-dark overflow-hidden animate-slideUp flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background-dark border-b border-white/5 px-4 py-4 shrink-0">
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

        {/* Content */}
        <div className="overflow-y-auto p-4 pb-12 flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined text-primary animate-spin text-3xl">sync</span>
            </div>
          ) : (
            <>
              {/* Language Section */}
              <section className="mb-6">
                <h3 className="text-white font-bold text-lg mb-3">{t('settings.language')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${language === lang.code
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                    >
                      <span className="text-lg">{LANGUAGE_FLAGS[lang.code]}</span>
                      <span className="text-sm font-medium">{lang.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Divider */}
              <div className="h-px bg-white/10 my-4" />

              {/* Tour Experience Section */}
              <section className="mb-6">
                <h3 className="text-white font-bold text-lg mb-3">{t('settings.title')}</h3>

                {/* Auto Play Toggle */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">{t('settings.autoMode')}</p>
                    <p className="text-sm text-muted">{t('tour.autoMode')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayEnabled}
                      onChange={e => updateSetting('autoPlayEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-7 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                {/* Volume Slider */}
                <div className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">{t('settings.volume')}</p>
                    <span className="text-sm text-muted">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-muted text-lg">volume_mute</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.volume * 100}
                      onChange={e => updateSetting('volume', Number(e.target.value) / 100)}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="material-symbols-outlined text-muted text-lg">volume_up</span>
                  </div>
                </div>

                {/* Geofence Radius Slider */}
                <div className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">{t('settings.geofenceRadius')}</p>
                    <span className="text-sm text-muted">{settings.geofenceRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={settings.geofenceRadius}
                    onChange={e => updateSetting('geofenceRadius', Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>{t('settings.geofenceClose')}</span>
                    <span>{t('settings.geofenceFar')}</span>
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="h-px bg-white/10 my-4" />

              {/* Battery Section */}
              <section className="mb-6">
                <h3 className="text-white font-bold text-lg mb-3">{t('battery.lowPowerMode')}</h3>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">{t('settings.batteryOptimization')}</p>
                    <p className="text-sm text-muted">{t('battery.recommendation')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.batterySaverMode}
                      onChange={e => updateSetting('batterySaverMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-7 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              </section>

              {/* App Info */}
              <div className="text-center pt-4 pb-8">
                <p className="text-muted text-sm">FlavorQuest v1.0.0</p>
                <a href="#" className="text-primary text-sm hover:underline">{t('common.privacyPolicy')}</a>
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
