import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquarePlus,
  Users,
  Settings,
  Shield,
  ShieldCheck,
  Lock,
  Volume2,
  VolumeX,
  X,
  FileText,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  Clock,
  Sparkles,
  Filter,
  Home,
} from 'lucide-react';
import { useSocket, SearchMessageResult } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Conversation } from '../types';
import { sounds } from '../lib/sounds';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenGroupModal: () => void;
  onOpenProfile: () => void;
  onNavigateHome?: () => void;
  isMobileChatOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewChat,
  onOpenGroupModal,
  onOpenProfile,
  onNavigateHome,
  isMobileChatOpen,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    isConnected,
    onlineStatusMap,
    searchAllMessages,
  } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'chats' | 'messages' | 'media'>('chats');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'unread'>('all');
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  // Message search state
  const [messageResults, setMessageResults] = useState<SearchMessageResult[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Global keyboard shortcut to focus search (Cmd/Ctrl + K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced message history search across conversations
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMessageResults([]);
      setIsSearchingMessages(false);
      return;
    }

    setIsSearchingMessages(true);
    const timer = setTimeout(async () => {
      const filter = searchScope === 'media' ? 'media' : 'all';
      const results = await searchAllMessages(trimmed, filter);
      setMessageResults(results);
      setIsSearchingMessages(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchScope, searchAllMessages]);

  if (!user) return null;

  // Filter conversations based on query and filter tab
  const filteredConversations = conversations.filter((c) => {
    // Filter tab
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (filterTab === 'group' && c.type !== 'group') return false;
    if (filterTab === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (c.type === 'group') {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.lastMessage?.ciphertext.toLowerCase().includes(q) ||
        c.participants?.some(
          (p) => p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
        )
      );
    } else {
      const other = c.participants?.find((p) => p.id !== user.id);
      return (
        other?.displayName?.toLowerCase().includes(q) ||
        other?.username?.toLowerCase().includes(q) ||
        c.lastMessage?.ciphertext.toLowerCase().includes(q)
      );
    }
  });

  // Calculate unread total count
  const totalUnreadCount = conversations.reduce(
    (acc, curr) => acc + (curr.unreadCount || 0),
    0
  );

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  // Helper to highlight matching search term
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded shadow-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Handle clicking a message search result
  const handleSelectMessageResult = (result: SearchMessageResult) => {
    const targetConv = conversations.find((c) => c.id === result.conversationId);
    if (targetConv) {
      selectConversation(targetConv, result.message.id);
    }
  };

  return (
    <div
      className={`w-full md:w-80 lg:w-96 h-full flex flex-col bg-white border-r border-slate-200 shrink-0 select-none z-10 transition-all ${
        isMobileChatOpen ? 'hidden md:flex' : 'flex'
      }`}
    >
      {/* Messages Platform Header */}
      <div className="p-3.5 border-b border-slate-200/90 bg-white flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Messages</h2>
              {totalUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#5036FF] text-[10px] font-bold text-white">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'AES-GCM-256' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Sound Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#5036FF]" />}
          </button>

          {/* New Encrypted Group */}
          <button
            onClick={onOpenGroupModal}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Create Encrypted Group"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* New Direct Chat */}
          <button
            onClick={onOpenNewChat}
            className="p-1.5 bg-[#5036FF] hover:bg-[#432bdb] text-white rounded-xl shadow-xs transition-colors cursor-pointer ml-0.5"
            title="Start Encrypted Chat by Username"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Enhanced Search Input */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, messages, or @usernames..."
            className="w-full pl-9 pr-14 py-2 bg-slate-100/80 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-900 focus:outline-none transition-all placeholder-slate-400"
          />

          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200/60 border border-slate-300 rounded pointer-events-none hidden sm:inline">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Search Mode Scope Tabs (when user is searching) */}
        {searchQuery.trim() ? (
          <div className="flex gap-1.5 mt-2.5">
            <button
              onClick={() => setSearchScope('chats')}
              className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                searchScope === 'chats'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>Chats</span>
              <span className="text-[10px] opacity-75 font-mono">({filteredConversations.length})</span>
            </button>

            <button
              onClick={() => setSearchScope('messages')}
              className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                searchScope === 'messages'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>Messages</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({isSearchingMessages ? '...' : messageResults.length})
              </span>
            </button>

            <button
              onClick={() => setSearchScope('media')}
              className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                searchScope === 'media'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>Files/Media</span>
            </button>
          </div>
        ) : (
          /* Filter Tabs when search query is empty */
          <div className="flex gap-1.5 mt-2.5">
            {(['all', 'direct', 'group', 'unread'] as const).map((tab) => {
              const label =
                tab === 'all'
                  ? 'All Chats'
                  : tab === 'direct'
                  ? 'Direct DMs'
                  : tab === 'group'
                  ? 'Groups'
                  : 'Unread';

              return (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize flex items-center gap-1 ${
                    filterTab === tab
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>{label}</span>
                  {tab === 'unread' && totalUnreadCount > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List Area: Either Messages Search Results OR Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-slate-50/30">
        {/* VIEW 1: Searching Message History */}
        {searchQuery.trim() && (searchScope === 'messages' || searchScope === 'media') ? (
          <div>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span className="uppercase tracking-wider">
                {searchScope === 'media' ? 'Media & File Attachments' : 'Matching Messages'}
              </span>
              {isSearchingMessages && (
                <span className="text-indigo-600 flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                  Decrypting...
                </span>
              )}
            </div>

            {messageResults.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-xs text-slate-600 font-medium">
                  {isSearchingMessages
                    ? 'Scanning encrypted message history...'
                    : `No messages found matching "${searchQuery}"`}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try searching for keywords, usernames, or switch to the Chats tab.
                </p>
              </div>
            ) : (
              messageResults.map((result) => {
                const isMedia = result.message.type === 'image' || result.message.type === 'audio';
                const isFile = result.message.type === 'file';

                return (
                  <div
                    key={result.message.id}
                    onClick={() => handleSelectMessageResult(result)}
                    className="p-3 rounded-2xl bg-white hover:bg-indigo-50/60 border border-slate-200/90 hover:border-indigo-200 cursor-pointer transition-all mb-1 group shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={result.conversationAvatar}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <span className="text-xs font-semibold text-indigo-700 truncate">
                          {result.conversationTitle}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatTimestamp(result.message.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded bg-slate-100 text-slate-500 shrink-0 mt-0.5">
                        {isMedia && result.message.type === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        ) : isMedia && result.message.type === 'audio' ? (
                          <Mic className="w-3.5 h-3.5 text-rose-500" />
                        ) : isFile ? (
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-xs text-slate-600 leading-snug">
                        <span className="font-semibold text-slate-900 mr-1">
                          {result.message.senderDisplayName}:
                        </span>
                        <span className="text-slate-600">
                          {renderHighlightedText(
                            result.message.decryptedContent ||
                              result.message.fileMeta?.name ||
                              result.message.ciphertext,
                            searchQuery
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VIEW 2: Conversations List (Filtered or Default) */
          <>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-slate-500 font-medium">
                  {searchQuery.trim()
                    ? `No conversations match "${searchQuery}"`
                    : filterTab === 'unread'
                    ? 'No unread messages'
                    : 'No conversations found'}
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchScope('messages')}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" /> Search Message History instead
                  </button>
                )}
                {!searchQuery.trim() && (
                  <button
                    onClick={onOpenNewChat}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" /> Start First Chat
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isGroup = conv.type === 'group';
                const isSelected = activeConversation?.id === conv.id;

                const otherParticipant = !isGroup
                  ? conv.participants?.find((p) => p.id !== user.id)
                  : null;

                const title = isGroup
                  ? conv.name || 'Group Chat'
                  : otherParticipant?.displayName || otherParticipant?.username || 'Encrypted Direct';

                const avatar = isGroup
                  ? conv.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group'
                  : otherParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';

                const otherUserId = otherParticipant?.id;
                const isPeerOnline = otherUserId
                  ? onlineStatusMap[otherUserId]?.isOnline
                  : false;

                const lastMessageText = conv.lastMessage
                  ? conv.lastMessage.type === 'image'
                    ? '📷 Photo'
                    : conv.lastMessage.type === 'audio'
                    ? '🎤 Voice Note'
                    : conv.lastMessage.type === 'file'
                    ? '📁 File Attachment'
                    : conv.lastMessage.ciphertext
                  : 'End-to-end encrypted channel';

                const timestamp = conv.lastMessage?.createdAt || conv.updatedAt;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-200 shadow-sm text-slate-900'
                        : 'bg-white border-transparent hover:bg-slate-100/70 hover:border-slate-200/60 text-slate-700'
                    }`}
                  >
                    {/* Avatar with real-time green online dot */}
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 shadow-xs"
                      />
                      {!isGroup && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                            isPeerOnline
                              ? 'bg-emerald-500 shadow-xs'
                              : 'bg-slate-300'
                          }`}
                          title={isPeerOnline ? 'Online' : 'Offline'}
                        />
                      )}
                      {isGroup && (
                        <span className="absolute bottom-0 right-0 p-0.5 bg-indigo-600 rounded-full text-white ring-2 ring-white">
                          <Users className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Info & Last message preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                          {renderHighlightedText(title, searchQuery)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                          {formatTimestamp(timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate flex-1 leading-tight">
                          {conv.lastMessage && isGroup && conv.lastMessage.senderUsername && (
                            <span className="text-indigo-600 font-medium mr-1">
                              {conv.lastMessage.senderUsername}:
                            </span>
                          )}
                          {renderHighlightedText(lastMessageText, searchQuery)}
                        </p>

                        {/* Unread badge */}
                        {!!conv.unreadCount && conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs shrink-0 animate-pulse">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
