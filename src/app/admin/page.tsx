import { createAdminClient } from '@/lib/supabase/admin'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const admin = createAdminClient()

  const [{ data: orgs }, { data: profiles }, { data: jobs }] = await Promise.all([
    admin.from('organizations').select('*').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, organization_id, role'),
    admin.from('jobs').select('id, organization_id, status'),
  ])

  // Attach counts to each org
  const enriched = (orgs ?? []).map(org => ({
    ...org,
    workers: (profiles ?? []).filter(p => p.organization_id === org.id && p.role === 'worker').length,
    managers: (profiles ?? []).filter(p => p.organization_id === org.id && p.role === 'manager').length,
    jobs_total: (jobs ?? []).filter(j => j.organization_id === org.id).length,
    jobs_active: (jobs ?? []).filter(j => j.organization_id === org.id && j.status !== 'cancelled' && j.status !== 'completed').length,
  }))

  return <AdminDashboard orgs={enriched} />
}
