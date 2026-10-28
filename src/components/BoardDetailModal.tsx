import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Globe,
  UserPlus,
  Share2,
  Trash2,
  Bookmark,
  Check,
  Layers,
} from 'lucide-react';
import { Board, VisualItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';

interface BoardDetailModalProps {
  boardId: string;
  onClose: () => void;
}

export const BoardDetailModal: React.FC<BoardDetailModalProps> = ({ boardId, onClose }) => {
  const { user } = useAuth();
  const { followBoard, setViewingVisualId, refreshBoards } = useSocial();

  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchBoard = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/boards/${boardId}`);
        if (res.ok) {
          const data = await res.json();
          setBoard(data.board);
        }
      } catch (err) {
        console.error('Failed to load board details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoard();
  }, [boardId]);

  if (isLoading || !board) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center animate-pulse">
          <span className="w-5 h-5 rounded-full bg-[#5036FF]" />
        </div>
      </div>
    );
  }

  const isOwner = user?.id === board.ownerId;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    try {
      const res = await fetch(`/api/boards/${board.id}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('aurachat_token')}`,
        },
        body: JSON.stringify({ username: inviteUsername.trim() }),
      });
      if (res.ok) {
        setInviteSuccess(true);
        setTimeout(() => {
          setInviteSuccess(false);
          setShowInvite(false);
          setInviteUsername('');
        }, 1500);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to invite collaborator');
      }
    } catch (err) {
      console.error('Failed to invite:', err);
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm('Are you sure you want to delete this board?')) return;
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('aurachat_token')}`,
        },
      });
      if (res.ok) {
        refreshBoards();
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/90 my-auto animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                {board.name}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                {board.isPrivate ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Secret Board
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-600" /> Public Board
                  </>
                )}
              </span>
            </div>

            {board.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {board.description}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
              <span>Curated by <strong>@{board.ownerUsername}</strong></span>
              <span>·</span>
              <span className="font-mono">{board.items?.length || 0} visual pins</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Share / Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 text-slate-500 hover:text-[#5036FF] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Share Board"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Follow board button if not owner */}
            {!isOwner && user && !board.isPrivate && (
              <button
                type="button"
                onClick={() => followBoard(board.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  board.isFollowing
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-[#5036FF] hover:bg-[#432bdb] text-white shadow-xs'
                }`}
              >
                {board.isFollowing ? 'Following' : 'Follow Board'}
              </button>
            )}

            {/* Invite Collaborator (owner only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowInvite(!showInvite)}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-[#5036FF] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            )}

            {/* Delete board (owner only) */}
            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteBoard}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Delete Board"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invite Collaborator Form */}
        {showInvite && (
          <form
            onSubmit={handleInvite}
            className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2 animate-in fade-in"
          >
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="Enter @username to invite..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:border-[#5036FF]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {inviteSuccess ? 'Invited!' : 'Send Invite'}
            </button>
          </form>
        )}

        {/* Board Items Masonry List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {!board.items || board.items.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mx-auto shadow-2xs">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No visual pins saved yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore Aura Visuals to save photos, architecture, or design ideas to this board.
              </p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-3 gap-3.5 space-y-3.5">
              {board.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setViewingVisualId(item.id)}
                  className="group break-inside-avoid relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 hover:border-slate-300 shadow-2xs cursor-zoom-in mb-3.5"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                    <span className="text-xs font-bold line-clamp-1">{item.title}</span>
                    <span className="text-[10px] opacity-80 font-mono">{item.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
