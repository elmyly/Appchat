/**
 * Aura Social - Client-Side Canvas Image Compression Utility
 * Provides high-performance, high-fidelity image compression before network transmission.
 */

export interface ImageCompressionOptions {
  /** Maximum allowable width in pixels (aspect ratio is preserved). Defaults to 1920. */
  maxWidth?: number;
  /** Maximum allowable height in pixels (aspect ratio is preserved). Defaults to 1920. */
  maxHeight?: number;
  /** Quality level between 0.1 and 1.0. Defaults to 0.82. */
  quality?: number;
  /** Target MIME format. Defaults to 'image/jpeg' with white background for transparency. */
  mimeType?: 'image/jpeg' | 'image/webp';
  /** Optional target maximum size in Megabytes (adaptive quality reduction). */
  maxSizeMB?: number;
  /** Whether to preserve animated GIFs instead of flattening them to a single JPEG frame. Defaults to true. */
  preserveGif?: boolean;
  /** Whether to preserve SVG vector files without rasterization. Defaults to true. */
  preserveSvg?: boolean;
}

export interface CompressedImageResult {
  /** Base64 Data URL for instant preview and upload payloads */
  dataUrl: string;
  /** Resulting binary Blob */
  blob: Blob;
  /** Standard File object ready for FormData or client-side storage */
  file: File;
  /** Final pixel width */
  width: number;
  /** Final pixel height */
  height: number;
  /** Width-to-Height ratio (e.g. 1.777 for 16:9, 0.8 for 4:5 portrait) */
  aspectRatio: number;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Percentage of bytes saved (0 to 100) */
  savedPercentage: number;
  /** Output MIME type */
  mimeType: string;
  /** Informative summary string (e.g., "1.8 MB → 340 KB (81% saved)") */
  summary: string;
}

/**
 * Format bytes into human-readable strings like '1.2 MB' or '450 KB'
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * Determines whether the given file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|heic)$/i.test(file.name);
}

/**
 * Reads a File into a Data URL without modification
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Load an image from an Object URL or Data URL to read intrinsic dimensions
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image into DOM element'));
    img.src = src;
  });
}

/**
 * Approximate byte length of a base64 Data URL
 */
function estimateDataUrlBytes(dataUrl: string): number {
  const base64Part = dataUrl.split(',')[1] || '';
  const padding = (base64Part.match(/=/g) || []).length;
  return Math.floor((base64Part.length * 3) / 4) - padding;
}

/**
 * Compress an image file using an HTML5 Canvas approach.
 * Handles downscaling, format conversion, adaptive quality, and transparency preservation.
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    mimeType = 'image/jpeg',
    maxSizeMB,
    preserveGif = true,
    preserveSvg = true,
  } = options;

  const originalSize = file.size;

  // 1. Check for Animated GIF preservation
  if (file.type === 'image/gif' && preserveGif) {
    const dataUrl = await readFileAsDataUrl(file);
    let width = 800;
    let height = 600;
    try {
      const img = await loadImage(dataUrl);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
    } catch {
      // keep defaults
    }
    const aspectRatio = Number((width / Math.max(1, height)).toFixed(3));
    return {
      dataUrl,
      blob: file,
      file,
      width,
      height,
      aspectRatio,
      originalSize,
      compressedSize: originalSize,
      savedPercentage: 0,
      mimeType: file.type,
      summary: `${formatBytes(originalSize)} (GIF preserved)`,
    };
  }

  // 2. Check for SVG vector preservation
  if (file.type === 'image/svg+xml' && preserveSvg) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      blob: file,
      file,
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
      originalSize,
      compressedSize: originalSize,
      savedPercentage: 0,
      mimeType: file.type,
      summary: `${formatBytes(originalSize)} (Vector SVG preserved)`,
    };
  }

  // 3. Create an Object URL to draw into Canvas
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
      throw new Error('Image has zero dimensions');
    }

    const aspectRatio = Number((naturalWidth / naturalHeight).toFixed(3));

    // Calculate scaled dimensions while preserving aspect ratio
    let targetWidth = naturalWidth;
    let targetHeight = naturalHeight;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const widthRatio = maxWidth / targetWidth;
      const heightRatio = maxHeight / targetHeight;
      const scalingFactor = Math.min(widthRatio, heightRatio);

      targetWidth = Math.round(targetWidth * scalingFactor);
      targetHeight = Math.round(targetHeight * scalingFactor);
    }

    // Ensure dimensions are at least 1px
    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    // Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', {
      alpha: mimeType === 'image/webp',
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }

    // For JPEG output, fill canvas with white background so transparent PNGs/WebPs don't get black background
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // High quality bicubic resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Initial compression
    let currentQuality = Math.max(0.1, Math.min(1.0, quality));
    let dataUrl = canvas.toDataURL(mimeType, currentQuality);

    // Adaptive step-down if maxSizeMB is provided
    if (maxSizeMB && maxSizeMB > 0) {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      let estimatedBytes = estimateDataUrlBytes(dataUrl);
      let attempts = 0;

      while (estimatedBytes > maxSizeBytes && currentQuality > 0.45 && attempts < 4) {
        currentQuality = Math.max(0.4, currentQuality - 0.12);
        dataUrl = canvas.toDataURL(mimeType, currentQuality);
        estimatedBytes = estimateDataUrlBytes(dataUrl);
        attempts++;
      }
    }

    // Convert canvas to Blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            // Fallback: convert dataURL to Blob
            const byteString = atob(dataUrl.split(',')[1]);
            const mime = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mime }));
          }
        },
        mimeType,
        currentQuality
      );
    });

    const compressedSize = blob.size;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercentage = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    // Build replacement File object
    const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
    const cleanName = file.name.replace(/\.[^/.]+$/, '') + ext;
    const compressedFile = new File([blob], cleanName, { type: mimeType });

    const summary =
      savedPercentage > 0
        ? `${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savedPercentage}% saved)`
        : `${formatBytes(compressedSize)}`;

    return {
      dataUrl,
      blob,
      file: compressedFile,
      width: targetWidth,
      height: targetHeight,
      aspectRatio,
      originalSize,
      compressedSize,
      savedPercentage,
      mimeType,
      summary,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses multiple images sequentially or concurrently with an optional progress callback
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<CompressedImageResult[]> {
  const results: CompressedImageResult[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isImageFile(file)) {
      const result = await compressImage(file, options);
      results.push(result);
    }
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}
