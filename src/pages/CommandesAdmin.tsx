import { useState, useEffect } from 'react'
import { RefreshCw, Package, Store, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/shop'

interface Article { product_id: string; name: string; price: number; quantity: number }

interface ShopOrder {
  id: string
  client_prenom: string
  client_nom: string
  client_email: string
  client_telephone: string
  mode_livraison: 'mondial_relay' | 'click_and_collect'
  relay_nom: string | null
  relay_adresse: string | null
  relay_cp: string | null
  relay_ville: string | null
  articles: Article[]
  sous_total: number
  frais_livraison: number
  remise: number
  total: number
  code_promo: string | null
  stripe_payment_intent_id: string | null
  statut: string
  notes: string | null
  created_at: string
}

const STATUTS = [
  { value: 'en_attente', label: '🔴 En attente',  style: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'paye',       label: '✅ Payé',         style: 'bg-lime-100 text-lime-700 border-lime-400' },
  { value: 'expedie',    label: '📦 Expédié',      style: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'retire',     label: '🏪 Retiré',       style: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'annule',     label: '❌ Annulé',       style: 'bg-gray-100 text-gray-500 border-gray-300' },
] as const

function statutStyle(s: string) {
  return STATUTS.find(x => x.value === s)?.style ?? 'bg-gray-100 text-gray-500 border-gray-300'
}

function OrderRow({ order, onStatutChange }: { order: ShopOrder; onStatutChange: (id: string, s: string) => void }) {
  const [open,      setOpen]      = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [notes,     setNotes]     = useState(order.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [showStripe, setShowStripe] = useState(false)

  const date = new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  async function saveNotes() {
    setSavingNote(true)
    await supabase.from('shop_orders').update({ notes }).eq('id', order.id)
    setSavingNote(false)
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border-2 border-[#1A1040] overflow-hidden bg-white" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
      {/* ── Ligne principale ── */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Date */}
        <span className="text-xs text-gray-400 font-bold shrink-0 w-36">{date}</span>

        {/* Client */}
        <div className="flex-1 min-w-0">
          <div className="font-black text-[#1A1040] text-sm">{order.client_prenom} {order.client_nom}</div>
          <div className="text-xs text-gray-400">{order.client_email}</div>
        </div>

        {/* Mode livraison */}
        <div className="flex items-center gap-1.5 shrink-0">
          {order.mode_livraison === 'mondial_relay'
            ? <><Package className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-bold text-blue-600">Mondial Relay</span></>
            : <><Store  className="w-3.5 h-3.5 text-citron-500"/><span className="text-xs font-bold text-citron-600">Click & Collect</span></>
          }
        </div>

        {/* Total */}
        <span className="font-black text-[#1A1040] shrink-0">{formatPrice(order.total)}</span>

        {/* Statut (dropdown inline) */}
        <select
          value={order.statut}
          onChange={e => onStatutChange(order.id, e.target.value)}
          className={`text-xs font-black border-2 rounded-xl px-2 py-1 focus:outline-none cursor-pointer shrink-0 ${statutStyle(order.statut)}`}>
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Détails toggle */}
        <button onClick={() => setOpen(p => !p)} className="w-7 h-7 rounded-lg border-2 border-[#1A1040]/20 flex items-center justify-center hover:bg-candy shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Détails ── */}
      {open && (
        <div className="border-t-2 border-dashed border-[#1A1040]/10 px-4 py-4 bg-candy/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Articles */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2">Articles</div>
              {order.articles.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{a.name} ×{a.quantity}</span>
                  <span className="font-bold text-[#1A1040]">{formatPrice(a.price * a.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-[#1A1040]/10 pt-1 mt-1 space-y-0.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(order.sous_total)}</span></div>
                {order.remise > 0 && <div className="flex justify-between text-green-600"><span>Réduction {order.code_promo && `(${order.code_promo})`}</span><span>-{formatPrice(order.remise)}</span></div>}
                <div className="flex justify-between"><span>Livraison</span><span>{order.frais_livraison > 0 ? formatPrice(order.frais_livraison) : 'Gratuit'}</span></div>
                <div className="flex justify-between font-black text-[#1A1040] text-sm border-t border-[#1A1040]/10 pt-1 mt-1"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>
            </div>

            {/* Livraison + contact */}
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Contact</div>
                <div className="text-sm font-bold text-[#1A1040]">{order.client_prenom} {order.client_nom}</div>
                <div className="text-xs text-gray-500">{order.client_email}</div>
                <div className="text-xs text-gray-500">{order.client_telephone}</div>
              </div>
              {order.mode_livraison === 'mondial_relay' && order.relay_nom && (
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Point relais</div>
                  <div className="text-sm font-bold text-[#1A1040]">{order.relay_nom}</div>
                  <div className="text-xs text-gray-500">{order.relay_adresse}</div>
                  <div className="text-xs text-gray-500">{order.relay_cp} {order.relay_ville}</div>
                </div>
              )}
              {order.stripe_payment_intent_id && (
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Stripe</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">
                      {showStripe ? order.stripe_payment_intent_id : '••••••••••••••'}
                    </span>
                    <button onClick={() => setShowStripe(p => !p)} className="text-gray-400 hover:text-[#1A1040]">
                      {showStripe ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Notes internes</div>
            {editing ? (
              <div className="flex gap-2">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none resize-none" />
                <div className="flex flex-col gap-2">
                  <button onClick={saveNotes} disabled={savingNote}
                    className="px-3 py-1.5 bg-[#1A1040] text-citron-400 rounded-xl text-xs font-black disabled:opacity-50">
                    {savingNote ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'OK'}
                  </button>
                  <button onClick={() => { setEditing(false); setNotes(order.notes || '') }}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-50">
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}
                className="w-full text-left text-sm text-gray-400 italic border-2 border-dashed border-gray-200 rounded-xl px-3 py-2 hover:border-[#1A1040] hover:text-[#1A1040] transition-all">
                {notes || 'Cliquer pour ajouter une note…'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CommandesAdmin() {
  const [orders,       setOrders]       = useState<ShopOrder[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterMode,   setFilterMode]   = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('shop_orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders((data as ShopOrder[]) || [])
    setLoading(false)
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('shop_orders').update({ statut }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, statut } : o))
  }

  const filtered = orders.filter(o => {
    if (filterStatut !== 'all' && o.statut !== filterStatut) return false
    if (filterMode   !== 'all' && o.mode_livraison !== filterMode) return false
    return true
  })

  const stats = {
    total:      orders.length,
    en_attente: orders.filter(o => o.statut === 'en_attente').length,
    paye:       orders.filter(o => o.statut === 'paye').length,
    ca:         orders.filter(o => ['paye', 'expedie', 'retire'].includes(o.statut)).reduce((s, o) => s + o.total, 0),
  }

  return (
    <main className="flex-1 bg-candy min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif font-black text-3xl text-[#1A1040]">📦 Commandes boutique</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">{orders.length} commande{orders.length !== 1 ? 's' : ''} au total</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-2.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,      color: 'bg-white' },
            { label: 'En attente', value: stats.en_attente, color: 'bg-red-50' },
            { label: 'Payées',     value: stats.paye,       color: 'bg-lime-50' },
            { label: 'CA encaissé',value: formatPrice(stats.ca), color: 'bg-citron-50' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl border-2 border-[#1A1040] p-4`} style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wide">{s.label}</div>
              <div className="font-black text-[#1A1040] text-2xl mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-3 flex-wrap">
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-none">
            <option value="all">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            className="border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-none">
            <option value="all">Tous les modes</option>
            <option value="mondial_relay">📦 Mondial Relay</option>
            <option value="click_and_collect">🏪 Click & Collect</option>
          </select>
          {(filterStatut !== 'all' || filterMode !== 'all') && (
            <button onClick={() => { setFilterStatut('all'); setFilterMode('all') }}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors px-2">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-16"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#1A1040]/30" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-black text-lg">Aucune commande{filterStatut !== 'all' || filterMode !== 'all' ? ' pour ces filtres' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderRow key={order.id} order={order} onStatutChange={updateStatut} />
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
