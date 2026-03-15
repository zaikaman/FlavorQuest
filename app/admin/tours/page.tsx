'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { DashboardSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import type { POI, Tour, TourPayload } from '@/lib/types/index';

const TOUR_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
] as const;

type TourLanguageCode = typeof TOUR_LANGUAGES[number]['code'];
type LocalizedTourNameField = `name_${Exclude<TourLanguageCode, 'vi'>}`;
type LocalizedTourDescriptionField = `description_${Exclude<TourLanguageCode, 'vi'>}`;
type TranslationUpdates = Partial<Record<LocalizedTourNameField | LocalizedTourDescriptionField, string>>;

type TourFormState = TourPayload & {
  is_active: boolean;
};

const EMPTY_FORM: TourFormState = {
  name_vi: '',
  name_en: '',
  name_ja: '',
  name_fr: '',
  name_ko: '',
  name_zh: '',
  description_vi: '',
  description_en: '',
  description_ja: '',
  description_fr: '',
  description_ko: '',
  description_zh: '',
  cover_image_url: '',
  estimated_duration_min: null,
  poi_ids: [],
  is_active: true,
};

function tourToFormState(tour: Tour): TourFormState {
  return {
    name_vi: tour.name_vi,
    name_en: tour.name_en ?? '',
    name_ja: tour.name_ja ?? '',
    name_fr: tour.name_fr ?? '',
    name_ko: tour.name_ko ?? '',
    name_zh: tour.name_zh ?? '',
    description_vi: tour.description_vi ?? '',
    description_en: tour.description_en ?? '',
    description_ja: tour.description_ja ?? '',
    description_fr: tour.description_fr ?? '',
    description_ko: tour.description_ko ?? '',
    description_zh: tour.description_zh ?? '',
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
  const [poiSearchQuery, setPoiSearchQuery] = useState('');

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
      .catch(error => {
        console.error('[AdminTours] Load data failed:', error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const poiMap = useMemo(
    () => new Map(pois.map(poi => [poi.id, poi])),
    [pois]
  );

  const selectedPOIs = useMemo(
    () => formData.poi_ids.map(poiId => poiMap.get(poiId)).filter((poi): poi is POI => Boolean(poi)),
    [formData.poi_ids, poiMap]
  );

  const filteredPOIs = useMemo(() => {
    const normalizedQuery = poiSearchQuery.trim().toLowerCase();

    return pois.filter(poi => {
      if (!normalizedQuery) return true;

      return [poi.name_vi, poi.name_en, poi.signature_dish]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .some(value => value.toLowerCase().includes(normalizedQuery));
    });
  }, [poiSearchQuery, pois]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingTourId(null);
    setPoiSearchQuery('');
  };

  const handleTogglePOI = (poiId: string) => {
    setFormData(prev => {
      if (prev.poi_ids.includes(poiId)) {
        return {
          ...prev,
          poi_ids: prev.poi_ids.filter(id => id !== poiId),
        };
      }

      return {
        ...prev,
        poi_ids: [...prev.poi_ids, poiId],
      };
    });
  };

  const handleMovePOI = (poiId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
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
        TOUR_LANGUAGES.forEach(language => {
          if (language.code !== 'vi' && translations[language.code]) {
            updates[`name_${language.code}` as LocalizedTourNameField] = translations[language.code] as string;
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
        TOUR_LANGUAGES.forEach(language => {
          if (language.code !== 'vi' && translations[language.code]) {
            updates[`description_${language.code}` as LocalizedTourDescriptionField] = translations[language.code] as string;
          }
        });
      }

      setFormData(prev => ({ ...prev, ...updates }));
      toast.success('Dịch tự động thành công. Vui lòng kiểm tra lại nội dung.');
    } catch (error) {
      console.error('[AdminTours] Translate failed:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi dịch tự động');
    } finally {
      setIsTranslating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardSkeleton stats={4} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý tour</h1>
          <p className="text-gray-400">Admin có thể tạo tour và sắp xếp thứ tự POI cho khách hàng</p>
        </div>
        <button
          onClick={resetForm}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          Tạo tour mới
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">{editingTourId ? 'Chỉnh sửa tour' : 'Tạo tour mới'}</h2>
              <p className="text-sm text-gray-400">Tên tour có thể nhập nhiều ngôn ngữ, nội dung thiếu sẽ fallback về tiếng Việt</p>
            </div>
            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={isTranslating}
              className="ml-auto px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isTranslating ? 'Đang dịch...' : 'Dịch tự động (AI)'}
            </button>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={event => setFormData(prev => ({ ...prev, is_active: event.target.checked }))}
                className="size-4 rounded border-white/20 bg-black/20"
              />
              Hiển thị cho khách hàng
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 bg-black/15 p-4 space-y-3 md:col-span-2">
              <h3 className="font-semibold text-white">Thông tin hiển thị tour</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Ảnh bìa tour</label>
                  <ImageUploader
                    currentImageUrl={formData.cover_image_url}
                    onImageUploaded={(url) => setFormData(prev => ({ ...prev, cover_image_url: url }))}
                    folder="tours"
                  />
                  <p className="mt-2 text-xs text-gray-500 break-all">{formData.cover_image_url || 'Chưa có ảnh bìa nào được tải lên.'}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Thời lượng dự kiến (phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={formData.estimated_duration_min ?? ''}
                    onChange={event => setFormData(prev => ({
                      ...prev,
                      estimated_duration_min: event.target.value ? Number(event.target.value) : null,
                    }))}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    placeholder="90"
                  />
                </div>
              </div>
            </div>

            {TOUR_LANGUAGES.map(language => {
              const nameKey = `name_${language.code}` as keyof TourFormState;
              const descriptionKey = `description_${language.code}` as keyof TourFormState;

              return (
                <div key={language.code} className="rounded-xl border border-white/5 bg-black/15 p-4 space-y-3">
                  <h3 className="font-semibold text-white">{language.label}</h3>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                      Tên tour {language.code === 'vi' ? '*' : ''}
                    </label>
                    <input
                      value={(formData[nameKey] as string) ?? ''}
                      onChange={event => setFormData(prev => ({ ...prev, [nameKey]: event.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      placeholder={`Tên tour (${language.label})`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Mô tả ngắn</label>
                    <textarea
                      value={(formData[descriptionKey] as string) ?? ''}
                      onChange={event => setFormData(prev => ({ ...prev, [descriptionKey]: event.target.value }))}
                      className="w-full min-h-24 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      placeholder={`Mô tả (${language.label})`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-white">POI thuộc tour</h3>
                <p className="text-sm text-gray-400">Thứ tự trong danh sách cũng là thứ tự hiển thị cho khách hàng</p>
              </div>
              <input
                value={poiSearchQuery}
                onChange={event => setPoiSearchQuery(event.target.value)}
                placeholder="Tìm POI theo tên hoặc món đặc trưng"
                className="w-full sm:w-80 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
              <div className="rounded-xl border border-white/5 bg-black/15 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">Đã chọn ({selectedPOIs.length})</h4>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedPOIs.map((poi, index) => (
                    <div key={poi.id} className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{index + 1}. {poi.name_vi}</p>
                          <p className="text-xs text-gray-300">{poi.signature_dish || 'Chưa có món đặc trưng'}</p>
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
                <h4 className="font-semibold text-white mb-3">Danh sách POI khả dụng</h4>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredPOIs.map(poi => {
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
                            <p className="text-xs text-gray-300">{poi.name_en || 'Chưa có tên tiếng Anh'}</p>
                            <p className="text-xs text-gray-400 mt-1">{poi.signature_dish || 'Chưa có món đặc trưng'}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isSelected ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-300'}`}>
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
              className="px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : editingTourId ? 'Lưu thay đổi' : 'Tạo tour'}
            </button>
            {editingTourId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#2c1e16] p-6">
          <div>
            <h2 className="text-lg font-bold text-white">Danh sách tour hiện có</h2>
            <p className="text-sm text-gray-400">Bật/tắt tour hoặc chỉnh sửa nhanh cấu hình hiện tại</p>
          </div>

          <div className="space-y-3 max-h-[920px] overflow-y-auto pr-1">
            {tours.map(tour => (
              <div key={tour.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{tour.name_vi}</h3>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tour.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>
                        {tour.is_active ? 'Đang mở' : 'Đang ẩn'}
                      </span>
                      {typeof tour.estimated_duration_min === 'number' && tour.estimated_duration_min > 0 && (
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80">
                          {tour.estimated_duration_min} phút
                        </span>
                      )}
                    </div>
                    {tour.description_vi && (
                      <p className="mt-2 text-sm text-gray-300 line-clamp-2">{tour.description_vi}</p>
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
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      Có ảnh bìa
                    </span>
                  )}
                  {tour.poi_ids.slice(0, 4).map(poiId => (
                    <span key={poiId} className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
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
