import { createClient } from '@/lib/supabase/server'
import { ReportsManager } from '@/components/manager/reports-manager'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      client:clients(name, address, contact_email),
      worker:profiles(full_name),
      daily_reports(*, media(*), worker:profiles(full_name)),
      job_reports(*, media(*), worker:profiles(full_name))
    `)
    .eq('organization_id', orgId)
    .order('scheduled_date', { ascending: false })

  return <ReportsManager jobs={jobs ?? []} />
}
