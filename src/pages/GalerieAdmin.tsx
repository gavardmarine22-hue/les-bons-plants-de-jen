import { useState, useEffect, useRef } from 'react'
import {
  Images, Plus, Pencil, Trash2, X, Check,
  Upload, ChevronUp, ChevronDown, RefreshCw, Palette,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GalerieCategory {
  id: string
  nom: string
  ordre: number
  created_at: string
  cover_url: string | null
  couleur_bg: string
  couleur_texte: string
  icone: string
  icone_visible: boolean
  taille_texte: string
  police: string
  visible: boolean
}

interface GaleriePhoto {
  id: string
  category_id: string
  url: string
  titre: string | null
  created_at: string
}

interface Apparence {
  couleur_bg: string
  couleur_texte: string
  icone: string
  icone_visible: boolean
  taille_texte: string
  police: string
  visible: boolean
}

// ─── Constantes de personnalisation ──────────────────────────────────────────
const BG_PRESETS = [
  '#ffb5c8','#ffe500','#4dd9c0','#c4b5fd','#fdba74','#86efac',
  '#7dd3fc','#f87171','#fde68a','#d9f99d','#a5f3fc','#fecdd3',
  '#1A1040','#374151','#fff5fb','#ffffff',
]

const TEXT_PRESETS = [
  '#1A1040','#ffffff','#374151','#f9fafb',
  '#e11d48','#4dd9c0','#ffe500','#7c3aed',
]

const EMOJIS = [
  '🪢','🧵','💎','🎨','🌸','✨','🎀','🧶',
  '🪡','🎭','🖌️','🌺','💐','🦋','🌟','🌙',
  '🍀','🌿','🎁','🎊','🏵️','🌈','🦚','🦜',
  '🌻','🌷','🌹','💮','🪷','🐝','🧁','🎉',
  '⭐','🌾','🪻','🫧','🎠','🏺','🧿','🎑',
  '🪬','🌊','🍃','🎋','🌄','💫','🔮','🌠',
]

const FONTS = [
  { value: 'serif',   label: 'Serif — élégant',    preview: 'font-serif'   },
  { value: 'sans',    label: 'Sans-serif — moderne',preview: ''             },
  { value: 'cursive', label: 'Cursive — manuscrit', preview: 'font-cursive' },
  { value: 'mono',    label: 'Mono — technique',    preview: 'font-mono'    },
]

const TEXT_SIZES = [
  { value: 'text-lg',  label: 'Petit'      },
  { value: 'text-xl',  label: 'Moyen'      },
  { value: 'text-2xl', label: 'Grand'      },
  { value: 'text-3xl', label: 'Très grand' },
]

const FONT_FAMILY: Record<string, string> = {
  serif:   'serif',
  sans:    'sans-serif',
  cursive: 'cursive',
  mono:    'monospace',
}

function defaultApparence(): Apparence {
  return { couleur_bg: '#ffb5c8', couleur_texte: '#1A1040', icone: '🎨', icone_visible: true, taille_texte: 'text-2xl', police: 'serif', visible: true }
}

// ─── Page admin Galerie ───────────────────────────────────────────────────────
export default function GalerieAdmin() {
  const [categories, setCategories]   = useState<GalerieCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<GalerieCategory | null>(null)
  const [photos, setPhotos]           = useState<GaleriePhoto[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [rightTab, setRightTab]       = useState<'photos' | 'apparence'>('photos')

  // Gestion catégories
  const [showAddCat, setShowAddCat]   = useState(false)
  const [newCatNom, setNewCatNom]     = useState('')
  const [editCatId, setEditCatId]     = useState<string | null>(null)
  const [editCatNom, setEditCatNom]   = useState('')
  const [savingCat, setSavingCat]     = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)

  // Apparence
  const [apparence, setApparence]         = useState<Apparence>(defaultApparence())
  const [savingApparence, setSavingApparence] = useState(false)
  const [uploadingCover, setUploadingCover]   = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Upload photos
  const [uploading, setUploading]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Édition photo
  const [editingPhoto,   setEditingPhoto]   = useState<GaleriePhoto | null>(null)
  const [editPhotoTitre, setEditPhotoTitre] = useState('')
  const [savingTitre,    setSavingTitre]    = useState(false)

  useEffect(() => { loadCategories() }, [])

  // ── Chargement ──────────────────────────────────────────────────────────────

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('galerie_categories')
      .select('*')
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true })
    setCategories((data as GalerieCategory[]) || [])
    setLoading(false)
  }

  async function loadPhotos(catId: string) {
    setLoadingPhotos(true)
    const { data } = await supabase
      .from('galerie_photos')
      .select('*')
      .eq('category_id', catId)
      .order('created_at', { ascending: false })
    setPhotos((data as GaleriePhoto[]) || [])
    setLoadingPhotos(false)
  }

  async function selectCategory(cat: GalerieCategory) {
    setSelectedCat(cat)
    setApparence({
      couleur_bg:    cat.couleur_bg    || '#ffb5c8',
      couleur_texte: cat.couleur_texte || '#1A1040',
      icone:         cat.icone         || '🎨',
      icone_visible: cat.icone_visible !== false,
      taille_texte:  cat.taille_texte  || 'text-2xl',
      police:        cat.police        || 'serif',
      visible:       cat.visible       !== false,
    })
    setRightTab('photos')
    await loadPhotos(cat.id)
  }

  // ── CRUD catégories ─────────────────────────────────────────────────────────

  async function addCategory() {
    if (!newCatNom.trim()) return
    setSavingCat(true)
    const maxOrdre = categories.length > 0 ? Math.max(...categories.map(c => c.ordre)) + 1 : 0
    const { data, error } = await supabase
      .from('galerie_categories')
      .insert({
        nom: newCatNom.trim(), ordre: maxOrdre,
        couleur_bg: '#ffb5c8', couleur_texte: '#1A1040',
        icone: '🎨', icone_visible: true, taille_texte: 'text-2xl', police: 'serif', visible: true,
      })
      .select()
      .single()
    if (!error && data) {
      setCategories(prev => [...prev, data as GalerieCategory])
      setNewCatNom('')
      setShowAddCat(false)
    }
    setSavingCat(false)
  }

  async function updateCategory(id: string) {
    if (!editCatNom.trim()) return
    setSavingCat(true)
    const { error } = await supabase
      .from('galerie_categories').update({ nom: editCatNom.trim() }).eq('id', id)
    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, nom: editCatNom.trim() } : c))
      if (selectedCat?.id === id) setSelectedCat(prev => prev ? { ...prev, nom: editCatNom.trim() } : null)
      setEditCatId(null)
    }
    setSavingCat(false)
  }

  async function deleteCategory(id: string) {
    setDeletingCatId(id)
    await supabase.from('galerie_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    if (selectedCat?.id === id) { setSelectedCat(null); setPhotos([]) }
    setDeletingCatId(null)
    setConfirmDeleteCat(null)
  }

  async function moveCategory(id: string, dir: 'up' | 'down') {
    const idx = categories.findIndex(c => c.id === id)
    if (idx < 0) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === categories.length - 1) return
    const other = categories[dir === 'up' ? idx - 1 : idx + 1]
    const current = categories[idx]
    await Promise.all([
      supabase.from('galerie_categories').update({ ordre: other.ordre }).eq('id', current.id),
      supabase.from('galerie_categories').update({ ordre: current.ordre }).eq('id', other.id),
    ])
    const next = [...categories]
    next[idx] = { ...current, ordre: other.ordre }
    next[dir === 'up' ? idx - 1 : idx + 1] = { ...other, ordre: current.ordre }
    next.sort((a, b) => a.ordre - b.ordre || a.created_at.localeCompare(b.created_at))
    setCategories(next)
  }

  // ── Apparence ───────────────────────────────────────────────────────────────

  async function saveApparence() {
    if (!selectedCat) return
    setSavingApparence(true)
    const { error } = await supabase
      .from('galerie_categories')
      .update(apparence)
      .eq('id', selectedCat.id)
    if (!error) {
      const updated = { ...selectedCat, ...apparence }
      setCategories(prev => prev.map(c => c.id === selectedCat.id ? updated : c))
      setSelectedCat(updated)
    }
    setSavingApparence(false)
  }

  async function uploadCover(file: File) {
    if (!selectedCat) return
    setUploadingCover(true)
    const ext      = file.name.split('.').pop() ?? 'jpg'
    const fileName = `covers/${selectedCat.id}_${Date.now()}.${ext}`
    const { data: up, error } = await supabase.storage
      .from('galerie')
      .upload(fileName, file, { upsert: true, contentType: file.type })
    if (!error && up) {
      const { data: urlData } = supabase.storage.from('galerie').getPublicUrl(up.path)
      const url = urlData.publicUrl
      await supabase.from('galerie_categories').update({ cover_url: url }).eq('id', selectedCat.id)
      const updated = { ...selectedCat, cover_url: url }
      setCategories(prev => prev.map(c => c.id === selectedCat.id ? updated : c))
      setSelectedCat(updated)
    }
    setUploadingCover(false)
  }

  async function removeCover() {
    if (!selectedCat?.cover_url) return
    try {
      const url   = new URL(selectedCat.cover_url)
      const parts = url.pathname.split('/object/public/galerie/')
      if (parts[1]) await supabase.storage.from('galerie').remove([parts[1]])
    } catch { /* ignore */ }
    await supabase.from('galerie_categories').update({ cover_url: null }).eq('id', selectedCat.id)
    const updated = { ...selectedCat, cover_url: null }
    setCategories(prev => prev.map(c => c.id === selectedCat.id ? updated : c))
    setSelectedCat(updated)
  }

  // ── Upload photos ───────────────────────────────────────────────────────────

  async function uploadPhotos(files: FileList) {
    if (!selectedCat || !files.length) return
    setUploading(true)
    let done = 0
    for (const file of Array.from(files)) {
      const ext      = file.name.split('.').pop() ?? 'jpg'
      const fileName = `${selectedCat.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data: up, error: upErr } = await supabase.storage
        .from('galerie').upload(fileName, file, { contentType: file.type })
      if (!upErr && up) {
        const { data: urlData } = supabase.storage.from('galerie').getPublicUrl(up.path)
        const { data: photoData } = await supabase
          .from('galerie_photos')
          .insert({ category_id: selectedCat.id, url: urlData.publicUrl })
          .select().single()
        if (photoData) setPhotos(prev => [photoData as GaleriePhoto, ...prev])
      }
      done++
      setUploadProgress(Math.round((done / files.length) * 100))
    }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deletePhoto(photo: GaleriePhoto) {
    setDeletingPhotoId(photo.id)
    try {
      const url   = new URL(photo.url)
      const parts = url.pathname.split('/object/public/galerie/')
      if (parts[1]) await supabase.storage.from('galerie').remove([parts[1]])
    } catch { /* ignore */ }
    const { error } = await supabase.from('galerie_photos').delete().eq('id', photo.id)
    if (!error) setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setDeletingPhotoId(null)
  }

  function openEditPhoto(photo: GaleriePhoto) {
    setEditingPhoto(photo)
    setEditPhotoTitre(photo.titre || '')
  }

  async function savePhotoTitre() {
    if (!editingPhoto) return
    setSavingTitre(true)
    const { error } = await supabase
      .from('galerie_photos')
      .update({ titre: editPhotoTitre.trim() || null })
      .eq('id', editingPhoto.id)
    if (!error) {
      setPhotos(prev => prev.map(p =>
        p.id === editingPhoto.id ? { ...p, titre: editPhotoTitre.trim() || null } : p
      ))
      setEditingPhoto(null)
    }
    setSavingTitre(false)
  }

  // ── Aperçu carte ────────────────────────────────────────────────────────────

  function CardPreview({ cat, app }: { cat: GalerieCategory; app: Apparence }) {
    return (
      <div
        className="rounded-2xl border-3 border-[#1A1040] overflow-hidden relative"
        style={{ backgroundColor: app.couleur_bg, boxShadow: '4px 4px 0px 0px #1A1040', minHeight: 120 }}
      >
        {cat.cover_url && (
          <>
            <img src={cat.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/35" />
          </>
        )}
        <div className="relative z-10 p-5">
          {app.icone_visible && <div className="text-3xl mb-2">{app.icone}</div>}
          <p
            className={`font-black leading-tight ${app.taille_texte}`}
            style={{
              color: cat.cover_url ? '#ffffff' : app.couleur_texte,
              fontFamily: FONT_FAMILY[app.police] || 'serif',
            }}
          >
            {cat.nom}
          </p>
          <p className="text-xs font-bold mt-1 opacity-60"
            style={{ color: cat.cover_url ? '#ffffff' : app.couleur_texte }}>
            Voir les créations →
          </p>
        </div>
      </div>
    )
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🖼️</div>
        <p className="font-black text-[#1A1040]">Chargement...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-candy">

      {/* ── En-tête ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
            style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
            <Images className="w-7 h-7 text-[#1A1040]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
              🔐 Espace administrateur
            </div>
            <h1 className="font-serif text-3xl font-black text-white">
              Galerie <span className="text-citron-400">✦</span>
            </h1>
          </div>
          <button
            onClick={() => { loadCategories(); if (selectedCat) loadPhotos(selectedCat.id) }}
            className="ml-auto flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Panneau gauche : catégories ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
            style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>

            <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-white text-lg">Catégories</h2>
              <button
                onClick={() => { setShowAddCat(true); setEditCatId(null) }}
                className="flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-3 py-1.5 rounded-xl text-xs font-black border-2 border-citron-300 hover:bg-yellow-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* Formulaire ajout */}
            {showAddCat && (
              <div className="px-5 py-4 border-b-2 border-[#1A1040]/10 bg-citron-50">
                <p className="text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Nouvelle catégorie</p>
                <input
                  type="text"
                  value={newCatNom}
                  onChange={e => setNewCatNom(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCategory()
                    if (e.key === 'Escape') { setShowAddCat(false); setNewCatNom('') }
                  }}
                  placeholder="ex. Aquarelle, Broderie..."
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#1A1040] text-sm font-bold text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-citron-400 mb-3"
                />
                <div className="flex gap-2">
                  <button onClick={addCategory} disabled={savingCat || !newCatNom.trim()}
                    className="flex items-center gap-1.5 bg-[#1A1040] text-citron-400 px-4 py-1.5 rounded-xl text-xs font-black disabled:opacity-50 hover:bg-[#2d2060] transition-colors">
                    <Check className="w-3.5 h-3.5" /> Créer
                  </button>
                  <button onClick={() => { setShowAddCat(false); setNewCatNom('') }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-100 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Liste */}
            <div className="divide-y-2 divide-[#1A1040]/8">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400 px-6">
                  <div className="text-4xl mb-2">📂</div>
                  <p className="text-sm font-bold">Aucune catégorie</p>
                </div>
              ) : (
                categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
                      selectedCat?.id === cat.id ? 'bg-rose-50 border-l-4 border-rose-400' : 'hover:bg-candy/40'
                    }`}
                    onClick={() => selectCategory(cat)}
                  >
                    {/* Mini aperçu couleur */}
                    <span className="text-lg shrink-0">{cat.icone || '🎨'}</span>

                    {editCatId === cat.id ? (
                      <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text" value={editCatNom}
                          onChange={e => setEditCatNom(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateCategory(cat.id)
                            if (e.key === 'Escape') setEditCatId(null)
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 rounded-lg border-2 border-[#1A1040] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citron-400"
                        />
                        <button onClick={() => updateCategory(cat.id)} disabled={savingCat}
                          className="p-1.5 bg-lime-400 rounded-lg border-2 border-[#1A1040] hover:bg-lime-300 disabled:opacity-50">
                          <Check className="w-3.5 h-3.5 text-[#1A1040]" />
                        </button>
                        <button onClick={() => setEditCatId(null)}
                          className="p-1.5 bg-gray-200 rounded-lg border-2 border-gray-300 hover:bg-gray-300">
                          <X className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-black truncate ${
                          selectedCat?.id === cat.id ? 'text-rose-600' : cat.visible === false ? 'text-gray-400' : 'text-[#1A1040]'
                        }`}>
                          {cat.nom}
                          {cat.visible === false && (
                            <span className="ml-1.5 text-[10px] font-black bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">masquée</span>
                          )}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => moveCategory(cat.id, 'up')} disabled={idx === 0}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400 hover:text-gray-700">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveCategory(cat.id, 'down')} disabled={idx === categories.length - 1}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400 hover:text-gray-700">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditCatId(cat.id); setEditCatNom(cat.nom) }}
                            className="p-1 rounded hover:bg-citron-100 text-gray-400 hover:text-[#1A1040]">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteCat === cat.id ? (
                            <div className="flex items-center gap-1 bg-red-50 rounded-lg px-1.5 py-0.5 border border-red-200">
                              <span className="text-[10px] text-red-600 font-black whitespace-nowrap">Supprimer ?</span>
                              <button onClick={() => deleteCategory(cat.id)} disabled={!!deletingCatId}
                                className="p-0.5 bg-red-500 rounded text-white hover:bg-red-600 disabled:opacity-50">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => setConfirmDeleteCat(null)}
                                className="p-0.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteCat(cat.id)}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Panneau droit ── */}
        <div className="lg:col-span-2">
          {!selectedCat ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border-4 border-dashed border-[#1A1040]/25 text-center">
              <div className="text-5xl mb-3">👈</div>
              <p className="font-black text-[#1A1040]/40 text-lg">Sélectionnez une catégorie</p>
              <p className="text-sm text-gray-400 mt-1">pour gérer ses photos et son apparence</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
              style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>

              {/* Tabs */}
              <div className="bg-[#1A1040] px-6 pt-4 flex items-end gap-1">
                <div className="flex-1 min-w-0 mb-3">
                  <p className="text-rose-300 text-xs font-bold">Catégorie sélectionnée</p>
                  <h2 className="font-black text-white text-lg truncate">{selectedCat.nom}</h2>
                </div>
                <button
                  onClick={() => setRightTab('photos')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-black transition-colors ${
                    rightTab === 'photos'
                      ? 'bg-white text-[#1A1040]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  📸 Photos
                  {photos.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      rightTab === 'photos' ? 'bg-rose-400 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {photos.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setRightTab('apparence')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-black transition-colors ${
                    rightTab === 'apparence'
                      ? 'bg-white text-[#1A1040]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" /> Apparence
                </button>
              </div>

              {/* ── Onglet Photos ── */}
              {rightTab === 'photos' && (
                <>
                  <div className="px-6 py-4 border-b-2 border-[#1A1040]/10 flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500">
                      {photos.length} photo{photos.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="ml-auto flex items-center gap-1.5 bg-[#1A1040] text-citron-400 px-4 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-colors"
                    >
                      {uploading
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? `Envoi ${uploadProgress}%` : 'Ajouter des photos'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { if (e.target.files) uploadPhotos(e.target.files) }} />
                  </div>

                  {uploading && (
                    <div className="w-full h-1.5 bg-gray-100">
                      <div className="h-full bg-citron-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  <div className="p-6">
                    {loadingPhotos ? (
                      <div className="text-center py-16">
                        <div className="text-4xl mb-3 animate-pulse">📸</div>
                        <p className="font-black text-[#1A1040]/60">Chargement...</p>
                      </div>
                    ) : photos.length === 0 ? (
                      <div className="border-4 border-dashed border-[#1A1040]/20 rounded-2xl py-16 text-center cursor-pointer hover:border-[#1A1040]/40 transition-colors"
                        onClick={() => fileInputRef.current?.click()}>
                        <div className="text-5xl mb-3">📸</div>
                        <p className="font-black text-[#1A1040]/40 text-lg">Aucune photo</p>
                        <p className="text-sm text-gray-400 mt-1">Cliquez ici pour ajouter des photos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {photos.map(photo => (
                          <div key={photo.id} className="relative group">
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-[#1A1040]"
                              style={{ boxShadow: '2px 2px 0px 0px #1A1040' }}>
                              <img src={photo.url} alt={photo.titre || ''} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 border-2 border-[#1A1040]">
                              <button onClick={() => openEditPhoto(photo)}
                                className="flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-3 py-1.5 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-yellow-300">
                                <Pencil className="w-3.5 h-3.5" /> Modifier
                              </button>
                              <button onClick={() => deletePhoto(photo)} disabled={deletingPhotoId === photo.id}
                                className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black border-2 border-white hover:bg-red-600 disabled:opacity-60">
                                {deletingPhotoId === photo.id
                                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                                Supprimer
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 text-center">
                              {new Date(photo.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            {photo.titre && (
                              <p className="text-[10px] text-[#1A1040] font-bold mt-0.5 text-center truncate px-1" title={photo.titre}>
                                {photo.titre}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Onglet Apparence ── */}
              {rightTab === 'apparence' && (
                <div className="p-6 space-y-6">

                  {/* ── Visibilité de la catégorie ── */}
                  <div className={`rounded-2xl border-3 border-[#1A1040] px-5 py-4 flex items-center justify-between gap-4 ${
                    apparence.visible ? 'bg-lime-50 border-lime-400' : 'bg-gray-100 border-gray-300'
                  }`} style={{ borderWidth: 3 }}>
                    <div>
                      <p className="text-sm font-black text-[#1A1040]">
                        {apparence.visible ? '👁 Catégorie visible' : '🙈 Catégorie masquée'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {apparence.visible
                          ? 'Cette catégorie est affichée dans la galerie publique'
                          : 'Les visiteurs ne verront pas cette catégorie'}
                      </p>
                    </div>
                    <button
                      onClick={() => setApparence(prev => ({ ...prev, visible: !prev.visible }))}
                      className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-sm transition-all ${
                        apparence.visible
                          ? 'bg-lime-400 border-[#1A1040] text-[#1A1040] hover:bg-lime-300'
                          : 'bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400'
                      }`}
                    >
                      {apparence.visible ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {apparence.visible ? 'Visible' : 'Masquée'}
                    </button>
                  </div>

                  <div className="border-t-2 border-[#1A1040]/10" />

                  {/* Aperçu en direct */}
                  <div>
                    <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-3">Aperçu en direct</p>
                    <div className="max-w-xs">
                      <CardPreview cat={selectedCat} app={apparence} />
                    </div>
                  </div>

                  <div className="border-t-2 border-[#1A1040]/10" />

                  {/* Photo de couverture */}
                  <div>
                    <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-3">Photo de couverture</p>
                    {selectedCat.cover_url ? (
                      <div className="flex items-start gap-4">
                        <div className="w-28 h-20 rounded-xl overflow-hidden border-2 border-[#1A1040] shrink-0"
                          style={{ boxShadow: '2px 2px 0px 0px #1A1040' }}>
                          <img src={selectedCat.cover_url} alt="cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                            className="flex items-center gap-1.5 bg-[#1A1040] text-citron-400 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-[#2d2060] transition-colors disabled:opacity-50">
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingCover ? 'Envoi...' : 'Changer'}
                          </button>
                          <button onClick={removeCover}
                            className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-red-200 transition-colors border border-red-200">
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                          </button>
                          <p className="text-[10px] text-gray-400">La photo remplace la couleur de fond</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="flex items-center gap-2 border-3 border-dashed border-[#1A1040]/30 rounded-xl px-5 py-4 text-sm font-bold text-gray-500 hover:border-[#1A1040]/60 hover:text-[#1A1040] transition-colors disabled:opacity-50"
                      >
                        {uploadingCover ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingCover ? 'Envoi en cours...' : 'Ajouter une photo de couverture'}
                      </button>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) uploadCover(e.target.files[0]) }} />
                  </div>

                  <div className="border-t-2 border-[#1A1040]/10" />

                  {/* Couleur de fond */}
                  <div>
                    <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-3">
                      Couleur de fond{selectedCat.cover_url ? ' (masquée par la photo)' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {BG_PRESETS.map(color => (
                        <button
                          key={color}
                          onClick={() => setApparence(prev => ({ ...prev, couleur_bg: color }))}
                          className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                            apparence.couleur_bg === color ? 'border-[#1A1040] scale-110 ring-2 ring-[#1A1040] ring-offset-1' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={apparence.couleur_bg}
                        onChange={e => setApparence(prev => ({ ...prev, couleur_bg: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-2 border-[#1A1040] cursor-pointer"
                      />
                      <span className="text-sm font-bold text-gray-600">Couleur personnalisée : {apparence.couleur_bg}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-[#1A1040]/10" />

                  {/* Icône */}
                  <div>
                    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                      <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">
                        Icône — sélectionnée : <span className="text-2xl">{apparence.icone}</span>
                      </p>
                      <button
                        onClick={() => setApparence(prev => ({ ...prev, icone_visible: !prev.icone_visible }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 font-black text-xs transition-all ${
                          apparence.icone_visible
                            ? 'bg-lime-400 border-[#1A1040] text-[#1A1040] hover:bg-lime-300'
                            : 'bg-gray-200 border-gray-400 text-gray-500 hover:bg-gray-300'
                        }`}
                      >
                        {apparence.icone_visible ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        Icône {apparence.icone_visible ? 'active' : 'masquée'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setApparence(prev => ({ ...prev, icone: emoji }))}
                          className={`w-10 h-10 text-xl rounded-xl border-2 transition-all hover:scale-110 flex items-center justify-center ${
                            apparence.icone === emoji
                              ? 'border-[#1A1040] bg-citron-100 scale-110'
                              : 'border-transparent hover:border-[#1A1040]/30 hover:bg-gray-50'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-[#1A1040]/10" />

                  {/* Texte */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Police */}
                    <div>
                      <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">Police</p>
                      <div className="space-y-1.5">
                        {FONTS.map(f => (
                          <button
                            key={f.value}
                            onClick={() => setApparence(prev => ({ ...prev, police: f.value }))}
                            className={`w-full text-left px-3 py-2 rounded-xl border-2 text-sm transition-colors ${
                              apparence.police === f.value
                                ? 'border-[#1A1040] bg-[#1A1040] text-citron-400'
                                : 'border-gray-200 hover:border-[#1A1040]/40 text-[#1A1040]'
                            }`}
                            style={{ fontFamily: FONT_FAMILY[f.value] }}
                          >
                            {f.label.split(' — ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Taille */}
                    <div>
                      <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">Taille du texte</p>
                      <div className="space-y-1.5">
                        {TEXT_SIZES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setApparence(prev => ({ ...prev, taille_texte: s.value }))}
                            className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-colors ${
                              apparence.taille_texte === s.value
                                ? 'border-[#1A1040] bg-[#1A1040] text-citron-400 font-black text-sm'
                                : 'border-gray-200 hover:border-[#1A1040]/40 text-[#1A1040]'
                            } ${s.value}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Couleur du texte */}
                    <div>
                      <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">Couleur du texte</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {TEXT_PRESETS.map(color => (
                          <button
                            key={color}
                            onClick={() => setApparence(prev => ({ ...prev, couleur_texte: color }))}
                            className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                              apparence.couleur_texte === color ? 'border-[#1A1040] scale-110 ring-2 ring-[#1A1040] ring-offset-1' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={apparence.couleur_texte}
                        onChange={e => setApparence(prev => ({ ...prev, couleur_texte: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-2 border-[#1A1040] cursor-pointer"
                        title="Couleur personnalisée"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">{apparence.couleur_texte}</p>
                    </div>
                  </div>

                  {/* Bouton sauvegarder */}
                  <div className="pt-2">
                    <button
                      onClick={saveApparence}
                      disabled={savingApparence}
                      className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-8 py-3 rounded-xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-60 transition-colors"
                      style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}
                    >
                      {savingApparence
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sauvegarde...</>
                        : <><Check className="w-4 h-4" /> Enregistrer l'apparence</>}
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* ── Modal édition photo ── */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingPhoto(null)}>
          <div
            className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 space-y-4"
            style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[#1A1040] text-lg">✏️ Modifier la photo</h3>
              <button onClick={() => setEditingPhoto(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 font-black text-gray-500">
                ✕
              </button>
            </div>

            <img src={editingPhoto.url} alt=""
              className="w-full h-40 object-cover rounded-2xl border-2 border-[#1A1040]"
              style={{ boxShadow: '2px 2px 0px 0px #1A1040' }} />

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1.5 block">
                Texte / Légende
              </label>
              <input
                type="text"
                value={editPhotoTitre}
                onChange={e => setEditPhotoTitre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') savePhotoTitre() }}
                placeholder="Ex : Porte-clés macramé personnalisé…"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 bg-[#fff5fb]"
                autoFocus
              />
              <p className="text-[10px] text-gray-400 mt-1">Ce texte s'affiche sous la photo dans la galerie.</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditingPhoto(null)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-2.5 font-black text-[#1A1040] text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={savePhotoTitre}
                disabled={savingTitre}
                className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-2.5 font-black text-sm hover:bg-[#2d2060] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}
              >
                {savingTitre
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sauvegarde...</>
                  : <><Check className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
