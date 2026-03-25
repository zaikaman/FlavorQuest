'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { SupportInboxPage } from '@/components/chat/SupportInboxPage';

export default function TourChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="bg-background-dark relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="bg-primary/18 absolute top-[-8%] left-[-12%] h-[42%] w-[42%] rounded-full blur-[120px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[32%] w-[32%] rounded-full bg-[#ffb07a]/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-[6.5rem] sm:px-6">
        <SupportInboxPage role="customer" />
      </div>

      <BottomNav
        activeTab="chat"
        onTabChange={(tab) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', tab);

          if (tab === 'assistant') {
            const nextUrl = params.toString()
              ? `/tour/assistant?${params.toString()}`
              : '/tour/assistant';
            router.push(nextUrl);
            return;
          }

          if (tab === 'chat') {
            const nextUrl = params.toString() ? `/tour/chat?${params.toString()}` : '/tour/chat';
            router.push(nextUrl);
            return;
          }

          const nextUrl = params.toString() ? `/tour?${params.toString()}` : '/tour';
          router.push(nextUrl);
        }}
        className="fixed right-0 bottom-0 left-0 z-50"
      />
    </div>
  );
}
