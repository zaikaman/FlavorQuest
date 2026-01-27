import { createServerClient, isUserAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GET /api/analytics/summary
 * Fetch analytics summary (admin only)
 */
export async function GET(request: NextRequest) {
    const supabase = await createServerClient();
    const isAdmin = await isUserAdmin(supabase);

    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const period = searchParams.get('period') || '30days'; // 7days, 30days, all

        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        if (period === '7days') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === '30days') {
            startDate.setDate(now.getDate() - 30);
        } else {
            startDate = new Date(0); // All time
        }

        // Call RPC function get_tour_analytics
        const { data, error } = await supabase.rpc('get_tour_analytics', {
            start_date: startDate.toISOString(),
            end_date: now.toISOString(),
        });

        if (error) {
            console.error('RPC Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
