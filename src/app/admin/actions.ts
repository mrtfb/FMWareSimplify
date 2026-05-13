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

export async function updateOrg({
  orgId,
  name,
  plan,
  status,
  managerId,
  managerEmail,
  managerName,
}: {
  orgId: string
  name: string
  plan: string
  status: string
  managerId: string | null
  managerEmail: string
  managerName: string
}): Promise<{ error?: string }> {
  const admin = createAdminClient()

  const { error: orgError } = await admin
    .from('organizations')
    .update({ name: name.trim(), plan, status })
    .eq('id', orgId)

  if (orgError) return { error: 'Erro ao atualizar organização.' }

  if (managerId) {
    if (managerEmail.trim()) {
      const { error: emailError } = await admin.auth.admin.updateUserById(managerId, {
        email: managerEmail.trim().toLowerCase(),
      })
      if (emailError) return { error: `Erro ao atualizar email: ${emailError.message}` }
    }

    if (managerName.trim()) {
      await admin.from('profiles').update({ full_name: managerName.trim() }).eq('id', managerId)
    }
  }

  revalidatePath('/admin')
  return {}
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
    role: 'manager',
    organization_id: org.id,
  })

  revalidatePath('/admin')
  return {}
}
