'use client';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ProcessInputData, getToken, API_BASE_URL, getApiUrl, getTopicDetailSuggestions, fetchYoutubeTranscript } from '../lib/api';
import { searchBooks, fetchBookContent } from '../services/bookService';
import InterestManager from './InterestManager';
import { FaCog } from 'react-icons/fa';

type InputType = ProcessInputData['type'] | 'suggestion' | 'hashtag';
type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface InputSectionProps {
  onSubmit: (data: ProcessInputData) => void;
  isLoading: boolean;
}

// Polly'nin desteklediği İngilizce sesler (örnek, tam liste için backend'den çekilebilir)
const POLLY_VOICES = [
  { Id: 'en-US-Wavenet-F', Name: 'en-US-Wavenet-F', LanguageName: 'English (US)', Gender: 'Female', Engine: 'Neural' },
  { Id: 'Amy', Name: 'Amy', LanguageName: 'English (UK)', Gender: 'Female', Engine: 'Neural' },
];

// Kitap metnini bölümlere ayıran fonksiyon (örnek: Chapter/Letter başlıkları)
function splitBookIntoChapters(bookText: string) {
  const chapterPattern = /(Chapter \d+|Letter \d+|CHAPTER [IVXLC]+|CHAPTER [0-9]+)/gi;
  const chapters = [];
  let lastIndex = 0;
  let match;
  match = chapterPattern.exec(bookText);
  if (match && match.index > 0) {
    chapters.push({ title: "Introduction / Preface", content: bookText.substring(0, match.index).trim() });
    lastIndex = match.index;
  }
  chapterPattern.lastIndex = 0;
  while ((match = chapterPattern.exec(bookText)) !== null) {
    const chapterTitle = match[0];
    let nextMatch = chapterPattern.exec(bookText);
    let chapterContent = "";
    if (nextMatch) {
      chapterContent = bookText.substring(match.index + chapterTitle.length, nextMatch.index).trim();
      chapterPattern.lastIndex = nextMatch.index - chapterTitle.length;
    } else {
      chapterContent = bookText.substring(match.index + chapterTitle.length).trim();
    }
    chapters.push({ title: chapterTitle, content: chapterContent });
    lastIndex = match.index;
  }
  if (chapters.length === 0 && bookText.trim().length > 0) {
    chapters.push({ title: "Full Text", content: bookText.trim() });
  }
  return chapters;
}

