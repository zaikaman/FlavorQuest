'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TableSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';

interface UserRoleItem {
  id: string;
  email: string;
  role: 'customer' | 'owner' | 'admin';
}

export function UserRoleManager() {
  const { user, refreshUserRole } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[AdminUsers] fetchUsers failed:', errorText);
        return;
      }

      const data = await res.json();
      setUsers(data ?? []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, role: 'customer' | 'owner' | 'admin') => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      const responseText = await res.text();

      if (!res.ok) {
        toast.error(`Cập nhật vai trò thất bại: ${responseText}`);
        return;
      }

      const updatedUser = JSON.parse(responseText) as UserRoleItem;
      setUsers(prev => prev.map(item => (item.id === userId ? { ...item, role: updatedUser.role } : item)));

      if (user?.id === userId) {
        await refreshUserRole();
      }

      await fetchUsers();
      toast.success('Đã cập nhật vai trò người dùng');
    } catch (error) {
      console.error('Update role failed:', error);
      toast.error('Có lỗi khi cập nhật vai trò');
    }
  };

  if (isLoading) {
    return (
      <TableSkeleton columns={2} rows={8} />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#2c1e16]">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-white">Quản lý vai trò người dùng</h2>
        <p className="text-sm text-gray-400">Gán vai trò Khách hàng, Chủ quán hoặc Quản trị viên cho từng tài khoản</p>
      </div>
      <div className="divide-y divide-white/5">
        {users.map(account => (
          <div key={account.id} className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white">{account.email}</p>
              <p className="text-xs text-gray-500">Mã: {account.id.slice(0, 8)}... | Vai trò hiện tại: {account.role}</p>
            </div>
            <select
              value={account.role}
              onChange={event => handleUpdateRole(account.id, event.target.value as 'customer' | 'owner' | 'admin')}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              <option value="customer">Khách hàng</option>
              <option value="owner">Chủ quán</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
        ))}
        {users.length === 0 && (
          <div className="px-6 py-6 text-sm text-gray-500">Chưa có tài khoản người dùng nào.</div>
        )}
      </div>
    </div>
  );
}
