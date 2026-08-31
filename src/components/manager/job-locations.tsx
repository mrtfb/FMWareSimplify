'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, Trash2, MapPin, Circle, Clock3, CheckCircle2, StickyNote, Camera, X, Loader2 } from 'lucide-react'
import type { JobLocation, LocationStatus } from '@/types'

interface JobLocationsPanelProps {
  jobId: string
  locations: JobLocation[]
}

const statusConfig: Record<LocationStatus, { label: string; card: string; icon: typeof Circle }> = {
  pending:     { label: 'Por fazer', card: 'bg-card border-border',                            icon: Circle },
  in_progress: { label: 'Em curso',  card: 'bg-blue-500/10 border-blue-500/30',                 icon: Clock3 },
  completed:   { label: 'Concluído', card: 'bg-green-500/10 border-green-500/30',                icon: CheckCircle2 },
}

export function JobLocationsPanel({ jobId, locations: initial }: JobLocationsPanelProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [locations, setLocations] = useState(initial)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | LocationStatus>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [rangePrefix, setRangePrefix] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const [editTarget, setEditTarget] = useState<JobLocation | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState('')
  const [error, setError] = useState('')

  const filtered = locations.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    return matchSearch && matchStatus
  })

  const doneCount = locations.filter(l => l.status === 'completed').length

  function generateRange() {
    const start = parseInt(rangeStart)
    const end = parseInt(rangeEnd)
    if (isNaN(start) || isNaN(end) || start > end) return
    const lines: string[] = []
    for (let i = start; i <= end; i++) lines.push(`${rangePrefix}${i}`)
    setBulkText(prev => (prev.trim() ? `${prev}\n${lines.join('\n')}` : lines.join('\n')))
  }

  async function handleAddBulk() {
    const names = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (names.length === 0) return
    setSaving(true)
    const maxOrder = locations.reduce((m, l) => Math.max(m, l.sort_order), 0)
    const rows = names.map((name, i) => ({ job_id: jobId, name, sort_order: maxOrder + i + 1 }))
    const { data, error } = await supabase.from('job_locations').insert(rows).select()
    setSaving(false)
    if (!error && data) {
      setLocations(prev => [...prev, ...(data as JobLocation[])])
      setBulkText('')
      setRangePrefix('')
      setRangeStart('')
      setRangeEnd('')
      setAddOpen(false)
      router.refresh()
    }
  }

  async function updateStatus(loc: JobLocation, status: LocationStatus) {
    setLocations(prev => prev.map(l => (l.id === loc.id ? { ...l, status } : l)))
    await supabase.from('job_locations').update({ status, updated_at: new Date().toISOString() }).eq('id', loc.id)
    router.refresh()
    // Marking as done is the moment worth capturing proof — status is already
    // saved instantly, this just invites an optional note/photo on top.
    if (status === 'completed') openEdit({ ...loc, status })
  }

  function openEdit(loc: JobLocation) {
    setEditTarget(loc)
    setEditNotes(loc.notes ?? '')
    setPhotos([])
    setPreviews([])
    setError('')
    setSaveStatus('')
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 5)
    setPhotos(prev => [...prev, ...arr])
    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  async function saveEdit() {
    if (!editTarget) return
    setSaveStatus('A guardar...')
    setError('')

    await supabase.from('job_locations').update({ notes: editNotes || null }).eq('id', editTarget.id)

    let newMedia: { public_url: string }[] = []
    if (photos.length > 0) {
      setSaveStatus(`A carregar ${photos.length} foto${photos.length > 1 ? 's' : ''}...`)
      const results = await Promise.all(
        photos.map(async (photo, i) => {
          const ext = photo.name.split('.').pop()
          const path = `locations/${editTarget.id}/${Date.now()}_${i}.${ext}`
          const { error: uploadError } = await supabase.storage.from('reports').upload(path, photo)
          if (uploadError) return { error: uploadError }
          const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path)
          await supabase.from('media').insert({ job_location_id: editTarget.id, storage_path: path, public_url: publicUrl })
          return { publicUrl }
        })
      )
      const failed = results.find(r => 'error' in r)
      if (failed) { setError('Erro ao carregar foto'); setSaveStatus(''); return }
      newMedia = results.map(r => ({ public_url: (r as { publicUrl: string }).publicUrl }))
    }

    setLocations(prev => prev.map(l => (l.id === editTarget.id
      ? {
          ...l,
          notes: editNotes || null,
          media: [...(l.media ?? []), ...newMedia.map(m => ({
            ...m, id: crypto.randomUUID(), daily_report_id: null, job_report_id: null,
            job_location_id: editTarget.id, storage_path: '', caption: null, created_at: new Date().toISOString(),
          }))],
        }
      : l)))
    setSaveStatus('')
    setEditTarget(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este local?')) return
    await supabase.from('job_locations').delete().eq('id', id)
    setLocations(prev => prev.filter(l => l.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Progress + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {locations.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink">{doneCount}/{locations.length} concluídos</span>
            <div className="w-32 h-2 rounded-full bg-raise overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${locations.length ? (doneCount / locations.length) * 100 : 0}%` }} />
            </div>
          </div>
        ) : <div />}
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar locais</Button>
      </div>

      {/* Filters */}
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute" />
            <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${filterStatus === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-ink-2 hover:bg-raise'}`}
            >
              {s === 'all' ? 'Todos' : statusConfig[s].label}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {locations.length === 0 ? (
        <div className="text-center py-12 text-mute">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sem locais definidos para este trabalho</p>
          <p className="text-xs mt-1">Útil para trabalhos com muitas divisões — ex: quartos de hotel, pisos, zonas.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>Adicionar locais</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-mute text-center py-8">Nenhum local corresponde à pesquisa</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {filtered.map(loc => (
            <div key={loc.id} className={`rounded-lg border p-3 transition-colors ${statusConfig[loc.status].card}`}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium text-ink truncate">{loc.name}</p>
                <button onClick={() => handleDelete(loc.id)} className="text-mute hover:text-red-400 shrink-0">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {loc.notes && <p className="text-[11px] text-ink-2 mt-1 line-clamp-2">{loc.notes}</p>}
              {loc.media && loc.media.length > 0 && (
                <p className="text-[11px] text-mute mt-1 flex items-center gap-1"><Camera className="h-3 w-3" />{loc.media.length}</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                {(['pending', 'in_progress', 'completed'] as LocationStatus[]).map(s => {
                  const Icon = statusConfig[s].icon
                  const active = loc.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(loc, s)}
                      title={statusConfig[s].label}
                      className={`flex-1 flex items-center justify-center py-1 rounded border transition-colors ${
                        active ? 'border-transparent bg-ink/10' : 'border-border/50 hover:bg-raise'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-ink' : 'text-mute'}`} strokeWidth={active ? 2.5 : 1.75} />
                    </button>
                  )
                })}
                <button onClick={() => openEdit(loc)} title="Nota e fotos" className="p-1 rounded border border-border/50 hover:bg-raise shrink-0">
                  <StickyNote className="h-3.5 w-3.5 text-mute" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Adicionar locais</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2 p-3 bg-background rounded-lg border">
              <Label className="text-xs">Gerar intervalo numérico</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Prefixo: Quarto " value={rangePrefix} onChange={e => setRangePrefix(e.target.value)} className="col-span-3 sm:col-span-1" />
                <Input type="number" placeholder="De" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
                <Input type="number" placeholder="Até" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generateRange} disabled={!rangeStart || !rangeEnd}>Gerar linhas</Button>
            </div>
            <div className="space-y-1">
              <Label>Um local por linha</Label>
              <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8} placeholder={'Quarto 101\nQuarto 102\nReceção\n...'} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddBulk} disabled={saving || !bulkText.trim()}>{saving ? 'A adicionar...' : 'Adicionar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — status notes + photos */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Nota sobre este local (opcional)..." />

            {editTarget?.media && editTarget.media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editTarget.media.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={m.public_url} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border/50 rounded-xl p-3 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Camera className="h-5 w-5 mx-auto text-mute mb-1" />
                <p className="text-xs text-mute">Adicionar foto</p>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
              {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-16 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={!!saveStatus}>
                {saveStatus ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{saveStatus}</> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
