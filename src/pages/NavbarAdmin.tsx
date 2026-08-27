import { useState, useEffect } from 'react'
import { Check, RefreshCw, Navigation, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface NavSettings {
  bgColor:       string
  borderColor:   string
  linkFont:      string
  activeBg:      string
  activeText:    string
  inactiveText:  string
  hoverBg:       string
  mobileBg:      string
  labels:        string[]
}

const DEFAULT_NAV: NavSettings = {
  bgColor:      '#ffffff',
  borderColor:  '#1A1040',
  linkFont:     'sans',
  activeBg:     '#fb7185',
  activeText:   '#ffffff',
  inactiveText: '#1A1040',
  hoverBg:      '#ffe4e6',
  mobileBg:     '#ffb5c8',
  labels:       ['🏠 Accueil', '🎨 Nos Ateliers', '✉️ Contact', '🖼️ Galerie', '🛍️ Boutique'],
}

const FONT_OPTIONS = [
  { value: 'sans',    label: 'Normale',   style: { fontFamily: 'sans-serif' } },
  { value: 'serif',   label: 'Serif',     style: { fontFamily: 'serif' } },
  { value: 'mono',    label: 'Mono',      style: { fontFamily: 'monospace' } },
  { value: 'cursive', label: 'Écriture',  style: { fontFamily: 'cursive' } },
]

// ─── ColorPicker helper ─────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
        <input type="text" value={value} maxLength={7}
          onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
          className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-400" />
      </div>
    </div>
  )
}

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

// ─── Save button ────────────────────────────────────────────────────────────────
function SaveBtn({ onClick, saving, saved, label, shadow }: {
  onClick: () => void; saving: boolean; saved: boolean; label: string; shadow: string
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onClick} disabled={saving}
        className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
        style={{ boxShadow: `3px 3px 0px 0px ${shadow}` }}>
        {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</>
                : saved  ? <><Check className="w-4 h-4" />Enregistré !</>
                         : <><Check className="w-4 h-4" />{label}</>}
      </button>
      {saved && <span className="text-sm font-black text-lime-600">✅ Mis à jour !</span>}
    </div>
  )
}

