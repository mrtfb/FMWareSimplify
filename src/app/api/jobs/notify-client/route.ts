import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, clientReportHtml } from '@/lib/email'

// Emails the client the start/finish report they just signed for, if the
// client has a contact email on file. Fired by the worker's app right after
// a NEW start/finish report is saved (not on edits, to avoid re-sending).
export async function POST(request: NextRequest) {
  const { job_report_id } = await request.json()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[notify-client] no authenticated user')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['worker', 'manager', 'superadmin']
  if (!callerProfile || !allowedRoles.includes(callerProfile.role)) {
    console.error('[notify-client] caller has no valid role:', { userId: user.id, role: callerProfile?.role })
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: report } = await admin
    .from('job_reports')
    .select(`
      id, report_type, description, client_name, client_observations, client_approved, client_signature_url, report_date,
      job:jobs(id, title, organization_id, client:clients(name, contact_email)),
      worker:profiles(full_name)
    `)
    .eq('id', job_report_id)
    .single()

  if (!report) {
    console.warn('[notify-client] report not found:', job_report_id)
    return NextResponse.json({ ok: true })
  }

  const job = (Array.isArray(report.job) ? report.job[0] : report.job) as unknown as
    { id: string; title: string; organization_id: string; client: { name: string; contact_email: string | null } | { name: string; contact_email: string | null }[] | null } | null

  if (!job) return NextResponse.json({ ok: true })

  if (callerProfile.role !== 'superadmin' && job.organization_id !== callerProfile.organization_id) {
    console.error('[notify-client] report belongs to a different org than the caller')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const client = (Array.isArray(job.client) ? job.client[0] : job.client) as { name: string; contact_email: string | null } | null
  if (!client?.contact_email) {
    console.warn('[notify-client] no contact email on file for this client, skipping')
    return NextResponse.json({ ok: true })
  }

  const worker = (Array.isArray(report.worker) ? report.worker[0] : report.worker) as { full_name: string } | null

  await sendEmail({
    to: client.contact_email,
    subject: `${report.report_type === 'start' ? 'Início' : 'Conclusão'} do trabalho: ${job.title}`,
    html: clientReportHtml({
      clientName: report.client_name ?? client.name,
      jobTitle: job.title,
      reportType: report.report_type as 'start' | 'finish',
      workerName: worker?.full_name ?? 'Técnico',
      description: report.description,
      clientObservations: report.client_observations,
      clientApproved: report.client_approved,
      signatureUrl: report.client_signature_url,
      reportDate: report.report_date,
    }),
  })

  return NextResponse.json({ ok: true })
}
