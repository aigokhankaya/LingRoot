import React, { useState } from 'react';
import { ConversationList } from './ConversationList';
import { X, Menu } from 'lucide-react';
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onNewChat,
  isLoading
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

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 md:w-72 lg:w-80 
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:border-r md:border-sidebar-border
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
        />
      </aside>
    </>
  );
};
