import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId } = await req.json()

    if (!orderId) {
      throw new Error('orderId is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch Order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      throw new Error('Order not found')
    }

    // 2. Fetch Shop info to get Courier API Key (Optional context for real API)
    // For now, we mock the success and randomly generate a Tracking ID.
    // Replace this section with real Steadfast/Pathao API call later.
    console.log(`[INFO] Sending order ${orderId} to courier...`)
    
    // ডামি ট্র্যাকিং আইডি (Real API call এখানে হবে)
    const mockTrackingId = 'STEADFAST-' + Math.random().toString(36).substring(2, 10).toUpperCase()

    // 3. Update Order in Database
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'Processing',
        courier_name: 'Steadfast',
        tracking_id: mockTrackingId
      })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(`Failed to update order in DB: ${updateError.message}`)
    }

    console.log(`[INFO] Order ${orderId} successfully dispatched to courier. Tracking ID: ${mockTrackingId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'কুরিয়ারে সফলভাবে রিকোয়েস্ট পাঠানো হয়েছে!',
        tracking_id: mockTrackingId
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
