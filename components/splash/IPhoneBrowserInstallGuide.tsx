
'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';
import { isStandalone } from '@/lib/services/pwa';

const emptySubscribe = () => () => undefined;

export function isIPhoneSafariBrowser() {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIPhone = /iPhone/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent);

  return isIPhone && isSafari && !isStandalone();
}

export function useShouldShowIPhoneInstallGuide() {
  return useSyncExternalStore(emptySubscribe, isIPhoneSafariBrowser, () => false);
}

interface InstallGuideStepImageProps {
  src: string;
  alt: string;
}

function InstallGuideStepImage({ src, alt }: InstallGuideStepImageProps) {
  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80">
      <div className="relative aspect-[9/19.5] w-full bg-slate-100">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </div>
    </div>
  );
}

export function IPhoneBrowserInstallGuide() {
  const shouldShow = useShouldShowIPhoneInstallGuide();

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
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Hướng dẫn cài đặt ứng dụng
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Nếu bạn đang mở FlavorQuest bằng trình duyệt trên iPhone, hãy thêm ứng dụng vào màn hình chính để có trải nghiệm như một PWA đầy đủ.
          </p>
        </div>

        <div className="space-y-8">
          <article>
            <h3 className="mb-4 text-2xl font-bold underline decoration-slate-400 underline-offset-4">
              Bước 1:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Mở FlavorQuest bằng Safari và nhấn nút Chia sẻ ở thanh công cụ phía dưới màn hình.
            </p>
            <InstallGuideStepImage
              src="/1.jpg"
              alt="Hướng dẫn bước 1: mở FlavorQuest trong Safari trên iPhone"
            />
          </article>

          <article>
            <h3 className="mb-4 text-2xl font-bold underline decoration-slate-400 underline-offset-4">
              Bước 2:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Trong danh sách tùy chọn, kéo xuống và chọn mục “Thêm vào MH chính”.
            </p>
            <InstallGuideStepImage
              src="/2.jpg"
              alt="Hướng dẫn bước 2: chọn Thêm vào màn hình chính trong Safari"
            />
          </article>

          <article>
            <h3 className="mb-4 text-2xl font-bold underline decoration-slate-400 underline-offset-4">
              Bước 3:
            </h3>
            <p className="mb-5 text-sm leading-6 text-slate-700 md:text-base">
              Xác nhận tên ứng dụng rồi nhấn “Thêm” để hoàn tất cài đặt ra màn hình chính.
            </p>
            <InstallGuideStepImage
              src="/3.jpg"
              alt="Hướng dẫn bước 3: xác nhận thêm ứng dụng vào màn hình chính"
            />
          </article>
        </div>
      </div>
    </section>
  );
}