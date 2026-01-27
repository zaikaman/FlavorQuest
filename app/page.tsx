/**
 * Landing Page
 * Welcome & Splash Screen với language selection
 * Based on design_template/welcome_&_splash_screen/code.html
 */

import Link from 'next/link';
import { StartTourButton } from '@/components/tour/StartTourButton';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

import { createServerClient, isAuthenticated } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  const isAuth = await isAuthenticated(supabase);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-background-dark text-white font-display selection:bg-primary selection:text-white">
      {/* Full Screen Background Image with Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {/* Main Image */}
        <div
          className="w-full h-full bg-cover bg-center object-cover animate-fade-in"
          data-alt="Close up of delicious grilled food cooking on a charcoal street food grill at night with smoke rising"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1td4WSx6nl5TKAIPQHvb3mXshqreYAsVVo5NGNLo4nkeSZVy-c4WPWG5TBcBOnTUczh9Q4wjij1A12mpRZrc-ME4sJthwOil3ubDdHgHAPCiXAM-77eCwcoDOIozkEpSVKWANT49fnbkrsEeUQ6qRhE7Cjs7ecrqz_iS4B9ha0zKruboEGSrVxELdqF2B3ohGZZ99cp-OG1iRCCZ4t-cqTc7bQjxoV9kFzigSrAi2XDwsssfntyMkvmsUooxLreHQfcjVYlaTnbaN')`,
          }}
        ></div>

        {/* Gradient Overlay: Clearer top for image visibility, dark bottom for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-background-dark/40 to-background-dark"></div>

        {/* Extra bottom fade for seamless UI integration */}
        <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#221710] via-[#221710]/90 to-transparent"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full w-full justify-between safe-pt safe-pb px-6">
        {/* Branding Section (Top/Center) */}
        <div className="flex flex-col items-center justify-center flex-grow">
          {/* Logo Icon Composite */}
          <div className="relative mb-6 group">
            <div className="absolute -inset-1 bg-primary/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-24 h-24 bg-[#2c1e16]/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-primary text-5xl drop-shadow-lg">restaurant</span>
              <span className="material-symbols-outlined text-white absolute -bottom-1 -right-1 bg-primary rounded-full p-1 text-sm border-4 border-[#2c1e16]">graphic_eq</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-white tracking-tight text-[40px] font-extrabold leading-tight text-center drop-shadow-xl">
            FlavorQuest
          </h1>

          {/* Sub-headline */}
          <h2 className="text-gray-200 text-lg font-medium leading-relaxed tracking-wide mt-4 text-center max-w-[280px] drop-shadow-md opacity-90">
            Khám phá Hành trình <br /> Ẩm thực Vĩnh Khánh
          </h2>
        </div>

        {/* Action Section (Bottom) */}
        <div className="flex flex-col items-center w-full gap-5">
          {/* Language Pills */}
          <LanguageSelector />

          {/* Primary Action Button */}
          <StartTourButton isAuthenticated={isAuth} />

          {/* Secondary Links */}
          <div className="flex items-center gap-6 mt-1 text-sm font-medium text-gray-400">
            <Link
              href="/browse"
              className="hover:text-white transition-colors py-2 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">explore</span>
              Duyệt thủ công
            </Link>
            <div className="w-1 h-1 rounded-full bg-gray-600"></div>
            <Link
              href="/settings"
              className="hover:text-white transition-colors py-2 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              Cài đặt
            </Link>
          </div>

          {/* Offline Data Loading Bar (hidden initially, shown during preload) */}
          {/* <div className="w-full mt-4 hidden" id="offline-progress">
            <div className="flex justify-between items-end mb-2 px-1">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                Đang tải dữ liệu offline...
              </span>
              <span className="text-[11px] text-primary font-mono font-bold">85%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_8px_rgba(242,108,13,0.8)] relative">
                <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
