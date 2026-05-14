import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/sidebar'
import { MobileNav } from '@/components/shared/mobile-nav'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'manager' && profile.role !== 'superadmin')) redirect('/worker')

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', profile.organization_id)
    .single()

  const role = profile.role as 'manager' | 'superadmin'
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} userName={profile.full_name} orgName={org?.name} orgLogo={org?.logo_url} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav role={role} />
    </div>
  )
}
