import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendNewOrderEmail } from '@/lib/services/mailer';

interface OrderItemInput {
  dish_id: string;
  quantity: number;
}

function validatePickupTime(pickupTime: unknown) {
  if (!pickupTime) {
    return { isValid: true as const, normalizedPickupTime: null };
  }

  if (typeof pickupTime !== 'string') {
    return { isValid: false as const, code: 'INVALID_PICKUP_TIME', error: 'Invalid pickup_time' };
  }

  const pickupDate = new Date(pickupTime);

  if (Number.isNaN(pickupDate.getTime())) {
    return { isValid: false as const, code: 'INVALID_PICKUP_TIME', error: 'Invalid pickup_time' };
  }

  if (pickupDate.getTime() <= Date.now()) {
    return { isValid: false as const, code: 'PICKUP_TIME_IN_PAST', error: 'Pickup time must be in the future' };
  }

  return { isValid: true as const, normalizedPickupTime: pickupDate.toISOString() };
}

export async function GET() {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let query = supabase
    .from('preorder_orders')
    .select(`
      *,
      pois(id, name_vi, owner_id),
      preorder_order_items(id, dish_id, quantity, unit_price, dishes(name))
    `)
    .order('created_at', { ascending: false });

  if (profile.role === 'customer') {
    query = query.eq('customer_id', profile.id);
  }

  if (profile.role === 'owner') {
    const { data: ownedPois } = await supabase
      .from('pois')
      .select('id')
      .eq('owner_id', profile.id);

    const ownedPoiIds = (ownedPois ?? []).map(item => item.id);
    if (ownedPoiIds.length === 0) {
      return NextResponse.json([]);
    }

    query = query.in('poi_id', ownedPoiIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const profile = await getCurrentUserProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items = (body.items ?? []) as OrderItemInput[];
    const pickupTimeValidation = validatePickupTime(body.pickup_time);

    if (!body.poi_id || items.length === 0) {
      return NextResponse.json({ error: 'Missing poi_id or items' }, { status: 400 });
    }

    if (!pickupTimeValidation.isValid) {
      return NextResponse.json(
        { error: pickupTimeValidation.error, code: pickupTimeValidation.code },
        { status: 400 }
      );
    }

    const dishIds = items.map(item => item.dish_id);
    const { data: dishes, error: dishesError } = await supabase
      .from('dishes')
      .select('id, poi_id, name, price, is_available')
      .in('id', dishIds)
      .is('deleted_at', null);

    if (dishesError) {
      return NextResponse.json({ error: dishesError.message }, { status: 500 });
    }

    const validDishes = (dishes ?? []).filter(d => d.poi_id === body.poi_id && d.is_available);
    if (validDishes.length !== items.length) {
      return NextResponse.json({ error: 'Một số món không hợp lệ hoặc đã hết' }, { status: 400 });
    }

    const dishMap = new Map(validDishes.map(d => [d.id, d]));
    const totalAmount = items.reduce((sum, item) => {
      const dish = dishMap.get(item.dish_id);
      if (!dish) return sum;
      return sum + Number(dish.price) * item.quantity;
    }, 0);

    const { data: order, error: orderError } = await supabase
      .from('preorder_orders')
      .insert({
        poi_id: body.poi_id,
        customer_id: profile.id,
        customer_name: body.customer_name ?? null,
        customer_phone: body.customer_phone ?? null,
        note: body.note ?? null,
        pickup_time: pickupTimeValidation.normalizedPickupTime,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select('*')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Create order failed' }, { status: 500 });
    }

    const orderItems = items.map(item => {
      const dish = dishMap.get(item.dish_id)!;
      return {
        order_id: order.id,
        dish_id: item.dish_id,
        quantity: item.quantity,
        unit_price: dish.price,
      };
    });

    const { error: itemsError } = await supabase
      .from('preorder_order_items')
      .insert(orderItems);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const { data: poi } = await supabase
      .from('pois')
      .select('id, name_vi, owner_id')
      .eq('id', body.poi_id)
      .single();

    if (poi?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: poi.owner_id,
        order_id: order.id,
        title: 'Bạn có đơn đặt món mới',
        message: `POI ${poi.name_vi} vừa nhận đơn #${order.id.slice(0, 8)}`,
        type: 'order_created',
      });

      const { data: owner } = await supabase
        .from('users')
        .select('email')
        .eq('id', poi.owner_id)
        .single();

      if (owner?.email) {
        const summary = orderItems
          .map(item => {
            const dish = dishMap.get(item.dish_id);
            return `${dish?.name ?? 'Món'} x${item.quantity}`;
          })
          .join(', ');

        sendNewOrderEmail({
          to: owner.email,
          poiName: poi.name_vi,
          orderId: order.id,
          totalAmount,
          itemSummary: summary,
          pickupTime: pickupTimeValidation.normalizedPickupTime,
        }).catch(error => {
          console.error('Send owner order email failed:', error);
        });
      }
    }

    await supabase.from('notifications').insert({
      user_id: profile.id,
      order_id: order.id,
      title: 'Đặt món thành công',
      message: `Đơn #${order.id.slice(0, 8)} đã được gửi tới quán.`,
      type: 'order_update',
    });

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
