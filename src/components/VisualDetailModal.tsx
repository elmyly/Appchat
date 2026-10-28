import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Bookmark,
  Share2,
  Check,
  Send,
  Layers,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { VisualItem, Board } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';

interface VisualDetailModalProps {
  visualId: string;
  onClose: () => void;
}

export const VisualDetailModal: React.FC<VisualDetailModalProps> = ({ visualId, onClose }) => {
  const { user } = useAuth();
  const {
    likeVisual,
    saveVisualToBoard,
    boards,
    openShareToChat,
    setViewingUsername,
    setCurrentTab,
  } = useSocial();

  const [visual, setVisual] = useState<VisualItem | null>(null);
  const [related, setRelated] = useState<VisualItem[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/visuals/${visualId}`);
        if (res.ok) {
          const data = await res.json();
          setVisual(data.visual);
          setRelated(data.related || []);
        }
      } catch (err) {
        console.error('Failed to load visual detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [visualId]);

  if (isLoading || !visual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center animate-pulse">
          <span className="w-5 h-5 rounded-full bg-[#5036FF]" />
        </div>
      </div>
    );
  }

  const handleAuthorClick = () => {
    onClose();
    setViewingUsername(visual.authorUsername);
    setCurrentTab('profile');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden border border-slate-200/90 my-auto animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Visual Image Container */}
        <div className="md:w-3/5 bg-slate-950 flex items-center justify-center overflow-hidden max-h-[50vh] md:max-h-full">
          <img
            src={visual.imageUrl}
            alt={visual.title}
            className="w-full h-full object-contain max-h-[90vh]"
          />
        </div>

        {/* Right: Info, Save Actions & Comments */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-5 bg-white">
          <div className="space-y-4">
            {/* Top Bar: Action Buttons & Board Saver */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => likeVisual(visual.id)}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    visual.isLiked ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  title="Like Pin"
                >
                  <Heart className={`w-4 h-4 ${visual.isLiked ? 'fill-rose-600' : ''}`} />
                  <span>{visual.likesCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openShareToChat({
                      type: 'visual',
                      id: visual.id,
                      title: visual.title,
                      preview: visual.imageUrl,
                    })
                  }
                  className="p-2 text-slate-500 hover:text-[#5036FF] hover:bg-[#5036FF]/10 rounded-xl transition-colors cursor-pointer"
                  title="Share to Chat"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Save to Board Controls */}
              {user && (
                <div className="flex items-center gap-1.5">
                  {boards.length > 0 && (
                    <select
                      value={selectedBoardId}
                      onChange={(e) => setSelectedBoardId(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-700 focus:outline-none max-w-[120px] truncate"
                    >
                      <option value="">Default Board</option>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => saveVisualToBoard(visual.id, selectedBoardId || undefined)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                      visual.isSaved
                        ? 'bg-slate-900 text-white'
                        : 'bg-[#5036FF] hover:bg-[#432bdb] text-white shadow-xs'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${visual.isSaved ? 'fill-white' : ''}`} />
                    <span>{visual.isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Title & Category */}
            <div>
              <span className="text-[11px] font-bold text-[#5036FF] uppercase tracking-wider block mb-1">
                {visual.category}
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                {visual.title}
              </h2>
            </div>

            {/* Description */}
            {visual.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {visual.description}
              </p>
            )}

            {/* Tags */}
            {visual.tags && visual.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {visual.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-[#5036FF] hover:underline cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author Card */}
            <div
              onClick={handleAuthorClick}
              className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition-colors cursor-pointer group"
            >
              <img
                src={visual.authorAvatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#5036FF] transition-all shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-[#5036FF] transition-colors">
                  {visual.authorDisplayName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono truncate block">
                  @{visual.authorUsername}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-100">
              <span>{visual.savesCount} saves</span>
              <span>{visual.likesCount} likes</span>
              <span>{new Date(visual.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Related Visuals */}
            {related.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">More in {visual.category}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {related.slice(0, 3).map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => setVisual(rel)}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-slate-100 group relative"
                    >
                      <img
                        src={rel.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
