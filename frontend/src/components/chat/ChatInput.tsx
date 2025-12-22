import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  isProcessing = false,
  placeholder,
  autoFocus = true
}) => {
  const { t } = useTranslation();
  const inputPlaceholder = placeholder || t('chat_placeholder');
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount and after sending
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleSend = () => {
    const canSend = !disabled && !isProcessing;
    if (message.trim() && canSend) {
      onSend(message.trim());
      setMessage('');
      // Re-focus textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 border-t bg-white dark:bg-gray-900 p-4 shadow-lg">
      <div className="flex gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            disabled={disabled}
            className="min-h-[52px] max-h-[200px] resize-none rounded-full px-5 py-3 pr-14 border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary text-sm placeholder:text-gray-400"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={disabled || isProcessing || !message.trim()}
            className="absolute right-2 bottom-2 rounded-full h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-gray-300 disabled:cursor-not-allowed"
            size="icon"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
        {t('chat_input_hint')}
      </p>
    </div>
  );
};
