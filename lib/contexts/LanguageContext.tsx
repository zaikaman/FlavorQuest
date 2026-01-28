/**
 * Language Context
 * 
 * Quản lý global language state cho toàn bộ app
 * 
 * Features:
 * - Current language state
 * - Change language function
 * - Persist language preference to IndexedDB
 * - Type-safe với Language type
 * 
 * Supported Languages:
 * - vi: Tiếng Việt
 * - en: English
 * - ja: 日本語
 * - fr: Français
 * - ko: 한국어
 * - zh: 中文
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language } from '@/lib/types/index';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/index';
import { loadSettings, updateSettings } from '@/lib/services/storage';

/**
 * Language context value
 */
interface LanguageContextValue {
  /**
   * Current language
   */
  language: Language;

  /**
   * Change language
   */
  setLanguage: (language: Language) => Promise<void>;

  /**
   * Available languages
   */
  availableLanguages: typeof SUPPORTED_LANGUAGES;
}

/**
 * Language context
 */
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Language Provider Props
 */
interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

/**
 * Language Provider Component
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { LanguageProvider } from '@/lib/contexts/LanguageContext';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <LanguageProvider>
 *           {children}
 *         </LanguageProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function LanguageProvider({ children, defaultLanguage = 'vi' }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language from IndexedDB on mount
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const settings = await loadSettings();
        if (settings.language) {
          console.log('[LanguageContext] Loading saved language:', settings.language);
          setLanguageState(settings.language);
          // Update HTML lang attribute
          if (typeof document !== 'undefined') {
            document.documentElement.lang = settings.language;
          }
        } else {
          console.log('[LanguageContext] No saved language, using default: vi');
        }
      } catch (error) {
        console.error('Failed to load language from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSavedLanguage();
  }, []);

  /**
   * Change language and persist to storage
   */
  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      console.log('[LanguageContext] Changing language to:', newLanguage);
      
      // Update state
      setLanguageState(newLanguage);

      // Persist to IndexedDB
      await updateSettings({ language: newLanguage });

      // Update HTML lang attribute for accessibility
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLanguage;
      }
      
      console.log('[LanguageContext] Language changed successfully to:', newLanguage);
    } catch (error) {
      console.error('Failed to save language to storage:', error);
      // Still update state even if storage fails
      setLanguageState(newLanguage);
    }
  }, []);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
  };

  // Don't render children until language is loaded from storage
  // Prevents flash of wrong language
  if (!isLoaded) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * useLanguage Hook
 * 
 * @example
 * ```tsx
 * 'use client';
 * import { useLanguage } from '@/lib/contexts/LanguageContext';
 * 
 * export function MyComponent() {
 *   const { language, setLanguage } = useLanguage();
 *   
 *   return (
 *     <div>
 *       <p>Current: {language}</p>
 *       <button onClick={() => setLanguage('en')}>English</button>
 *       <button onClick={() => setLanguage('vi')}>Tiếng Việt</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
