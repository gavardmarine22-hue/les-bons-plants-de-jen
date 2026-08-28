import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Infos par type d'atelier ─────────────────────────────────────────────────
interface CatInfo {
  emoji: string
  couleur: string
  // Paragraphe d'intro après "Bonjour [Prénom]" — peut contenir {ATELIER}
  message: string
  // Contenu HTML de la section "À prévoir"
  apporter: string
  // Info stationnement (optionnel — uniquement si pertinent)
  stationnement?: string
}

function getCatInfo(categorie: string): CatInfo {
  const n = categorie.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  if (n.includes('couture')) return {
    emoji: '🧵',
    couleur: '#ec4899',
    message: "Je me permets de vous contacter pour vous rappeler votre participation à l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `
      <ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
        <li>Votre machine à coudre et vos canettes !</li>
        <li>Une tenue confortable adaptée aux activités manuelles</li>
        <li>Votre bonne humeur !</li>
      </ul>
      <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matériel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prévues dans la cour à l'arrière de la maison, merci de vous stationner de manière à laisser la place à 6 voitures maximum.",
  }

  if (n.includes('macrame') || n.includes('macramé')) return {
    emoji: '🪢',
    couleur: '#f97316',
    message: "Je me permets de vous contacter pour vous rappeler votre participation à l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `
      <ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
        <li>Une tenue confortable adaptée aux activités manuelles</li>
        <li>Votre bonne humeur !</li>
      </ul>
      <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matériel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prévues dans la cour à l'arrière de la maison, merci de vous stationner de manière à laisser la place à 6 voitures maximum.",
  }

  if (n.includes('resine') || n.includes('résine') || n.includes('bijou')) return {
    emoji: '💎',
    couleur: '#8b5cf6',
    message: "Je me permets de vous contacter pour vous rappeler votre participation à l'atelier <strong>{ATELIER}</strong>, qui aura lieu prochainement.",
    apporter: `
      <ul style="margin:8px 0 4px;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
        <li>Une tenue confortable adaptée aux activités manuelles</li>
        <li>Votre bonne humeur !</li>
      </ul>
      <p style="margin:8px 0 0;color:#15803d;font-size:14px;">Le reste du matériel pour l'atelier est fourni.</p>`,
    stationnement: "Des places de stationnement sont prévues dans la cour à l'arrière de la maison, merci de vous stationner de manière à laisser la place à 6 voitures maximum.",
  }

  return {
    emoji: '🎨',
    couleur: '#14b8a6',
    message: "Un atelier créatif qui te promet un moment de détente, de découverte et de partage. Tu repartiras avec une création dont tu seras fière !",
    apporter: `<p style="margin:0;color:#15803d;font-size:14px;line-height:1.6;">Tout le matériel nécessaire est fourni. À très bientôt !</p>`,
  }
}

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    cb: 'Carte bancaire', virement: 'Virement bancaire', cheque: 'Chèque', especes: 'Espèces',
  }
  return labels[mode] ?? mode
}

