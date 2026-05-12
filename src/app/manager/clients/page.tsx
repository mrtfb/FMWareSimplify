import { createClient } from '@/lib/supabase/server'
import { ClientsTable } from '@/components/manager/clients-table'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .order('name')

  return <ClientsTable clients={clients ?? []} organizationId={profile?.organization_id ?? ''} />
}
