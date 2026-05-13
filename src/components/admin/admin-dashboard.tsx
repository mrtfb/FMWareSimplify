'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import { Building2, Users, Briefcase, Plus, MoreHorizontal, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { setOrgStatus, setOrgPlan, createOrgWithManager } from '@/app/admin/actions'

interface OrgRow {
  id: string
  name: string
  plan: string
  status: string
  created_at: string
  workers: number
  managers: number
  jobs_total: number
  jobs_active: number
}

const planColors: Record<string, string> = {
  trial:    'bg-yellow-100 text-yellow-800',
  starter:  'bg-blue-100 text-blue-800',
  pro:      'bg-purple-100 text-purple-800',
  business: 'bg-green-100 text-green-800',
}

const plans = ['trial', 'starter', 'pro', 'business']

export function AdminDashboard({ orgs }: { orgs: OrgRow[] }) {
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ orgName: '', managerName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function set(f: string, v: string) { setForm(prev => ({ ...prev, [f]: v })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const result = await createOrgWithManager(form)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setNewOpen(false)
    setForm({ orgName: '', managerName: '', email: '', password: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
            <p className="text-xs text-gray-500">FichasWork — Gestão de organizações</p>
          </div>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova organização
        </Button>
      </div>

      {/* Stats */}
      <div className="px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Organizações', value: orgs.length, icon: Building2, color: 'text-blue-600' },
          { label: 'Ativas', value: orgs.filter(o => o.status === 'active').length, icon: Building2, color: 'text-green-600' },
          { label: 'Total trabalhadores', value: orgs.reduce((s, o) => s + o.workers, 0), icon: Users, color: 'text-purple-600' },
          { label: 'Trabalhos ativos', value: orgs.reduce((s, o) => s + o.jobs_active, 0), icon: Briefcase, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border p-4">
            <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">Plano</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Gestores</th>
                <th className="text-center px-4 py-3">Trabalhadores</th>
                <th className="text-center px-4 py-3">Trabalhos</th>
                <th className="text-left px-4 py-3">Criado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[org.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {org.status === 'active' ? 'Ativa' : 'Suspensa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{org.managers}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{org.workers}</td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {org.jobs_active > 0
                      ? <span className="text-blue-600 font-medium">{org.jobs_active} ativos</span>
                      : <span className="text-gray-400">{org.jobs_total} total</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(org.created_at), 'dd MMM yyyy', { locale: ptPT })}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === org.id ? null : org.id)}
                      className="p-1.5 rounded hover:bg-gray-100"
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </button>
                    {openMenuId === org.id && (
                      <div className="absolute right-4 top-10 z-10 bg-white border rounded-lg shadow-lg py-1 w-44">
                        {plans.map(p => (
                          <button
                            key={p}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                            onClick={() => { setOrgPlan(org.id, p); setOpenMenuId(null) }}
                          >
                            Plano: {p}
                          </button>
                        ))}
                        <div className="border-t my-1" />
                        {org.status === 'active' ? (
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => { setOrgStatus(org.id, 'suspended'); setOpenMenuId(null) }}
                          >
                            Suspender
                          </button>
                        ) : (
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm text-green-600 hover:bg-green-50"
                            onClick={() => { setOrgStatus(org.id, 'active'); setOpenMenuId(null) }}
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma organização ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New org dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova organização</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nome da empresa *</Label>
              <Input placeholder="Ex: Electricidade Silva Lda" value={form.orgName} onChange={e => set('orgName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nome do gestor *</Label>
              <Input placeholder="Ex: João Silva" value={form.managerName} onChange={e => set('managerName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email do gestor *</Label>
              <Input type="email" placeholder="joao@empresa.pt" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Password temporária *</Label>
              <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'A criar...' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
