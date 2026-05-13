'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function setOrgStatus(orgId: string, status: 'active' | 'suspended') {
  const admin = createAdminClient()
  await admin.from('organizations').update({ status }).eq('id', orgId)
  revalidatePath('/admin')
}

export async function setOrgPlan(orgId: string, plan: string) {
  const admin = createAdminClient()
  await admin.from('organizations').update({ plan }).eq('id', orgId)
  revalidatePath('/admin')
}

export async function createOrgWithManager({
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

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName.trim(), plan: 'trial', status: 'active' })
    .select()
    .single()

  if (orgError || !org) return { error: 'Erro ao criar organização.' }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: authError?.message?.includes('already registered') ? 'Email já registado.' : 'Erro ao criar utilizador.' }
  }

  await admin.from('profiles').insert({
    id: authData.user.id,
    full_name: managerName.trim(),
    email: email.trim().toLowerCase(),
    role: 'manager',
    organization_id: org.id,
  })

  revalidatePath('/admin')
  return {}
}
