import React, { useState } from 'react';
import {
  Search,
  Upload,
  Heart,
  Bookmark,
  Share2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { VisualItem } from '../types';
import { VisualDetailModal } from './VisualDetailModal';
import { UploadVisualModal } from './UploadVisualModal';

const CATEGORIES = [
  'All',
  'Technology',
  'Design',
  'Photography',
  'Architecture',
  'Art',
  'Nature',
  'Travel',
  'Fashion',
  'Cars',
  'Lifestyle',
  'Gaming',
  'Food',
];

export const VisualsView: React.FC = () => {
  const { user } = useAuth();
  const {
    visuals,
    selectedCategory,
    setSelectedCategory,
    isLoadingVisuals,
    saveVisualToBoard,
    likeVisual,
    openShareToChat,
    viewingVisualId,
    setViewingVisualId,
  } = useSocial();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filtered = visuals.filter((v) => {
    if (selectedCategory !== 'All' && v.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-4 pb-20 md:pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Aura Visuals
          </h1>
          <p className="text-xs text-slate-500">
            Pinterest-style visual discovery, mood boards, and aesthetic inspiration
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/90 px-3 py-2 rounded-2xl focus-within:bg-white focus-within:border-[#5036FF] transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visuals & tags..."
              className="bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-36 sm:w-48"
            />
          </div>

          {/* Upload Button */}
          {user && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Pin</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 select-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#5036FF] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Responsive Masonry Layout */}
      {isLoadingVisuals && visuals.length === 0 ? (
        <div className="columns-2 sm:columns-3 md:columns-3 xl:columns-4 gap-3 space-y-3 pt-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="break-inside-avoid rounded-2xl bg-slate-200 animate-pulse h-64 mb-3"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No visuals found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No pins found matching "${searchQuery}". Try exploring other categories.`
              : 'Be the first to upload an inspirational visual to this category!'}
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-3 xl:columns-4 gap-3.5 space-y-3.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingVisualId(item.id)}
              className="group break-inside-avoid relative rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/70 hover:border-slate-300 shadow-2xs hover:shadow-lg transition-all duration-300 cursor-zoom-in mb-3.5"
            >
              {/* Image asset with zero-broken fallback */}
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full object-cover transition-transform duration-500 group-hover:scale-103"
              />

              {/* Hover Dark Scrim & Actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3.5 flex flex-col justify-between">
                {/* Top Action Row */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white">
                    {item.category}
                  </span>

                  {user && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveVisualToBoard(item.id);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                        item.isSaved
                          ? 'bg-slate-900 text-white'
                          : 'bg-[#5036FF] hover:bg-[#432bdb] text-white'
                      }`}
                    >
                      {item.isSaved ? 'Saved' : 'Save'}
                    </button>
                  )}
                </div>

                {/* Bottom Details Row */}
                <div className="space-y-1.5 text-white">
                  <h4 className="text-xs font-bold leading-snug line-clamp-2 drop-shadow-sm">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={item.authorAvatar}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-white/60 shrink-0"
                      />
                      <span className="text-[11px] font-medium truncate opacity-90">
                        {item.authorDisplayName || `@${item.authorUsername}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          likeVisual(item.id);
                        }}
                        className={`p-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer ${
                          item.isLiked ? 'text-rose-400 bg-rose-500/40' : ''
                        }`}
                        title="Like"
                      >
                        <Heart className={`w-3.5 h-3.5 ${item.isLiked ? 'fill-rose-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openShareToChat({
                            type: 'visual',
                            id: item.id,
                            title: item.title,
                            preview: item.imageUrl,
                          });
                        }}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
                        title="Share to chat"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Detail Modal */}
      {viewingVisualId && (
        <VisualDetailModal
          visualId={viewingVisualId}
          onClose={() => setViewingVisualId(null)}
        />
      )}

      {/* Upload Visual Modal */}
      {showUploadModal && (
        <UploadVisualModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
};
