import { useState } from 'react'
import {
  X, Check, Plus, Trash2, Sprout, Apple, Handshake, Leaf, Carrot, Flower2, Truck, Heart,
  ShoppingBasket, Sun, Droplets, TreePine, Users, MapPin, Award, Star, Recycle, ShieldCheck,
  Gift, Salad, Cherry, Wheat, type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FONT_OPTIONS } from './HeroTitleEditor'

// ─── Trait décoratif (branche + feuilles) ────────────────────────────────────
export function HeroFlourish({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 190 70" className={className} fill="none" stroke={color}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 40 C 32 40, 50 20, 86 30 S 140 46, 160 32" />
      <path d="M160 32 C 158 16, 172 8, 186 10 C 186 24, 174 32, 160 32 Z" />
      <path d="M162 31 L 180 15" />
      <path d="M146 38 C 142 52, 154 62, 168 60 C 168 46, 158 38, 146 38 Z" />
      <path d="M148 40 L 164 56" />
      <path d="M124 38 C 116 26, 122 14, 134 12 C 138 24, 132 34, 124 38 Z" />
    </svg>
  )
}

// ─── Atouts (icône + texte) ──────────────────────────────────────────────────
export const FEATURE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  sprout:    { label: 'Pousse',     Icon: Sprout },
  apple:     { label: 'Pomme',      Icon: Apple },
  handshake: { label: 'Poignée de main', Icon: Handshake },
  leaf:      { label: 'Feuille',    Icon: Leaf },
  carrot:    { label: 'Carotte',    Icon: Carrot },
  salad:     { label: 'Salade',     Icon: Salad },
  cherry:    { label: 'Cerises',    Icon: Cherry },
  wheat:     { label: 'Blé',        Icon: Wheat },
  flower:    { label: 'Fleur',      Icon: Flower2 },
  tree:      { label: 'Arbre',      Icon: TreePine },
  basket:    { label: 'Panier',     Icon: ShoppingBasket },
  truck:     { label: 'Livraison',  Icon: Truck },
  heart:     { label: 'Cœur',       Icon: Heart },
  sun:       { label: 'Soleil',     Icon: Sun },
  water:     { label: 'Eau',        Icon: Droplets },
  users:     { label: 'Clients',    Icon: Users },
  pin:       { label: 'Local',      Icon: MapPin },
  award:     { label: 'Qualité',    Icon: Award },
  star:      { label: 'Étoile',     Icon: Star },
  recycle:   { label: 'Écolo',      Icon: Recycle },
  shield:    { label: 'Garantie',   Icon: ShieldCheck },
  gift:      { label: 'Cadeau',     Icon: Gift },
}

export interface HeroFeature { icon: string; text: string; visible: boolean }

export interface HeroFeaturesConfig {
  visible:     boolean
  items:       HeroFeature[]
  circleColor: string
  iconColor:   string
  textColor:   string
  fontSize:    number
  font:        string
  bold:        boolean
}

export const DEFAULT_HERO_FEATURES: HeroFeaturesConfig = {
  visible: false,
  items: [
    { icon: 'sprout',    text: 'Plants de qualité\nproduction locale', visible: true },
    { icon: 'apple',     text: 'Légumes frais\net savoureux',          visible: true },
    { icon: 'handshake', text: 'Particuliers\n& Professionnels',       visible: true },
  ],
  circleColor: '#f3dfc1',
  iconColor:   '#4a5a2a',
  textColor:   '#3d3a2e',
  fontSize:    15,
  font:        'sans',
  bold:        true,
}

