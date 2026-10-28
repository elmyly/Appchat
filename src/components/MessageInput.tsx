import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Smile,
  X,
  Image,
  FileText,
  Lock,
} from 'lucide-react';
import { FileMeta } from '../types';
import { AudioRecorder } from './AudioRecorder';

interface MessageInputProps {
  onSendMessage: (text: string, type?: 'text' | 'image' | 'file' | 'audio', fileMeta?: FileMeta) => void;
  onTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪',
  '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⚡', '💥', '🎉', '🎊', '🚀', '🔒', '🛡️', '🔑',
];

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping }) => {
  const [text, setText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    dataUrl: string;
    isImage: boolean;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim().length > 0) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2500);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith('image/');
      setPendingFile({ file, dataUrl, isImage });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;

    if (pendingFile) {
      const type = pendingFile.isImage ? 'image' : 'file';
      const fileMeta: FileMeta = {
        name: pendingFile.file.name,
        size: pendingFile.file.size,
        mimeType: pendingFile.file.type,
        dataUrl: pendingFile.dataUrl,
      };

      onSendMessage(trimmed || (pendingFile.isImage ? '[IMAGE]' : '[FILE]'), type, fileMeta);
      setPendingFile(null);
    } else {
      onSendMessage(trimmed, 'text');
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setText('');
    onTyping(false);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSendAudio = (audioMeta: FileMeta) => {
    onSendMessage('[AUDIO]', 'audio', audioMeta);
    setIsRecordingAudio(false);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (isRecordingAudio) {
    return (
      <div className="p-3 bg-white border-t border-slate-200">
        <AudioRecorder
          onSendAudio={handleSendAudio}
          onCancel={() => setIsRecordingAudio(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative p-3 bg-white border-t border-slate-200">
      {/* Pending File Attachment Preview Banner */}
      {pendingFile && (
        <div className="mb-2 p-2 bg-slate-50 border border-indigo-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {pendingFile.isImage ? (
              <img
                src={pendingFile.dataUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg ring-1 ring-slate-200"
              />
            ) : (
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate block">
                {pendingFile.file.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {(pendingFile.file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xl max-w-xs w-72 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-bold text-slate-700">Quick Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-lg p-1 hover:bg-slate-100 rounded-lg transition-transform hover:scale-125 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2 bg-slate-100/80 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-2xl p-1.5 shadow-xs transition-colors">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Attach Image or File"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Send an encrypted message..."
          rows={1}
          className="flex-1 bg-transparent border-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none py-2 px-1 max-h-32 min-h-[38px]"
        />

        {/* Voice Note / Send Button */}
        {text.trim() || pendingFile ? (
          <button
            type="button"
            onClick={handleSend}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm shadow-indigo-600/30 shrink-0 cursor-pointer"
            title="Send Encrypted Message"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecordingAudio(true)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
