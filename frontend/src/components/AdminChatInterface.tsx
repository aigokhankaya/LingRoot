import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  sender_email?: string;
  created_at: string;
  is_read: boolean;
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
  conversationFilter: { status: string; priority: string };
  setConversationFilter: (filter: { status: string; priority: string }) => void;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
  }, [conversationFilter]);

  const fetchConversations = async () => {
    setConversationsLoading(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const params = new URLSearchParams();
      if (conversationFilter.status !== 'all') params.append('status', conversationFilter.status);
      if (conversationFilter.priority !== 'all') params.append('priority', conversationFilter.priority);
      
      const response = await fetch(`/api/chat/admin/conversations?${params}`, {
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

  const sendAdminMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
      
      const response = await fetch(`/api/chat/admin/conversations/${conversationId}`, {
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
      case 'open': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
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
      case 'low': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
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
                <div className="divide-y divide-gray-100">
                  {conversations.map((conversation) => (
                    <div 
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedConversation === conversation.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium truncate">{conversation.subject}</div>
                        <div className="flex space-x-1 ml-2">
                          <Badge className={getPriorityColor(conversation.priority)}>
                            {getPriorityText(conversation.priority)}
                          </Badge>
                          {conversation.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-1">{conversation.user_name}</div>
                      <div className="flex justify-between items-center mb-2">
                        <Badge className={getStatusColor(conversation.status)}>
                          {getStatusText(conversation.status)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {formatDate(conversation.last_message_at || conversation.created_at)}
                        </span>
                      </div>
                      {conversation.last_message_content && (
                        <div className="text-sm text-gray-600 truncate">
                          {conversation.last_message_sender_type === 'admin' ? '👨‍💼 ' : ''}
                          {conversation.last_message_content}
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
                  <div className="flex space-x-2">
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
                      <option value="waiting">Beklemede</option>
                      <option value="resolved">Çözüldü</option>
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
                          <AvatarImage src={`https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20Turkish%20${message.sender_type === 'admin' ? 'admin%20person%20with%20short%20dark%20hair%20wearing%20business%20casual%20attire' : 'person'}%20with%20neutral%20expression%2C%20studio%20lighting%2C%20high%20quality%2C%20photorealistic&width=100&height=100&seq=${message.sender_id}&orientation=squarish`} />
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
                            <p className="text-gray-700">{message.content}</p>
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
