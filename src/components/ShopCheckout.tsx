import { useState, useEffect, useRef } from 'react'
import { X, Check, ChevronRight, ChevronLeft, CreditCard, RefreshCw, MapPin } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/shop'

type ShippingMethod = 'mondial_relay' | 'click_and_collect'
type CheckoutStep   = 'method' | 'info' | 'relay' | 'payment' | 'success'

interface CustomerInfo { prenom: string; nom: string; email: string; telephone: string }
interface RelayPoint  { id: string; nom: string; adresse: string; cp: string; ville: string; pays: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload  = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function ensureStylesheet(href: string) {
  if (!document.querySelector(`link[href="${href}"]`)) {
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = href
    document.head.appendChild(l)
  }
}

// ── Widget Mondial Relay ─────────────────────────────────────────────────────

function MondialRelayWidget({ enseigne, onSelect }: { enseigne: string; onSelect: (r: RelayPoint) => void }) {
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    async function init() {
      try {
        await loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js')
        await loadScript('https://widget.mondialrelay.com/parcelshop-picker/v4_0/widget-lib.min.js')
        ensureStylesheet('https://widget.mondialrelay.com/parcelshop-picker/v4_0/themes/default/css/widget-lib.min.css')
        setStatus('ready')
        setTimeout(() => {
          const $ = (window as any).jQuery
          if (!$) return
          $(document).MR_ParcelShopPicker_initialise({
            Target:              '#MR-RelayPoint-Info',
            Brand:               enseigne || 'BDTEST13',
            Country:             'FR',
            NbResults:           '7',
            EnableGeolocButton:  true,
            ShowResultsOnMap:    true,
            OnParcelShopSelected: (rp: any) => {
              onSelectRef.current({
                id:      rp.ID,
                nom:     rp.Nom,
                adresse: [rp.Adresse1, rp.Adresse2].filter(Boolean).join(', '),
                cp:      rp.CP,
                ville:   rp.Ville,
                pays:    rp.Pays || 'FR',
              })
            },
          })
        }, 150)
      } catch {
        setStatus('error')
      }
    }
    init()
  }, [enseigne])

  if (status === 'loading') return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <RefreshCw className="w-8 h-8 animate-spin text-[#1A1040]/30 mb-3" />
      <p className="text-sm text-gray-400 font-medium">Chargement de la carte…</p>
    </div>
  )
  if (status === 'error') return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-sm text-red-600 font-bold">
      Impossible de charger le widget Mondial Relay. Vérifiez votre connexion.
    </div>
  )

  return (
    <div className="MR-widget">
      <input id="MR-RelayPoint-Info" type="hidden" />
    </div>
  )
}

// ── Formulaire Stripe ─────────────────────────────────────────────────────────

