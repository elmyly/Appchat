import React, { useState, useRef } from 'react';
import { X, Layers, Lock, Globe, Upload, Image, Zap, Loader2 } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { compressImage, formatBytes } from '../utils/imageCompression';

interface CreateBoardModalProps {
  onClose: () => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose }) => {
  const { createBoard } = useSocial();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionSummary, setCompressionSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const result = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.84,
        mimeType: 'image/jpeg',
      });
      setCoverImage(result.dataUrl);
      setCompressionSummary(
        result.savedPercentage > 0
          ? `${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (-${result.savedPercentage}%)`
          : formatBytes(result.compressedSize)
      );
    } catch (err) {
      console.error('Error compressing board cover:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const b = await createBoard({
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage.trim() || undefined,
        isPrivate,
      });
      if (b) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Board</h3>
              <p className="text-xs text-slate-500">Organize your visual discoveries into a collection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Board Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Dream Cars, UI/UX Inspiration"
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board about?"
              rows={2}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF] resize-none"
            />
          </div>

          {/* Cover image input & file upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Cover Image (optional)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="text-[11px] font-semibold text-[#5036FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                Upload Photo
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {coverImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 mb-2 border border-slate-200 group">
                <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage('');
                    setCompressionSummary(null);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {compressionSummary && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] text-white flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span className="font-mono text-emerald-300">{compressionSummary}</span>
                  </div>
                )}
              </div>
            ) : isCompressing ? (
              <div className="rounded-2xl aspect-video bg-slate-50 border-2 border-dashed border-[#5036FF]/40 flex flex-col items-center justify-center text-center p-4 mb-2 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin text-[#5036FF] mb-1" />
                <span className="text-[11px] text-slate-600 font-medium">Compressing cover image...</span>
              </div>
            ) : null}

            <input
              type="url"
              value={coverImage.startsWith('data:') ? '' : coverImage}
              onChange={(e) => {
                setCoverImage(e.target.value);
                setCompressionSummary(null);
              }}
              placeholder="Or paste https://example.com/cover.jpg"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="w-4 h-4 text-amber-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {isPrivate ? 'Secret Board' : 'Public Board'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {isPrivate ? 'Only you and invited collaborators can view' : 'Anyone on Aura can view and follow'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isPrivate ? 'bg-[#5036FF]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting || isCompressing}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${
                name.trim() && !isCompressing
                  ? 'bg-[#5036FF] hover:bg-[#432bdb] text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Creating...' : isCompressing ? 'Compressing...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
