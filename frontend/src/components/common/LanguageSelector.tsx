'use client';

import React from 'react';
import { useTranslation, useLanguage, Locale } from '@/lib/i18n';

const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const { currentLocale, changeLanguage, supportedLocales } = useLanguage();

  return (
    <div className="relative inline-block" dir="ltr">
      <select
        value={currentLocale}
        onChange={e => changeLanguage(e.target.value as Locale)}
        className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        {supportedLocales.map(locale => (
          <option key={locale} value={locale}>
            {t(`language_${locale}`)}
          </option>
        ))}
      </select>
      <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
        </svg>
      </span>
    </div>
  );
};

export default LanguageSelector; 