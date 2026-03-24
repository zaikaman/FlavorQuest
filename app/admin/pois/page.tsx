'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import {
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
  getLocalizedFieldName,
} from '@/lib/constants';
import {
  POI_CATEGORY_OPTIONS,
  type POICategoryTag,
} from '@/lib/constants/poiCategories';
import type { Language, POI } from '@/lib/types/index';

interface OwnerOption {
  id: string;
  email: string;
}

type AudioLanguage = Language;
type AssignmentFilter = 'all' | 'assigned' | 'unassigned';
type CoverageFilter = 'all' | 'ready' | 'missing-image' | 'missing-audio' | 'needs-attention';
type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc';

const AUDIO_LANGUAGES: AudioLanguage[] = [...SUPPORTED_LANGUAGE_CODES];
const AUDIO_LANGUAGE_META = new Map(SUPPORTED_LANGUAGES.map((language) => [language.code, language]));
const PAGE_SIZE = 10;

function getAudioFieldKey(lang: AudioLanguage) {
  return getLocalizedFieldName('audio_url', lang) as keyof POI;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'Chưa có cập nhật';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa có cập nhật';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function compareDateDesc(left?: string, right?: string) {
  const leftValue = left ? new Date(left).getTime() : 0;
  const rightValue = right ? new Date(right).getTime() : 0;

  return rightValue - leftValue;
}

