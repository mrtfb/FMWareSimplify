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
import { SignaturePad, type SignaturePadRef } from './signature-pad'

interface JobReportFormProps {
  jobId: string
  jobTitle: string
  userId: string
  reportType: 'start' | 'finish'
  existingReport?: {
    id: string
    description: string | null
    client_observations: string | null
    client_name: string | null
    client_approved: boolean | null
    client_signature_url: string | null
    report_date: string
    media?: { public_url: string }[]
  } | null
}

export function JobReportForm({ jobId, jobTitle, userId, reportType, existingReport }: JobReportFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const sigRef = useRef<SignaturePadRef>(null)

  const isStart = reportType === 'start'

  const [form, setForm] = useState({
    report_date: existingReport?.report_date ?? new Date().toISOString().split('T')[0],
    description: existingReport?.description ?? '',
    client_observations: existingReport?.client_observations ?? '',
    client_name: existingReport?.client_name ?? '',
    client_approved: existingReport?.client_approved ?? null as boolean | null,
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const title = isStart ? 'Ficha de Início' : 'Ficha de Fim'
  const description = isStart
    ? 'Preencha ao iniciar o trabalho no cliente'
    : 'Preencha ao concluir o trabalho no cliente'

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
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let signatureUrl = existingReport?.client_signature_url ?? null

    // Upload signature if drawn
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL()
      const blob = await fetch(dataUrl).then(r => r.blob())
      const path = `signatures/${jobId}/${reportType}_${Date.now()}.png`
      const { error: sigError } = await supabase.storage.from('reports').upload(path, blob, { contentType: 'image/png' })
      if (sigError) {
        setError(`Erro ao guardar assinatura: ${sigError.message}`)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path)
      signatureUrl = publicUrl
    }

    const payload = {
      job_id: jobId,
      worker_id: userId,
      report_type: reportType,
      report_date: form.report_date,
      description: form.description || null,
      client_observations: form.client_observations || null,
      client_name: form.client_name || null,
      client_approved: form.client_approved,
      client_signature_url: signatureUrl,
    }

    let reportId: string

    if (existingReport) {
      const { data, error: updateError } = await supabase
        .from('job_reports')
        .update(payload)
        .eq('id', existingReport.id)
        .select()
        .single()
      if (updateError) { setError('Erro ao guardar'); setLoading(false); return }
      reportId = data.id
    } else {
      const { data, error: insertError } = await supabase
        .from('job_reports')
        .insert(payload)
        .select()
        .single()
      if (insertError) { setError('Erro ao guardar'); setLoading(false); return }
      reportId = data.id

      // Update job status
      if (isStart) {
        await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
      } else {
        await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
      }
    }

    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const path = `job-reports/${reportId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('reports').upload(path, photo)
      if (uploadError) {
        setError(`Erro ao guardar foto: ${uploadError.message}`)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(path)
      await supabase.from('media').insert({ job_report_id: reportId, storage_path: path, public_url: publicUrl })
    }

    router.push(`/worker/jobs/${jobId}`)
  }

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/worker/jobs/${jobId}`}>
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Voltar</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">{jobTitle}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label>Data *</Label>
          <Input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
        </div>

        <div className="space-y-1">
          <Label>Descrição / Notas</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={isStart ? 'Estado inicial, condições encontradas...' : 'Resumo do trabalho realizado...'}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-3 border rounded-xl p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Confirmação do cliente</p>

          <div className="space-y-1">
            <Label>Nome do cliente</Label>
            <Input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="Nome de quem recebe"
            />
          </div>

          <div className="space-y-1">
            <Label>Observações do cliente</Label>
            <Textarea
              value={form.client_observations}
              onChange={e => setForm(f => ({ ...f, client_observations: e.target.value }))}
              placeholder="O que o cliente disse ou anotou..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>{isStart ? 'Cliente aprova início do trabalho?' : 'Cliente aprova o trabalho realizado?'}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, client_approved: true }))}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.client_approved === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                Sim, aprova
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, client_approved: false }))}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.client_approved === false ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                Não aprova
              </button>
            </div>
          </div>

          {existingReport?.client_signature_url ? (
            <div>
              <p className="text-sm font-medium mb-1">Assinatura guardada:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingReport.client_signature_url} alt="Assinatura" className="border rounded h-16 bg-white" />
            </div>
          ) : (
            <SignaturePad ref={sigRef} label="Assinatura do cliente (opcional)" />
          )}
        </div>

        {/* Photos */}
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
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Camera className="h-6 w-6 mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-500">Adicionar fotos</p>
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
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar...</> : `Guardar ${title}`}
        </Button>
      </form>
    </div>
  )
}
