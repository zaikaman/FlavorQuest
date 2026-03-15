import { createServerClient, getCurrentUserProfile } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendNewOrderEmail } from '@/lib/services/mailer';

interface OrderItemInput {
  dish_id: string;
  quantity: number;
}

interface SanitizedOrderItem {
  dish_id: string;
  quantity: number;
}

type OrderType = 'pickup' | 'delivery';

function validateScheduledTime(value: unknown, fieldName: 'pickup_time' | 'delivery_time') {
  if (!value) {
    return { isValid: true as const, normalizedTime: null };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false as const,
      code: fieldName === 'pickup_time' ? 'INVALID_PICKUP_TIME' : 'INVALID_DELIVERY_TIME',
      error: `Invalid ${fieldName}`,
    };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return {
      isValid: false as const,
      code: fieldName === 'pickup_time' ? 'INVALID_PICKUP_TIME' : 'INVALID_DELIVERY_TIME',
      error: `Invalid ${fieldName}`,
    };
  }

  if (parsed.getTime() <= Date.now()) {
    return {
      isValid: false as const,
      code: fieldName === 'pickup_time' ? 'PICKUP_TIME_IN_PAST' : 'DELIVERY_TIME_IN_PAST',
      error: `${fieldName} must be in the future`,
    };
  }

  return { isValid: true as const, normalizedTime: parsed.toISOString() };
}

function sanitizeOrderItems(items: OrderItemInput[]): SanitizedOrderItem[] {
  const itemMap = new Map<string, number>();

  for (const item of items) {
    if (typeof item?.dish_id !== 'string') {
      continue;
    }

    const dishId = item.dish_id.trim();
    const quantity = Number(item.quantity);

    if (!dishId || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }

    itemMap.set(dishId, (itemMap.get(dishId) ?? 0) + quantity);
  }

  return Array.from(itemMap.entries()).map(([dish_id, quantity]) => ({
    dish_id,
    quantity,
  }));
}

