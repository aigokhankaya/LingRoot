import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
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
  admin_name?: string;
}

const ChatScreen: React.FC = ({ navigation }: any) => {
  // Resolve API base URL: prefer Expo extra, then env, finally localhost
  const extra: any = (Constants.expoConfig?.extra || (Constants as any)?.manifest?.extra || {});
  const API_URL: string = (
    extra.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'https://lingloops-backend.onrender.com'
  ) as string;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const getToken = async () => {
    // Prefer new key; keep backward compatibility with old key
    const token = await AsyncStorage.getItem('auth_token');
    if (token && token !== 'null' && token !== 'undefined') return token;
    const legacy = await AsyncStorage.getItem('lingroot_token');
    return legacy || '';
  };

  const fetchConversations = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
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
      Alert.alert('Hata', 'Konuşmalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
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
      Alert.alert('Hata', 'Mesajlar yüklenemedi');
    }
  };

  const createNewConversation = async () => {
    if (!newSubject.trim() || !newContent.trim()) {
      Alert.alert('Uyarı', 'Lütfen konu ve mesaj alanlarını doldurun');
      return;
    }

    setSending(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
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
        setShowConversationList(false);
      } else {
        Alert.alert('Hata', data.message || 'Konuşma oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: messageToSend
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        await fetchConversations();
      } else {
        Alert.alert('Hata', data.message || 'Mesaj gönderilemedi');
        setNewMessage(messageToSend); // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
    setShowConversationList(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'waiting': return '#F97316';
      case 'resolved': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
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

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationSelect(item.id)}
    >
      <View style={styles.conversationHeader}>
        <Text style={styles.conversationSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationMeta}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
        <Text style={styles.conversationDate}>
          {formatDate(item.created_at)}
        </Text>
      </View>
      
      {item.last_message_content && (
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.last_message_sender_type === 'admin' ? '👨‍💼 ' : ''}
          {item.last_message_content}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender_type === 'user' ? styles.userMessage : styles.adminMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender_type === 'user' ? styles.userBubble : styles.adminBubble
      ]}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.senderName,
            item.sender_type === 'user' ? styles.userSenderName : styles.adminSenderName
          ]}>
            {item.sender_type === 'user' ? 'Siz' : item.sender_name}
          </Text>
          <Text style={[
            styles.messageTime,
            item.sender_type === 'user' ? styles.userMessageTime : styles.adminMessageTime
          ]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={[
          styles.messageContent,
          item.sender_type === 'user' ? styles.userMessageContent : styles.adminMessageContent
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (showConversationList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Destek</Text>
          <TouchableOpacity onPress={() => setShowNewConversation(true)}>
            <Ionicons name="add" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Henüz konuşmanız yok</Text>
              <Text style={styles.emptyStateSubtext}>Yeni bir destek talebi oluşturun</Text>
            </View>
          }
        />

        <Modal
          visible={showNewConversation}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewConversation(false)}>
                <Text style={styles.modalCancelButton}>İptal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Yeni Destek Talebi</Text>
              <TouchableOpacity 
                onPress={createNewConversation}
                disabled={sending || !newSubject.trim() || !newContent.trim()}
              >
                <Text style={[
                  styles.modalSaveButton,
                  (sending || !newSubject.trim() || !newContent.trim()) && styles.modalSaveButtonDisabled
                ]}>
                  {sending ? 'Oluşturuluyor...' : 'Oluştur'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Konu</Text>
              <TextInput
                style={styles.textInput}
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Talebinizin konusunu yazın"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Mesaj</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newContent}
                onChangeText={setNewContent}
                placeholder="Sorununuzu detaylı olarak açıklayın"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setShowConversationList(true)}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>
              {conversations.find(c => c.id === selectedConversation)?.subject || 'Konuşma'}
            </Text>
            <Text style={styles.chatHeaderSubtitle}>
              {getStatusText(conversations.find(c => c.id === selectedConversation)?.status || 'open')}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationSubject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  conversationDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  adminMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
  },
  adminBubble: {
    backgroundColor: '#F3F4F6',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '500',
  },
  userSenderName: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  adminSenderName: {
    color: '#6B7280',
  },
  messageTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  adminMessageTime: {
    color: '#9CA3AF',
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageContent: {
    color: '#FFFFFF',
  },
  adminMessageContent: {
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default ChatScreen;
