import { createClient } from '@/lib/supabase/server'
import { JobsManager } from '@/components/manager/jobs-manager'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const [{ data: jobs }, { data: clients }, { data: workers }, { data: jobWorkers }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(name)').eq('organization_id', orgId).order('scheduled_date', { ascending: true }),
    supabase.from('clients').select('id, name').eq('organization_id', orgId).order('name'),
    supabase.from('profiles').select('id, full_name').eq('organization_id', orgId).eq('role', 'worker').order('full_name'),
    supabase.from('job_workers').select('job_id, worker_id, worker:profiles(full_name)') as unknown as Promise<{ data: { job_id: string; worker_id: string; worker: { full_name: string } | null }[] | null; error: unknown }>,
  ])

  return (
    <JobsManager
      jobs={jobs ?? []}
      clients={clients ?? []}
      workers={workers ?? []}
      jobWorkers={jobWorkers ?? []}
      organizationId={orgId ?? ''}
    />
  )
}
