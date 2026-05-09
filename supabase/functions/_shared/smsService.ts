export async function sendAutoSms({
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
      console.error('[SMS] Shop not found or error:', shopError?.message);
      return false;
    }

    if (shop.sms_credits < requiredCredits) {
      console.warn(`[SMS] Insufficient balance for shop ${shopId}. Has: ${shop.sms_credits}, Needs: ${requiredCredits}`);
      return false;
    }

    const { error: deductError } = await supabaseClient
      .from('shops')
      .update({ sms_credits: shop.sms_credits - requiredCredits })
      .eq('id', shopId);

    if (deductError) {
      console.error('[SMS] Failed to deduct credits:', deductError.message);
      return false;
    }

    const apiKey = Deno.env.get('MIM_SMS_API_KEY');
    const senderId = Deno.env.get('SMS_SENDER_ID') || '8809612443880'; 

    if (!apiKey) {
      console.error('[SMS] MIM_SMS_API_KEY missing. Rolling back credits.');
      await supabaseClient.from('shops').update({ sms_credits: shop.sms_credits }).eq('id', shopId);
      return false;
    }

    const isUnicode = /[^\u0000-\u00ff]/.test(message);
    const smsType = isUnicode ? 'unicode' : 'text';
    const contactsStr = phoneNumbers.join('+');

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
    return true;

  } catch (error: any) {
    console.error('[SMS] CRITICAL ERROR in SMS service (caught safely):', error.message);
    return false;
  }
}
