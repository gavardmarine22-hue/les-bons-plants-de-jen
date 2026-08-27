import { useState } from 'react'
import { X, Check, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ShopCategory } from '../lib/shop'
import { slugify } from '../lib/shop'

export default function ShopCatModal({ cat, categories, defaultParentId, onSave, onClose }: {
  cat?: ShopCategory | null
  categories: ShopCategory[]
  defaultParentId?: string | null
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName]   = useState(cat?.name || '')
  const [slug, setSlug]   = useState(cat?.slug || '')
  const [parent, setParent] = useState(cat?.parent_id || defaultParentId || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = { name: name.trim(), slug: slug || slugify(name), parent_id: parent || null, sort_order: cat?.sort_order ?? 0 }
    if (cat) {
      await supabase.from('shop_categories').update(payload).eq('id', cat.id)
    } else {
      await supabase.from('shop_categories').insert(payload)
    }
    setSaving(false); onSave()
  }

  const parents = categories.filter(c => !c.parent_id && c.id !== cat?.id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md" style={{ boxShadow:'6px 6px 0px 0px #ffe500' }}>
        <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy">
          <h3 className="font-black text-[#1A1040]">{cat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Nom *</label>
            <input value={name} onChange={e=>{setName(e.target.value);if(!cat)setSlug(slugify(e.target.value))}}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400" placeholder="Ex: Peinture" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Slug (URL)</label>
            <input value={slug} onChange={e=>setSlug(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-citron-400" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Catégorie parente (optionnel)</label>
            <select value={parent} onChange={e=>setParent(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400 bg-white">
              <option value="">— Aucune (catégorie principale) —</option>
              {parents.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">Annuler</button>
            <button onClick={save} disabled={saving || !name.trim()}
              className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} {cat ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
