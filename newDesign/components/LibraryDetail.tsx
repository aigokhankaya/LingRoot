
import React, { useState, useMemo } from 'react';
import AudioPlayer from './AudioPlayer';

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
  originalTranscript?: string; // Original text for comparison
}

const MOCK_DATA: AudioContent[] = [
  { 
    id: '1', 
    title: 'The Great Gatsby - Chapter 1', 
    level: 'B2', 
    duration: '12:45', 
    isFavorite: true, 
    date: '2 days ago', 
    type: 'books',
    transcript: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. 'Whenever you feel like criticizing anyone,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.' He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that.",
    originalTranscript: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. 'Whenever you feel like criticizing anyone,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.'"
  },
  { 
    id: '2', 
    title: 'Daily Conversations: Coffee Shop', 
    level: 'A1', 
    duration: '04:20', 
    isFavorite: false, 
    date: 'Yesterday', 
    type: 'podcast',
    transcript: "Host: Hello! What can I get for you today?\nGuest: Hi, I'd like a medium latte, please.\nHost: Sure! Would you like any flavor or milk alternatives?\nGuest: No, just regular milk and no sugar, thanks.\nHost: That will be $4.50. Would you like a receipt?\nGuest: No thank you.",
    originalTranscript: "Sunucu: Merhaba! Bugün sizin için ne alabilirim?\nKonuk: Selam, orta boy bir latte rica ediyorum lütfen.\nSunucu: Tabii! Herhangi bir aroma veya süt alternatifi ister misiniz?\nKonuk: Hayır, sadece normal süt ve şekersiz olsun, teşekkürler.\nSunucu: 4.50 dolar tutuyor. Makbuz ister misiniz?\nKonuk: Hayır teşekkürler."
  },
  { 
    id: '3', 
    title: 'AI Trends Podcast', 
    level: 'C1', 
    duration: '15:10', 
    isFavorite: true, 
    date: '3 days ago', 
    type: 'podcast',
    transcript: "Host: Welcome back to the show. Today we are talking about AI trends.\nGuest: Thanks for having me. It's an exciting time for technology.\nHost: Indeed. What is the most significant breakthrough recently?\nGuest: I would say Large Language Models and their impact on productivity.\nHost: Do you think it will replace human creativity?\nGuest: Not replace, but enhance it in ways we never imagined.",
    originalTranscript: "Sunucu: Programa tekrar hoş geldiniz. Bugün yapay zeka trendleri hakkında konuşuyoruz.\nKonuk: Beni ağırladığınız için teşekkürler. Teknoloji için heyecan verici bir zaman.\nSunucu: Kesinlikle. Son zamanlardaki en önemli buluş nedir?\nKonuk: Büyük Dil Modelleri ve onların üretkenlik üzerindeki etkisini söyleyebilirim.\nSunucu: Sizce insan yaratıcılığının yerini alacak mı?\nKonuk: Yerini almayacak, ancak hayal bile edemeyeceğimiz şekillerde geliştirecek."
  },
  { 
    id: '4', 
    title: 'Spanish Basics: Greetings', 
    level: 'A1', 
    duration: '03:45', 
    isFavorite: false, 
    date: '5 days ago', 
    type: 'text', 
    transcript: "Hola, ¿cómo estás? Buenos días. Mucho gusto en conocerte. Hasta luego.",
    originalTranscript: "Hola, ¿cómo estás? Buenos días."
  },
  { 
    id: '5', 
    title: 'Business French: Networking', 
    level: 'B1', 
    duration: '08:30', 
    isFavorite: false, 
    date: '1 week ago', 
    type: 'file', 
    transcript: "Bonjour, je m'appelle Marc. Je travaille dans le marketing. C'est un plaisir de vous rencontrer.",
    originalTranscript: "Bonjour, je m'appelle Marc."
  }
];

const LibraryDetail: React.FC<LibraryDetailProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [data, setData] = useState<AudioContent[]>(MOCK_DATA);
  const [activePlayerItem, setActivePlayerItem] = useState<AudioContent | null>(null);

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandTealLight = 'hsla(172, 66%, 45%, 0.1)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

  const filteredItems = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = selectedLevel ? item.level === selectedLevel : true;
      const matchesFavorite = showFavoritesOnly ? item.isFavorite : true;
      return matchesSearch && matchesLevel && matchesFavorite;
    });
  }, [search, selectedLevel, showFavoritesOnly, data]);

  const toggleFavorite = (id: string) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
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