// ─── Email client (confirmation) ──────────────────────────────────────────────
function buildEmailClient(params: {
  prenom: string; nom: string; atelier_titre: string; dateFormatted: string
  heure: string; duree: string; lieu: string; mode_paiement: string
  nb_personnes: number; personnes_sup: { prenom: string; nom: string; age: string }[]
  total: number; catInfo: CatInfo; stripeUrl: string; reference: string
  nomOrga: string; adminEmail: string; siteUrl: string
}) {
  const { prenom, nom, atelier_titre, dateFormatted, heure, duree, lieu,
    mode_paiement, nb_personnes, personnes_sup, total, catInfo, stripeUrl, reference,
    nomOrga, adminEmail, siteUrl } = params

  const allParticipants = [
    `${prenom} ${nom}`,
    ...(personnes_sup ?? []).map((p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`),
  ]
  const participantsListHtml = allParticipants
    .map(name => `<span style="display:block;color:#374151;font-size:13px;font-weight:600;">• ${name}</span>`)
    .join('')

  // Résoudre le placeholder {ATELIER} dans le message d'intro
  const introHtml = catInfo.message.replace('{ATELIER}', atelier_titre)

  const paiementBlock = (() => {
    if (mode_paiement === 'virement') return `
      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="font-weight:900;color:#1e40af;margin:0 0 10px;font-size:15px;">💳 Finalise ton paiement en ligne</p>
        <p style="margin:0 0 16px;color:#3b82f6;font-size:14px;">Règle le montant de <strong>${total} €</strong> de façon sécurisée via Stripe.</p>
        <a href="${stripeUrl}" style="display:inline-block;background:#635bff;color:white;font-weight:900;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
          💳 Payer ${total} € en ligne →
        </a>
        <p style="margin:14px 0 0;color:#6b7280;font-size:12px;">⚠️ Le règlement doit être effectué avant le début de l'atelier.</p>
      </div>`
    if (mode_paiement === 'cheque') return `
      <div style="background:#f5f3ff;border:2px solid #8b5cf6;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#6d28d9;margin:0 0 8px;font-size:15px;">📝 Règlement par chèque</p>
        <p style="margin:0;color:#6d28d9;font-size:14px;">Chèque à l'ordre de <strong>Les plants de Jenni</strong>, à remettre le jour de l'atelier.</p>
      </div>`
    if (mode_paiement === 'especes') return `
      <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#92400e;margin:0 0 8px;font-size:15px;">💵 Règlement en espèces</p>
        <p style="margin:0;color:#92400e;font-size:14px;"><strong>L'appoint est obligatoire.</strong> Règlement sur place le jour de l'atelier.</p>
      </div>`
    return `
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="font-weight:900;color:#15803d;margin:0 0 8px;font-size:15px;">✅ Paiement confirmé</p>
        <p style="margin:0;color:#15803d;font-size:14px;">Ton paiement par carte bancaire a bien été enregistré. Merci !</p>
      </div>`
  })()

  const stationnementBlock = catInfo.stationnement
    ? `<div style="background:#fefce8;border:2px solid #fde047;border-radius:12px;padding:18px;margin:20px 0;">
        <p style="font-weight:900;color:#713f12;margin:0 0 8px;font-size:15px;">🅿️ Stationnement</p>
        <p style="margin:0;color:#854d0e;font-size:14px;line-height:1.6;">${catInfo.stationnement}</p>
      </div>`
    : ''

  const gdprBlock = `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-weight:700;color:#374151;margin:0 0 6px;font-size:13px;">🔒 Protection de vos données personnelles</p>
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.6;">
        Vous recevez cet e-mail dans le cadre de votre réservation à un atelier. Vos données sont utilisées uniquement pour la gestion de votre inscription et des communications liées à l'événement.
      </p>
      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
        Pour toute question relative à vos données personnelles ou pour exercer vos droits, vous pouvez me contacter à
        <a href="mailto:${adminEmail}" style="color:#ec4899;">${adminEmail}</a>.
      </p>
    </div>`

  const contactBlock = `
    <div style="border-top:2px dashed #fbcfe8;padding-top:16px;margin-top:4px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Si vous avez une question ou si vous ne pouvez finalement pas participer, merci de me prévenir dès que possible :</p>
      <p style="margin:4px 0;font-size:13px;color:#374151;">📧 <a href="mailto:${adminEmail}" style="color:#ec4899;text-decoration:none;">${adminEmail}</a></p>
    </div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">
      <tr><td style="background:#1A1040;padding:32px 36px;text-align:center;border-radius:20px 20px 0 0;border:3px solid #1A1040;">
        <p style="color:#ffe500;font-size:26px;font-weight:900;margin:0;">✨ ${nomOrga}</p>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:8px 0 0;">Confirmation de réservation</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 36px;border-left:3px solid #1A1040;border-right:3px solid #1A1040;">
        <p style="font-size:22px;font-weight:900;color:#1A1040;margin:0 0 12px;">Bonjour ${prenom} ${catInfo.emoji}</p>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6;">${introHtml}</p>
        <div style="background:#fdf2f8;border:2px solid #fbcfe8;border-radius:16px;padding:22px;">
          <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 16px;">📋 Récapitulatif de votre réservation</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;width:42%;vertical-align:top;">🎨 Atelier</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${atelier_titre}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">📅 Date</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;text-transform:capitalize;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">⏰ Horaire</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${heure} — durée ${duree}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">📍 Lieu</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${lieu}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">👤 Participants</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${nb_personnes} personne${nb_personnes > 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding:2px 0 6px;color:#9ca3af;font-size:13px;vertical-align:top;">👥 Inscrits</td>
              <td style="padding:2px 0 6px;">${participantsListHtml}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">💳 Règlement</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;">${modeLabel(mode_paiement)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#9ca3af;font-size:13px;vertical-align:top;">🔖 Référence</td>
              <td style="padding:6px 0;color:#1A1040;font-weight:700;font-size:14px;font-family:monospace;">${reference}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;color:#9ca3af;font-size:13px;border-top:2px dashed #fbcfe8;vertical-align:top;">💰 Total</td>
              <td style="padding:10px 0 0;color:${catInfo.couleur};font-weight:900;font-size:22px;border-top:2px dashed #fbcfe8;">${total} €</td>
            </tr>
          </table>
        </div>
        ${paiementBlock}
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:18px;margin:20px 0;">
          <p style="font-weight:900;color:#166534;margin:0 0 8px;font-size:15px;">🎒 À prévoir</p>
          ${catInfo.apporter}
        </div>
        ${stationnementBlock}
        ${gdprBlock}
        ${contactBlock}
      </td></tr>
      <tr><td style="background:#fdf2f8;padding:24px 36px;text-align:center;border-radius:0 0 20px 20px;border:3px solid #1A1040;border-top:2px solid #fbcfe8;">
        <p style="color:#1A1040;font-size:15px;margin:0 0 6px;">J'ai hâte de vous accueillir et de partager ce moment créatif avec vous.</p>
        <p style="color:#ec4899;font-weight:900;font-size:16px;margin:0 0 12px;">À très bientôt ! 🌸</p>
        <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 2px;">${nomOrga}</p>
        <p style="color:#d1d5db;font-size:12px;margin:0;"><a href="${siteUrl}" style="color:#ec4899;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Email admin (notification) ───────────────────────────────────────────────
function buildEmailAdmin(params: {
  prenom: string; nom: string; email: string; telephone: string
  atelier_titre: string; dateFormatted: string; heure: string; categorie: string
  mode_paiement: string; nb_personnes: number
  personnes_sup: { prenom: string; nom: string; age: string }[]
  total: number; nomOrga: string; reference: string
}) {
  const { prenom, nom, email, telephone, atelier_titre, dateFormatted, heure,
    categorie, mode_paiement, nb_personnes, personnes_sup, total, nomOrga, reference } = params

  const modeEmoji: Record<string, string> = { cb: '💳', virement: '🏦', cheque: '📝', especes: '💵' }
  const alerteVirement = mode_paiement === 'virement'
    ? `<div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:10px;padding:12px;margin:14px 0;">
        <p style="font-weight:900;color:#1e40af;margin:0;font-size:14px;">💳 Lien Stripe envoyé au client pour paiement en ligne.</p>
        <p style="margin:6px 0 0;color:#3b82f6;font-size:13px;">La transaction apparaîtra dans Stripe et sera synchronisée avec Indy.</p>
       </div>`
    : ''

  const supBlock = personnes_sup?.length > 0
    ? `<div style="margin:14px 0;">
        <p style="font-weight:700;color:#1A1040;font-size:14px;margin:0 0 6px;">👥 Participants supplémentaires :</p>
        ${personnes_sup.map(p => `<p style="margin:3px 0;color:#6b7280;font-size:13px;">• ${p.prenom} ${p.nom} (${p.age} ans)</p>`).join('')}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;border:3px solid #1A1040;overflow:hidden;">
  <div style="background:#ffe500;padding:22px 28px;border-bottom:3px solid #1A1040;">
    <p style="font-weight:900;color:#1A1040;font-size:20px;margin:0;">🎟️ Nouvelle réservation !</p>
    <p style="color:#1A1040;font-size:13px;margin:6px 0 0;opacity:0.7;">${categorie} — ${atelier_titre}</p>
    <p style="color:#1A1040;font-size:12px;margin:2px 0 0;opacity:0.6;">${nomOrga}</p>
  </div>
  <div style="padding:24px 28px;">
    <p style="font-weight:900;color:#1A1040;font-size:16px;margin:0 0 10px;">👤 Client</p>
    <p style="margin:4px 0;color:#374151;font-size:15px;"><strong>${prenom} ${nom}</strong></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">📧 <a href="mailto:${email}" style="color:#ec4899;">${email}</a></p>
    <p style="margin:4px 0;color:#6b7280;font-size:14px;">📞 ${telephone || '—'}</p>
    ${supBlock}
    <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:18px 0;">
      <p style="margin:4px 0;font-size:14px;color:#374151;">📅 <strong>${dateFormatted}</strong> à <strong>${heure}</strong></p>
      <p style="margin:6px 0;font-size:14px;color:#374151;">👤 <strong>${nb_personnes} participant${nb_personnes > 1 ? 's' : ''}</strong></p>
      <p style="margin:6px 0;font-size:14px;color:#374151;">${modeEmoji[mode_paiement] ?? '💳'} <strong>${modeLabel(mode_paiement)}</strong></p>
      <p style="margin:6px 0;font-size:13px;color:#6b7280;">Réf. <strong style="font-family:monospace;">${reference}</strong></p>
      <p style="margin:10px 0 0;font-size:20px;font-weight:900;color:#ec4899;">Total : ${total} €</p>
    </div>
    ${alerteVirement}
  </div>
</div>
</body></html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Lire la config Resend depuis les settings (même source que send-contact-email)
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['email_provider', 'email_expediteur', 'email_nom', 'smtp_password', 'stripe_secret_key', 'site_url'])

    const s: Record<string, string> = {}
    ;(rows ?? []).forEach((r: { key: string; value: string }) => { s[r.key] = r.value || '' })

    const apiKey        = s['smtp_password']
    const adminEmail    = s['email_expediteur']
    const nomOrga       = s['email_nom']         || "Les plants de Jenni"
    const stripeSecret  = s['stripe_secret_key'] || ''

    if (!apiKey || !adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Resend non configuré. Vérifiez les Connecteurs dans le tableau de bord.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const data = await req.json()
    const {
      atelier_titre, atelier_date, atelier_heure, atelier_duree, atelier_lieu,
      category_id, client_prenom, client_nom, client_email, client_telephone,
      mode_paiement, nb_personnes, personnes_sup, total,
    } = data

    // Générer une référence de réservation lisible
    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randPart = String(Math.floor(Math.random() * 9000) + 1000)
    const reference = `RES-${datePart}-${randPart}`

    // Récupérer le nom de la catégorie
    let categorie = 'Atelier créatif'
    if (category_id) {
      const { data: cat } = await supabase
        .from('atelier_categories')
        .select('nom')
        .eq('id', category_id)
        .single()
      if (cat?.nom) categorie = cat.nom
    }

    const catInfo = getCatInfo(categorie)
    const dateFormatted = new Date(atelier_date + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    // ── Créer un lien Stripe Checkout pour le paiement en ligne (mode virement)
    const siteUrl = s['site_url'] || 'https://les-bons-plants-de-jen.netlify.app'
    let stripeUrl = `${siteUrl}/ateliers`
    if (mode_paiement === 'virement' && stripeSecret) {
      try {
        const params = new URLSearchParams({
          mode: 'payment',
          customer_email: client_email,
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': 'eur',
          'line_items[0][price_data][unit_amount]': String(Math.round(total * 100)),
          'line_items[0][price_data][product_data][name]': atelier_titre,
          'line_items[0][price_data][product_data][description]': `${dateFormatted} — ${atelier_heure} — ${atelier_lieu}`,
          success_url: `${siteUrl}/ateliers?paiement=confirme`,
          cancel_url: `${siteUrl}/ateliers`,
        })
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        })
        if (stripeRes.ok) {
          const session = await stripeRes.json()
          if (session.url) stripeUrl = session.url
        } else {
          console.error('Stripe session error:', await stripeRes.text())
        }
      } catch (e) {
        console.error('Stripe session creation failed:', e)
      }
    }

    const htmlClient = buildEmailClient({
      prenom: client_prenom, nom: client_nom, atelier_titre, dateFormatted,
      heure: atelier_heure, duree: atelier_duree, lieu: atelier_lieu,
      mode_paiement, nb_personnes, personnes_sup: personnes_sup ?? [],
      total, catInfo, stripeUrl, reference,
      nomOrga, adminEmail, siteUrl,
    })

    const htmlAdmin = buildEmailAdmin({
      prenom: client_prenom, nom: client_nom, email: client_email, telephone: client_telephone,
      atelier_titre, dateFormatted, heure: atelier_heure, categorie,
      mode_paiement, nb_personnes, personnes_sup: personnes_sup ?? [],
      total, nomOrga, reference,
    })

    // Envoyer les deux emails
    async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
      const body: Record<string, unknown> = {
        from: `${nomOrga} <onboarding@resend.dev>`,
        to: [to], subject, html,
      }
      if (replyTo) body['reply_to'] = replyTo
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
    }

    await Promise.all([
      sendEmail(client_email, `✅ Ta réservation est confirmée — ${atelier_titre}`, htmlClient),
      sendEmail(adminEmail, `🎟️ Nouvelle réservation — ${client_prenom} ${client_nom} — ${atelier_titre}`, htmlAdmin, client_email),
    ])

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-reservation-email]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
