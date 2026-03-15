'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { InlineSpinner } from '@/components/ui/Loading';
import type { AppNotification, Dish, POI, PreorderOrder } from '@/lib/types';

type OwnerTab = 'pois' | 'menu' | 'orders' | 'notifications';
type OrderStatus = PreorderOrder['status'];

const REQUEST_TIMEOUT_MS = 10000;

const ownerTabs: Array<{
  id: OwnerTab;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'pois',
    label: 'Điểm bán',
    description: 'Theo dõi từng POI và chất lượng thông tin đang hiển thị.',
    icon: 'storefront',
  },
  {
    id: 'menu',
    label: 'Thực đơn',
    description: 'Quản lý món, giá bán và tốc độ cập nhật thực đơn.',
    icon: 'restaurant_menu',
  },
  {
    id: 'orders',
    label: 'Đơn đặt trước',
    description: 'Nắm trạng thái đơn theo thời gian thực và xử lý nhanh.',
    icon: 'receipt_long',
  },
  {
    id: 'notifications',
    label: 'Thông báo',
    description: 'Tập trung các tín hiệu mới cần bạn phản hồi.',
    icon: 'notifications',
  },
];

const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: string; pill: string; icon: string }
> = {
  pending: {
    label: 'Chờ xác nhận',
    tone: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    pill: 'bg-amber-500/15 text-amber-200',
    icon: 'schedule',
  },
  confirmed: {
    label: 'Đã xác nhận',
    tone: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
    pill: 'bg-sky-500/15 text-sky-200',
    icon: 'verified',
  },
  preparing: {
    label: 'Đang chuẩn bị',
    tone: 'border-orange-400/20 bg-orange-500/10 text-orange-100',
    pill: 'bg-orange-500/15 text-orange-200',
    icon: 'local_dining',
  },
  ready: {
    label: 'Sẵn sàng giao',
    tone: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    pill: 'bg-emerald-500/15 text-emerald-200',
    icon: 'done_all',
  },
  delivering: {
    label: 'Đang giao',
    tone: 'border-violet-400/20 bg-violet-500/10 text-violet-100',
    pill: 'bg-violet-500/15 text-violet-200',
    icon: 'delivery_dining',
  },
  delivered: {
    label: 'Đã giao xong',
    tone: 'border-lime-400/20 bg-lime-500/10 text-lime-100',
    pill: 'bg-lime-500/15 text-lime-200',
    icon: 'home_pin',
  },
  cancelled: {
    label: 'Đã hủy',
    tone: 'border-white/10 bg-white/5 text-gray-200',
    pill: 'bg-white/10 text-gray-300',
    icon: 'close',
  },
};

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`${url} -> ${response.status}: ${message}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRelativeDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function getOrderTypeLabel(order: PreorderOrder) {
  return order.order_type === 'delivery' ? 'Giao tận nơi' : 'Nhận tại quán';
}

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState<OwnerTab>('pois');
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<PreorderOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newDish, setNewDish] = useState({ name: '', description: '', price: '' });
  const [isSubmittingDish, setIsSubmittingDish] = useState(false);
  const [deletingDishId, setDeletingDishId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isMarkingNotifications, setIsMarkingNotifications] = useState(false);

  const selectedPoi = useMemo(
    () => pois.find((poi) => poi.id === selectedPoiId) ?? null,
    [pois, selectedPoiId]
  );

  const assignedPoiIds = useMemo(() => new Set(pois.map((poi) => poi.id)), [pois]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => assignedPoiIds.has(order.poi_id)),
    [assignedPoiIds, orders]
  );

  const selectedPoiOrders = useMemo(
    () => visibleOrders.filter((order) => order.poi_id === selectedPoiId),
    [selectedPoiId, visibleOrders]
  );

  const pendingOrders = useMemo(
    () =>
      visibleOrders.filter((order) => ['pending', 'confirmed', 'preparing'].includes(order.status)),
    [visibleOrders]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read_at),
    [notifications]
  );

  const selectedPoiRevenue = useMemo(
    () =>
      selectedPoiOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.total_amount), 0),
    [selectedPoiOrders]
  );

  const totalRevenue = useMemo(
    () =>
      visibleOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.total_amount), 0),
    [visibleOrders]
  );

  const averageDishPrice = useMemo(() => {
    if (dishes.length === 0) return 0;
    return dishes.reduce((sum, dish) => sum + Number(dish.price), 0) / dishes.length;
  }, [dishes]);

  const ordersByStatus = useMemo(() => {
    return (Object.keys(orderStatusMeta) as OrderStatus[]).map((status) => ({
      status,
      items: selectedPoiId
        ? selectedPoiOrders.filter((order) => order.status === status)
        : visibleOrders.filter((order) => order.status === status),
    }));
  }, [selectedPoiId, selectedPoiOrders, visibleOrders]);

  const loadInitialData = async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const [poiResult, orderResult, notifResult] = await Promise.allSettled([
        fetchJsonWithTimeout<POI[]>('/api/pois?owner_only=true'),
        fetchJsonWithTimeout<PreorderOrder[]>('/api/orders'),
        fetchJsonWithTimeout<AppNotification[]>('/api/notifications'),
      ]);

      if (poiResult.status === 'fulfilled') {
        const poiData = poiResult.value ?? [];
        setPois(poiData);
        setSelectedPoiId((currentSelectedPoiId) => {
          if (currentSelectedPoiId && poiData.some((poi) => poi.id === currentSelectedPoiId)) {
            return currentSelectedPoiId;
          }

          return poiData[0]?.id ?? '';
        });
      } else {
        console.error('[OwnerPage] load POIs failed:', poiResult.reason);
        setPois([]);
        setSelectedPoiId('');
      }

      if (orderResult.status === 'fulfilled') {
        setOrders(orderResult.value ?? []);
      } else {
        console.error('[OwnerPage] load orders failed:', orderResult.reason);
        setOrders([]);
      }

      if (notifResult.status === 'fulfilled') {
        setNotifications(notifResult.value ?? []);
      } else {
        console.error('[OwnerPage] load notifications failed:', notifResult.reason);
        setNotifications([]);
      }

      const failedRequests = [poiResult, orderResult, notifResult].filter(
        (result) => result.status === 'rejected'
      );

      if (failedRequests.length > 0) {
        setLoadError(
          'Một phần dữ liệu chủ quán tải chưa hoàn tất. Trang vẫn hiển thị phần dữ liệu đang khả dụng.'
        );
      }
    } catch (error) {
      console.error('[OwnerPage] load failed:', error);
      setLoadError('Không thể tải dữ liệu chủ quán. Vui lòng thử lại sau.');
    } finally {
      setHasLoadedInitialData(true);

      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const loadDishes = async (poiId: string) => {
    if (!poiId) {
      setDishes([]);
      return;
    }

    try {
      const data = await fetchJsonWithTimeout<Dish[]>(`/api/dishes?poi_id=${poiId}`);
      setDishes(data ?? []);
    } catch (error) {
      console.error('[OwnerPage] load dishes failed:', error);
      setDishes([]);
    }
  };

  useEffect(() => {
    void loadInitialData({ showLoading: false });
  }, []);

  useEffect(() => {
    if (!selectedPoiId) {
      setDishes([]);
      return;
    }

    void loadDishes(selectedPoiId);
  }, [selectedPoiId]);

  const handleCreateDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPoiId || !newDish.name || !newDish.price) {
      setActionError('Bạn cần nhập tên món và giá bán trước khi lưu.');
      return;
    }

    setIsSubmittingDish(true);
    setActionError(null);

    try {
      const response = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poi_id: selectedPoiId,
          name: newDish.name.trim(),
          description: newDish.description.trim(),
          price: Number(newDish.price),
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Không thể lưu món mới.'));
      }

      setNewDish({ name: '', description: '', price: '' });
      await loadDishes(selectedPoiId);
    } catch (error) {
      console.error('[OwnerPage] create dish failed:', error);
      setActionError(error instanceof Error ? error.message : 'Không thể lưu món mới.');
    } finally {
      setIsSubmittingDish(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!selectedPoiId) return;
    if (!window.confirm('Bạn có chắc muốn xóa món này khỏi thực đơn?')) return;

    setDeletingDishId(dishId);
    setActionError(null);

    try {
      const response = await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Không thể xóa món.'));
      }

      await loadDishes(selectedPoiId);
    } catch (error) {
      console.error('[OwnerPage] delete dish failed:', error);
      setActionError(error instanceof Error ? error.message : 'Không thể xóa món.');
    } finally {
      setDeletingDishId(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setActionError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Không thể cập nhật trạng thái đơn.'));
      }

      await loadInitialData();
    } catch (error) {
      console.error('[OwnerPage] update order failed:', error);
      setActionError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const markAllNotifications = async () => {
    setIsMarkingNotifications(true);
    setActionError(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, 'Không thể đánh dấu toàn bộ thông báo đã đọc.')
        );
      }

      await loadInitialData();
    } catch (error) {
      console.error('[OwnerPage] mark notifications failed:', error);
      setActionError(
        error instanceof Error ? error.message : 'Không thể đánh dấu toàn bộ thông báo đã đọc.'
      );
    } finally {
      setIsMarkingNotifications(false);
    }
  };

  const overviewCards = [
    {
      label: 'POI đang quản lý',
      value: String(pois.length),
      note: selectedPoi
        ? `Đang tập trung vào ${selectedPoi.name_vi}`
        : 'Chọn một điểm bán để xem chi tiết',
      accent: 'text-primary',
      glow: 'from-primary/15',
      border: 'border-primary/20',
    },
    {
      label: 'Đơn đang mở',
      value: String(pendingOrders.length),
      note:
        pendingOrders.length > 0
          ? `${visibleOrders.filter((order) => order.status === 'ready').length} đơn đã sẵn sàng giao`
          : 'Chưa có đơn cần xử lý ngay',
      accent: 'text-amber-200',
      glow: 'from-amber-500/15',
      border: 'border-amber-400/20',
    },
    {
      label: 'Doanh thu ghi nhận',
      value: formatCurrency(totalRevenue),
      note:
        selectedPoiId && selectedPoiOrders.length > 0
          ? `${formatCurrency(selectedPoiRevenue)} đến từ điểm bán đang chọn`
          : 'Tính trên toàn bộ đơn chưa bị hủy',
      accent: 'text-emerald-300',
      glow: 'from-emerald-500/15',
      border: 'border-emerald-400/20',
    },
    {
      label: 'Thông báo chưa đọc',
      value: String(unreadNotifications.length),
      note: unreadNotifications[0]
        ? `Tin mới nhất ${formatRelativeDate(unreadNotifications[0].created_at)}`
        : 'Không có cảnh báo mới',
      accent: 'text-sky-300',
      glow: 'from-sky-500/15',
      border: 'border-sky-400/20',
    },
  ];

  return (
    <div className="space-y-8">
      {!hasLoadedInitialData && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-gray-200">
          <InlineSpinner label="Đang tải dữ liệu chủ quán..." />
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          {loadError}
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {actionError}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#2c1e16]">
          <div className="from-primary/12 border-b border-white/10 bg-gradient-to-r via-transparent to-transparent px-6 py-6 lg:px-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-3xl">
                <p className="text-primary/80 text-xs font-semibold tracking-[0.32em] uppercase">
                  Không gian vận hành
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  {selectedPoi ? selectedPoi.name_vi : 'Bảng điều hành dành cho chủ quán'}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                  Theo dõi tình trạng điểm bán, xử lý đơn đặt trước và cập nhật thực đơn trong một
                  màn hình gọn, rõ và dễ thao tác.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isLoading && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Đang cập nhật dữ liệu...
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-200">
                    {pois.length} điểm bán đang quản lý
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-200">
                    {selectedPoi?.signature_dish
                      ? `Món nổi bật: ${selectedPoi.signature_dish}`
                      : 'Chưa khai báo món nổi bật'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-200">
                    {selectedPoi?.estimated_hours
                      ? `Khung giờ: ${selectedPoi.estimated_hours}`
                      : 'Chưa có giờ mở cửa'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadInitialData()}
                  disabled={isLoading}
                  className="bg-primary rounded-2xl px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Làm mới dữ liệu
                </button>
                <button
                  type="button"
                  onClick={() => window.open('/tour', '_blank', 'noopener,noreferrer')}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                >
                  Mở giao diện khách hàng
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            {[
              {
                label: 'Đơn của điểm bán đang chọn',
                value: String(selectedPoiOrders.length),
                note: selectedPoi
                  ? `Tổng đơn tại ${selectedPoi.name_vi}`
                  : 'Chọn điểm bán để theo dõi',
                accent: 'text-primary',
              },
              {
                label: 'Món hiện có',
                value: String(dishes.length),
                note:
                  dishes.length > 0
                    ? `Giá trung bình ${formatCurrency(averageDishPrice)}`
                        : 'Thực đơn đang trống',
                accent: 'text-amber-200',
              },
              {
                label: 'Cập nhật gần nhất',
                value: selectedPoi ? formatRelativeDate(selectedPoi.updated_at) : 'Chưa có',
                note: selectedPoi
                  ? `POI cập nhật lúc ${formatDateTime(selectedPoi.updated_at)}`
                  : 'Không có POI nào được gán',
                accent: 'text-emerald-300',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
                  {item.label}
                </p>
                <p className={`mt-3 text-3xl leading-none font-black ${item.accent}`}>
                  {item.value}
                </p>
                <p className="mt-3 text-sm text-gray-400">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#2c1e16] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-primary text-sm font-semibold">Điểm quản lý</p>
              <h3 className="mt-1 text-xl font-black text-white">Danh mục quán của bạn</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
              {pois.length} POI
            </span>
          </div>

          {pois.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-white">Bạn chưa được gán điểm bán nào.</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Liên hệ quản trị viên để cấp POI. Khi có điểm bán, trang này sẽ chuyển sang dạng bảng điều hành
                vận hành đầy đủ.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {pois.map((poi) => {
                const isSelected = poi.id === selectedPoiId;
                const poiOrderCount = visibleOrders.filter(
                  (order) => order.poi_id === poi.id
                ).length;

                return (
                  <button
                    key={poi.id}
                    type="button"
                    onClick={() => setSelectedPoiId(poi.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      isSelected
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-white/10 bg-black/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-semibold text-white">{poi.name_vi}</p>
                          {isSelected && (
                            <span className="bg-primary/15 text-primary rounded-full px-2 py-1 text-[11px] font-bold">
                              Đang xem
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-400">
                          {poi.signature_dish || 'Chưa có món nổi bật'} •{' '}
                          {poi.estimated_hours || 'Chưa có giờ mở cửa'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary text-lg font-black">{poiOrderCount}</p>
                        <p className="text-xs text-gray-500">đơn đã ghi nhận</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className={`overflow-hidden rounded-[24px] border ${card.border} bg-[#2c1e16]`}
          >
            <div
              className={`bg-gradient-to-r ${card.glow} via-transparent to-transparent px-5 py-5`}
            >
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
              <p className="mt-3 text-xs leading-5 text-gray-400">{card.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          {ownerTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const count =
              tab.id === 'menu'
                ? dishes.length
                : tab.id === 'orders'
                  ? selectedPoiId
                    ? selectedPoiOrders.length
                    : visibleOrders.length
                  : tab.id === 'notifications'
                    ? unreadNotifications.length
                    : pois.length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[22px] border px-4 py-4 text-left transition-colors ${
                  isActive
                    ? 'border-primary/30 bg-primary/12'
                    : 'border-white/10 bg-black/15 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-xl ${
                          isActive ? 'text-primary' : 'text-gray-400'
                        }`}
                      >
                        {tab.icon}
                      </span>
                      <p className="font-semibold text-white">{tab.label}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{tab.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'pois' && (
        <>
          {selectedPoi ? (
            <>
              <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
                  <p className="text-primary text-sm font-semibold">Chi tiết điểm bán</p>
                  <h3 className="mt-1 text-2xl font-black text-white">{selectedPoi.name_vi}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Tóm tắt nhanh chất lượng thông tin, mức độ sẵn sàng nội dung và bối cảnh vận
                    hành cho điểm bán đang được chọn.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[
                      {
                        label: 'Món đặc trưng',
                        value: selectedPoi.signature_dish || 'Chưa cập nhật',
                      },
                      {
                        label: 'Giờ mở cửa',
                        value: selectedPoi.estimated_hours || 'Chưa cập nhật',
                      },
                      {
                        label: 'Lần cập nhật cuối',
                        value: formatDateTime(selectedPoi.updated_at),
                      },
                      {
                        label: 'Tần suất đơn',
                        value:
                          selectedPoiOrders.length > 0
                            ? `${selectedPoiOrders.length} đơn đã ghi nhận`
                            : 'Chưa có đơn nào',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4"
                      >
                        <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                          {item.label}
                        </p>
                        <p className="mt-3 text-lg font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
                  <p className="text-primary text-sm font-semibold">Mức sẵn sàng nội dung</p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    Kiểm tra nhanh cho khách hàng
                  </h3>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        label: 'Ảnh đại diện',
                        ready: Boolean(selectedPoi.image_url),
                        note: selectedPoi.image_url
                          ? 'Đã có ảnh để hiển thị trên giao diện khách hàng.'
                          : 'Nên bổ sung ảnh để thẻ POI bớt trống.',
                      },
                      {
                        label: 'Audio tiếng Việt',
                        ready: Boolean(selectedPoi.audio_url_vi),
                        note: selectedPoi.audio_url_vi
                          ? 'Sẵn sàng cho trải nghiệm nghe tự động.'
                          : 'Thiếu audio, trải nghiệm nghe sẽ bị khuyết.',
                      },
                      {
                        label: 'Mô tả giới thiệu',
                        ready: Boolean(selectedPoi.description_vi?.trim()),
                        note: selectedPoi.description_vi?.trim()
                          ? 'Đã có nội dung giới thiệu cơ bản.'
                          : 'Nên thêm mô tả để tạo ngữ cảnh cho khách.',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-2xl border px-4 py-4 ${
                          item.ready
                            ? 'border-emerald-400/20 bg-emerald-500/10'
                            : 'border-white/10 bg-black/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{item.label}</p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">{item.note}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.ready
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : 'bg-white/10 text-gray-300'
                            }`}
                          >
                            {item.ready ? 'Ổn' : 'Thiếu'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-primary text-sm font-semibold">Nhịp vận hành</p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      Trạng thái đơn theo điểm bán
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
                    {selectedPoiOrders.length} đơn
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {(Object.keys(orderStatusMeta) as OrderStatus[]).map((status) => {
                    const count = selectedPoiOrders.filter(
                      (order) => order.status === status
                    ).length;
                    const meta = orderStatusMeta[status];

                    return (
                      <div key={status} className={`rounded-2xl border px-4 py-4 ${meta.tone}`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                          <p className="text-sm font-semibold">{meta.label}</p>
                        </div>
                        <p className="mt-4 text-3xl font-black">{count}</p>
                        <p className="mt-2 text-xs leading-5 text-current/80">
                          {count > 0 ? 'Có hoạt động ở trạng thái này.' : 'Hiện chưa có đơn.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-[#2c1e16] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">Chưa có điểm bán để hiển thị.</p>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Khi quản trị viên gán POI cho tài khoản này, phần tổng quan điểm bán sẽ hiện đầy đủ thông
                tin và trạng thái nội dung.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'menu' && (
        <>
          {!selectedPoi ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-[#2c1e16] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                Chọn một điểm bán để quản lý thực đơn.
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Thực đơn luôn gắn với từng POI, nên bạn cần chọn quán cụ thể trước khi thêm hoặc xóa
                món.
              </p>
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: 'Món hiện có',
                    value: String(dishes.length),
                    note: `Đang hiển thị cho ${selectedPoi.name_vi}`,
                  },
                  {
                    label: 'Giá trung bình',
                    value: dishes.length > 0 ? formatCurrency(averageDishPrice) : 'Chưa có',
                    note: 'Giúp bạn nhìn nhanh mức giá đang niêm yết',
                  },
                  {
                    label: 'Đơn liên quan',
                    value: String(selectedPoiOrders.length),
                    note: 'Dùng để cân đối thực đơn với nhu cầu thực tế',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-[#2c1e16] px-5 py-5"
                  >
                    <p className="text-sm text-gray-400">{item.label}</p>
                    <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
                    <p className="mt-3 text-xs leading-5 text-gray-400">{item.note}</p>
                  </div>
                ))}
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <form
                  onSubmit={handleCreateDish}
                  className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6"
                >
                  <p className="text-primary text-sm font-semibold">Thêm món mới</p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    Cập nhật thực đơn cho {selectedPoi.name_vi}
                  </h3>

                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-200">
                        Tên món
                      </span>
                      <input
                        value={newDish.name}
                        onChange={(event) =>
                          setNewDish((previous) => ({ ...previous, name: event.target.value }))
                        }
                        placeholder="Ví dụ: Bánh tráng nướng mắm ruốc"
                        className="focus:border-primary/40 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-gray-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-200">
                        Mô tả ngắn
                      </span>
                      <textarea
                        value={newDish.description}
                        onChange={(event) =>
                          setNewDish((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Ghi vài dòng ngắn về hương vị hoặc điểm nhấn của món."
                        className="focus:border-primary/40 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-gray-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-200">
                        Giá bán (VND)
                      </span>
                      <input
                        value={newDish.price}
                        onChange={(event) =>
                          setNewDish((previous) => ({ ...previous, price: event.target.value }))
                        }
                        type="number"
                        min="0"
                        placeholder="65000"
                        className="focus:border-primary/40 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white transition-colors outline-none placeholder:text-gray-500"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-gray-400 sm:max-w-md">
                      Dùng biểu mẫu này cho cập nhật nhanh. Nếu sau này cần ảnh hoặc biến thể món, nên
                      mở rộng cấu trúc dữ liệu riêng.
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmittingDish}
                      className="bg-primary rounded-2xl px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingDish ? <InlineSpinner label="Đang lưu..." /> : 'Lưu món'}
                    </button>
                  </div>
                </form>

                <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-primary text-sm font-semibold">Thực đơn hiện tại</p>
                      <h3 className="mt-1 text-xl font-black text-white">
                        Danh sách món đang niêm yết
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
                      {dishes.length} món
                    </span>
                  </div>

                  {dishes.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-white">Thực đơn đang trống.</p>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        Thêm món đầu tiên để khách có thể đặt trước ngay từ ứng dụng.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {dishes.map((dish) => (
                        <div
                          key={dish.id}
                          className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words font-semibold text-white">{dish.name}</p>
                                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-200">
                                  Đang bán
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-gray-400">
                                {dish.description || 'Chưa có mô tả cho món này.'}
                              </p>
                              <p className="text-primary mt-3 text-sm font-semibold">
                                {formatCurrency(Number(dish.price))}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleDeleteDish(dish.id)}
                              disabled={deletingDishId === dish.id}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingDishId === dish.id ? <InlineSpinner label="Đang xóa..." /> : 'Xóa'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {activeTab === 'orders' && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {(Object.keys(orderStatusMeta) as OrderStatus[]).map((status) => {
              const meta = orderStatusMeta[status];
              const count =
                ordersByStatus.find((group) => group.status === status)?.items.length ?? 0;

              return (
                <div key={status} className={`rounded-[24px] border px-5 py-5 ${meta.tone}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                    <p className="text-sm font-semibold">{meta.label}</p>
                  </div>
                  <p className="mt-4 text-3xl font-black">{count}</p>
                  <p className="mt-2 text-xs leading-5 text-current/80">
                    {selectedPoi ? `Cho ${selectedPoi.name_vi}` : 'Trên toàn bộ điểm bán'}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-primary text-sm font-semibold">Danh sách đơn</p>
                <h3 className="mt-1 text-xl font-black text-white">
                  {selectedPoi ? `Đơn tại ${selectedPoi.name_vi}` : 'Tất cả đơn đặt trước'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Mỗi thẻ đơn cho phép chuyển trạng thái ngay để chủ quán xử lý nhanh mà không cần
                  rời bảng điều hành.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
                {selectedPoi
                  ? `${selectedPoiOrders.length} đơn đang hiển thị`
                  : `${visibleOrders.length} đơn tổng`}
              </span>
            </div>

            {(selectedPoi ? selectedPoiOrders : visibleOrders).length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">Chưa có đơn đặt trước.</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Khi khách đặt món từ ứng dụng, đơn sẽ xuất hiện tại đây theo thời gian thực.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {ordersByStatus
                  .filter((group) => group.items.length > 0)
                  .map((group) => {
                    const meta = orderStatusMeta[group.status];

                    return (
                      <div
                        key={group.status}
                        className="rounded-2xl border border-white/10 bg-black/15 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-white">
                              {meta.icon}
                            </span>
                            <h4 className="font-semibold text-white">{meta.label}</h4>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.pill}`}>
                            {group.items.length}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {group.items.map((order) => (
                            <div
                              key={order.id}
                              className="rounded-2xl border border-white/10 bg-[#241912] px-4 py-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white">
                                    #{order.id.slice(0, 8)}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-400">
                                    {order.pois?.name_vi || 'POI'} •{' '}
                                    {formatDateTime(order.created_at)}
                                  </p>
                                  <p className="mt-2 text-xs font-semibold text-primary">
                                    {getOrderTypeLabel(order)}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${meta.pill}`}
                                >
                                  {meta.label}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-black/20 px-3 py-3">
                                  <p className="text-[11px] tracking-[0.18em] text-gray-500 uppercase">
                                    Khách hàng
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-white">
                                    {order.customer_name || 'Ẩn danh'}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-400">
                                    {order.customer_phone || 'Chưa có số điện thoại'}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-black/20 px-3 py-3">
                                  <p className="text-[11px] tracking-[0.18em] text-gray-500 uppercase">
                                    Tổng tiền
                                  </p>
                                  <p className="text-primary mt-2 text-sm font-semibold">
                                    {formatCurrency(Number(order.total_amount))}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-400">
                                    {order.pickup_time
                                      ? `Lấy món lúc ${formatDateTime(order.pickup_time)}`
                                      : 'Khách chưa chọn giờ nhận'}
                                  </p>
                                </div>
                              </div>

                              {order.preorder_order_items &&
                                order.preorder_order_items.length > 0 && (
                                  <div className="mt-4 rounded-xl bg-black/20 px-3 py-3">
                                    <p className="text-[11px] tracking-[0.18em] text-gray-500 uppercase">
                                      Món đã đặt
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {order.preorder_order_items.map((item) => (
                                        <span
                                          key={item.id}
                                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                                        >
                                          {item.dishes?.name || 'Món'} x{item.quantity}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                {(Object.keys(orderStatusMeta) as OrderStatus[]).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => void handleUpdateOrderStatus(order.id, status)}
                                    disabled={
                                      updatingOrderId === order.id || order.status === status
                                    }
                                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                                      order.status === status
                                        ? 'border-primary/30 bg-primary/15 text-primary'
                                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                  >
                                    {orderStatusMeta[status].label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'notifications' && (
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <p className="text-primary text-sm font-semibold">Tín hiệu mới</p>
            <h3 className="mt-1 text-xl font-black text-white">Tổng hợp thông báo</h3>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: 'Chưa đọc',
                  value: String(unreadNotifications.length),
                  note:
                    unreadNotifications.length > 0
                      ? 'Nên xử lý trước các thông báo mới.'
                      : 'Hộp thư đang sạch.',
                },
                {
                  label: 'Tổng thông báo',
                  value: String(notifications.length),
                  note: notifications[0]
                    ? `Có cập nhật gần nhất lúc ${formatDateTime(notifications[0].created_at)}`
                    : 'Chưa có lịch sử thông báo.',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4"
                >
                  <p className="text-sm text-gray-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
                  <p className="mt-3 text-xs leading-5 text-gray-400">{item.note}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void markAllNotifications()}
              disabled={notifications.length === 0 || isMarkingNotifications}
              className="bg-primary mt-6 rounded-2xl px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingNotifications ? <InlineSpinner label="Đang cập nhật..." /> : 'Đánh dấu tất cả đã đọc'}
            </button>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#2c1e16] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-semibold">Luồng thông báo</p>
                <h3 className="mt-1 text-xl font-black text-white">Danh sách gần đây</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-gray-300">
                50 mục gần nhất
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">Bạn chưa có thông báo nào.</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Khi có đơn mới hoặc cập nhật hệ thống, thông báo sẽ hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      notification.read_at
                        ? 'border-white/10 bg-black/15'
                        : 'border-primary/30 bg-primary/10'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-semibold text-white">{notification.title}</p>
                          {!notification.read_at && (
                            <span className="bg-primary/15 text-primary rounded-full px-2 py-1 text-[11px] font-bold">
                              Mới
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-300">
                          {notification.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {formatDateTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
