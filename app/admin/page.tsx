/**
 * Admin Dashboard
 * Overview stats và quick links
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  totalPOIs: number;
  activePOIs: number;
  totalPlays: number;
  uniqueVisitors: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPOIs: 0,
    activePOIs: 0,
    totalPlays: 0,
    uniqueVisitors: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();

    try {
      // Count POIs
      const { count: totalPOIs } = await supabase
        .from('pois')
        .select('*', { count: 'exact', head: true });

      const { count: activePOIs } = await supabase
        .from('pois')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Count analytics
      const { count: totalPlays } = await supabase
        .from('analytics_logs')
        .select('*', { count: 'exact', head: true })
        .in('event_type', ['auto_play', 'manual_play']);

      // Count unique sessions
      const { data: sessions } = await supabase
        .from('analytics_logs')
        .select('session_id')
        .not('session_id', 'is', null);

      const uniqueVisitors = new Set(sessions?.map(s => s.session_id) || []).size;

      setStats({
        totalPOIs: totalPOIs || 0,
        activePOIs: activePOIs || 0,
        totalPlays: totalPlays || 0,
        uniqueVisitors,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-gray-400">Tổng quan hệ thống FlavorQuest</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total POIs */}
        <div className="bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-blue-500">location_on</span>
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1 relative z-10">Tổng POI</p>
          <p className="text-3xl font-bold text-white relative z-10">{isLoading ? '...' : stats.totalPOIs}</p>
        </div>

        {/* Active POIs */}
        <div className="bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-green-500">check_circle</span>
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1 relative z-10">POI Đang hoạt động</p>
          <p className="text-3xl font-bold text-white relative z-10">{isLoading ? '...' : stats.activePOIs}</p>
        </div>

        {/* Total Plays */}
        <div className="bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-purple-500">play_circle</span>
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1 relative z-10">Lượt phát audio</p>
          <p className="text-3xl font-bold text-white relative z-10">{isLoading ? '...' : stats.totalPlays}</p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-primary">group</span>
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1 relative z-10">Người dùng</p>
          <p className="text-3xl font-bold text-white relative z-10">{isLoading ? '...' : stats.uniqueVisitors}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Manage POIs */}
          <button
            onClick={() => router.push('/admin/pois')}
            className="flex items-center gap-4 p-6 bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 hover:border-primary/50 hover:bg-[#3bf1f0d] transition-all duration-200 text-left group"
          >
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1 group-hover:text-primary transition-colors">Quản lý POI</h4>
              <p className="text-sm text-gray-400">Thêm, sửa, xóa địa điểm</p>
            </div>
          </button>

          {/* Create New POI */}
          <button
            onClick={() => router.push('/admin/pois/new')}
            className="flex items-center gap-4 p-6 bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 hover:border-green-500/50 hover:bg-[#3bf1f0d] transition-all duration-200 text-left group"
          >
            <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1 group-hover:text-green-500 transition-colors">Tạo POI mới</h4>
              <p className="text-sm text-gray-400">Thêm địa điểm mới</p>
            </div>
          </button>

          {/* View Analytics */}
          <button
            onClick={() => router.push('/admin/analytics')}
            className="flex items-center gap-4 p-6 bg-[#2c1e16] rounded-xl shadow-lg border border-white/5 hover:border-purple-500/50 hover:bg-[#3bf1f0d] transition-all duration-200 text-left group"
          >
            <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
              <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1 group-hover:text-purple-500 transition-colors">Xem Analytics</h4>
              <p className="text-sm text-gray-400">Thống kê sử dụng</p>
            </div>
          </button>
        </div>
      </div>

      {/* Preview App Link */}
      <div className="bg-gradient-to-r from-primary/10 to-orange-900/20 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Preview App</h3>
            <p className="text-sm text-gray-400">Xem giao diện người dùng</p>
          </div>
          <button
            onClick={() => window.open('/', '_blank')}
            className="px-6 py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span>Mở App</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
