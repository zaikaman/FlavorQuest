import 'server-only';

import { PayOS } from '@payos/node';
import { createAdminClient } from '@/lib/supabase/admin';

export const CUSTOMER_ACCESS_PRICE = 20000;
export const CUSTOMER_ACCESS_DESCRIPTION = 'Mo khoa FlavorQuest';

export type AccessPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'UNDERPAID';

export interface CustomerAccessPaymentRow {
  id: string;
  user_id: string;
  order_code: number;
  payment_link_id: string | null;
  amount: number;
  status: AccessPaymentStatus;
  checkout_url: string | null;
  qr_code: string | null;
  description: string;
  return_query: Record<string, unknown> | null;
  raw_payment_data: Record<string, unknown> | null;
  webhook_payload: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

let payOSClient: PayOS | null = null;

export function getPayOSClient() {
  if (!payOSClient) {
    payOSClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }

  return payOSClient;
}

export function createCustomerAccessOrderCode() {
  const timestamp = Date.now();
  const suffix = Math.floor(Math.random() * 90 + 10);

  return Number(`${timestamp}${suffix}`);
}

export function getPaywallUrl(origin: string) {
  return `${origin}/tour`;
}

export function normalizePaymentStatus(status: string | null | undefined): AccessPaymentStatus {
  switch (status) {
    case 'PAID':
    case 'CANCELLED':
    case 'EXPIRED':
    case 'FAILED':
    case 'PROCESSING':
    case 'UNDERPAID':
    case 'PENDING':
      return status;
    default:
      return 'PENDING';
  }
}

export async function grantCustomerAccess(params: {
  userId: string;
  orderCode: number;
  paymentLinkId?: string | null;
  paidAt?: string | null;
}) {
  const adminClient = createAdminClient();
  const grantedAt = params.paidAt ?? new Date().toISOString();

  await adminClient
    .from('users')
    .update({
      customer_access_granted: true,
      customer_access_granted_at: grantedAt,
      customer_access_payment_order_code: params.orderCode,
      customer_access_payment_link_id: params.paymentLinkId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId);

  await adminClient
    .from('notifications')
    .insert({
      user_id: params.userId,
      title: 'Thanh toán thành công',
      message: 'Tài khoản khách hàng đã được mở khóa vĩnh viễn.',
      type: 'system',
    });
}

export function extractPaymentLinkId(payment: Record<string, unknown>) {
  const paymentLinkId = payment.paymentLinkId;
  if (typeof paymentLinkId === 'string' && paymentLinkId.length > 0) {
    return paymentLinkId;
  }

  const id = payment.id;
  if (typeof id === 'string' && id.length > 0) {
    return id;
  }

  return null;
}

export async function syncCustomerAccessPayment(params: {
  payment: Record<string, unknown>;
  existingPayment: Pick<CustomerAccessPaymentRow, 'user_id' | 'order_code'> | null;
}) {
  const adminClient = createAdminClient();
  const orderCode = Number(params.payment.orderCode ?? params.existingPayment?.order_code ?? 0);
  const status = normalizePaymentStatus(String(params.payment.status ?? 'PENDING'));
  const paymentLinkId = extractPaymentLinkId(params.payment);
  const paidAt = status === 'PAID' ? new Date().toISOString() : null;

  await adminClient
    .from('customer_access_payments')
    .update({
      payment_link_id: paymentLinkId,
      status,
      raw_payment_data: params.payment,
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq('order_code', orderCode);

  if (status === 'PAID' && params.existingPayment?.user_id) {
    await grantCustomerAccess({
      userId: params.existingPayment.user_id,
      orderCode,
      paymentLinkId,
      paidAt,
    });
  }
}
