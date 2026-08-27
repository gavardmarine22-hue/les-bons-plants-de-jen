import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Palette, Sparkles, Grid3x3, Image, Film,
  Check, Upload, Volume2, VolumeX, RotateCcw, RefreshCw, X, Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  type HeroBg, type BgType,
  buildHeroBgStyle,
  PRESET_COLORS, PRESET_GRADIENTS, GRAD_DIRS, PATTERNS, VIDEO_OVERLAYS,
} from '../lib/heroBg'

export const BG_TABS: { id: BgType; label: string; icon: ReactNode }[] = [
  { id: 'color',    label: 'Couleur', icon: <Palette  className="w-4 h-4" /> },
  { id: 'gradient', label: 'Dégradé', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'pattern',  label: 'Motif',   icon: <Grid3x3  className="w-4 h-4" /> },
  { id: 'image',    label: 'Image',   icon: <Image    className="w-4 h-4" /> },
  { id: 'video',    label: 'Vidéo',   icon: <Film     className="w-4 h-4" /> },
]

export interface BgEditorProps {
  bg: HeroBg
  setBg: (fn: (p: HeroBg) => HeroBg) => void
  activeTab: BgType
  setActiveTab: (t: BgType) => void
  fileRef: React.RefObject<HTMLInputElement | null>
  uploadError: string
  setUploadError: (s: string) => void
  uploading: boolean
  setUploading: (b: boolean) => void
}

