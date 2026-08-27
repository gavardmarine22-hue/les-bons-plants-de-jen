import type { CSSProperties } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type BgType = 'color' | 'gradient' | 'pattern' | 'image' | 'video'

export interface HeroBg {
  type:          BgType
  // Couleur unie
  color:         string
  // Dégradé
  gradFrom:      string
  gradTo:        string
  gradDir:       string
  // Motif
  patternId:     string
  patternColor1: string
  patternColor2: string
  // Image
  image:         string
  imageOverlay:  string   // couleur RGBA superposée sur l'image
  // Vidéo
  videoUrl:      string
  videoMuted:    boolean
  videoLoop:     boolean
  videoOverlay:  string   // couleur RGBA superposée sur la vidéo
}

export const DEFAULT_HERO_BG: HeroBg = {
  type:          'color',
  color:         '#ffb5c8',
  gradFrom:      '#ffb5c8',
  gradTo:        '#c4b5fd',
  gradDir:       'to right',
  patternId:     'stripes-diag',
  patternColor1: '#ffb5c8',
  patternColor2: '#ff7eb3',
  image:         '',
  imageOverlay:  'transparent',
  videoUrl:      '',
  videoMuted:    true,
  videoLoop:     true,
  videoOverlay:  'rgba(0,0,0,0.25)',
}

// ─── Overlays vidéo prédéfinis ────────────────────────────────────────────────
export const VIDEO_OVERLAYS = [
  { label: 'Aucun',       value: 'transparent' },
  { label: 'Léger',       value: 'rgba(0,0,0,0.2)' },
  { label: 'Modéré',      value: 'rgba(0,0,0,0.4)' },
  { label: 'Sombre',      value: 'rgba(0,0,0,0.6)' },
  { label: 'Blanc léger', value: 'rgba(255,255,255,0.3)' },
  { label: 'Blanc fort',  value: 'rgba(255,255,255,0.6)' },
]

// ─── Directions dégradé ───────────────────────────────────────────────────────
export const GRAD_DIRS = [
  { value: 'to right',   label: '→ Horizontal' },
  { value: 'to bottom',  label: '↓ Vertical'   },
  { value: '135deg',     label: '↘ Diagonal'   },
  { value: '45deg',      label: '↗ Diagonal'   },
  { value: 'radial',     label: '◎ Radial'     },
]

// ─── Dégradés prédéfinis ──────────────────────────────────────────────────────
export const PRESET_GRADIENTS = [
  { name: 'Aurore',      from: '#ffb5c8', to: '#c4b5fd', dir: 'to right'  },
  { name: 'Coucher',     from: '#fb923c', to: '#f43f5e', dir: '135deg'    },
  { name: 'Océan',       from: '#4dd9c0', to: '#7dd3fc', dir: 'to right'  },
  { name: 'Galaxie',     from: '#1A1040', to: '#7c3aed', dir: '135deg'    },
  { name: 'Citron',      from: '#ffe500', to: '#86efac', dir: 'to right'  },
  { name: 'Flamme',      from: '#e11d48', to: '#fb923c', dir: 'to right'  },
  { name: 'Bonbon',      from: '#f9a8d4', to: '#c4b5fd', dir: '135deg'    },
  { name: 'Minuit',      from: '#1e1b4b', to: '#312e81', dir: 'to bottom' },
  { name: 'Pêche',       from: '#fdba74', to: '#fda4af', dir: '135deg'    },
  { name: 'Forêt',       from: '#4ade80', to: '#4dd9c0', dir: 'to right'  },
  { name: 'Mariage',     from: '#fff5fb', to: '#fce7f3', dir: 'to bottom' },
  { name: 'Pop',         from: '#ffe500', to: '#ff6b6b', dir: '160deg'    },
]

// ─── Motifs CSS ───────────────────────────────────────────────────────────────
export interface PatternDef { id: string; name: string; emoji: string }
export const PATTERNS: PatternDef[] = [
  { id: 'stripes-diag',  name: 'Rayures diagonales',   emoji: '╱'  },
  { id: 'stripes-horiz', name: 'Rayures horizontales',  emoji: '═'  },
  { id: 'stripes-vert',  name: 'Rayures verticales',    emoji: '║'  },
  { id: 'dots',          name: 'Pois',                  emoji: '●'  },
  { id: 'grid',          name: 'Grille',                emoji: '⊞'  },
  { id: 'checker',       name: 'Damier',                emoji: '▪'  },
  { id: 'crosshatch',    name: 'Hachures croisées',     emoji: '⊠'  },
  { id: 'waves',         name: 'Vagues',                emoji: '〜' },
]

