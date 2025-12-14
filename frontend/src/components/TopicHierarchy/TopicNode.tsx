'use client';

import React, { useState } from 'react';
import { Topic, generateSubtopics, addManualSubtopic, deleteTopicAndChildren } from '../../lib/api';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import SubtopicModal from './SubtopicModal';
import ManualSubtopicModal from './ManualSubtopicModal';
import { useTranslation } from '../../lib/i18n';

interface TopicNodeProps {
  topic: Topic;
  depth: number;
  onRefresh: () => Promise<void>;
  onContentCreated?: (result: any) => void;
  level: string;
  audioStateByTopic?: Record<string, { isLoading?: boolean; hasAudio?: boolean }>;
  onOpenAudioModal?: (topicId: string) => void;
}

const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  depth,
  onRefresh,
  onContentCreated,
  level,
  audioStateByTopic,
  onOpenAudioModal,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false); // Ana konular açık başlar
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubtopicModal, setShowSubtopicModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: 'text-orange-500',
          badge: 'bg-orange-500'
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

  const audioState = audioStateByTopic?.[topic.id];
  const isTopicAudioLoading = !!audioState?.isLoading;
  const hasInlineAudio = !!audioState?.hasAudio;

  const handleToggleExpand = () => {
    if (!hasChildren) return;
    setIsExpanded(prev => !prev);
  };

  const latestContent = (topic as any).latest_content || null;
  const hasAudio = !!(latestContent && latestContent.mp3_url);
  const isListened = !!(latestContent && latestContent.listened_at);
  // Ses oynatılabilir mi? (backend'de audio varsa veya bu oturumda yeni üretildiyse)
  const canPlayFromTree = hasAudio || hasInlineAudio;

  // Alt konu istatistikleri (toplam alt konu, ses oluşturulan ve dinlenen sayıları)
  const computeSubtreeStats = (root: any) => {
    let totalSubtopics = 0;
    let audioCount = 0;
    let listenedCount = 0;

    const traverse = (node: any) => {
      if (!node.children || node.children.length === 0) return;
      node.children.forEach((child: any) => {
        totalSubtopics += 1;
        const childLatest = child.latest_content;
        if (childLatest && childLatest.mp3_url) {
          audioCount += 1;
        }
        if (childLatest && childLatest.listened_at) {
          listenedCount += 1;
        }
        traverse(child);
      });
    };

    traverse(root);
    return { totalSubtopics, audioCount, listenedCount };
  };

  const { totalSubtopics, audioCount, listenedCount } = computeSubtreeStats(topic as any);
  const hasSubtopics = totalSubtopics > 0;



  // Alt konu oluştur
  const handleGenerateSubtopics = async (count: number, language: string, angle?: string) => {
    try {
      setIsGenerating(true);
      const response = await generateSubtopics(topic.id, { count, language, angle });

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
    try {
      setIsDeleting(true);
      const response = await deleteTopicAndChildren(topic.id);

      if (response.success) {
        await onRefresh();
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      console.error('❌ Konu silme hatası:', err);
      alert(err.message || 'Konu silinirken hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  // TTS İçerik oluştur (sadece frontend tarafında topic bilgisinden input üret)
  const handleCreateContent = async () => {
    try {
      if (!onContentCreated) return;

      const suggestedInput = topic.description
        ? `${topic.title}: ${topic.description}`
        : topic.title;

      onContentCreated({
        topic,
        suggestedInput,
      });
    } catch (err: any) {
      console.error('❌ İçerik oluşturma hatası:', err);
      alert(err.message || 'İçerik oluşturulurken hata oluştu');
    }
  };

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      {/* Node Container */}
      <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 transition-all hover:shadow-md`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
                {hasSubtopics && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({totalSubtopics} {t('topics_node_subtopic_suffix')})
                  </span>
                )}
              </h4>
              <p className="sr-only">{topic.description}</p>
              {/* Only show badges, hide text description to reduce clutter */}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className={`${colors.badge} text-white px-2 py-0.5 rounded-full`}>
                  {topic.level}
                </span>
                {topic.is_manual && (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {t('topics_node_manual_badge')}
                  </span>
                )}

                {/* Audio Status */}
                {hasSubtopics ? (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {audioCount}/{totalSubtopics} Audio
                  </span>
                ) : hasAudio ? (
                  <span
                    className={`px-2 py-0.5 rounded-full ${isListened
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                      }`}
                  >
                    {isListened ? 'Listened' : 'Ready to Listen'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Sağ Taraf - Aksiyonlar (SIMPLIFIED) */}
          <div className="flex items-center space-x-2 w-full md:w-auto mt-2 md:mt-0 justify-end">

            {/* Primary Action: Listen/Create */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (isTopicAudioLoading) return;
                if (canPlayFromTree && onOpenAudioModal) {
                  onOpenAudioModal(topic.id);
                  return;
                }
                handleCreateContent();
              }}
              size="sm"
              className={`rounded-full px-6 font-medium ${canPlayFromTree ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'}`}
              disabled={isTopicAudioLoading}
            >
              {isTopicAudioLoading ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : canPlayFromTree ? (
                <>
                  <i className="fas fa-play mr-2"></i> {t('listen') || "Listen"}
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i> {t('create_audio') || "Create Audio"}
                </>
              )}
            </Button>

            {/* Secondary Actions: Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <i className="fas fa-ellipsis-v text-gray-500"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSubtopicModal(true)} disabled={isGenerating}>
                  <i className="fas fa-robot mr-2 w-4"></i>
                  {t('topics_node_button_suggest_subtopic')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowManualModal(true)}>
                  <i className="fas fa-plus mr-2 w-4"></i>
                  {t('topics_node_button_add_manual')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-red-600 focus:text-red-600">
                  <i className="fas fa-trash mr-2 w-4"></i>
                  {t('topics_node_button_delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
              audioStateByTopic={audioStateByTopic}
              onOpenAudioModal={onOpenAudioModal}
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2 text-red-600"></i>
                {t('topics_node_delete_title')}
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-1">
              &quot;{topic.title}&quot; {t('topics_node_delete_description_main')}
            </p>
            <p className="text-sm text-gray-700 mb-4">
              {t('topics_node_delete_description_warning')}
            </p>

            <div className="flex space-x-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t('topics_node_delete_cancel')}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {t('topics_node_delete_confirm_loading')}
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    {t('topics_node_delete_confirm')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicNode;