export default function BgEditor({ bg, setBg, activeTab, setActiveTab, fileRef, uploadError, setUploadError, uploading, setUploading }: BgEditorProps) {
  const set = (patch: Partial<HeroBg>) => setBg(p => ({ ...p, ...patch }))
  const videoFileRef = useRef<HTMLInputElement>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadError, setVideoUploadError] = useState('')

  async function handleUpload(file: File) {
    setUploading(true); setUploadError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `section-bg-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setUploadError('Erreur : ' + error.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('hero').getPublicUrl(filename)
    setBg(p => ({ ...p, image: urlData.publicUrl + '?t=' + Date.now() }))
    setActiveTab('image')
    setUploading(false)
  }

  async function handleVideoUpload(file: File) {
    setVideoUploading(true); setVideoUploadError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const filename = `section-video-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setVideoUploadError('Erreur : ' + error.message); setVideoUploading(false); return }
    const { data: urlData } = supabase.storage.from('hero').getPublicUrl(filename)
    setBg(p => ({ ...p, videoUrl: urlData.publicUrl + '?t=' + Date.now() }))
    setActiveTab('video')
    setVideoUploading(false)
  }

  return (
    <div>
      {/* Tabs */}
      <div className="grid grid-cols-5 border-b-2 border-[#1A1040] mb-0 rounded-t-2xl overflow-hidden">
        {BG_TABS.map((tab, i) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-3 font-black text-xs transition-all ${
              i < BG_TABS.length - 1 ? 'border-r border-[#1A1040]/30' : ''
            } ${activeTab === tab.id ? 'bg-[#1A1040] text-citron-400' : 'bg-gray-50 text-[#1A1040] hover:bg-candy'}`}>
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-b-2xl border border-t-0 border-[#1A1040]/20">
        {/* COULEUR */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c.value} onClick={() => set({ color: c.value })} title={c.name}
                  className={`aspect-square rounded-xl border-4 transition-all hover:-translate-y-0.5 relative ${bg.color === c.value ? 'border-[#1A1040] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}>
                  {bg.color === c.value && <Check className="absolute inset-0 m-auto w-4 h-4 drop-shadow" style={{ color: ['#ffb5c8','#ffe500','#4dd9c0','#c4b5fd','#fdba74','#86efac','#7dd3fc','#fff5fb','#84cc16'].includes(c.value) ? '#1A1040' : '#fff' }} />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={bg.color} onChange={e => set({ color: e.target.value })} className="w-10 h-10 rounded-xl border-2 border-[#1A1040] cursor-pointer p-0.5" />
              <input type="text" value={bg.color} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set({ color: e.target.value }) }}
                className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
          </div>
        )}

        {/* DÉGRADÉ */}
        {activeTab === 'gradient' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map(g => {
                const isActive = bg.gradFrom === g.from && bg.gradTo === g.to && bg.gradDir === g.dir
                const s = g.dir === 'radial' ? { background: `radial-gradient(ellipse at center,${g.from},${g.to})` } : { background: `linear-gradient(${g.dir},${g.from},${g.to})` }
                return (
                  <button key={g.name} onClick={() => set({ gradFrom: g.from, gradTo: g.to, gradDir: g.dir })}
                    className={`relative h-12 rounded-xl border-4 transition-all flex items-end p-1 ${isActive ? 'border-[#1A1040]' : 'border-transparent hover:border-[#1A1040]/30'}`} style={s}>
                    {isActive && <Check className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />}
                    <span className="text-white text-[9px] font-black drop-shadow">{g.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GRAD_DIRS.map(d => (
                <button key={d.value} onClick={() => set({ gradDir: d.value })}
                  className={`px-2 py-1 rounded-lg border-2 text-[10px] font-black transition-all ${bg.gradDir === d.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={bg.gradFrom} onChange={e => set({ gradFrom: e.target.value })} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
              <div className="text-gray-300">→</div>
              <input type="color" value={bg.gradTo} onChange={e => set({ gradTo: e.target.value })} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
              <div className="flex-1 h-9 rounded-xl border-2 border-[#1A1040]"
                style={bg.gradDir === 'radial' ? { background: `radial-gradient(ellipse at center,${bg.gradFrom},${bg.gradTo})` } : { background: `linear-gradient(${bg.gradDir},${bg.gradFrom},${bg.gradTo})` }} />
            </div>
          </div>
        )}

        {/* MOTIF */}
        {activeTab === 'pattern' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PATTERNS.map(p => {
                const s = { ...buildHeroBgStyle({ ...bg, type: 'pattern', patternId: p.id }), minHeight: '56px' }
                return (
                  <button key={p.id} onClick={() => set({ patternId: p.id })}
                    className={`relative rounded-xl border-4 transition-all overflow-hidden flex items-end p-1 ${bg.patternId === p.id ? 'border-[#1A1040]' : 'border-transparent hover:border-[#1A1040]/30'}`} style={s}>
                    {bg.patternId === p.id && <Check className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />}
                    <span className="text-[9px] font-black text-white drop-shadow bg-black/30 px-1 rounded-sm">{p.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <input type="color" value={bg.patternColor1} onChange={e => set({ patternColor1: e.target.value })} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                <span className="text-xs text-gray-500">Principale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="color" value={bg.patternColor2} onChange={e => set({ patternColor2: e.target.value })} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                <span className="text-xs text-gray-500">Secondaire</span>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE */}
        {activeTab === 'image' && (
          <div className="space-y-3">
            <label
              className={`flex items-center gap-3 border-4 border-dashed rounded-xl p-4 cursor-pointer transition-all ${uploading ? 'border-gray-300 bg-gray-100 cursor-wait' : 'border-[#1A1040] bg-white hover:bg-candy'}`}
              onClick={() => !uploading && fileRef.current?.click()}>
              {uploading ? <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /> : <Upload className="w-5 h-5 text-[#1A1040]" />}
              <div>
                <p className="font-black text-[#1A1040] text-xs">{uploading ? 'Téléchargement…' : 'Choisir une image de fond'}</p>
                <p className="text-[10px] text-gray-400">JPG, PNG, WebP, SVG — max 10 Mo</p>
              </div>
            </label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
            {uploadError && <div className="text-xs text-red-600 font-medium flex items-center gap-1"><X className="w-3 h-3" />{uploadError}</div>}
            {bg.image && (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#1A1040] group h-24">
                <img src={bg.image} alt="" className="w-full h-full object-cover" />
                <button onClick={() => { setBg(p => ({ ...p, image: '' })); setActiveTab('color') }}
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1"><Trash2 className="w-3 h-3" />Supprimer</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIDÉO */}
        {activeTab === 'video' && (
          <div className="space-y-4">
            <label
              className={`flex items-center gap-3 border-4 border-dashed rounded-xl p-4 cursor-pointer transition-all ${videoUploading ? 'border-gray-300 bg-gray-100 cursor-wait' : 'border-[#1A1040] bg-white hover:bg-candy'}`}
              onClick={() => !videoUploading && videoFileRef.current?.click()}>
              {videoUploading ? <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /> : <Film className="w-5 h-5 text-[#1A1040]" />}
              <div>
                <p className="font-black text-[#1A1040] text-xs">{videoUploading ? 'Téléchargement…' : 'Choisir une vidéo de fond'}</p>
                <p className="text-[10px] text-gray-400">MP4, WebM, MOV — max 50 Mo · Format paysage recommandé</p>
              </div>
            </label>
            <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = '' }} />
            {videoUploadError && <div className="text-xs text-red-600 font-medium flex items-center gap-1"><X className="w-3 h-3" />{videoUploadError}</div>}
            {bg.videoUrl && (
              <div className="relative rounded-xl overflow-hidden border-2 border-[#1A1040] group h-28">
                <video src={bg.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                <div className="absolute inset-0" style={{ backgroundColor: bg.videoOverlay !== 'transparent' ? bg.videoOverlay : undefined }} />
                <button onClick={() => setBg(p => ({ ...p, videoUrl: '' }))}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />Supprimer
                </button>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">Assombrissement / éclaircissement</label>
              <div className="flex flex-wrap gap-2">
                {VIDEO_OVERLAYS.map(o => (
                  <button key={o.label} onClick={() => set({ videoOverlay: o.value })}
                    className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-black transition-all ${bg.videoOverlay === o.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => set({ videoMuted: !bg.videoMuted })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${bg.videoMuted ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-[#1A1040] text-citron-400 border-[#1A1040]'}`}>
                {bg.videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {bg.videoMuted ? 'Son coupé' : 'Avec son'}
              </button>
              <button onClick={() => set({ videoLoop: !bg.videoLoop })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${bg.videoLoop ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                <RotateCcw className="w-4 h-4" />
                {bg.videoLoop ? 'Boucle activée' : 'Pas de boucle'}
              </button>
            </div>
            {!bg.videoMuted && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-700 font-medium">
                ⚠️ Les navigateurs bloquent la lecture automatique <strong>avec le son</strong>. Activez <strong>Son coupé</strong> pour un démarrage automatique.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
