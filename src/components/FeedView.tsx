import React from 'react';
import { Sparkles, Users, Clock, Image as ImageIcon } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';

interface FeedViewProps {
  onOpenReport?: (type: 'post', id: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({ onOpenReport }) => {
  const { user } = useAuth();
  const { feedTab, setFeedTab, posts, isLoadingFeed } = useSocial();

  const tabs: { id: 'for_you' | 'following' | 'latest' | 'media'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'for_you', label: 'For You', icon: Sparkles },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'media', label: 'Media', icon: ImageIcon },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 py-4 space-y-4 pb-20 md:pb-6">
      {/* Top Header & Feed Selector Tabs */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/90 -mx-2 sm:-mx-4 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Home</h1>
        </div>

        {/* Segmented Feed Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = feedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFeedTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5036FF]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Post Composer */}
      {user && <PostComposer />}

      {/* Posts Stream */}
      {isLoadingFeed && posts.length === 0 ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200/80 rounded-3xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-2 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-14 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No posts in this feed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {feedTab === 'following'
              ? 'Follow more creators and friends to see their thoughts, photos, and updates here.'
              : 'Be the first to share your thoughts, design inspiration, or questions with the community!'}
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onOpenReport={onOpenReport} />
          ))}
        </div>
      )}
    </div>
  );
};
