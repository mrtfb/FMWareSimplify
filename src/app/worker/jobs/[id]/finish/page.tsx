import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobReportForm } from '@/components/worker/job-report-form'

export default async function FinishReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await supabase.from('jobs').select('id, title, client:clients(name)').eq('id', id).eq('worker_id', user!.id).single()
  if (!job) notFound()

  const { data: existing } = await supabase
    .from('job_reports')
    .select('*, media(public_url)')
    .eq('job_id', id)
    .eq('report_type', 'finish')
    .single()

  const clientName = (job.client as unknown as { name: string } | null)?.name ?? null
  return <JobReportForm jobId={id} jobTitle={job.title} clientName={clientName} userId={user!.id} reportType="finish" existingReport={existing} />
}
