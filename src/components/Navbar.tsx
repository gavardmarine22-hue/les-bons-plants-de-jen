import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, LogOut, Settings, LayoutDashboard, Archive, Newspaper, Home, Phone, Navigation, ShoppingBag, ShoppingCart, Images, Package, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { useCart } from '../context/CartContext'
import { useAtelierCart } from '../context/AtelierCartContext'
import { supabase } from '../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface NavSettings {
  bgColor:      string
  borderColor:  string
  linkFont:     string
  activeBg:     string
  activeText:   string
  inactiveText: string
  hoverBg:      string
  mobileBg:     string
  labels:       string[]
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

const FONT_MAP: Record<string, string> = {
  sans:    'sans-serif',
  serif:   'serif',
  mono:    'monospace',
  cursive: 'cursive',
}

const NAV_HREFS = ['/', '/ateliers', '/contact', '/galerie', '/boutique']
const DEFAULT_TAB_VISIBLE = { ateliers: true, contact: true, galerie: true, boutique: true }
const TAB_KEY_BY_HREF: Record<string, keyof typeof DEFAULT_TAB_VISIBLE> = {
  '/ateliers': 'ateliers', '/contact': 'contact', '/galerie': 'galerie', '/boutique': 'boutique',
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAdmin, signOut } = useAuth()
  const { logoUrl } = useSiteSettings()
  const location = useLocation()
  const { itemCount: shopCount, setIsOpen: openCart } = useCart()
  const { itemCount: atelierCount } = useAtelierCart()
  const itemCount = shopCount + atelierCount

  const [nav, setNav]           = useState<NavSettings>(DEFAULT_NAV)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [tabVisible, setTabVisible]   = useState(DEFAULT_TAB_VISIBLE)

  // ── Chargement des paramètres ─────────────────────────────────────────────────
  useEffect(() => {
    loadNav()

    const channel = supabase
      .channel('navbar-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => loadNav())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

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
      labels: map['navbar_public_labels']
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

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const isActive = (href: string) => href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  function publicLinkStyle(href: string) {
    const active  = isActive(href)
    const hovered = hoveredHref === href
    return {
      fontFamily:      FONT_MAP[nav.linkFont] || 'sans-serif',
      backgroundColor: active ? nav.activeBg : hovered ? nav.hoverBg : 'transparent',
      color:           active ? nav.activeText : nav.inactiveText,
      transition:      'background-color 0.15s, color 0.15s',
    }
  }

  const navLinks = nav.labels.map((label, i) => ({ label, href: NAV_HREFS[i] }))

  return (
    <nav className="border-b-4 sticky top-0 z-50"
      style={{ backgroundColor: nav.bgColor, borderBottomColor: nav.borderColor }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img
              src={logoUrl}
              alt="Les plants de Jenni"
              className="h-11 w-auto group-hover:scale-105 transition-transform"
              onError={e => {
                const t = e.currentTarget
                t.style.display = 'none'
                const next = t.nextElementSibling as HTMLElement | null
                if (next) next.style.display = 'block'
              }}
            />
            <span className="font-brand text-xl font-bold text-[#1A1040] hidden" style={{ display: 'none' }}>
              <span className="text-gray-700">Les plants</span>{' '}
              <span className="text-rose-500">de Jenni</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">

            {/* Liens publics dynamiques (Accueil, Nos Ateliers, Contact, Galerie, Boutique) */}
            {navLinks.map((link) => {
              const tabKey  = TAB_KEY_BY_HREF[link.href]
              const isHidden = !!tabKey && !tabVisible[tabKey]
              if (isHidden && !isAdmin) return null
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-2 rounded-xl text-sm font-bold relative"
                  style={publicLinkStyle(link.href)}
                  onMouseEnter={() => setHoveredHref(link.href)}
                  onMouseLeave={() => setHoveredHref(null)}
                >
                  {isHidden && <span className="absolute -top-1.5 -right-1.5 text-[10px]" title="Masqué au public">🙈</span>}
                  <span className={isHidden ? 'opacity-50' : ''}>{link.label}</span>
                </Link>
              )
            })}

            {/* Bouton panier */}
            <button onClick={() => openCart(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 border-[#1A1040] bg-white hover:bg-candy transition-all"
              style={{ color: nav.inactiveText }}>
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* Liens admin (style fixe néo-brut) */}
            {isAdmin && (
              <>
                <Link to="/tableau-de-bord"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/tableau-de-bord')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <LayoutDashboard className="w-4 h-4" /> TDB
                </Link>
                <Link to="/accueil-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/accueil-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Home className="w-4 h-4" /> Accueil
                </Link>
                <Link to="/actu-moment"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/actu-moment')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Newspaper className="w-4 h-4" /> Actu
                </Link>
                <Link to="/contact-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/contact-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Phone className="w-4 h-4" /> Contact
                </Link>
                <Link to="/navbar-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/navbar-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Navigation className="w-4 h-4" /> Navbar
                </Link>
                <Link to="/boutique-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/boutique-admin') || isActive('/produits-admin') || isActive('/promos-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <ShoppingBag className="w-4 h-4" /> Boutique
                </Link>
                <Link to="/commandes-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/commandes-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Package className="w-4 h-4" /> Commandes
                </Link>
                <Link to="/galerie-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/galerie-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Images className="w-4 h-4" /> Galerie
                </Link>
                <Link to="/archives"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/archives')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Archive className="w-4 h-4" /> Archives
                </Link>
                <Link to="/connecteurs"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/connecteurs')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Settings className="w-4 h-4" /> Connecteurs
                </Link>
                <Link to="/connexion-admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isActive('/connexion-admin')
                      ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-[#1A1040] hover:bg-[#1A1040] hover:text-citron-400'
                  }`}>
                  <Lock className="w-4 h-4" /> Connexion
                </Link>
              </>
            )}

            {isAdmin && (
              <button onClick={signOut}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-[#1A1040] hover:bg-red-100 transition-colors border-2 border-transparent hover:border-red-300">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1A1040]"
            style={{ backgroundColor: nav.activeBg }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen
              ? <X    className="w-5 h-5" style={{ color: nav.activeText }} />
              : <Menu className="w-5 h-5" style={{ color: nav.activeText }} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t-4 px-4 py-4 space-y-2"
          style={{ backgroundColor: nav.mobileBg, borderTopColor: nav.borderColor }}>

          {/* Liens publics dynamiques (Accueil, Nos Ateliers, Contact, Galerie, Boutique) */}
          {navLinks.map((link) => {
            const tabKey  = TAB_KEY_BY_HREF[link.href]
            const isHidden = !!tabKey && !tabVisible[tabKey]
            if (isHidden && !isAdmin) return null
            return (
              <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isHidden ? 'opacity-50' : ''}`}
                style={{
                  fontFamily:      FONT_MAP[nav.linkFont] || 'sans-serif',
                  backgroundColor: isActive(link.href) ? nav.activeBg : 'transparent',
                  color:           isActive(link.href) ? nav.activeText : nav.inactiveText,
                }}>
                {link.label}
                {isHidden && <span className="text-xs" title="Masqué au public">🙈</span>}
              </Link>
            )
          })}

          {/* Panier */}
          <button onClick={() => { openCart(true); setMenuOpen(false) }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040] bg-white text-[#1A1040]">
            <ShoppingCart className="w-4 h-4" /> Panier
            {itemCount > 0 && <span className="ml-auto bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{itemCount}</span>}
          </button>

          {/* Liens admin */}
          {isAdmin && (
            <>
              <Link to="/tableau-de-bord" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <LayoutDashboard className="w-4 h-4" /> TDB
              </Link>
              <Link to="/accueil-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Home className="w-4 h-4" /> Page d'accueil
              </Link>
              <Link to="/actu-moment" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Newspaper className="w-4 h-4" /> Actu du moment
              </Link>
              <Link to="/contact-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Phone className="w-4 h-4" /> Page Contact
              </Link>
              <Link to="/navbar-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Navigation className="w-4 h-4" /> Navbar
              </Link>
              <Link to="/boutique-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <ShoppingBag className="w-4 h-4" /> Boutique
              </Link>
              <Link to="/commandes-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Package className="w-4 h-4" /> Commandes
              </Link>
              <Link to="/galerie-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Images className="w-4 h-4" /> Galerie
              </Link>
              <Link to="/archives" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Archive className="w-4 h-4" /> Archives
              </Link>
              <Link to="/connecteurs" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Settings className="w-4 h-4" /> Connecteurs
              </Link>
              <Link to="/connexion-admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 bg-[#1A1040] text-citron-400 px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#1A1040]">
                <Lock className="w-4 h-4" /> Connexion
              </Link>
            </>
          )}

          {isAdmin && (
            <button onClick={() => { signOut(); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
