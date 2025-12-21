'use client';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ProcessInputData, getToken, API_BASE_URL, getApiUrl, getTopicDetailSuggestions, getGeneratedSuggestions, fetchYoutubeTranscript, getMyPlanFeatures, PlanFeatures, getHashtagNews, HashtagNewsItem } from '../lib/api';
import { searchBooks, fetchBookContent } from '../services/bookService';
import InterestManager from './InterestManager';
import { FaCog } from 'react-icons/fa';

type InputType = ProcessInputData['type'] | 'suggestion' | 'hashtag';
type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface InputSectionProps {
  onSubmit: (data: ProcessInputData) => void;
  isLoading: boolean;
}



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

  // Debug mesajı
  console.log("🔍 InputSection render - şu anki inputType:", useState<InputType>('suggestion')[0]);
  const [inputType, setInputType] = useState<InputType>('topic'); // Test için konu sekmesini başlangıç yap
  const [text, setText] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const [webLink, setWebLink] = useState<string>('');
  const [podcastLink, setPodcastLink] = useState<string>('');
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

  const [interests, setInterests] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Debug: interests state'ini izle
  console.log("🔍 Interests state şu anda:", interests);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string[]>([]);
  const [isLoadingTopicSuggestions, setIsLoadingTopicSuggestions] = useState<boolean>(false);
  const [topicDetailSuggestions, setTopicDetailSuggestions] = useState<string[]>([]);
  const [selectedDetailTopic, setSelectedDetailTopic] = useState<string>('');
  const [showInterestManager, setShowInterestManager] = useState<boolean>(false);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [hashtagQuery, setHashtagQuery] = useState<string>('');
  const [hashtagLimit, setHashtagLimit] = useState<number>(5);
  const [hashtagResults, setHashtagResults] = useState<HashtagNewsItem[]>([]);
  const [isLoadingHashtag, setIsLoadingHashtag] = useState<boolean>(false);
  const [hashtagError, setHashtagError] = useState<string | null>(null);

  // Plan features state
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState<boolean>(true);

  useEffect(() => {
    setSpeakingRate(level === 'A1' ? 0.8 : 1.0);
  }, [level]);

  useEffect(() => {

    // Google seslerini çek
    const backendUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5001/api/tts/voices'
      : '/api/tts/voices';
    fetch(backendUrl)
      .then(res => res.json())
      .then(data => setGoogleVoices(data.voices || []))
      .catch(() => setGoogleVoices([]));

    // Fetch plan features
    const fetchPlanFeatures = async () => {
      try {
        setFeaturesLoading(true);
        const result = await getMyPlanFeatures();
        setPlanFeatures(result.features);
        console.log('✅ Plan features loaded:', result);
      } catch (error) {
        console.error('❌ Error loading plan features:', error);
      } finally {
        setFeaturesLoading(false);
      }
    };
    fetchPlanFeatures();
  }, []);

  useEffect(() => {
    if (!googleVoices || googleVoices.length === 0) return;
    const hasCurrent = googleVoices.some((v: any) => v.id === voice || v.name === voice);
    if (!hasCurrent) {
      const first = googleVoices[0];
      setVoice(first.id || first.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, googleVoices]);

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

  // Filter voices based on plan features
  const getFilteredVoices = () => {
    if (!planFeatures?.voice_categories) {
      // If features not loaded yet, return all voices
      return googleVoices;
    }

    const voiceCategories = planFeatures.voice_categories;

    // Lingroot voice list currently represents cost-effective (Basic/standard) voices.
    // If the plan allows standard voices, expose all Lingroot voices; otherwise return empty.
    if (voiceCategories.standard) {
      return googleVoices;
    }

    return [];
  };

  // Google sesleri yüklendiğinde ilk sesi otomatik seç
  useEffect(() => {
    const filteredVoices = getFilteredVoices();
    if (filteredVoices.length > 0 && !voice) {
      setVoice(filteredVoices[0].name);
    }
  }, [googleVoices, planFeatures]);

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
        const apiUrl = `${getApiUrl('/user-interests')}`;

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

            let keywords: string[] = [];

            if (Array.isArray(data)) {
              // Direk array formatı: [{"interest_keyword":"Teknoloji"}, ...]
              keywords = data.map((item: { interest_keyword: string }) => item.interest_keyword);
              console.log("✅ Direk array formatı işlendi");
            } else if (data.success && data.data && Array.isArray(data.data)) {
              // Success wrapper formatı: {"success":true,"data":["Teknoloji","Bilim",...]}
              if (typeof data.data[0] === 'string') {
                // String array formatı
                keywords = data.data;
                console.log("✅ Success wrapper string array formatı işlendi");
              } else {
                // Object array formatı  
                keywords = data.data.map((item: { interest_keyword: string }) => item.interest_keyword);
                console.log("✅ Success wrapper object array formatı işlendi");
              }
            } else {
              console.error("❌ API yanıt formatı beklendiği gibi değil:", data);
              keywords = ['İngilizce', 'Yapay Zeka', 'Seyahat', 'Teknoloji', 'İş İngilizcesi'];
            }

            console.log("🎯 Ayrıştırılan ilgi alanları:", keywords);
            setInterests(keywords);
            console.log("✅ İlgi alanları başarıyla yüklendi:", keywords);
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
      const apiUrl = `${getApiUrl('/user-interests')}`;
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





  // Form submit fonksiyonu
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    console.log("🚀 Form submit başladı!");
    console.log("📝 inputType:", inputType);
    console.log("📍 topic:", topic);
    console.log("📄 text:", text);
    console.log("🎵 voice:", voice);
    console.log("📊 level:", level);
    console.log("⚡ speakingRate:", speakingRate);

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
        console.log("📦 InputData oluşturuldu:", inputData);
        console.log("🎯 onSubmit çağrılıyor...");

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
                inputType === 'podcast' ? podcastLink :
                  inputType === 'book' ? bookName :
                    undefined,
      file: inputType === 'file' ? file || undefined : undefined,
      level,
      SesHızı: speakingRate,
      voice, // Seçili ses burada gönderiliyor
      chapter: inputType === 'book' ? bookChapter : undefined,
    };

    console.log("📦 InputData oluşturuldu:", inputData);
    console.log("🎯 onSubmit çağrılıyor...");

    onSubmit(inputData);
  };





  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz.');
      return;
    }

    // Dosya türü kontrolü
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'text/html',
      'application/vnd.oasis.opendocument.text',
      'application/epub+zip'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|md|rtf|html|odt|epub)$/i)) {
      alert('Desteklenmeyen dosya türü. Lütfen PDF, DOC, DOCX, TXT, MD, RTF, HTML, ODT veya EPUB dosyası seçin.');
      return;
    }

    console.log('Dosya yükleniyor:', file.name, 'Boyut:', file.size, 'Tür:', file.type);

    try {
      // Loading state'i ayarla
      setUploadingFile(true);
      setFile(file);

      const formData = new FormData();
      formData.append('file', file);

      // API URL'ini oluştur
      const apiUrl = getApiUrl('/content/upload');
      console.log('Upload API URL:', apiUrl);

      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Upload response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload error response:', errorText);

        // Daha detaylı hata mesajları
        let errorMessage = `Upload failed: ${res.status} ${res.statusText}`;
        if (res.status === 404) {
          errorMessage = 'Upload API endpoint bulunamadı. Backend çalışıyor mu?';
        } else if (res.status === 500) {
          errorMessage = 'Sunucu hatası. Backend loglarını kontrol edin.';
        } else if (res.status === 413) {
          errorMessage = 'Dosya çok büyük. Daha küçük bir dosya deneyin.';
        } else if (res.status === 415) {
          errorMessage = 'Desteklenmeyen dosya türü.';
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log('Upload response data:', data);

      if (data.text) {
        setText(data.text); // textarea'ya yaz
        setInputType('text'); // metin moduna geç
        alert(`Dosya başarıyla yüklendi! ${data.text.length} karakter metin çıkarıldı.`);

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
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Dosyadan metin çıkarılamadı.');
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(`Dosya yükleme hatası: ${error.message || 'Bilinmeyen hata'}`);
      setFile(null); // Hata durumunda file state'ini temizle

      // Input'u temizle
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Generated suggestions'ları çek
  useEffect(() => {
    const fetchGeneratedSuggestions = async () => {
      try {
        console.log("🎯 Generated suggestions çekiliyor...");
        const response = await getGeneratedSuggestions();

        if (response.success && response.data.suggestions) {
          setGeneratedSuggestions(response.data.suggestions);
          console.log(`✅ ${response.data.suggestions.length} konu başlığı yüklendi:`, response.data.suggestions);
        } else {
          console.error("Generated suggestions alınamadı:", response);
          // Fallback değerler
          setGeneratedSuggestions(['Seyahat ve Turizm', 'Teknoloji ve İnovasyon', 'Sağlık ve Beslenme']);
        }
      } catch (error) {
        console.error("Generated suggestions çekerken hata:", error);
        // Fallback değerler
        setGeneratedSuggestions(['Seyahat ve Turizm', 'Teknoloji ve İnovasyon', 'Sağlık ve Beslenme']);
      }
    };

    fetchGeneratedSuggestions();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-700">

      {/* ZERO-UI HERO CONTAINER */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[50vh] space-y-8">

        {/* 1. The Big Question */}
        <div className="text-center space-y-4">
          {/* Dynamic Greeting based on time could go here */}
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-slate-900 dark:text-amber-50 tracking-tight leading-tight">
            {t('what_to_learn_today') || "What do you want to learn?"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xl font-light">
            {t('curiosity_prompt') || "Type a topic, and we'll turn it into a lesson."}
          </p>
        </div>

        {/* 2. The Focus Input */}
        <form onSubmit={handleSubmit} className="w-full relative group z-20">
          <div className="relative transform transition-all duration-300 group-hover:-translate-y-1">
            <input
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setInputType('topic'); // Ensure we are in topic mode when typing here
              }}
              placeholder={t('topic_placeholder_minimal') || "e.g. The history of Jazz..."}
              className="w-full pl-8 pr-36 py-6 text-2xl font-serif bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all outline-none text-slate-800 dark:text-slate-100"
              autoFocus
            />

            {/* Action Button (Dynamic) */}
            <div className="absolute right-3 top-3 bottom-3">
              <button
                type="submit"
                disabled={!topic && !text && !file}
                className="h-full px-8 rounded-xl bg-slate-900 dark:bg-amber-500 text-white font-medium hover:bg-slate-800 dark:hover:bg-amber-600 transition-all disabled:opacity-0 disabled:scale-95 transform duration-200 shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    <span>{t('creating') || "Creating..."}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>{t('listen') || "Listen"}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 3. Subtle Tools Bar (Secondary Actions) */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-slate-500">

            {/* Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-amber-600 ${showSettings ? 'text-amber-600' : ''}`}
            >
              <FaCog className={showSettings ? "animate-spin-slow" : ""} />
              <span>{level} • {voice}</span>
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

            {/* File Upload */}
            {planFeatures?.homepage_features?.file_upload && (
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-amber-600 transition-colors">
                <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span>{t('upload_file') || "Upload File"}</span>
              </label>
            )}

            {/* Web Link Trigger */}
            <button
              type="button"
              onClick={() => {
                const url = prompt(t('enter_url') || "Enter article URL:");
                if (url) { setWebLink(url); setInputType('weblink'); setTopic(url); }
              }}
              className="flex items-center gap-2 text-sm font-medium hover:text-amber-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <span>{t('paste_link') || "Paste Link"}</span>
            </button>

          </div>

          {/* 4. Collapsible Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Level Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('level')}</label>
                  <div className="flex gap-2">
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as Level[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${level === l ? 'bg-amber-500 text-white shadow-md' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('voice')}</label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm"
                  >
                    {googleVoices.map(v => (
                      <option key={v.id || v.name} value={v.id || v.name}>{v.name} ({v.languageCodes?.[0]})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>

      </div>

    </div>
  );
}