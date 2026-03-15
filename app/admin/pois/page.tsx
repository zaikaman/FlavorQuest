'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TableSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import type { POI } from '@/lib/types/index';

interface OwnerOption {
  id: string;
  email: string;
}

type AudioFieldKey =
  | 'audio_url_vi'
  | 'audio_url_en'
  | 'audio_url_ja'
  | 'audio_url_fr'
  | 'audio_url_ko'
  | 'audio_url_zh';

function getAudioFieldKey(lang: string): AudioFieldKey {
  switch (lang) {
    case 'vi':
      return 'audio_url_vi';
    case 'en':
      return 'audio_url_en';
    case 'ja':
      return 'audio_url_ja';
    case 'fr':
      return 'audio_url_fr';
    case 'ko':
      return 'audio_url_ko';
    case 'zh':
      return 'audio_url_zh';
    default:
      return 'audio_url_vi';
  }
}

export default function POIsPage() {
  const toast = useToast();
  const [pois, setPois] = useState<POI[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchPOIs() {
    try {
      const res = await fetch(`/api/pois?include_deleted=false&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPois(data);
      } else {
        const errorText = await res.text();
        console.error('[AdminPOIs] fetchPOIs failed:', errorText);
      }
    } catch (error) {
      console.error('Error fetching POIs:', error);
    }
  }

  async function fetchOwners() {
    try {
      const res = await fetch(`/api/users/owners?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOwners(data ?? []);
      } else {
        const errorText = await res.text();
        console.error('[AdminPOIs] fetchOwners failed:', errorText);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const loadTimer = window.setTimeout(() => {
      Promise.all([fetchPOIs(), fetchOwners()]).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(loadTimer);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa địa điểm này?')) return;

    try {
      const res = await fetch(`/api/pois/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Đã xóa địa điểm');
        fetchPOIs();
      } else {
        toast.error('Xóa thất bại');
      }
    } catch (error) {
      console.error('Error deleting POI:', error);
      toast.error('Có lỗi khi xóa địa điểm');
    }
  };

  const handleAssignOwner = async (poiId: string, ownerId: string) => {
    try {
      const res = await fetch(`/api/pois/${poiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: ownerId || null }),
      });

      const responseText = await res.text();

      if (!res.ok) {
        toast.error(`Gán chủ quán thất bại: ${responseText}`);
        return;
      }

      const updatedPoi = JSON.parse(responseText) as POI;
      setPois(prev => prev.map(poi => (poi.id === poiId ? { ...poi, owner_id: updatedPoi.owner_id ?? null } : poi)));
      await fetchPOIs();
      toast.success(ownerId ? 'Đã gán chủ quán cho địa điểm' : 'Đã gỡ chủ quán khỏi địa điểm');
    } catch (error) {
      console.error('Assign owner failed:', error);
      toast.error('Có lỗi khi gán chủ quán');
    }
  };

  const getOwnerEmail = (ownerId?: string | null) => {
    if (!ownerId) return 'Chưa gán';
    return owners.find(owner => owner.id === ownerId)?.email || 'Không xác định';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quản lý địa điểm</h1>
            <p className="text-gray-400">Danh sách địa điểm trong tour</p>
          </div>
        </div>
        <TableSkeleton columns={6} rows={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý địa điểm</h1>
          <p className="text-gray-400">Danh sách địa điểm trong tour</p>
        </div>
        <Link
          href="/admin/pois/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-orange-600"
        >
          <span className="material-symbols-outlined">add</span> Thêm địa điểm mới
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#2c1e16]">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-white/5 text-xs font-bold uppercase text-gray-200">
            <tr>
              <th className="px-6 py-4">Tên</th>
              <th className="px-6 py-4">Chủ quán</th>
              <th className="px-6 py-4">Hình ảnh</th>
              <th className="px-6 py-4">Tọa độ</th>
              <th className="px-6 py-4">Trạng thái âm thanh</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pois.map(poi => (
              <tr key={poi.id} className="transition-colors hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="text-base font-medium text-white">{poi.name_vi}</div>
                  <div className="text-xs">{poi.name_en || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400">{getOwnerEmail(poi.owner_id)}</div>
                    <select
                      value={poi.owner_id || ''}
                      onChange={event => handleAssignOwner(poi.id, event.target.value)}
                      className="min-w-[200px] rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white"
                    >
                      <option value="">Chưa gán chủ quán</option>
                      {owners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {poi.image_url ? (
                    <Image
                      src={poi.image_url}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-lg bg-black/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                      <span className="material-symbols-outlined text-xs">image_not_supported</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div>{poi.lat.toFixed(5)}</div>
                  <div>{poi.lng.toFixed(5)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {['vi', 'en', 'ja', 'fr', 'ko', 'zh'].map(lang => (
                      <span
                        key={lang}
                        className={`h-2 w-2 rounded-full ${poi[getAudioFieldKey(lang)] ? 'bg-green-500' : 'bg-red-500/20'}`}
                        title={lang}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/pois/${poi.id}/edit`}
                      className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(poi.id)}
                      className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-400/10"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {pois.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Đang kiểm tra dữ liệu... Không tìm thấy địa điểm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
