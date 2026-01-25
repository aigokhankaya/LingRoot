/**
 * 🗺️ Journey Roadmap Component
 * 
 * Kullanıcının gelişim yolculuğunu gösteren görsel harita.
 * Kilitli/Açık görevler, sis efekti ve milestone'lar.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Quest {
  id: number;
  title: string;
  description: string;
  step_order: number;
  week_number: number;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  task_type: string;
  icon_emoji: string;
  reward_xp: number;
  is_major_milestone: boolean;
  content_url?: string;
  has_content?: boolean;
  content_ready?: boolean;
}

interface RoadmapData {
  current: Quest | null;
  upcoming: Quest[];
  completed: Quest[];
  lockedPreview: Quest[];
  totalLocked: number;
}

interface JourneyRoadmapProps {
  onQuestClick?: (quest: Quest) => void;
  onStartOnboarding?: () => void;
}

export const JourneyRoadmap: React.FC<JourneyRoadmapProps> = ({ onQuestClick, onStartOnboarding }) => {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/gamification/roadmap`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setRoadmap(data.data);
      }
    } catch (error) {
      console.error('Roadmap fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRoadmap = async () => {
    setIsGenerating(true);
    console.log('[JourneyRoadmap] Starting createDefaultRoadmap...');

    try {
      const token = localStorage.getItem('lingroot_token');
      console.log('[JourneyRoadmap] Token exists:', !!token, 'Length:', token?.length);

      // Token kontrolü
      if (!token || token === 'null' || token.length < 10) {
        console.error('[JourneyRoadmap] Invalid token, attempting fallback');
        throw new Error('Invalid token');
      }

      // Varsayılan değerlerle plan oluştur (B1 -> C1, Career)
      console.log('[JourneyRoadmap] Calling onboarding/complete API...');
      const response = await fetch(`${API_BASE}/api/gamification/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          archetype: 'career',
          assessedCEFR: 'B1',
          targetCEFR: 'C1',
          weeklyMinutes: 140
        })
      });

      const data = await response.json();
      console.log('[JourneyRoadmap] API Response:', data);

      if (data.success) {
        console.log('[JourneyRoadmap] SUCCESS! Roadmap created in database.');
        localStorage.setItem('onboarding_completed', 'true');
        setError(null);
        await fetchRoadmap();
        return;
      } else {
        console.warn('[JourneyRoadmap] API returned failure:', data.error || data.message);
        throw new Error(data.error || 'API returned failure');
      }
    } catch (error) {
      console.error('[JourneyRoadmap] Backend plan creation failed:', error);
      // Hata durumunda kullanıcıya mesaj göster, mock data oluşturma
      setError('Yol haritası oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetRoadmap = async () => {
    setIsResetting(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/gamification/onboarding/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        // localStorage'dan onboarding flag'ini kaldır
        localStorage.removeItem('onboarding_completed');
        setShowResetConfirm(false);
        // Welcome sayfasına yönlendir
        router.push('/welcome');
      } else {
        setError('Sıfırlama başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('[JourneyRoadmap] Reset failed:', error);
      setError('Sıfırlama başarısız oldu.');
    } finally {
      setIsResetting(false);
    }
  };

  // Quest tıklama işleyicisi - içerik URL'ine yönlendir
  const handleQuestClick = (quest: Quest) => {
    if (quest.status === 'locked') return;

    // İçerik URL'i varsa oraya yönlendir
    if (quest.content_url && quest.status !== 'completed') {
      router.push(quest.content_url);
      return;
    }

    // Fallback: task tipine göre yönlendir
    const fallbackUrls: Record<string, string> = {
      vocabulary: '/vocabulary',
      listen: '/dashboard?tab=reading-history',
      quiz: '/quiz',
      milestone: '/dashboard',
    };

    if (quest.status !== 'completed') {
      router.push(fallbackUrls[quest.task_type] || '/dashboard');
    }

    // Callback varsa çağır
    onQuestClick?.(quest);
  };

  if (loading) {
    return (
      <div className="roadmap-loading">
        <div className="loading-path">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-node" />
          ))}
        </div>
        <style jsx>{`
          .roadmap-loading {
            padding: 40px 20px;
          }
          .loading-path {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 40px;
          }
          .loading-node {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.1);
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // Check if onboarding was completed (localStorage fallback for when API fails)
  const onboardingCompleted = typeof window !== 'undefined' && localStorage.getItem('onboarding_completed') === 'true';

  // Check if roadmap is effectively empty (API returned object but no quests)
  const isRoadmapEmpty = !roadmap || (
    !roadmap.current &&
    (!roadmap.upcoming || roadmap.upcoming.length === 0) &&
    (!roadmap.completed || roadmap.completed.length === 0) &&
    (!roadmap.lockedPreview || roadmap.lockedPreview.length === 0)
  );

  if (isRoadmapEmpty) {
    // Show prominent CTA to create/start journey
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 p-8 md:p-12 rounded-3xl shadow-2xl text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-300 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="text-6xl md:text-7xl animate-bounce hidden md:block">🗺️</div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {onboardingCompleted ? 'Öğrenme Planını Oluştur' : 'Kişisel Yolculuğunu Başlat!'}
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-md">
                {onboardingCompleted
                  ? 'Sana özel hazırlanmış haftalık hedefler ve görevlerle İngilizce seviyeni yükselt.'
                  : 'Liro ile tanış, seviyeni belirle ve sana özel hazırlanan haftalık öğrenme planını keşfet.'
                }
              </p>
            </div>
          </div>

          <button
            className={`
              flex items-center gap-3 bg-white text-teal-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all
              ${isGenerating ? 'opacity-80 cursor-wait' : 'hover:scale-105 hover:shadow-xl'}
            `}
            onClick={createDefaultRoadmap}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <span>Plan Hazırlanıyor...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Hemen Başla</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Calculate roadmap data safely
  const allQuests = roadmap ? [
    ...roadmap.completed.slice(-2),
    roadmap.current,
    ...roadmap.upcoming,
    ...roadmap.lockedPreview
  ].filter(Boolean) as Quest[] : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-3">⚠️ Yol Haritasını Sıfırla</h3>
            <p className="text-slate-600 mb-6">
              Tüm ilerlemeniz, XP, başarımlar ve streak sıfırlanacak. Onboarding'ı tekrar yapmanız gerekecek.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                disabled={isResetting}
              >
                Vazgeç
              </button>
              <button
                onClick={resetRoadmap}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                disabled={isResetting}
              >
                {isResetting ? 'Sıfırlanıyor...' : 'Evet, Sıfırla'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-2xl font-bold text-slate-800">Yolculuğun</h2>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          title="Yol haritasını sıfırla"
        >
          🔄 Sıfırla
        </button>
      </div>

      <div className="relative overflow-x-auto pb-8 pt-4 custom-scrollbar">
        <div className="flex gap-8 items-center min-w-max px-4 relative">
          {/* Path line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -z-10 transform -translate-y-8" />

          {allQuests.map((quest, index) => (
            <div
              key={quest.id}
              className={`relative flex flex-col items-center group ${quest.status === 'locked' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-105 transition-transform'}`}
              onClick={() => handleQuestClick(quest)}
            >
              {/* Connector line overlay for completed path */}
              {index > 0 && allQuests[index - 1]?.status === 'completed' && (
                <div className="absolute top-[40%] right-[100%] w-8 h-1 bg-teal-500 transform -translate-y-1/2" style={{ width: 'calc(100% + 2rem)' }} />
              )}

              {/* Node content */}
              <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all duration-300 z-10 
                  ${quest.status === 'locked' ? 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400' : ''} 
                  ${quest.status === 'unlocked' ? 'bg-white border-2 border-teal-500 text-slate-700 hover:scale-105 hover:shadow-md' : ''}
                  ${quest.status === 'in_progress' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-200 scale-110 ring-4 ring-orange-100' : ''}
                  ${quest.status === 'completed' ? 'bg-teal-500 text-white shadow-md shadow-teal-100' : ''}
                  ${quest.is_major_milestone ? 'w-20 h-20 text-4xl rounded-3xl' : ''}
              `}>
                {quest.status === 'locked' ? (
                  <span className="text-xl">🔒</span>
                ) : quest.status === 'completed' ? (
                  <span className="text-xl font-bold">✓</span>
                ) : (
                  <span>{quest.icon_emoji || '📜'}</span>
                )}

                {/* Pulse effect for current */}
                {quest.status === 'in_progress' && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                )}
              </div>

              {/* Quest info */}
              <div className="mt-4 flex flex-col items-center max-w-[120px] text-center">
                <span className={`text-xs font-bold leading-tight mb-1 ${quest.status === 'locked' ? 'text-slate-400' : 'text-slate-700'}`}>
                  {quest.title}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${quest.status === 'completed' ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-500'}`}>
                  +{quest.reward_xp} XP
                </span>
              </div>
            </div>
          ))}

          {/* More locked indicator */}
          {roadmap && roadmap.totalLocked > roadmap.lockedPreview.length && (
            <div className="relative flex flex-col items-center opacity-40">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                <span className="text-slate-400 font-bold text-xl">...</span>
              </div>
              <span className="mt-2 text-xs font-medium text-slate-400">+{roadmap.totalLocked - roadmap.lockedPreview.length} daha</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JourneyRoadmap;
