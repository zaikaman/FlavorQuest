'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AppNotification, Dish, POI, PreorderOrder } from '@/lib/types';

type OwnerTab = 'pois' | 'menu' | 'orders' | 'notifications';

export default function OwnerDashboardPage() {
  const [activeTab, setActiveTab] = useState<OwnerTab>('pois');
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string>('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<PreorderOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDish, setNewDish] = useState({ name: '', description: '', price: '' });

  const selectedPoi = useMemo(() => pois.find(poi => poi.id === selectedPoiId) ?? null, [pois, selectedPoiId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [poiRes, orderRes, notifRes] = await Promise.all([
        fetch('/api/pois?owner_only=true'),
        fetch('/api/orders'),
        fetch('/api/notifications'),
      ]);

      if (poiRes.ok) {
        const poiData = await poiRes.json();
        setPois(poiData ?? []);
        if (poiData?.length > 0) {
          setSelectedPoiId(poiData[0].id);
        }
      }

      if (orderRes.ok) {
        setOrders(await orderRes.json());
      }

      if (notifRes.ok) {
        setNotifications(await notifRes.json());
      }
    } catch (error) {
      console.error('Load owner data failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDishes = async (poiId: string) => {
    try {
      const res = await fetch(`/api/dishes?poi_id=${poiId}`);
      if (res.ok) {
        setDishes(await res.json());
      }
    } catch (error) {
      console.error('Load dishes failed:', error);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPoiId) {
      loadDishes(selectedPoiId);
    }
  }, [selectedPoiId]);

  const handleCreateDish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPoiId || !newDish.name || !newDish.price) return;

    const res = await fetch('/api/dishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poi_id: selectedPoiId,
        name: newDish.name,
        description: newDish.description,
        price: Number(newDish.price),
      }),
    });

    if (res.ok) {
      setNewDish({ name: '', description: '', price: '' });
      loadDishes(selectedPoiId);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    const res = await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });
    if (res.ok && selectedPoiId) {
      loadDishes(selectedPoiId);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      loadInitialData();
    }
  };

  const markAllNotifications = async () => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });

    if (res.ok) {
      loadInitialData();
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bảng điều khiển chủ quán</h2>
        <p className="text-gray-400">Quản lý POI, menu và đơn đặt trước</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['pois', 'POI của tôi'],
          ['menu', 'Menu món ăn'],
          ['orders', 'Đơn đặt trước'],
          ['notifications', 'Thông báo'],
        ] as Array<[OwnerTab, string]>).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === id ? 'bg-primary text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pois.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
          Bạn chưa được gán POI. Hãy liên hệ admin để được cấp quyền quản lý quán.
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {pois.map(poi => (
            <button
              key={poi.id}
              onClick={() => setSelectedPoiId(poi.id)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                selectedPoiId === poi.id
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              {poi.name_vi}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'pois' && selectedPoi && (
        <div className="rounded-xl border border-white/10 bg-[#2c1e16] p-5 space-y-3">
          <h3 className="font-bold text-lg">Thông tin POI</h3>
          <p className="text-sm text-gray-300">Tên: {selectedPoi.name_vi}</p>
          <p className="text-sm text-gray-300">Món đặc trưng: {selectedPoi.signature_dish || '-'}</p>
          <p className="text-sm text-gray-300">Giờ mở cửa: {selectedPoi.estimated_hours || '-'}</p>
        </div>
      )}

      {activeTab === 'menu' && selectedPoi && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleCreateDish} className="rounded-xl border border-white/10 bg-[#2c1e16] p-5 space-y-3">
            <h3 className="font-bold text-lg">Thêm món mới</h3>
            <input
              value={newDish.name}
              onChange={event => setNewDish(prev => ({ ...prev, name: event.target.value }))}
              placeholder="Tên món"
              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
            />
            <textarea
              value={newDish.description}
              onChange={event => setNewDish(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Mô tả ngắn"
              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
            />
            <input
              value={newDish.price}
              onChange={event => setNewDish(prev => ({ ...prev, price: event.target.value }))}
              type="number"
              min="0"
              placeholder="Giá món (VND)"
              className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
            />
            <button className="px-4 py-2 bg-primary rounded-lg font-semibold">Lưu món</button>
          </form>

          <div className="rounded-xl border border-white/10 bg-[#2c1e16] p-5">
            <h3 className="font-bold text-lg mb-3">Menu hiện tại</h3>
            <div className="space-y-3">
              {dishes.map(dish => (
                <div key={dish.id} className="rounded-lg border border-white/10 p-3 flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">{dish.name}</p>
                    <p className="text-sm text-gray-400">{dish.description || 'Không có mô tả'}</p>
                    <p className="text-sm text-primary mt-1">{Number(dish.price).toLocaleString('vi-VN')}đ</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDish(dish.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Xóa
                  </button>
                </div>
              ))}
              {dishes.length === 0 && <p className="text-sm text-gray-400">Chưa có món nào.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="rounded-xl border border-white/10 bg-[#2c1e16] p-5 space-y-3">
          <h3 className="font-bold text-lg">Đơn đặt trước</h3>
          {orders.map(order => (
            <div key={order.id} className="rounded-lg border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">#{order.id.slice(0, 8)} • {order.pois?.name_vi || 'POI'}</p>
                <span className="text-sm text-gray-300">{order.status}</span>
              </div>
              <p className="text-sm text-gray-400">Khách: {order.customer_name || 'Ẩn danh'} • {order.customer_phone || '-'}</p>
              <p className="text-sm text-gray-400">Tổng: {Number(order.total_amount).toLocaleString('vi-VN')}đ</p>
              <div className="flex gap-2 flex-wrap">
                {['confirmed', 'preparing', 'ready', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleUpdateOrderStatus(order.id, status)}
                    className="px-3 py-1 rounded border border-white/10 text-xs hover:bg-white/10"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-gray-400">Chưa có đơn đặt trước.</p>}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="rounded-xl border border-white/10 bg-[#2c1e16] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Thông báo</h3>
            <button onClick={markAllNotifications} className="text-sm text-primary">Đánh dấu đã đọc</button>
          </div>
          {notifications.map(notification => (
            <div key={notification.id} className={`rounded-lg border p-3 ${notification.read_at ? 'border-white/10' : 'border-primary/40 bg-primary/5'}`}>
              <p className="font-semibold">{notification.title}</p>
              <p className="text-sm text-gray-400">{notification.message}</p>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-gray-400">Bạn chưa có thông báo.</p>}
        </div>
      )}
    </div>
  );
}
