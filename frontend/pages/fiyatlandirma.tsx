import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { useAuth } from '../src/lib/auth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';

export default function Fiyatlandirma() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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
          throw new Error('Planlar getirilemedi');
        }

        const res2 = await fetch('/api/admin/plans', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json2 = await res2.json();
        if (!res2.ok || !json2?.success) {
          throw new Error(json2?.message || 'Planlar getirilemedi');
        }
        setPlans((json2.data || []).filter((p: any) => p.is_active));
      } catch (e: any) {
        setPlansError(e?.message || 'Planlar getirilemedi');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

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
        <title>Fiyatlandırma | LingRoot</title>
        <meta name="description" content="LingRoot fiyatlandırma seçenekleri. Bütçenize ve ihtiyaçlarınıza uygun planı seçin." />
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
              Hakkımızda
            </Link>
            <a
              href="#nasil-calisir"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#ozellikler"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              Özellikler
            </a>
            <a
              href="#yorumlar"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              Kullanıcı Yorumları
            </a>
            <a
              href="#blog"
              className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer text-sm lg:text-base"
            >
              Blog
            </a>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline" className="!rounded-button whitespace-nowrap">
                Giriş Yap
              </Button>
            </Link>
            <Link href="/register">
              <Button className="!rounded-button whitespace-nowrap">Ücretsiz Kaydol</Button>
            </Link>
          </div>

          {/* Simple mobile actions */}
          <div className="md:hidden flex items-center space-x-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-primary">
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:bg-primary/90"
            >
              Ücretsiz Kaydol
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
              Planlar ve Fiyatlar
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              LingRoot <span className="text-primary">Fiyatlandırma</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              İhtiyaçlarınıza en uygun planı seçin ve İngilizce öğrenme serüvenize hemen başlayın.
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Size Uygun <span className="text-primary">Planı Seçin</span>
              </h2>
            </div>
            {loadingPlans && (
              <div className="text-center text-gray-600">Paketler yükleniyor...</div>
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
                    plan.interval === 'yearly' ? 'yıl' : plan.interval === 'monthly' ? 'ay' : '';
                  const buttonLabel = isFree ? 'Ücretsiz Başla' : isYearly ? 'Yıllık Abone Ol' : 'Hemen Başla';
                  const cardClasses = isPopular
                    ? 'bg-muted rounded-2xl border-2 border-primary shadow-2xl hover:shadow-3xl transition-all duration-300 transform md:hover:scale-105 z-10 overflow-hidden hover:-translate-y-2'
                    : isFree
                    ? 'bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2'
                    : 'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden';

                  return (
                    <div key={plan.id} className={cardClasses}>
                      <div className={isPopular ? 'bg-primary p-6 relative' : isFree ? 'bg-gradient-to-r from-gray-100 to-gray-200 p-6' : 'bg-gray-50 p-6'}>
                        {isPopular && (
                          <div className="absolute top-0 right-0 mt-3 mr-4">
                            <div className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                              EN POPÜLER
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
                        {plan.description && (
                          <p className="text-gray-600 mb-4 text-sm leading-relaxed">{plan.description}</p>
                        )}
                        {localizedFeatures.length > 0 && (
                          <ul className="space-y-3 mb-6">
                            {localizedFeatures.map((feature: any, index: number) => (
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
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Sık Sorulan Sorular</h2>

            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Üyelik planları arasında nasıl geçiş yapabilirim?</h3>
                <p className="text-gray-600">
                  Hesap ayarlarınızdan dilediğiniz zaman planınızı yükseltebilir veya değiştirebilirsiniz. Yıllık plandan aylık
                  plana geçiş yapmak isterseniz, mevcut abonelik sürenizin sonunda değişiklik gerçekleşir.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Ödememi nasıl yapabilirim?</h3>
                <p className="text-gray-600">
                  Kredi kartı, banka kartı veya PayPal ile güvenli ödeme yapabilirsiniz. Tüm ödemeler SSL ile şifrelenir ve
                  bilgileriniz güvende tutulur.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">İade politikanız nedir?</h3>
                <p className="text-gray-600">
                  Satın alma işleminizden itibaren 14 gün içerisinde, herhangi bir sebep belirtmeden iade talep edebilirsiniz.
                  İade talepleri için destek ekibimizle iletişime geçmeniz yeterlidir.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Ücretsiz plan ile ne kadar ileri gidebilirim?</h3>
                <p className="text-gray-600">
                  Ücretsiz planımız, platformumuzun temel özelliklerini denemeniz için tasarlanmıştır. Günlük sınırlar
                  dahilinde, A1-B1 seviyelerinde içerikler oluşturabilir ve temel kelime öğrenme araçlarını kullanabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-[#f1f9ee]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Hala kararsız mısınız?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Risk almadan ücretsiz planımızla başlayın ve LingRoot'un İngilizce öğrenme deneyiminizi nasıl tamamen
              değiştireceğini keşfedin.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-[#fd7e14] text-white rounded shadow-md font-medium hover:bg-[#e76b02] transition-colors text-lg"
            >
              Ücretsiz Hesap Oluştur
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}