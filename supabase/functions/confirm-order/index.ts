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
    const { orderId } = await req.json()

    if (!orderId) {
      throw new Error('orderId is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, customer_name, phone_number, cod_amount, shop_id, fb_sender_psid, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      throw new Error(`Order not found: ${fetchError?.message || 'No data'}`)
    }

    if (order.status === 'Confirmed') {
      return new Response(
        JSON.stringify({ success: true, message: 'অর্ডারটি ইতিমধ্যে কনফার্ম করা হয়েছে।', alreadyConfirmed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Update status to Confirmed
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'Confirmed' })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(`Failed to update order status: ${updateError.message}`)
    }

    console.log(`[INFO] Order ${orderId} status updated to Confirmed.`)

    // 3. Send Facebook Messenger confirmation (if PSID exists)
    let fbMessageSent = false
    let fbError = null

    if (order.fb_sender_psid) {
      try {
        // Fetch shop's Facebook Page Access Token
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('fb_page_access_token, shop_name')
          .eq('id', order.shop_id)
          .single()

        if (shopError || !shop) {
          throw new Error(`Shop not found: ${shopError?.message || 'No data'}`)
        }

        const fbToken = shop.fb_page_access_token
        if (!fbToken) {
          throw new Error('fb_page_access_token is empty for this shop')
        }

        const shopName = shop.shop_name || 'EngazeUp Shop'
        const codAmount = Number(order.cod_amount) || 0

        const confirmationMessage = `✅ ধন্যবাদ ${order.customer_name || 'ভাই/আপু'}! আপনার অর্ডারটি কনফার্ম করা হয়েছে। বিল: ৳${codAmount.toLocaleString()}। শীঘ্রই পার্সেল পাঠানো হবে। - ${shopName}`

        console.log(`[FB] Sending confirmation to PSID=${order.fb_sender_psid}`)

        const fbRes = await fetch(
          `https://graph.facebook.com/v20.0/me/messages?access_token=${fbToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: order.fb_sender_psid },
              message: { text: confirmationMessage }
            })
          }
        )

        const fbResBody = await fbRes.text()
        console.log(`[FB] Response: HTTP ${fbRes.status} | Body: ${fbResBody}`)

        if (fbRes.ok) {
          fbMessageSent = true
          console.log(`[FB] Confirmation message sent successfully!`)
        } else {
          fbError = `Facebook API error (HTTP ${fbRes.status}): ${fbResBody}`
          console.error(`[FB] ${fbError}`)
        }
      } catch (fbErr: any) {
        fbError = fbErr.message
        console.error(`[FB] Error sending Messenger confirmation: ${fbErr.message}`)
      }
    } else {
      console.log(`[INFO] No fb_sender_psid for order ${orderId}. Skipping Messenger notification.`)
    }

    const message = fbMessageSent
      ? `অর্ডার কনফার্ম হয়েছে এবং কাস্টমারকে Messenger-এ জানানো হয়েছে! ✅`
      : order.fb_sender_psid
        ? `অর্ডার কনফার্ম হয়েছে, কিন্তু Messenger মেসেজ পাঠাতে সমস্যা হয়েছে।`
        : `অর্ডার কনফার্ম হয়েছে! (এটি Facebook অর্ডার নয়, তাই Messenger মেসেজ পাঠানো হয়নি।)`

    return new Response(
      JSON.stringify({
        success: true,
        message,
        fbMessageSent,
        fbError,
        orderId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[ERROR] confirm-order:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
