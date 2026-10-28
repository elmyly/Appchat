import React from 'react';
import {
  Home,
  Compass,
  Image as ImageIcon,
  Layers,
  Bell,
  MessageSquare,
  Bookmark,
  User as UserIcon,
  Settings,
  Shield,
  Plus,
  LogOut,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { MainViewTab } from '../types';

interface AppSidebarProps {
  onOpenCreatePost: () => void;
  onOpenAuth: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onOpenCreatePost, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const { currentTab, setCurrentTab, unreadCount, setViewingUsername } = useSocial();

  const navItems: { id: MainViewTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'visuals', label: 'Visuals', icon: ImageIcon },
    { id: 'boards', label: 'Boards', icon: Layers },
    { id: 'meet', label: 'Meet', icon: Flame },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  const handleNavClick = (tabId: MainViewTab) => {
    if (tabId === 'profile' && user) {
      setViewingUsername(user.username);
    }
    setCurrentTab(tabId);
  };

  return (
    <aside className="w-64 xl:w-72 h-screen sticky top-0 overflow-y-auto custom-scrollbar flex flex-col justify-between p-4 bg-white border-r border-slate-200/90 shrink-0 select-none hidden md:flex">
      {/* Top Branding & Navigation */}
      <div className="space-y-6">
        {/* Logo */}
        <div
          onClick={() => handleNavClick('feed')}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#5036FF] text-white flex items-center justify-center shadow-md shadow-[#5036FF]/20 group-hover:scale-105 transition-transform">
            <span className="font-black text-xl tracking-tight">A</span>
          </div>
          <div>
            <span className="text-xl font-black text-slate-900 tracking-tight block">Aura</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide block uppercase">
              Social & Private
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5036FF]/10 text-[#5036FF]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#5036FF]' : 'text-slate-500'}`} />
                  <span className="text-[15px]">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#5036FF] text-white rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Large Purple Create Post Button */}
        {user ? (
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="w-full py-3.5 px-4 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#5036FF]/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Post</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full py-3.5 px-4 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#5036FF]/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>Sign In / Join</span>
          </button>
        )}
      </div>

      {/* User Account Bar at Bottom */}
      {user ? (
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-2">
          <div
            onClick={() => handleNavClick('profile')}
            className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
          >
            <img
              src={user.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + user.username}
              alt=""
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-[#5036FF]/40 transition-all shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-slate-900 truncate block leading-tight">
                {user.displayName || user.username}
              </span>
              <span className="text-xs text-slate-400 font-mono truncate block">
                @{user.username}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Join Aura to post, curate visual boards, and message privately.</p>
        </div>
      )}
    </aside>
  );
};
