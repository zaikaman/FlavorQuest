'use client';

import { UserRoleManager } from '@/components/admin/UserRoleManager';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,145,77,0.2),_transparent_42%),linear-gradient(135deg,rgba(44,30,22,0.98),rgba(24,16,12,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex w-fit items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Điều phối tài khoản
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-[2.2rem]">
              Quản lý người dùng rõ vai trò, xử lý nhanh hơn.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
              Tìm đúng tài khoản cần chỉnh quyền, theo dõi nhóm chờ duyệt chủ quán và kiểm soát phân quyền theo từng trang 10 mục.
            </p>
          </div>
        </div>
      </section>

      <UserRoleManager />
    </div>
  );
}
