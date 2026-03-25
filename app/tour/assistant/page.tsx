'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { RoleChatbot } from '@/components/ai/RoleChatbot';
import { BottomNav } from '@/components/layout/BottomNav';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function TourAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const selectedTourId = searchParams.get('tour');
  const selectedPoiId = searchParams.get('poi');
  const activeTab = searchParams.get('tab') ?? 'assistant';

  return (
    <div className="bg-background-dark relative min-h-screen overflow-hidden text-white">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="bg-primary/20 absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full blur-[120px]" />
        <div className="absolute right-[-5%] bottom-[10%] h-[30%] w-[30%] rounded-full bg-[#ffb07a]/15 blur-[100px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex h-[100dvh] max-w-3xl flex-col px-4 pt-6 sm:px-6">
        <div className="min-h-0 flex-1 pb-[5.5rem]">
          <RoleChatbot
            role="customer"
            mode="page"
            language={language}
            pageContext={{
              pathname: '/tour/assistant',
              activeTab,
              selectedTourId,
              selectedPoiId,
            }}
          />
        </div>
      </div>

      <BottomNav
        activeTab="assistant"
        onTabChange={(tab) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', tab);

          const nextUrl =
            tab === 'assistant'
              ? params.toString()
                ? `/tour/assistant?${params.toString()}`
                : '/tour/assistant'
              : tab === 'chat'
                ? params.toString()
                  ? `/tour/chat?${params.toString()}`
                  : '/tour/chat'
                : params.toString()
                  ? `/tour?${params.toString()}`
                  : '/tour';

          router.push(nextUrl);
        }}
        className="fixed right-0 bottom-0 left-0 z-50"
      />
    </div>
  );
}
