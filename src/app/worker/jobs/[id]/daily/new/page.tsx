import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DailyReportForm } from '@/components/worker/daily-report-form'

export default async function NewDailyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await supabase.from('jobs').select('id, title').eq('id', id).eq('worker_id', user!.id).single()
  if (!job) notFound()

  return <DailyReportForm jobId={id} jobTitle={job.title} userId={user!.id} />
}
