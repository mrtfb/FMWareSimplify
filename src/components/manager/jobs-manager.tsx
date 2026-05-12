'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, CalendarDays, List, Briefcase, MapPin, Users } from 'lucide-react'
import type { Job } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  scheduled_time_start: '',
  scheduled_time_end: '',
  status: 'pending' as Job['status'],
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em curso', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export function JobsManager({ jobs, clients, workers, jobWorkers, organizationId }: JobsManagerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const workersByJob: Record<string, { worker_id: string; full_name: string }[]> = {}
  jobWorkers.forEach(jw => {
    if (!workersByJob[jw.job_id]) workersByJob[jw.job_id] = []
    workersByJob[jw.job_id].push({ worker_id: jw.worker_id, full_name: (jw.worker as { full_name: string } | null)?.full_name ?? '' })
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
      status: job.status,
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

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const selectedWorkerNames = form.worker_ids.map(id => workers.find(w => w.id === id)?.full_name).filter(Boolean).join(', ')

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
              <span className="flex-1 text-left text-sm">
                {statusConfig[form.status]?.label ?? 'Selecionar...'}
              </span>
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
        {selectedWorkerNames && (
          <p className="text-xs text-blue-600 mb-1">{selectedWorkerNames}</p>
        )}
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
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Data</Label>
          <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
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
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes do trabalho..." rows={3} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
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
          <p className="text-gray-500 text-sm mt-1">{jobs.length} trabalho{jobs.length !== 1 ? 's' : ''}</p>
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

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Lista</TabsTrigger>
          <TabsTrigger value="board"><CalendarDays className="h-4 w-4 mr-1.5" />Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum trabalho criado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => {
                const st = statusConfig[job.status]
                const assignedWorkers = workersByJob[job.id] ?? []
                return (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/manager/jobs/${job.id}`} className="font-semibold hover:text-blue-600 transition-colors">{job.title}</Link>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                            {job.client && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{(job.client as { name: string }).name}</span>}
                            {job.location && <span className="text-xs text-gray-400">{job.location}</span>}
                            {assignedWorkers.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {assignedWorkers.map(w => w.full_name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {job.scheduled_date && (
                            <p className="text-sm font-medium">{format(new Date(job.scheduled_date), 'dd MMM yyyy', { locale: ptBR })}</p>
                          )}
                          {job.scheduled_time_start && (
                            <p className="text-xs text-gray-500">{job.scheduled_time_start.slice(0, 5)}{job.scheduled_time_end ? ` – ${job.scheduled_time_end.slice(0, 5)}` : ''}</p>
                          )}
                          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => openEdit(job)}>Editar</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <CalendarView jobs={jobs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CalendarView({ jobs }: { jobs: JobsManagerProps['jobs'] }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPad = firstDay.getDay()
  const days = lastDay.getDate()

  const jobsByDate: Record<string, typeof jobs> = {}
  jobs.forEach(job => {
    if (job.scheduled_date) {
      if (!jobsByDate[job.scheduled_date]) jobsByDate[job.scheduled_date] = []
      jobsByDate[job.scheduled_date].push(job)
    }
  })

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const monthLabel = format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="bg-white rounded-xl border">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="outline" size="sm" onClick={prevMonth}>{'<'}</Button>
        <h3 className="font-semibold capitalize">{monthLabel}</h3>
        <Button variant="outline" size="sm" onClick={nextMonth}>{'>'}</Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="min-h-[80px] border-r border-b p-1 bg-gray-50" />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayJobs = jobsByDate[dateStr] ?? []
          const isToday = dateStr === format(today, 'yyyy-MM-dd')
          return (
            <div key={day} className={`min-h-[80px] border-r border-b p-1 ${isToday ? 'bg-blue-50' : ''}`}>
              <p className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</p>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 2).map(job => (
                  <Link key={job.id} href={`/manager/jobs/${job.id}`} className="block text-xs bg-blue-600 text-white px-1 py-0.5 rounded truncate hover:bg-blue-700">
                    {job.title}
                  </Link>
                ))}
                {dayJobs.length > 2 && <p className="text-xs text-gray-400">+{dayJobs.length - 2}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