function patternStyle(id: string, c1: string, c2: string): CSSProperties {
  switch (id) {
    case 'stripes-diag':
      return { background: `repeating-linear-gradient(45deg, ${c1}, ${c1} 10px, ${c2} 10px, ${c2} 20px)` }
    case 'stripes-horiz':
      return { background: `repeating-linear-gradient(0deg, ${c1}, ${c1} 10px, ${c2} 10px, ${c2} 20px)` }
    case 'stripes-vert':
      return { background: `repeating-linear-gradient(90deg, ${c1}, ${c1} 10px, ${c2} 10px, ${c2} 20px)` }
    case 'dots':
      return { backgroundColor: c1, backgroundImage: `radial-gradient(circle, ${c2} 4px, transparent 4px)`, backgroundSize: '22px 22px' }
    case 'grid':
      return { backgroundColor: c1, backgroundImage: `linear-gradient(${c2} 1px, transparent 1px), linear-gradient(90deg, ${c2} 1px, transparent 1px)`, backgroundSize: '24px 24px' }
    case 'checker':
      return {
        backgroundColor: c2,
        backgroundImage: `linear-gradient(45deg,${c1} 25%,transparent 25%),linear-gradient(-45deg,${c1} 25%,transparent 25%),linear-gradient(45deg,transparent 75%,${c1} 75%),linear-gradient(-45deg,transparent 75%,${c1} 75%)`,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }
    case 'crosshatch':
      return {
        backgroundColor: c1,
        backgroundImage: `repeating-linear-gradient(45deg,${c2} 0,${c2} 1px,transparent 0,transparent 50%),repeating-linear-gradient(-45deg,${c2} 0,${c2} 1px,transparent 0,transparent 50%)`,
        backgroundSize: '20px 20px',
      }
    case 'waves':
      return {
        backgroundColor: c1,
        backgroundImage: `repeating-radial-gradient(ellipse at 50% 0%, transparent 0px, transparent 18px, ${c2} 18px, ${c2} 20px)`,
        backgroundSize: '40px 20px',
      }
    default:
      return { backgroundColor: c1 }
  }
}

// ─── Fonction principale : convertit HeroBg → style CSS ──────────────────────
export function buildHeroBgStyle(bg: HeroBg): CSSProperties {
  switch (bg.type) {
    case 'color':
      return { backgroundColor: bg.color }

    case 'gradient':
      if (bg.gradDir === 'radial') {
        return { background: `radial-gradient(ellipse at center, ${bg.gradFrom}, ${bg.gradTo})` }
      }
      return { background: `linear-gradient(${bg.gradDir}, ${bg.gradFrom}, ${bg.gradTo})` }

    case 'pattern':
      return patternStyle(bg.patternId, bg.patternColor1, bg.patternColor2)

    case 'image':
      if (!bg.image) return { backgroundColor: bg.color }
      return {
        backgroundImage: bg.imageOverlay && bg.imageOverlay !== 'transparent'
          ? `linear-gradient(${bg.imageOverlay}, ${bg.imageOverlay}), url(${bg.image})`
          : `url(${bg.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }

    case 'video':
      // La vidéo est rendue via un <video> element dans le JSX — on retourne
      // juste la couleur de fallback (affichée pendant le chargement)
      return { backgroundColor: bg.color || '#ffb5c8' }

    default:
      return { backgroundColor: '#ffb5c8' }
  }
}

// ─── Couleurs prédéfinies ─────────────────────────────────────────────────────
export const PRESET_COLORS = [
  { name: 'Rose (défaut)',  value: '#ffb5c8' },
  { name: 'Citron',         value: '#ffe500' },
  { name: 'Turquoise',      value: '#4dd9c0' },
  { name: 'Lavande',        value: '#c4b5fd' },
  { name: 'Pêche',          value: '#fdba74' },
  { name: 'Menthe',         value: '#86efac' },
  { name: 'Ciel',           value: '#7dd3fc' },
  { name: 'Corail',         value: '#f87171' },
  { name: 'Cerise',         value: '#e11d48' },
  { name: 'Lilas',          value: '#e879f9' },
  { name: 'Nuit marine',    value: '#1A1040' },
  { name: 'Anthracite',     value: '#374151' },
  { name: 'Crème',          value: '#fff5fb' },
  { name: 'Chocolat',       value: '#92400e' },
  { name: 'Sauge',          value: '#84cc16' },
]
