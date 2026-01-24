/**
 * 🎮 Level Progress Bar
 * 
 * Header'da görünen animasyonlu XP ve Level göstergesi.
 * Premium, cam efektli tasarım.
 */

import React, { useEffect, useState } from 'react';
import { useGamification, levelToCEFR } from '@/hooks/useGamification';

interface LevelProgressBarProps {
  compact?: boolean;
  showStreak?: boolean;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  compact = false,
  showStreak = true
}) => {
  const { stats, loading } = useGamification();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Progress animasyonu
  useEffect(() => {
    if (stats) {
      const targetProgress = (stats.currentLevelXP / stats.xpForNextLevel) * 100;

      // Yavaş yavaş doldur
      const timer = setTimeout(() => {
        setAnimatedProgress(targetProgress);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="level-progress-skeleton">
        <div className="skeleton-bar" />
      </div>
    );
  }

  const cefr = levelToCEFR(stats.level);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">{stats.level}</span>
        </div>
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
        {showStreak && stats.streak > 0 && (
          <div className="text-sm font-semibold text-orange-500 flex items-center gap-1">
            🔥 {stats.streak}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl p-3 px-5 flex items-center gap-4 shadow-sm">
      {/* Level Badge */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />
          <span className="text-[10px] leading-none mb-0.5">⚡</span>
          <span className="text-white font-bold text-lg leading-none">{stats.level}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800">Level {stats.level}</span>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded self-start">{cefr}</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="flex-1 max-w-[200px]">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1 border border-slate-100">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full relative"
            style={{ width: `${animatedProgress}%` }}
          >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-white/30 to-transparent" />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span className="text-slate-600 font-bold">{stats.currentLevelXP.toLocaleString()}</span>
          <span>{stats.xpForNextLevel.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Streak */}
      {showStreak && (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${stats.streak > 0 ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}>
          <span className="text-lg animate-pulse">🔥</span>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold">{stats.streak}</span>
            <span className="text-[10px] font-medium opacity-80">gün</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelProgressBar;
