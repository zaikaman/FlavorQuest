/**
 * POI Detail Page
 * T091, T093 - Trang chi tiết POI với manual audio play
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useTranslations } from '@/lib/hooks/useTranslations';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { usePOIManager } from '@/lib/hooks/usePOIManager';
import { getLocalizedPOI } from '@/lib/utils/localization';
import { logAutoPlay } from '@/lib/services/analytics';
import { saveVisit } from '@/lib/services/storage';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import type { Dish, POI } from '@/lib/types/index';

export default function POIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poiId = params.poiId as string;
  const { language } = useLanguage();
  const { t } = useTranslations();
  const { user } = useAuth();
  
  const { pois, isLoading } = usePOIManager({ language });
  const [poi, setPoi] = useState<POI | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToastMsg = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const audioPlayer = useAudioPlayer({
    autoPlay: false,
    enableTTSFallback: true,
    language,
    onError: () => showToastMsg(t('poiDetail.errorPlaying')),
  });

  // Tìm POI từ danh sách
  useEffect(() => {
    if (pois.length > 0 && poiId) {
      const found = pois.find(p => p.id === poiId);
      setPoi(found || null);
    }
  }, [pois, poiId]);

  useEffect(() => {
    if (!poiId) return;

    const loadDishes = async () => {
      try {
        const res = await fetch(`/api/dishes?poi_id=${poiId}`);
        if (!res.ok) return;
        const data = await res.json();
        setDishes(data ?? []);
      } catch (error) {
        console.error('Load dishes failed:', error);
      }
    };

    loadDishes();
  }, [poiId]);

  // Phát audio
  const handlePlay = async () => {
    if (!poi) return;
    
    const localized = getLocalizedPOI(poi, language);

    await audioPlayer.playNow({
      poi,
      audioUrl: localized.audio_url,
      title: localized.name,
      description: localized.description,
      language,
    });

    // Log analytics
    await logAutoPlay(poi.id, language);
    
    // Save visit
    await saveVisit({
      poi_id: poi.id,
      poi_name: localized.name,
      visited_at: new Date().toISOString(),
      listened: true,
    });

    showToastMsg(t('poiDetail.nowPlaying', { name: localized.name }));
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addToCart = (dishId: string) => {
    setCart(prev => ({ ...prev, [dishId]: (prev[dishId] || 0) + 1 }));
  };

  const removeFromCart = (dishId: string) => {
    setCart(prev => {
      const next = { ...prev };
      const currentQty = next[dishId] || 0;
      if (currentQty <= 1) {
        delete next[dishId];
      } else {
        next[dishId] = currentQty - 1;
      }
      return next;
    });
  };

  const orderItems = dishes
    .filter(dish => (cart[dish.id] || 0) > 0)
    .map(dish => ({ dish, quantity: cart[dish.id] || 0 }));

  const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.dish.price) * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!poi || orderItems.length === 0) return;

    if (!user) {
      router.push('/login?type=customer');
      return;
    }

    setIsOrdering(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poi_id: poi.id,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
          note: orderNote || null,
          items: orderItems.map(item => ({ dish_id: item.dish.id, quantity: item.quantity })),
        }),
      });

      if (!res.ok) {
        throw new Error('Order failed');
      }

      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      setPickupTime('');
      setOrderNote('');
      showToastMsg(t('menu.success'));
    } catch (error) {
      console.error('Place order failed:', error);
      showToastMsg(t('errors.generic'));
    } finally {
      setIsOrdering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!poi) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-4">
        <span className="material-symbols-outlined text-6xl text-muted mb-4">location_off</span>
        <h1 className="text-xl font-bold mb-2">{t('poiDetail.notFound')}</h1>
        <p className="text-muted text-center mb-6">{t('poiDetail.notFoundMessage')}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-primary text-white rounded-lg font-medium"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const localized = getLocalizedPOI(poi, language);

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 pt-12 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full bg-white/10 backdrop-blur-md"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="size-10" aria-hidden="true" />
      </header>

      {/* Hero Image */}
      <div className="relative w-full aspect-[4/3]">
        {poi.image_url ? (
          <img
            src={poi.image_url}
            alt={localized.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#2a1e16] flex items-center justify-center">
            <span className="material-symbols-outlined text-8xl text-primary/30">restaurant</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 -mt-16 relative z-10">
        {/* Title & Meta */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {poi.priority && poi.priority <= 3 && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded">
                #{poi.priority}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{localized.name}</h1>
          {poi.signature_dish && (
            <p className="text-primary text-sm font-medium">🍴 {poi.signature_dish}</p>
          )}
        </div>

        {/* Audio Player Card */}
        <div className="bg-[#2a1e16] rounded-xl p-4 mb-4 border border-white/5">
          {audioPlayer.currentItem?.poi.id === poi.id ? (
            <>
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(audioPlayer.currentTime / (audioPlayer.duration || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>{formatTime(audioPlayer.currentTime)}</span>
                  <span>{formatTime(audioPlayer.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => audioPlayer.seek(Math.max(0, audioPlayer.currentTime - 15))}
                  className="text-white/60 hover:text-white"
                >
                  <span className="material-symbols-outlined text-3xl">replay_10</span>
                </button>
                <button
                  onClick={async () => {
                    if (audioPlayer.currentItem?.language !== language) {
                      if (!localized.audio_url) {
                        showToastMsg(t('poiDetail.errorPlaying'));
                        return;
                      }

                      await audioPlayer.playNow({
                        poi,
                        audioUrl: localized.audio_url,
                        title: localized.name,
                        description: localized.description,
                        language,
                      });
                      return;
                    }

                    if (audioPlayer.isPlaying) {
                      audioPlayer.pause();
                    } else {
                      await audioPlayer.play();
                    }
                  }}
                  className="size-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {audioPlayer.isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  onClick={() => audioPlayer.seek(Math.min(audioPlayer.duration, audioPlayer.currentTime + 15))}
                  className="text-white/60 hover:text-white"
                >
                  <span className="material-symbols-outlined text-3xl">forward_10</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handlePlay}
              className="w-full flex items-center justify-center gap-3 py-3 bg-primary rounded-lg font-bold"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              {t('poiDetail.playNarration')}
            </button>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            {t('poiDetail.introduction')}
          </h2>
          <p className="text-white/80 leading-relaxed">
            {localized.description || t('poiDetail.noDescription')}
          </p>
        </div>

        {/* Fun Fact */}
        {poi.fun_fact && (
          <div className="bg-primary/10 rounded-xl p-4 mb-4 border border-primary/20">
            <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
              {t('poiDetail.didYouKnow')}
            </h3>
            <p className="text-white/80 text-sm">{poi.fun_fact}</p>
          </div>
        )}

        {/* Hours */}
        {poi.estimated_hours && (
          <div className="flex items-center gap-2 text-muted text-sm mb-6">
            <span className="material-symbols-outlined text-lg">schedule</span>
            {poi.estimated_hours}
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">menu_book</span>
            {t('menu.title')}
          </h2>

          <div className="space-y-3">
            {dishes.map(dish => (
              <div key={dish.id} className="rounded-xl border border-white/10 bg-[#2a1e16] p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{dish.name}</p>
                  <p className="text-sm text-gray-400">{dish.description || '-'}</p>
                  <p className="text-primary text-sm mt-1">{Number(dish.price).toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(dish.id)} className="w-8 h-8 rounded-full border border-white/10">-</button>
                  <span className="w-6 text-center">{cart[dish.id] || 0}</span>
                  <button onClick={() => addToCart(dish.id)} className="w-8 h-8 rounded-full bg-primary text-white">+</button>
                </div>
              </div>
            ))}
            {dishes.length === 0 && <p className="text-sm text-gray-400">{t('menu.empty')}</p>}
          </div>
        </div>

        <div className="bg-[#2a1e16] rounded-xl border border-white/10 p-4 space-y-3 mb-8">
          <h3 className="font-bold">{t('menu.cart')}</h3>

          <p className="text-sm text-gray-400">Tổng tạm tính: {totalAmount.toLocaleString('vi-VN')}đ</p>

          <input
            value={customerName}
            onChange={event => setCustomerName(event.target.value)}
            placeholder={t('menu.customerName')}
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
          />
          <input
            value={customerPhone}
            onChange={event => setCustomerPhone(event.target.value)}
            placeholder={t('menu.customerPhone')}
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
          />
          <input
            type="datetime-local"
            value={pickupTime}
            onChange={event => setPickupTime(event.target.value)}
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
          />
          <textarea
            value={orderNote}
            onChange={event => setOrderNote(event.target.value)}
            placeholder={t('menu.note')}
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2"
          />

          <button
            onClick={handlePlaceOrder}
            disabled={orderItems.length === 0 || isOrdering}
            className="w-full py-3 rounded-lg bg-primary text-white font-bold disabled:opacity-50"
          >
            {isOrdering ? t('common.loading') : t('menu.placeOrder')}
          </button>
        </div>
      </div>

      {/* Bottom Safe Area */}
      <div className="h-24" />

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-4 right-4 z-50">
          <Toast message={toastMessage} type="info" onClose={() => setShowToast(false)} />
        </div>
      )}
    </div>
  );
}
