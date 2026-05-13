'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

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
    const newEmail = managerEmail.trim().toLowerCase()

    if (newEmail) {
      const { data: currentUser } = await admin.auth.admin.getUserById(managerId)
      const emailChanged = currentUser?.user?.email !== newEmail

      const { error: emailError } = await admin.auth.admin.updateUserById(managerId, {
        email: newEmail,
      })
      if (emailError) return { error: `Erro ao atualizar email: ${emailError.message}` }

      // When email changes, send a simple notification + invite them to reset password
      // via Supabase's native recovery (handled by Supabase SMTP/email templates)
      if (emailChanged) {
        await admin.auth.admin.generateLink({
          type: 'recovery',
          email: newEmail,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware.app'}/auth/reset-password`,
          },
        })
        // Supabase sends the recovery email automatically via configured SMTP
      }
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
}: {
  orgName: string
  managerName: string
  email: string
}): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware.app'

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: orgName.trim(), plan: 'trial', status: 'active' })
    .select()
    .single()

  if (orgError || !org) return { error: 'Erro ao criar organização.' }

  // inviteUserByEmail creates the user AND sends the invite email via Supabase SMTP
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { full_name: managerName.trim() },
      redirectTo: `${appUrl}/auth/reset-password`,
    }
  )

  if (inviteError || !inviteData.user) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: inviteError?.message ?? 'Erro ao convidar utilizador.' }
  }

  await admin.from('profiles').upsert({
    id: inviteData.user.id,
    full_name: managerName.trim(),
    role: 'manager',
    organization_id: org.id,
  })

  revalidatePath('/admin')
  return {}
}
