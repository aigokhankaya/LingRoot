import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { useAuth } from '../src/lib/auth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

export default function Fiyatlandirma() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        setPlansError(null);

        const res = await fetch('/api/subscription/plans');
        const json = await res.json();

        if (res.ok && json?.success) {
          setPlans((json.data || []).filter((p: any) => p.is_active));
          return;
        }

        if (!token) {
          throw new Error(t('pricing_error'));
        }

        const res2 = await fetch('/api/admin/plans', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json2 = await res2.json();
        if (!res2.ok || !json2?.success) {
          throw new Error(json2?.message || t('pricing_error'));
        }
        setPlans((json2.data || []).filter((p: any) => p.is_active));
      } catch (e: any) {
        setPlansError(e?.message || t('pricing_error'));
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [t]);

  const handlePlanSelect = (planId: string) => {
    if (!isAuthenticated) {
      // Kullanıcı giriş yapmamışsa login'e yönlendir
      router.push(`/login?next=${encodeURIComponent('/fiyatlandirma')}`);
      return;
    }
    // Giriş yapmışsa ödeme sayfasına yönlendir
    router.push(`/payment?planId=${encodeURIComponent(planId)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-['Roboto',sans-serif]">
      <Head>
        <title>{t('pricing')} | LingRoot</title>
        <meta name="description" content={t('pricing_hero_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header - aligned with homepage */}
      <header className="bg-white/90 border-b border-border backdrop-blur-sm py-3 sticky top-0 z-50">
        <div className="container mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src="/lingroot-icon.svg"
              alt="LingRoot Logo"
              className="w-10 h-10 md:w-12 md:h-12"
            />
            <BrandWordmark className="text-xl md:text-2xl" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/about"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              {t('about')}
            </Link>
            <Link
              href="/nasil-calisir"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              {t('how_it_works')}
            </Link>
            <Link
              href="/ozellikler"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              {t('features')}
            </Link>
            <Link
              href="/fiyatlandirma"
              className="text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer text-sm lg:text-base font-semibold"
            >
              {t('pricing')}
            </Link>
            <Link
              href="/blog"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              {t('blog')}
            </Link>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline" className="!rounded-button whitespace-nowrap">
                {t('login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="!rounded-button whitespace-nowrap">{t('register_now')}</Button>
            </Link>
          </div>

          {/* Simple mobile actions */}
          <div className="md:hidden flex items-center space-x-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-primary">
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:bg-primary/90"
            >
              {t('register_now')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-slate-900">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              {t('pricing_hero_badge')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('pricing_hero_title')} <span className="text-primary">{t('pricing_hero_highlight')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              {t('pricing_hero_desc')}
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t('pricing_main_title')} <span className="text-primary">{t('pricing_main_highlight')}</span>
              </h2>
            </div>
            {loadingPlans && (
              <div className="text-center text-gray-600">{t('pricing_loading')}</div>
            )}
            {plansError && !loadingPlans && (
              <div className="text-center text-red-600">{plansError}</div>
            )}
            {!loadingPlans && !plansError && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                  const isFree = plan.price === 0 || plan.is_trial;
                  const isYearly = plan.interval === 'yearly';
                  const isPopular = !isFree && !isYearly;
                  const rawFeatures = Array.isArray(plan.features) ? plan.features : [];
                  // Feature localization logic maintained as requested
                  const localizedFeatures = rawFeatures
                    .map((f: any) => {
                      if (typeof f !== 'string') return null;
                      const trimmed = f.trim();
                      if (trimmed.toUpperCase().startsWith('TR:')) {
                        return trimmed.substring(3).trim();
                      }
                      if (trimmed.toUpperCase().startsWith('EN:')) {
                        return null;
                      }
                      return trimmed;
                    })
                    .filter((f: any) => f);
                    
                  const intervalLabel =
                    plan.interval === 'yearly' ? t('pricing_interval_year') : plan.interval === 'monthly' ? t('pricing_interval_month') : '';
                  const buttonLabel = isFree ? t('pricing_button_free') : isYearly ? t('pricing_button_yearly') : t('pricing_button_start');
                  const cardClasses = isPopular
                    ? 'bg-muted rounded-2xl border-2 border-primary shadow-2xl hover:shadow-3xl transition-all duration-300 transform md:hover:scale-105 z-10 overflow-hidden hover:-translate-y-2'
                    : isFree
                    ? 'bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2'
                    : 'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden';

                  const planName = String(plan.name || '').toLowerCase();
                  const sanitizedFeatures: string[] = localizedFeatures.filter((feature: any) => {
                    if (typeof feature !== 'string') return false;
                    const lower = feature.toLowerCase();
                    if (lower.includes('sınırsız') || lower.includes('sinirsiz') || lower.includes('unlimited')) {
                      return false;
                    }
                    return true;
                  });

                  let marketingDescription: string | null = null;
                  let marketingBullets: string[] = [];

                  if (isFree && (planName.includes('free') || planName.includes('trial') || planName.includes('ücretsiz'))) {
                    marketingDescription = t('pricing_free_desc');
                    marketingBullets = [
                      t('pricing_free_feature1'),
                      t('pricing_free_feature2'),
                      t('pricing_free_feature3'),
                      t('pricing_free_feature4'),
                    ];
                  } else if (planName.includes('gold')) {
                    marketingDescription = t('pricing_gold_desc');
                    marketingBullets = [
                      t('pricing_gold_feature1'),
                      t('pricing_gold_feature2'),
                      t('pricing_gold_feature3'),
                      t('pricing_gold_feature4'),
                    ];
                  } else if (planName.includes('platin') || planName.includes('platinum')) {
                    marketingDescription = t('pricing_platinum_desc');
                    marketingBullets = [
                      t('pricing_platinum_feature1'),
                      t('pricing_platinum_feature2'),
                      t('pricing_platinum_feature3'),
                      t('pricing_platinum_feature4'),
                    ];
                  }

                  const combinedFeatures: string[] =
                    marketingBullets.length > 0 || marketingDescription
                      ? [...marketingBullets]
                      : sanitizedFeatures;
                  
                  const finalFeatures = combinedFeatures;


                  return (
                    <div key={plan.id} className={cardClasses}>
                      <div className={isPopular ? 'bg-primary p-6 relative' : isFree ? 'bg-gradient-to-r from-gray-100 to-gray-200 p-6' : 'bg-gray-50 p-6'}>
                        {isPopular && (
                          <div className="absolute top-0 right-0 mt-3 mr-4">
                            <div className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                              {t('pricing_popular_badge')}
                            </div>
                          </div>
                        )}
                        <h3 className={`text-xl font-bold mb-2 text-center ${isPopular ? 'text-white' : 'text-gray-800'}`}>
                          {plan.name}
                        </h3>
                        <div className="text-center">
                          <span
                            className={`text-4xl font-bold ${
                              isPopular
                                ? 'text-white'
                                : isFree
                                ? 'bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent'
                                : 'text-[#28a745]'
                            }`}
                          >
                            {plan.price} ₺
                          </span>
                          {intervalLabel && (
                            <span className={isPopular ? 'text-white opacity-90' : 'text-gray-600'}>/{intervalLabel}</span>
                          )}
                        </div>
                      </div>
                      <div className={isPopular ? 'p-8' : 'p-6'}>
                        {(marketingDescription || plan.description) && (
                          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                            {marketingDescription || plan.description}
                          </p>
                        )}
                        {finalFeatures.length > 0 && (
                          <ul className="space-y-3 mb-6">
                            {finalFeatures.map((feature: any, index: number) => (
                              <li key={index} className="flex items-start">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-600">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {isFree ? (
                          <button
                            onClick={() => {
                              if (!isAuthenticated) {
                                router.push('/register');
                              } else {
                                router.push('/welcome');
                              }
                            }}
                            className="block w-full py-3 px-6 bg-muted hover:bg-gray-200 text-gray-800 rounded-xl text-center font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            {buttonLabel}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePlanSelect(String(plan.id))}
                            className={
                              isPopular
                                ? 'block w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-center font-medium transition-colors'
                                : 'block w-full py-3 px-4 bg-[#fd7e14] hover:bg-[#e76b02] text-white rounded text-center font-medium transition-colors'
                            }
                          >
                            {buttonLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">{t('pricing_faq_title')}</h2>

            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">{t('pricing_faq_q1')}</h3>
                <p className="text-gray-600">
                  {t('pricing_faq_a1')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">{t('pricing_faq_q2')}</h3>
                <p className="text-gray-600">
                  {t('pricing_faq_a2')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">{t('pricing_faq_q3')}</h3>
                <p className="text-gray-600">
                  {t('pricing_faq_a3')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">{t('pricing_faq_q4')}</h3>
                <p className="text-gray-600">
                  {t('pricing_faq_a4')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">{t('pricing_faq_q5')}</h3>
                <p className="text-gray-600">
                  {t('pricing_faq_a5')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-[#f1f9ee]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('pricing_cta_title')}</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {t('pricing_cta_desc')}
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-[#fd7e14] text-white rounded shadow-md font-medium hover:bg-[#e76b02] transition-colors text-lg"
            >
              {t('pricing_cta_button')}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
