import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient, isUserAdmin } from '@/lib/supabase/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const admin = await isUserAdmin(supabase);

  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const adminClient = createAdminClient();

  let query = adminClient
    .from('customer_access_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data: payments, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const userIds = [...new Set((payments ?? []).map(item => item.user_id))];
  const { data: users } = userIds.length === 0
    ? { data: [] }
    : await adminClient
        .from('users')
        .select('id, email, customer_access_granted, customer_access_granted_at')
        .in('id', userIds);

  const userMap = new Map((users ?? []).map(item => [item.id, item]));
  const enriched = (payments ?? []).map(item => ({
    ...item,
    email: userMap.get(item.user_id)?.email ?? 'Không rõ email',
    customer_access_granted: userMap.get(item.user_id)?.customer_access_granted ?? false,
    customer_access_granted_at: userMap.get(item.user_id)?.customer_access_granted_at ?? null,
  }));

  const totalRevenue = enriched
    .filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);

  const stats = {
    total: enriched.length,
    paid: enriched.filter(item => item.status === 'PAID').length,
    pending: enriched.filter(item => ['PENDING', 'PROCESSING', 'UNDERPAID'].includes(item.status)).length,
    cancelled: enriched.filter(item => ['CANCELLED', 'EXPIRED', 'FAILED'].includes(item.status)).length,
    totalRevenue,
  };

  return NextResponse.json({ stats, payments: enriched }, { headers: NO_STORE_HEADERS });
}