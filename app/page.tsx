/**
 * Landing Page
 * Welcome & Splash Screen với language selection
 * Based on design_template/welcome_&_splash_screen/code.html
 */

import { createServerClient, isAuthenticated } from '@/lib/supabase/server';
import { SplashContent } from '@/components/splash/SplashContent';

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
        <SplashContent isAuthenticated={isAuth} />
      </div>
    </div>
  );
}
