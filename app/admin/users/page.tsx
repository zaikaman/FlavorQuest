'use client';

import { UserRoleManager } from '@/components/admin/UserRoleManager';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
        <p className="text-gray-400">Khu vực phân quyền tài khoản cho admin</p>
      </div>

      <UserRoleManager />
    </div>
  );
}
