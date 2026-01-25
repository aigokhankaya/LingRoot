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
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';
import LiroAvatar from '../LiroAvatar';
import SectorSelector from './SectorSelector';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

type OnboardingStep = 'welcome' | 'archetype' | 'sector' | 'sector_goals' | 'assessment' | 'level_confirm' | 'goal' | 'roadmap' | 'complete';

interface SectorGoals {
  vocabularyGoal: number;  // Aylık kelime hedefi
  contentGoal: number;     // Haftalık içerik hedefi
  dailyMinutes: number;    // Günlük sektör çalışması (dk)
}

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

// İlgi alanı kategorisi
interface InterestCategory {
  code: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
}

// Dünya Gezgini için seyahat kategorileri
const TRAVEL_CATEGORIES: InterestCategory[] = [
  { code: 'airport', name: 'Havaalanı & Uçuş', nameEn: 'Airport & Flight', icon: '✈️', description: 'Check-in, güvenlik, pasaport kontrolü' },
  { code: 'accommodation', name: 'Otel & Konaklama', nameEn: 'Hotel & Accommodation', icon: '🏨', description: 'Rezervasyon, oda servisi, şikayetler' },
  { code: 'airbnb', name: 'Airbnb & Ev Kiralama', nameEn: 'Airbnb & Rentals', icon: '🏡', description: 'Ev sahibiyle iletişim, kurallar' },
  { code: 'transportation', name: 'Şehir İçi Ulaşım', nameEn: 'Public Transport', icon: '🚇', description: 'Metro, otobüs, bilet sistemleri' },
  { code: 'taxi', name: 'Taksi & Ulaşım Apps', nameEn: 'Taxi & Ride Apps', icon: '🚖', description: 'Uber, pazarlık, yol tarifi' },
  { code: 'car_rental', name: 'Araç Kiralama & Sürüş', nameEn: 'Car Rental & Driving', icon: '🚗', description: 'Kiralama şartları, trafik kuralları' },
  { code: 'dining', name: 'Restoran & Yemek', nameEn: 'Restaurant & Dining', icon: '🍽️', description: 'Sipariş, menü, alerjenler, hesap' },
  { code: 'street_food', name: 'Sokak Lezzetleri', nameEn: 'Street Food', icon: '🌮', description: 'Yerel tatlar, gıda pazarları' },
  { code: 'cafe', name: 'Kafe Kültürü', nameEn: 'Cafe Culture', icon: '☕', description: 'Kahve çeşitleri, dijital göçmenlik' },
  { code: 'shopping', name: 'Alışveriş & Pazarlık', nameEn: 'Shopping', icon: '🛍️', description: 'İade, beden, tax-free, pazarlık' },
  { code: 'luxury', name: 'Lüks & Gurme', nameEn: 'Luxury & Gourmet', icon: '💎', description: 'Fine dining, concierge hizmetleri' },
  { code: 'nightlife', name: 'Gece Hayatı', nameEn: 'Nightlife', icon: '🍸', description: 'Bar, kulüp, sosyalleşme' },
  { code: 'social', name: 'Tanışma & Small Talk', nameEn: 'Meeting Locals', icon: '🤝', description: 'Yerlilerle sohbet, arkadaşlık' },
  { code: 'museums', name: 'Müze & Sanat', nameEn: 'Museums & Art', icon: '🖼️', description: 'Sergiler, rehberli turlar' },
  { code: 'landmarks', name: 'Tarihi Yerler', nameEn: 'Historical Landmarks', icon: '🏛️', description: 'Tarihçe, efsaneler, kurallar' },
  { code: 'nature', name: 'Doğa & Trekking', nameEn: 'Nature & Hiking', icon: '🌲', description: 'Yürüyüş rotaları, kamp alanları' },
  { code: 'beach', name: 'Plaj & Deniz', nameEn: 'Beach & Sea', icon: '🏖️', description: 'Su sporları, güvenlik, güneş' },
  { code: 'winter_sports', name: 'Kış Sporları', nameEn: 'Winter Sports', icon: '🏂', description: 'Kayak, ekipman kiralama' },
  { code: 'emergency', name: 'Acil Durumlar & Polis', nameEn: 'Emergencies', icon: '🚨', description: 'Kayıp eşya, hırsızlık, yardım' },
  { code: 'health', name: 'Sağlık & Eczane', nameEn: 'Health & Pharmacy', icon: '💊', description: 'Semptom anlatma, ilaç alma' },
  { code: 'wellness', name: 'Wellness & Spa', nameEn: 'Wellness & Spa', icon: '🧘', description: 'Masaj, yoga, rahatlama' },
  { code: 'connectivity', name: 'İnternet & Teknoloji', nameEn: 'Tech & Connectivity', icon: '📱', description: 'Sim kart, Wi-Fi, adaptör' },
  { code: 'banking', name: 'Para & Döviz', nameEn: 'Money & Exchange', icon: '💱', description: 'ATM, döviz bürosu, komisyon' },
  { code: 'visa', name: 'Vize & Göçmenlik', nameEn: 'Visa & Immigration', icon: '🛂', description: 'Sınır kontrolü, evraklar' },
  { code: 'festivals', name: 'Festival & Etkinlik', nameEn: 'Festivals & Events', icon: '🎉', description: 'Konser, yerel kutlamalar' },
  { code: 'digital_nomad', name: 'Dijital Göçmenlik', nameEn: 'Digital Nomad', icon: '💻', description: 'Co-working, networking' },
  { code: 'solo_travel', name: 'Solo Seyahat', nameEn: 'Solo Travel', icon: '🎒', description: 'Güvenlik, hosteller, tavsiyeler' },
  { code: 'cruise', name: 'Kruvaziyer & Gemi', nameEn: 'Cruise & Ship', icon: '🚢', description: 'Gemi yaşamı, liman turları' },
  { code: 'photography', name: 'Fotoğrafçılık', nameEn: 'Photography', icon: '📸', description: 'İzin isteme, ekipman, noktalar' },
  { code: 'sustainable', name: 'Ekolojik Seyahat', nameEn: 'Eco Travel', icon: '♻️', description: 'Sürdürülebilirlik, yerel destek' },
];

