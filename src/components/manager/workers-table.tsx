'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Plus, UserCircle, Mail, KeyRound, Trash2, Loader2 } from 'lucide-react'
import type { Profile } from '@/types'
import { useRouter } from 'next/navigation'
import { PasswordField, isPasswordStrong } from '@/components/shared/password-field'

interface WorkerRow extends Profile {
  email: string
}

interface WorkersTableProps {
  workers: WorkerRow[]
  organizationId: string
}

export function WorkersTable({ workers, organizationId }: WorkersTableProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [resetTarget, setResetTarget] = useState<WorkerRow | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<WorkerRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const filtered = workers.filter(w =>
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!isPasswordStrong(form.password)) { setError('A password não cumpre os requisitos mínimos.'); return }
    if (form.password !== confirm) { setError('As passwords não coincidem.'); return }
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
    setConfirm('')
    router.refresh()
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setResetLoading(true)
    setResetMsg('')
    const res = await fetch(`/api/workers/${resetTarget.id}`, { method: 'PATCH' })
    const data = await res.json().catch(() => ({}))
    setResetLoading(false)
    if (!res.ok) { setResetMsg(`Erro: ${data.error ?? 'Não foi possível redefinir a password'}`); return }
    setResetMsg('Nova password enviada por email!')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    const res = await fetch(`/api/workers/${deleteTarget.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setDeleteLoading(false)
    if (!res.ok) { setDeleteError(data.error ?? 'Não foi possível remover o trabalhador'); return }
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Trabalhadores</h1>
          <p className="text-mute text-sm mt-1">{workers.length} trabalhador{workers.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo trabalhador</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar trabalhador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-mute">Será criada uma conta de acesso para o trabalhador.</p>
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
                <PasswordField value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} showStrength />
              </div>
              <div className="space-y-1">
                <Label>Confirmar password *</Label>
                <PasswordField value={confirm} onChange={setConfirm} />
                {confirm.length > 0 && form.password !== confirm && (
                  <p className="text-xs text-red-500">As passwords não coincidem.</p>
                )}
              </div>
              <p className="text-xs text-mute">O trabalhador receberá um email com os dados de acesso.</p>
              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={loading || !form.full_name || !form.email || !isPasswordStrong(form.password) || form.password !== confirm}>
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
        className="w-full max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-mute">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum trabalhador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(worker => (
            <Card key={worker.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-raise rounded-full p-2 shrink-0">
                    <UserCircle className="h-7 w-7 text-mute" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{worker.full_name}</p>
                    {worker.email && (
                      <p className="text-xs text-mute flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />{worker.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1 gap-1"
                    onClick={() => { setResetTarget(worker); setResetMsg('') }}
                  >
                    <KeyRound className="h-3 w-3" />Redefinir password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => { setDeleteTarget(worker); setDeleteError('') }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) setResetTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-2 mt-1">
            Será gerada uma nova password aleatória para <strong>{resetTarget?.full_name}</strong> e enviada para <strong>{resetTarget?.email}</strong>.
          </p>
          {resetMsg && (
            <p className={`text-sm mt-2 ${resetMsg.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}>{resetMsg}</p>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Fechar</Button>
            {!resetMsg.startsWith('Nova') && (
              <Button onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />A enviar...</> : 'Confirmar'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover trabalhador?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-2 mt-1">
            <strong>{deleteTarget?.full_name}</strong> perderá o acesso à aplicação. As fichas já submetidas são mantidas.
          </p>
          {deleteError && <p className="text-sm text-red-600 mt-2">{deleteError}</p>}
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deleteLoading ? 'A remover...' : 'Remover'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