// ─── Mini aperçu de navbar ─────────────────────────────────────────────────────
function NavPreview({ nav, hovered, setHovered }: {
  nav: NavSettings
  hovered: number | null
  setHovered: (i: number | null) => void
}) {
  const fontMap: Record<string, string> = {
    sans: 'sans-serif', serif: 'serif', mono: 'monospace', cursive: 'cursive',
  }

  return (
    <div className="rounded-2xl border-2 border-[#1A1040] overflow-hidden" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
      <div className="flex items-center gap-2 px-4 h-12 border-b-4"
        style={{ backgroundColor: nav.bgColor, borderBottomColor: nav.borderColor }}>
        {/* Logo placeholder */}
        <div className="w-8 h-8 rounded-lg bg-rose-300 border-2 border-[#1A1040] shrink-0" />
        <div className="flex-1" />
        {/* Liens */}
        {nav.labels.map((label, i) => {
          const isActive = i === 0
          const isHovered = hovered === i
          return (
            <span key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all select-none"
              style={{
                fontFamily: fontMap[nav.linkFont] || 'sans-serif',
                backgroundColor: isActive ? nav.activeBg : isHovered ? nav.hoverBg : 'transparent',
                color: isActive ? nav.activeText : nav.inactiveText,
              }}>
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────
export default function NavbarAdmin() {
  const [nav, setNav]         = useState<NavSettings>(DEFAULT_NAV)
  const [hovered, setHovered] = useState<number | null>(null)

  // Section saves
  const [tabVisible, setTabVisible] = useState({ ateliers: true, contact: true, galerie: true, boutique: true })
  const [savingTab, setSavingTab] = useState<string | null>(null)

  const [s1Saving, setS1Saving] = useState(false); const [s1Saved, setS1Saved] = useState(false)
  const [s2Saving, setS2Saving] = useState(false); const [s2Saved, setS2Saved] = useState(false)
  const [s3Saving, setS3Saving] = useState(false); const [s3Saved, setS3Saved] = useState(false)
  const [s4Saving, setS4Saving] = useState(false); const [s4Saved, setS4Saved] = useState(false)
  const [s5Saving, setS5Saving] = useState(false); const [s5Saved, setS5Saved] = useState(false)
  const [s6Saving, setS6Saving] = useState(false); const [s6Saved, setS6Saved] = useState(false)

  useEffect(() => { loadNav() }, [])

  async function loadNav() {
    const { data } = await supabase.from('settings').select('key, value').in('key', [
      'navbar_bg_color', 'navbar_border_color', 'navbar_link_font',
      'navbar_active_bg', 'navbar_active_text',
      'navbar_inactive_text', 'navbar_hover_bg',
      'navbar_mobile_bg', 'navbar_public_labels',
      'nav_ateliers_visible', 'nav_contact_visible',
      'nav_galerie_visible', 'nav_boutique_visible',
    ])
    if (!data) return
    const map: Record<string, string> = {}
    data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
    setNav(prev => ({
      ...prev,
      bgColor:      map['navbar_bg_color']       ?? prev.bgColor,
      borderColor:  map['navbar_border_color']    ?? prev.borderColor,
      linkFont:     map['navbar_link_font']        ?? prev.linkFont,
      activeBg:     map['navbar_active_bg']        ?? prev.activeBg,
      activeText:   map['navbar_active_text']      ?? prev.activeText,
      inactiveText: map['navbar_inactive_text']    ?? prev.inactiveText,
      hoverBg:      map['navbar_hover_bg']         ?? prev.hoverBg,
      mobileBg:     map['navbar_mobile_bg']        ?? prev.mobileBg,
      labels:       map['navbar_public_labels']
        ? (() => {
            try {
              const saved = JSON.parse(map['navbar_public_labels']) as string[]
              return DEFAULT_NAV.labels.map((def, i) => saved[i] ?? def)
            } catch { return prev.labels }
          })()
        : prev.labels,
    }))
    setTabVisible({
      ateliers: map['nav_ateliers_visible'] !== 'false',
      contact:  map['nav_contact_visible']  !== 'false',
      galerie:  map['nav_galerie_visible']  !== 'false',
      boutique: map['nav_boutique_visible'] !== 'false',
    })
  }

  async function upsertMany(pairs: { key: string; value: string }[]) {
    await Promise.all(pairs.map(p =>
      supabase.from('settings').upsert({ key: p.key, value: p.value }, { onConflict: 'key' })
    ))
  }

  function flash(set: (v: boolean) => void) {
    set(true); setTimeout(() => set(false), 3000)
  }

  async function toggleTab(key: keyof typeof tabVisible) {
    const next = !tabVisible[key]
    setTabVisible(prev => ({ ...prev, [key]: next }))
    setSavingTab(key)
    await supabase.from('settings').upsert(
      { key: `nav_${key}_visible`, value: JSON.stringify(next) },
      { onConflict: 'key' }
    )
    setSavingTab(null)
  }

  async function saveFond() {
    setS1Saving(true)
    await upsertMany([
      { key: 'navbar_bg_color',     value: nav.bgColor },
      { key: 'navbar_border_color', value: nav.borderColor },
    ])
    setS1Saving(false); flash(setS1Saved)
  }

  async function savePolice() {
    setS2Saving(true)
    await upsertMany([{ key: 'navbar_link_font', value: nav.linkFont }])
    setS2Saving(false); flash(setS2Saved)
  }

  async function saveActif() {
    setS3Saving(true)
    await upsertMany([
      { key: 'navbar_active_bg',   value: nav.activeBg },
      { key: 'navbar_active_text', value: nav.activeText },
    ])
    setS3Saving(false); flash(setS3Saved)
  }

  async function saveInactif() {
    setS4Saving(true)
    await upsertMany([
      { key: 'navbar_inactive_text', value: nav.inactiveText },
      { key: 'navbar_hover_bg',      value: nav.hoverBg },
    ])
    setS4Saving(false); flash(setS4Saved)
  }

  async function saveMobile() {
    setS5Saving(true)
    await upsertMany([{ key: 'navbar_mobile_bg', value: nav.mobileBg }])
    setS5Saving(false); flash(setS5Saved)
  }

  async function saveLabels() {
    setS6Saving(true)
    await upsertMany([{ key: 'navbar_public_labels', value: JSON.stringify(nav.labels) }])
    setS6Saving(false); flash(setS6Saved)
  }

  return (
    <main className="flex-1 bg-candy">

      {/* HEADER */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-yellow-300"
            style={{ boxShadow: '3px 3px 0px 0px #fb7185' }}>
            <Navigation className="w-7 h-7 text-[#1A1040]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">🔐 Espace administrateur</div>
            <h1 className="font-serif text-3xl font-black text-white">Barre de navigation <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* APERÇU EN DIRECT */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<span className="text-lg">👁️</span>} title="Aperçu en direct" sub="Survole les onglets pour tester le hover" />
          <div className="p-6">
            <NavPreview nav={nav} hovered={hovered} setHovered={setHovered} />
          </div>
        </div>

        {/* VISIBILITÉ DES ONGLETS */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<span className="text-lg">👁️</span>} title="Visibilité des onglets" sub="Choisir quels onglets sont affichés aux visiteurs" />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: 'ateliers', label: 'Nos Ateliers', icon: '🎨', href: '/ateliers' },
              { key: 'contact',  label: 'Contact',      icon: '✉️',  href: '/contact'  },
              { key: 'galerie',  label: 'Galerie',       icon: '🖼️', href: '/galerie'  },
              { key: 'boutique', label: 'Boutique',      icon: '🛍️', href: '/boutique' },
            ] as const).map(tab => {
              const isVisible = tabVisible[tab.key]
              const isSaving  = savingTab === tab.key
              return (
                <div key={tab.key}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
                    isVisible ? 'bg-lime-50 border-lime-300' : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div>
                    <p className="font-black text-[#1A1040] text-sm">{tab.icon} {tab.label}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{tab.href}</p>
                  </div>
                  <button
                    onClick={() => toggleTab(tab.key)}
                    disabled={!!isSaving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-black text-xs transition-all disabled:opacity-50 ${
                      isVisible
                        ? 'bg-lime-400 border-[#1A1040] text-[#1A1040] hover:bg-lime-300'
                        : 'bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400'
                    }`}
                  >
                    {isSaving
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : isVisible
                        ? <Check className="w-3.5 h-3.5" />
                        : <X className="w-3.5 h-3.5" />}
                    {isVisible ? 'Visible' : 'Masqué'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="px-6 pb-5 text-xs text-gray-400 font-bold">
            💡 Les modifications sont appliquées immédiatement sans bouton Enregistrer.
          </p>
        </div>

        {/* FOND + BORDURE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<span className="text-lg">🎨</span>} title="Fond & bordure" sub="Couleur de fond et de la ligne du bas" />
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorRow label="Fond de la navbar" value={nav.bgColor}     onChange={v => setNav(p => ({ ...p, bgColor: v }))} />
              <ColorRow label="Bordure du bas"    value={nav.borderColor} onChange={v => setNav(p => ({ ...p, borderColor: v }))} />
            </div>
            <SaveBtn onClick={saveFond} saving={s1Saving} saved={s1Saved} label="Appliquer" shadow="#ffb5c8" />
          </div>
        </div>

        {/* POLICE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<span className="text-lg">🔤</span>} title="Police des liens" sub="Type d'écriture pour les onglets publics" />
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map(f => (
                <button key={f.value}
                  onClick={() => setNav(p => ({ ...p, linkFont: f.value }))}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    nav.linkFont === f.value
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-white text-[#1A1040] border-gray-300 hover:border-[#1A1040]'
                  }`}
                  style={f.style}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border-2 border-[#1A1040] p-3 bg-gray-50 text-center text-sm font-bold"
              style={{ fontFamily: FONT_OPTIONS.find(f => f.value === nav.linkFont)?.style.fontFamily || 'sans-serif' }}>
              Aperçu : Accueil · Nos Ateliers · Contact · Galerie · Boutique
            </div>
            <SaveBtn onClick={savePolice} saving={s2Saving} saved={s2Saved} label="Appliquer la police" shadow="#4dd9c0" />
          </div>
        </div>

        {/* ONGLET ACTIF */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #fb7185' }}>
          <SectionHeader icon={<span className="text-lg">✅</span>} title="Onglet actif" sub="Couleurs de l'onglet de la page en cours" />
          <div className="p-6 space-y-4">
            {/* Aperçu bouton actif */}
            <div className="flex justify-center">
              <span className="px-5 py-2 rounded-xl text-sm font-bold border-2 border-transparent"
                style={{ backgroundColor: nav.activeBg, color: nav.activeText,
                  fontFamily: FONT_OPTIONS.find(f => f.value === nav.linkFont)?.style.fontFamily }}>
                🏠 Accueil
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorRow label="Fond de l'onglet actif"  value={nav.activeBg}   onChange={v => setNav(p => ({ ...p, activeBg: v }))} />
              <ColorRow label="Texte de l'onglet actif" value={nav.activeText} onChange={v => setNav(p => ({ ...p, activeText: v }))} />
            </div>
            <SaveBtn onClick={saveActif} saving={s3Saving} saved={s3Saved} label="Appliquer" shadow="#fb7185" />
          </div>
        </div>

        {/* ONGLETS INACTIFS + HOVER */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<span className="text-lg">🖱️</span>} title="Onglets inactifs & survol" sub="Couleur du texte par défaut et fond au survol" />
          <div className="p-6 space-y-4">
            {/* Aperçu */}
            <div className="flex justify-center gap-3">
              <span className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ color: nav.inactiveText,
                  fontFamily: FONT_OPTIONS.find(f => f.value === nav.linkFont)?.style.fontFamily }}>
                🎨 Nos Ateliers
              </span>
              <span className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ backgroundColor: nav.hoverBg, color: nav.inactiveText,
                  fontFamily: FONT_OPTIONS.find(f => f.value === nav.linkFont)?.style.fontFamily }}>
                ✉️ Contact (hover)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorRow label="Couleur du texte (défaut)" value={nav.inactiveText} onChange={v => setNav(p => ({ ...p, inactiveText: v }))} />
              <ColorRow label="Fond au survol (hover)"    value={nav.hoverBg}      onChange={v => setNav(p => ({ ...p, hoverBg: v }))} />
            </div>
            <SaveBtn onClick={saveInactif} saving={s4Saving} saved={s4Saved} label="Appliquer" shadow="#c4b5fd" />
          </div>
        </div>

        {/* MENU MOBILE */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #fdba74' }}>
          <SectionHeader icon={<span className="text-lg">📱</span>} title="Menu mobile" sub="Couleur du fond du menu déroulant sur mobile" />
          <div className="p-6 space-y-4">
            {/* Aperçu */}
            <div className="rounded-xl border-2 border-[#1A1040] overflow-hidden">
              <div className="px-4 py-3 flex gap-2" style={{ backgroundColor: nav.mobileBg }}>
                <span className="px-3 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: nav.activeBg, color: nav.activeText }}>
                  🏠 Accueil
                </span>
                <span className="px-3 py-2 rounded-xl text-sm font-bold" style={{ color: nav.inactiveText }}>
                  🎨 Nos Ateliers
                </span>
              </div>
            </div>
            <ColorRow label="Fond du menu mobile" value={nav.mobileBg} onChange={v => setNav(p => ({ ...p, mobileBg: v }))} />
            <SaveBtn onClick={saveMobile} saving={s5Saving} saved={s5Saved} label="Appliquer" shadow="#fdba74" />
          </div>
        </div>

        {/* INTITULÉS DES LIENS */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #86efac' }}>
          <SectionHeader icon={<span className="text-lg">🏷️</span>} title="Intitulés des liens" sub="Texte affiché dans les 5 onglets publics" />
          <div className="p-6 space-y-4">
            {nav.labels.map((label, i) => (
              <div key={i}>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Lien {i + 1}</label>
                <input type="text" value={label}
                  onChange={e => setNav(p => {
                    const labels = [...p.labels]
                    labels[i] = e.target.value
                    return { ...p, labels }
                  })}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            ))}
            <SaveBtn onClick={saveLabels} saving={s6Saving} saved={s6Saved} label="Enregistrer les intitulés" shadow="#86efac" />
          </div>
        </div>

      </div>
    </main>
  )
}
