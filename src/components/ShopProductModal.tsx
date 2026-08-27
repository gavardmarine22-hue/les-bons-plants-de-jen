import { useState, useRef } from 'react'
import { X, Check, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ShopCategory, ShopProduct } from '../lib/shop'

export default function ShopProductModal({ product, categories, onSave, onClose }: {
  product?: ShopProduct | null
  categories: ShopCategory[]
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName]           = useState(product?.name || '')
  const [desc, setDesc]           = useState(product?.description || '')
  const [price, setPrice]         = useState(product?.price?.toString() || '')
  const [comparePrice, setComparePrice] = useState(product?.compare_price?.toString() || '')
  const [catId, setCatId]         = useState(product?.category_id || '')
  const [stock, setStock]         = useState(product?.stock?.toString() || '0')
  const [stockIllimite, setStockIllimite] = useState(product?.stock_illimite ?? false)
  const [surCommande, setSurCommande]     = useState(product?.sur_commande ?? false)
  const [montants, setMontants]   = useState<string[]>(
    product?.montants_disponibles?.length ? product.montants_disponibles.map(String) : []
  )
  const [images, setImages]       = useState<string[]>(product?.images || [])
  const [weightG, setWeightG]     = useState(product?.weight_g?.toString() || '')
  const [isActive, setIsActive]   = useState(product?.is_active ?? true)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [priceMode, setPriceMode] = useState<'fixed' | 'percent'>('fixed')
  const [discountPct, setDiscountPct] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const prixOriginal = parseFloat(price) || 0
  const pct          = parseFloat(discountPct) || 0
  const prixCalcule  = priceMode === 'percent' && prixOriginal > 0 && pct > 0
    ? Math.round(prixOriginal * (1 - pct / 100) * 100) / 100
    : null

  function addMontant() { setMontants(p => [...p, '']) }
  function updateMontant(i: number, v: string) { setMontants(p => p.map((m, j) => j === i ? v : m)) }
  function removeMontant(i: number) { setMontants(p => p.filter((_, j) => j !== i)) }

  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `shop-product-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('hero').getPublicUrl(filename)
      setImages(p => [...p, data.publicUrl + '?t=' + Date.now()])
    }
    setUploading(false)
  }

  async function save() {
    if (!name.trim() || !price) return
    setSaving(true)
    const montantsValides = montants.map(m => parseFloat(m)).filter(n => !isNaN(n) && n > 0)
    let finalPrice: number
    let finalComparePrice: number | null
    if (priceMode === 'percent' && prixCalcule !== null) {
      finalPrice = prixCalcule
      finalComparePrice = prixOriginal
    } else {
      finalPrice = parseFloat(price)
      finalComparePrice = comparePrice ? parseFloat(comparePrice) : null
    }
    const payload = {
      name: name.trim(),
      description: desc.trim(),
      price: finalPrice,
      compare_price: finalComparePrice,
      category_id: catId || null,
      stock: parseInt(stock) || 0,
      stock_illimite: stockIllimite,
      sur_commande: surCommande,
      montants_disponibles: montantsValides.length ? montantsValides : null,
      weight_g: weightG ? parseInt(weightG) : null,
      images,
      is_active: isActive,
    }
    if (product) {
      await supabase.from('shop_products').update(payload).eq('id', product.id)
    } else {
      await supabase.from('shop_products').insert(payload)
    }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-xl my-4" style={{ boxShadow:'6px 6px 0px 0px #c4b5fd' }}>
        <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy sticky top-0 z-10">
          <h3 className="font-black text-[#1A1040]">{product ? 'Modifier le produit' : 'Nouveau produit'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Nom du produit *</label>
            <input value={name} onChange={e=>setName(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
          </div>
          {/* Description */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400 resize-none" />
          </div>
          {/* Prix — toggle Montant fixe / Pourcentage */}
          <div className="space-y-3">
            <div className="flex rounded-xl overflow-hidden border-2 border-[#1A1040] h-[34px]">
              {(['fixed', 'percent'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setPriceMode(mode)}
                  className={`flex-1 text-xs font-black transition-all ${
                    priceMode === mode ? 'bg-[#1A1040] text-citron-400' : 'bg-white text-[#1A1040] hover:bg-gray-50'
                  }`}>
                  {mode === 'fixed' ? '💶 Montant fixe' : '🏷️ % de réduction'}
                </button>
              ))}
            </div>

            {priceMode === 'fixed' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Prix (€) *</label>
                  <input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Prix barré (€) <span className="font-normal text-gray-400">opt.</span></label>
                  <input type="number" min="0" step="0.01" value={comparePrice} onChange={e=>setComparePrice(e.target.value)}
                    placeholder="ex: 25.00"
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Prix original (€) *</label>
                    <input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}
                      placeholder="ex: 25.00"
                      className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">% de réduction *</label>
                    <input type="number" min="1" max="99" step="1" value={discountPct} onChange={e=>setDiscountPct(e.target.value)}
                      placeholder="ex: 20"
                      className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" />
                  </div>
                </div>
                {prixCalcule !== null && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-400 line-through">{prixOriginal.toFixed(2)}€</span>
                    <span className="text-xs font-black text-amber-600">-{pct}%</span>
                    <span className="text-base font-black text-[#1A1040]">→ {prixCalcule.toFixed(2)}€</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Catégorie + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Catégorie</label>
              <select value={catId} onChange={e=>setCatId(e.target.value)}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none bg-white">
                <option value="">— Aucune —</option>
                {categories
                  .filter(c => !c.parent_id)
                  .flatMap(parent => [
                    parent,
                    ...categories.filter(c => c.parent_id === parent.id),
                  ])
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? '  └ ' : ''}{c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Stock disponible</label>
              <input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} disabled={stockIllimite}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400 disabled:opacity-40 disabled:bg-gray-100" />
            </div>
          </div>
          {/* Poids */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">
              ⚖️ Poids du colis (grammes) — pour le calcul Mondial Relay
            </label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="1" value={weightG} onChange={e => setWeightG(e.target.value)}
                placeholder="ex : 250"
                className="w-40 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <span className="text-sm text-gray-400 font-bold">g</span>
              {weightG && <span className="text-xs text-gray-400">= {(parseInt(weightG)/1000).toFixed(3)} kg</span>}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Laissez vide si le produit n'est pas expédié (carte cadeau, etc.)</p>
          </div>
          {/* Stock illimité */}
          <div className="flex items-center gap-3">
            <button onClick={()=>setStockIllimite(!stockIllimite)}
              className={`w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors relative ${stockIllimite ? 'bg-turquoise-400' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white border-2 border-[#1A1040] absolute top-0 transition-transform ${stockIllimite ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
            <span className="text-sm font-black text-[#1A1040]">♾️ Stock illimité {stockIllimite ? '(activé)' : ''}</span>
          </div>
          {/* Sur commande */}
          <div className="flex items-center gap-3">
            <button onClick={()=>setSurCommande(!surCommande)}
              className={`w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors relative ${surCommande ? 'bg-blue-300' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white border-2 border-[#1A1040] absolute top-0 transition-transform ${surCommande ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
            <span className="text-sm font-black text-[#1A1040]">📋 Article sur commande {surCommande ? '(activé)' : ''}</span>
          </div>
          {/* Montants au choix (carte cadeau) */}
          <div className="border-2 border-dashed border-turquoise-300 rounded-xl p-3 space-y-2 bg-turquoise-50/30">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide block">
              🎁 Montants au choix (carte cadeau — optionnel)
            </label>
            <p className="text-[10px] text-gray-400">
              Si renseigné, le client choisira un montant parmi cette liste au lieu du prix fixe ci-dessus.
            </p>
            <div className="flex flex-wrap gap-2">
              {montants.map((m, i) => (
                <div key={i} className="flex items-center gap-1 bg-white border-2 border-[#1A1040] rounded-lg px-2 py-1">
                  <input type="number" min="0" step="0.5" value={m} placeholder="€"
                    onChange={e => updateMontant(i, e.target.value)}
                    className="w-16 text-sm font-bold focus:outline-none" />
                  <button onClick={() => removeMontant(i)} className="text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addMontant}
                className="flex items-center gap-1 border-2 border-dashed border-[#1A1040] rounded-lg px-3 py-1 text-xs font-bold text-[#1A1040] hover:bg-candy">
                <Plus className="w-3.5 h-3.5" /> Montant
              </button>
            </div>
          </div>
          {/* Actif */}
          <div className="flex items-center gap-3">
            <button onClick={()=>setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors relative ${isActive ? 'bg-green-400' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full bg-white border-2 border-[#1A1040] absolute top-0 transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
            <span className="text-sm font-black text-[#1A1040]">{isActive ? 'Produit actif (visible)' : 'Produit inactif (masqué)'}</span>
          </div>
          {/* Images & Vidéos */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Images / Vidéos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl border-2 border-[#1A1040] overflow-hidden group">
                  {/\.(mp4|webm|mov)(\?|$)/i.test(img)
                    ? <video src={img} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                    : <img src={img} alt="" className="w-full h-full object-cover"/>}
                  <button onClick={() => setImages(p => p.filter((_,j)=>j!==i))}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Trash2 className="w-4 h-4 text-white"/>
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl border-4 border-dashed border-[#1A1040] flex items-center justify-center cursor-pointer hover:bg-candy transition-all"
                onClick={() => fileRef.current?.click()}>
                {uploading ? <RefreshCw className="w-5 h-5 animate-spin text-gray-400"/> : <Plus className="w-5 h-5 text-[#1A1040]"/>}
              </label>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden"
              onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f);e.target.value=''}}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">Annuler</button>
            <button onClick={save} disabled={saving || !name.trim() || !price}
              className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} {product ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
