import React from 'react';
import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onNewChat: () => void;
  isLoading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onNewChat,
  isLoading = false
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1f2937] text-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <Button 
          onClick={onNewChat}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Sohbet
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-6 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Henüz sohbet yok</p>
              <p className="text-xs mt-1 opacity-60">Yeni bir sohbet başlatın</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div
                  className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentConversationId === conv.id
                      ? 'bg-white/10 text-white'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug">
                        {conv.title || 'Yeni Sohbet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(conv.created_at)}
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-gray-300 flex-shrink-0 transition-colors" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>LingRoot AI Assistant</span>
        </div>
      </div>
    </div>
  );
};
