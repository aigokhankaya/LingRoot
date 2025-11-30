import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Home, Settings, LogOut, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getApiUrl } from '../../lib/api';

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
  onRefreshConversations?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onNewChat,
  isLoading = false,
  onRefreshConversations,
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName = (user as any)?.name || user?.email || 'Kullanıcı';
  const avatar = (user as any)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  const handleDeleteConversation = async (conversationId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Bu sohbeti silmek istiyor musun?');
      if (!confirmed) return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      const response = await fetch(getApiUrl(`/api/ai-chat/conversations/${conversationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        console.error('Sohbet silinemedi', await response.text());
        if (typeof window !== 'undefined') {
          window.alert('Sohbet silinemedi. Lütfen tekrar dene.');
        }
        return;
      }

      // Eğer mevcut açık sohbet silindiyse yeni sohbete yönlendir
      if (currentConversationId === conversationId) {
        router.push('/chat/new');
      }

      onRefreshConversations?.();
    } catch (error) {
      console.error('Sohbet silme hatası:', error);
      if (typeof window !== 'undefined') {
        window.alert('Sohbet silinirken bir hata oluştu.');
      }
    }
  };

  const handleRenameConversation = async (conv: Conversation) => {
    if (typeof window === 'undefined') return;

    const currentTitle = conv.title || 'Yeni Sohbet';
    const newTitle = window.prompt('Yeni sohbet başlığını gir:', currentTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) return;

    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(getApiUrl(`/api/ai-chat/conversations/${conv.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!response.ok) {
        console.error('Sohbet güncellenemedi', await response.text());
        window.alert('Sohbet başlığı güncellenemedi. Lütfen tekrar dene.');
        return;
      }

      onRefreshConversations?.();
    } catch (error) {
      console.error('Sohbet başlığı güncelleme hatası:', error);
      window.alert('Sohbet başlığı güncellenirken bir hata oluştu.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Logo Section - Top */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/welcome" className="flex items-center space-x-3 cursor-pointer group">
          <img 
            src="/lingroot-icon.svg" 
            alt="LingRoot Logo" 
            className="w-8 h-8" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/LingRoot_IconOnly.png';
            }}
          />
          <span className="text-lg font-bold text-gray-800 tracking-tight group-hover:opacity-80 transition-opacity">
            LingRoot
          </span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-200">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start bg-transparent hover:bg-gray-100 text-gray-700 border-0 rounded-lg transition-colors"
          variant="ghost"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Henüz sohbet yok</p>
              <p className="text-xs mt-1 opacity-60">Yeni bir sohbet başlatın</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group p-2.5 md:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentConversationId === conv.id
                    ? 'bg-gray-200 text-gray-900'
                    : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                }`}
                onClick={() => router.push(`/chat/${conv.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-[15px] font-normal font-sans truncate leading-snug">
                      {conv.title || 'Yeni Sohbet'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        aria-label="Sohbet işlemleri"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      className="w-44 bg-white border border-gray-200 text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRenameConversation(conv);
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-2" />
                        Başlığı Düzenle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Sohbeti Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Profile Section - Bottom */}
      <div className="mt-auto border-t border-gray-200">
        {/* User Profile with Dropdown Menu */}
        {user && (
          <div className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 w-full rounded-xl p-2 hover:bg-gray-100 focus-visible:outline-none transition-colors"
                  aria-label="Kullanıcı menüsü"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gray-700 text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700 truncate flex-1 text-left">{user?.email}</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="top"
                className="w-56 bg-white border-gray-200 text-gray-700"
              >
                <DropdownMenuItem asChild className="focus:bg-gray-100 cursor-pointer">
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Ana Sayfaya Dön
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-gray-100 cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2">
                    <i className="fas fa-user-circle w-4 text-center"></i>
                    Profil Bilgilerim
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-gray-100 cursor-pointer">
                  <Link href="/dashboard?tab=paket-bilgilerim" className="flex items-center gap-2">
                    <i className="fas fa-box w-4 text-center"></i>
                    Paket Bilgilerim
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-gray-100 cursor-pointer">
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Hesap Ayarları
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-gray-100 cursor-pointer">
                  <Link href="/dashboard?tab=reading-history" className="flex items-center gap-2">
                    <i className="fas fa-history w-4 text-center"></i>
                    Okuma Geçmişim
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-gray-200" />

                <DropdownMenuItem 
                  className="focus:bg-gray-100 cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* AI Assistant Status */}
        <div className="px-3 py-2 flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>LingRoot AI Assistant</span>
        </div>
      </div>
    </div>
  );
};
