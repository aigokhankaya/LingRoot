/**
 * Recommendation Category Configuration
 * Configuration for personalized recommendation categories and content types
 */

export interface CategoryConfig {
  icon: string;
  label: string;
  shortLabel: string;
  color: string;
  selectedColor: string;
  description: string;
  source: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  continue_listening: {
    icon: '▶️',
    label: 'Devam Et',
    shortLabel: 'Devam',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    selectedColor: 'bg-amber-500 text-white border-amber-500',
    description: 'Yarıda bıraktığın içerikler',
    source: 'Dinleme geçmişinden'
  },
  level_appropriate: {
    icon: '📊',
    label: 'Seviyene Uygun',
    shortLabel: 'Seviye',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    selectedColor: 'bg-teal-500 text-white border-teal-500',
    description: 'CEFR seviyene göre seçildi',
    source: 'Seviye analizinden'
  },
  based_on_interests: {
    icon: '💡',
    label: 'İlgi Alanın',
    shortLabel: 'İlgi',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    selectedColor: 'bg-cyan-500 text-white border-cyan-500',
    description: 'İlgi alanlarına göre öneriler',
    source: 'Profil tercihlerinden'
  },
  from_conversations: {
    icon: '💬',
    label: 'Liro Sohbetinden',
    shortLabel: 'Liro',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    selectedColor: 'bg-violet-500 text-white border-violet-500',
    description: 'Liro ile konuştuğun konular',
    source: 'AI asistan sohbetlerinden'
  },
  sector_recommended: {
    icon: '💼',
    label: 'Sektörün',
    shortLabel: 'Sektör',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    selectedColor: 'bg-slate-500 text-white border-slate-500',
    description: 'Sektörüne özel içerikler',
    source: 'Sektör tercihlerinden'
  },
  smart_suggestions: {
    icon: '🤖',
    label: 'AI Önerisi',
    shortLabel: 'AI',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    selectedColor: 'bg-rose-500 text-white border-rose-500',
    description: 'AI tarafından analiz edildi',
    source: 'Akıllı öneri sisteminden'
  },
  vocabulary_focus: {
    icon: '📚',
    label: 'Kelime Odaklı',
    shortLabel: 'Kelime',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    selectedColor: 'bg-emerald-500 text-white border-emerald-500',
    description: 'Kelime çalışman gerekiyor',
    source: 'Kelime istatistiklerinden'
  },
  trending: {
    icon: '🔥',
    label: 'Popüler',
    shortLabel: 'Trend',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    selectedColor: 'bg-orange-500 text-white border-orange-500',
    description: 'En çok dinlenen içerikler',
    source: 'Topluluk verilerinden'
  },
  similar_users: {
    icon: '👥',
    label: 'Benzer Kullanıcılar',
    shortLabel: 'Benzer',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    selectedColor: 'bg-indigo-500 text-white border-indigo-500',
    description: 'Sana benzer kullanıcıların tercihleri',
    source: 'Kullanıcı analizinden'
  }
};

// Default category config for unknown categories
export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  icon: '📋',
  label: 'Öneri',
  shortLabel: 'Öneri',
  color: 'bg-slate-100 text-slate-600 border-slate-200',
  selectedColor: 'bg-slate-500 text-white border-slate-500',
  description: 'Genel öneri',
  source: 'Sistem'
};

// Category priority order for filtering
export const CATEGORY_ORDER = [
  'continue_listening',
  'level_appropriate',
  'smart_suggestions',
  'from_conversations',
  'based_on_interests',
  'vocabulary_focus',
  'sector_recommended',
  'trending',
  'similar_users'
];

// Content type icons
export const CONTENT_TYPE_ICONS: Record<string, string> = {
  topic: '🎧',
  podcast: '🎙️',
  sector_content: '📰',
  vocabulary_review: '📝',
  book_chapter: '📖',
  hobby_suggestion: '💡',
  quiz: '🧠',
  ai_suggestion: '🤖',
  suggestion: '💬'
};

// Content type labels (Turkish)
export const CONTENT_TYPE_LABELS: Record<string, string> = {
  topic: 'Dinleme',
  podcast: 'Podcast',
  sector_content: 'Makale',
  vocabulary_review: 'Kelime',
  book_chapter: 'Kitap',
  hobby_suggestion: 'Hobi',
  quiz: 'Quiz',
  ai_suggestion: 'AI Öneri',
  suggestion: 'Öneri'
};

// Helper function to get category config
export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;
}

// Helper function to get content type icon
export function getContentTypeIcon(contentType: string): string {
  return CONTENT_TYPE_ICONS[contentType] || '📄';
}

// Helper function to get content type label
export function getContentTypeLabel(contentType: string): string {
  return CONTENT_TYPE_LABELS[contentType] || contentType;
}
