'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TableSkeleton } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/ToastProvider';
import type { UserRole } from '@/lib/types';

interface UserRoleItem {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

type RoleFilter = 'all' | UserRole;
type SortOption = 'updated-desc' | 'created-desc' | 'email-asc';

const PAGE_SIZE = 10;
const ROLE_OPTIONS: Array<{ value: UserRole; label: string; tone: string }> = [
  { value: 'customer', label: 'Khách hàng', tone: 'bg-sky-500/15 text-sky-300 border-sky-400/20' },
  {
    value: 'pending-owner',
    label: 'Chờ duyệt chủ quán',
    tone: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  },
  {
    value: 'owner',
    label: 'Chủ quán',
    tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  },
  { value: 'admin', label: 'Quản trị viên', tone: 'bg-primary/15 text-primary border-primary/25' },
];
const DEFAULT_ROLE_META = {
  value: 'customer',
  label: 'Khách hàng',
  tone: 'bg-sky-500/15 text-sky-300 border-sky-400/20',
} as const;

function getRoleMeta(role: UserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role) ?? DEFAULT_ROLE_META;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'Chưa có dữ liệu';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Chưa có dữ liệu';
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

export function UserRoleManager() {
  const { user, refreshUserRole } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  async function fetchUsers() {
    try {
      const response = await fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AdminUsers] fetchUsers failed:', errorText);
        return;
      }

      setUsers(((await response.json()) as UserRoleItem[] | null) ?? []);
    } catch (error) {
      console.error('[AdminUsers] fetchUsers failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const summary = useMemo(() => {
    const counts = {
      total: users.length,
      customer: 0,
      'pending-owner': 0,
      owner: 0,
      admin: 0,
    };

    users.forEach((account) => {
      counts[account.role] += 1;
    });

    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...users]
      .filter((account) => {
        if (roleFilter !== 'all' && account.role !== roleFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [account.email, account.id, account.role, getRoleMeta(account.role).label]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'created-desc':
            return (
              compareDateDesc(left.created_at, right.created_at) ||
              left.email.localeCompare(right.email)
            );
          case 'email-asc':
            return left.email.localeCompare(right.email);
          case 'updated-desc':
          default:
            return (
              compareDateDesc(left.updated_at, right.updated_at) ||
              left.email.localeCompare(right.email)
            );
        }
      });
  }, [roleFilter, searchQuery, sortBy, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredUsers.length);
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) =>
    Math.min(Math.max(currentPage - 2, 1) + index, totalPages)
  ).filter((page, index, array) => array.indexOf(page) === index);

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    setSavingUserId(userId);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        toast.error(`Cập nhật vai trò thất bại: ${responseText}`);
        return;
      }

      const updatedUser = JSON.parse(responseText) as Pick<UserRoleItem, 'id' | 'role' | 'email'>;

      setUsers((previous) =>
        previous.map((item) =>
          item.id === userId
            ? {
                ...item,
                role: updatedUser.role,
                email: updatedUser.email,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      if (user?.id === userId) {
        await refreshUserRole();
      }

      await fetchUsers();
      toast.success('Vai trò người dùng đã được cập nhật');
    } catch (error) {
      console.error('[AdminUsers] update role failed:', error);
      toast.error('Có lỗi khi cập nhật vai trò');
    } finally {
      setSavingUserId(null);
    }
  };

  if (isLoading) {
    return <TableSkeleton columns={5} rows={10} />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
            Tổng tài khoản
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{summary.total}</strong>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
              Tất cả vai trò
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Theo dõi toàn bộ tài khoản đang có trong hệ thống quản trị.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
            Khách hàng
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">{summary.customer}</strong>
            <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
              Đang hoạt động
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Nhóm tài khoản trải nghiệm tour và thanh toán mở khóa nội dung.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
            Chờ duyệt chủ quán
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">
              {summary['pending-owner']}
            </strong>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              Cần xử lý
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Nhận diện nhanh các tài khoản đang chờ được cấp quyền chủ quán.
          </p>
        </article>

        <article className="rounded-[24px] border border-white/10 bg-[#2c1e16] p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
            Nhóm vận hành
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <strong className="text-3xl font-extrabold text-white">
              {summary.owner + summary.admin}
            </strong>
            <span className="bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-semibold">
              Chủ quán + Admin
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Gộp các vai trò quản trị nội dung và vận hành điểm bán.
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                Tìm kiếm tài khoản
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-500">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm theo email, mã người dùng hoặc vai trò"
                  className="focus:border-primary/40 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 pr-4 pl-12 text-sm text-white transition-colors outline-none placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div>
                <label className="mb-2 block text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Lọc vai trò
                </label>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                  className="focus:border-primary/40 min-h-12 w-full rounded-2xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none"
                >
                  <option value="all">Tất cả vai trò</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Sắp xếp
                </label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="focus:border-primary/40 min-h-12 w-full rounded-2xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none"
                >
                  <option value="updated-desc">Cập nhật gần nhất</option>
                  <option value="created-desc">Tạo gần nhất</option>
                  <option value="email-asc">Email A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#2c1e16]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">Danh sách người dùng</h2>
            <p className="mt-1 text-sm text-gray-400">
              {filteredUsers.length === 0
                ? 'Chưa có kết quả phù hợp với bộ lọc hiện tại.'
                : `Hiển thị ${pageStart + 1}-${pageEnd} trên ${filteredUsers.length} tài khoản phù hợp.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              10 tài khoản / trang
            </span>
            {roleFilter !== 'all' && (
              <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-3 py-2">
                {getRoleMeta(roleFilter).label}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {paginatedUsers.map((account) => {
            const roleMeta = getRoleMeta(account.role);
            const isCurrentUser = user?.id === account.id;
            const isSaving = savingUserId === account.id;

            return (
              <article
                key={account.id}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.1))] p-4 transition-colors hover:border-white/20"
              >
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-white">{account.email}</h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${roleMeta.tone}`}
                      >
                        {roleMeta.label}
                      </span>
                      {isCurrentUser && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-gray-200">
                          Tài khoản của bạn
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                      <p>
                        <span className="text-gray-500">Mã người dùng:</span> {account.id}
                      </p>
                      <p>
                        <span className="text-gray-500">Tạo lúc:</span>{' '}
                        {formatTimestamp(account.created_at)}
                      </p>
                      <p>
                        <span className="text-gray-500">Cập nhật:</span>{' '}
                        {formatTimestamp(account.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/8 bg-black/15 p-4">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
                      Vai trò mới
                    </p>
                    <select
                      value={account.role}
                      disabled={isSaving}
                      onChange={(event) =>
                        void handleUpdateRole(account.id, event.target.value as UserRole)
                      }
                      className="focus:border-primary/40 mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#17110d] px-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-3 text-xs text-gray-500">
                      {isSaving
                        ? 'Đang lưu thay đổi...'
                        : 'Cập nhật quyền truy cập ngay trên từng tài khoản.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-start xl:justify-end">
                    <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 text-sm text-gray-300">
                      <div className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">
                        Tóm tắt
                      </div>
                      <div className="mt-2 font-semibold text-white">{roleMeta.label}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {isCurrentUser ? 'Đang dùng phiên hiện tại' : 'Có thể điều chỉnh ngay'}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-white">Chưa tìm thấy tài khoản phù hợp</h3>
              <p className="mt-2 text-sm text-gray-400">
                Hãy thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc vai trò đang áp dụng.
              </p>
            </div>
          )}
        </div>

        {filteredUsers.length > 0 && (
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
