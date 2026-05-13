import { createAdminClient } from '@/lib/supabase/admin'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const admin = createAdminClient()

  const [{ data: orgs }, { data: profiles }, { data: jobs }, { data: { users: authUsers } }] = await Promise.all([
    admin.from('organizations').select('*').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, organization_id, role'),
    admin.from('jobs').select('id, organization_id, status'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const authMap = Object.fromEntries((authUsers ?? []).map(u => [u.id, u.email ?? '']))

  const enriched = (orgs ?? []).map(org => {
    const managerProfile = (profiles ?? []).find(p => p.organization_id === org.id && p.role === 'manager')
    return {
      ...org,
      workers: (profiles ?? []).filter(p => p.organization_id === org.id && p.role === 'worker').length,
      managers: (profiles ?? []).filter(p => p.organization_id === org.id && p.role === 'manager').length,
      jobs_total: (jobs ?? []).filter(j => j.organization_id === org.id).length,
      jobs_active: (jobs ?? []).filter(j => j.organization_id === org.id && j.status !== 'cancelled' && j.status !== 'completed').length,
      manager_id: managerProfile?.id ?? null,
      manager_name: managerProfile?.full_name ?? null,
      manager_email: managerProfile ? (authMap[managerProfile.id] ?? null) : null,
    }
  })

  return <AdminDashboard orgs={enriched} />
}
