import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const ContentSelectionPage: React.FC = () => {
  const router = useRouter();
  const [contentType, setContentType] = useState<string>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [spotifyUrl, setSpotifyUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Token kontrolü yap, eğer token yoksa login sayfasına yönlendir
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Kullanıcı bilgilerini al (gerçek bir uygulamada API'den alınır)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('User data parsing error', e);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    let content = '';
    let contentUrl = '';

    // İçerik tipine göre değerleri belirle
    switch (contentType) {
      case 'youtube':
        content = youtubeUrl;
        contentUrl = youtubeUrl;
        break;
      case 'spotify':
        content = spotifyUrl;
        contentUrl = spotifyUrl;
        break;
      case 'text':
        content = textContent;
        break;
      default:
        setError('Lütfen bir içerik türü seçin');
        setIsLoading(false);
        return;
    }

    // Boş içerik kontrolü
    if (!content.trim()) {
      setError('Lütfen içerik girin');
      setIsLoading(false);
      return;
    }

    try {
      // API'ye içerik gönder
      const response = await fetch('/api/content/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: contentType,
          content,
          url: contentUrl
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Başarılı durumda ders sayfasına yönlendir
        router.push(`/lesson/${data.lessonId}`);
      } else {
        // Hata mesajını göster
        setError(data.message || 'İçerik işlenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Content process error:', error);
      setError('Bir hata oluştu, lütfen tekrar deneyin');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-blue-50">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">LingRoot</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-600">
              Merhaba, <span className="font-semibold">{user.name}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">İçerik Seçimi</h2>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">İşlemek istediğiniz içerik türünü seçin</h3>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setContentType('youtube')}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    contentType === 'youtube' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="fab fa-youtube text-xl mr-2"></i>
                  YouTube Video
                </button>
                
                <button
                  type="button"
                  onClick={() => setContentType('spotify')}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    contentType === 'spotify' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="fab fa-spotify text-xl mr-2"></i>
                  Spotify Podcast
                </button>
                
                <button
                  type="button"
                  onClick={() => setContentType('text')}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    contentType === 'text' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-file-alt text-xl mr-2"></i>
                  Metin İçeriği
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              {contentType === 'youtube' && (
                <div className="mb-6">
                  <label htmlFor="youtube-url" className="block text-gray-700 mb-2">
                    YouTube Video URL'si
                  </label>
                  <input
                    type="url"
                    id="youtube-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </div>
              )}
              
              {contentType === 'spotify' && (
                <div className="mb-6">
                  <label htmlFor="spotify-url" className="block text-gray-700 mb-2">
                    Spotify Podcast URL'si
                  </label>
                  <input
                    type="url"
                    id="spotify-url"
                    placeholder="https://open.spotify.com/episode/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                  />
                </div>
              )}
              
              {contentType === 'text' && (
                <div className="mb-6">
                  <label htmlFor="text-content" className="block text-gray-700 mb-2">
                    Metin İçeriği
                  </label>
                  <textarea
                    id="text-content"
                    placeholder="İşlemek istediğiniz metni buraya yapıştırın..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[200px]"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  ></textarea>
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="level" className="block text-gray-700 mb-2">
                  İngilizce Seviyeniz
                </label>
                <select
                  id="level"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  defaultValue="a2"
                >
                  <option value="a1">A1 (Başlangıç)</option>
                  <option value="a2">A2 (Temel)</option>
                  <option value="b1">B1 (Orta-Alt)</option>
                  <option value="b2">B2 (Orta)</option>
                  <option value="c1">C1 (İleri)</option>
                  <option value="c2">C2 (Ustalaşmış)</option>
                </select>
              </div>
              
              {error && (
                <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-blue-600 text-white py-3 rounded-md ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    İşleniyor...
                  </span>
                ) : (
                  'İçeriği İşle'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContentSelectionPage; 