import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Scissors, Pencil, Upload, RefreshCw, X, Palette, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import HeroTitleEditor, { type HeroStyle, DEFAULT_HERO_STYLE, buildTitleStyle } from './HeroTitleEditor'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle, loadCachedBg, saveCachedBg } from '../lib/heroBg'
import BgEditor from './BgEditor'

const DEFAULT_FOOTER_TEXT = "Les plants de Jenni ✦"
const DEFAULT_FOOTER_STYLE: HeroStyle = {
  ...DEFAULT_HERO_STYLE,
  font: 'sans', fontSize: 18, color: '#ffffff', bold: true, shadow: false,
}
const DEFAULT_FOOTER_BG: HeroBg = { ...DEFAULT_HERO_BG, type: 'color', color: '#1A1040' }

function pageKeyFromPath(path: string): string {
  if (path === '/' || path === '') return 'accueil'
  return path.replace(/^\//, '').split('/')[0] || 'accueil'
}

export default function Footer() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [text,    setText]    = useState(DEFAULT_FOOTER_TEXT)
  const [style,   setStyle]   = useState<HeroStyle>(DEFAULT_FOOTER_STYLE)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pageKey = pageKeyFromPath(pathname)

  // Fond par page
  const [footerBg,      setFooterBg]      = useState<HeroBg>(() => loadCachedBg(`footer_bg_${pageKey}`, DEFAULT_FOOTER_BG))
  const [footerBgTab,   setFooterBgTab]   = useState<BgType>(() => loadCachedBg(`footer_bg_${pageKey}`, DEFAULT_FOOTER_BG).type)
  const [showBgEditor,  setShowBgEditor]  = useState(false)
  const [bgUploading,   setBgUploading]   = useState(false)
  const [bgUploadError, setBgUploadError] = useState('')
  const bgFileRef = useRef<HTMLInputElement>(null)

  // Charge le texte/style/icône une seule fois
  useEffect(() => {
    loadStatic()
  }, [])

  // Recharge le fond à chaque changement de page
  useEffect(() => {
    const cached = loadCachedBg(`footer_bg_${pageKey}`, DEFAULT_FOOTER_BG)
    setFooterBg(cached)
    setFooterBgTab(cached.type)
    loadPageBg(pageKey)
  }, [pageKey])

  async function loadStatic() {
    const [{ data: content }, { data: settings }] = await Promise.all([
      supabase.from('page_content').select('contenu').eq('page', 'accueil').eq('section', 'footer_titre').maybeSingle(),
      supabase.from('settings').select('key, value').in('key', ['footer_titre_style', 'footer_icon_url']),
    ])
    if (content?.contenu) setText(content.contenu)
    ;(settings || []).forEach(s => {
      if (s.key === 'footer_titre_style') { try { setStyle(p => ({ ...p, ...JSON.parse(s.value) })) } catch {} }
      if (s.key === 'footer_icon_url')    { setIconUrl(s.value || null) }
    })
  }

  async function loadPageBg(key: string) {
    const { data } = await supabase.from('settings').select('value').eq('key', `footer_bg_${key}`).maybeSingle()
    if (data?.value) {
      try {
        const v = JSON.parse(data.value)
        setFooterBg(p => { const m = { ...p, ...v }; saveCachedBg(`footer_bg_${key}`, m); return m })
        setFooterBgTab(v.type || 'color')
      } catch {}
    }
  }

  async function saveBg() {
    await supabase.from('settings').upsert(
      { key: `footer_bg_${pageKey}`, value: JSON.stringify(footerBg) },
      { onConflict: 'key' }
    )
    setShowBgEditor(false)
  }

  async function uploadIcon(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `footer-icon-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('hero').getPublicUrl(filename)
      const url = data.publicUrl + '?t=' + Date.now()
      setIconUrl(url)
      await supabase.from('settings').upsert({ key: 'footer_icon_url', value: url }, { onConflict: 'key' })
    }
    setUploading(false)
  }

  async function resetIcon() {
    setIconUrl(null)
    await supabase.from('settings').upsert({ key: 'footer_icon_url', value: '' }, { onConflict: 'key' })
  }

  const footerStyle = buildHeroBgStyle(footerBg)

  return (
    <footer style={footerStyle} className="border-t-4 border-[#1A1040]">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-white/30 overflow-hidden shrink-0 group"
            onClick={() => isAdmin && fileRef.current?.click()}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
            {iconUrl
              ? <img src={iconUrl} alt="" className="w-full h-full object-cover" />
              : <Scissors className="w-5 h-5 text-white" />}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploading ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white" />}
              </div>
            )}
          </div>
          {isAdmin && (
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = '' }} />
          )}

          <span style={buildTitleStyle(style)} dangerouslySetInnerHTML={{ __html: text }} />

          {isAdmin && (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setShowEditor(true)}
                className="inline-flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/20 hover:bg-white/20 transition-all">
                <Pencil className="w-3 h-3" /> Texte
              </button>
              <button onClick={() => setShowBgEditor(true)}
                className="inline-flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/20 hover:bg-white/20 transition-all">
                <Palette className="w-3 h-3" /> Fond
              </button>
              {iconUrl && (
                <button onClick={resetIcon} title="Revenir à l'icône ciseaux par défaut"
                  className="inline-flex items-center gap-1 bg-white/10 text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/20 hover:bg-red-500/40 transition-all">
                  <X className="w-3 h-3" /> Icône
                </button>
              )}
            </div>
          )}
        </div>

        {/* Confettis déco — le citron cache l'accès à la connexion */}
        <div className="flex items-center gap-2">
          {['🍓','🍋','🥒','🍏','🍊'].map((emoji, i) => (
            <span key={i} className="text-base leading-none select-none"
              style={{ transform: `rotate(${i * 15}deg)`, cursor: i === 1 ? 'pointer' : 'default', display: 'inline-block' }}
              onClick={i === 1 ? () => navigate('/connexion') : undefined}>
              {emoji}
            </span>
          ))}
        </div>

        <p className="text-gray-400 text-sm font-medium">
          © {new Date().getFullYear()} Les bons plants de Jen — Fait avec 💧 & ☀️ & ❤️
        </p>
      </div>

      {showEditor && (
        <HeroTitleEditor
          initialText={text}
          initialStyle={style}
          sectionKey="footer_titre"
          styleKey="footer_titre_style"
          label="✏️ Texte du pied de page"
          onSave={(t, s) => { setText(t); setStyle(s); setShowEditor(false) }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* ── Éditeur fond du bas de page ── */}
      {showBgEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowBgEditor(false)}>
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-lg overflow-hidden"
            style={{ boxShadow: '6px 6px 0px 0px #ffe500' }}>
            <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between">
              <h2 className="font-black text-citron-400">🎨 Fond du bas de page</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 font-bold uppercase tracking-wide">Page : {pageKey}</span>
                <button onClick={() => setShowBgEditor(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <BgEditor
                bg={footerBg}
                setBg={setFooterBg}
                activeTab={footerBgTab}
                setActiveTab={setFooterBgTab}
                fileRef={bgFileRef}
                uploadError={bgUploadError}
                setUploadError={setBgUploadError}
                uploading={bgUploading}
                setUploading={setBgUploading}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t-4 border-[#1A1040] px-6 py-4 flex gap-3">
              <button onClick={() => setShowBgEditor(false)}
                className="flex-1 border-2 border-[#1A1040] rounded-2xl py-3 font-black text-[#1A1040] hover:bg-gray-50 transition-all">
                Annuler
              </button>
              <button onClick={saveBg}
                className="flex-1 bg-[#1A1040] text-citron-400 border-2 border-[#1A1040] rounded-2xl py-3 font-black hover:bg-[#2d2060] transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
