import { createClient } from '@/lib/supabase/server'
import { WorkerJobList } from '@/components/worker/worker-job-list'

export default async function WorkerJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, client:clients(name, address)')
    .eq('worker_id', user!.id)
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })

  return <WorkerJobList jobs={jobs ?? []} />
}
