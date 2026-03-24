'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUploader } from './ImageUploader';
import { POILocationPicker } from './POILocationPicker';
import { TTSGenerator } from './TTSGenerator';
import { useToast } from '@/components/ui/ToastProvider';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { POI_CATEGORY_OPTIONS, type POICategoryTag } from '@/lib/constants/poiCategories';
import type { Coordinates, Language, POI } from '@/lib/types/index';

interface POIFormProps {
  initialData?: Partial<POI>;
  isNew?: boolean;
  allowOwnerAssignment?: boolean;
  poiId?: string;
}

interface OwnerOption {
  id: string;
  email: string;
}

type FormValue = string | number | null | undefined;
type LocalizedNameField = `name_${Exclude<Language, 'vi'>}`;
type LocalizedDescriptionField = `description_${Exclude<Language, 'vi'>}`;
type LocalizedAudioField = `audio_url_${Language}`;
type TranslationUpdates = Partial<
  Record<LocalizedNameField | LocalizedDescriptionField | LocalizedAudioField, string>
>;

const LANGUAGES = SUPPORTED_LANGUAGES;

export function POIForm({
  initialData,
  isNew = false,
  allowOwnerAssignment = true,
  poiId,
}: POIFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [formData, setFormData] = useState<Partial<POI>>({
    lat: 10.759,
    lng: 106.705,
    radius: 20,
    name_vi: '',
    description_vi: '',
    ...initialData,
  });
  const [activeTab, setActiveTab] = useState<Language>('vi');
  const [translating, setTranslating] = useState(false);
  const [genAllLoading, setGenAllLoading] = useState(false);

  useEffect(() => {
    if (!allowOwnerAssignment) return;

    const loadOwners = async () => {
      try {
        const res = await fetch('/api/users/owners');
        if (!res.ok) return;
        const data = await res.json();
        setOwners(data ?? []);
      } catch (error) {
        console.error('Load owners failed:', error);
      }
    };

    loadOwners();
  }, [allowOwnerAssignment]);

  const handleChange = (field: keyof POI, value: FormValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = ({ lat, lng }: Coordinates) => {
    setFormData((prev) => ({
      ...prev,
      lat,
      lng,
    }));
  };

  const handleToggleCategory = (category: POICategoryTag) => {
    setFormData((prev) => {
      const currentTags = new Set(prev.category_tags ?? []);

      if (currentTags.has(category)) {
        currentTags.delete(category);
      } else {
        currentTags.add(category);
      }

      return {
        ...prev,
        category_tags: Array.from(currentTags),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const targetPoiId = poiId ?? formData.id;

      if (!isNew && !targetPoiId) {
        throw new Error('Không tìm thấy mã địa điểm để cập nhật');
      }

      const url = isNew ? '/api/pois' : `/api/pois/${targetPoiId}`;
      const method = isNew ? 'POST' : 'PUT';
      const payload = {
        ...formData,
        name_vi: typeof formData.name_vi === 'string' ? formData.name_vi.trim() : '',
        name_en:
          typeof formData.name_en === 'string' && formData.name_en.trim()
            ? formData.name_en.trim()
            : typeof formData.name_vi === 'string'
              ? formData.name_vi.trim()
              : '',
      };

      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.deleted_at;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error || 'Lưu thất bại');
      }

      toast.success('Lưu địa điểm thành công');
      router.push('/admin/pois');
      router.refresh();
    } catch (error) {
      console.error('Error saving POI:', error);
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error('Lỗi khi lưu địa điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!formData.name_vi && !formData.description_vi) {
      toast.warning('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
      return;
    }

    setTranslating(true);
    try {
      const updates: TranslationUpdates = {};

      // Translate Name
      if (formData.name_vi) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formData.name_vi }),
        });
        if (res.ok) {
          const translations = await res.json();
          LANGUAGES.forEach((lang) => {
            if (lang.code !== 'vi' && translations[lang.code]) {
              updates[`name_${lang.code}` as LocalizedNameField] = translations[lang.code];
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
          LANGUAGES.forEach((lang) => {
            if (lang.code !== 'vi' && translations[lang.code]) {
              updates[`description_${lang.code}` as LocalizedDescriptionField] =
                translations[lang.code];
            }
          });
        }
      }

      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success('Dịch tự động thành công. Vui lòng kiểm tra lại nội dung.');
    } catch (error) {
      console.error('Translate error:', error);
      toast.error('Lỗi khi dịch tự động');
    } finally {
      setTranslating(false);
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!confirm('Bạn có chắc muốn tạo audio cho tất cả ngôn ngữ? Việc này có thể mất vài phút.'))
      return;

    setGenAllLoading(true);
    try {
      const updates: TranslationUpdates = {};

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
            updates[`audio_url_${lang.code}` as LocalizedAudioField] = data.url;
          }
        } catch (err) {
          console.error(`Tạo âm thanh thất bại cho ngôn ngữ ${lang.code}`, err);
        }
      }

      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success('Đã hoàn tất tạo audio cho các ngôn ngữ');
    } catch (error) {
      console.error('Generate all audio error:', error);
      toast.error('Có lỗi xảy ra khi tạo audio hàng loạt');
    } finally {
      setGenAllLoading(false);
    }
  };

  const handleAutoTranslateFast = async () => {
    const vietnameseName = typeof formData.name_vi === 'string' ? formData.name_vi.trim() : '';
    const vietnameseDescription =
      typeof formData.description_vi === 'string' ? formData.description_vi.trim() : '';

    if (!vietnameseName && !vietnameseDescription) {
      toast.warning('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: {
            ...(vietnameseName ? { name: vietnameseName } : {}),
            ...(vietnameseDescription ? { description: vietnameseDescription } : {}),
          },
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Dịch tự động thất bại');
      }

      const payload = (await res.json()) as {
        translations?: Record<string, Partial<Record<(typeof LANGUAGES)[number]['code'], string>>>;
      };
      const updates: TranslationUpdates = {};

      LANGUAGES.forEach((lang) => {
        if (lang.code === 'vi') {
          return;
        }

        const translatedName = payload.translations?.name?.[lang.code];
        if (translatedName) {
          updates[`name_${lang.code}` as LocalizedNameField] = translatedName;
        }

        const translatedDescription = payload.translations?.description?.[lang.code];
        if (translatedDescription) {
          updates[`description_${lang.code}` as LocalizedDescriptionField] = translatedDescription;
        }
      });

      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success('Đã cập nhật bản dịch. Vui lòng kiểm tra lại trước khi lưu.');
    } catch (error) {
      console.error('Translate error:', error);
      toast.error('Dịch tự động thất bại');
    } finally {
      setTranslating(false);
    }
  };

  const handleGenerateAllAudioFast = async () => {
    if (
      !confirm(
        'Tạo âm thanh cho toàn bộ ngôn ngữ ngay bây giờ? Với mô tả dài, quá trình này có thể mất vài phút.'
      )
    )
      return;

    setGenAllLoading(true);
    try {
      const items = LANGUAGES.map((lang) => {
        const text = formData[`description_${lang.code}` as keyof POI];
        if (typeof text !== 'string' || text.trim().length === 0) {
          return null;
        }

        return {
          text,
          languageCode: lang.code,
          poiId: formData.id,
          fieldName: `audio_url_${lang.code}`,
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      if (items.length === 0) {
        toast.warning('Chưa có mô tả nào để tạo âm thanh.');
        return;
      }

      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Tạo âm thanh hàng loạt thất bại');
      }

      const payload = (await res.json()) as {
        items?: Array<{ fieldName?: string; url: string }>;
        errors?: Array<{ fieldName?: string; languageCode?: string; error: string }>;
      };
      const updates: TranslationUpdates = {};

      payload.items?.forEach((item) => {
        if (item.fieldName) {
          updates[item.fieldName as LocalizedAudioField] = item.url;
        }
      });

      setFormData((prev) => ({ ...prev, ...updates }));

      if (payload.errors && payload.errors.length > 0) {
        console.error('Generate all audio partial errors:', payload.errors);
        toast.warning(
          `Đã tạo ${payload.items?.length ?? 0} tệp âm thanh, còn ${payload.errors.length} ngôn ngữ cần thử lại.`
        );
      } else {
        toast.success('Đã tạo xong âm thanh cho các ngôn ngữ hiện có.');
      }
    } catch (error) {
      console.error('Generate all audio error:', error);
      toast.error('Tạo âm thanh hàng loạt thất bại');
    } finally {
      setGenAllLoading(false);
    }
  };

  void handleAutoTranslate;
  void handleGenerateAllAudio;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-background-dark/50 space-y-8 rounded-xl border border-white/10 p-6"
    >
      {/* Thông tin cơ bản */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="mb-4 text-lg font-bold text-white">Thông tin cơ bản</h3>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Hình ảnh</label>
            <ImageUploader
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => handleChange('image_url', url)}
            />
          </div>

          {allowOwnerAssignment && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Chủ quán phụ trách
              </label>
              <select
                value={(formData.owner_id as string) || ''}
                onChange={(e) => handleChange('owner_id' as keyof POI, e.target.value || null)}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white"
              >
                <option value="">Chưa gán chủ quán</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">Vĩ độ</label>
              <input
                type="number"
                step="any"
                required
                value={formData.lat}
                onChange={(e) => handleChange('lat', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">Kinh độ</label>
              <input
                type="number"
                step="any"
                required
                value={formData.lng}
                onChange={(e) => handleChange('lng', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white"
              />
            </div>
          </div>

          <POILocationPicker
            value={{
              lat: typeof formData.lat === 'number' ? formData.lat : 10.759,
              lng: typeof formData.lng === 'number' ? formData.lng : 106.705,
            }}
            radius={typeof formData.radius === 'number' ? formData.radius : 20}
            onChange={handleLocationChange}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Bán kính (m)</label>
            <input
              type="number"
              value={formData.radius}
              onChange={(e) => handleChange('radius', parseInt(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Phân loại để lọc trên tour
            </label>
            <div className="flex flex-wrap gap-2">
              {POI_CATEGORY_OPTIONS.map((category) => {
                const selected = (formData.category_tags ?? []).includes(category.value);

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => handleToggleCategory(category.value)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-white/10 bg-black/20 text-white hover:bg-white/5'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Nội dung đa ngôn ngữ */}
        <div className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Nội dung đa ngôn ngữ</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoTranslateFast}
                disabled={translating}
                className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30 disabled:opacity-50"
              >
                {translating ? (
                  <svg
                    className="h-4 w-4 animate-spin text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">translate</span>
                )}
                Dịch tự động (AI)
              </button>
              <button
                type="button"
                onClick={handleGenerateAllAudioFast}
                disabled={genAllLoading}
                className="flex items-center gap-2 rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-600/30 disabled:opacity-50"
              >
                {genAllLoading ? (
                  <svg
                    className="h-4 w-4 animate-spin text-purple-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">podcasts</span>
                )}
                Tạo âm thanh tất cả
              </button>
            </div>
          </div>

          {/* Tab ngôn ngữ */}
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto border-b border-white/10 pb-2 pr-1 sm:grid-cols-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setActiveTab(lang.code)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  activeTab === lang.code
                    ? 'border-primary bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{lang.nativeName}</p>
                    <p className="mt-1 text-xs text-white/55">{lang.name}</p>
                  </div>
                  <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {lang.shortLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Trường dữ liệu theo ngôn ngữ */}
          {LANGUAGES.map((lang) => (
            <div key={lang.code} className={activeTab === lang.code ? 'block space-y-4' : 'hidden'}>
              <div>
                <label className="text-primary mb-1 block text-sm font-medium">
                  Tên ({lang.code})
                </label>
                <input
                  type="text"
                  value={(formData[`name_${lang.code}` as keyof POI] as string) || ''}
                  onChange={(e) => handleChange(`name_${lang.code}` as keyof POI, e.target.value)}
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white focus:ring-1"
                  placeholder={`Tên địa điểm (${lang.nativeName})`}
                />
              </div>

              <div>
                <label className="text-primary mb-1 block text-sm font-medium">
                  Mô tả chi tiết ({lang.code})
                </label>
                <textarea
                  rows={4}
                  value={(formData[`description_${lang.code}` as keyof POI] as string) || ''}
                  onChange={(e) =>
                    handleChange(`description_${lang.code}` as keyof POI, e.target.value)
                  }
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-white focus:ring-1"
                  placeholder={`Mô tả chi tiết để tạo âm thanh...`}
                />

                {/* Trình tạo âm thanh */}
                <TTSGenerator
                  text={(formData[`description_${lang.code}` as keyof POI] as string) || ''}
                  languageCode={lang.code}
                  currentAudioUrl={formData[`audio_url_${lang.code}` as keyof POI] as string}
                  onAudioGenerated={(url) =>
                    handleChange(`audio_url_${lang.code}` as keyof POI, url)
                  }
                  poiId={formData.id}
                  fieldName={`audio_url_${lang.code}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-white/10 px-6 py-2.5 text-white transition-colors hover:bg-white/5"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary shadow-primary/20 rounded-xl px-6 py-2.5 font-bold text-white shadow-lg transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : 'Lưu địa điểm'}
        </button>
      </div>
    </form>
  );
}
