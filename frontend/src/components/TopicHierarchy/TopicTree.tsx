'use client';

import React from 'react';
import { Topic } from '../../lib/api';
import TopicNode from './TopicNode';

interface TopicTreeProps {
  topics: Topic[];
  onRefresh: () => Promise<void>;
  onContentCreated?: (result: any) => void;
  level: string;
}

const TopicTree: React.FC<TopicTreeProps> = ({
  topics,
  onRefresh,
  onContentCreated,
  level
}) => {
  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <i className="fas fa-sitemap mr-2 text-primary"></i>
          Konu Ağacınız
        </h3>
        <button
          onClick={onRefresh}
          className="text-sm text-gray-600 hover:text-primary transition-colors flex items-center space-x-2"
        >
          <i className="fas fa-sync-alt"></i>
          <span>Yenile</span>
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
          />
        ))}
      </div>
    </div>
  );
};

export default TopicTree;
