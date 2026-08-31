export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set, skipping')
    return
  }
  const from = process.env.RESEND_FROM ?? 'GestObra <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[email] send failed', err)
  }
}

export function workerWelcomeHtml({
  name,
  email,
  password,
  appUrl,
}: {
  name: string
  email: string
  password: string
  appUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#FF6A1A;margin-bottom:4px">Bem-vindo ao GestObra!</h2>
      <p style="color:#6b7280;margin-top:0">A sua conta foi criada pelo gestor.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
        <p style="margin:0"><strong>Palavra-passe:</strong> ${password}</p>
      </div>
      <a href="${appUrl}/auth/login"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
        Entrar na aplicação
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Pode alterar a sua palavra-passe após fazer login nas definições da conta.
      </p>
    </div>`
}

export function clientReportHtml({
  clientName,
  jobTitle,
  reportType,
  workerName,
  description,
  clientObservations,
  clientApproved,
  signatureUrl,
  reportDate,
}: {
  clientName: string
  jobTitle: string
  reportType: 'start' | 'finish'
  workerName: string
  description?: string | null
  clientObservations?: string | null
  clientApproved?: boolean | null
  signatureUrl?: string | null
  reportDate: string
}) {
  const isStart = reportType === 'start'
  const dateStr = new Date(reportDate + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
  const approvalBadge = clientApproved == null ? '' : `
    <span style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:12px;background:${clientApproved ? '#dcfce7' : '#fee2e2'};color:${clientApproved ? '#15803d' : '#dc2626'}">
      ${clientApproved ? 'Trabalho aprovado' : 'Trabalho não aprovado'}
    </span>`

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#FF6A1A;margin-bottom:4px">${isStart ? 'Início de trabalho registado' : 'Trabalho concluído'}</h2>
      <p style="color:#6b7280;margin-top:0">Olá ${clientName || ''}, segue o registo ${isStart ? 'do início' : 'da conclusão'} do seu trabalho.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111">${jobTitle}</p>
        <p style="margin:0 0 6px;color:#6b7280">📅 ${dateStr}</p>
        <p style="margin:0 0 6px;color:#6b7280">👷 Técnico: ${workerName}</p>
        ${description ? `<p style="margin:12px 0 0;color:#374151;white-space:pre-line">${description}</p>` : ''}
        ${clientObservations ? `<p style="margin:12px 0 0;color:#374151"><strong>Observações:</strong> ${clientObservations}</p>` : ''}
        ${approvalBadge}
      </div>
      ${signatureUrl ? `
        <div style="margin:16px 0">
          <p style="color:#9ca3af;font-size:12px;margin:0 0 6px">Assinatura</p>
          <img src="${signatureUrl}" alt="Assinatura" style="height:70px;border:1px solid #e2e8f0;border-radius:6px;background:#fff" />
        </div>` : ''}
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Este email foi enviado automaticamente pelo GestObra em nome de quem lhe presta o serviço.
      </p>
    </div>`
}

export function jobAssignedHtml({
  workerName,
  jobTitle,
  clientName,
  scheduledDate,
  location,
  appUrl,
}: {
  workerName: string
  jobTitle: string
  clientName?: string | null
  scheduledDate?: string | null
  location?: string | null
  appUrl: string
}) {
  const dateStr = scheduledDate
    ? new Date(scheduledDate + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1d4ed8;margin-bottom:4px">Novo trabalho atribuído</h2>
      <p style="color:#6b7280;margin-top:0">Olá ${workerName}, foi-lhe atribuído um novo trabalho.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111">${jobTitle}</p>
        ${clientName ? `<p style="margin:0 0 6px;color:#6b7280">📋 Cliente: ${clientName}</p>` : ''}
        ${dateStr ? `<p style="margin:0 0 6px;color:#6b7280">📅 Data: ${dateStr}</p>` : ''}
        ${location ? `<p style="margin:0;color:#6b7280">📍 Local: ${location}</p>` : ''}
      </div>
      <a href="${appUrl}/worker/jobs"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
        Ver os meus trabalhos
      </a>
    </div>`
}
