import React, { useState } from 'react';
import {
  X,
  Search,
  Share2,
  Users,
  Check,
  FileText,
  Image,
  Mic,
  Send,
  Lock,
} from 'lucide-react';
import { Message, Conversation } from '../types';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface ForwardModalProps {
  message: Message | null;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, onClose }) => {
  const { user } = useAuth();
  const { conversations, forwardMessage, onlineStatusMap } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [extraComment, setExtraComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentConvIds, setSentConvIds] = useState<Record<string, boolean>>({});
  const [forwardSuccess, setForwardSuccess] = useState(false);

  if (!message || !user) return null;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (c.type === 'group') {
      return (c.name || '').toLowerCase().includes(query);
    } else {
      const other = c.participants?.find((p) => p.id !== user.id);
      return (
        (other?.displayName || '').toLowerCase().includes(query) ||
        (other?.username || '').toLowerCase().includes(query)
      );
    }
  });

  const toggleSelect = (convId: string) => {
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  // Quick forward to a single conversation
  const handleQuickSend = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sentConvIds[convId]) return;

    const ok = await forwardMessage(convId, message, extraComment.trim() || undefined);
    if (ok) {
      setSentConvIds((prev) => ({ ...prev, [convId]: true }));
      setForwardSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  // Forward to all selected conversations
  const handleForwardSelected = async () => {
    if (selectedConvIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      for (const convId of selectedConvIds) {
        await forwardMessage(convId, message, extraComment.trim() || undefined);
      }
      setForwardSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Forward Message</h3>
              <p className="text-xs text-slate-500">Choose contacts or groups to share with</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview Snippet */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Forwarding Content
          </span>
          <div className="p-2.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-2xs">
            <img
              src={message.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-indigo-700 block truncate">
                {message.senderDisplayName || `@${message.senderUsername}`}
              </span>

              {message.type === 'text' && (
                <p className="text-xs text-slate-700 truncate line-clamp-1">
                  {message.decryptedContent || message.ciphertext}
                </p>
              )}

              {message.type === 'image' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Image className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate">{message.decryptedContent && message.decryptedContent !== '[IMAGE]' ? message.decryptedContent : 'Photo attachment'}</span>
                </div>
              )}

              {message.type === 'file' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate">{message.fileMeta?.name || 'File document'}</span>
                </div>
              )}

              {message.type === 'audio' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Mic className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Voice Note ({message.fileMeta?.duration || 0}s)</span>
                </div>
              )}
            </div>
            <div className="shrink-0 text-slate-400" title="Secured with end-to-end encryption">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus-within:bg-white focus-within:border-indigo-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts or groups..."
              className="bg-transparent border-0 text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar min-h-[220px] max-h-72">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No contacts or groups found matching "{searchQuery}"
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isGroup = conv.type === 'group';
              const other = isGroup
                ? null
                : conv.participants?.find((p) => p.id !== user.id);
              const title = isGroup ? conv.name : other?.displayName || `@${other?.username}`;
              const subtitle = isGroup
                ? `${conv.participantIds.length} members`
                : `@${other?.username}`;
              const avatar = isGroup
                ? conv.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + conv.id
                : other?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + other?.username;
              const isOnline = other ? (onlineStatusMap[other.id]?.isOnline ?? other.isOnline) : false;
              const isSelected = selectedConvIds.includes(conv.id);
              const isSent = !!sentConvIds[conv.id];

              return (
                <div
                  key={conv.id}
                  onClick={() => toggleSelect(conv.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shadow-2xs"
                      />
                      {!isGroup && (
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 truncate block">
                          {title}
                        </span>
                        {isGroup && (
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md">
                            GROUP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate block">
                        {subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Checkbox for multi-select */}
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Instant Send Button */}
                    <button
                      type="button"
                      disabled={isSent}
                      onClick={(e) => handleQuickSend(conv.id, e)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                        isSent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" /> Sent
                        </>
                      ) : (
                        <>Send</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Optional Note and Batch Forward Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2.5">
          <input
            type="text"
            value={extraComment}
            onChange={(e) => setExtraComment(e.target.value)}
            placeholder="Add an optional note to this forward..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {selectedConvIds.length > 0 ? (
                <span className="font-semibold text-indigo-700">
                  {selectedConvIds.length} {selectedConvIds.length === 1 ? 'chat' : 'chats'} selected
                </span>
              ) : (
                'Select multiple or tap Send directly'
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedConvIds.length === 0 || isSubmitting}
                onClick={handleForwardSelected}
                className={`px-4 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                  selectedConvIds.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {forwardSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Forwarded!
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Forward
                    {selectedConvIds.length > 0 ? ` (${selectedConvIds.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
