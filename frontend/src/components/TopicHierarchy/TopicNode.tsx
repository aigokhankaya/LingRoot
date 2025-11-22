'use client';

import React, { useState } from 'react';
import { Topic, generateSubtopics, addManualSubtopic, deleteTopicAndChildren, createContentFromTopic } from '../../lib/api';
import { Button } from '../ui/button';
import SubtopicModal from './SubtopicModal';
import ManualSubtopicModal from './ManualSubtopicModal';

interface TopicNodeProps {
  topic: Topic;
  depth: number;
  onRefresh: () => Promise<void>;
  onContentCreated?: (result: any) => void;
  level: string;
}

const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  depth,
  onRefresh,
  onContentCreated,
  level
}) => {
  const [isExpanded, setIsExpanded] = useState(depth === 0); // Ana konular açık başlar
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubtopicModal, setShowSubtopicModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Renk şeması - derinliğe göre
  const getDepthColors = () => {
    switch (depth) {
      case 0:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/30',
          text: 'text-primary',
          icon: 'text-primary',
          badge: 'bg-primary'
        };
      case 1:
        return {
          bg: 'bg-secondary/10',
          border: 'border-secondary/40',
          text: 'text-secondary-foreground',
          icon: 'text-secondary-foreground',
          badge: 'bg-secondary'
        };
      case 2:
        return {
          bg: 'bg-accent',
          border: 'border-accent',
          text: 'text-accent-foreground',
          icon: 'text-accent-foreground',
          badge: 'bg-accent'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-800',
          icon: 'text-gray-600',
          badge: 'bg-gray-600'
        };
    }
  };

  const colors = getDepthColors();
  const hasChildren = topic.children && topic.children.length > 0;
  const indent = depth * 20; // Her seviye için 20px indent

  const handleToggleExpand = () => {
    if (!hasChildren) return;
    setIsExpanded(prev => !prev);
  };

  const latestContent = (topic as any).latest_content || null;
  const hasAudio = !!(latestContent && latestContent.mp3_url);
  const isListened = !!(latestContent && latestContent.listened_at);

  // Alt konu oluştur
  const handleGenerateSubtopics = async (count: number, language: string) => {
    try {
      setIsGenerating(true);
      const response = await generateSubtopics(topic.id, { count, language });
      
      if (response.success) {
        await onRefresh();
        setIsExpanded(true); // Alt konular oluşunca expand et
        setShowSubtopicModal(false);
      }
    } catch (err: any) {
      console.error('❌ Alt konu oluşturma hatası:', err);
      alert(err.message || 'Alt konular oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manuel alt konu ekle
  const handleAddManualSubtopic = async (title: string, description?: string) => {
    try {
      const response = await addManualSubtopic(topic.id, { title, description });
      
      if (response.success) {
        await onRefresh();
        setIsExpanded(true);
        setShowManualModal(false);
      }
    } catch (err: any) {
      console.error('❌ Manuel alt konu ekleme hatası:', err);
      alert(err.message || 'Alt konu eklenirken hata oluştu');
    }
  };

  // Konu sil
  const handleDelete = async () => {
    if (!confirm(`"${topic.title}" konusunu ve tüm alt konularını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await deleteTopicAndChildren(topic.id);
      
      if (response.success) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error('❌ Konu silme hatası:', err);
      alert(err.message || 'Konu silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  // TTS İçerik oluştur
  const handleCreateContent = async () => {
    try {
      const response = await createContentFromTopic(topic.id);
      
      if (response.success && response.data) {
        // Frontend'deki mevcut TTS workflow'unu tetikle
        // Bu bilgiyi parent component'e ilet
        if (onContentCreated) {
          onContentCreated({
            topic: response.data.topic,
            suggestedInput: response.data.suggested_input
          });
        }
        
        alert('Konu bilgisi alındı! Şimdi ses oluşturabilirsiniz.');
      }
    } catch (err: any) {
      console.error('❌ İçerik oluşturma hatası:', err);
      alert(err.message || 'İçerik oluşturulurken hata oluştu');
    }
  };

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      {/* Node Container */}
      <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 transition-all hover:shadow-md`}>
        <div className="flex items-start justify-between">
          {/* Sol Taraf - Başlık ve Bilgiler (tıklanabilir alan) */}
          <div
            className="flex-1 flex items-start space-x-3 cursor-pointer"
            onClick={handleToggleExpand}
          >
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                className={`${colors.icon} hover:opacity-70 transition-opacity mt-1`}
              >
                <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
              </button>
            )}

            {/* Icon */}
            <div className={`${colors.icon} text-xl mt-1`}>
              {depth === 0 ? '📚' : depth === 1 ? '🔹' : '📝'}
            </div>

            {/* Başlık ve Açıklama */}
            <div className="flex-1">
              <h4 className={`${colors.text} font-semibold text-base mb-1`}>
                {topic.title}
              </h4>
              {topic.description && (
                <p className="text-sm text-gray-600 mb-2">
                  {topic.description}
                </p>
              )}
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className={`${colors.badge} text-white px-2 py-0.5 rounded-full`}>
                  {topic.level}
                </span>
                <span>Derinlik: {topic.depth}</span>
                {topic.is_manual && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Manuel
                  </span>
                )}
                {topic.keywords && topic.keywords.length > 0 && (
                  <span className="text-gray-400">
                    {topic.keywords.slice(0, 3).join(', ')}
                  </span>
                )}
                {hasAudio ? (
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      isListened
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isListened ? 'Dinlendi' : 'Ses hazır'}
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Ses yok
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Taraf - Aksiyonlar */}
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleCreateContent}
              size="sm"
              className="text-sm"
            >
              <i className="fas fa-volume-up mr-1"></i>
              Ses Oluştur
            </Button>

            <div className="flex space-x-1">
              <Button
                onClick={() => setShowSubtopicModal(true)}
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={isGenerating}
              >
                <i className="fas fa-robot mr-1"></i>
                AI Öner
              </Button>

              <Button
                onClick={() => setShowManualModal(true)}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <i className="fas fa-plus mr-1"></i>
                Manuel Ekle
              </Button>

              <Button
                onClick={handleDelete}
                size="sm"
                variant="outline"
                className="text-xs text-red-600 hover:bg-red-50"
                disabled={isDeleting}
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Children (Recursive) */}
      {isExpanded && hasChildren && (
        <div className="mt-3 space-y-3">
          {topic.children!.map((child) => (
            <TopicNode
              key={child.id}
              topic={child}
              depth={depth + 1}
              onRefresh={onRefresh}
              onContentCreated={onContentCreated}
              level={level}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SubtopicModal
        isOpen={showSubtopicModal}
        onClose={() => setShowSubtopicModal(false)}
        onGenerate={handleGenerateSubtopics}
        parentTitle={topic.title}
        isLoading={isGenerating}
      />

      <ManualSubtopicModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onAdd={handleAddManualSubtopic}
        parentTitle={topic.title}
      />
    </div>
  );
};

export default TopicNode;
