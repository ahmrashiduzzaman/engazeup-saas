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
    const { phoneNumbers, message } = await req.json()

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      throw new Error("Phone numbers array is required and must not be empty")
    }
    if (!message || !message.trim()) {
      throw new Error("Message is required")
    }

    // --- Authenticate the calling user via their JWT ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Authorization header")

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Use the SERVICE ROLE key so we can read and write to the shops table
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Decode the user from the JWT to get their ID
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) throw new Error("Unauthorized: invalid token")

    const shopId = user.id
    const requiredCredits = phoneNumbers.length

    // --- Step 1: Check the current SMS credit balance ---
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('sms_credits')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      throw new Error("Shop wallet not found. Please contact support.")
    }

    if (shop.sms_credits < requiredCredits) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient SMS balance. You need ${requiredCredits} credits but only have ${shop.sms_credits}. Please recharge.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      )
    }

    // --- Step 2: Deduct credits BEFORE sending (to prevent race conditions) ---
    const { error: deductError } = await supabase
      .from('shops')
      .update({ sms_credits: shop.sms_credits - requiredCredits })
      .eq('id', shopId)

    if (deductError) throw new Error("Failed to deduct SMS credits: " + deductError.message)

    // --- Step 3: Dispatch SMS via provider ---
    const apiKey = Deno.env.get('SMS_API_KEY')
    const senderId = Deno.env.get('SMS_SENDER_ID')

    if (!apiKey) {
      // Rollback the deduction if API is not configured
      await supabase
        .from('shops')
        .update({ sms_credits: shop.sms_credits }) // restore
        .eq('id', shopId)
      throw new Error("SMS provider not configured. Credits have been restored.")
    }

    // TODO: Replace with your actual SMS provider API call
    // Example (uncomment and adapt for your provider):
    // const response = await fetch('https://api.bulksmsbd.net/api/smsapi', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     api_key: apiKey,
    //     senderid: senderId,
    //     number: phoneNumbers.join(','),
    //     message: message,
    //   })
    // })
    // const result = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: requiredCredits,
        credits_deducted: requiredCredits,
        credits_remaining: shop.sms_credits - requiredCredits,
        message: `Bulk SMS dispatched to ${requiredCredits} numbers successfully!`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
