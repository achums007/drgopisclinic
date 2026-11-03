/**
 * Client-Side Image Optimizer & Compression Utility
 * 
 * Prevents Vercel 413 "Payload Too Large" errors by resizing and compressing
 * images directly in the browser before network transmission.
 */

export interface CompressionResult {
  file: File;
  dataUri: string;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  reductionPercentage: number;
  mimeType: string;
  dimensions: { width: number; height: number };
}

export interface OptimizationOptions {
  /** Maximum allowed size in megabytes before compression triggers. Default: 1.5 MB */
  maxSizeMB?: number;
  /** Hard cap for Vercel payload limit in megabytes. Default: 4.0 MB */
  vercelLimitMB?: number;
  /** Maximum width in pixels. Default: 1600 */
  maxWidth?: number;
  /** Maximum height in pixels. Default: 1600 */
  maxHeight?: number;
  /** Initial compression quality (0.1 to 1.0). Default: 0.82 */
  initialQuality?: number;
}

/**
 * Optimizes an image file by resizing dimensions and adjusting JPEG/WebP quality.
 * Guarantees the resulting payload stays comfortably below Vercel's 4.5MB limit.
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {},
  onWarning?: (message: string, isOptimizing: boolean) => void
): Promise<CompressionResult> {
  const maxSizeMB = options.maxSizeMB ?? 1.5;
  const vercelLimitMB = options.vercelLimitMB ?? 4.0;
  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const initialQuality = options.initialQuality ?? 0.82;

  const originalSizeMB = file.size / (1024 * 1024);

  // Notify callback that an image upload/processing is in progress
  if (onWarning) {
    if (originalSizeMB > vercelLimitMB) {
      onWarning(
        `⚠️ Image (${originalSizeMB.toFixed(2)} MB) exceeds Vercel's serverless limit (${vercelLimitMB} MB). Resizing and compressing...`,
        true
      );
    } else if (originalSizeMB > maxSizeMB) {
      onWarning(
        `ℹ️ Image is ${originalSizeMB.toFixed(2)} MB. Optimizing for fast clinic loading...`,
        true
      );
    } else {
      onWarning(
        `ℹ️ Processing image (${originalSizeMB.toFixed(2)} MB)...`,
        false
      );
    }
  }

  // Load the image into an HTMLImageElement
  const imageBitmap = await loadImage(file);
  let { width, height } = imageBitmap;

  // Calculate scaled dimensions while preserving aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas rendering context for image optimization.');
  }

  // Fill transparent areas with white if converting PNG to JPEG
  const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Determine compression quality
  let quality = initialQuality;
  let blob: Blob | null = null;
  let iterations = 0;

  do {
    blob = await canvasToBlob(canvas, targetMime, quality);
    iterations++;

    // If still larger than target, reduce quality and re-render
    if (blob.size / (1024 * 1024) > maxSizeMB && iterations < 5) {
      quality = Math.max(0.4, quality - 0.15);
    } else {
      break;
    }
  } while (iterations < 5);

  const compressedSize = blob.size;
  const wasCompressed = compressedSize < file.size;
  const reductionPercentage = wasCompressed
    ? Math.round(((file.size - compressedSize) / file.size) * 100)
    : 0;

  const dataUri = await blobToDataUrl(blob);
  const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, targetMime === 'image/jpeg' ? '.jpg' : '.png'), {
    type: targetMime,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    dataUri,
    originalSize: file.size,
    compressedSize,
    wasCompressed,
    reductionPercentage,
    mimeType: targetMime,
    dimensions: { width, height },
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image file. Please ensure it is a valid format (PNG, JPG, WEBP).'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob conversion failed.'));
      },
      mimeType,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
