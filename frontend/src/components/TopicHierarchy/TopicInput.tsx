'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';

interface TopicInputProps {
  onCreateTopic: (title: string, description?: string) => Promise<void>;
  isLoading: boolean;
  level: string;
}

const TopicInput: React.FC<TopicInputProps> = ({
  onCreateTopic,
  isLoading,
  level
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    await onCreateTopic(title.trim(), description.trim() || undefined);
    
    // Form'u temizle
    setTitle('');
    setDescription('');
    setShowDescription(false);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📚 Ana Konu Başlığı
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Osmanlı Devleti, Bilim Tarihi, Sanat Akımları..."
              className="text-base"
              disabled={isLoading}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              Bir ana konu girin ve sistem size alt konular önerecek
            </p>
          </div>

          {/* İsteğe Bağlı Açıklama */}
          {showDescription ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Açıklama (İsteğe Bağlı)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Konu hakkında kısa bir açıklama yazabilirsiniz..."
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
                  Açıklamayı kaldır
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
              <span>Açıklama ekle</span>
            </button>
          )}

          {/* Seviye Göstergesi */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <i className="fas fa-layer-group"></i>
              <span>Seviye:</span>
              <span className="font-semibold text-primary">{level.toUpperCase()}</span>
            </div>
            <div className="text-xs text-gray-500">
              Alt konular bu seviyede oluşturulacak
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
                Oluşturuluyor...
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle mr-2"></i>
                Ana Konu Oluştur
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TopicInput;
