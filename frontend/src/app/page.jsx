'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/auth";
import { processTts, submitContent, getContentHistory } from '../lib/api';
import Header from '../components/Header';
import InputSection from '../components/InputSection';
import OutputSection from '../components/OutputSection';
import Footer from '../components/Footer';
import { useTranslation } from '@/lib/i18n';

const Page: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [audioResult, setAudioResult] = useState(null);
  const [contentHistory, setContentHistory] = useState([]);
  const [error, setError] = useState(null);

  // Fetch content history when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchContentHistory();
    }
  }, [isAuthenticated]);

  // Fetch content history
  const fetchContentHistory = async () => {
    try {
      const response = await getContentHistory();
      if (response.success) {
        setContentHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching content history:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (inputData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Doğru fonksiyon: processTts
      const result = await processTts(inputData);
      if (result && result.mp3_url) {
        setAudioResult({
          message: result.message || t('audio_generated_success'),
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: inputData.level
        });
        // Log content to history
        const input = inputData.type === 'text' ? inputData.text : inputData.input;
        await submitContent(input, inputData.type, inputData.level, result.mp3_url);
        if (isAuthenticated) {
          fetchContentHistory();
        }
      } else {
        setError(result.message || t('audio_generation_failed'));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setError(error.message || t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Header />
      
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 mb-6">
              {t('main_title')}
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t('main_description')}
            </p>
            
            {!isAuthenticated && (
              <div className="mt-8 flex justify-center gap-4">
                <a 
                  href="/register" 
                  className="btn-primary flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>{t('register_now')}</span>
                </a>
                <a 
                  href="/how-it-works" 
                  className="btn bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('how_it_works')}</span>
                </a>
              </div>
            )}
          </div>
          
          {error && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          <div className="mt-12 space-y-12">
            <InputSection onSubmit={handleSubmit} isLoading={isLoading} />
            <OutputSection 
              audioResult={audioResult} 
              isLoggedIn={isAuthenticated}
              contentHistory={contentHistory}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Page;
