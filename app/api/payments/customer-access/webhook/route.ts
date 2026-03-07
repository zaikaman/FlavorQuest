import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPaymentLinkId, getPayOSClient, grantCustomerAccess } from '@/lib/server/payos';

export async function GET() {
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const payOS = getPayOSClient();
    const verified = await payOS.webhooks.verify(payload);
    const adminClient = createAdminClient();

    const { data: payment } = await adminClient
      .from('customer_access_payments')
      .select('*')
      .eq('order_code', verified.orderCode)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ success: true });
    }

    let remoteStatus = 'PAID';
  let remotePaymentLinkId: string | null = verified.paymentLinkId ?? payment.payment_link_id;
    let remotePaymentData: Record<string, unknown> = verified as unknown as Record<string, unknown>;

    try {
      const paymentDetail = await payOS.paymentRequests.get(verified.orderCode);
      remoteStatus = paymentDetail.status;
      remotePaymentLinkId = extractPaymentLinkId(paymentDetail as unknown as Record<string, unknown>);
      remotePaymentData = paymentDetail as unknown as Record<string, unknown>;
    } catch (error) {
      console.error('[PayOS] get payment detail from webhook failed:', error);
    }

    const paidAt = new Date().toISOString();

    await adminClient
      .from('customer_access_payments')
      .update({
        payment_link_id: remotePaymentLinkId,
        status: remoteStatus,
        raw_payment_data: remotePaymentData,
        webhook_payload: payload,
        paid_at: remoteStatus === 'PAID' ? paidAt : payment.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (remoteStatus === 'PAID') {
      await grantCustomerAccess({
        userId: payment.user_id,
        orderCode: payment.order_code,
        paymentLinkId: remotePaymentLinkId,
        paidAt,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PayOS] webhook verification failed:', error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}