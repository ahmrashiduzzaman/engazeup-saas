import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderIds, courierName } = await req.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('orderIds array is required')
    }

    const courier = courierName || 'Steadfast'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch Orders
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds)

    if (fetchError || !orders || orders.length === 0) {
      throw new Error('Orders not found')
    }

    const results = []

    // 2. Loop through orders and push to courier
    for (const order of orders) {
      console.log(`[INFO] Sending order ${order.id} to ${courier}...`)
      
      // ডামি ট্র্যাকিং আইডি (Real API call এখানে হবে)
      const mockTrackingId = `${courier.toUpperCase()}-` + Math.random().toString(36).substring(2, 10).toUpperCase()

      // 3. Update Order in Database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'Shipped', // Shipped স্ট্যাটাস করে দিচ্ছি ইউজারের রিকোয়ারমেন্ট অনুযায়ী
          courier_name: courier,
          tracking_id: mockTrackingId
        })
        .eq('id', order.id)

      if (updateError) {
        console.error(`[ERROR] Failed to update order ${order.id}:`, updateError.message)
        results.push({ orderId: order.id, success: false, error: updateError.message })
      } else {
        console.log(`[INFO] Order ${order.id} dispatched. Tracking: ${mockTrackingId}`)
        results.push({ orderId: order.id, success: true, tracking_id: mockTrackingId })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'কুরিয়ারে রিকোয়েস্ট পাঠানো সম্পন্ন হয়েছে!',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[ERROR] send-courier:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
