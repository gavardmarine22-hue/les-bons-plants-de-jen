import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, RefreshCw, Eye, EyeOff, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Tranche { max_g: number; prix: number }

const TRANCHES_DEFAUT: Tranche[] = [
  { max_g: 150,   prix: 3.50 },
  { max_g: 250,   prix: 3.80 },
  { max_g: 500,   prix: 4.20 },
  { max_g: 1000,  prix: 4.80 },
  { max_g: 2000,  prix: 5.50 },
  { max_g: 5000,  prix: 6.50 },
  { max_g: 10000, prix: 8.50 },
  { max_g: 20000, prix: 12.50 },
  { max_g: 30000, prix: 18.00 },
]

export default function MondialRelayManager() {
  const [enseigne,      setEnseigne]      = useState('')
  const [cleApi,        setCleApi]        = useState('')
  const [showCle,       setShowCle]       = useState(false)
  const [tranches,      setTranches]      = useState<Tranche[]>(TRANCHES_DEFAUT)
  const [collectInfo,   setCollectInfo]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('settings').select('key, value')
      .in('key', ['mondial_relay_code_enseigne', 'mondial_relay_cle_api', 'mondial_relay_tarifs', 'click_collect_info'])
    const map: Record<string, string> = {}
    data?.forEach(r => { map[r.key] = r.value || '' })
    if (map['mondial_relay_code_enseigne']) setEnseigne(map['mondial_relay_code_enseigne'])
    if (map['mondial_relay_cle_api'])       setCleApi(map['mondial_relay_cle_api'])
    if (map['mondial_relay_tarifs']) {
      try { setTranches(JSON.parse(map['mondial_relay_tarifs'])) } catch { /* keep default */ }
    }
    if (map['click_collect_info']) setCollectInfo(map['click_collect_info'])
    setLoading(false)
  }

  function updateTranche(i: number, field: keyof Tranche, val: string) {
    setTranches(prev => prev.map((t, j) => j === i ? { ...t, [field]: parseFloat(val) || 0 } : t))
  }

  function addTranche() {
    const last = tranches[tranches.length - 1]
    setTranches(prev => [...prev, { max_g: (last?.max_g || 0) + 5000, prix: 0 }])
  }

  function removeTranche(i: number) {
    setTranches(prev => prev.filter((_, j) => j !== i))
  }

  async function save() {
    setSaving(true)
    const tranchesTriees = [...tranches].sort((a, b) => a.max_g - b.max_g)
    await supabase.from('settings').upsert([
      { key: 'mondial_relay_code_enseigne', value: enseigne },
      { key: 'mondial_relay_cle_api',       value: cleApi },
      { key: 'mondial_relay_tarifs',         value: JSON.stringify(tranchesTriees) },
      { key: 'click_collect_info',           value: collectInfo },
    ], { onConflict: 'key' })
    setTranches(tranchesTriees)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="py-4 text-center text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="space-y-6">

      {/* Identifiants */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wide">Identifiants Mondial Relay</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-1">Code enseigne</label>
            <input value={enseigne} onChange={e => setEnseigne(e.target.value)}
              placeholder="ex : BDTEST13"
              className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300 bg-candy" />
          </div>
          <div>
            <label className="block text-xs font-black text-[#1A1040] mb-1">Clé privée API</label>
            <div className="relative">
              <input
                type={showCle ? 'text' : 'password'}
                value={cleApi}
                onChange={e => setCleApi(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300 bg-candy"
              />
              <button type="button" onClick={() => setShowCle(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A1040]">
                {showCle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-4 py-3 text-xs text-orange-800 font-medium">
          💡 Ces identifiants sont utilisés pour l'intégration Mondial Relay (suivi, étiquettes). Ils sont disponibles dans votre espace Mondial Relay Pro.
        </div>
      </div>

      {/* Grille tarifaire */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-wide">Grille tarifaire (frais de port)</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Renseignez les prix de votre contrat Mondial Relay selon le poids du colis.</p>
          </div>
          <button onClick={addTranche}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-candy border-2 border-[#1A1040] rounded-xl text-xs font-black text-[#1A1040] hover:bg-orange-50 transition-all">
            <Plus className="w-3.5 h-3.5" /> Ajouter une tranche
          </button>
        </div>

        <div className="border-2 border-[#1A1040] rounded-2xl overflow-hidden">
          {/* En-tête */}
          <div className="bg-[#1A1040] px-4 py-2 grid grid-cols-12 gap-2 text-[11px] font-black text-white/70 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Poids max du colis</div>
            <div className="col-span-5">Prix (€ TTC)</div>
            <div className="col-span-1" />
          </div>

          {tranches.map((t, i) => (
            <div key={i} className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center border-b border-dashed border-[#1A1040]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-candy/40'}`}>
              <div className="col-span-1 text-[11px] font-black text-gray-400">{i + 1}</div>
              <div className="col-span-5 flex items-center gap-2">
                <input type="number" min="1" value={t.max_g} onChange={e => updateTranche(i, 'max_g', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-[#1A1040] focus:outline-none focus:border-[#1A1040]" />
                <span className="text-xs text-gray-400 font-bold shrink-0">g</span>
              </div>
              <div className="col-span-5 flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={t.prix} onChange={e => updateTranche(i, 'prix', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-[#1A1040] focus:outline-none focus:border-[#1A1040]" />
                <span className="text-xs text-gray-400 font-bold shrink-0">€</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeTranche(i)} disabled={tranches.length <= 1}
                  className="w-6 h-6 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 disabled:opacity-30 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 font-medium">
          <Package className="w-3.5 h-3.5 inline mr-1" />
          Les tranches sont classées par poids croissant. Le prix appliqué correspond à la première tranche dont le poids max est supérieur ou égal au poids total de la commande.
        </p>
      </div>

      {/* Infos Click & Collect */}
      <div className="space-y-2">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wide">🏪 Click & Collect — informations client</h4>
        <p className="text-[11px] text-gray-400">Ce texte est affiché au client lors du paiement et dans la confirmation de commande (adresse, horaires, etc.).</p>
        <textarea value={collectInfo} onChange={e => setCollectInfo(e.target.value)} rows={4}
          placeholder={"ex : Les plants de Jenni\n12 rue des Fleurs, 35000 Rennes\nRetrait du lundi au vendredi 10h–18h\nSur rendez-vous au 06 12 34 56 78"}
          className="w-full border-2 border-[#1A1040] rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-citron-400 bg-candy resize-none" />
      </div>

      {/* Bouton Enregistrer */}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm border-2 border-[#1A1040] transition-all disabled:opacity-60 ${saved ? 'bg-lime-300 text-[#1A1040]' : 'bg-[#1A1040] text-citron-400 hover:-translate-y-0.5'}`}
          style={{ boxShadow: '4px 4px 0px 0px #fed7aa' }}>
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement…</> : saved ? <><Check className="w-4 h-4" /> Enregistré !</> : '💾 Enregistrer'}
        </button>
      </div>
    </div>
  )
}
