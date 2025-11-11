import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, History } from 'lucide-react';
import { getApiUrl } from '../../lib/api';

interface TopicSuggestion {
  title: string;
  description: string;
  type: 'previous' | 'related' | 'popular';
  similarity?: number;
  creatorName?: string;
  usage_count?: number;
}

interface SmartPromptSuggesterProps {
  conversationId?: string;
  onSelectSuggestion: (topic: string) => void;
  className?: string;
}

export const SmartPromptSuggester: React.FC<SmartPromptSuggesterProps> = ({
  conversationId,
  onSelectSuggestion,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<{
    yourPreviousTopics: TopicSuggestion[];
    relatedTopics: TopicSuggestion[];
  }>({ yourPreviousTopics: [], relatedTopics: [] });
  
  const [popularTopics, setPopularTopics] = useState<TopicSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'smart' | 'popular'>('smart');

  useEffect(() => {
    fetchSuggestions();
    fetchPopularTopics();
  }, [conversationId]);

  const fetchSuggestions = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl(`ai-chat/conversations/${conversationId}/suggestions`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPopularTopics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        getApiUrl('ai-chat/suggestions?limit=5'),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPopularTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Failed to fetch popular topics:', error);
    }
  };

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    const prompt = `${suggestion.title} hakkında ${suggestion.description ? suggestion.description + ' konulu ' : ''}bir içerik oluşturmak istiyorum`;
    onSelectSuggestion(prompt);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasSmartSuggestions = 
    suggestions.yourPreviousTopics.length > 0 || 
    suggestions.relatedTopics.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tabs */}
      {hasSmartSuggestions && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('smart')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'smart'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            Akıllı Öneriler
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'popular'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Popüler Konular
          </button>
        </div>
      )}

      {/* Smart Suggestions */}
      {activeTab === 'smart' && hasSmartSuggestions && (
        <div className="space-y-4">
          {/* Previous Topics */}
          {suggestions.yourPreviousTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <History className="w-4 h-4" />
                Daha Önce Konuştuklarınız
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.yourPreviousTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(topic)}
                    className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    {topic.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Topics */}
          {suggestions.relatedTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Benzer İlginç Konular
              </h3>
              <div className="space-y-2">
                {suggestions.relatedTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(topic)}
                    className="w-full text-left p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
                  >
                    <div className="font-medium text-purple-700 dark:text-purple-300 text-sm">
                      {topic.title}
                    </div>
                    {topic.description && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {topic.description}
                      </div>
                    )}
                    {topic.creatorName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 {topic.creatorName} tarafından önerildi
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popular Topics */}
      {activeTab === 'popular' && popularTopics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            En Çok Kullanılan Konular
          </h3>
          <div className="space-y-2">
            {popularTopics.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(topic)}
                className="w-full text-left p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors border border-green-200 dark:border-green-800"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-green-700 dark:text-green-300 text-sm">
                      {topic.title}
                    </div>
                    {topic.description && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {topic.description}
                      </div>
                    )}
                  </div>
                  {topic.usage_count && topic.usage_count > 0 && (
                    <div className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded text-xs text-green-700 dark:text-green-300">
                      {topic.usage_count}× kullanıldı
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No suggestions fallback */}
      {!hasSmartSuggestions && popularTopics.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Henüz öneri yok</p>
          <p className="text-xs mt-1">Sohbet ettikçe size özel öneriler göreceksiniz</p>
        </div>
      )}
    </div>
  );
};
