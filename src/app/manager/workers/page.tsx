import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Emails live in auth.users, not profiles — fetch via admin client.
  const admin = createAdminClient()
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailById = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email ?? '']))

  const workersWithEmail = (workers ?? []).map(w => ({ ...w, email: emailById[w.id] ?? '' }))

  return <WorkersTable workers={workersWithEmail} organizationId={profile?.organization_id ?? ''} />
}
