'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  folder?: string;
}

export function ImageUploader({
  currentImageUrl,
  onImageUploaded,
  folder = 'pois',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Xem trước
    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);

    // Tải lên
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'images');
    formData.append('folder', folder);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload failed response:', errorData);
        throw new Error(errorData.error || 'Tải lên thất bại');
      }

      const data = await res.json();
      onImageUploaded(data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Lỗi khi tải ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Area */}
      <div
        className="group hover:border-primary/50 relative flex aspect-video w-full max-w-md cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <Image src={preview} alt="Xem trước" fill unoptimized className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex items-center gap-2 font-medium text-white">
                <span className="material-symbols-outlined">edit</span> Đổi ảnh
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
            <span>Tải ảnh lên</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