// Entelektüel Bilge için konu kategorileri
const INTELLECTUAL_CATEGORIES: InterestCategory[] = [
  { code: 'ai_tech', name: 'Yapay Zeka & Gelecek', nameEn: 'AI & Futurism', icon: '🤖', description: 'Machine learning, etik, singularite' },
  { code: 'philosophy', name: 'Felsefe & Düşünce', nameEn: 'Philosophy', icon: '🤔', description: 'Stoacılık, varoluşçuluk, etik' },
  { code: 'psychology', name: 'Psikoloji & Zihin', nameEn: 'Psychology', icon: '🧠', description: 'Davranış bilimi, kognitif önyargılar' },
  { code: 'sociology', name: 'Sosyoloji & Toplum', nameEn: 'Sociology', icon: '👥', description: 'Toplumsal dinamikler, kültürler' },
  { code: 'anthropology', name: 'Antropoloji', nameEn: 'Anthropology', icon: '🦴', description: 'İnsanlık tarihi, evrim, kabileler' },
  { code: 'history', name: 'Dünya Tarihi', nameEn: 'World History', icon: '📜', description: 'Savaşlar, imparatorluklar, devrimler' },
  { code: 'ancient', name: 'Antik Uygarlıklar', nameEn: 'Ancient Civilizations', icon: '🏺', description: 'Mısır, Roma, Yunan, Mezopotamya' },
  { code: 'geopolitics', name: 'Jeopolitik & Strateji', nameEn: 'Geopolitics', icon: '🌐', description: 'Uluslararası ilişkiler, güç dengeleri' },
  { code: 'economics', name: 'Ekonomi & Finans', nameEn: 'Economics', icon: '📈', description: 'Makroekonomi, piyasalar, kripto' },
  { code: 'business', name: 'İş Dünyası & İnovasyon', nameEn: 'Business & Innovation', icon: '💼', description: 'Startuplar, liderlik, strateji' },
  { code: 'literature', name: 'Klasik Edebiyat', nameEn: 'Classic Literature', icon: '📖', description: 'Dostoyevski, Orwell, Austen' },
  { code: 'cinema', name: 'Sinema & Film Teorisi', nameEn: 'Cinema Theory', icon: '🎬', description: 'Yönetmen sineması, senaryo, analiz' },
  { code: 'art_history', name: 'Sanat Tarihi', nameEn: 'Art History', icon: '🎨', description: 'Rönesans, modernizm, akımlar' },
  { code: 'architecture', name: 'Mimari & Tasarım', nameEn: 'Architecture', icon: '🏗️', description: 'Şehir planlama, estetik, yapılar' },
  { code: 'music_theory', name: 'Müzik & Opera', nameEn: 'Music & Opera', icon: '🎼', description: 'Klasik batı müziği, caz, teori' },
  { code: 'quantum', name: 'Kuantum & Fizik', nameEn: 'Quantum Physics', icon: '⚛️', description: 'Evrenin kuralları, atom altı' },
  { code: 'neuroscience', name: 'Sinirbilim', nameEn: 'Neuroscience', icon: '🧬', description: 'Beyin plastisitesi, nöronlar' },
  { code: 'climate', name: 'Ekoloji & İklim', nameEn: 'Ecology & Climate', icon: '🌱', description: 'Sürdürülebilirlik, yeşil enerji' },
  { code: 'space', name: 'Uzay & Astronomi', nameEn: 'Space & Astronomy', icon: '🔭', description: 'Kara delikler, Mars kolonizasyonu' },
  { code: 'cybersecurity', name: 'Siber Güvenlik', nameEn: 'Cybersecurity', icon: '🔒', description: 'Hacker kültürü, kriptografi, gizlilik' },
  { code: 'law', name: 'Hukuk & Adalet', nameEn: 'Law & Justice', icon: '⚖️', description: 'İnsan hakları, uluslararası hukuk' },
  { code: 'mythology', name: 'Mitoloji & Efsaneler', nameEn: 'Mythology', icon: '🐉', description: 'Yunan, İskandinav, Türk mitolojisi' },
  { code: 'gastronomy', name: 'Gastronomi Kültürü', nameEn: 'Gastronomy', icon: '🍷', description: 'Dünya mutfakları, şarap, tarih' },
  { code: 'fashion', name: 'Moda Tarihi', nameEn: 'Fashion History', icon: '👗', description: 'Trendler, haute couture, markalar' },
  { code: 'spirituality', name: 'Spiritüalite & Farkındalık', nameEn: 'Spirituality', icon: '🧘‍♂️', description: 'Meditasyon, doğu felsefeleri' },
  { code: 'game_theory', name: 'Oyun Teorisi', nameEn: 'Game Theory', icon: '♟️', description: 'Stratejik karar alma, olasılık' },
  { code: 'linguistics', name: 'Dilbilim', nameEn: 'Linguistics', icon: '🗣️', description: 'Dilin kökeni, etimoloji, fonetik' },
  { code: 'biographies', name: 'Biyografiler', nameEn: 'Biographies', icon: '🧔', description: 'Tarihe yön veren liderler' },
  { code: 'education', name: 'Eğitim Bilimleri', nameEn: 'Education', icon: '🎓', description: 'Öğrenme psikolojisi, pedagoji' },
  { code: 'journalism', name: 'Gazetecilik & Medya', nameEn: 'Journalism', icon: '📰', description: 'Medya okuryazarlığı, habercilik' },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  // Varsayılan verilerle başlat, böylece yükleme hatasında boş kalmaz
  const [archetypes, setArchetypes] = useState<Archetype[]>(DEFAULT_ARCHETYPES);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<number[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]); // travel/intellectual kategorileri için
  const [assessedCEFR, setAssessedCEFR] = useState<string>('B1');
  const [targetCEFR, setTargetCEFR] = useState<string>('C1');
  const [dailyMinutes, setDailyMinutes] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string, content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [positionInfo, setPositionInfo] = useState<{
    jobPosition: string;
    jobPositionEn?: string;
    yearsExperience?: number;
    companyName?: string;
    companySize?: string;
  }>({ jobPosition: '' });
  const [sectorGoals, setSectorGoals] = useState<SectorGoals>({
    vocabularyGoal: 50,   // Varsayılan: 50 kelime/ay
    contentGoal: 5,       // Varsayılan: 5 içerik/hafta
    dailyMinutes: 15      // Varsayılan: 15 dk/gün
  });
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
      const token = localStorage.getItem('lingroot_token');
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
    // Arketip değiştiğinde önceki seçimleri temizle
    setSelectedInterests([]);
    setSelectedSectors([]);
    // Konfeti efekti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: [archetype.color, '#ffffff']
    });
  };

  // Arketipe göre sektör başlıkları ve açıklamaları
  const sectorContextByArchetype: Record<string, { title: string; subtitle: string; isRequired: boolean }> = {
    career: {
      title: 'Hangi sektörde çalışıyorsun?',
      subtitle: 'Sana özel profesyonel içerikler hazırlayacağız.',
      isRequired: true
    },
    travel: {
      title: 'Seyahatlerinde hangi sektörlerle iletişim kuruyorsun?',
      subtitle: 'Otel, havayolu, turizm gibi alanlarda İngilizce pratiği yapmana yardımcı olacağız.',
      isRequired: false
    },
    intellectual: {
      title: 'Hangi alanlarda derinleşmek istiyorsun?',
      subtitle: 'Akademik ve profesyonel terminoloji ile içerikler sunacağız.',
      isRequired: false
    }
  };

  // Arketipe göre önerilen sektörler
  const suggestedSectorsByArchetype: Record<string, string[]> = {
    career: ['it_software', 'finance', 'marketing', 'healthcare', 'engineering'],
    travel: ['tourism', 'aviation', 'retail', 'hr', 'real_estate'],
    intellectual: ['education', 'legal', 'engineering', 'healthcare', 'finance']
  };

  // Archetype seçimi sonrası yönlendirme - ARTIK HERKES SEKTÖR GÖREBİLİR
  const afterArchetypeSelect = () => {
    // Tüm arketipler için sektör seçimi göster
    setStep('sector');
  };

  const afterSectorSelect = () => {
    startAssessment();
  };

  const startAssessment = () => {
    setStep('assessment');

    // Arketipe göre özel mesaj oluştur
    let contextNote = '';
    if (selectedArchetype?.code === 'career' && selectedSectors.length > 0) {
      contextNote = '\n\nSeçtiğin sektöre özel profesyonel içerikler hazırlayacağım!';
    } else if (selectedArchetype?.code === 'travel' && selectedInterests.length > 0) {
      contextNote = '\n\nSeçtiğin seyahat konularında pratik yapmanı sağlayacak içerikler hazırlayacağım!';
    } else if (selectedArchetype?.code === 'intellectual' && selectedInterests.length > 0) {
      contextNote = '\n\nSeçtiğin entelektüel konularda derinlemesine içerikler hazırlayacağım!';
    }

    setChatMessages([
      {
        role: 'assistant',
        content: `Harika bir seçim, ${selectedArchetype?.name}! 🎉\n\nBen Liro. Senin için **en doğru yol haritasını** hazırlayabilmem için İngilizce seviyeni anlamam gerekiyor.${contextNote}\n\n📝 **Tell me about your English experience!**\n*When did you start learning? How do you use English in daily life?*\n\n💡 İngilizce yazarsan seviyeni daha doğru belirleyebilirim, ama Türkçe de yazabilirsin.`
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
        const token = localStorage.getItem('lingroot_token');
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
            content: `Teşekkürler, seni tanıdım! 🌟\n\n${data.data.analysis || 'Değerlendirme tamamlandı.'}\n\n📊 **Tahminim: ${data.data.cefr} seviyesi**\n\nBu seviye sana doğru geliyor mu?`
          }]);
          setTimeout(() => {
            setStep('level_confirm');
            setIsLoading(false);
          }, 2000);
          return;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Assessment error:', error);
      }

      // Fallback (API hatası veya success=false) - A1 başlangıç seviyesi (en güvenli)
      setAssessedCEFR('A1');
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Şu an için senin seviyeni tam belirleyemedim. 📚\n\n📊 **Önerim: A1 (Başlangıç) seviyesi**\n\nBu seviye sana doğru geliyor mu? Farklı hissediyorsan aşağıdan değiştirebilirsin.`
      }]);
      setTimeout(() => {
        setStep('level_confirm');
        setIsLoading(false);
      }, 2000);
      return;
    }

    // Devam mesajları (ilk 2 mesaj için) - İngilizce yazmayı teşvik et
    const followUpMessages = [
      "Anladım. 🎧 Peki günlük hayatta İngilizce'ye ne kadar maruz kalıyorsun? (İş, sosyal medya, diziler vb.)\n\n💡 İstersen bu soruyu İngilizce cevaplayabilirsin, seviyeni daha iyi anlamamı sağlar!",
      "Harika! 📝 Son olarak, şu ana kadar İngilizce öğrenirken en çok zorlandığın şey ne oldu?\n\n*Try answering in English if you can - even a few sentences help me understand your level better!* 🌟",
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
      const token = localStorage.getItem('lingroot_token');

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
          weeklyMinutes: dailyMinutes * 7, // Günlük değeri haftalığa çevir
          sectors: selectedSectors, // Seçilen sektörler (career için)
          interests: selectedInterests, // Seçilen ilgi alanları (travel/intellectual için)
          positionInfo: positionInfo.jobPosition ? positionInfo : undefined, // Pozisyon bilgisi (varsa)
          sectorGoals: selectedSectors.length > 0 ? sectorGoals : undefined // Sektör hedefleri (sektör seçildiyse)
        })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('onboarding_completed', 'true');
        setStep('complete');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        // Kullanıcı butona tıklayarak yönlendirilecek
      } else {
        // API başarısız olsa bile devam et
        console.warn('API başarısız, demo mod ile devam');
        localStorage.setItem('onboarding_completed', 'true');
        setStep('complete');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (error) {
      console.error('Complete onboarding error:', error);
      // Hata durumunda da devam et
      localStorage.setItem('onboarding_completed', 'true');
      setStep('complete');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
        {['welcome', 'archetype', 'sector', 'sector_goals', 'assessment', 'goal', 'complete'].map((s, i) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300
                        ${step === s ? 'bg-teal-600 scale-125' : ''}
                        ${['welcome', 'archetype', 'sector', 'sector_goals', 'assessment', 'goal', 'complete'].indexOf(step) > i ? 'bg-emerald-400' : 'bg-slate-200'}
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
          <p className="text-xl text-slate-500 mb-4 font-medium">
            Bugün hangi dünyanın kapısını aralamak istiyorsun?
          </p>

          {/* Yol Haritası Açıklaması */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-5 mb-8 mx-auto max-w-lg border border-teal-100">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🗺️</span>
              <span className="font-bold text-teal-700">Kişisel Yol Haritası Oluştur</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Birkaç soru ile seviyeni belirle, hedeflerini seç.
              <br />
              <span className="text-teal-600 font-medium">Sana özel haftalık öğrenme planı</span> hazırlayalım!
            </p>
          </div>

          <button
            className="px-8 py-3 bg-teal-500 text-white rounded-lg font-semibold shadow-md shadow-teal-500/20 hover:bg-teal-600 transition-all"
            onClick={() => setStep('archetype')}
          >
            Yol Haritamı Oluştur
          </button>

          {/* Daha Sonra Hatırlat */}
          <div className="mt-6">
            <button
              className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
              onClick={() => {
                // localStorage'a "daha sonra hatırlat" flag'i kaydet
                localStorage.setItem('onboarding_remind_later', new Date().toISOString());
                onComplete();
              }}
            >
              Daha sonra hatırlat →
            </button>
          </div>
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

          <div className="flex gap-3 justify-center w-full max-w-sm mx-auto">
            <button
              className="px-6 py-2.5 rounded-lg text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all font-medium text-sm"
              onClick={() => setStep('welcome')}
            >
              Geri
            </button>
            <button
              className={`
                px-8 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${selectedArchetype
                  ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              `}
              disabled={!selectedArchetype}
              onClick={afterArchetypeSelect}
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* Sector/Interest Selection - Arketipe göre farklı içerik */}
      {step === 'sector' && (
        <div className="w-full max-w-4xl h-[85vh] flex flex-col animate-fade-in">
          {/* Header - Sabit */}
          <div className="text-center flex-shrink-0 pb-4">
            <h2 className="text-4xl font-extrabold text-slate-800 mb-2">
              {selectedArchetype?.code === 'career' && 'Hangi sektörde çalışıyorsun?'}
              {selectedArchetype?.code === 'travel' && 'Seyahatlerinde hangi konularda pratik yapmak istiyorsun?'}
              {selectedArchetype?.code === 'intellectual' && 'Hangi konularda derinleşmek istiyorsun?'}
            </h2>
            <p className="text-lg text-slate-500">
              {selectedArchetype?.code === 'career' && 'Sana özel profesyonel içerikler hazırlayacağız.'}
              {selectedArchetype?.code === 'travel' && 'Seyahat İngilizcesi için en fazla 3 kategori seç.'}
              {selectedArchetype?.code === 'intellectual' && 'İlgi alanlarına göre derinlikli içerikler sunacağız.'}
            </p>
            <p className="text-sm text-teal-600 mt-2">
              {selectedArchetype?.code !== 'career' && `Seçili: ${selectedInterests.length}/3 (opsiyonel)`}
            </p>
          </div>

          {/* Scrollable Content - Arketipe göre farklı */}
          <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">

            {/* Career - Mevcut SectorSelector */}
            {selectedArchetype?.code === 'career' && (
              <SectorSelector
                selectedSectors={selectedSectors}
                onSelectionChange={setSelectedSectors}
                maxSelections={3}
                isRequired={true}
                showPositionForm={true}
                positionInfo={positionInfo}
                onPositionChange={setPositionInfo}
                suggestedSectorCodes={suggestedSectorsByArchetype['career']}
                archetypeCode="career"
              />
            )}

            {/* Travel & Intellectual - Kategori Grid */}
            {(selectedArchetype?.code === 'travel' || selectedArchetype?.code === 'intellectual') && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(selectedArchetype?.code === 'travel' ? TRAVEL_CATEGORIES : INTELLECTUAL_CATEGORIES).map((cat) => {
                  const isSelected = selectedInterests.includes(cat.code);
                  const isDisabled = !isSelected && selectedInterests.length >= 3;

                  return (
                    <button
                      key={cat.code}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedInterests(prev => prev.filter(c => c !== cat.code));
                        } else if (selectedInterests.length < 3) {
                          setSelectedInterests(prev => [...prev, cat.code]);
                        }
                      }}
                      disabled={isDisabled}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${isSelected
                          ? 'bg-teal-50 border-teal-500 shadow-md scale-[1.02]'
                          : isDisabled
                            ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}
                      `}
                    >
                      {/* Icon */}
                      <div className="text-3xl mb-2">{cat.icon}</div>

                      {/* Name */}
                      <h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                        {cat.name}
                      </h4>

                      {/* Description */}
                      <p className="text-xs text-slate-400 mt-1">{cat.description}</p>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Buttons */}
          <div className="flex-shrink-0 pt-4 pb-2 bg-white border-t border-slate-100 flex gap-3 justify-center">
            <button
              className="px-6 py-2.5 rounded-lg text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium"
              onClick={() => setStep('archetype')}
            >
              Geri
            </button>
            <button
              className={`
                px-8 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${(selectedArchetype?.code === 'career' ? selectedSectors.length > 0 : true)
                  ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              `}
              disabled={selectedArchetype?.code === 'career' && selectedSectors.length === 0}
              onClick={() => {
                if (selectedArchetype?.code === 'career' && selectedSectors.length > 0) {
                  setStep('sector_goals');
                } else {
                  afterSectorSelect();
                }
              }}
            >
              {(selectedArchetype?.code === 'career' ? selectedSectors.length === 0 : selectedInterests.length === 0) ? 'Atla' : 'Devam Et'}
            </button>
          </div>
        </div>
      )}

      {/* Sector Goals (Sektör hedef belirleme) */}
      {step === 'sector_goals' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-100 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-center text-slate-800 mb-2">
            🎯 Sektör Hedefin
          </h2>
          <p className="text-center text-slate-500 mb-8">
            Profesyonel İngilizce yolculuğunda seni nasıl destekleyelim?
          </p>

          {/* Kelime Hedefi */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
              📝 Aylık Kelime Hedefi
            </label>
            <div className="flex flex-wrap gap-3">
              {[25, 50, 100, 150].map(count => (
                <button
                  key={count}
                  className={`
                    px-6 py-3 rounded-xl font-bold border-2 transition-all duration-200
                    ${sectorGoals.vocabularyGoal === count
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                  `}
                  onClick={() => setSectorGoals(prev => ({ ...prev, vocabularyGoal: count }))}
                >
                  {count} kelime
                </button>
              ))}
            </div>
          </div>

          {/* İçerik Hedefi */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
              📖 Haftalık İçerik Hedefi
            </label>
            <div className="flex flex-wrap gap-3">
              {[3, 5, 10, 15].map(count => (
                <button
                  key={count}
                  className={`
                    px-6 py-3 rounded-xl font-bold border-2 transition-all duration-200
                    ${sectorGoals.contentGoal === count
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                  `}
                  onClick={() => setSectorGoals(prev => ({ ...prev, contentGoal: count }))}
                >
                  {count} içerik
                </button>
              ))}
            </div>
          </div>

          {/* Günlük Çalışma Süresi */}
          <div className="mb-10">
            <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
              ⏱️ Günlük Çalışma Süresi
            </label>
            <div className="flex flex-wrap gap-3">
              {[10, 20, 30, 45].map(mins => (
                <button
                  key={mins}
                  className={`
                    px-6 py-3 rounded-xl font-bold border-2 transition-all duration-200
                    ${sectorGoals.dailyMinutes === mins
                      ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                  `}
                  onClick={() => setSectorGoals(prev => ({ ...prev, dailyMinutes: mins }))}
                >
                  {mins} dk
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100 mb-8">
            <p className="text-sm text-slate-600 leading-relaxed">
              💡 <span className="font-semibold">Hedefler esnek!</span> İstediğin zaman ayarlardan değiştirebilirsin.
              Günlük görevlerin bu hedeflere göre oluşturulacak.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 py-2.5 rounded-lg text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium"
              onClick={() => setStep('sector')}
            >
              Geri
            </button>
            <button
              className="flex-[2] py-2.5 bg-teal-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-teal-500/20 hover:bg-teal-600 transition-all"
              onClick={afterSectorSelect}
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* Assessment Chat */}
      {step === 'assessment' && (
        <div className="w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up">
          <div className="flex items-center gap-4 p-5 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => {
                if (selectedSectors.length > 0) setStep('sector_goals');
                else setStep('sector');
              }}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all"
              title="Geri Dön"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
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

      {/* Level Confirmation - Liro seviyeyi söyledi, kullanıcıdan onay istiyor */}
      {step === 'level_confirm' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-100 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4">
              <LiroAvatar className="w-full h-full" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Seviyeni Doğrula</h2>
            <p className="text-slate-500">Liro sana bir seviye önerdi. Bu seviye sana uygun mu?</p>
          </div>

          {/* Mevcut Tahmin */}
          <div className="text-center mb-8">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Liro'nun Tahmini</span>
            <div className="inline-block px-10 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-4xl font-extrabold rounded-2xl shadow-lg shadow-teal-200">
              {assessedCEFR}
            </div>
          </div>

          {/* CEFR Açıklaması */}
          <div className="mb-8 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">
              {assessedCEFR === 'A1' && '🌱 **A1 - Başlangıç:** Temel ifadeler ve basit cümleler.'}
              {assessedCEFR === 'A2' && '🌿 **A2 - Temel:** Basit konuşmalar ve günlük durumlar.'}
              {assessedCEFR === 'B1' && '🌳 **B1 - Orta:** Bağımsız iletişim, fikir ifade etme.'}
              {assessedCEFR === 'B2' && '🌲 **B2 - Orta-İleri:** Akıcı konuşma, karmaşık konular.'}
              {assessedCEFR === 'C1' && '🏔️ **C1 - İleri:** Profesyonel seviye, nüanslı ifade.'}
              {assessedCEFR === 'C2' && '⭐ **C2 - Ustalık:** Ana dil seviyesinde hakimiyet.'}
            </p>
          </div>

          {/* Seviye Değiştirme Seçenekleri */}
          <div className="mb-8">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider text-center">
              Farklı hissediyorsan değiştir
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                <button
                  key={level}
                  onClick={() => setAssessedCEFR(level)}
                  className={`
                    px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200
                    ${assessedCEFR === level
                      ? 'bg-teal-500 text-white shadow-md scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                  `}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Onay Butonu */}
          <button
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-teal-200 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
            onClick={() => setStep('goal')}
          >
            ✅ Evet, {assessedCEFR} seviyesi doğru!
          </button>

          {/* İpucu */}
          <p className="text-center text-xs text-slate-400 mt-4">
            💡 Endişelenme! İlerledikçe seviyeni güncelleyebilirsin.
          </p>
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

          <div className="mb-6">
            <span className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Günlük Çalışma Süren</span>
            <div className="flex flex-wrap gap-3">
              {[10, 20, 30, 45].map(mins => (
                <button
                  key={mins}
                  className={`
                                        px-6 py-3 rounded-xl font-bold border-2 transition-all duration-200
                                        ${dailyMinutes === mins
                      ? 'bg-cyan-50 border-cyan-500 text-teal-700 shadow-md transform scale-105'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}
                                    `}
                  onClick={() => setDailyMinutes(mins)}
                >
                  {mins} dk
                </button>
              ))}
            </div>
          </div>

          {/* Süre Bilgilendirmesi - Sektör hedeflerini de yansıt */}
          <div className="mb-10 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-teal-700 mb-1">
                  Seçtiğin süreye göre programın:
                </p>
                <p className="text-sm text-slate-600">
                  {dailyMinutes === 10 && `Günde 2-3 kısa görev${selectedSectors.length > 0 ? `, haftada ${sectorGoals.contentGoal} sektör içeriği` : ', haftada en az 3 içerik dinle'}`}
                  {dailyMinutes === 20 && `Günde 4-5 görev${selectedSectors.length > 0 ? `, haftada ${sectorGoals.contentGoal} sektör içeriği` : ', haftada en az 5 içerik dinle'}`}
                  {dailyMinutes === 30 && `Günde 5-6 görev${selectedSectors.length > 0 ? `, haftada ${sectorGoals.contentGoal} sektör içeriği` : ', haftada en az 7 içerik dinle'}`}
                  {dailyMinutes === 45 && `Günde 6-8 görev${selectedSectors.length > 0 ? `, haftada ${sectorGoals.contentGoal} sektör içeriği` : ', yoğun pratik programı'}`}
                </p>
                {selectedSectors.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    🎯 Aylık kelime hedefi: {sectorGoals.vocabularyGoal} kelime
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 py-2.5 rounded-lg text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium"
              onClick={() => setStep('assessment')}
            >
              Geri
            </button>
            <button
              className="flex-[2] py-2.5 bg-teal-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-teal-500/20 hover:bg-teal-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={completeOnboarding}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Hazırlanıyor...</span>
                </div>
              ) : 'Yolculuğu Başlat'}
            </button>
          </div>
        </div>
      )}

      {/* Complete - Özet + Rehber */}
      {step === 'complete' && (
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Tebrik Başlığı */}
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Yolculuğun Başladı!</h1>
            <p className="text-slate-500">Kişisel yol haritan hazır</p>
          </div>

          {/* Yol Haritası Özeti */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 mb-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>🗺️</span> Yol Haritası Özeti
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-teal-50 rounded-xl">
                <p className="text-xs text-teal-600 font-medium mb-1">Arketip</p>
                <p className="font-bold text-teal-800">{selectedArchetype?.icon} {selectedArchetype?.name}</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-xl">
                <p className="text-xs text-teal-600 font-medium mb-1">Seviye Yolculuğu</p>
                <p className="font-bold text-cyan-800">{assessedCEFR} → {targetCEFR}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 font-medium mb-1">Günlük Plan</p>
                <p className="font-bold text-amber-800">{dailyMinutes} dk/gün</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 font-medium mb-1">Sektör</p>
                <p className="font-bold text-emerald-800">{selectedSectors.length > 0 ? `${selectedSectors.length} sektör seçili` : 'Genel İngilizce'}</p>
              </div>
            </div>
          </div>

          {/* Şimdi Ne Yapmalısın */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100 mb-8">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>🚀</span> Şimdi Ne Yapmalısın?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-slate-800">İlerleme sayfanı incele</p>
                  <p className="text-sm text-slate-500">Günlük görevlerini ve yol haritanı gör</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-slate-800">İlk içeriğini oluştur</p>
                  <p className="text-sm text-slate-500">Bir konu seç ve Liro ile içerik üret</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <p className="font-semibold text-slate-800">Günlük serini başlat</p>
                  <p className="text-sm text-slate-500">Her gün aktif kalarak seviye atla</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              onComplete();
              router.push('/progress');
            }}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold shadow-md shadow-teal-500/20 hover:bg-teal-600 transition-all"
          >
            İlerleme Sayfama Git →
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;
