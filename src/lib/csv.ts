/**
 * Génère et télécharge un fichier CSV.
 * - Séparateur ";" (compatible Excel FR)
 * - BOM UTF-8 pour les accents
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }

  const lines = [
    headers.map(escape).join(';'),
    ...rows.map(row => row.map(escape).join(';')),
  ].join('\r\n')

  const BOM = '\uFEFF' // UTF-8 BOM pour Excel
  const blob = new Blob([BOM + lines], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