function StripePayForm({ amount, onSuccess, onError, stripeConfigured }: {
  amount: number
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
  stripeConfigured: boolean
}) {
  const stripe      = useStripe()
  const elements    = useElements()
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeConfigured) { onSuccess('demo'); return }
    if (!stripe || !elements) return
    setBusy(true)
    const card = elements.getElement(CardElement)
    if (!card) { setBusy(false); return }
    try {
      const url    = import.meta.env.VITE_SUPABASE_URL as string
      const anon   = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const piRes  = await fetch(`${url}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'eur', description: 'Commande boutique' }),
      })
      const { client_secret, error: piErr } = await piRes.json()
      if (piErr || !client_secret) { onError(piErr || 'Impossible de créer le paiement.'); setBusy(false); return }

      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, { payment_method: { card } })
      if (error)                              { onError(error.message || 'Erreur paiement.'); setBusy(false) }
      else if (paymentIntent?.status === 'succeeded') onSuccess(paymentIntent.id)
      else                                    { onError("Le paiement n'a pas abouti."); setBusy(false) }
    } catch { onError('Erreur de connexion.'); setBusy(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-[#1A1040] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-citron-400" />
          <span className="text-white font-black text-sm">Paiement sécurisé</span>
          <div className="ml-auto flex gap-1">
            {['VISA', 'MC', 'CB'].map(c => (
              <span key={c} className="bg-white/10 text-white/70 text-[9px] font-black px-1.5 py-0.5 rounded border border-white/20">{c}</span>
            ))}
          </div>
        </div>
        {!stripeConfigured ? (
          <div className="bg-citron-400/20 border border-citron-400/40 rounded-xl p-3 text-center">
            <p className="text-citron-300 text-xs font-bold mb-0.5">⚙️ Mode démo</p>
            <p className="text-white/70 text-xs">Configurez votre clé Stripe pour activer le paiement réel.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-4 py-3 border-2 border-white/20">
            <CardElement options={{ style: { base: { fontSize: '15px', color: '#1A1040', fontFamily: 'Inter, system-ui, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } }, hidePostalCode: true }} />
          </div>
        )}
      </div>
      <button type="submit" disabled={busy || (stripeConfigured && !stripe)}
        className="w-full flex items-center justify-center gap-2 bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
        style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
        <CreditCard className="w-4 h-4" />
        {busy ? '⏳ Traitement…' : !stripeConfigured ? `🎉 Confirmer (démo) — ${formatPrice(amount)}` : `🔒 Payer ${formatPrice(amount)}`}
      </button>
    </form>
  )
}

// ── ShopCheckout ──────────────────────────────────────────────────────────────

export default function ShopCheckout({ onClose }: { onClose: () => void }) {
  const { items, subtotal, discount, total, appliedCode, clearCart } = useCart()

  const [step,    setStep]    = useState<CheckoutStep>('method')
  const [method,  setMethod]  = useState<ShippingMethod | null>(null)
  const [info,    setInfo]    = useState<CustomerInfo>({ prenom: '', nom: '', email: '', telephone: '' })
  const [relay,   setRelay]   = useState<RelayPoint | null>(null)
  const [infoErr, setInfoErr] = useState('')
  const [payErr,  setPayErr]  = useState('')

  const [stripePromise,    setStripePromise]    = useState<ReturnType<typeof loadStripe> | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [shippingCost,     setShippingCost]     = useState(0)
  const [shippingTranches, setShippingTranches] = useState<{ max_g: number; prix: number }[]>([])
  const [mrEnseigne,       setMrEnseigne]       = useState('')
  const [collectInfo,      setCollectInfo]      = useState('')

  useEffect(() => {
    supabase.from('settings').select('key, value')
      .in('key', ['stripe_public_key', 'mondial_relay_tarifs', 'mondial_relay_code_enseigne', 'click_collect_info'])
      .then(({ data }) => {
        const m: Record<string, string> = {}
        data?.forEach(r => { m[r.key] = r.value || '' })
        if (m['stripe_public_key'])          { setStripePromise(loadStripe(m['stripe_public_key'])); setStripeConfigured(true) }
        if (m['mondial_relay_tarifs'])        { try { setShippingTranches(JSON.parse(m['mondial_relay_tarifs'])) } catch {} }
        if (m['mondial_relay_code_enseigne']) setMrEnseigne(m['mondial_relay_code_enseigne'])
        if (m['click_collect_info'])          setCollectInfo(m['click_collect_info'])
      })
  }, [])

  useEffect(() => {
    if (method !== 'mondial_relay' || !shippingTranches.length) { setShippingCost(0); return }
    const totalG = items.reduce((s, i) => s + (i.product?.weight_g ?? 0) * i.quantity, 0)
    if (totalG === 0) { setShippingCost(0); return }
    const sorted = [...shippingTranches].sort((a, b) => a.max_g - b.max_g)
    const tranche = sorted.find(t => totalG <= t.max_g) ?? sorted[sorted.length - 1]
    setShippingCost(tranche?.prix ?? 0)
  }, [method, items, shippingTranches])

  const totalFinal = total + shippingCost

  function validateInfo() {
    if (!info.prenom.trim() || !info.nom.trim() || !info.email.trim() || !info.telephone.trim()) {
      setInfoErr('Tous les champs sont obligatoires.'); return false
    }
    if (!/\S+@\S+\.\S+/.test(info.email)) {
      setInfoErr("L'adresse email n'est pas valide."); return false
    }
    setInfoErr(''); return true
  }

  function goNextFromInfo() {
    if (!validateInfo()) return
    setStep(method === 'mondial_relay' ? 'relay' : 'payment')
  }

  async function handlePaymentSuccess(paymentIntentId: string) {
    const articles = items.map(i => ({
      product_id: i.product_id,
      name:       i.product?.name,
      price:      i.chosen_price ?? i.product?.price ?? 0,
      quantity:   i.quantity,
    }))
    await supabase.from('shop_orders').insert({
      client_prenom:            info.prenom,
      client_nom:               info.nom,
      client_email:             info.email,
      client_telephone:         info.telephone,
      mode_livraison:           method,
      relay_id:                 relay?.id   ?? null,
      relay_nom:                relay?.nom  ?? null,
      relay_adresse:            relay?.adresse ?? null,
      relay_cp:                 relay?.cp   ?? null,
      relay_ville:              relay?.ville ?? null,
      relay_pays:               relay?.pays ?? null,
      articles,
      sous_total:               subtotal,
      frais_livraison:          shippingCost,
      remise:                   discount,
      total:                    totalFinal,
      code_promo:               appliedCode?.code ?? null,
      stripe_payment_intent_id: paymentIntentId === 'demo' ? null : paymentIntentId,
      statut:                   paymentIntentId === 'demo' ? 'en_attente' : 'paye',
    })

    const url  = import.meta.env.VITE_SUPABASE_URL as string
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    fetch(`${url}/functions/v1/send-shop-order-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({
        client_prenom:   info.prenom,
        client_nom:      info.nom,
        client_email:    info.email,
        client_telephone: info.telephone,
        mode_livraison:  method,
        articles,
        sous_total:      subtotal,
        frais_livraison: shippingCost,
        remise:          discount,
        total:           totalFinal,
        code_promo:      appliedCode?.code ?? null,
        relay_nom:       relay?.nom     ?? null,
        relay_adresse:   relay?.adresse ?? null,
        relay_cp:        relay?.cp      ?? null,
        relay_ville:     relay?.ville   ?? null,
      }),
    }).catch(err => console.error('[send-shop-order-email]', err))

    clearCart()
    setStep('success')
  }

  // Indicateur étapes dans le header
  const steps: CheckoutStep[] = method === 'mondial_relay'
    ? ['method', 'info', 'relay', 'payment']
    : ['method', 'info', 'payment']

  const stepLabels: Record<CheckoutStep, string> = {
    method:  '🛍️ Livraison',
    info:    '👤 Coordonnées',
    relay:   '📦 Point relais',
    payment: '💳 Paiement',
    success: '✅ Confirmé !',
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget && step !== 'success') onClose() }}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-lg my-6"
        style={{ boxShadow: '8px 8px 0px 0px #1A1040' }}>

        {/* ── Header ── */}
        <div className="bg-[#1A1040] rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-black text-white text-lg">{stepLabels[step]}</h2>
            {step !== 'success' && (
              <div className="flex items-center gap-1 mt-1.5">
                {steps.map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${
                    s === step ? 'w-6 bg-citron-400' :
                    steps.indexOf(s) < steps.indexOf(step) ? 'w-3 bg-white/60' : 'w-3 bg-white/20'
                  }`} />
                ))}
              </div>
            )}
          </div>
          {step !== 'success' && (
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">

          {/* ─────────── STEP: METHOD ─────────── */}
          {step === 'method' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 font-medium">Comment souhaitez-vous recevoir votre commande ?</p>
              {[
                { value: 'mondial_relay'    as ShippingMethod, emoji: '📦', title: 'Mondial Relay',   sub: 'Livraison en point relais • Frais selon le poids' },
                { value: 'click_and_collect' as ShippingMethod, emoji: '🏪', title: 'Click & Collect', sub: 'Retrait en boutique • Gratuit' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => { setMethod(opt.value); setStep('info') }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-4 border-[#1A1040] hover:bg-candy transition-all text-left group"
                  style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl ${opt.value === 'mondial_relay' ? 'bg-[#1A1040]' : 'bg-citron-400'}`}>
                    {opt.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-[#1A1040]">{opt.title}</div>
                    <div className="text-sm text-gray-500 font-medium mt-0.5">{opt.sub}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#1A1040]/40 shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          )}

          {/* ─────────── STEP: INFO ─────────── */}
          {step === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['prenom', 'nom'] as const).map(f => (
                  <div key={f}>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">
                      {f === 'prenom' ? 'Prénom' : 'Nom'} *
                    </label>
                    <input value={info[f]} onChange={e => setInfo(p => ({ ...p, [f]: e.target.value }))}
                      className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Email *</label>
                <input type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Téléphone *</label>
                <input type="tel" value={info.telephone} onChange={e => setInfo(p => ({ ...p, telephone: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
              </div>
              {infoErr && <p className="text-red-600 text-xs font-bold">{infoErr}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('method')}
                  className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-sm text-[#1A1040] hover:bg-gray-50 flex items-center justify-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
                <button onClick={goNextFromInfo}
                  className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-3 font-black text-sm hover:bg-[#2d2060] flex items-center justify-center gap-1">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─────────── STEP: RELAY ─────────── */}
          {step === 'relay' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Sélectionnez votre point relais sur la carte :</p>
              <MondialRelayWidget enseigne={mrEnseigne} onSelect={setRelay} />
              {relay && (
                <div className="bg-lime-50 border-2 border-lime-400 rounded-2xl p-3 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-lime-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-[#1A1040] text-sm">{relay.nom}</div>
                    <div className="text-xs text-gray-500">{relay.adresse}</div>
                    <div className="text-xs text-gray-500">{relay.cp} {relay.ville}</div>
                  </div>
                  <button onClick={() => setRelay(null)} className="ml-auto text-gray-300 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('info')}
                  className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-sm text-[#1A1040] hover:bg-gray-50 flex items-center justify-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
                <button onClick={() => setStep('payment')} disabled={!relay}
                  className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-3 font-black text-sm hover:bg-[#2d2060] disabled:opacity-40 flex items-center justify-center gap-1">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─────────── STEP: PAYMENT ─────────── */}
          {step === 'payment' && (
            <div className="space-y-4">
              {/* Récapitulatif */}
              <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-4 space-y-2">
                <div className="font-black text-[#1A1040] text-sm mb-2">📋 Récapitulatif</div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate pr-2">{item.product?.name} ×{item.quantity}</span>
                    <span className="font-bold text-[#1A1040] shrink-0">{formatPrice((item.chosen_price ?? item.product?.price ?? 0) * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-[#1A1040]/20 pt-2 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total</span><span className="font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                      <span>Réduction ({appliedCode?.code})</span><span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{method === 'mondial_relay' ? '📦 Mondial Relay' : '🏪 Click & Collect'}</span>
                    <span className={`font-bold ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                      {shippingCost > 0 ? formatPrice(shippingCost) : 'Gratuit'}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-[#1A1040] text-base border-t border-[#1A1040]/20 pt-1 mt-1">
                    <span>Total</span><span>{formatPrice(totalFinal)}</span>
                  </div>
                </div>
              </div>

              {/* Infos livraison sélectionnée */}
              {relay && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-xs">
                  <div className="font-black text-blue-700 mb-0.5">📦 {relay.nom}</div>
                  <div className="text-blue-600">{relay.adresse} — {relay.cp} {relay.ville}</div>
                </div>
              )}
              {method === 'click_and_collect' && collectInfo && (
                <div className="bg-citron-50 border-2 border-citron-300 rounded-xl p-3 text-xs">
                  <div className="font-black text-[#1A1040] mb-1">🏪 Infos retrait</div>
                  <div className="text-gray-600 whitespace-pre-line">{collectInfo}</div>
                </div>
              )}

              {payErr && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border-2 border-red-200">
                  😬 {payErr}
                </div>
              )}

              <Elements stripe={stripePromise}>
                <StripePayForm
                  amount={totalFinal}
                  onSuccess={handlePaymentSuccess}
                  onError={msg => setPayErr(msg)}
                  stripeConfigured={stripeConfigured}
                />
              </Elements>

              <button onClick={() => { setStep(method === 'mondial_relay' ? 'relay' : 'info'); setPayErr('') }}
                className="w-full border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl font-black text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
            </div>
          )}

          {/* ─────────── STEP: SUCCESS ─────────── */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 bg-lime-300 rounded-full border-4 border-[#1A1040] flex items-center justify-center mx-auto"
                style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                <Check className="w-10 h-10 text-[#1A1040]" />
              </div>
              <div>
                <div className="font-black text-[#1A1040] text-xl mb-1">Commande confirmée ! 🎉</div>
                <p className="text-gray-500 text-sm">Merci {info.prenom} ! Ta commande est bien enregistrée.</p>
                {relay && (
                  <div className="mt-3 bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-sm text-left">
                    <div className="font-black text-blue-700">📦 Livraison prévue chez :</div>
                    <div className="text-blue-600">{relay.nom} — {relay.adresse}, {relay.cp} {relay.ville}</div>
                  </div>
                )}
                {method === 'click_and_collect' && (
                  <div className="mt-3 bg-citron-50 border-2 border-citron-300 rounded-xl p-3 text-sm text-left">
                    <div className="font-black text-[#1A1040]">🏪 Retrait en boutique</div>
                    {collectInfo && <div className="text-gray-600 whitespace-pre-line mt-1 text-xs">{collectInfo}</div>}
                  </div>
                )}
                <p className="text-gray-400 text-xs mt-3">Un email de confirmation vous sera envoyé à {info.email}</p>
              </div>
              <button onClick={onClose}
                className="bg-rose-400 text-white px-8 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                Fermer 👋
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
