/**
 * 🎯 Personalized For You Section
 *
 * Kullanıcıya özel içerik önerilerini gösteren bölüm.
 * - Yarım kalan içerikler (en öncelikli)
 * - Seviyeye uygun öneriler
 * - İlgi alanlarına göre öneriler
 * - Sektör içerikleri
 *
 * v2.1 - Kalite iyileştirmeleri: Error handling, TypeScript, Accessibility, Performance
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAudioPlayerSafe } from '@/context/AudioPlayerContext';
import { getTopicContent } from '@/lib/api';
import {
  CATEGORY_ORDER,
  getCategoryConfig,
  getContentTypeIcon,
  getContentTypeLabel
} from './recommendationConfig';

// ============================================================================
// Constants
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const FILTER_STORAGE_KEY = 'lingroot_recommendation_filters';
const LOG_PREFIX = '[PersonalizedForYou]';

// ============================================================================
// Types
// ============================================================================

interface Recommendation {
  id: string;
  category: string;
  content_type: string;
  content_id: string | null;
  title: string;
  description: string | null;
  target_url: string;
  cefr_level: string | null;
  duration_minutes: number | null;
  reason: string;
  reason_key: string | null;
  score: number;
  rank: number;
  source_data: Record<string, unknown>;
  is_dismissed: boolean;
  is_clicked: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PersonalizedForYouSectionProps {
  className?: string;
  maxItems?: number;
  showTitle?: boolean;
  showFilters?: boolean;
  compactMode?: boolean;
  onItemClick?: (item: Recommendation) => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Safely parse JSON from localStorage
 */
function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to parse localStorage value:`, err);
    return fallback;
  }
}

/**
 * Safely save to localStorage
 */
function safeSaveToStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to save to localStorage:`, err);
    return false;
  }
}


// ============================================================================
// Component
// ============================================================================

