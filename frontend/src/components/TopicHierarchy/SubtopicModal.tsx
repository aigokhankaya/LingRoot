'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';

interface SubtopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number, language: string) => Promise<void>;
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
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('Turkish');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    await onGenerate(count, language);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-robot mr-2 text-blue-600"></i>
            AI ile Alt Konu Oluştur
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Ana Konu:</span> {parentTitle}
          </p>
        </div>

        <div className="space-y-4">
          {/* Alt Konu Sayısı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kaç adet alt konu oluşturulsun?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 8, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setCount(num)}
                  disabled={isLoading}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${
                    count === num
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Dil Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt konu dili
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Turkish">Türkçe</option>
              <option value="English">İngilizce</option>
            </select>
          </div>

          {/* Bilgilendirme */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <i className="fas fa-info-circle mr-1 text-yellow-600"></i>
              AI, bu ana konu için {count} adet eğitici ve gerçek alt konu önerecek. 
              Her alt konudan tekrar detay konular oluşturabilirsiniz.
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
            İptal
          </Button>
          <Button
            onClick={handleGenerate}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Oluşturuluyor...
              </>
            ) : (
              <>
                <i className="fas fa-magic mr-2"></i>
                Oluştur
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubtopicModal;
