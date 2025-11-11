import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-3 py-2">
      {/* AI Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-gray-700 dark:bg-gray-600">
          <Bot className="w-4 h-4 text-white" />
        </AvatarFallback>
      </Avatar>

      {/* Typing Animation */}
      <div className="flex-1">
        <div className="inline-block bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
          Claude yazıyor...
        </p>
      </div>
    </div>
  );
};
