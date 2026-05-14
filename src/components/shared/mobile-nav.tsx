'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, CalendarClock, Users, FileText,
  CalendarDays, KeyRound, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const managerItems = [
  { href: '/manager',          label: 'Hoje',      icon: LayoutDashboard },
  { href: '/manager/jobs',     label: 'Trabalhos', icon: Briefcase },
  { href: '/manager/schedule', label: 'Agenda',    icon: CalendarClock },
  { href: '/manager/workers',  label: 'Equipa',    icon: Users },
  { href: '/manager/reports',  label: 'Fichas',    icon: FileText },
]

const workerItems = [
  { href: '/worker/jobs',      label: 'Trabalhos',  icon: Briefcase },
  { href: '/worker/calendar',  label: 'Calendário', icon: CalendarDays },
  { href: '/worker/settings',  label: 'Conta',      icon: KeyRound },
]

export function MobileNav({ role }: { role: 'manager' | 'worker' | 'superadmin' }) {
  const pathname = usePathname()
  const items = role === 'worker' ? workerItems : managerItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sidebar md:hidden">
      <div className="flex items-stretch">
        {items.map(item => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/manager' && item.href !== '/worker' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-2',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-amber' : 'text-ink-2')} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          )
        })}
        {role === 'manager' && (
          <Link
            href="/manager/settings"
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              pathname.startsWith('/manager/settings') ? 'text-ink' : 'text-ink-2',
            )}
          >
            <Settings className={cn('h-5 w-5', pathname.startsWith('/manager/settings') ? 'text-amber' : 'text-ink-2')} strokeWidth={1.5} />
            Config.
          </Link>
        )}
      </div>
    </nav>
  )
}
