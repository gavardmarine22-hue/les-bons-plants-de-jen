import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users, ChevronLeft, Upload, X, Image as ImageIcon, Palette } from 'lucide-react'
import { buildHeroBgStyle, type HeroBg, type BgType, DEFAULT_HERO_BG, loadCachedBg, saveCachedBg } from '../lib/heroBg'
import { useSEO } from '../lib/seo'
import BgEditor from '../components/BgEditor'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Atelier, AtelierCategory } from '../types'
import AtelierFormModal, { NIVEAUX } from '../components/AtelierFormModal'
import ReservationModal from '../components/ReservationModal'
import HeroTitleEditor, { type HeroStyle, DEFAULT_HERO_STYLE, buildTitleStyle } from '../components/HeroTitleEditor'
import HeroPolaroidDisplay from '../components/HeroPolaroidDisplay'
import HeroPolaroidManager, { type HeroPolaroid } from '../components/HeroPolaroidManager'

// ─── Hero éditable ────────────────────────────────────────────────────────────
interface BadgeConfig { text: string; bg: string; textColor: string; radius: string }
const DEFAULT_ATELIERS_BADGE: BadgeConfig = { text: '📸 Nos ateliers créatifs', bg: '#ffe500', textColor: '#1A1040', radius: 'rounded-full' }
const DEFAULT_ATELIERS_TITRE_STYLE: HeroStyle = {
  ...DEFAULT_HERO_STYLE, font: 'serif', fontSize: 48, color: '#ffffff', bold: true, shadow: false,
}
const DEFAULT_ATELIERS_SOUS_STYLE: HeroStyle = {
  ...DEFAULT_HERO_STYLE, font: 'sans', fontSize: 18, color: '#d1d5db', bold: false, shadow: false,
}
const DEFAULT_ATELIERS_TITRE = 'Nos Ateliers <span style="color:#fb7185">✦</span>'
const DEFAULT_ATELIERS_SOUS  = 'Choisis ta catégorie et découvre nos ateliers créatifs !'

const DESC_FONT_MAP: Record<string, string> = { sans: 'sans-serif', serif: 'serif', mono: 'monospace', cursive: 'cursive' }
interface DescStyle { font: string; size: number; color: string }
const DEFAULT_DESC_STYLE: DescStyle = { font: 'sans', size: 13, color: '#4b5563' }

// ─── Déco polaroïd ───────────────────────────────────────────────────────────
const ROTATIONS  = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-3', 'rotate-1']
const TAPE_COLORS = ['bg-citron-400/70', 'bg-rose-400/70', 'bg-turquoise-400/70', 'bg-lime-300/70', 'bg-rose-300/60']

