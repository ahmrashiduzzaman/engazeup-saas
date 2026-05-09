import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { sendAutoSms } from "../_shared/smsService.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const courier = url.searchParams.get('courier') || 'steadfast'

    // Respond immediately to prevent webhook timeout
    const responsePromise = new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    const rawBody = await req.text()

    // Process asynchronously
    ;(async () => {
      try {
        console.log(`[INFO] Webhook hit for courier: ${courier}`);
        console.log(`[INFO] Payload:`, rawBody);

        let payload;
        try {
          payload = JSON.parse(rawBody);
        } catch (e) {
          console.warn('[WARN] Invalid JSON payload');
          return;
        }

        let trackingId = '';
        let status = '';

        if (courier.toLowerCase() === 'steadfast') {
          // Typically steadfast sends { tracking_code: "XXX", status: "returned" }
          trackingId = payload.tracking_code;
          status = payload.status;
        } else if (courier.toLowerCase() === 'paperfly') {
          // Assume standard paperfly format
          trackingId = payload.tracking_no || payload.TrackingNumber;
          status = payload.status || payload.OrderStatus;
        } else if (courier.toLowerCase() === 'pathao') {
          trackingId = payload.consignment_id;
          status = payload.order_status;
        } else if (courier.toLowerCase() === 'redx') {
          trackingId = payload.tracking_id;
          status = payload.status;
        } else {
          trackingId = payload.tracking_id || payload.tracking_code;
          status = payload.status;
        }

        if (!trackingId || !status) {
          console.warn('[WARN] Could not extract tracking ID or status from payload');
          return;
        }

        const normalizedStatus = status.toLowerCase();
        const isFailedOrReturned = normalizedStatus.includes('return') || normalizedStatus.includes('cancel') || normalizedStatus.includes('fail');

        if (!isFailedOrReturned) {
          console.log(`[INFO] Status is ${status}, no action needed for returns.`);
          // (You could update the order status here in the future for "Delivered" etc.)
          return;
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Find the order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, shop_id, phone_number')
          .eq('tracking_id', trackingId)
          .single();

        if (orderError || !order) {
          console.error(`[ERROR] Order with tracking ID ${trackingId} not found.`);
          return;
        }

        // Update order status in DB
        await supabase
          .from('orders')
          .update({ status: 'Returned' })
          .eq('id', order.id);

        // Fetch shop details
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('auto_sms_returned, shop_name')
          .eq('id', order.shop_id)
          .single();

        if (shopError || !shop) return;

        // Trigger 3: Delivery Failed / Returned Automated SMS
        if (shop.auto_sms_returned) {
          const message = `কুরিয়ার আপনার পার্সেলটি ডেলিভারি করতে পারেনি। পার্সেলটি নিতে চাইলে দ্রুত আমাদের পেইজে ইনবক্স করুন। - ${shop.shop_name || 'EngazeUp Shop'}`;
          
          await sendAutoSms({
            shopId: order.shop_id,
            phoneNumbers: [order.phone_number],
            message,
            supabaseClient: supabase
          });
        }

      } catch (err: any) {
        console.error('[FATAL] Courier webhook processing error:', err.message);
      }
    })();

    return responsePromise;
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
})
