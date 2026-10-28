import React, { useState } from 'react';
import { Search, TrendingUp, Users, Layers, ExternalLink, ShieldCheck } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';

export const RightSidebar: React.FC = () => {
  const { user } = useAuth();
  const {
    trendingTopics,
    suggestedUsers,
    followUser,
    setCurrentTab,
    setViewingUsername,
    setViewingBoardId,
    boards,
  } = useSocial();

  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setCurrentTab('explore');
  };

  const handleTagClick = (tag: string) => {
    setCurrentTab('explore');
  };

  const handleUserClick = (username: string) => {
    setViewingUsername(username);
    setCurrentTab('profile');
  };

  const popularBoards = boards.filter((b) => !b.isPrivate).slice(0, 3);

  return (
    <aside className="w-80 xl:w-88 h-screen sticky top-0 p-4 space-y-4 overflow-y-auto custom-scrollbar border-l border-slate-200/90 bg-white shrink-0 hidden lg:block select-none">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="flex items-center gap-2.5 bg-slate-100/80 border border-slate-200/80 focus-within:border-[#5036FF] focus-within:bg-white px-3.5 py-2.5 rounded-2xl transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search posts, people, boards..."
            className="bg-transparent border-0 text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>
      </form>

      {/* Trending Topics Card */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5036FF]" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Trending Topics</h3>
        </div>

        <div className="space-y-2.5">
          {trendingTopics.slice(0, 5).map((trend) => (
            <div
              key={trend.tag}
              onClick={() => handleTagClick(trend.tag)}
              className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group"
            >
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  {trend.category}
                </span>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#5036FF] transition-colors block">
                  #{trend.tag}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {trend.postCount.toLocaleString()} posts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Users Card */}
      {suggestedUsers.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5036FF]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Who to Follow</h3>
          </div>

          <div className="space-y-3">
            {suggestedUsers.slice(0, 4).map((sugg) => (
              <div key={sugg.id} className="flex items-center justify-between gap-2">
                <div
                  onClick={() => handleUserClick(sugg.username)}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                >
                  <img
                    src={sugg.avatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#5036FF] transition-all shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-[#5036FF] transition-colors">
                      {sugg.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate block">
                      @{sugg.username}
                    </span>
                  </div>
                </div>

                {user && user.id !== sugg.id && (
                  <button
                    type="button"
                    onClick={() => followUser(sugg.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 ${
                      sugg.isFollowing
                        ? 'bg-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                        : 'bg-[#5036FF] hover:bg-[#432bdb] text-white shadow-xs'
                    }`}
                  >
                    {sugg.isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Boards Preview */}
      {popularBoards.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5036FF]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Curated Boards</h3>
          </div>

          <div className="space-y-2">
            {popularBoards.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  setViewingBoardId(b.id);
                  setCurrentTab('boards');
                }}
                className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-slate-200/70 hover:border-[#5036FF]/50 transition-all cursor-pointer group"
              >
                {b.coverImage ? (
                  <img
                    src={b.coverImage}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-[#5036FF] transition-colors">
                    {b.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    by @{b.ownerUsername} · {b.itemIds.length} items
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiet Footer Links */}
      <div className="px-3 pt-2 text-[11px] text-slate-400 space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button onClick={() => setCurrentTab('settings')} className="hover:text-slate-600">
            Privacy Policy
          </button>
          <button onClick={() => setCurrentTab('settings')} className="hover:text-slate-600">
            Terms of Service
          </button>
          <button onClick={() => setCurrentTab('messages')} className="hover:text-slate-600">
            End-to-End Encryption
          </button>
        </div>
        <p>© 2026 Aura Social · Built for privacy and visual discovery</p>
      </div>
    </aside>
  );
};
