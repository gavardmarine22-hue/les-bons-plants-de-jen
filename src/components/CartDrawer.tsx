import { useState, useEffect } from 'react'
import { X, ShoppingCart, Trash2, Calendar, Clock, MapPin, Users, Check, CreditCard, Landmark, BookCheck, Banknote, ShoppingBag, ChevronRight, FileText, Download } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../context/CartContext'
import { useAtelierCart, type AtelierCartItem } from '../context/AtelierCartContext'
import { supabase } from '../lib/supabase'
import ShopCheckout from './ShopCheckout'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

const MODE_ICON: Record<string, React.ReactNode> = {
  cb:       <CreditCard className="w-3.5 h-3.5" />,
  virement: <Landmark   className="w-3.5 h-3.5" />,
  cheque:   <BookCheck  className="w-3.5 h-3.5" />,
  especes:  <Banknote   className="w-3.5 h-3.5" />,
}
const MODE_LABEL: Record<string, string> = {
  cb: 'CB', virement: 'Virement', cheque: 'Chèque', especes: 'Espèces',
}

// ─── Formulaire Stripe pour paiement CB depuis le panier ──────────────────────
function StripeCartForm({ cbItems, onSuccess, onError, stripeConfigured }: {
  cbItems: AtelierCartItem[]
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
  stripeConfigured: boolean
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const totalCb   = cbItems.reduce((s, i) => s + i.total, 0)
  const firstItem = cbItems[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeConfigured) { onSuccess('demo'); return }
    if (!stripe || !elements) return
    setProcessing(true)
    const card = elements.getElement(CardElement)
    if (!card) { setProcessing(false); return }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string

      const piRes = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          amount:      Math.round(totalCb * 100),
          currency:    'eur',
          description: `Ateliers — ${cbItems.map(i => i.atelier.titre).join(', ')}`,
        }),
      })
      const { client_secret, error: piError } = await piRes.json()
      if (piError || !client_secret) {
        onError(piError || 'Impossible de créer le paiement.')
        setProcessing(false)
        return
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card,
          billing_details: {
            name:  `${firstItem.form.prenom} ${firstItem.form.nom}`,
            email: firstItem.form.email,
            phone: firstItem.form.telephone,
          },
        },
      })

      if (error) {
        onError(error.message || 'Erreur lors du paiement.')
        setProcessing(false)
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id)
      } else {
        onError("Le paiement n'a pas abouti. Veuillez réessayer.")
        setProcessing(false)
      }
    } catch {
      onError('Erreur de connexion. Veuillez réessayer.')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-[#1A1040] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-citron-400" />
          <span className="text-white font-black text-sm">Terminal de paiement sécurisé</span>
          <div className="ml-auto flex gap-1">
            {['VISA', 'MC', 'CB'].map(c => (
              <span key={c} className="bg-white/10 text-white/70 text-[9px] font-black px-1.5 py-0.5 rounded border border-white/20">{c}</span>
            ))}
          </div>
        </div>
        {!stripeConfigured ? (
          <div className="bg-citron-400/20 border border-citron-400/40 rounded-xl p-3 text-center">
            <p className="text-citron-300 text-xs font-bold mb-1">⚙️ Mode démo</p>
            <p className="text-white/70 text-xs">Configurez votre clé Stripe pour activer le paiement réel.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-4 py-3 border-2 border-white/20">
            <CardElement options={{ style: { base: { fontSize: '15px', color: '#1A1040', fontFamily: 'Inter, system-ui, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } }, hidePostalCode: true }} />
          </div>
        )}
        <div className="flex items-center justify-between mt-3 bg-white/10 rounded-xl px-3 py-2">
          <span className="text-white/70 text-sm">Total à régler</span>
          <span className="text-citron-400 font-black text-xl">{totalCb} €</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={processing || (stripeConfigured && !stripe)}
        className="w-full flex items-center justify-center gap-2 bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-60"
        style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
        <CreditCard className="w-4 h-4" />
        {processing ? '⏳ Traitement...' : !stripeConfigured ? `🎉 Confirmer (démo) — ${totalCb} €` : `🔒 Payer ${totalCb} €`}
      </button>
    </form>
  )
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────
export default function CartDrawer() {
  const { isOpen, setIsOpen, items: shopItems, itemCount: shopCount, removeItem: removeShopItem } = useCart()
  const { items: atelierItems, itemCount: atelierCount, removeItem, clearItems } = useAtelierCart()

  const [checkingOut,      setCheckingOut]      = useState(false)
  const [checked,          setChecked]          = useState(false)
  const [checkError,       setCheckError]       = useState('')
  const [showStripeForm,   setShowStripeForm]   = useState(false)
  const [stripePromise,    setStripePromise]    = useState<ReturnType<typeof loadStripe> | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [cbPaymentError,   setCbPaymentError]   = useState('')
  const [cgvUrl,           setCgvUrl]           = useState<string | null>(null)
  const [cgvAccepted,      setCgvAccepted]      = useState(false)
  const [showShopCheckout, setShowShopCheckout] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('key, value')
      .in('key', ['stripe_public_key', 'cgv_url'])
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(r => { map[r.key] = r.value || '' })
        if (map['stripe_public_key']) {
          setStripePromise(loadStripe(map['stripe_public_key']))
          setStripeConfigured(true)
        }
        if (map['cgv_url']) setCgvUrl(map['cgv_url'])
      })
  }, [])

  const totalAteliers = atelierItems.reduce((s, i) => s + i.total, 0)
  const hasItems = atelierItems.length > 0 || shopItems.length > 0

  async function confirmAtelierReservations() {
    setCheckingOut(true)
    setCheckError('')
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string

    const nonCbItems = atelierItems.filter(i => i.form.paiement !== 'cb')
    const cbItems    = atelierItems.filter(i => i.form.paiement === 'cb')

    try {
      // Confirmer les réservations non-CB immédiatement (email envoyé)
      for (const item of nonCbItems) {
        const { error: insertError } = await supabase.from('reservations').insert([{
          atelier_id:      item.atelier.id,
          nom:             item.form.nom,
          prenom:          item.form.prenom,
          age:             item.form.age,
          email:           item.form.email,
          telephone:       item.form.telephone,
          mode_paiement:   item.form.paiement || 'especes',
          statut_paiement: 'en_attente',
          nb_personnes:    item.nbPersonnes,
          personnes_sup:   item.personnesSup,
          is_gift:         item.form.is_gift  ?? false,
          gift_from:       item.form.gift_from ?? null,
          gift_to:         item.form.gift_to   ?? null,
        }])
        if (insertError) throw insertError

        if (!item.atelier.id.startsWith('demo-')) {
          await supabase.from('ateliers')
            .update({ places_restantes: item.atelier.places_restantes - item.nbPersonnes })
            .eq('id', item.atelier.id)
        }

        fetch(`${supabaseUrl}/functions/v1/send-reservation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({
            atelier_titre:    item.atelier.titre,
            atelier_date:     item.atelier.date,
            atelier_heure:    item.atelier.heure,
            atelier_duree:    item.atelier.duree,
            atelier_lieu:     item.atelier.lieu,
            atelier_image_url: item.atelier.image_url ?? '',
            category_id:      item.atelier.category_id,
            client_prenom:    item.form.prenom,
            client_nom:       item.form.nom,
            client_email:     item.form.email,
            client_telephone: item.form.telephone,
            mode_paiement:    item.form.paiement || 'especes',
            nb_personnes:     item.nbPersonnes,
            personnes_sup:    item.personnesSup,
            total:            item.total,
            is_gift:          item.form.is_gift   ?? false,
            gift_from:        item.form.gift_from ?? '',
            gift_to:          item.form.gift_to   ?? '',
          }),
        }).catch(() => {})

        fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({
            type:             'facture',
            reservation_id:   undefined,
            atelier_titre:    item.atelier.titre,
            atelier_date:     item.atelier.date,
            client_nom:       item.form.nom,
            client_prenom:    item.form.prenom,
            client_email:     item.form.email,
            client_telephone: item.form.telephone,
            description:      `Atelier créatif — ${item.atelier.titre}${item.nbPersonnes > 1 ? ` (${item.nbPersonnes} participants)` : ''}`,
            quantite:         item.nbPersonnes,
            prix_unitaire:    item.atelier.prix,
            montant_total:    item.total,
            mode_paiement:    item.form.paiement || 'especes',
          }),
        }).catch(() => {})
      }

      if (cbItems.length > 0) {
        // Retirer les non-CB du panier (confirmés), garder les CB pour le paiement
        nonCbItems.forEach(item => removeItem(item.cartId))
        setShowStripeForm(true)
      } else {
        clearItems()
        setChecked(true)
      }
    } catch (err: unknown) {
      setCheckError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setCheckingOut(false)
    }
  }

  // Appelé après paiement CB réussi : sauvegarde les réservations CB + envoie les emails
  async function handleCbSuccess(paymentIntentId: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const cbItems     = atelierItems.filter(i => i.form.paiement === 'cb')

    try {
      for (const item of cbItems) {
        const { data: inserted, error: insertError } = await supabase.from('reservations').insert([{
          atelier_id:               item.atelier.id,
          nom:                      item.form.nom,
          prenom:                   item.form.prenom,
          age:                      item.form.age,
          email:                    item.form.email,
          telephone:                item.form.telephone,
          mode_paiement:            'cb',
          statut_paiement:          'paye',
          nb_personnes:             item.nbPersonnes,
          personnes_sup:            item.personnesSup,
          stripe_payment_intent_id: paymentIntentId || null,
          is_gift:                  item.form.is_gift  ?? false,
          gift_from:                item.form.gift_from ?? null,
          gift_to:                  item.form.gift_to   ?? null,
        }]).select().single()
        if (insertError) throw insertError

        if (!item.atelier.id.startsWith('demo-')) {
          await supabase.from('ateliers')
            .update({ places_restantes: item.atelier.places_restantes - item.nbPersonnes })
            .eq('id', item.atelier.id)
        }

        fetch(`${supabaseUrl}/functions/v1/send-reservation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({
            atelier_titre:    item.atelier.titre,
            atelier_date:     item.atelier.date,
            atelier_heure:    item.atelier.heure,
            atelier_duree:    item.atelier.duree,
            atelier_lieu:     item.atelier.lieu,
            atelier_image_url: item.atelier.image_url ?? '',
            category_id:      item.atelier.category_id,
            client_prenom:    item.form.prenom,
            client_nom:       item.form.nom,
            client_email:     item.form.email,
            client_telephone: item.form.telephone,
            mode_paiement:    'cb',
            nb_personnes:     item.nbPersonnes,
            personnes_sup:    item.personnesSup,
            total:            item.total,
            is_gift:          item.form.is_gift   ?? false,
            gift_from:        item.form.gift_from ?? '',
            gift_to:          item.form.gift_to   ?? '',
          }),
        }).catch(() => {})

        fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({
            type:              'facture',
            reservation_id:    inserted?.id,
            atelier_titre:     item.atelier.titre,
            atelier_date:      item.atelier.date,
            client_nom:        item.form.nom,
            client_prenom:     item.form.prenom,
            client_email:      item.form.email,
            client_telephone:  item.form.telephone,
            description:       `Atelier créatif — ${item.atelier.titre}${item.nbPersonnes > 1 ? ` (${item.nbPersonnes} participants)` : ''}`,
            quantite:          item.nbPersonnes,
            prix_unitaire:     item.atelier.prix,
            montant_total:     item.total,
            mode_paiement:     'cb',
            stripe_payment_id: paymentIntentId || null,
          }),
        }).catch(() => {})
      }

      clearItems()
      setChecked(true)
      setShowStripeForm(false)
    } catch {
      setCbPaymentError("Votre paiement a été accepté mais une erreur est survenue lors de l'enregistrement. Merci de nous contacter.")
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => { setIsOpen(false); setChecked(false); setShowStripeForm(false) }}
      />

      {/* Tiroir */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col bg-white border-l-4 border-[#1A1040]"
        style={{ boxShadow: '-6px 0 0 0 #1A1040' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1A1040] border-b-4 border-[#1A1040]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-citron-400" />
            <h2 className="font-serif font-black text-xl text-white">
              {showStripeForm ? '💳 Paiement par carte' : 'Mon panier'}
            </h2>
            {!showStripeForm && (atelierCount + shopCount) > 0 && (
              <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {atelierCount + shopCount}
              </span>
            )}
          </div>
          <button onClick={() => { setIsOpen(false); setChecked(false); setShowStripeForm(false) }}
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SUCCÈS réservations ── */}
          {checked ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-20 h-20 bg-lime-300 rounded-full border-4 border-[#1A1040] flex items-center justify-center mb-4"
                style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                <Check className="w-10 h-10 text-[#1A1040]" />
              </div>
              <div className="inline-block bg-citron-400 text-[#1A1040] px-4 py-1 rounded-full text-sm font-black border-2 border-[#1A1040] mb-3">
                🎉 Réservations confirmées !
              </div>
              <p className="text-gray-600 font-medium mb-1">Tes réservations sont enregistrées.</p>
              <p className="text-gray-400 text-sm">Tu recevras un email de confirmation.</p>
              <button onClick={() => { setIsOpen(false); setChecked(false) }}
                className="mt-6 bg-rose-400 text-white px-6 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                Fermer 👋
              </button>
            </div>

          ) : !hasItems ? (
            /* ── Panier vide ── */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-black text-lg text-gray-300">Ton panier est vide</p>
              <p className="text-sm mt-1">Ajoute des ateliers ou des articles boutique !</p>
              <button onClick={() => setIsOpen(false)}
                className="mt-6 bg-rose-400 text-white px-6 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                Continuer mes achats 🛍️
              </button>
            </div>

          ) : (
            <div className="px-4 py-4 space-y-4">

              {/* ── Section Ateliers ── */}
              {atelierItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-[#1A1040] uppercase tracking-wider">🎨 Ateliers réservés</span>
                    <div className="flex-1 h-0.5 bg-[#1A1040]/10" />
                    <span className="text-xs font-black text-rose-400">{atelierItems.length} atelier{atelierItems.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-3">
                    {atelierItems.map(item => (
                      <div key={item.cartId}
                        className="bg-candy rounded-2xl border-2 border-[#1A1040] overflow-hidden"
                        style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>

                        <div className="bg-[#1A1040] px-3 py-2 flex items-center justify-between">
                          <span className="text-white font-black text-sm">📸 {item.atelier.titre}</span>
                          {!showStripeForm && (
                            <button onClick={() => removeItem(item.cartId)}
                              className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all border-2 border-white/30"
                              title="Supprimer">
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </div>

                        <div className="px-3 py-3 space-y-2">
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-rose-400" />
                              <span className="capitalize">{formatDate(item.atelier.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-turquoise-500" />
                              {item.atelier.heure}
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="w-3 h-3 text-citron-500" />
                              <a href={`https://maps.google.com/maps?q=${encodeURIComponent(item.atelier.lieu)}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-citron-600 transition-colors">{item.atelier.lieu}</a>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl px-3 py-2 text-xs space-y-1">
                            <div className="font-black text-[#1A1040]">👤 {item.form.prenom} {item.form.nom}</div>
                            <div className="text-gray-400">{item.form.email}</div>
                            {item.nbPersonnes > 1 && (
                              <div className="flex items-center gap-1 text-rose-500 font-bold">
                                <Users className="w-3 h-3" /> {item.nbPersonnes} participants
                              </div>
                            )}
                            {item.form.is_gift && (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 mt-1">
                                <span className="text-base">🎁</span>
                                <div className="text-[10px] text-rose-700 font-bold">
                                  De la part de <span className="font-black">{item.form.gift_from}</span>
                                  {' · '}Pour <span className="font-black">{item.form.gift_to}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-white/70 text-[#1A1040] text-[10px] font-black px-2 py-1 rounded-lg border border-[#1A1040]/20">
                              {MODE_ICON[item.form.paiement]}
                              {MODE_LABEL[item.form.paiement] || item.form.paiement}
                            </div>
                            <span className="font-black text-[#1A1040] text-base">{item.total} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Section Boutique ── */}
              {shopItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-[#1A1040] uppercase tracking-wider">🛍️ Articles boutique</span>
                    <div className="flex-1 h-0.5 bg-[#1A1040]/10" />
                    <span className="text-xs font-black text-rose-400">{shopItems.length} article{shopItems.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-candy rounded-2xl border-2 border-[#1A1040] px-4 py-3 space-y-2"
                    style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                    {shopItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[#1A1040]">{item.product?.name}</span>
                          {item.chosen_price != null && <span className="text-gray-400 ml-1.5">({item.chosen_price} €)</span>}
                          <span className="text-gray-400 ml-1.5">×{item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-[#1A1040]">{((item.chosen_price ?? item.product?.price ?? 0) * item.quantity).toFixed(2)} €</span>
                          <button
                            onClick={() => removeShopItem(item.id)}
                            className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all border-2 border-white/30"
                            title="Supprimer">
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-[#1A1040]/20 pt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium bg-gray-50 rounded-lg px-2 py-1.5">
                        <span>🚚</span>
                        <span>Livraison calculée à la commande — <span className="font-black text-gray-500">Mondial Relay ou Click &amp; Collect gratuit</span></span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-[#1A1040]/20 pt-2 flex justify-end">
                      <a href="/boutique"
                        className="flex items-center gap-1 text-xs font-black text-rose-400 hover:text-rose-600">
                        Aller à la boutique <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer : formulaire Stripe CB ── */}
        {!checked && showStripeForm && (
          <div className="border-t-4 border-[#1A1040] px-4 py-4 bg-white space-y-3">
            {cbPaymentError && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border-2 border-red-200">
                😬 {cbPaymentError}
              </div>
            )}
            <Elements stripe={stripePromise}>
              <StripeCartForm
                cbItems={atelierItems.filter(i => i.form.paiement === 'cb')}
                onSuccess={handleCbSuccess}
                onError={msg => setCbPaymentError(msg)}
                stripeConfigured={stripeConfigured}
              />
            </Elements>
            <button
              onClick={() => { setShowStripeForm(false); setCbPaymentError('') }}
              className="w-full border-2 border-gray-200 text-gray-500 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-50">
              ← Retour au panier
            </button>
          </div>
        )}

        {/* ── Footer : confirmer les réservations ── */}
        {!checked && !showStripeForm && atelierItems.length > 0 && (
          <div className="border-t-4 border-[#1A1040] px-4 py-4 bg-white space-y-3">
            {checkError && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border-2 border-red-200">
                😬 {checkError}
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-black text-[#1A1040]">
              <span>Total ateliers ({atelierItems.length})</span>
              <span className="text-xl">{totalAteliers} €</span>
            </div>

            {/* ── Acceptation CGV (uniquement si un fichier CGV est configuré) ── */}
            {cgvUrl && (
              <div className={`rounded-2xl border-2 px-3 py-3 space-y-2 transition-colors ${cgvAccepted ? 'bg-lime-50 border-lime-400' : 'bg-purple-50 border-purple-200'}`}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setCgvAccepted(p => !p)}
                    className={`w-5 h-5 rounded-lg border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${cgvAccepted ? 'bg-lime-400 border-lime-500' : 'bg-white border-gray-300 hover:border-purple-400'}`}>
                    {cgvAccepted && <Check className="w-3 h-3 text-[#1A1040]" />}
                  </div>
                  <span className="text-xs font-bold text-[#1A1040] leading-relaxed" onClick={() => setCgvAccepted(p => !p)}>
                    J'ai lu et j'accepte les{' '}
                    <a
                      href={cgvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-purple-600 underline hover:text-purple-800 font-black">
                      Conditions Générales de Vente
                    </a>
                    {' '}*
                  </span>
                </label>
                <a
                  href={cgvUrl}
                  download="CGV.pdf"
                  className="flex items-center gap-1.5 text-[10px] font-black text-purple-500 hover:text-purple-700 transition-colors">
                  <Download className="w-3 h-3" />
                  <FileText className="w-3 h-3" />
                  Télécharger les CGV (PDF)
                </a>
              </div>
            )}

            <button
              onClick={confirmAtelierReservations}
              disabled={checkingOut || (cgvUrl !== null && !cgvAccepted)}
              className="w-full bg-rose-400 text-white py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
              {checkingOut ? '⏳ Confirmation...' : '🎟️ Confirmer mes réservations'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl font-black text-sm hover:bg-candy transition-colors flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>
        )}

        {/* Footer boutique seul (si pas d'ateliers) */}
        {!checked && !showStripeForm && atelierItems.length === 0 && shopItems.length > 0 && (
          <div className="border-t-4 border-[#1A1040] px-4 py-4 bg-white space-y-2">
            <button
              onClick={() => setShowShopCheckout(true)}
              className="w-full bg-[#1A1040] text-citron-400 py-3.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0px 0px #ffe500' }}>
              <ShoppingBag className="w-4 h-4" /> Valider mon panier
            </button>
            <a href="/boutique"
              className="w-full text-xs text-gray-400 hover:text-[#1A1040] font-bold flex items-center justify-center gap-1 transition-colors">
              Continuer mes achats
            </a>
          </div>
        )}
      </div>
      {showShopCheckout && <ShopCheckout onClose={() => setShowShopCheckout(false)} />}
    </>
  )
}
