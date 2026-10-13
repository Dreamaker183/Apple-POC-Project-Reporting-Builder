/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ImageAssetInput } from '../../types/report';
import { UploadCloud, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';

interface Props {
  images: ImageAssetInput[];
  onChange: (images: ImageAssetInput[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const ImageUploader: React.FC<Props> = ({ images, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(`Unsupported format: ${file.type}. Allowed: PNG, JPEG, WebP, SVG.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`File exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newImage: ImageAssetInput = {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        dataUrl,
        altText: `Preview image for ${file.name.replace(/\.[^/.]+$/, '')}`,
        fileSize: file.size,
        fileType: file.type,
      };
      onChange([...images, newImage]);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const handleUpdateAltText = (id: string, altText: string) => {
    onChange(images.map((img) => (img.id === id ? { ...img, altText } : img)));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${
          dragOver
            ? 'border-[#0071E3] bg-[#0071E3]/5'
            : 'border-black/15 hover:border-black/30 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center text-[#727272]">
            <UploadCloud className="w-5 h-5 text-[#0071E3]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#1F1F1F]">
              Click to upload or drag & drop
            </span>
            <p className="text-[11px] text-[#727272] mt-0.5">
              PNG, JPEG, WebP, or SVG (up to 5MB)
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Images List */}
      <div className="space-y-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="p-3 bg-white rounded-lg border border-black/[0.08] space-y-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-md overflow-hidden bg-neutral-100 border border-black/10 flex items-center justify-center shrink-0">
                <img
                  src={img.dataUrl}
                  alt={img.altText}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#1F1F1F] truncate" title={img.name}>
                  {img.name}
                </div>
                <div className="text-[11px] text-[#727272]">
                  {(img.fileSize / 1024).toFixed(1)} KB · {img.fileType.split('/')[1]?.toUpperCase()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(img.id)}
                className="p-1.5 text-[#727272] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors shrink-0"
                aria-label={`Remove image ${img.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Editable Alternative Text */}
            <div>
              <label className="text-[11px] font-medium text-[#727272] block mb-1">
                Accessibility Alt Text (WCAG AA):
              </label>
              <input
                type="text"
                value={img.altText}
                onChange={(e) => handleUpdateAltText(img.id, e.target.value)}
                placeholder="Describe this image for screen readers"
                className="w-full text-xs p-1.5 border border-black/15 rounded focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
