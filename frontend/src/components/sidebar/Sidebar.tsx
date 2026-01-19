import React, { useState } from 'react';
import { ConversationList } from './ConversationList';
import { X, Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onNewChat: () => void;
  isLoading?: boolean;
  onRefreshConversations?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onNewChat,
  isLoading,
  onRefreshConversations,
  isCollapsed = false,
  onToggle,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button - positioned to avoid overlap with MainNav */}
      <Button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-20 left-4 z-50 bg-[#1f2937] hover:bg-gray-700 text-white shadow-lg"
        size="icon"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar Container */}
      <div
        className={`
          hidden md:flex flex-col overflow-visible
          ${isCollapsed ? 'w-12' : 'w-64 md:w-72 lg:w-80'}
          transition-all duration-300 ease-in-out
          border-r border-sidebar-border bg-gray-50
          h-full
        `}
      >
        {/* Collapsed State - Only show expand button */}
        {isCollapsed ? (
          <div className="flex flex-col items-center p-2 pt-4">
            <Button
              onClick={onToggle}
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
              title="Menüyü Aç"
            >
              <PanelLeft className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        ) : (
          /* Expanded State - Full ConversationList with toggle */
          <ConversationList
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={onNewChat}
            isLoading={isLoading}
            onRefreshConversations={onRefreshConversations}
            onToggle={onToggle}
          />
        )}
      </div>

      {/* Mobile Sidebar - Full width when open */}
      <aside
        className={`
          fixed md:hidden inset-y-0 left-0 z-40
          w-64
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          border-r border-sidebar-border
        `}
      >
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewChat={() => {
            onNewChat();
            setIsMobileOpen(false);
          }}
          isLoading={isLoading}
          onRefreshConversations={onRefreshConversations}
        />
      </aside>
    </>
  );
};

// Export kept for backwards compatibility but not needed anymore
export const SidebarToggleButton: React.FC<{
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}> = ({ isCollapsed, onToggle, className = '' }) => {
  return null; // No longer used - toggle is now inside Sidebar
};
