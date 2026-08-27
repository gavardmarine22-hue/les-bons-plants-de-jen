import { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Check, RefreshCw, Pencil, Clock, Upload, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import HeroTitleEditor, { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'
import BgEditor from '../components/BgEditor'
import type { ShopStatus } from '../lib/shop'

interface BadgeConfig { text: string; bg: string; textColor: string; radius: string }

const DEFAULT_BG: HeroBg      = { ...DEFAULT_HERO_BG, color: '#c4b5fd' }
const DEFAULT_BADGE: BadgeConfig = { text: '🛍️ Notre boutique', bg: '#fb7185', textColor: '#ffffff', radius: 'rounded-full' }
const DEFAULT_TITRE: HeroStyle = {
  font: 'serif', fontSize: 40, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Carré' },
  { value: 'rounded-lg',   label: 'Légèrement' },
  { value: 'rounded-xl',   label: 'Arrondi' },
  { value: 'rounded-2xl',  label: 'Très arrondi' },
  { value: 'rounded-full', label: 'Pilule' },
]

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
function SaveBtn({ onClick, saving, saved, label, shadow }: { onClick:()=>void; saving:boolean; saved:boolean; label:string; shadow:string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onClick} disabled={saving}
        className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
        style={{ boxShadow:`3px 3px 0px 0px ${shadow}` }}>
        {saving ? <><RefreshCw className="w-4 h-4 animate-spin"/>Enregistrement…</>
                : saved  ? <><Check className="w-4 h-4"/>Enregistré !</>
                         : <><Check className="w-4 h-4"/>{label}</>}
      </button>
      {saved && <span className="text-sm font-black text-lime-600">✅ Mis à jour !</span>}
    </div>
  )
}

export default function BoutiqueAdmin() {
  // ── Statut ─────────────────────────────────────────────────────────────────
  const [status, setStatus]             = useState<ShopStatus>('active')
  const [stockingText, setStockingText] = useState('La boutique sera bientôt disponible 🚀')
  const [stockingDate, setStockingDate] = useState('')
  const [stockingImg,  setStockingImg]  = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusSaved,  setStatusSaved]  = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const stockingImgRef = useRef<HTMLInputElement>(null)

  // ── Fond ───────────────────────────────────────────────────────────────────
  const [bg, setBg]             = useState<HeroBg>(DEFAULT_BG)
  const [bgTab, setBgTab]       = useState<BgType>('color')
  const [bgSaving, setBgSaving] = useState(false)
  const [bgSaved, setBgSaved]   = useState(false)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const [bgUpErr, setBgUpErr]   = useState('')
  const [bgUpload, setBgUpload] = useState(false)

  // ── Badge ──────────────────────────────────────────────────────────────────
  const [badge, setBadge]             = useState<BadgeConfig>(DEFAULT_BADGE)
  const [badgeSaving, setBadgeSaving] = useState(false)
  const [badgeSaved, setBadgeSaved]   = useState(false)

  // ── Titre ──────────────────────────────────────────────────────────────────
  const [titreText, setTitreText]         = useState('Notre boutique 🛍️')
  const [titreStyle, setTitreStyle]       = useState<HeroStyle>(DEFAULT_TITRE)
  const [showTitreEditor, setShowTitreEditor] = useState(false)

  // ── Panier ─────────────────────────────────────────────────────────────────
  const [cartExpiry, setCartExpiry]       = useState(30)
  const [cartSaving, setCartSaving]       = useState(false)
  const [cartSaved, setCartSaved]         = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: settings }, { data: content }] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'shop_status','shop_stocking_text','shop_stocking_date','shop_stocking_image',
        'shop_bg_config','shop_badge_config','shop_titre_style','shop_cart_expiry',
      ]),
      supabase.from('page_content').select('section, contenu').eq('page','boutique').in('section',['shop_titre']),
    ])
    ;(settings || []).forEach((s: { key: string; value: string }) => {
      try {
        if (s.key === 'shop_status')        setStatus(s.value as ShopStatus)
        if (s.key === 'shop_stocking_text') setStockingText(s.value)
        if (s.key === 'shop_stocking_date') setStockingDate(s.value)
        if (s.key === 'shop_stocking_image')setStockingImg(s.value)
        if (s.key === 'shop_bg_config')     { const v=JSON.parse(s.value); setBg(p=>({...p,...v})); setBgTab(v.type||'color') }
        if (s.key === 'shop_badge_config')  setBadge(p=>({...p,...JSON.parse(s.value)}))
        if (s.key === 'shop_titre_style')   setTitreStyle(p=>({...p,...JSON.parse(s.value)}))
        if (s.key === 'shop_cart_expiry')   setCartExpiry(parseInt(s.value)||30)
      } catch {}
    })
    ;(content || []).forEach((c: { section: string; contenu: string }) => {
      if (c.section === 'shop_titre') setTitreText(c.contenu)
    })
  }

  async function uploadStockingImage(file: File) {
    setImgUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `shop-stocking-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setImgUploading(false); return }
    const { data } = supabase.storage.from('hero').getPublicUrl(filename)
    setStockingImg(data.publicUrl + '?t=' + Date.now())
    setImgUploading(false)
  }

  async function saveStatus() {
    setStatusSaving(true)
    await Promise.all([
      supabase.from('settings').upsert({ key:'shop_status', value:status }, { onConflict:'key' }),
      supabase.from('settings').upsert({ key:'shop_stocking_text', value:stockingText }, { onConflict:'key' }),
      supabase.from('settings').upsert({ key:'shop_stocking_date', value:stockingDate }, { onConflict:'key' }),
      supabase.from('settings').upsert({ key:'shop_stocking_image', value:stockingImg }, { onConflict:'key' }),
    ])
    setStatusSaving(false); setStatusSaved(true); setTimeout(()=>setStatusSaved(false),3000)
  }

  async function saveBg() {
    setBgSaving(true)
    const final = { ...bg, type: bgTab }
    await supabase.from('settings').upsert({ key:'shop_bg_config', value:JSON.stringify(final) }, { onConflict:'key' })
    setBg(final); setBgSaving(false); setBgSaved(true); setTimeout(()=>setBgSaved(false),3000)
  }

  async function saveBadge() {
    setBadgeSaving(true)
    await supabase.from('settings').upsert({ key:'shop_badge_config', value:JSON.stringify(badge) }, { onConflict:'key' })
    setBadgeSaving(false); setBadgeSaved(true); setTimeout(()=>setBadgeSaved(false),3000)
  }

  async function saveCart() {
    setCartSaving(true)
    await supabase.from('settings').upsert({ key:'shop_cart_expiry', value:String(cartExpiry) }, { onConflict:'key' })
    setCartSaving(false); setCartSaved(true); setTimeout(()=>setCartSaved(false),3000)
  }

  const STATUS_OPTIONS = [
    { value:'active',   label:'✅ Actif',                    desc:'Boutique visible et utilisable',      color:'#22c55e', textColor:'#fff' },
    { value:'inactive', label:'🚫 Inactif',                  desc:'Boutique masquée pour le public',     color:'#ef4444', textColor:'#fff' },
    { value:'stocking', label:'🔄 En cours d\'approvisionnement', desc:'Visible mais marquée en attente',color:'#f59e0b', textColor:'#fff' },
  ] as const

  return (
    <main className="flex-1 bg-candy">
      {/* HEADER */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-yellow-300" style={{ boxShadow:'3px 3px 0px 0px #fb7185' }}>
            <ShoppingBag className="w-7 h-7 text-[#1A1040]" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Boutique <span className="text-citron-400">✦</span></h1>
          </div>
          <a href="/produits-admin"
            className="ml-auto shrink-0 flex items-center gap-2 bg-citron-400 text-[#1A1040] px-5 py-3 rounded-2xl font-black text-sm border-2 border-yellow-300 hover:bg-yellow-300 transition-all"
            style={{ boxShadow:'3px 3px 0px 0px #fb7185' }}>
            📦 Gérer les articles & catégories
          </a>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* STATUT */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #22c55e' }}>
          <SectionHeader icon={<span className="text-lg">🔛</span>} title="Statut de la boutique" sub="Choisissez comment la boutique apparaît au public" />
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  className={`p-4 rounded-2xl border-4 text-left transition-all ${status===opt.value ? 'border-[#1A1040]' : 'border-gray-200 hover:border-gray-400'}`}
                  style={status===opt.value ? { backgroundColor:opt.color, boxShadow:'3px 3px 0px 0px #1A1040' } : { backgroundColor:'#f9fafb' }}>
                  <div className="font-black text-sm" style={{ color: status===opt.value ? opt.textColor : '#1A1040' }}>{opt.label}</div>
                  <div className="text-[10px] mt-1 font-medium" style={{ color: status===opt.value ? 'rgba(255,255,255,0.85)' : '#6b7280' }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {status === 'stocking' && (
              <div className="space-y-4 border-2 border-amber-300 rounded-2xl p-4 bg-amber-50">
                <div className="text-xs font-black text-amber-700 uppercase tracking-wide">Configuration — En cours d'approvisionnement</div>

                {/* Image */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Image d'attente</label>
                  {stockingImg ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-[#1A1040] h-28 group">
                      <img src={stockingImg} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setStockingImg('')}
                        className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />Supprimer
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 border-4 border-dashed border-amber-400 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-all"
                      onClick={() => stockingImgRef.current?.click()}>
                      {imgUploading ? <RefreshCw className="w-5 h-5 text-amber-500 animate-spin"/> : <Upload className="w-5 h-5 text-amber-600"/>}
                      <span className="font-black text-amber-700 text-xs">{imgUploading ? 'Téléchargement…' : 'Choisir une image'}</span>
                    </label>
                  )}
                  <input ref={stockingImgRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f=e.target.files?.[0]; if(f) uploadStockingImage(f); e.target.value='' }} />
                </div>

                {/* Texte */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte affiché</label>
                  <input type="text" value={stockingText} onChange={e => setStockingText(e.target.value)}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>

                {/* Date d'activation */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Date/heure d'ouverture automatique</label>
                  <input type="datetime-local" value={stockingDate} onChange={e => setStockingDate(e.target.value)}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    ⚡ À cette date, la boutique passera automatiquement en mode Actif côté visiteur.
                  </p>
                </div>
              </div>
            )}

            <SaveBtn onClick={saveStatus} saving={statusSaving} saved={statusSaved} label="Enregistrer le statut" shadow="#22c55e" />
          </div>
        </div>

        {/* FOND */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<span className="text-lg">🎨</span>} title="Fond de la boutique" sub="Couleur, dégradé, motif, image ou vidéo" />
          <div className="relative h-28 flex items-center justify-center overflow-hidden transition-all duration-500 mx-6 mt-6 rounded-2xl border-2 border-[#1A1040]"
            style={buildHeroBgStyle({ ...bg, type: bgTab })}>
            <p className="font-serif text-lg font-black drop-shadow" style={{ color: titreStyle.color }}>Notre boutique 🛍️</p>
          </div>
          <div className="p-6 space-y-4">
            <BgEditor bg={bg} setBg={setBg} activeTab={bgTab} setActiveTab={setBgTab}
              fileRef={bgFileRef} uploadError={bgUpErr} setUploadError={setBgUpErr}
              uploading={bgUpload} setUploading={setBgUpload} />
            <SaveBtn onClick={saveBg} saving={bgSaving} saved={bgSaved} label="Appliquer le fond" shadow="#ffb5c8" />
          </div>
        </div>

        {/* BADGE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<span className="text-lg">🏷️</span>} title="Badge" sub="Le petit badge au-dessus du titre" />
          <div className="p-6 space-y-5">
            <div className="flex justify-center">
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold border-2 border-gray-300 ${badge.radius}`}
                style={{ backgroundColor:badge.bg, color:badge.textColor }}>{badge.text}</div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
              <input type="text" value={badge.text} onChange={e=>setBadge(p=>({...p,text:e.target.value}))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{label:'Fond', field:'bg' as const},{label:'Texte', field:'textColor' as const}].map(({label,field})=>(
                <div key={field}>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={badge[field]} onChange={e=>setBadge(p=>({...p,[field]:e.target.value}))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5"/>
                    <input type="text" value={badge[field]} maxLength={7} onChange={e=>{if(/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))setBadge(p=>({...p,[field]:e.target.value}))}}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none"/>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map(r=>(
                  <button key={r.value} onClick={()=>setBadge(p=>({...p,radius:r.value}))}
                    className={`px-2.5 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${badge.radius===r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <SaveBtn onClick={saveBadge} saving={badgeSaving} saved={badgeSaved} label="Appliquer le badge" shadow="#ffe500" />
          </div>
        </div>

        {/* TITRE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<Pencil className="w-5 h-5 text-[#1A1040]"/>} title="Titre principal" sub="Police, taille, couleur, ombre…" />
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[80px]"
              style={{ ...buildHeroBgStyle({ ...bg, type:bgTab }), boxShadow:'3px 3px 0px 0px #1A1040' }}>
              <div style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} className="text-center leading-tight"/>
            </div>
            <button onClick={() => setShowTitreEditor(true)}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
              style={{ boxShadow:'3px 3px 0px 0px #c4b5fd' }}>
              <Pencil className="w-4 h-4"/> Modifier le titre
            </button>
          </div>
        </div>

        {/* PANIER */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow:'5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<Clock className="w-5 h-5 text-[#1A1040]"/>} title="Délai de réservation du panier" sub="Durée avant que le panier expire et libère le stock" />
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <input type="number" min={5} max={1440} value={cartExpiry} onChange={e=>setCartExpiry(parseInt(e.target.value)||30)}
                className="w-28 border-4 border-[#1A1040] rounded-2xl px-4 py-3 text-2xl font-black text-center focus:outline-none focus:ring-2 focus:ring-citron-400" />
              <div>
                <div className="font-black text-[#1A1040]">minutes</div>
                <div className="text-xs text-gray-500">entre 5 et 1440 min (24h)</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[15,30,60,120].map(m=>(
                <button key={m} onClick={()=>setCartExpiry(m)}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all ${cartExpiry===m ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                  {m} min
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              ⏱️ Si un client n'a pas finalisé son achat dans ce délai, les articles de son panier sont remis en vente automatiquement.
            </p>
            <SaveBtn onClick={saveCart} saving={cartSaving} saved={cartSaved} label="Enregistrer le délai" shadow="#4dd9c0" />
          </div>
        </div>

        {/* RACCOURCIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/produits-admin"
            className="flex items-center gap-4 bg-white rounded-3xl border-4 border-[#1A1040] p-5 hover:bg-candy transition-all"
            style={{ boxShadow:'4px 4px 0px 0px #1A1040' }}>
            <span className="text-3xl">📦</span>
            <div><div className="font-black text-[#1A1040]">Produits & catégories</div><div className="text-xs text-gray-500">Créer, modifier, gérer le stock</div></div>
          </a>
          <a href="/promos-admin"
            className="flex items-center gap-4 bg-white rounded-3xl border-4 border-[#1A1040] p-5 hover:bg-candy transition-all"
            style={{ boxShadow:'4px 4px 0px 0px #ffe500' }}>
            <span className="text-3xl">🏷️</span>
            <div><div className="font-black text-[#1A1040]">Promotions & codes promo</div><div className="text-xs text-gray-500">Soldes, réductions, codes</div></div>
          </a>
        </div>

      </div>

      {showTitreEditor && (
        <HeroTitleEditor
          initialText={titreText} initialStyle={titreStyle}
          page="boutique"
          sectionKey="shop_titre" styleKey="shop_titre_style"
          label="✏️ Titre — Boutique"
          onSave={(t,s) => { setTitreText(t); setTitreStyle(s); setShowTitreEditor(false) }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}
    </main>
  )
}
