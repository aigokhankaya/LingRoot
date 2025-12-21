
import React, { useState, useMemo } from 'react';

interface VocabularyProps {
  onBack: () => void;
}

interface WordItem {
  id: string;
  word: string;
  cefr: string;
  isLearned: boolean;
  example: string;
  exampleTranslation: string;
  originalSentence: string;
  addedDate: string;
}

const MOCK_WORDS: WordItem[] = [
  {
    id: '1',
    word: 'Vulnerable',
    cefr: 'B2',
    isLearned: true,
    example: "He was in a vulnerable position after losing his job.",
    exampleTranslation: "İşini kaybettikten sonra savunmasız bir durumdaydı.",
    originalSentence: "In my younger and more vulnerable years my father gave me some advice.",
    addedDate: '2 days ago'
  },
  {
    id: '2',
    word: 'Communicative',
    cefr: 'B1',
    isLearned: false,
    example: "She is a very communicative person who loves to talk to everyone.",
    exampleTranslation: "Herkesle konuşmayı seven, çok dışa dönük/iletişimsel biridir.",
    originalSentence: "We've always been unusually communicative in a reserved way.",
    addedDate: 'Yesterday'
  },
  {
    id: '3',
    word: 'Advantage',
    cefr: 'A2',
    isLearned: true,
    example: "Learning a second language is a great advantage in the business world.",
    exampleTranslation: "İkinci bir dil öğrenmek iş dünyasında büyük bir avantajdır.",
    originalSentence: "All the people in this world haven't had the advantages that you've had.",
    addedDate: '3 days ago'
  },
  {
    id: '4',
    word: 'Erosion',
    cefr: 'C1',
    isLearned: false,
    example: "The heavy rains caused severe soil erosion on the hillsides.",
    exampleTranslation: "Şiddetli yağmurlar yamaçlarda ciddi toprak erozyonuna neden oldu.",
    originalSentence: "Others warn about the potential for misinformation and the erosion of critical thinking skills.",
    addedDate: '5 days ago'
  },
  {
    id: '5',
    word: 'Excerpt',
    cefr: 'B2',
    isLearned: true,
    example: "She read a short excerpt from her new novel.",
    exampleTranslation: "Yeni romanından kısa bir alıntı okudu.",
    originalSentence: "Literature: Don Quixote Excerpt",
    addedDate: '1 week ago'
  }
];

const TurkishFlag = () => (
  <svg width="18" height="12" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" className="rounded-[2px] shadow-sm flex-shrink-0">
    <rect width="1200" height="800" fill="#E30A17"/>
    <circle cx="425" cy="400" r="200" fill="white"/>
    <circle cx="475" cy="400" r="160" fill="#E30A17"/>
    <path d="M700 400l-117.557 38.197 44.902-123.607v170.82l-44.902-123.607z" fill="white" transform="rotate(-18 700 400)"/>
  </svg>
);

