
import React, { useState, useMemo, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { getAudioHistory, toggleFavorite as apiToggleFavorite, AudioContent as ApiAudioContent } from '../services/apiService';

interface LibraryDetailProps {
  onBack: () => void;
}

export type SoundType = 'text' | 'topic' | 'podcast' | 'file' | 'books';

export interface AudioContent {
  id: string;
  title: string;
  level: string;
  duration: string;
  isFavorite: boolean;
  date: string;
  type: SoundType;
  transcript?: string;
  originalTranscript?: string;
  mp3_url?: string;
  vtt_url?: string;
}

// Helper: API verisini UI formatına dönüştür
const mapApiContentToAudioContent = (apiContent: ApiAudioContent): AudioContent => ({
  id: apiContent.id,
  title: apiContent.title,
  level: apiContent.level,
  duration: apiContent.duration,
  isFavorite: apiContent.isFavorite,
  date: apiContent.date,
  type: apiContent.type as SoundType,
  transcript: apiContent.transcript,
  originalTranscript: apiContent.originalTranscript,
  mp3_url: apiContent.mp3_url,
  vtt_url: apiContent.vtt_url
});

const LibraryDetail: React.FC<LibraryDetailProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [data, setData] = useState<AudioContent[]>([]);
  const [activePlayerItem, setActivePlayerItem] = useState<AudioContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandTealLight = 'hsla(172, 66%, 45%, 0.1)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

  // Fetch audio history from API
  useEffect(() => {
    const loadAudioHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiContent = await getAudioHistory(1, 50);
        setData(apiContent.map(mapApiContentToAudioContent));
      } catch (err) {
        console.error('Error loading audio history:', err);
        setError('Ses geçmişi yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };
    loadAudioHistory();
  }, []);

  const filteredItems = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = selectedLevel ? item.level === selectedLevel : true;
      const matchesFavorite = showFavoritesOnly ? item.isFavorite : true;
      return matchesSearch && matchesLevel && matchesFavorite;
    });
  }, [search, selectedLevel, showFavoritesOnly, data]);

  const toggleFavorite = async (id: string) => {
    const item = data.find(i => i.id === id);
    if (!item) return;

    // Optimistic update
    setData(prev => prev.map(i =>
      i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
    ));

    // API call
    try {
      await apiToggleFavorite(id, !item.isFavorite);
    } catch (err) {
      // Revert on error
      console.error('Error toggling favorite:', err);
      setData(prev => prev.map(i =>
        i.id === id ? { ...i, isFavorite: item.isFavorite } : i
      ));
    }
  };

  const getTypeIcon = (type: SoundType) => {
    switch (type) {
      case 'text': return 'short_text';
      case 'topic': return 'forum';
      case 'podcast': return 'podcasts';
      case 'file': return 'description';
      case 'books': return 'auto_stories';
      default: return 'graphic_eq';
    }
  };

  return (
    <div className="relative w-full flex flex-col bg-transparent overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white/50 backdrop-blur rounded-full border border-slate-100 shadow-sm active:scale-95 transition-all"
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-700 tracking-tight">
          Generated Sounds
        </h1>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`w-10 h-10 flex items-center justify-center transition-all active:scale-95 ${showFavoritesOnly ? 'text-red-400' : 'text-slate-300'}`}
        >
          <span className="material-icons-round">{showFavoritesOnly ? 'favorite' : 'favorite_border'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-6">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audio content..."
            className="w-full pl-12 pr-5 py-3 rounded-[1.25rem] bg-slate-100/50 border border-transparent focus:bg-white focus:border-teal-500/30 outline-none transition-all placeholder:text-slate-400 font-medium text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 mb-8">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setSelectedLevel(null)}
            className={`px-4 py-1.5 rounded-full font-bold text-[11px] transition-all flex-shrink-0
              ${selectedLevel === null ? 'bg-teal-400 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100 shadow-sm'}`}
          >
            All Levels
          </button>
          {levels.map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)}
              className={`px-4 py-1.5 rounded-full font-bold text-[11px] transition-all flex-shrink-0
                ${selectedLevel === lvl ? 'bg-teal-400 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100 shadow-sm'}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-40">
        <div className="space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActivePlayerItem(item)}
                className="bg-white/80 glass rounded-[1.5rem] p-4 shadow-sm border border-white/60 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer"
              >
                {/* Icon Container */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner shrink-0 relative"
                  style={{ backgroundColor: brandTealLight }}
                >
                  <span className="material-icons-round text-xl" style={{ color: brandTeal }}>graphic_eq</span>
                </div>

                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-[14px] text-slate-700 truncate">{item.title}</h4>

                  {/* Metadata Row 1: Level, Duration, Date */}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[9px] font-black text-white px-1.5 py-0.5 rounded shadow-sm shrink-0"
                      style={{ backgroundColor: brandOrange }}
                    >
                      {item.level}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-0.5">
                        <span className="material-icons-round text-[12px]">schedule</span>
                        {item.duration}
                      </span>
                      <span className="text-[14px] leading-none opacity-50">•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>

                  {/* Metadata Row 2: Sound Type Label */}
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-400 font-bold capitalize">
                    <span className="material-icons-round text-[12px]">{getTypeIcon(item.type)}</span>
                    {item.type}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  className="w-8 h-8 flex items-center justify-center transition-colors"
                >
                  <span className={`material-icons-round text-[20px] ${item.isFavorite ? 'text-red-400' : 'text-slate-200'}`}>
                    {item.isFavorite ? 'favorite' : 'favorite'}
                  </span>
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
              <span className="material-icons-round text-6xl mb-4">search_off</span>
              <p className="font-bold">No sounds found</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player Modal */}
      {activePlayerItem && (
        <AudioPlayer
          content={activePlayerItem}
          onClose={() => setActivePlayerItem(null)}
        />
      )}
    </div>
  );
};

export default LibraryDetail;
