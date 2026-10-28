import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useSocial } from '../context/SocialContext';
import { Post, VisualItem } from '../types';
import { X, Send, Lock, Users, Search, CheckCircle2 } from 'lucide-react';

interface ShareToChatModalProps {
  post?: Post | null;
  visual?: VisualItem | null;
  onClose: () => void;
}

export const ShareToChatModal: React.FC<ShareToChatModalProps> = ({ post, visual, onClose }) => {
  const { conversations, sendMessage, selectConversation } = useSocket();
  const { setCurrentTab } = useSocial();
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [extraMessage, setExtraMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const filteredConversations = conversations.filter((c) => {
    const title =
      c.type === 'group'
        ? c.name || 'Group'
        : c.participants
        ? c.participants.map((p) => p.username).join(', ')
        : 'Chat';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSend = async () => {
    if (!selectedConvId) return;
    const targetConv = conversations.find((c) => c.id === selectedConvId);
    if (!targetConv) return;

    setIsSending(true);

    try {
      // First select the conversation
      await selectConversation(targetConv);

      // Construct the share content message
      let shareText = '';
      if (post) {
        const username = post.author?.username || post.authorUsername;
        shareText = `[Shared Post from @${username}]\n"${post.content.slice(0, 180)}${post.content.length > 180 ? '...' : ''}"\n${window.location.origin}/post/${post.id}`;
      } else if (visual) {
        const username = visual.author?.username || visual.authorUsername;
        shareText = `[Shared Visual by @${username}: "${visual.title}"]\n${visual.imageUrl}\n${window.location.origin}/visual/${visual.id}`;
      }

      if (extraMessage.trim()) {
        shareText = `${extraMessage.trim()}\n\n${shareText}`;
      }

      await sendMessage(shareText, 'text');
      setSentSuccess(true);
      setTimeout(() => {
        onClose();
        setCurrentTab('messages');
      }, 900);
    } catch (err) {
      console.error('Failed to share to chat', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#5036FF]" />
              Share to Chat
            </h3>
            <p className="text-xs text-slate-500">Send privately to an encrypted conversation</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          {post && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <img
                src={
                  post.author?.avatar ||
                  post.authorAvatar ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${post.authorUsername}`
                }
                alt={post.author?.displayName || post.authorDisplayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {post.author?.displayName || post.authorDisplayName}{' '}
                  <span className="font-normal text-slate-500">
                    @{post.author?.username || post.authorUsername}
                  </span>
                </p>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">{post.content}</p>
              </div>
            </div>
          )}

          {visual && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <img
                src={visual.imageUrl}
                alt={visual.title}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{visual.title}</p>
                <p className="text-xs text-slate-500 truncate">
                  by @{visual.author?.username || visual.authorUsername}
                </p>
                <span className="inline-block mt-1 text-[10px] font-medium text-[#5036FF] bg-indigo-50 px-2 py-0.5 rounded-full">
                  {visual.category}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search & List */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-[#5036FF] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredConversations.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">No conversations found</p>
            ) : (
              filteredConversations.map((c) => {
                const title =
                  c.type === 'group'
                    ? c.name || 'Group'
                    : c.participants
                    ? c.participants.map((p) => p.displayName || p.username).join(', ')
                    : 'Direct Chat';
                const isSelected = selectedConvId === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    type="button"
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#5036FF] flex items-center justify-center font-bold text-xs shrink-0">
                        {c.type === 'group' ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          (title || 'A').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">{title}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-500" />
                          E2EE Encrypted Chat
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#5036FF] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Add Message input */}
          <div className="mt-4">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Add a personal comment (optional)
            </label>
            <input
              type="text"
              placeholder="Check this out!"
              value={extraMessage}
              onChange={(e) => setExtraMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#5036FF] outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedConvId || isSending}
            type="button"
            className="px-5 py-2 text-xs font-semibold text-white bg-[#5036FF] hover:bg-[#432bd9] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            {isSending ? (
              'Sending...'
            ) : sentSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Sent!
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
