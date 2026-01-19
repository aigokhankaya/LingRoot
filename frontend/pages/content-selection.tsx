import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '../src/lib/i18n';
import AppHeader from '@/components/AppHeader';

const ContentSelectionPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
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
        setError(t('content_selection_select_content_type_error'));
        setIsLoading(false);
        return;
    }

    // Boş içerik kontrolü
    if (!content.trim()) {
      setError(t('content_selection_enter_content_error'));
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
        setError(data.message || t('content_selection_process_error_generic'));
      }
    } catch (error) {
      console.error('Content process error:', error);
      setError(t('content_selection_error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-muted">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-muted">
      <AppHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">{t('content_selection_title')}</h2>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('content_selection_subtitle')}</h3>

              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setContentType('youtube')}
                  className={`px-4 py-2 rounded-md flex items-center ${contentType === 'youtube'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <i className="fab fa-youtube text-xl mr-2"></i>
                  {t('content_selection_youtube_video')}
                </button>

                <button
                  type="button"
                  onClick={() => setContentType('spotify')}
                  className={`px-4 py-2 rounded-md flex items-center ${contentType === 'spotify'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <i className="fab fa-spotify text-xl mr-2"></i>
                  {t('content_selection_spotify_podcast')}
                </button>

                <button
                  type="button"
                  onClick={() => setContentType('text')}
                  className={`px-4 py-2 rounded-md flex items-center ${contentType === 'text'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <i className="fas fa-file-alt text-xl mr-2"></i>
                  {t('content_selection_text_content')}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {contentType === 'youtube' && (
                <div className="mb-6">
                  <label htmlFor="youtube-url" className="block text-gray-700 mb-2">
                    {t('content_selection_youtube_url_label')}
                  </label>
                  <input
                    type="url"
                    id="youtube-url"
                    placeholder={t('content_selection_youtube_url_placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </div>
              )}

              {contentType === 'spotify' && (
                <div className="mb-6">
                  <label htmlFor="spotify-url" className="block text-gray-700 mb-2">
                    {t('content_selection_spotify_url_label')}
                  </label>
                  <input
                    type="url"
                    id="spotify-url"
                    placeholder={t('content_selection_spotify_url_placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                  />
                </div>
              )}

              {contentType === 'text' && (
                <div className="mb-6">
                  <label htmlFor="text-content" className="block text-gray-700 mb-2">
                    {t('content_selection_text_content_label')}
                  </label>
                  <textarea
                    id="text-content"
                    placeholder={t('content_selection_text_content_placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary min-h-[200px]"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  ></textarea>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="level" className="block text-gray-700 mb-2">
                  {t('content_selection_english_level_label')}
                </label>
                <select
                  id="level"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
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
                className={`w-full bg-primary text-primary-foreground py-3 rounded-md ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90'
                  }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {t('content_selection_processing_button')}
                  </span>
                ) : (
                  t('content_selection_process_content_button')
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
