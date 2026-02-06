'use client';

import React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { recordError } from '@/lib/otel';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

const Error: React.FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    // Record exception in OTel for SigNoz tracking
    recordError('route-error-boundary', error, { boundary: 'route' });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">Hata</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Bir Şeyler Yanlış Gitti</h2>
        <p className="text-gray-600 mb-8">Üzgünüz, bir hata oluştu. Lütfen tekrar deneyin.</p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
          >
            Tekrar Dene
          </button>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-red-600 bg-white border-red-600 hover:bg-red-50 transition-colors duration-200"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Error; 