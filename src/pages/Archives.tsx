import { useState, useEffect } from 'react'
import { Archive, TrendingUp, Users, Euro, Calendar, ChevronDown, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { downloadCSV } from '../lib/csv'

// ─── Types ─────────────────────────────────────────────────────────────────
interface ArchiveAnnuelle {
  id: string
  annee: number
  total_reservations: number
  total_paye: number
  total_annule: number
  total_en_attente: number
  ca_ht: number
  ca_mensuel: Record<string, number>
  taux_remplissage: number
  total_places: number
  total_inscrits: number
  details_ateliers: DetailAtelier[]
  created_at: string
}

interface DetailAtelier {
  id: string
  titre: string
  date: string
  heure: string
  lieu: string
  prix: number
  places_max: number
  total_inscrits: number
  total_paye: number
  ca: number
  taux_remplissage: number
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MOIS_COURT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// ─── Page Archives ──────────────────────────────────────────────────────────
export default function Archives() {
  const [archives, setArchives]   = useState<ArchiveAnnuelle[]>([])
  const [loading, setLoading]     = useState(true)
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    loadArchives()
  }, [])

  async function loadArchives() {
    setLoading(true)
    const { data } = await supabase
      .from('archives_annuelles')
      .select('*')
      .order('annee', { ascending: false })

    if (data && data.length > 0) {
      setArchives(data as ArchiveAnnuelle[])
      setAnneeSelectionnee(data[0].annee)
    }
    setLoading(false)
  }

  const archiveCourante = archives.find(a => a.annee === anneeSelectionnee)

  // ── Exports CSV ──────────────────────────────────────────────────────────
  function exportAteliersCSV() {
    if (!archiveCourante) return
    const headers = [
      'Atelier', 'Date', 'Heure', 'Lieu', 'Prix HT (€)',
      'Places max', 'Inscrits', 'Payés',
      'Taux de remplissage (%)', 'CA HT (€)',
    ]
    const rows = archiveCourante.details_ateliers.map(a => [
      a.titre,
      new Date(a.date).toLocaleDateString('fr-FR'),
      a.heure,
      a.lieu,
      a.prix,
      a.places_max,
      a.total_inscrits,
      a.total_paye,
      a.taux_remplissage,
      a.ca,
    ])
    // Ligne de totaux
    rows.push([
      'TOTAL',
      '', '', '', '',
      archiveCourante.total_places,
      archiveCourante.total_inscrits,
      archiveCourante.total_paye,
      archiveCourante.taux_remplissage,
      archiveCourante.ca_ht,
    ])
    downloadCSV(`archives_ateliers_${archiveCourante.annee}.csv`, headers, rows)
  }

  function exportCAMensuelCSV() {
    if (!archiveCourante) return
    const headers = ['Mois', 'CA HT (€)']
    const rows = MOIS_FR.map((mois, idx) => [mois, caParMois[idx]])
    downloadCSV(`archives_ca_mensuel_${archiveCourante.annee}.csv`, headers, rows)
  }

  function exportStatsCSV() {
    if (!archiveCourante) return
    const headers = ['Indicateur', 'Valeur']
    const rows = [
      ['Année', archiveCourante.annee],
      ['Total réservations', archiveCourante.total_reservations],
      ['Paiements OK', archiveCourante.total_paye],
      ['En attente', archiveCourante.total_en_attente],
      ['Annulés', archiveCourante.total_annule],
      ['Total places', archiveCourante.total_places],
      ['Total inscrits (hors annulés)', archiveCourante.total_inscrits],
      ['Taux de remplissage (%)', archiveCourante.taux_remplissage],
      ['CA annuel HT (€)', archiveCourante.ca_ht],
    ]
    downloadCSV(`archives_stats_${archiveCourante.annee}.csv`, headers, rows)
  }

  // CA mensuel sous forme de tableau 12 cases
  const caParMois: number[] = Array(12).fill(0)
  if (archiveCourante?.ca_mensuel) {
    Object.entries(archiveCourante.ca_mensuel).forEach(([mois, ca]) => {
      const idx = parseInt(mois) - 1
      if (idx >= 0 && idx < 12) caParMois[idx] = ca
    })
  }
  const maxCA = Math.max(...caParMois, 1)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-candy">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">📁</div>
        <p className="font-black text-[#1A1040]">Chargement des archives...</p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 bg-candy">

      {/* ── HEADER ── */}
      <section className="bg-[#1A1040] py-10 px-4 border-b-4 border-[#1A1040]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-citron-400 rounded-2xl flex items-center justify-center border-2 border-citron-300"
              style={{ boxShadow: '3px 3px 0px 0px #ffb5c8' }}>
              <Archive className="w-7 h-7 text-[#1A1040]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-400/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/30 mb-1">
                🔐 Espace administrateur
              </div>
              <h1 className="font-serif text-3xl font-black text-white">
                Archives <span className="text-citron-400">✦</span>
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">Historique annuel des réservations et du chiffre d'affaires</p>
            </div>
          </div>

          {/* Boutons export CSV */}
          {archiveCourante && (
            <div className="flex items-center gap-1 bg-white/10 rounded-xl border border-white/20 overflow-hidden">
              <span className="pl-3 text-white/50 text-xs font-bold hidden sm:block">CSV</span>
              <button
                onClick={exportAteliersCSV}
                title="Exporter les ateliers en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Ateliers
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={exportCAMensuelCSV}
                title="Exporter le CA mensuel en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> CA mensuel
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={exportStatsCSV}
                title="Exporter les statistiques en CSV"
                className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-white/10 transition-colors text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Stats
              </button>
            </div>
          )}

          {/* Sélecteur d'année */}
          {archives.length > 0 && (
            <div className="ml-auto relative">
              <button
                onClick={() => setDropdownOpen(d => !d)}
                className="flex items-center gap-3 bg-white/10 text-white px-5 py-3 rounded-xl font-black border border-white/20 hover:bg-white/20 transition-colors min-w-[160px] justify-between"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-citron-400" />
                  {anneeSelectionnee ?? '—'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border-2 border-[#1A1040] rounded-xl overflow-hidden z-20 min-w-[160px]"
                  style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                  {archives.map(a => (
                    <button
                      key={a.annee}
                      onClick={() => { setAnneeSelectionnee(a.annee); setDropdownOpen(false) }}
                      className={`w-full px-5 py-3 text-sm font-black text-left transition-colors flex items-center justify-between ${
                        a.annee === anneeSelectionnee
                          ? 'bg-[#1A1040] text-citron-400'
                          : 'text-[#1A1040] hover:bg-candy'
                      }`}
                    >
                      <span>📁 {a.annee}</span>
                      {a.annee === anneeSelectionnee && <span className="text-xs">◀</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* ── AUCUNE ARCHIVE ── */}
        {archives.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border-4 border-[#1A1040]"
            style={{ boxShadow: '5px 5px 0px 0px #ffb5c8' }}>
            <div className="text-6xl mb-4">📁</div>
            <p className="font-black text-[#1A1040] text-xl">Aucune archive disponible.</p>
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              Les données de fin d'année s'archivent automatiquement depuis le Tableau de bord.
            </p>
          </div>
        )}

        {/* ── CONTENU DE L'ARCHIVE ── */}
        {archiveCourante && (
          <>
            {/* Titre de l'année */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A1040] rounded-xl flex items-center justify-center border-2 border-[#1A1040]">
                <Archive className="w-5 h-5 text-citron-400" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-black text-[#1A1040]">
                  Année {archiveCourante.annee}
                </h2>
                <p className="text-xs text-gray-500">
                  Archivé le {new Date(archiveCourante.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* ── STATS ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-turquoise-400 rounded-2xl p-5 border-2 border-[#1A1040] text-[#1A1040]"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">Réservations</span>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-3xl font-black">{archiveCourante.total_reservations}</div>
                <div className="text-[10px] font-bold opacity-60 mt-1">
                  {archiveCourante.total_paye} payées · {archiveCourante.total_annule} annulées
                </div>
              </div>

              <div className="bg-citron-400 rounded-2xl p-5 border-2 border-[#1A1040] text-[#1A1040]"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">Remplissage</span>
                  <span className="text-lg">🎯</span>
                </div>
                <div className="text-3xl font-black">{archiveCourante.taux_remplissage}%</div>
                <div className="mt-2 h-1.5 bg-[#1A1040]/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1A1040] rounded-full"
                    style={{ width: `${archiveCourante.taux_remplissage}%` }} />
                </div>
                <div className="text-[10px] font-bold opacity-60 mt-1">
                  {archiveCourante.total_inscrits}/{archiveCourante.total_places} places
                </div>
              </div>

              <div className="bg-lime-300 rounded-2xl p-5 border-2 border-[#1A1040] text-[#1A1040]"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">Paiements OK</span>
                  <span className="text-lg">✅</span>
                </div>
                <div className="text-3xl font-black">{archiveCourante.total_paye}</div>
              </div>

              <div className="bg-red-400 rounded-2xl p-5 border-2 border-[#1A1040] text-white"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">En attente</span>
                  <span className="text-lg">🔴</span>
                </div>
                <div className="text-3xl font-black">{archiveCourante.total_en_attente}</div>
              </div>

              <div className="bg-rose-400 rounded-2xl p-5 border-2 border-[#1A1040] text-white"
                style={{ boxShadow: '3px 3px 0px 0px #1A1040' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">CA annuel HT</span>
                  <Euro className="w-5 h-5" />
                </div>
                <div className="text-3xl font-black">{archiveCourante.ca_ht.toLocaleString('fr-FR')} €</div>
                <div className="text-[10px] font-bold opacity-70 mt-1">Hors taxes</div>
              </div>
            </div>

            {/* ── GRAPHIQUE CA MENSUEL ── */}
            <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden"
              style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
              <div className="px-6 py-4 border-b-2 border-[#1A1040] flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#1A1040] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    CA HT mensuel — {archiveCourante.annee}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Chiffre d'affaires encaissé mois par mois (hors taxes)</p>
                </div>
                <span className="text-xs bg-rose-100 text-rose-600 font-black px-3 py-1 rounded-full border border-rose-200">
                  Total : {archiveCourante.ca_ht.toLocaleString('fr-FR')} € HT
                </span>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-end gap-1.5 h-40">
                  {caParMois.map((ca, idx) => {
                    const hauteur  = Math.max(4, Math.round((ca / maxCA) * 100))
                    const estVide  = ca === 0
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {!estVide && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1A1040] text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {ca.toLocaleString('fr-FR')} €
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            estVide ? 'bg-gray-100 border border-gray-200' : 'bg-rose-400 group-hover:bg-rose-500'
                          }`}
                          style={{ height: `${hauteur}%`, minHeight: '6px' }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {MOIS_COURT.map((mois, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <span className="text-[10px] font-black text-gray-400">{mois}</span>
                      {caParMois[idx] > 0 && (
                        <div className="text-[9px] text-gray-400 font-bold truncate">
                          {caParMois[idx] >= 1000 ? `${(caParMois[idx] / 1000).toFixed(1)}k` : caParMois[idx]}€
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tableau récap mensuel */}
              <div className="border-t-2 border-[#1A1040] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-candy">
                      {MOIS_FR.map(m => (
                        <th key={m} className="px-3 py-2 text-center text-[10px] font-black text-[#1A1040] uppercase tracking-wide whitespace-nowrap border-r border-gray-200 last:border-r-0">
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {caParMois.map((ca, idx) => (
                        <td key={idx} className="px-3 py-3 text-center font-black border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                          {ca > 0
                            ? <span className="text-rose-600">{ca.toLocaleString('fr-FR')} €</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── DÉTAIL DES ATELIERS ── */}
            {archiveCourante.details_ateliers.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-[#1A1040] overflow-hidden"
                style={{ boxShadow: '4px 4px 0px 0px #1A1040' }}>
                <div className="px-6 py-4 border-b-2 border-[#1A1040] bg-[#1A1040]">
                  <h3 className="font-black text-white flex items-center gap-2">
                    🎨 Ateliers de {archiveCourante.annee}
                    <span className="text-citron-400 text-sm ml-1">({archiveCourante.details_ateliers.length} atelier{archiveCourante.details_ateliers.length > 1 ? 's' : ''})</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-candy border-b-2 border-[#1A1040]">
                        {['Atelier','Date','Lieu','Prix','Inscrits','Payés','Taux remplissage','CA HT'].map(col => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-black text-[#1A1040] uppercase tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {archiveCourante.details_ateliers.map((a, idx) => (
                        <tr key={a.id}
                          className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-candy/40'}`}>
                          <td className="px-4 py-3 font-black text-[#1A1040] whitespace-nowrap">
                            🎨 {a.titre}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {new Date(a.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            <span className="text-gray-400 ml-1 text-xs">· {a.heure}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.lieu || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.prix} €</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-[#1A1040]">{a.total_inscrits}</span>
                            <span className="text-gray-400">/{a.places_max}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-lime-100 text-lime-700 border border-lime-300">
                              ✅ {a.total_paye}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${a.taux_remplissage >= 80 ? 'bg-lime-400' : a.taux_remplissage >= 50 ? 'bg-citron-400' : 'bg-red-400'}`}
                                  style={{ width: `${a.taux_remplissage}%` }}
                                />
                              </div>
                              <span className="font-black text-[#1A1040] text-xs">{a.taux_remplissage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-black text-rose-600">{a.ca.toLocaleString('fr-FR')} € HT</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Total */}
                    <tfoot>
                      <tr className="bg-[#1A1040] border-t-2 border-[#1A1040]">
                        <td colSpan={4} className="px-4 py-3 text-white text-xs font-black">
                          TOTAL {archiveCourante.annee}
                        </td>
                        <td className="px-4 py-3 text-white font-black text-sm">
                          {archiveCourante.total_inscrits}
                          <span className="text-white/50">/{archiveCourante.total_places}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lime-400 font-black text-sm">{archiveCourante.total_paye} payés</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-citron-400 font-black text-sm">{archiveCourante.taux_remplissage}% moyen</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-rose-300 font-black text-sm">{archiveCourante.ca_ht.toLocaleString('fr-FR')} € HT</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
