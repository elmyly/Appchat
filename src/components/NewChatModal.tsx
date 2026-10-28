import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Lock, Sparkles, Check } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { startDirectConversation, onlineStatusMap } = useSocket();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers(query);
  }, [query]);

  const fetchUsers = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('aurachat_token') || localStorage.getItem('cipherchat_token');
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUsername: string) => {
    setIsStarting(true);
    setError(null);
    const conv = await startDirectConversation(targetUsername);
    setIsStarting(false);
    if (conv) {
      onClose();
    } else {
      setError(`Could not start chat with @${targetUsername}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Start Encrypted Chat</h3>
            <p className="text-xs text-slate-500">Search users by username to start secure messaging</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by @username or name..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm text-slate-900 focus:outline-none transition-colors"
            autoFocus
          />
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-xs text-slate-400 font-medium">
              Searching encrypted directory...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-slate-500 font-medium">No users found for "{query}"</p>
              {query.trim() && (
                <button
                  onClick={() => handleStartChat(query.trim())}
                  disabled={isStarting}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  <Lock className="w-3.5 h-3.5" /> Start direct chat with @{query.trim()}
                </button>
              )}
            </div>
          ) : (
            users.map((target) => {
              const isOnline = onlineStatusMap[target.id]?.isOnline ?? target.isOnline;
              return (
                <div
                  key={target.id}
                  onClick={() => handleStartChat(target.username)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={target.avatar}
                        alt={target.username}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all shadow-xs"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                          isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'
                        }`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {target.displayName}
                        </span>
                        <span className="text-xs text-indigo-600 font-mono">@{target.username}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {target.statusMessage || target.bio}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isStarting}
                    className="px-3 py-1.5 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 ml-2 shadow-xs"
                  >
                    <Lock className="w-3 h-3" /> Chat
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
