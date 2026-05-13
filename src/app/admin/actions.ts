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

      if (emailChanged) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware.app'
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: newEmail,
        })
        const resetLink = linkData?.properties?.action_link ?? `${appUrl}/auth/login`

        await sendEmail({
          to: newEmail,
          subject: 'FichasWork — Acesso à sua conta atualizado',
          html: emailChangedHtml({
            name: managerName.trim() || 'Gestor',
            email: newEmail,
            resetLink,
            appUrl,
          }),
        })
      }
    }

    if (managerName.trim()) {
      await admin.from('profiles').update({ full_name: managerName.trim() }).eq('id', managerId)
    }
  }

  revalidatePath('/admin')
  return {}
}

function emailChangedHtml({
  name,
  email,
  resetLink,
  appUrl,
}: {
  name: string
  email: string
  resetLink: string
  appUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1d4ed8;margin-bottom:4px">Acesso à sua conta FichasWork</h2>
      <p style="color:#6b7280;margin-top:0">Olá ${name}, os dados de acesso da sua conta foram atualizados.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
      </div>
      <p style="color:#374151">Para definir a sua password e aceder à plataforma, clique no botão abaixo:</p>
      <a href="${resetLink}"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px">
        Definir password
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Este link expira em 24 horas. Se não estava à espera deste email, pode ignorá-lo.<br>
        <a href="${appUrl}" style="color:#9ca3af">${appUrl}</a>
      </p>
    </div>`
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
  const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + '!1'
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fmware.app'
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
  })
  const resetLink = linkData?.properties?.action_link ?? `${appUrl}/auth/login`

  await sendEmail({
    to: email.trim().toLowerCase(),
    subject: 'Bem-vindo ao FichasWork — Aceda à sua conta',
    html: managerWelcomeHtml({
      name: managerName.trim(),
      orgName: orgName.trim(),
      email: email.trim().toLowerCase(),
      resetLink,
      appUrl,
    }),
  })

  revalidatePath('/admin')
  return {}
}

function managerWelcomeHtml({
  name,
  orgName,
  email,
  resetLink,
  appUrl,
}: {
  name: string
  orgName: string
  email: string
  resetLink: string
  appUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1d4ed8;margin-bottom:4px">Bem-vindo ao FichasWork!</h2>
      <p style="color:#6b7280;margin-top:0">Olá ${name}, a conta da sua empresa foi criada.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
        <p style="margin:0 0 8px"><strong>Empresa:</strong> ${orgName}</p>
        <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
        <p style="margin:0;color:#6b7280;font-size:13px">Clique no botão abaixo para definir a sua password e aceder à plataforma.</p>
      </div>
      <a href="${resetLink}"
        style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
        Definir password e entrar
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">
        Este link expira em 24 horas.<br>
        <a href="${appUrl}" style="color:#9ca3af">${appUrl}</a>
      </p>
    </div>`
}