function normalizeTextField(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOrderType(value: unknown): OrderType {
  return value === 'delivery' ? 'delivery' : 'pickup';
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
      id,
      poi_id,
      customer_id,
      order_type,
      customer_name,
      customer_phone,
      note,
      delivery_address,
      delivery_time,
      pickup_time,
      status,
      total_amount,
      created_at,
      updated_at,
      pois!inner(id, name_vi, owner_id),
      preorder_order_items(id, dish_id, quantity, unit_price, dishes(name))
    `)
    .order('created_at', { ascending: false });

  if (profile.role === 'customer') {
    query = query.eq('customer_id', profile.id);
  }

  if (profile.role === 'owner') {
    query = query.eq('pois.owner_id', profile.id);
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
    const items = sanitizeOrderItems((body.items ?? []) as OrderItemInput[]);
    const orderType = normalizeOrderType(body.order_type);
    const pickupTimeValidation = validateScheduledTime(body.pickup_time, 'pickup_time');
    const deliveryTimeValidation = validateScheduledTime(body.delivery_time, 'delivery_time');
    const customerName = normalizeTextField(body.customer_name);
    const customerPhone = normalizeTextField(body.customer_phone);
    const note = normalizeTextField(body.note);
    const deliveryAddress = normalizeTextField(body.delivery_address);

    if (!body.poi_id || items.length === 0) {
      return NextResponse.json({ error: 'Missing poi_id or items' }, { status: 400 });
    }

    if (orderType === 'pickup' && !pickupTimeValidation.isValid) {
      return NextResponse.json(
        { error: pickupTimeValidation.error, code: pickupTimeValidation.code },
        { status: 400 }
      );
    }

    if (orderType === 'delivery' && !deliveryTimeValidation.isValid) {
      return NextResponse.json(
        { error: deliveryTimeValidation.error, code: deliveryTimeValidation.code },
        { status: 400 }
      );
    }

    if (orderType === 'delivery' && (!customerName || !customerPhone || !deliveryAddress)) {
      return NextResponse.json(
        { error: 'Missing delivery contact info', code: 'MISSING_DELIVERY_INFO' },
        { status: 400 }
      );
    }

    const dishIds = items.map(item => item.dish_id);
    const [{ data: dishes, error: dishesError }, { data: poi, error: poiError }] = await Promise.all([
      supabase
        .from('dishes')
        .select('id, poi_id, name, price, is_available')
        .in('id', dishIds)
        .is('deleted_at', null),
      supabase
        .from('pois')
        .select('id, name_vi, owner_id')
        .eq('id', body.poi_id)
        .single(),
    ]);

    if (poiError || !poi) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    if (dishesError) {
      return NextResponse.json({ error: dishesError.message }, { status: 500 });
    }

    const validDishes = (dishes ?? []).filter(dish => dish.poi_id === body.poi_id && dish.is_available);
    if (validDishes.length !== items.length) {
      return NextResponse.json({ error: 'Một số món không hợp lệ hoặc đã hết' }, { status: 400 });
    }

    const dishMap = new Map(validDishes.map(dish => [dish.id, dish]));
    const totalAmount = items.reduce((sum, item) => {
      const dish = dishMap.get(item.dish_id);
      if (!dish) {
        return sum;
      }

      return sum + Number(dish.price) * item.quantity;
    }, 0);

    const { data: order, error: orderError } = await supabase
      .from('preorder_orders')
      .insert({
        poi_id: body.poi_id,
        customer_id: profile.id,
        order_type: orderType,
        customer_name: customerName,
        customer_phone: customerPhone,
        note,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        delivery_time: orderType === 'delivery' ? deliveryTimeValidation.normalizedTime : null,
        pickup_time: orderType === 'pickup' ? pickupTimeValidation.normalizedTime : null,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select(
        'id, poi_id, customer_id, order_type, customer_name, customer_phone, note, delivery_address, delivery_time, pickup_time, total_amount, status, created_at, updated_at'
      )
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

    const { error: itemsError } = await supabase.from('preorder_order_items').insert(orderItems);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const notificationTasks: PromiseLike<unknown>[] = [
      supabase.from('notifications').insert({
        user_id: profile.id,
        order_id: order.id,
        title: orderType === 'delivery' ? 'Đặt giao hàng thành công' : 'Đặt món thành công',
        message:
          orderType === 'delivery'
            ? `Đơn giao hàng #${order.id.slice(0, 8)} đã được gửi tới quán.`
            : `Đơn #${order.id.slice(0, 8)} đã được gửi tới quán.`,
        type: 'order_update',
      }),
    ];

    if (poi.owner_id) {
      notificationTasks.push(
        supabase.from('notifications').insert({
          user_id: poi.owner_id,
          order_id: order.id,
          title: orderType === 'delivery' ? 'Bạn có đơn giao hàng mới' : 'Bạn có đơn đặt món mới',
          message:
            orderType === 'delivery'
              ? `POI ${poi.name_vi} vừa nhận đơn giao #${order.id.slice(0, 8)}`
              : `POI ${poi.name_vi} vừa nhận đơn #${order.id.slice(0, 8)}`,
          type: 'order_created',
        })
      );

      const summary = orderItems
        .map(item => {
          const dish = dishMap.get(item.dish_id);
          return `${dish?.name ?? 'Món'} x${item.quantity}`;
        })
        .join(', ');

      void (async () => {
        try {
          const { data: owner } = await supabase
            .from('users')
            .select('email')
            .eq('id', poi.owner_id)
            .single();

          if (!owner?.email) {
            return;
          }

          await sendNewOrderEmail({
            to: owner.email,
            poiName: poi.name_vi,
            orderId: order.id,
            totalAmount,
            itemSummary: summary,
            orderType,
            scheduledTime:
              orderType === 'delivery'
                ? deliveryTimeValidation.normalizedTime
                : pickupTimeValidation.normalizedTime,
            deliveryAddress,
          });
        } catch (error) {
          console.error('Send owner order email failed:', error);
        }
      })();
    }

    await Promise.all(notificationTasks);

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
