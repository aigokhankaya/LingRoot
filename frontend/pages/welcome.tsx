'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { processTts, submitContent, getContentHistory, ProcessInputData } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';
import InputSection from '../src/components/InputSection';
import OutputSection from '../src/components/OutputSection';
import Footer from '../src/components/Footer';

interface InputData {
  type: ProcessInputData['type'];
  text?: string;
  input?: string;
  file?: File;
  level: string;
  SesHızı?: number;
  voice?: string;
  chapter?: string;
}

interface AudioResult {
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
}

interface ContentHistoryItem {
  id: string;
  input: string;
  type: string;
  level: string;
  mp3_url: string;
  created_at: string;
}

const Welcome: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const handleSubmit = async (inputData: InputData) => {
    setIsLoading(true);
    setError(null);
    try {
      const processInput: ProcessInputData = {
        type: inputData.type,
        text: inputData.text,
        input: inputData.input,
        file: inputData.file,
        level: inputData.level,
        SesHızı: inputData.SesHızı,
        voice: inputData.voice,
        chapter: (inputData as any).chapter,
      };
      const result = await processTts(processInput);
      if (result && result.mp3_url) {
        setAudioResult({
          message: result.message || t('audio_generated_success'),
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: inputData.level
        });
        const input = inputData.type === 'text' ? inputData.text : inputData.input;
        await submitContent(input || '', inputData.type, inputData.level, result.mp3_url);
      } else {
        setError(result.message || t('audio_generation_failed'));
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      setError(error.message || t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.
      </main>
    );
  }

  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  // Örnek istatistikler (gerçek projede API'den alınır)
  const stats = {
    contentCreated: 12,
    totalLogins: 5,
    lastLogin: '2025-05-13 10:42',
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header ve Profil Butonu */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.svg" alt="LingRoot" width={32} height={32} />
          <span className="text-xl font-bold text-blue-700">LingRoot</span>
        </Link>
        {isAuthenticated && (
          <div className="relative">
            <button
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setProfileMenuOpen((v: boolean) => !v)}
            >
              <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full border-2 border-blue-200 object-cover" />
              <span className="font-medium text-gray-700">{displayName}</span>
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border">
                <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Profilim</Link>
                <Link href="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Ayarlar</Link>
                <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Panel</Link>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 border-t mt-2"
                >Çıkış Yap</button>
              </div>
            )}
          </div>
        )}
        {!isAuthenticated && (
          <div className="flex gap-2">
            <Link href="/login" className="btn-primary">Giriş Yap</Link>
            <Link href="/register" className="btn-secondary">Kayıt Ol</Link>
          </div>
        )}
      </header>

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 mb-6">
              {t('main_title')}
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t('main_description')}
            </p>
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
            {/* Ses Dönüşüm Input ve Output */}
            <InputSection onSubmit={handleSubmit} isLoading={isLoading} />
            <OutputSection 
              audioResult={audioResult} 
              isLoggedIn={isAuthenticated}
            />
          </div>
        </div>
      </main>

      <Footer />

      {showSuggestionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">İlgi Alanı Seç</h2>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 text-center">
              <select
                onChange={(e) => setSelectedInterest(e.target.value)}
                className="w-full border px-3 py-2 rounded mb-4"
                value={selectedInterest || ''}
              >
                <option value="" disabled>Bir ilgi alanı seçin...</option>
                {userInterests.map((interest: string) => (
                  <option key={interest} value={interest}>{interest}</option>
                ))}
              </select>
            </div>

            <button
              onClick={async () => {
                if (!selectedInterest) return;
                setIsSuggestionsLoading(true);
                const res = await fetch("/api/generate-suggestions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ interest: selectedInterest }),
                });
                const data = await res.json();
                setSuggestions(data);
                setIsSuggestionsLoading(false);
              }}
              className="btn-primary w-full mb-4"
            >
              Önerileri Getir
            </button>

            {isSuggestionsLoading && <p>Yükleniyor...</p>}

            {suggestions.map((s, idx) => (
              <div key={idx} className="border rounded p-3 mb-2 bg-gray-50">
                <h3 className="font-semibold text-blue-700">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.summary}</p>
              </div>
            ))}

            <button className="mt-4 text-sm text-gray-500 hover:underline" onClick={() => setShowSuggestionsModal(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Welcome; 