export const PersonalizedForYouSection: React.FC<PersonalizedForYouSectionProps> = ({
  className = '',
  maxItems = 6,
  showTitle = true,
  showFilters = true,
  compactMode = false,
  onItemClick
}) => {
  const router = useRouter();
  const audioPlayer = useAudioPlayerSafe();

  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const currentLoadingIdRef = useRef<string | null>(null);

  // State
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load saved filter preferences
  useEffect(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    const parsed = safeParseJSON<string[]>(saved, []);
    if (Array.isArray(parsed)) {
      setSelectedCategories(parsed);
    }
  }, []);

  // Save filter preferences
  const updateFilters = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
    safeSaveToStorage(FILTER_STORAGE_KEY, categories);
  }, []);

  // Memoized category counts - prevents recalculation on every render
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recommendations.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [recommendations]);

  // Get available categories from recommendations
  const availableCategories = useMemo(() => {
    const categories = new Set(recommendations.map(r => r.category));
    return CATEGORY_ORDER.filter(cat => categories.has(cat));
  }, [recommendations]);

  // Filter recommendations based on selected categories
  const filteredRecommendations = useMemo(() => {
    if (selectedCategories.length === 0) {
      return recommendations;
    }
    return recommendations.filter(r => selectedCategories.includes(r.category));
  }, [recommendations, selectedCategories]);

  // Toggle category filter
  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];

      safeSaveToStorage(FILTER_STORAGE_KEY, newCategories);
      return newCategories;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    updateFilters([]);
  }, [updateFilters]);

  // Fetch recommendations with AbortController support
  const fetchRecommendations = useCallback(async (refresh = false) => {
    // Cancel any pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const token = localStorage.getItem('lingroot_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/recommendations/personalized?limit=${maxItems}&refresh=${refresh}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortControllerRef.current.signal
        }
      );

      const data: ApiResponse<Recommendation[]> = await response.json();

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      console.log(`${LOG_PREFIX} API Response:`, data);

      if (data.success) {
        setRecommendations(data.data || []);
        setError(null);
      } else {
        throw new Error(data.error || 'Öneriler alınamadı');
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`${LOG_PREFIX} Request aborted`);
        return;
      }

      console.error(`${LOG_PREFIX} Fetch error:`, err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [maxItems]);

  useEffect(() => {
    fetchRecommendations();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchRecommendations]);

  // Track interaction (fire and forget with logging)
  const trackInteraction = useCallback((itemId: string, type: 'click' | 'dismiss') => {
    const token = localStorage.getItem('lingroot_token');
    if (!token) return;

    fetch(`${API_BASE}/api/recommendations/${itemId}/interaction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type })
    }).catch(err => {
      console.warn(`${LOG_PREFIX} Failed to track ${type} interaction:`, err);
    });
  }, []);

  const handleItemClick = async (item: Recommendation) => {
    // Track click interaction (fire and forget)
    trackInteraction(item.id, 'click');

    // Topic içerikleri için AudioPlayer kullan
    if (item.content_type === 'topic' && item.content_id && audioPlayer) {
      // Prevent race condition - track current loading item
      const loadingId = item.id;
      currentLoadingIdRef.current = loadingId;

      try {
        setLoadingContent(loadingId);
        console.log(`${LOG_PREFIX} Loading topic content:`, item.content_id);

        const response = await getTopicContent(item.content_id);

        // Check if this is still the current loading item (race condition prevention)
        if (currentLoadingIdRef.current !== loadingId) {
          console.log(`${LOG_PREFIX} Loading cancelled - different item clicked`);
          return;
        }

        if (response.success && response.data) {
          // Audio URL kontrolü
          if (!response.data.mp3_url) {
            console.warn(`${LOG_PREFIX} Topic has no audio yet`);
            setLoadingContent(null);
            currentLoadingIdRef.current = null;
            router.push(`/welcome?topicId=${item.content_id}&action=generate-audio`);
            return;
          }

          console.log(`${LOG_PREFIX} Playing topic via AudioPlayer`);
          audioPlayer.playTrack({
            id: item.content_id,
            url: response.data.mp3_url,
            title: response.data.title || item.title,
            level: response.data.level || item.cefr_level || 'B1',
            words: response.data.words || [],
            timepoints: response.data.timepoints || [],
            originalText: response.data.adapted_text || '',
            translatedText: response.data.translated_text || '',
            topic: response.data.title || item.title,
          });
          setLoadingContent(null);
          currentLoadingIdRef.current = null;
          return;
        } else {
          console.warn(`${LOG_PREFIX} Topic content not found, falling back to navigation`);
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} Error loading topic content:`, err);
      }

      // Only clear loading state if this is still the current loading item
      if (currentLoadingIdRef.current === loadingId) {
        setLoadingContent(null);
        currentLoadingIdRef.current = null;
      }
    }

    // Callback veya yönlendirme (topic dışı içerikler veya fallback)
    if (onItemClick) {
      onItemClick(item);
    } else {
      router.push(item.target_url);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, item: Recommendation) => {
    e.stopPropagation();

    // Optimistic UI update - remove from list immediately
    setRecommendations(prev => prev.filter(r => r.id !== item.id));

    // Track dismiss interaction
    trackInteraction(item.id, 'dismiss');
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl font-bold text-slate-800">Sana Özel</h2>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Debug: Neden görünmüyor?
  if (error) {
    console.log('[PersonalizedForYou] Error:', error);
    return null;
  }

  if (recommendations.length === 0) {
    console.log('[PersonalizedForYou] No recommendations found');
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl font-bold text-slate-800">Sana Özel</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredRecommendations.length}/{recommendations.length} öneri
            </span>
          </div>
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing}
            className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Yenile</span>
          </button>
        </div>
      )}

      {/* Category Filters */}
      {showFilters && availableCategories.length > 1 && (
        <nav className="mb-4" aria-label="Öneri kategori filtreleri">
          <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Filtre seçenekleri">
            {/* All filter button */}
            <button
              onClick={clearFilters}
              aria-pressed={selectedCategories.length === 0}
              aria-label="Tüm önerileri göster"
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                ${selectedCategories.length === 0
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                }`}
            >
              Tümü
            </button>

            {/* Category filter chips - using memoized counts */}
            {availableCategories.map(category => {
              const config = getCategoryConfig(category);
              const isSelected = selectedCategories.includes(category);
              const count = categoryCounts[category] || 0;

              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  aria-pressed={isSelected}
                  aria-label={`${config.label} kategorisi, ${count} öneri`}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5
                    ${isSelected ? config.selectedColor : `${config.color} hover:opacity-80`}`}
                  title={config.description}
                >
                  <span aria-hidden="true">{config.icon}</span>
                  <span>{config.shortLabel}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-200/50'}`}
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Empty state when filtered */}
      {filteredRecommendations.length === 0 && selectedCategories.length > 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-2xl">
          <p className="text-slate-500 text-sm mb-2">Bu kategoride öneri bulunamadı</p>
          <button
            onClick={clearFilters}
            className="text-teal-600 text-sm font-medium hover:underline"
          >
            Filtreleri temizle
          </button>
        </div>
      )}

      {/* Recommendations Grid */}
      <section
        aria-label="Kişiselleştirilmiş öneriler"
        className={`grid gap-4 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
      >
        {filteredRecommendations.map(item => {
          const categoryConfig = getCategoryConfig(item.category);
          const contentIcon = getContentTypeIcon(item.content_type);
          const isLoading = loadingContent === item.id;
          const isExpanded = expandedCard === item.id;

          return (
            <article
              key={item.id}
              aria-busy={isLoading}
              aria-label={`${item.title} - ${categoryConfig.label}`}
              className={`group bg-white rounded-2xl border border-slate-200 cursor-pointer
                         hover:border-teal-200 hover:shadow-lg hover:shadow-teal-50
                         transition-all duration-200 relative overflow-hidden
                         ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Main clickable area */}
              <div
                onClick={() => !isLoading && handleItemClick(item)}
                className="p-4"
              >
                {/* Top row: Category + Actions */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryConfig.color}`}
                    >
                      {categoryConfig.icon} {categoryConfig.label}
                    </span>
                    {item.cefr_level && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        {item.cefr_level}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1" role="group" aria-label="Öneri aksiyonları">
                    {/* Info button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCard(isExpanded ? null : item.id);
                      }}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Detayları gizle' : 'Neden önerildi - detayları göster'}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all
                        ${isExpanded
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 focus:opacity-100'
                        }`}
                      title="Neden önerildi?"
                    >
                      <span aria-hidden="true">?</span>
                    </button>

                    {/* Dismiss button */}
                    <button
                      onClick={(e) => handleDismiss(e, item)}
                      aria-label={`${item.title} önerisini kaldır`}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200
                                rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100
                                transition-opacity text-slate-400 hover:text-slate-600 text-xs"
                      title="Kaldır"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex gap-3">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50
                                 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                                 group-hover:scale-110 transition-transform"
                  >
                    {contentIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.reason}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {item.duration_minutes && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        ⏱️ ~{item.duration_minutes} dk
                      </span>
                    )}
                    {item.content_type && (
                      <span className="text-[10px] text-slate-300">
                        • {getContentTypeLabel(item.content_type)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-teal-600 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Başla →
                  </span>
                </div>
              </div>

              {/* Expanded details panel */}
              {isExpanded && (
                <div
                  className="border-t border-slate-100 bg-slate-50/50 px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-xs space-y-2">
                    {/* Why recommended */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 flex-shrink-0">💡</span>
                      <div>
                        <span className="font-medium text-slate-600">Neden önerildi?</span>
                        <p className="text-slate-500 mt-0.5">{categoryConfig.description}</p>
                      </div>
                    </div>

                    {/* Source */}
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 flex-shrink-0">📍</span>
                      <div>
                        <span className="font-medium text-slate-600">Kaynak:</span>
                        <span className="text-slate-500 ml-1">{categoryConfig.source}</span>
                      </div>
                    </div>

                    {/* Detailed reason if available */}
                    {item.reason && item.reason !== categoryConfig.description && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 flex-shrink-0">📝</span>
                        <div>
                          <span className="font-medium text-slate-600">Detay:</span>
                          <p className="text-slate-500 mt-0.5">{item.reason}</p>
                        </div>
                      </div>
                    )}

                    {/* Score indicator */}
                    {item.score > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-slate-400 flex-shrink-0">⭐</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-600">Uyumluluk</span>
                            <span className="text-slate-500">{Math.min(100, Math.round(item.score))}%</span>
                          </div>
                          <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, item.score)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default PersonalizedForYouSection;
