'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { DashboardSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { runWithConcurrencySettled } from '@/lib/utils/async';
import type { Language, POI, Tour, TourPayload } from '@/lib/types/index';

const TOUR_LANGUAGES = SUPPORTED_LANGUAGES;
const TOUR_TRANSLATION_CONCURRENCY = 4;

type TourLanguageCode = (typeof TOUR_LANGUAGES)[number]['code'];
type LocalizedTourNameField = `name_${Exclude<Language, 'vi'>}`;
type LocalizedTourDescriptionField = `description_${Exclude<Language, 'vi'>}`;
type TranslationUpdates = Partial<
  Record<LocalizedTourNameField | LocalizedTourDescriptionField, string>
>;

type TourFormState = TourPayload & {
  is_active: boolean;
};

function createEmptyTourTranslations(): Record<`name_${Language}` | `description_${Language}`, string> {
  return Object.fromEntries(
    TOUR_LANGUAGES.flatMap((language) => [
      [`name_${language.code}`, ''],
      [`description_${language.code}`, ''],
    ])
  ) as Record<`name_${Language}` | `description_${Language}`, string>;
}

function getTourTranslations(tour: Tour): Record<`name_${Language}` | `description_${Language}`, string> {
  return Object.fromEntries(
    TOUR_LANGUAGES.flatMap((language) => [
      [`name_${language.code}`, tour[`name_${language.code}` as keyof Tour] ?? ''],
      [
        `description_${language.code}`,
        tour[`description_${language.code}` as keyof Tour] ?? '',
      ],
    ])
  ) as Record<`name_${Language}` | `description_${Language}`, string>;
}

const EMPTY_FORM: TourFormState = {
  ...createEmptyTourTranslations(),
  cover_image_url: '',
  estimated_duration_min: null,
  poi_ids: [],
  is_active: true,
};

function tourToFormState(tour: Tour): TourFormState {
  return {
    ...getTourTranslations(tour),
    cover_image_url: tour.cover_image_url ?? '',
    estimated_duration_min: tour.estimated_duration_min ?? null,
    poi_ids: tour.poi_ids ?? [],
    is_active: tour.is_active,
  };
}

