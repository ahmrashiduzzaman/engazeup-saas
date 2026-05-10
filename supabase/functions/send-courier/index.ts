import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const banglaToEnglishDigits = (str: string) => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  if (!str) return ''
  return str.replace(/[০-৯]/g, (w) => banglaDigits.indexOf(w).toString())
}

async function sendAutoSms({
  shopId,
  phoneNumbers,
  message,
  supabaseClient
}: {
  shopId: string;
  phoneNumbers: string[];
  message: string;
  supabaseClient: any;
}) {
  try {
    if (!phoneNumbers || phoneNumbers.length === 0) return false;
    if (!message || !message.trim()) return false;

    const requiredCredits = phoneNumbers.length;

    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('sms_credits')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error(`Shop not found or error: ${shopError?.message}`);
    }

    if (shop.sms_credits < requiredCredits) {
      throw new Error(`Insufficient balance for shop ${shopId}. Has: ${shop.sms_credits}, Needs: ${requiredCredits}`);
    }

    const { error: deductError } = await supabaseClient
      .from('shops')
      .update({ sms_credits: shop.sms_credits - requiredCredits })
      .eq('id', shopId);

    if (deductError) {
      throw new Error(`Failed to deduct credits: ${deductError.message}`);
    }

    const apiKey = Deno.env.get('MIM_SMS_API_KEY');
    const senderId = Deno.env.get('SMS_SENDER_ID') || '8809612443880'; 

    if (!apiKey) {
      await supabaseClient.from('shops').update({ sms_credits: shop.sms_credits }).eq('id', shopId);
      throw new Error('MIM_SMS_API_KEY environment variable is missing in Supabase. Rolling back credits.');
    }

    const isUnicode = /[^\u0000-\u00ff]/.test(message);
    const smsType = isUnicode ? 'unicode' : 'text';
    
    // Ensure numbers are English and clean
    const cleanNumbers = phoneNumbers.map(p => banglaToEnglishDigits(p).replace(/\D/g, ''));
    const contactsStr = cleanNumbers.join('+');

    const formData = new URLSearchParams();
    formData.append('api_key', apiKey);
    formData.append('type', smsType);
    formData.append('contacts', contactsStr);
    formData.append('senderid', senderId);
    formData.append('msg', message);

    const response = await fetch('https://esms.mimsms.com/smsapi', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    const resultText = await response.text();
    console.log(`[SMS] Dispatch successful. Sent to ${contactsStr}. Result: ${resultText}`);
    
    // Mim SMS returns 1002, 1003, 1004, 1005, 1011 for errors. It returns 1000 for success.
    const isError = resultText.includes('1002') || resultText.includes('1003') || resultText.includes('1004') || resultText.includes('1005') || resultText.includes('1006') || resultText.includes('1011');
    
    if (isError || !response.ok) {
      await supabaseClient.from('shops').update({ sms_credits: shop.sms_credits }).eq('id', shopId);
      throw new Error(`Mim SMS API rejected the request. Credits Rolled Back. Raw Response: ${resultText}`);
    }

    return true;

  } catch (error: any) {
    console.error('[SMS] CRITICAL ERROR in SMS service:', error.message);
    throw error; // Re-throw so the caller can catch it and attach it to smsError
  }
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

    // Fetch Orders
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds)

    if (fetchError || !orders || orders.length === 0) {
      throw new Error('Orders not found')
    }

    const uniqueShopIds = [...new Set(orders.map(o => o.shop_id).filter(Boolean))]
    
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, steadfast_api_key, steadfast_api_secret, auto_sms_dispatched, shop_name')
      .in('id', uniqueShopIds)

    if (shopsError) {
      console.warn('[WARN] Failed to fetch shops:', shopsError.message)
    }

    const shopsMap = new Map((shops || []).map(s => [s.id, s]))
    const results = []

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
              headers: { 'Content-Type': 'application/json', 'Cid': paperflyCid, 'Secret-Key': paperflySecretKey },
              body: JSON.stringify({
                merch_order_id: order.id,
                recipient_name: order.customer_name,
                recipient_phone: banglaToEnglishDigits(order.phone_number) || '01000000000',
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
        const shopData = shopsMap.get(order.shop_id)
        const sfApiKey = shopData?.steadfast_api_key || ''
        const sfSecretKey = shopData?.steadfast_api_secret || ''

        if (!sfApiKey || !sfSecretKey) {
          apiErrorMessage = 'Steadfast credentials missing for this shop'
        } else {
          try {
            const payload = {
              invoice: String(order.id),
              recipient_name: order.customer_name || 'Unknown',
              recipient_phone: banglaToEnglishDigits(order.phone_number) || '01000000000',
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
            try { sfData = JSON.parse(sfResText) } catch (e) {
              apiErrorMessage = `Steadfast returned non-JSON (HTTP ${sfRes.status}): ${sfResText.substring(0, 200)}`
            }

            if (sfData?.status === 200 && sfData?.consignment?.tracking_code) {
              trackingId = sfData.consignment.tracking_code
              isSuccess = true
            } else if (sfData) {
              apiErrorMessage = sfData?.errors ? JSON.stringify(sfData.errors) : (sfData?.message || `Steadfast error: ${JSON.stringify(sfData)}`)
            }
          } catch (err: any) {
            apiErrorMessage = err.message
          }
        }

      } else {
        // Pathao, RedX — Mock for now
        trackingId = `${courier.toUpperCase()}-` + Math.random().toString(36).substring(2, 10).toUpperCase()
        isSuccess = true
      }

      if (!isSuccess) {
        console.error(`[ERROR] Courier API failed for order ${order.id}: ${apiErrorMessage}`)
        results.push({ orderId: order.id, success: false, error: apiErrorMessage })
        continue
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Shipped', courier_name: courier, tracking_id: trackingId })
        .eq('id', order.id)

      if (updateError) {
        console.error(`[ERROR] Failed to update order ${order.id}:`, updateError.message)
        results.push({ orderId: order.id, success: false, error: updateError.message })
      } else {
        console.log(`[INFO] Order ${order.id} dispatched. Tracking: ${trackingId}`)

        // Trigger 2: Parcel Dispatched Automated SMS
        const shopData = shopsMap.get(order.shop_id)
        let smsStatus = 'Not configured'
        let smsError = null
        if (shopData?.auto_sms_dispatched) {
          let trackingLink = trackingId;
          if (courier === 'Steadfast') trackingLink = `https://steadfast.com.bd/t/${trackingId}`;
          else if (courier === 'Paperfly') trackingLink = `https://paperfly.com.bd/tracking?id=${trackingId}`;
          else if (courier === 'Pathao') trackingLink = `https://pathao.com/bd/courier/track-your-parcel/?consignment_id=${trackingId}`;
          else if (courier === 'RedX') trackingLink = `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`;

          const message = `আপনার পার্সেলটি ${courier} কুরিয়ারে দেওয়া হয়েছে। ট্র্যাকিং: ${trackingLink}। অনুগ্রহ করে ফোন খোলা রাখুন। - ${shopData.shop_name || 'EngazeUp Shop'}`;
          
          try {
            await sendAutoSms({
              shopId: order.shop_id,
              phoneNumbers: [order.phone_number],
              message,
              supabaseClient: supabase
            })
            smsStatus = 'Sent successfully'
          } catch (smsImportErr: any) {
            smsStatus = 'Failed'
            smsError = smsImportErr.message
            console.error('[SMS] Error:', smsImportErr.message);
          }
        }
        results.push({ orderId: order.id, success: true, tracking_id: trackingId, smsStatus, smsError })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount
    const firstError = results.find(r => !r.success)?.error

    const message = failCount > 0
      ? `${successCount}টি সফল, ${failCount}টি ফেইল! Error: ${firstError}`
      : `${successCount}টি অর্ডার ${courier}-এ সফলভাবে পাঠানো হয়েছে!`

    return new Response(
      JSON.stringify({ success: successCount > 0, message, results }),
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
