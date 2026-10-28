import React, { useState, useRef } from 'react';
import { X, Upload, Image, Layers, Sparkles, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { compressImage, CompressedImageResult, formatBytes } from '../utils/imageCompression';

const CATEGORIES = [
  'Technology',
  'Design',
  'Photography',
  'Architecture',
  'Art',
  'Nature',
  'Travel',
  'Fashion',
  'Cars',
  'Lifestyle',
  'Gaming',
  'Food',
];

interface UploadVisualModalProps {
  onClose: () => void;
}

export const UploadVisualModal: React.FC<UploadVisualModalProps> = ({ onClose }) => {
  const { createVisual, boards } = useSocial();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<number>(1.0);
  const [category, setCategory] = useState('Design');
  const [tags, setTags] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressedImageResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processImageFile = async (file: File) => {
    setErrorMessage(null);

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP, GIF, or SVG).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25MB limit.');
      return;
    }

    setIsCompressing(true);
    try {
      const result = await compressImage(file, {
        maxWidth: 2400,
        maxHeight: 2400,
        quality: 0.85,
        mimeType: 'image/jpeg',
        maxSizeMB: 1.5,
      });

      setImageUrl(result.dataUrl);
      setAspectRatio(result.aspectRatio);
      setCompressionResult(result);
    } catch (err: any) {
      console.error('Canvas compression error:', err);
      setErrorMessage('Unable to optimize image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setCompressionResult(null);
    setErrorMessage(null);

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setAspectRatio(Number((img.naturalWidth / img.naturalHeight).toFixed(3)));
        }
      };
      img.src = url;
    }
  };

  const handleClearImage = () => {
    setImageUrl('');
    setCompressionResult(null);
    setAspectRatio(1.0);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const tagList = tags
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await createVisual({
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        aspectRatio,
        category,
        tags: tagList,
        boardId: selectedBoardId || undefined,
      });

      if (res) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload pin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Visual Pin</h3>
              <p className="text-xs text-slate-500">Auto-compressed client-side for ultra-fast visual browsing</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Image Uploader / Preview */}
          {isCompressing ? (
            <div className="rounded-2xl aspect-video bg-slate-50 border-2 border-dashed border-[#5036FF]/40 flex flex-col items-center justify-center text-center p-6 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-[#5036FF]/10 text-[#5036FF] flex items-center justify-center mb-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#5036FF]" />
              </div>
              <p className="text-xs font-bold text-slate-800">Optimizing Image Client-Side...</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Applying canvas downscaling and bicubic resampling for instant loading
              </p>
            </div>
          ) : imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center group shadow-inner">
              <img src={imageUrl} alt="Upload preview" className="w-full h-full object-contain" />
              
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer shadow-md"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Compression feedback badge */}
              {compressionResult && (
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-md rounded-xl p-2.5 text-white flex items-center justify-between border border-white/10 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span>Canvas Optimized</span>
                        {compressionResult.savedPercentage > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                            -{compressionResult.savedPercentage}%
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {formatBytes(compressionResult.originalSize)} → {formatBytes(compressionResult.compressedSize)} • {compressionResult.width}×{compressionResult.height}px
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Aspect Ratio</span>
                    <span className="text-[11px] font-mono font-bold text-indigo-300">
                      {aspectRatio.toFixed(2)} : 1
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#5036FF] bg-indigo-50/60 scale-[1.01]'
                  : 'border-slate-300 hover:border-[#5036FF] bg-slate-50 hover:bg-slate-50/80'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5036FF] flex items-center justify-center mb-2 shadow-2xs">
                <Image className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {isDragging ? 'Drop your image here' : 'Click or drag & drop photo from your device'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                PNG, JPG, WebP, GIF • Automatic client-side canvas compression
              </span>
            </div>
          )}

          {/* Or Paste Image URL */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Or paste Image URL</label>
            <input
              type="url"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modernist Concrete Pavilion"
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about this visual, the aesthetics, the techniques..."
              rows={2}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF] resize-none"
            />
          </div>

          {/* Category & Board Assignment Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Add to Board (optional)</label>
              <select
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
              >
                <option value="">None (Public Stream)</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tags (separated by spaces)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="minimalism architecture photography concrete"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#5036FF]"
            />
          </div>

          {/* Submit */}
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
              disabled={!imageUrl || !title.trim() || isSubmitting || isCompressing}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${
                imageUrl && title.trim() && !isCompressing
                  ? 'bg-[#5036FF] hover:bg-[#432bdb] text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Publishing...' : isCompressing ? 'Compressing...' : 'Publish Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
