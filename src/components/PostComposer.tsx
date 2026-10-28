import React, { useState, useRef } from 'react';
import {
  Image,
  BarChart2,
  Smile,
  Globe,
  Users,
  Lock,
  X,
  Send,
  Plus,
  Trash2,
  MapPin,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { compressImages, formatBytes, isImageFile } from '../utils/imageCompression';

const COMMON_EMOJIS = [
  '😀', '😂', '🔥', '✨', '💜', '🚀', '💯', '👏',
  '🙌', '😍', '🎉', '💡', '📸', '🎨', '⚡', '🫡',
];

const CATEGORIES = [
  'General',
  'Technology',
  'Design',
  'Photography',
  'Architecture',
  'Art',
  'Nature',
  'Travel',
  'Lifestyle',
];

interface CompressedMediaItem {
  url: string;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  dimensions: string;
}

interface PostComposerProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onSuccess, isModal }) => {
  const { user } = useAuth();
  const { createPost } = useSocial();

  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<CompressedMediaItem[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDays, setPollDays] = useState(3);
  const [category, setCategory] = useState('General');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [locationTag, setLocationTag] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  const processFiles = async (filesList: FileList | File[]) => {
    setErrorMessage(null);
    const rawFiles = Array.from(filesList).filter(isImageFile);

    if (rawFiles.length === 0) {
      setErrorMessage('Please select valid image files (PNG, JPG, WebP, GIF, or SVG).');
      return;
    }

    const availableSlots = 4 - mediaItems.length;
    if (availableSlots <= 0) {
      setErrorMessage('You can attach a maximum of 4 images per post.');
      return;
    }

    const filesToProcess = rawFiles.slice(0, availableSlots);

    // Filter out absurdly huge files > 30MB
    const oversized = filesToProcess.find((f) => f.size > 30 * 1024 * 1024);
    if (oversized) {
      setErrorMessage(`File "${oversized.name}" exceeds 30MB.`);
      return;
    }

    setIsCompressing(true);
    try {
      const results = await compressImages(filesToProcess, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.82,
        mimeType: 'image/jpeg',
        maxSizeMB: 1.0,
      });

      const newItems: CompressedMediaItem[] = results.map((r) => ({
        url: r.dataUrl,
        originalSize: r.originalSize,
        compressedSize: r.compressedSize,
        savedPercentage: r.savedPercentage,
        dimensions: `${r.width}×${r.height}`,
      }));

      setMediaItems((prev) => [...prev, ...newItems].slice(0, 4));
    } catch (err: any) {
      console.error('Image compression error:', err);
      setErrorMessage('Failed to optimize some images. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions((prev) => [...prev, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && mediaItems.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let pollPayload = undefined;
      if (showPoll && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) {
        pollPayload = {
          question: pollQuestion.trim(),
          options: pollOptions.filter((o) => o.trim()),
          days: pollDays,
        };
      }

      const mediaUrls = mediaItems.map((m) => m.url);

      const post = await createPost({
        content: trimmed,
        mediaUrls,
        poll: pollPayload,
        category,
        visibility,
        locationTag: locationTag.trim() || undefined,
      });

      if (post) {
        setContent('');
        setMediaItems([]);
        setShowPoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setLocationTag('');
        setShowLocationInput(false);
        setShowEmojiPicker(false);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error publishing post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const charLimit = 500;
  const charsLeft = charLimit - content.length;

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white rounded-3xl border transition-all ${
        isDragging
          ? 'border-[#5036FF] ring-2 ring-[#5036FF]/20 bg-indigo-50/20'
          : 'border-slate-200 shadow-sm'
      } ${isModal ? 'p-0 border-0 shadow-none' : 'p-4 mb-4'}`}
    >
      {errorMessage && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* User avatar */}
        <img
          src={
            user.avatar ||
            `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`
          }
          alt={user.displayName}
          className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0 mt-1 shadow-2xs"
        />

        <div className="flex-1 min-w-0">
          {/* Text input area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
            placeholder={
              isDragging
                ? 'Drop your images here to compress and attach...'
                : "What's happening? Share thoughts, inspiration, or visuals..."
            }
            rows={isModal ? 4 : 3}
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none"
          />

          {/* Location tag badge if active */}
          {locationTag && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-[#5036FF] rounded-full text-xs font-medium mb-3">
              <MapPin className="w-3 h-3" />
              <span>{locationTag}</span>
              <button
                type="button"
                onClick={() => setLocationTag('')}
                className="hover:text-rose-600 ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Compressing indicator */}
          {isCompressing && (
            <div className="mb-3 p-2.5 bg-[#5036FF]/5 border border-[#5036FF]/20 rounded-2xl flex items-center gap-2.5 text-xs text-[#5036FF] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Compressing and optimizing images via HTML5 Canvas...</span>
            </div>
          )}

          {/* Media previews with compression badges */}
          {mediaItems.length > 0 && (
            <div
              className={`grid gap-2 mb-3 ${
                mediaItems.length === 1
                  ? 'grid-cols-1'
                  : mediaItems.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {mediaItems.map((item, i) => (
                <div
                  key={i}
                  className="relative group rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-200 shadow-2xs"
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                  
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer shadow-md"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Canvas Compression Badge */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] text-white flex items-center gap-1 font-medium shadow-sm">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    {item.savedPercentage > 0 ? (
                      <span className="text-emerald-300 font-bold">-{item.savedPercentage}%</span>
                    ) : (
                      <span>Optimized</span>
                    )}
                    <span className="text-slate-300 font-mono">
                      {formatBytes(item.compressedSize)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Poll Builder Box */}
          {showPoll && (
            <div className="mb-3 p-3.5 bg-slate-50 border border-indigo-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-[#5036FF]" /> Interactive Poll
                </span>
                <button
                  type="button"
                  onClick={() => setShowPoll(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Remove Poll
                </button>
              </div>

              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5036FF]"
              />

              <div className="space-y-1.5">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5036FF]"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                {pollOptions.length < 4 ? (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="text-xs font-semibold text-[#5036FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                ) : (
                  <div />
                )}

                <select
                  value={pollDays}
                  onChange={(e) => setPollDays(parseInt(e.target.value, 10))}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
                >
                  <option value={1}>1 Day Duration</option>
                  <option value={3}>3 Days Duration</option>
                  <option value={7}>7 Days Duration</option>
                </select>
              </div>
            </div>
          )}

          {/* Location Input Flyout */}
          {showLocationInput && (
            <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 animate-in fade-in duration-150">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value)}
                placeholder="Where are you? (e.g. San Francisco, CA or Tokyo, Japan)"
                className="flex-1 text-xs bg-transparent focus:outline-none text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowLocationInput(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 cursor-pointer font-medium"
              >
                Done
              </button>
            </div>
          )}

          {/* Emoji Picker Flyout */}
          {showEmojiPicker && (
            <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1.5 animate-in fade-in duration-150">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-xl text-base transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 my-2" />

          {/* Action toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 text-[#5036FF]">
              {/* Media input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleMediaUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaItems.length >= 4 || isCompressing}
                className={`p-2 rounded-xl transition-colors ${
                  mediaItems.length >= 4 || isCompressing
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-[#5036FF] hover:bg-[#5036FF]/10 cursor-pointer'
                }`}
                title="Add Images (Auto-compressed)"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowPoll(!showPoll)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showPoll ? 'bg-[#5036FF]/10 text-[#5036FF]' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Create a Poll"
              >
                <BarChart2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Insert Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showLocationInput ? 'bg-[#5036FF]/10 text-[#5036FF]' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title="Add Location Tag"
              >
                <MapPin className="w-4 h-4" />
              </button>

              {/* Category selector */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none ml-1 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Visibility selector */}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none ml-1 cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="private">Only Me</option>
              </select>
            </div>

            {/* Submit & Character Counter */}
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono font-medium ${
                  charsLeft < 20 ? 'text-rose-500 font-bold' : 'text-slate-400'
                }`}
              >
                {charsLeft}
              </span>

              <button
                type="submit"
                disabled={(!content.trim() && mediaItems.length === 0) || isSubmitting || isCompressing}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  (content.trim() || mediaItems.length > 0) && !isCompressing
                    ? 'bg-[#5036FF] hover:bg-[#432bdb] text-white cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
