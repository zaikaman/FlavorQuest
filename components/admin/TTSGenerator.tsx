'use client';

import { useState, useEffect } from 'react';

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

    useEffect(() => {
        setAudioUrl(currentAudioUrl || null);
    }, [currentAudioUrl]);

    const handleGenerate = async () => {
        if (!text) {
            alert('Vui lòng nhập nội dung trước');
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
                throw new Error(error.error || 'Generation failed');
            }

            const data = await res.json();
            setAudioUrl(data.url);
            onAudioGenerated(data.url);
        } catch (error: any) {
            console.error('TTS Error:', error);
            alert(`Error: ${error.message}`);
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
                        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                        Đang tạo...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                        {audioUrl ? 'Tạo lại Audio' : 'Tạo Audio'}
                    </>
                )}
            </button>
        </div>
    );
}
