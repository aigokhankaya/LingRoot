/**
 * 🎭 Onboarding Flow
 * 
 * "Kahramanın Yolculuğu" onboarding deneyimi.
 * - Archetype seçimi
 * - Liro ile seviye tespiti
 * - Hedef belirleme
 * - Yol haritası sunumu
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import LiroAvatar from '../LiroAvatar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

type OnboardingStep = 'welcome' | 'archetype' | 'assessment' | 'goal' | 'roadmap' | 'complete';

interface Archetype {
  code: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  focusAreas: string[];
  color: string;
}

const DEFAULT_ARCHETYPES: Archetype[] = [
  { code: 'career', name: 'Kariyer Mimarı', nameEn: 'Career Architect', icon: '🏰', description: 'İş dünyasında global bir lider olmak istiyorsun.', focusAreas: [], color: '#4F46E5' },
  { code: 'travel', name: 'Dünya Gezgini', nameEn: 'World Explorer', icon: '🌍', description: 'Sınır tanımadan dünyayı keşfetmek istiyorsun.', focusAreas: [], color: '#059669' },
  { code: 'intellectual', name: 'Entelektüel Bilge', nameEn: 'Intellectual Sage', icon: '🧠', description: 'Orijinal kaynaklardan beslenmek istiyorsun.', focusAreas: [], color: '#7C3AED' }
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  // Varsayılan verilerle başlat, böylece yükleme hatasında boş kalmaz
  const [archetypes, setArchetypes] = useState<Archetype[]>(DEFAULT_ARCHETYPES);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [assessedCEFR, setAssessedCEFR] = useState<string>('B1');
  const [targetCEFR, setTargetCEFR] = useState<string>('C1');
  const [dailyMinutes, setDailyMinutes] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string, content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Archetype'ları yükle (API'den güncel veriyi almaya çalış)
  useEffect(() => {
    fetchArchetypes();
  }, []);

  // Chat scroll ve focus
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Yükleme bitince input'a focus ver
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [chatMessages, isLoading]);

  const fetchArchetypes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return; // Token yoksa varsayılanlarla devam et

      const response = await fetch(`${API_BASE}/api/gamification/onboarding/archetypes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      // Sadece geçerli, dolu veri gelirse state'i güncelle
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setArchetypes(data.data);
      }
    } catch (error) {
      console.error('Archetypes fetch error:', error);
      // Hata durumunda state zaten DEFAULT_ARCHETYPES olduğu için bir şey yapmaya gerek yok
    }
  };

  const handleArchetypeSelect = (archetype: Archetype) => {
    setSelectedArchetype(archetype);
    // Konfeti efekti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: [archetype.color, '#ffffff']
    });
  };

  const startAssessment = () => {
    setStep('assessment');
    // Liro'nun ilk mesajı
    setChatMessages([
      {
        role: 'assistant',
        content: `Harika bir seçim, ${selectedArchetype?.name}! 🎉\n\nBen Liro. Senin için **en doğru yol haritasını** hazırlayabilmem için İngilizce seviyeni anlamam gerekiyor.\n\nBana İngilizce ile ilgili deneyimlerinden kısaca bahseder misin? (Türkçe veya İngilizce yazabilirsin)`
      }
    ]);
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', content: userInput }];
    setChatMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    const userMsgCount = newMessages.filter(m => m.role === 'user').length;

    // 3 mesajdan sonra seviye belirle
    if (userMsgCount >= 3) {
      // Timeout ile API çağrısı (5 saniye)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/gamification/onboarding/assess`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages: newMessages }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data.success && data.data?.cefr) {
          setAssessedCEFR(data.data.cefr);
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Teşekkürler, seni tanıdım! 🌟\n\n${data.data.analysis || 'Değerlendirme tamamlandı.'}\n\nSeviyen: **${data.data.cefr}**\n\nŞimdi hedefini belirleyelim!`
          }]);
          setTimeout(() => {
            setStep('goal');
            setIsLoading(false);
          }, 2000);
          return;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Assessment error:', error);
      }

      // Fallback (API hatası veya success=false)
      setAssessedCEFR('B1');
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Anlattıklarından yola çıkarak senin için **B1 (Orta)** seviyesini öneriyorum. 👍\n\nŞimdi hedefini belirleyelim!`
      }]);
      setTimeout(() => {
        setStep('goal');
        setIsLoading(false);
      }, 2000);
      return;
    }

    // Devam mesajları (ilk 2 mesaj için)
    const followUpMessages = [
      "Anladım. Peki günlük hayatta İngilizce'ye ne kadar maruz kalıyorsun? (İş, sosyal medya, diziler vb.)",
      "Süper. Son olarak, şu ana kadar İngilizce öğrenirken en çok zorlandığın şey ne oldu?",
    ];

    if (userMsgCount <= followUpMessages.length) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: followUpMessages[userMsgCount - 1]
        }]);
        setIsLoading(false);
      }, 1000);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Token yoksa veya boşsa, kullanıcıyı bilgilendir ve devam et
      if (!token || token.length < 10) {
        console.warn('Token bulunamadı, demo mod ile devam ediliyor');
        localStorage.setItem('onboarding_completed', 'true');
        setStep('complete');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => onComplete(), 3000);
        return;
      }

      const response = await fetch(`${API_BASE}/api/gamification/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          archetype: selectedArchetype?.code,
          assessedCEFR,
          targetCEFR,
          weeklyMinutes: dailyMinutes * 7 // Günlük değeri haftalığa çevir
        })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('onboarding_completed', 'true');
        setStep('complete');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => onComplete(), 4000);
      } else {
        // API başarısız olsa bile devam et
        console.warn('API başarısız, demo mod ile devam');
        localStorage.setItem('onboarding_completed', 'true');
        setStep('complete');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => onComplete(), 3000);
      }
    } catch (error) {
      console.error('Complete onboarding error:', error);
      // Hata durumunda da devam et
      localStorage.setItem('onboarding_completed', 'true');
      setStep('complete');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => onComplete(), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const targetOptions = cefrLevels.filter(level => cefrLevels.indexOf(level) > cefrLevels.indexOf(assessedCEFR));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-white/95 backdrop-blur-2xl overflow-hidden animate-fade-in text-slate-800">
      {/* Progress indicator */}
      <div className="absolute top-10 flex gap-3">
        {['welcome', 'archetype', 'assessment', 'goal', 'complete'].map((s, i) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 
                            ${step === s ? 'bg-teal-600 scale-125' : ''} 
                            ${['welcome', 'archetype', 'assessment', 'goal', 'complete'].indexOf(step) > i ? 'bg-emerald-400' : 'bg-slate-200'}
                        `}
          />
        ))}
      </div>

      {/* Welcome Step */}
      {step === 'welcome' && (
        <div className="w-full max-w-2xl text-center relative animate-fade-in">
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse" />
          <h1 className="text-5xl font-extrabold text-slate-800 mb-6 leading-tight">
            Her dil yeni bir <span className="bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent">dünyadır.</span>
          </h1>
          <p className="text-xl text-slate-500 mb-12 font-medium">
            Bugün hangi dünyanın kapısını aralamak istiyorsun?
          </p>
          <button
            className="px-12 py-5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-teal-200 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
            onClick={() => setStep('archetype')}
          >
            Yolculuğa Başla
          </button>
        </div>
      )}

      {/* Archetype Selection */}
      {step === 'archetype' && (
        <div className="w-full max-w-4xl text-center animate-fade-in">
          <h2 className="text-4xl font-extrabold text-slate-800 mb-2">Sen kimsin?</h2>
          <p className="text-lg text-slate-500 mb-10">Hedefine en uygun yolu seçeceğiz.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {archetypes.map((arch) => (
              <div
                key={arch.code}
                className={`
                                    relative p-8 rounded-3xl border-2 cursor-pointer transition-all duration-300
                                    ${selectedArchetype?.code === arch.code
                    ? 'bg-teal-50 border-teal-500 shadow-xl scale-105'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1'}
                                `}
                onClick={() => handleArchetypeSelect(arch)}
              >
                <div className="text-6xl mb-4 transform transition-transform duration-300 hover:scale-110">{arch.icon}</div>
                <h3 className={`text-xl font-bold mb-3 ${selectedArchetype?.code === arch.code ? 'text-teal-700' : 'text-slate-800'}`}>
                  {arch.name}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {arch.description}
                </p>
                {selectedArchetype?.code === arch.code && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold animate-zoom-in">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className={`
                            px-12 py-4 rounded-xl text-lg font-bold transition-all duration-300
                            ${selectedArchetype
                ? 'bg-slate-800 text-white shadow-lg hover:bg-slate-900 hover:-translate-y-1'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                        `}
            disabled={!selectedArchetype}
            onClick={startAssessment}
          >
            Devam Et
          </button>
        </div>
      )}

      {/* Assessment Chat */}
      {step === 'assessment' && (
        <div className="w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up">
          <div className="flex items-center gap-4 p-5 bg-slate-50 border-b border-slate-100">
            <LiroAvatar className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="font-bold text-slate-800">Liro</span>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Seninle konuşuyor...
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                                    max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                                    ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}
                                `}>
                  {msg.role === 'user' ? msg.content : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              placeholder="Mesajını yaz..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              autoFocus
            />
            <button
              className={`
                                w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all duration-300
                                ${userInput.trim() && !isLoading
                  ? 'bg-teal-500 text-white shadow-lg hover:bg-teal-600 hover:scale-105'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
                            `}
              onClick={sendMessage}
              disabled={isLoading || !userInput.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Goal Setting */}
      {step === 'goal' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-100 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-center text-slate-800 mb-10">Hedefini Belirle</h2>

          <div className="mb-8">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Mevcut Seviyen</span>
            <div className="inline-block px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-3xl font-extrabold rounded-2xl shadow-lg shadow-teal-200">
              {assessedCEFR}
            </div>
          </div>

          <div className="mb-8">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Hedef Seviyen</span>
            <div className="flex flex-wrap gap-3">
              {targetOptions.map(level => (
                <button
                  key={level}
                  className={`
                                        px-6 py-3 rounded-xl text-lg font-bold border-2 transition-all duration-200
                                        ${targetCEFR === level
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                                    `}
                  onClick={() => setTargetCEFR(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Günlük Çalışma Süren</span>
            <div className="flex flex-wrap gap-3">
              {[10, 20, 30, 45].map(mins => (
                <button
                  key={mins}
                  className={`
                                        px-6 py-3 rounded-xl font-bold border-2 transition-all duration-200
                                        ${dailyMinutes === mins
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                                    `}
                  onClick={() => setDailyMinutes(mins)}
                >
                  {mins} dk
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full py-5 bg-slate-800 text-white rounded-2xl text-xl font-bold shadow-xl hover:bg-slate-900 hover:scale-[1.01] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={completeOnboarding}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Yol haritanız hazırlanıyor...</span>
              </div>
            ) : 'Yolculuğu Başlat!'}
          </button>
        </div>
      )}

      {/* Complete */}
      {step === 'complete' && (
        <div className="text-center animate-bounce-in">
          <div className="text-8xl mb-6 animate-pulse">🚀</div>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Yolculuğun Başladı!</h1>
          <p className="text-xl text-slate-500 mb-8 max-w-lg mx-auto leading-relaxed">
            <span className="font-bold text-teal-600">{selectedArchetype?.name}</span> olarak, <span className="font-bold text-slate-800">{assessedCEFR}</span> seviyesinden <span className="font-bold text-slate-800">{targetCEFR}</span> seviyesine uzanan kişisel yol haritan hazırlandı.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-100 rounded-full text-slate-500 font-medium text-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            Yönlendiriliyorsun...
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;
