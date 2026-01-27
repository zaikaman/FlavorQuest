'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { POI } from '@/lib/types/index';

export default function POIsPage() {
    const [pois, setPois] = useState<POI[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPOIs();
    }, []);

    const fetchPOIs = async () => {
        try {
            const res = await fetch('/api/pois?include_deleted=false');
            if (res.ok) {
                const data = await res.json();
                setPois(data);
            }
        } catch (error) {
            console.error('Error fetching POIs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa địa điểm này?')) return;

        try {
            const res = await fetch(`/api/pois/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                alert('Đã xóa địa điểm!');
                fetchPOIs();
            } else {
                alert('Xóa thất bại');
            }
        } catch (error) {
            console.error('Error deleting POI:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined">add</span> Thêm địa điểm mới
                </Link>
            </div>

            <div className="bg-[#2c1e16] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-4">Tên</th>
                            <th className="px-6 py-4">Hình ảnh</th>
                            <th className="px-6 py-4">Tọa độ</th>
                            <th className="px-6 py-4">Trạng thái Audio</th>
                            <th className="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {pois.map((poi) => (
                            <tr key={poi.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white text-base">{poi.name_vi}</div>
                                    <div className="text-xs">{poi.name_en || '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {poi.image_url ? (
                                        <img src={poi.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-black/50" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
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
                                                className={`w-2 h-2 rounded-full ${(poi as any)[`audio_url_${lang}`] ? 'bg-green-500' : 'bg-red-500/20'
                                                    }`}
                                                title={lang}
                                            />
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/admin/pois/${poi.id}/edit`}
                                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(poi.id)}
                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {pois.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
