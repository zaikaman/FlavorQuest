import { NextResponse } from 'next/server';
import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createCustomerAccessOrderCode,
  CUSTOMER_ACCESS_DESCRIPTION,
  CUSTOMER_ACCESS_PRICE,
  getPayOSClient,
  getPaywallUrl,
} from '@/lib/server/payos';

function canConfirmWebhook(appUrl: string) {
  return /^https:\/\//i.test(appUrl) && !/localhost|127\.0\.0\.1/i.test(appUrl);
}

function resolveAppBaseUrl(requestUrl: string) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch (error) {
      console.warn('[PayOS] NEXT_PUBLIC_APP_URL không hợp lệ:', error);
    }
  }

  return new URL(requestUrl).origin;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (profile.role !== 'customer') {
    return NextResponse.json({ error: 'Chỉ tài khoản khách hàng mới cần thanh toán mở khóa.' }, { status: 400 });
  }

  if (profile.customerAccessGranted) {
    return NextResponse.json({ hasAccess: true, message: 'Tài khoản đã được mở khóa trước đó.' });
  }

  const origin = resolveAppBaseUrl(request.url);
  const orderCode = createCustomerAccessOrderCode();
  const paywallUrl = getPaywallUrl(origin);
  const payOS = getPayOSClient();

  try {
    const paymentLink = await payOS.paymentRequests.create({
      orderCode,
      amount: CUSTOMER_ACCESS_PRICE,
      description: CUSTOMER_ACCESS_DESCRIPTION,
      returnUrl: paywallUrl,
      cancelUrl: paywallUrl,
      buyerEmail: profile.email ?? undefined,
      buyerName: profile.email ?? 'Khach hang FlavorQuest',
    });

    const adminClient = createAdminClient();
    await adminClient
      .from('customer_access_payments')
      .insert({
        user_id: profile.id,
        order_code: orderCode,
        payment_link_id: paymentLink.paymentLinkId,
        amount: paymentLink.amount,
        status: paymentLink.status,
        checkout_url: paymentLink.checkoutUrl,
        qr_code: paymentLink.qrCode,
        description: CUSTOMER_ACCESS_DESCRIPTION,
        raw_payment_data: paymentLink,
      });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    if (canConfirmWebhook(appUrl)) {
      payOS.webhooks.confirm(`${appUrl}/api/payments/customer-access/webhook`).catch(error => {
        console.error('[PayOS] confirm webhook failed:', error);
      });
    }

    return NextResponse.json({
      hasAccess: false,
      payment: {
        orderCode,
        amount: paymentLink.amount,
        status: paymentLink.status,
        checkoutUrl: paymentLink.checkoutUrl,
        paymentLinkId: paymentLink.paymentLinkId,
      },
    });
  } catch (error) {
    console.error('[PayOS] create customer access payment failed:', error);
    return NextResponse.json({ error: 'Không thể tạo thanh toán payOS.' }, { status: 500 });
  }
}