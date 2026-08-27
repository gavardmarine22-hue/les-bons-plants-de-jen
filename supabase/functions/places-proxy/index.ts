import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const { apiKey, cid, query } = await req.json()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'apiKey manquant' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    let placeId: string | null = null
    let name: string | null = null

    if (cid) {
      // Lookup par CID (depuis URL Google Maps)
      const params = new URLSearchParams({ cid, fields: 'place_id,name', key: apiKey })
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
      const data = await res.json()
      if (data.status === 'OK' && data.result?.place_id) {
        placeId = data.result.place_id
        name = data.result.name
      } else {
        return new Response(JSON.stringify({ error: data.status, message: data.error_message }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    } else if (query) {
      // Recherche par texte
      const params = new URLSearchParams({
        input: query,
        inputtype: 'textquery',
        fields: 'place_id,name',
        locationbias: 'point:47.3783788,-2.0239204',
        language: 'fr',
        key: apiKey,
      })
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`)
      const data = await res.json()
      if (data.status === 'OK' && data.candidates?.[0]) {
        placeId = data.candidates[0].place_id
        name = data.candidates[0].name
      } else {
        return new Response(JSON.stringify({ error: data.status, message: data.error_message, candidates: data.candidates }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    } else {
      return new Response(JSON.stringify({ error: 'cid ou query requis' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ placeId, name }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
