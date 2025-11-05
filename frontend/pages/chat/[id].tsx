import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/lib/auth';
import { MainNav } from '../../src/components/layout/MainNav';
import { Sidebar } from '../../src/components/sidebar/Sidebar';
import { ChatMessage } from '../../src/components/chat/ChatMessage';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { TypingIndicator } from '../../src/components/chat/TypingIndicator';
import { SmartPromptSuggester } from '../../src/components/chat/SmartPromptSuggester';
import { getApiUrl } from '../../src/lib/api';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/ai-chat/conversations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  // Fetch messages for current conversation
  const fetchMessages = async (conversationId: string) => {
    if (!conversationId || conversationId === 'new') return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/ai-chat/conversations/${conversationId}/messages`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setError('Mesajlar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new conversation
  const createNewConversation = async (firstMessage: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/ai-chat/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.conversation;
      }
      return null;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  // Send message to Claude
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    let conversationId = id as string;

    // Create new conversation if needed
    if (!conversationId || conversationId === 'new') {
      const newConv = await createNewConversation(content);
      if (!newConv) {
        setError('Sohbet oluşturulamadı');
        return;
      }
      conversationId = newConv.id;
      router.replace(`/chat/${conversationId}`, undefined, { shallow: true });
    }

    // Add user message immediately (optimistic update)
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/ai-chat/conversations/${conversationId}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Mesaj gönderilemedi');
      }

      const data = await response.json();
      
      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMessage.id);
        return [...filtered, data.userMessage, data.assistantMessage];
      });

      // Refresh conversations list
      fetchConversations();
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Mesaj gönderilemedi');
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    router.push('/chat/new');
  };

  // Load conversations on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  // Load messages when conversation changes
  useEffect(() => {
    if (id && id !== 'new') {
      fetchMessages(id as string);
      const conv = conversations.find(c => c.id === id);
      setCurrentConversation(conv || null);
    } else {
      setMessages([]);
      setCurrentConversation(null);
    }
  }, [id, conversations]);

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* Main Navigation */}
      <MainNav showBackButton={true} backUrl="/welcome" />

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          conversations={conversations}
          currentConversationId={id as string}
          onNewChat={handleNewChat}
          isLoading={false}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <header className="border-b bg-white dark:bg-gray-900 px-4 py-4 shadow-sm">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentConversation?.title || 'Yeni Sohbet'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                LingRoot AI ile İngilizce içerik oluşturun
              </p>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Yükleniyor...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Merhaba! 👋
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                    İngilizce öğrenim içeriği oluşturmak için bir mesaj gönderin.
                  </p>
                  
                  {/* Quick starter suggestions */}
                  <div className="mb-8 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => sendMessage('B1 seviyesinde teknoloji hakkında bir metin oluştur')}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      B1 seviyesinde teknoloji metni
                    </button>
                    <button
                      onClick={() => sendMessage('A2 seviyesinde günlük rutinler hakkında konuş')}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      A2 günlük rutinler
                    </button>
                  </div>

                  {/* Smart suggestions */}
                  <div className="max-w-2xl mx-auto mt-8">
                    <SmartPromptSuggester
                      conversationId={id as string}
                      onSelectSuggestion={sendMessage}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={new Date(message.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <ChatInput
            onSend={sendMessage}
            disabled={isTyping}
            placeholder="Mesajınızı yazın... (örn: 'B1 seviyesinde spor hakkında bir metin oluştur')"
          />
        </main>
      </div>
    </div>
  );
}
