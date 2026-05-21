import { createClient } from '@/lib/supabase/server'
import { ReportsManager } from '@/components/manager/reports-manager'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const [{ data: jobs }, { data: clients }, { data: workers }, { data: jobWorkers }] = await Promise.all([
    supabase
      .from('jobs')
      .select(`id, title, status, scheduled_date, client_id, client:clients(id, name), daily_reports(id), job_reports(id, report_type)`)
      .eq('organization_id', orgId)
      .order('scheduled_date', { ascending: false }),
    supabase.from('clients').select('id, name').eq('organization_id', orgId).order('name'),
    supabase.from('profiles').select('id, full_name').eq('organization_id', orgId).in('role', ['worker', 'manager']).order('full_name'),
    supabase.from('job_workers').select('job_id, worker_id'),
  ])

  const normalizedJobs = (jobs ?? []).map(j => ({
    ...j,
    client: Array.isArray(j.client) ? (j.client[0] ?? null) : j.client,
  }))

  return (
    <ReportsManager
      jobs={normalizedJobs}
      clients={clients ?? []}
      workers={workers ?? []}
      jobWorkers={jobWorkers ?? []}
    />
  )
}
