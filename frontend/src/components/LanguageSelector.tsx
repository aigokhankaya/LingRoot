'use client';

// Import useTranslation and useLanguage using alias paths
import { useTranslation, useLanguage, Locale, isRTL } from '@/lib/i18n';
import React from 'react';

export default function LanguageSelector() {
  // Keep useLanguage for changeLanguage functionality and currentLocale
  const { currentLocale, changeLanguage, supportedLocales } = useLanguage(); 
  // Use useTranslation for accessing translation keys
  const { t } = useTranslation();
  
  // RTL desteği için kontrol
  const rtl = isRTL(currentLocale);

  return (
    <div className="relative" dir="ltr">
      <select
        value={currentLocale}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeLanguage(e.target.value as Locale)}
        className="appearance-none bg-transparent pl-8 pr-10 py-2 text-white
          border border-primary/60 rounded-lg cursor-pointer
          hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary 
          focus:border-transparent transition-all duration-200"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '20px'
        }}
      >
        {/* Dynamically generate options based on supportedLocales */}
        {supportedLocales.map((locale: Locale) => (
          <option 
            key={locale} 
            value={locale}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {/* Use the t function with the specific language key */}
            {t(`language_${locale}`)}
          </option>
        ))}
      </select>
      
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary/60 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    </div>
  );
} 