import { useState, useEffect } from 'react'
import { Tag, Plus, Pencil, Trash2, Check, X, RefreshCw, Percent, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ShopCategory, ShopPromotion, ShopPromoCode } from '../lib/shop'
import { formatPrice } from '../lib/shop'

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center gap-3 bg-candy">
      {icon}<div>
        <h2 className="font-black text-[#1A1040] text-sm">{title}</h2>
        <p className="text-[10px] text-gray-400 font-bold">{sub}</p>
      </div>
    </div>
  )
}

// ─── Modal Promotion ──────────────────────────────────────────────────────────
function PromoModal({ promo, categories, onSave, onClose }: {
  promo?: ShopPromotion | null; categories: ShopCategory[]; onSave:()=>void; onClose:()=>void
}) {
  const [name, setName]             = useState(promo?.name || '')
  const [discType, setDiscType]     = useState<'percentage'|'fixed'>(promo?.discount_type || 'percentage')
  const [discValue, setDiscValue]   = useState(promo?.discount_value?.toString() || '')
  const [appliesTo, setAppliesTo]   = useState(promo?.applies_to || 'all')
  const [targetId, setTargetId]     = useState(promo?.target_id || '')
  const [startDate, setStartDate]   = useState(promo?.start_date ? promo.start_date.slice(0,16) : '')
  const [endDate, setEndDate]       = useState(promo?.end_date   ? promo.end_date.slice(0,16) : '')
  const [isActive, setIsActive]     = useState(promo?.is_active ?? true)
  const [saving, setSaving]         = useState(false)

  async function save() {
    if (!name.trim() || !discValue) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      discount_type: discType,
      discount_value: parseFloat(discValue),
      applies_to: appliesTo,
      target_id: (appliesTo !== 'all' && targetId) ? targetId : null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      is_active: isActive,
    }
    if (promo) { await supabase.from('shop_promotions').update(payload).eq('id', promo.id) }
    else        { await supabase.from('shop_promotions').insert(payload) }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md my-4" style={{ boxShadow:'6px 6px 0px 0px #fb7185' }}>
        <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy">
          <h3 className="font-black text-[#1A1040]">{promo ? 'Modifier la promotion' : 'Nouvelle promotion'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Nom de la promotion *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Soldes d'hiver"
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"/>
          </div>
          {/* Type de remise */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Type de remise</label>
            <div className="flex gap-2">
              {[{v:'percentage',l:'% Pourcentage',icon:<Percent className="w-4 h-4"/>},{v:'fixed',l:'€ Montant fixe',icon:<DollarSign className="w-4 h-4"/>}].map(({v,l,icon})=>(
                <button key={v} onClick={()=>setDiscType(v as typeof discType)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-black text-xs transition-all ${discType===v ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                  {icon}{l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Valeur *</label>
            <input type="number" min="0" step="0.01" value={discValue} onChange={e=>setDiscValue(e.target.value)}
              placeholder={discType==='percentage'?'Ex: 20 (= 20%)':'Ex: 5 (= 5€)'}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"/>
          </div>
          {/* Portée */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">S'applique à</label>
            <select value={appliesTo} onChange={e=>setAppliesTo(e.target.value as typeof appliesTo)}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none bg-white">
              <option value="all">Tous les produits</option>
              <option value="category">Une catégorie</option>
              <option value="product">Un produit spécifique</option>
            </select>
          </div>
          {appliesTo !== 'all' && (
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">
                {appliesTo==='category' ? 'Catégorie ciblée' : 'Produit ciblé (ID)'}
              </label>
              {appliesTo === 'category' ? (
                <select value={targetId} onChange={e=>setTargetId(e.target.value)}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none bg-white">
                  <option value="">— Choisir —</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="UUID du produit"
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"/>
              )}
            </div>
          )}
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Début</label>
              <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fin</label>
              <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"/>
            </div>
          </div>
          {/* Actif */}
          <div className="flex items-center gap-3">
            <button onClick={()=>setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors relative ${isActive?'bg-green-400':'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white border-2 border-[#1A1040] absolute top-0 transition-transform ${isActive?'translate-x-6':'translate-x-0'}`}/>
            </button>
            <span className="text-sm font-black text-[#1A1040]">{isActive ? 'Promotion active' : 'Promotion inactive'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
            <button onClick={save} disabled={saving||!name.trim()||!discValue}
              className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving?<RefreshCw className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>} {promo?'Modifier':'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Code Promo ─────────────────────────────────────────────────────────
function CodeModal({ code, onSave, onClose }: {
  code?: ShopPromoCode | null; onSave:()=>void; onClose:()=>void
}) {
  const [codeStr, setCodeStr]       = useState(code?.code || '')
  const [discType, setDiscType]     = useState<'percentage'|'fixed'>(code?.discount_type || 'percentage')
  const [discValue, setDiscValue]   = useState(code?.discount_value?.toString() || '')
  const [minOrder, setMinOrder]     = useState(code?.min_order?.toString() || '0')
  const [maxUses, setMaxUses]       = useState(code?.max_uses?.toString() || '')
  const [startDate, setStartDate]   = useState(code?.start_date ? code.start_date.slice(0,16) : '')
  const [endDate, setEndDate]       = useState(code?.end_date ? code.end_date.slice(0,16) : '')
  const [isActive, setIsActive]     = useState(code?.is_active ?? true)
  const [saving, setSaving]         = useState(false)

  async function save() {
    if (!codeStr.trim() || !discValue) return
    setSaving(true)
    const payload = {
      code: codeStr.toUpperCase().trim(),
      discount_type: discType,
      discount_value: parseFloat(discValue),
      min_order: parseFloat(minOrder) || 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      is_active: isActive,
    }
    if (code) { await supabase.from('shop_promo_codes').update(payload).eq('id', code.id) }
    else       { await supabase.from('shop_promo_codes').insert(payload) }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md my-4" style={{ boxShadow:'6px 6px 0px 0px #ffe500' }}>
        <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy">
          <h3 className="font-black text-[#1A1040]">{code ? 'Modifier le code' : 'Nouveau code promo'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Code *</label>
            <input value={codeStr} onChange={e=>setCodeStr(e.target.value.toUpperCase())} placeholder="Ex: PROMO20"
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-citron-400"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Type de remise</label>
            <div className="flex gap-2">
              {[{v:'percentage',l:'%'},{v:'fixed',l:'€'}].map(({v,l})=>(
                <button key={v} onClick={()=>setDiscType(v as typeof discType)}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-black text-sm transition-all ${discType===v?'bg-[#1A1040] text-citron-400 border-[#1A1040]':'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Valeur *</label>
              <input type="number" min="0" step="0.01" value={discValue} onChange={e=>setDiscValue(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Min. commande (€)</label>
              <input type="number" min="0" step="0.01" value={minOrder} onChange={e=>setMinOrder(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400"/>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Utilisation max (vide = illimité)</label>
            <input type="number" min="1" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="Illimité"
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Début</label>
              <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fin</label>
              <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"/>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors relative ${isActive?'bg-green-400':'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white border-2 border-[#1A1040] absolute top-0 transition-transform ${isActive?'translate-x-6':'translate-x-0'}`}/>
            </button>
            <span className="text-sm font-black text-[#1A1040]">{isActive ? 'Code actif' : 'Code inactif'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
            <button onClick={save} disabled={saving||!codeStr.trim()||!discValue}
              className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving?<RefreshCw className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>} {code?'Modifier':'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromosAdmin() {
  const [tab, setTab]             = useState<'promotions'|'codes'>('promotions')
  const [promotions, setPromos]   = useState<ShopPromotion[]>([])
  const [codes, setCodes]         = useState<ShopPromoCode[]>([])
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [loading, setLoading]     = useState(true)
  const [editPromo, setEditPromo] = useState<ShopPromotion | null | undefined>(undefined)
  const [editCode, setEditCode]   = useState<ShopPromoCode | null | undefined>(undefined)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: promos }, { data: cds }, { data: cats }] = await Promise.all([
      supabase.from('shop_promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_categories').select('*').order('name'),
    ])
    setPromos((promos as ShopPromotion[]) || [])
    setCodes((cds as ShopPromoCode[]) || [])
    setCategories((cats as ShopCategory[]) || [])
    setLoading(false)
  }

  async function togglePromo(p: ShopPromotion) {
    await supabase.from('shop_promotions').update({ is_active: !p.is_active }).eq('id', p.id); loadAll()
  }
  async function deletePromo(id: string) {
    await supabase.from('shop_promotions').delete().eq('id', id); loadAll()
  }
  async function toggleCode(c: ShopPromoCode) {
    await supabase.from('shop_promo_codes').update({ is_active: !c.is_active }).eq('id', c.id); loadAll()
  }
  async function deleteCode(id: string) {
    await supabase.from('shop_promo_codes').delete().eq('id', id); loadAll()
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—'
  const isNowActive = (p: ShopPromotion | ShopPromoCode) => {
    if (!p.is_active) return false
    const now = new Date()
    if (p.start_date && new Date(p.start_date) > now) return false
    if (p.end_date && new Date(p.end_date) < now) return false
    return true
  }

  return (
    <main className="flex-1 bg-candy">
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-400 rounded-2xl flex items-center justify-center border-2 border-rose-300" style={{ boxShadow:'3px 3px 0px 0px #ffe500' }}>
            <Tag className="w-7 h-7 text-white"/>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Promotions & Codes promo <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* TABS */}
        <div className="flex gap-2">
          {[{id:'promotions',label:'🏷️ Promotions'},{id:'codes',label:'🎟️ Codes promo'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm border-2 transition-all ${tab===t.id?'bg-[#1A1040] text-citron-400 border-[#1A1040]':'bg-white text-[#1A1040] border-[#1A1040] hover:bg-candy'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ PROMOTIONS ═══ */}
        {tab === 'promotions' && (
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #fb7185' }}>
            <SectionHeader icon={<Tag className="w-5 h-5 text-[#1A1040]"/>} title="Promotions automatiques" sub="Réductions appliquées automatiquement sur les produits" />
            <div className="p-6 space-y-4">
              <button onClick={()=>setEditPromo(null)}
                className="flex items-center gap-2 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl font-black border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                style={{ boxShadow:'2px 2px 0px 0px #1A1040' }}>
                <Plus className="w-4 h-4"/> Nouvelle promotion
              </button>

              {loading ? (
                <div className="text-center py-8 text-gray-400 font-black">Chargement…</div>
              ) : promotions.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                  <p className="font-black">Aucune promotion — créez-en une !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {promotions.map(p => (
                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${isNowActive(p)?'border-green-400 bg-green-50':'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-[#1A1040]">{p.name}</span>
                          {isNowActive(p) && <span className="text-[10px] font-black text-green-700 bg-green-200 px-2 py-0.5 rounded-full">EN COURS</span>}
                          {!p.is_active && <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">INACTIF</span>}
                        </div>
                        <div className="text-sm font-bold text-rose-600 mt-0.5">
                          {p.discount_type==='percentage' ? `-${p.discount_value}%` : `-${formatPrice(p.discount_value)}`}
                          {' '}
                          <span className="text-gray-500 font-medium text-xs">
                            {p.applies_to==='all' ? 'sur tout' : p.applies_to==='category' ? 'sur une catégorie' : 'sur un produit'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={()=>togglePromo(p)} className={`w-8 h-8 rounded-xl border-2 border-[#1A1040] text-xs font-black flex items-center justify-center ${p.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                          {p.is_active?'✓':'✗'}
                        </button>
                        <button onClick={()=>setEditPromo(p)} className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-white hover:bg-candy flex items-center justify-center">
                          <Pencil className="w-3.5 h-3.5 text-[#1A1040]"/>
                        </button>
                        <button onClick={()=>deletePromo(p.id)} className="w-8 h-8 rounded-xl border-2 border-red-300 bg-white hover:bg-red-50 flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CODES PROMO ═══ */}
        {tab === 'codes' && (
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #ffe500' }}>
            <SectionHeader icon={<span className="text-lg">🎟️</span>} title="Codes promotionnels" sub="Codes à saisir par le client au moment du paiement" />
            <div className="p-6 space-y-4">
              <button onClick={()=>setEditCode(null)}
                className="flex items-center gap-2 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl font-black border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                style={{ boxShadow:'2px 2px 0px 0px #1A1040' }}>
                <Plus className="w-4 h-4"/> Nouveau code
              </button>

              {loading ? (
                <div className="text-center py-8 text-gray-400 font-black">Chargement…</div>
              ) : codes.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <span className="text-5xl block mb-2">🎟️</span>
                  <p className="font-black">Aucun code promo — créez-en un !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {codes.map(c => (
                    <div key={c.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${isNowActive(c)?'border-citron-400 bg-yellow-50':'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black font-mono text-[#1A1040] text-lg tracking-widest">{c.code}</span>
                          {isNowActive(c) && <span className="text-[10px] font-black text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">ACTIF</span>}
                          {!c.is_active && <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">INACTIF</span>}
                        </div>
                        <div className="text-sm font-bold text-rose-600 mt-0.5">
                          {c.discount_type==='percentage' ? `-${c.discount_value}%` : `-${formatPrice(c.discount_value)}`}
                          {c.min_order > 0 && <span className="text-gray-500 font-medium text-xs ml-1">· min {formatPrice(c.min_order)}</span>}
                          {c.max_uses !== null && <span className="text-gray-500 font-medium text-xs ml-1">· {c.uses_count}/{c.max_uses} utilisations</span>}
                          {c.max_uses === null && <span className="text-gray-500 font-medium text-xs ml-1">· illimité ({c.uses_count} util.)</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={()=>toggleCode(c)} className={`w-8 h-8 rounded-xl border-2 border-[#1A1040] text-xs font-black flex items-center justify-center ${c.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                          {c.is_active?'✓':'✗'}
                        </button>
                        <button onClick={()=>setEditCode(c)} className="w-8 h-8 rounded-xl border-2 border-[#1A1040] bg-white hover:bg-candy flex items-center justify-center">
                          <Pencil className="w-3.5 h-3.5 text-[#1A1040]"/>
                        </button>
                        <button onClick={()=>deleteCode(c.id)} className="w-8 h-8 rounded-xl border-2 border-red-300 bg-white hover:bg-red-50 flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5 text-red-500"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editPromo !== undefined && (
        <PromoModal promo={editPromo} categories={categories}
          onSave={()=>{setEditPromo(undefined);loadAll()}} onClose={()=>setEditPromo(undefined)}/>
      )}
      {editCode !== undefined && (
        <CodeModal code={editCode}
          onSave={()=>{setEditCode(undefined);loadAll()}} onClose={()=>setEditCode(undefined)}/>
      )}
    </main>
  )
}
