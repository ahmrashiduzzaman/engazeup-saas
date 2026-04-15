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

          console.log(`Received message from ${senderPsid} on page ${pageId}: ${incomingText}`);

          // --- A. Identify Shop ---
          const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('id, fb_page_access_token, fb_page_name')
            .eq('fb_page_id', pageId)
            .single();

          if (shopError || !shop || !shop.fb_page_access_token) {
            console.error('Shop not found or Facebook token missing for Page ID:', pageId);
            continue; // Skip silently so FB doesn't retry
          }

          // --- B. Load or Create Conversation ---
          let { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('fb_page_id', pageId)
            .eq('customer_psid', senderPsid)
            .single();

          if (!conversation) {
            const { data: newConvo, error: insertError } = await supabase
              .from('conversations')
              .insert({
                shop_id: shop.id,
                fb_page_id: pageId,
                customer_psid: senderPsid,
                customer_name: "Customer" // Could fetch actual name from FB Profile API later
              })
              .select().single();
              
            if (insertError) throw new Error("Conversation insert failed: " + insertError.message);
            conversation = newConvo;
          }

          // Update last message time
          await supabase.from('conversations').update({ last_message_at: new Date() }).eq('id', conversation.id);

          // Save incoming message
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            sender: 'user',
            content: incomingText
          });

          // --- C. Fetch Recent Conversation History for AI Memory ---
          const { data: history } = await supabase
            .from('messages')
            .select('sender, content')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true })
            .limit(10); // Context window of last 10 messages

          // Format for Gemini
          const geminiHistory = (history || []).map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }));

          // --- D. Query Gemini AI API ---
          if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");

          const systemInstruction = `You are a polite, helpful customer support AI for a Bangladeshi eCommerce shop named "${shop.fb_page_name}". Respond naturally and respectfully in Bengali (or English if the customer uses English). Keep responses concise, clear, and helpful. Do not mention that you are an AI. You assist with purchasing and queries.`;

          const geminiPayload = {
            system_instruction: {
              parts: { text: systemInstruction }
            },
            contents: geminiHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
          };

          const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
          });

          const aiData = await aiResponse.json();
          const botReplyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, এই মুহূর্তে আমি আপনার মেসেজটি বুঝতে পারছি না। দয়া করে আবার বলুন।";

          // --- E. Send Reply to Facebook ---
          const fbResponse = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${shop.fb_page_access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: senderPsid },
              message: { text: botReplyText }
            })
          });

          const fbResult = await fbResponse.json();
          if (fbResult.error) {
            console.error("Facebook Send Error:", fbResult.error);
          } else {
            console.log("Successfully replied to user");
            
            // Save outgoing AI message
            await supabase.from('messages').insert({
              conversation_id: conversation.id,
              sender: 'ai',
              content: botReplyText
            });
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (err: any) {
      console.error('Webhook processing error:', err);
      // Return 200 anyway to prevent Facebook from infinitely retrying failed payloads
      return new Response('Error but received', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
