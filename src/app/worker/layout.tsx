import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/sidebar'

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')
  if (profile.role === 'manager') redirect('/manager')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="worker" userName={profile.full_name} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
