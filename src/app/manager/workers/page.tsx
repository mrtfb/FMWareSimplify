import { createClient } from '@/lib/supabase/server'
import { WorkersTable } from '@/components/manager/workers-table'

export default async function WorkersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const { data: workers } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .eq('role', 'worker')
    .order('full_name')

  return <WorkersTable workers={workers ?? []} organizationId={profile?.organization_id ?? ''} />
}