function dateLongue(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function moisAnnee(d: string) {
  const txt = new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

function moisAnneeKey(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2, '0')}`
}

// ─── Modale catégorie ─────────────────────────────────────────────────────────
interface CatModalProps {
  cat: AtelierCategory | null
  onClose: () => void
  onSaved: (cats: AtelierCategory[]) => void
}

function CategoryModal({ cat, onClose, onSaved }: CatModalProps) {
  const [nom,         setNom]         = useState(cat?.nom         || '')
  const [description, setDescription] = useState(cat?.description || '')
  const [coverFile,   setCoverFile]   = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(cat?.cover_url || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isEdit = !!cat

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) { setError('Le nom est requis'); return }
    setSaving(true); setError('')
    try {
      let cover_url = cat?.cover_url ?? null
      if (coverFile) {
        const ext  = coverFile.name.split('.').pop()
        const path = `categories/${Date.now()}.${ext}`
        await supabase.storage.from('ateliers').upload(path, coverFile, { upsert: true })
        cover_url = supabase.storage.from('ateliers').getPublicUrl(path).data.publicUrl
      }
      const payload = { nom: nom.trim(), description: description.trim() || null, cover_url }
      if (isEdit && cat) {
        await supabase.from('atelier_categories').update(payload).eq('id', cat.id)
      } else {
        await supabase.from('atelier_categories').insert([payload])
      }
      const { data } = await supabase
        .from('atelier_categories').select('*')
        .order('ordre').order('created_at')
      onSaved((data as AtelierCategory[]) || [])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-md overflow-hidden"
        style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>

        <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="font-serif text-xl font-black text-citron-400">
            {isEdit ? '✏️ Modifier la catégorie' : '✨ Nouvelle catégorie'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold border-2 border-red-200">{error}</p>
          )}

          {/* Photo de couverture */}
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-1.5 uppercase tracking-wide">
              📸 Photo de couverture
            </label>
            <div
              className="border-4 border-dashed border-[#1A1040] rounded-2xl overflow-hidden cursor-pointer hover:bg-rose-50 transition-colors"
              onClick={() => document.getElementById('cat-cover-input')?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" draggable={false}
                  className="w-full h-44 object-cover pointer-events-none" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-bold">Cliquer pour ajouter une photo</span>
                </div>
              )}
              <input id="cat-cover-input" type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-1.5 uppercase tracking-wide">
              🏷️ Nom de la catégorie
            </label>
            <input
              required value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Ex: Macramé"
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-1.5 uppercase tracking-wide">
              📝 Description
            </label>
            <textarea
              rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez cette catégorie d'ateliers..."
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-candy resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-3 rounded-2xl font-black text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#1A1040] text-citron-400 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-60"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              {saving ? '⏳ Enregistrement...' : isEdit ? '✅ Modifier' : '🚀 Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function NosAteliers() {
  useSEO(
    'Nos ateliers — Les bons plants de Jen',
    'Découvrez nos ateliers autour du jardinage et des plants à Prinquiau (Loire-Atlantique).'
  )
  const { isAdmin } = useAuth()
  const [categories,   setCategories]   = useState<AtelierCategory[]>([])
  const [selectedCat,  setSelectedCat]  = useState<AtelierCategory | null>(null)
  const [ateliers,     setAteliers]     = useState<Atelier[]>([])
  const [loading,         setLoading]         = useState(true)
  const [loadingAteliers, setLoadingAteliers] = useState(false)

  const [reservingAtelier,     setReservingAtelier]     = useState<Atelier | null>(null)
  const [showAtelierModal,     setShowAtelierModal]     = useState(false)
  const [editingAtelier,       setEditingAtelier]       = useState<Atelier | null>(null)
  const [deleteAtelierConfirm, setDeleteAtelierConfirm] = useState<string | null>(null)

  const [showCatModal,    setShowCatModal]    = useState(false)
  const [editingCat,      setEditingCat]      = useState<AtelierCategory | null>(null)
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<string | null>(null)

  // Polaroïds
  const [atelierPolaroids,   setAtelierPolaroids]   = useState<HeroPolaroid[]>([])
  const [showPolaroidManager, setShowPolaroidManager] = useState(false)

  // Hero éditable (badge, titre, sous-titre)
  const [heroBadge,      setHeroBadge]      = useState<BadgeConfig>(DEFAULT_ATELIERS_BADGE)
  const [heroTitre,      setHeroTitre]      = useState(DEFAULT_ATELIERS_TITRE)
  const [heroTitreStyle, setHeroTitreStyle] = useState<HeroStyle>(DEFAULT_ATELIERS_TITRE_STYLE)
  const [heroSous,       setHeroSous]       = useState(DEFAULT_ATELIERS_SOUS)
  const [heroSousStyle,  setHeroSousStyle]  = useState<HeroStyle>(DEFAULT_ATELIERS_SOUS_STYLE)
  const [showBadgeEditor, setShowBadgeEditor] = useState(false)
  const [showTitreEditor, setShowTitreEditor] = useState(false)
  const [showSousEditor,  setShowSousEditor]  = useState(false)

  // Style des descriptifs d'atelier
  const [descStyle, setDescStyle] = useState<DescStyle>(DEFAULT_DESC_STYLE)
  const [showDescEditor, setShowDescEditor] = useState(false)

  // Fond du hero
  const [ateliersBg, setAteliersBg] = useState<HeroBg>(() => loadCachedBg('ateliers_bg_config', { ...DEFAULT_HERO_BG, color: '#1A1040' }))
  const [ateliersBgTab, setAteliersBgTab] = useState<BgType>(() => loadCachedBg('ateliers_bg_config', { ...DEFAULT_HERO_BG, color: '#1A1040' }).type)
  const [showBgEditor, setShowBgEditor] = useState(false)
  const [bgUploading, setBgUploading] = useState(false)
  const [bgUploadError, setBgUploadError] = useState('')
  const bgFileRef = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Regroupement des ateliers par mois/année (ateliers déjà triés par date ascendante)
  const ateliersGroupes = (() => {
    const groups: { key: string; label: string; items: Atelier[] }[] = []
    for (const atelier of ateliers) {
      const key = moisAnneeKey(atelier.date)
      let group = groups.find(g => g.key === key)
      if (!group) { group = { key, label: moisAnnee(atelier.date), items: [] }; groups.push(group) }
      group.items.push(atelier)
    }
    return groups
  })()

  async function loadAtelierPolaroids() {
    const { data } = await supabase.from('atelier_polaroids').select('*').order('sort_order')
    setAtelierPolaroids((data as HeroPolaroid[]) || [])
  }

  function handlePolaroidMoved(id: string, offset_x: number, offset_y: number) {
    setAtelierPolaroids(prev => prev.map(p => p.id === id ? { ...p, offset_x, offset_y } : p))
  }

  useEffect(() => { loadCategories(); loadHero(); loadAtelierPolaroids() }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = ateliersBg.videoMuted
  }, [ateliersBg.videoMuted])

  async function loadHero() {
    const [{ data: settings }, { data: content }] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'ateliers_badge_config', 'ateliers_titre_style', 'ateliers_soustitre_style', 'ateliers_desc_style', 'ateliers_bg_config',
      ]),
      supabase.from('page_content').select('section, contenu').eq('page', 'ateliers')
        .in('section', ['ateliers_titre', 'ateliers_soustitre']),
    ])
    ;(settings || []).forEach((s: { key: string; value: string }) => {
      try {
        if (s.key === 'ateliers_badge_config')     setHeroBadge(p => ({ ...p, ...JSON.parse(s.value) }))
        if (s.key === 'ateliers_titre_style')      setHeroTitreStyle(p => ({ ...p, ...JSON.parse(s.value) }))
        if (s.key === 'ateliers_soustitre_style')  setHeroSousStyle(p => ({ ...p, ...JSON.parse(s.value) }))
        if (s.key === 'ateliers_desc_style')       setDescStyle(p => ({ ...p, ...JSON.parse(s.value) }))
        if (s.key === 'ateliers_bg_config') {
          const v = JSON.parse(s.value)
          setAteliersBg(p => { const m = { ...p, ...v }; saveCachedBg('ateliers_bg_config', m); return m })
          setAteliersBgTab(v.type || 'color')
        }
      } catch {}
    })
    ;(content || []).forEach((c: { section: string; contenu: string }) => {
      if (c.section === 'ateliers_titre')     setHeroTitre(c.contenu)
      if (c.section === 'ateliers_soustitre') setHeroSous(c.contenu)
    })
  }

  async function saveBadge() {
    await supabase.from('settings').upsert({ key: 'ateliers_badge_config', value: JSON.stringify(heroBadge) }, { onConflict: 'key' })
    setShowBadgeEditor(false)
  }

  async function saveBg() {
    await supabase.from('settings').upsert(
      { key: 'ateliers_bg_config', value: JSON.stringify({ ...ateliersBg, type: ateliersBgTab }) },
      { onConflict: 'key' }
    )
    setShowBgEditor(false)
  }

  async function saveDescStyle() {
    await supabase.from('settings').upsert({ key: 'ateliers_desc_style', value: JSON.stringify(descStyle) }, { onConflict: 'key' })
    setShowDescEditor(false)
  }

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('atelier_categories').select('*')
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true })
    setCategories((data as AtelierCategory[]) || [])
    setLoading(false)
  }

  async function openCategory(cat: AtelierCategory) {
    setSelectedCat(cat)
    setLoadingAteliers(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('ateliers').select('*')
      .eq('category_id', cat.id)
      .gte('date', isAdmin ? '1970-01-01' : today)
      .order('date', { ascending: true })
    setAteliers((data as Atelier[]) || [])
    setLoadingAteliers(false)
  }

  function back() { setSelectedCat(null); setAteliers([]) }

  async function deleteCategory(id: string) {
    await supabase.from('atelier_categories').delete().eq('id', id)
    setCategories(p => p.filter(c => c.id !== id))
    if (selectedCat?.id === id) back()
    setDeleteCatConfirm(null)
  }

  async function deleteAtelier(id: string) {
    await supabase.from('ateliers').delete().eq('id', id)
    setAteliers(p => p.filter(a => a.id !== id))
    setDeleteAtelierConfirm(null)
  }

  function handleCatSaved(cats: AtelierCategory[]) {
    setCategories(cats)
    if (selectedCat) {
      const updated = cats.find(c => c.id === selectedCat.id)
      if (updated) setSelectedCat(updated)
    }
  }

  function handleAtelierSaved() {
    if (selectedCat) openCategory(selectedCat)
  }

  return (
    <main className="flex-1 bg-candy overflow-x-hidden">

      {/* Enveloppe Hero + Contenu pour que les polaroïds flottent entre les deux */}
      <div className="relative">

      {/* ── HEADER ── */}
      <section className="relative py-16 px-4 text-center border-b-4 border-[#1A1040] overflow-hidden"
        style={buildHeroBgStyle({ ...ateliersBg, type: ateliersBgTab })}>
        {ateliersBgTab === 'video' && ateliersBg.videoUrl && (
          <video ref={videoRef} src={ateliersBg.videoUrl} autoPlay muted={ateliersBg.videoMuted}
            loop={ateliersBg.videoLoop} playsInline
            className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
        )}
        {ateliersBgTab === 'video' && ateliersBg.videoOverlay !== 'transparent' && (
          <div className="absolute inset-0" style={{ backgroundColor: ateliersBg.videoOverlay, zIndex: 1 }} />
        )}
        {isAdmin && !selectedCat && (
          <button onClick={() => setShowBgEditor(true)}
            className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <Palette className="w-3.5 h-3.5" /> Fond du hero
          </button>
        )}
        {/* Polaroïds déco */}
        <div className="absolute -left-8 top-4 w-24 h-28 bg-white/10 border-2 border-white/20 rounded-sm rotate-12 hidden md:block" />
        <div className="absolute -right-6 bottom-2 w-20 h-24 bg-white/10 border-2 border-white/20 rounded-sm -rotate-6 hidden md:block" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {selectedCat ? (
            <div className="flex flex-col items-center gap-4">
              <button onClick={back}
                className="flex items-center gap-2 bg-candy text-[#1A1040] px-4 py-2 rounded-xl font-black text-sm border-2 border-candy hover:bg-rose-200 transition-colors"
                style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}>
                <ChevronLeft className="w-4 h-4" /> Toutes les catégories
              </button>
              <h1 className="font-serif text-4xl md:text-5xl font-black text-white">
                {selectedCat.nom} <span className="text-rose-400">✦</span>
              </h1>
              {selectedCat.description && (
                <p className="text-gray-300 text-base max-w-xl">{selectedCat.description}</p>
              )}
            </div>
          ) : (
            <>
              <h1 className="leading-tight mb-1" style={buildTitleStyle(heroTitreStyle)} dangerouslySetInnerHTML={{ __html: heroTitre }} />
              {isAdmin && (
                <div className="flex justify-center mb-3">
                  <button onClick={() => setShowTitreEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Titre
                  </button>
                </div>
              )}

              <p className="max-w-xl mx-auto" style={buildTitleStyle(heroSousStyle)} dangerouslySetInnerHTML={{ __html: heroSous }} />
              {isAdmin && (
                <div className="flex justify-center mt-2">
                  <button onClick={() => setShowSousEditor(true)}
                    className="inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
                    <Pencil className="w-3 h-3" /> Sous-titre
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CONTENU ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">

        {/* Boutons admin */}
        {isAdmin && (
          <div className="flex justify-end mb-10 gap-3 flex-wrap">
            {!selectedCat ? (
              <button
                onClick={() => { setEditingCat(null); setShowCatModal(true) }}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-5 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: '4px 4px 0px 0px #ffb5c8' }}>
                <Plus className="w-5 h-5" /> ✦ Ajouter une catégorie
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setEditingCat(selectedCat); setShowCatModal(true) }}
                  className="flex items-center gap-2 bg-white text-[#1A1040] px-4 py-2.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-candy transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                  <Pencil className="w-4 h-4" /> Modifier la catégorie
                </button>
                <button
                  onClick={() => setShowDescEditor(true)}
                  className="flex items-center gap-2 bg-white text-[#1A1040] px-4 py-2.5 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-candy transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                  <Pencil className="w-4 h-4" /> Style des descriptifs
                </button>
                <button
                  onClick={() => { setEditingAtelier(null); setShowAtelierModal(true) }}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-5 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all"
                  style={{ boxShadow: '4px 4px 0px 0px #ffb5c8' }}>
                  <Plus className="w-5 h-5" /> ✦ Ajouter un atelier
                </button>
              </>
            )}
          </div>
        )}

        {/* Chargement */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-bounce">📸</div>
            <p className="text-gray-500 font-bold">Chargement des ateliers...</p>
          </div>

        /* ── VUE CATÉGORIES ── */
        ) : !selectedCat ? (
          categories.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-7xl mb-4">🌱</div>
              <p className="text-[#1A1040] text-xl font-black">Aucune catégorie créée.</p>
              {isAdmin && <p className="text-rose-400 mt-2 font-bold">Clique sur « + » pour en créer une !</p>}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-10 md:gap-14">
              {categories.map((cat, idx) => {
                const rotation  = ROTATIONS[idx % ROTATIONS.length]
                const tapeColor = TAPE_COLORS[idx % TAPE_COLORS.length]
                return (
                  <div key={cat.id}
                    className={`relative ${rotation} hover:rotate-0 hover:-translate-y-3 transition-all duration-300`}
                    style={{ filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.25))' }}>

                    {/* Scotch */}
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-6 ${tapeColor} rounded-sm z-10 border border-white/40`} />

                    {/* Carte polaroïd */}
                    <div
                      className="bg-white border-2 border-gray-100 w-64 md:w-72 cursor-pointer"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                      onClick={() => openCategory(cat)}
                    >
                      {/* Photo */}
                      <div className="relative w-full h-60 overflow-hidden bg-rose-100 select-none"
                        onContextMenu={e => e.preventDefault()}>
                        {cat.cover_url ? (
                          <>
                            <img src={cat.cover_url} alt="" draggable={false}
                              onContextMenu={e => e.preventDefault()}
                              className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0" onContextMenu={e => e.preventDefault()} />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-7xl">🎨</div>
                        )}
                      </div>

                      {/* Bande info */}
                      <div className="px-4 pt-4 pb-5">
                        <h3 className="font-serif text-xl font-black text-[#1A1040] text-center mb-2 leading-tight">
                          {cat.nom}
                        </h3>
                        {cat.description && (
                          <p className="text-xs text-gray-500 text-center leading-relaxed line-clamp-2 mb-2">
                            {cat.description}
                          </p>
                        )}
                        <div className="border-t border-dashed border-gray-200 mt-2 mb-3" />
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <button
                              onClick={e => { e.stopPropagation(); setEditingCat(cat); setShowCatModal(true) }}
                              className="flex-1 flex items-center justify-center gap-1 bg-[#1A1040] text-citron-400 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}>
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteCatConfirm(cat.id) }}
                              className="w-9 h-9 flex items-center justify-center bg-[#1A1040] text-rose-400 rounded-xl border-2 border-[#1A1040] hover:bg-red-700 hover:text-white transition-colors"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-xs font-black text-[#1A1040]/60">
                            Voir les ateliers →
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )

        /* ── VUE ATELIERS D'UNE CATÉGORIE ── */
        ) : loadingAteliers ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-bounce">📸</div>
            <p className="text-gray-500 font-bold">Chargement des ateliers...</p>
          </div>
        ) : ateliers.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-7xl mb-4">📷</div>
            <p className="text-[#1A1040] text-xl font-black">Aucun atelier dans cette catégorie.</p>
            {isAdmin && <p className="text-rose-400 mt-2 font-bold">Clique sur « + Ajouter un atelier » pour en créer un !</p>}
          </div>
        ) : (
          <div className="space-y-14">
            {ateliersGroupes.map(group => (
              <div key={group.key}>
                {/* Séparateur mois / année */}
                <div className="flex items-center gap-4 mb-9">
                  <div className="flex-1 h-0.5 bg-[#1A1040]/15" />
                  <span className="inline-flex items-center gap-2 bg-[#1A1040] text-citron-400 px-5 py-2 rounded-full text-base font-black border-2 border-[#1A1040] whitespace-nowrap"
                    style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                    📅 {group.label}
                  </span>
                  <div className="flex-1 h-0.5 bg-[#1A1040]/15" />
                </div>

                <div className="flex flex-wrap justify-center gap-10 md:gap-14">
            {group.items.map((atelier, idx) => {
              const rotation  = ROTATIONS[idx % ROTATIONS.length]
              const tapeColor = TAPE_COLORS[idx % TAPE_COLORS.length]
              const isComplet = atelier.places_restantes === 0
              const isUrgent  = atelier.places_restantes > 0 && atelier.places_restantes <= 2
              const atelierDate = new Date(atelier.date + 'T00:00:00')
              const isPasse   = atelierDate < today

              return (
                <div key={atelier.id}
                  className={`relative ${rotation} hover:rotate-0 hover:-translate-y-3 transition-all duration-300 ${isPasse ? 'opacity-70' : ''}`}
                  style={{ filter: 'drop-shadow(4px 6px 12px rgba(0,0,0,0.25))' }}>

                  {/* Scotch */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-6 ${tapeColor} rounded-sm z-10 border border-white/40`} />

                  {/* Carte polaroïd */}
                  <div className="bg-white border-2 border-gray-100 w-64 md:w-72"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>

                    {/* Photo */}
                    <div className="relative w-full h-56 overflow-hidden bg-rose-100 select-none"
                      onContextMenu={e => e.preventDefault()}>
                      {atelier.image_url ? (
                        <>
                          <img src={atelier.image_url} alt={atelier.titre} draggable={false}
                            onContextMenu={e => e.preventDefault()}
                            className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute inset-0" onContextMenu={e => e.preventDefault()} />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">🎨</div>
                      )}

                      {isComplet && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-white text-[#1A1040] font-black px-4 py-2 text-lg -rotate-12 border-4 border-[#1A1040]">
                            COMPLET
                          </span>
                        </div>
                      )}
                      {isPasse && !isComplet && (
                        <div className="absolute top-2 left-2 bg-gray-700/80 text-white text-xs font-black px-2.5 py-1 rounded-full">
                          Passé
                        </div>
                      )}
                      {isUrgent && !isComplet && !isPasse && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full border-2 border-white">
                          🔥 Dernières places !
                        </div>
                      )}
                      {atelier.prix_type === 'duo' && !isComplet && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg tracking-widest">
                          DUO
                        </div>
                      )}
                    </div>

                    {/* Bande info */}
                    <div className="px-4 pt-4 pb-5">
                      <h3 className="font-serif text-xl font-black text-[#1A1040] text-center mb-1.5 leading-tight">
                        {atelier.titre}
                      </h3>
                      {(() => {
                        const niveau = NIVEAUX.find(n => n.value === (atelier.niveau || 'debutant'))
                        if (!niveau) return null
                        return (
                          <div className="flex justify-center mb-3" title={niveau.label}>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2"
                              style={{ backgroundColor: `${niveau.color}22`, borderColor: niveau.color }}>
                              <div className="flex gap-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <span key={i} className="w-3 h-3 rounded-full border"
                                    style={{ backgroundColor: i < niveau.dots ? niveau.color : 'transparent', borderColor: niveau.color }} />
                                ))}
                              </div>
                              <span className="text-xs font-black" style={{ color: niveau.color }}>{niveau.label}</span>
                            </div>
                          </div>
                        )
                      })()}
                      {atelier.description && (
                        <p className="text-center mb-3 leading-snug whitespace-pre-wrap"
                          style={{ fontFamily: DESC_FONT_MAP[descStyle.font] || 'sans-serif', fontSize: `${descStyle.size}px`, color: descStyle.color }}>
                          {atelier.description}
                        </p>
                      )}
                      <div className="border-t border-dashed border-gray-200 mb-3" />
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 text-xs text-gray-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="capitalize leading-snug">{dateLongue(atelier.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-turquoise-500 shrink-0" />
                          {atelier.heure} · {atelier.duree}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-citron-500 shrink-0" />
                          <a href={`https://maps.google.com/maps?q=${encodeURIComponent(atelier.lieu)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="hover:text-citron-600 hover:underline transition-colors">
                            {atelier.lieu}
                          </a>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Users className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                            <span className={isComplet ? 'text-red-500 font-black' : isUrgent ? 'text-red-500 font-black' : 'text-gray-600'}>
                              {isComplet
                                ? 'Complet 😢'
                                : `${atelier.places_restantes} place${atelier.places_restantes > 1 ? 's' : ''} restante${atelier.places_restantes > 1 ? 's' : ''}`}
                            </span>
                          </div>
                          <div className="text-right leading-none">
                            {atelier.compare_price && atelier.compare_price > atelier.prix && (
                              <div className="text-xs text-gray-400 line-through font-bold">
                                {atelier.compare_price}€
                              </div>
                            )}
                            <span className={`font-black text-lg ${atelier.compare_price && atelier.compare_price > atelier.prix ? 'text-rose-500' : 'text-[#1A1040]'}`}>
                              {atelier.prix}€
                              <span className="text-[10px] font-bold text-gray-400 ml-0.5">
                                /{atelier.prix_type === 'duo' ? 'duo' : 'pers.'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingAtelier(atelier); setShowAtelierModal(true) }}
                              className="flex-1 flex items-center justify-center gap-1 bg-[#1A1040] text-citron-400 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}>
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                            <button
                              onClick={() => setDeleteAtelierConfirm(atelier.id)}
                              className="w-9 h-9 flex items-center justify-center bg-[#1A1040] text-rose-400 rounded-xl border-2 border-[#1A1040] hover:bg-red-700 hover:text-white transition-colors"
                              style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : !isPasse ? (
                          <button
                            onClick={() => !isComplet && setReservingAtelier(atelier)}
                            disabled={isComplet}
                            className={`w-full py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                              isComplet
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-rose-400 text-white border-[#1A1040] hover:-translate-y-0.5'
                            }`}
                            style={!isComplet ? { boxShadow: '3px 3px 0px 0px #1A1040' } : {}}>
                            {isComplet ? 'Complet' : '🎟️ Je réserve !'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

        {/* Polaroïds flottants — rendus après les sections pour être toujours au-dessus */}
        {atelierPolaroids.map((p, i) => (
          <HeroPolaroidDisplay key={p.id} polaroid={p} index={i} isAdmin={isAdmin} onMoved={handlePolaroidMoved} tableName="atelier_polaroids" />
        ))}

        {isAdmin && (
          <button onClick={() => setShowPolaroidManager(true)}
            className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <ImageIcon className="w-3.5 h-3.5" /> Gérer les polaroïds
          </button>
        )}

      </div>{/* fin wrapper hero+contenu polaroïds */}

      {/* ── ÉDITEUR FOND HERO ── */}
      {showBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowBgEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-xl my-4" style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
            <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy sticky top-0 z-10">
              <h3 className="font-black text-[#1A1040]">🎨 Fond du hero — Mes Ateliers</h3>
              <button onClick={() => setShowBgEditor(false)} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-6">
              <BgEditor
                bg={ateliersBg} setBg={setAteliersBg}
                activeTab={ateliersBgTab} setActiveTab={setAteliersBgTab}
                fileRef={bgFileRef}
                uploadError={bgUploadError} setUploadError={setBgUploadError}
                uploading={bgUploading} setUploading={setBgUploading}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowBgEditor(false)} className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
                <button onClick={saveBg} className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-3 font-black hover:bg-[#2d2060]">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉDITEUR BADGE HERO ── */}
      {showBadgeEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowBadgeEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 space-y-4" style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
            <h3 className="font-black text-[#1A1040]">🏷️ Badge — Nos Ateliers</h3>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
              <input value={heroBadge.text} onChange={e => setHeroBadge(p => ({ ...p, text: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citron-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fond</label>
                <input type="color" value={heroBadge.bg} onChange={e => setHeroBadge(p => ({ ...p, bg: e.target.value }))}
                  className="w-full h-9 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                <input type="color" value={heroBadge.textColor} onChange={e => setHeroBadge(p => ({ ...p, textColor: e.target.value }))}
                  className="w-full h-9 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
              <div className="flex gap-2 flex-wrap">
                {['rounded-none', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'].map(r => (
                  <button key={r} onClick={() => setHeroBadge(p => ({ ...p, radius: r }))}
                    className={`px-3 py-1.5 border-2 text-xs font-black ${r} ${heroBadge.radius === r ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                    Aa
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowBadgeEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-2.5 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
              <button onClick={saveBadge} className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-2.5 font-black hover:bg-[#2d2060]">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉDITEUR STYLE DESCRIPTIFS ── */}
      {showDescEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowDescEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 space-y-4" style={{ boxShadow: '6px 6px 0px 0px #4dd9c0' }}>
            <h3 className="font-black text-[#1A1040]">📝 Style des descriptifs d'atelier</h3>
            <p className="text-center leading-snug border-2 border-dashed border-gray-200 rounded-xl p-3"
              style={{ fontFamily: DESC_FONT_MAP[descStyle.font] || 'sans-serif', fontSize: `${descStyle.size}px`, color: descStyle.color }}>
              Aperçu : un atelier créatif pour tous les niveaux !
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Police</label>
                <select value={descStyle.font} onChange={e => setDescStyle(p => ({ ...p, font: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-bold bg-white">
                  {Object.keys(DESC_FONT_MAP).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Taille</label>
                <input type="number" min={8} max={32} value={descStyle.size}
                  onChange={e => setDescStyle(p => ({ ...p, size: parseInt(e.target.value) || 13 }))}
                  className="w-full border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Couleur</label>
                <input type="color" value={descStyle.color} onChange={e => setDescStyle(p => ({ ...p, color: e.target.value }))}
                  className="w-full h-9 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowDescEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-2.5 font-black text-[#1A1040] hover:bg-gray-50">Annuler</button>
              <button onClick={saveDescStyle} className="flex-1 bg-[#1A1040] text-citron-400 rounded-2xl py-2.5 font-black hover:bg-[#2d2060]">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉDITEUR TITRE HERO ── */}
      {showTitreEditor && (
        <HeroTitleEditor
          initialText={heroTitre}
          initialStyle={heroTitreStyle}
          page="ateliers"
          sectionKey="ateliers_titre"
          styleKey="ateliers_titre_style"
          label="✏️ Titre — Nos Ateliers"
          onSave={(text, style) => { setHeroTitre(text); setHeroTitreStyle(style); setShowTitreEditor(false) }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}

      {/* ── ÉDITEUR SOUS-TITRE HERO ── */}
      {showSousEditor && (
        <HeroTitleEditor
          initialText={heroSous}
          initialStyle={heroSousStyle}
          page="ateliers"
          sectionKey="ateliers_soustitre"
          styleKey="ateliers_soustitre_style"
          label="✏️ Sous-titre — Nos Ateliers"
          onSave={(text, style) => { setHeroSous(text); setHeroSousStyle(style); setShowSousEditor(false) }}
          onClose={() => setShowSousEditor(false)}
        />
      )}

      {/* ── MODALES ── */}
      {showCatModal && (
        <CategoryModal
          cat={editingCat}
          onClose={() => { setShowCatModal(false); setEditingCat(null) }}
          onSaved={handleCatSaved}
        />
      )}

      {showAtelierModal && (
        <AtelierFormModal
          atelier={editingAtelier}
          categoryId={selectedCat?.id ?? null}
          onClose={() => { setShowAtelierModal(false); setEditingAtelier(null) }}
          onSaved={handleAtelierSaved}
        />
      )}

      {reservingAtelier && (
        <ReservationModal
          atelier={reservingAtelier}
          onClose={() => setReservingAtelier(null)}
          onReserved={() => selectedCat && openCategory(selectedCat)}
        />
      )}

      {/* Confirmation suppression catégorie */}
      {deleteCatConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 text-center"
            style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>
            <div className="text-5xl mb-3">🗑️</div>
            <h3 className="font-serif text-xl font-black text-[#1A1040] mb-2">Supprimer la catégorie ?</h3>
            <p className="text-gray-500 text-sm mb-6">Les ateliers associés ne seront plus liés à cette catégorie.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCatConfirm(null)}
                className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl text-sm font-black hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => deleteCategory(deleteCatConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-2xl text-sm font-black border-2 border-red-700 hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression atelier */}
      {deleteAtelierConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-sm p-6 text-center"
            style={{ boxShadow: '6px 6px 0px 0px #1A1040' }}>
            <div className="text-5xl mb-3">🗑️</div>
            <h3 className="font-serif text-xl font-black text-[#1A1040] mb-2">Supprimer l'atelier ?</h3>
            <p className="text-gray-500 text-sm mb-6">Cette action est définitive.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAtelierConfirm(null)}
                className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-2.5 rounded-2xl text-sm font-black hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => deleteAtelier(deleteAtelierConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-2xl text-sm font-black border-2 border-red-700 hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showPolaroidManager && (
        <HeroPolaroidManager
          polaroids={atelierPolaroids}
          onClose={() => setShowPolaroidManager(false)}
          onRefresh={loadAtelierPolaroids}
          tableName="atelier_polaroids"
          title="Polaroïds — Nos Ateliers"
        />
      )}
    </main>
  )
}
