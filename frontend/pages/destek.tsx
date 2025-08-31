import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Attachment {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  created_at: string;
  is_read: boolean;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  last_message_content: string;
  last_message_sender_type: string;
  unread_count: number;
  admin_name?: string;
}

const DestekPage: React.FC = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createNewConversation = async () => {
    if (!newSubject.trim() || !newContent.trim()) {
      alert('Lütfen konu ve mesaj alanlarını doldurun');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: newSubject,
          content: newContent,
          priority: 'medium'
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewSubject('');
        setNewContent('');
        setShowNewConversation(false);
        await fetchConversations();
        setSelectedConversation(data.conversation.id);
        await fetchMessages(data.conversation.id);
      } else {
        alert(data.message || 'Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      alert('Lütfen bir mesaj yazın veya dosya ekleyin');
      return;
    }
    if (!selectedConversation) return;

    setSending(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const formData = new FormData();
      
      if (newMessage.trim()) {
        formData.append('content', newMessage);
      }
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setSelectedFiles([]);
        await fetchConversations(); // Refresh conversation list
      } else {
        alert(data.message || 'Mesaj gönderilemedi');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const isSelectedConversationClosed = () => {
    if (!selectedConversation) return false;
    const conv = conversations.find(c => c.id === selectedConversation);
    return conv?.status === 'closed';
  };

  const reopenSelectedConversation = async () => {
    if (!selectedConversation) return;
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/chat/conversations/${selectedConversation}/reopen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        await fetchConversations();
        await fetchMessages(selectedConversation);
      } else {
        alert(data.message || 'Konuşma yeniden açılamadı');
      }
    } catch (err) {
      console.error('Error reopening conversation:', err);
      alert('Bir hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Açık';
      case 'in_progress': return 'İşlemde';
      case 'waiting': return 'Beklemede';
      case 'resolved': return 'Çözüldü';
      case 'closed': return 'Kapatıldı';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      alert('En fazla 5 dosya ekleyebilirsiniz');
      return;
    }
    
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} dosyası çok büyük (maksimum 20MB)`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📎';
  };

  const renderAttachments = (attachments: Attachment[]) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
            <span className="text-lg">{getFileIcon(attachment.mime_type)}</span>
            <div className="flex-1 min-w-0">
              <a 
                href={`/api/chat/attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
              >
                {attachment.filename}
              </a>
              <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Destek - LingRoot</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Destek</h1>
              </div>
              <button
                onClick={() => setShowNewConversation(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Yeni Talep
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex h-full">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Konuşmalarım</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>Henüz konuşmanız yok</p>
                      <p className="text-sm mt-1">Yeni bir destek talebi oluşturun</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationSelect(conversation.id)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          selectedConversation === conversation.id ? 'bg-indigo-50 border-indigo-200' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900 truncate">{conversation.subject}</h3>
                          {conversation.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                            {getStatusText(conversation.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(conversation.created_at)}
                          </span>
                        </div>
                        
                        {conversation.last_message_content && (
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.last_message_sender_type === 'admin' ? '👨‍💼 ' : ''}
                            {conversation.last_message_content}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_type === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium opacity-75">
                                {message.sender_type === 'user' ? 'Siz' : message.sender_name}
                              </span>
                              <span className="text-xs opacity-75 ml-2">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            {message.content && <p className="text-sm">{message.content}</p>}
                            {renderAttachments(message.attachments || [])}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input / Reopen */}
                    <div className="border-t border-gray-200 p-4">
                      {isSelectedConversationClosed() && (
                        <div className="mb-3 p-3 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Bu konuşma kapatılmış. Yeni mesaj gönderemezsiniz.
                          </div>
                          <button
                            onClick={reopenSelectedConversation}
                            className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
                          >
                            Yeniden Aç
                          </button>
                        </div>
                      )}
                      {/* Selected Files Display */}
                      {selectedFiles.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Seçilen Dosyalar ({selectedFiles.length}/5)</span>
                            <button
                              onClick={() => setSelectedFiles([])}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Tümünü Kaldır
                            </button>
                          </div>
                          <div className="space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{getFileIcon(file.type)}</span>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 truncate" style={{maxWidth: '200px'}}>{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                          placeholder="Mesajınızı yazın..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={sending || isSelectedConversationClosed()}
                        />
                        
                        {/* File Upload Button */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.aac,.ogg"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending || isSelectedConversationClosed() || selectedFiles.length >= 5}
                          className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Dosya Ekle"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={sendMessage}
                          disabled={sending || (!newMessage.trim() && selectedFiles.length === 0) || isSelectedConversationClosed()}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sending ? 'Gönderiliyor...' : 'Gönder'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Bir konuşma seçin veya yeni bir talep oluşturun</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Yeni Destek Talebi</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konu
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Talebinizin konusunu yazın"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Sorununuzu detaylı olarak açıklayın"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={sending}
                >
                  İptal
                </button>
                <button
                  onClick={createNewConversation}
                  disabled={sending || !newSubject.trim() || !newContent.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DestekPage;
