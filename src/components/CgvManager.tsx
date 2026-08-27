import { useRef, useState, useEffect } from 'react'

import { Upload, FileText, Eye, Download, Trash2, RefreshCw, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SETTING_KEY = 'cgv_url'
const BUCKET      = 'documents'
const FILENAME    = 'cgv.pdf'

export default function CgvManager() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [cgvUrl,     setCgvUrl]     = useState<string | null>(null)
  const [uploading,  setUploading]  = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')
  const [saved,      setSaved]      = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('settings').select('value').eq('key', SETTING_KEY).single()
    setCgvUrl(data?.value || null)
  }

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') { setUploadErr('Seuls les fichiers PDF sont acceptés.'); return }
    setUploading(true)
    setUploadErr('')

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(FILENAME, file, {
      upsert: true, contentType: 'application/pdf',
    })
    if (upErr) { setUploadErr('Erreur upload : ' + upErr.message); setUploading(false); return }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(FILENAME)
    const url = data.publicUrl + '?t=' + Date.now()

    await supabase.from('settings').upsert({ key: SETTING_KEY, value: url }, { onConflict: 'key' })
    setCgvUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm('Supprimer les CGV ? Le client ne sera plus obligé de les accepter.')) return
    setDeleting(true)
    await supabase.storage.from(BUCKET).remove([FILENAME])
    await supabase.from('settings').delete().eq('key', SETTING_KEY)
    setCgvUrl(null)
    setDeleting(false)
  }

  return (
    <div className="space-y-4">

      {/* En-tête section */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-black text-[#1A1040] text-sm">Conditions Générales de Vente (CGV)</h3>
          <p className="text-[11px] text-gray-400 font-medium">
            PDF téléchargeable · Acceptation obligatoire avant validation du panier
          </p>
        </div>
      </div>

      {/* Fichier actuel */}
      {cgvUrl ? (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center border-2 border-[#1A1040] shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#1A1040] text-sm">CGV.pdf</p>
              <p className="text-[10px] text-purple-600 font-medium">En ligne · Visible par les clients</p>
            </div>
            {saved && (
              <div className="flex items-center gap-1 bg-lime-300 text-[#1A1040] text-[10px] font-black px-2 py-1 rounded-full border border-[#1A1040]">
                <Check className="w-3 h-3" /> Enregistré
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={cgvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-purple-300 bg-white text-purple-600 text-xs font-black hover:border-purple-500 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Consulter
            </a>
            <a
              href={cgvUrl}
              download="CGV.pdf"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-purple-300 bg-white text-purple-600 text-xs font-black hover:border-purple-500 transition-colors">
              <Download className="w-3.5 h-3.5" /> Télécharger
            </a>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-[#1A1040] bg-citron-400 text-[#1A1040] text-xs font-black hover:bg-citron-500 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Remplacer
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-9 flex items-center justify-center py-2 rounded-xl border-2 border-red-300 bg-white text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50">
              {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* Zone de dépôt si aucun fichier */
        <label
          className={`flex flex-col items-center gap-2 border-4 border-dashed rounded-2xl px-4 py-6 text-center cursor-pointer transition-all ${
            uploading
              ? 'border-gray-300 bg-gray-50 cursor-wait'
              : 'border-purple-300 bg-purple-50 hover:border-purple-500 hover:bg-purple-100'
          }`}
          onClick={() => !uploading && fileRef.current?.click()}>
          {uploading ? (
            <>
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="font-black text-purple-400 text-sm">Téléchargement en cours…</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center border-2 border-purple-300">
                <Upload className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="font-black text-[#1A1040] text-sm">Déposer vos CGV ici</p>
                <p className="text-gray-400 text-xs mt-0.5">PDF uniquement · Sera téléchargeable par vos clients</p>
              </div>
            </>
          )}
        </label>
      )}

      {/* Input caché */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {uploadErr && (
        <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          😬 {uploadErr}
        </p>
      )}

      {/* Info comportement */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5 space-y-1">
        <p className="text-[11px] font-black text-gray-500 uppercase tracking-wide">Comportement sur le site</p>
        <p className="text-[11px] text-gray-500">
          {cgvUrl
            ? '✅ Une case "J\'accepte les CGV" est affichée dans le panier — obligatoire avant confirmation.'
            : '⬜ Aucun fichier CGV — la case d\'acceptation ne s\'affiche pas dans le panier.'}
        </p>
      </div>
    </div>
  )
}
