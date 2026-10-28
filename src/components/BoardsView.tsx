import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Lock,
  Globe,
  Users,
  Sparkles,
} from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { BoardDetailModal } from './BoardDetailModal';
import { CreateBoardModal } from './CreateBoardModal';

export const BoardsView: React.FC = () => {
  const { user } = useAuth();
  const { boards, isLoadingBoards, viewingBoardId, setViewingBoardId } = useSocial();
  const [filter, setFilter] = useState<'my' | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const displayedBoards = boards.filter((b) => {
    if (filter === 'my') {
      return user && (b.ownerId === user.id || b.collaboratorIds.includes(user.id));
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 space-y-4 pb-20 md:pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Boards & Mood Collections
          </h1>
          <p className="text-xs text-slate-500">
            Curated collections of visual inspiration, design assets, and ideas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter */}
          {user && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Community
              </button>
              <button
                type="button"
                onClick={() => setFilter('my')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === 'my'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Boards
              </button>
            </div>
          )}

          {/* Create Board Button */}
          {user && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Board</span>
            </button>
          )}
        </div>
      </div>

      {/* Boards Grid */}
      {isLoadingBoards && boards.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-200/80 rounded-3xl p-4 animate-pulse space-y-3">
              <div className="aspect-video bg-slate-200 rounded-2xl" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : displayedBoards.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {filter === 'my' ? 'You have no boards yet' : 'No boards found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'my'
              ? 'Create a board to save and organize visuals, architecture, or design ideas.'
              : 'Be the first to curate and share a public inspiration collection!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedBoards.map((b) => (
            <div
              key={b.id}
              onClick={() => setViewingBoardId(b.id)}
              className="group bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              {/* Cover Banner or Preview */}
              <div className="aspect-video bg-slate-100 overflow-hidden relative">
                {b.coverImage ? (
                  <img
                    src={b.coverImage}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50/50 text-[#5036FF]">
                    <Layers className="w-10 h-10 opacity-40" />
                  </div>
                )}

                {/* Secret / Public indicator badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/50 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                  {b.isPrivate ? <Lock className="w-3 h-3 text-amber-300" /> : <Globe className="w-3 h-3 text-emerald-300" />}
                  <span>{b.isPrivate ? 'Secret' : 'Public'}</span>
                </div>

                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono">
                  {b.itemIds.length} {b.itemIds.length === 1 ? 'pin' : 'pins'}
                </div>
              </div>

              {/* Board Details */}
              <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#5036FF] transition-colors tracking-tight line-clamp-1">
                    {b.name}
                  </h3>
                  {b.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {b.description}
                    </p>
                  )}
                </div>

                {/* Footer Creator Attributions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={b.ownerAvatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                    />
                    <span className="text-[11px] truncate font-medium">@{b.ownerUsername}</span>
                  </div>

                  {b.collaboratorIds.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      +{b.collaboratorIds.length} collabs
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {viewingBoardId && (
        <BoardDetailModal
          boardId={viewingBoardId}
          onClose={() => setViewingBoardId(null)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateBoardModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
