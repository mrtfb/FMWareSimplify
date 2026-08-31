'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, Search, MapPin, Circle, Clock3, CheckCircle2, Camera, X, Loader2 } from 'lucide-react'
import type { JobLocation, LocationStatus } from '@/types'

interface WorkerJobLocationsProps {
  jobId: string
  jobTitle: string
  locations: JobLocation[]
  userId: string
}

const statusConfig: Record<LocationStatus, { label: string; card: string; activeCard: string; icon: typeof Circle; iconColor: string }> = {
  pending:     { label: 'Por fazer', card: 'bg-card border-border',              activeCard: 'bg-card border-ink',                icon: Circle,       iconColor: 'text-mute' },
  in_progress: { label: 'Em curso',  card: 'bg-blue-500/10 border-blue-500/30',   activeCard: 'bg-blue-500/10 border-blue-400',    icon: Clock3,       iconColor: 'text-blue-400' },
  completed:   { label: 'Concluído', card: 'bg-green-500/10 border-green-500/30', activeCard: 'bg-green-500/10 border-green-400',  icon: CheckCircle2, iconColor: 'text-green-400' },
}

export function WorkerJobLocations({ jobId, jobTitle, locations: initial, userId }: WorkerJobLocationsProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [locations, setLocations] = useState(initial)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | LocationStatus>('all')

  const [active, setActive] = useState<JobLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>('pending')
  const [notes, setNotes] = useState('')
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

  function openLocation(loc: JobLocation) {
    setActive(loc)
    setStatus(loc.status)
    setNotes(loc.notes ?? '')
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

  async function handleSave() {
    if (!active) return
    setSaveStatus('A guardar...')
    setError('')

    const { error: updateError } = await supabase
      .from('job_locations')
      .update({ status, notes: notes || null, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', active.id)

    if (updateError) { setError('Erro ao guardar'); setSaveStatus(''); return }

    let newMedia: { public_url: string }[] = []
    if (photos.length > 0) {
      setSaveStatus(`A carregar ${photos.length} foto${photos.length > 1 ? 's' : ''}...`)
      const results = await Promise.all(
        photos.map(async (photo, i) => {
          const ext = photo.name.split('.').pop()
          const path = `locations/${active.id}/${Date.now()}_${i}.${ext}`
          const { error: uploadError } = await supabase.storage.from('reports').upload(path, photo)
          if (uploadError) return { error: uploadError }
          const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path)
          await supabase.from('media').insert({ job_location_id: active.id, storage_path: path, public_url: publicUrl })
          return { publicUrl }
        })
      )
      const failed = results.find(r => 'error' in r)
      if (failed) { setError('Erro ao carregar foto'); setSaveStatus(''); return }
      newMedia = results.map(r => ({ public_url: (r as { publicUrl: string }).publicUrl }))
    }

    setLocations(prev => prev.map(l => l.id === active.id
      ? { ...l, status, notes: notes || null, media: [...(l.media ?? []), ...newMedia.map(m => ({ ...m, id: crypto.randomUUID(), daily_report_id: null, job_report_id: null, job_location_id: active.id, storage_path: '', caption: null, created_at: new Date().toISOString() }))] }
      : l))
    setSaveStatus('')
    setActive(null)
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-2">
        <Link href={`/worker/jobs/${jobId}`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-ink">Locais</h1>
        <p className="text-sm text-mute">{jobTitle}</p>
      </div>

      {locations.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">{doneCount}/{locations.length} concluídos</span>
          <div className="flex-1 h-2 rounded-full bg-raise overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${locations.length ? (doneCount / locations.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute" />
            <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-16 text-mute">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sem locais definidos para este trabalho</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-mute text-center py-8">Nenhum local corresponde à pesquisa</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filtered.map(loc => {
            const st = statusConfig[loc.status]
            const Icon = st.icon
            return (
              <button
                key={loc.id}
                onClick={() => openLocation(loc)}
                className={`rounded-lg border p-3 text-left transition-colors active:scale-[0.98] ${st.card}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-ink truncate">{loc.name}</p>
                  <Icon className={`h-4 w-4 shrink-0 ${st.iconColor}`} />
                </div>
                {loc.media && loc.media.length > 0 && (
                  <p className="text-[11px] text-mute mt-1">{loc.media.length} foto{loc.media.length !== 1 ? 's' : ''}</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Quick-update sheet */}
      <Dialog open={!!active} onOpenChange={open => { if (!open) setActive(null) }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{active?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'in_progress', 'completed'] as LocationStatus[]).map(s => {
                const cfg = statusConfig[s]
                const Icon = cfg.icon
                const isActive = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg border-2 transition-colors ${
                      isActive ? cfg.activeCard : 'border-border text-mute hover:bg-raise'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? cfg.iconColor : 'text-mute'}`} strokeWidth={isActive ? 2.5 : 1.75} />
                    <span className={`text-[11px] font-medium ${isActive ? 'text-ink' : 'text-mute'}`}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>

            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Nota sobre este local (opcional)..." />

            {active?.media && active.media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {active.media.map((m, i) => (
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

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setActive(null)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!!saveStatus}>
                {saveStatus ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{saveStatus}</> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
