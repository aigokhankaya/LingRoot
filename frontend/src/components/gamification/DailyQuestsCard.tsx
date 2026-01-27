/**
 * 📅 Daily Quests Component
 *
 * Günlük görevleri gösteren kart.
 * Tamamlama animasyonları ve ödül toplama.
 * İlk kullanıcılar için modal ile yönlendirme.
 */

import React, { useState, useEffect } from 'react';
import { useGamification, DailyQuest } from '@/hooks/useGamification';
import { useRouter } from 'next/router';
import QuestGuideModal from './QuestGuideModal';

export const DailyQuestsCard: React.FC = () => {
  const { stats, claimDailyQuest, loading } = useGamification();
  const router = useRouter();

  // Modal state
  const [selectedQuest, setSelectedQuest] = useState<DailyQuest | null>(null);
  const [showModal, setShowModal] = useState(false);

  // İlk kullanıcı kontrolü (level 5'e kadar veya ilk 7 gün)
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
    // LocalStorage'dan kullanıcı deneyim seviyesini kontrol et
    const questGuideShownCount = parseInt(localStorage.getItem('questGuideShownCount') || '0');
    const questGuideFirstShown = localStorage.getItem('questGuideFirstShown');

    // 10 kez gösterildiyse veya 7 günden fazla olduysa deneyimli kabul et
    if (questGuideShownCount >= 10) {
      setIsNewUser(false);
    } else if (questGuideFirstShown) {
      const firstShownDate = new Date(questGuideFirstShown);
      const daysSinceFirst = (Date.now() - firstShownDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst > 7) {
        setIsNewUser(false);
      }
    }

    // Ayrıca level kontrolü (stats yüklendiğinde)
    if (stats && stats.level > 5) {
      setIsNewUser(false);
    }
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse shadow-sm">
        <div className="w-32 h-6 bg-slate-200 rounded-md mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleQuestClick = (quest: DailyQuest) => {
    if (quest.is_completed) return;

    // İlk kullanıcılar için modal göster
    if (isNewUser) {
      setSelectedQuest(quest);
      setShowModal(true);

      // Modal gösterim sayısını artır
      const count = parseInt(localStorage.getItem('questGuideShownCount') || '0');
      localStorage.setItem('questGuideShownCount', String(count + 1));

      // İlk gösterim tarihini kaydet
      if (!localStorage.getItem('questGuideFirstShown')) {
        localStorage.setItem('questGuideFirstShown', new Date().toISOString());
      }

      return;
    }

    // Deneyimli kullanıcılar için direkt yönlendir (ama activeQuest kaydet)
    localStorage.setItem('activeQuest', JSON.stringify({
      id: quest.id,
      task_type: quest.task_type,
      task_title: quest.task_title,
      description: quest.description,
      target_amount: quest.target_amount,
      current_amount: quest.current_amount,
      xp_reward: quest.xp_reward
    }));

    navigateToQuest(quest);
  };

  const navigateToQuest = (quest: DailyQuest) => {
    // Sector-specific quests
    const sectorId = (quest as any).sector_id;
    if (sectorId) {
      switch (quest.task_type) {
        case 'sector_vocab':
        case 'sector_vocabulary':
          router.push(`/sectors/${sectorId}?tab=vocabulary`);
          return;
        case 'sector_content':
        case 'sector_article':
          router.push(`/sectors/${sectorId}?tab=content`);
          return;
        case 'sector_roleplay':
        case 'sector_dialogue':
          router.push(`/sectors/${sectorId}?tab=roleplay`);
          return;
        case 'sector_podcast':
          router.push(`/sectors/${sectorId}?tab=podcast`);
          return;
      }
    }

    // General quests
    switch (quest.task_type) {
      case 'learn_words':
        router.push('/vocabulary?mode=new');
        break;
      case 'review_words':
        router.push('/vocabulary?mode=due');
        break;
      case 'create_content':
      case 'listen_minutes':
      case 'listen_content':
      case 'complete_content':
        router.push('/welcome');
        break;
      case 'complete_quiz':
        router.push('/dashboard?tab=reading-history');
        break;
      default:
        router.push('/dashboard');
        break;
    }
  };

  const completedCount = stats.dailyQuests.filter(q => q.is_completed).length;
  const totalCount = stats.dailyQuests.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h3 className="text-xl font-bold text-slate-800">Günlük Görevler</h3>
        </div>
        <div className="flex items-center">
          <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {stats.dailyQuests.map((quest) => (
          <QuestItem
            key={quest.id}
            quest={quest}
            onClaim={() => claimDailyQuest(quest.id)}
            onClick={() => handleQuestClick(quest)}
          />
        ))}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <span className="text-xl">🎉</span>
          <span className="text-sm font-bold text-emerald-700">Tüm günlük görevler tamamlandı!</span>
        </div>
      )}

      {/* Quest Guide Modal - İlk kullanıcılar için */}
      {selectedQuest && (
        <QuestGuideModal
          quest={selectedQuest}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedQuest(null);
          }}
        />
      )}
    </div>
  );
};

