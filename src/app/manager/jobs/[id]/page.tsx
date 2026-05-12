import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobDetail } from '@/components/manager/job-detail'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: job }, { data: dailyReports }, { data: jobReports }] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*), worker:profiles(*)').eq('id', id).single(),
    supabase.from('daily_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date', { ascending: false }),
    supabase.from('job_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date'),
  ])

  if (!job) notFound()

  return <JobDetail job={job} dailyReports={dailyReports ?? []} jobReports={jobReports ?? []} />
}
