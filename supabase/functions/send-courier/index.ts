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
      let isSuccess = false
      let apiErrorMessage = ''

      if (courier === 'Paperfly') {
        const paperflyCid = Deno.env.get('PAPERFLY_CID') ?? ''
        const paperflySecretKey = Deno.env.get('PAPERFLY_SECRET_KEY') ?? ''

        if (!paperflyCid || !paperflySecretKey) {
          apiErrorMessage = 'Paperfly credentials missing'
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
              isSuccess = true
            } else {
              apiErrorMessage = pfData?.message || 'Paperfly API failed'
            }
          } catch (pfErr: any) {
            apiErrorMessage = pfErr.message
          }
        }

      } else if (courier === 'Steadfast') {
        const sfApiKey = Deno.env.get('STEADFAST_API_KEY') ?? ''
        const sfSecretKey = Deno.env.get('STEADFAST_SECRET_KEY') ?? ''

        if (!sfApiKey || !sfSecretKey) {
          apiErrorMessage = 'Steadfast credentials missing'
        } else {
          try {
            const payload = {
              invoice: String(order.id),
              recipient_name: order.customer_name || 'Unknown',
              recipient_phone: order.phone_number || '01000000000',
              recipient_address: order.address || 'Unknown Address',
              cod_amount: Number(order.cod_amount) || 0
            }
            console.log(`[INFO] Steadfast Payload:`, JSON.stringify(payload))

            const sfRes = await fetch('https://portal.packzy.com/api/v1/create_order', {
              method: 'POST',
              headers: {
                'Api-Key': sfApiKey,
                'Secret-Key': sfSecretKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            })

            const sfResText = await sfRes.text()
            console.log(`[INFO] Steadfast Raw Response:`, sfResText)

            let sfData;
            try {
              sfData = JSON.parse(sfResText)
            } catch (e) {
              apiErrorMessage = 'Failed to parse Steadfast response'
            }

            if (sfData?.status === 200 && sfData?.consignment?.tracking_code) {
              trackingId = sfData.consignment.tracking_code
              isSuccess = true
            } else if (sfData) {
              const msg = sfData?.errors ? JSON.stringify(sfData.errors) : (sfData?.message || 'Steadfast API error')
              apiErrorMessage = msg
            }
          } catch (err: any) {
             apiErrorMessage = err.message
          }
        }
      } else {
        // Pathao, RedX, ইত্যাদি — এখন Mock
        trackingId = `${courier.toUpperCase()}-` + Math.random().toString(36).substring(2, 10).toUpperCase()
        isSuccess = true
      }

      if (!isSuccess) {
         console.error(`[ERROR] Courier API failed for order ${order.id}: ${apiErrorMessage}`)
         results.push({ orderId: order.id, success: false, error: apiErrorMessage })
         continue // Skip updating the DB to Shipped
      }

      // 3. Update Order in Database if Success
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
