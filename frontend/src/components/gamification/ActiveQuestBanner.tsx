/**
 * 🎯 Active Quest Banner
 *
 * Hedef sayfalarda gösterilen aktif görev hatırlatma banner'ı.
 * Kullanıcıya ne yapması gerektiğini ve ilerlemeyi gösterir.
 */

import React, { useEffect, useState } from 'react';

interface ActiveQuest {
  id: string;
  task_type: string;
  task_title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  xp_reward: number;
}

interface ActiveQuestBannerProps {
  /** Banner'ın gösterileceği sayfa türü */
  pageType: 'content' | 'vocabulary' | 'sector' | 'quiz' | 'dashboard';
  /** Banner kapatıldığında çağrılır */
  onDismiss?: () => void;
  /** Özel className */
  className?: string;
}

// Sayfa türüne göre hangi görevlerin gösterileceği
const PAGE_QUEST_MAPPING: Record<string, string[]> = {
  content: ['listen_minutes', 'listen_content', 'complete_content', 'create_content'],
  vocabulary: ['learn_words', 'review_words'],
  sector: ['sector_vocab', 'sector_vocabulary', 'sector_content', 'sector_quiz', 'sector_podcast', 'sector_roleplay'],
  quiz: ['complete_quiz', 'sector_quiz'],
  dashboard: [] // Dashboard'da tüm görevler gösterilebilir
};

// Görev türüne göre kısa ipuçları
const QUEST_TIPS: Record<string, string> = {
  listen_minutes: 'İçerik dinlemeye devam et, süren otomatik sayılıyor',
  listen_content: 'Bir içerik seç ve dinlemeye başla',
  complete_content: 'İçeriği sonuna kadar dinle',
  create_content: '"Yeni İçerik Oluştur" butonuna tıkla',
  learn_words: 'Kartları çevirerek yeni kelimeler öğren',
  review_words: 'Öğrendiğin kelimeleri tekrar et',
  complete_quiz: 'İçerik quiz\'ini tamamla',
  sector_vocab: 'Sektörel kelimeleri öğren',
  sector_vocabulary: 'Sektörel kelimeleri öğren',
  sector_content: 'Sektörel içerik dinle',
  sector_quiz: 'Sektör quiz\'ini tamamla',
  sector_podcast: 'Podcast dinlemeye devam et',
  sector_roleplay: 'Roleplay senaryosunu tamamla'
};

const QUEST_ICONS: Record<string, string> = {
  listen_minutes: '🎧',
  listen_content: '👂',
  complete_content: '✅',
  create_content: '✨',
  learn_words: '📚',
  review_words: '📝',
  complete_quiz: '🧠',
  sector_vocab: '💼',
  sector_vocabulary: '💼',
  sector_content: '📰',
  sector_quiz: '🧠',
  sector_podcast: '🎙️',
  sector_roleplay: '🎭'
};

export const ActiveQuestBanner: React.FC<ActiveQuestBannerProps> = ({
  pageType,
  onDismiss,
  className = ''
}) => {
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // localStorage'dan aktif görevi al
    const stored = localStorage.getItem('activeQuest');
    if (stored) {
      try {
        const quest = JSON.parse(stored) as ActiveQuest;

        // Bu sayfa için uygun mu kontrol et
        const relevantTypes = PAGE_QUEST_MAPPING[pageType];
        const isRelevant = pageType === 'dashboard' ||
          relevantTypes.includes(quest.task_type);

        if (isRelevant) {
          setActiveQuest(quest);
        }
      } catch {
        localStorage.removeItem('activeQuest');
      }
    }
  }, [pageType]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.removeItem('activeQuest');
    onDismiss?.();
  };

  // Gösterme koşulları
  if (!activeQuest || isDismissed) return null;

  const progress = Math.min((activeQuest.current_amount / activeQuest.target_amount) * 100, 100);
  const icon = QUEST_ICONS[activeQuest.task_type] || '🎯';
  const tip = QUEST_TIPS[activeQuest.task_type] || 'Görevi tamamla';

  return (
    <div className={`bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl p-4 shadow-lg shadow-teal-200/50 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Aktif Görev</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">+{activeQuest.xp_reward} XP</span>
          </div>
          <h3 className="font-bold text-sm truncate">{activeQuest.task_title}</h3>
          <p className="text-xs text-white/80 mt-0.5">{tip}</p>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/70">
              {activeQuest.current_amount}/{activeQuest.target_amount}
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          title="Kapat"
        >
          <span className="text-white/70 hover:text-white text-lg">×</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveQuestBanner;
