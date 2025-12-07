import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/lib/auth';
import { api } from '../src/lib/api';
import Head from 'next/head';
import { useTranslation } from '../src/lib/i18n';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description?: string;
}

interface CardInfo {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

interface InstallmentOption {
  installmentNumber: number;
  totalPrice: number;
  installmentPrice: number;
}

export default function Checkout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const { plan: planId } = router.query;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'iyzico' | 'stripe'>('iyzico');
  const [showCardForm, setShowCardForm] = useState(false);
  const [show3DSecure, setShow3DSecure] = useState(false);
  const [threeDSHtml, setThreeDSHtml] = useState<string | null>(null);
  const [installments, setInstallments] = useState<InstallmentOption[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    cardHolderName: '',
    cardNumber: '',
    expireMonth: '',
    expireYear: '',
    cvc: ''
  });
  const [cardType, setCardType] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent('/checkout?plan=' + planId)}`);
    }
  }, [isAuthenticated, isLoading, router, planId]);

  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      const response = await api.get('/api/subscriptions/plans');
      if (response.data.success) {
        const plans = response.data.data;
        let selectedPlan = null;
        if (planId === 'monthly') {
          selectedPlan = plans.find((p: Plan) => p.interval === 'monthly' && p.name !== 'Free Trial');
        } else if (planId === 'yearly') {
          selectedPlan = plans.find((p: Plan) => p.interval === 'yearly');
        } else {
          selectedPlan = plans.find((p: Plan) => p.id === planId);
        }
        setPlanDetails(selectedPlan);
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
    }
  };

  // Kart numarası formatla
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // BIN kontrolü (kart tipi belirleme)
  const checkBin = async (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.length >= 6) {
      try {
        const response = await api.post('/api/iyzico/check-bin', { binNumber: cleanNumber });
        if (response.data.success) {
          setCardType(response.data.cardAssociation);
          // Taksit seçeneklerini al
          if (planDetails) {
            const instResponse = await api.post('/api/iyzico/installments', {
              binNumber: cleanNumber,
              price: planDetails.price
            });
            if (instResponse.data.success) {
              setInstallments(instResponse.data.installments || []);
            }
          }
        }
      } catch (err) {
        console.error('BIN check error:', err);
      }
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardInfo({ ...cardInfo, cardNumber: formatted });
    if (formatted.replace(/\s/g, '').length >= 6) {
      checkBin(formatted);
    }
  };

  // iyzico ile ödeme
  const handleIyzicoCheckout = async () => {
    if (!planDetails) {
      setError(t('checkout_error_plan_not_found'));
      return;
    }

    // Form validasyonu
    if (!cardInfo.cardHolderName || !cardInfo.cardNumber || !cardInfo.expireMonth || 
        !cardInfo.expireYear || !cardInfo.cvc) {
      setError('Lütfen tüm kart bilgilerini doldurun');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/iyzico/checkout/init', {
        planId: planDetails.id,
        cardHolderName: cardInfo.cardHolderName,
        cardNumber: cardInfo.cardNumber.replace(/\s/g, ''),
        expireMonth: cardInfo.expireMonth,
        expireYear: cardInfo.expireYear,
        cvc: cardInfo.cvc,
        installment: selectedInstallment
      });

      if (response.data.success && response.data.threeDSHtmlContent) {
        // 3D Secure iframe göster
        setThreeDSHtml(response.data.threeDSHtmlContent);
        setShow3DSecure(true);
      } else {
        setError(response.data.message || 'Ödeme başlatılamadı');
      }
    } catch (err: any) {
      console.error('iyzico checkout error:', err);
      setError(err.response?.data?.message || 'Ödeme işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  // Stripe ile ödeme (Stripe Checkout sayfasına yönlendirme)
  const handleStripeCheckout = async () => {
    if (!planDetails) {
      setError(t('checkout_error_plan_not_found'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Yeni Stripe API'sini kullan
      const response = await api.post('/api/stripe/checkout', {
        planId: planDetails.id,
        successUrl: `${window.location.origin}/checkout/result?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/result?status=cancelled`
      });

      if (response.data.success && response.data.sessionUrl) {
        // Stripe Checkout sayfasına yönlendir
        window.location.href = response.data.sessionUrl;
      } else {
        setError(response.data.message || t('checkout_error_session_failed'));
      }
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      setError(err.response?.data?.message || t('checkout_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (paymentMethod === 'iyzico') {
      handleIyzicoCheckout();
    } else {
      handleStripeCheckout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // 3D Secure iframe render
  if (show3DSecure && threeDSHtml) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Head>
          <title>3D Secure Doğrulama | LingRoot</title>
        </Head>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">3D Secure Doğrulama</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              Bankanızın güvenlik sayfasına yönlendiriliyorsunuz...
            </p>
            <iframe
              ref={iframeRef}
              srcDoc={threeDSHtml}
              className="w-full h-[500px] border-0 rounded-lg"
              sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{t('checkout_title')} | LingRoot</title>
      </Head>

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('checkout_title')}</h1>
          <p className="text-gray-600">{t('checkout_subtitle')}</p>
        </div>

        {planDetails ? (
          <>
            {/* Plan Özeti */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('checkout_plan_details')}</h2>
              
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('checkout_plan_label')}</span>
                  <span className="font-semibold text-gray-900">{planDetails.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">{t('checkout_price_label')}</span>
                  <span className="font-semibold text-gray-900">{planDetails.price} ₺</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('checkout_period_label')}</span>
                  <span className="font-semibold text-gray-900">
                    {planDetails.interval === 'monthly' ? t('checkout_period_monthly') : t('checkout_period_yearly')}
                  </span>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">{t('checkout_features_title')}</h3>
                <ul className="space-y-2 text-sm text-gray-800">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('checkout_feature1')}
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('checkout_feature2')}
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('checkout_feature3')}
                  </li>
                </ul>
              </div>
            </div>

            {/* Ödeme Yöntemi Seçimi */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ödeme Yöntemi</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('iyzico')}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    paymentMethod === 'iyzico'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">iyzico</div>
                  <div className="text-xs text-gray-500 mt-1">Kredi Kartı / Taksit</div>
                  <div className="flex justify-center gap-1 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">VISA</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">MC</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Troy</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Stripe</div>
                  <div className="text-xs text-gray-500 mt-1">Uluslararası Kartlar</div>
                  <div className="flex justify-center gap-1 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">VISA</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">MC</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">AMEX</span>
                  </div>
                </button>
              </div>
            </div>

            {/* iyzico Kart Formu - Sadece iyzico seçiliyse göster */}
            {paymentMethod === 'iyzico' && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Kredi Kartı Bilgileri
              </h2>

              <div className="space-y-4">
                {/* Kart Sahibi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kart Üzerindeki İsim
                  </label>
                  <input
                    type="text"
                    value={cardInfo.cardHolderName}
                    onChange={(e) => setCardInfo({ ...cardInfo, cardHolderName: e.target.value.toUpperCase() })}
                    placeholder="AD SOYAD"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Kart Numarası */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kart Numarası
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardInfo.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-16"
                    />
                    {cardType && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {cardType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Son Kullanma ve CVV */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ay
                    </label>
                    <select
                      value={cardInfo.expireMonth}
                      onChange={(e) => setCardInfo({ ...cardInfo, expireMonth: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">AA</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m.toString().padStart(2, '0')}>
                          {m.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yıl
                    </label>
                    <select
                      value={cardInfo.expireYear}
                      onChange={(e) => setCardInfo({ ...cardInfo, expireYear: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">YY</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                        <option key={y} value={y.toString().slice(-2)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardInfo.cvc}
                      onChange={(e) => setCardInfo({ ...cardInfo, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="***"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Taksit Seçenekleri */}
                {installments.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taksit Seçenekleri
                    </label>
                    <div className="space-y-2">
                      {installments.map((inst) => (
                        <label
                          key={inst.installmentNumber}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedInstallment === inst.installmentNumber
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="installment"
                              value={inst.installmentNumber}
                              checked={selectedInstallment === inst.installmentNumber}
                              onChange={() => setSelectedInstallment(inst.installmentNumber)}
                              className="text-primary focus:ring-primary"
                            />
                            <span className="text-sm">
                              {inst.installmentNumber === 1 ? 'Tek Çekim' : `${inst.installmentNumber} Taksit`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">{Number(inst.totalPrice).toFixed(2)} ₺</span>
                            {inst.installmentNumber > 1 && (
                              <span className="text-xs text-gray-500 block">
                                {inst.installmentNumber} x {Number(inst.installmentPrice).toFixed(2)} ₺
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Stripe Bilgi Mesajı - Sadece Stripe seçiliyse göster */}
            {paymentMethod === 'stripe' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Stripe ile Güvenli Ödeme</h3>
                    <p className="text-sm text-blue-800">
                      "Öde" butonuna tıkladığınızda Stripe'ın güvenli ödeme sayfasına yönlendirileceksiniz. 
                      Kart bilgilerinizi orada güvenle girebilirsiniz.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">256-bit SSL</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">PCI DSS Uyumlu</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">3D Secure</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Ödeme Butonu */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('checkout_button_loading')}
                </span>
              ) : (
                <>
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {planDetails.price} ₺ Öde
                  </span>
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t('checkout_secure_payment')}
            </p>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t('checkout_loading')}</p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => router.push('/fiyatlandirma')}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            {t('checkout_back_button')}
          </button>
        </div>
      </div>
    </div>
  );
}
