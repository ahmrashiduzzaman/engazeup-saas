import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { provider_token } = await req.json();

    if (!provider_token) {
      return new Response(
        JSON.stringify({ error: 'Missing provider_token in request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const APP_ID = Deno.env.get('FACEBOOK_APP_ID');
    const APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!APP_ID || !APP_SECRET) {
      console.error('[FATAL] FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not set in Supabase Secrets.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error. App secrets missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Exchange short-lived user token for a long-lived user token ──
    console.log('[INFO] Exchanging short-lived token for long-lived token...');
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${provider_token}`;

    const exchangeRes = await fetch(exchangeUrl);
    
    // We clone the response so we can read the text first for debugging, 
    // without consuming the body from the original response stream.
    const responseText = await exchangeRes.clone().text();
    
    if (!exchangeRes.ok) {
      console.error(`[ERROR] Token exchange failed with status: ${exchangeRes.status} ${exchangeRes.statusText}`);
      console.error(`[ERROR] Raw API Response:`, responseText);
      return new Response(
        JSON.stringify({ error: `Token exchange failed: API returned status ${exchangeRes.status}`, details: responseText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let exchangeData;
    try {
      exchangeData = await exchangeRes.json();
    } catch (e) {
      console.error('[ERROR] Failed to parse token exchange response as JSON:', responseText);
      return new Response(
        JSON.stringify({ error: `Token exchange failed: Invalid JSON response.`, details: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (exchangeData.error) {
      console.error('[ERROR] Token exchange returned JSON error:', JSON.stringify(exchangeData.error));
      return new Response(
        JSON.stringify({ error: `Token exchange failed: ${exchangeData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const longLivedUserToken = exchangeData.access_token;
    console.log('[INFO] Long-lived user token obtained successfully.');

    // ── Step 2: Fetch user's Facebook Pages with their long-lived page tokens ──
    // Note: Page access tokens from /me/accounts are already "long-lived" (never expire
    // as long as the parent user token is valid and the user hasn't revoked permissions).
    console.log('[INFO] Fetching Facebook Pages for this user...');
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token&access_token=${longLivedUserToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error('[ERROR] Failed to fetch pages:', JSON.stringify(pagesData.error));
      return new Response(
        JSON.stringify({ error: `Failed to fetch pages: ${pagesData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pages = pagesData.data ?? [];
    console.log(`[INFO] Found ${pages.length} Facebook Pages.`);

    return new Response(
      JSON.stringify({ pages }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[FATAL] fb-token-exchange error:', err.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
