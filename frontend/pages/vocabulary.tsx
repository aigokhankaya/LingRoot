import React, { useState, useEffect } from 'react';
import { getVocabulary, deleteWordFromVocabulary, updateWordInVocabulary, addWordToVocabulary, addWordWithTranslation, VocabularyWord, getReminderSettings, saveReminderSettings, ReminderSettings } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../src/components/ui/card";
import { Label } from "../src/components/ui/label";
import { Badge } from "../src/components/ui/badge";
import { Progress } from "../src/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../src/components/ui/dialog";

export function VocabularyTabContent({ user }: { user: any }) {
  const { t } = useTranslation();
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
  const [tempSettings, setTempSettings] = useState<ReminderSettings>(reminderSettings);

  // Word lists configuration
  const wordLists = {
    a1: {
      title: t('vocab_level_a1_title'),
      description: t('vocab_level_a1_desc'),
      color: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200",
      badgeColor: "bg-green-500",
    },
    a2: {
      title: t('vocab_level_a2_title'),
      description: t('vocab_level_a2_desc'),
      color: "bg-primary/10",
      textColor: "text-primary",
      borderColor: "border-primary/20",
      badgeColor: "bg-primary text-primary-foreground",
    },
    b1: {
      title: t('vocab_level_b1_title'),
      description: t('vocab_level_b1_desc'),
      color: "bg-purple-100",
      textColor: "text-purple-800",
      borderColor: "border-purple-200",
      badgeColor: "bg-purple-500",
    },
    b2: {
      title: t('vocab_level_b2_title'),
      description: t('vocab_level_b2_desc'),
      color: "bg-amber-100",
      textColor: "text-amber-800",
      borderColor: "border-amber-200",
      badgeColor: "bg-amber-500",
    },
    c1: {
      title: t('vocab_level_c1_title'),
      description: t('vocab_level_c1_desc'),
      color: "bg-indigo-100",
      textColor: "text-indigo-800",
      borderColor: "border-indigo-200",
      badgeColor: "bg-indigo-500",
    },
    c2: {
      title: t('vocab_level_c2_title'),
      description: t('vocab_level_c2_desc'),
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

  useEffect(() => {
    if (isReminderSettingsOpen) {
      setTempSettings(reminderSettings);
    }
  }, [isReminderSettingsOpen, reminderSettings]);

  const loadVocabulary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const words = await getVocabulary();
      setVocabulary(words);
    } catch (error: any) {
      setError(t('vocab_error_loading') + error.message);
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
      await saveReminderSettings(tempSettings);
      setReminderSettings(tempSettings);
      setIsReminderSettingsOpen(false);

      // Show success message
      alert(t('vocab_reminder_success'));
    } catch (error) {
      console.error('❌ [WEB] Error saving reminder settings:', error);
      alert(t('vocab_reminder_error') + (error instanceof Error ? error.message : t('unknown_error')));
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
        alert(t('vocab_existing_word')
          .replace('{word}', cleanWord)
          .replace('{definition}', result.data.definition || 'Belirtilmemiş')
          .replace('{example}', result.data.example_sentence || 'Belirtilmemiş'));
      } else if (result.translationError) {
        alert(t('vocab_success_added_no_trans').replace('{word}', cleanWord));
      } else {
        alert(t('vocab_success_added')
          .replace('{word}', cleanWord)
          .replace('{definition}', result.data.definition || '')
          .replace('{example}', result.data.example_sentence || '')
          .replace('{level}', result.data.level || ''));
      }
    } catch (error: any) {
      alert(t('vocab_error_adding') + error.message);
    }
  };

  const handleDeleteWord = async (wordId: number) => {
    if (!confirm(t('vocab_delete_confirm'))) return;
    try {
      await deleteWordFromVocabulary(wordId);
      setVocabulary(vocabulary.filter(word => word.id !== wordId));
    } catch (error: any) {
      alert(t('vocab_error_deleting') + error.message);
    }
  };

  const handleToggleLearned = async (wordId: number, currentStatus: boolean) => {
    try {
      const updatedWord = await updateWordInVocabulary(wordId, { is_learned: !currentStatus });
      setVocabulary(vocabulary.map(word => word.id === wordId ? updatedWord : word));
    } catch (error: any) {
      alert(t('vocab_error_updating') + error.message);
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
            <h2 className="text-2xl font-bold text-gray-800">{t('vocab_title_cefr')}</h2>
            <p className="text-gray-600 mt-1">
              {t('vocab_subtitle_cefr')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setIsAddWordModalOpen(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              {t('vocab_add_new_word')}
            </Button>
          </div>
        </div>

        {/* Add Word Modal */}
        {isAddWordModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t('vocab_modal_title')}</h3>
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
                    <Label htmlFor="word">{t('vocab_word_label')}</Label>
                    <Input
                      id="word"
                      value={newWord.word}
                      onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                      className="mt-1"
                      placeholder={t('vocab_word_placeholder')}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-2 italic">
                      {t('vocab_word_hint')}
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
                    {t('vocab_cancel')}
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground !rounded-button">
                    {t('vocab_save')}
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
              {t('vocab_retry_button')}
            </Button>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder={t('vocab_search_placeholder')}
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
                <option value="all">{t('vocab_filter_all_levels')}</option>
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
                <option value="all">{t('vocab_filter_all_status')}</option>
                <option value="learned">{t('vocab_filter_learned')}</option>
                <option value="not-learned">{t('vocab_filter_not_learned')}</option>
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
                      <span>{t('vocab_progress_label')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">
                      {levelWords.length} {t('vocab_words_count_suffix')}
                    </div>
                    <Button
                      variant="outline"
                      className={`border-none bg-white ${data.textColor}`}
                      onClick={() => setActiveLevel(level)}
                    >
                      {t('vocab_view_button')}
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
                    className={`border rounded-lg overflow-hidden transition-all duration-200 ${expandedWordId === word.id ? "shadow-md" : "shadow-sm"
                      } ${levelData?.borderColor || "border-gray-200"}`}
                  >
                    <div
                      className={`p-4 cursor-pointer ${expandedWordId === word.id ? levelData?.color : "bg-white"
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
                            <h5 className="font-medium text-gray-700 mb-2">{t('vocab_details_title')}</h5>
                            <div className="space-y-2">
                              <p className="text-gray-600">
                                <span className="font-medium text-gray-700">{t('vocab_meaning_label')}</span>
                                {word.definition}
                              </p>
                              <div className="flex gap-4 text-sm text-gray-500">
                                <span><span className="font-medium">{t('vocab_level_label')}</span> {word.level}</span>
                                <span><span className="font-medium">{t('vocab_status_label')}</span> {word.is_learned ? t('vocab_status_learned_label') : t('vocab_status_not_learned_label')}</span>
                              </div>
                              {word.example_sentence && (
                                <div className="bg-gray-50 p-3 rounded-md text-sm mt-2">
                                  <p className="font-medium text-gray-700 mb-1">{t('vocab_example_sentence_label')}:</p>
                                  <p className="italic text-gray-600">&quot;{word.example_sentence}&quot;</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col justify-between">
                            <div>
                              {word.original_sentence && (
                                <div className="bg-blue-50 p-3 rounded-md text-sm border border-blue-100">
                                  <div className="flex items-center gap-2 mb-1">
                                    <i className="fas fa-quote-left text-blue-400 text-xs"></i>
                                    <p className="font-medium text-blue-800">{t('vocab_original_sentence_label')}</p>
                                  </div>
                                  <p className="text-blue-900 mb-1">&quot;{word.original_sentence}&quot;</p>
                                  <p className="text-xs text-blue-600/80">{t('vocab_original_sentence_desc')}</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteWord(word.id!)}
                              >
                                <i className="fas fa-trash-alt mr-1"></i>
                                {t('vocab_delete_button')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-book-open text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900">{t('vocab_no_words_title')}</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                {t('vocab_no_words_desc')}
              </p>
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">{t('vocab_stats_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('vocab_stats_total')}</p>
                  <p className="text-2xl font-bold text-gray-800">{vocabulary.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-layer-group text-blue-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">{t('vocab_stats_learned')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('vocab_stats_learned')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {vocabulary.filter(w => w.is_learned).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">{t('vocab_stats_not_learned')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('vocab_stats_not_learned')}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {vocabulary.filter(w => !w.is_learned).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-clock text-yellow-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">{t('vocab_practice_tools_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Dialog open={isReminderSettingsOpen} onOpenChange={setIsReminderSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <i className="fas fa-sync-alt mr-2 text-purple-600"></i>
                      {t('vocab_practice_reminder_button')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{t('vocab_reminder_modal_title')}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label>{t('vocab_reminder_words_per_day')}</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={tempSettings.wordsPerDay}
                            onChange={(e) =>
                              setTempSettings({
                                ...tempSettings,
                                wordsPerDay: parseInt(e.target.value) || 5,
                              })
                            }
                            className="w-24"
                          />
                          <span className="text-sm text-gray-500">{t('vocab_words_count_suffix')}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('vocab_reminder_time_range')}</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">{t('vocab_reminder_start_time')}</Label>
                            <Input
                              type="time"
                              value={tempSettings.startTime}
                              onChange={(e) =>
                                setTempSettings({
                                  ...tempSettings,
                                  startTime: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">{t('vocab_reminder_end_time')}</Label>
                            <Input
                              type="time"
                              value={tempSettings.endTime}
                              onChange={(e) =>
                                setTempSettings({
                                  ...tempSettings,
                                  endTime: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('vocab_reminder_info')}
                        </p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-md flex gap-3">
                        <i className="fas fa-mobile-alt text-blue-500 mt-1"></i>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-800">{t('vocab_reminder_mobile_info_title')}</h4>
                          <p className="text-xs text-blue-600 mt-1">
                            {t('vocab_reminder_mobile_info_desc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsReminderSettingsOpen(false)}>
                        {t('vocab_cancel')}
                      </Button>
                      <Button onClick={handleSaveReminderSettings}>
                        {t('vocab_reminder_save_button')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="w-full justify-start">
                  <i className="fas fa-microphone mr-2 text-primary"></i>
                  {t('vocab_practice_pronunciation_button')}
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <i className="fas fa-puzzle-piece mr-2 text-green-600"></i>
                  {t('vocab_practice_games_button')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800">{t('vocab_tips_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <h4 className="font-medium text-primary mb-1">{t('vocab_tips_regular_title')}</h4>
                  <p className="text-sm text-gray-600">{t('vocab_tips_regular_desc')}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">{t('vocab_tips_context_title')}</h4>
                  <p className="text-sm text-gray-600">{t('vocab_tips_context_desc')}</p>
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
