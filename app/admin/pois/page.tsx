'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { POI } from '@/lib/types/index';

interface OwnerOption {
    id: string;
    email: string;
}

interface UserRoleItem {
    id: string;
    email: string;
    role: 'customer' | 'owner' | 'admin';
}

export default function POIsPage() {
    const [pois, setPois] = useState<POI[]>([]);
    const [owners, setOwners] = useState<OwnerOption[]>([]);
    const [users, setUsers] = useState<UserRoleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([fetchPOIs(), fetchOwners(), fetchUsers()]).finally(() => {
            setIsLoading(false);
        });
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
        }
    };

    const fetchOwners = async () => {
        try {
            const res = await fetch('/api/users/owners');
            if (res.ok) {
                const data = await res.json();
                setOwners(data ?? []);
            }
        } catch (error) {
            console.error('Error fetching owners:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data ?? []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
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

    const handleAssignOwner = async (poiId: string, ownerId: string) => {
        try {
            const res = await fetch(`/api/pois/${poiId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_id: ownerId || null }),
            });

            if (!res.ok) {
                alert('Gán chủ quán thất bại');
                return;
            }

            await fetchPOIs();
        } catch (error) {
            console.error('Assign owner failed:', error);
            alert('Có lỗi khi gán chủ quán');
        }
    };

    const handleUpdateRole = async (userId: string, role: 'customer' | 'owner') => {
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role }),
            });

            if (!res.ok) {
                alert('Cập nhật vai trò thất bại');
                return;
            }

            await Promise.all([fetchOwners(), fetchUsers(), fetchPOIs()]);
        } catch (error) {
            console.error('Update role failed:', error);
            alert('Có lỗi khi cập nhật vai trò');
        }
    };

    const getOwnerEmail = (ownerId?: string | null) => {
        if (!ownerId) return 'Chưa gán';
        return owners.find(owner => owner.id === ownerId)?.email || 'Không xác định';
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
                            <th className="px-6 py-4">Chủ quán</th>
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
                                    <div className="space-y-2">
                                        <div className="text-xs text-gray-400">{getOwnerEmail(poi.owner_id)}</div>
                                        <select
                                            value={poi.owner_id || ''}
                                            onChange={e => handleAssignOwner(poi.id, e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white min-w-[200px]"
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Đang kiểm tra dữ liệu... Không tìm thấy địa điểm nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-[#2c1e16] rounded-xl border border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">Quản lý chủ quán</h2>
                    <p className="text-sm text-gray-400">Chuyển vai trò người dùng sang Chủ quán để có thể liên kết vào POI</p>
                </div>
                <div className="divide-y divide-white/5">
                    {users
                        .filter(user => user.role !== 'admin')
                        .map(user => (
                            <div key={user.id} className="px-6 py-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-white text-sm font-medium">{user.email}</p>
                                    <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                                </div>
                                <select
                                    value={user.role}
                                    onChange={e => handleUpdateRole(user.id, e.target.value as 'customer' | 'owner')}
                                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                >
                                    <option value="customer">Khách hàng</option>
                                    <option value="owner">Chủ quán</option>
                                </select>
                            </div>
                        ))}
                    {users.filter(user => user.role !== 'admin').length === 0 && (
                        <div className="px-6 py-6 text-sm text-gray-500">Chưa có tài khoản người dùng nào.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
