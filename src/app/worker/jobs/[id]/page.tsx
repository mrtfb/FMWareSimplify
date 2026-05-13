import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WorkerJobDetail } from '@/components/worker/worker-job-detail'

export default async function WorkerJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [{ data: job }, { data: dailyReports }, { data: jobReports }, { data: teammates }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(name, address, contact_name, contact_phone)').eq('id', id).single(),
    supabase.from('daily_reports').select('*, media(*)').eq('job_id', id).order('report_date', { ascending: false }),
    supabase.from('job_reports').select('*, media(*)').eq('job_id', id).order('report_date'),
    supabase.from('job_workers').select('worker_id, worker:profiles(full_name)').eq('job_id', id).neq('worker_id', user!.id),
  ])

  if (!job) notFound()

  const team = (teammates ?? []).map(t => (t.worker as unknown as { full_name: string } | null)?.full_name ?? '').filter(Boolean)

  return <WorkerJobDetail job={job} dailyReports={dailyReports ?? []} jobReports={jobReports ?? []} userId={user!.id} team={team} />
}
