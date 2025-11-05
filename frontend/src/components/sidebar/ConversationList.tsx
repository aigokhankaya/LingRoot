import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Home, Settings, LogOut } from 'lucide-react';
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
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onNewChat,
  isLoading = false
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName = (user as any)?.name || user?.email || 'Kullanıcı';
  const avatar = (user as any)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar-bg text-zinc-200">
      {/* Logo Section - Top */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/welcome" className="flex items-center space-x-3 cursor-pointer group">
          <img 
            src="/lingroot-icon.svg" 
            alt="LingRoot Logo" 
            className="w-8 h-8" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/LingRoot_IconOnly.png';
            }}
          />
          <span className="text-lg font-bold text-zinc-100 tracking-tight group-hover:opacity-80 transition-opacity">
            LingRoot
          </span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-sidebar-border">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start bg-transparent hover:bg-sidebar-hover text-zinc-200 border-0 rounded-lg transition-colors"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-6 text-zinc-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Henüz sohbet yok</p>
              <p className="text-xs mt-1 opacity-60">Yeni bir sohbet başlatın</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div
                  className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentConversationId === conv.id
                      ? 'bg-sidebar-hover text-zinc-100'
                      : 'hover:bg-sidebar-hover text-zinc-300 hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug">
                        {conv.title || 'Yeni Sohbet'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatDate(conv.created_at)}
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 flex-shrink-0 transition-colors" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Profile Section - Bottom */}
      <div className="mt-auto border-t border-sidebar-border">
        {/* User Profile with Dropdown Menu */}
        {user && (
          <div className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 w-full rounded-xl p-2 hover:bg-sidebar-hover focus-visible:outline-none transition-colors"
                  aria-label="Kullanıcı menüsü"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-zinc-700 text-zinc-200">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-zinc-200 truncate flex-1 text-left">{user?.email}</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="top"
                className="w-56 bg-sidebar-bg border-sidebar-border text-zinc-200"
              >
                <DropdownMenuItem asChild className="focus:bg-sidebar-hover cursor-pointer">
                  <Link href="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Ana Sayfaya Dön
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-sidebar-hover cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2">
                    <i className="fas fa-user-circle w-4 text-center"></i>
                    Profil Bilgilerim
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-sidebar-hover cursor-pointer">
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Hesap Ayarları
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="focus:bg-sidebar-hover cursor-pointer">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <i className="fas fa-history w-4 text-center"></i>
                    Okuma Geçmişim
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-sidebar-border" />

                <DropdownMenuItem 
                  className="focus:bg-sidebar-hover cursor-pointer text-red-400 focus:text-red-400"
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
        <div className="p-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>LingRoot AI Assistant</span>
        </div>
      </div>
    </div>
  );
};
