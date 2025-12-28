'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Topic,
  getTopicTree,
  createMainTopic,
  processTts,
  getUsageSummary,
  ProcessInputData,
  TtsResponseData,
  submitContent,
} from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import TopicInput from './TopicInput';
import TopicTree from './TopicTree';
import { useAudioPlayer, AudioTrack } from '../../context/AudioPlayerContext';

interface TopicHierarchySectionProps {
  userId: string;
  level: string;
  onContentCreated?: (result: any) => void;
  topicsFirst?: boolean;
  targetDurationMinutes?: number;
}

const TopicHierarchySection: React.FC<TopicHierarchySectionProps> = ({
  userId,
  level,
  onContentCreated,
  topicsFirst = false,
  targetDurationMinutes = 5,
}) => {
  const { t } = useTranslation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [topicAudioLoadingId, setTopicAudioLoadingId] = useState<string | null>(null);
  const [topicAudioResults, setTopicAudioResults] = useState<Record<string, TtsResponseData>>({});
  const [audioCompletedTopicId, setAudioCompletedTopicId] = useState<string | null>(null);

  // Konu ağacını yükle
  const loadTopicTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getTopicTree();

      if (response.success && response.data) {
        setTopics(response.data.topics);
        console.log('✅ Konu ağacı yüklendi:', response.data.total, 'konu');
      }
    } catch (err: any) {
      console.error('❌ Konu ağacı yükleme hatası:', err);
      setError(err.message || 'Konular yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Konu ağacındaki bir topic için ses oluşturma akışı
  const handleTopicContentCreated = async (data: any) => {
    try {
      if (!data || !data.suggestedInput || !data.topic) return;

      const topicId = data.topic.id as string;
      const suggestedInput: string = data.suggestedInput;

      setTopicAudioLoadingId(topicId);

      // Kullanım/abonelik kontrolü
      try {
        const usageSummary = await getUsageSummary();
        if (usageSummary?.success && usageSummary.data && usageSummary.data.hasPlan === false) {
          setError('Aktif paketiniz yok');
          return;
        }
        if (usageSummary?.success && usageSummary.data?.isExceeded) {
          setError('Paket kullanım sınırınız aşıldı');
          return;
        }
      } catch (e: any) {
        console.error('❌ Paket doğrulama hatası (topic audio):', e);
        setError('Paket doğrulaması yapılamadı');
        return;
      }

      const processInput: ProcessInputData = {
        type: 'subject',
        input: suggestedInput,
        level: level.toUpperCase(),
        targetDurationMinutes: targetDurationMinutes,
        mood: data.topic.mood_tag || undefined,
      };

      const result = await processTts({
        ...processInput,
        topic_id: topicId,
        suppressPlanAlerts: true
      });

      if (result && result.mp3_url) {
        const audioResult: TtsResponseData = {
          success: true,
          message: result.message || 'Ses oluşturuldu',
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: result.level || level.toUpperCase(),
          timepoints: result.timepoints || [],
          words: result.words || [],
          translated_text: (result as any).translated_text || (result as any).translatedText,
          adapted_text: (result as any).adapted_text || (result as any).adaptedText,
          translatedText: (result as any).translatedText,
          adaptedText: (result as any).adaptedText,
        };

        setTopicAudioResults(prev => ({
          ...prev,
          [topicId]: audioResult,
        }));

        try {
          const logInput =
            suggestedInput ||
            (data.topic.description ? `${data.topic.title}: ${data.topic.description}` : data.topic.title);
          await submitContent(
            logInput,
            'topic',
            audioResult.level || level.toUpperCase(),
            result.mp3_url,
            audioResult.translated_text || '',
            audioResult.adapted_text || '',
            undefined, // chapterId
            undefined, // timepoints
            undefined, // words
            result.detected_mood
          );
          console.log('Topic audio saved to content history.');
        } catch (logErr) {
          console.error('Failed to log topic audio to content history:', logErr);
        }

        // Konu ağacını yenile ki rozetler güncellensin
        await loadTopicTree();

        // Show notification instead of auto-opening modal
        setAudioCompletedTopicId(topicId);
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setAudioCompletedTopicId(null);
        }, 5000);
      } else {
        setError((result as any)?.message || 'Ses oluşturma başarısız oldu');
      }
    } catch (err: any) {
      console.error('❌ Konu için ses oluşturma hatası:', err);
      setError(err.message || 'Ses oluşturulurken hata oluştu');
    } finally {
      setTopicAudioLoadingId(null);
    }
  };

  const audioStateByTopic = useMemo(() => {
    const map: Record<string, { isLoading?: boolean; hasAudio?: boolean }> = {};

    if (topicAudioLoadingId) {
      map[topicAudioLoadingId] = { ...(map[topicAudioLoadingId] || {}), isLoading: true };
    }

    Object.keys(topicAudioResults).forEach((id) => {
      map[id] = { ...(map[id] || {}), hasAudio: true };
    });

    return map;
  }, [topicAudioLoadingId, topicAudioResults]);

  // Konu ağacından "Dinle" tıklandığında popup aç
  const findTopicById = (nodes: Topic[], id: string): Topic | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = findTopicById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Global Audio Player hook
  const audioPlayer = useAudioPlayer();

  const handleOpenAudioModal = (topicId: string) => {
    const topic = findTopicById(topics, topicId);
    const latest: any = topic && (topic as any).latest_content;

    if (!latest || !latest.mp3_url) {
      console.warn('No audio content for topic:', topicId);
      return;
    }

    // Update local cache
    setTopicAudioResults((prev) => {
      if (prev[topicId]) return prev;

      const audioResult: TtsResponseData = {
        success: true,
        message: latest.message || 'Ses oluşturuldu',
        mp3_url: latest.mp3_url,
        vtt_url: latest.vtt_url || (latest.mp3_url ? latest.mp3_url.replace('.mp3', '.vtt') : ''),
        level: latest.level || level.toUpperCase(),
        timepoints: latest.timepoints || [],
        words: latest.words || [],
        translated_text: latest.translated_text,
        adapted_text: latest.adapted_text,
        translatedText: latest.translated_text,
        adaptedText: latest.adapted_text,
      };

      return { ...prev, [topicId]: audioResult };
    });

    // Use Global Audio Player instead of local modal
    const audioTrack: AudioTrack = {
      id: topicId,
      url: latest.mp3_url,
      title: topic?.title || 'Ses Oynatıcı',
      level: latest.level || level.toUpperCase(),
      words: latest.words || [],
      timepoints: latest.timepoints || [],
      originalText: latest.adapted_text || latest.message || '',
      translatedText: latest.translated_text || '',
      dialogueSegments: latest.dialogue_segments || [],
      topic: topic?.title,
    };

    console.log('🎵 [TOPIC HIERARCHY] Opening global audio player for:', topic?.title);
    audioPlayer.playTrack(audioTrack);
  };

  const renderEmptyState = (formPosition: 'above' | 'below') => (
    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <i className="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
      <p className="text-gray-600 mb-2">{t('topics_empty_title')}</p>
      <p className="text-sm text-gray-500">
        {formPosition === 'above'
          ? t('topics_empty_desc_above')
          : t('topics_empty_desc_below')}
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <i className="fas fa-spinner fa-spin text-3xl text-primary mb-3"></i>
      <p className="text-gray-600">{t('topics_loading')}</p>
    </div>
  );

  // Component mount'ta yükle
  useEffect(() => {
    loadTopicTree();
  }, [userId]);

  // Ana konu oluştur
  const handleCreateMainTopic = async (title: string, description?: string, mood?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await createMainTopic({
        title,
        description,
        level,
        mood
      });

      if (response.success) {
        setSuccessMessage('Ana konu başarıyla oluşturuldu!');
        await loadTopicTree(); // Listeyi yenile

        // 3 saniye sonra mesajı temizle
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('❌ Ana konu oluşturma hatası:', err);
      setError(err.message || 'Ana konu oluşturulurken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bilgilendirme */}
      <div className="bg-secondary/10 border border-secondary/40 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <i className="fas fa-sitemap text-3xl text-primary"></i>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                📚 {t('topics_hierarchy_title')}
              </h3>
              <Link
                href="/dashboard?tab=reading-history"
                className="text-xs text-primary hover:text-primary/80 flex items-center space-x-1"
              >
                <i className="fas fa-history"></i>
                <span>{t('topics_hierarchy_link_history')}</span>
              </Link>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {t('topics_hierarchy_desc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>{t('topics_hierarchy_bullet_infinite_tree')}</span>
              </div>
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>{t('topics_hierarchy_bullet_ai')}</span>
              </div>
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>{t('topics_hierarchy_bullet_audio')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <i className="fas fa-check-circle mr-2"></i>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Audio Generation Completed Notification */}
      {audioCompletedTopicId && topicAudioResults[audioCompletedTopicId] && (
        <div
          onClick={() => {
            handleOpenAudioModal(audioCompletedTopicId);
            setAudioCompletedTopicId(null);
          }}
          className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
              <i className="fas fa-check"></i>
            </div>
            <div>
              <p className="font-medium text-green-800">Seslendirme tamamlandı</p>
              <p className="text-sm text-green-600">Dinlemek için tıklayın</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAudioCompletedTopicId(null);
            }}
            className="w-8 h-8 rounded-full hover:bg-green-200 flex items-center justify-center text-green-600"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {topicsFirst ? (
        <>
          {/* Konu Ağacı */}
          {topics.length > 0 ? (
            <TopicTree
              topics={topics}
              onRefresh={loadTopicTree}
              onContentCreated={handleTopicContentCreated}
              level={level}
              audioStateByTopic={audioStateByTopic}
              onOpenAudioModal={handleOpenAudioModal}
            />
          ) : (
            !isLoading && renderEmptyState('below')
          )}

          {/* Loading State */}
          {isLoading && topics.length === 0 && renderLoadingState()}

          {/* Ana Konu Girişi */}
          <TopicInput
            onCreateTopic={handleCreateMainTopic}
            isLoading={isLoading}
            level={level}
          />
        </>
      ) : (
        <>
          {/* Ana Konu Girişi */}
          <TopicInput
            onCreateTopic={handleCreateMainTopic}
            isLoading={isLoading}
            level={level}
          />

          {/* Konu Ağacı */}
          {topics.length > 0 ? (
            <TopicTree
              topics={topics}
              onRefresh={loadTopicTree}
              onContentCreated={handleTopicContentCreated}
              level={level}
              audioStateByTopic={audioStateByTopic}
              onOpenAudioModal={handleOpenAudioModal}
            />
          ) : (
            !isLoading && renderEmptyState('above')
          )}

          {/* Loading State */}
          {isLoading && topics.length === 0 && renderLoadingState()}
        </>
      )}

      {/* Topic audio popup player - Artık GlobalAudioContainer tarafından yönetiliyor */}
    </div>
  );
};

export default TopicHierarchySection;
