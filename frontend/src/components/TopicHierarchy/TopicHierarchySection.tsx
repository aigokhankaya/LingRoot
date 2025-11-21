'use client';

import React, { useEffect, useState } from 'react';
import { Topic, getTopicTree, createMainTopic } from '../../lib/api';
import TopicInput from './TopicInput';
import TopicTree from './TopicTree';

interface TopicHierarchySectionProps {
  userId: string;
  level: string;
  onContentCreated?: (result: any) => void;
}

const TopicHierarchySection: React.FC<TopicHierarchySectionProps> = ({
  userId,
  level,
  onContentCreated
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Konu ağacını yükle
  const loadTopicTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getTopicTree();
      
      if (response.success && response.data) {
        setTopics(response.data.topics);
        console.log('✅ Konu ağacı yüklendi:', response.data.total, 'konu');
      }
    } catch (err: any) {
      console.error('❌ Konu ağacı yükleme hatası:', err);
      setError(err.message || 'Konular yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Component mount'ta yükle
  useEffect(() => {
    loadTopicTree();
  }, [userId]);

  // Ana konu oluştur
  const handleCreateMainTopic = async (title: string, description?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await createMainTopic({
        title,
        description,
        level
      });

      if (response.success) {
        setSuccessMessage('Ana konu başarıyla oluşturuldu!');
        await loadTopicTree(); // Listeyi yenile
        
        // 3 saniye sonra mesajı temizle
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('❌ Ana konu oluşturma hatası:', err);
      setError(err.message || 'Ana konu oluşturulurken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bilgilendirme */}
      <div className="bg-secondary/10 border border-secondary/40 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <i className="fas fa-sitemap text-3xl text-primary"></i>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📚 Konu Hiyerarşisi Nedir?
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Bir ana konu seçin ve otomatik olarak alt konular oluşturun. Her alt konudan daha detaylı konular 
              üretebilir veya dilediğiniz konuyu manuel ekleyebilirsiniz. Her seviyeden sesli içerik oluşturabilirsiniz.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>Sonsuz derinlikte konu ağacı</span>
              </div>
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>AI destekli alt konu önerileri</span>
              </div>
              <div className="flex items-center space-x-2 text-primary">
                <i className="fas fa-check-circle"></i>
                <span>Her seviyeden ses oluşturma</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <i className="fas fa-check-circle mr-2"></i>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Ana Konu Girişi */}
      <TopicInput
        onCreateTopic={handleCreateMainTopic}
        isLoading={isLoading}
        level={level}
      />

      {/* Konu Ağacı */}
      {topics.length > 0 ? (
        <TopicTree
          topics={topics}
          onRefresh={loadTopicTree}
          onContentCreated={onContentCreated}
          level={level}
        />
      ) : (
        !isLoading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <i className="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 mb-2">Henüz konu oluşturmadınız</p>
            <p className="text-sm text-gray-500">
              Yukarıdaki formdan bir ana konu oluşturarak başlayın
            </p>
          </div>
        )
      )}

      {/* Loading State */}
      {isLoading && topics.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-3xl text-primary mb-3"></i>
          <p className="text-gray-600">Konular yükleniyor...</p>
        </div>
      )}
    </div>
  );
};

export default TopicHierarchySection;