export default function POIsPage() {
  const toast = useToast();
  const [pois, setPois] = useState<POI[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<POICategoryTag[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [selectedOwnerId, setSelectedOwnerId] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  async function fetchPOIs() {
    try {
      const response = await fetch(`/api/pois?include_deleted=false&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AdminPOIs] fetchPOIs failed:', errorText);
        return;
      }

      setPois((await response.json()) as POI[]);
    } catch (error) {
      console.error('[AdminPOIs] fetchPOIs failed:', error);
    }
  }

  async function fetchOwners() {
    try {
      const response = await fetch(`/api/users/owners?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AdminPOIs] fetchOwners failed:', errorText);
        return;
      }

      setOwners(((await response.json()) as OwnerOption[] | null) ?? []);
    } catch (error) {
      console.error('[AdminPOIs] fetchOwners failed:', error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchPOIs(), fetchOwners()]).finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const ownerEmailMap = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner.email])),
    [owners]
  );

  const getOwnerEmail = (ownerId?: string | null) => {
    if (!ownerId) {
      return 'Chưa gán';
    }

    return ownerEmailMap.get(ownerId) ?? 'Không xác định';
  };

  const hasImage = (poi: POI) => Boolean(poi.image_url);
  const hasFullAudio = (poi: POI) => AUDIO_LANGUAGES.every((lang) => Boolean(poi[getAudioFieldKey(lang)]));
  const audioCount = (poi: POI) =>
    AUDIO_LANGUAGES.filter((lang) => Boolean(poi[getAudioFieldKey(lang)])).length;

  const summary = useMemo(() => {
    const assignedCount = pois.filter((poi) => Boolean(poi.owner_id)).length;
    const missingImageCount = pois.filter((poi) => !hasImage(poi)).length;
    const missingAudioCount = pois.filter((poi) => !hasFullAudio(poi)).length;

    return {
      total: pois.length,
      assignedCount,
      missingImageCount,
      missingAudioCount,
    };
  }, [pois]);

  const toggleCategory = (category: POICategoryTag) => {
    setSelectedCategories((previous) =>
      previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setAssignmentFilter('all');
    setSelectedOwnerId('all');
    setCoverageFilter('all');
    setSortBy('updated-desc');
    setCurrentPage(1);
  };

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    selectedCategories.length +
    (assignmentFilter !== 'all' ? 1 : 0) +
    (selectedOwnerId !== 'all' ? 1 : 0) +
    (coverageFilter !== 'all' ? 1 : 0);

  const filteredPois = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...pois]
      .filter((poi) => {
        const categoryTags = poi.category_tags ?? [];
        const ownerEmail = getOwnerEmail(poi.owner_id).toLowerCase();
        const categoryLabels = categoryTags
          .map((tag) => POI_CATEGORY_OPTIONS.find((option) => option.value === tag)?.label ?? tag)
          .join(' ')
          .toLowerCase();

        if (normalizedQuery) {
          const searchableValues = [
            poi.name_vi,
            poi.name_en,
            poi.signature_dish,
            ownerEmail,
            categoryLabels,
            poi.lat.toFixed(5),
            poi.lng.toFixed(5),
          ]
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .map((value) => value.toLowerCase());

          const matchesQuery = searchableValues.some((value) => value.includes(normalizedQuery));

          if (!matchesQuery) {
            return false;
          }
        }

        if (selectedCategories.length > 0 && !selectedCategories.some((tag) => categoryTags.includes(tag))) {
          return false;
        }

        if (assignmentFilter === 'assigned' && !poi.owner_id) {
          return false;
        }

        if (assignmentFilter === 'unassigned' && poi.owner_id) {
          return false;
        }

        if (selectedOwnerId !== 'all' && poi.owner_id !== selectedOwnerId) {
          return false;
        }

        if (coverageFilter === 'ready' && (!hasImage(poi) || !hasFullAudio(poi))) {
          return false;
        }

        if (coverageFilter === 'missing-image' && hasImage(poi)) {
          return false;
        }

        if (coverageFilter === 'missing-audio' && hasFullAudio(poi)) {
          return false;
        }

        if (coverageFilter === 'needs-attention' && hasImage(poi) && hasFullAudio(poi)) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'updated-asc':
            return compareDateDesc(right.updated_at, left.updated_at) || left.name_vi.localeCompare(right.name_vi, 'vi');
          case 'updated-desc':
            return compareDateDesc(left.updated_at, right.updated_at) || left.name_vi.localeCompare(right.name_vi, 'vi');
          case 'name-desc':
            return right.name_vi.localeCompare(left.name_vi, 'vi');
          case 'name-asc':
            return left.name_vi.localeCompare(right.name_vi, 'vi');
          default:
            return compareDateDesc(left.updated_at, right.updated_at) || left.name_vi.localeCompare(right.name_vi, 'vi');
        }
      });
  }, [assignmentFilter, coverageFilter, ownerEmailMap, pois, searchQuery, selectedCategories, selectedOwnerId, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, assignmentFilter, selectedOwnerId, coverageFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPois.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedPois = filteredPois.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredPois.length);
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => Math.min(Math.max(currentPage - 2, 1) + index, totalPages)
  ).filter((page, index, array) => array.indexOf(page) === index);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa địa điểm này?')) {
      return;
    }

    try {
      const response = await fetch(`/api/pois/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('Xóa địa điểm thất bại');
        return;
      }

      await fetchPOIs();
      toast.success('Địa điểm đã được gỡ khỏi danh sách');
    } catch (error) {
      console.error('[AdminPOIs] delete failed:', error);
      toast.error('Có lỗi khi xóa địa điểm');
    }
  };

  const handleAssignOwner = async (poiId: string, ownerId: string) => {
    try {
      const response = await fetch(`/api/pois/${poiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: ownerId || null }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        toast.error(`Cập nhật chủ quán thất bại: ${responseText}`);
        return;
      }

      const updatedPoi = JSON.parse(responseText) as POI;
      setPois((previous) =>
        previous.map((poi) => (poi.id === poiId ? { ...poi, owner_id: updatedPoi.owner_id ?? null } : poi))
      );
      await fetchPOIs();
      toast.success(ownerId ? 'Đã gán chủ quán cho địa điểm' : 'Đã gỡ chủ quán khỏi địa điểm');
    } catch (error) {
      console.error('[AdminPOIs] assign owner failed:', error);
      toast.error('Có lỗi khi cập nhật chủ quán');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quản lý địa điểm</h1>
            <p className="text-gray-400">Sắp xếp danh sách POI, rà soát nội dung và phân công chủ quán.</p>
          </div>
        </div>
        <TableSkeleton columns={6} rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,145,77,0.2),_transparent_42%),linear-gradient(135deg,rgba(44,30,22,0.98),rgba(24,16,12,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex w-fit items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Điều phối POI
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-[2.2rem]">
                Quản lý POI chi tiết hơn, lọc nhanh hơn.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
                Tìm đúng địa điểm cần xử lý theo danh mục, trạng thái nội dung hoặc chủ quán phụ trách. Mỗi trang hiển thị 10 POI để thao tác gọn hơn.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Tổng hiện có</div>
              <div className="mt-1 text-2xl font-bold text-white">{summary.total}</div>
            </div>
            <Link
              href="/admin/pois/new"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-orange-600"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Thêm địa điểm mới
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Đã gán chủ quán</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{summary.assignedCount}</strong>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              {summary.total === 0 ? '0%' : `${Math.round((summary.assignedCount / summary.total) * 100)}%`}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">Theo dõi nhanh các điểm đã có người phụ trách vận hành.</p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Thiếu hình ảnh</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{summary.missingImageCount}</strong>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              Cần bổ sung
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">Nhận diện nhanh các POI chưa đủ hình ảnh để hiển thị tốt hơn.</p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Thiếu audio</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{summary.missingAudioCount}</strong>
            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
              Chưa hoàn chỉnh
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Dựa trên đủ {AUDIO_LANGUAGES.length} ngôn ngữ audio để ưu tiên hoàn thiện nội dung.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Kết quả hiện tại</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{filteredPois.length}</strong>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {totalPages} trang
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">Bộ lọc đang giúp thu hẹp danh sách để thao tác chính xác hơn.</p>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Tìm kiếm nâng cao
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm theo tên, món nổi bật, email chủ quán hoặc tọa độ"
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-primary/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((previous) => !previous)}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-lg">
                  {showAdvancedFilters ? 'tune' : 'expand_more'}
                </span>
                {showAdvancedFilters ? 'Ẩn bộ lọc chi tiết' : 'Mở bộ lọc chi tiết'}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Danh mục</label>
              <span className="text-xs text-gray-400">
                {selectedCategories.length === 0 ? 'Đang hiển thị tất cả danh mục' : `Đã chọn ${selectedCategories.length} danh mục`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POI_CATEGORY_OPTIONS.map((category) => {
                const isActive = selectedCategories.includes(category.value);

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-white/10 bg-black/20 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Trạng thái gán
                </label>
                <select
                  value={assignmentFilter}
                  onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none focus:border-primary/40"
                >
                  <option value="all">Tất cả</option>
                  <option value="assigned">Đã gán chủ quán</option>
                  <option value="unassigned">Chưa gán chủ quán</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Chủ quán phụ trách
                </label>
                <select
                  value={selectedOwnerId}
                  onChange={(event) => setSelectedOwnerId(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none focus:border-primary/40"
                >
                  <option value="all">Tất cả chủ quán</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Chất lượng nội dung
                </label>
                <select
                  value={coverageFilter}
                  onChange={(event) => setCoverageFilter(event.target.value as CoverageFilter)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none focus:border-primary/40"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ready">Đủ ảnh và audio</option>
                  <option value="missing-image">Thiếu hình ảnh</option>
                  <option value="missing-audio">Thiếu audio</option>
                  <option value="needs-attention">Cần hoàn thiện</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Sắp xếp
                </label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none focus:border-primary/40"
                >
                  <option value="updated-desc">Cập nhật gần nhất</option>
                  <option value="updated-asc">Cập nhật lần đầu</option>
                  <option value="name-asc">Tên A-Z</option>
                  <option value="name-desc">Tên Z-A</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#2c1e16]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">Danh sách POI</h2>
            <p className="mt-1 text-sm text-gray-400">
              {filteredPois.length === 0
                ? 'Chưa có kết quả phù hợp với bộ lọc hiện tại.'
                : `Hiển thị ${pageStart + 1}-${pageEnd} trên ${filteredPois.length} POI phù hợp.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              10 POI / trang
            </span>
            {activeFilterCount > 0 && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-primary">
                {activeFilterCount} bộ lọc đang bật
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {paginatedPois.map((poi) => {
            const categoryTags = poi.category_tags ?? [];
            const ownerEmail = getOwnerEmail(poi.owner_id);
            const completeAudioCount = audioCount(poi);
            const missingImage = !hasImage(poi);
            const missingAudio = !hasFullAudio(poi);

            return (
              <article
                key={poi.id}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.1))] p-4 transition-colors hover:border-white/20"
              >
                <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr_0.7fr_auto] xl:items-start">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                      {poi.image_url ? (
                        <Image
                          src={poi.image_url}
                          alt={poi.name_vi}
                          width={80}
                          height={80}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          <span className="material-symbols-outlined">image_not_supported</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{poi.name_vi}</h3>
                        {missingImage && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                            Thiếu ảnh
                          </span>
                        )}
                        {missingAudio && (
                          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
                            Thiếu audio
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-400">
                        {poi.name_en?.trim() ? poi.name_en : 'Chưa có tên tiếng Anh'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {categoryTags.length > 0 ? (
                          categoryTags.map((tag) => {
                            const category = POI_CATEGORY_OPTIONS.find((option) => option.value === tag);

                            return (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-gray-200"
                              >
                                {category?.label ?? tag}
                              </span>
                            );
                          })
                        ) : (
                          <span className="rounded-full border border-dashed border-white/10 px-3 py-1 text-xs font-semibold text-gray-400">
                            Chưa phân danh mục
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                        <p>
                          <span className="text-gray-500">Món nổi bật:</span>{' '}
                          {poi.signature_dish?.trim() || 'Chưa cập nhật'}
                        </p>
                        <p>
                          <span className="text-gray-500">Tọa độ:</span> {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[20px] border border-white/8 bg-black/15 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Chủ quán
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-white" title={ownerEmail}>
                        {ownerEmail}
                      </p>
                    </div>
                    <select
                      value={poi.owner_id || ''}
                      onChange={(event) => void handleAssignOwner(poi.id, event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none focus:border-primary/40"
                    >
                      <option value="">Chưa gán chủ quán</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 rounded-[20px] border border-white/8 bg-black/15 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Audio
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {completeAudioCount}/{AUDIO_LANGUAGES.length} ngôn ngữ
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AUDIO_LANGUAGES.map((lang) => {
                        const available = Boolean(poi[getAudioFieldKey(lang)]);
                        const languageMeta = AUDIO_LANGUAGE_META.get(lang);

                        return (
                          <span
                            key={lang}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                              available
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-white/8 text-gray-400'
                            }`}
                            title={languageMeta?.nativeName ?? lang}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                available ? 'bg-emerald-300' : 'bg-gray-500'
                              }`}
                            />
                            {languageMeta?.shortLabel ?? lang.toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      Cập nhật lần cuối {formatTimestamp(poi.updated_at)}
                    </p>
                  </div>

                  <div className="flex flex-row gap-2 xl:flex-col">
                    <Link
                      href={`/admin/pois/${poi.id}/edit`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-400/15 xl:flex-none"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Chỉnh sửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(poi.id)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 xl:flex-none"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredPois.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-white">Chưa tìm thấy POI phù hợp</h3>
              <p className="mt-2 text-sm text-gray-400">
                Hãy thử đổi từ khóa, nới bộ lọc danh mục hoặc đặt lại điều kiện đang chọn.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {filteredPois.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-gray-400">
              Trang <span className="font-semibold text-white">{currentPage}</span> / {totalPages}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition-colors ${
                    page === currentPage
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
