import { useState, useEffect, useRef } from 'react'
import {
  Home, Upload, Check, RefreshCw, Palette,
  Sparkles, Trash2, X, ImagePlus, Newspaper, Pencil, Type,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  type HeroBg, type BgType,
  DEFAULT_HERO_BG, buildHeroBgStyle,
} from '../lib/heroBg'
import HeroTitleEditor, {
  type HeroStyle, buildTitleStyle,
} from '../components/HeroTitleEditor'
import BgEditor from '../components/BgEditor'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BadgeConfig  { text: string; bg: string; textColor: string; radius: string }
interface BtnConfig    { bg: string; text: string; label: string; radius: string; bold: boolean; fontSize: number }
interface HeroCtaBtn   { label: string; bg: string; text: string; border: string; radius: string; bold: boolean; fontSize: number; font: string }

const DEFAULT_HERO_BTN1: HeroCtaBtn = { label: '🎨 Voir les ateliers', bg: '#ffffff', text: '#1A1040', border: '#1A1040', radius: 'rounded-2xl', bold: true, fontSize: 14, font: 'sans' }
const DEFAULT_HERO_BTN2: HeroCtaBtn = { label: '✉️ Nous contacter',    bg: '#ffffff', text: '#1A1040', border: '#1A1040', radius: 'rounded-2xl', bold: true, fontSize: 14, font: 'sans' }

const BTN_FONTS = [
  { value: 'sans',    label: 'Normale',   family: 'sans-serif' },
  { value: 'serif',   label: 'Serif',     family: 'serif' },
  { value: 'mono',    label: 'Mono',      family: 'monospace' },
  { value: 'cursive', label: 'Écriture',  family: 'cursive' },
]

const DEFAULT_ACTU_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}
const DEFAULT_APROPOS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}
const DEFAULT_APROPOS_PHOTO = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'

// ─── Section Valeurs ──────────────────────────────────────────────────────────
interface ValeurCard {
  id: string; icon: string; iconType: 'emoji' | 'image'; iconBg: string
  title: string; desc: string; cardRadius: string; cardBg: string; borderColor: string
  iconSize?: number; cardWidth?: number; dateDebut?: string; dateFin?: string
}
const RADIUS_TO_PX: Record<string, string> = {
  'rounded-none': '0', 'rounded-xl': '12px', 'rounded-2xl': '16px',
  'rounded-3xl': '24px', 'rounded-full': '9999px',
}
const CARD_RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Carré' },
  { value: 'rounded-xl',   label: 'Léger' },
  { value: 'rounded-2xl',  label: 'Arrondi' },
  { value: 'rounded-3xl',  label: 'Très arrondi' },
]
const EMOJI_PRESETS = [
  '🌈','✂️','🎉','🎨','🖌️','🧶','🪡','💎',
  '⭐','✨','💫','🏆','🎗️','🌺','🌸','🌼',
  '🦋','💝','🎀','🪴','🫶','👑','🔮','🪄',
  '🎵','🖼️','🧩','🎯','🎈','🌟','🎭','🍀',
  '🌙','☀️','🌻','🎪','🧸','🎲','💐','🫧',
]
const DEFAULT_VALEURS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CARD_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 18, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_CARD_DESC_STYLE: HeroStyle = {
  font: 'sans', fontSize: 14, color: '#4b5563', bold: false, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}
const DEFAULT_VALEURS_CARDS: ValeurCard[] = [
  { id: '1', icon: '🌈', iconType: 'emoji', iconBg: '#fb7185', title: 'Ambiance top moumoute',  desc: 'Zéro pression, 100% bonne humeur. On vient pour se faire plaisir, pas pour être parfait·e !', cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
  { id: '2', icon: '✂️', iconType: 'emoji', iconBg: '#4dd9c0', title: 'Créativité sans limites', desc: "Broderie, couture, peinture, collage… autant d'ateliers que d'envies. À toi de choisir !", cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
  { id: '3', icon: '🎉', iconType: 'emoji', iconBg: '#ffe500', title: 'Des rencontres en or',   desc: 'Les meilleurs souvenirs se créent souvent autour d\'une table et de plein de matières colorées.', cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040' },
]
const DEFAULT_APROPOS_BODY_STYLE: HeroStyle = {
  font: 'sans', fontSize: 16, color: '#374151',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: false, italic: false, underline: false,
}
const DEFAULT_AVIS_TITLE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 30, color: '#ffffff',
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false,  shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
  bold: true, italic: false, underline: false,
}
const DEFAULT_BADGE: BadgeConfig = { text: '🗞️ Actu du moment', bg: '#ffe500', textColor: '#1A1040', radius: 'rounded-full' }
const DEFAULT_BTN: BtnConfig     = { bg: '#1A1040', text: '#ffe500', label: '✏️ Modifier', radius: 'rounded-lg', bold: true, fontSize: 10 }

const RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'Carré' },
  { value: 'rounded-md',   label: 'Légèrement' },
  { value: 'rounded-xl',   label: 'Arrondi' },
  { value: 'rounded-2xl',  label: 'Très arrondi' },
  { value: 'rounded-full', label: 'Pilule' },
]



