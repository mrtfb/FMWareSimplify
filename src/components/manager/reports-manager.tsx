'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { FileText, Download, Loader2, CheckSquare, Square, Building2, Calendar, Users, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { pt as ptPT } from 'date-fns/locale'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  status: string
  scheduled_date: string | null
  client_id: string | null
  client?: { id: string; name: string } | null
  daily_reports?: { id: string }[]
  job_reports?: { id: string; report_type: string }[]
}

interface ReportsManagerProps {
  jobs: Job[]
  clients: { id: string; name: string }[]
  workers: { id: string; full_name: string }[]
  jobWorkers: { job_id: string; worker_id: string }[]
}

const statusConfig = {
  pending:     { label: 'Pendente',  color: 'bg-yellow-500/15 text-yellow-400' },
  in_progress: { label: 'Em curso',  color: 'bg-blue-500/15 text-blue-400'    },
  completed:   { label: 'Concluído', color: 'bg-green-500/15 text-green-400'  },
  cancelled:   { label: 'Cancelado', color: 'bg-red-500/15 text-red-400'      },
}

export function ReportsManager({ jobs, clients, workers, jobWorkers }: ReportsManagerProps) {
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [filterClient, setFilterClient] = useState('all')
  const [filterWorker, setFilterWorker] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [exportStatus, setExportStatus] = useState<string>('')

  // Build worker→jobs map
  const workerJobIds = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const jw of jobWorkers) {
      if (!map[jw.worker_id]) map[jw.worker_id] = new Set()
      map[jw.worker_id].add(jw.job_id)
    }
    return map
  }, [jobWorkers])

  const filtered = useMemo(() => jobs.filter(job => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false
    if (filterClient !== 'all' && job.client_id !== filterClient) return false
    if (filterWorker !== 'all' && !workerJobIds[filterWorker]?.has(job.id)) return false
    if (dateFrom && job.scheduled_date && job.scheduled_date < dateFrom) return false
    if (dateTo && job.scheduled_date && job.scheduled_date > dateTo) return false
    return true
  }), [jobs, filterStatus, filterClient, filterWorker, dateFrom, dateTo, workerJobIds])

  const withData = filtered.filter(j => {
    const daily = j.daily_reports?.length ?? 0
    const start = j.job_reports?.some(r => r.report_type === 'start')
    const finish = j.job_reports?.some(r => r.report_type === 'finish')
    return daily > 0 || start || finish
  })

  function toggleAll() {
    if (selected.size === withData.length && withData.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(withData.map(j => j.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function exportSelected() {
    const ids = [...selected]
    for (let i = 0; i < ids.length; i++) {
      const job = jobs.find(j => j.id === ids[i])
      setExportStatus(`A exportar ${i + 1} de ${ids.length}: ${job?.title ?? ''}...`)
      try {
        const res = await fetch(`/api/pdf/${ids[i]}`)
        if (!res.ok) throw new Error()
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const clientName = (job?.client as { name: string } | null)?.name
        a.download = `relatorio_${(job?.title ?? ids[i]).replace(/\s+/g, '_')}${clientName ? `_${clientName.replace(/\s+/g, '_')}` : ''}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // continue with remaining
      }
      // small pause between downloads to avoid browser blocking
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 600))
    }
    setExportStatus('')
  }

  const allWithDataSelected = withData.length > 0 && selected.size === withData.length
  const hasFilters = dateFrom || dateTo || filterClient !== 'all' || filterWorker !== 'all' || filterStatus !== 'all'

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Fichas</h1>
          <p className="text-mute text-sm mt-0.5">Visualiza, filtra e exporta fichas de trabalho</p>
        </div>
        {selected.size > 0 && (
          <Button onClick={exportSelected} disabled={!!exportStatus} className="gap-2">
            {exportStatus
              ? <><Loader2 className="h-4 w-4 animate-spin" />{exportStatus}</>
              : <><FileDown className="h-4 w-4" />Exportar {selected.size} PDF{selected.size > 1 ? 's' : ''}</>
            }
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 space-y-3">
        <p className="text-xs font-semibold text-mute uppercase tracking-wide">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex gap-2 items-center col-span-1 sm:col-span-2 lg:col-span-1">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1" title="Data de início" />
            <span className="text-mute text-sm shrink-0">até</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1" title="Data de fim" />
          </div>
          <Select value={filterClient} onValueChange={v => setFilterClient(v ?? 'all')}>
            <SelectTrigger>
              <span className="text-sm truncate">{filterClient === 'all' ? 'Todos os clientes' : clients.find(c => c.id === filterClient)?.name}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterWorker} onValueChange={v => setFilterWorker(v ?? 'all')}>
            <SelectTrigger>
              <span className="text-sm truncate">{filterWorker === 'all' ? 'Todos os trabalhadores' : workers.find(w => w.id === filterWorker)?.full_name}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os trabalhadores</SelectItem>
              {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'all')}>
            <SelectTrigger>
              <span className="text-sm">{filterStatus === 'all' ? 'Todos os estados' : statusConfig[filterStatus as keyof typeof statusConfig]?.label}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <button
            className="text-xs text-mute hover:text-ink transition-colors"
            onClick={() => { setDateFrom(''); setDateTo(''); setFilterClient('all'); setFilterWorker('all'); setFilterStatus('all') }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Results header */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-mute">{filtered.length} trabalho{filtered.length !== 1 ? 's' : ''} · {withData.length} com fichas</p>
          {withData.length > 0 && (
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-mute hover:text-ink transition-colors">
              {allWithDataSelected
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              {allWithDataSelected ? 'Desselecionar todos' : 'Selecionar todos com fichas'}
            </button>
          )}
        </div>
      )}

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-mute">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>{hasFilters ? 'Nenhum trabalho corresponde aos filtros' : 'Sem trabalhos'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const st = statusConfig[job.status as keyof typeof statusConfig]
            const client = job.client as { id: string; name: string } | null
            const daily = job.daily_reports?.length ?? 0
            const startReport = job.job_reports?.find(r => r.report_type === 'start')
            const finishReport = job.job_reports?.find(r => r.report_type === 'finish')
            const hasData = daily > 0 || !!startReport || !!finishReport
            const isSelected = selected.has(job.id)
            const jobWorkerNames = (jobWorkers ?? [])
              .filter(jw => jw.job_id === job.id)
              .map(jw => workers.find(w => w.id === jw.worker_id)?.full_name)
              .filter(Boolean)

            return (
              <div
                key={job.id}
                className={`rounded-xl border p-4 transition-colors ${isSelected ? 'border-primary/50 bg-primary/5' : 'bg-card border-border'} ${!hasData ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    disabled={!hasData}
                    onClick={() => toggle(job.id)}
                    className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
                    aria-label={isSelected ? 'Desselecionar' : 'Selecionar'}
                  >
                    {isSelected
                      ? <CheckSquare className="h-5 w-5 text-primary" />
                      : <Square className="h-5 w-5 text-mute" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-ink">{job.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st?.color}`}>{st?.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-mute mb-2">
                      {client && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{client.name}</span>}
                      {jobWorkerNames.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{jobWorkerNames.join(', ')}</span>}
                      {job.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(job.scheduled_date + 'T12:00:00'), "d 'de' MMM yyyy", { locale: ptPT })}
                        </span>
                      )}
                    </div>
                    {/* Ficha summary */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${startReport ? 'bg-green-500/15 text-green-400' : 'bg-raise text-mute'}`}>
                        {startReport ? '✓ Início' : '— Início'}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${daily > 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-raise text-mute'}`}>
                        {daily} diária{daily !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${finishReport ? 'bg-green-500/15 text-green-400' : 'bg-raise text-mute'}`}>
                        {finishReport ? '✓ Fim' : '— Fim'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/manager/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs w-full">Ver fichas</Button>
                    </Link>
                    {hasData && !isSelected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs w-full gap-1"
                        onClick={async () => {
                          setExportStatus(`A exportar ${job.title}...`)
                          try {
                            const res = await fetch(`/api/pdf/${job.id}`)
                            if (!res.ok) throw new Error()
                            const blob = await res.blob()
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `relatorio_${job.title.replace(/\s+/g, '_')}.pdf`
                            a.click()
                            URL.revokeObjectURL(url)
                          } catch { /* ignore */ }
                          setExportStatus('')
                        }}
                        disabled={!!exportStatus}
                      >
                        <Download className="h-3 w-3" />PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
