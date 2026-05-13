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
  const from = process.env.RESEND_FROM ?? 'FichasWork <onboarding@resend.dev>'
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
      <h2 style="color:#1d4ed8;margin-bottom:4px">Bem-vindo ao FichasWork!</h2>
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
