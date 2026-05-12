import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobReportForm } from '@/components/worker/job-report-form'

export default async function StartReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await supabase.from('jobs').select('id, title').eq('id', id).eq('worker_id', user!.id).single()
  if (!job) notFound()

  const { data: existing } = await supabase
    .from('job_reports')
    .select('*, media(public_url)')
    .eq('job_id', id)
    .eq('report_type', 'start')
    .single()

  return <JobReportForm jobId={id} jobTitle={job.title} userId={user!.id} reportType="start" existingReport={existing} />
}
