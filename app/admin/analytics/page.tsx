'use client';

import { useEffect, useState } from 'react';

interface DailyStats {
    date: string;
    total_tours: number;
    total_plays: number;
    unique_sessions: number;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<DailyStats[]>([]);
    const [period, setPeriod] = useState('7days');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/analytics/summary?period=${period}`);
            if (res.ok) {
                const jsonData = await res.json();
                setData(jsonData);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPlays = data.reduce((sum, day) => sum + day.total_plays, 0);
    const totalTours = data.reduce((sum, day) => sum + day.total_tours, 0);

    // Max value for chart scaling
    const maxPlays = Math.max(...data.map(d => d.total_plays), 1);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-gray-400">Thống kê hoạt động tour và tương tác</p>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {['7days', '30days'].map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        {p === '7days' ? '7 Days' : '30 Days'}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Total Audio Plays</h3>
                    <p className="text-3xl font-bold text-white">{totalPlays}</p>
                </div>
                <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                    <h3 className="text-gray-400 text-sm mb-1">Total Tours Started</h3>
                    <p className="text-3xl font-bold text-white">{totalTours}</p>
                </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="bg-[#2c1e16] p-6 rounded-xl border border-white/5">
                <h3 className="text-white font-bold mb-6">Daily Activity (Plays)</h3>

                <div className="flex items-end gap-2 h-48">
                    {data.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                            <div
                                className="w-full bg-primary/20 rounded-t-sm relative group-hover:bg-primary/40 transition-colors"
                                style={{ height: `${(day.total_plays / maxPlays) * 100}%` }}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {day.total_plays} plays
                                    <br />
                                    {day.total_tours} tours
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 rotate-0 truncate w-full text-center">
                                {new Date(day.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                    ))}

                    {data.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            No data available for this period
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
