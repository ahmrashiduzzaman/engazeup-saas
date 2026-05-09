import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendAutoSms } from "../_shared/smsService.ts"
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get('shop_id');
    if (!shopId) {
      return new Response('Missing shop_id in query parameters', { status: 400 });
    }

    const payload = await req.json();

    // WooCommerce Webhook payload usually has id and billing/shipping info
    const wooOrderId = payload?.id?.toString();
    if (!wooOrderId) {
      return new Response('Missing WooCommerce Order ID', { status: 400 });
    }

    const phone = payload?.billing?.phone || payload?.shipping?.phone || '';
    if (!phone) {
      console.warn('[WARN] No phone number provided in WooCommerce payload.');
      // Without phone we can't reliably deduplicate, but we can still save if needed, although user wants 24h duplicate check using phone.
    }

    const firstName = payload?.billing?.first_name || '';
    const lastName = payload?.billing?.last_name || '';
    const customerName = `${firstName} ${lastName}`.trim() || 'WooCommerce Customer';

    const address = payload?.shipping?.address_1 || payload?.billing?.address_1 || 'Unknown Address';
    let codAmount = payload?.total ? Number(payload?.total) : 0;

    // Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: shopRow } = await supabase
      .from('shops')
      .select('auto_sms_order_confirmed, shop_name')
      .eq('id', shopId)
      .single();

    let existingOrder = null;

    if (phone) {
      // 1. Check if an order with the same phone exists within the last 24 hours
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const { data: recentOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('phone_number', phone)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('[ERROR] Failed to fetch existing orders:', fetchError.message);
      } else if (recentOrders && recentOrders.length > 0) {
        existingOrder = recentOrders[0];
      }
    }

    if (existingOrder) {
      // 2. Duplicate found! Update existing order instead of creating new
      console.log(`[INFO] Duplicate found for phone ${phone}. Updating existing order ${existingOrder.id} with woo_order_id ${wooOrderId}`);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ woo_order_id: wooOrderId })
        .eq('id', existingOrder.id);

      if (updateError) {
        console.error('[ERROR] Failed to update existing order woo_order_id:', updateError.message);
        return new Response('Failed to update duplicate order', { status: 500 });
      }

      return new Response(JSON.stringify({
        status: 'success',
        action: 'updated_duplicate',
        updated_id: existingOrder.id,
        woo_order_id: wooOrderId
      }), { headers: { 'Content-Type': 'application/json' }, status: 200 });

    } else {
      // 3. No duplicate found. Insert as new order.
      console.log(`[INFO] New order for phone ${phone}. Inserting with woo_order_id ${wooOrderId}`);

      // Optional: Upsert customer logic could be added here similar to fb-webhook
      await supabase.from('customers').upsert({
        shop_id: shopId,
        name: customerName,
        phone: phone,
        is_deleted: false,
        total_orders: 1
      }, { onConflict: 'phone' });

      // Insert new order
      const newOrderData = {
        shop_id: shopId,
        customer_name: customerName,
        phone_number: phone,
        address: address,
        source: 'WooCommerce',
        status: 'Pending',
        cod_amount: codAmount,
        woo_order_id: wooOrderId
      };

      const { data: orderRow, error: insertError } = await supabase
        .from('orders')
        .insert(newOrderData)
        .select('id')
        .single();

      if (insertError) {
        console.error('[ERROR] Failed to insert new WooCommerce order:', insertError.message);
        return new Response('Failed to insert new order', { status: 500 });
      }

      // Trigger 1: Order Confirmed Automated SMS
      if (shopRow?.auto_sms_order_confirmed && orderRow?.id) {
        const message = `আপনার অর্ডারটি (ID: ${orderRow.id}) কনফার্ম হয়েছে। বিল: ৳${codAmount}। খুব শীঘ্রই পার্সেল পাঠানো হবে। - ${shopRow.shop_name || 'EngazeUp Shop'}`;
        sendAutoSms({
          shopId,
          phoneNumbers: [phone],
          message,
          supabaseClient: supabase
        }).catch(e => console.error('[SMS] Unexpected error sending woo order confirmed SMS:', e));
      }

      return new Response(JSON.stringify({
        status: 'success',
        action: 'inserted_new',
        woo_order_id: wooOrderId
      }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
    }

  } catch (error: any) {
    console.error('[FATAL] Error processing WooCommerce webhook:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
});
