import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Calendar, Users, Euro,
  ChevronDown, ChevronUp, RefreshCw,
  ChevronLeft, ChevronRight, Archive, TrendingUp, Download,
  ShoppingBag, Package, Store, Paintbrush,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { downloadCSV } from '../lib/csv'
import { formatPrice } from '../lib/shop'
import type { Atelier } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────
interface ShopArticle { product_id: string; name: string; price: number; quantity: number }
interface ShopOrder {
  id: string
  client_prenom: string; client_nom: string; client_email: string; client_telephone: string
  mode_livraison: 'mondial_relay' | 'click_and_collect'
  relay_nom: string | null; relay_adresse: string | null; relay_cp: string | null; relay_ville: string | null
  articles: ShopArticle[]
  sous_total: number; frais_livraison: number; remise: number; total: number
  code_promo: string | null
  statut: string
  created_at: string
}

const SHOP_STATUTS = [
  { value: 'en_attente', label: '🔴 En attente',  style: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'paye',       label: '✅ Payé',         style: 'bg-lime-100 text-lime-700 border-lime-400' },
  { value: 'expedie',    label: '📦 Expédié',      style: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'retire',     label: '🏪 Retiré',       style: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'annule',     label: '❌ Annulé',       style: 'bg-gray-100 text-gray-500 border-gray-300' },
] as const

interface Reservation {
  id: string
  atelier_id: string
  prenom: string
  nom: string
  age: string | null
  email: string
  telephone: string | null
  mode_paiement: string
  statut_paiement: 'en_attente' | 'paye' | 'annule'
  nb_personnes: number
  stripe_payment_intent_id: string | null
  created_at: string
}

interface AtelierAvecReservations extends Atelier {
  reservations: Reservation[]
}

// ─── Constantes visuelles ───────────────────────────────────────────────────
const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const MODE_LABEL: Record<string, string> = {
  carte:   '💳 Carte',
  cheque:  '📝 Chèque',
  especes: '💵 Espèces',
}
const MODE_STYLE: Record<string, string> = {
  carte:   'bg-turquoise-100 text-turquoise-700 border-turquoise-300',
  cheque:  'bg-citron-100 text-citron-700 border-citron-300',
  especes: 'bg-lime-100 text-lime-700 border-lime-300',
}
const STATUT_OPTIONS = [
  { value: 'paye',       label: '✅ Payé',       style: 'bg-lime-100 text-lime-700 border-lime-400' },
  { value: 'en_attente', label: '🔴 En attente', style: 'bg-red-100 text-red-600 border-red-400' },
  { value: 'annule',     label: '❌ Annulé',     style: 'bg-gray-100 text-gray-500 border-gray-300' },
] as const

// ─── Couleurs personnalisables des cartes ──────────────────────────────────
const PALETTE = [
  '#1A1040','#f87171','#fb923c','#ffe500','#b4ff39','#4ade80',
  '#00d4c8','#22d3ee','#60a5fa','#a78bfa','#e879f9','#ffb5c8',
  '#ff6b35','#ffffff',
]

const DEFAULT_TDB_COLORS: Record<string, string> = {
  g_total:        '#1A1040',
  g_ateliers:     '#ffb5c8',
  g_magasin:      '#a78bfa',
  a_reservations: '#00d4c8',
  a_remplissage:  '#ffe500',
  a_paiements:    '#b4ff39',
  a_attente_at:   '#f87171',
  a_ca:           '#ffb5c8',
  m_commandes:    '#ffffff',
  m_attente_mag:  '#f87171',
  m_payees:       '#b4ff39',
  m_ca:           '#a78bfa',
}

function textColorFor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.52 ? '#1A1040' : '#ffffff'
}

