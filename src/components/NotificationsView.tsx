import React, { useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  Layers,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';

export const NotificationsView: React.FC = () => {
  const { user } = useAuth();
  const {
    notifications,
    markNotificationsAsRead,
    setViewingUsername,
    setCurrentTab,
    setViewingBoardId,
  } = useSocial();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayed = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-[#5036FF]" />;
      case 'repost':
        return <Repeat2 className="w-4 h-4 text-emerald-600" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-cyan-600" />;
      case 'board_invite':
        return <Layers className="w-4 h-4 text-amber-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#5036FF]" />;
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      markNotificationsAsRead(n.id);
    }
    if (n.type === 'follow') {
      setViewingUsername(n.actorUsername);
      setCurrentTab('profile');
    } else if (n.type === 'board_invite' && n.targetId) {
      setViewingBoardId(n.targetId);
      setCurrentTab('boards');
    } else {
      setCurrentTab('feed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 py-4 space-y-4 pb-20 md:pb-6">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/90 -mx-2 sm:-mx-4 px-4 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Notifications</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Unread Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unread
            </button>
          </div>

          {notifications.some((n) => !n.isRead) && (
            <button
              type="button"
              onClick={() => markNotificationsAsRead()}
              className="p-2 text-slate-500 hover:text-[#5036FF] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {displayed.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When people interact with your posts, save your pins, or follow your profile, you will see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`flex items-start gap-3.5 p-4 rounded-3xl border transition-all cursor-pointer ${
                n.isRead
                  ? 'bg-white hover:bg-slate-50 border-slate-200/80'
                  : 'bg-indigo-50/50 hover:bg-indigo-50/80 border-indigo-200 shadow-2xs'
              }`}
            >
              <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 shrink-0 shadow-2xs">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={n.actorAvatar}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {n.actorDisplayName || `@${n.actorUsername}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatTime(n.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-snug">
                  <strong>@{n.actorUsername}</strong> {n.message || 'interacted with your content'}
                </p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-[#5036FF] shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
