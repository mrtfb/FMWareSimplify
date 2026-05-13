'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X } from 'lucide-react'

interface Org {
  id: string
  name: string
  plan: string
  logo_url: string | null
}

export function OrgSettings({ org }: { org: Org }) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(org.name)
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logo_url)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMessage('Ficheiro demasiado grande. Máximo 2MB.'); return }

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setMessage('')

    const path = `${org.id}/logo`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (uploadError) { setMessage(`Erro ao carregar imagem: ${uploadError.message}`); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    // Bust cache with timestamp
    setLogoUrl(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), logo_url: logoUrl })
      .eq('id', org.id)
    setSaving(false)
    if (error) { setMessage('Erro ao guardar.'); return }
    setMessage('Guardado!')
    router.refresh()
  }

  const displayLogo = preview ?? logoUrl

  return (
    <div className="p-8 max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Definições</h1>
        <p className="text-sm text-gray-500 mt-1">Configurações da empresa</p>
      </div>

      {/* Logo */}
      <div className="space-y-3">
        <Label>Logo da empresa</Label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {displayLogo ? (
              <img src={displayLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-6 w-6 text-gray-300" />
            )}
          </div>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'A carregar...' : 'Escolher imagem'}
            </Button>
            {displayLogo && (
              <button
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                onClick={() => { setLogoUrl(null); setPreview(null) }}
              >
                <X className="h-3 w-3" /> Remover logo
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG até 2MB. Recomendado: quadrado.</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
      </div>

      {/* Company name */}
      <div className="space-y-1.5">
        <Label>Nome da empresa</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>

      {/* Plan (read-only) */}
      <div className="space-y-1.5">
        <Label>Plano atual</Label>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium capitalize text-blue-800">
            {org.plan}
          </span>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message === 'Guardado!' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving || uploading}>
        {saving ? 'A guardar...' : 'Guardar alterações'}
      </Button>
    </div>
  )
}
