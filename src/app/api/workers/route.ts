import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, workerWelcomeHtml } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { full_name, email, password, organization_id } = await request.json()

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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name, role: 'worker' },
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name,
    role: 'worker',
    organization_id,
  })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware-simplify.vercel.app'
  await sendEmail({
    to: email,
    subject: 'Bem-vindo ao FichasWork — Acesso à sua conta',
    html: workerWelcomeHtml({ name: full_name, email, password, appUrl }),
  })

  return NextResponse.json({ ok: true })
}
