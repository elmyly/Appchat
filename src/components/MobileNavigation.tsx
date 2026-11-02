import React from 'react';
import { Home, Compass, Image as ImageIcon, MessageSquare, User, Plus, Flame } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MainViewTab } from '../types';

interface MobileNavigationProps {
  onOpenCreatePost: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenCreatePost }) => {
  const { currentTab, setCurrentTab, setViewingUsername } = useSocial();
  const { conversations } = useSocket();
  const { user } = useAuth();

  const handleTab = (tab: MainViewTab) => {
    if (tab === 'profile' && user) {
      setViewingUsername(user.username);
    }
    setCurrentTab(tab);
  };

  const hasUnreadMessages = conversations.some((c) => (c.unreadCount || 0) > 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 flex items-center justify-around md:hidden shadow-lg select-none">
      <button
        type="button"
        onClick={() => handleTab('feed')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer active:scale-90 ${
          currentTab === 'feed' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Home Feed"
      >
        <Home className="w-5 h-5" />
        <span className="text-[9px] font-bold">Home</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('explore')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer active:scale-90 ${
          currentTab === 'explore' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Explore"
      >
        <Compass className="w-5 h-5" />
        <span className="text-[9px] font-bold">Explore</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('meet')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer active:scale-90 ${
          currentTab === 'meet' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Meet Creators"
      >
        <Flame className={`w-5 h-5 ${currentTab === 'meet' ? 'fill-rose-500' : ''}`} />
        <span className="text-[9px] font-bold">Meet</span>
      </button>

      {/* Center Create Action Button */}
      <button
        type="button"
        onClick={onOpenCreatePost}
        className="w-10 h-10 rounded-full bg-[#5036FF] text-white flex items-center justify-center shadow-md shadow-[#5036FF]/35 active:scale-90 transition-transform cursor-pointer -mt-1"
        title="Create Post"
        aria-label="Create Post"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => handleTab('visuals')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer active:scale-90 ${
          currentTab === 'visuals' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Visual Boards"
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[9px] font-bold">Visuals</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('messages')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer relative active:scale-90 ${
          currentTab === 'messages' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="Direct Messages"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {hasUnreadMessages && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#5036FF] ring-2 ring-white animate-pulse" />
          )}
        </div>
        <span className="text-[9px] font-bold">Chats</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('profile')}
        className={`min-w-[42px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 p-1 transition-all cursor-pointer active:scale-90 ${
          currentTab === 'profile' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
        aria-label="My Profile"
      >
        <User className="w-5 h-5" />
        <span className="text-[9px] font-bold">Profile</span>
      </button>
    </nav>
  );
};
