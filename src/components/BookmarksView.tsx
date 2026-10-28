import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';
import { PostCard } from './PostCard';

export const BookmarksView: React.FC = () => {
  const { user, token } = useAuth();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/users/me/bookmarks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarkedPosts(data.posts || []);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [token]);

  return (
    <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 py-4 space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-200/90 -mx-2 sm:-mx-4 px-4 sm:px-6">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Saved Bookmarks</h1>
        <p className="text-xs text-slate-500">Your private collection of saved discussions and posts</p>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-6">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white border border-slate-200/80 rounded-3xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-14 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : bookmarkedPosts.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No saved bookmarks yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click the bookmark icon on any post in the feed to save it for reading later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarkedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
