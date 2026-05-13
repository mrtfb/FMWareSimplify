'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { JobsTable } from './jobs-table'
import type { Job } from '@/types'
import { useRouter } from 'next/navigation'
import { addDays, addMonths } from 'date-fns'

interface JobWorkerRow {
  job_id: string
  worker_id: string
  worker?: { full_name: string } | null
}

interface JobsManagerProps {
  jobs: (Job & { client?: { name: string } | null })[]
  clients: { id: string; name: string }[]
  workers: { id: string; full_name: string }[]
  jobWorkers: JobWorkerRow[]
  organizationId: string
}

const emptyForm = {
  title: '',
  description: '',
  location: '',
  client_id: '',
  worker_ids: [] as string[],
  scheduled_date: '',
  scheduled_time_start: '08:00',
  scheduled_time_end: '17:00',
  duration_days: 1,
  status: 'pending' as Job['status'],
  recurrence: 'none' as 'none' | 'weekly' | 'monthly',
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

const recurrenceConfig = {
  none: null,
  weekly: { label: 'Semanal', color: 'bg-indigo-100 text-indigo-700' },
  monthly: { label: 'Mensal', color: 'bg-violet-100 text-violet-700' },
}

export function JobsManager({ jobs, clients, workers, jobWorkers, organizationId }: JobsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')

  const workersByJob: Record<string, { worker_id: string; full_name: string }[]> = {}
  jobWorkers.forEach(jw => {
    if (!workersByJob[jw.job_id]) workersByJob[jw.job_id] = []
    workersByJob[jw.job_id].push({
      worker_id: jw.worker_id,
      full_name: (jw.worker as { full_name: string } | null)?.full_name ?? '',
    })
  })

  const filteredJobs = jobs.filter(job => {
    const clientName = (job.client as { name: string } | null)?.name ?? ''
    const matchSearch = !search ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      (workersByJob[job.id] ?? []).some(w => w.full_name.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || job.status === filterStatus
    const matchClient = filterClient === 'all' || job.client_id === filterClient
    return matchSearch && matchStatus && matchClient
  })

  function toggleWorker(id: string) {
    setForm(f => ({
      ...f,
      worker_ids: f.worker_ids.includes(id) ? f.worker_ids.filter(w => w !== id) : [...f.worker_ids, id],
    }))
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(job: Job) {
    setEditing(job)
    setForm({
      title: job.title,
      description: job.description ?? '',
      location: job.location ?? '',
      client_id: job.client_id ?? '',
      worker_ids: workersByJob[job.id]?.map(w => w.worker_id) ?? [],
      scheduled_date: job.scheduled_date ?? '',
      scheduled_time_start: job.scheduled_time_start ?? '',
      scheduled_time_end: job.scheduled_time_end ?? '',
      duration_days: job.duration_days ?? 1,
      status: job.status,
      recurrence: (job.recurrence as 'none' | 'weekly' | 'monthly') ?? 'none',
    })
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    const { worker_ids, ...rest } = form
    const payload = {
      ...rest,
      client_id: rest.client_id || null,
      scheduled_date: rest.scheduled_date || null,
      scheduled_time_start: rest.scheduled_time_start || null,
      scheduled_time_end: rest.scheduled_time_end || null,
    }

    let jobId: string
    const isNew = !editing

    if (editing) {
      await supabase.from('jobs').update(payload).eq('id', editing.id)
      jobId = editing.id
      await supabase.from('job_workers').delete().eq('job_id', jobId)
    } else {
      const { data } = await supabase.from('jobs').insert({ ...payload, organization_id: organizationId }).select().single()
      jobId = data!.id
    }

    if (worker_ids.length > 0) {
      await supabase.from('job_workers').insert(worker_ids.map(wid => ({ job_id: jobId, worker_id: wid })))
    }

    if (isNew && worker_ids.length > 0) {
      fetch('/api/jobs/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      }).catch(() => null)
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  async function createNextOccurrence() {
    if (!editing || !form.scheduled_date || form.recurrence === 'none') return
    setLoading(true)

    const base = new Date(form.scheduled_date + 'T12:00:00')
    const next = form.recurrence === 'weekly' ? addDays(base, 7) : addMonths(base, 1)
    const nextDate = next.toISOString().split('T')[0]

    const { data } = await supabase.from('jobs').insert({
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      client_id: form.client_id || null,
      scheduled_date: nextDate,
      scheduled_time_start: form.scheduled_time_start || null,
      scheduled_time_end: form.scheduled_time_end || null,
      recurrence: form.recurrence,
      status: 'pending',
      organization_id: organizationId,
    }).select().single()

    if (data && form.worker_ids.length > 0) {
      await supabase.from('job_workers').insert(
        form.worker_ids.map(wid => ({ job_id: data.id, worker_id: wid }))
      )
      fetch('/api/jobs/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: data.id }),
      }).catch(() => null)
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const selectedWorkerNames = form.worker_ids
    .map(id => workers.find(w => w.id === id)?.full_name)
    .filter(Boolean)
    .join(', ')

  const jobForm = (
    <div className="space-y-4 mt-2">
      <div className="space-y-1">
        <Label>Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Instalação elétrica" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v ?? '' })}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm truncate">
                {form.client_id ? clients.find(c => c.id === form.client_id)?.name : <span className="text-muted-foreground">Selecionar...</span>}
              </span>
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: (v ?? 'pending') as Job['status'] })}>
            <SelectTrigger>
              <span className="flex-1 text-left text-sm">{statusConfig[form.status]?.label}</span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Trabalhadores</Label>
        {selectedWorkerNames && <p className="text-xs text-blue-600 mb-1">{selectedWorkerNames}</p>}
        <div className="border rounded-lg divide-y max-h-36 overflow-y-auto">
          {workers.length === 0 ? (
            <p className="text-sm text-gray-400 p-3 text-center">Sem trabalhadores</p>
          ) : workers.map(w => (
            <label key={w.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.worker_ids.includes(w.id)}
                onChange={() => toggleWorker(w.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm">{w.full_name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Local</Label>
        <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Morada do trabalho" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>Data início</Label>
          <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Dias</Label>
          <Input type="number" min="1" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: Math.max(1, parseInt(e.target.value) || 1) }))} />
        </div>
        <div className="space-y-1">
          <Label>Hora início</Label>
          <Input type="time" value={form.scheduled_time_start} onChange={e => setForm(f => ({ ...f, scheduled_time_start: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Hora fim</Label>
          <Input type="time" value={form.scheduled_time_end} onChange={e => setForm(f => ({ ...f, scheduled_time_end: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Recorrência</Label>
        <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: (v ?? 'none') as typeof form.recurrence })}>
          <SelectTrigger>
            <span className="flex-1 text-left text-sm">
              {form.recurrence === 'none' ? 'Sem recorrência' : form.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem recorrência</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes do trabalho..." rows={3} />
      </div>

      <div className="flex gap-2 justify-end pt-2 flex-wrap">
        {editing && form.recurrence !== 'none' && form.scheduled_date && (
          <Button variant="outline" onClick={createNextOccurrence} disabled={loading} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Criar próxima ocorrência
          </Button>
        )}
        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={loading || !form.title.trim()}>
          {loading ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabalhos</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredJobs.length} de {jobs.length} trabalho{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo trabalho</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar trabalho' : 'Novo trabalho'}</DialogTitle>
            </DialogHeader>
            {jobForm}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Pesquisar título, cliente, trabalhador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <span className="text-sm">{filterStatus === 'all' ? 'Todos os estados' : statusConfig[filterStatus as keyof typeof statusConfig]?.label}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={v => setFilterClient(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <span className="text-sm truncate">{filterClient === 'all' ? 'Todos os clientes' : clients.find(c => c.id === filterClient)?.name ?? 'Cliente'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || filterStatus !== 'all' || filterClient !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterClient('all') }}>
            Limpar
          </Button>
        )}
      </div>

      <JobsTable jobs={filteredJobs} workers={workers} jobWorkers={jobWorkers} onEdit={job => openEdit(job as Job)} />
    </div>
  )
}

