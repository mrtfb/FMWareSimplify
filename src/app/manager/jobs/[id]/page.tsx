import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobDetail } from '@/components/manager/job-detail'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const [
    { data: job },
    { data: dailyReports },
    { data: jobReports },
    { data: jobWorkers },
    { data: clients },
    { data: allWorkers },
  ] = await Promise.all([
    supabase.from('jobs').select('*, client:clients(*)').eq('id', id).single(),
    supabase.from('daily_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date', { ascending: false }),
    supabase.from('job_reports').select('*, worker:profiles(full_name), media(*)').eq('job_id', id).order('report_date'),
    supabase.from('job_workers').select('worker:profiles(id, full_name)').eq('job_id', id),
    supabase.from('clients').select('id, name').eq('organization_id', orgId).order('name'),
    supabase.from('profiles').select('id, full_name').eq('organization_id', orgId).eq('role', 'worker').order('full_name'),
  ])

  if (!job) notFound()

  const assignedWorkers = (jobWorkers ?? [])
    .map(jw => (jw.worker as unknown as { id: string; full_name: string } | null))
    .filter(Boolean) as { id: string; full_name: string }[]

  return (
    <JobDetail
      job={job}
      dailyReports={dailyReports ?? []}
      jobReports={jobReports ?? []}
      workers={assignedWorkers}
      clients={clients ?? []}
      allWorkers={allWorkers ?? []}
      organizationId={orgId ?? ''}
    />
  )
}
