import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerAccessPaymentRow } from '@/lib/server/payos';
import { getPayOSClient, syncCustomerAccessPayment } from '@/lib/server/payos';

async function getLatestPayment(userId: string, orderCode?: number | null) {
  const adminClient = createAdminClient();

  if (orderCode) {
    const { data } = await adminClient
      .from('customer_access_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('order_code', orderCode)
      .maybeSingle();

    return data as CustomerAccessPaymentRow | null;
  }

  const { data } = await adminClient
    .from('customer_access_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as CustomerAccessPaymentRow | null;
}

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') !== '0';
  const orderCodeParam = url.searchParams.get('orderCode');
  const orderCode = orderCodeParam ? Number(orderCodeParam) : null;

  let payment = await getLatestPayment(profile.id, Number.isFinite(orderCode) ? orderCode : null);

  if (payment && refresh && payment.status !== 'PAID' && payment.status !== 'CANCELLED' && payment.status !== 'EXPIRED') {
    try {
      const payOS = getPayOSClient();
      const remotePayment = await payOS.paymentRequests.get(payment.order_code);
      await syncCustomerAccessPayment({
        payment: remotePayment as unknown as Record<string, unknown>,
        existingPayment: { user_id: payment.user_id, order_code: payment.order_code },
      });
      payment = await getLatestPayment(profile.id, payment.order_code);
    } catch (error) {
      console.error('[PayOS] refresh payment status failed:', error);
    }
  }

  const adminClient = createAdminClient();
  const { data: userData } = await adminClient
    .from('users')
    .select('customer_access_granted, customer_access_granted_at')
    .eq('id', profile.id)
    .maybeSingle();

  return NextResponse.json({
    hasAccess: userData?.customer_access_granted ?? false,
    customerAccessGrantedAt: userData?.customer_access_granted_at ?? null,
    payment,
  });
}
