'use client';

import { OwnerRequestManager } from '@/components/admin/OwnerRequestManager';

export default function AdminOwnerRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Xét duyệt tài khoản chủ quán</h1>
        <p className="text-gray-400">Xử lý các tài khoản đang chờ được cấp quyền chủ quán.</p>
      </div>

      <OwnerRequestManager />
    </div>
  );
}
