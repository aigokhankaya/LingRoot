import React, { useState, useEffect } from 'react';
import { getVocabulary, deleteWordFromVocabulary, updateWordInVocabulary, addWordToVocabulary, addWordWithTranslation, VocabularyWord, getReminderSettings, saveReminderSettings, ReminderSettings } from '../src/lib/api';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card";
import { Label } from "../src/components/ui/label";
import { Badge } from "../src/components/ui/badge";
import { Progress } from "../src/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../src/components/ui/dialog";

export function VocabularyTabContent({ user }: { user: any }) {
  // State variables
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeLevel, setActiveLevel] = useState<string>("all");
  const [learnedFilter, setLearnedFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("alphabetical");
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState<boolean>(false);
  const [editingWord, setEditingWord] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    definition: '',
    example_sentence: '',
    notes: ''
  });
  const [newWord, setNewWord] = useState({
    word: "",
    level: "",
    meaning: "",
    example: ""
  });

  // Reminder settings state
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    wordsPerDay: 5,
    startTime: "09:00",
    endTime: "18:00",
    isEnabled: true
  });
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);

  // Word lists configuration
  const wordLists = {
    a1: {
      title: "A1 - Başlangıç Seviyesi",
      description: "Günlük hayatta en sık kullanılan temel kelimeler",
      color: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200",
      badgeColor: "bg-green-500",
    },
    a2: {
      title: "A2 - Temel Seviye", 
      description: "Basit günlük konuşmalar için gerekli kelimeler",
      color: "bg-primary/10",
      textColor: "text-primary",
      borderColor: "border-primary/20", 
      badgeColor: "bg-primary text-primary-foreground",
    },
    b1: {
      title: "B1 - Orta Seviye",
      description: "Günlük ve iş hayatında kullanılan kelimeler",
      color: "bg-purple-100",
      textColor: "text-purple-800",
      borderColor: "border-purple-200",
      badgeColor: "bg-purple-500",
    },
    b2: {
      title: "B2 - Orta-Üstü Seviye",
      description: "Daha karmaşık konular için gerekli kelimeler", 
      color: "bg-amber-100",
      textColor: "text-amber-800",
      borderColor: "border-amber-200",
      badgeColor: "bg-amber-500",
    },
    c1: {
      title: "C1 - İleri Seviye",
      description: "Akademik ve profesyonel kelime dağarcığı",
      color: "bg-indigo-100", 
      textColor: "text-indigo-800",
      borderColor: "border-indigo-200",
      badgeColor: "bg-indigo-500",
    },
    c2: {
      title: "C2 - Ustalık Seviyesi",
      description: "Anadil seviyesine yakın kelime dağarcığı",
      color: "bg-rose-100",
      textColor: "text-rose-800", 
      borderColor: "border-rose-200",
      badgeColor: "bg-rose-500",
    }
  };

  useEffect(() => {
    if (user) {
      loadVocabulary();
    }
  }, [user]);

  // Load reminder settings on component mount
  useEffect(() => {
    if (user) {
      loadReminderSettings();
    }
  }, [user]);

  const loadVocabulary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const words = await getVocabulary();
      setVocabulary(words);
    } catch (error: any) {
      setError('Kelimeler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReminderSettings = async () => {
    try {
      const settings = await getReminderSettings();
      setReminderSettings(settings);
      console.log('✅ [WEB] Loaded reminder settings:', settings);
    } catch (error) {
      console.error('❌ [WEB] Error loading reminder settings:', error);
    }
  };

  // Save reminder settings
  const handleSaveReminderSettings = async () => {
    try {
      await saveReminderSettings(reminderSettings);
      setIsReminderSettingsOpen(false);
      
      // Show success message
      alert('✅ Hatırlatma ayarları başarıyla kaydedildi!\n\nMobil uygulamada yeni ayarlar aktif olacak.');
    } catch (error) {
      console.error('❌ [WEB] Error saving reminder settings:', error);
      alert('❌ Ayarlar kaydedilirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanWord = newWord.word.trim();
      
      // Otomatik olarak kelime detaylarını çek (AudioPlayer ve mobil uygulama gibi)
      const result = await addWordWithTranslation(
        cleanWord,
        '', // Context boş olabilir, API kendi context'ini oluşturur
        '', // Level boş - OpenAI otomatik belirleyecek
        '' // Original sentence boş olabilir
      );
      
      setNewWord({ word: "", level: "", meaning: "", example: "" });
      setIsAddWordModalOpen(false);
      loadVocabulary();
      
      // Detaylı başarı mesajı göster
      if (result.isExisting) {
        alert(`Bilgi!\n\n"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`);
      } else if (result.translationError) {
        alert(`Uyarı!\n\n"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`);
      } else {
        alert(`Başarılı!\n\n"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`);
      }
    } catch (error: any) {
      alert('Kelime eklenirken hata oluştu: ' + error.message);
    }
  };

  const handleDeleteWord = async (wordId: number) => {
    if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteWordFromVocabulary(wordId);
      setVocabulary(vocabulary.filter(word => word.id !== wordId));
    } catch (error: any) {
      alert('Kelime silinirken hata oluştu: ' + error.message);
    }
  };

  const handleToggleLearned = async (wordId: number, currentStatus: boolean) => {
    try {
      const updatedWord = await updateWordInVocabulary(wordId, { is_learned: !currentStatus });
      setVocabulary(vocabulary.map(word => word.id === wordId ? updatedWord : word));
    } catch (error: any) {
      alert('Kelime durumu güncellenirken hata oluştu: ' + error.message);
    }
  };

  const getFilteredWords = () => {
    let filtered = [...vocabulary];
    if (searchTerm) {
      filtered = filtered.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.definition || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeLevel !== "all") {
      filtered = filtered.filter(word => (word.level || '').toLowerCase() === activeLevel);
    }
    if (learnedFilter === "learned") {
      filtered = filtered.filter(word => word.is_learned);
    } else if (learnedFilter === "not-learned") {
      filtered = filtered.filter(word => !word.is_learned);
    }
    if (sortOrder === "alphabetical") {
      filtered.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortOrder === "alphabetical-reverse") {
      filtered.sort((a, b) => b.word.localeCompare(a.word));
    }
    return filtered;
  };

  const toggleWordExpanded = (id: number) => {
    setExpandedWordId(expandedWordId === id ? null : id);
  };

  const playWordAudio = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const getStatistics = () => {
    const total = vocabulary.length;
    const learned = vocabulary.filter(word => word.is_learned).length;
    return {
      total,
      learned,
      notLearned: total - learned,
      learnedPercentage: total > 0 ? Math.round((learned / total) * 100) : 0
    };
  };

  const getLevelProgress = (level: string) => {
    const levelWords = vocabulary.filter(word => (word.level || '').toLowerCase() === level);
    const learnedLevelWords = levelWords.filter(word => word.is_learned);
    return levelWords.length > 0 ? Math.round((learnedLevelWords.length / levelWords.length) * 100) : 0;
  };

  const stats = getStatistics();
  const filteredWords = getFilteredWords();

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">CEFR Seviyelerine Göre Kelime Listeleri</h2>
            <p className="text-gray-600 mt-1">
              Seviyenize uygun kelime listelerini keşfedin ve öğrenme durumunuzu takip edin
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setIsAddWordModalOpen(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              Yeni Kelime Ekle
            </Button>
          </div>
        </div>

        {/* Add Word Modal */}
        {isAddWordModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Yeni Kelime Ekle</h3>
                <Button 
                  variant="ghost" 
                  className="!rounded-button"
                  onClick={() => setIsAddWordModalOpen(false)}
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
              <form onSubmit={handleAddWord} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="word">Kelime *</Label>
                    <Input
                      id="word"
                      value={newWord.word}
                      onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                      className="mt-1"
                      placeholder="Örn: beautiful"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-2 italic">
                      💡 Anlam, örnek cümle ve seviye otomatik olarak AI tarafından belirlenecektir
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="!rounded-button"
                    onClick={() => setIsAddWordModalOpen(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground !rounded-button">
                    Kaydet
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <p className="text-red-700">{error}</p>
            <Button 
              onClick={loadVocabulary} 
              variant="outline" 
              size="sm"
              className="ml-auto"
            >
              Tekrar Dene
            </Button>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Kelime veya anlam ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 text-sm"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
            <div className="flex flex-wrap gap-2">
              <select 
                value={activeLevel} 
                onChange={(e) => setActiveLevel(e.target.value)}
                className="w-[120px] rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="all">Tüm Seviyeler</option>
                <option value="a1">A1</option>
                <option value="a2">A2</option>
                <option value="b1">B1</option>
                <option value="b2">B2</option>
                <option value="c1">C1</option>
                <option value="c2">C2</option>
              </select>
              <select 
                value={learnedFilter} 
                onChange={(e) => setLearnedFilter(e.target.value)}
                className="w-[150px] rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="all">Tümü</option>
                <option value="learned">Öğrenildi</option>
                <option value="not-learned">Öğrenilmedi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Level Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Object.entries(wordLists).map(([level, data]: [string, any]) => {
            const levelWords = vocabulary.filter(word => (word.level || '').toLowerCase() === level);
            const progress = getLevelProgress(level);
            return (
              <Card key={level} className={`border-none shadow-sm ${data.color}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className={`font-bold ${data.textColor}`}>{data.title}</h3>
                      <p className="text-sm text-gray-600">{data.description}</p>
                    </div>
                    <Badge className={data.badgeColor}>{level.toUpperCase()}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>İlerleme</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">
                      {levelWords.length} kelime
                    </div>
                    <Button
                      variant="outline"
                      className={`border-none bg-white ${data.textColor}`}
                      onClick={() => setActiveLevel(level)}
                    >
                      Görüntüle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Word List */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {activeLevel === "all" ? "Tüm Kelimeler" : wordLists[activeLevel as keyof typeof wordLists]?.title}
            </h3>
            <div className="text-sm text-gray-600">
              {filteredWords.length} kelime bulundu
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Kelimeler yükleniyor...</p>
              </div>
            </div>
          ) : filteredWords.length > 0 ? (
            <div className="space-y-4">
              {filteredWords.map((word) => {
                const levelData = wordLists[word.level?.toLowerCase() as keyof typeof wordLists] || wordLists.a1;
                return (
                  <div
                    key={word.id}
                    className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                      expandedWordId === word.id ? "shadow-md" : "shadow-sm"
                    } ${levelData?.borderColor || "border-gray-200"}`}
                  >
                    <div
                      className={`p-4 cursor-pointer ${
                        expandedWordId === word.id ? levelData?.color : "bg-white"
                      }`}
                      onClick={() => toggleWordExpanded(word.id!)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="mr-3">
                            <input
                              type="checkbox"
                              id={`word-learned-${word.id}`}
                              checked={word.is_learned || false}
                              onChange={() => handleToggleLearned(word.id!, word.is_learned || false)}
                              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-bold text-gray-800">{word.original_word || word.word}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playWordAudio(word.word);
                                }}
                              >
                                <i className="fas fa-volume-up text-primary"></i>
                              </Button>
                              {word.level && (
                                <Badge className={`ml-2 ${levelData?.badgeColor}`}>
                                  {word.level.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600">{word.definition}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <i className={`fas fa-chevron-${expandedWordId === word.id ? "up" : "down"} ml-2 text-gray-400`}></i>
                        </div>
                      </div>
                    </div>

                    {expandedWordId === word.id && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Detaylar</h5>
                            <div className="space-y-2">
                              {word.definition && (
                                <div>
                                  <span className="text-sm text-gray-500">Anlamı: </span>
                                  <span className="text-gray-800">{word.definition}</span>
                                </div>
                              )}
                              {word.level && (
                                <div>
                                  <span className="text-sm text-gray-500">Seviye: </span>
                                  <Badge variant="outline">
                                    {word.level.toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                              <div>
                                <span className="text-sm text-gray-500">Durum: </span>
                                <Badge className={`${word.is_learned ? "bg-green-500" : "bg-amber-500"}`}>
                                  {word.is_learned ? "Öğrenildi" : "Öğrenilmedi"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Örnek Cümle</h5>
                            {word.example_sentence ? (
                              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                <p className="text-gray-700 italic">"{word.example_sentence}"</p>
                                {word.example_sentence_turkish && (
                                  <p className="text-gray-600 text-sm font-medium border-t border-gray-200 pt-2">
                                    🇹🇷 "{word.example_sentence_turkish}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">Örnek cümle eklenmemiş</p>
                            )}
                          </div>
                        </div>
                        {/* Orijinal Cümle */}
                        {word.original_sentence && (
                          <div className="col-span-2 mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <h5 className="font-medium text-primary mb-2 flex items-center">
                              <i className="fas fa-quote-left mr-2"></i>
                              Orijinal Cümle
                            </h5>
                            <p className="text-gray-800 italic">"{word.original_sentence}"</p>
                            <p className="text-xs text-gray-600 mt-1">Bu cümle kelimenin orijinal metindeki kullanımını gösterir</p>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                            onClick={() => handleDeleteWord(word.id!)}
                          >
                            <i className="fas fa-trash mr-2"></i>
                            Sil
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="fas fa-search text-gray-400 text-xl"></i>
              </div>
              <h4 className="text-lg font-medium text-gray-700">
                {vocabulary.length === 0 ? 'Henüz kelime eklenmemiş' : 'Sonuç Bulunamadı'}
              </h4>
              <p className="text-gray-500 mt-1">
                {vocabulary.length === 0 
                  ? 'Senkronize metin oynatıcısında kelimelere sağ tıklayarak kelime listenize ekleyebilirsiniz.'
                  : 'Arama kriterlerinize uygun kelime bulunamadı.'
                }
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setIsAddWordModalOpen(true)}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Kelime Ekle
                </Button>
                {vocabulary.length !== 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveLevel("all");
                      setLearnedFilter("all");
                    }}
                  >
                    Filtreleri Temizle
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">Kelime İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Toplam Kelime</span>
                    <span className="text-sm font-medium text-primary">{stats.total}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Öğrenilen</span>
                    <span className="text-sm font-medium text-green-600">{stats.learned}</span>
                  </div>
                  <Progress value={stats.learnedPercentage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Öğrenilmemiş</span>
                    <span className="text-sm font-medium text-amber-600">{stats.notLearned}</span>
                  </div>
                  <Progress value={100 - stats.learnedPercentage} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">Pratik Araçları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Dialog open={isReminderSettingsOpen} onOpenChange={setIsReminderSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <i className="fas fa-sync-alt mr-2 text-purple-600"></i>
                      Kelime Tekrarı
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-gray-800">
                        <i className="fas fa-sync-alt mr-2 text-purple-600"></i>
                        Kelime Hatırlatma Ayarları
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Words per day setting */}
                      <div className="space-y-2">
                        <Label htmlFor="wordsPerDay" className="text-sm font-medium text-gray-700">
                          Günde kaç kelime hatırlatılsın?
                        </Label>
                        <select
                          value={reminderSettings.wordsPerDay.toString()}
                          onChange={(e) => setReminderSettings(prev => ({
                            ...prev,
                            wordsPerDay: parseInt(e.target.value)
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="1">1 kelime</option>
                          <option value="3">3 kelime</option>
                          <option value="5">5 kelime</option>
                          <option value="7">7 kelime</option>
                          <option value="10">10 kelime</option>
                          <option value="15">15 kelime</option>
                          <option value="20">20 kelime</option>
                        </select>
                      </div>

                      {/* Time range setting */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Bildirim yapılacak saat aralığı
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startTime" className="text-xs text-gray-600">
                              Başlangıç Saati
                            </Label>
                            <Input
                              id="startTime"
                              type="time"
                              value={reminderSettings.startTime}
                              onChange={(e) => setReminderSettings(prev => ({
                                ...prev,
                                startTime: e.target.value
                              }))}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endTime" className="text-xs text-gray-600">
                              Bitiş Saati
                            </Label>
                            <Input
                              id="endTime"
                              type="time"
                              value={reminderSettings.endTime}
                              onChange={(e) => setReminderSettings(prev => ({
                                ...prev,
                                endTime: e.target.value
                              }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          <i className="fas fa-info-circle mr-1"></i>
                          Seçilen saat aralığında eşit aralıklarla hatırlatmalar yapılacaktır.
                        </p>
                      </div>

                      {/* Info box */}
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex">
                          <i className="fas fa-mobile-alt text-primary mr-2 mt-0.5"></i>
                          <div>
                            <h4 className="text-sm font-medium text-primary">Mobil Bildirimler</h4>
                            <p className="text-xs text-gray-700 mt-1">
                              Bu ayarlar mobil uygulamada bildirim zamanlarını belirler. Web versiyonunda bildirim bulunmaz.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsReminderSettingsOpen(false)}
                        >
                          İptal
                        </Button>
                        <Button
                          onClick={handleSaveReminderSettings}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <i className="fas fa-save mr-2"></i>
                          Ayarları Kaydet
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="w-full justify-start">
                  <i className="fas fa-microphone mr-2 text-primary"></i>
                  Telaffuz Pratiği
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <i className="fas fa-puzzle-piece mr-2 text-green-600"></i>
                  Kelime Oyunları
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">Öğrenme İpuçları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <h4 className="font-medium text-primary mb-1">Düzenli Tekrar</h4>
                  <p className="text-sm text-gray-600">Öğrendiğiniz kelimeleri düzenli aralıklarla tekrar edin.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">Bağlam İçinde Öğrenme</h4>
                  <p className="text-sm text-gray-600">Kelimeleri cümle içinde kullanarak daha kalıcı öğrenin.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Default export for Next.js pages
export default function VocabularyPage() {
  return <VocabularyTabContent user={{}} />;
}
