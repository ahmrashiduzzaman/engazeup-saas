import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Webhook Verify Token (Facebook App Dashboard-এ সেট করতে হবে) ──
const VERIFY_TOKEN = 'engazeup_secret';

// Helper function to convert Bengali digits to English (Fully robust)
const convertBengaliToEnglishNumbers = (val: any): string => {
  if (val === undefined || val === null) return '';
  const str = String(val); // Safety: if val is number, make it string
  if (!str) return '';

  const bengaliToEnglishMap: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace?.(/[০-৯]/g, match => bengaliToEnglishMap[match]) || str;
};

serve(async (req) => {
  const url = new URL(req.url);

  // ── 1. FACEBOOK WEBHOOK VERIFICATION (GET) ──
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[INFO] Webhook verified successfully.');
      return new Response(challenge, {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    }
    console.log('[WARN] Webhook verification failed. Token mismatch.');
    return new Response('Forbidden', { status: 403 });
  }

  // ── 2. INCOMING MESSAGES (POST) ──
  if (req.method === 'POST') {
    // সাথে সাথে 200 OK দিয়ে দাও — Facebook timeout এড়াতে
    const responsePromise = new Response('EVENT_RECEIVED', { status: 200 });

    // Background-এ প্রসেস করো
    (async () => {
      try {
        console.log('🔥 WEBHOOK HIT! Request incoming...');
        const rawBody = await req.text();
        console.log('📦 RAW PAYLOAD:', rawBody);

        const body = JSON.parse(rawBody);
        if (body.object !== 'page') return;

        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? '';

        for (const entry of body.entry ?? []) {
          const webhookEvent = entry.messaging?.[0];
          if (!webhookEvent?.message?.text || webhookEvent.message.is_echo) continue;

          const senderPsid = webhookEvent.sender.id;
          const recipientId = webhookEvent.recipient.id; // ← этот это Page ID
          const incomingText = webhookEvent.message.text;
          console.log(`[MSG] PageID=${recipientId} | From=${senderPsid} | Text=${incomingText}`);

          // ── A. DB থেকে shop খোঁজো — fb_page_id দিয়ে ──
          // Multi-tenant: প্রতিটি shop-এর নিজস্ব page token ব্যবহার হবে
          const { data: shopRow, error: shopErr } = await supabase
            .from('shops')
            .select('id, fb_page_access_token')
            .eq('fb_page_id', recipientId)
            .single();

          if (shopErr || !shopRow) {
            console.error(`[WARN] No shop found for Page ID=${recipientId}. Skipping.`);
            continue;
          }

          const shopId = shopRow.id;
          const fbToken = shopRow.fb_page_access_token ?? '';

          if (!fbToken) {
            console.error(`[ERROR] fb_page_access_token is empty for shop=${shopId}`);
          }

          // -- B. Groq (Llama 3) দিয়ে তথ্য বের করা
          let cleanJson: any = { customer_name: null, phone_number: null, delivery_address: null, order_amount: 0 };
          try {
            const aiResponse = await fetch(
              'https://api.groq.com/openai/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${groqApiKey}`
                },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    {
                      role: "system",
                      content: `You are an expert data extractor for a Bangladeshi e-commerce shop. Read the customer's message (mostly in Bengali) and extract the order details. CRITICAL RULE: You must separate the person's Name from their Address accurately.
Examples:

Input: "আছিয়া কালিদাসপুর আলমডাঙ্গা চুয়াডাঙ্গা" -> Output: {"customer_name": "আছিয়া", "delivery_address": "কালিদাসপুর আলমডাঙ্গা চুয়াডাঙ্গা"}

Input: "মোঃ হাসান মিরপুর ১০ ঢাকা" -> Output: {"customer_name": "মোঃ হাসান", "delivery_address": "মিরপুর ১০ ঢাকা"}

Reply ONLY with a valid JSON object. Do not include any markdown, backticks, or extra text. JSON structure: {"customer_name": "", "delivery_address": "", "phone_number": "", "order_amount": ""}`
                    },
                    {
                      role: "user",
                      content: incomingText
                    }
                  ],
                  temperature: 0.1
                })
              }
            );

            // ── Full Groq API diagnostics ─────────────────────────────────
            const aiData = await aiResponse.json();
            console.log(`[GROQ] HTTP Status: ${aiResponse.status}`);

            // API-level error
            if (aiData.error) {
              console.error(`[GROQ] API Error: ${aiData.error.message}`);
              throw new Error(`Groq API error: ${aiData.error.message}`);
            }

            // No choices returned
            if (!aiData.choices || aiData.choices.length === 0) {
              console.warn(`[GROQ] No choices returned. Full response: ${JSON.stringify(aiData)}`);
              throw new Error('Groq returned no choices');
            }

            const rawResult: string = (aiData.choices[0]?.message?.content ?? '').trim();
            console.log(`[GROQ] Raw text: "${rawResult}"`);

            if (!rawResult) {
              console.warn('[GROQ] Candidate text is empty.');
              throw new Error('Empty text in candidate');
            }

            // Layer 1: direct parse
            try {
              cleanJson = JSON.parse(aiData.choices[0].message.content);
              console.log(`[GROQ] Layer1 OK: ${JSON.stringify(cleanJson)}`);
            } catch {
              // Layer 2: prose-এর মধ্যে { } খোঁজো — GREEDY so full JSON captured
              try {
                const jsonMatch = (rawResult || '').match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON block found');
                cleanJson = JSON.parse(jsonMatch[0]);
                console.log(`[GROQ] Layer2 OK: ${JSON.stringify(cleanJson)}`);
              } catch (e2: any) {
                console.error(`[GROQ] Both layers failed. Raw="${rawResult}" Err=${e2.message}`);
              }
            }
          } catch (groqErr: any) {
            console.error('[ERROR] Groq failed:', groqErr.message);
          }



          let replyText = `আপনার মেসেজটি পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই যোগাযোগ করবেন।`;

          // ── C. ফোন নম্বর পেলে DB-তে সেভ করো ──
          if (cleanJson?.phone_number) {
            const safePhone = convertBengaliToEnglishNumbers(cleanJson.phone_number);
            const safeCodAmount = typeof cleanJson.order_amount === 'number' ? cleanJson.order_amount : (parseInt(cleanJson.order_amount) || 0);

            console.log(`[DATA] Saving order & customer. shop_id=${shopId}, phone=${safePhone}, cod=${safeCodAmount}`);

            try {
              // Customer upsert (shop-specific)
              const { error: custError } = await supabase.from('customers').upsert({
                shop_id: shopId,
                name: cleanJson.customer_name || 'Customer',
                phone: safePhone,
                is_deleted: false,
                total_orders: 1
              }, { onConflict: 'shop_id,phone' });
              if (custError) throw custError;
              console.log('[INFO] Customer saved.');

              // Order insert (shop-specific)
              const { error: orderError } = await supabase.from('orders').insert({
                shop_id: shopId,
                customer_name: cleanJson.customer_name || 'Customer',
                phone_number: safePhone,
                address: cleanJson.delivery_address || 'Unknown',
                source: 'Facebook AI',
                status: 'Pending',
                cod_amount: safeCodAmount
              });
              if (orderError) throw orderError;
              console.log('[INFO] Order saved.');
            } catch (error) {
              console.error('DB Insert Failed:', error);
            }

            replyText = `ধন্যবাদ ${cleanJson.customer_name || 'ভাই/আপু'}! আপনার অর্ডারটি আমরা পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই যোগাযোগ করবেন।`;
          }

          // ── D. সবসময় Facebook-এ reply পাঠাও ──
          if (fbToken) {
            const fbRes = await fetch(
              `https://graph.facebook.com/v20.0/me/messages?access_token=${fbToken}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipient: { id: senderPsid },
                  message: { text: replyText }
                })
              }
            );

            if (!fbRes.ok) {
              console.error('FB Send Error:', await fbRes.json());
            } else {
              console.log('Successfully delivered!');
            }
          } else {
            console.error(`[ERROR] No fb_page_access_token for shop=${shopId}. Reply not sent.`);
          }
        }
      } catch (err: any) {
        console.error('[FATAL] Webhook processing error:', err.message);
      }
    })();

    return responsePromise;
  }

  return new Response('Method Not Allowed', { status: 405 });
});
