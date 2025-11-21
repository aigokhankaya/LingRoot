'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-plus-circle mr-2 text-green-600"></i>
            Manuel Alt Konu Ekle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Ana Konu:</span> {parentTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Başlık */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Konu Başlığı *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Kuruluş Dönemi, Tarih Öncesi, vb."
              disabled={isSubmitting}
              maxLength={200}
              required
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama (İsteğe Bağlı)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bu alt konu hakkında kısa bir açıklama..."
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
            <p className="text-xs text-gray-700">
              <i className="fas fa-lightbulb mr-1 text-primary"></i>
              Manuel olarak eklediğiniz alt konudan da daha detaylı konular oluşturabilirsiniz.
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
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Ekleniyor...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Ekle
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
