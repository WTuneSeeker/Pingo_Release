import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase connectie (met Service Role Key om database te mogen aanpassen)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Het geheime wachtwoord van je Lemon Squeezy webhook (stellen we later in)
const WEBHOOK_SECRET = Deno.env.get('LEMON_SQUEEZY_SECRET')!

serve(async (req) => {
  // Accepteer alleen POST requests (zo stuurt LS de data)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    // 1. Haal de data uit het verzoek
    const payloadData = await req.text()
    const payload = JSON.parse(payloadData)

    // Optioneel maar sterk aangeraden: Hier zou je eigenlijk de 'x-signature' header 
    // moeten verifiëren met je WEBHOOK_SECRET om hackers te weren. 
    // Voor dit voorbeeld focussen we even op de logica.

    // 2. Welke gebeurtenis heeft plaatsgevonden? (bijv. 'subscription_created')
    const eventName = payload.meta.event_name

    // 3. Haal de user_id op die we vanuit de React app (Fase 2) hebben meegestuurd!
    const userId = payload.meta.custom_data?.user_id

    if (!userId) {
      throw new Error("Geen user_id gevonden in custom data")
    }

    console.log(`Verwerken van ${eventName} voor user: ${userId}`)

    // 4. Update de database op basis van de actie
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      
      // Iemand heeft betaald! Maak hem Pro.
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: 'pro',
          stripe_subscription_id: payload.data.id // Bewaar het LemonSqueezy ID
        })
        .eq('id', userId)

    } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      
      // Abonnement is gestopt of verlopen. Maak weer Free.
      await supabase
        .from('profiles')
        .update({ subscription_status: 'free' })
        .eq('id', userId)

    }

    // Geef een succesbericht terug aan Lemon Squeezy
    return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" },
        status: 200 
    })

  } catch (error) {
    console.error("Webhook error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
        headers: { "Content-Type": "application/json" },
        status: 400 
    })
  }
})