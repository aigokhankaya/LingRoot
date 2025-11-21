import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, timestamp }) => {
  const isUser = role === 'user';

  // Butonlar artık mesajlarda görünmeyecek - composer üstüne taşındı

  return (
    <div className={`flex gap-3 py-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        {isUser ? (
          <AvatarFallback className="bg-primary">
            <User className="w-4 h-4 text-white" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-gray-700 dark:bg-gray-600">
            <Bot className="w-4 h-4 text-white" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`inline-block max-w-[85%] rounded-xl px-4 py-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        </div>
        {timestamp && (
          <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 px-2 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {timestamp}
          </p>
        )}
        
        {/* Butonlar artık burada görünmeyecek - ChatPage'de composer üstünde tek instance */}
      </div>
    </div>
  );
};
