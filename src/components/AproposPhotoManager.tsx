import { useRef, useState } from 'react'
import { X, Upload, RefreshCw, Eye, EyeOff, Trash2, Plus, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { AproposPhoto } from './AproposPhotoDisplay'

const SHAPES = [
  { key: 'rounded-none', label: '■' },
  { key: 'rounded-xl',   label: '▢' },
  { key: 'rounded-2xl',  label: '⬜' },
  { key: 'rounded-3xl',  label: '▣' },
  { key: 'rounded-full', label: '●' },
]

interface Props {
  photos:    AproposPhoto[]
  onClose:   () => void
  onRefresh: () => void
}

export default function AproposPhotoManager({ photos, onClose, onRefresh }: Props) {
  const fileRef      = useRef<HTMLInputElement>(null)
  const fileEditRef  = useRef<HTMLInputElement>(null)
  const [uploading,  setUploading]  = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [saving,     setSaving]     = useState<string | null>(null)

  // Copie locale pour édition live
  const [localPhotos, setLocalPhotos] = useState<AproposPhoto[]>(photos)

  // Sync si photos prop change (après onRefresh)
  const prevPhotosLen = useRef(photos.length)
  if (photos.length !== prevPhotosLen.current) {
    prevPhotosLen.current = photos.length
    setLocalPhotos(photos)
  }

  function patch(id: string, changes: Partial<AproposPhoto>) {
    setLocalPhotos(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }

  async function savePatch(id: string, changes: Partial<AproposPhoto>) {
    patch(id, changes)
    setSaving(id)
    await supabase.from('apropos_photos').update(changes).eq('id', id)
    setSaving(null)
    onRefresh()
  }

  async function addPhoto(file: File) {
    setUploading(true)
    setUploadErr('')
    const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `apropos-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setUploadErr('Erreur upload : ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('hero').getPublicUrl(filename)
    const url = data.publicUrl + '?t=' + Date.now()
    const { data: inserted } = await supabase
      .from('apropos_photos')
      .insert({ image_url: url, sort_order: photos.length })
      .select()
      .single()
    setUploading(false)
    onRefresh()
    if (inserted) setEditingId(inserted.id)
  }

  async function changePhoto(id: string, file: File) {
    setSaving(id)
    const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `apropos-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setSaving(null); return }
    const { data } = supabase.storage.from('hero').getPublicUrl(filename)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('apropos_photos').update({ image_url: url }).eq('id', id)
    patch(id, { image_url: url })
    setSaving(null)
    onRefresh()
  }

  async function deletePhoto(id: string) {
    if (!confirm('Supprimer cette photo ?')) return
    await supabase.from('apropos_photos').delete().eq('id', id)
    setLocalPhotos(prev => prev.filter(p => p.id !== id))
    if (editingId === id) setEditingId(null)
    onRefresh()
  }

  const editing = localPhotos.find(p => p.id === editingId) ?? null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm flex flex-col bg-white border-l-4 border-[#1A1040]"
        style={{ boxShadow: '-6px 0 0 0 #1A1040' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1A1040] shrink-0">
          <div>
            <h2 className="font-serif font-black text-lg text-white">📷 Photos À Propos</h2>
            <p className="text-white/50 text-xs font-medium mt-0.5">
              {editingId ? 'Modifier la photo' : `${localPhotos.length} photo${localPhotos.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <button onClick={() => setEditingId(null)}
                className="text-white/70 text-xs font-black hover:text-white px-2 py-1 rounded-lg border border-white/20 hover:border-white/50 transition-all">
                ← Retour
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── Vue liste ── */}
          {!editingId && (
            <>
              {/* Bouton Ajouter */}
              <label className={`flex items-center gap-3 border-4 border-dashed rounded-2xl px-4 py-3 cursor-pointer transition-all ${uploading ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-[#1A1040] bg-candy hover:bg-rose-50'}`}
                onClick={() => !uploading && fileRef.current?.click()}>
                {uploading
                  ? <><RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /><span className="font-black text-gray-400 text-sm">Téléchargement…</span></>
                  : <><div className="w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0"><Plus className="w-5 h-5 text-white" /></div>
                     <div><p className="font-black text-[#1A1040] text-sm">Ajouter une photo</p><p className="text-gray-400 text-xs">JPG, PNG, WebP</p></div></>
                }
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = '' }} />
              {uploadErr && <p className="text-xs text-red-600 font-medium">{uploadErr}</p>}

              {/* Liste des photos */}
              {localPhotos.length === 0 && (
                <div className="text-center py-10 border-4 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="font-black text-sm">Aucune photo</p>
                  <p className="text-xs mt-1">Clique sur "Ajouter" pour commencer</p>
                </div>
              )}
              {localPhotos.map((p) => (
                <div key={p.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border-2 border-gray-200 hover:border-[#1A1040] transition-all">
                  {/* Miniature */}
                  <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 border-[#1A1040] bg-candy">
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">📷</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs text-[#1A1040] truncate">{p.image_url ? 'Photo' : 'Vide'}</p>
                    <p className="text-[10px] text-gray-400">{p.size}px · {p.rotation}° {!p.is_visible ? '· Masquée' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => savePatch(p.id, { is_visible: !p.is_visible })}
                      className={`w-7 h-7 rounded-lg border-2 border-[#1A1040] flex items-center justify-center transition-colors ${p.is_visible ? 'bg-lime-300' : 'bg-gray-200'}`}>
                      {p.is_visible ? <Eye className="w-3.5 h-3.5 text-[#1A1040]" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                    </button>
                    <button onClick={() => setEditingId(p.id)}
                      className="w-7 h-7 rounded-lg border-2 border-[#1A1040] bg-white flex items-center justify-center hover:bg-citron-400 transition-colors text-xs">
                      ✏️
                    </button>
                    <button onClick={() => deletePhoto(p.id)}
                      className="w-7 h-7 rounded-lg border-2 border-red-300 bg-white flex items-center justify-center hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Vue détail (édition d'une photo) ── */}
          {editingId && editing && (
            <>
              {/* Aperçu */}
              <div className="flex justify-center py-5 bg-candy rounded-2xl border-2 border-dashed border-[#1A1040]/20">
                <div className="relative" style={{
                  width: 140, height: 140,
                  borderRadius: { 'rounded-none': '0', 'rounded-xl': '12px', 'rounded-2xl': '16px', 'rounded-3xl': '24px', 'rounded-full': '9999px' }[editing.shape] ?? '16px',
                  overflow: 'hidden',
                  border:   editing.show_cadre   ? `${editing.cadre_width}px solid ${editing.cadre_color}` : 'none',
                  outline:  editing.show_contour ? `3px solid ${editing.contour_color}` : 'none',
                  outlineOffset: '3px',
                  backgroundColor: editing.show_fond ? editing.fond_color : 'transparent',
                  transform: `rotate(${editing.rotation}deg)`,
                  boxShadow: editing.show_cadre ? `4px 4px 0 0 ${editing.cadre_color}` : undefined,
                }}>
                  {editing.image_url
                    ? <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl bg-rose-50">📷</div>
                  }
                  {saving === editingId && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-rose-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Changer la photo */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">Photo</label>
                <label className="flex items-center gap-3 border-4 border-dashed rounded-2xl px-4 py-3 cursor-pointer border-[#1A1040] bg-candy hover:bg-rose-50 transition-all"
                  onClick={() => fileEditRef.current?.click()}>
                  <div className="w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0">
                    <Upload className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-[#1A1040] text-sm">Changer la photo</p>
                    <p className="text-gray-400 text-xs">JPG, PNG, WebP — carré recommandé</p>
                  </div>
                </label>
                <input ref={fileEditRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) changePhoto(editingId, f); e.target.value = '' }} />
              </div>

              {/* Légende / Texte de présentation */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">💬 Texte de présentation (optionnel)</label>
                <textarea
                  rows={2}
                  value={editing.caption}
                  onChange={e => patch(editingId, { caption: e.target.value })}
                  onBlur={e => savePatch(editingId, { caption: e.target.value })}
                  placeholder="Ex : En plein atelier macramé, été 2024…"
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Affiché sous la photo sur le site · Laisse vide pour ne rien afficher</p>
              </div>

              {/* Taille */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">📐 Taille</label>
                  <span className="text-xs font-black text-[#1A1040]">{editing.size} px</span>
                </div>
                <input type="range" min={80} max={700} step={10} value={editing.size}
                  onChange={e => patch(editingId, { size: parseInt(e.target.value) })}
                  onMouseUp={e => savePatch(editingId, { size: parseInt((e.target as HTMLInputElement).value) })}
                  onTouchEnd={e => savePatch(editingId, { size: parseInt((e.target as HTMLInputElement).value) })}
                  className="w-full accent-rose-400" />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                  <span>80 px</span><span>700 px</span>
                </div>
              </div>

              {/* Inclinaison */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">🔄 Inclinaison</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#1A1040]">{editing.rotation}°</span>
                    {editing.rotation !== 0 && (
                      <button onClick={() => savePatch(editingId, { rotation: 0 })}
                        className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-rose-400 transition-colors">
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                </div>
                <input type="range" min={-45} max={45} step={1} value={editing.rotation}
                  onChange={e => patch(editingId, { rotation: parseFloat(e.target.value) })}
                  onMouseUp={e => savePatch(editingId, { rotation: parseFloat((e.target as HTMLInputElement).value) })}
                  onTouchEnd={e => savePatch(editingId, { rotation: parseFloat((e.target as HTMLInputElement).value) })}
                  className="w-full accent-turquoise-500" />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                  <span>-45°</span><span>Droit</span><span>+45°</span>
                </div>
              </div>

              {/* Position (glisser-déposer) */}
              {(editing.offset_x !== 0 || editing.offset_y !== 0) && (
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 border-2 border-gray-200">
                  <p className="text-xs font-black text-gray-500">📍 Position déplacée à la souris</p>
                  <button onClick={() => savePatch(editingId, { offset_x: 0, offset_y: 0 })}
                    className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-rose-400 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Réinitialiser
                  </button>
                </div>
              )}

              {/* Forme */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">Forme</label>
                <div className="flex gap-2">
                  {SHAPES.map(s => (
                    <button key={s.key} onClick={() => savePatch(editingId, { shape: s.key })}
                      className={`flex-1 py-2 text-lg border-2 transition-all ${s.key} ${editing.shape === s.key ? 'bg-[#1A1040] text-white border-[#1A1040]' : 'bg-white text-[#1A1040] border-gray-300 hover:border-[#1A1040]'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Cadre ── */}
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#1A1040]">🖼️ Cadre (bordure)</p>
                  <button onClick={() => savePatch(editingId, { show_cadre: !editing.show_cadre })}
                    className={`relative w-10 h-5 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${editing.show_cadre ? 'bg-lime-400' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-[#1A1040] transition-all ${editing.show_cadre ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {editing.show_cadre && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Couleur</label>
                      <input type="color" value={editing.cadre_color}
                        onChange={e => patch(editingId, { cadre_color: e.target.value })}
                        onBlur={e => savePatch(editingId, { cadre_color: e.target.value })}
                        className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Épaisseur</label>
                      <select value={editing.cadre_width}
                        onChange={e => savePatch(editingId, { cadre_width: parseInt(e.target.value) })}
                        className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-1 text-xs font-black focus:outline-none">
                        <option value={2}>2 px</option>
                        <option value={4}>4 px</option>
                        <option value={6}>6 px</option>
                        <option value={8}>8 px</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Contour ── */}
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#1A1040]">✨ Contour (halo)</p>
                  <button onClick={() => savePatch(editingId, { show_contour: !editing.show_contour })}
                    className={`relative w-10 h-5 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${editing.show_contour ? 'bg-lime-400' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-[#1A1040] transition-all ${editing.show_contour ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {editing.show_contour && (
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Couleur contour</label>
                    <input type="color" value={editing.contour_color}
                      onChange={e => patch(editingId, { contour_color: e.target.value })}
                      onBlur={e => savePatch(editingId, { contour_color: e.target.value })}
                      className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
                  </div>
                )}
              </div>

              {/* ── Fond ── */}
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#1A1040]">🎨 Fond (arrière-plan)</p>
                  <button onClick={() => savePatch(editingId, { show_fond: !editing.show_fond })}
                    className={`relative w-10 h-5 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${editing.show_fond ? 'bg-lime-400' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-[#1A1040] transition-all ${editing.show_fond ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {editing.show_fond && (
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Couleur du fond</label>
                    <input type="color" value={editing.fond_color}
                      onChange={e => patch(editingId, { fond_color: e.target.value })}
                      onBlur={e => savePatch(editingId, { fond_color: e.target.value })}
                      className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
                  </div>
                )}
              </div>

              {/* Visibilité */}
              <div className="flex items-center justify-between bg-candy rounded-2xl px-4 py-4 border-2 border-[#1A1040]/20">
                <div>
                  <p className="text-sm font-black text-[#1A1040]">
                    {editing.is_visible
                      ? <><Eye className="inline w-4 h-4 mr-1" />Visible du public</>
                      : <><EyeOff className="inline w-4 h-4 mr-1" />Masquée du public</>}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {editing.is_visible ? 'La photo apparaît sur le site' : 'La photo est cachée aux visiteurs'}
                  </p>
                </div>
                <button onClick={() => savePatch(editingId, { is_visible: !editing.is_visible })}
                  className={`relative w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${editing.is_visible ? 'bg-lime-400' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#1A1040] transition-all ${editing.is_visible ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Supprimer */}
              <button onClick={() => deletePhoto(editingId)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-300 text-red-500 font-black text-sm hover:bg-red-50 transition-all">
                <Trash2 className="w-4 h-4" /> Supprimer cette photo
              </button>

              {/* Indice drag */}
              <p className="text-center text-[10px] text-gray-400 font-medium pb-2">
                💡 Ferme ce panneau puis glisse la photo pour la repositionner
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
