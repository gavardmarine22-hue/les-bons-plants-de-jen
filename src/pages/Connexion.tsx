import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { type HeroBg, DEFAULT_HERO_BG, buildHeroBgStyle } from '../lib/heroBg'
import { type HeroStyle, buildTitleStyle } from '../components/HeroTitleEditor'

interface BadgeConfig { text: string; bg: string; textColor: string; radius: string; font: string; fontSize: number }
interface StyleConfig { iconBg: string; cardBg: string; borderColor: string; buttonBg: string; buttonText: string }

const DEFAULT_BG: HeroBg = { ...DEFAULT_HERO_BG, color: '#fff5fb' }
const DEFAULT_BADGE: BadgeConfig = { text: '🔐 Zone secrète !', bg: '#fb7185', textColor: '#ffffff', radius: 'rounded-full', font: 'sans-serif', fontSize: 14 }
const DEFAULT_STYLE: StyleConfig = { iconBg: '#fb7185', cardBg: '#ffffff', borderColor: '#1A1040', buttonBg: '#fb7185', buttonText: '#ffffff' }
const DEFAULT_TITRE_STYLE: HeroStyle = {
  font: 'serif', fontSize: 24, color: '#1A1040', bold: true, italic: false, underline: false,
  outline: false, outlineColor: '#1A1040', outlineWidth: 2,
  shadow: false, shadowColor: '#00000033', shadowBlur: 4, shadowX: 2, shadowY: 2,
}

export default function Connexion() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [bg, setBg] = useState<HeroBg>(DEFAULT_BG)
  const [badge, setBadge] = useState<BadgeConfig>(DEFAULT_BADGE)
  const [style, setStyle] = useState<StyleConfig>(DEFAULT_STYLE)
  const [titreText, setTitreText] = useState('Espace Admin')
  const [titreStyle, setTitreStyle] = useState<HeroStyle>(DEFAULT_TITRE_STYLE)
  const [sousTitre, setSousTitre] = useState('Les plants de Jenni ✦')
  const [footerTexte, setFooterTexte] = useState('Réservé à la gestionnaire du site uniquement.')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    supabase.from('settings').select('key, value').in('key', [
      'connexion_bg_config', 'connexion_badge_config', 'connexion_style_config', 'connexion_titre_style', 'connexion_logo_url',
    ]).then(({ data }) => {
      (data || []).forEach((s: { key: string; value: string }) => {
        try {
          if (s.key === 'connexion_bg_config')    setBg(p => ({ ...p, ...JSON.parse(s.value) }))
          if (s.key === 'connexion_badge_config') setBadge(p => ({ ...p, ...JSON.parse(s.value) }))
          if (s.key === 'connexion_style_config') setStyle(p => ({ ...p, ...JSON.parse(s.value) }))
          if (s.key === 'connexion_titre_style')  setTitreStyle(p => ({ ...p, ...JSON.parse(s.value) }))
        } catch {}
        if (s.key === 'connexion_logo_url') setLogoUrl(s.value || '')
      })
    })
    supabase.from('page_content').select('section, contenu').eq('page', 'connexion')
      .in('section', ['connexion_titre', 'connexion_sous_titre', 'connexion_footer_texte'])
      .then(({ data }) => {
        (data || []).forEach((c: { section: string; contenu: string }) => {
          if (c.section === 'connexion_titre')        setTitreText(c.contenu)
          if (c.section === 'connexion_sous_titre')   setSousTitre(c.contenu)
          if (c.section === 'connexion_footer_texte') setFooterTexte(c.contenu)
        })
      })
  }, [])

  if (isAdmin) {
    navigate('/')
    return null
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect. Réessaie !')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16 relative overflow-hidden" style={buildHeroBgStyle(bg)}>
      <div className="rounded-3xl border-4 shadow-pop w-full max-w-md p-8 relative"
        style={{ backgroundColor: style.cardBg, borderColor: style.borderColor }}>
        {/* Badge décoratif */}
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 text-sm font-black border-2 whitespace-nowrap ${badge.radius}`}
          style={{ backgroundColor: badge.bg, color: badge.textColor, borderColor: style.borderColor, fontFamily: badge.font, fontSize: badge.fontSize }}>
          {badge.text}
        </div>

        {/* Logo */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-4 shadow-pop mb-4 overflow-hidden"
            style={{ backgroundColor: style.iconBg, borderColor: style.borderColor }}>
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              : <Scissors className="w-8 h-8 text-white" />}
          </div>
          <div style={buildTitleStyle(titreStyle)} dangerouslySetInnerHTML={{ __html: titreText }} />
          <p className="text-gray-500 text-sm mt-1 font-medium">{sousTitre}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4 border-2 border-red-200 font-medium">
            😬 {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1.5">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1.5">Mot de passe</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-[#1A1040] rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm shadow-pop border-2 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#1A1040] transition-all disabled:opacity-60 disabled:translate-y-0 mt-2"
            style={{ backgroundColor: style.buttonBg, color: style.buttonText, borderColor: style.borderColor }}
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Connexion en cours...' : '🚀 Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6 font-medium">
          {footerTexte}
        </p>
      </div>
    </main>
  )
}
