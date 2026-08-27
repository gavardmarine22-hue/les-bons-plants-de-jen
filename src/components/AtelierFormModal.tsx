import { useState, useEffect } from 'react'
import { X, Upload, CreditCard, Landmark, BookCheck, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Atelier } from '../types'

interface Props {
  atelier?: Atelier | null
  categoryId?: string | null
  onClose: () => void
  onSaved: () => void
}

const MODES_PAIEMENT = [
  { value: 'cb',       label: 'CB',        icon: CreditCard, desc: 'Carte bancaire' },
  { value: 'virement', label: 'Virement',  icon: Landmark,   desc: 'Virement bancaire' },
  { value: 'cheque',   label: 'Chèque',    icon: BookCheck,  desc: 'Sur place' },
  { value: 'especes',  label: 'Espèces',   icon: Banknote,   desc: 'Sur place' },
]

export const NIVEAUX = [
  { value: 'debutant',      label: 'Débutant',     dots: 1, color: '#4ade80' },
  { value: 'intermediaire', label: 'Intermédiaire', dots: 2, color: '#facc15' },
  { value: 'confirme',      label: 'Confirmé',     dots: 3, color: '#fb7185' },
] as const

const EMPTY_FORM = {
  titre: '', description: '', date: '', heure: '',
  duree: '', lieu: '', prix: '', compare_price: '', places_max: '',
  prix_type: 'personne' as 'personne' | 'duo',
  modes_paiement: ['cheque', 'especes'] as string[],
  age_min: '0', age_min_duo_p1: '0', age_min_duo_p2: '0',
  niveau: 'debutant' as 'debutant' | 'intermediaire' | 'confirme',
}

