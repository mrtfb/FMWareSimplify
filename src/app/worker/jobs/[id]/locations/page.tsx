import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WorkerJobLocations } from '@/components/worker/worker-job-locations'

export default async function WorkerJobLocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: access } = await supabase
    .from('job_workers')
    .select('job_id')
    .eq('job_id', id)
    .eq('worker_id', user!.id)
    .single()

  if (!access) notFound()

  const [{ data: job }, { data: locations }] = await Promise.all([
    supabase.from('jobs').select('id, title').eq('id', id).single(),
    supabase.from('job_locations').select('*, media(*)').eq('job_id', id).order('sort_order'),
  ])

  if (!job) notFound()

  return <WorkerJobLocations jobId={id} jobTitle={job.title} locations={locations ?? []} userId={user!.id} />
}
