import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, RefreshCw, Eye, EyeOff, Move, Lock, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const POLAROID_FONTS: Record<string, string> = {
  sans: 'sans-serif', serif: 'serif', mono: 'monospace', cursive: 'cursive',
}

export interface HeroPolaroid {
  id: string
  image_url: string
  side: 'left' | 'right'
  rotation: number
  offset_x: number
  offset_y: number
  size: number
  title: string | null
  text: string | null
  title_size: number
  title_font: string
  title_color: string
  text_size: number
  text_font: string
  text_color: string
  draggable: boolean
  is_visible: boolean
  sort_order: number
  created_at: string
}

function PolaroidRow({ polaroid, onChange, onDelete }: {
  polaroid: HeroPolaroid
  onChange: (id: string, patch: Partial<HeroPolaroid>) => void
  onDelete: (id: string) => void
}) {
  const [uploading,   setUploading]   = useState(false)
  const [localTitle,  setLocalTitle]  = useState(polaroid.title ?? '')
  const [localText,   setLocalText]   = useState(polaroid.text ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  // Resynchronise si on change de polaroïd (id différent)
  useEffect(() => {
    setLocalTitle(polaroid.title ?? '')
    setLocalText(polaroid.text ?? '')
  }, [polaroid.id])

  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `hero-polaroid-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('hero').getPublicUrl(filename)
      onChange(polaroid.id, { image_url: data.publicUrl + '?t=' + Date.now() })
    }
    setUploading(false)
  }

  return (
    <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border-2 border-[#1A1040] overflow-hidden shrink-0 bg-white relative cursor-pointer group"
          onClick={() => fileRef.current?.click()}>
          {polaroid.image_url
            ? <img src={polaroid.image_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            {uploading ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : <ImageIcon className="w-4 h-4 text-white" />}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />

        <div className="flex-1 grid grid-cols-2 gap-2">
          <select value={polaroid.side} onChange={e => onChange(polaroid.id, { side: e.target.value as 'left' | 'right' })}
            className="border-2 border-[#1A1040] rounded-lg px-2 py-1 text-xs font-bold bg-white">
            <option value="left">⬅ Gauche</option>
            <option value="right">➡ Droite</option>
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => onChange(polaroid.id, { is_visible: !polaroid.is_visible })}
              title={polaroid.is_visible ? 'Visible' : 'Masqué'}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold border-2 ${polaroid.is_visible ? 'bg-lime-300 border-[#1A1040] text-[#1A1040]' : 'bg-gray-200 border-gray-400 text-gray-500'}`}>
              {polaroid.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={() => onChange(polaroid.id, { draggable: !polaroid.draggable })}
              title={polaroid.draggable ? 'Déplaçable' : 'Verrouillé'}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-bold border-2 ${polaroid.draggable ? 'bg-turquoise-300 border-[#1A1040] text-[#1A1040]' : 'bg-gray-200 border-gray-400 text-gray-500'}`}>
              {polaroid.draggable ? <Move className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            </button>
            <button onClick={() => onDelete(polaroid.id)}
              className="rounded-lg px-2 py-1 border-2 border-red-300 text-red-500 hover:bg-red-50">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Rotation + Taille */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide flex items-center justify-between">
            <span>Inclinaison</span><span>{polaroid.rotation}°</span>
          </label>
          <input type="range" min={-30} max={30} step={1} value={polaroid.rotation}
            onChange={e => onChange(polaroid.id, { rotation: parseInt(e.target.value) })}
            className="w-full" />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide flex items-center justify-between">
            <span>Taille</span><span>{polaroid.size}px</span>
          </label>
          <input type="range" min={60} max={500} step={5} value={polaroid.size}
            onChange={e => onChange(polaroid.id, { size: parseInt(e.target.value) })}
            className="w-full" />
        </div>
      </div>

      {/* Titre (optionnel) + style */}
      <div className="border-t border-[#1A1040]/10 pt-3">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Titre (optionnel)</label>
        <input
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          onBlur={() => onChange(polaroid.id, { title: localTitle || null })}
          placeholder="Ex: Atelier macramé"
          className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-citron-400" />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" min={8} max={48} value={polaroid.title_size}
            onChange={e => onChange(polaroid.id, { title_size: parseInt(e.target.value) || 13 })}
            title="Taille du texte (px)"
            className="border-2 border-[#1A1040] rounded-lg px-2 py-1 text-xs font-bold" />
          <select value={polaroid.title_font} onChange={e => onChange(polaroid.id, { title_font: e.target.value })}
            className="border-2 border-[#1A1040] rounded-lg px-1 py-1 text-xs font-bold bg-white">
            {Object.keys(POLAROID_FONTS).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="color" value={polaroid.title_color} onChange={e => onChange(polaroid.id, { title_color: e.target.value })}
            className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
        </div>
      </div>

      {/* Texte (optionnel) + style */}
      <div>
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte (optionnel)</label>
        <textarea
          value={localText}
          onChange={e => setLocalText(e.target.value)}
          onBlur={() => onChange(polaroid.id, { text: localText || null })}
          rows={2}
          placeholder="Une petite légende..."
          className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs font-medium resize-none mb-2 focus:outline-none focus:ring-2 focus:ring-citron-400" />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" min={6} max={36} value={polaroid.text_size}
            onChange={e => onChange(polaroid.id, { text_size: parseInt(e.target.value) || 10 })}
            title="Taille du texte (px)"
            className="border-2 border-[#1A1040] rounded-lg px-2 py-1 text-xs font-bold" />
          <select value={polaroid.text_font} onChange={e => onChange(polaroid.id, { text_font: e.target.value })}
            className="border-2 border-[#1A1040] rounded-lg px-1 py-1 text-xs font-bold bg-white">
            {Object.keys(POLAROID_FONTS).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="color" value={polaroid.text_color} onChange={e => onChange(polaroid.id, { text_color: e.target.value })}
            className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
        </div>
      </div>
    </div>
  )
}

export default function HeroPolaroidManager({ polaroids, onClose, onRefresh, tableName = 'hero_polaroids', title = 'Polaroïds du Hero' }: {
  polaroids: HeroPolaroid[]
  onClose: () => void
  onRefresh: () => void
  tableName?: string
  title?: string
}) {
  const [saving, setSaving] = useState(false)

  async function addPolaroid() {
    setSaving(true)
    await supabase.from(tableName).insert({
      image_url: '', side: 'left', rotation: -6, offset_x: 0, offset_y: 0,
      size: 120, title: null, text: null,
      title_size: 13, title_font: 'sans', title_color: '#1A1040',
      text_size: 10, text_font: 'sans', text_color: '#6b7280',
      draggable: true, is_visible: true, sort_order: polaroids.length,
    })
    setSaving(false)
    onRefresh()
  }

  async function patchPolaroid(id: string, patch: Partial<HeroPolaroid>) {
    await supabase.from(tableName).update(patch).eq('id', id)
    onRefresh()
  }

  async function deletePolaroid(id: string) {
    await supabase.from(tableName).delete().eq('id', id)
    onRefresh()
  }

  const left = polaroids.filter(p => p.side === 'left')
  const right = polaroids.filter(p => p.side === 'right')

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-lg max-h-[85vh] flex flex-col" style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
        <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy shrink-0">
          <h3 className="font-black text-[#1A1040]">🖼️ {title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p className="text-xs text-gray-500 font-medium">
            Glisse directement les polaroïds sur le Hero pour les repositionner (si "Déplaçable" est activé). Utilise les boutons ci-dessous pour le côté, l'inclinaison, la visibilité, ou pour en ajouter/supprimer.
          </p>

          <div>
            <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">⬅ Côté gauche ({left.length})</p>
            <div className="space-y-2">
              {left.map(p => <PolaroidRow key={p.id} polaroid={p} onChange={patchPolaroid} onDelete={deletePolaroid} />)}
              {left.length === 0 && <p className="text-xs text-gray-400 italic">Aucun polaroïd à gauche</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">➡ Côté droit ({right.length})</p>
            <div className="space-y-2">
              {right.map(p => <PolaroidRow key={p.id} polaroid={p} onChange={patchPolaroid} onDelete={deletePolaroid} />)}
              {right.length === 0 && <p className="text-xs text-gray-400 italic">Aucun polaroïd à droite</p>}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t-2 border-[#1A1040] shrink-0">
          <button onClick={addPolaroid} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1040] text-citron-400 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter un polaroïd
          </button>
        </div>
      </div>
    </div>
  )
}
