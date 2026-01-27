'use client';

import { useState, useRef } from 'react';

interface ImageUploaderProps {
    currentImageUrl?: string | null;
    onImageUploaded: (url: string) => void;
    folder?: string;
}

export function ImageUploader({ currentImageUrl, onImageUploaded, folder = 'pois' }: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Upload
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
            alert('Lỗi khi tải ảnh');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Preview Area */}
            <div
                className="relative aspect-video w-full max-w-md rounded-xl overflow-hidden bg-gray-900/50 border border-gray-700 flex items-center justify-center cursor-pointer group hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-white font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined">edit</span> Đổi ảnh
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                        <span>Tải ảnh lên</span>
                    </div>
                )}

                {isUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
