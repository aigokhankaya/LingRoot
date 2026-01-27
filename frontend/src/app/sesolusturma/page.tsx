'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// ============================================================================
// MOCK DATA
// ============================================================================
const mockUser = {
  name: 'Ayşe Yılmaz',
  avatar: 'https://ui-avatars.com/api/?name=Ayse+Yilmaz&background=0d9488&color=fff',
  level: 'B1',
  xp: 2450,
  streak: 7,
};

const mockMembership = {
  dailyLimit: 50,
  remaining: 42,
  currentPlanName: 'Gold Paket',
};

const mockContentTypes = [
  { id: 'topic_tree', name: 'Konu Ağacı', icon: '🌳' },
  { id: 'book', name: 'Kitap', icon: '📚' },
  { id: 'podcast', name: 'Podcast', icon: '🎙️' },
  { id: 'topic', name: 'Hobi', icon: '💡' },
  { id: 'youtube', name: 'YouTube', icon: '🎬' },
  { id: 'youtube_v2', name: 'YouTube V2', icon: '🎥' },
  { id: 'document', name: 'Doküman', icon: '📄' },
  { id: 'text', name: 'Metin', icon: '📝' },
  { id: 'subject', name: 'Konu', icon: '🎓' },
];

const mockLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const mockRateOptions = [
  { value: 0.7, label: '0.7x' },
  { value: 0.8, label: '0.8x' },
  { value: 1.0, label: '1x' },
  { value: 1.2, label: '1.2x' },
];

const mockDurationOptions = [
  { value: 2, label: '2 dk', description: '~300 kelime' },
  { value: 5, label: '5 dk', description: '~750 kelime' },
  { value: 10, label: '10 dk', description: '~1500 kelime' },
];

const mockGenderOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'female', label: 'Kadın' },
  { value: 'male', label: 'Erkek' },
];

const mockAccentOptions = [
  { value: 'all', label: 'Tümü' },
  { value: 'american', label: 'Amerikan' },
  { value: 'british', label: 'İngiliz' },
  { value: 'australian', label: 'Avustralya' },
];

const mockVoiceCategories = [
  { value: 'standard', label: 'Standard', badge: 'Ücretsiz' },
  { value: 'wavenet', label: 'Wavenet', badge: 'Premium' },
  { value: 'neural2', label: 'Neural2', badge: 'Premium' },
  { value: 'studio', label: 'Studio', badge: 'Platinum' },
];

const mockVoices = [
  { id: 'en-US-Wavenet-F', name: 'Amerikan Kadın F', accent: 'american', gender: 'female', category: 'wavenet' },
  { id: 'en-US-Wavenet-A', name: 'Amerikan Erkek A', accent: 'american', gender: 'male', category: 'wavenet' },
  { id: 'en-GB-Wavenet-C', name: 'İngiliz Kadın C', accent: 'british', gender: 'female', category: 'wavenet' },
  { id: 'en-US-Standard-C', name: 'Amerikan Kadın C', accent: 'american', gender: 'female', category: 'standard' },
];

const mockTopicTree = [
  {
    id: 'tech', name: 'Teknoloji', icon: '💻',
    children: [
      { id: 'ai', name: 'Yapay Zeka', icon: '🤖', children: [
        { id: 'ml', name: 'Makine Öğrenimi', icon: '📊' },
        { id: 'nlp', name: 'Doğal Dil İşleme', icon: '💬' },
      ]},
      { id: 'web', name: 'Web Teknolojileri', icon: '🌐' },
    ]
  },
  {
    id: 'science', name: 'Bilim', icon: '🔬',
    children: [
      { id: 'space', name: 'Uzay', icon: '🚀' },
      { id: 'physics', name: 'Fizik', icon: '⚡' },
    ]
  },
  {
    id: 'culture', name: 'Kültür', icon: '🎭',
    children: [
      { id: 'history', name: 'Tarih', icon: '📜' },
      { id: 'art', name: 'Sanat', icon: '🎨' },
    ]
  },
];

