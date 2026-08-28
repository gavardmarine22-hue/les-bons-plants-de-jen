import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Images, ZoomIn, Palette, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { buildHeroBgStyle, type HeroBg, type BgType, DEFAULT_HERO_BG, loadCachedBg, saveCachedBg } from '../lib/heroBg'
import BgEditor from '../components/BgEditor'

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

const FONT_FAMILY: Record<string, string> = {
  serif:   'serif',
  sans:    'sans-serif',
  cursive: 'cursive',
  mono:    'monospace',
}

// ─── Page publique Galerie ────────────────────────────────────────────────────
export default function Galerie() {
  const { isAdmin } = useAuth()
  const [categories, setCategories]   = useState<GalerieCategory[]>([])
  const [selectedCat, setSelectedCat] = useState<GalerieCategory | null>(null)
  const [photos, setPhotos]           = useState<GaleriePhoto[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // Fond du hero
  const [galerieBg, setGalerieBg]       = useState<HeroBg>(() => loadCachedBg('galerie_bg_config', { ...DEFAULT_HERO_BG, color: '#1A1040' }))
  const [galerieBgTab, setGalerieBgTab] = useState<BgType>(() => loadCachedBg('galerie_bg_config', { ...DEFAULT_HERO_BG, color: '#1A1040' }).type)
  const [showBgEditor, setShowBgEditor] = useState(false)
  const [bgUploading, setBgUploading]   = useState(false)
  const [bgUploadError, setBgUploadError] = useState('')
  const bgFileRef = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)

  useEffect(() => { loadCategories(); loadGalerieBg() }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = galerieBg.videoMuted
  }, [galerieBg.videoMuted])

  async function loadGalerieBg() {
    const { data } = await supabase.from('settings').select('key, value').eq('key', 'galerie_bg_config').single()
    if (data) {
      try {
        const v = JSON.parse(data.value)
        setGalerieBg(p => { const m = { ...p, ...v }; saveCachedBg('galerie_bg_config', m); return m })
        setGalerieBgTab(v.type || 'color')
      } catch {}
    }
  }

  async function saveBg() {
    await supabase.from('settings').upsert(
      { key: 'galerie_bg_config', value: JSON.stringify({ ...galerieBg, type: galerieBgTab }) },
      { onConflict: 'key' }
    )
    setShowBgEditor(false)
  }

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase
      .from('galerie_categories')
      .select('*')
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true })
    const all = (data as GalerieCategory[]) || []
    setCategories(all.filter(c => c.visible !== false))
    setLoading(false)
  }

  async function openCategory(cat: GalerieCategory) {
    setSelectedCat(cat)
    setLoadingPhotos(true)
    const { data } = await supabase
      .from('galerie_photos')
      .select('*')
      .eq('category_id', cat.id)
      .order('created_at', { ascending: false })
    setPhotos((data as GaleriePhoto[]) || [])
    setLoadingPhotos(false)
  }

  function back() {
    setSelectedCat(null)
    setPhotos([])
  }

  const closeLightbox  = useCallback(() => setLightboxIdx(null), [])
  const prevLightbox   = useCallback(() => setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null), [photos.length])
  const nextLightbox   = useCallback(() => setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null), [photos.length])

  useEffect(() => {
    if (lightboxIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prevLightbox()
      if (e.key === 'ArrowRight') nextLightbox()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, prevLightbox, nextLightbox, closeLightbox])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🖼️</div>
        <p className="font-black text-[#1A1040]">Chargement de la galerie...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-white min-h-screen">

      {/* ── En-tête ── */}
      <section className="relative py-12 px-4 border-b-4 border-[#1A1040] overflow-hidden"
        style={buildHeroBgStyle({ ...galerieBg, type: galerieBgTab })}>
        {galerieBgTab === 'video' && galerieBg.videoUrl && (
          <video ref={videoRef} src={galerieBg.videoUrl} autoPlay muted={galerieBg.videoMuted}
            loop={galerieBg.videoLoop} playsInline
            className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
        )}
        {galerieBgTab === 'video' && galerieBg.videoOverlay !== 'transparent' && (
          <div className="absolute inset-0" style={{ backgroundColor: galerieBg.videoOverlay, zIndex: 1 }} />
        )}
        {isAdmin && !selectedCat && (
          <button onClick={() => setShowBgEditor(true)}
            className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 bg-white/90 text-[#1A1040] px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#1A1040] hover:bg-white transition-all">
            <Palette className="w-3.5 h-3.5" /> Fond du hero
          </button>
        )}
        <div className="relative z-10 max-w-6xl mx-auto">
          {selectedCat ? (
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={back}
                className="flex items-center gap-2 bg-candy text-[#1A1040] px-4 py-2 rounded-xl font-black text-sm border-2 border-candy hover:bg-rose-200 transition-colors"
                style={{ boxShadow: '2px 2px 0px 0px #ffb5c8' }}
              >
                <ChevronLeft className="w-4 h-4" /> Retour à la galerie
              </button>
              <div className="flex items-center gap-3">
                {selectedCat.icone_visible !== false && (
                  <span className="text-3xl">{selectedCat.icone || '🎨'}</span>
                )}
                <div>
                  <p className="text-rose-300 text-sm font-bold">Galerie</p>
                  <h1
                    className={`font-black text-white ${selectedCat.taille_texte || 'text-3xl'}`}
                    style={{ fontFamily: FONT_FAMILY[selectedCat.police] || 'serif' }}
                  >
                    {selectedCat.nom}
                  </h1>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
                style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                <Images className="w-7 h-7 text-[#1A1040]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
                  ✨ Créations de Jenni
                </div>
                <h1 className="font-serif text-3xl font-black text-white">Galerie</h1>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* ── Liste des catégories ── */}
        {!selectedCat && (
          <>
            {categories.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="font-black text-[#1A1040] text-2xl mb-2">Galerie bientôt disponible</p>
                <p className="text-gray-500">Les créations seront publiées très prochainement.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {categories.map(cat => {
                  const bg   = cat.couleur_bg   || '#ffb5c8'
                  const text = cat.couleur_texte || '#1A1040'
                  const icon = cat.icone         || '🎨'
                  const size = cat.taille_texte  || 'text-2xl'
                  const font = FONT_FAMILY[cat.police] || 'serif'

                  return (
                    <button
                      key={cat.id}
                      onClick={() => openCategory(cat)}
                      className="group rounded-3xl border-4 border-[#1A1040] overflow-hidden transition-all hover:-translate-y-1.5 active:translate-y-0 text-left focus:outline-none focus:ring-4 focus:ring-[#1A1040]/20 relative"
                      style={{ backgroundColor: bg, boxShadow: '6px 6px 0px 0px #1A1040' }}
                    >
                      {/* Photo de couverture */}
                      {cat.cover_url && (
                        <>
                          <img
                            src={cat.cover_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                            onContextMenu={e => e.preventDefault()}
                          />
                          <div className="absolute inset-0 bg-black/35" />
                        </>
                      )}

                      <div className="relative z-10 p-8">
                        {cat.icone_visible !== false && (
                          <div className="text-5xl mb-4">{icon}</div>
                        )}
                        <h2
                          className={`font-black mb-1 ${size}`}
                          style={{
                            color:      cat.cover_url ? '#ffffff' : text,
                            fontFamily: font,
                          }}
                        >
                          {cat.nom}
                        </h2>
                        <p
                          className="text-sm font-bold opacity-60 group-hover:opacity-100 transition-opacity"
                          style={{ color: cat.cover_url ? '#ffffff' : text }}
                        >
                          Voir les créations →
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Grille de photos ── */}
        {selectedCat && (
          <>
            {loadingPhotos ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-3 animate-pulse">📸</div>
                <p className="font-black text-[#1A1040]">Chargement des photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📷</div>
                <p className="font-black text-[#1A1040] text-2xl mb-2">Aucune photo pour l'instant</p>
                <p className="text-gray-500">Des créations seront ajoutées prochainement.</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="break-inside-avoid mb-4">
                    <div
                      className="relative group rounded-2xl overflow-hidden border-2 border-[#1A1040] cursor-zoom-in"
                      style={{ boxShadow: '3px 3px 0px 0px #1A1040', userSelect: 'none' }}
                      onClick={() => setLightboxIdx(photos.indexOf(photo))}
                    >
                      <img
                        src={photo.url}
                        alt={photo.titre || ''}
                        draggable={false}
                        onContextMenu={e => e.preventDefault()}
                        className="w-full h-auto block pointer-events-none"
                      />
                      {/* Overlay protecteur */}
                      <div className="absolute inset-0 z-10" onContextMenu={e => e.preventDefault()} />
                      {/* Survol */}
                      <div className="absolute inset-0 z-20 bg-[#1A1040]/0 group-hover:bg-[#1A1040]/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                    {photo.titre && (
                      <p className="text-xs font-bold text-gray-500 mt-1.5 px-1">{photo.titre}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Éditeur fond hero ── */}
      {showBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowBgEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-xl my-4" style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
            <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between bg-candy sticky top-0 z-10">
              <h3 className="font-black text-[#1A1040]">🎨 Fond du hero — Ma Galerie</h3>
              <button onClick={() => setShowBgEditor(false)} className="w-8 h-8 rounded-xl bg-white border-2 border-[#1A1040] flex items-center justify-center hover:bg-red-50"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-6">
              <BgEditor
                bg={galerieBg} setBg={setGalerieBg}
                activeTab={galerieBgTab} setActiveTab={setGalerieBgTab}
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

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div className="fixed inset-0 bg-black/92 z-[200] flex items-center justify-center p-4"
          onClick={closeLightbox}>

          {/* Fermer */}
          <button
            className="absolute top-4 right-4 w-11 h-11 bg-white rounded-xl flex items-center justify-center font-black text-[#1A1040] text-lg border-2 border-white hover:bg-rose-100 transition-colors z-20"
            onClick={e => { e.stopPropagation(); closeLightbox() }}>
            ✕
          </button>

          {/* Compteur */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs font-black px-3 py-1 rounded-full z-20">
              {lightboxIdx + 1} / {photos.length}
            </div>
          )}

          {/* Flèche gauche */}
          {photos.length > 1 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center border-2 border-[#1A1040] transition-all z-20"
              style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}
              onClick={e => { e.stopPropagation(); prevLightbox() }}>
              <ChevronLeft className="w-6 h-6 text-[#1A1040]" />
            </button>
          )}

          {/* Photo */}
          <div className="relative max-w-5xl w-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}>
            <img
              key={lightboxIdx}
              src={photos[lightboxIdx].url}
              alt={photos[lightboxIdx].titre || ''}
              draggable={false}
              onContextMenu={e => e.preventDefault()}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain select-none pointer-events-none"
            />
            <div className="absolute inset-0 z-10 rounded-2xl" onContextMenu={e => e.preventDefault()} />
          </div>

          {/* Titre */}
          {photos[lightboxIdx].titre && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-sm font-bold bg-black/50 px-4 py-1.5 rounded-full z-20 whitespace-nowrap">
              {photos[lightboxIdx].titre}
            </p>
          )}

          {/* Flèche droite */}
          {photos.length > 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center border-2 border-[#1A1040] transition-all z-20"
              style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}
              onClick={e => { e.stopPropagation(); nextLightbox() }}>
              <ChevronRight className="w-6 h-6 text-[#1A1040]" />
            </button>
          )}
        </div>
      )}
    </main>
  )
}
