'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { useTranslation } from '../../lib/i18n';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TopicInputProps {
  onCreateTopic: (title: string, description?: string, mood?: string) => Promise<void>;
  isLoading: boolean;
  level: string;
}

const TopicInput: React.FC<TopicInputProps> = ({
  onCreateTopic,
  isLoading,
  level
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState('Neutral');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const moods = [
    { value: 'Neutral', label: t('mood_neutral') || 'Nötr / Dengeli' },
    { value: 'Educational', label: t('mood_educational') || 'Eğitici' },
    { value: 'Cheerful', label: t('mood_cheerful') || 'Neşeli / Canlı' },
    { value: 'Melancholic', label: t('mood_melancholic') || 'Melankolik / Duygusal' },
    { value: 'Suspenseful', label: t('mood_suspenseful') || 'Gizemli / Merak Uyandırıcı' },
    { value: 'Inspiring', label: t('mood_inspiring') || 'İlham Verici' },
    { value: 'Calm', label: t('mood_calm') || 'Sakin / Huzurlu' },
    { value: 'Urgent', label: t('mood_urgent') || 'Acil / Tempolu' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    await onCreateTopic(title.trim(), description.trim() || undefined, mood);

    // Form'u temizle
    setTitle('');
    setDescription('');
    setMood('Neutral');
    setShowAdvanced(false);
  };

  return (
    <Card className="border-none shadow-sm bg-gray-50/50">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('topics_input_title_placeholder') || "Yeni bir konu başlığı girin..."}
                className="text-base py-6 bg-white border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                disabled={isLoading}
                maxLength={200}
                autoFocus={false}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="px-6 font-semibold h-auto min-w-[140px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>{t('topics_input_submit_loading') || '...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <i className="fas fa-plus"></i>
                  <span>{t('topics_input_submit_button') || 'Ana Konu Oluştur'}</span>
                </div>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1 hover:text-primary transition-colors"
            >
              <span>{showAdvanced ? (t('hide_options') || "Daha az seçenek") : (t('more_options') || "Daha fazla seçenek")}</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <div className="flex items-center space-x-2 opacity-60">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">{level}</span>
            </div>
          </div>

          {showAdvanced && (
            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 ml-1">
                  {t('topics_input_desc_label') || "Detaylı Açıklama (Opsiyonel)"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('topics_input_desc_placeholder') || "Konu hakkında özel isteklerinizi buraya yazabilirsiniz..."}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none bg-white"
                  rows={2}
                  disabled={isLoading}
                  maxLength={500}
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 ml-1">
                  {t('mood_selector_label') || "Anlatım Tonu"}
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-white"
                  disabled={isLoading}
                >
                  {moods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default TopicInput;
