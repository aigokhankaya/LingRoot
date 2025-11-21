import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface HeroSectionProps {}

const HeroSection: React.FC<HeroSectionProps> = () => {
  const { t } = useTranslation();
  
  return (
    <section className="bg-white text-center py-20 px-4">
      <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        {t('main_title')}
      </h1>
      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        {t('main_description')}
      </p>
      <a
        href="#"
        className="inline-block bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-300 hover:bg-primary/90"
      >
        {t('register_now')}
      </a>
    </section>
  );
};

export default HeroSection; 