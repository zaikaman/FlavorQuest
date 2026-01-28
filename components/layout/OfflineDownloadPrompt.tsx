/**
 * OfflineDownloadPrompt Component
 * 
 * Modal hỏi người dùng có muốn tải xuống nội dung offline không
 * 
 * Features:
 * - Hiển thị khi lần đầu vào app
 * - Lưu lựa chọn của user
 * - Download cả audio và ảnh nếu user đồng ý
 * - Progress tracking
 */

'use client';

import { useTranslations } from '@/lib/hooks/useTranslations';
import { Modal } from '@/components/ui/Modal';

export interface OfflineDownloadPromptProps {
  /** Hiển thị modal */
  isOpen: boolean;
  /** Callback khi user chọn Yes */
  onAccept: () => void;
  /** Callback khi user chọn No */
  onDecline: () => void;
  /** Số lượng POIs sẽ download */
  poisCount?: number;
  /** Ước tính dung lượng (MB) */
  estimatedSize?: number;
}

export function OfflineDownloadPrompt({
  isOpen,
  onAccept,
  onDecline,
  poisCount = 0,
  estimatedSize = 0,
}: OfflineDownloadPromptProps) {
  const { t } = useTranslations();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onDecline}
      // Disable default header to create a custom full-height design
      title=""
      showCloseButton={false}
      size="md"
    >
      {/* 
        Using -m-6 to break out of the default Modal padding (p-6)
        This allows us to have full control over the layout and creates a "card" feel
      */}
      <div className="-m-6 relative overflow-hidden bg-white dark:bg-[#221710] rounded-2xl">

        {/* Decorative Background Elements - Warm/Brown Theme */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-orange-50/80 to-transparent dark:from-orange-900/20 dark:to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onDecline}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors backdrop-blur-sm group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="relative px-6 pt-10 pb-6 flex flex-col items-center text-center">

          {/* Hero Icon with Glow */}
          <div className="relative mb-6 group">
            <div className="absolute inset-0 bg-orange-500/20 dark:bg-orange-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/40 dark:to-[#221710] rounded-2xl shadow-lg border border-orange-100 dark:border-orange-500/30 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-500 drop-shadow-sm">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            {/* Download Badge - Removed to avoid localization issues */}
          </div>

          {/* Title & Desc */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-orange-50 mb-3">
            {t('offline.downloadPromptTitle')}
          </h2>
          <p className="text-gray-500 dark:text-gray-300 max-w-sm mb-8 leading-relaxed">
            {t('offline.downloadPromptDesc')}
          </p>

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-3 gap-3 mb-8">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-800/50">
              <span className="text-xl mb-1 text-orange-600 dark:text-orange-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-orange-100">{poisCount}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis w-full text-center whitespace-nowrap">{t('offline.poisLabel')}</span>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-800/50">
              <span className="text-xl mb-1 text-orange-600 dark:text-orange-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-orange-100">{estimatedSize}MB</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis w-full text-center whitespace-nowrap">{t('offline.audioLabel')}</span>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-800/50">
              <span className="text-xl mb-1 text-orange-600 dark:text-orange-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-orange-100">HD</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis w-full text-center whitespace-nowrap">{t('offline.imageLabel')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={onAccept}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 transform active:scale-[0.98] transition-all duration-200 font-semibold flex items-center justify-center gap-2 group"
            >
              <span>{t('offline.downloadNow')}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button
              onClick={onDecline}
              className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium text-sm transition-colors"
            >
              {t('offline.downloadLater')}
            </button>
          </div>

          <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">
            {t('offline.downloadPromptNote')}
          </p>

        </div>
      </div>
    </Modal>
  );
}
