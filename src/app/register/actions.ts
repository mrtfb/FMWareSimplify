'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function registerOrganization({
  orgName,
  managerName,
  email,
  password,
}: {
  orgName: string
  managerName: string
  email: string
  password: string
}): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // 1. Create organization
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName.trim(), plan: 'trial', status: 'active' })
    .select()
    .single()

  if (orgError || !org) return { error: `Erro ao criar organização: ${orgError?.message ?? 'sem dados'}` }

  // 2. Create auth user (email already confirmed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    await admin.from('organizations').delete().eq('id', org.id)
    if (authError?.message?.includes('already registered')) {
      return { error: 'Este email já está registado.' }
    }
    return { error: 'Erro ao criar conta.' }
  }

  // 3. Create manager profile
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    full_name: managerName.trim(),
    email: email.trim().toLowerCase(),
    role: 'manager',
    organization_id: org.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: 'Erro ao criar perfil.' }
  }

  return {}
}
