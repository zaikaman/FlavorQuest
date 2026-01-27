'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUploader } from './ImageUploader';
import { TTSGenerator } from './TTSGenerator';
import type { POI } from '@/lib/types/index';

interface POIFormProps {
    initialData?: Partial<POI>;
    isNew?: boolean;
}

const LANGUAGES = [
    { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: 'Japanese (日本語)' },
    { code: 'fr', label: 'French (Français)' },
    { code: 'ko', label: 'Korean (한국어)' },
    { code: 'zh', label: 'Chinese (中文)' },
];

export function POIForm({ initialData, isNew = false }: POIFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<POI>>(initialData || {
        lat: 10.759,
        lng: 106.705,
        priority: 1,
        radius: 20,
        name_vi: '',
        description_vi: '',
    });
    const [activeTab, setActiveTab] = useState('vi');
    const [translating, setTranslating] = useState(false);
    const [genAllLoading, setGenAllLoading] = useState(false);

    const handleChange = (field: keyof POI, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isNew ? '/api/pois' : `/api/pois/${formData.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Save failed');

            alert('Lưu địa điểm thành công!');
            router.push('/admin/pois');
            router.refresh();
        } catch (error) {
            console.error('Error saving POI:', error);
            alert('Lỗi khi lưu địa điểm');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoTranslate = async () => {
        if (!formData.name_vi && !formData.description_vi) {
            alert('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
            return;
        }

        setTranslating(true);
        try {
            let updates: any = {};

            // Translate Name
            if (formData.name_vi) {
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: formData.name_vi }),
                });
                if (res.ok) {
                    const translations = await res.json();
                    LANGUAGES.forEach(lang => {
                        if (lang.code !== 'vi' && translations[lang.code]) {
                            updates[`name_${lang.code}`] = translations[lang.code];
                        }
                    });
                }
            }

            // Translate Description
            if (formData.description_vi) {
                const res = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: formData.description_vi }),
                });
                if (res.ok) {
                    const translations = await res.json();
                    LANGUAGES.forEach(lang => {
                        if (lang.code !== 'vi' && translations[lang.code]) {
                            updates[`description_${lang.code}`] = translations[lang.code];
                        }
                    });
                }
            }

            setFormData(prev => ({ ...prev, ...updates }));
            alert('Dịch tự động thành công! Vui lòng kiểm tra lại nội dung.');
        } catch (error) {
            console.error('Translate error:', error);
            alert('Lỗi khi dịch tự động');
        } finally {
            setTranslating(false);
        }
    };

    const handleGenerateAllAudio = async () => {
        if (!confirm('Bạn có chắc muốn tạo audio cho tất cả ngôn ngữ? Việc này có thể mất vài phút.')) return;

        setGenAllLoading(true);
        try {
            const updates: any = {};

            for (const lang of LANGUAGES) {
                const text = formData[`description_${lang.code}` as keyof POI] as string;
                if (!text) continue;

                // Skip if audio already exists? Maybe not, allow overwrite.

                try {
                    const res = await fetch('/api/tts/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text,
                            languageCode: lang.code,
                            poiId: formData.id,
                            fieldName: `audio_url_${lang.code}`,
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        updates[`audio_url_${lang.code}`] = data.url;
                    }
                } catch (err) {
                    console.error(`Failed to generate audio for ${lang.code}`, err);
                }
            }

            setFormData(prev => ({ ...prev, ...updates }));
            alert('Đã hoàn tất tạo audio cho các ngôn ngữ!');
        } catch (error) {
            console.error('Generate all audio error:', error);
            alert('Có lỗi xảy ra khi tạo audio hàng loạt.');
        } finally {
            setGenAllLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-background-dark/50 p-6 rounded-xl border border-white/10">

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Thông tin cơ bản</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Hình ảnh</label>
                        <ImageUploader
                            currentImageUrl={formData.image_url}
                            onImageUploaded={(url) => handleChange('image_url', url)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Vĩ độ (Latitude)</label>
                            <input
                                type="number" step="any" required
                                value={formData.lat}
                                onChange={e => handleChange('lat', parseFloat(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Kinh độ (Longitude)</label>
                            <input
                                type="number" step="any" required
                                value={formData.lng}
                                onChange={e => handleChange('lng', parseFloat(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Bán kính (m)</label>
                            <input
                                type="number"
                                value={formData.radius}
                                onChange={e => handleChange('radius', parseInt(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Độ ưu tiên</label>
                            <input
                                type="number"
                                value={formData.priority}
                                onChange={e => handleChange('priority', parseInt(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Localization */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Nội dung đa ngôn ngữ</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleAutoTranslate}
                                disabled={translating}
                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {translating ? (
                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[16px]">translate</span>
                                )}
                                Dịch tự động (AI)
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateAllAudio}
                                disabled={genAllLoading}
                                className="px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {genAllLoading ? (
                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[16px]">podcasts</span>
                                )}
                                Tạo Audio tất cả
                            </button>
                        </div>
                    </div>

                    {/* Language Tabs */}
                    <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setActiveTab(lang.code)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === lang.code
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>

                    {/* Localized Fields */}
                    {LANGUAGES.map(lang => (
                        <div key={lang.code} className={activeTab === lang.code ? 'block space-y-4' : 'hidden'}>
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Tên ({lang.code})</label>
                                <input
                                    type="text"
                                    value={formData[`name_${lang.code}` as keyof POI] as string || ''}
                                    onChange={e => handleChange(`name_${lang.code}` as keyof POI, e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder={`Tên địa điểm (${lang.label})`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">Mô tả chi tiết ({lang.code})</label>
                                <textarea
                                    rows={4}
                                    value={formData[`description_${lang.code}` as keyof POI] as string || ''}
                                    onChange={e => handleChange(`description_${lang.code}` as keyof POI, e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder={`Mô tả chi tiết để tạo audio...`}
                                />

                                {/* TTS Generator */}
                                <TTSGenerator
                                    text={formData[`description_${lang.code}` as keyof POI] as string || ''}
                                    languageCode={lang.code}
                                    currentAudioUrl={formData[`audio_url_${lang.code}` as keyof POI] as string}
                                    onAudioGenerated={(url) => handleChange(`audio_url_${lang.code}` as keyof POI, url)}
                                    poiId={formData.id}
                                    fieldName={`audio_url_${lang.code}`}
                                />
                            </div>
                        </div>
                    ))}

                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                    Hủy bỏ
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                    {loading ? 'Đang lưu...' : 'Lưu địa điểm'}
                </button>
            </div>
        </form>
    );
}
