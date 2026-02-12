'use client';

import React from 'react';
import { Topic } from '../../lib/api';
import { useTranslation } from '../../lib/i18n';
import TopicNode from './TopicNode';
import { Network, RefreshCw } from 'lucide-react';

interface TopicTreeProps {
  topics: Topic[];
  onRefresh: () => Promise<void>;
  onContentCreated?: (result: any) => void;
  level: string;
  audioStateByTopic?: Record<string, { isLoading?: boolean; hasAudio?: boolean }>;
  onOpenAudioModal?: (topicId: string) => void;
}

const TopicTree: React.FC<TopicTreeProps> = ({
  topics,
  onRefresh,
  onContentCreated,
  level,
  audioStateByTopic,
  onOpenAudioModal,
}) => {
  const { t } = useTranslation();
  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Network className="w-5 h-5 mr-2 text-primary" />
          {t('topics_tree_title')}
        </h3>
        <button
          onClick={onRefresh}
          className="text-sm text-gray-600 hover:text-primary transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('topics_tree_refresh')}</span>
        </button>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => (
          <TopicNode
            key={topic.id}
            topic={topic}
            depth={0}
            onRefresh={onRefresh}
            onContentCreated={onContentCreated}
            level={level}
            audioStateByTopic={audioStateByTopic}
            onOpenAudioModal={onOpenAudioModal}
          />
        ))}
      </div>
    </div>
  );
};

export default TopicTree;
