'use client'

import { useState } from 'react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Plus, Phone, Mail, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Client } from '@/types'
import { useRouter } from 'next/navigation'

interface ClientsTableProps {
  clients: Client[]
  organizationId: string
}

const emptyForm = { name: '', address: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' }

export function ClientsTable({ clients, organizationId }: ClientsTableProps) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({
      name: client.name,
      address: client.address ?? '',
      contact_name: client.contact_name ?? '',
      contact_email: client.contact_email ?? '',
      contact_phone: client.contact_phone ?? '',
      notes: client.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      await supabase.from('clients').update(form).eq('id', editing.id)
    } else {
      await supabase.from('clients').insert({ ...form, organization_id: organizationId })
    }
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem a certeza que quer apagar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da empresa ou cliente" />
              </div>
              <div className="space-y-1">
                <Label>Morada</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, nº, cidade" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Contacto</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nome do contacto" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+351 ..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="email@cliente.com" />
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={loading || !form.name.trim()}>
                  {loading ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Pesquisar clientes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente encontrado</p>
          <Button variant="outline" className="mt-3" onClick={openNew}>Adicionar cliente</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  {client.contact_name && <p className="text-sm text-gray-500">{client.contact_name}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {client.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{client.address}</span>
                  </div>
                )}
                {client.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{client.contact_phone}</span>
                  </div>
                )}
                {client.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.contact_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