const Vocabulary: React.FC<VocabularyProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedCefr, setSelectedCefr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'learned' | 'unlearned'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
  });

  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  const stats = useMemo(() => {
    const total = MOCK_WORDS.length;
    const learned = MOCK_WORDS.filter(w => w.isLearned).length;
    const unlearned = total - learned;
    return { total, learned, unlearned };
  }, []);

  const filteredWords = useMemo(() => {
    return MOCK_WORDS.filter(w => {
      const matchesSearch = w.word.toLowerCase().includes(search.toLowerCase());
      const matchesCefr = selectedCefr ? w.cefr === selectedCefr : true;
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'learned' ? w.isLearned : !w.isLearned;
      return matchesSearch && matchesCefr && matchesStatus;
    });
  }, [search, selectedCefr, statusFilter]);

  const handleSaveWord = () => {
    // In a real app, logic to add the word would go here
    console.log('Saving word:', newWord.word);
    setShowAddPopup(false);
    setNewWord({ word: '' });
  };

  return (
    <div className="h-full flex flex-col animate-slide-up bg-slate-50 relative">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white rounded-full border border-slate-100 shadow-sm active:scale-90 transition-all"
          >
            <span className="material-icons-round">arrow_back</span>
          </button>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Vocabulary</h2>
        </div>

        {/* Updated Add Word Button - Top Right */}
        <button 
          onClick={() => setShowAddPopup(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 active:scale-90 transition-all"
          style={{ backgroundColor: brandTeal }}
        >
          <span className="material-icons-round text-2xl">add</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="px-6 mb-8">
        <div className="bg-white/70 glass rounded-[2rem] p-6 border border-white/60 shadow-xl flex justify-between text-center divide-x divide-slate-100">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black text-slate-800">{stats.total}</p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">Learned</p>
            <p className="text-2xl font-black text-teal-600">{stats.learned}</p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">New</p>
            <p className="text-2xl font-black text-orange-500">{stats.unlearned}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-6 space-y-4 mb-6">
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words..."
            className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white border border-slate-100 focus:border-teal-500 outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', 'learned', 'unlearned'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-4 py-2 rounded-full font-bold text-[11px] capitalize transition-all border whitespace-nowrap
                ${statusFilter === status 
                  ? 'bg-slate-800 text-white border-transparent shadow-md' 
                  : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
            >
              {status}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-200 self-center mx-1" />
          {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(cefr => (
            <button
              key={cefr}
              onClick={() => setSelectedCefr(selectedCefr === cefr ? null : cefr)}
              className={`px-4 py-2 rounded-full font-bold text-[11px] transition-all border
                ${selectedCefr === cefr 
                  ? 'bg-teal-500 text-white border-transparent shadow-md' 
                  : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
              style={selectedCefr === cefr ? { backgroundColor: brandTeal } : {}}
            >
              {cefr}
            </button>
          ))}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar space-y-3">
        {filteredWords.map(item => (
          <div 
            key={item.id}
            className={`bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 border-l-[6px] 
              ${item.isLearned ? 'border-l-teal-500' : 'border-l-orange-400'}`}
          >
            <button 
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full px-5 py-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-start">
                  <h4 className="font-extrabold text-slate-800 text-lg leading-none">{item.word}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      {item.cefr}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium italic">{item.addedDate}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.isLearned && (
                  <span className="material-icons-round text-teal-500 text-xl">check_circle</span>
                )}
                <span className={`material-icons-round text-slate-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {expandedId === item.id && (
              <div className="px-5 pb-5 animate-slide-up space-y-4">
                {/* Example Section */}
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons-round text-blue-400 text-xs">auto_fix_high</span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Example Sentence</span>
                  </div>
                  <p className="text-slate-700 font-bold text-[13px] leading-relaxed mb-1">
                    "{item.example}"
                  </p>
                  <p className="text-slate-500 text-xs italic flex items-center gap-2">
                    <TurkishFlag />
                    {item.exampleTranslation}
                  </p>
                </div>

                {/* Original Context Section */}
                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons-round text-indigo-400 text-xs">history_edu</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Original Context</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed italic">
                    "...{item.originalSentence}..."
                  </p>
                </div>

                <div className="flex gap-2">
                   <button 
                    className={`flex-1 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all
                      ${item.isLearned ? 'bg-orange-50 text-orange-500' : 'bg-teal-50 text-teal-600'}`}
                   >
                     {item.isLearned ? 'Mark as Unlearned' : 'Mark as Learned'}
                   </button>
                   <button className="flex-1 py-3 rounded-xl bg-red-50 text-red-500 font-bold text-xs active:scale-95 transition-all">
                     Delete
                   </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredWords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <span className="material-icons-round text-6xl opacity-20 mb-4">menu_book</span>
            <p className="font-bold">No words match your filters</p>
          </div>
        )}
      </div>

      {/* Add Word Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md overflow-y-auto py-10">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-slide-up relative flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">New Word</h3>
              <button 
                onClick={() => setShowAddPopup(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">The Word</label>
                <input 
                  type="text" 
                  value={newWord.word}
                  onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                  placeholder="e.g. Resilience"
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 font-medium"
                />
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleSaveWord}
                  disabled={!newWord.word}
                  className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all active:scale-95 ${
                    !newWord.word 
                      ? 'bg-slate-200 cursor-not-allowed' 
                      : 'shadow-teal-500/20'
                  }`}
                  style={{ 
                    background: !newWord.word ? '' : `linear-gradient(135deg, ${brandTeal}, #3ebdb2)` 
                  }}
                >
                  Save Word
                </button>
                <button 
                  onClick={() => setShowAddPopup(false)}
                  className="w-full py-2 text-slate-400 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vocabulary;
