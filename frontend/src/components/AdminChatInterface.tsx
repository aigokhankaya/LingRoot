import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api";

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
  sender_id: string;
  sender_email?: string;
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
  user_name: string;
  user_email: string;
  admin_name?: string;
  last_message_at: string;
}

interface AdminChatInterfaceProps {
  conversationFilter: { status: string[]; priority: string };
  setConversationFilter: (filter: { status: string[]; priority: string }) => void;
}

const AdminChatInterface: React.FC<AdminChatInterfaceProps> = ({
  conversationFilter,
  setConversationFilter
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [openUserKeys, setOpenUserKeys] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const selectedConversationRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const params = new URLSearchParams();
      if (conversationFilter.status && conversationFilter.status.length > 0) {
        params.append('status', conversationFilter.status.join(','));
      }
      if (conversationFilter.priority !== 'all') params.append('priority', conversationFilter.priority);
      
      const response = await fetch(`/api/support-chat/admin/conversations?${params}`, {
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
      setConversationsLoading(false);
    }
  }, [conversationFilter]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/support-chat/conversations/${conversationId}/messages`, {
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
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Always keep a ref of the currently selected conversation for socket handlers
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const sendAdminMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/support-chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Bu header, backend'e bu isteğin admin panelinden geldiğini söyler.
          'X-Admin-Support-Sender': 'admin',
        },
        body: JSON.stringify({ content: newMessage })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const updateConversationStatus = async (conversationId: string, status?: string, priority?: string) => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const body: any = {};
      if (status) body.status = status;
      if (priority) body.priority = priority;
      
      const response = await fetch(`/api/support-chat/admin/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-primary/10 text-primary hover:bg-primary/10';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'waiting': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'resolved': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'closed': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'high': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'medium': return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'low': return 'bg-primary/10 text-primary hover:bg-primary/10';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
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

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil';
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return priority;
    }
  };

  const getConversationRowBackground = (status: string, isSelected: boolean) => {
    if (isSelected) {
      // Seçili kayıt biraz daha belirgin kalsın
      return 'bg-indigo-50';
    }

    switch (status) {
      case 'open':
        return 'bg-blue-50/50';
      case 'in_progress':
        return 'bg-yellow-50/50';
      case 'waiting':
        return 'bg-orange-50/50';
      case 'resolved':
        return 'bg-green-50/50';
      case 'closed':
        return 'bg-gray-50/50';
      default:
        return 'bg-white';
    }
  };

  const getUnreadHighlightClasses = (unreadCount: number) => {
    if (unreadCount > 0) {
      // Yeni mesajı olan taleplerde 2px kalınlığında kırmızı bir çerçeve
      return 'border-2 border-red-500';
    }
    // Okunmamış mesaj yoksa normal görünüm
    return 'border border-transparent';
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
  
  // Kullanıcı bazlı gruplama: her kullanıcı için ayrı bir collapse
  const groupedConversations = useMemo(() => {
    const groups: Record<string, { userName: string; userEmail: string; conversations: Conversation[] }> = {};

    conversations.forEach((conv) => {
      const key = conv.user_email || conv.user_name || 'unknown-user';
      if (!groups[key]) {
        groups[key] = {
          userName: conv.user_name,
          userEmail: conv.user_email,
          conversations: [],
        };
      }
      groups[key].conversations.push(conv);
    });

    const result = Object.entries(groups).map(([key, value]) => {
      const sortedConversations = [...value.conversations].sort((a, b) => {
        const da = new Date(a.last_message_at || a.created_at).getTime();
        const db = new Date(b.last_message_at || b.created_at).getTime();
        // Mesaj tarihine göre DESC
        return db - da;
      });

      return {
        userKey: key,
        userName: value.userName,
        userEmail: value.userEmail,
        conversations: sortedConversations,
      };
    });

    // Kullanıcı adına göre A-Z sırala
    result.sort((a, b) => {
      const nameA = (a.userName || '').toLowerCase();
      const nameB = (b.userName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      const emailA = (a.userEmail || '').toLowerCase();
      const emailB = (b.userEmail || '').toLowerCase();
      if (emailA < emailB) return -1;
      if (emailA > emailB) return 1;
      return 0;
    });

    return result;
  }, [conversations]);

  // Socket.IO ile gerçek zamanlı admin destek güncellemeleri
  useEffect(() => {
    const baseUrl = getApiBaseUrl();

    const socket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SupportSocket] connected:', socket.id);
      socket.emit('join_admin_support_room');
    });

    socket.on('support:new_conversation', () => {
      console.log('[SupportSocket] support:new_conversation received');
      fetchConversations();
    });

    socket.on('support:new_message', (payload: { conversationId: string; isAdmin?: boolean }) => {
      console.log('[SupportSocket] support:new_message received:', payload);
      fetchConversations();

      const currentConv = selectedConversationRef.current;
      if (currentConv && payload?.conversationId === currentConv) {
        fetchMessages(currentConv);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[SupportSocket] disconnected:', reason);
    });

    return () => {
      try {
        socket.off('support:new_conversation');
        socket.off('support:new_message');
        socket.disconnect();
      } catch (e) {
        // ignore cleanup errors
      }
      socketRef.current = null;
    };
  }, [fetchConversations, fetchMessages]);

  // Tüm kullanıcı grupları varsayılan olarak açık gelsin.
  // Yeni gelen kullanıcı grupları da otomatik olarak açık listeye eklenir.
  useEffect(() => {
    const groupKeys = groupedConversations.map(g => g.userKey);
    if (!groupKeys.length) {
      setOpenUserKeys([]);
      return;
    }

    setOpenUserKeys(prev => {
      if (prev.length === 0) {
        // İlk yüklemede tüm grupları aç
        return groupKeys;
      }

      // Daha önce var olanları koru, yeni gelenleri ekle
      const newKeys = groupKeys.filter(key => !prev.includes(key));
      if (newKeys.length === 0) return prev;
      return [...prev, ...newKeys];
    });
  }, [groupedConversations]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📽️';
    if (mimeType?.startsWith('audio/')) return '🎵';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/support-chat/attachments/${attachmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Dosya indirilemedi');
      }

      // If response is a redirect (302), follow it
      if (response.redirected) {
        window.open(response.url, '_blank');
      } else {
        // Handle direct file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Dosya indirilemedi');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="h-[calc(100vh-180px)]">
          <CardHeader>
            <CardTitle>Destek Konuşmaları</CardTitle>
            <div className="relative">
              <Input
                type="text"
                placeholder="Konuşma ara..."
                className="pl-10 pr-4 py-2"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {conversationsLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Yükleniyor...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>Konuşma bulunamadı</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {groupedConversations.map((group) => (
                    <div key={group.userKey} className="border-b border-gray-100 last:border-b-0">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                        onClick={() =>
                          setOpenUserKeys(prev =>
                            prev.includes(group.userKey)
                              ? prev.filter(key => key !== group.userKey)
                              : [...prev, group.userKey]
                          )
                        }
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-gray-900">{group.userName || 'İsimsiz Kullanıcı'}</span>
                          <span className="text-xs text-gray-500">{group.userEmail}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">{group.conversations.length} talep</span>
                          <i className={`fas fa-chevron-${openUserKeys.includes(group.userKey) ? 'up' : 'down'} text-gray-400`}></i>
                        </div>
                      </button>

                      {openUserKeys.includes(group.userKey) && (
                        <div className="divide-y divide-gray-100">
                          {group.conversations.map((conversation) => {
                            const rawUnreadCount = Number((conversation as any).unread_count ?? 0);
                            const isLastFromUser = conversation.last_message_sender_type === 'user';
                            const effectiveUnreadCount = isLastFromUser
                              ? (rawUnreadCount > 0 ? rawUnreadCount : 1)
                              : 0;
                            const hasNewIndicator = effectiveUnreadCount > 0;

                            return (
                              <div
                                key={conversation.id}
                                onClick={() => handleConversationSelect(conversation.id)}
                                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  getConversationRowBackground(conversation.status, selectedConversation === conversation.id)
                                } ${getUnreadHighlightClasses(effectiveUnreadCount)}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    {hasNewIndicator && (
                                      <span className="inline-flex h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                                    )}
                                    <div className="font-medium truncate text-sm">{conversation.subject}</div>
                                  </div>
                                  <div className="flex space-x-1 ml-2">
                                    <Badge className={getPriorityColor(conversation.priority)}>
                                      {getPriorityText(conversation.priority)}
                                    </Badge>
                                    {hasNewIndicator && (
                                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                        {effectiveUnreadCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <Badge className={getStatusColor(conversation.status)}>
                                    {getStatusText(conversation.status)}
                                  </Badge>
                                  <span className="text-xs text-gray-400">
                                    {formatDate(conversation.last_message_at || conversation.created_at)}
                                  </span>
                                </div>
                                {conversation.last_message_content && (
                                  <div className="text-xs text-gray-600 truncate">
                                    {conversation.last_message_sender_type === 'admin' ? '👨   ' : ''}
                                    {conversation.last_message_content}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-[calc(100vh-180px)]">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {conversations.find(c => c.id === selectedConversation)?.subject || 'Konuşma'}
                    </CardTitle>
                    <CardDescription>
                      {conversations.find(c => c.id === selectedConversation)?.user_name} - 
                      {conversations.find(c => c.id === selectedConversation)?.user_email}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <select 
                      value={conversations.find(c => c.id === selectedConversation)?.status || 'open'}
                      onChange={(e) => updateConversationStatus(selectedConversation, e.target.value)}
                      className="px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25em 1.25em',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <option value="open">Açık</option>
                      <option value="in_progress">İşlemde</option>
                      <option value="closed">Kapatıldı</option>
                    </select>
                    <select 
                      value={conversations.find(c => c.id === selectedConversation)?.priority || 'medium'}
                      onChange={(e) => updateConversationStatus(selectedConversation, undefined, e.target.value)}
                      className="px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25em 1.25em',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="p-6 space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarFallback>
                            {message.sender_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className={`rounded-lg p-4 ${
                            message.sender_type === 'admin' ? 'bg-indigo-50' : 'bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{message.sender_name}</span>
                              <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                            </div>
                            {message.content && (
                              <p className="text-gray-700">{message.content}</p>
                            )}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                                    <span className="text-lg">{getFileIcon(attachment.mime_type)}</span>
                                    <div className="flex-1 min-w-0">
                                      <button 
                                        onClick={() => downloadAttachment(attachment.id, attachment.filename)}
                                        className="text-sm font-medium text-primary hover:text-primary/80 truncate block text-left"
                                      >
                                        {attachment.filename}
                                      </button>
                                      <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                                    </div>
                                    <i className="fas fa-download text-gray-400 text-sm"></i>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="border-t border-gray-100 p-4">
                <div className="w-full space-y-4">
                  <Textarea 
                    placeholder="Yanıtınızı buraya yazın..." 
                    className="min-h-[100px]" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="!rounded-button whitespace-nowrap">
                        <i className="fas fa-paperclip mr-2"></i>
                        Dosya Ekle
                      </Button>
                    </div>
                    <Button 
                      className="!rounded-button whitespace-nowrap"
                      onClick={sendAdminMessage}
                      disabled={sending || !newMessage.trim()}
                    >
                      <i className="fas fa-paper-plane mr-2"></i>
                      {sending ? 'Gönderiliyor...' : 'Yanıtla'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 h-full">
              <div className="text-center">
                <i className="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                <p>Bir konuşma seçin</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminChatInterface;
