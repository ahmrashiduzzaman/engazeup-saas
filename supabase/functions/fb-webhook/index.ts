import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Webhook Verify Token (Facebook App Dashboard-এ সেট করতে হবে) ──
const VERIFY_TOKEN = 'engazeup_secret';

serve(async (req) => {
  const url = new URL(req.url);

  // ── 1. FACEBOOK WEBHOOK VERIFICATION (GET) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
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
        const body = await req.json();
        if (body.object !== 'page') return;

        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

        for (const entry of body.entry ?? []) {
          const webhookEvent = entry.messaging?.[0];
          if (!webhookEvent?.message?.text || webhookEvent.message.is_echo) continue;

          const senderPsid  = webhookEvent.sender.id;
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

          const shopId  = shopRow.id;
          const fbToken = shopRow.fb_page_access_token ?? '';

          if (!fbToken) {
            console.error(`[ERROR] fb_page_access_token is empty for shop=${shopId}`);
          }

          // -- B. Gemini দিয়ে তথ্য বের করা
          let cleanJson: any = { name: null, phone: null, address: null };
          try {
            const aiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `Extract JSON with keys (name, phone, address) from this Bengali/English message: "${incomingText}". If a field is not found, set it to null. You MUST return ONLY a valid raw JSON object. Do not wrap it in markdown backticks. Do not add any conversational text before or after the JSON.`
                    }]
                  }]
                })
              }
            );

            // ── Full Gemini API diagnostics ─────────────────────────────────
            const aiData = await aiResponse.json();
            console.log(`[GEMINI] HTTP Status: ${aiResponse.status}`);

            // API-level error (wrong key, quota exceeded, etc.)
            if (aiData.error) {
              console.error(`[GEMINI] API Error ${aiData.error.code}: ${aiData.error.message} (${aiData.error.status})`);
              throw new Error(`Gemini API error: ${aiData.error.message}`);
            }

            // Safety filter block
            if (aiData.promptFeedback?.blockReason) {
              console.warn(`[GEMINI] Blocked by safety filter: ${aiData.promptFeedback.blockReason}`);
            }

            // No candidates returned
            if (!aiData.candidates || aiData.candidates.length === 0) {
              console.warn(`[GEMINI] No candidates returned. Full response: ${JSON.stringify(aiData)}`);
              throw new Error('Gemini returned no candidates');
            }

            const rawResult: string = (aiData.candidates[0]?.content?.parts?.[0]?.text ?? '').trim();
            console.log(`[GEMINI] Raw text: "${rawResult}"`);

            if (!rawResult) {
              console.warn('[GEMINI] Candidate text is empty. finishReason:', aiData.candidates[0]?.finishReason);
              throw new Error('Empty text in candidate');
            }

            // Layer 1: markdown fence সরিয়ে direct parse (best case)
            try {
              const cleanText = rawResult
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
              cleanJson = JSON.parse(cleanText);
              console.log(`[GEMINI] Layer1 OK: ${JSON.stringify(cleanJson)}`);
            } catch {
              // Layer 2: prose-এর মধ্যে { } খোঁজো — GREEDY so full JSON captured
              try {
                const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON block found');
                cleanJson = JSON.parse(jsonMatch[0]);
                console.log(`[GEMINI] Layer2 OK: ${JSON.stringify(cleanJson)}`);
              } catch (e2: any) {
                console.error(`[GEMINI] Both layers failed. Raw="${rawResult}" Err=${e2.message}`);
              }
            }
          } catch (geminiErr: any) {
            console.error('[ERROR] Gemini failed:', geminiErr.message);
          }



          let replyText = `আপনার মেসেজটি পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই যোগাযোগ করবেন।`;

          // ── C. ফোন নম্বর পেলে DB-তে সেভ করো ──
          if (cleanJson?.phone) {
            console.log(`[DATA] Saving order & customer. shop_id=${shopId}, phone=${cleanJson.phone}`);

            // Customer upsert (shop-specific)
            const { error: custError } = await supabase.from('customers').upsert({
              shop_id: shopId,
              name: cleanJson.name || 'Customer',
              phone: cleanJson.phone,
              is_deleted: false,
              total_orders: 1
            }, { onConflict: 'shop_id,phone' });
            if (custError) console.error('[ERROR] Customer upsert:', JSON.stringify(custError));
            else console.log('[INFO] Customer saved.');

            // Order insert (shop-specific)
            const { error: orderError } = await supabase.from('orders').insert({
              shop_id: shopId,
              customer_name: cleanJson.name || 'Customer',
              phone_number: cleanJson.phone,
              address: cleanJson.address || 'Unknown',
              source: 'Facebook AI',
              status: 'Pending',
              cod_amount: 0
            });
            if (orderError) console.error('[ERROR] Order insert:', JSON.stringify(orderError));
            else console.log('[INFO] Order saved.');

            replyText = `ধন্যবাদ ${cleanJson.name || 'ভাই/আপু'}! আপনার অর্ডারটি আমরা পেয়েছি। আমাদের প্রতিনিধি শীঘ্রই যোগাযোগ করবেন।`;
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
            const fbData = await fbRes.json();
            if (fbData.error) console.error('[ERROR] FB reply:', JSON.stringify(fbData.error));
            else console.log('[INFO] FB reply sent.');
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
