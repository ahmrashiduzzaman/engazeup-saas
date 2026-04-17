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

            // Removed premature Customer Sync. We will only add customers to CRM when they provide a phone number.

            // --- B. Load or Create Conversation ---
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

            // --- Fetch Knowledge Base (Products) ---
            const { data: products } = await supabase
              .from('products')
              .select('name, price, stock')
              .eq('shop_id', shop.id)
              .eq('is_deleted', false)
              .limit(50);
              
            let productListText = "Currently, no products are added to the inventory.";
            if (products && products.length > 0) {
              productListText = products.map(p => `- ${p.name}: ৳${p.price} (Stock: ${p.stock > 0 ? "Available" : "Out of Stock"})`).join('\n');
            }

            // --- E. Query Gemini with Order Intent Logic ---
            if (!geminiApiKey) continue;

            const systemInstruction = `Your name is EngazeUp AI. You are a helpful sales assistant for our store "${shop.fb_page_name}". 

Here is our current Product and Price List:
${productListText}

Your goal is to:
1. Answer customer queries about products based ONLY on the list above. Keep answers very short, concise, and clear.
2. If the user asks for something not in the list or you don't know the answer, politely say exactly: "আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে, দয়া করে আপনার যোগাযোগ করার মোবাইল নাম্বারটি দিন।"
3. কাস্টমার যখনই তার নাম, ফোন নম্বর বা ঠিকানা দিবে, সে অর্ডার করতে চাক বা না চাক—তুমি অবশ্যই উত্তরের শেষে এই ট্যাগটি যোগ করবে (DO NOT use markdown around it):
||DATA||Name: [Name]||Phone: [Phone]||Address: [Address]||

Respond in Bengali. Never hallucinate products.`;

            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: { text: systemInstruction } },
                contents: geminiHistory,
                generationConfig: { temperature: 0.5, maxOutputTokens: 500 }
              })
            });

            const aiData = await aiResponse.json();
            let botReplyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, আমি আপনার মেসেজটি বুঝতে পারছি না।";

            // --- F. Extract Order Intent ---
            const dataRegex = /\|\|DATA\|\|\s*Name:\s*([\s\S]*?)\|\|\s*Phone:\s*([\s\S]*?)\|\|\s*Address:\s*([\s\S]*?)(?:\|\||$)/i;
            const match = dataRegex.exec(botReplyText);
            
            if (match) {
              const extractedName = match[1].trim();
              const extractedPhone = match[2].trim();
              const extractedAddress = match[3].trim();
              
              // Remove the hidden tag from the user reply
              botReplyText = botReplyText.replace(match[0], '').trim();
              if(!botReplyText) botReplyText = "আপনার অর্ডারটি প্রসেস করা হচ্ছে।";

              // এখানে অবশ্যই AWAIT ব্যবহার করতে হবে যাতে ডাটাবেজ সময় পায়
              const { error: orderError } = await supabase.from('orders').insert({
                shop_id: shop.id,
                customer_name: extractedName,
                phone_number: extractedPhone,
                source: "Facebook AI",
                status: "Pending",
                cod_amount: 0,
                address: extractedAddress
              });
              
              if (orderError) console.error("Order Insert Error:", orderError);

              // কাস্টমার আপডেট লজিক
              const { error: custError } = await supabase.from('customers').upsert({
                shop_id: shop.id,
                name: extractedName,
                phone: extractedPhone,
                total_orders: 1
              }, { onConflict: 'phone' }); // ফোন নম্বর মিললে শুধু নাম আপডেট করবে
              
              if (custError) console.error("Customer Upsert Error:", custError);
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
