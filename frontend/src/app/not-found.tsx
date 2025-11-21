import React from 'react';
import Link from 'next/link';

interface NotFoundProps {}

const NotFound: React.FC<NotFoundProps> = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Sayfa Bulunamadı</h2>
        <p className="text-gray-600 mb-8">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors duration-200"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 