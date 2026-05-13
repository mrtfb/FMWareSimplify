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

  // 2. Check email not already in use
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const emailTaken = existingUsers?.users?.some(u => u.email === email.trim().toLowerCase())
  if (emailTaken) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: 'Este email já está registado.' }
  }

  // 3. Create auth user (email already confirmed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: `Erro ao criar conta: ${authError?.message}` }
  }

  // 4. Create manager profile — upsert to survive duplicate from previous failed attempt
  const { error: profileError } = await admin.from('profiles').upsert({
    id: authData.user.id,
    full_name: managerName.trim(),
    role: 'manager',
    organization_id: org.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: `Erro ao criar perfil: ${profileError.message}` }
  }

  return {}
}
