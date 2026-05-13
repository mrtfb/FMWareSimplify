// handoff/src/app/manager/schedule/page.tsx
//
// NEW ROUTE — mount the Workshop week × worker view at /manager/schedule.
// Add a corresponding nav item in shared/sidebar.tsx (already included
// in the new sidebar). Drop the old "Calendário" tab from jobs-manager.tsx
// at the same time.

import { createClient } from '@/lib/supabase/server'
import { ScheduleView } from '@/components/manager/schedule-view'

export default async function SchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()
  const orgId = profile?.organization_id

  const [{ data: workers }, { data: jobs }, { data: jobWorkers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .eq('role', 'worker')
      .order('full_name'),
    supabase
      .from('jobs')
      .select('id, title, status, scheduled_date, scheduled_time_start, scheduled_time_end, client_id, client:clients(name)')
      .eq('organization_id', orgId)
      .not('scheduled_date', 'is', null),
    supabase.from('job_workers').select('job_id, worker_id'),
  ])

  // Roll worker_ids onto each job for the swim-lane view.
  const ridsByJob = new Map<string, string[]>()
  for (const jw of jobWorkers ?? []) {
    const list = ridsByJob.get(jw.job_id) ?? []
    list.push(jw.worker_id)
    ridsByJob.set(jw.job_id, list)
  }
  const shapedJobs = (jobs ?? []).map(j => ({
    ...j,
    worker_ids: ridsByJob.get(j.id) ?? [],
  })) as never

  return <ScheduleView workers={workers ?? []} jobs={shapedJobs} />
}
