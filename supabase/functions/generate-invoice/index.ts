import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Infos légales vendeur ─────────────────────────────────────────────────
const VENDEUR = {
  nom:    "Les plants de Jenni",
  adresse: '7 Rue du Pré aux Clercs',
  cp_ville: '44260 Prinquiau',
  siret:  '[SIRET à compléter]',
  statut: 'Micro-entrepreneur',
  tva:    'TVA non applicable, art. 293 B du CGI',
}

// ─── Formatage date ────────────────────────────────────────────────────────
function formatDateFR(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── HTML Facture / Avoir ─────────────────────────────────────────────────
function buildInvoiceHtml(params: {
  numero:       string
  type:         'facture' | 'avoir'
  reference_facture?: string
  client_nom:   string
  client_prenom:string
  client_email: string
  client_telephone?: string
  description:  string
  quantite:     number
  prix_unitaire:number
  montant_total:number
  mode_paiement:string
  atelier_titre?:string
  atelier_date?: string
  created_at:   string
}): string {
  const isAvoir  = params.type === 'avoir'
  const docLabel = isAvoir ? 'AVOIR' : 'FACTURE'
  const dateDoc  = formatDateFR(params.created_at)
  const dateAtelier = params.atelier_date ? formatDateFR(params.atelier_date) : ''
  const modeLabel: Record<string, string> = {
    cb: 'Carte bancaire', virement: 'Virement bancaire',
    cheque: 'Chèque', especes: 'Espèces',
  }
  const modeStr = modeLabel[params.mode_paiement] || params.mode_paiement || '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${docLabel} ${params.numero}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1A1040; background: #f9f5f0; padding: 30px 20px; }
  .page { background: #fff; max-width: 740px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,16,64,.12); }
  /* Header */
  .hd { background: #1A1040; color: #fff; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .hd-brand h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .hd-brand p  { font-size: 12px; opacity: .65; margin-top: 4px; }
  .hd-doc { text-align: right; }
  .hd-doc .badge { display: inline-block; background: ${isAvoir ? '#f97316' : '#f9e547'}; color: #1A1040; font-size: 13px; font-weight: 900; padding: 4px 14px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 6px; }
  .hd-doc .numero { font-size: 20px; font-weight: 900; color: ${isAvoir ? '#fb923c' : '#f9e547'}; }
  .hd-doc .date-doc { font-size: 12px; opacity: .6; margin-top: 4px; }
  /* Corps */
  .body { padding: 36px 40px; }
  /* Parties */
  .parties { display: flex; gap: 24px; margin-bottom: 32px; }
  .partie { flex: 1; background: #f8f5f0; border-radius: 10px; padding: 18px 20px; }
  .partie h3 { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #9f8fb0; margin-bottom: 10px; }
  .partie p  { font-size: 13px; line-height: 1.7; }
  .partie .strong { font-weight: 900; font-size: 15px; }
  /* Référence avoir */
  .ref-avoir { background: #fff7ed; border: 2px solid #fdba74; border-radius: 8px; padding: 12px 18px; margin-bottom: 28px; font-size: 13px; }
  .ref-avoir strong { color: #ea580c; }
  /* Tableau */
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead tr { background: #1A1040; color: #fff; }
  thead th { padding: 10px 14px; font-size: 12px; font-weight: 700; text-align: left; }
  thead th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #e8e2d8; }
  tbody td { padding: 12px 14px; font-size: 13px; }
  tbody td:last-child { text-align: right; font-weight: 700; }
  tbody tr:hover { background: #fdfaf6; }
  /* Totaux */
  .totaux { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totaux-inner { min-width: 280px; }
  .tot-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #e8e2d8; }
  .tot-line:last-child { border-bottom: none; padding-top: 10px; font-size: 17px; font-weight: 900; color: ${isAvoir ? '#ea580c' : '#1A1040'}; }
  /* Infos paiement */
  .paiement-block { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 12.5px; }
  .paiement-block.avoir { background: #fff7ed; border-color: #fdba74; }
  .paiement-block h4 { font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; color: ${isAvoir ? '#ea580c' : '#15803d'}; }
  /* Mentions légales */
  .mentions { background: #f3f0f8; border-radius: 8px; padding: 14px 18px; font-size: 11px; color: #6b7280; line-height: 1.7; }
  .mentions strong { color: #1A1040; display: block; margin-bottom: 4px; font-size: 11.5px; }
  /* Footer */
  .footer { background: #1A1040; color: rgba(255,255,255,.5); text-align: center; padding: 14px; font-size: 11px; }
</style>
</head>
<body>
<div class="page">

  <!-- En-tête -->
  <div class="hd">
    <div class="hd-brand">
      <h1>${VENDEUR.nom}</h1>
      <p>${VENDEUR.adresse}<br>${VENDEUR.cp_ville}</p>
      <p style="margin-top:6px">SIRET : ${VENDEUR.siret}</p>
    </div>
    <div class="hd-doc">
      <div class="badge">${docLabel}</div>
      <div class="numero">${params.numero}</div>
      <div class="date-doc">Émis le ${dateDoc}</div>
    </div>
  </div>

  <!-- Corps -->
  <div class="body">

    <!-- Vendeur / Client -->
    <div class="parties">
      <div class="partie">
        <h3>Vendeur</h3>
        <p class="strong">${VENDEUR.nom}</p>
        <p>${VENDEUR.adresse}<br>${VENDEUR.cp_ville}</p>
        <p style="margin-top:6px;font-size:11px;color:#9f8fb0">${VENDEUR.statut}</p>
      </div>
      <div class="partie">
        <h3>Client</h3>
        <p class="strong">${params.client_prenom} ${params.client_nom}</p>
        ${params.client_email ? `<p>${params.client_email}</p>` : ''}
        ${params.client_telephone ? `<p>${params.client_telephone}</p>` : ''}
      </div>
    </div>

    <!-- Référence avoir -->
    ${isAvoir && params.reference_facture ? `
    <div class="ref-avoir">
      <strong>Avoir sur facture N° ${params.reference_facture}</strong><br>
      Motif : Annulation de prestation par l'organisatrice.
    </div>` : ''}

    <!-- Tableau des prestations -->
    <table>
      <thead>
        <tr>
          <th>Description</th>
          ${dateAtelier ? '<th>Date</th>' : ''}
          <th style="text-align:center">Qté</th>
          <th style="text-align:right">Prix unit. HT</th>
          <th style="text-align:right">Total HT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${params.description}</td>
          ${dateAtelier ? `<td>${dateAtelier}</td>` : ''}
          <td style="text-align:center">${params.quantite}</td>
          <td style="text-align:right">${params.prix_unitaire.toFixed(2)} €</td>
          <td style="text-align:right">${params.montant_total.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>

    <!-- Totaux -->
    <div class="totaux">
      <div class="totaux-inner">
        <div class="tot-line"><span>Total HT</span><span>${params.montant_total.toFixed(2)} €</span></div>
        <div class="tot-line"><span>TVA (non applicable)</span><span>0,00 €</span></div>
        <div class="tot-line"><span>${isAvoir ? 'Montant de l\'avoir' : 'Total TTC'}</span><span>${params.montant_total.toFixed(2)} €</span></div>
      </div>
    </div>

    <!-- Paiement -->
    <div class="paiement-block${isAvoir ? ' avoir' : ''}">
      <h4>${isAvoir ? 'Remboursement' : 'Règlement'}</h4>
      ${isAvoir
        ? `<p>Remboursement du montant de <strong>${params.montant_total.toFixed(2)} €</strong> selon le mode de paiement initial (${modeStr}).</p>`
        : `<p>Règlement reçu le ${dateDoc} par <strong>${modeStr}</strong>. Facture acquittée.</p>`
      }
    </div>

    <!-- Mentions légales -->
    <div class="mentions">
      <strong>Mentions légales obligatoires</strong>
      ${VENDEUR.tva}<br>
      ${VENDEUR.statut} — SIRET ${VENDEUR.siret}<br>
      ${VENDEUR.nom} — ${VENDEUR.adresse}, ${VENDEUR.cp_ville}<br>
      ${!isAvoir ? 'Conformément à l\'article L441-10 du Code de commerce, aucune pénalité de retard ni escompte ne s\'applique pour les prestations réglées par des particuliers.' : ''}
    </div>

  </div>
  <!-- Footer -->
  <div class="footer">${VENDEUR.nom} · ${VENDEUR.cp_ville} · ${params.numero}</div>
</div>
</body>
</html>`
}

// ─── Serveur principal ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const {
      type = 'facture',
      reservation_id,
      atelier_titre,
      atelier_date,
      client_nom,
      client_prenom,
      client_email,
      client_telephone,
      description,
      quantite = 1,
      prix_unitaire,
      montant_total,
      mode_paiement,
      stripe_payment_id,
      reference_facture,
    } = body

    if (!client_nom || !client_prenom || !description || montant_total == null) {
      return new Response(
        JSON.stringify({ error: 'Champs obligatoires manquants' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Récupérer les settings ──────────────────────────────────────────────
    const { data: settingsRows } = await supabase
      .from('settings').select('key, value')
      .in('key', ['smtp_password', 'email_expediteur'])
    const settings: Record<string, string> = {}
    ;(settingsRows || []).forEach((r: { key: string; value: string }) => { settings[r.key] = r.value })

    const resendKey = settings['smtp_password']
    const adminEmail = settings['email_expediteur'] || 'univers.creatif.anais@outlook.com'

    // ── Générer le numéro de document ──────────────────────────────────────
    const { data: numData } = await supabase.rpc('next_document_numero', { p_type: type })
    const numero: string = numData || `${type === 'avoir' ? 'AV' : 'FAC'}-${new Date().getFullYear()}-001`

    // ── Insérer dans la table factures ─────────────────────────────────────
    const { error: insertError } = await supabase.from('factures').insert([{
      numero,
      type,
      reference_facture: reference_facture || null,
      reservation_id:    reservation_id || null,
      atelier_titre:     atelier_titre || null,
      atelier_date:      atelier_date || null,
      client_nom,
      client_prenom,
      client_email:      client_email || null,
      client_telephone:  client_telephone || null,
      description,
      quantite,
      prix_unitaire,
      montant_total,
      mode_paiement:     mode_paiement || null,
      stripe_payment_id: stripe_payment_id || null,
    }])

    if (insertError) {
      console.error('Erreur insertion facture:', insertError)
    }

    // ── Générer le HTML ────────────────────────────────────────────────────
    const now = new Date().toISOString()
    const htmlBody = buildInvoiceHtml({
      numero,
      type,
      reference_facture,
      client_nom,
      client_prenom,
      client_email:    client_email || '',
      client_telephone,
      description,
      quantite,
      prix_unitaire:   Number(prix_unitaire),
      montant_total:   Number(montant_total),
      mode_paiement:   mode_paiement || '',
      atelier_titre,
      atelier_date,
      created_at: now,
    })

    // ── Envoyer par email à l'administratrice ─────────────────────────────
    if (resendKey) {
      const subjectPrefix = type === 'avoir' ? 'Avoir' : 'Facture'
      const subject = `${subjectPrefix} ${numero} ${client_nom} ${client_prenom}`

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    'reservation@luniverscreatifdanais.fr',
          to:      [adminEmail],
          subject,
          html:    htmlBody,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Erreur envoi email facture:', errText)
      }
    }

    return new Response(JSON.stringify({ success: true, numero }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Erreur generate-invoice:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
