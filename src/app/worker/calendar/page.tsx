import { createClient } from '@/lib/supabase/server'
import { WorkerCalendar } from '@/components/worker/worker-calendar'

export default async function WorkerCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, client:clients(name, address)')
    .in('id', (
      await supabase
        .from('job_workers')
        .select('job_id')
        .eq('worker_id', user!.id)
    ).data?.map(jw => jw.job_id) ?? [])
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })

  return <WorkerCalendar jobs={jobs ?? []} />
}
