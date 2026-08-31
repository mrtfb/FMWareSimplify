import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail, workerWelcomeHtml } from '@/lib/email'

function randomPassword() {
  // 12 chars, mixed case + digits — meets the app's strength requirements
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function authorize(request: NextRequest, workerId: string) {
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
  if (!user) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const isManager = callerProfile?.role === 'manager' || callerProfile?.role === 'superadmin'
  if (!isManager) return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 403 }) }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id, full_name, role, organization_id')
    .eq('id', workerId)
    .single()

  if (!targetProfile || targetProfile.role !== 'worker') {
    return { error: NextResponse.json({ error: 'Trabalhador não encontrado' }, { status: 404 }) }
  }
  if (callerProfile?.role === 'manager' && targetProfile.organization_id !== callerProfile.organization_id) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 403 }) }
  }

  return { admin, targetProfile }
}

// Reset a worker's password to a new random one and email it to them.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await authorize(request, id)
  if ('error' in result) return result.error
  const { admin, targetProfile } = result

  const { data: { user: authUser }, error: getUserError } = await admin.auth.admin.getUserById(id)
  if (getUserError || !authUser?.email) return NextResponse.json({ error: 'Email do trabalhador não encontrado' }, { status: 404 })

  const newPassword = randomPassword()
  const { error: updateError } = await admin.auth.admin.updateUserById(id, { password: newPassword })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware-simplify.vercel.app'
  await sendEmail({
    to: authUser.email,
    subject: 'GestObra — A sua password foi alterada',
    html: workerWelcomeHtml({ name: targetProfile.full_name, email: authUser.email, password: newPassword, appUrl }),
  })

  return NextResponse.json({ ok: true })
}

// Remove a worker's account. Historical fichas are kept (worker_id set to null).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await authorize(request, id)
  if ('error' in result) return result.error
  const { admin } = result

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
