import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OWNER_ALLOWED_STATUS = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivering',
  'delivered',
  'cancelled',
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const nextStatus = body.status as string;

    if (!OWNER_ALLOWED_STATUS.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('preorder_orders')
      .select('id, poi_id, customer_id, status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      const { data: poi } = await supabase
        .from('pois')
        .select('owner_id')
        .eq('id', order.poi_id)
        .single();

      if (poi?.owner_id !== profile.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('preorder_orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      order_id: order.id,
      title: 'Đơn hàng đã cập nhật',
      message: `Đơn #${order.id.slice(0, 8)} chuyển sang trạng thái: ${nextStatus}`,
      type: 'order_update',
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
