import { useState, useEffect, useRef } from 'react'
import { Lock, Check, RefreshCw, Pencil, LogIn, Upload, Trash2, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import HeroTitleEditor, { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'
import BgEditor from '../components/BgEditor'

interface BadgeConfig { text: string; bg: string; textColor: string; radius: string; font: string; fontSize: number }
interface StyleConfig { iconBg: string; cardBg: string; borderColor: string; buttonBg: string; buttonText: string }

const DEFAULT_CONNEXION_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#fff5fb' }
const DEFAULT_BADGE: BadgeConfig = { text: '🔐 Zone secrète !', bg: '#fb7185', textColor: '#ffffff', radius: 'rounded-full', font: 'sans-serif', fontSize: 14 }
const DEFAULT_STYLE: StyleConfig = { iconBg: '#fb7185', cardBg: '#ffffff', borderColor: '#1A1040', buttonBg: '#fb7185', buttonText: '#ffffff' }
const DEFAULT_TITRE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 24, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CONTENT: Record<string, string> = {
  connexion_titre:       'Espace Admin',
  connexion_sous_titre:  'Les plants de Jenni ✦',
  connexion_footer_texte: 'Réservé à la gestionnaire du site uniquement.',
}
const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Carré' },
  { value: 'rounded-lg',   label: 'Légèrement' },
  { value: 'rounded-xl',   label: 'Arrondi' },
  { value: 'rounded-2xl',  label: 'Très arrondi' },
  { value: 'rounded-full', label: 'Pilule' },
]
const FONT_OPTIONS = [
  { value: 'sans-serif',            label: 'Sans-serif' },
  { value: 'Georgia, serif',        label: 'Serif' },
  { value: 'system-ui, sans-serif', label: 'Système' },
  { value: 'monospace',             label: 'Mono' },
]

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center gap-3 bg-candy">
      {icon}
      <div>
        <h2 className="font-black text-[#1A1040] text-sm">{title}</h2>
        <p className="text-[10px] text-gray-400 font-bold">{sub}</p>
      </div>
    </div>
  )
}

