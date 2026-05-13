import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobDetail } from '@/components/manager/job-detail'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: job }, { data: dailyReports }, { data: jobReports }, { data: jobWorkers }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*)').eq('id', id).single(),
    supabase.from('daily_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date', { ascending: false }),
    supabase.from('job_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date'),
    supabase.from('job_workers').select('worker:profiles(id, full_name)').eq('job_id', id),
  ])

  if (!job) notFound()

  const workers = (jobWorkers ?? [])
    .map(jw => (jw.worker as unknown as { id: string; full_name: string } | null))
    .filter(Boolean) as { id: string; full_name: string }[]

  return <JobDetail job={job} dailyReports={dailyReports ?? []} jobReports={jobReports ?? []} workers={workers} />
}