export default function AdminToursPage() {
  const toast = useToast();
  const [tours, setTours] = useState<Tour[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [formData, setFormData] = useState<TourFormState>(EMPTY_FORM);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [poiSearchQuery, setPoiSearchQuery] = useState('');
  const [activeLanguage, setActiveLanguage] = useState<Language>('vi');

  async function fetchTours() {
    const response = await fetch(`/api/tours?admin_view=true&t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error('Không thể tải danh sách tour');
    }

    setTours((await response.json()) as Tour[]);
  }

  async function fetchPOIs() {
    const response = await fetch(`/api/pois?include_deleted=false&t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error('Không thể tải danh sách POI');
    }

    setPois((await response.json()) as POI[]);
  }

  useEffect(() => {
    Promise.all([fetchTours(), fetchPOIs()])
      .catch((error) => {
        console.error('[AdminTours] Load data failed:', error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const poiMap = useMemo(() => new Map(pois.map((poi) => [poi.id, poi])), [pois]);

  const selectedPOIs = useMemo(
    () =>
      formData.poi_ids.map((poiId) => poiMap.get(poiId)).filter((poi): poi is POI => Boolean(poi)),
    [formData.poi_ids, poiMap]
  );

  const filteredPOIs = useMemo(() => {
    const normalizedQuery = poiSearchQuery.trim().toLowerCase();

    return pois.filter((poi) => {
      if (!normalizedQuery) return true;

      return [poi.name_vi, poi.name_en, poi.signature_dish]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [poiSearchQuery, pois]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingTourId(null);
    setPoiSearchQuery('');
    setActiveLanguage('vi');
  };

  const handleTogglePOI = (poiId: string) => {
    setFormData((prev) => {
      if (prev.poi_ids.includes(poiId)) {
        return {
          ...prev,
          poi_ids: prev.poi_ids.filter((id) => id !== poiId),
        };
      }

      return {
        ...prev,
        poi_ids: [...prev.poi_ids, poiId],
      };
    });
  };

  const handleMovePOI = (poiId: string, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const currentIndex = prev.poi_ids.indexOf(poiId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.poi_ids.length) return prev;

      const nextPoiIds = [...prev.poi_ids];
      const currentItem = nextPoiIds[currentIndex];
      const targetItem = nextPoiIds[targetIndex];
      if (!currentItem || !targetItem) return prev;

      nextPoiIds[currentIndex] = targetItem;
      nextPoiIds[targetIndex] = currentItem;

      return {
        ...prev,
        poi_ids: nextPoiIds,
      };
    });
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTourId(tour.id);
    setFormData(tourToFormState(tour));
    setActiveLanguage('vi');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tour này?')) return;

    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Xóa tour thất bại');
      }

      await fetchTours();
      if (editingTourId === tourId) {
        resetForm();
      }
      toast.success('Đã xóa tour');
    } catch (error) {
      console.error('[AdminTours] Delete failed:', error);
      toast.error(error instanceof Error ? error.message : 'Xóa tour thất bại');
    }
  };

  const handleToggleActive = async (tour: Tour) => {
    try {
      const response = await fetch(`/api/tours/${tour.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tour, is_active: !tour.is_active }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Cập nhật trạng thái thất bại');
      }

      await fetchTours();
      toast.success(tour.is_active ? 'Đã ẩn tour' : 'Đã mở tour');
    } catch (error) {
      console.error('[AdminTours] Toggle active failed:', error);
      toast.error(error instanceof Error ? error.message : 'Cập nhật trạng thái thất bại');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name_vi.trim()) {
      toast.warning('Vui lòng nhập tên tour tiếng Việt');
      return;
    }

    if (formData.poi_ids.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 POI cho tour');
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingTourId ? `/api/tours/${editingTourId}` : '/api/tours';
      const method = editingTourId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Lưu tour thất bại');
      }

      await fetchTours();
      resetForm();
      toast.success(editingTourId ? 'Đã cập nhật tour' : 'Đã tạo tour');
    } catch (error) {
      console.error('[AdminTours] Save failed:', error);
      toast.error(error instanceof Error ? error.message : 'Lưu tour thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoTranslate = async () => {
    const vietnameseName = formData.name_vi.trim();
    const vietnameseDescription = formData.description_vi?.trim() ?? '';

    if (!vietnameseName && !vietnameseDescription) {
      toast.warning('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
      return;
    }

    setIsTranslating(true);

    try {
      const updates: TranslationUpdates = {};

      if (vietnameseName) {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: vietnameseName }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Dịch tên tour thất bại');
        }

        const translations = (await response.json()) as Partial<Record<TourLanguageCode, string>>;
        TOUR_LANGUAGES.forEach((language) => {
          if (language.code !== 'vi' && translations[language.code]) {
            updates[`name_${language.code}` as LocalizedTourNameField] = translations[
              language.code
            ] as string;
          }
        });
      }

      if (vietnameseDescription) {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: vietnameseDescription }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Dịch mô tả tour thất bại');
        }

        const translations = (await response.json()) as Partial<Record<TourLanguageCode, string>>;
        TOUR_LANGUAGES.forEach((language) => {
          if (language.code !== 'vi' && translations[language.code]) {
            updates[`description_${language.code}` as LocalizedTourDescriptionField] = translations[
              language.code
            ] as string;
          }
        });
      }

      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success('Dịch tự động thành công. Vui lòng kiểm tra lại nội dung.');
    } catch (error) {
      console.error('[AdminTours] Translate failed:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi dịch tự động');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAutoTranslateFast = async () => {
    const vietnameseName = formData.name_vi.trim();
    const vietnameseDescription = formData.description_vi?.trim() ?? '';

    if (!vietnameseName && !vietnameseDescription) {
      toast.warning('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
      return;
    }

    setIsTranslating(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: {
            ...(vietnameseName ? { name: vietnameseName } : {}),
            ...(vietnameseDescription ? { description: vietnameseDescription } : {}),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Dịch tự động thất bại');
      }

      const payload = (await response.json()) as {
        translations?: Record<string, Partial<Record<TourLanguageCode, string>>>;
      };
      const updates: TranslationUpdates = {};

      TOUR_LANGUAGES.forEach((language) => {
        if (language.code === 'vi') {
          return;
        }

        const translatedName = payload.translations?.name?.[language.code];
        if (translatedName) {
          updates[`name_${language.code}` as LocalizedTourNameField] = translatedName;
        }

        const translatedDescription = payload.translations?.description?.[language.code];
        if (translatedDescription) {
          updates[`description_${language.code}` as LocalizedTourDescriptionField] =
            translatedDescription;
        }
      });

      setFormData((prev) => ({ ...prev, ...updates }));
      toast.success('Đã cập nhật bản dịch. Vui lòng kiểm tra lại trước khi lưu.');
    } catch (error) {
      console.error('[AdminTours] Translate failed:', error);
      toast.error(error instanceof Error ? error.message : 'Dịch tự động thất bại');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAutoTranslateProgressive = async () => {
    const vietnameseName = formData.name_vi.trim();
    const vietnameseDescription = formData.description_vi?.trim() ?? '';

    if (!vietnameseName && !vietnameseDescription) {
      toast.warning('Vui lòng nhập tên hoặc mô tả tiếng Việt trước khi dịch.');
      return;
    }

    const targetLanguages = TOUR_LANGUAGES.filter((language) => language.code !== 'vi');
    if (targetLanguages.length === 0) {
      return;
    }

    setIsTranslating(true);
    setTranslationProgress({ completed: 0, total: targetLanguages.length });

    try {
      let completedCount = 0;
      const results = await runWithConcurrencySettled(
        targetLanguages.map((language) => async () => {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              texts: {
                ...(vietnameseName ? { name: vietnameseName } : {}),
                ...(vietnameseDescription ? { description: vietnameseDescription } : {}),
              },
              targetLanguages: [language.code],
            }),
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                error?: string;
                translations?: Record<string, Partial<Record<TourLanguageCode, string>>>;
              }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || `Dịch thất bại cho ${language.nativeName}`);
          }

          return {
            languageCode: language.code,
            translations: payload?.translations ?? {},
          };
        }),
        TOUR_TRANSLATION_CONCURRENCY,
        (result) => {
          completedCount += 1;
          setTranslationProgress({ completed: completedCount, total: targetLanguages.length });

          if (result.status !== 'fulfilled' || !result.value) {
            return;
          }

          const updates: TranslationUpdates = {};
          const translatedName = result.value.translations.name?.[result.value.languageCode];
          const translatedDescription =
            result.value.translations.description?.[result.value.languageCode];

          if (translatedName) {
            updates[`name_${result.value.languageCode}` as LocalizedTourNameField] = translatedName;
          }

          if (translatedDescription) {
            updates[`description_${result.value.languageCode}` as LocalizedTourDescriptionField] =
              translatedDescription;
          }

          if (Object.keys(updates).length > 0) {
            setFormData((prev) => ({ ...prev, ...updates }));
          }
        }
      );

      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        toast.warning(
          `Đã cập nhật ${targetLanguages.length - failedCount}/${targetLanguages.length} ngôn ngữ. Một vài bản dịch cần thử lại.`
        );
      } else {
        toast.success('Đã cập nhật bản dịch. Vui lòng kiểm tra lại trước khi lưu.');
      }
    } catch (error) {
      console.error('[AdminTours] Progressive translate failed:', error);
      toast.error(error instanceof Error ? error.message : 'Dịch tự động thất bại');
    } finally {
      setIsTranslating(false);
      setTranslationProgress(null);
    }
  };

  void handleAutoTranslate;
  void handleAutoTranslateFast;

  if (isLoading) {
    return <DashboardSkeleton stats={4} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý tour</h1>
          <p className="text-gray-400">
            Quản trị viên có thể tạo tour và sắp xếp thứ tự POI cho khách hàng
          </p>
        </div>
        <button
          onClick={resetForm}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white transition-colors hover:bg-white/10"
        >
          Tạo tour mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-[#2c1e16] p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingTourId ? 'Chỉnh sửa tour' : 'Tạo tour mới'}
              </h2>
              <p className="text-sm text-gray-400">
                Tên tour có thể nhập nhiều ngôn ngữ, nội dung thiếu sẽ fallback về tiếng Việt
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoTranslateProgressive}
              disabled={isTranslating}
              title={
                isTranslating && translationProgress
                  ? `Đang dịch ${translationProgress.completed}/${translationProgress.total}`
                  : 'Dịch tự động (AI)'
              }
              className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 ml-auto rounded-xl border px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isTranslating ? 'Đang dịch...' : 'Dịch tự động (AI)'}
            </button>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, is_active: event.target.checked }))
                }
                className="size-4 rounded border-white/20 bg-black/20"
              />
              Hiển thị cho khách hàng
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-white/5 bg-black/15 p-4 md:col-span-2">
              <h3 className="font-semibold text-white">Thông tin hiển thị tour</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs tracking-wide text-gray-400 uppercase">
                    Ảnh bìa tour
                  </label>
                  <ImageUploader
                    currentImageUrl={formData.cover_image_url}
                    onImageUploaded={(url) =>
                      setFormData((prev) => ({ ...prev, cover_image_url: url }))
                    }
                    folder="tours"
                  />
                  <p className="mt-2 text-xs break-all text-gray-500">
                    {formData.cover_image_url || 'Chưa có ảnh bìa nào được tải lên.'}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs tracking-wide text-gray-400 uppercase">
                    Thời lượng dự kiến (phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={formData.estimated_duration_min ?? ''}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimated_duration_min: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="90"
                  />
                </div>
              </div>
            </div>

            {/* language editor */}
            <div className="space-y-4 rounded-xl border border-white/5 bg-black/15 p-4 md:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">Nội dung đa ngôn ngữ</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Chọn một ngôn ngữ để nhập tên và mô tả. Nội dung thiếu sẽ dùng bản
                    tiếng Việt.
                  </p>
                </div>
                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {TOUR_LANGUAGES.map((language) => {
                    const nameKey = `name_${language.code}` as keyof TourFormState;
                    const hasName =
                      typeof formData[nameKey] === 'string' &&
                      String(formData[nameKey]).trim().length > 0;

                    return (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => setActiveLanguage(language.code)}
                        className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                          activeLanguage === language.code
                            ? 'border-primary bg-primary/15 text-white'
                            : 'border-white/10 bg-black/20 text-gray-200 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{language.nativeName}</p>
                            <p className="mt-1 text-xs text-white/55">{language.name}</p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              hasName ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/8 text-white/55'
                            }`}
                          >
                            {language.shortLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const currentLanguage =
                  TOUR_LANGUAGES.find((item) => item.code === activeLanguage) ?? TOUR_LANGUAGES[0]!;
                const nameKey = `name_${currentLanguage.code}` as keyof TourFormState;
                const descriptionKey = `description_${currentLanguage.code}` as keyof TourFormState;

                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs tracking-wide text-gray-400 uppercase">
                        Tên tour {currentLanguage.code === 'vi' ? '*' : ''}
                      </label>
                      <input
                        value={(formData[nameKey] as string) ?? ''}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [nameKey]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                        placeholder={`Tên tour (${currentLanguage.nativeName})`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs tracking-wide text-gray-400 uppercase">
                        Mô tả ngắn
                      </label>
                      <textarea
                        value={(formData[descriptionKey] as string) ?? ''}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [descriptionKey]: event.target.value }))
                        }
                        className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                        placeholder={`Mô tả (${currentLanguage.nativeName})`}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">POI thuộc tour</h3>
                <p className="text-sm text-gray-400">
                  Thứ tự trong danh sách cũng là thứ tự hiển thị cho khách hàng
                </p>
              </div>
              <input
                value={poiSearchQuery}
                onChange={(event) => setPoiSearchQuery(event.target.value)}
                placeholder="Tìm POI theo tên hoặc món đặc trưng"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white sm:w-80"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-xl border border-white/5 bg-black/15 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-white">Đã chọn ({selectedPOIs.length})</h4>
                </div>

                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {selectedPOIs.map((poi, index) => (
                    <div
                      key={poi.id}
                      className="border-primary/20 bg-primary/10 rounded-xl border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {index + 1}. {poi.name_vi}
                          </p>
                          <p className="text-xs text-gray-300">
                            {poi.signature_dish || 'Chưa có món đặc trưng'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePOI(poi.id, 'up')}
                            className="size-8 rounded-lg border border-white/10 bg-black/20 text-white disabled:opacity-40"
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePOI(poi.id, 'down')}
                            className="size-8 rounded-lg border border-white/10 bg-black/20 text-white disabled:opacity-40"
                            disabled={index === selectedPOIs.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePOI(poi.id)}
                            className="size-8 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedPOIs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                      Chưa có POI nào được chọn.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/15 p-4">
                <h4 className="mb-3 font-semibold text-white">Danh sách POI khả dụng</h4>

                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {filteredPOIs.map((poi) => {
                    const isSelected = formData.poi_ids.includes(poi.id);

                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => handleTogglePOI(poi.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-white/10 bg-black/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{poi.name_vi}</p>
                            <p className="text-xs text-gray-300">
                              {poi.name_en || 'Chưa có tên tiếng Anh'}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {poi.signature_dish || 'Chưa có món đặc trưng'}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isSelected ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-300'}`}
                          >
                            {isSelected ? 'Đã chọn' : 'Thêm'}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredPOIs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                      Không tìm thấy POI phù hợp.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary rounded-xl px-5 py-3 font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : editingTourId ? 'Lưu thay đổi' : 'Tạo tour'}
            </button>
            {editingTourId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-white transition-colors hover:bg-white/10"
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#2c1e16] p-6">
          <div>
            <h2 className="text-lg font-bold text-white">Danh sách tour hiện có</h2>
            <p className="text-sm text-gray-400">
              Bật/tắt tour hoặc chỉnh sửa nhanh cấu hình hiện tại
            </p>
          </div>

          <div className="max-h-[920px] space-y-3 overflow-y-auto pr-1">
            {tours.map((tour) => (
              <div key={tour.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{tour.name_vi}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tour.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-gray-300'}`}
                      >
                        {tour.is_active ? 'Đang mở' : 'Đang ẩn'}
                      </span>
                      {typeof tour.estimated_duration_min === 'number' &&
                        tour.estimated_duration_min > 0 && (
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80">
                            {tour.estimated_duration_min} phút
                          </span>
                        )}
                    </div>
                    {tour.description_vi && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-300">
                        {tour.description_vi}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTour(tour)}
                      className="size-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      title="Chỉnh sửa"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteTour(tour.id)}
                      className="size-9 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300"
                      title="Xóa"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-300">
                  <span>{tour.poi_ids.length} POI</span>
                  <button
                    onClick={() => handleToggleActive(tour)}
                    className={`rounded-lg px-3 py-2 font-semibold transition-colors ${tour.is_active ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-primary text-white hover:bg-orange-600'}`}
                  >
                    {tour.is_active ? 'Ẩn tour' : 'Mở tour'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {tour.cover_image_url && (
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs">
                      Có ảnh bìa
                    </span>
                  )}
                  {tour.poi_ids.slice(0, 4).map((poiId) => (
                    <span
                      key={poiId}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300"
                    >
                      {poiMap.get(poiId)?.name_vi || poiId}
                    </span>
                  ))}
                  {tour.poi_ids.length > 4 && (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                      +{tour.poi_ids.length - 4} POI khác
                    </span>
                  )}
                </div>
              </div>
            ))}

            {tours.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                Chưa có tour nào. Hãy tạo tour đầu tiên.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
