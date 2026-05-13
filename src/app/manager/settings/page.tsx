import { createClient } from '@/lib/supabase/server'
import { OrgSettings } from '@/components/manager/org-settings'
import { PasswordSection } from '@/components/shared/password-section'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const { data: org } = await supabase.from('organizations').select('id, name, plan, logo_url').eq('id', profile!.organization_id).single()

  return (
    <>
      <OrgSettings org={org!} />
      <PasswordSection />
    </>
  )
}
