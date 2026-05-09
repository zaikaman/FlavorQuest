'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const MAX_UPLOAD_IMAGE_WIDTH = 1600;
const MAX_UPLOAD_IMAGE_HEIGHT = 1200;
const JPEG_QUALITY = 0.82;
const DIRECT_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  folder?: string;
}

function getFileExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension) {
    return extension;
  }

  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';

  return 'jpg';
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Không thể xử lý ảnh.'));
      },
      type,
      quality
    );
  });
}

async function normalizeImageForUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Tệp được chọn không phải là ảnh.');
  }

  const image = new window.Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể đọc ảnh.'));
      image.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_UPLOAD_IMAGE_WIDTH / image.naturalWidth,
      MAX_UPLOAD_IMAGE_HEIGHT / image.naturalHeight
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    if (scale === 1 && file.size <= DIRECT_UPLOAD_LIMIT_BYTES) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Không thể xử lý ảnh.');
    }

    context.drawImage(image, 0, 0, width, height);
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(
      canvas,
      outputType,
      outputType === 'image/jpeg' ? JPEG_QUALITY : undefined
    );
    const extension = outputType === 'image/jpeg' ? 'jpg' : getFileExtension(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';

    return new File([blob], `${baseName}.${extension}`, { type: outputType });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);

    setIsUploading(true);

    try {
      const uploadFile = await normalizeImageForUpload(file);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('bucket', 'images');
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const responseText = await res.text();
        let message = 'Tải lên thất bại';

        try {
          const errorData = JSON.parse(responseText) as { error?: string };
          message = errorData.error || message;
          console.error('Upload failed response:', errorData);
        } catch {
          console.error('Upload failed response:', responseText);
        }

        throw new Error(message);
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        throw new Error('Tải lên thất bại');
      }

      onImageUploaded(data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi tải ảnh');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
