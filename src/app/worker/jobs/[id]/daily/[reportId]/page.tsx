import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DailyReportForm } from '@/components/worker/daily-report-form'

export default async function EditDailyReportPage({ params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: access } = await supabase
    .from('job_workers')
    .select('job_id')
    .eq('job_id', id)
    .eq('worker_id', user!.id)
    .single()

  if (!access) notFound()

  const [{ data: job }, { data: report }] = await Promise.all([
    supabase.from('jobs').select('id, title').eq('id', id).single(),
    supabase.from('daily_reports').select('*, media(public_url)').eq('id', reportId).eq('job_id', id).single(),
  ])

  if (!job || !report) notFound()

  return <DailyReportForm jobId={id} jobTitle={job.title} userId={user!.id} existingReport={report} />
}
