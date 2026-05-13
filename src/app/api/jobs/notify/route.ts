import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, jobAssignedHtml } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { job_id } = await request.json()

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
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: job }, { data: jws }] = await Promise.all([
    admin.from('jobs').select('title, scheduled_date, location, client:clients(name)').eq('id', job_id).single(),
    admin.from('job_workers').select('worker_id').eq('job_id', job_id),
  ])

  if (!job || !jws?.length) return NextResponse.json({ ok: true })

  const clientName = (job.client as unknown as { name: string } | null)?.name ?? null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware-simplify.vercel.app'

  await Promise.all(jws.map(async (jw) => {
    const { data: { user: workerUser } } = await admin.auth.admin.getUserById(jw.worker_id)
    if (!workerUser?.email) return

    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', jw.worker_id).single()
    const workerName = (profile?.full_name as string | null) ?? 'Trabalhador'

    await sendEmail({
      to: workerUser.email,
      subject: `Novo trabalho atribuído: ${job.title}`,
      html: jobAssignedHtml({
        workerName,
        jobTitle: job.title,
        clientName,
        scheduledDate: job.scheduled_date,
        location: job.location,
        appUrl,
      }),
    })
  }))

  return NextResponse.json({ ok: true })
}
