import React from 'react';
import { Home, Compass, Image as ImageIcon, MessageSquare, User, Plus, Flame } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { MainViewTab } from '../types';

interface MobileNavigationProps {
  onOpenCreatePost: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenCreatePost }) => {
  const { currentTab, setCurrentTab, setViewingUsername } = useSocial();
  const { user } = useAuth();

  const handleTab = (tab: MainViewTab) => {
    if (tab === 'profile' && user) {
      setViewingUsername(user.username);
    }
    setCurrentTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 flex items-center justify-around md:hidden shadow-lg select-none">
      <button
        type="button"
        onClick={() => handleTab('feed')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer ${
          currentTab === 'feed' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[9px] font-bold">Home</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('explore')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer ${
          currentTab === 'explore' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[9px] font-bold">Explore</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('meet')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer ${
          currentTab === 'meet' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <Flame className={`w-5 h-5 ${currentTab === 'meet' ? 'fill-rose-500' : ''}`} />
        <span className="text-[9px] font-bold">Meet</span>
      </button>

      {/* Center Create Button */}
      <button
        type="button"
        onClick={onOpenCreatePost}
        className="w-9 h-9 rounded-full bg-[#5036FF] text-white flex items-center justify-center shadow-md shadow-[#5036FF]/30 active:scale-90 transition-transform cursor-pointer"
        title="Create Post"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={() => handleTab('visuals')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer ${
          currentTab === 'visuals' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[9px] font-bold">Visuals</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('messages')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer relative ${
          currentTab === 'messages' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[9px] font-bold">Chats</span>
      </button>

      <button
        type="button"
        onClick={() => handleTab('profile')}
        className={`flex flex-col items-center gap-0.5 p-1 transition-colors cursor-pointer ${
          currentTab === 'profile' ? 'text-[#5036FF]' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[9px] font-bold">Profile</span>
      </button>
    </nav>
  );
};
