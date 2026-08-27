import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCcw, Italic, Underline, Bold } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface HeroStyle {
  font:         string
  fontSize:     number
  color:        string
  outline:      boolean
  outlineColor: string
  outlineWidth: number
  shadow:       boolean
  shadowColor:  string
  shadowBlur:   number
  shadowX:      number
  shadowY:      number
  bold:         boolean
  italic:       boolean
  underline:    boolean
}

export const DEFAULT_HERO_STYLE: HeroStyle = {
  font:         'serif',
  fontSize:     48,
  color:        '#ffffff',
  outline:      false,
  outlineColor: '#1A1040',
  outlineWidth: 2,
  shadow:       true,
  shadowColor:  '#00000033',
  shadowBlur:   4,
  shadowX:      2,
  shadowY:      2,
  bold:         true,
  italic:       false,
  underline:    false,
}

export const FONT_OPTIONS = [
  { value: 'serif',  label: 'Classique',  family: 'Georgia, serif' },
  { value: 'sans',   label: 'Moderne',    family: 'Inter, sans-serif' },
  { value: 'brand',  label: 'Cursive',    family: '"Dancing Script", cursive' },
  { value: 'script', label: 'Fun',        family: 'Pacifico, cursive' },
]

export function buildTitleStyle(style: HeroStyle): React.CSSProperties {
  const font = FONT_OPTIONS.find(f => f.value === style.font)
  return {
    fontFamily:        font?.family,
    fontSize:          `${style.fontSize}px`,
    color:             style.color,
    WebkitTextStroke:  style.outline ? `${style.outlineWidth}px ${style.outlineColor}` : undefined,
    textShadow:        style.shadow  ? `${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px ${style.shadowColor}` : 'none',
    fontWeight:        style.bold    ? 'bold'   : 'normal',
    fontStyle:         style.italic  ? 'italic' : 'normal',
    textDecoration:    style.underline ? 'underline' : 'none',
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  initialText:  string
  initialStyle: HeroStyle
  page?:        string   // page dans page_content (ex: 'accueil', 'contact', 'boutique') — défaut 'accueil'
  sectionKey:   string   // clé dans page_content (ex: 'hero_titre', 'hero_sous_titre')
  styleKey:     string   // clé dans settings (ex: 'hero_titre_style', 'hero_sous_titre_style')
  label?:       string   // titre de la modale
  onSave:  (text: string, style: HeroStyle) => void
  onClose: () => void
}

// ─── Composant ──────────────────────────────────────────────────────────────
export default function HeroTitleEditor({ initialText, initialStyle, page = 'accueil', sectionKey, styleKey, label, onSave, onClose }: Props) {
  const [style, setStyle]           = useState<HeroStyle>(initialStyle)
  const [previewHtml, setPreviewHtml] = useState(initialText)
  const [saving, setSaving]         = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Initialise le contenu de l'éditeur
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialText
  }, [])

  // Applique un format sur la sélection courante
  function applySelectionFormat(command: string) {
    editorRef.current?.focus()
    document.execCommand(command, false)
    if (editorRef.current) setPreviewHtml(editorRef.current.innerHTML)
  }

  // Mise à jour du preview lors de la saisie
  function handleInput() {
    if (editorRef.current) setPreviewHtml(editorRef.current.innerHTML)
  }

  function resetStyle() { setStyle(DEFAULT_HERO_STYLE) }

  async function handleSave() {
    const text = editorRef.current?.innerHTML || ''
    setSaving(true)
    await Promise.all([
      supabase.from('page_content').upsert(
        { page, section: sectionKey, contenu: text },
        { onConflict: 'page,section' }
      ),
      supabase.from('settings').upsert(
        { key: styleKey, value: JSON.stringify(style) },
        { onConflict: 'key' }
      ),
    ])
    setSaving(false)
    onSave(text, style)
  }

  const previewStyle = buildTitleStyle(style)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1040]/80 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: '8px 8px 0px 0px #1A1040', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-serif text-xl font-black text-citron-400">{label ?? '✏️ Éditeur du titre'}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">

          {/* ── Aperçu live ── */}
          <div className="bg-rose-400 rounded-2xl p-6 text-center border-2 border-[#1A1040] min-h-[90px] flex items-center justify-center">
            <div
              className="leading-tight"
              style={previewStyle}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          {/* ── Éditeur de texte ── */}
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Texte</label>

            {/* Barre d'outils de mise en forme partielle */}
            <div className="flex items-center gap-2 mb-2 flex-wrap bg-gray-50 border-2 border-[#1A1040] border-b-0 rounded-t-xl px-3 py-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mr-1">Sélectionne du texte :</span>
              <button
                onMouseDown={e => { e.preventDefault(); applySelectionFormat('bold') }}
                className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-[#1A1040] rounded-lg text-xs font-black bg-white hover:bg-candy transition-colors"
                title="Gras sur la sélection">
                <Bold className="w-3 h-3" /> Gras
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); applySelectionFormat('italic') }}
                className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-[#1A1040] rounded-lg text-xs font-black italic bg-white hover:bg-candy transition-colors"
                title="Italique sur la sélection">
                <Italic className="w-3 h-3" /> Italique
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); applySelectionFormat('underline') }}
                className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-[#1A1040] rounded-lg text-xs font-black underline bg-white hover:bg-candy transition-colors"
                title="Souligner la sélection">
                <Underline className="w-3 h-3" /> Souligner
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); applySelectionFormat('removeFormat') }}
                className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-gray-300 rounded-lg text-xs text-gray-500 bg-white hover:bg-gray-50 transition-colors"
                title="Effacer la mise en forme de la sélection">
                ✕ Effacer
              </button>
            </div>

            {/* Zone de texte contenteditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              className="w-full border-2 border-[#1A1040] rounded-b-xl px-4 py-3 text-base text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400 min-h-[56px]"
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              💡 Sélectionne une portion du texte dans la zone ci-dessus, puis clique sur Gras, Italique ou Souligner.
            </p>
          </div>

          {/* ── Panneau de style ── */}
          <div className="border-t-2 border-dashed border-gray-200 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Police */}
            <div>
              <label className="block text-xs font-black text-[#1A1040] mb-3 uppercase tracking-wide">Police</label>
              <div className="space-y-2">
                {FONT_OPTIONS.map(f => (
                  <button key={f.value}
                    onClick={() => setStyle(p => ({ ...p, font: f.value }))}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                      style.font === f.value ? 'border-[#1A1040] bg-candy' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span style={{ fontFamily: f.family }} className="text-sm font-bold text-[#1A1040]">{f.label}</span>
                    <span style={{ fontFamily: f.family }} className="ml-2 text-gray-500 text-sm">Abc 123</span>
                    {style.font === f.value && <span className="ml-2 text-[10px] text-rose-400 font-black">✓ Actif</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Options de style */}
            <div className="space-y-5">

              {/* Couleur du texte */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Couleur du texte</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={style.color}
                    onChange={e => setStyle(p => ({ ...p, color: e.target.value }))}
                    className="w-10 h-10 rounded-xl border-2 border-[#1A1040] cursor-pointer p-0.5 shrink-0" />
                  <input type="text" value={style.color} maxLength={9}
                    onChange={e => setStyle(p => ({ ...p, color: e.target.value }))}
                    className="flex-1 border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm font-mono text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
              </div>

              {/* Taille du texte */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">
                  Taille du texte
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={18} max={96} step={2}
                    value={style.fontSize}
                    onChange={e => setStyle(p => ({ ...p, fontSize: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={10} max={120} step={1}
                      value={style.fontSize}
                      onChange={e => {
                        const v = Math.min(120, Math.max(10, Number(e.target.value)))
                        setStyle(p => ({ ...p, fontSize: v }))
                      }}
                      className="w-14 border-2 border-[#1A1040] rounded-lg px-2 py-1 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <span className="text-xs text-gray-400">px</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-300 mt-0.5 px-0.5">
                  <span>18</span><span>Petit</span><span>Normal</span><span>Grand</span><span>96</span>
                </div>
              </div>

              {/* Contour */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide cursor-pointer select-none">
                  <input type="checkbox" checked={style.outline}
                    onChange={e => setStyle(p => ({ ...p, outline: e.target.checked }))}
                    className="w-4 h-4 accent-rose-400 cursor-pointer" />
                  Contour du texte
                </label>
                {style.outline && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={style.outlineColor}
                        onChange={e => setStyle(p => ({ ...p, outlineColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                      <span className="text-xs text-gray-500">Couleur</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14">Épaisseur</span>
                      <input type="range" min={1} max={6} step={0.5} value={style.outlineWidth}
                        onChange={e => setStyle(p => ({ ...p, outlineWidth: Number(e.target.value) }))}
                        className="flex-1" />
                      <span className="text-xs font-mono w-8 text-center">{style.outlineWidth}px</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ombre */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide cursor-pointer select-none">
                  <input type="checkbox" checked={style.shadow}
                    onChange={e => setStyle(p => ({ ...p, shadow: e.target.checked }))}
                    className="w-4 h-4 accent-rose-400 cursor-pointer" />
                  Ombre portée
                </label>
                {style.shadow && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={style.shadowColor.startsWith('#') ? style.shadowColor.slice(0, 7) : '#000000'}
                        onChange={e => setStyle(p => ({ ...p, shadowColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg border-2 border-[#1A1040] cursor-pointer p-0.5" />
                      <span className="text-xs text-gray-500">Couleur</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14">Flou</span>
                      <input type="range" min={0} max={30} value={style.shadowBlur}
                        onChange={e => setStyle(p => ({ ...p, shadowBlur: Number(e.target.value) }))}
                        className="flex-1" />
                      <span className="text-xs font-mono w-8 text-center">{style.shadowBlur}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14">Décalage</span>
                      <input type="range" min={-10} max={10} value={style.shadowX}
                        onChange={e => setStyle(p => ({ ...p, shadowX: Number(e.target.value) }))}
                        className="flex-1" />
                      <span className="text-xs font-mono w-8 text-center">X:{style.shadowX}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Style global */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Style global</label>
                <div className="flex gap-2">
                  <button onClick={() => setStyle(p => ({ ...p, bold: !p.bold }))}
                    className={`flex-1 py-2 rounded-xl border-2 font-black text-sm transition-all ${
                      style.bold ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`} style={{ fontWeight: 'bold' }}>
                    G
                  </button>
                  <button onClick={() => setStyle(p => ({ ...p, italic: !p.italic }))}
                    className={`flex-1 py-2 rounded-xl border-2 font-black text-sm italic transition-all ${
                      style.italic ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}>
                    I
                  </button>
                  <button onClick={() => setStyle(p => ({ ...p, underline: !p.underline }))}
                    className={`flex-1 py-2 rounded-xl border-2 font-black text-sm underline transition-all ${
                      style.underline ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}>
                    S
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">S'applique à tout le titre.</p>
              </div>

              {/* Reset */}
              <button onClick={resetStyle}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <RotateCcw className="w-3 h-3" />
                Réinitialiser le style par défaut
              </button>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
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
