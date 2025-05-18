import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface FooterSectionProps {}

const FooterSection: React.FC<FooterSectionProps> = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-gray-900 text-white py-10 px-6 text-center">
      <div className="mb-4 space-x-4">
        <a href="#" className="hover:underline text-gray-300">{t('privacy_policy')}</a>
        <a href="#" className="hover:underline text-gray-300">{t('terms_of_service')}</a>
        <a href="#" className="hover:underline text-gray-300">{t('contact')}</a>
      </div>
      <div className="text-sm text-gray-500">
        © 2025 LingRoot. {t('all_rights_reserved')}
      </div>
    </footer>
  );
};

export default FooterSection; 