function TdbCard({ cardKey, bg, shadow, className, children, editingCard, setEditingCard, onSave }: {
  cardKey: string; bg: string; shadow?: string; className?: string; children: React.ReactNode
  editingCard: string | null; setEditingCard: (k: string | null) => void
  onSave: (k: string, c: string) => void
}) {
  const tc = textColorFor(bg)
  const isEditing = editingCard === cardKey
  return (
    <div className={`relative rounded-2xl border-2 border-[#1A1040] ${className ?? ''}`}
      style={{ background: bg, color: tc, boxShadow: shadow ?? '3px 3px 0px 0px #1A1040' }}>
      <button
        onClick={e => { e.stopPropagation(); setEditingCard(isEditing ? null : cardKey) }}
        title="Changer la couleur"
        className="absolute top-2 right-2 w-6 h-6 rounded-full border border-[#1A1040]/30 bg-white/25 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-all z-10">
        <Paintbrush className="w-3 h-3" style={{ color: tc }} />
      </button>
      {isEditing && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setEditingCard(null)} />
          <div className="absolute top-10 right-0 z-30 bg-white border-2 border-[#1A1040] rounded-xl p-3"
            style={{ boxShadow: '3px 3px 0 #1A1040', minWidth: '200px' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-[10px] font-black text-[#1A1040] uppercase tracking-wide mb-2">🎨 Couleur de la carte</p>
            <div className="grid grid-cols-7 gap-1.5">
              {PALETTE.map(color => (
                <button key={color} onClick={() => { onSave(cardKey, color); setEditingCard(null) }}
                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                  style={{ background: color, borderColor: bg === color ? '#1A1040' : '#e5e7eb' }} />
              ))}
            </div>
          </div>
        </>
      )}
      {children}
    </div>
  )
}

type Vue = 'global' | 'ateliers' | 'magasin'

// ─── Composant principal ───────────────────────────────────────────────────
export default function TableauDeBord() {
  const currentYear = new Date().getFullYear()

  const [ateliers, setAteliers]               = useState<AtelierAvecReservations[]>([])
  const [shopOrders, setShopOrders]           = useState<ShopOrder[]>([])
  const [loading, setLoading]                 = useState(true)
  const [collapsed, setCollapsed]             = useState<Record<string, boolean>>({})
  const [updatingId, setUpdatingId]           = useState<string | null>(null)
  const [filterStatut, setFilterStatut]       = useState<string>('tous')
  const [filterPeriode, setFilterPeriode]     = useState<'avenir' | 'passes' | 'tous'>('avenir')
  const [presences, setPresences]             = useState<Set<string>>(new Set())
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(currentYear)
  const [showArchiveBanner, setShowArchiveBanner] = useState(false)
  const [anneeAArchiver, setAnneeAArchiver]   = useState<number | null>(null)
  const [isArchiving, setIsArchiving]         = useState(false)
  const [archiveSuccess, setArchiveSuccess]   = useState(false)
  const [vue, setVue]                         = useState<Vue>('global')
  const [tdbColors, setTdbColors]             = useState<Record<string, string>>(DEFAULT_TDB_COLORS)
  const [editingCard, setEditingCard]         = useState<string | null>(null)

  // ── Chargement des données ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: atelierData }, { data: reservData }, { data: ordersData }] = await Promise.all([
      supabase.from('ateliers').select('*').order('date', { ascending: true }),
      supabase.from('reservations').select('*').order('created_at', { ascending: true }),
      supabase.from('shop_orders').select('*').order('created_at', { ascending: false }),
    ])

    if (atelierData) {
      const combined: AtelierAvecReservations[] = atelierData.map(a => ({
        ...a,
        reservations: (reservData || []).filter(r => r.atelier_id === a.id),
      }))
      setAteliers(combined)
    }
    setShopOrders((ordersData as ShopOrder[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Couleurs personnalisées ──────────────────────────────────────────────
  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'tdb_card_colors').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try { setTdbColors({ ...DEFAULT_TDB_COLORS, ...JSON.parse(data.value) }) } catch {}
        }
      })
  }, [])

  async function saveCardColor(key: string, color: string) {
    const next = { ...tdbColors, [key]: color }
    setTdbColors(next)
    await supabase.from('settings').upsert({ key: 'tdb_card_colors', value: JSON.stringify(next) }, { onConflict: 'key' })
  }

  // ── Détection d'année à archiver ─────────────────────────────────────────
  useEffect(() => {
    if (!ateliers.length) return
    const prevYear = currentYear - 1
    const hasPrevData = ateliers.some(a => new Date(a.date).getFullYear() === prevYear)
    if (!hasPrevData) return

    supabase
      .from('archives_annuelles')
      .select('annee')
      .eq('annee', prevYear)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setShowArchiveBanner(true)
          setAnneeAArchiver(prevYear)
        }
      })
  }, [ateliers, currentYear])

  // ── Archiver une année ───────────────────────────────────────────────────
  async function archiverAnnee(annee: number) {
    setIsArchiving(true)
    const ateliersAnnee = ateliers.filter(a => new Date(a.date).getFullYear() === annee)
    const reservsAnnee  = ateliersAnnee.flatMap(a => a.reservations)

    const total_reservations = reservsAnnee.length
    const total_paye         = reservsAnnee.filter(r => r.statut_paiement === 'paye').length
    const total_annule       = reservsAnnee.filter(r => r.statut_paiement === 'annule').length
    const total_en_attente   = reservsAnnee.filter(r => r.statut_paiement === 'en_attente').length
    const ca_ht              = ateliersAnnee.reduce((sum, a) => {
      return sum + a.reservations.filter(r => r.statut_paiement === 'paye').length * a.prix
    }, 0)

    const ca_mensuel: Record<string, number> = {}
    for (let m = 1; m <= 12; m++) ca_mensuel[String(m)] = 0
    ateliersAnnee.forEach(a => {
      const mois = String(new Date(a.date).getMonth() + 1)
      const payees = a.reservations.filter(r => r.statut_paiement === 'paye').length
      ca_mensuel[mois] = (ca_mensuel[mois] || 0) + payees * a.prix
    })

    const total_places  = ateliersAnnee.reduce((sum, a) => sum + a.places_max, 0)
    const total_inscrits = reservsAnnee.filter(r => r.statut_paiement !== 'annule').length
    const taux_remplissage = total_places > 0 ? Math.round((total_inscrits / total_places) * 100) : 0

    const details_ateliers = ateliersAnnee.map(a => ({
      id:              a.id,
      titre:           a.titre,
      date:            a.date,
      heure:           a.heure,
      lieu:            a.lieu,
      prix:            a.prix,
      places_max:      a.places_max,
      total_inscrits:  a.reservations.filter(r => r.statut_paiement !== 'annule').length,
      total_paye:      a.reservations.filter(r => r.statut_paiement === 'paye').length,
      ca:              a.reservations.filter(r => r.statut_paiement === 'paye').length * a.prix,
      taux_remplissage: a.places_max > 0
        ? Math.round((a.reservations.filter(r => r.statut_paiement !== 'annule').length / a.places_max) * 100)
        : 0,
    }))

    await supabase.from('archives_annuelles').upsert({
      annee, total_reservations, total_paye, total_annule, total_en_attente,
      ca_ht, ca_mensuel, taux_remplissage, total_places, total_inscrits, details_ateliers,
    })

    setIsArchiving(false)
    setArchiveSuccess(true)
    setShowArchiveBanner(false)
    setTimeout(() => setArchiveSuccess(false), 4000)
  }

  // ── Présences (local — jour J) ───────────────────────────────────────────
  function togglePresence(id: string) {
    setPresences(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Modifier statut paiement ─────────────────────────────────────────────
  async function updateStatut(reservationId: string, newStatut: string) {
    setUpdatingId(reservationId)

    // Trouver la réservation et l'atelier dans l'état courant
    let currentReservation: Reservation | undefined
    let concernedAtelier: AtelierAvecReservations | undefined
    for (const a of ateliers) {
      const r = a.reservations.find(r => r.id === reservationId)
      if (r) { currentReservation = r; concernedAtelier = a; break }
    }

    const { error } = await supabase
      .from('reservations').update({ statut_paiement: newStatut }).eq('id', reservationId)

    if (!error && currentReservation && concernedAtelier) {
      const oldStatut   = currentReservation.statut_paiement
      const nbPersonnes = currentReservation.nb_personnes ?? 1

      // Calculer le delta de places à remettre à jour
      let placeDelta = 0
      if (newStatut === 'annule' && oldStatut !== 'annule') {
        placeDelta = nbPersonnes   // annulation → on libère les places
      } else if (oldStatut === 'annule' && newStatut !== 'annule') {
        placeDelta = -nbPersonnes  // réactivation → on reprend les places
      }

      let newPlaces = concernedAtelier.places_restantes
      if (placeDelta !== 0) {
        newPlaces = Math.min(
          concernedAtelier.places_max,
          Math.max(0, concernedAtelier.places_restantes + placeDelta)
        )
        await supabase
          .from('ateliers')
          .update({ places_restantes: newPlaces })
          .eq('id', concernedAtelier.id)
      }

      setAteliers(prev => prev.map(a => ({
        ...a,
        places_restantes: a.id === concernedAtelier!.id ? newPlaces : a.places_restantes,
        reservations: a.reservations.map(r =>
          r.id === reservationId
            ? { ...r, statut_paiement: newStatut as Reservation['statut_paiement'] }
            : r
        ),
      })))

      // Remboursement Stripe si paiement CB et statut était "payé"
      if (newStatut === 'annule' && oldStatut === 'paye'
        && (currentReservation.mode_paiement === 'cb' || currentReservation.mode_paiement === 'carte')
        && currentReservation.stripe_payment_intent_id) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
        const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        fetch(`${supabaseUrl}/functions/v1/refund-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ payment_intent_id: currentReservation.stripe_payment_intent_id }),
        }).catch(() => {})
      }

      // Avoir automatique lors d'une annulation
      if (newStatut === 'annule' && oldStatut !== 'annule') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
        const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        const montant     = nbPersonnes * concernedAtelier.prix

        // Chercher la facture originale liée à cette réservation
        supabase.from('factures')
          .select('numero')
          .eq('reservation_id', reservationId)
          .eq('type', 'facture')
          .maybeSingle()
          .then(({ data: facture }) => {
            fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                type:              'avoir',
                reference_facture: facture?.numero || null,
                reservation_id:    reservationId,
                atelier_titre:     concernedAtelier!.titre,
                atelier_date:      concernedAtelier!.date,
                client_nom:        currentReservation!.nom,
                client_prenom:     currentReservation!.prenom,
                client_email:      currentReservation!.email,
                client_telephone:  currentReservation!.telephone,
                description:       `Avoir — Annulation atelier « ${concernedAtelier!.titre} »${nbPersonnes > 1 ? ` (${nbPersonnes} participants)` : ''}`,
                quantite:          nbPersonnes,
                prix_unitaire:     concernedAtelier!.prix,
                montant_total:     montant,
                mode_paiement:     currentReservation!.mode_paiement,
              }),
            }).catch(() => {})
          })
      }
    }
    setUpdatingId(null)
  }

  // ── Calculs pour l'année sélectionnée ────────────────────────────────────
  const ateliersDeLAnnee = ateliers.filter(a =>
    new Date(a.date).getFullYear() === anneeSelectionnee
  )
  const allReservAnnee   = ateliersDeLAnnee.flatMap(a => a.reservations)
  const totalReservations = allReservAnnee.length
  const totalPaye        = allReservAnnee.filter(r => r.statut_paiement === 'paye').length
  const totalAttente     = allReservAnnee.filter(r => r.statut_paiement === 'en_attente').length
  const totalCA          = ateliersDeLAnnee.reduce((sum, a) =>
    sum + a.reservations.filter(r => r.statut_paiement === 'paye').length * a.prix, 0
  )
  const totalPlaces      = ateliersDeLAnnee.reduce((sum, a) => sum + a.places_max, 0)
  const totalInscrits    = allReservAnnee.filter(r => r.statut_paiement !== 'annule').length
  const tauxRemplissage  = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0

  // ── Stats boutique (année sélectionnée) ──────────────────────────────────
  const shopOrdersAnnee = shopOrders.filter(o =>
    new Date(o.created_at).getFullYear() === anneeSelectionnee
  )
  const shopCA = shopOrdersAnnee
    .filter(o => ['paye', 'expedie', 'retire'].includes(o.statut))
    .reduce((s, o) => s + o.total, 0)
  const shopEnAttente = shopOrdersAnnee.filter(o => o.statut === 'en_attente').length
  const shopPayees    = shopOrdersAnnee.filter(o => ['paye', 'expedie', 'retire'].includes(o.statut)).length

  const caParMoisBoutique: number[] = Array(12).fill(0)
  shopOrdersAnnee.forEach(o => {
    if (!['paye', 'expedie', 'retire'].includes(o.statut)) return
    const mois = new Date(o.created_at).getMonth()
    caParMoisBoutique[mois] += o.total
  })
  const maxCABoutique = Math.max(...caParMoisBoutique, 1)

  async function updateShopStatut(id: string, statut: string) {
    await supabase.from('shop_orders').update({ statut }).eq('id', id)
    setShopOrders(prev => prev.map(o => o.id === id ? { ...o, statut } : o))
  }

  // ── CA mensuel (année sélectionnée) ──────────────────────────────────────
  const caParMois: number[] = Array(12).fill(0)
  ateliersDeLAnnee.forEach(a => {
    const mois   = new Date(a.date).getMonth() // 0-based
    const payees = a.reservations.filter(r => r.statut_paiement === 'paye').length
    caParMois[mois] += payees * a.prix
  })
  const maxCA        = Math.max(...caParMois, 1)
  const moisCourant  = new Date().getMonth() // 0-based
  const totalCALabel = totalCA.toLocaleString('fr-FR')

  // ── Années disponibles ───────────────────────────────────────────────────
  const anneesDisponibles = [...new Set([
    currentYear,
    ...ateliers.map(a => new Date(a.date).getFullYear()),
  ])].sort((a, b) => a - b)

  // ── Filtre période + année ───────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const ateliersFiltres = ateliersDeLAnnee.filter(a => {
    const d = new Date(a.date); d.setHours(0, 0, 0, 0)
    if (filterPeriode === 'avenir') return d >= today
    if (filterPeriode === 'passes') return d < today
    return true
  })

  // ── Exports CSV ──────────────────────────────────────────────────────────
  function exportReservationsCSV() {
    const headers = [
      'Atelier', 'Date atelier', 'Heure', 'Lieu', 'Prix HT (€)',
      'Prénom', 'Nom', 'Âge', 'Email', 'Téléphone',
      'Mode de paiement', 'Statut paiement', 'Date inscription',
    ]
    const rows = ateliersDeLAnnee.flatMap(a =>
      a.reservations.map(r => [
        a.titre,
        new Date(a.date).toLocaleDateString('fr-FR'),
        a.heure,
        a.lieu,
        a.prix,
        r.prenom,
        r.nom,
        r.age ?? '',
        r.email,
        r.telephone ?? '',
        r.mode_paiement === 'carte' ? 'Carte' : r.mode_paiement === 'cheque' ? 'Chèque' : 'Espèces',
        r.statut_paiement === 'paye' ? 'Payé' : r.statut_paiement === 'en_attente' ? 'En attente' : 'Annulé',
        new Date(r.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      ])
    )
    downloadCSV(`reservations_${anneeSelectionnee}.csv`, headers, rows)
  }

  function exportCAMensuelCSV() {
    const headers = ['Mois', 'CA HT (€)']
    const rows = MOIS_FR.map((mois, idx) => [mois, caParMois[idx]])
    downloadCSV(`ca_mensuel_${anneeSelectionnee}.csv`, headers, rows)
  }

  function exportStatsCSV() {
    const headers = ['Indicateur', 'Valeur']
    const rows = [
      ['Année', anneeSelectionnee],
      ['Total réservations', totalReservations],
      ['Paiements OK', totalPaye],
      ['En attente', totalAttente],
      ['Annulés', allReservAnnee.filter(r => r.statut_paiement === 'annule').length],
      ['Total places', totalPlaces],
      ['Total inscrits (hors annulés)', totalInscrits],
      ['Taux de remplissage (%)', tauxRemplissage],
      ['CA annuel HT (€)', totalCA],
    ]
    downloadCSV(`stats_${anneeSelectionnee}.csv`, headers, rows)
  }

  // ── CA combiné par mois ─────────────────────────────────────────────────
  const caParMoisCombine: number[] = caParMois.map((ca, i) => ca + caParMoisBoutique[i])
  const maxCACombine = Math.max(...caParMoisCombine, 1)
  const totalCACombine = totalCA + shopCA

  // ── Dates ────────────────────────────────────────────────────────────────
  const fmtDate      = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtDateCourt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fmtHeure     = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">📊</div>
        <p className="font-black text-[#1A1040]">Chargement du tableau de bord...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-candy">

      {/* ── HEADER ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              <LayoutDashboard className="w-7 h-7 text-[#1A1040]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
                🔐 Espace administrateur
              </div>
              <h1 className="font-serif text-3xl font-black text-white">
                TDB <span className="text-citron-400">✦</span>
              </h1>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {/* Sélecteur d'année */}
            <div className="flex items-center gap-1 bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <button
                onClick={() => setAnneeSelectionnee(a => Math.max(a - 1, anneesDisponibles[0] ?? currentYear - 5))}
                disabled={anneeSelectionnee <= (anneesDisponibles[0] ?? currentYear - 5)}
                className="px-3 py-2 text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-citron-400 font-black text-lg">{anneeSelectionnee}</span>
              <button
                onClick={() => setAnneeSelectionnee(a => Math.min(a + 1, currentYear))}
                disabled={anneeSelectionnee >= currentYear}
                className="px-3 py-2 text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Exports CSV */}
            <div className="flex items-center gap-1 bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <span className="pl-3 text-white/50 text-xs font-bold hidden sm:block">CSV</span>
              <button
                onClick={exportReservationsCSV}
                title="Exporter les réservations en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Réservations
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={exportCAMensuelCSV}
                title="Exporter le CA mensuel en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> CA mensuel
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={exportStatsCSV}
                title="Exporter les statistiques en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Stats
              </button>
            </div>

            <button onClick={loadData}
              className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/20 transition-colors">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── ONGLETS VUE ── */}
        <div className="flex gap-2 bg-[#1A1040]/5 rounded-2xl p-1.5 border-2 border-[#1A1040]"
          style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
          {([
            { key: 'global',   icon: '📊', label: 'Vue globale',     sub: 'Ateliers + Magasin' },
            { key: 'ateliers', icon: '🎨', label: 'Ateliers',        sub: 'Prestations de service' },
            { key: 'magasin',  icon: '🛍️', label: 'Magasin',         sub: 'Ventes de biens' },
          ] as { key: Vue; icon: string; label: string; sub: string }[]).map(({ key, icon, label, sub }) => (
            <button key={key} onClick={() => setVue(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-4 rounded-xl transition-all font-black text-sm ${
                vue === key
                  ? 'bg-[#1A1040] text-white shadow-sm'
                  : 'text-[#1A1040]/60 hover:bg-[#1A1040]/10'
              }`}>
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
              <span className={`text-[10px] font-bold ${vue === key ? 'text-white/60' : 'text-[#1A1040]/40'}`}>{sub}</span>
            </button>
          ))}
        </div>

        {/* ── BANNER ARCHIVAGE ── */}
        {showArchiveBanner && anneeAArchiver && (
          <div className="bg-citron-400 border-4 border-[#1A1040] rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <p className="font-black text-[#1A1040] text-lg">Nouvelle année civile !</p>
              <p className="text-[#1A1040]/70 text-sm">
                Les données de <strong>{anneeAArchiver}</strong> ne sont pas encore archivées.
                Archivez-les pour les retrouver dans la page <strong>Archives</strong>.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => archiverAnnee(anneeAArchiver)}
                disabled={isArchiving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-5 py-2.5 rounded-xl text-sm font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-colors disabled:opacity-60"
              >
                <Archive className="w-4 h-4" />
                {isArchiving ? 'Archivage...' : `Archiver ${anneeAArchiver}`}
              </button>
              <button
                onClick={() => setShowArchiveBanner(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-black text-[#1A1040]/60 hover:bg-[#1A1040]/10 transition-colors border-2 border-transparent"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS ARCHIVAGE ── */}
        {archiveSuccess && (
          <div className="bg-lime-300 border-4 border-[#1A1040] rounded-2xl px-6 py-4 flex items-center gap-3"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <span className="text-2xl">✅</span>
            <p className="font-black text-[#1A1040]">Année archivée avec succès ! Consultez-la dans la page Archives.</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── VUE GLOBALE ──────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {vue === 'global' && (<>

          {/* Résumé CA global */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TdbCard cardKey="g_total" bg={tdbColors.g_total} shadow="4px 4px 0px 0px #ffb5c8"
              className="sm:col-span-1 p-6 flex flex-col gap-2"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <span className="text-xs font-black uppercase tracking-wide opacity-60 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> CA total {anneeSelectionnee}</span>
              <div className="text-4xl font-black">{totalCACombine.toLocaleString('fr-FR')} €</div>
              <div className="text-xs font-bold opacity-50">Ateliers + Magasin · Hors taxes</div>
            </TdbCard>
            <TdbCard cardKey="g_ateliers" bg={tdbColors.g_ateliers} shadow="4px 4px 0px 0px #1A1040"
              className="p-6"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wide opacity-70 flex items-center gap-1.5"><span>🎨</span> CA Ateliers</span>
              </div>
              <div className="text-3xl font-black">{totalCA.toLocaleString('fr-FR')} €</div>
              <div className="text-[10px] font-bold opacity-60 mt-1">{totalReservations} réservation{totalReservations > 1 ? 's' : ''} · {tauxRemplissage}% rempli</div>
            </TdbCard>
            <TdbCard cardKey="g_magasin" bg={tdbColors.g_magasin} shadow="4px 4px 0px 0px #1A1040"
              className="p-6"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wide opacity-70 flex items-center gap-1.5"><span>🛍️</span> CA Magasin</span>
              </div>
              <div className="text-3xl font-black">{shopCA.toLocaleString('fr-FR')} €</div>
              <div className="text-[10px] font-bold opacity-60 mt-1">{shopOrdersAnnee.length} commande{shopOrdersAnnee.length > 1 ? 's' : ''}</div>
            </TdbCard>
          </div>

          {/* Alertes en attente */}
          {(totalAttente > 0 || shopEnAttente > 0) && (
            <div className="flex flex-wrap gap-3">
              {totalAttente > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border-2 border-red-400 rounded-xl px-4 py-2.5">
                  <span className="text-red-500 text-lg">🔴</span>
                  <div>
                    <p className="text-xs font-black text-red-600">{totalAttente} réservation{totalAttente > 1 ? 's' : ''} atelier en attente</p>
                    <button onClick={() => setVue('ateliers')} className="text-[10px] text-red-400 font-bold hover:underline">→ Voir les ateliers</button>
                  </div>
                </div>
              )}
              {shopEnAttente > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border-2 border-red-400 rounded-xl px-4 py-2.5">
                  <span className="text-red-500 text-lg">🔴</span>
                  <div>
                    <p className="text-xs font-black text-red-600">{shopEnAttente} commande{shopEnAttente > 1 ? 's' : ''} magasin en attente</p>
                    <button onClick={() => setVue('magasin')} className="text-[10px] text-red-400 font-bold hover:underline">→ Voir le magasin</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Graphique CA combiné mensuel */}
          <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#1A1040] flex items-center gap-2"><TrendingUp className="w-4 h-4" /> CA mensuel combiné — {anneeSelectionnee}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ateliers (rose) + Magasin (violet) par mois</p>
              </div>
              <span className="text-xs bg-[#1A1040]/10 text-[#1A1040] font-black px-3 py-1 rounded-full border border-[#1A1040]/20">
                Total : {totalCACombine.toLocaleString('fr-FR')} €
              </span>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-end gap-1.5 h-40">
                {caParMoisCombine.map((ca, idx) => {
                  const caA = caParMois[idx]
                  const caB = caParMoisBoutique[idx]
                  const hauteur = Math.max(4, Math.round((ca / maxCACombine) * 100))
                  const hauteurA = ca > 0 ? Math.round((caA / ca) * hauteur) : 0
                  const hauteurB = hauteur - hauteurA
                  const estMoisCourant = anneeSelectionnee === currentYear && idx === moisCourant
                  const estVide = ca === 0
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {!estVide && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1A1040] text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none text-center">
                          <div>🎨 {caA.toLocaleString('fr-FR')} €</div>
                          <div>🛍️ {caB.toLocaleString('fr-FR')} €</div>
                        </div>
                      )}
                      <div className="w-full flex flex-col justify-end overflow-hidden rounded-t-lg" style={{ height: `${Math.max(hauteur, 6)}%`, minHeight: '6px' }}>
                        {hauteurA > 0 && (
                          <div className={`w-full ${estMoisCourant ? 'bg-citron-400' : 'bg-rose-400'}`}
                            style={{ height: `${(hauteurA / Math.max(hauteur, 1)) * 100}%` }} />
                        )}
                        {hauteurB > 0 && (
                          <div className={`w-full ${estMoisCourant ? 'bg-citron-300' : 'bg-violet-400'}`}
                            style={{ height: `${(hauteurB / Math.max(hauteur, 1)) * 100}%` }} />
                        )}
                        {estVide && <div className="w-full h-full bg-gray-100 border border-gray-200" />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                {MOIS_FR.map((mois, idx) => (
                  <div key={idx} className="flex-1 text-center">
                    <span className={`text-[10px] font-black ${anneeSelectionnee === currentYear && idx === moisCourant ? 'text-[#1A1040]' : 'text-gray-400'}`}>{mois}</span>
                    {caParMoisCombine[idx] > 0 && (
                      <div className="text-[9px] text-gray-400 font-bold truncate">
                        {caParMoisCombine[idx] >= 1000 ? `${(caParMoisCombine[idx] / 1000).toFixed(1)}k` : caParMoisCombine[idx]}€
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-400 rounded-sm" /><span className="text-xs text-gray-500 font-bold">Ateliers</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-violet-400 rounded-sm" /><span className="text-xs text-gray-500 font-bold">Magasin</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-citron-400 border border-[#1A1040] rounded-sm" /><span className="text-xs text-gray-500 font-bold">Mois en cours</span></div>
              </div>
            </div>
          </div>

        </>)}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── VUE ATELIERS ─────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {vue === 'ateliers' && (<>

          {/* Stats ateliers */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <TdbCard cardKey="a_reservations" bg={tdbColors.a_reservations} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">Réservations</span><Users className="w-5 h-5 opacity-70" /></div>
              <div className="text-3xl font-black">{totalReservations}</div>
            </TdbCard>
            <TdbCard cardKey="a_remplissage" bg={tdbColors.a_remplissage} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">Remplissage</span><span className="text-lg">🎯</span></div>
              <div className="text-3xl font-black">{tauxRemplissage}%</div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: `${textColorFor(tdbColors.a_remplissage)}33` }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${tauxRemplissage}%`, background: textColorFor(tdbColors.a_remplissage) }} />
              </div>
              <div className="text-[10px] font-bold opacity-60 mt-1">{totalInscrits}/{totalPlaces} places</div>
            </TdbCard>
            <TdbCard cardKey="a_paiements" bg={tdbColors.a_paiements} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">Paiements OK</span><span className="text-lg">✅</span></div>
              <div className="text-3xl font-black">{totalPaye}</div>
            </TdbCard>
            <TdbCard cardKey="a_attente_at" bg={tdbColors.a_attente_at} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">En attente</span><span className="text-lg">🔴</span></div>
              <div className="text-3xl font-black">{totalAttente}</div>
            </TdbCard>
            <TdbCard cardKey="a_ca" bg={tdbColors.a_ca} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">CA annuel HT</span><Euro className="w-5 h-5 opacity-70" /></div>
              <div className="text-3xl font-black">{totalCALabel} €</div>
              <div className="text-[10px] font-bold opacity-70 mt-1">Hors taxes</div>
            </TdbCard>
          </div>

          {/* Graphique CA ateliers */}
          <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#1A1040] flex items-center gap-2"><TrendingUp className="w-4 h-4" /> CA ateliers mensuel — {anneeSelectionnee}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Chiffre d'affaires encaissé mois par mois (hors taxes)</p>
              </div>
              <span className="text-xs bg-rose-100 text-rose-600 font-black px-3 py-1 rounded-full border border-rose-200">Total : {totalCALabel} € HT</span>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-end gap-1.5 h-40">
                {caParMois.map((ca, idx) => {
                  const hauteur = Math.max(4, Math.round((ca / maxCA) * 100))
                  const estMoisCourant = anneeSelectionnee === currentYear && idx === moisCourant
                  const estVide = ca === 0
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {!estVide && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1A1040] text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          {ca.toLocaleString('fr-FR')} €
                        </div>
                      )}
                      <div className={`w-full rounded-t-lg transition-all duration-500 ${estMoisCourant ? 'bg-citron-400 border-2 border-[#1A1040]' : estVide ? 'bg-gray-100 border border-gray-200' : 'bg-rose-400 group-hover:bg-rose-500'}`}
                        style={{ height: `${hauteur}%`, minHeight: '6px' }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                {MOIS_FR.map((mois, idx) => (
                  <div key={idx} className="flex-1 text-center">
                    <span className={`text-[10px] font-black ${anneeSelectionnee === currentYear && idx === moisCourant ? 'text-[#1A1040]' : 'text-gray-400'}`}>{mois}</span>
                    {caParMois[idx] > 0 && <div className="text-[9px] text-gray-400 font-bold truncate">{caParMois[idx] >= 1000 ? `${(caParMois[idx]/1000).toFixed(1)}k` : caParMois[idx]}€</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-2xl border-2 border-[#1A1040] p-4 space-y-4" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-black text-[#1A1040] flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Période :</span>
              {[
                { value: 'avenir', label: '🔮 À venir',    activeStyle: 'bg-[#1A1040] text-citron-400 border-[#1A1040]' },
                { value: 'passes', label: '📁 Passés',     activeStyle: 'bg-gray-600 text-white border-gray-600' },
                { value: 'tous',   label: 'Tout afficher', activeStyle: 'bg-turquoise-400 text-[#1A1040] border-turquoise-400' },
              ].map(({ value, label, activeStyle }) => (
                <button key={value} onClick={() => setFilterPeriode(value as typeof filterPeriode)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${filterPeriode === value ? activeStyle : 'bg-white text-[#1A1040] border-[#1A1040] hover:bg-candy'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-black text-[#1A1040] flex items-center gap-1.5"><Euro className="w-4 h-4" /> Paiement :</span>
              {[
                { value: 'tous',       label: 'Tous',          style: 'bg-[#1A1040] text-white border-[#1A1040]' },
                { value: 'paye',       label: '✅ Payé',       style: 'bg-lime-300 text-[#1A1040] border-lime-400' },
                { value: 'en_attente', label: '🔴 En attente', style: 'bg-red-500 text-white border-red-500' },
                { value: 'annule',     label: '❌ Annulé',     style: 'bg-gray-400 text-white border-gray-400' },
              ].map(({ value, label, style }) => (
                <button key={value} onClick={() => setFilterStatut(value)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${filterStatut === value ? style : 'bg-white text-[#1A1040] border-[#1A1040] hover:bg-candy'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tableaux par atelier */}
          {ateliersFiltres.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-4 border-[#1A1040]" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
              <div className="text-6xl mb-4">{filterPeriode === 'avenir' ? '🔮' : filterPeriode === 'passes' ? '📁' : '📭'}</div>
              <p className="font-black text-[#1A1040] text-xl">
                {ateliersDeLAnnee.length === 0 ? `Aucun atelier en ${anneeSelectionnee}.`
                  : filterPeriode === 'avenir' ? 'Aucun atelier à venir.'
                  : filterPeriode === 'passes' ? 'Aucun atelier passé.'
                  : 'Aucun atelier.'}
              </p>
            </div>
          ) : ateliersFiltres.map(atelier => {
            const reservsFiltrees = atelier.reservations.filter(r => filterStatut === 'tous' || r.statut_paiement === filterStatut)
            const nbPaye      = atelier.reservations.filter(r => r.statut_paiement === 'paye').length
            const caAtelier   = nbPaye * atelier.prix
            const nbInscrits  = atelier.reservations.filter(r => r.statut_paiement !== 'annule').length
            const tauxAtelier = atelier.places_max > 0 ? Math.round((nbInscrits / atelier.places_max) * 100) : 0
            const isOpen      = !collapsed[atelier.id]
            const nbPresents  = atelier.reservations.filter(r => presences.has(r.id)).length
            const dateAtelier = new Date(atelier.date); dateAtelier.setHours(0, 0, 0, 0)
            const isPasse     = dateAtelier < today

            return (
              <div key={atelier.id} className={`bg-white rounded-3xl border-4 overflow-hidden ${isPasse ? 'border-gray-300 opacity-80' : 'border-[#1A1040]'}`}
                style={{ boxShadow: isPasse ? '5px 5px 0px 0px #d1d5db' : '5px 5px 0px 0px #ffb5c8' }}>
                <button className={`w-full px-6 py-4 flex items-center gap-4 transition-colors ${isPasse ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#1A1040] hover:bg-[#2d2060]'}`}
                  onClick={() => setCollapsed(p => ({ ...p, [atelier.id]: !p[atelier.id] }))}>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 text-left">
                    <div className="flex items-center gap-2">
                      {isPasse && <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Passé</span>}
                      <h2 className="font-serif text-lg font-black text-white">🎨 {atelier.titre}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 bg-white/10 text-gray-300 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Calendar className="w-3 h-3" /><span className="capitalize">{fmtDate(atelier.date)}</span>
                      </span>
                      <span className="bg-white/10 text-gray-300 px-2.5 py-1 rounded-full text-xs font-bold">🕐 {atelier.heure} · {atelier.duree}</span>
                      <span className="bg-citron-400/20 text-citron-400 px-2.5 py-1 rounded-full text-xs font-bold">👥 {nbInscrits}/{atelier.places_max} — {tauxAtelier}% rempli</span>
                      {nbPresents > 0 && <span className="bg-lime-300/30 text-lime-300 px-2.5 py-1 rounded-full text-xs font-bold">✅ {nbPresents} présent{nbPresents > 1 ? 's' : ''}</span>}
                      <span className="bg-lime-300/20 text-lime-400 px-2.5 py-1 rounded-full text-xs font-bold">💶 {caAtelier} € HT</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-white shrink-0" /> : <ChevronDown className="w-5 h-5 text-white shrink-0" />}
                </button>
                {isOpen && (
                  <div className="overflow-x-auto">
                    {reservsFiltrees.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p className="text-3xl mb-2">📭</p>
                        <p className="text-sm font-bold">{atelier.reservations.length === 0 ? 'Aucune réservation.' : 'Aucune réservation pour ce filtre.'}</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-candy border-b-2 border-[#1A1040]">
                            <th className="px-4 py-3 text-left text-xs font-black text-[#1A1040] uppercase tracking-wide whitespace-nowrap">✅ Présent·e</th>
                            {['Prénom','Nom','Âge','Email','Téléphone','Inscrit le','Mode paiement','Statut paiement'].map(col => (
                              <th key={col} className="px-4 py-3 text-left text-xs font-black text-[#1A1040] uppercase tracking-wide whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reservsFiltrees.map((r, idx) => {
                            const estPresent = presences.has(r.id)
                            return (
                              <tr key={r.id} className={`border-b border-gray-100 transition-colors ${estPresent ? 'bg-lime-50 hover:bg-lime-100/70' : idx % 2 === 0 ? 'bg-white hover:bg-rose-50/50' : 'bg-candy/50 hover:bg-rose-50/50'}`}>
                                <td className="px-4 py-3 text-center">
                                  <label className="flex items-center justify-center cursor-pointer group">
                                    <input type="checkbox" checked={estPresent} onChange={() => togglePresence(r.id)} className="sr-only" />
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${estPresent ? 'bg-lime-400 border-lime-500' : 'bg-white border-gray-300 group-hover:border-[#1A1040]'}`}>
                                      {estPresent && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                  </label>
                                </td>
                                <td className="px-4 py-3 font-bold text-[#1A1040] whitespace-nowrap">{r.prenom}</td>
                                <td className="px-4 py-3 font-bold text-[#1A1040] whitespace-nowrap">{r.nom}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.age || '—'}</td>
                                <td className="px-4 py-3 text-gray-600">{r.email}</td>
                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.telephone || '—'}</td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                  {fmtDateCourt(r.created_at)}<br/><span className="text-gray-400">{fmtHeure(r.created_at)}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${MODE_STYLE[r.mode_paiement] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                    {MODE_LABEL[r.mode_paiement] || r.mode_paiement}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <select value={r.statut_paiement} disabled={updatingId === r.id} onChange={e => updateStatut(r.id, e.target.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-[#1A1040] transition-all ${r.statut_paiement === 'paye' ? 'bg-lime-100 text-lime-700 border-lime-400' : r.statut_paiement === 'en_attente' ? 'bg-red-100 text-red-600 border-red-400' : 'bg-gray-100 text-gray-500 border-gray-300'} ${updatingId === r.id ? 'opacity-50 cursor-wait' : ''}`}>
                                    {STATUT_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.value === 'paye' ? '✅ Payé' : opt.value === 'en_attente' ? '🔴 En attente' : '❌ Annulé'}</option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className={`border-t-2 ${isPasse ? 'bg-gray-600' : 'bg-[#1A1040]'}`}>
                            <td className="px-4 py-3">
                              <span className="text-lime-300 text-xs font-black whitespace-nowrap">
                                {nbPresents > 0 ? `✅ ${nbPresents}/${reservsFiltrees.length}` : <span className="text-white/40">—</span>}
                              </span>
                            </td>
                            <td colSpan={5} className="px-4 py-3 text-white text-xs font-black">{reservsFiltrees.length} participant{reservsFiltrees.length > 1 ? 's' : ''}</td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {(['carte','cheque','especes'] as const).map(mode => {
                                  const n = reservsFiltrees.filter(r => r.mode_paiement === mode).length
                                  return n ? <span key={mode} className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${MODE_STYLE[mode]}`}>{n} {mode}</span> : null
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-lime-400 font-black text-sm">
                                {reservsFiltrees.filter(r => r.statut_paiement === 'paye').length} payé{reservsFiltrees.filter(r => r.statut_paiement === 'paye').length > 1 ? 's' : ''}
                                {' · '}
                                <span className="text-citron-400">{reservsFiltrees.filter(r => r.statut_paiement === 'paye').length * atelier.prix} € HT</span>
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Archiver */}
          {anneeSelectionnee < currentYear && !showArchiveBanner && (
            <div className="text-center pt-4">
              <button onClick={() => archiverAnnee(anneeSelectionnee)} disabled={isArchiving}
                className="inline-flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-colors disabled:opacity-60"
                style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
                <Archive className="w-4 h-4" />
                {isArchiving ? 'Archivage en cours...' : `Archiver l'année ${anneeSelectionnee}`}
              </button>
            </div>
          )}

        </>)}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── VUE MAGASIN ──────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {vue === 'magasin' && (<>

          {/* Stats boutique */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TdbCard cardKey="m_commandes" bg={tdbColors.m_commandes} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">Commandes</span><ShoppingBag className="w-5 h-5 opacity-70" /></div>
              <div className="text-3xl font-black">{shopOrdersAnnee.length}</div>
            </TdbCard>
            <TdbCard cardKey="m_attente_mag" bg={tdbColors.m_attente_mag} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">En attente</span><span className="text-lg">🔴</span></div>
              <div className="text-3xl font-black">{shopEnAttente}</div>
            </TdbCard>
            <TdbCard cardKey="m_payees" bg={tdbColors.m_payees} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">Payées / expédiées</span><span className="text-lg">✅</span></div>
              <div className="text-3xl font-black">{shopPayees}</div>
            </TdbCard>
            <TdbCard cardKey="m_ca" bg={tdbColors.m_ca} className="p-5"
              editingCard={editingCard} setEditingCard={setEditingCard} onSave={saveCardColor}>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase tracking-wide opacity-70">CA boutique</span><Euro className="w-5 h-5 opacity-70" /></div>
              <div className="text-3xl font-black">{shopCA.toLocaleString('fr-FR')} €</div>
            </TdbCard>
          </div>

          {/* Graphique CA boutique */}
          <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
            <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#1A1040] flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> CA boutique mensuel — {anneeSelectionnee}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Commandes payées / expédiées / retirées</p>
              </div>
              <span className="text-xs bg-violet-100 text-violet-600 font-black px-3 py-1 rounded-full border border-violet-200">Total : {shopCA.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-end gap-1.5 h-32">
                {caParMoisBoutique.map((ca, idx) => {
                  const hauteur = Math.max(4, Math.round((ca / maxCABoutique) * 100))
                  const estMoisCourant = anneeSelectionnee === currentYear && idx === moisCourant
                  const estVide = ca === 0
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {!estVide && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1A1040] text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          {ca.toLocaleString('fr-FR')} €
                        </div>
                      )}
                      <div className={`w-full rounded-t-lg transition-all duration-500 ${estMoisCourant ? 'bg-citron-400 border-2 border-[#1A1040]' : estVide ? 'bg-gray-100 border border-gray-200' : 'bg-violet-400 group-hover:bg-violet-500'}`}
                        style={{ height: `${hauteur}%`, minHeight: '6px' }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                {MOIS_FR.map((mois, idx) => (
                  <div key={idx} className="flex-1 text-center">
                    <span className={`text-[10px] font-black ${anneeSelectionnee === currentYear && idx === moisCourant ? 'text-[#1A1040]' : 'text-gray-400'}`}>{mois}</span>
                    {caParMoisBoutique[idx] > 0 && <div className="text-[9px] text-gray-400 font-bold truncate">{caParMoisBoutique[idx] >= 1000 ? `${(caParMoisBoutique[idx]/1000).toFixed(1)}k` : caParMoisBoutique[idx]}€</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tableau commandes */}
          {shopOrdersAnnee.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-[#1A1040] py-12 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-black text-gray-400">Aucune commande boutique en {anneeSelectionnee}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
              <div className="px-5 py-3 border-b-2 border-[#1A1040] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1A1040]" />
                <h3 className="text-sm font-black text-[#1A1040] uppercase tracking-wide">Commandes {anneeSelectionnee}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-candy border-b-2 border-[#1A1040]">
                      {['Date', 'Client', 'Mode', 'Articles', 'Total', 'Statut'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-black text-[#1A1040] uppercase tracking-wide whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shopOrdersAnnee.map((order, idx) => {
                      const date = new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      const statutInfo = SHOP_STATUTS.find(s => s.value === order.statut)
                      return (
                        <tr key={order.id} className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-rose-50/40' : 'bg-candy/30 hover:bg-rose-50/40'}`}>
                          <td className="px-4 py-3 text-xs text-gray-400 font-bold whitespace-nowrap">{date}</td>
                          <td className="px-4 py-3">
                            <div className="font-black text-[#1A1040] text-sm whitespace-nowrap">{order.client_prenom} {order.client_nom}</div>
                            <div className="text-xs text-gray-400">{order.client_email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {order.mode_livraison === 'mondial_relay'
                              ? <span className="flex items-center gap-1 text-xs font-bold text-blue-600"><Package className="w-3 h-3" /> Mondial Relay</span>
                              : <span className="flex items-center gap-1 text-xs font-bold text-violet-600"><Store className="w-3 h-3" /> Click & Collect</span>}
                            {order.relay_nom && <div className="text-xs text-gray-400 truncate max-w-[140px]">{order.relay_nom}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {order.articles.slice(0, 2).map((a, i) => (
                                <div key={i} className="text-xs text-gray-600 whitespace-nowrap">{a.name} ×{a.quantity}</div>
                              ))}
                              {order.articles.length > 2 && <div className="text-xs text-gray-400">+{order.articles.length - 2} article{order.articles.length - 2 > 1 ? 's' : ''}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-black text-[#1A1040] whitespace-nowrap">{formatPrice(order.total)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select value={order.statut} onChange={e => updateShopStatut(order.id, e.target.value)}
                              className={`text-xs font-black border-2 rounded-xl px-2 py-1 focus:outline-none cursor-pointer ${statutInfo?.style ?? 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                              {SHOP_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1A1040]">
                      <td colSpan={4} className="px-4 py-3 text-white text-xs font-black">{shopOrdersAnnee.length} commande{shopOrdersAnnee.length > 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 text-citron-400 font-black text-sm">{shopCA.toLocaleString('fr-FR')} €</td>
                      <td className="px-4 py-3">{shopEnAttente > 0 && <span className="text-xs font-black text-red-300">⚠️ {shopEnAttente} en attente</span>}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </>)}

      </div>
    </main>
  )
}
