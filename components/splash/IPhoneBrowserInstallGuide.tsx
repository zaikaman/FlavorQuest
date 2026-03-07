'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { isStandalone } from '@/lib/services/pwa';

const emptySubscribe = () => () => undefined;

function isIPhoneSafariBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIPhone = /iPhone/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent);

  return isIPhone && isSafari && !isStandalone();
}

function SafariTopBar() {
  return (
    <div className="rounded-t-[28px] bg-[#f6f3f7] px-5 pt-4 pb-3 text-[#111827]">
      <div className="mb-4 flex items-center justify-between text-[11px] font-semibold">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm border border-current opacity-70" />
          <span className="h-2 w-4 rounded-full border border-current opacity-70" />
          <span className="h-2 w-5 rounded-sm bg-current opacity-80" />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
        <span className="text-sm font-semibold tracking-wide text-gray-600">aA</span>
        <div className="min-w-0 flex-1 rounded-full bg-[#f9fafb] px-4 py-2 text-center text-sm font-medium text-gray-600 ring-1 ring-black/5">
          app.flavorquest.vn
        </div>
        <span className="text-lg leading-none text-gray-500">↻</span>
      </div>
    </div>
  );
}

function InstallGuideMockupStepOne() {
  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
      <SafariTopBar />

      <div className="bg-[#4aa4d5] px-6 py-12 text-white">
        <div className="mx-auto flex w-full max-w-[260px] flex-col items-center text-center">
          <div className="mb-8 rounded-full bg-white p-6 shadow-lg">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#4aa4d5]">
              FlavorQuest
            </div>
          </div>
          <p className="text-3xl font-black uppercase tracking-wide">FlavorQuest</p>
        </div>
      </div>

      <div className="bg-[#2f4858] px-4 py-3 text-white">
        <div className="flex items-center justify-between rounded-full bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
          <span className="font-semibold">aA</span>
          <span className="truncate text-white/90">app.flavorquest.vn</span>
          <span className="text-lg">⬆</span>
        </div>
      </div>
    </div>
  );
}

function InstallGuideMockupStepTwo() {
  const options = useMemo(
    () => [
      'Sao chép',
      'Thêm vào Danh sách đọc',
      'Thêm dấu trang',
      'Thêm vào Mục ưa thích',
      'Thêm vào Ghi chú nhanh',
      'Thêm vào MH chính',
    ],
    []
  );

  return (
    <div className="overflow-hidden rounded-[32px] bg-[#0b0b0f] shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
      <div className="px-5 pt-4 pb-3 text-white">
        <div className="mb-4 flex items-center justify-between text-[11px] font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm border border-current opacity-80" />
            <span className="h-2 w-4 rounded-full border border-current opacity-80" />
            <span className="h-2 w-5 rounded-sm bg-current opacity-90" />
          </div>
        </div>
      </div>

      <div className="rounded-t-[28px] bg-[#f3f4f6] px-4 pb-5 pt-3">
        <div className="mb-3 flex items-center gap-3 rounded-[22px] bg-white px-4 py-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4aa4d5]">
            FQ
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">FlavorQuest</p>
            <p className="truncate text-xs text-slate-500">app.flavorquest.vn</p>
          </div>
          <button className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
            Tùy chọn
          </button>
        </div>

        <div className="space-y-2 rounded-[24px] bg-[#f8fafc] p-2 shadow-inner">
          {options.map((option) => {
            const isHighlighted = option === 'Thêm vào MH chính';

            return (
              <div
                key={option}
                className={`flex items-center justify-between rounded-[18px] bg-white px-4 py-4 text-sm shadow-sm ${
                  isHighlighted ? 'ring-2 ring-sky-400/70' : ''
                }`}
              >
                <span className={`font-medium ${isHighlighted ? 'text-sky-700' : 'text-slate-800'}`}>
                  {option}
                </span>
                <span className="text-slate-400">›</span>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none mt-3 flex justify-center text-5xl">👇</div>
      </div>
    </div>
  );
}

function InstallGuidePlaceholderStepThree() {
  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
      <div className="bg-[#f6f3f7] px-5 py-4 text-center text-sm font-semibold text-slate-700">
        Bước 3
      </div>

      <div className="p-6">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300 bg-sky-50 px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
            🖼️
          </div>
          <p className="text-lg font-bold text-slate-900">Chỗ dành cho ảnh bước 3</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
            Bạn có thể tự thay bằng ảnh thao tác “Thêm” để hoàn tất hướng dẫn cài đặt trên iPhone.
          </p>
        </div>
      </div>
    </div>
  );
}

export function IPhoneBrowserInstallGuide() {
  const shouldShow = useSyncExternalStore(emptySubscribe, isIPhoneSafariBrowser, () => false);

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="w-full rounded-[32px] bg-[#eef3f7] px-4 py-8 text-slate-900 shadow-[0_20px_80px_rgba(0,0,0,0.18)] md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
            Safari trên iPhone
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
            Hướng dẫn cài đặt ứng dụng
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Nếu bạn đang mở FlavorQuest bằng trình duyệt trên iPhone, hãy thêm ứng dụng vào màn hình chính để có trải nghiệm như một PWA đầy đủ.
          </p>
        </div>

        <div className="space-y-8">
          <article>
            <h3 className="mb-4 text-2xl font-extrabold underline decoration-slate-400 underline-offset-4">
              Bước 1:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Mở FlavorQuest bằng Safari và nhấn nút Chia sẻ ở thanh công cụ phía dưới màn hình.
            </p>
            <InstallGuideMockupStepOne />
          </article>

          <article>
            <h3 className="mb-4 text-2xl font-extrabold underline decoration-slate-400 underline-offset-4">
              Bước 2:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Trong danh sách tùy chọn, kéo xuống và chọn mục “Thêm vào MH chính”.
            </p>
            <InstallGuideMockupStepTwo />
          </article>

          <article>
            <h3 className="mb-4 text-2xl font-extrabold underline decoration-slate-400 underline-offset-4">
              Bước 3:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Xác nhận tên ứng dụng rồi nhấn “Thêm”. Phần minh họa bước này đang để sẵn chỗ để bạn bổ sung sau.
            </p>
            <InstallGuidePlaceholderStepThree />
          </article>
        </div>
      </div>
    </section>
  );
}