const mockBooks = [
  { id: '1', title: 'Pride and Prejudice', author: 'Jane Austen', totalChapters: 61 },
  { id: '2', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', totalChapters: 9 },
  { id: '3', title: '1984', author: 'George Orwell', totalChapters: 23 },
];

const mockBookChapters = [
  { id: 'ch1', chapterIndex: 1, chapterTitle: 'Chapter 1: The Beginning', wordCount: 2500 },
  { id: 'ch2', chapterIndex: 2, chapterTitle: 'Chapter 2: First Impressions', wordCount: 2800 },
];

const mockPodcastSpeakers = [
  { value: 'Kore', label: 'Kore (Kadın)' },
  { value: 'Puck', label: 'Puck (Erkek)' },
];

const mockRecentContent = [
  { id: '1', title: 'Yapay Zeka ve Geleceğimiz', type: 'topic', level: 'B1', progress: 75, createdAt: '2024-01-15' },
  { id: '2', title: 'Pride and Prejudice - Chapter 1', type: 'book', level: 'A2', progress: 100, createdAt: '2024-01-14' },
  { id: '3', title: 'Uzay Keşifleri', type: 'subject', level: 'B2', progress: 30, createdAt: '2024-01-13' },
];

const mockDailyQuests = [
  { id: '1', title: '3 içerik dinle', current: 2, target: 3, xp: 50, icon: '🎧' },
  { id: '2', title: '10 kelime öğren', current: 7, target: 10, xp: 30, icon: '📖' },
];

// ============================================================================
// HELPER: Topic Tree Node
// ============================================================================
interface TopicNodeProps {
  node: any;
  depth: number;
  onSelect: (node: any) => void;
  selectedId: string | null;
  expandedIds: string[];
  onToggle: (id: string) => void;
}

const TopicNode: React.FC<TopicNodeProps> = ({ node, depth, onSelect, selectedId, expandedIds, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary/10 border border-primary/50'
            : 'hover:bg-gray-100 border border-transparent'
        }`}
        style={{ marginLeft: depth * 20 }}
        onClick={() => hasChildren ? onToggle(node.id) : onSelect(node)}
      >
        {hasChildren && (
          <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        )}
        <span className="text-lg">{node.icon}</span>
        <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-gray-700'}`}>{node.name}</span>
        {!hasChildren && (
          <button
            className="ml-auto px-2 py-1 rounded bg-primary/10 text-primary text-xs hover:bg-primary/20"
            onClick={(e) => { e.stopPropagation(); onSelect(node); }}
          >
            Seç
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any) => (
            <TopicNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SesOlusturmaPage() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Content Type & Input States
  const [selectedContentType, setSelectedContentType] = useState('topic_tree');
  const [textInput, setTextInput] = useState('');

  // Audio Settings States
  const [selectedLevel, setSelectedLevel] = useState('b1');
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [contentDuration, setContentDuration] = useState(5);
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedAccent, setSelectedAccent] = useState('all');
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState('wavenet');
  const [selectedVoice, setSelectedVoice] = useState('en-US-Wavenet-F');
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  // Topic Tree States
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);
  const [selectedTopicNode, setSelectedTopicNode] = useState<any>(null);

  // Book States
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  // Podcast States
  const [podcastTopic, setPodcastTopic] = useState('');
  const [podcastDuration, setPodcastDuration] = useState(5);
  const [podcastHostVoice, setPodcastHostVoice] = useState('Kore');
  const [podcastGuestVoice, setPodcastGuestVoice] = useState('Puck');

  // YouTube States
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioResult, setAudioResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // History States
  const [activeHistoryTypes, setActiveHistoryTypes] = useState<string[]>(['topic', 'book', 'podcast', 'subject', 'youtube', 'text']);

  // Handlers
  const handleTopicToggle = (id: string) => {
    setExpandedTopicIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleTopicSelect = (node: any) => {
    setSelectedTopicNode(node);
    setTextInput(`${node.name} hakkında detaylı bir içerik oluştur`);
  };

  const handleGenerate = async () => {
    if (!textInput.trim() && !selectedTopicNode && !podcastTopic.trim()) {
      setError('Lütfen içerik girin veya bir konu seçin');
      return;
    }
    setIsGenerating(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAudioResult({
      message: textInput || podcastTopic,
      mp3_url: '#mock-audio',
      level: selectedLevel.toUpperCase(),
      topic: selectedTopicNode?.name || 'Generated Content',
      duration_seconds: contentDuration * 60,
    });
    setIsGenerating(false);
  };

  const getFilteredVoices = () => {
    return mockVoices.filter(voice => {
      if (selectedVoiceCategory !== 'all' && voice.category !== selectedVoiceCategory) return false;
      if (selectedGender !== 'all' && voice.gender !== selectedGender) return false;
      if (selectedAccent !== 'all' && voice.accent !== selectedAccent) return false;
      return true;
    });
  };

  const filteredHistory = mockRecentContent.filter(item => activeHistoryTypes.includes(item.type));

  const getHistoryTypeLabel = (type: string) => {
    const labels: Record<string, string> = { topic: 'Konu Ağacı', book: 'Kitap', podcast: 'Podcast', subject: 'Konu', youtube: 'YouTube', text: 'Metin' };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/welcome" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-xl text-white">🌿</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">LingRoot</h1>
                <p className="text-xs text-gray-500">Ses Oluşturma</p>
              </div>
            </Link>

            {/* User Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
                <span>🔥</span>
                <span className="text-orange-600 font-bold text-sm">{mockUser.streak}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200">
                <span>⭐</span>
                <span className="text-purple-600 font-bold text-sm">{mockUser.xp}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{mockUser.name}</p>
                  <p className="text-xs text-primary">Seviye {mockUser.level}</p>
                </div>
                <img src={mockUser.avatar} alt="" className="w-9 h-9 rounded-lg border-2 border-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Gamification Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">🎯 Günlük Görevler:</span>
              {mockDailyQuests.map((quest) => (
                <div key={quest.id} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100">
                  <span>{quest.icon}</span>
                  <span className="text-xs text-gray-700">{quest.current}/{quest.target}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Kalan Hak:</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                {mockMembership.remaining}/{mockMembership.dailyLimit}
              </span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                {mockMembership.currentPlanName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* AI Chat Card */}
        <div className="mb-6 p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Liro ile Konuş</h3>
                <p className="text-gray-500 text-sm">AI asistanına ne öğrenmek istediğini söyle</p>
              </div>
            </div>
            <span className="text-primary text-xl">→</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 rounded-lg bg-gray-100">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-primary text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎵 Ses Oluştur
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-primary text-white shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📜 Geçmiş
            </button>
          </div>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Step 1: Content Type */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-bold text-gray-900">İçerik Türü Seçin</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {mockContentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedContentType(type.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedContentType === type.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{type.icon}</span>
                    <p className={`text-xs font-medium ${selectedContentType === type.id ? 'text-primary' : 'text-gray-700'}`}>
                      {type.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Content Input */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-bold text-gray-900">İçeriğinizi Girin</h3>
              </div>

              {/* Topic Tree */}
              {selectedContentType === 'topic_tree' && (
                <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">🌳 Konu Ağacı</p>
                  {mockTopicTree.map((node) => (
                    <TopicNode
                      key={node.id}
                      node={node}
                      depth={0}
                      onSelect={handleTopicSelect}
                      selectedId={selectedTopicNode?.id}
                      expandedIds={expandedTopicIds}
                      onToggle={handleTopicToggle}
                    />
                  ))}
                  {selectedTopicNode && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-primary text-sm"><strong>Seçilen:</strong> {selectedTopicNode.name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Book */}
              {selectedContentType === 'book' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="Kitap ara..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    {mockBooks.map((book) => (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedBook?.id === book.id ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="w-full h-20 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                          <span className="text-3xl">📖</span>
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm truncate">{book.title}</h4>
                        <p className="text-gray-500 text-xs">{book.author}</p>
                        <p className="text-gray-400 text-xs mt-1">{book.totalChapters} bölüm</p>
                      </div>
                    ))}
                  </div>
                  {selectedBook && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-3">📚 {selectedBook.title} - Bölümler</p>
                      {mockBookChapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          onClick={() => setSelectedChapter(chapter)}
                          className={`p-3 rounded-lg mb-2 cursor-pointer flex items-center justify-between ${
                            selectedChapter?.id === chapter.id ? 'bg-primary/10 border border-primary/30' : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p className="text-gray-800 text-sm font-medium">{chapter.chapterTitle}</p>
                            <p className="text-gray-500 text-xs">{chapter.wordCount} kelime</p>
                          </div>
                          <button className="px-3 py-1 rounded bg-primary/10 text-primary text-xs">🔊 Seslendir</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Podcast */}
              {selectedContentType === 'podcast' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Host Sesi</label>
                      <select
                        value={podcastHostVoice}
                        onChange={(e) => setPodcastHostVoice(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        {mockPodcastSpeakers.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-2 block">Konuk Sesi</label>
                      <select
                        value={podcastGuestVoice}
                        onChange={(e) => setPodcastGuestVoice(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        {mockPodcastSpeakers.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={podcastTopic}
                    onChange={(e) => setPodcastTopic(e.target.value)}
                    placeholder="Podcast konunuzu yazın..."
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 5, 10, 15].map((d) => (
                      <button
                        key={d}
                        onClick={() => setPodcastDuration(d)}
                        className={`p-3 rounded-lg border text-center ${
                          podcastDuration === d ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
                        }`}
                      >
                        <span className={podcastDuration === d ? 'text-primary font-medium' : 'text-gray-700'}>{d} dk</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube */}
              {(selectedContentType === 'youtube' || selectedContentType === 'youtube_v2') && (
                <div className="space-y-4">
                  {selectedContentType === 'youtube_v2' && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-green-700 text-sm">✓ YENİ SİSTEM - Gelişmiş altyazı çekme</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <button className="px-6 py-3 rounded-lg bg-primary text-white font-medium">📝 Altyazı Çek</button>
                  </div>
                </div>
              )}

              {/* Text / Subject / Document */}
              {(selectedContentType === 'text' || selectedContentType === 'subject' || selectedContentType === 'document' || selectedContentType === 'topic') && (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    selectedContentType === 'subject' ? 'Hangi konu hakkında içerik oluşturmak istiyorsunuz?' :
                    selectedContentType === 'topic' ? 'İlgi alanınızı yazın...' :
                    'Metninizi buraya yazın veya yapıştırın...'
                  }
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg resize-none"
                />
              )}
            </div>

            {/* Step 3: Audio Settings */}
            {selectedContentType !== 'podcast' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="p-6 cursor-pointer flex items-center justify-between"
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold">3</div>
                    <h3 className="text-lg font-bold text-gray-900">Ses Ayarları</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    {!showAudioSettings && (
                      <span className="text-gray-500 text-sm">
                        {selectedLevel.toUpperCase()} • {speakingRate}x
                      </span>
                    )}
                    <span className={`text-gray-400 transition-transform ${showAudioSettings ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {showAudioSettings && (
                  <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Left Column */}
                      <div className="space-y-5">
                        {/* Level */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">İngilizce Seviyesi</label>
                          <div className="grid grid-cols-6 gap-2">
                            {mockLevels.map((level) => (
                              <button
                                key={level}
                                onClick={() => setSelectedLevel(level.toLowerCase())}
                                className={`py-2 rounded-lg border font-medium ${
                                  selectedLevel === level.toLowerCase()
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Konuşma Hızı</label>
                          <div className="grid grid-cols-4 gap-2">
                            {mockRateOptions.map((rate) => (
                              <button
                                key={rate.value}
                                onClick={() => setSpeakingRate(rate.value)}
                                className={`py-2 rounded-lg border ${
                                  speakingRate === rate.value
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white border-gray-200 text-gray-700'
                                }`}
                              >
                                {rate.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Gender & Accent */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Cinsiyet</label>
                            <div className="grid grid-cols-3 gap-1">
                              {mockGenderOptions.map((g) => (
                                <button
                                  key={g.value}
                                  onClick={() => setSelectedGender(g.value)}
                                  className={`py-2 rounded-lg border text-sm ${
                                    selectedGender === g.value
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  {g.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Aksan</label>
                            <div className="grid grid-cols-2 gap-1">
                              {mockAccentOptions.slice(0, 4).map((a) => (
                                <button
                                  key={a.value}
                                  onClick={() => setSelectedAccent(a.value)}
                                  className={`py-2 rounded-lg border text-sm ${
                                    selectedAccent === a.value
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-5">
                        {/* Voice Category */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Ses Kategorisi</label>
                          <div className="grid grid-cols-2 gap-2">
                            {mockVoiceCategories.map((cat) => (
                              <button
                                key={cat.value}
                                onClick={() => setSelectedVoiceCategory(cat.value)}
                                className={`p-3 rounded-lg border text-center ${
                                  selectedVoiceCategory === cat.value
                                    ? 'bg-primary/10 border-primary'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <span className={`block font-medium text-sm ${selectedVoiceCategory === cat.value ? 'text-primary' : 'text-gray-700'}`}>
                                  {cat.label}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                                  cat.badge === 'Ücretsiz' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {cat.badge}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">⏱️ İçerik Süresi</label>
                          <div className="grid grid-cols-3 gap-2">
                            {mockDurationOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setContentDuration(opt.value)}
                                className={`p-3 rounded-lg border text-center ${
                                  contentDuration === opt.value
                                    ? 'bg-primary/10 border-primary'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <span className={`block font-medium ${contentDuration === opt.value ? 'text-primary' : 'text-gray-700'}`}>
                                  {opt.label}
                                </span>
                                <span className="text-xs text-gray-500">{opt.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Voices */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Mevcut Sesler</label>
                          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                            {getFilteredVoices().length > 0 ? (
                              getFilteredVoices().map((voice) => (
                                <label key={voice.id} className={`flex items-center p-2 rounded cursor-pointer ${selectedVoice === voice.id ? 'bg-primary/10' : 'hover:bg-white'}`}>
                                  <input
                                    type="radio"
                                    name="voice"
                                    checked={selectedVoice === voice.id}
                                    onChange={() => setSelectedVoice(voice.id)}
                                    className="mr-3 accent-primary"
                                  />
                                  <span className="text-sm text-gray-700">{voice.name}</span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm text-center py-3">Uygun ses bulunamadı</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Plan Info */}
                    <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700 font-medium">Mevcut Paket:</span>
                          <span className="ml-2 px-2 py-1 rounded bg-amber-100 text-amber-700 text-sm">{mockMembership.currentPlanName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Kalan: </span>
                          <span className="text-primary font-medium">{mockMembership.remaining}/{mockMembership.dailyLimit}</span>
                        </div>
                      </div>
                      <Link href="/fiyatlandirma" className="text-primary text-sm hover:underline mt-2 inline-block">
                        Tüm paketleri karşılaştır →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`px-10 py-4 rounded-xl font-bold text-lg transition-all ${
                  isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-wait'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25'
                }`}
              >
                {isGenerating ? '⏳ Ses Oluşturuluyor...' : '🎵 Ses Oluştur'}
              </button>
            </div>

            {/* Audio Result */}
            {audioResult && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>
                  <h3 className="text-xl font-bold text-green-700">Ses Oluşturuldu!</h3>
                </div>
                <div className="p-4 rounded-lg bg-white border border-green-200">
                  <div className="flex items-center gap-4">
                    <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl">▶</button>
                    <div>
                      <p className="font-medium text-gray-900">{audioResult.topic}</p>
                      <p className="text-gray-500 text-sm">Seviye: {audioResult.level} • Süre: {Math.floor(audioResult.duration_seconds / 60)} dk</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-gray-200 rounded-full">
                    <div className="h-full w-0 bg-primary rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">📜</div>
                <h3 className="text-xl font-bold text-gray-900">Ses Geçmişi</h3>
              </div>
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                🔄 Yenile
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['topic', 'book', 'podcast', 'subject', 'youtube', 'text'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveHistoryTypes(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    activeHistoryTypes.includes(type)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {getHistoryTypeLabel(type)}
                </button>
              ))}
            </div>

            {/* History Items */}
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs">{getHistoryTypeLabel(item.type)}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">{item.level}</span>
                        <span className="text-gray-500 text-xs">{item.createdAt}</span>
                      </div>
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-primary font-medium text-sm">{item.progress}%</span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress}%` }}></div>
                        </div>
                      </div>
                      <button className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">▶</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredHistory.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl block mb-4">🎧</span>
                <h4 className="font-medium text-gray-700 mb-2">Henüz ses içeriği yok</h4>
                <p className="text-gray-500 text-sm">İlk sesinizi oluşturmaya başlayın!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span>🌿</span>
              <span>LingRoot © 2024</span>
            </div>
            <div className="flex items-center gap-6 text-gray-500 text-sm">
              <Link href="#" className="hover:text-primary">Yardım</Link>
              <Link href="#" className="hover:text-primary">Gizlilik</Link>
              <Link href="#" className="hover:text-primary">Koşullar</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
