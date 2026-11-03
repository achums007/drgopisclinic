'use client';

import React, { useState, useRef } from 'react';
import { optimizeImage, CompressionResult } from '@/lib/image-optimizer';

interface ImageUploadProps {
  label: string;
  sublabel?: string;
  initialImageUrl?: string;
  onImageSelected: (result: CompressionResult | null) => void;
  maxSizeMB?: number;
}

export default function ImageUpload({
  label,
  sublabel,
  initialImageUrl,
  onImageSelected,
  maxSizeMB = 1.5,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isWarningAlert, setIsWarningAlert] = useState(false);
  const [stats, setStats] = useState<{
    originalSize: string;
    compressedSize: string;
    reduction: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      setWarningMessage('❌ Selected file is not an image. Please choose a JPG, PNG, or WEBP file.');
      setIsWarningAlert(true);
      return;
    }

    setIsProcessing(true);
    setStats(null);

    try {
      const result = await optimizeImage(
        file,
        { maxSizeMB, vercelLimitMB: 4.0 },
        (msg, isWarn) => {
          setWarningMessage(msg);
          setIsWarningAlert(isWarn);
        }
      );

      setPreviewUrl(result.dataUri);
      setStats({
        originalSize: (result.originalSize / (1024 * 1024)).toFixed(2) + ' MB',
        compressedSize: (result.compressedSize / 1024).toFixed(1) + ' KB',
        reduction: result.reductionPercentage,
      });

      if (result.wasCompressed) {
        setWarningMessage(
          `⚠️ High-resolution image was automatically compressed to stay under Vercel payload limits (Reduced by ${result.reductionPercentage}%).`
        );
        setIsWarningAlert(true);
      } else {
        setWarningMessage('✅ Image verified and ready for upload.');
        setIsWarningAlert(false);
      }

      onImageSelected(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process image.';
      setWarningMessage(`❌ ${message}`);
      setIsWarningAlert(true);
      onImageSelected(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setWarningMessage(null);
    setStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImageSelected(null);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </label>
        {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
      </div>

      {/* Warning / Status Banner */}
      {warningMessage && (
        <div
          role="alert"
          className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 transition-all ${
            isWarningAlert
              ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
          }`}
        >
          <span className="shrink-0 text-base">{isWarningAlert ? '⚠️' : '✅'}</span>
          <div className="flex-1 leading-relaxed">
            <p className="font-semibold">{warningMessage}</p>
            {stats && (
              <p className="text-[11px] mt-1 text-gray-600 dark:text-gray-300">
                Original: <span className="font-mono">{stats.originalSize}</span> → Optimized:{' '}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.compressedSize}
                </span>{' '}
                ({stats.reduction}% reduction)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload Dropzone / Preview Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          previewUrl
            ? 'border-emerald-400/50 bg-emerald-50/20 hover:bg-emerald-50/40 dark:border-emerald-800'
            : 'border-gray-300 hover:border-emerald-500 bg-gray-50/50 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm shrink-0 bg-white dark:bg-gray-800">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-left space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Image Selected & Optimized
              </p>
              <p className="text-xs text-gray-500">
                Click anywhere to replace this image with another file.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="mt-2 inline-flex items-center text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl">
              📁
            </div>
            <div className="text-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Click to upload an image
              </span>{' '}
              or drag and drop
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, WEBP • Auto-compressed if above Vercel payload limit
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Resizing & compressing image...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
