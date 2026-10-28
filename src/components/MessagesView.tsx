import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { useSocket } from '../context/SocketContext';

interface MessagesViewProps {
  onOpenNewChat: () => void;
  onOpenGroupModal: () => void;
  onOpenProfile: () => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onOpenNewChat,
  onOpenGroupModal,
  onOpenProfile,
}) => {
  const { activeConversation, selectConversation } = useSocket();

  return (
    <div className="w-full h-full flex overflow-hidden bg-white select-none">
      {/* Pane 1: Conversations List */}
      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 h-full shrink-0 flex-col border-r border-slate-200/90 bg-white`}
      >
        <Sidebar
          onOpenNewChat={onOpenNewChat}
          onOpenGroupModal={onOpenGroupModal}
          onOpenProfile={onOpenProfile}
          isMobileChatOpen={!!activeConversation}
        />
      </div>

      {/* Pane 2: Active Chat Area */}
      <div
        className={`${
          !activeConversation ? 'hidden md:flex' : 'flex'
        } flex-1 h-full min-w-0 bg-slate-50/60 flex-col overflow-hidden`}
      >
        <ChatArea
          onBackToSidebar={() => selectConversation(null as any)}
          onOpenNewChat={onOpenNewChat}
          onOpenGroupModal={onOpenGroupModal}
        />
      </div>
    </div>
  );
};
