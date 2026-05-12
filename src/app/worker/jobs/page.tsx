import { createClient } from '@/lib/supabase/server'
import { WorkerJobList } from '@/components/worker/worker-job-list'

export default async function WorkerJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobWorkers } = await supabase
    .from('job_workers')
    .select('job_id')
    .eq('worker_id', user!.id)

  const jobIds = jobWorkers?.map(jw => jw.job_id) ?? []

  const { data: jobs } = jobIds.length > 0
    ? await supabase
        .from('jobs')
        .select('*, client:clients(name, address)')
        .in('id', jobIds)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })
    : { data: [] }

  return <WorkerJobList jobs={jobs ?? []} />
}
