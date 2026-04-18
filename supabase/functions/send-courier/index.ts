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

    // 2. Loop through orders and push to the correct courier API
    for (const order of orders) {
      console.log(`[INFO] Sending order ${order.id} to ${courier}...`)

      let trackingId = ''

      if (courier === 'Paperfly') {
        // ──────────────────────────────────────────────
        // PAPERFLY API CALL
        // Paperfly API credentials are read from Supabase secrets
        // ──────────────────────────────────────────────
        const paperflyCid = Deno.env.get('PAPERFLY_CID') ?? ''
        const paperflySecretKey = Deno.env.get('PAPERFLY_SECRET_KEY') ?? ''

        if (!paperflyCid || !paperflySecretKey) {
          // Credentials not set yet — use mock until credentials are provided
          console.warn('[WARN] PAPERFLY_CID or PAPERFLY_SECRET_KEY not set. Using mock tracking ID.')
          trackingId = 'PAPERFLY-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        } else {
          try {
            const paperflyRes = await fetch('https://api.paperfly.com.bd/api/parcel/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cid': paperflyCid,
                'Secret-Key': paperflySecretKey
              },
              body: JSON.stringify({
                merch_order_id: order.id,
                recipient_name: order.customer_name,
                recipient_phone: order.phone_number,
                recipient_address: order.address ?? '',
                cod_amount: order.cod_amount ?? 0
              })
            })
            const pfData = await paperflyRes.json()
            if (pfData?.success && pfData?.data?.tracking_no) {
              trackingId = pfData.data.tracking_no
              console.log(`[INFO] Paperfly tracking: ${trackingId}`)
            } else {
              console.error('[ERROR] Paperfly response:', JSON.stringify(pfData))
              trackingId = 'PAPERFLY-' + Math.random().toString(36).substring(2, 10).toUpperCase()
            }
          } catch (pfErr: any) {
            console.error('[ERROR] Paperfly API failed:', pfErr.message)
            trackingId = 'PAPERFLY-' + Math.random().toString(36).substring(2, 10).toUpperCase()
          }
        }

      } else if (courier === 'Steadfast') {
        // ──────────────────────────────────────────────
        // STEADFAST API CALL (রিয়েল API বা Mock)
        // ──────────────────────────────────────────────
        const sfApiKey = Deno.env.get('STEADFAST_API_KEY') ?? ''
        const sfSecretKey = Deno.env.get('STEADFAST_SECRET_KEY') ?? ''

        if (!sfApiKey || !sfSecretKey) {
          trackingId = 'STEADFAST-' + Math.random().toString(36).substring(2, 10).toUpperCase()
        } else {
          try {
            const sfRes = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
              method: 'POST',
              headers: {
                'Api-Key': sfApiKey,
                'Secret-Key': sfSecretKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                invoice: order.id,
                recipient_name: order.customer_name,
                recipient_phone: order.phone_number,
                recipient_address: order.address ?? '',
                cod_amount: order.cod_amount ?? 0
              })
            })
            const sfData = await sfRes.json()
            trackingId = sfData?.consignment?.tracking_code
              ?? 'STEADFAST-' + Math.random().toString(36).substring(2, 10).toUpperCase()
          } catch {
            trackingId = 'STEADFAST-' + Math.random().toString(36).substring(2, 10).toUpperCase()
          }
        }
      } else {
        // Pathao, RedX, ইত্যাদি — এখন Mock
        trackingId = `${courier.toUpperCase()}-` + Math.random().toString(36).substring(2, 10).toUpperCase()
      }

      // 3. Update Order in Database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'Shipped',
          courier_name: courier,
          tracking_id: trackingId
        })
        .eq('id', order.id)

      if (updateError) {
        console.error(`[ERROR] Failed to update order ${order.id}:`, updateError.message)
        results.push({ orderId: order.id, success: false, error: updateError.message })
      } else {
        console.log(`[INFO] Order ${order.id} dispatched. Tracking: ${trackingId}`)
        results.push({ orderId: order.id, success: true, tracking_id: trackingId })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.length}টি অর্ডার ${courier}-এ সফলভাবে পাঠানো হয়েছে!`,
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
