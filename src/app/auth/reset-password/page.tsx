'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ClipboardList } from 'lucide-react'
import { PasswordField, isPasswordStrong } from '@/components/shared/password-field'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isPasswordStrong(password)) {
      setError('A password não cumpre os requisitos mínimos.')
      return
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError('Erro ao definir password. O link pode ter expirado.')
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-blue-600 p-3 rounded-xl">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FichasWork</h1>
          <p className="text-gray-500 text-sm">Definir nova password</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova password</Label>
              <PasswordField value={password} onChange={setPassword} showStrength />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar password</Label>
              <PasswordField value={confirm} onChange={setConfirm} />
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-red-500">As passwords não coincidem.</p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordStrong(password) || password !== confirm}
            >
              {loading ? 'A guardar...' : 'Definir password e entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
