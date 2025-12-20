import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/lib/auth';
import { Sidebar } from '../../src/components/sidebar/Sidebar';
import { ChatMessage } from '../../src/components/chat/ChatMessage';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { TypingIndicator } from '../../src/components/chat/TypingIndicator';
import { SmartPromptSuggester } from '../../src/components/chat/SmartPromptSuggester';
import { ChatCTAButtons } from '../../src/components/chat/ChatCTAButtons';
import { ActionConfirmModal } from '../../src/components/chat/ActionConfirmModal';
import { getApiUrl } from '../../src/lib/api';
import OutputSection from '../../src/components/OutputSection';

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
  const [audioResult, setAudioResult] = useState<any>(null);

  // CTA butonları için state
  const [konuSecildi, setKonuSecildi] = useState(false);
  const [icerikNetlesti, setIcerikNetlesti] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'narration' | 'podcast' | 'tts' | null;
    topic: string;
  }>({ isOpen: false, type: null, topic: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Butonların aktif/pasif durumu
  const ctaDisabled = !(konuSecildi || icerikNetlesti);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Mesajları analiz et - konu/içerik netleşti mi?
  useEffect(() => {
    if (messages.length === 0) {
      setKonuSecildi(false);
      setIcerikNetlesti(false);
      return;
    }

    // Son mesajları kontrol et
    const recentMessages = messages.slice(-5);
    const assistantMessages = recentMessages.filter(m => m.role === 'assistant');

    if (assistantMessages.length > 0) {
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      const content = lastAssistant.content.toLowerCase();

      // Trigger keywords
      const topicKeywords = ['konu', 'hakkında', 'konusunda', 'üzerinde', 'ile ilgili', 'yapalım', 'yapabiliriz', 'oluşturabiliriz'];
      const contentKeywords = ['içerik', 'anlatım', 'podcast', 'metin', 'detaylı', 'araştır'];

      const hasTopicKeyword = topicKeywords.some(kw => content.includes(kw));
      const hasContentKeyword = contentKeywords.some(kw => content.includes(kw));

      if (hasTopicKeyword) setKonuSecildi(true);
      if (hasContentKeyword) setIcerikNetlesti(true);
    }
  }, [messages]);

  // Mesajdan konu çıkar
  const extractTopicFromMessages = (): string => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return 'Belirlenen konu';

    const lastMessage = assistantMessages[assistantMessages.length - 1].content;
    const match = lastMessage.match(/"([^"]+)"|'([^']+)'/);
    if (match) return match[1] || match[2];

    const firstSentence = lastMessage.split(/[.!?]/)[0];
    return firstSentence.slice(0, 80).trim();
  };

  // CTA buton handlers
  const handleCTAClick = (type: 'narration' | 'podcast' | 'tts') => {
    const topic = extractTopicFromMessages();
    setModalState({ isOpen: true, type, topic });
  };

  const closeModal = () => {
    if (!isProcessing) {
      setModalState({ isOpen: false, type: null, topic: '' });
    }
  };

  const handleConfirmCTA = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      let result;
      const lastMessage = messages.filter(m => m.role === 'assistant').pop()?.content || '';

      if (modalState.type === 'narration') {
        const response = await fetch(getApiUrl('/api/tts/process'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'topic',
            input: modalState.topic,
            level: 'B1',
            speakingRate: 0.8,
          }),
        });
        result = await response.json();
      } else if (modalState.type === 'podcast') {
        const response = await fetch(getApiUrl('/api/tts/create-podcast'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: modalState.topic,
            level: 'B1',
            duration: '10',
          }),
        });
        result = await response.json();
      } else if (modalState.type === 'tts') {
        const response = await fetch(getApiUrl('/api/tts/process'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'text',
            input: lastMessage,
            level: 'B1',
            speakingRate: 0.8,
          }),
        });
        result = await response.json();
      }

      if (result) {
        setAudioResult(result);
      }

      closeModal();
    } catch (error) {
      console.error('İşlem hatası:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getModalMessage = (): { title: string; message: string } => {
    const topic = modalState.topic;
    switch (modalState.type) {
      case 'narration':
        return {
          title: 'Anlatım Oluştur',
          message: `Belirlediğimiz "${topic}" konusu için araştırıp seslendireceğim, onaylıyor musun?`,
        };
      case 'podcast':
        return {
          title: 'Podcast Oluştur',
          message: `Belirlediğimiz "${topic}" konusu için harika bir podcast oluşturacağım, onaylıyor musun?`,
        };
      case 'tts':
        return {
          title: 'Metni Seslendir',
          message: `Bu metni senin için seslendireceğim, onaylıyor musun?`,
        };
      default:
        return { title: '', message: '' };
    }
  };

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
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
      const token = localStorage.getItem('lingroot_token');
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
      const token = localStorage.getItem('lingroot_token');
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

  // Send message to Liro (with streaming support)
  const sendMessage = async (content?: string | null) => {
    if (typeof content !== 'string') return;
    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);
    let conversationId = id as string;

    // Create new conversation if needed
    if (!conversationId || conversationId === 'new') {
      const newConv = await createNewConversation(trimmed);
      if (!newConv) {
        setError('Sohbet oluşturulamadı');
        return;
      }
      conversationId = newConv.id;
      router.replace(`/chat/${conversationId}`, undefined, { shallow: true });
    }

    // Add user message immediately (optimistic update)
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Add empty assistant message placeholder for streaming
    const assistantPlaceholder: Message = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem('lingroot_token');

      // Use streaming endpoint
      const response = await fetch(getApiUrl(`/api/ai-chat/conversations/${conversationId}/messages?stream=true`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!response.ok) {
        throw new Error('Mesaj gönderilemedi');
      }

      if (!response.body) {
        throw new Error('Streaming desteklenmiyor');
      }

      // Add assistant placeholder
      setMessages(prev => [...prev, assistantPlaceholder]);
      setIsTyping(false); // Hide typing indicator, show streaming text instead

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantContent = '';
      let finalUserMessage: Message | null = null;
      let finalAssistantMessage: Message | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === 'user_message') {
                finalUserMessage = parsed.data;
              } else if (parsed.type === 'chunk') {
                assistantContent += parsed.data;
                // Update assistant message content in real-time
                setMessages(prev => prev.map(m =>
                  m.id === assistantPlaceholder.id
                    ? { ...m, content: assistantContent }
                    : m
                ));
              } else if (parsed.type === 'done') {
                finalAssistantMessage = parsed.data;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.data);
              }
            } catch (parseErr) {
              // Skip malformed chunks
            }
          }
        }
      }

      // Replace temp messages with final ones
      setMessages(prev => {
        let updated = prev.filter(m => m.id !== userMessage.id && m.id !== assistantPlaceholder.id);
        if (finalUserMessage) updated.push(finalUserMessage);
        if (finalAssistantMessage) updated.push(finalAssistantMessage);
        return updated;
      });

      // Refresh conversations list
      fetchConversations();

    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Mesaj gönderilemedi');
      // Remove temp messages on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id && m.id !== assistantPlaceholder.id));
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          conversations={conversations}
          currentConversationId={id as string}
          onNewChat={handleNewChat}
          isLoading={false}
          onRefreshConversations={fetchConversations}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-4 py-4">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
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
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Yükleniyor...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Merhaba! 👋
                  </h2>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    İngilizce öğrenim içeriği oluşturmak için bir mesaj gönderin.
                  </p>

                  {/* Quick starter suggestions */}
                  <div className="mb-8 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => sendMessage('B1 seviyesinde teknoloji hakkında bir metin oluştur')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      B1 seviyesinde teknoloji metni
                    </button>
                    <button
                      onClick={() => sendMessage('A2 seviyesinde günlük rutinler hakkında konuş')}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
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

                  {/* Audio/Podcast Result - Using OutputSection for consistent UI */}
                  {audioResult && audioResult.mp3_url && (
                    <div className="mt-6 relative">
                      <button
                        onClick={() => setAudioResult(null)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                      <OutputSection
                        audioResult={{
                          message: audioResult.adapted_text || audioResult.message || '',
                          mp3_url: audioResult.mp3_url,
                          vtt_url: audioResult.vtt_url,
                          adapted_text: audioResult.adapted_text,
                          translated_text: audioResult.translated_text,
                          timepoints: audioResult.timepoints || [],
                          words: audioResult.words || [],
                          level: audioResult.level || 'A1',
                          topic: audioResult.topic || 'Chat İçeriği'
                        }}
                        isLoggedIn={isAuthenticated}
                      />
                    </div>
                  )}

                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* CTA Buttons - Composer Üstünde Tek Instance */}
          <ChatCTAButtons
            disabled={ctaDisabled}
            onAnlatim={() => handleCTAClick('narration')}
            onPodcast={() => handleCTAClick('podcast')}
            onSeslendir={() => handleCTAClick('tts')}
          />

          {/* Input Area */}
          <ChatInput
            onSend={sendMessage}
            disabled={isTyping}
            placeholder="Mesajınızı yazın... (örn: 'B1 seviyesinde spor hakkında bir metin oluştur')"
          />
        </main>
      </div>

      {/* Confirmation Modal */}
      <ActionConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmCTA}
        title={getModalMessage().title}
        message={getModalMessage().message}
        confirmText="Evet, Oluştur"
        isLoading={isProcessing}
      />
    </div>
  );
}
