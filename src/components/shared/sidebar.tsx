'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  LogOut,
  ClipboardList,
  Building2,
  Briefcase,
  CalendarClock,
  Settings,
  ShieldCheck,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const managerNav: NavItem[] = [
  { href: '/manager',          label: 'Hoje',      icon: LayoutDashboard },
  { href: '/manager/jobs',     label: 'Trabalhos', icon: Briefcase },
  { href: '/manager/schedule', label: 'Agenda',    icon: CalendarClock },
  { href: '/manager/clients',  label: 'Clientes',  icon: Building2 },
  { href: '/manager/workers',  label: 'Equipa',    icon: Users },
  { href: '/manager/reports',  label: 'Fichas',    icon: FileText },
]

const workerNav: NavItem[] = [
  { href: '/worker',          label: 'Hoje',       icon: LayoutDashboard },
  { href: '/worker/jobs',     label: 'Trabalhos',  icon: Briefcase },
  { href: '/worker/calendar', label: 'Calendário', icon: CalendarDays },
]

interface SidebarProps {
  role: 'manager' | 'worker' | 'superadmin'
  userName: string
  orgName?: string
  orgLogo?: string | null
}

export function Sidebar({ role, userName, orgName, orgLogo }: SidebarProps) {
  const pathname = usePathname()
  const nav = (role === 'manager' || role === 'superadmin') ? managerNav : workerNav

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="border-b border-border px-[18px] pb-[18px] pt-5">
        <div className="flex items-center gap-2.5">
          {orgLogo ? (
            <Image
              src={orgLogo}
              alt={orgName ?? 'Logo'}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber text-ink">
              <ClipboardList className="h-4 w-4" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {orgName ?? 'FichasWork'}
            </div>
            {orgName && (
              <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-mute">
                FichasWork
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-px p-[10px]">
        {nav.map(item => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/manager' &&
              item.href !== '/worker' &&
              pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-ink'
                  : 'text-ink-2 hover:bg-sidebar-accent/60 hover:text-ink',
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-[10px] top-1.5 bottom-1.5 w-[2px] rounded-sm bg-amber"
                />
              )}
              <Icon
                className={cn('h-[15px] w-[15px]', active && 'text-ink')}
                strokeWidth={active ? 2 : 1.5}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + settings */}
      <div className="border-t border-border p-3">
        {(role === 'manager' || role === 'superadmin') && (
          <Link
            href="/manager/settings"
            className={cn(
              'mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
              pathname.startsWith('/manager/settings')
                ? 'bg-sidebar-accent text-ink'
                : 'text-ink-2 hover:bg-sidebar-accent/60 hover:text-ink',
            )}
          >
            <Settings className="h-[15px] w-[15px]" strokeWidth={1.5} />
            Definições
          </Link>
        )}
        {role === 'superadmin' && (
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-sidebar-accent/60 hover:text-ink"
          >
            <ShieldCheck className="h-[15px] w-[15px]" strokeWidth={1.5} />
            Admin
          </Link>
        )}
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-soft font-mono text-[11px] font-semibold text-ink">
            {userName.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{userName}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-mute">
              {role === 'manager' ? 'GESTOR' : 'TÉCNICO'}
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-mute transition-colors hover:text-ink" aria-label="Sair">
              <LogOut className="h-[14px] w-[14px]" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
