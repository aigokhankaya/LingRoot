import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from '../../src/lib/i18n';

export default function CheckoutResult() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status, transactionId, message } = router.query;
  const [countdown, setCountdown] = useState(5);

  const isSuccess = status === 'success';

  useEffect(() => {
    if (isSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{isSuccess ? 'Ödeme Başarılı' : 'Ödeme Başarısız'} | LingRoot</title>
      </Head>

      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {isSuccess ? (
            <>
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ödeme Başarılı!
              </h1>
              
              <p className="text-gray-600 mb-6">
                Premium üyeliğiniz aktif edildi. Artık tüm özelliklere erişebilirsiniz.
              </p>

              {transactionId && (
                <p className="text-sm text-gray-500 mb-4">
                  İşlem No: <span className="font-mono">{transactionId}</span>
                </p>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  {countdown} saniye içinde yönlendirileceksiniz...
                </p>
              </div>

              <Link
                href="/dashboard"
                className="inline-block w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200"
              >
                Dashboard'a Git
              </Link>
            </>
          ) : (
            <>
              {/* Error Icon */}
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ödeme Başarısız
              </h1>
              
              <p className="text-gray-600 mb-4">
                Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.
              </p>

              {message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800">
                    {decodeURIComponent(message as string).replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/checkout"
                  className="inline-block w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200"
                >
                  Tekrar Dene
                </Link>
                
                <Link
                  href="/fiyatlandirma"
                  className="inline-block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Paketlere Dön
                </Link>
              </div>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Sorun yaşıyorsanız <Link href="/destek" className="text-primary hover:underline">destek ekibimizle</Link> iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
