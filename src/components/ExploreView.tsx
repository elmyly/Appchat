import React, { useState, useEffect } from 'react';
import {
  Search,
  TrendingUp,
  Users,
  Compass,
  Layers,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { PostCard } from './PostCard';

export const ExploreView: React.FC = () => {
  const { user } = useAuth();
  const {
    trendingTopics,
    suggestedUsers,
    followUser,
    setViewingUsername,
    setCurrentTab,
    setViewingVisualId,
    setViewingBoardId,
  } = useSocial();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'people' | 'visuals' | 'boards'>('all');
  const [searchResults, setSearchResults] = useState<{
    posts: any[];
    users: any[];
    visuals: any[];
    boards: any[];
  }>({
    posts: [],
    users: [],
    visuals: [],
    boards: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/explore/search?q=${encodeURIComponent(query.trim())}&type=${activeTab}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || { posts: [], users: [], visuals: [], boards: [] });
        }
      } catch (err) {
        console.error('Failed to search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const handleTagClick = (tag: string) => {
    setQuery(tag);
  };

  const handleUserClick = (username: string) => {
    setViewingUsername(username);
    setCurrentTab('profile');
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-2 sm:px-4 py-4 space-y-5 pb-20 md:pb-6">
      {/* Header & Global Search */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/90 -mx-2 sm:-mx-4 px-4 sm:px-6 space-y-3">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Explore</h1>

        {/* Search Input */}
        <div className="flex items-center gap-2.5 bg-slate-100/90 border border-slate-200/90 focus-within:bg-white focus-within:border-[#5036FF] px-4 py-2.5 rounded-2xl transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, #hashtags, @creators, boards..."
            className="bg-transparent border-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none w-full"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs when search query is active */}
        {query && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar select-none pt-1">
            {(['all', 'posts', 'people', 'visuals', 'boards'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
                  activeTab === tab
                    ? 'bg-[#5036FF] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Explore Content */}
      {!query ? (
        <div className="space-y-6">
          {/* Trending Topics Grid */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#5036FF]" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Trending Topics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {trendingTopics.map((trend) => (
                <div
                  key={trend.tag}
                  onClick={() => handleTagClick(trend.tag)}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200/70 hover:border-indigo-200 transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {trend.category}
                    </span>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-[#5036FF] transition-colors block">
                      #{trend.tag}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {trend.postCount.toLocaleString()} posts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Creators Directory */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5036FF]" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Featured Creators</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-2xl gap-3"
                >
                  <div
                    onClick={() => handleUserClick(u.username)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                  >
                    <img
                      src={u.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#5036FF] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-[#5036FF]">
                        {u.displayName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono truncate block">
                        @{u.username}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {u.bio}
                      </span>
                    </div>
                  </div>

                  {user && user.id !== u.id && (
                    <button
                      type="button"
                      onClick={() => followUser(u.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 ${
                        u.isFollowing
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-[#5036FF] hover:bg-[#432bdb] text-white shadow-xs'
                      }`}
                    >
                      {u.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Search Results Stream */
        <div className="space-y-4">
          {isSearching ? (
            <div className="text-center py-12 text-xs text-slate-400">Searching Aura network...</div>
          ) : (
            <>
              {/* Users Results */}
              {(activeTab === 'all' || activeTab === 'people') && searchResults.users.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    People
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleUserClick(u.username)}
                        className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <img
                          src={u.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {u.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visuals Results */}
              {(activeTab === 'all' || activeTab === 'visuals') && searchResults.visuals.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Visual Pins
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {searchResults.visuals.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => setViewingVisualId(v.id)}
                        className="aspect-square rounded-2xl overflow-hidden cursor-zoom-in bg-slate-100 group relative"
                      >
                        <img
                          src={v.imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boards Results */}
              {(activeTab === 'all' || activeTab === 'boards') && searchResults.boards.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Boards
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {searchResults.boards.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setViewingBoardId(b.id);
                          setCurrentTab('boards');
                        }}
                        className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl cursor-pointer hover:border-[#5036FF]/50 transition-all"
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
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {b.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {b.itemIds.length} items
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Results */}
              {(activeTab === 'all' || activeTab === 'posts') && (
                <div className="space-y-3">
                  {searchResults.posts.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No posts found matching "{query}"
                    </div>
                  )}
                  {searchResults.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
