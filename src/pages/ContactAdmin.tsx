import { useState, useEffect, useRef } from 'react'
import { Phone, Check, RefreshCw, Pencil, MapPin, Mail, Type } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { type HeroBg, type BgType, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import HeroTitleEditor, { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'
import BgEditor from '../components/BgEditor'

interface BadgeConfig { text: string; bg: string; textColor: string; radius: string; font: string; fontSize: number }

const DEFAULT_CONTACT_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#1A1040' }
const DEFAULT_BADGE: BadgeConfig = { text: '⭐ On est là pour toi !', bg: '#fb7185', textColor: '#ffffff', radius: 'rounded-full', font: 'sans-serif', fontSize: 14 }

const FONT_OPTIONS = [
  { value: 'sans-serif',           label: 'Sans-serif' },
  { value: 'Georgia, serif',       label: 'Serif' },
  { value: 'system-ui, sans-serif',label: 'Système' },
  { value: 'monospace',            label: 'Mono' },
]
const DEFAULT_TITRE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 36, color: '#ffffff', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_INFOS_STYLE: HeroStyle = {
  font: 'sans', fontSize: 14, color: '#f3f0fa', bold: false, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CONTENT: Record<string, string> = {
  contact_titre: 'Viens nous dire bonjour 👋',
  contact_adresse: '12 rue des Artisans, 75001 Paris',
  contact_telephone: '06 12 34 56 78',
  contact_email: 'contact@lesplantsdejenni.fr',
}
const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Carré' },
  { value: 'rounded-lg',   label: 'Légèrement' },
  { value: 'rounded-xl',   label: 'Arrondi' },
  { value: 'rounded-2xl',  label: 'Très arrondi' },
  { value: 'rounded-full', label: 'Pilule' },
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

export default function ContactAdmin() {
  // Fond
  const [contactBg, setContactBg] = useState<HeroBg>(DEFAULT_CONTACT_BG)
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

  // Titre
  const [titreText, setTitreText] = useState('Viens nous dire bonjour 👋')
  const [titreStyle, setTitreStyle] = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [showTitreEditor, setShowTitreEditor] = useState(false)

  // Style des informations (adresse/téléphone/email)
  const [infosStyle, setInfosStyle] = useState<HeroStyle>(DEFAULT_INFOS_STYLE)
  const [showInfosStyleEditor, setShowInfosStyleEditor] = useState(false)

  // Infos de contact
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT)
  const [iconColors, setIconColors] = useState<Record<string, string>>({
    contact_icon_adresse: '#fb7185',
    contact_icon_telephone: '#ffe500',
    contact_icon_email: '#4dd9c0',
  })
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: settings }, { data: contentData }] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', [
        'contact_bg_config', 'contact_badge_config', 'contact_titre_style', 'contact_infos_style',
        'contact_icon_adresse', 'contact_icon_telephone', 'contact_icon_email',
      ]),
      supabase.from('page_content').select('section, contenu')
        .eq('page', 'contact').in('section', ['contact_titre', 'contact_adresse', 'contact_telephone', 'contact_email']),
    ])
    ;(contentData || []).forEach((c: { section: string; contenu: string }) => {
      setContent(prev => ({ ...prev, [c.section]: c.contenu }))
      if (c.section === 'contact_titre') setTitreText(c.contenu)
    })
    ;(settings || []).forEach((s: { key: string; value: string }) => {
      try {
        if (s.key === 'contact_bg_config')    { const v = JSON.parse(s.value); setContactBg(p => ({ ...p, ...v })); setBgTab(v.type || 'color') }
        if (s.key === 'contact_badge_config') { setBadge(p => ({ ...p, ...JSON.parse(s.value) })) }
        if (s.key === 'contact_titre_style')  { setTitreStyle(p => ({ ...p, ...JSON.parse(s.value) })) }
        if (s.key === 'contact_infos_style')  { setInfosStyle(p => ({ ...p, ...JSON.parse(s.value) })) }
      } catch {}
      if (s.key === 'contact_icon_adresse')   setIconColors(p => ({ ...p, contact_icon_adresse: s.value }))
      if (s.key === 'contact_icon_telephone') setIconColors(p => ({ ...p, contact_icon_telephone: s.value }))
      if (s.key === 'contact_icon_email')     setIconColors(p => ({ ...p, contact_icon_email: s.value }))
    })
  }

  async function saveBg() {
    setBgSaving(true)
    const final = { ...contactBg, type: bgTab }
    await supabase.from('settings').upsert({ key: 'contact_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setContactBg(final); setBgSaving(false); setBgSaved(true); setTimeout(() => setBgSaved(false), 3000)
  }

  async function saveBadge() {
    setBadgeSaving(true)
    await supabase.from('settings').upsert({ key: 'contact_badge_config', value: JSON.stringify(badge) }, { onConflict: 'key' })
    setBadgeSaving(false); setBadgeSaved(true); setTimeout(() => setBadgeSaved(false), 3000)
  }

  async function saveInfo() {
    setInfoSaving(true)
    await Promise.all([
      supabase.from('page_content').upsert({ page: 'contact', section: 'contact_adresse', contenu: content['contact_adresse'] || '' }, { onConflict: 'page,section' }),
      supabase.from('page_content').upsert({ page: 'contact', section: 'contact_telephone', contenu: content['contact_telephone'] || '' }, { onConflict: 'page,section' }),
      supabase.from('page_content').upsert({ page: 'contact', section: 'contact_email', contenu: content['contact_email'] || '' }, { onConflict: 'page,section' }),
      supabase.from('settings').upsert({ key: 'contact_icon_adresse', value: iconColors['contact_icon_adresse'] }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'contact_icon_telephone', value: iconColors['contact_icon_telephone'] }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'contact_icon_email', value: iconColors['contact_icon_email'] }, { onConflict: 'key' }),
    ])
    setInfoSaving(false); setInfoSaved(true); setTimeout(() => setInfoSaved(false), 3000)
  }

  return (
    <main className="flex-1 bg-candy">
      {/* HEADER */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-400 rounded-2xl flex items-center justify-center border-2 border-rose-300" style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
            <Phone className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Page Contact <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* FOND */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<span className="text-lg">🎨</span>} title="Fond de la page contact" sub="Couleur, dégradé, motif, image ou vidéo" />
          <div className="relative h-32 flex items-center justify-center overflow-hidden transition-all duration-500 mx-6 mt-6 rounded-2xl border-2 border-[#1A1040]"
            style={buildHeroBgStyle({ ...contactBg, type: bgTab })}>
            <p className="font-serif text-xl font-black drop-shadow" style={{ color: titreStyle.color }}>Viens nous dire bonjour 👋</p>
          </div>
          <div className="p-6 space-y-4">
            <BgEditor bg={contactBg} setBg={setContactBg} activeTab={bgTab} setActiveTab={setBgTab}
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
          <SectionHeader icon={<span className="text-lg">🏷️</span>} title="Badge" sub="Le petit badge au-dessus du titre" />
          <div className="p-6 space-y-5">
            {/* Aperçu */}
            <div className="flex justify-center py-2 bg-[#1A1040] rounded-2xl">
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 font-bold border-2 border-white/20 ${badge.radius}`}
                style={{ backgroundColor: badge.bg, color: badge.textColor, fontFamily: badge.font, fontSize: badge.fontSize }}>
                {badge.text}
              </div>
            </div>

            {/* Texte */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
              <input type="text" value={badge.text} onChange={e => setBadge(p => ({ ...p, text: e.target.value }))}
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>

            {/* Police + Taille */}
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

            {/* Couleurs */}
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

            {/* Forme */}
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

        {/* TITRE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<Pencil className="w-5 h-5 text-[#1A1040]" />} title="Titre principal" sub="Police, taille, couleur, ombre…" />
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[80px]"
              style={{ ...buildHeroBgStyle({ ...contactBg, type: bgTab }), boxShadow: '3px 3px 0px 0px #1A1040' }}>
              <div style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} className="text-center leading-tight" />
            </div>
            <button onClick={() => setShowTitreEditor(true)}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
              style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
              <Pencil className="w-4 h-4" /> Modifier le titre
            </button>
          </div>
        </div>

        {/* INFOS CONTACT */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<MapPin className="w-5 h-5 text-[#1A1040]" />} title="Informations de contact" sub="Adresse, téléphone, email et couleurs des icônes" />
          <div className="p-6 space-y-6">
            {/* Style du texte (police, taille, couleur…) */}
            <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-4 space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Style du texte</p>
              <div className="rounded-xl border-2 border-[#1A1040] p-3 flex items-center justify-center min-h-[48px]"
                style={{ ...buildHeroBgStyle({ ...contactBg, type: bgTab }) }}>
                <span style={buildTitleStyle(infosStyle)}>Prinquiau · 06 12 34 56 78</span>
              </div>
              <button onClick={() => setShowInfosStyleEditor(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-2.5 rounded-xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all text-xs">
                <Type className="w-3.5 h-3.5" /> Modifier le style
              </button>
            </div>
            {[
              { key: 'contact_adresse',   iconKey: 'contact_icon_adresse',   label: '📍 Adresse',   icon: <MapPin className="w-5 h-5" /> },
              { key: 'contact_telephone', iconKey: 'contact_icon_telephone', label: '📞 Téléphone', icon: <Phone  className="w-5 h-5" /> },
              { key: 'contact_email',     iconKey: 'contact_icon_email',     label: '✉️ Email',     icon: <Mail   className="w-5 h-5" /> },
            ].map(({ key, iconKey, label, icon }) => (
              <div key={key} className="flex items-center gap-4">
                {/* Icône aperçu + color picker */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A1040]"
                    style={{ backgroundColor: iconColors[iconKey] }}>
                    <span style={{ color: '#1A1040' }}>{icon}</span>
                  </div>
                  <input type="color" value={iconColors[iconKey]} onChange={e => setIconColors(p => ({ ...p, [iconKey]: e.target.value }))}
                    className="w-10 h-5 rounded border border-gray-300 cursor-pointer p-0" title="Couleur de l'icône" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                  <input type="text" value={content[key] || ''} onChange={e => setContent(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveInfo} disabled={infoSaving}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #4dd9c0' }}>
                {infoSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : infoSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Enregistrer les infos</>}
              </button>
              {infoSaved && <span className="text-sm font-black text-lime-600">✅ Informations mises à jour !</span>}
            </div>
          </div>
        </div>

      </div>

      {showTitreEditor && (
        <HeroTitleEditor
          initialText={titreText}
          initialStyle={titreStyle}
          page="contact"
          sectionKey="contact_titre"
          styleKey="contact_titre_style"
          label="✏️ Titre — Page Contact"
          onSave={(text, style) => {
            setTitreText(text)
            setTitreStyle(style)
            setShowTitreEditor(false)
          }}
          onClose={() => setShowTitreEditor(false)}
        />
      )}

      {showInfosStyleEditor && (
        <HeroTitleEditor
          initialText="Prinquiau · 06 12 34 56 78 · contact@example.fr"
          initialStyle={infosStyle}
          sectionKey="contact_infos_preview"
          styleKey="contact_infos_style"
          label="✏️ Style — Adresse / Téléphone / Email"
          onSave={(_, style) => {
            setInfosStyle(style)
            supabase.from('settings').upsert({ key: 'contact_infos_style', value: JSON.stringify(style) }, { onConflict: 'key' })
            setShowInfosStyleEditor(false)
          }}
          onClose={() => setShowInfosStyleEditor(false)}
        />
      )}
    </main>
  )
}
