'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useTranslation, locales } from '../../lib/i18n';

interface SubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number, language: string, angle?: string) => Promise<void>;
  parentTitle: string;
  isLoading: boolean;
}

const SubtopicModal: React.FC<SubtopicModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  parentTitle,
  isLoading
}) => {
  const { t } = useTranslation();
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('tr');
  const [angle, setAngle] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const safeCount = !count || count <= 0 ? 5 : count;
    await onGenerate(safeCount, language, angle.trim() || undefined);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-robot me-2 text-primary"></i>
            {t('topics_subtopic_modal_title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{t('topics_subtopic_modal_main_topic_label')}:</span>{' '}
            {parentTitle}
          </p>
        </div>

        <div className="space-y-4">
          {/* Alt Konu Sayısı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('topics_subtopic_modal_count_label')}
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setCount(num)}
                  disabled={isLoading}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${count === num
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary/50'
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="mt-1">
              <label className="block text-xs text-gray-600 mb-1">
                {t('topics_subtopic_modal_count_custom_label')}
              </label>
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => {
                  const value = parseInt(e.target.value || '0', 10);
                  setCount(Number.isNaN(value) ? 0 : value);
                }}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Dil Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('topics_subtopic_modal_language_label')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`language_${locale}`) || locale.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Açı/Açıklama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('topics_subtopic_modal_angle_label')}
            </label>
            <textarea
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              disabled={isLoading}
              placeholder={t('topics_subtopic_modal_placeholder_angle')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Bilgilendirme */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <i className="fas fa-info-circle me-1 text-yellow-600"></i>
              {t('topics_subtopic_modal_info')}
            </p>
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex space-x-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isLoading}
          >
            {t('common_button_cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                {t('topics_subtopic_modal_submit_loading')}
              </>
            ) : (
              <>
                <i className="fas fa-magic me-2"></i>
                {t('topics_subtopic_modal_submit_button')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubtopicModal;
