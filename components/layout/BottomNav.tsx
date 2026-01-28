/**
 * BottomNav Component
 * T102-T103 - Bottom navigation bar
 */

'use client';

export type NavTab = 'map' | 'list' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  className?: string;
}

const TABS: { id: NavTab; icon: string; label: string }[] = [
  { id: 'map', icon: 'map', label: 'Bản đồ' },
  { id: 'list', icon: 'format_list_bulleted', label: 'Danh sách' },
  { id: 'history', icon: 'headphones', label: 'Tour của tôi' },
  { id: 'settings', icon: 'settings', label: 'Cài đặt' },
];

export function BottomNav({ activeTab, onTabChange, className = '' }: BottomNavProps) {
  return (
    <nav className={`border-t border-[#493222] bg-[#221710] px-2 pb-6 pt-2 ${className}`}>
      <div className="flex justify-between items-end">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg py-1 group transition-colors"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                isActive 
                  ? 'bg-primary/10' 
                  : 'bg-transparent group-hover:bg-white/5'
              }`}>
                <span 
                  className={`material-symbols-outlined text-[24px] transition-colors ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-[#8d7b6f] group-hover:text-[#cba990]'
                  }`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
              </div>
              <p className={`text-[10px] leading-none tracking-wide transition-colors ${
                isActive 
                  ? 'text-primary font-semibold' 
                  : 'text-[#8d7b6f] font-medium group-hover:text-[#cba990]'
              }`}>
                {tab.label}
              </p>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