interface QuestItemProps {
  quest: DailyQuest;
  onClaim: () => void;
  onClick: () => void;
}

const QuestItem: React.FC<QuestItemProps> = ({ quest, onClaim, onClick }) => {
  const progress = Math.min((quest.current_amount / quest.target_amount) * 100, 100);
  const isComplete = quest.is_completed;
  const isClaimed = quest.is_claimed;
  const [showDescription, setShowDescription] = React.useState(false);

  const getTaskIcon = (type: string) => {
    const icons: Record<string, string> = {
      listen_minutes: '🎧',
      learn_words: '📚',
      complete_content: '✅',
      complete_quiz: '🧠',
      review_words: '📝',
      create_content: '✨',
      listen_content: '👂',
      // Sector-specific quest icons
      sector_vocab: '💼',
      sector_vocabulary: '💼',
      sector_content: '📰',
      sector_article: '📰',
      sector_roleplay: '🎭',
      sector_dialogue: '🎭',
      sector_podcast: '🎙️'
    };
    return icons[type] || '📋';
  };

  // Varsayılan açıklamalar (backend'den gelmezse)
  const getDefaultDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      listen_minutes: 'Ana sayfadan veya içerik sayfalarından bir içerik seç ve dinlemeye başla.',
      listen_content: 'Ana sayfadan veya "İçeriklerim" bölümünden bir içerik seç ve dinlemeye başla.',
      complete_content: 'Bir içeriği sonuna kadar dinleyerek tamamla.',
      learn_words: 'Kelime Kartları bölümüne git ve yeni kelimeler öğren.',
      review_words: 'Kelime Kartları bölümündeki "Tekrar Et" sekmesine git.',
      complete_quiz: 'Bir içeriği dinledikten sonra quiz\'i tamamla.',
      create_content: '"Yeni İçerik Oluştur" butonuna tıkla ve içerik üret.',
      sector_vocab: 'Sektörler sayfasından sektörel kelimeleri öğren.',
      sector_vocabulary: 'Sektörler sayfasından sektörel kelimeleri öğren.',
      sector_content: 'Sektörler sayfasından sektörel içerik dinle.',
      sector_quiz: 'Sektör içeriğinin quiz\'ini tamamla.',
      sector_podcast: 'Sektörler sayfasından bir podcast dinle.',
      sector_roleplay: 'Sektörler sayfasından bir roleplay tamamla.',
    };
    return descriptions[type] || 'Görevi tamamlamak için tıkla.';
  };

  const description = quest.description || getDefaultDescription(quest.task_type);

  return (
    <div
      onClick={!isComplete ? onClick : undefined}
      className={`
            flex flex-col p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
            ${isComplete
          ? 'bg-emerald-50/50 border-emerald-100'
          : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md cursor-pointer hover:bg-slate-50'}
            ${isClaimed ? 'opacity-60 saturate-50' : ''}
        `}>
      {/* Parent Quest Badge - Yolculuk ile bağlantılı görevler */}
      {(quest as any).parent_quest_node_id && (
        <div className="absolute top-1 right-1">
          <span className="text-[9px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            🗺️
          </span>
        </div>
      )}

      {/* Sector Quest Badge - Sektör ile bağlantılı görevler */}
      {(quest as any).sector_id && !(quest as any).parent_quest_node_id && (
        <div className="absolute top-1 right-1">
          <span className="text-[9px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            💼
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0
                  ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}
              `}>
          {getTaskIcon(quest.task_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-bold truncate pr-2 ${isComplete ? 'text-emerald-900' : 'text-slate-700'}`}>
              {quest.task_title}
            </span>
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 flex-shrink-0">
              +{quest.xp_reward} XP
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 w-12 text-right flex-shrink-0">
              {quest.current_amount}/{quest.target_amount}
            </span>
          </div>
        </div>

        {isComplete && !isClaimed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClaim();
            }}
            className="ml-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-200 animate-pulse hover:scale-105 active:scale-95 transition-transform z-10 flex-shrink-0"
          >
            Al!
          </button>
        )}

        {isClaimed && (
          <div className="ml-2 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 flex-shrink-0">
            <span className="text-base font-bold">✓</span>
          </div>
        )}
      </div>

      {/* Açıklama bölümü - Tamamlanmamış görevler için */}
      {!isComplete && !isClaimed && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDescription(!showDescription);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="text-[10px]">💡</span>
            <span>{showDescription ? 'Gizle' : 'Nasıl yapılır?'}</span>
            <span className={`transform transition-transform ${showDescription ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showDescription && (
            <p className="mt-2 text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyQuestsCard;
