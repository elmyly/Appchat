import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  MoreVertical,
  Users,
  UserPlus,
  ArrowLeft,
  X,
  Sparkles,
  MessageSquare,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Upload,
  Camera,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { SecurityModal } from './SecurityModal';
import { ForwardModal } from './ForwardModal';
import { FileMeta, ParticipantInfo, Message } from '../types';

interface ChatAreaProps {
  onBackToSidebar?: () => void;
  onOpenNewChat?: () => void;
  onOpenGroupModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackToSidebar,
  onOpenNewChat,
  onOpenGroupModal,
}) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    typingUsers,
    onlineStatusMap,
    highlightedMessageId,
    setHighlightedMessageId,
    sendMessage,
    setTyping,
    sendReaction,
    pinMessage,
    addGroupMember,
    updateGroupDetails,
  } = useSocket();

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [activePinIndex, setActivePinIndex] = useState(0);
  const [showAllPinnedModal, setShowAllPinnedModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const groupIconInputRef = useRef<HTMLInputElement | null>(null);

  const handleGroupIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateGroupDetails(activeConversation.id, { avatar: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Filter pinned messages (sorted newest pinned first)
  const pinnedMessages = messages
    .filter((m) => m.isPinned)
    .sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));

  // Keep activePinIndex in bounds
  useEffect(() => {
    if (activePinIndex >= pinnedMessages.length && pinnedMessages.length > 0) {
      setActivePinIndex(pinnedMessages.length - 1);
    }
  }, [pinnedMessages.length, activePinIndex]);

  // Smooth scroll and pulse highlight to target message
  const jumpToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2500);
  };

  // Auto-scroll to highlighted message or bottom on new message
  useEffect(() => {
    if (highlightedMessageId) {
      const el = document.getElementById(`msg-${highlightedMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, highlightedMessageId]);

  if (!user) return null;

  // Empty state when no conversation is selected
  if (!activeConversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-50 text-center relative overflow-hidden">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-md flex flex-col items-center bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-5 shadow-xs">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
            Aura Messenger
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Private, end-to-end encrypted messaging.
            Connect with colleagues and friends using their usernames with verified privacy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <button
              onClick={onOpenNewChat}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Start Direct Chat
            </button>
            <button
              onClick={onOpenGroupModal}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all border border-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" /> Create Encrypted Group
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-2.5 mt-8 w-full text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-emerald-700 text-xs block font-semibold mb-0.5">
                Encrypted
              </span>
              <span className="text-[11px] text-slate-500">Private on-device encryption</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-indigo-700 text-xs block font-semibold mb-0.5">
                Instant Chat
              </span>
              <span className="text-[11px] text-slate-500">Live presence and instant sync</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-cyan-700 text-xs block font-semibold mb-0.5">
                Read Receipts
              </span>
              <span className="text-[11px] text-slate-500">Sent, delivered, and read status</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine chat display metadata
  const isGroup = activeConversation.type === 'group';
  const otherParticipant = !isGroup
    ? activeConversation.participants?.find((p) => p.id !== user.id)
    : null;

  const chatTitle = isGroup
    ? activeConversation.name || 'Group Chat'
    : otherParticipant?.displayName || otherParticipant?.username || 'Encrypted Direct';

  const chatAvatar = isGroup
    ? activeConversation.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group'
    : otherParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=dm';

  // Online status
  const otherUserId = otherParticipant?.id;
  const isPeerOnline = otherUserId ? onlineStatusMap[otherUserId]?.isOnline : false;
  const peerLastSeen = otherUserId ? onlineStatusMap[otherUserId]?.lastSeen : null;

  // Filter messages by search if active
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => {
        const content = m.decryptedContent || m.ciphertext;
        return (
          content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.senderUsername.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : messages;

  // Format last seen relative time
  const formatLastSeen = (timestamp: number | null) => {
    if (!timestamp) return 'Offline';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Active moments ago';
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
    return `Last seen ${new Date(timestamp).toLocaleDateString()}`;
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim()) return;
    addGroupMember(activeConversation.id, newMemberUsername.trim());
    setNewMemberUsername('');
    setShowAddMember(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-100/70 overflow-hidden relative">
      {/* Security Verification Modal */}
      {showSecurityModal && (
        <SecurityModal
          conversation={activeConversation}
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {/* All Pinned Messages Modal */}
      {showAllPinnedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Pin className="w-4 h-4 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pinned Messages</h3>
                  <p className="text-[11px] text-slate-500">
                    {pinnedMessages.length}{' '}
                    {pinnedMessages.length === 1 ? 'important message' : 'important messages'} kept handy in this conversation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllPinnedModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pinned Messages List */}
            <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No pinned messages in this conversation.
                </div>
              ) : (
                pinnedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/20 transition-all shadow-2xs flex flex-col gap-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={msg.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <span className="text-xs font-semibold text-slate-900">
                          {msg.senderDisplayName || msg.senderUsername}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          @{msg.senderUsername}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(msg.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Content Preview */}
                    <div className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap break-words">
                      {msg.type === 'text' && (msg.decryptedContent || msg.ciphertext)}
                      {msg.type === 'image' && (
                        <div className="flex items-center gap-2">
                          {msg.fileMeta?.dataUrl && (
                            <img
                              src={msg.fileMeta.dataUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          )}
                          <span className="text-xs text-slate-600 font-medium">📷 Photo Attachment</span>
                        </div>
                      )}
                      {msg.type === 'file' && (
                        <span className="text-xs text-slate-600 font-medium">
                          📎 {msg.fileMeta?.name || 'File'}
                        </span>
                      )}
                      {msg.type === 'audio' && (
                        <span className="text-xs text-slate-600 font-medium">🎤 Voice Note</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-[10px] text-amber-700 font-medium">
                        {msg.pinnedByUsername ? `Pinned by @${msg.pinnedByUsername}` : 'Pinned'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllPinnedModal(false);
                            jumpToMessage(msg.id);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" /> Jump to message
                        </button>
                        <button
                          type="button"
                          onClick={() => pinMessage(msg.id, false)}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Unpin message"
                        >
                          <PinOff className="w-3 h-3" /> Unpin
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between z-20 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={onBackToSidebar}
            className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar with status indicator */}
          <div className="relative shrink-0">
            <img
              src={chatAvatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 shadow-xs"
            />
            {!isGroup && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                  isPeerOnline ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'
                }`}
                title={isPeerOnline ? 'Online' : 'Offline'}
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">{chatTitle}</h3>
              {!isGroup && otherParticipant && (
                <span className="text-xs text-indigo-600 font-mono hidden sm:inline">
                  @{otherParticipant.username}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {isGroup ? (
                <span className="text-slate-500">
                  {activeConversation.participantIds.length} members
                </span>
              ) : isPeerOnline ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active now
                </span>
              ) : (
                <span className="text-slate-500">{formatLastSeen(peerLastSeen)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Security Shield Badge */}
          <button
            onClick={() => setShowSecurityModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Inspect Cryptographic Safety Numbers"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Encrypted</span>
          </button>

          {/* Pinned Messages Header Toggle */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowAllPinnedModal(true)}
              className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer relative"
              title={`${pinnedMessages.length} Pinned Messages in this chat`}
            >
              <Pin className="w-4 h-4 fill-amber-500 text-amber-600" />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            </button>
          )}

          {/* Search in chat toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showSearch ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Group Info / Members toggle */}
          {isGroup && (
            <button
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showGroupInfo ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Group Details"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* In-Chat Message Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within this encrypted conversation..."
            className="flex-1 bg-transparent border-0 text-xs text-slate-900 focus:outline-none placeholder-slate-400"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Top Banner (Kept accessible at the top of the conversation view) */}
      {pinnedMessages.length > 0 && (
        <div className="bg-amber-50/90 backdrop-blur-sm border-b border-amber-200/90 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 z-15 shadow-2xs transition-all">
          <div
            onClick={() => jumpToMessage(pinnedMessages[activePinIndex]?.id || pinnedMessages[0].id)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group/pin"
            title="Click to jump to pinned message"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs group-hover/pin:bg-amber-200 transition-colors">
              <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600 rotate-45" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  Pinned Message
                  {pinnedMessages.length > 1 && (
                    <span className="ml-1 text-[10px] font-semibold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded-full">
                      {activePinIndex + 1}/{pinnedMessages.length}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-amber-800/80 truncate">
                  • {pinnedMessages[activePinIndex]?.senderDisplayName || pinnedMessages[activePinIndex]?.senderUsername}
                </span>
              </div>
              <p className="text-xs text-amber-950 truncate font-medium group-hover/pin:underline decoration-amber-400">
                {pinnedMessages[activePinIndex]?.type === 'text' &&
                  (pinnedMessages[activePinIndex]?.decryptedContent || pinnedMessages[activePinIndex]?.ciphertext)}
                {pinnedMessages[activePinIndex]?.type === 'image' && '📷 Photo attachment'}
                {pinnedMessages[activePinIndex]?.type === 'file' &&
                  `📎 ${pinnedMessages[activePinIndex]?.fileMeta?.name || 'File attachment'}`}
                {pinnedMessages[activePinIndex]?.type === 'audio' && '🎤 Voice note'}
              </p>
            </div>
          </div>

          {/* Right Controls: Navigation, View All, Jump, Unpin */}
          <div className="flex items-center gap-1 shrink-0">
            {pinnedMessages.length > 1 && (
              <div className="flex items-center bg-amber-100/80 rounded-lg p-0.5 border border-amber-200">
                <button
                  type="button"
                  onClick={() =>
                    setActivePinIndex((prev) => (prev > 0 ? prev - 1 : pinnedMessages.length - 1))
                  }
                  className="p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-200/90 rounded transition-colors cursor-pointer"
                  title="Previous pinned message"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePinIndex((prev) => (prev < pinnedMessages.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-200/90 rounded transition-colors cursor-pointer"
                  title="Next pinned message"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pinnedMessages.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAllPinnedModal(true)}
                className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-200 rounded-lg transition-colors cursor-pointer hidden sm:inline-block"
                title="View all pinned messages"
              >
                All ({pinnedMessages.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => jumpToMessage(pinnedMessages[activePinIndex]?.id || pinnedMessages[0].id)}
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100/90 rounded-lg transition-colors cursor-pointer"
              title="Jump to message"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                pinMessage(pinnedMessages[activePinIndex]?.id || pinnedMessages[0].id, false)
              }
              className="p-1.5 text-amber-800 hover:text-red-600 hover:bg-amber-100/90 rounded-lg transition-colors cursor-pointer"
              title="Unpin this message"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area (Messages + optional Group Info Drawer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Scroll Thread */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-1 custom-scrollbar">
          {/* Encryption Intro Card */}
          <div className="flex flex-col items-center justify-center my-4 text-center">
            <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 mb-2 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Messages and calls are secured with end-to-end encryption. Only people in this chat can read or listen to them.
            </p>
          </div>

          {filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={user}
              isGroup={isGroup}
              participants={activeConversation.participants}
              onReact={sendReaction}
              onPin={pinMessage}
              onForward={(m) => setMessageToForward(m)}
              isHighlighted={msg.id === highlightedMessageId}
            />
          ))}

          {/* Real-time Typing Indicator with Avatars and Animated Dots */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-indigo-600 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex gap-2.5 items-center bg-white px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
                {/* Typing User Avatars Stack */}
                <div className="flex -space-x-2 items-center">
                  {typingUsers.slice(0, 3).map((u) => {
                    const participantAvatar =
                      u.avatar ||
                      activeConversation?.participants?.find((p) => p.id === u.userId)?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`;
                    return (
                      <img
                        key={u.userId}
                        src={participantAvatar}
                        alt={u.displayName || u.username}
                        title={u.displayName || u.username}
                        className="w-4 h-4 rounded-full object-cover ring-1 ring-white shadow-2xs shrink-0"
                      />
                    );
                  })}
                  {typingUsers.length > 3 && (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-700 flex items-center justify-center ring-1 ring-white shrink-0">
                      +{typingUsers.length - 3}
                    </span>
                  )}
                </div>

                {/* Animated Bouncing Dots */}
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>

                <span className="text-[11px] text-slate-600 font-medium">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].displayName || typingUsers[0].username} is typing...`
                    : typingUsers.length === 2
                    ? `${typingUsers[0].displayName || typingUsers[0].username} & ${typingUsers[1].displayName || typingUsers[1].username} are typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Group Info Drawer */}
        {isGroup && showGroupInfo && (
          <div className="w-72 bg-white border-l border-slate-200 p-4 flex flex-col shrink-0 animate-in slide-in-from-right-2 overflow-y-auto custom-scrollbar shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Group Info</h4>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center py-4 text-center">
              <input
                type="file"
                ref={groupIconInputRef}
                onChange={handleGroupIconUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Group Avatar with upload trigger */}
              <div
                onClick={() => {
                  if (activeConversation.admins.includes(user.id)) {
                    groupIconInputRef.current?.click();
                  }
                }}
                className={`relative group shrink-0 mb-2 ${
                  activeConversation.admins.includes(user.id) ? 'cursor-pointer' : ''
                }`}
                title={
                  activeConversation.admins.includes(user.id)
                    ? 'Click to upload group icon'
                    : undefined
                }
              >
                <img
                  src={chatAvatar}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 shadow-md group-hover:ring-indigo-400 transition-all"
                />
                {activeConversation.admins.includes(user.id) && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-semibold">Change</span>
                  </div>
                )}
              </div>

              {activeConversation.admins.includes(user.id) && (
                <button
                  type="button"
                  onClick={() => groupIconInputRef.current?.click()}
                  className="mb-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" /> Change Group Icon
                </button>
              )}

              <h3 className="text-sm font-bold text-slate-900">{chatTitle}</h3>
              {activeConversation.description && (
                <p className="text-xs text-slate-500 mt-1">{activeConversation.description}</p>
              )}
            </div>

            {/* Add Member button */}
            <div className="mb-4">
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add Member by @username
              </button>

              {showAddMember && (
                <form onSubmit={handleAddMemberSubmit} className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>

            {/* Member list */}
            <div className="flex-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Participants ({activeConversation.participantIds.length})
              </span>
              <div className="space-y-2">
                {activeConversation.participants?.map((p) => {
                  const isOnline = onlineStatusMap[p.id]?.isOnline ?? p.isOnline;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200" />
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-900 truncate block">
                            {p.displayName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">@{p.username}</span>
                        </div>
                      </div>
                      {activeConversation.admins.includes(p.id) && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          ADMIN
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input Footer */}
      <MessageInput
        onSendMessage={sendMessage}
        onTyping={setTyping}
      />

      {/* Message Forward Modal */}
      {messageToForward && (
        <ForwardModal
          message={messageToForward}
          onClose={() => setMessageToForward(null)}
        />
      )}
    </div>
  );
};
