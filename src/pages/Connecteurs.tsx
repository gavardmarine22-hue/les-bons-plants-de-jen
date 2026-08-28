import { useState, useEffect } from 'react'
import React from 'react'
import { Mail, CreditCard, Check, Eye, EyeOff, Wifi, WifiOff, Settings, Search, RefreshCw, Star, Plus, Trash2, Pencil, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import CgvManager from '../components/CgvManager'
import MondialRelayManager from '../components/MondialRelayManager'

// ─── Types ────────────────────────────────────────────────────────────────────
type EmailProvider  = 'smtp' | 'gmail' | 'resend'
type PaymentProvider = 'stripe' | 'sumup' | 'paypal'

interface SettingsMap { [key: string]: string }

// ─── Logos SVG inline ─────────────────────────────────────────────────────────
const StripeLogo = () => (
  <svg viewBox="0 0 60 25" className="h-5 w-auto" fill="none">
    <path d="M5.45 9.6C5.45 8.4 6.4 7.95 7.95 7.95c2.2 0 4.95.65 7.15 1.8V3.9C12.9 2.85 10.7 2.4 7.95 2.4 3.2 2.4 0 4.85 0 9.85c0 7.75 10.7 6.5 10.7 9.85 0 1.4-1.2 1.85-2.85 1.85-2.45 0-5.6-.95-8.1-2.25v5.95c2.75 1.2 5.55 1.7 8.1 1.7 5 0 8.4-2.45 8.4-7.5-.05-8.35-10.8-6.9-10.8-9.85zm17.4-6.6L15.5 4.2v16.4h6.3V9.1l.95-.1c.9 0 1.3.4 1.3 1.4v10.2h6.3V9.35c0-3.6-1.95-6.35-7.5-6.35zm15.35 3.55c-1.05 0-1.75.3-2.35.65V2.7h-6.3v18.4c1.75.4 3.55.6 5.35.6 5.65 0 8.7-2.9 8.7-9.55 0-5.65-2.5-9.6-5.4-9.6zm-.75 13.4c-.6 0-1.1-.05-1.6-.2v-7.7c.4-.25.9-.4 1.45-.4 1.8 0 2.75 1.6 2.75 4.1 0 2.7-.95 4.2-2.6 4.2zM44.45 3c-2.05 0-3.3 1.1-3.3 2.85 0 1.7 1.25 2.85 3.3 2.85 2.05 0 3.3-1.15 3.3-2.85C47.75 4.1 46.5 3 44.45 3zm-3.15 4.45v13.15h6.3V7.45h-6.3zm14.3-.2c-1.85 0-3.05.95-3.7 1.6l-.25-1.4h-5.6v18.5l6.3-1.35v-4.5c.7.5 1.7.8 3.05.8 3.05 0 5.9-2.45 5.9-7.9-.05-5-2.95-7.75-5.7-7.75zm-1 11.35c-.6 0-1.1-.15-1.45-.4V10.7c.4-.3.95-.5 1.6-.5 1.55 0 2.35 1.6 2.35 4.1 0 2.65-.9 4.3-2.5 4.3z" fill="#635BFF"/>
  </svg>
)

const SumUpLogo = () => (
  <svg viewBox="0 0 80 24" className="h-5 w-auto" fill="none">
    <text x="0" y="18" fontFamily="Arial Black" fontWeight="900" fontSize="18" fill="#00D6A3">SumUp</text>
  </svg>
)

const PayPalLogo = () => (
  <svg viewBox="0 0 80 24" className="h-5 w-auto" fill="none">
    <text x="0" y="18" fontFamily="Arial" fontWeight="700" fontSize="16" fill="#003087">Pay</text>
    <text x="28" y="18" fontFamily="Arial" fontWeight="700" fontSize="16" fill="#009cde">Pal</text>
  </svg>
)

// ─── Composant champ texte ──────────────────────────────────────────────────────
// Défini au niveau module (pas dans Connecteurs) pour garder une identité stable
// entre les rendus — sinon React démonte/remonte l'input à chaque frappe et le
// focus saute (il fallait recliquer après chaque lettre).
function Field({
  label, value, onChange, type = 'text', placeholder = '', masked = false, isVisible = false, onToggleVisibility,
}: {
  label: string; value: string; onChange: (value: string) => void
  type?: string; placeholder?: string; masked?: boolean; isVisible?: boolean; onToggleVisibility?: () => void
}) {
  return (
    <div>
      <label className="block text-xs font-black text-[#1A1040] mb-1">{label}</label>
      <div className="relative">
        <input
          type={masked && !isVisible ? 'password' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy pr-10"
        />
        {masked && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A1040]"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Bouton Enregistrer ─────────────────────────────────────────────────────────
function SaveButton({ isSaving, isSaved, onClick }: { isSaving: boolean; isSaved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isSaving}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm border-2 transition-all ${
        isSaved
          ? 'bg-lime-300 text-[#1A1040] border-lime-400'
          : 'bg-[#1A1040] text-citron-400 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 disabled:opacity-50'
      }`}
      style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}
    >
      {isSaved
        ? <><Check className="w-4 h-4" /> Enregistré !</>
        : isSaving
        ? '⏳ Enregistrement...'
        : '💾 Enregistrer'}
    </button>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function Connecteurs() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [findingPlaceId, setFindingPlaceId] = useState(false)
  const [placeResults, setPlaceResults] = useState<Array<{ place_id: string; name: string }>>([])
  const [placeSearchError, setPlaceSearchError] = useState('')
  const [placeQuery, setPlaceQuery] = useState('Les plants de Jenni')
  const [mapsUrl, setMapsUrl] = useState('')
  const [mapsUrlError, setMapsUrlError] = useState('')

  // Avis manuels
  interface ManualReview { id: string; author_name: string; rating: number; review_text: string; time_description: string; sort_order: number; photo_url?: string }
  const [manualReviews, setManualReviews] = useState<ManualReview[]>([])
  const [editingReview, setEditingReview] = useState<Partial<ManualReview> | null>(null)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewPhotoUploading, setReviewPhotoUploading] = useState(false)

  const reviewsMode = (settings['google_reviews_mode'] || 'manual') as 'api' | 'manual'

  useEffect(() => { loadSettings(); loadManualReviews() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value')
    if (data) {
      const map: SettingsMap = {}
      data.forEach(row => { map[row.key] = row.value || '' })
      setSettings(map)
    }
    setLoading(false)
  }

  function set(key: string, value: string) {
    setSettings(p => ({ ...p, [key]: value }))
  }

  async function saveSection(section: string, keys: string[]) {
    setSaving(section)
    const upserts = keys.map(key => ({ key, value: settings[key] || '' }))
    const { error } = await supabase
      .from('settings')
      .upsert(upserts, { onConflict: 'key' })

    if (!error) {
      setSaved(section)
      setTimeout(() => setSaved(null), 3000)
    }
    setSaving(null)
  }

  function toggleShow(key: string) {
    setShowPasswords(p => ({ ...p, [key]: !p[key] }))
  }

  async function loadManualReviews() {
    const { data } = await supabase.from('google_reviews_manual').select('*').order('sort_order')
    setManualReviews(data || [])
  }

  async function saveMode(mode: 'api' | 'manual') {
    set('google_reviews_mode', mode)
    await supabase.from('settings').upsert({ key: 'google_reviews_mode', value: mode }, { onConflict: 'key' })
  }

  async function saveReview() {
    if (!editingReview) return
    setSavingReview(true)
    if (editingReview.id) {
      await supabase.from('google_reviews_manual').update({
        author_name: editingReview.author_name,
        rating: editingReview.rating,
        review_text: editingReview.review_text,
        time_description: editingReview.time_description,
        photo_url: editingReview.photo_url || null,
      }).eq('id', editingReview.id)
    } else {
      await supabase.from('google_reviews_manual').insert({
        author_name: editingReview.author_name || 'Anonyme',
        rating: editingReview.rating || 5,
        review_text: editingReview.review_text || '',
        time_description: editingReview.time_description || '',
        sort_order: manualReviews.length,
        photo_url: editingReview.photo_url || null,
      })
    }
    setEditingReview(null)
    await loadManualReviews()
    setSavingReview(false)
  }

  async function deleteReview(id: string) {
    await supabase.from('google_reviews_manual').delete().eq('id', id)
    await loadManualReviews()
  }

  async function uploadReviewPhoto(file: File) {
    setReviewPhotoUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `review-photo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('hero').getPublicUrl(filename)
      setEditingReview(p => ({ ...p!, photo_url: data.publicUrl + '?t=' + Date.now() }))
    }
    setReviewPhotoUploading(false)
  }

  async function extractFromMapsUrl() {
    setMapsUrlError('')
    const match = mapsUrl.match(/!1s(0x[0-9a-f]+):(0x[0-9a-f]+)/i)
    if (!match) {
      setMapsUrlError("URL non reconnue. Copiez l'URL depuis Google Maps quand la fiche est ouverte.")
      return
    }
    const cid = BigInt(match[2]).toString(10)
    const apiKey = settings['google_places_api_key']
    if (!apiKey) { setMapsUrlError("Entrez d'abord votre clé API Google Places."); return }
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/places-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, cid }),
      })
      const data = await res.json()
      if (data.placeId) {
        set('google_place_id', data.placeId)
        setMapsUrl('')
        setMapsUrlError('')
      } else {
        setMapsUrlError(`Erreur : ${data.error || 'inconnu'} — ${data.message || 'vérifiez votre clé API.'}`)
      }
    } catch {
      setMapsUrlError('Erreur réseau.')
    }
  }

  async function findPlaceId() {
    const apiKey = settings['google_places_api_key']
    if (!apiKey) { setPlaceSearchError("Entrez d'abord votre clé API Google Places."); return }
    if (!placeQuery.trim()) { setPlaceSearchError('Entrez un nom à rechercher.'); return }
    setFindingPlaceId(true)
    setPlaceSearchError('')
    setPlaceResults([])
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/places-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, query: placeQuery.trim() }),
      })
      const data = await res.json()
      if (data.placeId) {
        setPlaceResults([{ place_id: data.placeId, name: data.name || placeQuery }])
      } else {
        const errCode = data.error || ''
        if (errCode === 'ZERO_RESULTS' || errCode === 'NOT_FOUND') {
          setPlaceSearchError('Aucun résultat. Essayez un nom différent (ex: "univers creatif anais").')
        } else if (errCode === 'REQUEST_DENIED') {
          setPlaceSearchError(`Clé API refusée : ${data.message || 'vérifiez votre clé.'}`)
        } else {
          setPlaceSearchError(`Erreur : ${errCode} — ${data.message || ''}`)
        }
      }
    } catch {
      setPlaceSearchError('Erreur réseau.')
    } finally {
      setFindingPlaceId(false)
    }
  }

  const emailProvider  = (settings['email_provider']  || 'smtp') as EmailProvider
  const paymentProvider = (settings['payment_provider'] || 'stripe') as PaymentProvider

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-candy">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-spin">⚙️</div>
          <p className="font-black text-[#1A1040]">Chargement des connecteurs...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-candy">

      {/* ── HEADER ── */}
      <section className="bg-[#1A1040] py-12 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
            style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
            <Settings className="w-7 h-7 text-[#1A1040]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
              🔐 Espace administrateur
            </div>
            <h1 className="font-serif text-3xl font-black text-white">
              Connecteurs <span className="text-citron-400">✦</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">
              Connectez votre boite mail et votre terminal de paiement
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* ════════════════════════════════════════
            SECTION 1 — EMAIL
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>

          {/* En-tête */}
          <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-rose-300">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-black text-white">Boite mail d'envoi</h2>
              <p className="text-gray-400 text-xs">Pour les confirmations, rappels et factures</p>
            </div>
            {/* Indicateur connexion */}
            <div className="ml-auto">
              {settings['email_expediteur'] ? (
                <div className="flex items-center gap-1.5 bg-lime-300/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-400/30">
                  <Wifi className="w-3 h-3" /> Configuré
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-400/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-400/30">
                  <WifiOff className="w-3 h-3" /> Non connecté
                </div>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6 space-y-5">

            {/* Infos expéditeur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="📧 Email expéditeur" type="email" placeholder="contact@monateliercreatif.fr" value={settings['email_expediteur'] || ''} onChange={v => set('email_expediteur', v)} />
              <Field label="✍️ Nom affiché" placeholder="Les plants de Jenni" value={settings['email_nom'] || ''} onChange={v => set('email_nom', v)} />
            </div>

            {/* Choix du fournisseur */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2">📮 Service d'envoi</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'smtp',   label: 'SMTP',   emoji: '🖥️', desc: 'Serveur mail perso' },
                  { value: 'gmail',  label: 'Gmail',  emoji: '📨', desc: 'Compte Google' },
                  { value: 'resend', label: 'Resend', emoji: '⚡', desc: '100 mails/jour gratuit' },
                ] as { value: EmailProvider; label: string; emoji: string; desc: string }[]).map(({ value, label, emoji, desc }) => (
                  <button key={value} type="button"
                    onClick={() => set('email_provider', value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 font-bold text-xs transition-all ${
                      emailProvider === value
                        ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                        : 'bg-candy text-[#1A1040] border-gray-200 hover:border-[#1A1040]'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="font-black">{label}</span>
                    <span className={`text-[10px] ${emailProvider === value ? 'text-white/60' : 'text-gray-400'}`}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Champs SMTP */}
            {emailProvider === 'smtp' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Configuration SMTP</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Serveur (host)" placeholder="smtp.example.com" value={settings['smtp_host'] || ''} onChange={v => set('smtp_host', v)} />
                  <Field label="Port" placeholder="587" value={settings['smtp_port'] || ''} onChange={v => set('smtp_port', v)} />
                </div>
                <Field label="Identifiant" placeholder="votre@email.fr" value={settings['smtp_user'] || ''} onChange={v => set('smtp_user', v)} />
                <Field label="Mot de passe" placeholder="••••••••" value={settings['smtp_password'] || ''} onChange={v => set('smtp_password', v)} masked isVisible={showPasswords['smtp_password']} onToggleVisibility={() => toggleShow('smtp_password')} />
              </div>
            )}

            {/* Gmail */}
            {emailProvider === 'gmail' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Configuration Gmail</p>
                <Field label="Adresse Gmail" type="email" placeholder="votre.adresse@gmail.com" value={settings['smtp_user'] || ''} onChange={v => set('smtp_user', v)} />
                <Field label="Mot de passe d'application Google" placeholder="xxxx xxxx xxxx xxxx" value={settings['smtp_password'] || ''} onChange={v => set('smtp_password', v)} masked isVisible={showPasswords['smtp_password']} onToggleVisibility={() => toggleShow('smtp_password')} />
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-turquoise-600 font-bold hover:underline">
                  🔗 Créer un mot de passe d'application Google →
                </a>
              </div>
            )}

            {/* Resend */}
            {emailProvider === 'resend' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Configuration Resend</p>
                <Field label="Clé API Resend" placeholder="re_xxxxxxxxxxxxxxxxxxxx" value={settings['smtp_password'] || ''} onChange={v => set('smtp_password', v)} masked isVisible={showPasswords['smtp_password']} onToggleVisibility={() => toggleShow('smtp_password')} />
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-turquoise-600 font-bold hover:underline">
                  🔗 Obtenir votre clé API Resend →
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <SaveButton isSaving={saving === 'email'} isSaved={saved === 'email'} onClick={() => saveSection('email', ['email_expediteur', 'email_nom', 'email_provider', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'])} />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — TERMINAL DE PAIEMENT
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>

          {/* En-tête */}
          <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-citron-400 rounded-xl flex items-center justify-center border-2 border-citron-300">
              <CreditCard className="w-5 h-5 text-[#1A1040]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-black text-white">Terminal de paiement</h2>
              <p className="text-gray-400 text-xs">Acceptez les paiements en ligne de vos élèves</p>
            </div>
            {/* Indicateur */}
            <div className="ml-auto">
              {(settings['stripe_public_key'] || settings['sumup_api_key'] || settings['paypal_client_id']) ? (
                <div className="flex items-center gap-1.5 bg-lime-300/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-400/30">
                  <Wifi className="w-3 h-3" /> Configuré
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-400/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-400/30">
                  <WifiOff className="w-3 h-3" /> Non connecté
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Sélection terminal */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2">💳 Choisissez votre terminal</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'stripe', Logo: StripeLogo, desc: 'Carte bancaire' },
                  { value: 'sumup',  Logo: SumUpLogo,  desc: 'Carte + lecteur' },
                  { value: 'paypal', Logo: PayPalLogo,  desc: 'Compte PayPal' },
                ] as { value: PaymentProvider; Logo: () => React.ReactElement; desc: string }[]).map(({ value, Logo, desc }) => (
                  <button key={value} type="button"
                    onClick={() => set('payment_provider', value)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
                      paymentProvider === value
                        ? 'bg-[#1A1040] border-[#1A1040]'
                        : 'bg-candy border-gray-200 hover:border-[#1A1040]'
                    }`}
                  >
                    <div className={paymentProvider === value ? 'brightness-0 invert' : ''}>
                      <Logo />
                    </div>
                    <span className={`text-[10px] font-bold ${paymentProvider === value ? 'text-citron-400' : 'text-gray-400'}`}>
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Stripe ── */}
            {paymentProvider === 'stripe' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Clés API Stripe</p>
                <Field label="Clé publique (pk_live_ ou pk_test_)" placeholder="pk_live_..." value={settings['stripe_public_key'] || ''} onChange={v => set('stripe_public_key', v)} />
                <Field label="Clé secrète (sk_live_ ou sk_test_)" placeholder="sk_live_..." value={settings['stripe_secret_key'] || ''} onChange={v => set('stripe_secret_key', v)} masked isVisible={showPasswords['stripe_secret_key']} onToggleVisibility={() => toggleShow('stripe_secret_key')} />
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-turquoise-600 font-bold hover:underline">
                  🔗 Récupérer mes clés sur Stripe Dashboard →
                </a>
              </div>
            )}

            {/* ── SumUp ── */}
            {paymentProvider === 'sumup' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Configuration SumUp</p>
                <Field label="Clé API SumUp" placeholder="sup_sk_..." value={settings['sumup_api_key'] || ''} onChange={v => set('sumup_api_key', v)} masked isVisible={showPasswords['sumup_api_key']} onToggleVisibility={() => toggleShow('sumup_api_key')} />
                <a href="https://developer.sumup.com/docs/authorization" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-turquoise-600 font-bold hover:underline">
                  🔗 Obtenir ma clé API SumUp →
                </a>
              </div>
            )}

            {/* ── PayPal ── */}
            {paymentProvider === 'paypal' && (
              <div className="bg-candy rounded-2xl p-4 border-2 border-dashed border-gray-300 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⚙️ Configuration PayPal</p>
                <Field label="Client ID PayPal" placeholder="AaBbCcDd..." value={settings['paypal_client_id'] || ''} onChange={v => set('paypal_client_id', v)} />
                <Field label="Secret PayPal" placeholder="EeFfGgHh..." value={settings['paypal_secret'] || ''} onChange={v => set('paypal_secret', v)} masked isVisible={showPasswords['paypal_secret']} onToggleVisibility={() => toggleShow('paypal_secret')} />
                <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-turquoise-600 font-bold hover:underline">
                  🔗 Créer une application PayPal Developer →
                </a>
              </div>
            )}

            {/* Note sécurité */}
            <div className="bg-citron-400/15 border-2 border-citron-400/30 rounded-2xl px-4 py-3 flex gap-3">
              <span className="text-xl shrink-0">🔒</span>
              <p className="text-xs text-[#1A1040] font-medium leading-relaxed">
                Vos clés sont stockées de manière sécurisée dans votre base de données Supabase et ne sont jamais exposées aux visiteurs du site.
              </p>
            </div>

            <div className="flex justify-end">
              <SaveButton isSaving={saving === 'payment'} isSaved={saved === 'payment'} onClick={() => saveSection('payment', ['payment_provider', 'stripe_public_key', 'stripe_secret_key', 'sumup_api_key', 'paypal_client_id', 'paypal_secret'])} />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — GOOGLE AVIS
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>

          {/* En-tête */}
          <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-citron-400 rounded-xl flex items-center justify-center border-2 border-citron-300 text-xl shrink-0">⭐</div>
            <div>
              <h2 className="font-serif text-lg font-black text-white">Avis Google</h2>
              <p className="text-gray-400 text-xs">Affichez vos avis en défilement sur la page d'accueil</p>
            </div>
            <div className="ml-auto">
              {reviewsMode === 'manual'
                ? <div className="flex items-center gap-1.5 bg-citron-400/20 text-citron-400 px-3 py-1 rounded-full text-xs font-bold border border-citron-400/30"><Pencil className="w-3 h-3" /> Avis manuels</div>
                : (settings['google_places_api_key'] && settings['google_place_id'])
                  ? <div className="flex items-center gap-1.5 bg-lime-300/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-400/30"><Wifi className="w-3 h-3" /> Places API</div>
                  : <div className="flex items-center gap-1.5 bg-red-400/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-400/30"><WifiOff className="w-3 h-3" /> Non configuré</div>
              }
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Toggle mode */}
            <div>
              <p className="text-xs font-black text-[#1A1040] mb-2">Mode d'affichage</p>
              <div className="flex gap-2">
                {(['manual', 'api'] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => saveMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                      reviewsMode === mode
                        ? 'bg-[#1A1040] border-[#1A1040] text-citron-400'
                        : 'bg-candy border-gray-200 text-gray-500 hover:border-[#1A1040]'
                    }`}>
                    {mode === 'manual' ? <><Pencil className="w-3.5 h-3.5" /> Avis manuels</> : <><Wifi className="w-3.5 h-3.5" /> Places API</>}
                  </button>
                ))}
              </div>
            </div>

            {/* ── MODE MANUEL ── */}
            {reviewsMode === 'manual' && (
              <div className="space-y-3">
                <div className="bg-citron-400/15 border-2 border-citron-400/30 rounded-2xl px-4 py-3 text-xs text-[#1A1040] font-medium">
                  💡 Saisissez vos avis Google manuellement. Quand Google indexera votre fiche dans Places API, vous pourrez basculer en mode automatique.
                </div>

                {/* Liste des avis */}
                {manualReviews.map(r => (
                  <div key={r.id} className="bg-candy rounded-2xl border-2 border-[#1A1040] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className="w-3 h-3" style={{ fill: i <= r.rating ? '#ffe500' : '#e5e7eb', color: i <= r.rating ? '#ffe500' : '#e5e7eb' }} />
                            ))}
                          </div>
                          <span className="text-xs font-black text-[#1A1040]">{r.author_name}</span>
                          {r.time_description && <span className="text-[10px] text-gray-400">{r.time_description}</span>}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{r.review_text}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditingReview(r)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-[#1A1040] bg-white hover:bg-citron-50 transition-colors">
                          <Pencil className="w-3 h-3 text-[#1A1040]" />
                        </button>
                        <button onClick={() => deleteReview(r.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-red-300 bg-white hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Formulaire d'édition */}
                {editingReview !== null ? (
                  <div className="bg-white rounded-2xl border-4 border-[#1A1040] p-4 space-y-3" style={{ boxShadow: '4px 4px 0 #ffe500' }}>
                    <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">
                      {editingReview.id ? '✏️ Modifier l\'avis' : '➕ Nouvel avis'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Auteur</label>
                        <input value={editingReview.author_name || ''} onChange={e => setEditingReview(p => ({ ...p!, author_name: e.target.value }))}
                          placeholder="Prénom Nom" className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-citron-400" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Date</label>
                        <input value={editingReview.time_description || ''} onChange={e => setEditingReview(p => ({ ...p!, time_description: e.target.value }))}
                          placeholder="il y a 2 semaines" className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-citron-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Note</label>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <button key={i} type="button" onClick={() => setEditingReview(p => ({ ...p!, rating: i }))}>
                            <Star className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform" style={{ fill: i <= (editingReview.rating || 5) ? '#ffe500' : '#e5e7eb', color: i <= (editingReview.rating || 5) ? '#ffe500' : '#e5e7eb' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte de l'avis</label>
                      <textarea value={editingReview.review_text || ''} onChange={e => setEditingReview(p => ({ ...p!, review_text: e.target.value }))}
                        rows={3} placeholder="Copier-coller le texte de l'avis Google ici…"
                        className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-citron-400" />
                    </div>
                    {/* Photo optionnelle */}
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Photo (optionnelle)</label>
                      {editingReview.photo_url && (
                        <div className="relative mb-2">
                          <img src={editingReview.photo_url} alt="" className="w-full h-28 object-cover rounded-lg border-2 border-[#1A1040]" />
                          <button onClick={() => setEditingReview(p => ({ ...p!, photo_url: '' }))}
                            className="absolute top-1 right-1 bg-white border border-[#1A1040] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black hover:bg-red-50">
                            ✕
                          </button>
                        </div>
                      )}
                      <label className={`flex items-center justify-center gap-1.5 border-2 border-dashed border-[#1A1040] rounded-lg py-2 text-xs font-black text-[#1A1040] cursor-pointer hover:bg-citron-400/10 transition-all ${reviewPhotoUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                        {reviewPhotoUploading ? '⏳ Upload…' : '📷 Choisir une photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadReviewPhoto(f) }} />
                      </label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingReview(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 border-2 border-[#1A1040] rounded-xl py-2 text-xs font-black text-[#1A1040] hover:bg-gray-50 transition-all">
                        <X className="w-3.5 h-3.5" /> Annuler
                      </button>
                      <button onClick={saveReview} disabled={savingReview}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1040] border-2 border-[#1A1040] rounded-xl py-2 text-xs font-black text-citron-400 hover:bg-[#2d2060] disabled:opacity-60 transition-all">
                        {savingReview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingReview({ author_name: '', rating: 5, review_text: '', time_description: '' })}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1A1040] rounded-2xl py-3 text-xs font-black text-[#1A1040] hover:bg-citron-400/10 transition-all">
                    <Plus className="w-4 h-4" /> Ajouter un avis
                  </button>
                )}
              </div>
            )}

            {/* ── MODE PLACES API ── */}
            {reviewsMode === 'api' && (
              <div className="space-y-4">
                <div className="bg-citron-400/15 border-2 border-citron-400/30 rounded-2xl px-4 py-3 flex gap-3">
                  <span className="text-xl shrink-0">💡</span>
                  <div className="text-xs text-[#1A1040] font-medium leading-relaxed space-y-1">
                    <p className="font-black">Pour afficher vos avis automatiquement, il vous faut :</p>
                    <ol className="list-decimal list-inside space-y-0.5 font-normal">
                      <li>Une <strong>clé API Google Places</strong></li>
                      <li>L'<strong>identifiant Place ID</strong> de votre établissement</li>
                    </ol>
                  </div>
                </div>

                <Field label="🔑 Clé API Google Places" placeholder="AIzaSy..." value={settings['google_places_api_key'] || ''} onChange={v => set('google_places_api_key', v)} masked isVisible={showPasswords['google_places_api_key']} onToggleVisibility={() => toggleShow('google_places_api_key')} />

                <div>
                  <label className="block text-xs font-black text-[#1A1040] mb-1">📍 Place ID de votre établissement</label>
                  <input type="text" value={settings['google_place_id'] || ''} onChange={e => set('google_place_id', e.target.value)}
                    placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy mb-2" />

                  {/* Extraction URL Maps */}
                  <div className="bg-turquoise-400/10 border-2 border-turquoise-400/30 rounded-xl p-3 space-y-2 mb-2">
                    <p className="text-[10px] font-black text-[#1A1040] uppercase tracking-wide">🗺️ Depuis une URL Google Maps</p>
                    <div className="flex gap-2">
                      <input type="text" value={mapsUrl} onChange={e => { setMapsUrl(e.target.value); setMapsUrlError('') }}
                        placeholder="Collez ici l'URL Google Maps de votre fiche…"
                        className="flex-1 border-2 border-[#1A1040] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-turquoise-400 bg-white" />
                      <button type="button" onClick={extractFromMapsUrl} disabled={!mapsUrl.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-[#1A1040] bg-turquoise-400 hover:bg-turquoise-300 text-[#1A1040] font-black text-xs transition-all disabled:opacity-40 shrink-0">
                        Extraire
                      </button>
                    </div>
                    {mapsUrlError && <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {mapsUrlError}</p>}
                  </div>

                  {/* Recherche auto */}
                  <div className="bg-citron-400/10 border-2 border-citron-400/30 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black text-[#1A1040] uppercase tracking-wide">🔍 Trouver automatiquement</p>
                    <div className="flex gap-2">
                      <input type="text" value={placeQuery} onChange={e => setPlaceQuery(e.target.value)}
                        placeholder="Nom de votre établissement"
                        className="flex-1 border-2 border-[#1A1040] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-citron-400 bg-white" />
                      <button type="button" onClick={findPlaceId} disabled={findingPlaceId}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-[#1A1040] bg-citron-400 hover:bg-citron-300 text-[#1A1040] font-black text-xs transition-all disabled:opacity-60 shrink-0">
                        {findingPlaceId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Chercher
                      </button>
                    </div>
                    {placeResults.length > 0 && (
                      <div className="border-2 border-lime-400 rounded-lg overflow-hidden">
                        {placeResults.map(p => (
                          <button key={p.place_id} type="button"
                            onClick={() => { set('google_place_id', p.place_id); setPlaceResults([]); setPlaceSearchError('') }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-lime-50 border-t border-lime-200 flex items-center justify-between gap-2 transition-colors">
                            <span className="font-bold text-[#1A1040]">{p.name}</span>
                            <span className="text-gray-400 font-mono text-[10px] truncate max-w-[160px]">{p.place_id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {placeSearchError && <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {placeSearchError}</p>}
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 flex gap-3">
                  <span className="text-xl shrink-0">⚠️</span>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Activez <strong>Places API (New)</strong> dans Google Cloud Console et ajoutez votre domaine aux restrictions de la clé.
                  </p>
                </div>

                <div className="flex justify-end">
                  <SaveButton isSaving={saving === 'google'} isSaved={saved === 'google'} onClick={() => saveSection('google', ['google_places_api_key', 'google_place_id'])} />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── RÉSEAUX SOCIAUX ── */}
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
        style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
        <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-citron-400 rounded-xl flex items-center justify-center border-2 border-citron-300 text-xl">
            📱
          </div>
          <div>
            <h2 className="font-serif text-xl font-black text-white">Réseaux sociaux</h2>
            <p className="text-gray-400 text-xs mt-0.5">Ces liens apparaissent sur la page d'accueil</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1 flex items-center gap-1.5">
                <span className="text-base">📸</span> URL Instagram
              </label>
              <input
                type="url"
                value={settings['instagram_url'] || ''}
                onChange={e => set('instagram_url', e.target.value)}
                placeholder="https://instagram.com/votre-compte"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1 flex items-center gap-1.5">
                <span className="text-base">👥</span> URL Facebook
              </label>
              <input
                type="url"
                value={settings['facebook_url'] || ''}
                onChange={e => set('facebook_url', e.target.value)}
                placeholder="https://facebook.com/votre-page"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1 flex items-center gap-1.5">
                <span className="text-base">🎵</span> URL TikTok
              </label>
              <input
                type="url"
                value={settings['tiktok_url'] || ''}
                onChange={e => set('tiktok_url', e.target.value)}
                placeholder="https://tiktok.com/@votre-compte"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1 flex items-center gap-1.5">
                <span className="text-base">💼</span> URL LinkedIn
              </label>
              <input
                type="url"
                value={settings['linkedin_url'] || ''}
                onChange={e => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/votre-profil"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-1 flex items-center gap-1.5">
                <span className="text-base">📌</span> URL Pinterest
              </label>
              <input
                type="url"
                value={settings['pinterest_url'] || ''}
                onChange={e => set('pinterest_url', e.target.value)}
                placeholder="https://pinterest.com/votre-compte"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <SaveButton isSaving={saving === 'social'} isSaved={saved === 'social'} onClick={() => saveSection('social', ['instagram_url','facebook_url','tiktok_url','linkedin_url','pinterest_url'])} />
          </div>
        </div>
      </div>

      {/* ── MONDIAL RELAY ── */}
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
        style={{ boxShadow: '5px 5px 0px 0px #fed7aa' }}>
        <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center border-2 border-orange-300 text-xl">
            📦
          </div>
          <div>
            <h2 className="font-serif text-xl font-black text-white">Mondial Relay</h2>
            <p className="text-gray-400 text-xs mt-0.5">Identifiants + grille tarifaire pour le calcul des frais de port boutique</p>
          </div>
        </div>
        <div className="p-6">
          <MondialRelayManager />
        </div>
      </div>

      {/* ── CGV ── */}
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
        style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
        <div className="bg-[#1A1040] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center border-2 border-purple-300 text-xl">
            📄
          </div>
          <div>
            <h2 className="font-serif text-xl font-black text-white">Conditions Générales de Vente</h2>
            <p className="text-gray-400 text-xs mt-0.5">Déposez votre PDF — obligatoire avant toute validation de panier</p>
          </div>
        </div>
        <div className="p-6">
          <CgvManager />
        </div>
      </div>

    </main>
  )
}
