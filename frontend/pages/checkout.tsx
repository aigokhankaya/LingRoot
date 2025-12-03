import React, { useEffect, useState } from 'react';
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

export default function Checkout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const { plan: planId } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Plan | null>(null);

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
        // Plan ID'ye göre plan bul (monthly, yearly gibi)
        let selectedPlan = null;
        if (planId === 'monthly') {
          selectedPlan = plans.find((p: Plan) => p.interval === 'monthly' && p.name !== 'Free Trial');
        } else if (planId === 'yearly') {
          selectedPlan = plans.find((p: Plan) => p.interval === 'yearly');
        }
        setPlanDetails(selectedPlan);
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
    }
  };

  const handleCheckout = async () => {
    if (!planDetails) {
      setError(t('checkout_error_plan_not_found'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/subscriptions/create-checkout', {
        planId: planDetails.id
      });

      if (response.data.success && response.data.sessionUrl) {
        // Stripe checkout sayfasına yönlendir
        window.location.href = response.data.sessionUrl;
      } else {
        setError(response.data.message || t('checkout_error_session_failed'));
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.message || t('checkout_error_generic'));
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{t('checkout_title')} | LingRoot</title>
      </Head>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('checkout_title')}</h1>
          <p className="text-gray-600">{t('checkout_subtitle')}</p>
        </div>

        {planDetails ? (
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

            <div className="bg-primary/5 rounded-lg p-4 mb-6">
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
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('checkout_feature4')}
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                t('checkout_button')
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t('checkout_secure_payment')}
            </p>
          </div>
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
