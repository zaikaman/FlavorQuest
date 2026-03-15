'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface TTSGeneratorProps {
    text: string;
    languageCode: string; // 'vi', 'en', etc.
    onAudioGenerated: (url: string) => void;
    currentAudioUrl?: string | null;
    poiId?: string;
    fieldName?: string;
}

export function TTSGenerator({
    text,
    languageCode,
    onAudioGenerated,
    currentAudioUrl,
    poiId,
    fieldName,
}: TTSGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(currentAudioUrl || null);
    const toast = useToast();

    useEffect(() => {
        setAudioUrl(currentAudioUrl || null);
    }, [currentAudioUrl]);

    const handleGenerate = async () => {
        if (!text) {
            toast.warning('Vui lòng nhập nội dung trước');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    languageCode: getFullLanguageCode(languageCode),
                    poiId,
                    fieldName,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Tạo âm thanh thất bại');
            }

            const data = await res.json();
            setAudioUrl(data.url);
            onAudioGenerated(data.url);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tạo âm thanh thất bại';
            console.error('TTS Error:', error);
            toast.error(`Lỗi tạo audio: ${message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const getFullLanguageCode = (code: string) => {
        switch (code) {
            case 'vi': return 'vi-VN';
            case 'en': return 'en-US';
            case 'ja': return 'ja-JP';
            case 'fr': return 'fr-FR';
            case 'ko': return 'ko-KR';
            case 'zh': return 'cmn-CN';
            default: return 'en-US';
        }
    };

    return (
        <div className="flex items-center gap-4 mt-2">
            {audioUrl && (
                <audio controls src={audioUrl} className="h-10 w-64 rounded-full bg-gray-100" />
            )}

            <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !text}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang tạo...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                        {audioUrl ? 'Tạo lại âm thanh' : 'Tạo âm thanh'}
                    </>
                )}
            </button>
        </div>
    );
}
