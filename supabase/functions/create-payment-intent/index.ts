import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { amount, currency = 'eur', description } = await req.json()

    if (!amount || amount < 50) {
      return new Response(JSON.stringify({ error: 'Montant invalide (minimum 0.50 €)' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data } = await supabase
      .from('settings').select('value').eq('key', 'stripe_secret_key').single()
    const stripeSecretKey = data?.value

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Clé Stripe non configurée' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount)),
        currency,
        description: description || 'Atelier créatif',
        'payment_method_types[]': 'card',
      }),
    })

    const paymentIntent = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: paymentIntent.error?.message || 'Erreur Stripe' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
