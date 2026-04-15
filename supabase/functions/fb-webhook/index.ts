import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VERIFY_TOKEN = 'engazeup_secure_webhook_2026';

serve(async (req) => {
  const url = new URL(req.url);

  // 1. FACEBOOK WEBHOOK VERIFICATION (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully.');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // 2. INCOMING MESSAGES (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      if (body.object !== 'page') {
        return new Response('Not Found', { status: 404 });
      }
      
      // BACKGROUND PROCESSING: Don't block the 200 OK response to avoid FB timeouts.
      // Deno Deploy allows dangling promises if we just don't await the main worker loop.
      const processWebhooks = async () => {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          
          if (webhookEvent.message && !webhookEvent.message.is_echo && webhookEvent.message.text) {
            const senderPsid = webhookEvent.sender.id;
            const pageId = webhookEvent.recipient.id;
            const incomingText = webhookEvent.message.text;

            console.log(`Msg from ${senderPsid} to ${pageId}: ${incomingText}`);

            // --- A. Identify Shop ---
            const { data: shop } = await supabase
              .from('shops')
              .select('id, fb_page_access_token, fb_page_name')
              .eq('fb_page_id', pageId)
              .single();

            if (!shop || !shop.fb_page_access_token) continue;

            // --- B. Customer Sync ---
            // Ensure this user exists in the customers table to show up in Customer Directory
            const { data: existingCust } = await supabase
              .from('customers')
              .select('id')
              .eq('shop_id', shop.id)
              .eq('phone', senderPsid) // Temporarily using PSID as phone if real phone isn't known
              .single();
              
            if (!existingCust) {
              await supabase.from('customers').insert({
                shop_id: shop.id,
                name: "Facebook User",
                phone: senderPsid,
                total_spent: 0,
                total_orders: 0
              });
            }

            // --- C. Load or Create Conversation ---
            let { data: conversation } = await supabase
              .from('conversations')
              .select('*')
              .eq('fb_page_id', pageId)
              .eq('customer_psid', senderPsid)
              .single();

            if (!conversation) {
              const { data: newConvo } = await supabase
                .from('conversations')
                .insert({
                  shop_id: shop.id,
                  fb_page_id: pageId,
                  customer_psid: senderPsid,
                  customer_name: "Customer"
                })
                .select().single();
              conversation = newConvo;
            }

            if (!conversation) continue;

            await supabase.from('conversations').update({ last_message_at: new Date() }).eq('id', conversation.id);

            await supabase.from('messages').insert({
              conversation_id: conversation.id,
              sender: 'user',
              content: incomingText
            });

            // --- D. Fetch History ---
            const { data: history } = await supabase
              .from('messages')
              .select('sender, content')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: true })
              .limit(8); 

            const geminiHistory = (history || []).map((msg: any) => ({
              role: msg.sender === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }));

            // --- E. Query Gemini with Order Intent Logic ---
            if (!geminiApiKey) continue;

            const systemInstruction = `You are a helpful customer support AI for a Bangladeshi shop "${shop.fb_page_name}". Respond in Bengali. Short and concise.
CRITICAL RULE: If the customer provides their exact PHONE NUMBER and delivery ADDRESS placing an actual order, you MUST reply warmly and then strictly append this exact hidden tag at the very end of your message: ||ORDER||<phone_number>||address||. 
Example: "আপনার অর্ডারটি কনফার্ম করা হয়েছে। ||ORDER||017...||Dhaka Rampura||"
Do NOT use the ||ORDER|| tag unless they clearly provided phone AND address for an order.`;

            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: { text: systemInstruction } },
                contents: geminiHistory,
                generationConfig: { temperature: 0.5, maxOutputTokens: 200 }
              })
            });

            const aiData = await aiResponse.json();
            let botReplyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, আমি আপনার মেসেজটি বুঝতে পারছি না।";

            // --- F. Extract Order Intent ---
            let detectedOrder = false;
            const orderRegex = /\|\|ORDER\|\|(.*?)\|\|(.*?)\|\|/g;
            const match = orderRegex.exec(botReplyText);
            
            if (match) {
              detectedOrder = true;
              const extractedPhone = match[1].trim();
              const extractedAddress = match[2].trim();
              
              // Remove the hidden tag from the user reply
              botReplyText = botReplyText.replace(match[0], '').trim();

              // Insert into orders table
              await supabase.from('orders').insert({
                shop_id: shop.id,
                customer_name: "FB Order",
                phone_number: extractedPhone,
                source: "Facebook AI",
                status: "Pending",
                cod_amount: 0, // Admin will edit later
                address: extractedAddress
              });
              
              // Update customer real phone if available
              await supabase.from('customers').update({ phone: extractedPhone }).eq('shop_id', shop.id).eq('phone', senderPsid);
            }

            // --- G. Send Reply to Facebook ---
            // Faster parallel calls now
            await Promise.all([
              fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.fb_page_access_token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipient: { id: senderPsid },
                  message: { text: botReplyText }
                })
              }),
              supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'ai',
                content: botReplyText
              })
            ]);
            
            console.log("Replied successfully!");
          }
        }
      };

      // Start processing in background and immediately return 200 OK to Facebook
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(processWebhooks());
      } else {
         // Fallback if waitUntil isn't strictly enforced
         processWebhooks().catch(console.error);
      }

      return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (err: any) {
      console.error('Webhook error:', err);
      return new Response('Error but received', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
