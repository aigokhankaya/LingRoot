import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import trTranslations from '../locales/tr.json';
import enTranslations from '../locales/en.json';

type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  tr: trTranslations,
  en: enTranslations,
};

const LANGUAGE_STORAGE_KEY = 'app_language';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language from storage, or detect system language on first install
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'tr' || savedLanguage === 'en')) {
          setLanguageState(savedLanguage as Language);
        } else {
          // First install: detect system language and persist it
          let systemLang = 'en';
          try {
            const { getLocales } = require('expo-localization');
            const locales = getLocales();
            systemLang = locales[0]?.languageCode ?? 'en';
          } catch {
            // expo-localization native module not available, fall back to RN
            try {
              const locale =
                Platform.OS === 'ios'
                  ? NativeModules.SettingsManager?.settings?.AppleLocale ||
                    NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
                  : NativeModules.I18nManager?.localeIdentifier;
              if (typeof locale === 'string' && locale.startsWith('tr')) {
                systemLang = 'tr';
              }
            } catch {
              // ignore
            }
          }
          const detected: Language = systemLang === 'tr' ? 'tr' : 'en';
          setLanguageState(detected);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
    }
  };

  // Translation function
  const t = (key: string, vars?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    let str = (typeof value === 'string') ? value : key;
    if (vars && typeof str === 'string') {
      str = str.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
        const rep = vars[p1];
        return (rep !== undefined && rep !== null) ? String(rep) : match;
      });
    }
    return str;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
