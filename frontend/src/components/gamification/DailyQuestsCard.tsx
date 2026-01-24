/**
 * 📅 Daily Quests Component
 * 
 * Günlük görevleri gösteren kart.
 * Tamamlama animasyonları ve ödül toplama.
 */

import React from 'react';
import { useGamification, DailyQuest } from '@/hooks/useGamification';

import { useRouter } from 'next/router';

export const DailyQuestsCard: React.FC = () => {
  const { stats, claimDailyQuest, loading } = useGamification();
  const router = useRouter();

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

  return (
    <div
      onClick={!isComplete ? onClick : undefined}
      className={`
            flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
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
          <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            💼
          </span>
        </div>
      )}

      <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm
                ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}
            `}>
        {getTaskIcon(quest.task_type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-bold truncate pr-2 ${isComplete ? 'text-emerald-900' : 'text-slate-700'}`}>
            {quest.task_title}
          </span>
          <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
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
          <span className="text-[10px] font-bold text-slate-400 w-12 text-right">
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
          className="ml-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-200 animate-pulse hover:scale-105 active:scale-95 transition-transform z-10"
        >
          Al!
        </button>
      )}

      {isClaimed && (
        <div className="ml-2 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
          <span className="text-base font-bold">✓</span>
        </div>
      )}
    </div>
  );
};

export default DailyQuestsCard;
