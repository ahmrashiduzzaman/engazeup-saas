import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { trackingId } = await req.json()
    if (!trackingId) throw new Error("Tracking ID is required")

    const apiKey = Deno.env.get('STEADFAST_API_KEY')
    const secretKey = Deno.env.get('STEADFAST_SECRET_KEY')

    if (!apiKey || !secretKey) {
      throw new Error("Missing Steadfast API credentials in Edge Function environment variables")
    }

    const response = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${trackingId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
      },
    })

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    )
  }
})
