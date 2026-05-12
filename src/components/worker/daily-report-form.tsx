'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, Camera, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface DailyReportFormProps {
  jobId: string
  jobTitle: string
  userId: string
  existingReport?: {
    id: string
    report_date: string
    description: string | null
    hours_worked: number | null
    materials_used: string | null
    observations: string | null
    media?: { public_url: string }[]
  } | null
}

const todayStr = new Date().toISOString().split('T')[0]

function calcHours(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  return (mins / 60).toFixed(2).replace(/\.?0+$/, '')
}

export function DailyReportForm({ jobId, jobTitle, userId, existingReport }: DailyReportFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    report_date: existingReport?.report_date ?? todayStr,
    description: existingReport?.description ?? '',
    time_start: '',
    time_end: '',
    hours_worked: existingReport?.hours_worked?.toString() ?? '',
    materials_used: existingReport?.materials_used ?? '',
    observations: existingReport?.observations ?? '',
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleTimeChange(field: 'time_start' | 'time_end', value: string) {
    const updated = { ...form, [field]: value }
    const auto = calcHours(
      field === 'time_start' ? value : form.time_start,
      field === 'time_end' ? value : form.time_end
    )
    setForm({ ...updated, hours_worked: auto || form.hours_worked })
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).slice(0, 10)
    setPhotos(prev => [...prev, ...arr])
    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removePhoto(i: number) {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { setError('A descrição é obrigatória'); return }
    setLoading(true)
    setError('')

    const payload = {
      job_id: jobId,
      worker_id: userId,
      report_date: form.report_date,
      description: form.description,
      hours_worked: form.hours_worked ? parseFloat(form.hours_worked) : null,
      materials_used: form.materials_used || null,
      observations: form.observations || null,
    }

    let reportId: string

    if (existingReport) {
      const { error: updateError } = await supabase
        .from('daily_reports')
        .update(payload)
        .eq('id', existingReport.id)
      if (updateError) { setError('Erro ao guardar ficha'); setLoading(false); return }
      reportId = existingReport.id
    } else {
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .insert(payload)
        .select()
        .single()
      if (reportError) { setError('Erro ao guardar ficha'); setLoading(false); return }
      reportId = report.id
    }

    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const path = `daily/${reportId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('reports').upload(path, photo)
      if (uploadError) {
        setError(`Erro ao guardar foto: ${uploadError.message}`)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path)
      await supabase.from('media').insert({ daily_report_id: reportId, storage_path: path, public_url: publicUrl })
    }

    router.push(`/worker/jobs/${jobId}`)
  }

  const autoHours = calcHours(form.time_start, form.time_end)

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/worker/jobs/${jobId}`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">{existingReport ? 'Editar Ficha Diária' : 'Nova Ficha Diária'}</h1>
        <p className="text-sm text-gray-500">{jobTitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>Data *</Label>
          <Input
            type="date"
            value={form.report_date}
            max={todayStr}
            onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label>Descrição do trabalho realizado *</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descreva o que foi feito hoje..."
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="space-y-2 p-3 bg-gray-50 rounded-xl border">
          <p className="text-sm font-medium text-gray-700">Horário</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hora de chegada</Label>
              <Input type="time" value={form.time_start} onChange={e => handleTimeChange('time_start', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hora de saída</Label>
              <Input type="time" value={form.time_end} onChange={e => handleTimeChange('time_end', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>
              Horas trabalhadas
              {autoHours && <span className="text-xs text-blue-600 ml-1">(calculado automaticamente)</span>}
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={form.hours_worked}
              onChange={e => setForm(f => ({ ...f, hours_worked: e.target.value }))}
              placeholder="Ex: 8"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Materiais utilizados <span className="text-xs text-gray-400">(opcional)</span></Label>
          <Textarea
            value={form.materials_used}
            onChange={e => setForm(f => ({ ...f, materials_used: e.target.value }))}
            placeholder="Ex: 2x tubo PVC 50mm, silicone branco..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label>Observações <span className="text-xs text-gray-400">(opcional)</span></Label>
          <Textarea
            value={form.observations}
            onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
            placeholder="Alguma observação adicional..."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Fotos</Label>
          {existingReport?.media && existingReport.media.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {existingReport.media.map((m, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={m.public_url} alt="" className="h-20 w-20 object-cover rounded-lg border" />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Clique para adicionar fotos</p>
            <p className="text-xs text-gray-400">Até 10 imagens</p>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-20 w-20 object-cover rounded-lg border" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar...</> : 'Guardar Ficha'}
        </Button>
      </form>
    </div>
  )
}
