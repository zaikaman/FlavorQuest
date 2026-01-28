/**
 * OfflineIndicator Component
 * 
 * Hiển thị trạng thái offline/online và sync status
 * 
 * Features:
 * - Badge hiển thị trạng thái offline
 * - Indicator cho pending sync items
 * - Animation khi syncing
 * - Click để manual sync
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from '@/lib/hooks/useOfflineSync';

export interface OfflineIndicatorProps {
  /** Hiển thị dạng compact (chỉ icon) */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Callback khi click vào indicator */
  onClick?: () => void;
  /** Hiển thị số pending items */
  showPendingCount?: boolean;
  /** Callback khi trạng thái offline thay đổi */
  onOfflineChange?: (isOffline: boolean) => void;
  /** Callback khi sync hoàn thành */
  onSyncComplete?: (syncedCount: number) => void;
}

export function OfflineIndicator({
  compact = false,
  className = '',
  onClick,
  showPendingCount = true,
  onOfflineChange,
  onSyncComplete,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    syncStatus,
    pendingEventsCount,
    syncNow,
    isOfflineReady,
  } = useOfflineSync({
    autoSync: true,
    onSyncSuccess: (count) => {
      onSyncComplete?.(count);
    },
    onNetworkChange: (online) => {
      onOfflineChange?.(!online);
    },
  });

  const [, setShowSyncToast] = useState(false);

  // Handle click
  const handleClick = useCallback(async () => {
    onClick?.();

    // Manual sync if online and has pending items
    if (isOnline && pendingEventsCount > 0) {
      await syncNow();
      setShowSyncToast(true);
      setTimeout(() => setShowSyncToast(false), 3000);
    }
  }, [onClick, isOnline, pendingEventsCount, syncNow]);

  // Notify when offline status changes
  useEffect(() => {
    onOfflineChange?.(!isOnline);
  }, [isOnline, onOfflineChange]);

  // Determine icon and color
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: 'cloud_off',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'Ngoại tuyến',
        description: isOfflineReady
          ? 'Đang sử dụng dữ liệu đã lưu'
          : 'Một số tính năng không khả dụng',
      };
    }

    if (syncStatus === 'syncing') {
      return {
        icon: 'sync',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Đang đồng bộ...',
        description: 'Đang tải dữ liệu lên máy chủ',
        spinning: true,
      };
    }

    if (syncStatus === 'error') {
      return {
        icon: 'sync_problem',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Lỗi đồng bộ',
        description: 'Nhấn để thử lại',
      };
    }

    if (pendingEventsCount > 0) {
      return {
        icon: 'cloud_sync',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        label: 'Chờ đồng bộ',
        description: `${pendingEventsCount} mục đang chờ`,
      };
    }

    return {
      icon: 'cloud_done',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Trực tuyến',
      description: 'Đã đồng bộ',
    };
  };

  const status = getStatusInfo();

  // Compact mode - only show when offline or syncing
  if (compact) {
    if (isOnline && syncStatus !== 'syncing' && pendingEventsCount === 0) {
      return null;
    }

    return (
      <button
        onClick={handleClick}
        className={`
          relative flex items-center justify-center
          w-10 h-10 rounded-full
          ${status.bgColor}
          transition-all duration-200
          hover:scale-110
          ${className}
        `}
        aria-label={status.label}
      >
        <span
          className={`
            material-symbols-outlined text-xl
            ${status.color}
            ${status.spinning ? 'animate-spin' : ''}
          `}
        >
          {status.icon}
        </span>

        {/* Pending count badge */}
        {showPendingCount && pendingEventsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {pendingEventsCount > 9 ? '9+' : pendingEventsCount}
          </span>
        )}
      </button>
    );
  }

  // Full mode
  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        ${status.bgColor}
        transition-all duration-200
        hover:opacity-80
        ${className}
      `}
      aria-label={status.label}
    >
      {/* Icon */}
      <div className="relative">
        <span
          className={`
            material-symbols-outlined text-2xl
            ${status.color}
            ${status.spinning ? 'animate-spin' : ''}
          `}
        >
          {status.icon}
        </span>

        {/* Pending count badge */}
        {showPendingCount && pendingEventsCount > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {pendingEventsCount > 9 ? '9+' : pendingEventsCount}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col items-start">
        <span className={`text-sm font-medium ${status.color}`}>
          {status.label}
        </span>
        <span className="text-xs text-gray-400">
          {status.description}
        </span>
      </div>

      {/* Sync button (when online with pending items) */}
      {isOnline && pendingEventsCount > 0 && syncStatus !== 'syncing' && (
        <span className="ml-auto text-xs text-gray-400 underline">
          Nhấn để đồng bộ
        </span>
      )}
    </button>
  );
}

/**
 * Floating Offline Badge
 * Hiển thị ở góc màn hình khi offline
 */
export function OfflineBadge({ className = '' }: { className?: string }) {
  const { isOnline, isOfflineReady } = useOfflineSync();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-4 py-2
        bg-yellow-500/90 backdrop-blur-sm
        rounded-full shadow-lg
        animate-fade-in
        ${className}
      `}
    >
      <span className="material-symbols-outlined text-lg text-black">
        cloud_off
      </span>
      <span className="text-sm font-medium text-black">
        {isOfflineReady ? 'Chế độ ngoại tuyến' : 'Không có kết nối'}
      </span>
    </div>
  );
}

/**
 * Sync Status Indicator (for use in settings or header)
 */
export function SyncStatusIndicator({ className = '' }: { className?: string }) {
  const {
    isOnline,
    syncStatus,
    pendingEventsCount,
    lastSyncTime,
    syncNow,
  } = useOfflineSync();

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Chưa đồng bộ';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Status row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Trạng thái</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm font-medium">
            {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
          </span>
        </div>
      </div>

      {/* Last sync row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Đồng bộ lần cuối</span>
        <span className="text-sm font-medium">
          {formatLastSync(lastSyncTime)}
        </span>
      </div>

      {/* Pending items row */}
      {pendingEventsCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Chờ đồng bộ</span>
          <span className="text-sm font-medium text-amber-500">
            {pendingEventsCount} mục
          </span>
        </div>
      )}

      {/* Sync button */}
      {isOnline && pendingEventsCount > 0 && (
        <button
          onClick={syncNow}
          disabled={syncStatus === 'syncing'}
          className={`
            mt-2 w-full py-2 px-4 rounded-lg
            text-sm font-medium
            transition-colors duration-200
            ${
              syncStatus === 'syncing'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/80'
            }
          `}
        >
          {syncStatus === 'syncing' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg animate-spin">
                sync
              </span>
              Đang đồng bộ...
            </span>
          ) : (
            'Đồng bộ ngay'
          )}
        </button>
      )}
    </div>
  );
}

export default OfflineIndicator;
