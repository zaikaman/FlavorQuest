/**
 * Tour Layout
 * Location permission request wrapper
 * Based on design_template/location_access_permission/code.html
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

export default function TourLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!('permissions' in navigator)) {
      // Assume granted if Permissions API not available
      setPermissionState('granted');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
      
      if (result.state === 'prompt') {
        setShowPermissionModal(true);
      } else if (result.state === 'denied') {
        setShowPermissionModal(true);
      }

      // Listen for permission changes
      result.addEventListener('change', () => {
        const newState = result.state as 'prompt' | 'granted' | 'denied';
        setPermissionState(newState);
        
        if (newState === 'granted') {
          setShowPermissionModal(false);
        }
      });
    } catch (error) {
      console.warn('Permission API not supported:', error);
      setPermissionState('granted');
    }
  };

  const handleAllowLocation = async () => {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      // Permission granted
      setPermissionState('granted');
      setShowPermissionModal(false);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      
      if (geoError.code === geoError.PERMISSION_DENIED) {
        setPermissionState('denied');
      } else {
        // Other errors (timeout, position unavailable)
        console.error('Geolocation error:', error);
      }
    }
  };

  const handleManualMode = () => {
    router.push('/browse');
  };

  if (permissionState === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
          <p className="text-white text-lg">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}

      {/* Location Permission Modal */}
      <Modal isOpen={showPermissionModal} onClose={() => setShowPermissionModal(false)}>
        <div className="relative flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
          {/* Ambient Background Glow */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent opacity-50"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-4 pt-8">
            {/* Illustration Area */}
            <div className="mb-8 flex w-full max-w-[320px] flex-col items-center justify-center">
              <div className="relative aspect-square w-full overflow-hidden rounded-full bg-primary/5 p-8 ring-1 ring-white/5 dark:bg-white/5">
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-60"></div>
                
                {/* Image */}
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-background-dark/50 shadow-2xl backdrop-blur-sm">
                  <div
                    className="h-full w-full bg-contain bg-center bg-no-repeat opacity-90 mix-blend-normal"
                    style={{
                      backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBhuo0skfvTiZt_3lWmoCLAxIhH97-k2p4IhT7Dp8a7K5tUePgr9bFbdZAjBTH1Vs6fKQbEAz2vIAhakVKb6vssUJtxwzAdz2DLyMhrE8cbQZS3KveST3ofStke2JtI07C-_59pLK8Yu6oU3umBVBaTQspcm_-9qY8uOTT3zc62ooJYYIIcxVP5AiD2qFpzHHak2Jc5NYitNYl6_xqq7nWHf1m7PEKjWaKJurX3HbD8I0PfMwT2Kfl_LKKKvI0FAmZZberhJFDPhXEh')`,
                    }}
                  ></div>
                  
                  {/* Floating POI Icon Overlay */}
                  <div className="absolute flex size-16 items-center justify-center rounded-full bg-primary shadow-[0_0_30px_rgba(242,108,13,0.6)]">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>location_on</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Group */}
            <div className="flex max-w-md flex-col items-center text-center">
              {/* Headline */}
              <h2 className="px-2 pb-3 pt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                Cho phép vị trí để tự động phát thuyết minh gần quán ăn
              </h2>
              
              {/* Body Text */}
              <p className="px-4 pb-3 pt-1 text-base font-normal leading-relaxed text-slate-600 dark:text-slate-300/80">
                Trải nghiệm tốt nhất khi ứng dụng tự động nhận diện vị trí của bạn trên đường Vĩnh Khánh.
              </p>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="relative z-10 mt-auto w-full px-4 pb-8 pt-4 md:pb-12">
            <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
              {/* Primary Button */}
              <button
                onClick={handleAllowLocation}
                className="flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-base font-bold leading-normal tracking-[0.015em] text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                <span className="truncate">Cho phép</span>
              </button>
              
              {/* Secondary Link */}
              <button
                onClick={handleManualMode}
                className="group flex w-full cursor-pointer items-center justify-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <span className="mr-1">Không cho phép?</span>
                <span className="decoration-primary/50 underline-offset-4 group-hover:underline dark:decoration-primary">
                  Chuyển sang chế độ thủ công
                </span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
