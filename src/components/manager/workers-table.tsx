'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Plus, UserCircle } from 'lucide-react'
import type { Profile } from '@/types'
import { useRouter } from 'next/navigation'

interface WorkersTableProps {
  workers: Profile[]
  organizationId: string
}

export function WorkersTable({ workers, organizationId }: WorkersTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const filtered = workers.filter(w => w.full_name.toLowerCase().includes(search.toLowerCase()))

  async function handleCreate() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, organization_id: organizationId }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar trabalhador')
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    setForm({ full_name: '', email: '', password: '' })
    router.refresh()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabalhadores</h1>
          <p className="text-gray-500 text-sm mt-1">{workers.length} trabalhador{workers.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo trabalhador</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar trabalhador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-500">Será criada uma conta de acesso para o trabalhador.</p>
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nome do trabalhador" />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
              </div>
              <div className="space-y-1">
                <Label>Password inicial *</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={loading || !form.full_name || !form.email || !form.password}>
                  {loading ? 'A criar...' : 'Criar conta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Pesquisar trabalhadores..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum trabalhador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(worker => (
            <Card key={worker.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-gray-100 rounded-full p-2">
                  <UserCircle className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold">{worker.full_name}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Trabalhador</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
