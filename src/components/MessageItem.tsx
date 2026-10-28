import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Lock,
  Download,
  FileText,
  Play,
  Pause,
  Smile,
  ShieldCheck,
  Info,
  ExternalLink,
  Plus,
  Pin,
  PinOff,
  Share2,
} from 'lucide-react';
import { Message, User, ParticipantInfo } from '../types';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  isGroup: boolean;
  participants?: ParticipantInfo[];
  onReact: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onForward?: (message: Message) => void;
  isHighlighted?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🚀', '😮', '🎉'];
const EXTENDED_EMOJIS = [
  '👍', '❤️', '😂', '🔥', '🚀', '😮', '🎉',
  '😍', '🙏', '💯', '👀', '👏', '🥳', '🤔',
  '😎', '🔒', '⚡', '💪', '✨', '💔', '🫡',
];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  isGroup,
  participants,
  onReact,
  onPin,
  onForward,
  isHighlighted,
}) => {
  const isMine = message.senderId === currentUser.id;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [showExtendedPicker, setShowExtendedPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Status checks calculation
  const isRead = message.readBy && message.readBy.some((r) => r.userId !== currentUser.id);
  const isDelivered =
    message.deliveredTo && message.deliveredTo.some((id) => id !== currentUser.id);

  // Audio note handling
  const toggleAudio = () => {
    if (!message.fileMeta?.dataUrl) return;

    if (!audioElement) {
      const audio = new Audio(message.fileMeta.dataUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
      setAudioElement(audio);
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioElement.pause();
        setIsPlayingAudio(false);
      } else {
        audioElement.play();
        setIsPlayingAudio(true);
      }
    }
  };

  // Format timestamp (e.g. 10:45 AM)
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // If system notice
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          {message.ciphertext}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex gap-2.5 my-2.5 px-2 transition-all ${
        isMine ? 'flex-row-reverse' : 'flex-row'
      }`}
      onMouseLeave={() => setShowExtendedPicker(false)}
    >
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Expanded attachment"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Sender Avatar (for groups or incoming messages) */}
      {!isMine && (
        <div className="shrink-0 pt-0.5">
          <img
            src={message.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt={message.senderUsername}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shadow-xs"
          />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Group Sender Header */}
        {!isMine && isGroup && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-semibold text-indigo-700">
              {message.senderDisplayName}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">@{message.senderUsername}</span>
          </div>
        )}

        {/* The Bubble */}
        <div
          id={`msg-${message.id}`}
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-xs text-sm break-words transition-all duration-300 ${
            isMine
              ? 'bg-indigo-600 text-white rounded-tr-xs shadow-indigo-600/10'
              : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-sm'
          } ${
            isHighlighted
              ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-100 shadow-md shadow-amber-500/20 scale-[1.02]'
              : ''
          }`}
        >
          {/* Pinned Indicator Badge */}
          {message.isPinned && (
            <div
              className={`flex items-center gap-1.5 pb-1 mb-1.5 border-b text-[10px] font-semibold tracking-wide ${
                isMine
                  ? 'text-amber-200 border-white/20'
                  : 'text-amber-700 border-amber-100'
              }`}
            >
              <Pin className="w-3 h-3 fill-amber-400 text-amber-500 rotate-45 shrink-0" />
              <span className="truncate">
                Pinned {message.pinnedByUsername ? `by @${message.pinnedByUsername}` : ''}
              </span>
            </div>
          )}

          {/* Text Message Content */}
          {message.type === 'text' && (
            <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">
              {message.decryptedContent || message.ciphertext}
            </p>
          )}

          {/* Image Attachment */}
          {message.type === 'image' && message.fileMeta?.dataUrl && (
            <div className="space-y-1.5">
              <div
                onClick={() => setLightboxImage(message.fileMeta!.dataUrl!)}
                className="overflow-hidden rounded-xl cursor-zoom-in group/img relative"
              >
                <img
                  src={message.fileMeta.dataUrl}
                  alt={message.fileMeta.name}
                  className="max-h-72 w-full object-cover rounded-xl transition-transform group-hover/img:scale-105"
                />
              </div>
              {message.decryptedContent && message.decryptedContent !== '[IMAGE]' && (
                <p className="whitespace-pre-wrap leading-relaxed select-text mt-1">
                  {message.decryptedContent}
                </p>
              )}
            </div>
          )}

          {/* File Attachment */}
          {message.type === 'file' && message.fileMeta && (
            <div
              className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${
                isMine ? 'bg-white/10' : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isMine ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs font-semibold block truncate ${
                    isMine ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {message.fileMeta.name}
                </span>
                <span
                  className={`text-[10px] block font-mono ${
                    isMine ? 'text-indigo-200' : 'text-slate-500'
                  }`}
                >
                  {formatFileSize(message.fileMeta.size)}
                </span>
              </div>
              {message.fileMeta.dataUrl && (
                <a
                  href={message.fileMeta.dataUrl}
                  download={message.fileMeta.name}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Voice Audio Message */}
          {message.type === 'audio' && message.fileMeta && (
            <div className="flex items-center gap-3 py-1 px-1 min-w-[210px]">
              <button
                type="button"
                onClick={toggleAudio}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                }`}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col gap-1">
                {/* Audio wave simulation bars */}
                <div className="flex items-center gap-0.5 h-5">
                  {[20, 50, 80, 40, 100, 60, 90, 30, 70, 50, 85, 35, 65, 45].map((val, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-200 ${
                        isPlayingAudio
                          ? isMine
                            ? 'bg-white animate-pulse'
                            : 'bg-indigo-600 animate-pulse'
                          : isMine
                          ? 'bg-indigo-200/60'
                          : 'bg-slate-300'
                      }`}
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
                <div
                  className={`flex justify-between text-[10px] font-mono ${
                    isMine ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  <span>Voice Note</span>
                  <span>{message.fileMeta.duration ? `${message.fileMeta.duration}s` : 'Audio'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bubble Footer: Time, E2EE Lock, Status Receipts */}
          <div
            className={`flex items-center gap-1.5 mt-1 text-[10px] select-none ${
              isMine ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'
            }`}
          >
            {/* E2EE Lock Icon with Cryptographic inspector */}
            <button
              type="button"
              onClick={() => setShowSecurityInfo(!showSecurityInfo)}
              className="opacity-75 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
              title="AES-256-GCM Encrypted"
            >
              <Lock className="w-2.5 h-2.5" />
            </button>

            <span>{formatTime(message.createdAt)}</span>

            {/* Read / Delivered Status Ticks for outgoing messages */}
            {isMine && (
              <div
                className="cursor-pointer flex items-center"
                onClick={() => isGroup && setShowReadByModal(true)}
                title={
                  isRead
                    ? 'Read by recipient'
                    : isDelivered
                    ? 'Delivered to device'
                    : 'Sent'
                }
              >
                {isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                ) : isDelivered ? (
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-indigo-200" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic Inspector Popover */}
        {showSecurityInfo && (
          <div className="mt-1 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-xl max-w-xs animate-in fade-in duration-150 z-30">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100">
              <span className="font-semibold text-slate-900 flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cryptographic Package
              </span>
              <button
                onClick={() => setShowSecurityInfo(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 font-mono text-[10px]">
              <div>
                <span className="text-slate-400">Cipher: </span>
                <span className="text-indigo-600 font-semibold">AES-GCM (256-bit)</span>
              </div>
              <div className="truncate">
                <span className="text-slate-400">IV: </span>
                <span className="text-slate-600">{message.iv || 'default-iv'}</span>
              </div>
              <div className="truncate">
                <span className="text-slate-400">Fingerprint: </span>
                <span className="text-emerald-600 font-semibold">{message.keyFingerprint || '94A2-B7C1'}</span>
              </div>
              <div className="truncate text-slate-400">
                <span>Ciphertext (raw): </span>
                <span className="text-slate-600 block truncate">{message.ciphertext}</span>
              </div>
            </div>
          </div>
        )}

        {/* Group Read Receipts Details Popover */}
        {showReadByModal && isGroup && (
          <div className="mt-1 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-xl max-w-xs animate-in fade-in duration-150 z-30">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
              <span className="font-semibold text-slate-900 text-[11px]">Read By:</span>
              <button
                onClick={() => setShowReadByModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            {message.readBy.length === 0 ? (
              <span className="text-[10px] text-slate-400">Not read yet</span>
            ) : (
              <div className="space-y-1">
                {message.readBy.map((r) => (
                  <div key={r.userId} className="flex justify-between text-[10px]">
                    <span className="text-slate-700 font-medium">
                      {r.userId === currentUser.id ? 'You' : r.userId}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(r.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reaction Badges List with Counts and User Avatars */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-0.5">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => {
              const emojiReactions = message.reactions.filter((r) => r.emoji === emoji);
              const hasReacted = emojiReactions.some((r) => r.userId === currentUser.id);

              const reactedNames = emojiReactions.map((r) =>
                r.userId === currentUser.id ? 'You' : r.displayName || `@${r.username}`
              );
              const tooltipText = `${reactedNames.join(', ')} reacted with ${emoji}`;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer select-none active:scale-95 shadow-2xs ${
                    hasReacted
                      ? 'bg-indigo-50 border border-indigo-300 text-indigo-700 ring-1 ring-indigo-200 font-semibold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  title={tooltipText}
                >
                  <span className="text-xs">{emoji}</span>
                  <span className="text-[11px] font-semibold">{count}</span>

                  {/* Overlapping User Avatars */}
                  <div className="flex -space-x-1.5 items-center ml-0.5">
                    {emojiReactions.slice(0, 3).map((r, idx) => {
                      const matchedParticipant = participants?.find((p) => p.id === r.userId);
                      const avatarSrc =
                        r.userAvatar ||
                        matchedParticipant?.avatar ||
                        (r.userId === currentUser.id ? currentUser.avatar : undefined) ||
                        (r.userId === message.senderId ? message.senderAvatar : undefined) ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${r.username}`;
                      const label = r.userId === currentUser.id ? 'You' : r.displayName || `@${r.username}`;

                      return (
                        <img
                          key={`${r.userId}-${idx}`}
                          src={avatarSrc}
                          alt={label}
                          title={label}
                          className="w-4 h-4 rounded-full object-cover ring-1 ring-white shadow-2xs shrink-0 bg-slate-100"
                        />
                      );
                    })}
                    {emojiReactions.length > 3 && (
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 flex items-center justify-center ring-1 ring-white shrink-0">
                        +{emojiReactions.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Quick add extra reaction pill */}
            <button
              type="button"
              onClick={() => setShowExtendedPicker(!showExtendedPicker)}
              className="inline-flex items-center justify-center w-6 h-5 rounded-full text-slate-400 bg-white hover:bg-slate-100 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-xs"
              title="Add emoji reaction"
            >
              <Smile className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Reaction & Action Bar on Hover */}
      <div
        className={`absolute -top-3.5 ${
          isMine ? 'right-2' : 'left-2'
        } opacity-0 group-hover:opacity-100 transition-all duration-150 z-30 flex items-center gap-1 pointer-events-none group-hover:pointer-events-auto`}
      >
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full shadow-lg backdrop-blur-md">
          {QUICK_EMOJIS.map((emoji) => {
            const hasReacted = message.reactions?.some(
              (r) => r.userId === currentUser.id && r.emoji === emoji
            );

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowExtendedPicker(false);
                }}
                className={`p-1 rounded-full text-sm hover:scale-130 active:scale-90 transition-transform cursor-pointer ${
                  hasReacted ? 'bg-indigo-100' : ''
                }`}
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowExtendedPicker(!showExtendedPicker)}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="More emoji reactions"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

          {/* Forward Action */}
          <button
            type="button"
            onClick={() => onForward?.(message)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Forward message to another chat"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Pin / Unpin Action */}
          <button
            type="button"
            onClick={() => onPin?.(message.id, !message.isPinned)}
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              message.isPinned
                ? 'text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
            }`}
            title={message.isPinned ? 'Unpin message' : 'Pin message to top'}
          >
            {message.isPinned ? (
              <PinOff className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Pin className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Extended Emoji Reaction Popover */}
        {showExtendedPicker && (
          <div
            className={`absolute top-8 ${
              isMine ? 'right-0' : 'left-0'
            } bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl z-40 w-56 grid grid-cols-7 gap-1 animate-in fade-in zoom-in-95 pointer-events-auto`}
          >
            {EXTENDED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowExtendedPicker(false);
                }}
                className="text-base p-1.5 hover:bg-slate-100 rounded-lg transition-transform hover:scale-125 cursor-pointer text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Touch/Mobile reaction, forward, and pin buttons beside bubble */}
      <div
        className={`self-center flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
          isMine ? 'order-first mr-1' : 'ml-1'
        }`}
      >
        <button
          type="button"
          onClick={() => setShowExtendedPicker(!showExtendedPicker)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl cursor-pointer"
          title="Add reaction"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onForward?.(message)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
          title="Forward message"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPin?.(message.id, !message.isPinned)}
          className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
            message.isPinned
              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200/60'
          }`}
          title={message.isPinned ? 'Unpin message' : 'Pin message'}
        >
          {message.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