export default function ConnexionAdmin() {
  // Fond
  const [bg, setBg] = useState<HeroBg>(DEFAULT_CONNEXION_BG)
  const [bgTab, setBgTab] = useState<BgType>('color')
  const [bgSaving, setBgSaving] = useState(false)
  const [bgSaved, setBgSaved] = useState(false)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const [bgUploadError, setBgUploadError] = useState('')
  const [bgUploading, setBgUploading] = useState(false)

  // Badge
  const [badge, setBadge] = useState<BadgeConfig>(DEFAULT_BADGE)
  const [badgeSaving, setBadgeSaving] = useState(false)
  const [badgeSaved, setBadgeSaved] = useState(false)

  // Style carte / bouton
  const [style, setStyle] = useState<StyleConfig>(DEFAULT_STYLE)
  const [styleSaving, setStyleSaving] = useState(false)
  const [styleSaved, setStyleSaved] = useState(false)

  // Logo / icône
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const logoFileRef = useRef<HTMLInputElement>(null)

  // Titre
  const [titreText, setTitreText] = useState(DEFAULT_CONTENT.connexion_titre)
  const [titreStyle, setTitreStyle] = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [showTitreEditor, setShowTitreEditor] = useState(false)

  // Textes
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [textSaving, setTextSaving] = useState(false)
  const [textSaved, setTextSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: settings }, { data: contentData }] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'connexion_bg_config', 'connexion_badge_config', 'connexion_style_config', 'connexion_titre_style', 'connexion_logo_url',
      ]),
      supabase.from('page_content').select('section, contenu')
        .eq('page', 'connexion').in('section', ['connexion_titre', 'connexion_sous_titre', 'connexion_footer_texte']),
    ])
    ;(contentData || []).forEach((c: { section: string; contenu: string }) => {
      setContent(prev => ({ ...prev, [c.section]: c.contenu }))
      if (c.section === 'connexion_titre') setTitreText(c.contenu)
    })
    ;(settings || []).forEach((s: { key: string; value: string }) => {
      try {
        if (s.key === 'connexion_bg_config')    { const v = JSON.parse(s.value); setBg(p => ({ ...p, ...v })); setBgTab(v.type || 'color') }
        if (s.key === 'connexion_badge_config') { setBadge(p => ({ ...p, ...JSON.parse(s.value) })) }
        if (s.key === 'connexion_style_config') { setStyle(p => ({ ...p, ...JSON.parse(s.value) })) }
        if (s.key === 'connexion_titre_style')  { setTitreStyle(p => ({ ...p, ...JSON.parse(s.value) })) }
      } catch {}
      if (s.key === 'connexion_logo_url') setLogoUrl(s.value || '')
    })
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true); setLogoError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `connexion-logo.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setLogoError('Erreur : ' + error.message); setLogoUploading(false); return }
    const { data } = supabase.storage.from('hero').getPublicUrl(filename)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('settings').upsert({ key: 'connexion_logo_url', value: url }, { onConflict: 'key' })
    setLogoUrl(url)
    setLogoUploading(false)
  }

  async function removeLogo() {
    await supabase.from('settings').upsert({ key: 'connexion_logo_url', value: '' }, { onConflict: 'key' })
    setLogoUrl('')
  }

  async function saveBg() {
    setBgSaving(true)
    const final = { ...bg, type: bgTab }
    await supabase.from('settings').upsert({ key: 'connexion_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setBg(final); setBgSaving(false); setBgSaved(true); setTimeout(() => setBgSaved(false), 3000)
  }

  async function saveBadge() {
    setBadgeSaving(true)
    await supabase.from('settings').upsert({ key: 'connexion_badge_config', value: JSON.stringify(badge) }, { onConflict: 'key' })
    setBadgeSaving(false); setBadgeSaved(true); setTimeout(() => setBadgeSaved(false), 3000)
  }

  async function saveStyle() {
    setStyleSaving(true)
    await supabase.from('settings').upsert({ key: 'connexion_style_config', value: JSON.stringify(style) }, { onConflict: 'key' })
    setStyleSaving(false); setStyleSaved(true); setTimeout(() => setStyleSaved(false), 3000)
  }

  async function saveTexts() {
    setTextSaving(true)
    await Promise.all([
      supabase.from('page_content').upsert({ page: 'connexion', section: 'connexion_sous_titre',  contenu: content['connexion_sous_titre']  || '' }, { onConflict: 'page,section' }),
      supabase.from('page_content').upsert({ page: 'connexion', section: 'connexion_footer_texte', contenu: content['connexion_footer_texte'] || '' }, { onConflict: 'page,section' }),
    ])
    setTextSaving(false); setTextSaved(true); setTimeout(() => setTextSaved(false), 3000)
  }

  return (
    <main className="flex-1 bg-candy">
      {/* HEADER */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-400 rounded-2xl flex items-center justify-center border-2 border-rose-300" style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Page Connexion <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* APERÇU LIVE */}
        <div className="rounded-3xl border-4 border-[#1A1040] overflow-hidden relative flex items-center justify-center p-10"
          style={buildHeroBgStyle({ ...bg, type: bgTab })}>
          <div className="rounded-3xl border-4 p-6 relative w-full max-w-xs" style={{ backgroundColor: style.cardBg, borderColor: style.borderColor, boxShadow: `5px 5px 0px 0px ${style.borderColor}` }}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 font-black border-2 whitespace-nowrap text-xs"
              style={{ backgroundColor: badge.bg, color: badge.textColor, borderColor: style.borderColor, fontFamily: badge.font, borderRadius: badge.radius === 'rounded-full' ? '9999px' : '8px' }}>
              {badge.text}
            </div>
            <div className="text-center mt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border-2 mb-2 overflow-hidden" style={{ backgroundColor: style.iconBg, borderColor: style.borderColor }}>
                {logoUrl
                  ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                  : <Scissors className="w-6 h-6 text-white" />}
              </div>
              <div style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} />
              <p className="text-gray-500 text-xs mt-1 font-medium">{content['connexion_sous_titre']}</p>
            </div>
            <div className="w-full flex items-center justify-center gap-2 py-2 rounded-xl font-black text-xs mt-4 border-2"
              style={{ backgroundColor: style.buttonBg, color: style.buttonText, borderColor: style.borderColor }}>
              <LogIn className="w-3.5 h-3.5" /> Se connecter
            </div>
          </div>
        </div>

        {/* FOND */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<span className="text-lg">🎨</span>} title="Fond de la page connexion" sub="Couleur, dégradé, motif, image ou vidéo" />
          <div className="p-6 space-y-4">
            <BgEditor bg={bg} setBg={setBg} activeTab={bgTab} setActiveTab={setBgTab}
              fileRef={bgFileRef} uploadError={bgUploadError} setUploadError={setBgUploadError}
              uploading={bgUploading} setUploading={setBgUploading} />
            <div className="flex items-center gap-3">
              <button onClick={saveBg} disabled={bgSaving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                {bgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : bgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer le fond</>}
              </button>
              {bgSaved && <span className="text-sm font-black text-lime-600">✅ Fond mis à jour !</span>}
            </div>
          </div>
        </div>

        {/* BADGE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<span className="text-lg">🏷️</span>} title="Badge" sub="Le petit badge au-dessus de l'icône" />
          <div className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
              <input type="text" value={badge.text} onChange={e => setBadge(p => ({ ...p, text: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Police</label>
                <select value={badge.font} onChange={e => setBadge(p => ({ ...p, font: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Taille — {badge.fontSize}px</label>
                <input type="range" min={10} max={28} value={badge.fontSize}
                  onChange={e => setBadge(p => ({ ...p, fontSize: Number(e.target.value) }))}
                  className="w-full accent-rose-400 mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Couleur de fond</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={badge.bg} onChange={e => setBadge(p => ({ ...p, bg: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                  <input type="text" value={badge.bg} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBadge(p => ({ ...p, bg: e.target.value })) }}
                    className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Couleur du texte</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={badge.textColor} onChange={e => setBadge(p => ({ ...p, textColor: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                  <input type="text" value={badge.textColor} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBadge(p => ({ ...p, textColor: e.target.value })) }}
                    className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map(r => (
                  <button key={r.value} onClick={() => setBadge(p => ({ ...p, radius: r.value }))}
                    className={`px-2.5 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${badge.radius === r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveBadge} disabled={badgeSaving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
                {badgeSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : badgeSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer le badge</>}
              </button>
              {badgeSaved && <span className="text-sm font-black text-lime-600">✅ Badge mis à jour !</span>}
            </div>
          </div>
        </div>

        {/* LOGO */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<span className="text-lg">🖼️</span>} title="Logo" sub="Remplace l'icône par défaut au-dessus du titre" />
          <div className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: style.iconBg, borderColor: style.borderColor }}>
              {logoUrl
                ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                : <Scissors className="w-8 h-8 text-white" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer text-sm font-black transition-all ${logoUploading ? 'border-gray-300 bg-gray-50 cursor-wait text-gray-400' : 'border-[#1A1040] bg-candy hover:bg-violet-50 text-[#1A1040]'}`}
                  onClick={() => !logoUploading && logoFileRef.current?.click()}>
                  {logoUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {logoUploading ? 'Envoi…' : logoUrl ? 'Changer le logo' : 'Uploader un logo'}
                </label>
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
                {logoUrl && (
                  <button onClick={removeLogo}
                    className="w-11 flex items-center justify-center rounded-xl border-2 border-red-300 text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400">PNG, JPG, SVG — carré recommandé. Laisse vide pour garder l'icône ciseaux par défaut.</p>
              {logoError && <p className="text-xs text-red-600 font-medium">{logoError}</p>}
            </div>
          </div>
        </div>

        {/* COULEURS CARTE / BOUTON */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<span className="text-lg">🖌️</span>} title="Couleurs" sub="Icône, carte, bordure et bouton de connexion" />
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                { key: 'iconBg',     label: 'Fond icône' },
                { key: 'cardBg',     label: 'Fond carte' },
                { key: 'borderColor', label: 'Bordure' },
                { key: 'buttonBg',   label: 'Fond bouton' },
                { key: 'buttonText', label: 'Texte bouton' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={style[key]} onChange={e => setStyle(p => ({ ...p, [key]: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                    <input type="text" value={style[key]} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setStyle(p => ({ ...p, [key]: e.target.value })) }}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveStyle} disabled={styleSaving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #4dd9c0' }}>
                {styleSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : styleSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer les couleurs</>}
              </button>
              {styleSaved && <span className="text-sm font-black text-lime-600">✅ Couleurs mises à jour !</span>}
            </div>
          </div>
        </div>

        {/* TITRE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<Pencil className="w-5 h-5 text-[#1A1040]" />} title="Titre principal" sub="Police, taille, couleur, ombre…" />
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[80px] bg-candy">
              <div style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} className="text-center leading-tight" />
            </div>
            <button onClick={() => setShowTitreEditor(true)}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
              style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
              <Pencil className="w-4 h-4" /> Modifier le titre
            </button>
          </div>
        </div>

        {/* TEXTES */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<span className="text-lg">📝</span>} title="Textes" sub="Sous-titre et note de bas de carte" />
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Sous-titre (sous le titre)</label>
              <input type="text" value={content['connexion_sous_titre'] || ''} onChange={e => setContent(p => ({ ...p, connexion_sous_titre: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Note de bas de carte</label>
              <input type="text" value={content['connexion_footer_texte'] || ''} onChange={e => setContent(p => ({ ...p, connexion_footer_texte: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={saveTexts} disabled={textSaving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
                {textSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : textSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Enregistrer les textes</>}
              </button>
              {textSaved && <span className="text-sm font-black text-lime-600">✅ Textes mis à jour !</span>}
            </div>
          </div>
        </div>

      </div>

      {showTitreEditor && (
        <HeroTitleEditor
          initialText={titreText}
          initialStyle={titreStyle}
          page="connexion"
          sectionKey="connexion_titre"
          styleKey="connexion_titre_style"
          label="✏️ Titre — Page Connexion"
          onSave={(text, style) => {
            setTitreText(text)
            setTitreStyle(style)
            setShowTitreEditor(false)
          }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}
    </main>
  )
}
