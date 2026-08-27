import { useState, useEffect, useMemo } from 'react'
import { Newspaper, Plus, Pencil, Trash2, X, Check, Upload, Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Actu {
  id: string; slot: number; titre: string; texte: string
  photo_url: string; date_debut: string; date_fin: string
  actif: boolean; created_at: string
}

type StatutActu = 'actif' | 'avenir' | 'passe'

function getStatut(actu: Actu): StatutActu {
  const today = new Date().toISOString().split('T')[0]
  if (actu.date_fin < today) return 'passe'
  if (actu.date_debut > today) return 'avenir'
  return 'actif'
}

const STATUT_STYLE: Record<StatutActu, { label: string; bg: string; text: string }> = {
  actif:  { label: '🟢 Actif',     bg: 'bg-lime-100',   text: 'text-lime-700' },
  avenir: { label: '🔵 Programmé', bg: 'bg-blue-100',   text: 'text-blue-700' },
  passe:  { label: '⚫ Passé',     bg: 'bg-gray-100',   text: 'text-gray-500' },
}

const FONT_OPTIONS = ['sans', 'serif', 'mono', 'cursive']

const SLOT_COLORS = [
  'bg-rose-400', 'bg-citron-400', 'bg-turquoise-400',
  'bg-lime-400', 'bg-orange-400', 'bg-violet-400', 'bg-pink-400', 'bg-sky-400',
]
function slotColor(slot: number) { return SLOT_COLORS[(slot - 1) % SLOT_COLORS.length] }

function defaultForm(slot = 1): Partial<Actu> {
  const today = new Date()
  const nextMonth = new Date(today); nextMonth.setMonth(nextMonth.getMonth() + 1)
  return {
    slot, titre: '', texte: '', photo_url: '', actif: true,
    date_debut: today.toISOString().split('T')[0],
    date_fin:   nextMonth.toISOString().split('T')[0],
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ActuAdmin() {
  const [actus, setActus]               = useState<Actu[]>([])
  const [maxSlot, setMaxSlot]           = useState(3)
  // Visibilité des slots stockée dans settings (indépendante des actus)
  const [slotVisibility, setSlotVisibility] = useState<Record<number, boolean>>({})
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<Partial<Actu>>(defaultForm())
  const [editId, setEditId]             = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [collapsed, setCollapsed]       = useState<Record<number, boolean>>({})
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [polaroidSize, setPolaroidSize] = useState(208)

  // Style titre/texte des polaroïds (global, s'applique aux 4 cartes)
  const [titreFont,  setTitreFont]  = useState('cursive')
  const [titreSize,  setTitreSize]  = useState(18)
  const [titreColor, setTitreColor] = useState('#1A1040')
  const [texteFont,  setTexteFont]  = useState('sans')
  const [texteSize,  setTexteSize]  = useState(13)
  const [texteColor, setTexteColor] = useState('#4b5563')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: actuData }, { data: settData }] = await Promise.all([
      supabase.from('actus').select('*').order('slot').order('date_debut'),
      supabase.from('settings').select('key, value'),
    ])
    const loaded = (actuData as Actu[]) || []
    setActus(loaded)

    // Lire les settings
    const vis: Record<number, boolean> = {}
    let maxS = 3
    ;(settData || []).forEach((s: { key: string; value: string }) => {
      if (s.key === 'actu_max_slot') maxS = parseInt(s.value) || 3
      else if (s.key === 'actu_polaroid_size') setPolaroidSize(parseInt(s.value) || 208)
      else if (s.key === 'actu_card_titre_font')  setTitreFont(s.value)
      else if (s.key === 'actu_card_titre_size')  setTitreSize(parseInt(s.value) || 18)
      else if (s.key === 'actu_card_titre_color') setTitreColor(s.value)
      else if (s.key === 'actu_card_texte_font')  setTexteFont(s.value)
      else if (s.key === 'actu_card_texte_size')  setTexteSize(parseInt(s.value) || 13)
      else if (s.key === 'actu_card_texte_color') setTexteColor(s.value)
      else if (s.key.startsWith('slot_visible_')) {
        const n = parseInt(s.key.replace('slot_visible_', ''))
        if (!isNaN(n)) vis[n] = s.value !== 'false'
      }
    })
    const fromData = loaded.length ? Math.max(...loaded.map(a => a.slot)) : 0
    setMaxSlot(Math.max(3, maxS, fromData))
    setSlotVisibility(vis)
    setLoading(false)
  }

  async function changePolaroidSize(size: number) {
    setPolaroidSize(size)
    await supabase.from('settings').upsert({ key: 'actu_polaroid_size', value: String(size) }, { onConflict: 'key' })
  }

  async function saveSetting(key: string, value: string) {
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
  }

  const slots = useMemo(() => Array.from({ length: maxSlot }, (_, i) => i + 1), [maxSlot])

  // ── Visibilité slot (depuis settings, défaut = visible) ─────────────────
  function isSlotVisible(slot: number): boolean {
    return slotVisibility[slot] !== false
  }

  async function toggleSlot(slot: number, visible: boolean) {
    // Mise à jour locale immédiate
    setSlotVisibility(prev => ({ ...prev, [slot]: visible }))
    // Persistance dans settings
    await supabase.from('settings')
      .upsert({ key: `slot_visible_${slot}`, value: visible ? 'true' : 'false' }, { onConflict: 'key' })
  }

  // ── Conflit de dates ────────────────────────────────────────────────────
  const conflict = useMemo(() => {
    if (!form.slot || !form.date_debut || !form.date_fin) return null
    return actus.find(a =>
      a.slot === form.slot &&
      a.id !== editId &&
      form.date_debut! <= a.date_fin &&
      form.date_fin! >= a.date_debut
    ) || null
  }, [form.slot, form.date_debut, form.date_fin, actus, editId])

  const occupiedRanges = useMemo(() => {
    if (!form.slot) return []
    return actus
      .filter(a => a.slot === form.slot && a.id !== editId)
      .map(a => ({ debut: a.date_debut, fin: a.date_fin, titre: a.titre || 'Sans titre' }))
      .sort((a, b) => a.debut.localeCompare(b.debut))
  }, [form.slot, actus, editId])

  // ── Ajouter un polaroïd ─────────────────────────────────────────────────
  async function addPolaroid() {
    const newMax = maxSlot + 1
    setMaxSlot(newMax)
    // Nouveau slot visible par défaut
    setSlotVisibility(prev => ({ ...prev, [newMax]: true }))
    await Promise.all([
      supabase.from('settings').upsert({ key: 'actu_max_slot', value: String(newMax) }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: `slot_visible_${newMax}`, value: 'true' }, { onConflict: 'key' }),
    ])
    openCreate(newMax)
  }

  // ── CRUD ────────────────────────────────────────────────────────────────
  function openCreate(slot = 1) {
    setEditId(null); setForm(defaultForm(slot)); setShowModal(true)
  }
  function openEdit(actu: Actu) {
    setEditId(actu.id); setForm({ ...actu }); setShowModal(true)
  }

  async function uploadPhoto(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `actu_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('actus').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('actus').getPublicUrl(path)
      setForm(p => ({ ...p, photo_url: publicUrl }))
    } else {
      alert('Erreur upload : ' + error.message)
    }
    setUploading(false)
  }

  function isVideo(url: string) { return /\.(mp4|webm|mov)(\?|$)/i.test(url) }

  async function saveActu() {
    if (!form.date_debut || !form.date_fin || !form.slot) return
    if (form.date_debut > form.date_fin) { alert('La date de début doit être avant la date de fin.'); return }
    if (conflict) return
    setSaving(true)
    const payload = {
      slot: form.slot, titre: form.titre || '', texte: form.texte || '',
      photo_url: form.photo_url || '', date_debut: form.date_debut,
      date_fin: form.date_fin, actif: true,
    }
    if (editId) { await supabase.from('actus').update(payload).eq('id', editId) }
    else { await supabase.from('actus').insert(payload) }
    setSaving(false); setShowModal(false); loadAll()
  }

  async function deleteActu(id: string) {
    if (!confirm('Supprimer cette actu ?')) return
    await supabase.from('actus').delete().eq('id', id)
    setActus(prev => prev.filter(a => a.id !== id))
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  const actusFiltrees = actus.filter(a =>
    filterStatut === 'tous' || getStatut(a) === filterStatut
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🗞️</div>
        <p className="font-black text-[#1A1040]">Chargement des actus...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-candy">

      {/* ── HEADER ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              <Newspaper className="w-7 h-7 text-[#1A1040]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
                🔐 Espace administrateur
              </div>
              <h1 className="font-serif text-3xl font-black text-white">
                Actu du moment <span className="text-citron-400">✦</span>
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {maxSlot} polaroïd{maxSlot > 1 ? 's' : ''} —{' '}
                {slots.filter(s => isSlotVisible(s)).length} visible{slots.filter(s => isSlotVisible(s)).length > 1 ? 's' : ''} sur le site
              </p>
            </div>
          </div>
          <button onClick={() => openCreate(1)}
            className="ml-auto flex items-center gap-2 bg-citron-400 text-[#1A1040] px-5 py-2.5 rounded-xl font-black border-2 border-[#1A1040] hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
            <Plus className="w-4 h-4" /> Nouvelle actu
          </button>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">

        {/* ── TAILLE DES POLAROÏDS ── */}
        <div className="bg-white rounded-2xl border-2 border-[#1A1040] px-5 py-4 space-y-4"
          style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>

          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-[#1A1040] shrink-0">📐 Taille des polaroïds</span>
            <input type="range" min={160} max={420} step={10} value={polaroidSize}
              onChange={e => changePolaroidSize(parseInt(e.target.value))}
              className="flex-1" />
            <span className="text-sm font-black text-[#1A1040] w-16 text-right shrink-0">{polaroidSize}px</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t-2 border-dashed border-gray-200">
            {/* Style Titre */}
            <div>
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">✏️ Titre</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={titreFont} onChange={e => { setTitreFont(e.target.value); saveSetting('actu_card_titre_font', e.target.value) }}
                  className="border-2 border-[#1A1040] rounded-lg px-1 py-1.5 text-xs font-bold bg-white">
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input type="number" min={10} max={48} value={titreSize}
                  onChange={e => { const v = parseInt(e.target.value) || 18; setTitreSize(v); saveSetting('actu_card_titre_size', String(v)) }}
                  title="Taille (px)"
                  className="border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs font-bold" />
                <input type="color" value={titreColor}
                  onChange={e => { setTitreColor(e.target.value); saveSetting('actu_card_titre_color', e.target.value) }}
                  className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
            </div>

            {/* Style Texte */}
            <div>
              <p className="text-xs font-black text-[#1A1040] uppercase tracking-wide mb-2">📝 Texte</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={texteFont} onChange={e => { setTexteFont(e.target.value); saveSetting('actu_card_texte_font', e.target.value) }}
                  className="border-2 border-[#1A1040] rounded-lg px-1 py-1.5 text-xs font-bold bg-white">
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input type="number" min={8} max={32} value={texteSize}
                  onChange={e => { const v = parseInt(e.target.value) || 13; setTexteSize(v); saveSetting('actu_card_texte_size', String(v)) }}
                  title="Taille (px)"
                  className="border-2 border-[#1A1040] rounded-lg px-2 py-1.5 text-xs font-bold" />
                <input type="color" value={texteColor}
                  onChange={e => { setTexteColor(e.target.value); saveSetting('actu_card_texte_color', e.target.value) }}
                  className="w-full h-8 border-2 border-[#1A1040] rounded-lg cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTRES ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-black text-[#1A1040]">Afficher :</span>
          {[
            { value: 'tous',   label: 'Toutes',         style: 'bg-[#1A1040] text-white' },
            { value: 'actif',  label: '🟢 Actives',     style: 'bg-lime-300 text-[#1A1040]' },
            { value: 'avenir', label: '🔵 Programmées', style: 'bg-blue-500 text-white' },
            { value: 'passe',  label: '⚫ Passées',      style: 'bg-gray-500 text-white' },
          ].map(({ value, label, style }) => (
            <button key={value} onClick={() => setFilterStatut(value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black border-2 border-[#1A1040] transition-all ${
                filterStatut === value ? style : 'bg-white text-[#1A1040] hover:bg-candy'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── SLOTS ── */}
        {slots.map(slot => {
          const slotActus = actusFiltrees.filter(a => a.slot === slot)
          const isOpen = !collapsed[slot]
          const visible = isSlotVisible(slot)
          const color = slotColor(slot)

          return (
            <div key={slot} className="bg-white rounded-3xl border-4 border-[#1A1040] overflow-hidden"
              style={{ boxShadow: visible ? '5px 5px 0px 0px #ffb5c8' : '5px 5px 0px 0px #d1d5db' }}>

              {/* En-tête */}
              <div className={`flex items-center gap-3 px-6 py-4 border-b-2 border-[#1A1040] ${!visible ? 'opacity-60' : ''}`}>

                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center font-black text-lg border-2 border-[#1A1040] shrink-0`}>
                  {slot}
                </div>

                <div className="flex-1 cursor-pointer" onClick={() => setCollapsed(p => ({ ...p, [slot]: !p[slot] }))}>
                  <h2 className="font-black text-[#1A1040] flex items-center gap-2">
                    Polaroïd {slot}
                    {!visible && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Masqué du site</span>}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {actus.filter(a => a.slot === slot).length} actu{actus.filter(a => a.slot === slot).length !== 1 ? 's' : ''} programmée{actus.filter(a => a.slot === slot).length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Toggle visible / masqué */}
                <button
                  onClick={() => toggleSlot(slot, !visible)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] transition-all hover:-translate-y-0.5 ${
                    visible ? 'bg-lime-300 text-[#1A1040]' : 'bg-gray-200 text-gray-500'
                  }`}
                  title={visible ? 'Visible sur le site — cliquer pour masquer' : 'Masqué du site — cliquer pour afficher'}
                >
                  {visible ? '👁️' : '🙈'}
                  <span className="hidden sm:inline">{visible ? ' Visible' : ' Masqué'}</span>
                </button>

                {/* Ajouter actu */}
                <button onClick={() => openCreate(slot)}
                  className="flex items-center gap-1.5 bg-[#1A1040] text-citron-400 px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1A1040] hover:bg-[#2d2060] transition-colors">
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">Ajouter</span>
                </button>

                <button onClick={() => setCollapsed(p => ({ ...p, [slot]: !p[slot] }))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-[#1A1040]" /> : <ChevronDown className="w-5 h-5 text-[#1A1040]" />}
                </button>
              </div>

              {/* Liste actus */}
              {isOpen && (
                <div className="divide-y divide-gray-100">
                  {slotActus.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-3xl mb-2">📷</p>
                      <p className="text-sm font-bold">
                        {actus.filter(a => a.slot === slot).length === 0
                          ? 'Aucune actu pour ce polaroïd.'
                          : 'Aucun résultat pour ce filtre.'}
                      </p>
                    </div>
                  ) : slotActus.map(actu => {
                    const s = STATUT_STYLE[getStatut(actu)]
                    return (
                      <div key={actu.id} className="flex items-start gap-4 px-6 py-4 hover:bg-candy/50 transition-colors">
                        <div className="w-16 h-16 rounded-xl border-2 border-[#1A1040] overflow-hidden shrink-0 bg-gray-100">
                          {actu.photo_url
                            ? isVideo(actu.photo_url)
                              ? <video src={actu.photo_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                              : <img src={actu.photo_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.bg} ${s.text}`}>{s.label}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {fmtDate(actu.date_debut)} → {fmtDate(actu.date_fin)}
                            </span>
                          </div>
                          {actu.titre && <p className="font-black text-[#1A1040] text-sm truncate">{actu.titre}</p>}
                          {actu.texte && <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{actu.texte}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEdit(actu)}
                            className="w-8 h-8 bg-citron-400 rounded-lg flex items-center justify-center border-2 border-[#1A1040] hover:bg-citron-300 transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-[#1A1040]" />
                          </button>
                          <button onClick={() => deleteActu(actu.id)}
                            className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center border-2 border-red-300 hover:bg-red-200 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* ── BOUTON AJOUTER POLAROÏD ── */}
        <button onClick={addPolaroid}
          className="w-full flex items-center justify-center gap-3 border-4 border-dashed border-[#1A1040] rounded-3xl py-6 font-black text-[#1A1040] hover:bg-white/60 hover:-translate-y-0.5 transition-all">
          <Plus className="w-6 h-6" />
          Ajouter un polaroïd {maxSlot + 1}
        </button>

        {/* ── PLANNING ── */}
        <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden"
          style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
          <div className="px-6 py-4 border-b-2 border-[#1A1040] bg-[#1A1040]">
            <h3 className="font-black text-white">📅 Planning des 3 prochains mois</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-candy border-b-2 border-[#1A1040]">
                  {['Slot', 'Titre', 'Début', 'Fin', 'Statut', 'Visibilité'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-[#1A1040] uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const today = new Date().toISOString().split('T')[0]
                  const tm = new Date(); tm.setMonth(tm.getMonth() + 3)
                  const filtered = actus
                    .filter(a => a.date_fin >= today && a.date_debut <= tm.toISOString().split('T')[0])
                    .sort((a, b) => a.slot - b.slot || a.date_debut.localeCompare(b.date_debut))
                  if (!filtered.length) return (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold text-sm">
                      Aucune actu à venir. Cliquez sur "+ Ajouter" pour en programmer une.
                    </td></tr>
                  )
                  return filtered.map((actu, idx) => {
                    const s = STATUT_STYLE[getStatut(actu)]
                    return (
                      <tr key={actu.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-candy/40'}`}>
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 ${slotColor(actu.slot)} rounded-lg inline-flex items-center justify-center font-black text-sm border-2 border-[#1A1040]`}>
                            {actu.slot}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1A1040]">{actu.titre || <span className="text-gray-400 italic">Sans titre</span>}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(actu.date_debut)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(actu.date_fin)}</td>
                        <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-black ${s.bg} ${s.text}`}>{s.label}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${isSlotVisible(actu.slot) ? 'bg-lime-100 text-lime-700' : 'bg-gray-100 text-gray-500'}`}>
                            {isSlotVisible(actu.slot) ? '👁️ Visible' : '🙈 Masqué'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1040]/70 p-4">
          <div className="bg-white rounded-3xl border-4 border-[#1A1040] w-full max-w-lg overflow-hidden"
            style={{ boxShadow: '8px 8px 0px 0px #1A1040' }}>

            <div className="bg-[#1A1040] px-6 py-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-black text-citron-400">
                {editId ? '✏️ Modifier l\'actu' : '✨ Nouvelle actu'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

              {/* Choix slot */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Polaroïd</label>
                <div className="flex gap-2 flex-wrap">
                  {slots.map(s => (
                    <button key={s} onClick={() => setForm(p => ({ ...p, slot: s }))}
                      className={`flex-1 min-w-[3.5rem] py-2.5 rounded-xl font-black text-sm border-2 transition-all ${
                        form.slot === s ? `${slotColor(s)} border-[#1A1040] text-[#1A1040]` : 'bg-white border-[#1A1040] text-[#1A1040] hover:bg-candy'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plages occupées */}
              {occupiedRanges.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-black text-blue-700 mb-2">📅 Dates déjà occupées pour ce polaroïd :</p>
                  <div className="space-y-1">
                    {occupiedRanges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <span className="font-bold">{r.titre}</span>
                        <span className="text-blue-400">— du {fmtDate(r.debut)} au {fmtDate(r.fin)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">Date début</label>
                  <input type="date" value={form.date_debut || ''}
                    onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))}
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-bold text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400 ${conflict ? 'border-red-400 bg-red-50' : 'border-[#1A1040]'}`} />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">Date fin</label>
                  <input type="date" value={form.date_fin || ''} min={form.date_debut}
                    onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))}
                    className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-bold text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400 ${conflict ? 'border-red-400 bg-red-50' : 'border-[#1A1040]'}`} />
                </div>
              </div>

              {/* Alerte conflit */}
              {conflict && (
                <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-700 text-xs font-black">⛔ Conflit de dates !</p>
                    <p className="text-red-600 text-xs mt-0.5">
                      <strong>"{conflict.titre || 'Sans titre'}"</strong> occupe déjà ce polaroïd du{' '}
                      <strong>{fmtDate(conflict.date_debut)}</strong> au <strong>{fmtDate(conflict.date_fin)}</strong>.
                    </p>
                    <p className="text-red-500 text-xs mt-1">Choisissez des dates sans chevauchement.</p>
                  </div>
                </div>
              )}

              {/* Photo */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-2 uppercase tracking-wide">Photo / Vidéo</label>
                <div className="flex gap-3 items-start">
                  {form.photo_url && (
                    <div className="relative shrink-0">
                      {isVideo(form.photo_url)
                        ? <video src={form.photo_url} className="w-20 h-20 object-cover rounded-xl border-2 border-[#1A1040]" muted autoPlay loop playsInline />
                        : <img src={form.photo_url} alt="" className="w-20 h-20 object-cover rounded-xl border-2 border-[#1A1040]" />}
                      <button onClick={() => setForm(p => ({ ...p, photo_url: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center border border-white">×</button>
                    </div>
                  )}
                  <label className={`flex-1 flex flex-col items-center gap-2 border-2 border-dashed border-[#1A1040] rounded-xl px-4 py-4 cursor-pointer hover:bg-candy transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    <Upload className="w-5 h-5 text-[#1A1040]" />
                    <span className="text-xs font-bold text-[#1A1040] text-center">
                      {uploading ? '⏳ Chargement...' : form.photo_url ? 'Changer le média' : 'Cliquer pour uploader'}
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, WebP, MP4 — max 50 Mo</span>
                    <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only"
                      onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]) }} />
                  </label>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">Titre</label>
                <input type="text" value={form.titre || ''} placeholder="Ex : Nouveau stage de broderie !"
                  onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm text-[#1A1040] focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>

              {/* Texte */}
              <div>
                <label className="block text-xs font-black text-[#1A1040] mb-1 uppercase tracking-wide">Texte</label>
                <textarea value={form.texte || ''} placeholder="Quelques lignes pour décrire l'actu…"
                  onChange={e => setForm(p => ({ ...p, texte: e.target.value }))}
                  rows={3}
                  className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2 text-sm text-[#1A1040] resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-1">
                <button onClick={saveActu} disabled={saving || uploading || !!conflict}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black border-2 transition-all ${
                    conflict ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-[#1A1040] text-citron-400 border-[#1A1040] hover:bg-[#2d2060]'
                  }`}
                  style={!conflict ? { boxShadow: '3px 3px 0px 0px #ffe500' } : {}}>
                  <Check className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : conflict ? 'Conflit de dates' : editId ? 'Enregistrer' : 'Publier l\'actu'}
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl font-black text-[#1A1040] bg-white border-2 border-[#1A1040] hover:bg-gray-100">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
