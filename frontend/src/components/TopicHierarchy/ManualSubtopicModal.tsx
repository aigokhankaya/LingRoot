'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useTranslation } from '../../lib/i18n';
import { PlusCircle, X, Lightbulb, Loader2, Check } from 'lucide-react';

interface ManualSubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, description?: string) => Promise<void>;
  parentTitle: string;
}

const ManualSubtopicModal: React.FC<ManualSubtopicModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  parentTitle
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd(title.trim(), description.trim() || undefined);

      // Başarılıysa form'u temizle ve kapat
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Manual subtopic add error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-green-600" />
            {t('topics_manual_modal_title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{t('topics_manual_modal_main_topic_label')}:</span>{' '}
            {parentTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Başlık */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('topics_manual_modal_title_label')} *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('topics_manual_modal_title_placeholder')}
              disabled={isSubmitting}
              maxLength={200}
              required
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('topics_manual_modal_desc_label')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('topics_manual_modal_desc_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Bilgilendirme */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-gray-700 flex items-start gap-1">
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{t('topics_manual_modal_info')}</span>
            </p>
          </div>

          {/* Aksiyonlar */}
          <div className="flex space-x-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              {t('common_button_cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('topics_manual_modal_submit_loading')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('topics_manual_modal_submit_button')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualSubtopicModal;
