'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  FileText,
  LogOut,
  ClipboardList,
  Building2,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const managerNav: NavItem[] = [
  { href: '/manager', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/clients', label: 'Clientes', icon: Building2 },
  { href: '/manager/workers', label: 'Trabalhadores', icon: Users },
  { href: '/manager/jobs', label: 'Trabalhos', icon: CalendarDays },
  { href: '/manager/reports', label: 'Relatórios', icon: FileText },
]

const workerNav: NavItem[] = [
  { href: '/worker', label: 'Início', icon: LayoutDashboard },
  { href: '/worker/jobs', label: 'Meus Trabalhos', icon: Briefcase },
  { href: '/worker/calendar', label: 'Calendário', icon: CalendarDays },
]

interface SidebarProps {
  role: 'manager' | 'worker'
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const nav = role === 'manager' ? managerNav : workerNav

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ClipboardList className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">FichasWork</span>
        </div>
        <p className="text-gray-400 text-xs mt-2 truncate">{userName}</p>
        <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded mt-1 inline-block capitalize">
          {role === 'manager' ? 'Gestor' : 'Trabalhador'}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/manager' && item.href !== '/worker' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