export default function InputSection({ onSubmit, isLoading }: InputSectionProps): React.ReactElement {
  const { t } = useTranslation();
  const [inputType, setInputType] = useState<InputType>('suggestion'); // Başlangıçta öneri seçili olsun
  const [text, setText] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const [webLink, setWebLink] = useState<string>('');
  const [spotifyLink, setSpotifyLink] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [bookName, setBookName] = useState<string>('');
  const [bookChapter, setBookChapter] = useState<string>('');
  const [level, setLevel] = useState<Level>('A1');
  const [voice, setVoice] = useState<string>("en-US-Wavenet-F");
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [googleVoices, setGoogleVoices] = useState<any[]>([]);
  const [bookSearch, setBookSearch] = useState<string>("");
  const [pendingSearch, setPendingSearch] = useState<string>("");
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookChapters, setBookChapters] = useState<{ title: string; content: string }[]>([]);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number | null>(null);
  const [bookLoading, setBookLoading] = useState<boolean>(false);
  const [ttsProvider, setTtsProvider] = useState<'amazon' | 'google'>('google');
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoadingTopicSuggestions, setIsLoadingTopicSuggestions] = useState<boolean>(false);
  const [topicDetailSuggestions, setTopicDetailSuggestions] = useState<string[]>([]);
  const [selectedDetailTopic, setSelectedDetailTopic] = useState<string>('');
  const [showInterestManager, setShowInterestManager] = useState<boolean>(false);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);

  useEffect(() => {
    setSpeakingRate(level === 'A1' ? 0.8 : 1.0);
  }, [level]);

  useEffect(() => {
    // TTS provider bilgisini backend'den çek
    const fetchProvider = async () => {
      try {
        const res = await fetch('/api/admin/settings/tts-provider');
        const data = await res.json();
        setTtsProvider(data.tts_provider || 'google');
      } catch {
        setTtsProvider('google');
      }
    };
    fetchProvider();
    // Google seslerini çek
    const backendUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5001/api/tts/voices'
      : '/api/tts/voices';
    fetch(backendUrl)
      .then(res => res.json())
      .then(data => setGoogleVoices(data.voices || []))
      .catch(() => setGoogleVoices([]));
  }, []);

  useEffect(() => {
    if (!POLLY_VOICES.some(v => v.Id === voice)) {
      setVoice(POLLY_VOICES[0].Id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  // Kitap arama butonuna basınca tetiklenecek fonksiyon
  const handleBookSearch = async () => {
    if (pendingSearch.length < 3) return;
    setBookLoading(true);
    const results = await searchBooks(pendingSearch);
    setBookResults(results);
    setBookSearch(pendingSearch);
    setSelectedBook(null);
    setBookChapters([]);
    setSelectedChapterIdx(null);
    setBookLoading(false);
  };

  // Kitap seçilince içeriği ve bölümleri çek
  useEffect(() => {
    if (selectedBook) {
      setBookLoading(true);
      fetchBookContent(selectedBook.id).then(res => {
        if (res.content) {
          const chapters = splitBookIntoChapters(res.content);
          setBookChapters(chapters);
        } else {
          setBookChapters([]);
        }
        setBookLoading(false);
      });
    } else {
      setBookChapters([]);
      setSelectedChapterIdx(null);
    }
  }, [selectedBook]);

  // Google TTS için tüm sesleri getir (filtreleme yok)
  const getAllGoogleVoices = () => googleVoices;

  // Google sesleri yüklendiğinde ilk sesi otomatik seç
  useEffect(() => {
    if (googleVoices.length > 0 && !voice) {
      setVoice(googleVoices[0].name);
    }
  }, [googleVoices]);

  // Kullanıcı ilgi alanlarını çekme
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        // Token alma stratejisi geliştir
        const token = getToken();
        console.log("Token kontrolü - İlk 10 karakter:", token ? `${token.substring(0, 10)}...` : "Token yok");
        
        if (!token) {
          console.error("Token bulunamadı. Kullanıcı giriş yapmamış olabilir.");
          // Geliştirme aşamasında varsayılan değerlerle devam et
          setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
          return;
        }

        // Next.js proxy kullanarak CSP/CORS sorunlarını önle
        // next.config.js'de "/api/:path*" -> "http://localhost:5001/api/:path*" yapılandırması var
        // Bu şekilde aynı origin'den istek yapılmış gibi görünür ve CORS sorunu çözülür
        const baseUrl = getApiUrl(''); // getApiUrl artık sadece base URL döndürüyor
        const apiUrl = `${baseUrl}/api/user-interests`; // Endpoint'i manuel ekliyoruz
        
        console.log("İlgi alanları çekiliyor:", apiUrl);
        
        // Token'ı doğru formatta gönder
        const authHeaderValue = `Bearer ${token}`;
        console.log("Authorization header hazırlandı");
        
        // API çağrısını yap - ayrıntılı hata yakalama ile
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeaderValue,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        console.log("API yanıt durumu:", response.status, response.statusText);
        
        // API yanıtını kontrol et
        if (response.ok) {
          // Başarılı yanıt
          try {
            // Önce yanıtı text olarak al
            const responseText = await response.text();
            console.log("API yanıt (ham):", responseText);
            
            // Boş yanıt kontrolü
            if (!responseText || responseText.trim() === '') {
              console.error("API boş yanıt döndü");
              setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
              return;
            }
            
            // Yanıtı JSON olarak ayrıştır
            const data = JSON.parse(responseText);
            console.log("API yanıt (JSON):", data);
            
            if (Array.isArray(data)) {
              const keywords = data.map((item: { interest_keyword: string }) => item.interest_keyword);
              console.log("Ayrıştırılan ilgi alanları:", keywords);
              setInterests(keywords);
              console.log("İlgi alanları başarıyla yüklendi:", keywords);
            } else {
              console.error("API yanıt formatı beklendiği gibi değil:", data);
              setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
            }
          } catch (parseError) {
            console.error("API yanıtı ayrıştırılırken hata oluştu:", parseError);
            setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
          }
        } else {
          // Hata yanıtı
          console.error(`API hata yanıtı: ${response.status} ${response.statusText}`);
          try {
            const errorText = await response.text();
            console.error(`API hata detayı: ${errorText}`);
            
            try {
              const errorData = JSON.parse(errorText);
              console.error(`API hata mesajı: ${errorData.error || errorData.message || 'Bilinmeyen hata'}`);
            } catch (jsonError) {
              console.error("API hata yanıtı JSON formatında değil:", errorText);
            }
            
            // Token geçersiz ise kullanıcıyı logout yap veya tokeni yenile
            if (response.status === 401) {
              console.error("Yetkilendirme hatası: Token geçersiz veya süresi dolmuş");
              localStorage.removeItem('lingroot_token'); // Geçersiz token'ı temizle
            }
          } catch (e) {
            console.error(`API hata yanıtı alınamadı: ${e}`);
          }
          
          // Geliştirme aşamasında varsayılan değerlerle devam et
          setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
        }
      } catch (error) {
        console.error("İlgi alanları çekilirken beklenmeyen hata:", error);
        setInterests(['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi']);
      }
    };

    fetchInterests();
  }, []);

  // İlgi alanlarını yeniden yüklemek için fonksiyon
  const fetchInterests = async () => {
    try {
      // API'den ilgi alanlarını al
      const baseUrl = getApiUrl(''); // getApiUrl artık sadece base URL döndürüyor
      const apiUrl = `${baseUrl}/api/user-interests`; // Endpoint'i manuel ekliyoruz
      const token = getToken();
      
      if (!token) {
        console.error("Token bulunamadı. Kullanıcı giriş yapmamış olabilir.");
        return;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`İlgi alanları alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const keywords = data.map((item: { interest_keyword: string }) => item.interest_keyword);
        setInterests(keywords);
      } else if (data.data && Array.isArray(data.data)) {
        const keywords = data.data.map((item: { interest_keyword: string }) => item.interest_keyword);
        setInterests(keywords);
      }
    } catch (error) {
      console.error("İlgi alanları yüklenirken hata oluştu:", error);
    }
  };

  // Konu önerisi butonu için click handler ekleyelim
  const handleGetTopicSuggestions = async () => {
    if (!topic) {
      alert("Lütfen önce bir konu seçin");
      return;
    }
    
    setIsLoadingTopicSuggestions(true);
    try {
      const response = await getTopicDetailSuggestions(topic, level);
      if (response.success && response.data.suggestions) {
        setTopicDetailSuggestions(response.data.suggestions);
        console.log(`${topic} konusu için ${response.data.suggestions.length} öneri alındı`);
      } else {
        console.error("Konu önerileri alınamadı:", response);
        alert("Konu önerileri alınamadı: " + (response.message || "Bilinmeyen hata"));
      }
    } catch (error: any) {
      console.error("Konu önerileri alınırken hata oluştu:", error);
      const errorMessage = error.message || "Bilinmeyen bir hata oluştu";
      alert(`Konu önerileri alınamadı: ${errorMessage}`);
    } finally {
      setIsLoadingTopicSuggestions(false);
    }
  };

  // Detaylı konu seçildiğinde çalışacak handler
  const handleDetailTopicSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedDetailTopic(selectedValue);
    setText(selectedValue); // Seçilen detaylı konuyu topic_instructions alanına yaz
    
    // Konu sekmesine geçiş yap ve seçili konuyu topic alanına yaz
    setInputType('topic');
    setTopic(selectedValue); // Tüm metni konu alanına yaz
    
    // 50ms gecikmeyle formu otomatik olarak submit et
    setTimeout(() => {
      const formElement = document.querySelector('form') as HTMLFormElement;
      if (formElement) {
        formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 50);
  };

  // Form submit fonksiyonu
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!voice) {
      alert("Lütfen bir ses seçin!");
      return;
    }
    
    // YouTube linki varsa önce transcript çek
    if (inputType === 'youtube' && youtubeLink) {
      try {
        // Loading state'i güncelle
        if (isLoading) return;
        
        setLoadingTranscript(true);
        console.log("YouTube transkript çekiliyor...");
        
        // Kullanıcıya bilgi ver
        alert("YouTube videosunun transkripti alınıyor. Bu işlem videoya göre biraz zaman alabilir ve farklı dillerde deneme yapacaktır.");
        
        const transcript = await fetchYoutubeTranscript(youtubeLink);
        
        if (!transcript) {
          alert("YouTube video transkripti alınamadı. Lütfen başka bir video deneyin veya başka bir içerik türü seçin.");
          setLoadingTranscript(false);
          return;
        }
        
        console.log("YouTube transkript başarıyla alındı.");
        
        // Transkripti topic_instructions alanına yerleştir
        setText(transcript);
        setLoadingTranscript(false);
        
        // Input değeri olarak YouTube linkini kullan
        const inputData: ProcessInputData = {
          type: 'youtube',
          input: youtubeLink,
          text: transcript,
          level,
          SesHızı: speakingRate,
          voice
        };
        onSubmit(inputData);
        return;
      } catch (error) {
        console.error("YouTube transkript çekme hatası:", error);
        alert("YouTube transkript işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        setLoadingTranscript(false);
        return;
      }
    }
    
    // Diğer içerik türleri için normal davranış
    const inputData: ProcessInputData = {
      type: inputType as ProcessInputData['type'],
      text: inputType === 'text' ? text : inputType === 'topic' ? topic : undefined,
      input:
        inputType === 'text' ? text :
        inputType === 'topic' ? topic :
        inputType === 'youtube' ? youtubeLink :
        inputType === 'weblink' ? webLink :
        inputType === 'spotify' ? spotifyLink :
        inputType === 'book' ? bookName :
        undefined,
      file: inputType === 'file' ? file || undefined : undefined,
      level,
      SesHızı: speakingRate,
      voice, // Seçili ses burada gönderiliyor
      chapter: inputType === 'book' ? bookChapter : undefined,
    };
    onSubmit(inputData);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    // Next.js proxy kullan (CORS sorununu engeller)
    const baseUrl = getApiUrl(''); // getApiUrl artık sadece base URL döndürüyor
    const apiUrl = `${baseUrl}/api/upload`; // Endpoint'i manuel ekliyoruz
    
    const res = await fetch(apiUrl, { 
      method: 'POST', 
      body: formData,
      // Çerezleri dahil et (gerekiyorsa)
      credentials: 'include'
    });
    
    const data = await res.json();
    if (data.text) {
      setText(data.text); // textarea'ya yaz
      setInputType('text'); // metin moduna geç
      // Otomatik submit
      setTimeout(() => {
        const inputData: ProcessInputData = {
          type: 'text',
          text: data.text,
          input: data.text,
          file: undefined,
          level,
          SesHızı: speakingRate,
          voice,
          chapter: undefined,
        };
        onSubmit(inputData);
      }, 100);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center mb-8">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold mr-4 shadow-lg">
            1
          </span>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
            {t('content_type_and_input')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* İçerik Türü Seçimi */}
          <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-800">
              {t('content_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setInputType('text')}
                className={`icon-button group ${inputType === 'text' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('text')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('topic')}
                className={`icon-button group ${inputType === 'topic' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>{t('topic')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('youtube')}
                className={`icon-button group ${inputType === 'youtube' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('youtube')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('weblink')}
                className={`icon-button group ${inputType === 'weblink' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>{t('web_link')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('file')}
                className={`icon-button group ${inputType === 'file' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>{t('document')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('spotify')}
                className={`icon-button group ${inputType === 'spotify' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>{t('spotify')}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('book')}
                className={`icon-button group ${inputType === 'book' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} stroke="currentColor" fill="none" />
                  <path d="M8 8h8M8 12h8M8 16h4" strokeWidth={2} stroke="currentColor" />
                </svg>
                <span>Kitap</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('suggestion')}
                className={`icon-button group ${inputType === 'suggestion' ? 'icon-button-selected' : 'icon-button-default'} relative animated-pulse bg-blue-50`}
                style={{ animation: inputType !== 'suggestion' ? 'pulse 2s infinite' : 'none' }}
              >
                <div className={inputType !== 'suggestion' ? 'absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce' : 'hidden'}>
                  !
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-bold">Öneriler</span>
              </button>

              <button
                type="button"
                onClick={() => setInputType('hashtag')}
                className={`icon-button group ${inputType === 'hashtag' ? 'icon-button-selected' : 'icon-button-default'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" />
                </svg>
                <span>Hashtag</span>
              </button>
            </div>
          </div>

          {/* Giriş Alanları */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6 shadow-inner">
            {inputType === 'text' && (
              <div className="space-y-2">
                <label htmlFor="text-input" className="block text-sm font-semibold text-gray-700">
                  {t('enter_your_text')}
                </label>
                <textarea
                  id="text-input"
                  value={text}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                  className="input-field h-32 resize-y focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_text_placeholder')}
                  required
                />
              </div>
            )}

            {inputType === 'topic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter topic
                  </label>
                  <input
                    type="text"
                    placeholder="Enter a topic"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              </div>
            )}

            {inputType === 'youtube' && (
              <div className="space-y-2">
                <label htmlFor="youtube-input" className="block text-sm font-semibold text-gray-700">
                  {t('youtube_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="youtube-input"
                    type="url"
                    value={youtubeLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setYoutubeLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>
                
                <div className="mt-2">
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                    onClick={async () => {
                      if (!youtubeLink) {
                        alert("Lütfen bir YouTube linki girin!");
                        return;
                      }
                      
                      setLoadingTranscript(true);
                      try {
                        const transcript = await fetchYoutubeTranscript(youtubeLink);
                        if (!transcript) {
                          alert("YouTube video transkripti alınamadı. Lütfen başka bir video deneyin.");
                          return;
                        }
                        setText(transcript);
                      } catch (error) {
                        console.error("YouTube transkript çekme hatası:", error);
                        alert("YouTube transkript işlemi sırasında bir hata oluştu.");
                      } finally {
                        setLoadingTranscript(false);
                      }
                    }}
                    disabled={loadingTranscript}
                  >
                    {loadingTranscript ? 'Transkript Yükleniyor...' : 'Transkript Çek'}
                  </button>
                </div>
                
                {/* Metninizi girin bölümü - YouTube transkripti için */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('your_text')}
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                    placeholder={t('enter_text_or_transcript')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </div>
            )}

            {inputType === 'weblink' && (
              <div className="space-y-2">
                <label htmlFor="weblink-input" className="block text-sm font-semibold text-gray-700">
                  {t('web_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    id="weblink-input"
                    type="url"
                    value={webLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setWebLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://ornek.com/makale..."
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">{t('web_link_description')}</p>
              </div>
            )}

            {inputType === 'spotify' && (
              <div className="space-y-2">
                <label htmlFor="spotify-input" className="block text-sm font-semibold text-gray-700">
                  {t('spotify_link')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <input
                    id="spotify-input"
                    type="url"
                    value={spotifyLink}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSpotifyLink(e.target.value)}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://open.spotify.com/track/... veya /episode/..."
                    required
                  />
                </div>
              </div>
            )}

            {inputType === 'file' && (
              <div className="space-y-2">
                <label htmlFor="file-input" className="block text-sm font-semibold text-gray-700">
                  {t('select_document')}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>{t('upload_file')}</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.odt,.epub"
                        />
                      </label>
                      <p className="pl-1">{t('or_drag_and_drop')}</p>
                    </div>
                    <p className="text-xs text-gray-500">{t('supported_file_types')}</p>
                  </div>
                </div>
                {file && (
                  <p className="text-sm text-gray-500">
                    {t('selected_file')}: {file.name}
                  </p>
                )}
              </div>
            )}

            {inputType === 'book' && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Kitap Seçin</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder="Ara: Kitap Adı / Yazar / Tür / vb."
                    value={pendingSearch}
                    onChange={e => setPendingSearch(e.target.value)}
                  />
                  <button type="button" onClick={handleBookSearch} className="btn-primary px-4 py-2">Ara</button>
                </div>
                {bookLoading && <div className="text-blue-600 text-sm">Yükleniyor...</div>}
                {!bookLoading && bookResults.length > 0 && (
                  <div className="border rounded bg-white max-h-48 overflow-auto">
                    {bookResults.map(book => (
                      <div
                        key={book.id}
                        className={`p-2 cursor-pointer hover:bg-blue-100 ${selectedBook && selectedBook.id === book.id ? 'bg-blue-200' : ''}`}
                        onClick={() => setSelectedBook(book)}
                      >
                        <div className="font-semibold">{book.title}</div>
                        <div className="text-xs text-gray-600">{book.authors?.map((a: { name: string }) => a.name).join(', ')}</div>
                        <div className="text-xs text-gray-400">{book.subjects?.slice(0, 3).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedBook && bookChapters.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700">Kitap Bölüm Seç</label>
                    <div className="border rounded bg-white max-h-48 overflow-auto">
                      {bookChapters.map((ch, idx) => (
                        <div
                          key={idx}
                          className={`p-2 cursor-pointer hover:bg-blue-100 ${selectedChapterIdx === idx ? 'bg-blue-200' : ''}`}
                          onClick={() => {
                            setSelectedChapterIdx(idx);
                            setBookName(selectedBook.title);
                            setBookChapter(ch.content);
                          }}
                        >
                          <div className="font-semibold">{ch.title}</div>
                          <div className="text-xs text-gray-500 truncate">{ch.content.substring(0, 80)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputType === 'suggestion' && (
              <div className="space-y-4">
                <div className="flex flex-row gap-2 items-center">
                  <div className="w-3/4">
                    <div className="relative">
                      <select
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      >
                        <option value="" disabled>Konu Seçin</option>
                        {interests.map((interest, index) => (
                          <option key={index} value={interest}>{interest}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowInterestManager(true)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-700 hover:bg-blue-200 p-1.5 rounded-full flex items-center justify-center"
                        title="İlgi Alanlarını Düzenle"
                      >
                        <FaCog size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="w-1/4">
                    <button
                      type="button"
                      className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none shadow-lg font-bold"
                      onClick={handleGetTopicSuggestions}
                      disabled={isLoadingTopicSuggestions || !topic}
                      style={{ animation: 'pulse 1.5s infinite' }}
                    >
                      {isLoadingTopicSuggestions ? 'Yükleniyor...' : '✨ Konu Öner ✨'}
                    </button>
                  </div>
                </div>
                
                {/* İlgi Alanı Düzenleme Modal */}
                {showInterestManager && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                      <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">İlgi Alanlarını Düzenle</h3>
                        <button
                          onClick={() => setShowInterestManager(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-5">
                        <InterestManager 
                          showTitle={false}
                          isEditing={true}
                          onUpdate={() => {
                            // Düzenleme yapıldığında ilgi alanlarını yeniden yükle
                            fetchInterests();
                            setShowInterestManager(false);
                          }}
                        />
                      </div>
                      <div className="bg-gray-50 px-5 py-3 flex justify-end">
                        <button
                          onClick={() => setShowInterestManager(false)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {topicDetailSuggestions.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detaylı Öneriler
                    </label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedDetailTopic}
                      onChange={handleDetailTopicSelect}
                    >
                      <option value="" disabled>Öneri Seçin</option>
                      {topicDetailSuggestions.map((suggestion, index) => (
                        <option key={index} value={suggestion}>{suggestion}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('topic_instructions')}
                  </label>
                  <textarea
                    rows={6}
                    placeholder={t('topic_placeholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </div>
            )}
            {inputType === 'hashtag' && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-green-700 text-center">
                Takip ettiğiniz hashtag'lere göre öneriler burada listelenecek.
              </div>
            )}

            {/* Seviye Seçimi */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('english_level')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l as Level)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      level === l
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Ses Hızı Seçici */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('speaking_rate')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0.7, 0.8, 1, 1.2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSpeakingRate(rate)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      speakingRate === rate
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Ses Seçimi */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('voice_selection')}
              </label>
              <select
                value="en-US-Wavenet-F"
                disabled
                className="input-field focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="en-US-Wavenet-F">en-US-Wavenet-F (Kadın)</option>
              </select>
            </div>
          </div>

          {/* Gönder Butonu */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary px-8 py-3 text-lg flex items-center space-x-2 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('processing')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('generate_audio')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 