// ─── Composant principal ──────────────────────────────────────────────────────
export default function AccueilAdmin() {
  const { logoUrl } = useSiteSettings()

  // ── Logo ─────────────────────────────────────────────────────────────────
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoSaved,     setLogoSaved]     = useState(false)
  const [logoError,     setLogoError]     = useState('')
  const [logoVisible,   setLogoVisible]   = useState(true)
  const [logoVisSaving, setLogoVisSaving] = useState(false)
  const logoFileRef = useRef<HTMLInputElement>(null)

  // ── Hero fond ─────────────────────────────────────────────────────────────
  const [heroBg,       setHeroBg]       = useState<HeroBg>(DEFAULT_HERO_BG)
  const [heroBgTab,    setHeroBgTab]    = useState<BgType>('color')
  const [heroBgSaving, setHeroBgSaving] = useState(false)
  const [heroBgSaved,  setHeroBgSaved]  = useState(false)
  const heroFileRef = useRef<HTMLInputElement>(null)
  const [heroUploadError, setHeroUploadError] = useState('')
  const [heroUploading,   setHeroUploading]   = useState(false)

  // ── Section Actu ─────────────────────────────────────────────────────────
  const [actuBg,       setActuBg]       = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#ffffff' })
  const [actuBgTab,    setActuBgTab]    = useState<BgType>('color')
  const [actuBgSaving, setActuBgSaving] = useState(false)
  const [actuBgSaved,  setActuBgSaved]  = useState(false)
  const actuFileRef = useRef<HTMLInputElement>(null)
  const [actuUploadError, setActuUploadError] = useState('')
  const [actuUploading,   setActuUploading]   = useState(false)

  // Titre de section actu
  const [actuTitleText,  setActuTitleText]  = useState('Les dernières nouvelles ✦')
  const [actuTitleStyle, setActuTitleStyle] = useState<HeroStyle>(DEFAULT_ACTU_TITLE_STYLE)
  const [showActuTitle,  setShowActuTitle]  = useState(false)

  // Badge & bouton actu
  const [actuBadge,      setActuBadge]      = useState<BadgeConfig>(DEFAULT_BADGE)
  const [actuBtn,        setActuBtn]        = useState<BtnConfig>(DEFAULT_BTN)
  const [widgetSaving,   setWidgetSaving]   = useState(false)
  const [widgetSaved,    setWidgetSaved]    = useState(false)

  // Boutons CTA du Hero
  const [heroBtn1,       setHeroBtn1]       = useState<HeroCtaBtn>(DEFAULT_HERO_BTN1)
  const [heroBtn2,       setHeroBtn2]       = useState<HeroCtaBtn>(DEFAULT_HERO_BTN2)
  const [heroBtnSaving,  setHeroBtnSaving]  = useState(false)
  const [heroBtnSaved,   setHeroBtnSaved]   = useState(false)

  // ── Section Valeurs ──────────────────────────────────────────────────────
  const [valeursBg,            setValeursBg]            = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#fff5fb' })
  const [valeursBgTab,         setValeursBgTab]         = useState<BgType>('color')
  const [valeursBgSaving,      setValeursBgSaving]      = useState(false)
  const [valeursBgSaved,       setValeursBgSaved]       = useState(false)
  const valeursBgFileRef = useRef<HTMLInputElement>(null)
  const [valeursBgUploadError, setValeursBgUploadError] = useState('')
  const [valeursBgUploading,   setValeursBgUploading]   = useState(false)

  const [valeursTitleText,     setValeursTitleText]     = useState('Pourquoi nous rejoindre ?')
  const [valeursTitleStyle,    setValeursTitleStyle]    = useState<HeroStyle>(DEFAULT_VALEURS_TITLE_STYLE)
  const [showValeursTitle,     setShowValeursTitle]     = useState(false)
  const [showCardTitleStyle,   setShowCardTitleStyle]   = useState(false)
  const [showCardDescStyle,    setShowCardDescStyle]    = useState(false)
  const [cardTitleStyle,       setCardTitleStyle]       = useState<HeroStyle>(DEFAULT_CARD_TITLE_STYLE)
  const [cardDescStyle,        setCardDescStyle]        = useState<HeroStyle>(DEFAULT_CARD_DESC_STYLE)

  const [valeursCards,         setValeursCards]         = useState<ValeurCard[]>(DEFAULT_VALEURS_CARDS)
  const [selectedCardId,       setSelectedCardId]       = useState<string | null>(null)
  const [cardsSaving,          setCardsSaving]          = useState(false)
  const [cardsSaved,           setCardsSaved]           = useState(false)
  const cardIconImgRef = useRef<HTMLInputElement>(null)
  const [cardIconUploading,    setCardIconUploading]    = useState(false)

  // ── Section À Propos ──────────────────────────────────────────────────────
  const [aproposBg,       setAproposBg]       = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#ffffff' })
  const [aproposBgTab,    setAproposBgTab]    = useState<BgType>('color')
  const [aproposBgSaving, setAproposBgSaving] = useState(false)
  const [aproposBgSaved,  setAproposBgSaved]  = useState(false)
  const aproposBgFileRef = useRef<HTMLInputElement>(null)
  const [aproposBgUploadError, setAproposBgUploadError] = useState('')
  const [aproposBgUploading,   setAproposBgUploading]   = useState(false)

  const [aproposPhoto,          setAproposPhoto]          = useState(DEFAULT_APROPOS_PHOTO)
  const aproposPhotoRef = useRef<HTMLInputElement>(null)
  const [aproposPhotoUploading, setAproposPhotoUploading] = useState(false)
  const [aproposPhotoError,     setAproposPhotoError]     = useState('')
  const [aproposPhotoSaved,     setAproposPhotoSaved]     = useState(false)
  const [aproposPhotoSize,      setAproposPhotoSize]      = useState(288)
  const [aproposPhotoRotation,  setAproposPhotoRotation]  = useState(0)
  const [aproposPhotoVisible,   setAproposPhotoVisible]   = useState(true)

  const [aproposTitleText,  setAproposTitleText]  = useState('Une passion, plein de couleurs !')
  const [aproposTitleStyle, setAproposTitleStyle] = useState<HeroStyle>(DEFAULT_APROPOS_TITLE_STYLE)
  const [showAproposTitle,  setShowAproposTitle]  = useState(false)

  const [aproposBodyText,   setAproposBodyText]   = useState('')
  const [aproposBodyStyle,  setAproposBodyStyle]  = useState<HeroStyle>(DEFAULT_APROPOS_BODY_STYLE)
  const [showAproposBody,   setShowAproposBody]   = useState(false)

  // ── Section Avis Clients ─────────────────────────────────────────────────
  const [avisBg,       setAvisBg]       = useState<HeroBg>({ ...DEFAULT_HERO_BG, color: '#1A1040' })
  const [avisBgTab,    setAvisBgTab]    = useState<BgType>('color')
  const [avisBgSaving, setAvisBgSaving] = useState(false)
  const [avisBgSaved,  setAvisBgSaved]  = useState(false)
  const avisBgFileRef = useRef<HTMLInputElement>(null)
  const [avisBgUploadError, setAvisBgUploadError] = useState('')
  const [avisBgUploading,   setAvisBgUploading]   = useState(false)

  const [avisTitleText,  setAvisTitleText]  = useState('Avis clients ✦')
  const [avisTitleStyle, setAvisTitleStyle] = useState<HeroStyle>(DEFAULT_AVIS_TITLE_STYLE)
  const [showAvisTitle,  setShowAvisTitle]  = useState(false)

  // ── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: settings }, { data: content }] = await Promise.all([
        supabase.from('settings').select('key, value').in('key', [
          'hero_bg_config', 'actu_bg_config',
          'actu_section_titre_style', 'actu_badge_config', 'actu_btn_config',
          'hero_btn1_config', 'hero_btn2_config',
          'valeurs_bg_config', 'valeurs_titre_style', 'valeurs_carte_titre_style', 'valeurs_carte_desc_style', 'valeurs_cards',
          'apropos_bg_config', 'apropos_photo_url', 'apropos_photo_size', 'apropos_photo_rotation', 'apropos_photo_visible', 'apropos_titre_style', 'apropos_texte_style',
          'avis_bg_config', 'avis_titre_style', 'hero_logo_visible',
        ]),
        supabase.from('page_content').select('section, contenu')
          .eq('page', 'accueil').in('section', ['actu_section_titre', 'valeurs_titre', 'apropos_titre', 'apropos_texte', 'avis_titre']),
      ])
      ;(content || []).forEach((c: { section: string; contenu: string }) => {
        if (c.section === 'actu_section_titre') setActuTitleText(c.contenu)
        if (c.section === 'valeurs_titre')      setValeursTitleText(c.contenu)
        if (c.section === 'apropos_titre')      setAproposTitleText(c.contenu)
        if (c.section === 'apropos_texte')      setAproposBodyText(c.contenu)
        if (c.section === 'avis_titre')         setAvisTitleText(c.contenu)
      })
      ;(settings || []).forEach((s: { key: string; value: string }) => {
        try {
          const v = JSON.parse(s.value)
          if (s.key === 'hero_bg_config')           { setHeroBg(p => ({ ...p, ...v })); setHeroBgTab(v.type || 'color') }
          if (s.key === 'actu_bg_config')           { setActuBg(p => ({ ...p, ...v })); setActuBgTab(v.type || 'color') }
          if (s.key === 'actu_section_titre_style') setActuTitleStyle(p => ({ ...p, ...v }))
          if (s.key === 'actu_badge_config')        setActuBadge(p => ({ ...p, ...v }))
          if (s.key === 'actu_btn_config')          setActuBtn(p => ({ ...p, ...v }))
          if (s.key === 'hero_btn1_config')         setHeroBtn1(p => ({ ...p, ...v }))
          if (s.key === 'hero_btn2_config')         setHeroBtn2(p => ({ ...p, ...v }))
          if (s.key === 'valeurs_bg_config')          { setValeursBg(p => ({ ...p, ...v })); setValeursBgTab(v.type || 'color') }
          if (s.key === 'valeurs_titre_style')        setValeursTitleStyle(p => ({ ...p, ...v }))
          if (s.key === 'valeurs_carte_titre_style')  setCardTitleStyle(p => ({ ...p, ...v }))
          if (s.key === 'valeurs_carte_desc_style')   setCardDescStyle(p => ({ ...p, ...v }))
          if (s.key === 'apropos_bg_config')          { setAproposBg(p => ({ ...p, ...v })); setAproposBgTab(v.type || 'color') }
          if (s.key === 'apropos_titre_style')      setAproposTitleStyle(p => ({ ...p, ...v }))
          if (s.key === 'apropos_texte_style')      setAproposBodyStyle(p => ({ ...p, ...v }))
          if (s.key === 'avis_bg_config')           { setAvisBg(p => ({ ...p, ...v })); setAvisBgTab(v.type || 'color') }
          if (s.key === 'avis_titre_style')         setAvisTitleStyle(p => ({ ...p, ...v }))
          if (s.key === 'hero_logo_visible')        setLogoVisible(v !== false)
          if (s.key === 'apropos_photo_size')       setAproposPhotoSize(parseInt(s.value) || 288)
          if (s.key === 'apropos_photo_rotation')   setAproposPhotoRotation(parseFloat(s.value) || 0)
          if (s.key === 'apropos_photo_visible')    setAproposPhotoVisible(s.value !== 'false')
        } catch {}
        if (s.key === 'valeurs_cards' && s.value)      { try { setValeursCards(JSON.parse(s.value)) } catch {} }
        if (s.key === 'apropos_photo_url' && s.value)  setAproposPhoto(s.value)
      })
    }
    load()
  }, [])

  // ── Upload logo ──────────────────────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    setLogoUploading(true); setLogoError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const { error } = await supabase.storage.from('hero').upload(`site-logo.${ext}`, file, { upsert: true, contentType: file.type })
    if (error) { setLogoError('Erreur : ' + error.message); setLogoUploading(false); return }
    const { data: urlData } = supabase.storage.from('hero').getPublicUrl(`site-logo.${ext}`)
    await supabase.from('settings').upsert({ key: 'site_logo_url', value: urlData.publicUrl + '?t=' + Date.now() }, { onConflict: 'key' })
    setLogoUploading(false); setLogoSaved(true); setTimeout(() => setLogoSaved(false), 3000)
  }

  // ── Sauvegardes ──────────────────────────────────────────────────────────
  async function saveLogoVisibility(visible: boolean) {
    setLogoVisSaving(true)
    await supabase.from('settings').upsert({ key: 'hero_logo_visible', value: JSON.stringify(visible) }, { onConflict: 'key' })
    setLogoVisSaving(false)
  }

  async function saveHeroBg() {
    setHeroBgSaving(true)
    const final = { ...heroBg, type: heroBgTab }
    await supabase.from('settings').upsert({ key: 'hero_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setHeroBg(final); setHeroBgSaving(false); setHeroBgSaved(true); setTimeout(() => setHeroBgSaved(false), 3000)
  }

  async function saveActuBg() {
    setActuBgSaving(true)
    const final = { ...actuBg, type: actuBgTab }
    await supabase.from('settings').upsert({ key: 'actu_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setActuBg(final); setActuBgSaving(false); setActuBgSaved(true); setTimeout(() => setActuBgSaved(false), 3000)
  }

  async function saveWidgets() {
    setWidgetSaving(true)
    await Promise.all([
      supabase.from('settings').upsert({ key: 'actu_badge_config', value: JSON.stringify(actuBadge) }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'actu_btn_config',   value: JSON.stringify(actuBtn)   }, { onConflict: 'key' }),
    ])
    setWidgetSaving(false); setWidgetSaved(true); setTimeout(() => setWidgetSaved(false), 3000)
  }

  async function saveValeursBg() {
    setValeursBgSaving(true)
    const final = { ...valeursBg, type: valeursBgTab }
    await supabase.from('settings').upsert({ key: 'valeurs_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setValeursBg(final); setValeursBgSaving(false); setValeursBgSaved(true); setTimeout(() => setValeursBgSaved(false), 3000)
  }

  async function saveValeursCards() {
    setCardsSaving(true)
    await supabase.from('settings').upsert({ key: 'valeurs_cards', value: JSON.stringify(valeursCards) }, { onConflict: 'key' })
    setCardsSaving(false); setCardsSaved(true); setTimeout(() => setCardsSaved(false), 3000)
  }

  async function uploadCardIcon(file: File, cardId: string) {
    setCardIconUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `valeurs-icon-${cardId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setCardIconUploading(false); return }
    const { data: urlData } = supabase.storage.from('hero').getPublicUrl(filename)
    setValeursCards(prev => prev.map(c => c.id === cardId ? { ...c, icon: urlData.publicUrl + '?t=' + Date.now(), iconType: 'image' } : c))
    setCardIconUploading(false)
  }

  function updateCard(id: string, patch: Partial<ValeurCard>) {
    setValeursCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function addCard() {
    const newId = Date.now().toString()
    setValeursCards(prev => [...prev, { id: newId, icon: '⭐', iconType: 'emoji', iconBg: '#c4b5fd', title: 'Nouvelle carte', desc: 'Description de la carte', cardRadius: 'rounded-2xl', cardBg: '#ffffff', borderColor: '#1A1040', iconSize: 64, cardWidth: 260, dateDebut: '', dateFin: '' }])
    setSelectedCardId(newId)
  }

  function removeCard(id: string) {
    setValeursCards(prev => prev.filter(c => c.id !== id))
    if (selectedCardId === id) setSelectedCardId(null)
  }

  function moveCard(id: string, dir: -1 | 1) {
    setValeursCards(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]; [arr[idx], arr[next]] = [arr[next], arr[idx]]; return arr
    })
  }

  async function saveAproposBg() {
    setAproposBgSaving(true)
    const final = { ...aproposBg, type: aproposBgTab }
    await supabase.from('settings').upsert({ key: 'apropos_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setAproposBg(final); setAproposBgSaving(false); setAproposBgSaved(true); setTimeout(() => setAproposBgSaved(false), 3000)
  }

  async function saveAproposPhoto(file: File) {
    setAproposPhotoUploading(true); setAproposPhotoError('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `apropos-photo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(filename, file, { upsert: true, contentType: file.type })
    if (error) { setAproposPhotoError('Erreur : ' + error.message); setAproposPhotoUploading(false); return }
    const { data: urlData } = supabase.storage.from('hero').getPublicUrl(filename)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('settings').upsert({ key: 'apropos_photo_url', value: url }, { onConflict: 'key' })
    setAproposPhoto(url); setAproposPhotoUploading(false); setAproposPhotoSaved(true); setTimeout(() => setAproposPhotoSaved(false), 3000)
  }

  async function changeAproposPhotoSize(size: number) {
    setAproposPhotoSize(size)
    await supabase.from('settings').upsert({ key: 'apropos_photo_size', value: String(size) }, { onConflict: 'key' })
  }

  async function changeAproposPhotoRotation(deg: number) {
    setAproposPhotoRotation(deg)
    await supabase.from('settings').upsert({ key: 'apropos_photo_rotation', value: String(deg) }, { onConflict: 'key' })
  }

  async function toggleAproposPhotoVisible() {
    const next = !aproposPhotoVisible
    setAproposPhotoVisible(next)
    await supabase.from('settings').upsert({ key: 'apropos_photo_visible', value: String(next) }, { onConflict: 'key' })
  }

  async function saveAvisBg() {
    setAvisBgSaving(true)
    const final = { ...avisBg, type: avisBgTab }
    await supabase.from('settings').upsert({ key: 'avis_bg_config', value: JSON.stringify(final) }, { onConflict: 'key' })
    setAvisBg(final); setAvisBgSaving(false); setAvisBgSaved(true); setTimeout(() => setAvisBgSaved(false), 3000)
  }

  async function saveHeroBtns() {
    setHeroBtnSaving(true)
    await Promise.all([
      supabase.from('settings').upsert({ key: 'hero_btn1_config', value: JSON.stringify(heroBtn1) }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'hero_btn2_config', value: JSON.stringify(heroBtn2) }, { onConflict: 'key' }),
    ])
    setHeroBtnSaving(false); setHeroBtnSaved(true); setTimeout(() => setHeroBtnSaved(false), 3000)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const heroBgPreview = buildHeroBgStyle({ ...heroBg, type: heroBgTab })
  const actuBgPreview = buildHeroBgStyle({ ...actuBg, type: actuBgTab })

  // ─── Section card header ─────────────────────────────────────────────────
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

  return (
    <main className="flex-1 bg-candy">

      {/* ── PAGE HEADER ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-400 rounded-2xl flex items-center justify-center border-2 border-rose-300"
            style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
            <Home className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
              🔐 Espace administrateur
            </div>
            <h1 className="font-serif text-3xl font-black text-white">Page d'accueil <span className="text-citron-400">✦</span></h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ════════════════════════════════════════
            LOGO
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<ImagePlus className="w-5 h-5 text-[#1A1040]" />} title="Logo du site" sub="Mis à jour partout en temps réel" />
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center shrink-0 w-44 h-28" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
              <img src={logoUrl} alt="Logo" className="max-h-20 max-w-full object-contain" key={logoUrl} />
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="logo-upload"
                className={`flex items-center gap-4 w-full border-4 border-dashed rounded-2xl px-5 py-4 cursor-pointer transition-all ${logoUploading ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-[#1A1040] bg-candy hover:bg-rose-50 hover:border-rose-400'}`}>
                {logoUploading
                  ? <><RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /><span className="font-black text-gray-400 text-sm">Téléchargement…</span></>
                  : <><div className="w-10 h-10 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0"><Upload className="w-4 h-4 text-white" /></div>
                    <div><p className="font-black text-[#1A1040] text-sm">Cliquer pour changer le logo</p><p className="text-gray-400 text-xs">PNG, JPG, SVG — fond transparent recommandé</p></div></>}
              </label>
              <input ref={logoFileRef} id="logo-upload" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }} />
              {logoError && <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1"><X className="w-3 h-3" />{logoError}</p>}
              {logoSaved && <p className="mt-2 text-xs text-lime-700 font-black flex items-center gap-1"><Check className="w-3 h-3" />Logo mis à jour partout !</p>}

              {/* Toggle visibilité */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Affichage sur le site :</span>
                <button
                  disabled={logoVisSaving}
                  onClick={() => { const next = !logoVisible; setLogoVisible(next); saveLogoVisibility(next) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xs transition-all disabled:opacity-50 ${logoVisible ? 'bg-lime-400 border-[#1A1040] text-[#1A1040]' : 'bg-gray-200 border-gray-400 text-gray-500'}`}
                  style={logoVisible ? { boxShadow: '2px 2px 0px 0px #1A1040' } : {}}>
                  {logoVisSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : logoVisible ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {logoVisible ? 'Visible' : 'Masqué'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            HERO — APERÇU + FOND
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
          <SectionHeader icon={<Home className="w-5 h-5 text-[#1A1040]" />} title="Hero — Fond" sub="Bannière principale de la page d'accueil" />

          {/* Aperçu */}
          <div className="relative h-44 flex items-center justify-center overflow-hidden transition-all duration-500 mx-6 mt-6 rounded-2xl border-2 border-[#1A1040]" style={heroBgPreview}>
            <div className="relative z-10 text-center drop-shadow-md">
              <p className="font-serif text-2xl font-black text-white">Crée, explore & éclate-toi !</p>
              <p className="text-white/80 text-xs mt-1">Des ateliers créatifs hauts en couleur…</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <BgEditor
              bg={heroBg} setBg={setHeroBg}
              activeTab={heroBgTab} setActiveTab={setHeroBgTab}
              fileRef={heroFileRef}
              uploadError={heroUploadError} setUploadError={setHeroUploadError}
              uploading={heroUploading} setUploading={setHeroUploading}
            />
            <div className="flex items-center gap-3">
              <button onClick={saveHeroBg} disabled={heroBgSaving || (heroBgTab === 'image' && !heroBg.image)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
                {heroBgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : heroBgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer au hero</>}
              </button>
              {heroBgSaved && <span className="text-sm font-black text-lime-600">✅ Hero mis à jour !</span>}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            HERO — BOUTONS CTA
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<Type className="w-5 h-5 text-[#1A1040]" />} title="Hero — Boutons d'appel à l'action" sub="Style des boutons principaux du hero" />

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ── Bouton 1 ── */}
            {([
              { btn: heroBtn1, setBtn: setHeroBtn1, defaultLabel: DEFAULT_HERO_BTN1.label, num: 1 },
              { btn: heroBtn2, setBtn: setHeroBtn2, defaultLabel: DEFAULT_HERO_BTN2.label, num: 2 },
            ] as const).map(({ btn, setBtn, num }) => (
              <div key={num} className="space-y-4">
                <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Bouton {num}</p>

                {/* Aperçu */}
                <div className="flex justify-center">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 border-2 shadow-[3px_3px_0px_0px_#1A1040] ${btn.radius}`}
                    style={{ backgroundColor: btn.bg, color: btn.text, borderColor: btn.border, fontSize: `${btn.fontSize}px`, fontWeight: btn.bold ? 'bold' : 'normal', fontFamily: BTN_FONTS.find(f => f.value === btn.font)?.family || 'sans-serif' }}>
                    {btn.label}
                  </div>
                </div>

                {/* Texte */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                  <input type="text" value={btn.label} onChange={e => setBtn(p => ({ ...p, label: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>

                {/* Couleurs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Fond',    key: 'bg'     as const },
                    { label: 'Texte',   key: 'text'   as const },
                    { label: 'Bordure', key: 'border' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={btn[key]} onChange={e => setBtn(p => ({ ...p, [key]: e.target.value }))} className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5 shrink-0" />
                        <input type="text" value={btn[key]} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBtn(p => ({ ...p, [key]: e.target.value })) }}
                          className="flex-1 min-w-0 border-2 border-[#1A1040] rounded-lg px-1.5 py-1.5 text-[10px] font-mono focus:outline-none" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Police */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Police</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BTN_FONTS.map(f => (
                      <button key={f.value} onClick={() => setBtn(p => ({ ...p, font: f.value }))}
                        className={`px-3 py-1 rounded-lg border-2 text-xs font-black transition-all ${btn.font === f.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}
                        style={{ fontFamily: f.family }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forme */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RADIUS_OPTIONS.map(r => (
                      <button key={r.value} onClick={() => setBtn(p => ({ ...p, radius: r.value }))}
                        className={`px-2.5 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${btn.radius === r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Taille + Gras */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Taille ({btn.fontSize}px)</label>
                    <input type="range" min={10} max={22} value={btn.fontSize} onChange={e => setBtn(p => ({ ...p, fontSize: Number(e.target.value) }))} className="w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Gras</label>
                    <button onClick={() => setBtn(p => ({ ...p, bold: !p.bold }))}
                      className={`px-4 py-2 rounded-xl border-2 font-black text-sm transition-all ${btn.bold ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500'}`}>
                      G
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save */}
          <div className="px-6 pb-6 flex items-center gap-3">
            <button onClick={saveHeroBtns} disabled={heroBtnSaving}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
              style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
              {heroBtnSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : heroBtnSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer les boutons</>}
            </button>
            {heroBtnSaved && <span className="text-sm font-black text-lime-600">✅ Boutons mis à jour !</span>}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION VALEURS
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<Sparkles className="w-5 h-5 text-[#1A1040]" />} title="Section Valeurs" sub="Fond, titre, style et cartes de la section" />

          <div className="p-6 space-y-8">

            {/* ── Fond ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Fond de la section</p>
              <div className="relative h-16 flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[#1A1040]"
                style={buildHeroBgStyle({ ...valeursBg, type: valeursBgTab })}>
                <p className="font-serif font-black text-base" style={{ color: valeursTitleStyle.color }}>Pourquoi nous rejoindre ?</p>
              </div>
              <BgEditor bg={valeursBg} setBg={setValeursBg} activeTab={valeursBgTab} setActiveTab={setValeursBgTab}
                fileRef={valeursBgFileRef} uploadError={valeursBgUploadError} setUploadError={setValeursBgUploadError}
                uploading={valeursBgUploading} setUploading={setValeursBgUploading} />
              <div className="flex items-center gap-3">
                <button onClick={saveValeursBg} disabled={valeursBgSaving}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
                  {valeursBgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : valeursBgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer le fond</>}
                </button>
                {valeursBgSaved && <span className="text-sm font-black text-lime-600">✅ Fond mis à jour !</span>}
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Titre ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Titre de section</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 bg-candy rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[60px]" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                  <div style={buildTitleStyle(valeursTitleStyle)} dangerouslySetInnerHTML={{ __html: valeursTitleText }} className="text-center leading-tight" />
                </div>
                <button onClick={() => setShowValeursTitle(true)}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
                  style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
                  <Pencil className="w-4 h-4" /> Modifier le titre
                </button>
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Styles globaux ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Style des titres de cartes</p>
                <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-3 flex items-center justify-center min-h-[48px]">
                  <div style={buildTitleStyle(cardTitleStyle)} className="text-center">Titre de carte</div>
                </div>
                <button onClick={() => setShowCardTitleStyle(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-2.5 rounded-xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all text-xs">
                  <Type className="w-3.5 h-3.5" /> Modifier le style
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Style des textes de cartes</p>
                <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-3 flex items-center justify-center min-h-[48px]">
                  <div style={buildTitleStyle(cardDescStyle)} className="text-center">Texte de description</div>
                </div>
                <button onClick={() => setShowCardDescStyle(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-2.5 rounded-xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all text-xs">
                  <Type className="w-3.5 h-3.5" /> Modifier le style
                </button>
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Cartes ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Cartes ({valeursCards.length}/6)</p>
                {valeursCards.length < 6 && (
                  <button onClick={addCard}
                    className="flex items-center gap-1.5 bg-citron-400 text-[#1A1040] px-4 py-2 rounded-xl font-black text-xs border-2 border-[#1A1040] hover:bg-yellow-300 transition-all"
                    style={{ boxShadow: '2px 2px 0px 0px #1A1040' }}>
                    + Ajouter une carte
                  </button>
                )}
              </div>

              {/* Liste des cartes */}
              <div className="space-y-3">
                {valeursCards.map((card, idx) => (
                  <div key={card.id} className="border-2 border-[#1A1040] rounded-2xl overflow-hidden">

                    {/* En-tête de carte */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}>
                      {/* Aperçu icône */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0 text-xl"
                        style={{ backgroundColor: card.iconBg }}>
                        {card.iconType === 'image'
                          ? <img src={card.icon} className="w-7 h-7 object-contain rounded-lg" />
                          : card.icon}
                      </div>
                      {/* Titre */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#1A1040] text-sm truncate">{card.title}</p>
                        <p className="text-gray-400 text-xs truncate">{card.desc}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveCard(card.id, -1)} disabled={idx === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-30">↑</button>
                        <button onClick={() => moveCard(card.id, 1)} disabled={idx === valeursCards.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-30">↓</button>
                        <button onClick={() => removeCard(card.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-300 text-red-500 text-xs hover:bg-red-50">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Éditeur de carte (accordéon) */}
                    {selectedCardId === card.id && (
                      <div className="p-4 border-t-2 border-[#1A1040] bg-white space-y-4">

                        {/* Icône */}
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-2 block">Icône</label>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {EMOJI_PRESETS.map(e => (
                              <button key={e} onClick={() => updateCard(card.id, { icon: e, iconType: 'emoji' })}
                                className={`w-9 h-9 rounded-xl border-2 text-xl flex items-center justify-center transition-all ${card.icon === e && card.iconType === 'emoji' ? 'border-[#1A1040] bg-candy scale-110' : 'border-transparent hover:border-gray-300'}`}>
                                {e}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 border-2 border-dashed border-[#1A1040] rounded-xl px-3 py-2 cursor-pointer hover:bg-candy text-xs font-black"
                              onClick={() => !cardIconUploading && cardIconImgRef.current?.click()}>
                              {cardIconUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              {cardIconUploading ? 'Upload…' : 'Photo custom'}
                            </label>
                            <input ref={cardIconImgRef} type="file" accept="image/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCardIcon(f, card.id); e.target.value = '' }} />
                            {card.iconType === 'image' && (
                              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#1A1040]">
                                <img src={card.icon} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 font-bold">Fond icône</span>
                              <input type="color" value={card.iconBg} onChange={e => updateCard(card.id, { iconBg: e.target.value })}
                                className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Titre de carte */}
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Titre</label>
                          <input type="text" value={card.title} onChange={e => updateCard(card.id, { title: e.target.value })}
                            className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
                          <textarea value={card.desc} onChange={e => updateCard(card.id, { desc: e.target.value })} rows={3}
                            className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
                        </div>

                        {/* Tailles */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">📐 Taille icône/photo</label>
                              <span className="text-xs font-black text-[#1A1040]">{card.iconSize ?? 64}px</span>
                            </div>
                            <input type="range" min={32} max={120} step={4} value={card.iconSize ?? 64}
                              onChange={e => updateCard(card.id, { iconSize: parseInt(e.target.value) })}
                              className="w-full accent-rose-400" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">📏 Taille de la carte</label>
                              <span className="text-xs font-black text-[#1A1040]">{card.cardWidth ?? 260}px</span>
                            </div>
                            <input type="range" min={160} max={420} step={10} value={card.cardWidth ?? 260}
                              onChange={e => updateCard(card.id, { cardWidth: parseInt(e.target.value) })}
                              className="w-full accent-turquoise-500" />
                          </div>
                        </div>

                        {/* Période de publication */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                          <label className="text-[10px] font-black text-blue-700 uppercase tracking-wide mb-2 block">📅 Période de publication (optionnel)</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-blue-500 uppercase mb-1 block">Du</label>
                              <input type="date" value={card.dateDebut ?? ''} onChange={e => updateCard(card.id, { dateDebut: e.target.value })}
                                className="w-full border-2 border-blue-300 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-900 bg-white focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-blue-500 uppercase mb-1 block">Au</label>
                              <input type="date" value={card.dateFin ?? ''} onChange={e => updateCard(card.id, { dateFin: e.target.value })}
                                className="w-full border-2 border-blue-300 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-900 bg-white focus:outline-none" />
                            </div>
                          </div>
                          <p className="text-[10px] text-blue-500 mt-1.5">Laisse vide pour une carte toujours visible.</p>
                        </div>

                        {/* Forme + couleurs */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
                            <div className="flex flex-wrap gap-1.5">
                              {CARD_RADIUS_OPTIONS.map(r => (
                                <button key={r.value} onClick={() => updateCard(card.id, { cardRadius: r.value })}
                                  className={`px-2 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${card.cardRadius === r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600'}`}>
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fond carte</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={card.cardBg} onChange={e => updateCard(card.id, { cardBg: e.target.value })} className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                                <input type="text" value={card.cardBg} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateCard(card.id, { cardBg: e.target.value }) }}
                                  className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-[10px] font-mono focus:outline-none" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Bordure</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={card.borderColor} onChange={e => updateCard(card.id, { borderColor: e.target.value })} className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                                <input type="text" value={card.borderColor} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateCard(card.id, { borderColor: e.target.value }) }}
                                  className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-[10px] font-mono focus:outline-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Aperçu carte */}
                        <div className="flex justify-center">
                          <div className="p-4 text-center border-2 w-44"
                            style={{ backgroundColor: card.cardBg, borderColor: card.borderColor, borderRadius: RADIUS_TO_PX[card.cardRadius] || '16px', boxShadow: '3px 3px 0px 0px #1A1040' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 border-2 border-[#1A1040] text-xl" style={{ backgroundColor: card.iconBg }}>
                              {card.iconType === 'image' ? <img src={card.icon} className="w-8 h-8 object-contain" /> : card.icon}
                            </div>
                            <div className="font-bold text-xs text-[#1A1040] mb-1 truncate">{card.title}</div>
                            <div className="text-[10px] text-gray-500 line-clamp-2">{card.desc}</div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bouton sauvegarder cartes */}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={saveValeursCards} disabled={cardsSaving}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
                  {cardsSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : cardsSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Sauvegarder les cartes</>}
                </button>
                {cardsSaved && <span className="text-sm font-black text-lime-600">✅ Cartes mises à jour !</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION À PROPOS
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #86efac' }}>
          <SectionHeader icon={<Palette className="w-5 h-5 text-[#1A1040]" />} title="Section À Propos" sub="Fond, photo, titre et texte de la section À Propos" />

          <div className="p-6 space-y-8">

            {/* ── Fond ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Fond de la section</p>
              {/* Aperçu */}
              <div className="relative h-20 flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[#1A1040]"
                style={buildHeroBgStyle({ ...aproposBg, type: aproposBgTab })}>
                <p className="font-serif font-black text-lg" style={{ color: aproposTitleStyle.color }}>À propos</p>
              </div>
              <BgEditor
                bg={aproposBg} setBg={setAproposBg}
                activeTab={aproposBgTab} setActiveTab={setAproposBgTab}
                fileRef={aproposBgFileRef}
                uploadError={aproposBgUploadError} setUploadError={setAproposBgUploadError}
                uploading={aproposBgUploading} setUploading={setAproposBgUploading}
              />
              <div className="flex items-center gap-3">
                <button onClick={saveAproposBg} disabled={aproposBgSaving}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #86efac' }}>
                  {aproposBgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : aproposBgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer le fond</>}
                </button>
                {aproposBgSaved && <span className="text-sm font-black text-lime-600">✅ Fond mis à jour !</span>}
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Photo polaroïd ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Photo polaroïd</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Aperçu */}
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-[#1A1040] shadow-pop shrink-0">
                  <img src={aproposPhoto} alt="À propos" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label
                    className={`flex items-center gap-3 border-4 border-dashed rounded-2xl px-4 py-3 cursor-pointer transition-all ${aproposPhotoUploading ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-[#1A1040] bg-candy hover:bg-rose-50'}`}
                    onClick={() => !aproposPhotoUploading && aproposPhotoRef.current?.click()}>
                    {aproposPhotoUploading
                      ? <><RefreshCw className="w-5 h-5 text-gray-400 animate-spin" /><span className="font-black text-gray-400 text-sm">Téléchargement…</span></>
                      : <><div className="w-9 h-9 bg-rose-400 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0"><Upload className="w-4 h-4 text-white" /></div><div><p className="font-black text-[#1A1040] text-sm">Changer la photo</p><p className="text-gray-400 text-xs">JPG, PNG, WebP — recommandé carré</p></div></>}
                  </label>
                  <input ref={aproposPhotoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) saveAproposPhoto(f); e.target.value = '' }} />
                  {aproposPhotoError && <p className="text-xs text-red-600 font-medium flex items-center gap-1"><X className="w-3 h-3" />{aproposPhotoError}</p>}
                  {aproposPhotoSaved && <p className="text-xs text-lime-700 font-black flex items-center gap-1"><Check className="w-3 h-3" />Photo mise à jour !</p>}
                </div>
              </div>
              {/* Aperçu de la photo */}
              <div className="flex justify-center py-3 bg-candy rounded-2xl border-2 border-dashed border-[#1A1040]/20">
                {aproposPhotoVisible
                  ? <img src={aproposPhoto} alt="Aperçu" className="object-cover rounded-2xl border-4 border-[#1A1040]"
                      style={{ width: 120, height: 120, transform: `rotate(${aproposPhotoRotation}deg)` }} />
                  : <div className="w-[120px] h-[120px] rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs font-black">Masquée</div>
                }
              </div>

              {/* Taille */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-[#1A1040] shrink-0">📐 Taille</span>
                <input type="range" min={120} max={480} step={10} value={aproposPhotoSize}
                  onChange={e => changeAproposPhotoSize(parseInt(e.target.value))}
                  className="flex-1 accent-rose-400" />
                <span className="text-xs font-black text-[#1A1040] w-14 text-right shrink-0">{aproposPhotoSize}px</span>
              </div>

              {/* Inclinaison */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-[#1A1040] shrink-0">🔄 Inclinaison</span>
                <input type="range" min={-30} max={30} step={1} value={aproposPhotoRotation}
                  onChange={e => changeAproposPhotoRotation(parseFloat(e.target.value))}
                  className="flex-1 accent-turquoise-500" />
                <span className="text-xs font-black text-[#1A1040] w-14 text-right shrink-0">{aproposPhotoRotation}°</span>
              </div>

              {/* Visibilité */}
              <div className="flex items-center justify-between bg-candy rounded-xl px-4 py-3 border-2 border-[#1A1040]/20">
                <div>
                  <p className="text-xs font-black text-[#1A1040]">👁️ Visibilité publique</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {aproposPhotoVisible ? 'La photo est visible sur le site' : 'La photo est masquée du public'}
                  </p>
                </div>
                <button onClick={toggleAproposPhotoVisible}
                  className={`relative w-12 h-6 rounded-full border-2 border-[#1A1040] transition-colors shrink-0 ${aproposPhotoVisible ? 'bg-lime-400' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#1A1040] transition-all ${aproposPhotoVisible ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Titre ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Titre</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 bg-candy rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[60px]" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                  <div style={buildTitleStyle(aproposTitleStyle)} dangerouslySetInnerHTML={{ __html: aproposTitleText }} className="text-center leading-tight" />
                </div>
                <button onClick={() => setShowAproposTitle(true)}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
                  style={{ boxShadow: '3px 3px 0px 0px #86efac' }}>
                  <Pencil className="w-4 h-4" /> Modifier le titre
                </button>
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Texte ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Texte de présentation</p>

              {/* Aperçu stylisé */}
              <div className="bg-candy rounded-2xl border-2 border-[#1A1040] p-4 max-h-32 overflow-auto" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div style={buildTitleStyle(aproposBodyStyle)} dangerouslySetInnerHTML={{ __html: aproposBodyText || '<em style="opacity:0.4">Aucun texte…</em>' }} />
              </div>

              {/* Bouton éditeur style */}
              <button onClick={() => setShowAproposBody(true)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #86efac' }}>
                <Pencil className="w-4 h-4" /> Modifier le texte & le style
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION AVIS CLIENTS
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #ffe500' }}>
          <SectionHeader icon={<span className="text-lg">⭐</span>} title="Section Avis Clients" sub="Fond et titre du carrousel d'avis Google" />

          <div className="p-6 space-y-8">

            {/* ── Fond ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Fond de la section</p>
              <div className="relative h-20 flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[#1A1040]"
                style={buildHeroBgStyle({ ...avisBg, type: avisBgTab })}>
                <p className="font-serif font-black text-lg" style={{ color: avisTitleStyle.color }}>Avis clients ✦</p>
              </div>
              <BgEditor
                bg={avisBg} setBg={setAvisBg}
                activeTab={avisBgTab} setActiveTab={setAvisBgTab}
                fileRef={avisBgFileRef}
                uploadError={avisBgUploadError} setUploadError={setAvisBgUploadError}
                uploading={avisBgUploading} setUploading={setAvisBgUploading}
              />
              <div className="flex items-center gap-3">
                <button onClick={saveAvisBg} disabled={avisBgSaving}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                  style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
                  {avisBgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : avisBgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer le fond</>}
                </button>
                {avisBgSaved && <span className="text-sm font-black text-lime-600">✅ Fond mis à jour !</span>}
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Titre ── */}
            <div className="space-y-3">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Titre de section</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[60px]"
                  style={{ ...buildHeroBgStyle({ ...avisBg, type: avisBgTab }), boxShadow: '3px 3px 0px 0px #1A1040' }}>
                  <div style={buildTitleStyle(avisTitleStyle)} dangerouslySetInnerHTML={{ __html: avisTitleText }} className="text-center leading-tight" />
                </div>
                <button onClick={() => setShowAvisTitle(true)}
                  className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
                  style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
                  <Pencil className="w-4 h-4" /> Modifier le titre
                </button>
              </div>
            </div>

            <hr className="border-[#1A1040]/10" />

            {/* ── Lien vers les connecteurs ── */}
            <div className="bg-candy rounded-2xl border-2 border-dashed border-[#1A1040]/30 p-4 flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-black text-[#1A1040] text-sm">Configurer l'API Google Places</p>
                <p className="text-gray-500 text-xs mt-0.5">La clé API et le Place ID se configurent dans la page <span className="font-black text-rose-500">Connecteurs</span>.</p>
              </div>
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION ACTU — FOND
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #4dd9c0' }}>
          <SectionHeader icon={<Newspaper className="w-5 h-5 text-[#1A1040]" />} title="Section Actu du moment — Fond" sub="Fond de la zone avec les polaroïds" />

          {/* Aperçu */}
          <div className="relative h-28 flex items-center justify-center overflow-hidden transition-all duration-500 mx-6 mt-6 rounded-2xl border-2 border-[#1A1040]" style={actuBgPreview}>
            <div className="text-center">
              <div className="inline-flex items-center gap-1 bg-citron-400 text-[#1A1040] px-3 py-0.5 rounded-full text-[10px] font-bold border border-[#1A1040] mb-1">🗞️ Actu du moment</div>
              <p className="font-serif text-lg font-black text-[#1A1040] drop-shadow-sm">Les dernières nouvelles ✦</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <BgEditor
              bg={actuBg} setBg={setActuBg}
              activeTab={actuBgTab} setActiveTab={setActuBgTab}
              fileRef={actuFileRef}
              uploadError={actuUploadError} setUploadError={setActuUploadError}
              uploading={actuUploading} setUploading={setActuUploading}
            />
            <div className="flex items-center gap-3">
              <button onClick={saveActuBg} disabled={actuBgSaving || (actuBgTab === 'image' && !actuBg.image)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
                style={{ boxShadow: '3px 3px 0px 0px #4dd9c0' }}>
                {actuBgSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : actuBgSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer à la section</>}
              </button>
              {actuBgSaved && <span className="text-sm font-black text-lime-600">✅ Section mise à jour !</span>}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION ACTU — TITRE
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #c4b5fd' }}>
          <SectionHeader icon={<Pencil className="w-5 h-5 text-[#1A1040]" />} title="Section Actu — Titre" sub="Texte, police, taille, couleur…" />
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
            {/* Aperçu */}
            <div className="flex-1 bg-candy rounded-2xl border-2 border-[#1A1040] p-4 flex items-center justify-center min-h-[80px]" style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
              <div style={buildTitleStyle(actuTitleStyle)} dangerouslySetInnerHTML={{ __html: actuTitleText }} className="text-center leading-tight" />
            </div>
            {/* Bouton ouvrir éditeur */}
            <button onClick={() => setShowActuTitle(true)}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-4 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-all shrink-0"
              style={{ boxShadow: '3px 3px 0px 0px #c4b5fd' }}>
              <Pencil className="w-4 h-4" /> Modifier le titre
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION ACTU — BADGE & BOUTONS
        ════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden" style={{ boxShadow: '5px 5px 0px 0px #fdba74' }}>
          <SectionHeader icon={<Palette className="w-5 h-5 text-[#1A1040]" />} title="Section Actu — Badge & Boutons des polaroïds" sub="Style du badge et du bouton Modifier sur chaque polaroïd" />

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* ── Badge ── */}
            <div className="space-y-4">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Badge "Actu du moment"</p>
              {/* Aperçu */}
              <div className="flex justify-center">
                <div className={`inline-flex items-center gap-1.5 ${actuBadge.radius} text-sm font-bold border-2 border-[#1A1040] px-4 py-1.5`}
                  style={{ backgroundColor: actuBadge.bg, color: actuBadge.textColor }}>
                  {actuBadge.text}
                </div>
              </div>
              {/* Texte */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                <input type="text" value={actuBadge.text} onChange={e => setActuBadge(p => ({ ...p, text: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              {/* Couleurs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fond</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={actuBadge.bg} onChange={e => setActuBadge(p => ({ ...p, bg: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                    <input type="text" value={actuBadge.bg} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setActuBadge(p => ({ ...p, bg: e.target.value })) }}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={actuBadge.textColor} onChange={e => setActuBadge(p => ({ ...p, textColor: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                    <input type="text" value={actuBadge.textColor} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setActuBadge(p => ({ ...p, textColor: e.target.value })) }}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                  </div>
                </div>
              </div>
              {/* Forme */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
                <div className="flex flex-wrap gap-1.5">
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => setActuBadge(p => ({ ...p, radius: r.value }))}
                      className={`px-2.5 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${actuBadge.radius === r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bouton Modifier ── */}
            <div className="space-y-4">
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Bouton sur chaque polaroïd</p>
              {/* Aperçu */}
              <div className="flex justify-center">
                <div className={`inline-block px-4 py-1.5 ${actuBtn.radius} border-2 border-[#1A1040]`}
                  style={{ backgroundColor: actuBtn.bg, color: actuBtn.text, fontSize: `${actuBtn.fontSize}px`, fontWeight: actuBtn.bold ? 'bold' : 'normal' }}>
                  {actuBtn.label}
                </div>
              </div>
              {/* Texte */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte du bouton</label>
                <input type="text" value={actuBtn.label} onChange={e => setActuBtn(p => ({ ...p, label: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
              {/* Couleurs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Fond</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={actuBtn.bg} onChange={e => setActuBtn(p => ({ ...p, bg: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                    <input type="text" value={actuBtn.bg} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setActuBtn(p => ({ ...p, bg: e.target.value })) }}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Texte</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={actuBtn.text} onChange={e => setActuBtn(p => ({ ...p, text: e.target.value }))} className="w-9 h-9 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                    <input type="text" value={actuBtn.text} maxLength={7} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setActuBtn(p => ({ ...p, text: e.target.value })) }}
                      className="flex-1 border-2 border-[#1A1040] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                  </div>
                </div>
              </div>
              {/* Forme + taille + gras */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Forme</label>
                <div className="flex flex-wrap gap-1.5">
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => setActuBtn(p => ({ ...p, radius: r.value }))}
                      className={`px-2.5 py-1 border-2 text-[10px] font-black transition-all ${r.value} ${actuBtn.radius === r.value ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-600 hover:border-[#1A1040]'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Taille ({actuBtn.fontSize}px)</label>
                  <input type="range" min={8} max={18} value={actuBtn.fontSize} onChange={e => setActuBtn(p => ({ ...p, fontSize: Number(e.target.value) }))} className="w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1 block">Gras</label>
                  <button onClick={() => setActuBtn(p => ({ ...p, bold: !p.bold }))}
                    className={`px-4 py-2 rounded-xl border-2 font-black text-sm transition-all ${actuBtn.bold ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500'}`}>
                    G
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="px-6 pb-6 flex items-center gap-3">
            <button onClick={saveWidgets} disabled={widgetSaving}
              className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-6 py-3 rounded-2xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-50 transition-all"
              style={{ boxShadow: '3px 3px 0px 0px #fdba74' }}>
              {widgetSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement…</> : widgetSaved ? <><Check className="w-4 h-4" />Enregistré !</> : <><Check className="w-4 h-4" />Appliquer badge & boutons</>}
            </button>
            {widgetSaved && <span className="text-sm font-black text-lime-600">✅ Badge et boutons mis à jour !</span>}
          </div>
        </div>

      </div>

      {/* ── Modales section Valeurs ── */}
      {showValeursTitle && (
        <HeroTitleEditor
          initialText={valeursTitleText} initialStyle={valeursTitleStyle}
          sectionKey="valeurs_titre" styleKey="valeurs_titre_style"
          label="✏️ Titre — Section Valeurs"
          onSave={(text, style) => { setValeursTitleText(text); setValeursTitleStyle(style); setShowValeursTitle(false) }}
          onClose={() => setShowValeursTitle(false)}
        />
      )}
      {showCardTitleStyle && (
        <HeroTitleEditor
          initialText="Titre de carte" initialStyle={cardTitleStyle}
          sectionKey="valeurs_carte_titre_preview" styleKey="valeurs_carte_titre_style"
          label="✏️ Style des titres de cartes"
          onSave={(_, style) => {
            setCardTitleStyle(style)
            supabase.from('settings').upsert({ key: 'valeurs_carte_titre_style', value: JSON.stringify(style) }, { onConflict: 'key' })
            setShowCardTitleStyle(false)
          }}
          onClose={() => setShowCardTitleStyle(false)}
        />
      )}
      {showCardDescStyle && (
        <HeroTitleEditor
          initialText="Texte de description de la carte" initialStyle={cardDescStyle}
          sectionKey="valeurs_carte_desc_preview" styleKey="valeurs_carte_desc_style"
          label="✏️ Style des textes de cartes"
          onSave={(_, style) => {
            setCardDescStyle(style)
            supabase.from('settings').upsert({ key: 'valeurs_carte_desc_style', value: JSON.stringify(style) }, { onConflict: 'key' })
            setShowCardDescStyle(false)
          }}
          onClose={() => setShowCardDescStyle(false)}
        />
      )}

      {/* ── Modale éditeur texte À Propos ── */}
      {showAproposBody && (
        <HeroTitleEditor
          initialText={aproposBodyText}
          initialStyle={aproposBodyStyle}
          sectionKey="apropos_texte"
          styleKey="apropos_texte_style"
          label="✏️ Texte — Section À Propos"
          onSave={(text, style) => {
            setAproposBodyText(text)
            setAproposBodyStyle(style)
            setShowAproposBody(false)
          }}
          onClose={() => setShowAproposBody(false)}
        />
      )}

      {/* ── Modale éditeur titre À Propos ── */}
      {showAproposTitle && (
        <HeroTitleEditor
          initialText={aproposTitleText}
          initialStyle={aproposTitleStyle}
          sectionKey="apropos_titre"
          styleKey="apropos_titre_style"
          label="✏️ Titre — Section À Propos"
          onSave={(text, style) => {
            setAproposTitleText(text)
            setAproposTitleStyle(style)
            setShowAproposTitle(false)
          }}
          onClose={() => setShowAproposTitle(false)}
        />
      )}

      {/* ── Modale éditeur titre Avis Clients ── */}
      {showAvisTitle && (
        <HeroTitleEditor
          initialText={avisTitleText}
          initialStyle={avisTitleStyle}
          sectionKey="avis_titre"
          styleKey="avis_titre_style"
          label="✏️ Titre — Section Avis Clients"
          onSave={(text, style) => {
            setAvisTitleText(text)
            setAvisTitleStyle(style)
            setShowAvisTitle(false)
          }}
          onClose={() => setShowAvisTitle(false)}
        />
      )}

      {/* ── Modale éditeur titre Actu ── */}
      {showActuTitle && (
        <HeroTitleEditor
          initialText={actuTitleText}
          initialStyle={actuTitleStyle}
          sectionKey="actu_section_titre"
          styleKey="actu_section_titre_style"
          label="✏️ Titre — Section Actu du moment"
          onSave={(text, style) => {
            setActuTitleText(text)
            setActuTitleStyle(style)
            setShowActuTitle(false)
          }}
          onClose={() => setShowActuTitle(false)}
        />
      )}
    </main>
  )
}