export default function AtelierFormModal({ atelier, categoryId, onClose, onSaved }: Props) {
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [priceMode,    setPriceMode]    = useState<'fixed' | 'percent'>('fixed')
  const [discountPct,  setDiscountPct]  = useState('')
  const isEdit = !!atelier

  const prixOriginal  = parseFloat(form.prix) || 0
  const pct           = parseFloat(discountPct) || 0
  const prixCalcule   = priceMode === 'percent' && prixOriginal > 0 && pct > 0
    ? Math.round(prixOriginal * (1 - pct / 100) * 100) / 100
    : null

  useEffect(() => {
    if (atelier) {
      setForm({
        titre:          atelier.titre,
        description:    atelier.description,
        date:           atelier.date,
        heure:          atelier.heure,
        duree:          atelier.duree,
        lieu:           atelier.lieu,
        prix:           String(atelier.prix),
        compare_price:  atelier.compare_price ? String(atelier.compare_price) : '',
        places_max:     String(atelier.places_max),
        prix_type:      atelier.prix_type ?? 'personne',
        modes_paiement: atelier.modes_paiement?.length ? atelier.modes_paiement : ['cheque', 'especes'],
        age_min:         String(atelier.age_min ?? 0),
        age_min_duo_p1:  String(atelier.age_min_duo_p1 ?? 0),
        age_min_duo_p2:  String(atelier.age_min_duo_p2 ?? 0),
        niveau:          atelier.niveau ?? 'debutant',
      })
      if (atelier.image_url) setImagePreview(atelier.image_url)
    }
  }, [atelier])

  function toggleMode(mode: string) {
    setForm(p => {
      const has = p.modes_paiement.includes(mode)
      if (has && p.modes_paiement.length === 1) return p // au moins 1 mode requis
      return { ...p, modes_paiement: has ? p.modes_paiement.filter(m => m !== mode) : [...p.modes_paiement, mode] }
    })
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let image_url = atelier?.image_url ?? null
      if (imageFile) {
        const ext      = imageFile.name.split('.').pop()
        const fileName = `ateliers/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('ateliers').upload(fileName, imageFile, { upsert: true })
        if (uploadError) throw uploadError
        image_url = supabase.storage.from('ateliers').getPublicUrl(fileName).data.publicUrl
      }

      let finalPrix: number
      let finalComparePrice: number | null
      if (priceMode === 'percent' && prixCalcule !== null) {
        finalPrix = prixCalcule
        finalComparePrice = prixOriginal
      } else {
        finalPrix = parseFloat(form.prix)
        finalComparePrice = form.compare_price ? parseFloat(form.compare_price) : null
      }

      const payload = {
        titre:            form.titre,
        description:      form.description,
        date:             form.date,
        heure:            form.heure,
        duree:            form.duree,
        lieu:             form.lieu,
        prix:             finalPrix,
        compare_price:    finalComparePrice,
        prix_type:        form.prix_type,
        places_max:       parseInt(form.places_max),
        places_restantes: parseInt(form.places_max),
        image_url,
        category_id:      categoryId ?? atelier?.category_id ?? null,
        modes_paiement:   form.modes_paiement,
        age_min:          parseInt(form.age_min) || 0,
        age_min_duo_p1:   parseInt(form.age_min_duo_p1) || 0,
        age_min_duo_p2:   parseInt(form.age_min_duo_p2) || 0,
        niveau:           form.niveau,
      }

      if (isEdit && atelier) {
        const { error } = await supabase.from('ateliers')
          .update({ ...payload, places_restantes: atelier.places_restantes })
          .eq('id', atelier.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ateliers').insert([payload])
        if (error) throw error
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-black text-[#1A1040] mb-1">{label}</label>
      <input
        required type={type} value={form[key] as string} placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl border-4 border-[#1A1040] shadow-pop w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-[#1A1040] bg-[#1A1040] rounded-t-3xl">
          <h2 className="font-serif text-xl font-black text-citron-400">
            {isEdit ? '✏️ Modifier l\'atelier' : '✨ Nouvel atelier'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm border-2 border-red-200 font-medium">
              😬 {error}
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1">📸 Photo de l'atelier</label>
            <div
              className="border-4 border-dashed border-[#1A1040] rounded-2xl p-4 text-center cursor-pointer hover:bg-rose-50 transition-colors"
              onClick={() => document.getElementById('image-input')?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="aperçu"
                  className="w-full h-40 object-cover rounded-xl border-2 border-[#1A1040]"
                  draggable={false} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl border-2 border-[#1A1040] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-rose-400" />
                  </div>
                  <span className="text-sm font-bold">Clique pour ajouter une photo</span>
                </div>
              )}
              <input id="image-input" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          {field('🏷️ Titre de l\'atelier', 'titre', 'text', 'Ex: Bracelet Macramé')}

          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1">📝 Description</label>
            <textarea
              required value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Décrivez l'atelier..."
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('📅 Date', 'date', 'date')}
            {field('🕐 Heure de début', 'heure', 'time')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('⏱️ Durée', 'duree', 'text', 'Ex: 2h30')}
            {field('📍 Lieu', 'lieu', 'text', 'Ex: 12 rue des Arts')}
          </div>

          {/* Prix — toggle Montant fixe / Pourcentage */}
          <div className="space-y-3">
            <div className="flex rounded-xl overflow-hidden border-2 border-[#1A1040] h-[38px]">
              {(['fixed', 'percent'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setPriceMode(mode)}
                  className={`flex-1 text-xs font-black transition-all ${
                    priceMode === mode ? 'bg-[#1A1040] text-citron-400' : 'bg-candy text-[#1A1040] hover:bg-rose-50'
                  }`}>
                  {mode === 'fixed' ? '💶 Montant fixe' : '🏷️ % de réduction'}
                </button>
              ))}
            </div>

            {priceMode === 'fixed' ? (
              <div className="grid grid-cols-2 gap-3">
                {field('💶 Prix actuel (€)', 'prix', 'number', '35')}
                <div>
                  <label className="block text-sm font-black text-[#1A1040] mb-1">Prix barré (€) <span className="text-gray-400 font-normal text-xs">optionnel</span></label>
                  <input type="number" min="0" step="0.01" value={form.compare_price} placeholder="Ex: 45"
                    onChange={e => setForm(p => ({ ...p, compare_price: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy" />
                  <p className="text-[10px] text-gray-400 mt-1">Laisse vide si pas de réduction</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  {field('💶 Prix original (€)', 'prix', 'number', '45')}
                  <div>
                    <label className="block text-sm font-black text-[#1A1040] mb-1">% de réduction</label>
                    <input type="number" min="1" max="99" step="1" value={discountPct} placeholder="Ex: 20"
                      onChange={e => setDiscountPct(e.target.value)}
                      className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy" />
                  </div>
                </div>
                {prixCalcule !== null && (
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-black text-gray-500 line-through">{prixOriginal.toFixed(2)}€</span>
                    <span className="text-xs font-black text-rose-500">-{pct}%</span>
                    <span className="text-base font-black text-[#1A1040]">→ {prixCalcule.toFixed(2)}€</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-1">👤 Prix par</label>
            <div className="flex rounded-xl overflow-hidden border-2 border-[#1A1040] h-[42px]">
              {(['personne', 'duo'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => setForm(p => ({ ...p, prix_type: type }))}
                  className={`flex-1 text-sm font-black transition-all ${
                    form.prix_type === type
                      ? 'bg-[#1A1040] text-citron-400'
                      : 'bg-candy text-[#1A1040] hover:bg-rose-50'
                  }`}>
                  {type === 'personne' ? '👤 Par personne' : '👥 Par duo'}
                </button>
              ))}
            </div>
          </div>

          {field('👥 Nb de places', 'places_max', 'number', '8')}

          {/* Âge minimum */}
          {form.prix_type === 'personne' ? (
            <div>
              <label className="block text-sm font-black text-[#1A1040] mb-1">🔞 Âge minimum</label>
              <input type="number" min="0" max="120" value={form.age_min}
                onChange={e => setForm(p => ({ ...p, age_min: e.target.value }))}
                placeholder="0 = aucune limite"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy" />
              <p className="text-[10px] text-gray-400 mt-1">0 = aucune limite d'âge</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-black text-[#1A1040] mb-1">🔞 Âge minimum (duo)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Participant 1</label>
                  <input type="number" min="0" max="120" value={form.age_min_duo_p1}
                    onChange={e => setForm(p => ({ ...p, age_min_duo_p1: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">Participant 2</label>
                  <input type="number" min="0" max="120" value={form.age_min_duo_p2}
                    onChange={e => setForm(p => ({ ...p, age_min_duo_p2: e.target.value }))}
                    className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-candy" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">0 = aucune limite d'âge pour ce participant</p>
            </div>
          )}

          {/* Niveau de difficulté */}
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-2">🎯 Niveau de difficulté</label>
            <div className="grid grid-cols-3 gap-2">
              {NIVEAUX.map(n => (
                <button key={n.value} type="button"
                  onClick={() => setForm(p => ({ ...p, niveau: n.value }))}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all ${
                    form.niveau === n.value
                      ? 'bg-[#1A1040] text-white border-[#1A1040]'
                      : 'bg-candy text-[#1A1040] border-gray-200 hover:border-[#1A1040]'
                  }`}>
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: i < n.dots ? n.color : '#d1d5db' }} />
                    ))}
                  </div>
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modes de paiement */}
          <div>
            <label className="block text-sm font-black text-[#1A1040] mb-2">
              💳 Modes de règlement acceptés
              <span className="text-gray-400 font-normal text-xs ml-1">(au moins 1)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODES_PAIEMENT.map(({ value, label, icon: Icon, desc }) => {
                const active = form.modes_paiement.includes(value)
                return (
                  <button key={value} type="button" onClick={() => toggleMode(value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-sm font-black ${
                      active
                        ? 'bg-[#1A1040] text-citron-400 border-[#1A1040]'
                        : 'bg-candy text-[#1A1040] border-gray-200 hover:border-[#1A1040]'
                    }`}>
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-citron-400' : 'text-gray-400'}`} />
                    <div>
                      <div>{label}</div>
                      <div className={`text-[10px] font-medium ${active ? 'text-white/60' : 'text-gray-400'}`}>{desc}</div>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                      active ? 'bg-citron-400 border-citron-400' : 'border-gray-300'
                    }`}>
                      {active && <span className="text-[#1A1040] text-xs font-black leading-none">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border-2 border-[#1A1040] text-[#1A1040] py-3 rounded-2xl font-black text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1A1040] text-citron-400 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] hover:bg-[#2d2060] hover:-translate-y-0.5 transition-all disabled:opacity-60"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              {loading ? '⏳ Enregistrement...' : isEdit ? '✅ Modifier' : '🚀 Créer l\'atelier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
