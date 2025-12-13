'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { useTranslation } from '../../lib/i18n';

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
  const [showDescription, setShowDescription] = useState(false);
  const [mood, setMood] = useState('Neutral');

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
    setShowDescription(false);
    setMood('Neutral');
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📚 {t('topics_input_title_label')}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('topics_input_title_placeholder')}
              className="text-base"
              disabled={isLoading}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('topics_input_title_helper')}
            </p>
          </div>

          {/* İsteğe Bağlı Açıklama */}
          {showDescription ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 {t('topics_input_desc_label')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('topics_input_desc_placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDescription(false);
                    setDescription('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {t('topics_input_desc_remove')}
                </button>
                <span className="text-xs text-gray-500">
                  {description.length}/500
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="text-sm text-primary hover:text-primary/80 flex items-center space-x-1"
              disabled={isLoading}
            >
              <i className="fas fa-plus-circle"></i>
              <span>{t('topics_input_desc_add')}</span>
            </button>
          )}

          {/* Mood Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎭 {t('mood_selector_label') || 'Anlatım Tonu (Mood)'}
            </label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              disabled={isLoading}
            >
              {moods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seviye Göstergesi */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <i className="fas fa-layer-group"></i>
              <span>{t('topics_input_level_label')}:</span>
              <span className="font-semibold text-primary">{level.toUpperCase()}</span>
            </div>
            <div className="text-xs text-gray-500">
              {t('topics_input_level_hint')}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="w-full font-semibold"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {t('topics_input_submit_loading')}
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle mr-2"></i>
                {t('topics_input_submit_button')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TopicInput;