export function HeroFeaturesRow({ config, isAdmin, align }: {
  config: HeroFeaturesConfig
  isAdmin: boolean
  align: 'left' | 'center'
}) {
  const family = FONT_OPTIONS.find(f => f.value === config.font)?.family
  const items = config.items.filter(i => i.visible || isAdmin)
  if (!items.length) return null
  return (
    <div className={`flex flex-wrap gap-6 md:gap-10 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {items.map((it, i) => {
        const Icon = FEATURE_ICONS[it.icon]?.Icon ?? Leaf
        return (
          <div key={i} className={`flex flex-col items-center text-center w-32 md:w-36 ${!it.visible ? 'opacity-40' : ''}`}>
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: config.circleColor }}>
              <Icon className="w-8 h-8 md:w-9 md:h-9" style={{ color: config.iconColor }} strokeWidth={1.5} />
            </div>
            <p className="leading-snug whitespace-pre-line"
              style={{ color: config.textColor, fontSize: `${config.fontSize}px`, fontFamily: family, fontWeight: config.bold ? 700 : 400 }}>
              {it.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Éditeur des atouts ──────────────────────────────────────────────────────
const MAX_ITEMS = 4

export function HeroFeaturesEditor({ initial, align, onSave, onClose }: {
  initial:  HeroFeaturesConfig
  align:    'left' | 'center'
  onSave:   (config: HeroFeaturesConfig) => void
  onClose:  () => void
}) {
  const [cfg, setCfg] = useState<HeroFeaturesConfig>(initial)
  const [saving, setSaving] = useState(false)

  function updateItem(idx: number, patch: Partial<HeroFeature>) {
    setCfg(c => ({ ...c, items: c.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }))
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('settings').upsert({ key: 'hero_features', value: JSON.stringify(cfg) }, { onConflict: 'key' })
    setSaving(false)
    onSave(cfg)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1040]/80 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: '8px 8px 0px 0px #1A1040', maxHeight: '92vh' }}>

        <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-serif text-xl font-black text-citron-400">🌱 Atouts du hero</h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">

          <div className="rounded-2xl p-5 border-2 border-[#1A1040] bg-[#fbf6ec]">
            <HeroFeaturesRow config={{ ...cfg, visible: true }} isAdmin align={align} />
          </div>

          <div className="space-y-4">
            {cfg.items.map((it, idx) => (
              <div key={idx} className="border-2 border-[#1A1040] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1A1040] uppercase tracking-wide">Atout {idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A1040] cursor-pointer select-none">
                      <input type="checkbox" checked={it.visible}
                        onChange={e => updateItem(idx, { visible: e.target.checked })}
                        className="w-4 h-4 accent-lime-500 cursor-pointer" />
                      Visible
                    </label>
                    <button onClick={() => setCfg(c => ({ ...c, items: c.items.filter((_, i) => i !== idx) }))}
                      className="text-gray-400 hover:text-red-500 transition-colors" title="Supprimer cet atout">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <textarea value={it.text} rows={2}
                  onChange={e => updateItem(idx, { text: e.target.value })}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Texte (Entrée = retour à la ligne)" />

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(FEATURE_ICONS).map(([key, { label, Icon }]) => (
                    <button key={key} title={label} onClick={() => updateItem(idx, { icon: key })}
                      className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${
                        it.icon === key ? 'border-[#1A1040] bg-candy' : 'border-gray-200 hover:border-gray-400'
                      }`}>
                      <Icon className="w-4 h-4 text-[#1A1040]" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {cfg.items.length < MAX_ITEMS && (
              <button onClick={() => setCfg(c => ({ ...c, items: [...c.items, { icon: 'leaf', text: 'Nouvel atout', visible: true }] }))}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1A1040] rounded-2xl py-3 text-sm font-black text-[#1A1040] hover:bg-gray-50 transition-colors">
                <Plus className="w-4 h-4" /> Ajouter un atout
              </button>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-200 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {([
              ['Fond des pastilles', 'circleColor'],
              ['Couleur des icônes', 'iconColor'],
              ['Couleur du texte',   'textColor'],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={cfg[key]}
                    onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
                    className="w-10 h-10 rounded-xl border-2 border-[#1A1040] cursor-pointer p-0.5 shrink-0" />
                  <input type="text" value={cfg[key]} maxLength={9}
                    onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
                    className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-mono text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Taille du texte</label>
              <div className="flex items-center gap-3">
                <input type="range" min={11} max={26} value={cfg.fontSize}
                  onChange={e => setCfg(c => ({ ...c, fontSize: Number(e.target.value) }))} className="flex-1" />
                <span className="text-xs font-mono w-10 text-center">{cfg.fontSize}px</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Police</label>
              <div className="flex gap-2">
                <select value={cfg.font} onChange={e => setCfg(c => ({ ...c, font: e.target.value }))}
                  className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm text-[#1A1040] focus:outline-none">
                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <button onClick={() => setCfg(c => ({ ...c, bold: !c.bold }))}
                  className={`w-12 rounded-xl border-2 font-black text-sm transition-all ${
                    cfg.bold ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500'
                  }`}>G</button>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex gap-3 px-6 py-4 border-t-2 border-gray-100">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1A1040] text-citron-400 py-3 rounded-xl font-black border-2 border-[#1A1040] hover:bg-[#2d2060] disabled:opacity-60 transition-all"
            style={{ boxShadow: '3px 3px 0px 0px #ffe500' }}>
            <Check className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button onClick={onClose}
            className="px-6 py-3 rounded-xl font-black text-[#1A1040] bg-white border-2 border-[#1A1040] hover:bg-gray-50 transition-all">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
